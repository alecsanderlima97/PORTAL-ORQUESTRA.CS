import "server-only";

import { getFirebaseAdminDb } from "@/lib/firebase-admin";
import type {
  AuditRecord,
  ChargeRecord,
  CompanyAccessStatus,
  CompanyRecord,
  ConnectorStatus,
  ControlSnapshot,
  ManagedService,
  ManagedServiceUser,
  OpportunityRecord,
  ServiceType,
  ServiceAvailabilityStatus,
  SubscriptionStatus,
  TenantSnapshot,
  UsageSummary,
} from "@/lib/platform-types";

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function nullableString(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function numberValue(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function dateValue(value: unknown) {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
    return value.toDate().toISOString();
  }
  return null;
}

function usageSummary(value: unknown): UsageSummary | null {
  if (!value || typeof value !== "object") return null;
  const data = value as Record<string, unknown>;
  return {
    totalUsers: numberValue(data.totalUsers),
    owners: numberValue(data.owners),
    administrators: numberValue(data.administrators),
    staff: numberValue(data.staff),
    endUsers: numberValue(data.endUsers),
    onlineUsers: numberValue(data.onlineUsers),
    pendingInvitations: numberValue(data.pendingInvitations),
    recentChangesLast30Days: numberValue(data.recentChangesLast30Days),
    activeUsersLast30Days: numberValue(data.activeUsersLast30Days),
    lastActivityAt: dateValue(data.lastActivityAt),
    updatedAt: dateValue(data.updatedAt),
    presenceTracking: data.presenceTracking === true,
  };
}

function mapServiceUser(id: string, raw: FirebaseFirestore.DocumentData): ManagedServiceUser {
  return {
    id,
    serviceId: stringValue(raw.serviceId),
    tenantId: stringValue(raw.tenantId),
    sourceSystem: stringValue(raw.sourceSystem),
    externalTenantId: stringValue(raw.externalTenantId),
    externalUserId: stringValue(raw.externalUserId),
    name: stringValue(raw.name, "Usuário sem nome"),
    email: stringValue(raw.email),
    role: stringValue(raw.role, "Não informado"),
    active: raw.active !== false,
    lastActivityAt: dateValue(raw.lastActivityAt),
    lastSeenAt: dateValue(raw.lastSeenAt),
    deviceType: nullableString(raw.deviceType),
    operatingSystem: nullableString(raw.operatingSystem),
    browser: nullableString(raw.browser),
    updatedAt: dateValue(raw.updatedAt),
  };
}

function mapCompany(id: string, raw: FirebaseFirestore.DocumentData): CompanyRecord {
  return {
    id,
    legalName: stringValue(raw.legalName, stringValue(raw.name, "Empresa sem nome")),
    tradeName: nullableString(raw.tradeName),
    responsibleName: stringValue(raw.responsibleName, stringValue(raw.owner)),
    ownerGoogleEmail: nullableString(raw.ownerGoogleEmail),
    contactEmail: stringValue(raw.contactEmail, stringValue(raw.email)),
    contactPhone: stringValue(raw.contactPhone, stringValue(raw.phone)),
    document: nullableString(raw.document),
    cpf: nullableString(raw.cpf),
    cnpj: nullableString(raw.cnpj),
    rg: nullableString(raw.rg),
    cep: nullableString(raw.cep),
    street: nullableString(raw.street),
    number: nullableString(raw.number),
    complement: nullableString(raw.complement),
    neighborhood: nullableString(raw.neighborhood),
    city: stringValue(raw.city),
    state: stringValue(raw.state),
    address: nullableString(raw.address),
    coordinates: raw.coordinates && typeof raw.coordinates === "object"
      ? {
          latitude: numberValue((raw.coordinates as Record<string, unknown>).latitude),
          longitude: numberValue((raw.coordinates as Record<string, unknown>).longitude),
        }
      : null,
    plan: stringValue(raw.plan, "Sem plano"),
    contractStatus: raw.contractStatus ?? "teste",
    accessStatus: raw.accessStatus ?? raw.status ?? "revisao_manual",
    billingDay: numberValue(raw.billingDay),
    graceDays: numberValue(raw.graceDays),
    developmentFee: raw.developmentFee == null ? null : numberValue(raw.developmentFee),
    implementationFee: raw.implementationFee == null ? null : numberValue(raw.implementationFee),
    supportFee: raw.supportFee == null ? null : numberValue(raw.supportFee),
    monthlyFee: numberValue(raw.monthlyFee),
    startDate: nullableString(raw.startDate),
    renewalDate: nullableString(raw.renewalDate),
    notes: nullableString(raw.notes),
    googleBusinessName: nullableString(raw.googleBusinessName),
    googleBusinessUrl: nullableString(raw.googleBusinessUrl),
    googleAddress: nullableString(raw.googleAddress),
    instagramUrl: nullableString(raw.instagramUrl),
    asaasCustomerId: nullableString(raw.asaasCustomerId),
  };
}

function mapService(id: string, raw: FirebaseFirestore.DocumentData): ManagedService {
  return {
    id,
    name: stringValue(raw.name, "Serviço sem nome"),
    sourceSystem: nullableString(raw.sourceSystem),
    type: (raw.type ?? "outro") as ServiceType,
    url: stringValue(raw.url),
    tenantId: nullableString(raw.tenantId),
    plan: stringValue(raw.plan, "Sem plano"),
    monthlyFee: raw.monthlyFee == null ? null : numberValue(raw.monthlyFee),
    developmentFee: raw.developmentFee == null ? null : numberValue(raw.developmentFee),
    implementationFee: raw.implementationFee == null ? null : numberValue(raw.implementationFee),
    supportFee: raw.supportFee == null ? null : numberValue(raw.supportFee),
    billingDay: raw.billingDay == null ? null : numberValue(raw.billingDay),
    startDate: nullableString(raw.startDate),
    renewalDate: nullableString(raw.renewalDate),
    subscriptionStatus: (raw.subscriptionStatus ?? "revisao_manual") as SubscriptionStatus,
    currentVersion: nullableString(raw.currentVersion),
    lastUpdatedAt: dateValue(raw.lastUpdatedAt),
    lastUpdateSummary: nullableString(raw.lastUpdateSummary),
    vercelProjectName: nullableString(raw.vercelProjectName),
    repositoryUrl: nullableString(raw.repositoryUrl),
    availabilityStatus: (raw.availabilityStatus ?? "nao_verificado") as ServiceAvailabilityStatus,
    httpStatus: raw.httpStatus == null ? null : numberValue(raw.httpStatus),
    responseTimeMs: raw.responseTimeMs == null ? null : numberValue(raw.responseTimeMs),
    lastCheckedAt: dateValue(raw.lastCheckedAt),
    sslStatus: raw.sslStatus ?? "nao_verificado",
    environment: raw.environment ?? "production",
    accessStatus: (raw.accessStatus ?? "revisao_manual") as CompanyAccessStatus,
    connectorStatus: (raw.connectorStatus ?? "pendente") as ConnectorStatus,
    externalTenantId: nullableString(raw.externalTenantId),
    lastSyncAt: dateValue(raw.lastSyncAt),
    lastKnownStatus: nullableString(raw.lastKnownStatus),
    usageSummary: usageSummary(raw.usageSummary),
    billingProvider: raw.billingProvider === "asaas" ? "asaas" : null,
    billingEnvironment: raw.billingEnvironment === "sandbox" || raw.billingEnvironment === "production" ? raw.billingEnvironment : null,
    asaasCustomerId: nullableString(raw.asaasCustomerId),
    asaasSubscriptionId: nullableString(raw.asaasSubscriptionId),
    billingCheckoutUrl: nullableString(raw.billingCheckoutUrl),
  };
}

function mapCharge(id: string, raw: FirebaseFirestore.DocumentData): ChargeRecord {
  return {
    id,
    tenantId: stringValue(raw.tenantId),
    serviceId: nullableString(raw.serviceId),
    referenceMonth: stringValue(raw.referenceMonth),
    amount: numberValue(raw.amount),
    dueDate: dateValue(raw.dueDate),
    status: raw.status ?? "revisao_manual",
    paidAt: dateValue(raw.paidAt),
    billingProvider: raw.billingProvider === "asaas" ? "asaas" : null,
    asaasPaymentId: nullableString(raw.asaasPaymentId),
    asaasSubscriptionId: nullableString(raw.asaasSubscriptionId),
    invoiceUrl: nullableString(raw.invoiceUrl),
  } satisfies ChargeRecord;
}

export async function getControlSnapshot(): Promise<ControlSnapshot> {
  const db = getFirebaseAdminDb();
  const [companiesSnapshot, servicesSnapshot, serviceUsersSnapshot, chargesSnapshot, opportunitiesSnapshot, auditsSnapshot] = await Promise.all([
    db.collection("companies").limit(250).get(),
    db.collection("managedServices").limit(500).get(),
    db.collection("managedServiceUsers").limit(2000).get(),
    db.collection("billingCharges").limit(500).get(),
    db.collection("opportunities").limit(500).get(),
    db.collection("auditLogs").orderBy("createdAt", "desc").limit(30).get(),
  ]);

  return {
    companies: companiesSnapshot.docs.map((doc) => mapCompany(doc.id, doc.data())),
    services: servicesSnapshot.docs.map((doc) => mapService(doc.id, doc.data())),
    serviceUsers: serviceUsersSnapshot.docs.map((doc) => mapServiceUser(doc.id, doc.data())),
    charges: chargesSnapshot.docs.map((doc) => mapCharge(doc.id, doc.data())),
    opportunities: opportunitiesSnapshot.docs.map((doc) => {
      const raw = doc.data();
      return {
        id: doc.id,
        companyName: stringValue(raw.companyName, "Oportunidade sem nome"),
        segment: stringValue(raw.segment),
        city: stringValue(raw.city),
        state: stringValue(raw.state),
        commercialStatus: stringValue(raw.commercialStatus, "nova"),
        nextTaskAt: dateValue(raw.nextTaskAt),
        potentialMonthlyFee: numberValue(raw.potentialMonthlyFee),
        potentialDevelopmentFee: numberValue(raw.potentialDevelopmentFee),
        source: nullableString(raw.source),
      } satisfies OpportunityRecord;
    }),
    audits: auditsSnapshot.docs.map((doc) => {
      const raw = doc.data();
      return {
        id: doc.id,
        tenantId: nullableString(raw.tenantId),
        actorUserId: stringValue(raw.actorUserId),
        actorRole: stringValue(raw.actorRole),
        action: stringValue(raw.action),
        targetType: stringValue(raw.targetType),
        targetId: stringValue(raw.targetId),
        createdAt: dateValue(raw.createdAt),
      } satisfies AuditRecord;
    }),
  };
}

export async function getTenantSnapshot(tenantId: string): Promise<TenantSnapshot> {
  const db = getFirebaseAdminDb();
  const [companySnapshot, servicesSnapshot, chargesSnapshot] = await Promise.all([
    db.collection("companies").doc(tenantId).get(),
    db.collection("managedServices").where("tenantId", "==", tenantId).limit(50).get(),
    db.collection("billingCharges").where("tenantId", "==", tenantId).limit(50).get(),
  ]);

  const services = servicesSnapshot.docs.map((doc) => mapService(doc.id, doc.data()));
  const usage = services
    .map((service) => service.usageSummary)
    .filter((summary): summary is UsageSummary => summary !== null);

  return {
    company: companySnapshot.exists ? mapCompany(companySnapshot.id, companySnapshot.data() ?? {}) : null,
    services,
    charges: chargesSnapshot.docs
      .map((doc) => mapCharge(doc.id, doc.data()))
      .sort((left, right) => (right.dueDate ?? "").localeCompare(left.dueDate ?? "")),
    totalUsers: usage.reduce((total, summary) => total + summary.totalUsers, 0),
    activeUsersLast30Days: usage.reduce((total, summary) => total + summary.activeUsersLast30Days, 0),
    lastActivityAt: usage
      .map((summary) => summary.lastActivityAt)
      .filter((value): value is string => value !== null)
      .sort()
      .at(-1) ?? null,
  };
}

export { formatMoney, formatSnapshotDate } from "@/lib/formatters";
