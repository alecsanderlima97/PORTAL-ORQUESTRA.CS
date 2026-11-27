import "server-only";

import { sendConnectorCommand } from "@/lib/connector-commands";

type BillingService = {
  sourceSystem?: string | null;
  externalTenantId?: string | null;
  monthlyFee?: unknown;
  billingDay?: unknown;
  graceDays?: unknown;
  plan?: unknown;
  startDate?: unknown;
  billingMethod?: unknown;
  notes?: unknown;
};

export type BillingAccessState = {
  serviceId: string;
  paymentId?: string | null;
  billingStatus: "paid" | "overdue" | "pending" | "blocked";
  subscriptionStatus: "ativo" | "bloqueado";
  accessStatus: "ativo" | "em_tolerancia" | "bloqueio_agendado" | "bloqueado" | "liberacao_pendente" | "erro_sincronizacao";
  dueDate?: string | null;
  nextDueDate?: string | null;
  paidThroughDate?: string | null;
  reason?: string | null;
};

function safeText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function finiteNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function dateOnly(value: unknown) {
  if (typeof value !== "string") return null;
  const match = value.trim().match(/^(\d{4}-\d{2}-\d{2})/);
  return match?.[1] ?? null;
}

function commandIdPart(value: string) {
  return value.replace(/[^a-zA-Z0-9._:-]/g, "_").slice(0, 100);
}

export function todayDateOnly() {
  return new Date().toISOString().slice(0, 10);
}

export function dateAfterGrace(date: string, graceDays: number) {
  const [year, month, day] = date.split("-").map(Number);
  const deadline = new Date(Date.UTC(year, month - 1, day));
  deadline.setUTCDate(deadline.getUTCDate() + Math.max(0, Math.min(30, Math.round(graceDays))));
  return deadline.toISOString().slice(0, 10);
}

export function isPastGracePeriod(dueDate: string | null, graceDays: number, currentDate = todayDateOnly()) {
  if (!dueDate || !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) return false;
  return currentDate > dateAfterGrace(dueDate, graceDays);
}

export function buildBillingContract(service: BillingService, state: BillingAccessState) {
  return {
    plan: safeText(service.plan, 120) || null,
    monthlyFee: finiteNumber(service.monthlyFee),
    billingDay: finiteNumber(service.billingDay),
    graceDays: finiteNumber(service.graceDays) ?? 3,
    paymentMethod: safeText(service.billingMethod, 40) || null,
    notes: safeText(service.notes, 2000) || null,
    startDate: dateOnly(service.startDate),
    renewalDate: state.nextDueDate ?? state.dueDate ?? null,
    nextDueDate: state.nextDueDate ?? state.dueDate ?? null,
    paidThroughDate: state.paidThroughDate ?? null,
    billingStatus: state.billingStatus,
    subscriptionStatus: state.subscriptionStatus,
    accessStatus: state.accessStatus,
    accessReason: state.reason ?? null,
  };
}

/**
 * Os conectores atuais aceitam tenant.updated como contrato versionado. Assim,
 * cobrança paga/vencida e bloqueio continuam usando o mesmo contrato seguro,
 * sem criar um segundo protocolo de comandos.
 */
export async function sendBillingAccessCommand(service: BillingService, state: BillingAccessState) {
  const paymentPart = commandIdPart(state.paymentId || state.billingStatus);
  return sendConnectorCommand(service, {
    commandId: `billing:${commandIdPart(state.serviceId)}:${paymentPart}:${state.subscriptionStatus}`,
    commandType: "tenant.updated",
    contract: buildBillingContract(service, state),
  });
}

