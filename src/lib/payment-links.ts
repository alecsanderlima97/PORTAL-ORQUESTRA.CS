import "server-only";

import { createHash, randomBytes } from "node:crypto";

export function createPublicPaymentToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashPublicPaymentToken(token) };
}

export function hashPublicPaymentToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function getPublicPaymentUrl(request: Request, token: string) {
  const configuredOrigin = process.env.PORTAL_PUBLIC_URL?.trim();
  const origin = (configuredOrigin || new URL(request.url).origin).replace(/\/$/, "");
  return `${origin}/pagar/${encodeURIComponent(token)}`;
}
