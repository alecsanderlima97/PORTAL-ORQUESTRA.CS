import { notFound } from "next/navigation";
import { ClientDetailView, ControlShell } from "@/components/control-center";
import { getControlSnapshot } from "@/lib/control-center";

export const dynamic = "force-dynamic";

export default async function ClientDetailPage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;
  const snapshot = await getControlSnapshot();
  if (!snapshot.companies.some((company) => company.id === companyId)) notFound();
  return <ControlShell activePath="/central-admin/clientes"><ClientDetailView snapshot={snapshot} companyId={companyId} /></ControlShell>;
}
