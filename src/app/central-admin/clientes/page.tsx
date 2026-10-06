import { ClientsView, ControlShell } from "@/components/control-center";
import { getControlSnapshot } from "@/lib/control-center";
import { requirePlatformAdmin } from "@/lib/session";

export default async function ClientsPage() {
  await requirePlatformAdmin();
  return <ControlShell activePath="/central-admin/clientes"><ClientsView snapshot={await getControlSnapshot()} /></ControlShell>;
}
