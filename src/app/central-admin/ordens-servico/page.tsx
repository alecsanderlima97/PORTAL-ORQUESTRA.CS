import { ControlShell } from "@/components/control-center";
import { ServiceOrdersCenter } from "@/components/service-orders-center";
import { getControlSnapshot } from "@/lib/control-center";
import { requirePlatformAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function ServiceOrdersPage() {
  await requirePlatformAdmin();
  const snapshot = await getControlSnapshot();
  return <ControlShell activePath="/central-admin/ordens-servico"><ServiceOrdersCenter companies={snapshot.companies} /></ControlShell>;
}
