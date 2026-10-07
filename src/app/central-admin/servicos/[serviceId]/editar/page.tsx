import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ControlHeading, ControlShell } from "@/components/control-center";
import { EditServiceForm } from "@/components/edit-service-form";
import { getControlSnapshot } from "@/lib/control-center";
import { requirePlatformAdmin } from "@/lib/session";
import { notFound } from "next/navigation";

export default async function EditServicePage({ params }: { params: Promise<{ serviceId: string }> }) {
  await requirePlatformAdmin();
  const { serviceId } = await params;
  const service = (await getControlSnapshot()).services.find((item) => item.id === serviceId);

  if (!service) notFound();

  return <ControlShell activePath="/central-admin/servicos">
    <ControlHeading eyebrow="Catálogo operacional" title={`Editar ${service.name}`} description="Atualize os valores reais deste site ou sistema sem alterar usuários, permissões ou a ponte de integração." action={<Link href="/central-admin/servicos" className="inline-flex items-center gap-2 rounded-md border border-[#cbd7e4] bg-white px-4 py-2.5 text-sm font-semibold text-[#294052] transition hover:border-[#83a5c4] hover:bg-[#f8fbfd]"><ArrowLeft className="size-4" /> Voltar para serviços</Link>} />
    <div className="mt-8 max-w-4xl"><EditServiceForm service={service} /></div>
  </ControlShell>;
}
