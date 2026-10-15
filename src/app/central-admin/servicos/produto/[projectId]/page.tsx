import { notFound } from "next/navigation";
import { ControlShell, ProductDetailView } from "@/components/control-center";
import { getControlSnapshot } from "@/lib/control-center";
import { deployedProjects, projectSourceSystems } from "@/lib/portal-data";
import { requirePlatformAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function ProductDetailPage({ params }: { params: Promise<{ projectId: string }> }) {
  await requirePlatformAdmin();
  const { projectId } = await params;
  if (!projectSourceSystems[projectId] || !deployedProjects.some((project) => project.id === projectId)) notFound();
  return <ControlShell activePath="/central-admin/servicos"><ProductDetailView snapshot={await getControlSnapshot()} projectId={projectId} /></ControlShell>;
}
