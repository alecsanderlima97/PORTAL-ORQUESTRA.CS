import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getFirebaseAdminDb } from "@/lib/firebase-admin";
import { mapServiceOrder } from "@/lib/service-orders";
import { getCurrentSession } from "@/lib/session";

const platformRoles = new Set(["platform_owner", "orquestra_admin"]);
const statuses = new Set(["rascunho", "orcamento", "aprovado", "em_execucao", "concluida", "cancelada"]);
const paymentStatuses = new Set(["pendente", "parcial", "recebido", "isento"]);

function numberValue(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed * 100) / 100 : 0;
}

function text(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

async function canUseApi() {
  const session = await getCurrentSession();
  return session && platformRoles.has(session.role) ? session : null;
}

export async function GET() {
  if (!await canUseApi()) return NextResponse.json({ error: "Acesso administrativo necessário." }, { status: 403 });
  const snapshot = await getFirebaseAdminDb().collection("serviceOrders").orderBy("createdAt", "desc").limit(200).get();
  return NextResponse.json({ orders: snapshot.docs.map((item) => mapServiceOrder(item.id, item.data())) });
}

export async function POST(request: Request) {
  const session = await canUseApi();
  if (!session) return NextResponse.json({ error: "Acesso administrativo necessário." }, { status: 403 });
  try {
    const body = await request.json() as Record<string, unknown>;
    const csrfCookie = (await cookies()).get("orquestra_csrf")?.value;
    if (typeof body.csrfToken !== "string" || !csrfCookie || body.csrfToken !== csrfCookie) return NextResponse.json({ error: "Sessão administrativa inválida." }, { status: 400 });
    const tenantId = text(body.tenantId, 160);
    const status = text(body.status, 40) || "rascunho";
    const paymentStatus = text(body.paymentStatus, 40) || "pendente";
    if (!tenantId) return NextResponse.json({ error: "Selecione o cliente da ordem de serviço." }, { status: 400 });
    if (!statuses.has(status) || !paymentStatuses.has(paymentStatus)) return NextResponse.json({ error: "Status da ordem ou pagamento inválido." }, { status: 400 });

    const db = getFirebaseAdminDb();
    const companySnapshot = await db.collection("companies").doc(tenantId).get();
    if (!companySnapshot.exists) return NextResponse.json({ error: "Cliente não encontrado." }, { status: 404 });
    const company = companySnapshot.data() || {};
    const parts = Array.isArray(body.parts) ? body.parts.slice(0, 50).map((value) => {
      const item = value && typeof value === "object" ? value as Record<string, unknown> : {};
      return {
        description: text(item.description, 160),
        partNumber: text(item.partNumber, 80) || null,
        quantity: Math.max(1, Math.round(numberValue(item.quantity))),
        supplierUrl: text(item.supplierUrl, 500) || null,
        unitCost: numberValue(item.unitCost),
        unitPrice: numberValue(item.unitPrice),
      };
    }).filter((item) => item.description) : [];
    const partsAmount = parts.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const visitAmount = numberValue(body.visitAmount);
    const laborAmount = numberValue(body.laborAmount);
    const discountAmount = Math.min(numberValue(body.discountAmount), partsAmount + visitAmount + laborAmount);
    const totalAmount = Math.max(0, Math.round((partsAmount + visitAmount + laborAmount - discountAmount) * 100) / 100);
    const orderRef = db.collection("serviceOrders").doc();
    const orderNumber = `OS-${new Date().getFullYear()}-${orderRef.id.slice(0, 6).toUpperCase()}`;
    const now = new Date().toISOString();
    const order = {
      number: orderNumber,
      tenantId,
      companyName: text(company.tradeName || company.legalName || company.name, 160),
      companyContact: text(company.contactPhone || company.contactEmail || company.email, 200),
      status,
      paymentStatus,
      paymentMethod: text(body.paymentMethod, 40) || null,
      dueDate: text(body.dueDate, 20) || null,
      equipmentType: text(body.equipmentType, 80),
      equipmentBrand: text(body.equipmentBrand, 100),
      equipmentModel: text(body.equipmentModel, 120),
      serialNumber: text(body.serialNumber, 120),
      reportedIssue: text(body.reportedIssue, 4000),
      diagnosis: text(body.diagnosis, 6000),
      serviceDescription: text(body.serviceDescription, 6000),
      warrantyTerms: text(body.warrantyTerms, 2000),
      technicianName: text(body.technicianName, 160) || session.name,
      parts,
      visitAmount,
      laborAmount,
      discountAmount,
      totalAmount,
      attachments: [],
      financeChargeId: null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      createdBy: session.uid,
    };
    const batch = db.batch();
    batch.set(orderRef, order);
    let financeChargeId: string | null = null;
    if (body.createFinance === true && totalAmount > 0) {
      financeChargeId = `os-${orderRef.id}`;
      const chargeRef = db.collection("billingCharges").doc(financeChargeId);
      batch.set(chargeRef, {
        tenantId,
        serviceOrderId: orderRef.id,
        referenceMonth: orderNumber,
        amount: totalAmount,
        dueDate: text(body.dueDate, 20) || now.slice(0, 10),
        status: paymentStatus === "recebido" ? "paga" : "aberta",
        paidAt: paymentStatus === "recebido" ? now : null,
        billingProvider: null,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      batch.update(orderRef, { financeChargeId, updatedAt: FieldValue.serverTimestamp() });
    }
    batch.set(db.collection("auditLogs").doc(), { actorUserId: session.uid, actorRole: session.role, action: "service_order_created", targetType: "serviceOrder", targetId: orderRef.id, tenantId, createdAt: FieldValue.serverTimestamp(), summary: `${orderNumber} criada` });
    await batch.commit();
    return NextResponse.json({ orderId: orderRef.id, number: orderNumber, financeChargeId }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível criar a ordem de serviço." }, { status: 500 });
  }
}
