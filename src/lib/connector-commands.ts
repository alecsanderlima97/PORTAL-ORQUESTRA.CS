import "server-only";

type ConnectorService = {
  sourceSystem?: string | null;
  externalTenantId?: string | null;
};

type ConnectorCreditGrant = {
  amount: number;
  credits: number;
  packageId: string;
  paymentId: string;
  purchaseId: string;
};

function commandUrl(sourceSystem: string) {
  const configured = process.env.ORQUESTRA_HUB_CONNECTOR_COMMAND_URL;
  if (sourceSystem === "orquestra_hub") return configured || "https://hub.orquestracs.com/api/connectors/commands";
  if (sourceSystem === "orquestra_blend") return process.env.ORQUESTRA_BLEND_CONNECTOR_COMMAND_URL || "https://southamerica-east1-orquestra-blend-7091.cloudfunctions.net/receivePortalCommand";
  if (sourceSystem === "orquestra_fit") return process.env.ORQUESTRA_FIT_CONNECTOR_COMMAND_URL || "https://southamerica-east1-orquestra-fit.cloudfunctions.net/receivePortalCommand";
  return null;
}

export async function sendConnectorCommand(service: ConnectorService, payload: { commandId?: string; customer?: Record<string, unknown>; contract?: Record<string, unknown>; creditGrant?: ConnectorCreditGrant; commandType?: string }) {
  const sourceSystem = service.sourceSystem || "";
  const externalTenantId = service.externalTenantId || "";
  const targetUrl = commandUrl(sourceSystem);
  const sharedSecret = process.env.ORQUESTRA_CONNECTOR_SHARED_SECRET;
  if (!targetUrl || !externalTenantId || !sharedSecret) return { sent: false, skipped: true };

  const response = await fetch(targetUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-orquestra-connector-secret": sharedSecret },
    body: JSON.stringify({
      commandId: payload.commandId || crypto.randomUUID(),
      sourceSystem: "orquestra_portal",
      targetSystem: sourceSystem,
      externalTenantId,
      commandType: payload.commandType || "tenant.updated",
      creditGrant: payload.creditGrant,
      emittedAt: new Date().toISOString(),
      customer: payload.customer,
      contract: payload.contract,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  return { sent: response.ok, status: response.status, skipped: false };
}
