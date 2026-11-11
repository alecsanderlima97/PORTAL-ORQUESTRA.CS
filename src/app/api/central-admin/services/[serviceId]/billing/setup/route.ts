import { FieldValue } from "firebase-admin/firestore";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AsaasConfigError, AsaasRequestError, createAsaasSubscription, findAsaasSubscriptionByExternalReference, getAsaasEnvironment, isAsaasConfigured, listAsaasSubscriptionPayments, mapAsaasPaymentStatus, resolveAsaasCustomer, type AsaasPayment } from "@/lib/asaas";
import { asaasCustomerIdUpdate, asaasDocumentId, asaasServiceBillingUpdate, getAsaasCustomerId, getAsaasEnvironmentBilling, getLegacyAsaasCustomerId } from "@/lib/asaas-environment-records";
import { getFirebaseAdminDb } from "@/lib/firebase-admin";
import { createPublicPaymentToken, getPublicPaymentUrl } from "@/lib/payment-links";
import { getCurrentSession } from "@/lib/session";

const platformRoles = new Set(["platform_owner", "orquestra_admin"]);

function nextDueDate(billingDay: number) {
  const today = new Date();
  const year = today.getUTCFullYear();
  const month = today.getUTCMonth();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const currentDay = Math.min(billingDay, daysInMonth);
  const candidate = new Date(Date.UTC(year, month, currentDay));
  if (candidate.getTime() > Date.UTC(year, month, today.getUTCDate())) return candidate.toISOString().slice(0, 10);
  const nextMonth = month + 1;
  const nextYear = year + Math.floor(nextMonth / 12);
  const normalizedMonth = nextMonth % 12;
  const nextDaysInMonth = new Date(Date.UTC(nextYear, normalizedMonth + 1, 0)).getUTCDate();
  return new Date(Date.UTC(nextYear, normalizedMonth, Math.min(billingDay, nextDaysInMonth))).toISOString().slice(0, 10);
}

function referenceMonth(dueDate: string | null | undefined) {
  return typeof dueDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dueDate) ? dueDate.slice(0, 7) : "";
}

function firstPayment(payments: AsaasPayment[]) {
  return [...payments].sort((left, right) => (left.dueDate ?? "").localeCompare(right.dueDate ?? ""))[0] ?? null;
}

function chargeData(payment: AsaasPayment, subscriptionId: string, monthlyFee: number) {
  const status = mapAsaasPaymentStatus("PAYMENT_CREATED", typeof payment.status === "string" ? payment.status : "");
  return {
    billingProvider: "asaas" as const,
    asaasPaymentId: payment.id,
    asaasSubscriptionId: subscriptionId,
    amount: typeof payment.value === "number" ? payment.value : monthlyFee,
    dueDate: payment.dueDate ?? null,
    invoiceUrl: payment.invoiceUrl ?? null,
    status,
    paidAt: status === "paga" ? payment.paymentDate ?? payment.confirmedDate ?? new Date().toISOString() : null,
    updatedAt: FieldValue.serverTimestamp(),
  };
}

