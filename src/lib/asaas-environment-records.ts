import "server-only";

import type { AsaasEnvironment } from "@/lib/asaas";

type DocumentData = Record<string, unknown>;

export type AsaasEnvironmentBilling = {
  checkoutUrl: string | null;
  customerId: string | null;
  publicTokenHash: string | null;
  subscriptionId: string | null;
};

function objectValue(value: unknown): DocumentData | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as DocumentData : null;
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function getAsaasCustomerId(data: DocumentData, environment: AsaasEnvironment) {
  const ids = objectValue(data.asaasCustomerIds);
  return stringValue(ids?.[environment]);
}

export function getLegacyAsaasCustomerId(data: DocumentData) {
  return stringValue(data.asaasCustomerId);
}

export function getAsaasEnvironmentBilling(data: DocumentData, environment: AsaasEnvironment): AsaasEnvironmentBilling {
  const environments = objectValue(data.asaasBillingEnvironments);
  const current = objectValue(environments?.[environment]);
  if (current) {
    return {
      checkoutUrl: stringValue(current.checkoutUrl),
      customerId: stringValue(current.customerId),
      publicTokenHash: stringValue(current.publicTokenHash),
      subscriptionId: stringValue(current.subscriptionId),
    };
  }

  if (data.billingEnvironment === environment) {
    return {
      checkoutUrl: stringValue(data.billingCheckoutUrl),
      customerId: stringValue(data.asaasCustomerId),
      publicTokenHash: stringValue(data.billingPublicTokenHash),
      subscriptionId: stringValue(data.asaasSubscriptionId),
    };
  }

  return { checkoutUrl: null, customerId: null, publicTokenHash: null, subscriptionId: null };
}

export function asaasCustomerIdUpdate(environment: AsaasEnvironment, customerId: string) {
  return {
    [`asaasCustomerIds.${environment}`]: customerId,
    ...(environment === "production" ? { asaasCustomerId: customerId } : {}),
  };
}

export function asaasDocumentId(prefix: string, environment: AsaasEnvironment, resourceId: string) {
  return environment === "production" ? `${prefix}-${resourceId}` : `${prefix}-${environment}-${resourceId}`;
}

export function asaasServiceBillingUpdate(environment: AsaasEnvironment, billing: AsaasEnvironmentBilling) {
  const environmentRecord = {
    checkoutUrl: billing.checkoutUrl,
    customerId: billing.customerId,
    publicTokenHash: billing.publicTokenHash,
    subscriptionId: billing.subscriptionId,
  };

  const productionFields = environment === "production" ? {
    ...(billing.customerId ? { asaasCustomerId: billing.customerId } : {}),
    ...(billing.subscriptionId ? { asaasSubscriptionId: billing.subscriptionId } : {}),
    ...(billing.checkoutUrl ? { billingCheckoutUrl: billing.checkoutUrl } : {}),
    billingEnvironment: environment,
    ...(billing.publicTokenHash ? { billingPublicTokenHash: billing.publicTokenHash } : {}),
  } : {};

  return {
    [`asaasBillingEnvironments.${environment}`]: environmentRecord,
    ...productionFields,
  };
}
