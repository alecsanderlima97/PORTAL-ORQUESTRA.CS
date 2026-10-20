import "server-only";

import type { BillingStatus } from "@/lib/platform-types";

export type AsaasEnvironment = "sandbox" | "production";

type AsaasCustomer = {
  id: string;
  name: string;
  email?: string | null;
};

type AsaasSubscription = {
  id: string;
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
  if (configuredUrl) return configuredUrl.replace(/\/$/, "");
  return getAsaasEnvironment() === "production" ? "https://api.asaas.com/v3" : "https://api-sandbox.asaas.com/v3";
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

export async function listAsaasSubscriptionPayments(subscriptionId: string) {
  const result = await asaasRequest<AsaasListResponse<AsaasPayment>>(
    `/subscriptions/${encodeURIComponent(subscriptionId)}/payments`,
  );
  return Array.isArray(result.data) ? result.data : [];
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