export async function POST(request: Request, { params }: { params: Promise<{ serviceId: string }> }) {
  const session = await getCurrentSession();
  if (!session || !platformRoles.has(session.role)) return NextResponse.json({ error: "Acesso administrativo necessário." }, { status: 403 });

  try {
    const body = await request.json() as Record<string, unknown>;
    const csrfCookie = (await cookies()).get("orquestra_csrf")?.value;
    if (typeof body.csrfToken !== "string" || !csrfCookie || body.csrfToken !== csrfCookie) return NextResponse.json({ error: "Sessão administrativa inválida." }, { status: 400 });

    if (!isAsaasConfigured()) return NextResponse.json({ error: "Configure ASAAS_API_KEY no ambiente do Portal antes de ativar uma cobrança." }, { status: 503 });

    const { serviceId } = await params;
    const db = getFirebaseAdminDb();
    const serviceRef = db.collection("managedServices").doc(serviceId);
    const serviceSnapshot = await serviceRef.get();
    if (!serviceSnapshot.exists) return NextResponse.json({ error: "Serviço não encontrado." }, { status: 404 });

    const service = serviceSnapshot.data() ?? {};
    const environment = getAsaasEnvironment();
    const environmentBilling = getAsaasEnvironmentBilling(service, environment);
    const existingSubscriptionId = environmentBilling.subscriptionId;
    const existingCheckoutUrl = environmentBilling.checkoutUrl;
    const hasPublicToken = Boolean(environmentBilling.publicTokenHash);

    if (existingSubscriptionId) {
      let checkoutUrl = existingCheckoutUrl;
      let publicTokenHash = hasPublicToken ? environmentBilling.publicTokenHash : null;
      if (!checkoutUrl || !publicTokenHash) {
        const publicPayment = createPublicPaymentToken();
        checkoutUrl = getPublicPaymentUrl(request, publicPayment.token);
        publicTokenHash = publicPayment.hash;
      }

      let payment: AsaasPayment | null = null;
      let subscriptionExists = true;
      try {
        payment = firstPayment(await listAsaasSubscriptionPayments(existingSubscriptionId));
      } catch (error) {
        if (!(error instanceof AsaasRequestError) || error.status !== 404) throw error;
        subscriptionExists = false;
      }
      if (subscriptionExists) {
        await serviceRef.update({
          ...asaasServiceBillingUpdate(environment, {
            checkoutUrl,
            customerId: environmentBilling.customerId ?? payment?.customer ?? (environment === "production" ? getLegacyAsaasCustomerId(service) : null),
            publicTokenHash,
            subscriptionId: existingSubscriptionId,
          }),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
      if (payment) {
        await db.collection("billingCharges").doc(asaasDocumentId("asaas", environment, payment.id)).set({
          tenantId: typeof service.tenantId === "string" ? service.tenantId : null,
          serviceId,
          billingEnvironment: environment,
          referenceMonth: referenceMonth(payment.dueDate),
          ...chargeData(payment, existingSubscriptionId, Number(service.monthlyFee) || 0),
          createdAt: FieldValue.serverTimestamp(),
        }, { merge: true });
      }
      return NextResponse.json({
        ok: true,
        alreadyConfigured: true,
        environment,
        subscriptionId: existingSubscriptionId,
        checkoutUrl,
        paymentReady: Boolean(payment),
      });
    }

    if (environment === "production" && body.confirmProduction !== true) {
      return NextResponse.json({
        code: "production_confirmation_required",
        error: "Esta ação criará uma assinatura real no Asaas Produção e precisa de confirmação explícita.",
      }, { status: 409 });
    }

    const tenantId = typeof service.tenantId === "string" ? service.tenantId : "";
    const monthlyFee = typeof service.monthlyFee === "number" ? service.monthlyFee : Number(service.monthlyFee);
    const billingDay = Math.round(Number(service.billingDay));
    if (!tenantId) return NextResponse.json({ error: "Vincule este produto a um cliente antes de configurar a cobrança." }, { status: 400 });
    if (!Number.isFinite(monthlyFee) || monthlyFee <= 0) return NextResponse.json({ error: "Informe uma mensalidade maior que zero antes de configurar a cobrança." }, { status: 400 });
    if (!Number.isInteger(billingDay) || billingDay < 1 || billingDay > 31) return NextResponse.json({ error: "Informe um dia de vencimento entre 1 e 31." }, { status: 400 });

    const companyRef = db.collection("companies").doc(tenantId);
    const companySnapshot = await companyRef.get();
    if (!companySnapshot.exists) return NextResponse.json({ error: "Cliente vinculado não foi encontrado." }, { status: 404 });
    const company = companySnapshot.data() ?? {};
    const customerName = String(company.tradeName || company.legalName || company.name || "Cliente Orquestra.cs").trim();
    const customer = await resolveAsaasCustomer({
      candidateIds: [
        getAsaasCustomerId(company, environment),
        environmentBilling.customerId,
        ...(environment === "production" ? [getLegacyAsaasCustomerId(company), getLegacyAsaasCustomerId(service)] : []),
      ],
      name: customerName,
      email: typeof company.contactEmail === "string" ? company.contactEmail : null,
      phone: typeof company.contactPhone === "string" ? company.contactPhone : null,
      cpfCnpj: typeof company.cnpj === "string" && company.cnpj ? company.cnpj : typeof company.cpf === "string" ? company.cpf : null,
      externalReference: `company:${tenantId}`,
      notificationDisabled: true,
    });
    const customerId = customer.id;
    await companyRef.update({ ...asaasCustomerIdUpdate(environment, customerId), updatedAt: FieldValue.serverTimestamp() });

    const externalReference = `managed-service:${serviceId}`;
    const existingSubscription = await findAsaasSubscriptionByExternalReference(externalReference, customerId);
    const subscription = existingSubscription ?? await createAsaasSubscription({
      customer: customerId,
      value: Math.round(monthlyFee * 100) / 100,
      nextDueDate: nextDueDate(billingDay),
      description: `${String(service.name || "Produto Orquestra.cs").trim()} · ${String(service.plan || "Plano").trim()}`.slice(0, 255),
      externalReference,
    });
    const publicPayment = createPublicPaymentToken();
    const checkoutUrl = getPublicPaymentUrl(request, publicPayment.token);
    let payment: AsaasPayment | null = null;
    try {
      payment = firstPayment(await listAsaasSubscriptionPayments(subscription.id));
    } catch {
      payment = null;
    }
    const now = new Date().toISOString();
    const batch = db.batch();
    batch.update(serviceRef, {
      billingProvider: "asaas",
      ...asaasServiceBillingUpdate(environment, {
        checkoutUrl,
        customerId,
        publicTokenHash: publicPayment.hash,
        subscriptionId: subscription.id,
      }),
      graceDays: Number(service.graceDays) >= 0 && Number(service.graceDays) <= 30 ? Math.round(Number(service.graceDays)) : 3,
      updatedAt: FieldValue.serverTimestamp(),
    });
    if (payment) {
      batch.set(db.collection("billingCharges").doc(asaasDocumentId("asaas", environment, payment.id)), {
        tenantId,
        serviceId,
        billingEnvironment: environment,
        referenceMonth: referenceMonth(payment.dueDate),
        ...chargeData(payment, subscription.id, Math.round(monthlyFee * 100) / 100),
        createdAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    }
    batch.set(db.collection("auditLogs").doc(), {
      tenantId,
      actorUserId: session.uid,
      actorRole: session.role,
      action: "billing.subscription.created",
      targetType: "managedService",
      targetId: serviceId,
      createdAt: now,
      metadata: { provider: "asaas", environment, subscriptionId: subscription.id, reusedSubscription: Boolean(existingSubscription), paymentReady: Boolean(payment), notificationsDisabled: true, graceDays: Number(service.graceDays) || 3 },
    });
    await batch.commit();

    return NextResponse.json({ ok: true, environment, subscriptionId: subscription.id, checkoutUrl, paymentReady: Boolean(payment) });
  } catch (error) {
    if (error instanceof AsaasConfigError) return NextResponse.json({ error: error.message }, { status: 503 });
    if (error instanceof AsaasRequestError) {
      const details = error.details as { errors?: unknown } | null;
      const providerErrors = Array.isArray(details?.errors)
        ? details.errors.map((item) => {
          const entry = item as { code?: unknown; description?: unknown };
          return {
            code: typeof entry.code === "string" ? entry.code : null,
            description: typeof entry.description === "string" ? entry.description : null,
          };
        })
        : [];
      console.error("Asaas request rejected", { status: error.status, path: error.path, errors: providerErrors });
      return NextResponse.json({ error: "O Asaas recusou a criação da assinatura. Confira os dados do cliente e tente novamente." }, { status: 502 });
    }
    return NextResponse.json({ error: "Não foi possível preparar a cobrança agora." }, { status: 500 });
  }
}
