"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { ArrowLeft, PackagePlus } from "lucide-react";

type FormValues = {
  serviceType: string;
  serviceName: string;
  sourceSystem: string;
  externalTenantId: string;
  systemUrl: string;
  plan: string;
  monthlyFee: string;
  developmentFee: string;
  implementationFee: string;
  supportFee: string;
  billingDay: string;
  renewalDate: string;
  currentVersion: string;
  lastUpdatedAt: string;
  lastUpdateSummary: string;
};

const initialValues: FormValues = { serviceType: "site", serviceName: "", sourceSystem: "", externalTenantId: "", systemUrl: "", plan: "", monthlyFee: "", developmentFee: "", implementationFee: "", supportFee: "", billingDay: "", renewalDate: "", currentVersion: "", lastUpdatedAt: "", lastUpdateSummary: "" };
const serviceTypes = [["sistema_web", "Sistema web"], ["site", "Site institucional"], ["landing_page", "Landing page"], ["crm", "CRM"], ["erp", "ERP"], ["saas", "SaaS"], ["consultoria", "Consultoria"], ["marketing_digital", "Marketing digital"], ["trafego_pago", "Tráfego pago"], ["automacao", "Automação"], ["integracao", "Integração"], ["suporte_tecnico", "Suporte técnico"], ["outro", "Outro serviço"]] as const;

function Field({ label, name, value, onChange, type = "text", placeholder }: { label: string; name: keyof FormValues; value: string; onChange: (name: keyof FormValues, value: string) => void; type?: string; placeholder?: string }) {
  return <label className="block"><span className="text-xs font-semibold text-[#294052]">{label}</span><input name={name} type={type} value={value} onChange={(event) => onChange(name, event.target.value)} placeholder={placeholder} className="mt-2 h-11 w-full rounded-md border border-[#d7e0e7] bg-white px-3 text-sm text-[#10243c] outline-none transition placeholder:text-[#9aa9b5] focus:border-[#3189bc] focus:ring-2 focus:ring-[#dceef8]" /></label>;
}

