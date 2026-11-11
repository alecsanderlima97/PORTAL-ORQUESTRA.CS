import "server-only";

import type { BillingStatus } from "@/lib/platform-types";

export type AsaasEnvironment = "sandbox" | "production";

export type AsaasCustomer = {
  id: string;
  name: string;
  email?: string | null;
  externalReference?: string | null;
};

export type AsaasSubscription = {
  id: string;
  customer?: string | null;
  externalReference?: string | null;
  status?: string;
  nextDueDate?: string;
  value?: number;
};

export type AsaasPayment = {
  id: string;
  customer?: string | null;
  subscription?: string | null;
  status?: string | null;
  value?: number | null;
  dueDate?: string | null;
  paymentDate?: string | null;
  confirmedDate?: string | null;
  invoiceUrl?: string | null;
  externalReference?: string | null;
};

type AsaasListResponse<T> = {
  data?: T[];
};

export class AsaasConfigError extends Error {}

export class AsaasRequestError extends Error {
  status: number;
  details: unknown;
  path: string;

  constructor(status: number, message: string, details: unknown, path: string) {
    super(message);
    this.name = "AsaasRequestError";
    this.status = status;
    this.details = details;
    this.path = path;
  }
}

export function getAsaasEnvironment(): AsaasEnvironment {
  return process.env.ASAAS_ENVIRONMENT === "production" ? "production" : "sandbox";
}

export function isAsaasConfigured() {
  return Boolean(process.env.ASAAS_API_KEY?.trim());
}

function getBaseUrl() {
  const configuredUrl = process.env.ASAAS_API_BASE_URL?.trim();
  const environment = getAsaasEnvironment();
  const defaultUrl = environment === "production" ? "https://api.asaas.com/v3" : "https://api-sandbox.asaas.com/v3";
  if (!configuredUrl) return defaultUrl;

  try {
    const configuredHost = new URL(configuredUrl).hostname.toLowerCase();
    const isSandboxHost = configuredHost === "api-sandbox.asaas.com";
    const isProductionHost = configuredHost === "api.asaas.com";
    if ((environment === "production" && isSandboxHost) || (environment === "sandbox" && isProductionHost)) {
      throw new AsaasConfigError("ASAAS_ENVIRONMENT e ASAAS_API_BASE_URL apontam para ambientes diferentes.");
    }
  } catch (error) {
    if (error instanceof AsaasConfigError) throw error;
    throw new AsaasConfigError("ASAAS_API_BASE_URL não contém uma URL válida.");
  }

  return configuredUrl.replace(/\/$/, "");
}

async function asaasRequest<T>(path: string, init: RequestInit = {}) {
  const apiKey = process.env.ASAAS_API_KEY?.trim();
  if (!apiKey) throw new AsaasConfigError("O Asaas ainda não foi configurado no ambiente do Portal.");

  const response = await fetch(`${getBaseUrl()}${path}`, {
    ...init,
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      access_token: apiKey,
      ...(init.headers ?? {}),
    },
    cache: "no-store",
    signal: init.signal ?? AbortSignal.timeout(15_000),
  });

  const raw = await response.text();
  let data: unknown = null;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = raw;
  }

  if (!response.ok) {
    throw new AsaasRequestError(response.status, "O Asaas recusou a solicitação.", data, path);
  }

  return data as T;
}

export async function createAsaasCustomer(input: {
  name: string;
  email?: string | null;
  phone?: string | null;
  cpfCnpj?: string | null;
  externalReference: string;
  notificationDisabled?: boolean;
}) {
  return asaasRequest<AsaasCustomer>("/customers", {
    method: "POST",
    body: JSON.stringify({
      name: input.name,
      email: input.email || undefined,
      phone: input.phone || undefined,
      cpfCnpj: input.cpfCnpj || undefined,
      externalReference: input.externalReference,
      notificationDisabled: input.notificationDisabled ?? false,
    }),
  });
}

export async function updateAsaasCustomer(customerId: string, input: { notificationDisabled: boolean }) {
  return asaasRequest<AsaasCustomer>(`/customers/${encodeURIComponent(customerId)}`, {
    method: "PUT",
    body: JSON.stringify({ notificationDisabled: input.notificationDisabled }),
  });
}

export async function getAsaasCustomer(customerId: string) {
  return asaasRequest<AsaasCustomer>(`/customers/${encodeURIComponent(customerId)}`);
}

export async function findAsaasCustomerByExternalReference(externalReference: string) {
  const result = await asaasRequest<AsaasListResponse<AsaasCustomer>>(
    `/customers?externalReference=${encodeURIComponent(externalReference)}&limit=10`,
  );
  return Array.isArray(result.data) ? result.data[0] ?? null : null;
}

