import { createHash, timingSafeEqual } from "node:crypto";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { getFirebaseAdminDb } from "@/lib/firebase-admin";

const MAX_BODY_BYTES = 32 * 1024;
const EVENT_WINDOW_MS = 24 * 60 * 60 * 1000;
const eventTypes = new Set(["client.archived", "client.updated", "subscription.updated", "billing.updated"]);
const subscriptionStatuses = new Set(["trial", "ativo", "pausado", "vencido", "bloqueado", "cancelado", "revisao_manual"]);
const billingMethods = new Set(["PIX", "BOLETO", "CREDIT_CARD", "UNDEFINED"]);
const billingMethodAliases: Record<string, string> = {
  pix: "PIX",
  boleto: "BOLETO",
  cartao: "CREDIT_CARD",
  cartao_de_credito: "CREDIT_CARD",
  credit_card: "CREDIT_CARD",
  transferencia: "TRANSFERENCIA",
  transferencia_bancaria: "TRANSFERENCIA",
  dinheiro: "DINHEIRO",
  outro: "OUTRO",
  undefined: "UNDEFINED",
};
const platformAdminEmails = new Set(["orquestracs@gmail.com"]);

function text(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function isPlatformAdminEmail(value: unknown) {
  return typeof value === "string" && platformAdminEmails.has(value.trim().toLowerCase());
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

function recordValue(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function fieldValue(primary: Record<string, unknown>, fallback: Record<string, unknown>, key: string) {
  return Object.prototype.hasOwnProperty.call(primary, key) ? primary[key] : Object.prototype.hasOwnProperty.call(fallback, key) ? fallback[key] : undefined;
}

function optionalTextField(value: unknown, maxLength: number) {
  if (value === undefined) return undefined;
  return text(value, maxLength) || null;
}

function optionalEmailField(value: unknown) {
  const parsed = optionalTextField(value, 180);
  if (parsed === undefined || parsed === null) return parsed;
  return /^\S+@\S+\.\S+$/.test(parsed) ? parsed.toLowerCase() : "invalid";
}

function optionalDateField(value: unknown) {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  return optionalIsoDate(value) || "invalid";
}

function optionalDayField(value: unknown) {
  if (value === undefined) return { present: false, value: null, valid: true };
  if (value === null || value === "") return { present: true, value: null, valid: true };
  const parsed = Number(value);
  const day = Number.isInteger(parsed) ? parsed : null;
  return { present: true, value: day, valid: day !== null && day >= 1 && day <= 31 };
}

function optionalGraceDaysField(value: unknown) {
  if (value === undefined) return { present: false, value: null, valid: true };
  if (value === null || value === "") return { present: true, value: 3, valid: true };
  const parsed = Number(value);
  const days = Number.isInteger(parsed) ? parsed : null;
  return { present: true, value: days, valid: days !== null && days >= 0 && days <= 30 };
}

function optionalBillingMethod(value: unknown) {
  const parsed = optionalTextField(value, 30);
  if (parsed === undefined || parsed === null) return parsed;
  const normalized = parsed.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, "_");
  const canonical = billingMethodAliases[normalized] ?? parsed.toUpperCase();
  return billingMethods.has(canonical) || ["TRANSFERENCIA", "DINHEIRO", "OUTRO"].includes(canonical) ? canonical : "invalid";
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
    const customer = recordValue(body.customer);
    const contract = recordValue(body.contract);
    const eventId = text(body.eventId, 160);
    const sourceSystem = text(body.sourceSystem, 80);
    const externalTenantId = text(body.externalTenantId, 120);
    const eventType = text(body.eventType, 40);
    const emittedAt = eventTimestamp(body.emittedAt);
    const subscriptionStatus = text(fieldValue(contract, body, "subscriptionStatus"), 30) || null;
    const reason = text(body.reason, 300) || null;
    const startDate = optionalDateField(fieldValue(contract, body, "startDate"));
    const renewalDate = optionalDateField(fieldValue(contract, body, "renewalDate"));
    const nextDueDate = optionalDateField(fieldValue(contract, body, "nextDueDate"));
    const billingDay = optionalDayField(fieldValue(contract, body, "billingDay"));
    const graceDays = optionalGraceDaysField(fieldValue(contract, body, "graceDays"));
    const billingMethod = optionalBillingMethod(fieldValue(contract, body, "billingMethod") ?? fieldValue(contract, body, "paymentMethod"));
    const monthlyFee = validMoney(fieldValue(contract, body, "monthlyFee"));
    const sourceBillingStatus = optionalTextField(fieldValue(contract, body, "billingStatus"), 40);
    const paidThroughDate = optionalDateField(fieldValue(contract, body, "paidThroughDate"));
    const companyName = optionalTextField(fieldValue(customer, body, "companyName") ?? fieldValue(customer, body, "tradeName"), 160);
    const responsibleName = optionalTextField(fieldValue(customer, body, "responsibleName"), 120);
    const contactEmail = optionalEmailField(fieldValue(customer, body, "contactEmail") ?? fieldValue(customer, body, "email"));
    const contactPhone = optionalTextField(fieldValue(customer, body, "contactPhone") ?? fieldValue(customer, body, "phone"), 40);
    const notes = optionalTextField(
      fieldValue(customer, body, "notes")
        ?? fieldValue(customer, body, "internalNotes")
        ?? fieldValue(contract, body, "notes")
        ?? fieldValue(contract, body, "internalNotes"),
      2000,
    );
    const documentType = optionalTextField(fieldValue(customer, body, "documentType"), 20);
    const legalName = optionalTextField(fieldValue(customer, body, "legalName"), 160);
    const tradeName = optionalTextField(fieldValue(customer, body, "tradeName"), 160);
    const sourceDataVersionRaw = fieldValue(contract, body, "dataVersion");
    const sourceDataVersion = sourceDataVersionRaw === undefined || sourceDataVersionRaw === null || sourceDataVersionRaw === "" ? null : Number(sourceDataVersionRaw);
    const sourceDataVersionValid = sourceDataVersionRaw === undefined || sourceDataVersionRaw === null || sourceDataVersionRaw === "" || (typeof sourceDataVersion === "number" && Number.isInteger(sourceDataVersion) && sourceDataVersion >= 0);
    const sourceUpdatedAt = fieldValue(contract, body, "sourceUpdatedAt") ?? fieldValue(contract, body, "updatedAt");
    const sourceUpdatedAtDate = sourceUpdatedAt === undefined ? null : eventTimestamp(sourceUpdatedAt);

    if (!eventId || !/^[a-zA-Z0-9._:-]+$/.test(eventId) || !sourceSystem || !/^[a-z0-9_:-]{2,80}$/.test(sourceSystem) || !externalTenantId || !eventType || !eventTypes.has(eventType)) {
      return NextResponse.json({ error: "Identificação do evento inválida." }, { status: 400 });
    }
    if (!emittedAt || Math.abs(Date.now() - emittedAt.getTime()) > EVENT_WINDOW_MS) {
      return NextResponse.json({ error: "Evento fora da janela de sincronização." }, { status: 400 });
    }
    if (subscriptionStatus && !subscriptionStatuses.has(subscriptionStatus)) return NextResponse.json({ error: "Status da assinatura inválido." }, { status: 400 });
    if (monthlyFee === undefined || startDate === "invalid" || renewalDate === "invalid" || nextDueDate === "invalid" || paidThroughDate === "invalid" || billingMethod === "invalid" || !billingDay.valid || !graceDays.valid || contactEmail === "invalid" || !sourceDataVersionValid || (sourceUpdatedAt !== undefined && !sourceUpdatedAtDate)) {
      return NextResponse.json({ error: "Dados comerciais inválidos." }, { status: 400 });
    }
    if (isPlatformAdminEmail(contactEmail) || isPlatformAdminEmail(fieldValue(customer, body, "ownerGoogleEmail")) || isPlatformAdminEmail(fieldValue(customer, body, "googleEmail"))) {
      return NextResponse.json({ ok: true, ignored: true, reason: "platform_admin_account" });
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
        updates.accessStatus = subscriptionStatus === "ativo" || subscriptionStatus === "trial"
          ? "ativo"
          : subscriptionStatus === "bloqueado" || subscriptionStatus === "cancelado" || subscriptionStatus === "pausado"
            ? "bloqueado"
            : "revisao_manual";
      }
      if (startDate !== undefined) updates.startDate = startDate;
      if (renewalDate !== undefined) updates.renewalDate = renewalDate;
      if (nextDueDate !== undefined) updates.nextDueDate = nextDueDate;
      if (billingDay.present) updates.billingDay = billingDay.value;
      if (graceDays.present) updates.graceDays = graceDays.value;
      if (billingMethod !== undefined) updates.billingMethod = billingMethod;
      if (monthlyFee !== null) updates.monthlyFee = monthlyFee;
      if (sourceBillingStatus !== undefined) updates.sourceBillingStatus = sourceBillingStatus;
      if (paidThroughDate !== undefined) updates.sourcePaidThroughDate = paidThroughDate;
      if (sourceDataVersionRaw !== undefined) updates.sourceDataVersion = sourceDataVersion;
      updates.sourceUpdatedAt = sourceUpdatedAtDate?.toISOString() ?? emittedAt.toISOString();
    }
    if (reason) updates.lastKnownStatus = `${String(updates.lastKnownStatus)} Motivo: ${reason}`;

    const batch = db.batch();
    batch.update(serviceDoc.ref, updates);
    const companyUpdates: Record<string, unknown> = {
      sourceSystem,
      externalTenantId,
      lastSyncAt: FieldValue.serverTimestamp(),
      sourceUpdatedAt: sourceUpdatedAtDate?.toISOString() ?? emittedAt.toISOString(),
      updatedAt: FieldValue.serverTimestamp(),
    };
    if (sourceDataVersionRaw !== undefined) companyUpdates.sourceDataVersion = sourceDataVersion;
    if (legalName !== undefined) companyUpdates.legalName = legalName;
    if (tradeName !== undefined) companyUpdates.tradeName = tradeName;
    else if (companyName !== undefined && companyName !== null) companyUpdates.tradeName = companyName;
    if (responsibleName !== undefined) companyUpdates.responsibleName = responsibleName;
    if (contactEmail !== undefined) companyUpdates.contactEmail = contactEmail;
    if (contactPhone !== undefined) companyUpdates.contactPhone = contactPhone;
    if (notes !== undefined) companyUpdates.notes = notes;
    if (documentType !== undefined) companyUpdates.documentType = documentType?.toUpperCase() || null;
    for (const [field, maxLength] of [["document", 32], ["cpf", 20], ["cnpj", 24], ["rg", 20], ["cep", 9], ["street", 160], ["number", 30], ["complement", 120], ["neighborhood", 120], ["city", 100], ["state", 2], ["address", 240], ["googleBusinessName", 160], ["googleBusinessUrl", 500], ["googleAddress", 240], ["instagramUrl", 500]] as const) {
      const value = optionalTextField(fieldValue(customer, body, field), maxLength);
      if (value !== undefined) companyUpdates[field] = field === "state" && value ? value.toUpperCase() : value;
    }
    if (companyUpdates.document && String(documentType || "").toUpperCase() === "CNPJ") companyUpdates.cnpj = companyUpdates.document;
    if (companyUpdates.document && String(documentType || "").toUpperCase() === "CPF") companyUpdates.cpf = companyUpdates.document;
    batch.update(db.collection("companies").doc(tenantId), companyUpdates);
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
       metadata: { sourceSystem, externalTenantId, eventId, reason, synchronizedCustomerFields: Object.keys(companyUpdates).filter((field) => !["updatedAt", "lastSyncAt"].includes(field)), synchronizedContractFields: Object.keys(updates).filter((field) => !["updatedAt", "lastSyncAt"].includes(field)) },
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
