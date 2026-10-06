import { AuditView, ControlShell } from "@/components/control-center";
import { getControlSnapshot } from "@/lib/control-center";
import { requirePlatformAdmin } from "@/lib/session";

export default async function AuditPage() {
  await requirePlatformAdmin();
  return <ControlShell activePath="/central-admin/auditoria"><AuditView snapshot={await getControlSnapshot()} /></ControlShell>;
}