export function AddServiceForm({ companyId, companyName }: { companyId: string; companyName: string }) {
  const [values, setValues] = useState(initialValues);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  function update(name: keyof FormValues, value: string) { setValues((current) => ({ ...current, [name]: value })); }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);
    setIsSaving(true);
    try {
      const csrfResponse = await fetch("/api/auth/csrf", { cache: "no-store" });
      const csrf = await csrfResponse.json() as { csrfToken?: string };
      if (!csrfResponse.ok || !csrf.csrfToken) throw new Error("Não foi possível iniciar a sessão segura.");
      const response = await fetch(`/api/central-admin/companies/${companyId}/services`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...values, monthlyFee: values.monthlyFee ? Number(values.monthlyFee) : null, developmentFee: values.developmentFee ? Number(values.developmentFee) : null, implementationFee: values.implementationFee ? Number(values.implementationFee) : null, supportFee: values.supportFee ? Number(values.supportFee) : null, billingDay: values.billingDay ? Number(values.billingDay) : null, renewalDate: values.renewalDate || null, csrfToken: csrf.csrfToken }) });
      const result = await response.json() as { error?: string; serviceId?: string };
      if (!response.ok || !result.serviceId) throw new Error(result.error ?? "Não foi possível adicionar o serviço.");
      setMessage("Serviço adicionado ao cliente e registrado na auditoria.");
      setValues(initialValues);
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Não foi possível concluir o cadastro.");
    } finally { setIsSaving(false); }
  }

  return <form onSubmit={handleSubmit} className="rounded-lg border border-[#dfe6ee] bg-white p-5 shadow-[0_12px_30px_rgba(18,51,82,0.05)] sm:p-7">
    <div className="flex items-start gap-3 border-b border-[#edf1f5] pb-5"><span className="flex size-10 items-center justify-center rounded-md bg-[#e9f1fb] text-[#1769b0]"><PackagePlus className="size-5" /></span><div><h2 className="text-base font-semibold text-[#173044]">Novo serviço para {companyName}</h2><p className="mt-1 text-sm text-[#718196]">O cliente não será duplicado. Este serviço receberá o mesmo tenant e ficará separado no catálogo.</p></div></div>
    <div className="mt-6 grid gap-5 md:grid-cols-2"><label className="block"><span className="text-xs font-semibold text-[#294052]">Tipo de serviço</span><select value={values.serviceType} onChange={(event) => update("serviceType", event.target.value)} className="mt-2 h-11 w-full rounded-md border border-[#d7e0e7] bg-white px-3 text-sm text-[#10243c] outline-none focus:border-[#3189bc]">{serviceTypes.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label><Field label="Nome do serviço" name="serviceName" value={values.serviceName} onChange={update} placeholder="Ex.: Site institucional" /><label className="block"><span className="text-xs font-semibold text-[#294052]">Sistema de origem</span><select value={values.sourceSystem} onChange={(event) => update("sourceSystem", event.target.value)} className="mt-2 h-11 w-full rounded-md border border-[#d7e0e7] bg-white px-3 text-sm text-[#10243c] outline-none focus:border-[#3189bc]"><option value="">Site ou serviço independente</option><option value="mad360">Orquestra Mad360 / Serraria</option><option value="orquestra_blend">Orquestra Blend</option><option value="orquestra_hub">Orquestra Hub</option><option value="orquestra_fit">Orquestra Fit</option><option value="orquestracs_face_id">Orquestra Face ID</option><option value="outro">Outro sistema</option></select></label><Field label="ID externo da empresa" name="externalTenantId" value={values.externalTenantId} onChange={update} placeholder="Obrigatório para sistema de origem" /><div className="md:col-span-2"><Field label="Link de produção" name="systemUrl" value={values.systemUrl} onChange={update} type="url" placeholder="https://exemplo.com" /></div></div>
    <div className="mt-8 border-t border-[#edf1f5] pt-6"><h2 className="text-base font-semibold text-[#173044]">Valores comerciais</h2><p className="mt-1 text-sm text-[#718196]">Informe somente os valores reais já definidos.</p></div><div className="mt-5 grid gap-5 md:grid-cols-2 lg:grid-cols-3"><Field label="Plano" name="plan" value={values.plan} onChange={update} placeholder="Ex.: Profissional" /><Field label="Mensalidade (R$)" name="monthlyFee" value={values.monthlyFee} onChange={update} type="number" /><Field label="Desenvolvimento / orçamento (R$)" name="developmentFee" value={values.developmentFee} onChange={update} type="number" /><Field label="Implantação (R$)" name="implementationFee" value={values.implementationFee} onChange={update} type="number" /><Field label="Suporte recorrente (R$)" name="supportFee" value={values.supportFee} onChange={update} type="number" /><Field label="Dia de vencimento" name="billingDay" value={values.billingDay} onChange={update} type="number" /><Field label="Renovação" name="renewalDate" value={values.renewalDate} onChange={update} type="date" /></div>
    <div className="mt-8 border-t border-[#edf1f5] pt-6"><h2 className="text-base font-semibold text-[#173044]">Versão e atualização</h2><p className="mt-1 text-sm text-[#718196]">Opcional agora; pode ser preenchido depois na edição do serviço.</p></div><div className="mt-5 grid gap-5 md:grid-cols-2 lg:grid-cols-3"><Field label="Versão atual" name="currentVersion" value={values.currentVersion} onChange={update} placeholder="Ex.: 2026.10.07" /><Field label="Última atualização" name="lastUpdatedAt" value={values.lastUpdatedAt} onChange={update} type="date" /><Field label="Resumo da atualização" name="lastUpdateSummary" value={values.lastUpdateSummary} onChange={update} placeholder="Ex.: Novo módulo" /></div>
    {message ? <p role="status" className="mt-5 rounded-md bg-[#edf7f2] px-3 py-3 text-sm font-medium text-[#267d5b]">{message}</p> : null}{error ? <p role="alert" className="mt-5 rounded-md bg-red-50 px-3 py-3 text-sm font-medium text-red-700">{error}</p> : null}
    <div className="mt-6 flex flex-col-reverse justify-between gap-3 sm:flex-row sm:items-center"><Link href="/central-admin/clientes" className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-[#cbd7e4] px-4 text-sm font-semibold text-[#294052] transition hover:border-[#83a5c4] hover:bg-[#f8fbfd]"><ArrowLeft className="size-4" /> Voltar para clientes</Link><button type="submit" disabled={isSaving} className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#0d5e98] px-5 text-sm font-semibold text-white transition hover:bg-[#0a4e80] disabled:cursor-not-allowed disabled:opacity-60"><PackagePlus className="size-4" />{isSaving ? "Adicionando..." : "Adicionar serviço"}</button></div>
  </form>;
}
