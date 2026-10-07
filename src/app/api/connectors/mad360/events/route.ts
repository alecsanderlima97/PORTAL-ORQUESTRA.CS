import { createHash, timingSafeEqual } from "node:crypto";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { getFirebaseAdminDb } from "@/lib/firebase-admin";

const SOURCE_SYSTEM = "mad360";
const MAX_BODY_BYTES = 64 * 1024;
const MAX_COUNT = 100_000;

type UsagePayload = {
  totalUsers: number;
  owners: number;
  administrators: number;
  staff: number;
  endUsers: number;
  onlineUsers: number;
  pendingInvitations: number;
  recentChangesLast30Days: number;
  activeUsersLast30Days: number;
  lastActivityAt: string | null;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function boundedCount(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= MAX_COUNT ? value : null;
}

function optionalIso(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function validIso(value: unknown) {
  return typeof value === "string" && optionalIso(value) !== null;
}

function readUsage(value: unknown): UsagePayload | null {
  if (!isPlainObject(value)) return null;
  const fields = [
    "totalUsers",
    "owners",
    "administrators",
    "staff",
    "endUsers",
    "onlineUsers",
    "pendingInvitations",
    "recentChangesLast30Days",
    "activeUsersLast30Days",
  ] as const;
  const values = fields.map((field) => boundedCount(value[field]));
  if (values.some((count) => count === null)) return null;
  const [totalUsers, owners, administrators, staff, endUsers, onlineUsers, pendingInvitations, recentChangesLast30Days, activeUsersLast30Days] = values as number[];
  if (owners + administrators + staff + endUsers > totalUsers) return null;
  const lastActivityAt = optionalIso(value.lastActivityAt);
  if (value.lastActivityAt !== null && value.lastActivityAt !== undefined && lastActivityAt === null) return null;
  return { totalUsers, owners, administrators, staff, endUsers, onlineUsers, pendingInvitations, recentChangesLast30Days, activeUsersLast30Days, lastActivityAt };
}

function sameSecret(expected: string, received: string | null) {
  if (!received) return false;
  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(received);
  return expectedBuffer.length === receivedBuffer.length && timingSafeEqual(expectedBuffer, receivedBuffer);
}

function humanStatus(status: string) {
  return status === "online" ? "Online" : status === "degraded" ? "Instável" : "Offline";
}

export async function POST(request: Request) {
  const configuredSecret = process.env.MAD360_CONNECTOR_SECRET;
  if (!configuredSecret) return NextResponse.json({ error: "Conector não configurado." }, { status: 503 });
  if (!sameSecret(configuredSecret, request.headers.get("x-orquestra-connector-secret"))) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  try {
    const rawBody = await request.text();
    if (Buffer.byteLength(rawBody, "utf8") > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "Resumo acima do limite permitido." }, { status: 413 });
    }
    const body = JSON.parse(rawBody) as Record<string, unknown>;
    const eventId = typeof body.eventId === "string" ? body.eventId.trim() : "";
    const externalTenantId = typeof body.externalTenantId === "string" ? body.externalTenantId.trim() : "";
    const sourceSystem = body.sourceSystem;
    const status = body.status;
    const generatedAt = body.generatedAt;
    const usageSummary = readUsage(body.usageSummary);
    if (!eventId || eventId.length > 160 || !/^[a-zA-Z0-9._:-]+$/.test(eventId)) {
      return NextResponse.json({ error: "Evento inválido." }, { status: 400 });
    }
    if (sourceSystem !== SOURCE_SYSTEM || !externalTenantId || externalTenantId.length > 120) {
      return NextResponse.json({ error: "Origem ou empresa externa inválida." }, { status: 400 });
    }
    if (!["online", "degraded", "offline"].includes(String(status)) || !validIso(generatedAt) || !usageSummary) {
      return NextResponse.json({ error: "Resumo de uso inválido." }, { status: 400 });
    }
    const generatedAtIso = optionalIso(generatedAt)!;
    const generatedAtMs = new Date(generatedAtIso).getTime();
    if (Math.abs(Date.now() - generatedAtMs) > 10 * 60 * 1000) {
      return NextResponse.json({ error: "Evento fora da janela de sincronização." }, { status: 400 });
    }

    const db = getFirebaseAdminDb();
    const eventIdHash = createHash("sha256").update(`${SOURCE_SYSTEM}:${externalTenantId}:${eventId}`).digest("hex");
    const eventRef = db.collection("connectorEvents").doc(eventIdHash);
    if ((await eventRef.get()).exists) return NextResponse.json({ ok: true, duplicate: true });

    const serviceSnapshot = await db.collection("managedServices")
      .where("externalTenantId", "==", externalTenantId)
      .limit(5)
      .get();
    if (serviceSnapshot.size !== 1) {
      return NextResponse.json({ error: serviceSnapshot.empty ? "Sistema não cadastrado no Portal." : "Mais de um sistema usa esta empresa externa." }, { status: 409 });
    }
    const serviceDoc = serviceSnapshot.docs[0];
    const service = serviceDoc.data();
    const receivedAt = Timestamp.now();
    const tenantId = typeof service.tenantId === "string" ? service.tenantId : "";
    if (!tenantId) return NextResponse.json({ error: "Sistema sem empresa central vinculada." }, { status: 409 });

    const batch = db.batch();
    batch.update(serviceDoc.ref, {
      sourceSystem: SOURCE_SYSTEM,
      connectorStatus: "ativo",
      lastSyncAt: FieldValue.serverTimestamp(),
      lastKnownStatus: humanStatus(String(status)),
      usageSummary: { ...usageSummary, updatedAt: receivedAt },
      updatedAt: FieldValue.serverTimestamp(),
    });
    batch.create(eventRef, {
      eventId,
      sourceSystem: SOURCE_SYSTEM,
      externalTenantId,
      tenantId,
      status,
      generatedAt: generatedAtIso,
      receivedAt,
      usageSummary,
    });
    batch.create(db.collection("auditLogs").doc(), {
      tenantId,
      actorUserId: "connector:mad360",
      actorRole: "system_connector",
      action: "connector.summary_received",
      targetType: "managedService",
      targetId: serviceDoc.id,
      createdAt: receivedAt,
      metadata: { sourceSystem: SOURCE_SYSTEM, status, eventId },
    });
    await batch.commit();
    return NextResponse.json({ ok: true, received: true });
  } catch {
    return NextResponse.json({ error: "Não foi possível processar o resumo do sistema." }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({ error: "Método não permitido." }, { status: 405, headers: { Allow: "POST" } });
}
