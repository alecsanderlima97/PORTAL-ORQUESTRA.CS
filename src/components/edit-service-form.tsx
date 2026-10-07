"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";
import type { ManagedService } from "@/lib/platform-types";

type FormValues = {
  name: string;
  type: string;
  url: string;
  plan: string;
  monthlyFee: string;
  developmentFee: string;
  implementationFee: string;
  supportFee: string;
  billingDay: string;
  renewalDate: string;
};

const serviceTypes = [
  ["sistema_web", "Sistema web"],
  ["site", "Site institucional"],
  ["landing_page", "Landing page"],
  ["crm", "CRM"],
  ["erp", "ERP"],
  ["saas", "SaaS"],
  ["consultoria", "Consultoria"],
  ["marketing_digital", "Marketing digital"],
  ["trafego_pago", "Tráfego pago"],
  ["automacao", "Automação"],
  ["integracao", "Integração"],
  ["suporte_tecnico", "Suporte técnico"],
  ["outro", "Outro serviço"],
] as const;

function initialValues(service: ManagedService): FormValues {
  return {
    name: service.name,
    type: service.type,
    url: service.url,
    plan: service.plan,
    monthlyFee: service.monthlyFee == null ? "" : String(service.monthlyFee),
    developmentFee: service.developmentFee == null ? "" : String(service.developmentFee),
    implementationFee: service.implementationFee == null ? "" : String(service.implementationFee),
    supportFee: service.supportFee == null ? "" : String(service.supportFee),
    billingDay: service.billingDay == null ? "" : String(service.billingDay),
    renewalDate: service.renewalDate ?? "",
  };
}

function Field({ label, value, onChange, type = "text", placeholder }: { label: string; value: string; onChange: (value: string) => void; type?: string; placeholder?: string }) {
  return <label className="block"><span className="text-xs font-semibold text-[#294052]">{label}</span><input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="mt-2 h-11 w-full rounded-md border border-[#d7e0e7] bg-white px-3 text-sm text-[#10243c] outline-none transition placeholder:text-[#9aa9b5] focus:border-[#3189bc] focus:ring-2 focus:ring-[#dceef8]" /></label>;
}

export function EditServiceForm({ service }: { service: ManagedService }) {
  const [values, setValues] = useState(() => initialValues(service));
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  function update(name: keyof FormValues, value: string) {
    setValues((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);
    setIsSaving(true);

    try {
      const csrfResponse = await fetch("/api/auth/csrf", { cache: "no-store" });
      const csrf = await csrfResponse.json() as { csrfToken?: string };
      if (!csrfResponse.ok || !csrf.csrfToken) throw new Error("Não foi possível iniciar a sessão segura.");

      const response = await fetch(`/api/central-admin/services/${service.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          monthlyFee: values.monthlyFee ? Number(values.monthlyFee) : null,
          developmentFee: values.developmentFee ? Number(values.developmentFee) : null,
          implementationFee: values.implementationFee ? Number(values.implementationFee) : null,
          supportFee: values.supportFee ? Number(values.supportFee) : null,
          billingDay: values.billingDay ? Number(values.billingDay) : null,
          renewalDate: values.renewalDate || null,
          csrfToken: csrf.csrfToken,
        }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Não foi possível salvar o serviço.");
      setMessage("Dados comerciais atualizados e registrados na auditoria.");
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Não foi possível concluir a atualização.");
    } finally {
      setIsSaving(false);
    }
  }

  return <form onSubmit={handleSubmit} className="rounded-lg border border-[#dfe6ee] bg-white p-5 shadow-[0_12px_30px_rgba(18,51,82,0.05)] sm:p-7">
    <div className="flex items-start gap-3 border-b border-[#edf1f5] pb-5"><span className="flex size-10 items-center justify-center rounded-md bg-[#e9f1fb] text-[#1769b0]"><Save className="size-5" /></span><div><h2 className="text-base font-semibold text-[#173044]">Dados comerciais do serviço</h2><p className="mt-1 text-sm text-[#718196]">A conexão, o tenant e as permissões permanecem protegidos. Esta tela altera apenas o cadastro comercial.</p></div></div>
    <div className="mt-6 grid gap-5 md:grid-cols-2"><Field label="Nome do serviço" value={values.name} onChange={(value) => update("name", value)} /><label className="block"><span className="text-xs font-semibold text-[#294052]">Tipo de serviço</span><select value={values.type} onChange={(event) => update("type", event.target.value)} className="mt-2 h-11 w-full rounded-md border border-[#d7e0e7] bg-white px-3 text-sm text-[#10243c] outline-none focus:border-[#3189bc]">{serviceTypes.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label><Field label="Link de produção" value={values.url} onChange={(value) => update("url", value)} type="url" placeholder="https://exemplo.com" /><Field label="Plano comercial" value={values.plan} onChange={(value) => update("plan", value)} /></div>
    <div className="mt-8 border-t border-[#edf1f5] pt-6"><h2 className="text-base font-semibold text-[#173044]">Valores e datas</h2><p className="mt-1 text-sm text-[#718196]">Deixe em branco o que ainda não foi definido. Nenhum valor será inventado.</p></div>
    <div className="mt-5 grid gap-5 md:grid-cols-2 lg:grid-cols-3"><Field label="Mensalidade (R$)" value={values.monthlyFee} onChange={(value) => update("monthlyFee", value)} type="number" placeholder="Ex.: 300" /><Field label="Desenvolvimento / orçamento (R$)" value={values.developmentFee} onChange={(value) => update("developmentFee", value)} type="number" placeholder="Ex.: 2500" /><Field label="Implantação (R$)" value={values.implementationFee} onChange={(value) => update("implementationFee", value)} type="number" /><Field label="Suporte recorrente (R$)" value={values.supportFee} onChange={(value) => update("supportFee", value)} type="number" /><Field label="Dia de vencimento" value={values.billingDay} onChange={(value) => update("billingDay", value)} type="number" placeholder="Ex.: 10" /><Field label="Renovação" value={values.renewalDate} onChange={(value) => update("renewalDate", value)} type="date" /></div>
    {message ? <p role="status" className="mt-5 rounded-md bg-[#edf7f2] px-3 py-3 text-sm font-medium text-[#267d5b]">{message}</p> : null}
    {error ? <p role="alert" className="mt-5 rounded-md bg-red-50 px-3 py-3 text-sm font-medium text-red-700">{error}</p> : null}
    <div className="mt-6 flex flex-col-reverse justify-between gap-3 sm:flex-row sm:items-center"><Link href="/central-admin/servicos" className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-[#cbd7e4] px-4 text-sm font-semibold text-[#294052] transition hover:border-[#83a5c4] hover:bg-[#f8fbfd]"><ArrowLeft className="size-4" /> Voltar para serviços</Link><button type="submit" disabled={isSaving} className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#0d5e98] px-5 text-sm font-semibold text-white transition hover:bg-[#0a4e80] disabled:cursor-not-allowed disabled:opacity-60"><Save className="size-4" />{isSaving ? "Salvando..." : "Salvar dados comerciais"}</button></div>
  </form>;
}
