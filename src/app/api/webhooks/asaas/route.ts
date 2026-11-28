import { createHash, timingSafeEqual } from "node:crypto";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { getAsaasEnvironment, getAsaasPayment, getAsaasSubscription, mapAsaasPaymentStatus } from "@/lib/asaas";
import { asaasDocumentId, getAsaasCustomerId, getAsaasEnvironmentBilling, getLegacyAsaasCustomerId } from "@/lib/asaas-environment-records";
import { dateAfterGrace, isPastGracePeriod, sendBillingAccessCommand, todayDateOnly } from "@/lib/billing-access";
import { getFirebaseAdminDb } from "@/lib/firebase-admin";
import { sendConnectorCommand } from "@/lib/connector-commands";

const MAX_BODY_BYTES = 128 * 1024;
// Trava de processamento: um evento "em processamento" há menos que isto bloqueia novas entregas (Asaas tenta de novo).
const EVENT_LOCK_MS = 2 * 60 * 1000;
// Trava de liberação de créditos: impede dois envios simultâneos ao conector para o mesmo pedido.
const GRANT_LOCK_MS = 2 * 60 * 1000;

type AsaasWebhookPayload = {
  id?: string;
  event?: string;
  payment?: {
    id?: string;
    subscription?: string | null;
    customer?: string | null;
    status?: string | null;
    value?: number | null;
    dueDate?: string | null;
    paymentDate?: string | null;
    confirmedDate?: string | null;
    invoiceUrl?: string | null;
    externalReference?: string | null;
  };
};

function safeText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function sameSecret(expected: string, received: string | null) {
  if (!received) return false;
  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(received);
  return expectedBuffer.length === receivedBuffer.length && timingSafeEqual(expectedBuffer, receivedBuffer);
}

function eventKey(eventId: string) {
  return createHash("sha256").update(eventId).digest("hex");
}

function referenceMonth(dueDate: string | null | undefined) {
  return typeof dueDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dueDate) ? dueDate.slice(0, 7) : "";
}

function cents(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? Math.round(value * 100) : null;
}

function nextMonthlyDate(date: string | null) {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const [year, month, day] = date.split("-").map(Number);
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const lastDay = new Date(Date.UTC(nextYear, nextMonth, 0)).getUTCDate();
  return new Date(Date.UTC(nextYear, nextMonth - 1, Math.min(day, lastDay))).toISOString().slice(0, 10);
}

function billingConnectorStatus(status: ReturnType<typeof mapAsaasPaymentStatus>) {
  if (status === "paga") return "paid" as const;
  if (status === "vencida") return "overdue" as const;
  return "pending" as const;
}

