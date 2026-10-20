import { createHash } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { createAsaasCustomer, createAsaasPayment, isAsaasConfigured, type AsaasPayment } from "@/lib/asaas";
import { createCreditOrderKey, getAiCreditPackage, verifyCreditPurchaseToken } from "@/lib/ai-credit-purchases";
import { getFirebaseAdminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";

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

export async function POST(request: Request) {
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
    const existingOrder = await orderRef.get();
    if (existingOrder.exists) {
      const existing = existingOrder.data() ?? {};
      if (typeof existing.invoiceUrl === "string" && existing.invoiceUrl.startsWith("https://")) {
        return NextResponse.json({ ok: true, orderId: orderRef.id, status: existing.status || "aberta", invoiceUrl: existing.invoiceUrl });
      }
      if (existing.status === "creating") return NextResponse.json({ error: "A cobrança está sendo preparada. Tente novamente em alguns segundos." }, { status: 409 });
    }

    await orderRef.set({
      amount: creditPackage.price,
      creditAmount: creditPackage.credits,
      packageId,
      sourceSystem: claims.sourceSystem,
      externalTenantId: claims.externalTenantId,
      serviceId: serviceRef.id,
      tenantId,
      status: "creating",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

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

    const payment = await createAsaasPayment({
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
        metadata: { packageId, credits: creditPackage.credits, amount: creditPackage.price, serviceId: serviceRef.id, paymentId: payment.id },
      });
    });

    return NextResponse.json({ ok: true, orderId: orderRef.id, status: "aberta", invoiceUrl: payment.invoiceUrl || null });
  } catch (error) {
    console.error("ai_credit_checkout_failed", error instanceof Error ? error.message : "unknown-error");
    return NextResponse.json({ error: "Não foi possível preparar o pagamento dos créditos agora." }, { status: 500 });
  }
}

