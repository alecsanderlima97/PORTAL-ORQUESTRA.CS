import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ControlHeading, ControlShell } from "@/components/control-center";
import { NewClientForm } from "@/components/new-client-form";
import { requirePlatformAdmin } from "@/lib/session";

export default async function NewClientPage() {
  await requirePlatformAdmin();

  return (
    <ControlShell activePath="/central-admin/clientes">
      <ControlHeading
        eyebrow="Carteira"
        title="Novo cliente"
        description="Cadastre a empresa e mantenha o acesso em revisão até vincular os sistemas e confirmar o contrato."
        action={
          <Link href="/central-admin/clientes" className="inline-flex items-center gap-2 rounded-md border border-[#cbd7e4] bg-white px-4 py-2.5 text-sm font-semibold text-[#294052] transition hover:border-[#83a5c4] hover:bg-[#f8fbfd]">
            <ArrowLeft className="size-4" />
            Voltar para clientes
          </Link>
        }
      />
      <div className="mt-8 max-w-4xl">
        <NewClientForm />
      </div>
    </ControlShell>
  );
}
