import { FieldValue } from "firebase-admin/firestore";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getFirebaseAdminDb } from "@/lib/firebase-admin";
import { getCurrentSession } from "@/lib/session";

const platformRoles = new Set(["platform_owner", "orquestra_admin"]);
const serviceTypes = new Set(["sistema_web", "site", "landing_page", "crm", "erp", "saas", "consultoria", "marketing_digital", "trafego_pago", "automacao", "integracao", "suporte_tecnico", "outro"]);
const editableFields = ["name", "type", "url", "plan", "monthlyFee", "developmentFee", "implementationFee", "supportFee", "billingDay", "renewalDate", "currentVersion", "lastUpdatedAt", "lastUpdateSummary"] as const;

function text(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function optionalText(value: unknown, maxLength: number) {
  const result = text(value, maxLength);
  return result || null;
}

function optionalMoney(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed * 100) / 100 : undefined;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ serviceId: string }> }) {
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

    const { serviceId } = await params;
    if (!serviceId || serviceId.length > 160) {
      return NextResponse.json({ error: "Serviço inválido." }, { status: 400 });
    }

    const db = getFirebaseAdminDb();
    const serviceRef = db.collection("managedServices").doc(serviceId);
    const serviceSnapshot = await serviceRef.get();
    if (!serviceSnapshot.exists) {
      return NextResponse.json({ error: "Serviço não encontrado." }, { status: 404 });
    }

    const name = text(body.name, 160);
    const type = text(body.type, 40);
    const plan = text(body.plan, 80);
    const url = text(body.url, 500);
    const monthlyFee = optionalMoney(body.monthlyFee);
    const developmentFee = optionalMoney(body.developmentFee);
    const implementationFee = optionalMoney(body.implementationFee);
    const supportFee = optionalMoney(body.supportFee);
    const billingDayValue = body.billingDay === null || body.billingDay === "" || body.billingDay === undefined ? null : Number(body.billingDay);
    const billingDay = billingDayValue === null ? null : Math.round(billingDayValue);
    const renewalDate = optionalText(body.renewalDate, 20);
    const currentVersion = optionalText(body.currentVersion, 80);
    const lastUpdatedAt = optionalText(body.lastUpdatedAt, 20);
    const lastUpdateSummary = optionalText(body.lastUpdateSummary, 500);

    if (!name || !plan || !url || !serviceTypes.has(type)) {
      return NextResponse.json({ error: "Preencha nome, tipo, plano e link do serviço." }, { status: 400 });
    }

    try {
      const parsedUrl = new URL(url);
      if (!["http:", "https:"].includes(parsedUrl.protocol)) throw new Error("invalid protocol");
    } catch {
      return NextResponse.json({ error: "Informe um link válido com http ou https." }, { status: 400 });
    }

    if ([monthlyFee, developmentFee, implementationFee, supportFee].some((value) => value === undefined)) {
      return NextResponse.json({ error: "Confira os valores comerciais informados." }, { status: 400 });
    }

    if (billingDay !== null && (!Number.isFinite(billingDay) || billingDay < 1 || billingDay > 31)) {
      return NextResponse.json({ error: "O vencimento deve estar entre os dias 1 e 31." }, { status: 400 });
    }

    const updatedFields = { name, type, url, plan, monthlyFee, developmentFee, implementationFee, supportFee, billingDay, renewalDate, currentVersion, lastUpdatedAt, lastUpdateSummary };
    const previousData = serviceSnapshot.data() ?? {};
    const batch = db.batch();
    batch.update(serviceRef, { ...updatedFields, updatedAt: FieldValue.serverTimestamp() });
    batch.set(db.collection("auditLogs").doc(), {
      tenantId: previousData.tenantId ?? null,
      actorUserId: session.uid,
      actorRole: session.role,
      action: "managedService.commercial.updated",
      targetType: "managedService",
      targetId: serviceId,
      createdAt: new Date().toISOString(),
      metadata: { fields: editableFields },
    });
    await batch.commit();

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Não foi possível atualizar o serviço agora." }, { status: 500 });
  }
}
