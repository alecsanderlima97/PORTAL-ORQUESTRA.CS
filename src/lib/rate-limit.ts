import "server-only";

import { createHash } from "node:crypto";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getFirebaseAdminDb } from "@/lib/firebase-admin";

type RateLimitInput = {
  scope: string;
  ip: string;
  limit: number;
  windowMs: number;
};

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number };

/**
 * IP do cliente. Em Vercel, o último valor de x-forwarded-for é o anexado pela borda;
 * os valores anteriores podem ser enviados pelo próprio cliente, então não são usados.
 */
export function clientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const parts = forwarded.split(",").map((part) => part.trim()).filter(Boolean);
    if (parts.length) return parts[parts.length - 1];
  }
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

/**
 * Janela fixa contada no Firestore. O IP entra apenas como hash na chave do documento.
 * Em falha do armazenamento, libera a requisição e registra o erro (fail-open),
 * para não derrubar login e checkout por indisponibilidade do contador.
 */
export async function consumeRateLimit({ scope, ip, limit, windowMs }: RateLimitInput): Promise<RateLimitResult> {
  const now = Date.now();
  const windowStart = Math.floor(now / windowMs) * windowMs;
  const key = createHash("sha256").update(`${scope}:${ip}:${windowStart}`).digest("hex");

  try {
    const db = getFirebaseAdminDb();
    const ref = db.collection("rateLimits").doc(key);
    return await db.runTransaction(async (transaction): Promise<RateLimitResult> => {
      const snapshot = await transaction.get(ref);
      const count = snapshot.exists ? Number(snapshot.data()?.count) || 0 : 0;
      if (count >= limit) {
        return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((windowStart + windowMs - now) / 1000)) };
      }
      transaction.set(ref, {
        scope,
        count: count + 1,
        windowStart: Timestamp.fromMillis(windowStart),
        expiresAt: Timestamp.fromMillis(windowStart + windowMs * 2),
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
      return { allowed: true };
    });
  } catch (error) {
    console.error("rate_limit_unavailable", scope, error instanceof Error ? error.message : "unknown-error");
    return { allowed: true };
  }
}
