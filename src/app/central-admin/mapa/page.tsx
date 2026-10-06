import { ControlShell, MapView } from "@/components/control-center";
import { getControlSnapshot } from "@/lib/control-center";
import { requirePlatformAdmin } from "@/lib/session";

export default async function MapPage() {
  await requirePlatformAdmin();
  return <ControlShell activePath="/central-admin/mapa"><MapView snapshot={await getControlSnapshot()} /></ControlShell>;
}
