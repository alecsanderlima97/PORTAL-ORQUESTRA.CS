import { createHash, timingSafeEqual } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { mapAsaasPaymentStatus } from "@/lib/asaas";
import { getFirebaseAdminDb } from "@/lib/firebase-admin";
import { sendConnectorCommand } from "@/lib/connector-commands";

const MAX_BODY_BYTES = 128 * 1024;

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
    eventRef = db.collection("asaasWebhookEvents").doc(eventKey(eventId));
    const existingEvent = await eventRef.get();
    if (existingEvent.exists && existingEvent.data()?.processedAt) return NextResponse.json({ ok: true, duplicate: true });
    await eventRef.set({ eventId, event, paymentId, receivedAt: FieldValue.serverTimestamp(), processingAt: FieldValue.serverTimestamp() }, { merge: true });

    const paymentQuery = await db.collection("billingCharges").where("asaasPaymentId", "==", paymentId).limit(1).get();
    let chargeRef = paymentQuery.docs[0]?.ref ?? null;
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
      const orderQuery = await db.collection("creditOrders").where("asaasPaymentId", "==", paymentId).limit(1).get();
      const orderSnapshot = orderQuery.docs[0];
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
      const serviceQuery = await db.collection("managedServices").where("asaasSubscriptionId", "==", payment.subscription).limit(1).get();
      const serviceSnapshot = serviceQuery.docs[0];
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
    const paidAt = status === "paga" ? (payment?.paymentDate || payment?.confirmedDate || new Date().toISOString()) : null;
    const chargeData = {
      billingProvider: "asaas",
      asaasPaymentId: paymentId,
      asaasSubscriptionId: safeText(payment?.subscription, 160) || null,
      amount: typeof payment?.value === "number" ? payment.value : null,
      dueDate: safeText(payment?.dueDate, 20) || null,
      invoiceUrl: safeText(payment?.invoiceUrl, 1000) || null,
      status,
      paidAt,
      lastWebhookEvent: event,
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (chargeRef) {
      await chargeRef.update(chargeData);
    } else if (serviceRef && serviceData && typeof serviceData.tenantId === "string") {
      chargeRef = db.collection("billingCharges").doc(`asaas-${paymentId}`);
      await chargeRef.set({
        tenantId: serviceData.tenantId,
        serviceId: serviceRef.id,
        ...(creditOrderRef ? { creditOrderId: creditOrderRef.id, creditPackageId: creditOrderData?.packageId || null, creditAmount: Number(creditOrderData?.creditAmount) || null } : {}),
        referenceMonth: referenceMonth(payment?.dueDate),
        ...chargeData,
        createdAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    } else {
      await db.collection("asaasUnmatchedEvents").doc(eventKey(eventId)).set({
        eventId,
        event,
        paymentId,
        subscriptionId: safeText(payment?.subscription, 160) || null,
        customerId: safeText(payment?.customer, 160) || null,
        status,
        dueDate: safeText(payment?.dueDate, 20) || null,
        createdAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    }

    await db.collection("auditLogs").doc().set({
      tenantId: serviceData?.tenantId ?? null,
      actorUserId: "asaas-webhook",
      actorRole: "system",
      action: "billing.payment.updated",
      targetType: "billingCharge",
      targetId: chargeRef?.id ?? paymentId,
      createdAt: new Date().toISOString(),
      metadata: { provider: "asaas", event, paymentId, status },
    });

    if (creditOrderRef && creditOrderData && status === "paga") {
      const creditAmount = Math.round(Number(creditOrderData.creditAmount));
      const amount = Number(creditOrderData.amount || payment?.value || 0);
      const packageId = safeText(creditOrderData.packageId, 80);
      if (!Number.isInteger(creditAmount) || creditAmount <= 0 || !packageId || !serviceData) throw new Error("credit-order-invalid");

      const connector = await sendConnectorCommand(serviceData, {
        commandId: creditOrderRef.id,
        commandType: "ai_credits.granted",
        creditGrant: {
          amount,
          credits: creditAmount,
          packageId,
          paymentId,
          purchaseId: creditOrderRef.id,
        },
      });
      if (!connector.sent) {
        await creditOrderRef.set({ grantStatus: "pending", grantError: connector.skipped ? "connector_not_configured" : `http_${connector.status}`, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
        throw new Error("credit-grant-pending");
      }
      await creditOrderRef.set({ grantStatus: "applied", grantedAt: FieldValue.serverTimestamp(), status: "paga", paidAt, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    }

    await eventRef.set({ processedAt: FieldValue.serverTimestamp(), status: "completed" }, { merge: true });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (eventRef) await eventRef.set({ status: "error", lastError: error instanceof Error ? error.message : "unknown-error", updatedAt: FieldValue.serverTimestamp() }, { merge: true }).catch(() => undefined);
    return NextResponse.json({ error: "Não foi possível processar o evento." }, { status: 500 });
  }
}