export async function resolveAsaasCustomer(input: {
  candidateIds: Array<string | null | undefined>;
  email?: string | null;
  externalReference: string;
  name: string;
  notificationDisabled?: boolean;
  phone?: string | null;
  cpfCnpj?: string | null;
}) {
  const candidateIds = [...new Set(input.candidateIds.filter((value): value is string => Boolean(value)))];
  for (const customerId of candidateIds) {
    try {
      const customer = await getAsaasCustomer(customerId);
      if (!customer.externalReference || customer.externalReference === input.externalReference) {
        await updateAsaasCustomer(customer.id, { notificationDisabled: input.notificationDisabled ?? false });
        return customer;
      }
    } catch (error) {
      if (!(error instanceof AsaasRequestError) || error.status !== 404) throw error;
    }
  }

  const existing = await findAsaasCustomerByExternalReference(input.externalReference);
  if (existing) {
    await updateAsaasCustomer(existing.id, { notificationDisabled: input.notificationDisabled ?? false });
    return existing;
  }

  return createAsaasCustomer({
    name: input.name,
    email: input.email,
    phone: input.phone,
    cpfCnpj: input.cpfCnpj,
    externalReference: input.externalReference,
    notificationDisabled: input.notificationDisabled,
  });
}

export async function createAsaasSubscription(input: {
  customer: string;
  value: number;
  nextDueDate: string;
  description: string;
  externalReference: string;
}) {
  return asaasRequest<AsaasSubscription>("/subscriptions", {
    method: "POST",
    body: JSON.stringify({
      customer: input.customer,
      billingType: "UNDEFINED",
      value: input.value,
      nextDueDate: input.nextDueDate,
      cycle: "MONTHLY",
      description: input.description,
      externalReference: input.externalReference,
    }),
  });
}

export async function findAsaasSubscriptionByExternalReference(externalReference: string, customerId: string) {
  const result = await asaasRequest<AsaasListResponse<AsaasSubscription>>(
    `/subscriptions?externalReference=${encodeURIComponent(externalReference)}&customer=${encodeURIComponent(customerId)}&limit=10`,
  );
  const subscriptions = Array.isArray(result.data) ? result.data : [];
  return subscriptions.find((subscription) => subscription.status === "ACTIVE") ?? subscriptions[0] ?? null;
}

export async function createAsaasPayment(input: {
  customer: string;
  value: number;
  dueDate: string;
  description: string;
  externalReference: string;
  notificationDisabled?: boolean;
}) {
  return asaasRequest<AsaasPayment>("/payments", {
    method: "POST",
    body: JSON.stringify({
      customer: input.customer,
      billingType: "UNDEFINED",
      value: input.value,
      dueDate: input.dueDate,
      description: input.description,
      externalReference: input.externalReference,
      notificationDisabled: input.notificationDisabled ?? false,
    }),
  });
}

/**
 * Procura uma cobrança já criada no Asaas para uma referência externa.
 * Usado antes de criar uma cobrança em uma nova tentativa, para evitar duplicidade.
 * Lança erro se a consulta falhar: nesse caso o chamador não deve criar outra cobrança.
 */
export async function findAsaasPaymentByExternalReference(externalReference: string) {
  const result = await asaasRequest<AsaasListResponse<AsaasPayment>>(
    `/payments?externalReference=${encodeURIComponent(externalReference)}&limit=10`,
  );
  const payments = Array.isArray(result.data) ? result.data : [];
  return payments.find((payment) => !/DELETED|CANCEL|REFUND/i.test(payment.status ?? "")) ?? null;
}

export async function listAsaasSubscriptionPayments(subscriptionId: string) {
  const result = await asaasRequest<AsaasListResponse<AsaasPayment>>(
    `/subscriptions/${encodeURIComponent(subscriptionId)}/payments`,
  );
  return Array.isArray(result.data) ? result.data : [];
}

export async function getAsaasPayment(paymentId: string) {
  return asaasRequest<AsaasPayment>(`/payments/${encodeURIComponent(paymentId)}`);
}

export function mapAsaasPaymentStatus(event: string, paymentStatus: string): BillingStatus {
  const normalized = `${event} ${paymentStatus}`.toUpperCase();
  if (normalized.includes("RECEIVED") || normalized.includes("CONFIRMED")) return "paga";
  if (normalized.includes("OVERDUE")) return "vencida";
  if (normalized.includes("REFUND") || normalized.includes("CHARGEBACK")) return "estornada";
  if (normalized.includes("DELETED") || normalized.includes("CANCELED")) return "cancelada";
  if (normalized.includes("REFUSED") || normalized.includes("FAILED")) return "falha_pagamento";
  if (normalized.includes("CREATED") || normalized.includes("PENDING")) return "aberta";
  return "revisao_manual";
}
