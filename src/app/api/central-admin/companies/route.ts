import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getFirebaseAdminDb } from "@/lib/firebase-admin";
import { getCurrentSession } from "@/lib/session";

const platformRoles = new Set(["platform_owner", "orquestra_admin"]);
const contractStatuses = new Set(["ativo", "teste", "suspenso", "encerrado"]);
const accessStatuses = new Set(["ativo", "em_tolerancia", "bloqueado", "liberacao_pendente", "revisao_manual"]);

function text(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function optionalText(value: unknown, maxLength: number) {
  const result = text(value, maxLength);
  return result || null;
}

function numberValue(value: unknown, fallback: number) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function POST(request: Request) {
  const session = await getCurrentSession();

  if (!session || !platformRoles.has(session.role)) {
    return NextResponse.json({ error: "Acesso administrativo necessário." }, { status: 403 });
  }

  try {
    const body = await request.json() as Record<string, unknown>;
    const csrfCookie = (await cookies()).get("orquestra_csrf")?.value;
    if (typeof body.csrfToken !== "string" || !csrfCookie || body.csrfToken !== csrfCookie) {
      return NextResponse.json({ error: "Sessão administrativa inválida." }, { status: 400 });
    }

    const legalName = text(body.legalName, 160);
    const responsibleName = text(body.responsibleName, 120);
    const contactEmail = text(body.contactEmail, 160).toLowerCase();
    const plan = text(body.plan, 80);
    const contractStatus = text(body.contractStatus, 30);
    const accessStatus = text(body.accessStatus, 30);
    const billingDay = Math.round(numberValue(body.billingDay, 10));
    const graceDays = Math.round(numberValue(body.graceDays, 5));
    const monthlyFee = numberValue(body.monthlyFee, 0);

    if (!legalName || !responsibleName || !contactEmail || !plan) {
      return NextResponse.json({ error: "Preencha empresa, responsável, e-mail e plano." }, { status: 400 });
    }

    if (!/^\S+@\S+\.\S+$/.test(contactEmail)) {
      return NextResponse.json({ error: "Informe um e-mail válido." }, { status: 400 });
    }

    if (!contractStatuses.has(contractStatus) || !accessStatuses.has(accessStatus)) {
      return NextResponse.json({ error: "Status inicial inválido." }, { status: 400 });
    }

    if (billingDay < 1 || billingDay > 31 || graceDays < 0 || graceDays > 30 || monthlyFee < 0) {
      return NextResponse.json({ error: "Confira vencimento, tolerância e mensalidade." }, { status: 400 });
    }

    const db = getFirebaseAdminDb();
    const companyRef = db.collection("companies").doc();
    const now = new Date().toISOString();
    const company = {
      legalName,
      tradeName: optionalText(body.tradeName, 160),
      responsibleName,
      contactEmail,
      contactPhone: text(body.contactPhone, 40),
      document: optionalText(body.document, 32),
      city: text(body.city, 100),
      state: text(body.state, 2).toUpperCase(),
      address: optionalText(body.address, 240),
      plan,
      contractStatus,
      accessStatus,
      billingDay,
      graceDays,
      monthlyFee: Math.round(monthlyFee * 100) / 100,
      startDate: optionalText(body.startDate, 20),
      renewalDate: optionalText(body.renewalDate, 20),
      notes: optionalText(body.notes, 2000),
      createdAt: FieldValue.serverTimestamp(),
      createdBy: session.uid,
      updatedAt: FieldValue.serverTimestamp(),
    };

    const batch = db.batch();
    batch.set(companyRef, company);
    batch.set(db.collection("auditLogs").doc(), {
      tenantId: companyRef.id,
      actorUserId: session.uid,
      actorRole: session.role,
      action: "company.created",
      targetType: "company",
      targetId: companyRef.id,
      createdAt: now,
      metadata: { plan, contractStatus, accessStatus },
    });
    await batch.commit();

    return NextResponse.json({ ok: true, companyId: companyRef.id });
  } catch {
    return NextResponse.json({ error: "Não foi possível cadastrar a empresa agora." }, { status: 500 });
  }
}
