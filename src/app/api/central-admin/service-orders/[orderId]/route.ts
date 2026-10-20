import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getFirebaseAdminDb } from "@/lib/firebase-admin";
import { mapServiceOrder } from "@/lib/service-orders";
import { getCurrentSession } from "@/lib/session";

const platformRoles = new Set(["platform_owner", "orquestra_admin"]);
const statuses = new Set(["rascunho", "orcamento", "aprovado", "em_execucao", "concluida", "cancelada"]);
const paymentStatuses = new Set(["pendente", "parcial", "recebido", "isento"]);

export async function GET(_request: Request, context: { params: Promise<{ orderId: string }> }) {
  const session = await getCurrentSession();
  if (!session || !platformRoles.has(session.role)) return NextResponse.json({ error: "Acesso administrativo necessário." }, { status: 403 });
  const { orderId } = await context.params;
  const snapshot = await getFirebaseAdminDb().collection("serviceOrders").doc(orderId).get();
  if (!snapshot.exists) return NextResponse.json({ error: "Ordem de serviço não encontrada." }, { status: 404 });
  return NextResponse.json({ order: mapServiceOrder(snapshot.id, snapshot.data() || {}) });
}

export async function PATCH(request: Request, context: { params: Promise<{ orderId: string }> }) {
  const session = await getCurrentSession();
  if (!session || !platformRoles.has(session.role)) return NextResponse.json({ error: "Acesso administrativo necessário." }, { status: 403 });
  const { orderId } = await context.params;
  const body = await request.json() as Record<string, unknown>;
  const csrfCookie = (await cookies()).get("orquestra_csrf")?.value;
  if (typeof body.csrfToken !== "string" || !csrfCookie || body.csrfToken !== csrfCookie) return NextResponse.json({ error: "Sessão administrativa inválida." }, { status: 400 });
  const db = getFirebaseAdminDb();
  const orderRef = db.collection("serviceOrders").doc(orderId);
  const snapshot = await orderRef.get();
  if (!snapshot.exists) return NextResponse.json({ error: "Ordem de serviço não encontrada." }, { status: 404 });
  const current = mapServiceOrder(snapshot.id, snapshot.data() || {});
  const status = typeof body.status === "string" && statuses.has(body.status) ? body.status : current.status;
  const paymentStatus = typeof body.paymentStatus === "string" && paymentStatuses.has(body.paymentStatus) ? body.paymentStatus : current.paymentStatus;
  const batch = db.batch();
  batch.update(orderRef, { status, paymentStatus, updatedAt: FieldValue.serverTimestamp() });
  let financeChargeId = current.financeChargeId;
  if (body.createFinance === true && !financeChargeId && current.totalAmount > 0) {
    financeChargeId = `os-${orderId}`;
    batch.set(db.collection("billingCharges").doc(financeChargeId), {
      tenantId: current.tenantId,
      serviceOrderId: orderId,
      referenceMonth: current.number,
      amount: current.totalAmount,
      dueDate: current.dueDate || new Date().toISOString().slice(0, 10),
      status: paymentStatus === "recebido" ? "paga" : "aberta",
      paidAt: paymentStatus === "recebido" ? new Date().toISOString() : null,
      billingProvider: null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    batch.update(orderRef, { financeChargeId, updatedAt: FieldValue.serverTimestamp() });
  } else if (financeChargeId) {
    batch.update(db.collection("billingCharges").doc(financeChargeId), {
      status: paymentStatus === "recebido" ? "paga" : status === "cancelada" ? "cancelada" : "aberta",
      paidAt: paymentStatus === "recebido" ? new Date().toISOString() : null,
      updatedAt: FieldValue.serverTimestamp(),
    });
  }
  batch.set(db.collection("auditLogs").doc(), { actorUserId: session.uid, actorRole: session.role, action: "service_order_updated", targetType: "serviceOrder", targetId: orderId, tenantId: current.tenantId, createdAt: FieldValue.serverTimestamp(), summary: `${current.number} atualizada` });
  await batch.commit();
  return NextResponse.json({ ok: true, financeChargeId });
}
