import { ControlShell, ServicesView } from "@/components/control-center";
import { getControlSnapshot } from "@/lib/control-center";
import { requirePlatformAdmin } from "@/lib/session";

export default async function ServicesPage() {
  await requirePlatformAdmin();
  return <ControlShell activePath="/central-admin/servicos"><ServicesView snapshot={await getControlSnapshot()} /></ControlShell>;
}