export async function POST(request: Request) {
  const expectedToken = process.env.ASAAS_WEBHOOK_TOKEN?.trim();
  if (!expectedToken) return NextResponse.json({ error: "Webhook do Asaas não configurado." }, { status: 503 });
  if (!sameSecret(expectedToken, request.headers.get("asaas-access-token"))) return NextResponse.json({ error: "Webhook não autorizado." }, { status: 401 });

  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) return NextResponse.json({ error: "Evento muito grande." }, { status: 413 });

  let eventRef: FirebaseFirestore.DocumentReference | null = null;
  try {
    const payload = await request.json() as AsaasWebhookPayload;
    const payment = payload.payment;
    const event = safeText(payload.event, 80);
    const paymentId = safeText(payment?.id, 160);
    const eventId = safeText(payload.id, 160) || `${event}:${paymentId}:${JSON.stringify(payload).slice(0, 400)}`;
    if (!event || !paymentId) return NextResponse.json({ error: "Evento sem identificação suficiente." }, { status: 400 });

    const db = getFirebaseAdminDb();
    const environment = getAsaasEnvironment();
    const environmentEventId = environment === "production" ? eventId : `${environment}:${eventId}`;
    const currentEventRef = db.collection("asaasWebhookEvents").doc(eventKey(environmentEventId));
    eventRef = currentEventRef;
    const eventClaim = await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(currentEventRef);
      const data = snapshot.data() ?? {};
      if (data.processedAt) return "duplicate" as const;
      const processingMs = data.processingAt instanceof Timestamp ? data.processingAt.toMillis() : 0;
      if (processingMs && Date.now() - processingMs < EVENT_LOCK_MS) return "in_progress" as const;
      transaction.set(currentEventRef, { eventId, event, paymentId, billingEnvironment: environment, receivedAt: FieldValue.serverTimestamp(), processingAt: Timestamp.now() }, { merge: true });
      return "claimed" as const;
    });
    if (eventClaim === "duplicate") return NextResponse.json({ ok: true, duplicate: true });
    if (eventClaim === "in_progress") return NextResponse.json({ error: "Evento em processamento." }, { status: 409 });

    const paymentQuery = await db.collection("billingCharges").where("asaasPaymentId", "==", paymentId).limit(10).get();
    const matchingCharge = paymentQuery.docs.find((doc) => {
      const data = doc.data();
      return data.billingEnvironment === environment || (environment === "production" && !data.billingEnvironment);
    });
    let chargeRef = matchingCharge?.ref ?? null;
    let creditOrderRef = null as FirebaseFirestore.DocumentReference | null;
    let creditOrderData: FirebaseFirestore.DocumentData | null = null;
    let serviceRef = null as FirebaseFirestore.DocumentReference | null;
    let serviceData: FirebaseFirestore.DocumentData | null = null;

    const externalReference = safeText(payment?.externalReference, 220);
    if (externalReference.startsWith("ai-credits:")) {
      const orderId = externalReference.slice("ai-credits:".length).trim();
      if (orderId && orderId.length <= 160) {
        const candidate = db.collection("creditOrders").doc(orderId);
        const orderSnapshot = await candidate.get();
        if (orderSnapshot.exists) {
          creditOrderRef = candidate;
          creditOrderData = orderSnapshot.data() ?? null;
        }
      }
    }
    if (!creditOrderRef) {
      const orderQuery = await db.collection("creditOrders").where("asaasPaymentId", "==", paymentId).limit(10).get();
      const orderSnapshot = orderQuery.docs.find((doc) => {
        const data = doc.data();
        return data.billingEnvironment === environment || (environment === "production" && !data.billingEnvironment);
      });
      if (orderSnapshot) {
        creditOrderRef = orderSnapshot.ref;
        creditOrderData = orderSnapshot.data();
      }
    }

    if (creditOrderRef && creditOrderData) {
      const serviceId = safeText(creditOrderData.serviceId, 160);
      if (serviceId) {
        serviceRef = db.collection("managedServices").doc(serviceId);
        const serviceSnapshot = await serviceRef.get();
        serviceData = serviceSnapshot.exists ? serviceSnapshot.data() ?? null : null;
      }
    }

    if (creditOrderRef) {
      const creditChargeRef = db.collection("billingCharges").doc(asaasDocumentId("asaas-credit", environment, paymentId));
      if ((await creditChargeRef.get()).exists) chargeRef = creditChargeRef;
    }

    if (chargeRef) {
      const charge = await chargeRef.get();
      const serviceId = charge.data()?.serviceId;
      if (typeof serviceId === "string" && serviceId) {
        serviceRef = db.collection("managedServices").doc(serviceId);
        const serviceSnapshot = await serviceRef.get();
        serviceData = serviceSnapshot.exists ? serviceSnapshot.data() ?? null : null;
      }
    }

    if (!serviceRef && payment?.subscription) {
      const environmentQuery = await db.collection("managedServices")
        .where(`asaasBillingEnvironments.${environment}.subscriptionId`, "==", payment.subscription)
        .limit(1)
        .get();
      let serviceSnapshot: FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData> | undefined = environmentQuery.docs[0];
      if (!serviceSnapshot) {
        const legacyQuery = await db.collection("managedServices").where("asaasSubscriptionId", "==", payment.subscription).limit(5).get();
        serviceSnapshot = legacyQuery.docs.find((doc) => doc.data().billingEnvironment === environment);
      }
      if (serviceSnapshot) {
        serviceRef = serviceSnapshot.ref;
        serviceData = serviceSnapshot.data();
      }
    }

    if (!serviceRef && payment?.externalReference?.startsWith("managed-service:")) {
      const serviceId = payment.externalReference.slice("managed-service:".length).trim();
      if (serviceId && serviceId.length <= 160) {
        const candidate = db.collection("managedServices").doc(serviceId);
        const serviceSnapshot = await candidate.get();
        if (serviceSnapshot.exists) {
          serviceRef = candidate;
          serviceData = serviceSnapshot.data() ?? null;
        }
      }
    }

    const status = mapAsaasPaymentStatus(event, safeText(payment?.status, 40));
    // A entrega do webhook informa o evento, mas o recurso atual do Asaas confirma
    // pagamento, valor e vínculo antes de liberar qualquer crédito.
    const verifiedPayment = status === "paga" ? await getAsaasPayment(paymentId) : null;
    if (verifiedPayment) {
      if (verifiedPayment.id !== paymentId || mapAsaasPaymentStatus("", safeText(verifiedPayment.status, 40)) !== "paga") {
        throw new Error("asaas-payment-not-confirmed");
      }
      if (creditOrderRef && creditOrderData) {
        const expectedPaymentId = safeText(creditOrderData.asaasPaymentId, 160);
        if ((expectedPaymentId && expectedPaymentId !== paymentId) ||
          verifiedPayment.externalReference !== `ai-credits:${creditOrderRef.id}` ||
          cents(verifiedPayment.value) !== cents(Number(creditOrderData.amount))) {
          throw new Error("asaas-credit-order-mismatch");
        }
        const tenantId = safeText(creditOrderData.tenantId, 160);
        const company = tenantId ? await db.collection("companies").doc(tenantId).get() : null;
        const companyData = company?.data() ?? {};
        const orderEnvironment = safeText(creditOrderData.billingEnvironment, 20);
        const expectedCustomerId = safeText(creditOrderData.asaasCustomerId, 160)
          || getAsaasCustomerId(companyData, environment)
          || (orderEnvironment === environment || (environment === "production" && !orderEnvironment) ? getLegacyAsaasCustomerId(companyData) : null);
        if (!expectedCustomerId || verifiedPayment.customer !== expectedCustomerId) {
          throw new Error("asaas-credit-customer-mismatch");
        }
      } else if (serviceData) {
        const billing = getAsaasEnvironmentBilling(serviceData, environment);
        const subscriptionId = billing.subscriptionId;
        const customerId = billing.customerId;
        if (!subscriptionId || !customerId || verifiedPayment.subscription !== subscriptionId || verifiedPayment.customer !== customerId) {
          throw new Error("asaas-subscription-mismatch");
        }
      }
    }
    let subscriptionNextDueDate: string | null = null;
    let subscriptionMonthlyFee: number | null = null;
    if (serviceRef && serviceData && !creditOrderRef && status === "paga") {
      const subscriptionId = getAsaasEnvironmentBilling(serviceData, environment).subscriptionId;
      if (subscriptionId) {
        try {
          const subscription = await getAsaasSubscription(subscriptionId);
          subscriptionNextDueDate = safeText(subscription.nextDueDate, 20) || null;
          subscriptionMonthlyFee = typeof subscription.value === "number" && Number.isFinite(subscription.value) ? subscription.value : null;
        } catch {
          // O pagamento continua sendo registrado. O reconciliador diário
          // tenta obter o próximo vencimento novamente se necessário.
        }
      }
    }
    const confirmedPayment = verifiedPayment ?? payment;
    const paidAt = status === "paga" ? (confirmedPayment?.paymentDate || confirmedPayment?.confirmedDate || new Date().toISOString()) : null;
    const chargeData = {
      billingProvider: "asaas",
      billingEnvironment: environment,
      asaasCustomerId: safeText(confirmedPayment?.customer, 160) || null,
      asaasPaymentId: paymentId,
      asaasSubscriptionId: safeText(confirmedPayment?.subscription, 160) || null,
      amount: typeof confirmedPayment?.value === "number" ? confirmedPayment.value : null,
      dueDate: safeText(confirmedPayment?.dueDate, 20) || null,
      invoiceUrl: safeText(confirmedPayment?.invoiceUrl, 1000) || null,
      status,
      paidAt,
      lastWebhookEvent: event,
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (chargeRef) {
      await chargeRef.update(chargeData);
    } else if (serviceRef && serviceData && typeof serviceData.tenantId === "string") {
      chargeRef = db.collection("billingCharges").doc(asaasDocumentId(creditOrderRef ? "asaas-credit" : "asaas", environment, paymentId));
      await chargeRef.set({
        tenantId: serviceData.tenantId,
        serviceId: serviceRef.id,
        ...(creditOrderRef ? { creditOrderId: creditOrderRef.id, creditPackageId: creditOrderData?.packageId || null, creditAmount: Number(creditOrderData?.creditAmount) || null } : {}),
        referenceMonth: referenceMonth(payment?.dueDate),
        ...chargeData,
        createdAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    } else {
      await db.collection("asaasUnmatchedEvents").doc(eventKey(environmentEventId)).set({
        eventId,
        event,
        billingEnvironment: environment,
        paymentId,
        subscriptionId: safeText(payment?.subscription, 160) || null,
        customerId: safeText(payment?.customer, 160) || null,
        status,
        dueDate: safeText(payment?.dueDate, 20) || null,
        createdAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    }

    if (serviceRef && serviceData && serviceData.billingAutomationEnabled === true && typeof serviceData.tenantId === "string" && !creditOrderRef && ["paga", "vencida"].includes(status)) {
      const dueDate = safeText(confirmedPayment?.dueDate, 20) || null;
      const graceDays = Number.isInteger(Number(serviceData.graceDays))
        ? Math.max(0, Math.min(30, Number(serviceData.graceDays)))
        : 3;
      const nextDueDate = status === "paga" ? (subscriptionNextDueDate || nextMonthlyDate(dueDate)) : dueDate;
      const blocked = status === "vencida" && isPastGracePeriod(dueDate, graceDays);
      const accessState = {
        serviceId: serviceRef.id,
        paymentId,
        billingStatus: blocked ? "blocked" as const : billingConnectorStatus(status),
        subscriptionStatus: blocked ? "bloqueado" as const : "ativo" as const,
        accessStatus: status === "paga" ? "ativo" as const : blocked ? "bloqueado" as const : "em_tolerancia" as const,
        dueDate,
        nextDueDate,
        paidThroughDate: status === "paga" ? dueDate : null,
        reason: blocked
          ? `Pagamento vencido após ${graceDays} dia(s) de tolerância. Bloqueio aplicado em ${todayDateOnly()}.`
          : status === "paga"
            ? "Pagamento confirmado pelo Asaas."
            : `Pagamento vencido. Tolerância até ${dueDate ? dateAfterGrace(dueDate, graceDays) : "data não informada"}.`,
      };
      const serviceUpdates: Record<string, unknown> = {
        accessStatus: accessState.accessStatus,
        subscriptionStatus: accessState.subscriptionStatus,
        sourceBillingStatus: accessState.billingStatus,
        lastKnownStatus: accessState.reason,
        connectorStatus: "pendente",
        updatedAt: FieldValue.serverTimestamp(),
      };
      if (nextDueDate) serviceUpdates.nextDueDate = nextDueDate;
      if (subscriptionMonthlyFee !== null) serviceUpdates.monthlyFee = subscriptionMonthlyFee;
      if (nextDueDate && /^\d{4}-\d{2}-\d{2}$/.test(nextDueDate)) serviceUpdates.billingDay = Number(nextDueDate.slice(8, 10));
      if (status === "paga" && dueDate) serviceUpdates.sourcePaidThroughDate = dueDate;
      await serviceRef.update(serviceUpdates);

      const connector = await sendBillingAccessCommand(serviceData, accessState).catch(() => ({ sent: false, skipped: false, status: 0 }));
      if (connector.sent) {
        await serviceRef.update({ connectorStatus: "ativo", updatedAt: FieldValue.serverTimestamp() });
      } else if (connector.skipped) {
        await serviceRef.update({
          connectorStatus: "pendente",
          accessStatus: status === "paga" ? "liberacao_pendente" : blocked ? "bloqueio_agendado" : "em_tolerancia",
          updatedAt: FieldValue.serverTimestamp(),
        });
      } else {
        await serviceRef.update({
          connectorStatus: "com_falha",
          accessStatus: status === "paga" ? "liberacao_pendente" : blocked ? "bloqueio_agendado" : "em_tolerancia",
          updatedAt: FieldValue.serverTimestamp(),
        });
        throw new Error("billing-access-sync-pending");
      }
    }

    await db.collection("auditLogs").doc().set({
      tenantId: serviceData?.tenantId ?? null,
      actorUserId: "asaas-webhook",
      actorRole: "system",
      action: "billing.payment.updated",
      targetType: "billingCharge",
      targetId: chargeRef?.id ?? paymentId,
      createdAt: new Date().toISOString(),
      metadata: { provider: "asaas", environment, event, paymentId, status },
    });

    if (creditOrderRef && creditOrderData && status === "paga") {
      const creditAmount = Math.round(Number(creditOrderData.creditAmount));
      const amount = Number(creditOrderData.amount || payment?.value || 0);
      const packageId = safeText(creditOrderData.packageId, 80);
      if (!Number.isInteger(creditAmount) || creditAmount <= 0 || !packageId || !serviceData) throw new Error("credit-order-invalid");

      // Eventos diferentes do mesmo pagamento (ex.: RECEIVED e CONFIRMED) chegam com IDs distintos.
      // A trava no pedido garante que os créditos sejam liberados uma única vez.
      const orderRef = creditOrderRef;
      const grant = await db.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(orderRef);
        const data = snapshot.data() ?? {};
        if (data.grantStatus === "applied") return "applied" as const;
        const grantingMs = data.grantingAt instanceof Timestamp ? data.grantingAt.toMillis() : 0;
        if (data.grantStatus === "granting" && Date.now() - grantingMs < GRANT_LOCK_MS) return "in_progress" as const;
        transaction.set(orderRef, { grantStatus: "granting", grantingAt: Timestamp.now(), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
        return "claimed" as const;
      });

      if (grant === "in_progress") throw new Error("credit-grant-in-progress");
      if (grant === "claimed") {
        const connector = await sendConnectorCommand(serviceData, {
          commandId: orderRef.id,
          commandType: "ai_credits.granted",
          creditGrant: {
            amount,
            credits: creditAmount,
            packageId,
            paymentId,
            purchaseId: orderRef.id,
          },
        });
        if (!connector.sent) {
          await orderRef.set({ grantStatus: "pending", grantError: connector.skipped ? "connector_not_configured" : `http_${connector.status}`, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
          throw new Error("credit-grant-pending");
        }
        await orderRef.set({ grantStatus: "applied", grantedAt: FieldValue.serverTimestamp(), status: "paga", paidAt, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      } else {
        await orderRef.set({ status: "paga", paidAt, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      }
    }

    await eventRef.set({ processedAt: FieldValue.serverTimestamp(), status: "completed" }, { merge: true });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown-error";
    // Liberação já em andamento em outra entrega: não é erro do evento; o Asaas tenta de novo depois.
    if (message === "credit-grant-in-progress") return NextResponse.json({ error: "Liberação em andamento." }, { status: 409 });
    if (eventRef) await eventRef.set({ status: "error", lastError: message, updatedAt: FieldValue.serverTimestamp() }, { merge: true }).catch(() => undefined);
    return NextResponse.json({ error: "Não foi possível processar o evento." }, { status: 500 });
  }
}
