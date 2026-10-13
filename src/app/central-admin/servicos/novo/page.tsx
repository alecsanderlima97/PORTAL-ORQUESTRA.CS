import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ControlHeading, ControlShell } from "@/components/control-center";
import { NewCatalogServiceForm } from "@/components/new-catalog-service-form";
import { getControlSnapshot } from "@/lib/control-center";
import { requirePlatformAdmin } from "@/lib/session";

export default async function NewCatalogServicePage() {
  await requirePlatformAdmin();
  const snapshot = await getControlSnapshot();

  return <ControlShell activePath="/central-admin/servicos">
    <ControlHeading eyebrow="Catálogo operacional" title="Cadastrar sistema ou site" description="Registre uma solução real mesmo antes de existir uma ponte com o cliente. A vinculação pode ser concluída depois." action={<Link href="/central-admin/servicos" className="inline-flex items-center gap-2 rounded-md border border-[#cbd7e4] bg-white px-4 py-2.5 text-sm font-semibold text-[#294052] transition hover:border-[#83a5c4] hover:bg-[#f8fbfd]"><ArrowLeft className="size-4" /> Voltar para serviços</Link>} />
    <div className="mt-8 max-w-4xl"><NewCatalogServiceForm companies={snapshot.companies.map((company) => ({ id: company.id, name: company.tradeName || company.legalName }))} /></div>
  </ControlShell>;
}
