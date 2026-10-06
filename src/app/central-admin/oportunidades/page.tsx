import { ControlShell, OpportunitiesView } from "@/components/control-center";
import { getControlSnapshot } from "@/lib/control-center";
import { requirePlatformAdmin } from "@/lib/session";

export default async function OpportunitiesPage() {
  await requirePlatformAdmin();
  return <ControlShell activePath="/central-admin/oportunidades"><OpportunitiesView snapshot={await getControlSnapshot()} /></ControlShell>;
}
