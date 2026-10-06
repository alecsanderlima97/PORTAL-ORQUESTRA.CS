export type PlatformRole =
  | "platform_owner"
  | "orquestra_admin"
  | "company_owner"
  | "company_admin"
  | "company_user"
  | "viewer";

export type CompanyAccessStatus =
  | "ativo"
  | "em_tolerancia"
  | "bloqueio_agendado"
  | "bloqueado"
  | "liberacao_pendente"
  | "liberado"
  | "revisao_manual"
  | "erro_sincronizacao";

export type BillingStatus =
  | "agendada"
  | "aberta"
  | "pendente"
  | "paga"
  | "em_processamento"
  | "vencida"
  | "em_tolerancia"
  | "bloqueada"
  | "estornada"
  | "cancelada"
  | "falha_pagamento"
  | "revisao_manual";

export type ServiceType =
  | "sistema_web"
  | "site"
  | "landing_page"
  | "crm"
  | "erp"
  | "saas"
  | "consultoria"
  | "marketing_digital"
  | "trafego_pago"
  | "automacao"
  | "integracao"
  | "suporte_tecnico"
  | "outro";

export type ConnectorStatus = "pendente" | "ativo" | "com_falha" | "desativado";

export type UserProfile = {
  uid: string;
  name: string;
  email: string;
  role: PlatformRole;
  tenantId: string | null;
  active: boolean;
};

export type UsageSummary = {
  totalUsers: number;
  owners: number;
  administrators: number;
  staff: number;
  endUsers: number;
  activeUsersLast30Days: number;
  lastActivityAt: string | null;
  updatedAt: string | null;
};

export type ManagedService = {
  id: string;
  name: string;
  type: ServiceType;
  url: string;
  tenantId: string;
  plan: string;
  environment: "production" | "staging" | "development";
  accessStatus: CompanyAccessStatus;
  connectorStatus: ConnectorStatus;
  externalTenantId: string | null;
  lastSyncAt: string | null;
  lastKnownStatus: string | null;
  usageSummary: UsageSummary | null;
};

export type CompanyRecord = {
  id: string;
  legalName: string;
  tradeName: string | null;
  responsibleName: string;
  contactEmail: string;
  contactPhone: string;
  document: string | null;
  city: string;
  state: string;
  address: string | null;
  coordinates: { latitude: number; longitude: number } | null;
  plan: string;
  contractStatus: "ativo" | "teste" | "suspenso" | "encerrado";
  accessStatus: CompanyAccessStatus;
  billingDay: number;
  graceDays: number;
  developmentFee: number | null;
  implementationFee: number | null;
  supportFee: number | null;
  monthlyFee: number;
  startDate: string | null;
  renewalDate: string | null;
  notes: string | null;
};

export type ConnectorCommand = "suspender_acesso" | "liberar_acesso" | "consultar_status" | "sincronizar_cliente";

export type OpportunityRecord = {
  id: string;
  companyName: string;
  segment: string;
  city: string;
  state: string;
  commercialStatus: string;
  nextTaskAt: string | null;
  potentialMonthlyFee: number;
  potentialDevelopmentFee: number;
  source: string | null;
};

export type ChargeRecord = {
  id: string;
  tenantId: string;
  referenceMonth: string;
  amount: number;
  dueDate: string | null;
  status: BillingStatus;
  paidAt: string | null;
};

export type AuditRecord = {
  id: string;
  tenantId: string | null;
  actorUserId: string;
  actorRole: PlatformRole | string;
  action: string;
  targetType: string;
  targetId: string;
  createdAt: string | null;
};

export type ControlSnapshot = {
  companies: CompanyRecord[];
  services: ManagedService[];
  charges: ChargeRecord[];
  opportunities: OpportunityRecord[];
  audits: AuditRecord[];
};

export type TenantSnapshot = {
  company: CompanyRecord | null;
  services: ManagedService[];
  charges: ChargeRecord[];
  totalUsers: number;
  activeUsersLast30Days: number;
  lastActivityAt: string | null;
};
