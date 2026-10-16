import "server-only";

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

export class AsaasConfigError extends Error {}

export class AsaasRequestError extends Error {
  status: number;
  details: unknown;

  constructor(status: number, message: string, details: unknown) {
    super(message);
    this.name = "AsaasRequestError";
    this.status = status;
    this.details = details;
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
    throw new AsaasRequestError(response.status, "O Asaas recusou a solicitação.", data);
  }

  return data as T;
}

export async function createAsaasCustomer(input: {
  name: string;
  email?: string | null;
  phone?: string | null;
  cpfCnpj?: string | null;
  externalReference: string;
}) {
  return asaasRequest<AsaasCustomer>("/customers", {
    method: "POST",
    body: JSON.stringify({
      name: input.name,
      email: input.email || undefined,
      phone: input.phone || undefined,
      cpfCnpj: input.cpfCnpj || undefined,
      externalReference: input.externalReference,
    }),
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
