import { createHash } from "node:crypto";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { createAsaasCustomer, createAsaasPayment, findAsaasPaymentByExternalReference, isAsaasConfigured } from "@/lib/asaas";
import { createCreditOrderKey, getAiCreditPackage, verifyCreditPurchaseToken } from "@/lib/ai-credit-purchases";
import { getFirebaseAdminDb } from "@/lib/firebase-admin";
import { clientIp, consumeRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

// Tentativa "creating" mais antiga que isto é considerada abandonada e pode ser retomada.
// Deve ser maior que o tempo máximo da requisição (algumas chamadas ao Asaas com timeout de 15 s).
const CREATING_STALE_MS = 3 * 60 * 1000;

function nextDueDate() {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

function safeText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function orderEventId(orderId: string) {
  return createHash("sha256").update(`credit-order:${orderId}`).digest("hex");
}

type OrderClaim =
  | { kind: "ready"; status: string; invoiceUrl: string | null }
  | { kind: "busy" }
  | { kind: "claimed" };

export async function POST(request: Request) {
  const limit = await consumeRateLimit({ scope: "credit-checkout", ip: clientIp(request), limit: 10, windowMs: 10 * 60 * 1000 });
  if (!limit.allowed) {
    return NextResponse.json({ error: "Muitas tentativas. Aguarde alguns minutos." }, { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } });
  }

  try {
    const body = await request.json() as Record<string, unknown>;
    const token = safeText(body.token, 1200);
    const packageId = safeText(body.packageId, 80);
    const claims = verifyCreditPurchaseToken(token);
    const creditPackage = getAiCreditPackage(packageId);
    if (!claims || !creditPackage) return NextResponse.json({ error: "Link ou pacote de créditos inválido." }, { status: 400 });
    if (!isAsaasConfigured()) return NextResponse.json({ error: "O pagamento ainda não está configurado no Portal." }, { status: 503 });

    const db = getFirebaseAdminDb();
    const serviceQuery = await db.collection("managedServices")
      .where("sourceSystem", "==", claims.sourceSystem)
      .where("externalTenantId", "==", claims.externalTenantId)
      .limit(5)
      .get();
    const activeServices = serviceQuery.docs.filter((doc) => doc.data().isArchived !== true);
    if (activeServices.length !== 1) return NextResponse.json({ error: activeServices.length > 1 ? "Há mais de um produto vinculado a este cliente." : "Produto de origem não encontrado no Portal." }, { status: activeServices.length > 1 ? 409 : 404 });

    const serviceRef = activeServices[0].ref;
    const service = activeServices[0].data();
    const tenantId = safeText(service.tenantId, 160);
    if (!tenantId) return NextResponse.json({ error: "O produto ainda não está vinculado a um cliente no Portal." }, { status: 409 });
    const companyRef = db.collection("companies").doc(tenantId);
    const companySnapshot = await companyRef.get();
    if (!companySnapshot.exists) return NextResponse.json({ error: "Cliente do produto não encontrado." }, { status: 404 });
    const company = companySnapshot.data() ?? {};
    const orderKey = createCreditOrderKey(claims.sourceSystem, claims.externalTenantId, packageId as keyof typeof import("@/lib/ai-credit-purchases").AI_CREDIT_PACKAGES);
    const orderRef = db.collection("creditOrders").doc(orderKey);

    // Reserva do pedido em transação: duas requisições simultâneas não podem criar duas cobranças.
    const claim = await db.runTransaction(async (transaction): Promise<OrderClaim> => {
      const current = await transaction.get(orderRef);
      const data = current.data() ?? {};
      if (data.status === "paga") {
        return { kind: "ready", status: "paga", invoiceUrl: typeof data.invoiceUrl === "string" ? data.invoiceUrl : null };
      }
      if (typeof data.invoiceUrl === "string" && data.invoiceUrl.startsWith("https://")) {
        return { kind: "ready", status: safeText(data.status, 40) || "aberta", invoiceUrl: data.invoiceUrl };
      }
      const creatingMs = data.creatingAt instanceof Timestamp ? data.creatingAt.toMillis() : 0;
      if (data.status === "creating" && Date.now() - creatingMs < CREATING_STALE_MS) {
        return { kind: "busy" };
      }
      transaction.set(orderRef, {
        amount: creditPackage.price,
        creditAmount: creditPackage.credits,
        packageId,
        sourceSystem: claims.sourceSystem,
        externalTenantId: claims.externalTenantId,
        serviceId: serviceRef.id,
        tenantId,
        status: "creating",
        creatingAt: Timestamp.now(),
        updatedAt: FieldValue.serverTimestamp(),
        ...(current.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
      }, { merge: true });
      return { kind: "claimed" };
    });

    if (claim.kind === "ready") {
      return NextResponse.json({ ok: true, orderId: orderRef.id, status: claim.status, invoiceUrl: claim.invoiceUrl });
    }
    if (claim.kind === "busy") {
      return NextResponse.json({ error: "A cobrança está sendo preparada. Tente novamente em alguns segundos." }, { status: 409 });
    }

    const customerName = safeText(company.tradeName || company.legalName || company.name, 160) || "Cliente Orquestra.cs";
    const existingCustomerId = safeText(company.asaasCustomerId, 160);
    let customerId = existingCustomerId;
    if (!customerId) {
      const customer = await createAsaasCustomer({
        name: customerName,
        email: safeText(company.contactEmail, 180) || null,
        phone: safeText(company.contactPhone, 40) || null,
        cpfCnpj: safeText(company.cnpj || company.cpf || company.document, 32) || null,
        externalReference: `company:${tenantId}`,
        notificationDisabled: true,
      });
      customerId = customer.id;
      await companyRef.update({ asaasCustomerId: customerId, updatedAt: FieldValue.serverTimestamp() });
    }

    // Antes de criar, verifica se o Asaas já aceitou uma cobrança deste pedido (retry após falha).
    // Se a consulta falhar, a função lança erro e NÃO cria outra cobrança.
    const existingPayment = await findAsaasPaymentByExternalReference(`ai-credits:${orderRef.id}`);
    const payment = existingPayment ?? await createAsaasPayment({
      customer: customerId,
      value: creditPackage.price,
      dueDate: nextDueDate(),
      description: `Créditos IA ${creditPackage.credits} · ${String(service.name || "Orquestra.cs")}`.slice(0, 255),
      externalReference: `ai-credits:${orderRef.id}`,
      notificationDisabled: true,
    });
    const chargeId = `asaas-credit-${payment.id}`;
    await db.runTransaction(async (transaction) => {
      const current = await transaction.get(orderRef);
      if (current.data()?.status === "paga") return;
      transaction.set(orderRef, {
        asaasPaymentId: payment.id,
        amount: creditPackage.price,
        creditAmount: creditPackage.credits,
        dueDate: payment.dueDate || nextDueDate(),
        externalReference: `ai-credits:${orderRef.id}`,
        invoiceUrl: payment.invoiceUrl || null,
        packageId,
        serviceId: serviceRef.id,
        sourceSystem: claims.sourceSystem,
        externalTenantId: claims.externalTenantId,
        tenantId,
        status: "aberta",
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
      transaction.set(db.collection("billingCharges").doc(chargeId), {
        tenantId,
        serviceId: serviceRef.id,
        creditOrderId: orderRef.id,
        creditPackageId: packageId,
        creditAmount: creditPackage.credits,
        billingProvider: "asaas",
        asaasPaymentId: payment.id,
        amount: creditPackage.price,
        dueDate: payment.dueDate || nextDueDate(),
        invoiceUrl: payment.invoiceUrl || null,
        status: "aberta",
        referenceMonth: String(payment.dueDate || nextDueDate()).slice(0, 7),
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
      transaction.set(db.collection("auditLogs").doc(orderEventId(orderRef.id)), {
        tenantId,
        actorUserId: "public-credit-checkout",
        actorRole: "system",
        action: "billing.ai_credits.order_created",
        targetType: "creditOrder",
        targetId: orderRef.id,
        createdAt: new Date().toISOString(),
        metadata: { packageId, credits: creditPackage.credits, amount: creditPackage.price, serviceId: serviceRef.id, paymentId: payment.id, reusedPayment: Boolean(existingPayment) },
      });
    });

    return NextResponse.json({ ok: true, orderId: orderRef.id, status: "aberta", invoiceUrl: payment.invoiceUrl || null });
  } catch (error) {
    console.error("ai_credit_checkout_failed", error instanceof Error ? error.message : "unknown-error");
    return NextResponse.json({ error: "Não foi possível preparar o pagamento dos créditos agora." }, { status: 500 });
  }
}
