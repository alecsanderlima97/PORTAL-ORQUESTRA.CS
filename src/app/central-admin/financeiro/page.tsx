import { ControlShell, FinanceView } from "@/components/control-center";
import { getControlSnapshot } from "@/lib/control-center";
import { requirePlatformAdmin } from "@/lib/session";

export default async function FinancePage() {
  await requirePlatformAdmin();
  return <ControlShell activePath="/central-admin/financeiro"><FinanceView snapshot={await getControlSnapshot()} /></ControlShell>;
}
