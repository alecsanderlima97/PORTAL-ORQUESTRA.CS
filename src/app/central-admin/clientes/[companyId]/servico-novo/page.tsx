import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AddServiceForm } from "@/components/add-service-form";
import { ControlHeading, ControlShell } from "@/components/control-center";
import { getControlSnapshot } from "@/lib/control-center";
import { requirePlatformAdmin } from "@/lib/session";
import { notFound } from "next/navigation";

export default async function NewServicePage({ params }: { params: Promise<{ companyId: string }> }) {
  await requirePlatformAdmin();
  const { companyId } = await params;
  const company = (await getControlSnapshot()).companies.find((item) => item.id === companyId);
  if (!company) notFound();
  const companyName = company.tradeName || company.legalName;

  return <ControlShell activePath="/central-admin/clientes">
    <ControlHeading eyebrow="Carteira" title="Adicionar serviço" description={`Vincule um novo sistema, site ou serviço ao cliente ${companyName}, sem criar uma segunda empresa.`} action={<Link href="/central-admin/clientes" className="inline-flex items-center gap-2 rounded-md border border-[#cbd7e4] bg-white px-4 py-2.5 text-sm font-semibold text-[#294052] transition hover:border-[#83a5c4] hover:bg-[#f8fbfd]"><ArrowLeft className="size-4" /> Voltar para clientes</Link>} />
    <div className="mt-8 max-w-4xl"><AddServiceForm companyId={company.id} companyName={companyName} /></div>
  </ControlShell>;
}
