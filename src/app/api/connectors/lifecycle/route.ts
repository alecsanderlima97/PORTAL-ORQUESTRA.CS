import { createHash, timingSafeEqual } from "node:crypto";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { getFirebaseAdminDb } from "@/lib/firebase-admin";

const MAX_BODY_BYTES = 32 * 1024;
const EVENT_WINDOW_MS = 24 * 60 * 60 * 1000;
const eventTypes = new Set(["client.archived", "client.updated", "subscription.updated"]);
const subscriptionStatuses = new Set(["trial", "ativo", "vencido", "bloqueado", "cancelado", "revisao_manual"]);

function text(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function optionalIsoDate(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(`${value}T12:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? null : value;
}

function eventTimestamp(value: unknown) {
  if (typeof value !== "string") return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function sameSecret(expected: string, received: string | null) {
  if (!received) return false;
  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(received);
  return expectedBuffer.length === receivedBuffer.length && timingSafeEqual(expectedBuffer, receivedBuffer);
}

function validMoney(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 10_000_000 ? Math.round(parsed * 100) / 100 : undefined;
}

function statusLabel(eventType: string, subscriptionStatus: string | null) {
  if (eventType === "client.archived") return "Cliente arquivado no sistema de origem.";
  if (subscriptionStatus) return `Assinatura sincronizada: ${subscriptionStatus}.`;
  return "Dados do cliente sincronizados pelo sistema de origem.";
}

export async function POST(request: Request) {
  const configuredSecret = process.env.ORQUESTRA_CONNECTOR_SHARED_SECRET;
  if (!configuredSecret) return NextResponse.json({ error: "Conector não configurado." }, { status: 503 });
  if (!sameSecret(configuredSecret, request.headers.get("x-orquestra-connector-secret"))) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  try {
    const rawBody = await request.text();
    if (Buffer.byteLength(rawBody, "utf8") > MAX_BODY_BYTES) return NextResponse.json({ error: "Evento acima do limite permitido." }, { status: 413 });
    const body = JSON.parse(rawBody) as Record<string, unknown>;
    const eventId = text(body.eventId, 160);
    const sourceSystem = text(body.sourceSystem, 80);
    const externalTenantId = text(body.externalTenantId, 120);
    const eventType = text(body.eventType, 40);
    const emittedAt = eventTimestamp(body.emittedAt);
    const subscriptionStatus = text(body.subscriptionStatus, 30) || null;
    const reason = text(body.reason, 300) || null;
    const startDate = optionalIsoDate(body.startDate);
    const renewalDate = optionalIsoDate(body.renewalDate);
    const monthlyFee = validMoney(body.monthlyFee);

    if (!eventId || !/^[a-zA-Z0-9._:-]+$/.test(eventId) || !sourceSystem || !/^[a-z0-9_:-]{2,80}$/.test(sourceSystem) || !externalTenantId || !eventType || !eventTypes.has(eventType)) {
      return NextResponse.json({ error: "Identificação do evento inválida." }, { status: 400 });
    }
    if (!emittedAt || Math.abs(Date.now() - emittedAt.getTime()) > EVENT_WINDOW_MS) {
      return NextResponse.json({ error: "Evento fora da janela de sincronização." }, { status: 400 });
    }
    if (subscriptionStatus && !subscriptionStatuses.has(subscriptionStatus)) return NextResponse.json({ error: "Status da assinatura inválido." }, { status: 400 });
    if (monthlyFee === undefined || (body.startDate !== undefined && startDate === null) || (body.renewalDate !== undefined && renewalDate === null)) {
      return NextResponse.json({ error: "Dados comerciais inválidos." }, { status: 400 });
    }

    const db = getFirebaseAdminDb();
    const eventIdHash = createHash("sha256").update(`${sourceSystem}:${externalTenantId}:${eventId}`).digest("hex");
    const eventRef = db.collection("connectorEvents").doc(eventIdHash);
    if ((await eventRef.get()).exists) return NextResponse.json({ ok: true, duplicate: true });

    const serviceSnapshot = await db.collection("managedServices")
      .where("sourceSystem", "==", sourceSystem)
      .where("externalTenantId", "==", externalTenantId)
      .limit(5)
      .get();
    if (serviceSnapshot.empty) return NextResponse.json({ error: "Sistema não cadastrado no Portal." }, { status: 404 });
    if (serviceSnapshot.size !== 1) return NextResponse.json({ error: "Mais de um sistema usa esta empresa externa." }, { status: 409 });

    const serviceDoc = serviceSnapshot.docs[0];
    const service = serviceDoc.data();
    const tenantId = typeof service.tenantId === "string" ? service.tenantId : "";
    if (!tenantId) return NextResponse.json({ error: "Sistema sem empresa central vinculada." }, { status: 409 });

    const receivedAt = Timestamp.now();
    const updates: Record<string, unknown> = {
      connectorStatus: "ativo",
      lastSyncAt: FieldValue.serverTimestamp(),
      lastKnownStatus: statusLabel(eventType, subscriptionStatus),
      updatedAt: FieldValue.serverTimestamp(),
    };
    if (eventType === "client.archived") {
      updates.subscriptionStatus = "cancelado";
      updates.accessStatus = "bloqueado";
    } else {
      if (subscriptionStatus) {
        updates.subscriptionStatus = subscriptionStatus;
        updates.accessStatus = subscriptionStatus === "ativo" ? "ativo" : subscriptionStatus === "bloqueado" || subscriptionStatus === "cancelado" ? "bloqueado" : "revisao_manual";
      }
      if (startDate !== null) updates.startDate = startDate;
      if (renewalDate !== null) updates.renewalDate = renewalDate;
      if (monthlyFee !== null) updates.monthlyFee = monthlyFee;
    }
    if (reason) updates.lastKnownStatus = `${String(updates.lastKnownStatus)} Motivo: ${reason}`;

    const batch = db.batch();
    batch.update(serviceDoc.ref, updates);
    batch.create(eventRef, {
      eventId,
      sourceSystem,
      externalTenantId,
      tenantId,
      eventType,
      emittedAt: emittedAt.toISOString(),
      receivedAt,
      reason,
      appliedFields: Object.keys(updates).filter((field) => field !== "updatedAt" && field !== "lastSyncAt"),
    });
    batch.create(db.collection("auditLogs").doc(), {
      tenantId,
      actorUserId: `connector:${sourceSystem}`,
      actorRole: "system_connector",
      action: `connector.${eventType.replaceAll(".", "_")}`,
      targetType: "managedService",
      targetId: serviceDoc.id,
      createdAt: receivedAt,
      metadata: { sourceSystem, externalTenantId, eventId, reason },
    });
    await batch.commit();
    return NextResponse.json({ ok: true, received: true, serviceId: serviceDoc.id });
  } catch {
    return NextResponse.json({ error: "Não foi possível processar o evento do sistema." }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({ error: "Método não permitido." }, { status: 405, headers: { Allow: "POST" } });
}
