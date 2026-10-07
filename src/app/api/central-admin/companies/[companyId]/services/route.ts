import { FieldValue } from "firebase-admin/firestore";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getFirebaseAdminDb } from "@/lib/firebase-admin";
import { getCurrentSession } from "@/lib/session";

const platformRoles = new Set(["platform_owner", "orquestra_admin"]);
const serviceTypes = new Set(["sistema_web", "site", "landing_page", "crm", "erp", "saas", "consultoria", "marketing_digital", "trafego_pago", "automacao", "integracao", "suporte_tecnico", "outro"]);
const sourceSystemNames: Record<string, string> = {
  mad360: "Orquestra Mad360 / Serraria",
  orquestra_blend: "Orquestra Blend",
  orquestra_hub: "Orquestra Hub",
  orquestra_fit: "Orquestra Fit",
  orquestracs_face_id: "Orquestra Face ID",
};

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

export async function POST(request: Request, { params }: { params: Promise<{ companyId: string }> }) {
  const session = await getCurrentSession();
  if (!session || !platformRoles.has(session.role)) return NextResponse.json({ error: "Acesso administrativo necessário." }, { status: 403 });

  try {
    const body = await request.json() as Record<string, unknown>;
    const csrfCookie = (await cookies()).get("orquestra_csrf")?.value;
    if (typeof body.csrfToken !== "string" || !csrfCookie || body.csrfToken !== csrfCookie) return NextResponse.json({ error: "Sessão administrativa inválida." }, { status: 400 });

    const { companyId } = await params;
    if (!companyId || companyId.length > 160) return NextResponse.json({ error: "Cliente inválido." }, { status: 400 });

    const serviceType = text(body.serviceType, 40);
    const serviceName = optionalText(body.serviceName, 160);
    const sourceSystem = optionalText(body.sourceSystem, 80);
    const externalTenantId = optionalText(body.externalTenantId, 120);
    const systemUrl = optionalText(body.systemUrl, 500);
    const plan = text(body.plan, 80);
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
    const vercelProjectName = optionalText(body.vercelProjectName, 120);
    const repositoryUrl = optionalText(body.repositoryUrl, 500);

    if (!serviceTypes.has(serviceType) || !serviceName || !systemUrl || !plan) return NextResponse.json({ error: "Preencha tipo, nome, link e plano do serviço." }, { status: 400 });
    if ([monthlyFee, developmentFee, implementationFee, supportFee].some((value) => value === undefined)) return NextResponse.json({ error: "Confira os valores comerciais informados." }, { status: 400 });
    if (billingDay !== null && (!Number.isFinite(billingDay) || billingDay < 1 || billingDay > 31)) return NextResponse.json({ error: "O vencimento deve estar entre os dias 1 e 31." }, { status: 400 });
    if (sourceSystem && !externalTenantId) return NextResponse.json({ error: "Informe o ID externo da empresa quando houver sistema de origem." }, { status: 400 });

    try {
      const parsedUrl = new URL(systemUrl);
      if (!["http:", "https:"].includes(parsedUrl.protocol)) throw new Error("invalid protocol");
    } catch {
      return NextResponse.json({ error: "Informe um link de produção válido." }, { status: 400 });
    }

    if (repositoryUrl) {
      try {
        const parsedRepositoryUrl = new URL(repositoryUrl);
        if (parsedRepositoryUrl.protocol !== "https:" || parsedRepositoryUrl.hostname !== "github.com") throw new Error("invalid repository");
      } catch {
        return NextResponse.json({ error: "Informe um repositório GitHub válido." }, { status: 400 });
      }
    }

    const db = getFirebaseAdminDb();
    const companyRef = db.collection("companies").doc(companyId);
    const companySnapshot = await companyRef.get();
    if (!companySnapshot.exists) return NextResponse.json({ error: "Cliente não encontrado." }, { status: 404 });

    const company = companySnapshot.data() ?? {};
    const serviceRef = db.collection("managedServices").doc();
    const now = new Date().toISOString();
    const batch = db.batch();
    batch.set(serviceRef, {
      name: sourceSystemNames[sourceSystem ?? ""] || serviceName,
      sourceSystem,
      type: serviceType,
      url: systemUrl,
      tenantId: companyId,
      plan,
      monthlyFee,
      developmentFee,
      implementationFee,
      supportFee,
      billingDay,
      renewalDate,
      currentVersion,
      lastUpdatedAt,
      lastUpdateSummary,
      vercelProjectName,
      repositoryUrl,
      availabilityStatus: "nao_verificado",
      httpStatus: null,
      responseTimeMs: null,
      lastCheckedAt: null,
      sslStatus: "nao_verificado",
      environment: "production",
      accessStatus: company.accessStatus ?? "revisao_manual",
      connectorStatus: "pendente",
      externalTenantId,
      lastSyncAt: null,
      lastKnownStatus: "Ponte segura ainda não configurada.",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    batch.set(db.collection("auditLogs").doc(), {
      tenantId: companyId,
      actorUserId: session.uid,
      actorRole: session.role,
      action: "managedService.created",
      targetType: "managedService",
      targetId: serviceRef.id,
      createdAt: now,
      metadata: { serviceType, sourceSystem, externalTenantId, companyId },
    });
    await batch.commit();

    return NextResponse.json({ ok: true, serviceId: serviceRef.id });
  } catch {
    return NextResponse.json({ error: "Não foi possível adicionar o serviço agora." }, { status: 500 });
  }
}
