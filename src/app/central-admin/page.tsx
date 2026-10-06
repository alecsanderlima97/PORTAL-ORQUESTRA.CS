import { ControlShell, Overview } from "@/components/control-center";
import { getControlSnapshot } from "@/lib/control-center";
import { requirePlatformAdmin } from "@/lib/session";

export default async function CentralAdminPage() {
  await requirePlatformAdmin();
  const snapshot = await getControlSnapshot();

  return (
    <ControlShell activePath="/central-admin">
      <Overview snapshot={snapshot} />
    </ControlShell>
  );
}
