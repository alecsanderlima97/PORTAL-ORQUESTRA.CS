import "server-only";

import type { ServiceOrder, ServiceOrderAttachment, ServiceOrderPart } from "@/lib/platform-types";

function text(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function dateValue(value: unknown) {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function") return value.toDate().toISOString();
  return null;
}

function amount(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed * 100) / 100 : 0;
}

function mapPart(value: unknown): ServiceOrderPart {
  const item = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return {
    description: text(item.description, "Peça não informada"),
    partNumber: text(item.partNumber) || undefined,
    quantity: Math.max(1, Math.round(amount(item.quantity))),
    supplierUrl: text(item.supplierUrl) || undefined,
    unitCost: amount(item.unitCost),
    unitPrice: amount(item.unitPrice),
  };
}

function mapAttachment(value: unknown): ServiceOrderAttachment {
  const item = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return {
    contentType: text(item.contentType, "application/octet-stream"),
    createdAt: dateValue(item.createdAt),
    downloadUrl: text(item.downloadUrl) || null,
    id: text(item.id),
    name: text(item.name, "Anexo"),
    size: amount(item.size),
    storagePath: text(item.storagePath),
  };
}

export function mapServiceOrder(id: string, raw: FirebaseFirestore.DocumentData): ServiceOrder {
  const parts = Array.isArray(raw.parts) ? raw.parts.map(mapPart) : [];
  const attachments = Array.isArray(raw.attachments) ? raw.attachments.map(mapAttachment) : [];
  return {
    id,
    number: text(raw.number, `OS-${id.slice(0, 6).toUpperCase()}`),
    tenantId: text(raw.tenantId),
    companyName: text(raw.companyName, "Cliente não informado"),
    companyContact: text(raw.companyContact),
    status: raw.status ?? "rascunho",
    paymentStatus: raw.paymentStatus ?? "pendente",
    paymentMethod: text(raw.paymentMethod) || null,
    dueDate: text(raw.dueDate) || null,
    equipmentType: text(raw.equipmentType),
    equipmentBrand: text(raw.equipmentBrand),
    equipmentModel: text(raw.equipmentModel),
    serialNumber: text(raw.serialNumber),
    reportedIssue: text(raw.reportedIssue),
    diagnosis: text(raw.diagnosis),
    serviceDescription: text(raw.serviceDescription),
    warrantyTerms: text(raw.warrantyTerms),
    technicianName: text(raw.technicianName, "Orquestra.cs"),
    parts,
    visitAmount: amount(raw.visitAmount),
    laborAmount: amount(raw.laborAmount),
    discountAmount: amount(raw.discountAmount),
    totalAmount: amount(raw.totalAmount),
    attachments,
    financeChargeId: text(raw.financeChargeId) || null,
    createdAt: dateValue(raw.createdAt),
    updatedAt: dateValue(raw.updatedAt),
  };
}
