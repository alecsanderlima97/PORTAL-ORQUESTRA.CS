import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getFirebaseAdminDb } from "@/lib/firebase-admin";
import { getCurrentSession } from "@/lib/session";

const platformRoles = new Set(["platform_owner", "orquestra_admin"]);
const contractStatuses = new Set(["ativo", "teste", "suspenso", "encerrado"]);
const accessStatuses = new Set(["ativo", "em_tolerancia", "bloqueado", "liberacao_pendente", "revisao_manual"]);
const sourceSystemNames: Record<string, string> = {
  mad360: "Orquestra Mad360 / Serraria",
  orquestra_hub: "Orquestra Hub",
  orquestra_fit: "Orquestra Fit",
  orquestracs_face_id: "Orquestra Face ID",
};

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
    const ownerGoogleEmail = optionalText(body.ownerGoogleEmail, 160)?.toLowerCase() ?? null;
    const contactEmail = optionalText(body.contactEmail, 160)?.toLowerCase() ?? null;
    const plan = text(body.plan, 80);
    const sourceSystem = text(body.sourceSystem, 80) || null;
    const externalTenantId = optionalText(body.externalTenantId, 120);
    const systemUrl = optionalText(body.systemUrl, 500);
    const contractStatus = text(body.contractStatus, 30);
    const accessStatus = text(body.accessStatus, 30);
    const billingDay = Math.round(numberValue(body.billingDay, 10));
    const graceDays = Math.round(numberValue(body.graceDays, 5));
    const monthlyFee = numberValue(body.monthlyFee, 0);

    if (!legalName || !responsibleName || !plan) {
      return NextResponse.json({ error: "Preencha empresa, responsável e plano." }, { status: 400 });
    }

    if ((ownerGoogleEmail && !/^\S+@\S+\.\S+$/.test(ownerGoogleEmail)) || (contactEmail && !/^\S+@\S+\.\S+$/.test(contactEmail))) {
      return NextResponse.json({ error: "Informe e-mails válidos." }, { status: 400 });
    }

    if ((externalTenantId && !sourceSystem) || (sourceSystem && (!externalTenantId || !systemUrl))) {
      return NextResponse.json({ error: "Informe o sistema, o ID externo da empresa e o link de produção." }, { status: 400 });
    }

    if (systemUrl) {
      try {
        const parsedUrl = new URL(systemUrl);
        if (!["http:", "https:"].includes(parsedUrl.protocol)) throw new Error("invalid protocol");
      } catch {
        return NextResponse.json({ error: "Informe um link de produção válido." }, { status: 400 });
      }
    }

    if (!contractStatuses.has(contractStatus) || !accessStatuses.has(accessStatus)) {
      return NextResponse.json({ error: "Status inicial inválido." }, { status: 400 });
    }

    if (billingDay < 1 || billingDay > 31 || graceDays < 0 || graceDays > 30 || monthlyFee < 0) {
      return NextResponse.json({ error: "Confira vencimento, tolerância e mensalidade." }, { status: 400 });
    }

    const db = getFirebaseAdminDb();
    const companyRef = db.collection("companies").doc();
    if (ownerGoogleEmail) {
      const existingProfile = await db.collection("users").where("email", "==", ownerGoogleEmail).limit(10).get();
      if (!existingProfile.empty) {
        return NextResponse.json({ error: "Este Google já possui um cadastro no Portal. Gerencie o acesso existente em vez de criar outro vínculo." }, { status: 409 });
      }

      const existingInvite = await db.collection("userInvites").where("email", "==", ownerGoogleEmail).limit(10).get();
      const inviteAlreadyUsed = existingInvite.docs.some((doc) => doc.data().active === true);
      if (inviteAlreadyUsed) {
        return NextResponse.json({ error: "Este Google já possui um convite de acesso pendente." }, { status: 409 });
      }
    }

    const now = new Date().toISOString();
    const company = {
      legalName,
      tradeName: optionalText(body.tradeName, 160),
      responsibleName,
      ownerGoogleEmail,
      contactEmail,
      contactPhone: text(body.contactPhone, 40),
      document: optionalText(body.document, 32),
      city: text(body.city, 100),
      state: text(body.state, 2).toUpperCase(),
      address: optionalText(body.address, 240),
      plan,
      sourceSystem,
      externalTenantId,
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
    if (ownerGoogleEmail) {
      batch.set(db.collection("userInvites").doc(), {
        email: ownerGoogleEmail,
        tenantId: companyRef.id,
        role: "company_owner",
        active: true,
        invitedBy: session.uid,
        createdAt: FieldValue.serverTimestamp(),
      });
    }

    if (sourceSystem && externalTenantId && systemUrl) {
      batch.set(db.collection("managedServices").doc(), {
        name: sourceSystemNames[sourceSystem] ?? text(body.tradeName, 160) ?? sourceSystem,
        sourceSystem,
        type: "sistema_web",
        url: systemUrl,
        tenantId: companyRef.id,
        plan,
        environment: "production",
        accessStatus,
        connectorStatus: "pendente",
        externalTenantId,
        lastSyncAt: null,
        lastKnownStatus: "Ponte segura ainda não configurada.",
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
    batch.set(db.collection("auditLogs").doc(), {
      tenantId: companyRef.id,
      actorUserId: session.uid,
      actorRole: session.role,
      action: "company.created",
      targetType: "company",
      targetId: companyRef.id,
      createdAt: now,
      metadata: { plan, contractStatus, accessStatus, sourceSystem, externalTenantId },
    });
    await batch.commit();

    return NextResponse.json({ ok: true, companyId: companyRef.id });
  } catch {
    return NextResponse.json({ error: "Não foi possível cadastrar a empresa agora." }, { status: 500 });
  }
}
