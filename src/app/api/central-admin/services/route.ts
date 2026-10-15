import { FieldValue } from "firebase-admin/firestore";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getFirebaseAdminDb } from "@/lib/firebase-admin";
import { getCurrentSession } from "@/lib/session";

const platformRoles = new Set(["platform_owner", "orquestra_admin"]);
const serviceTypes = new Set(["sistema_web", "site", "landing_page", "crm", "erp", "saas", "consultoria", "marketing_digital", "trafego_pago", "automacao", "integracao", "suporte_tecnico", "outro"]);
const availabilityStatuses = new Set(["online", "offline", "erro", "nao_verificado"]);
const subscriptionStatuses = new Set(["trial", "ativo", "vencido", "bloqueado", "cancelado", "revisao_manual"]);

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

export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (!session || !platformRoles.has(session.role)) return NextResponse.json({ error: "Acesso administrativo necessário." }, { status: 403 });

  try {
    const body = await request.json() as Record<string, unknown>;
    const csrfCookie = (await cookies()).get("orquestra_csrf")?.value;
    if (typeof body.csrfToken !== "string" || !csrfCookie || body.csrfToken !== csrfCookie) return NextResponse.json({ error: "Sessão administrativa inválida." }, { status: 400 });

    const name = text(body.name, 160);
    const sourceSystem = optionalText(body.sourceSystem, 80);
    const type = text(body.type, 40);
    const url = optionalText(body.url, 500);
    const tenantId = optionalText(body.tenantId, 160);
    const externalTenantId = optionalText(body.externalTenantId, 120);
    const plan = text(body.plan, 80) || "Sem plano definido";
    const availabilityStatus = text(body.availabilityStatus, 30) || "nao_verificado";
    const monthlyFee = optionalMoney(body.monthlyFee);
    const developmentFee = optionalMoney(body.developmentFee);
    const implementationFee = optionalMoney(body.implementationFee);
    const supportFee = optionalMoney(body.supportFee);
    const billingDay = body.billingDay === null || body.billingDay === "" || body.billingDay === undefined ? null : Number(body.billingDay);
    const startDate = optionalText(body.startDate, 20);
    const subscriptionStatus = text(body.subscriptionStatus, 30) || "revisao_manual";
    const vercelProjectName = optionalText(body.vercelProjectName, 120);
    const repositoryUrl = optionalText(body.repositoryUrl, 500);

    if (!name || !serviceTypes.has(type) || !availabilityStatuses.has(availabilityStatus)) return NextResponse.json({ error: "Preencha nome, tipo e disponibilidade válidos." }, { status: 400 });
    if (!subscriptionStatuses.has(subscriptionStatus)) return NextResponse.json({ error: "Status da assinatura inválido." }, { status: 400 });
    if ([monthlyFee, developmentFee, implementationFee, supportFee].some((value) => value === undefined)) return NextResponse.json({ error: "Confira os valores comerciais informados." }, { status: 400 });
    if (billingDay !== null && (!Number.isFinite(billingDay) || billingDay < 1 || billingDay > 31)) return NextResponse.json({ error: "O vencimento deve estar entre os dias 1 e 31." }, { status: 400 });
    if (url) {
      const parsedUrl = new URL(url);
      if (!["http:", "https:"].includes(parsedUrl.protocol)) return NextResponse.json({ error: "Informe um link de produção válido." }, { status: 400 });
    }
    if (repositoryUrl) {
      const parsedRepositoryUrl = new URL(repositoryUrl);
      if (parsedRepositoryUrl.protocol !== "https:" || parsedRepositoryUrl.hostname !== "github.com") return NextResponse.json({ error: "Informe um repositório GitHub válido." }, { status: 400 });
    }

    const db = getFirebaseAdminDb();
    if (tenantId && !(await db.collection("companies").doc(tenantId).get()).exists) return NextResponse.json({ error: "Cliente vinculado não encontrado." }, { status: 404 });
    const duplicateQuery = sourceSystem && externalTenantId
      ? await db.collection("managedServices").where("sourceSystem", "==", sourceSystem).where("externalTenantId", "==", externalTenantId).limit(1).get()
      : sourceSystem
        ? await db.collection("managedServices").where("sourceSystem", "==", sourceSystem).where("externalTenantId", "==", null).limit(1).get()
      : await db.collection("managedServices").where("name", "==", name).limit(1).get();
    if (!duplicateQuery.empty) return NextResponse.json({ error: "Este sistema já está cadastrado na Central." }, { status: 409 });

    const serviceRef = db.collection("managedServices").doc();
    const now = new Date().toISOString();
    const batch = db.batch();
    batch.set(serviceRef, {
      name,
      sourceSystem,
      type,
      url: url ?? "",
      tenantId,
      plan,
      monthlyFee,
      developmentFee,
      implementationFee,
      supportFee,
      billingDay,
      startDate,
      renewalDate: null,
      subscriptionStatus,
      environment: "production",
      accessStatus: tenantId ? "revisao_manual" : "revisao_manual",
      connectorStatus: "pendente",
      externalTenantId,
      currentVersion: null,
      lastUpdatedAt: null,
      lastUpdateSummary: null,
      vercelProjectName,
      repositoryUrl,
      availabilityStatus,
      httpStatus: null,
      responseTimeMs: null,
      lastCheckedAt: null,
      sslStatus: "nao_verificado",
      lastSyncAt: null,
      lastKnownStatus: tenantId ? "Ponte segura ainda não configurada." : "Catálogo cadastrado; cliente e ponte segura ainda não vinculados.",
      createdAt: FieldValue.serverTimestamp(),
      createdBy: session.uid,
      updatedAt: FieldValue.serverTimestamp(),
    });
    batch.set(db.collection("auditLogs").doc(), {
      tenantId,
      actorUserId: session.uid,
      actorRole: session.role,
      action: "managedService.catalog_created",
      targetType: "managedService",
      targetId: serviceRef.id,
      createdAt: now,
      metadata: { name, sourceSystem, type, tenantId, availabilityStatus },
    });
    await batch.commit();
    return NextResponse.json({ ok: true, serviceId: serviceRef.id });
  } catch {
    return NextResponse.json({ error: "Não foi possível cadastrar o sistema agora." }, { status: 500 });
  }
}
