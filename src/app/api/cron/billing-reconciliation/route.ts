import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { listAsaasSubscriptionPayments, mapAsaasPaymentStatus, getAsaasEnvironment, getAsaasSubscription, type AsaasPayment } from "@/lib/asaas";
import { asaasDocumentId, getAsaasEnvironmentBilling } from "@/lib/asaas-environment-records";
import { dateAfterGrace, isPastGracePeriod, sendBillingAccessCommand, todayDateOnly } from "@/lib/billing-access";
import { getFirebaseAdminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}` || request.headers.get("x-cron-secret") === secret;
}

function safeText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function isDateOnly(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function referenceMonth(value: string | null) {
  return value ? value.slice(0, 7) : "";
}

function paymentDate(payment: AsaasPayment) {
  return safeText(payment.dueDate, 20) || null;
}

function isPaid(payment: AsaasPayment) {
  return mapAsaasPaymentStatus("PAYMENT_CREATED", safeText(payment.status, 40)) === "paga";
}

function isCancelled(payment: AsaasPayment) {
  return /DELETED|CANCEL|REFUND|CHARGEBACK/i.test(safeText(payment.status, 40));
}

function compareDueDate(left: AsaasPayment, right: AsaasPayment) {
  return (paymentDate(left) || "9999-12-31").localeCompare(paymentDate(right) || "9999-12-31");
}

function chooseCurrentPayment(payments: AsaasPayment[], currentDate: string) {
  const usable = payments.filter((payment) => isDateOnly(paymentDate(payment)) && !isCancelled(payment)).sort(compareDueDate);
  const unpaid = usable.filter((payment) => !isPaid(payment));
  return unpaid.find((payment) => (paymentDate(payment) || "") <= currentDate) || unpaid[0] || usable.at(-1) || null;
}

async function reconcileService(db: FirebaseFirestore.Firestore, serviceRef: FirebaseFirestore.DocumentReference, service: FirebaseFirestore.DocumentData, currentDate: string) {
  const environmentBilling = getAsaasEnvironmentBilling(service, "production");
  if (!environmentBilling.subscriptionId || typeof service.tenantId !== "string") return { skipped: true } as const;

  const payments = await listAsaasSubscriptionPayments(environmentBilling.subscriptionId);
  const currentPayment = chooseCurrentPayment(payments, currentDate);
  if (!currentPayment) return { skipped: true } as const;

  const dueDate = paymentDate(currentPayment);
  if (!dueDate) return { skipped: true } as const;
  const graceDays = Number.isInteger(Number(service.graceDays)) ? Math.max(0, Math.min(30, Number(service.graceDays))) : 3;
  const paid = isPaid(currentPayment);
  const overdue = !paid && dueDate < currentDate;
  const blocked = overdue && isPastGracePeriod(dueDate, graceDays, currentDate);
  const subscription = await getAsaasSubscription(environmentBilling.subscriptionId).catch(() => null);
  const futureUnpaid = payments
    .filter((payment) => !isCancelled(payment) && !isPaid(payment) && isDateOnly(paymentDate(payment)) && (paymentDate(payment) || "") >= currentDate)
    .sort(compareDueDate)[0];
  const nextDueDate = paid
    ? safeText(subscription?.nextDueDate, 20) || paymentDate(futureUnpaid) || null
    : dueDate;
  const status = paid ? "paga" as const : overdue ? "vencida" as const : "aberta" as const;
  const asaasMonthlyFee = typeof subscription?.value === "number" && Number.isFinite(subscription.value) ? subscription.value : null;
  const authoritativeBillingDay = isDateOnly(nextDueDate) ? Number(nextDueDate.slice(8, 10)) : null;
  const authoritativeService = {
    ...service,
    ...(asaasMonthlyFee !== null ? { monthlyFee: asaasMonthlyFee } : {}),
    ...(authoritativeBillingDay !== null ? { billingDay: authoritativeBillingDay } : {}),
  };
  const accessState = {
    serviceId: serviceRef.id,
    paymentId: currentPayment.id,
    billingStatus: paid ? "paid" as const : blocked ? "blocked" as const : overdue ? "overdue" as const : "pending" as const,
    subscriptionStatus: blocked ? "bloqueado" as const : "ativo" as const,
    accessStatus: paid ? "ativo" as const : blocked ? "bloqueado" as const : overdue ? "em_tolerancia" as const : "ativo" as const,
    dueDate,
    nextDueDate,
    paidThroughDate: paid ? dueDate : null,
    reason: paid
      ? "Pagamento confirmado na reconciliação do Asaas."
      : blocked
        ? `Pagamento vencido após ${graceDays} dia(s) de tolerância. Bloqueio aplicado em ${currentDate}.`
        : overdue
          ? `Pagamento vencido. Tolerância até ${dateAfterGrace(dueDate, graceDays)}.`
          : "Cobrança aberta no Asaas.",
  };

  await db.collection("billingCharges").doc(asaasDocumentId("asaas", "production", currentPayment.id)).set({
    tenantId: service.tenantId,
    serviceId: serviceRef.id,
    billingEnvironment: "production",
    referenceMonth: referenceMonth(dueDate),
    billingProvider: "asaas",
    asaasCustomerId: safeText(currentPayment.customer, 160) || environmentBilling.customerId,
    asaasPaymentId: currentPayment.id,
    asaasSubscriptionId: environmentBilling.subscriptionId,
    amount: typeof currentPayment.value === "number" ? currentPayment.value : null,
    dueDate,
    invoiceUrl: safeText(currentPayment.invoiceUrl, 1000) || null,
    status,
    paidAt: paid ? safeText(currentPayment.paymentDate, 40) || safeText(currentPayment.confirmedDate, 40) || new Date().toISOString() : null,
    lastReconciledAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });

  await serviceRef.update({
    accessStatus: accessState.accessStatus,
    subscriptionStatus: accessState.subscriptionStatus,
    sourceBillingStatus: accessState.billingStatus,
    sourcePaidThroughDate: accessState.paidThroughDate,
    ...(nextDueDate ? { nextDueDate } : {}),
    ...(asaasMonthlyFee !== null ? { monthlyFee: asaasMonthlyFee } : {}),
    ...(authoritativeBillingDay !== null ? { billingDay: authoritativeBillingDay } : {}),
    lastKnownStatus: accessState.reason,
    connectorStatus: "pendente",
    updatedAt: FieldValue.serverTimestamp(),
  });

  const connector = await sendBillingAccessCommand(authoritativeService, accessState).catch(() => ({ sent: false, skipped: false, status: 0 }));
  if (connector.sent) {
    await serviceRef.update({ connectorStatus: "ativo", updatedAt: FieldValue.serverTimestamp() });
  } else {
    await serviceRef.update({
      connectorStatus: connector.skipped ? "pendente" : "com_falha",
      accessStatus: paid ? "liberacao_pendente" : blocked ? "bloqueio_agendado" : accessState.accessStatus,
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  await db.collection("auditLogs").doc().set({
    tenantId: service.tenantId,
    actorUserId: "asaas-reconciliation",
    actorRole: "system",
    action: "billing.subscription.reconciled",
    targetType: "managedService",
    targetId: serviceRef.id,
    createdAt: new Date().toISOString(),
    metadata: { paymentId: currentPayment.id, subscriptionId: environmentBilling.subscriptionId, status, blocked, connectorSent: connector.sent, connectorSkipped: connector.skipped },
  });

  return { skipped: false, paymentId: currentPayment.id, status, blocked, connectorSent: connector.sent, connectorSkipped: connector.skipped } as const;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  if (getAsaasEnvironment() !== "production") return NextResponse.json({ error: "A reconciliação automática exige Asaas Produção." }, { status: 503 });

  const db = getFirebaseAdminDb();
  const servicesSnapshot = await db.collection("managedServices").limit(500).get();
  const currentDate = todayDateOnly();
  const result = { date: currentDate, processed: 0, skipped: 0, failed: 0, blocked: 0, released: 0, failures: [] as string[] };

  for (const serviceDoc of servicesSnapshot.docs) {
    const service = serviceDoc.data();
    const billing = getAsaasEnvironmentBilling(service, "production");
    if (service.isArchived === true || service.billingAutomationEnabled !== true || !billing.subscriptionId) {
      result.skipped += 1;
      continue;
    }
    try {
      const item = await reconcileService(db, serviceDoc.ref, service, currentDate);
      if (item.skipped) result.skipped += 1;
      else {
        result.processed += 1;
        if (item.blocked) result.blocked += 1;
        if (item.status === "paga") result.released += 1;
      }
    } catch (error) {
      result.failed += 1;
      result.failures.push(`${serviceDoc.id}:${error instanceof Error ? error.message : "erro"}`);
    }
  }

  return NextResponse.json({ ok: result.failed === 0, ...result }, { status: result.failed === 0 ? 200 : 207 });
}

