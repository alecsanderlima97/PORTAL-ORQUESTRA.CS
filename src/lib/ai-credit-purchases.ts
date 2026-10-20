import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

export const AI_CREDIT_PACKAGES = {
  essencial_100: { credits: 100, label: "Essencial", price: 29.9 },
  mais_escolhido_300: { credits: 300, label: "Mais escolhido", price: 69.9 },
  performance_1000: { credits: 1000, label: "Performance", price: 189.9 },
} as const;

export type AiCreditPackageId = keyof typeof AI_CREDIT_PACKAGES;

type CreditPurchaseClaims = {
  externalTenantId: string;
  exp: number;
  sourceSystem: string;
  version: 1;
};

function base64UrlEncode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signature(value: string, secret: string) {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

export function getAiCreditPackage(value: unknown) {
  if (typeof value !== "string" || !(value in AI_CREDIT_PACKAGES)) return null;
  return AI_CREDIT_PACKAGES[value as AiCreditPackageId];
}

export function verifyCreditPurchaseToken(token: string): CreditPurchaseClaims | null {
  const secret = process.env.ORQUESTRA_CONNECTOR_SHARED_SECRET?.trim();
  if (!secret || !token || token.length > 1200) return null;

  const [encodedPayload, receivedSignature] = token.split(".");
  if (!encodedPayload || !receivedSignature) return null;
  const expectedSignature = signature(encodedPayload, secret);
  const expectedBuffer = Buffer.from(expectedSignature);
  const receivedBuffer = Buffer.from(receivedSignature);
  if (expectedBuffer.length !== receivedBuffer.length || !timingSafeEqual(expectedBuffer, receivedBuffer)) return null;

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as Partial<CreditPurchaseClaims>;
    if (payload.version !== 1 || typeof payload.sourceSystem !== "string" || typeof payload.externalTenantId !== "string" || typeof payload.exp !== "number" || !Number.isFinite(payload.exp)) return null;
    if (payload.exp < Date.now() || payload.sourceSystem.length > 80 || payload.externalTenantId.length > 160) return null;
    return {
      externalTenantId: payload.externalTenantId,
      exp: payload.exp,
      sourceSystem: payload.sourceSystem,
      version: 1,
    };
  } catch {
    return null;
  }
}

export function createCreditOrderKey(sourceSystem: string, externalTenantId: string, packageId: AiCreditPackageId) {
  const window = Math.floor(Date.now() / (10 * 60 * 1000));
  return createHmac("sha256", process.env.ORQUESTRA_CONNECTOR_SHARED_SECRET?.trim() || "credit-order")
    .update(`${sourceSystem}:${externalTenantId}:${packageId}:${window}`)
    .digest("hex");
}

export function creditPurchaseTokenPayload(input: { externalTenantId: string; sourceSystem: string; expiresInMs?: number }) {
  const payload: CreditPurchaseClaims = {
    externalTenantId: input.externalTenantId,
    exp: Date.now() + (input.expiresInMs ?? 15 * 60 * 1000),
    sourceSystem: input.sourceSystem,
    version: 1,
  };
  return base64UrlEncode(JSON.stringify(payload));
}

