import { FieldValue } from "firebase-admin/firestore";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AsaasConfigError, AsaasRequestError, createAsaasCustomer, createAsaasSubscription, getAsaasEnvironment, isAsaasConfigured } from "@/lib/asaas";
import { getFirebaseAdminDb } from "@/lib/firebase-admin";
import { getCurrentSession } from "@/lib/session";

const platformRoles = new Set(["platform_owner", "orquestra_admin"]);

function nextDueDate(billingDay: number) {
  const today = new Date();
  const year = today.getUTCFullYear();
  const month = today.getUTCMonth();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const currentDay = Math.min(billingDay, daysInMonth);
  const candidate = new Date(Date.UTC(year, month, currentDay));
  if (candidate.getTime() > Date.UTC(year, month, today.getUTCDate())) return candidate.toISOString().slice(0, 10);
  const nextMonth = month + 1;
  const nextYear = year + Math.floor(nextMonth / 12);
  const normalizedMonth = nextMonth % 12;
  const nextDaysInMonth = new Date(Date.UTC(nextYear, normalizedMonth + 1, 0)).getUTCDate();
  return new Date(Date.UTC(nextYear, normalizedMonth, Math.min(billingDay, nextDaysInMonth))).toISOString().slice(0, 10);
}

export async function POST(request: Request, { params }: { params: Promise<{ serviceId: string }> }) {
  const session = await getCurrentSession();
  if (!session || !platformRoles.has(session.role)) return NextResponse.json({ error: "Acesso administrativo necessário." }, { status: 403 });

  try {
    const body = await request.json() as Record<string, unknown>;
    const csrfCookie = (await cookies()).get("orquestra_csrf")?.value;
    if (typeof body.csrfToken !== "string" || !csrfCookie || body.csrfToken !== csrfCookie) return NextResponse.json({ error: "Sessão administrativa inválida." }, { status: 400 });

    if (!isAsaasConfigured()) return NextResponse.json({ error: "Configure ASAAS_API_KEY no ambiente do Portal antes de ativar uma cobrança." }, { status: 503 });

    const { serviceId } = await params;
    const db = getFirebaseAdminDb();
    const serviceRef = db.collection("managedServices").doc(serviceId);
    const serviceSnapshot = await serviceRef.get();
    if (!serviceSnapshot.exists) return NextResponse.json({ error: "Serviço não encontrado." }, { status: 404 });

    const service = serviceSnapshot.data() ?? {};
    if (typeof service.asaasSubscriptionId === "string" && service.asaasSubscriptionId) {
      return NextResponse.json({ ok: true, alreadyConfigured: true, environment: service.billingEnvironment ?? getAsaasEnvironment() });
    }

    const tenantId = typeof service.tenantId === "string" ? service.tenantId : "";
    const monthlyFee = typeof service.monthlyFee === "number" ? service.monthlyFee : Number(service.monthlyFee);
    const billingDay = Math.round(Number(service.billingDay));
    if (!tenantId) return NextResponse.json({ error: "Vincule este produto a um cliente antes de configurar a cobrança." }, { status: 400 });
    if (!Number.isFinite(monthlyFee) || monthlyFee <= 0) return NextResponse.json({ error: "Informe uma mensalidade maior que zero antes de configurar a cobrança." }, { status: 400 });
    if (!Number.isInteger(billingDay) || billingDay < 1 || billingDay > 31) return NextResponse.json({ error: "Informe um dia de vencimento entre 1 e 31." }, { status: 400 });

    const companyRef = db.collection("companies").doc(tenantId);
    const companySnapshot = await companyRef.get();
    if (!companySnapshot.exists) return NextResponse.json({ error: "Cliente vinculado não foi encontrado." }, { status: 404 });
    const company = companySnapshot.data() ?? {};
    const customerName = String(company.tradeName || company.legalName || company.name || "Cliente Orquestra.cs").trim();
    const existingCustomerId = typeof company.asaasCustomerId === "string" && company.asaasCustomerId ? company.asaasCustomerId : null;
    let customerId = existingCustomerId;

    if (!customerId) {
      const customer = await createAsaasCustomer({
        name: customerName,
        email: typeof company.contactEmail === "string" ? company.contactEmail : null,
        phone: typeof company.contactPhone === "string" ? company.contactPhone : null,
        cpfCnpj: typeof company.cnpj === "string" && company.cnpj ? company.cnpj : typeof company.cpf === "string" ? company.cpf : null,
        externalReference: `company:${tenantId}`,
      });
      customerId = customer.id;
      await companyRef.update({ asaasCustomerId: customerId, updatedAt: FieldValue.serverTimestamp() });
    }

    const subscription = await createAsaasSubscription({
      customer: customerId,
      value: Math.round(monthlyFee * 100) / 100,
      nextDueDate: nextDueDate(billingDay),
      description: `${String(service.name || "Produto Orquestra.cs").trim()} · ${String(service.plan || "Plano").trim()}`.slice(0, 255),
      externalReference: `managed-service:${serviceId}`,
    });
    const now = new Date().toISOString();
    const batch = db.batch();
    batch.update(serviceRef, {
      billingProvider: "asaas",
      billingEnvironment: getAsaasEnvironment(),
      asaasCustomerId: customerId,
      asaasSubscriptionId: subscription.id,
      updatedAt: FieldValue.serverTimestamp(),
    });
    batch.set(db.collection("auditLogs").doc(), {
      tenantId,
      actorUserId: session.uid,
      actorRole: session.role,
      action: "billing.subscription.created",
      targetType: "managedService",
      targetId: serviceId,
      createdAt: now,
      metadata: { provider: "asaas", environment: getAsaasEnvironment(), subscriptionId: subscription.id },
    });
    await batch.commit();

    return NextResponse.json({ ok: true, environment: getAsaasEnvironment(), subscriptionId: subscription.id });
  } catch (error) {
    if (error instanceof AsaasConfigError) return NextResponse.json({ error: error.message }, { status: 503 });
    if (error instanceof AsaasRequestError) return NextResponse.json({ error: "O Asaas recusou a criação da assinatura. Confira os dados do cliente e tente novamente." }, { status: 502 });
    return NextResponse.json({ error: "Não foi possível preparar a cobrança agora." }, { status: 500 });
  }
}
