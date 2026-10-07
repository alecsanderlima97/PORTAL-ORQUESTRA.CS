"use client";

import { FormEvent, useState } from "react";
import { Building2, Save } from "lucide-react";

type FormValues = {
  legalName: string;
  tradeName: string;
  responsibleName: string;
  ownerGoogleEmail: string;
  contactEmail: string;
  contactPhone: string;
  document: string;
  city: string;
  state: string;
  address: string;
  plan: string;
  monthlyFee: string;
  billingDay: string;
  graceDays: string;
  contractStatus: string;
  accessStatus: string;
  serviceType: string;
  serviceName: string;
  sourceSystem: string;
  externalTenantId: string;
  systemUrl: string;
  serviceMonthlyFee: string;
  serviceDevelopmentFee: string;
  serviceImplementationFee: string;
  serviceSupportFee: string;
  serviceBillingDay: string;
  serviceRenewalDate: string;
  startDate: string;
  renewalDate: string;
  notes: string;
};

const initialValues: FormValues = {
  legalName: "",
  tradeName: "",
  responsibleName: "",
  ownerGoogleEmail: "",
  contactEmail: "",
  contactPhone: "",
  document: "",
  city: "",
  state: "",
  address: "",
  plan: "",
  monthlyFee: "0",
  billingDay: "10",
  graceDays: "5",
  contractStatus: "teste",
  accessStatus: "revisao_manual",
  serviceType: "sistema_web",
  serviceName: "",
  sourceSystem: "",
  externalTenantId: "",
  systemUrl: "",
  serviceMonthlyFee: "",
  serviceDevelopmentFee: "",
  serviceImplementationFee: "",
  serviceSupportFee: "",
  serviceBillingDay: "10",
  serviceRenewalDate: "",
  startDate: "",
  renewalDate: "",
  notes: "",
};

function Field({ label, name, value, onChange, type = "text", required = false, placeholder }: { label: string; name: keyof FormValues; value: string; onChange: (name: keyof FormValues, value: string) => void; type?: string; required?: boolean; placeholder?: string }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-[#294052]">{label}{required ? " *" : ""}</span>
      <input name={name} type={type} value={value} onChange={(event) => onChange(name, event.target.value)} required={required} placeholder={placeholder} className="mt-2 h-11 w-full rounded-md border border-[#d7e0e7] bg-white px-3 text-sm text-[#10243c] outline-none transition placeholder:text-[#9aa9b5] focus:border-[#3189bc] focus:ring-2 focus:ring-[#dceef8]" />
    </label>
  );
}

export function NewClientForm() {
  const [values, setValues] = useState(initialValues);
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

      const response = await fetch("/api/central-admin/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          monthlyFee: Number(values.monthlyFee),
          billingDay: Number(values.billingDay),
          graceDays: Number(values.graceDays),
          serviceMonthlyFee: values.serviceMonthlyFee ? Number(values.serviceMonthlyFee) : null,
          serviceDevelopmentFee: values.serviceDevelopmentFee ? Number(values.serviceDevelopmentFee) : null,
          serviceImplementationFee: values.serviceImplementationFee ? Number(values.serviceImplementationFee) : null,
          serviceSupportFee: values.serviceSupportFee ? Number(values.serviceSupportFee) : null,
          serviceBillingDay: Number(values.serviceBillingDay),
          csrfToken: csrf.csrfToken,
        }),
      });
      const result = await response.json() as { error?: string; companyId?: string };
      if (!response.ok || !result.companyId) throw new Error(result.error ?? "Não foi possível cadastrar a empresa.");

      setMessage(values.serviceType && (values.sourceSystem || values.serviceName) ? "Cliente e serviço cadastrados. O controle comercial já ficou separado por serviço." : "Cliente cadastrado. O acesso ficou em revisão manual até um serviço ser vinculado.");
      setValues(initialValues);
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Não foi possível concluir o cadastro.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-[#dfe6ee] bg-white p-5 shadow-[0_12px_30px_rgba(18,51,82,0.05)] sm:p-7">
      <div className="flex items-start gap-3 border-b border-[#edf1f5] pb-5">
        <span className="flex size-10 items-center justify-center rounded-md bg-[#e9f1fb] text-[#1769b0]"><Building2 className="size-5" /></span>
        <div><h2 className="text-base font-semibold text-[#173044]">Dados da empresa</h2><p className="mt-1 text-sm text-[#718196]">Cadastre a empresa pelo sistema que ela já utiliza. Não é necessário saber o Google dos funcionários.</p></div>
      </div>

      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <Field label="Razão social" name="legalName" value={values.legalName} onChange={update} required />
        <Field label="Nome fantasia" name="tradeName" value={values.tradeName} onChange={update} />
        <Field label="Responsável" name="responsibleName" value={values.responsibleName} onChange={update} required />
        <Field label="E-mail comercial" name="contactEmail" value={values.contactEmail} onChange={update} type="email" placeholder="contato@empresa.com" />
        <Field label="Telefone / WhatsApp" name="contactPhone" value={values.contactPhone} onChange={update} />
        <Field label="CPF ou CNPJ" name="document" value={values.document} onChange={update} />
        <Field label="Cidade" name="city" value={values.city} onChange={update} />
        <Field label="UF" name="state" value={values.state} onChange={update} placeholder="SP" />
        <div className="md:col-span-2"><Field label="Endereço" name="address" value={values.address} onChange={update} /></div>
      </div>

      <div className="mt-8 border-t border-[#edf1f5] pt-6"><h2 className="text-base font-semibold text-[#173044]">Serviço vinculado</h2><p className="mt-1 text-sm text-[#718196]">Sistemas têm ponte de usuários; sites têm monitoramento técnico. O financeiro de cada serviço fica separado.</p></div>
      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <label className="block"><span className="text-xs font-semibold text-[#294052]">Tipo de serviço</span><select name="serviceType" value={values.serviceType} onChange={(event) => update("serviceType", event.target.value)} className="mt-2 h-11 w-full rounded-md border border-[#d7e0e7] bg-white px-3 text-sm text-[#10243c] outline-none focus:border-[#3189bc]"><option value="">Nenhum serviço vinculado</option><option value="sistema_web">Sistema web</option><option value="site">Site institucional</option><option value="landing_page">Landing page</option><option value="crm">CRM</option><option value="erp">ERP</option><option value="saas">SaaS</option><option value="outro">Outro serviço</option></select></label>
        <Field label="Nome do site ou serviço" name="serviceName" value={values.serviceName} onChange={update} placeholder="Ex.: Site Porto Belo" required={Boolean(values.serviceType && !values.sourceSystem)} />
        <label className="block"><span className="text-xs font-semibold text-[#294052]">Sistema de origem</span><select name="sourceSystem" value={values.sourceSystem} onChange={(event) => update("sourceSystem", event.target.value)} className="mt-2 h-11 w-full rounded-md border border-[#d7e0e7] bg-white px-3 text-sm text-[#10243c] outline-none focus:border-[#3189bc]"><option value="">Site ou serviço independente</option><option value="mad360">Orquestra Mad360 / Serraria</option><option value="orquestra_blend">Orquestra Blend</option><option value="orquestra_hub">Orquestra Hub</option><option value="orquestra_fit">Orquestra Fit</option><option value="orquestracs_face_id">Orquestra Face ID</option><option value="outro">Outro sistema</option></select></label>
        <Field label="ID da empresa no sistema" name="externalTenantId" value={values.externalTenantId} onChange={update} placeholder="Ex.: vanmarte" required={Boolean(values.sourceSystem)} />
        <div className="md:col-span-2"><Field label="Link de produção do sistema ou site" name="systemUrl" value={values.systemUrl} onChange={update} type="url" placeholder="https://exemplo.com" required={Boolean(values.serviceType)} /></div>
      </div>

      <div className="mt-8 border-t border-[#edf1f5] pt-6"><h2 className="text-base font-semibold text-[#173044]">Valores deste serviço</h2><p className="mt-1 text-sm text-[#718196]">Separe o desenvolvimento, a implantação, o suporte e a mensalidade do site ou sistema.</p></div>
      <div className="mt-5 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        <Field label="Mensalidade do serviço (R$)" name="serviceMonthlyFee" value={values.serviceMonthlyFee} onChange={update} type="number" placeholder="Ex.: 300" />
        <Field label="Desenvolvimento / orçamento (R$)" name="serviceDevelopmentFee" value={values.serviceDevelopmentFee} onChange={update} type="number" placeholder="Ex.: 2500" />
        <Field label="Implantação (R$)" name="serviceImplementationFee" value={values.serviceImplementationFee} onChange={update} type="number" />
        <Field label="Suporte recorrente (R$)" name="serviceSupportFee" value={values.serviceSupportFee} onChange={update} type="number" />
        <Field label="Vencimento deste serviço" name="serviceBillingDay" value={values.serviceBillingDay} onChange={update} type="number" />
        <Field label="Renovação deste serviço" name="serviceRenewalDate" value={values.serviceRenewalDate} onChange={update} type="date" />
      </div>

      <div className="mt-8 border-t border-[#edf1f5] pt-6"><h2 className="text-base font-semibold text-[#173044]">Contrato e acesso</h2><p className="mt-1 text-sm text-[#718196]">O cliente começa em revisão manual para evitar liberação antes da configuração.</p></div>
      <div className="mt-5 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        <Field label="Plano" name="plan" value={values.plan} onChange={update} required placeholder="Ex.: Profissional" />
        <Field label="Mensalidade (R$)" name="monthlyFee" value={values.monthlyFee} onChange={update} type="number" />
        <Field label="Dia de vencimento" name="billingDay" value={values.billingDay} onChange={update} type="number" />
        <Field label="Tolerância (dias)" name="graceDays" value={values.graceDays} onChange={update} type="number" />
        <label className="block"><span className="text-xs font-semibold text-[#294052]">Status do contrato</span><select name="contractStatus" value={values.contractStatus} onChange={(event) => update("contractStatus", event.target.value)} className="mt-2 h-11 w-full rounded-md border border-[#d7e0e7] bg-white px-3 text-sm text-[#10243c] outline-none focus:border-[#3189bc]"><option value="teste">Em teste</option><option value="ativo">Ativo</option><option value="suspenso">Suspenso</option></select></label>
        <label className="block"><span className="text-xs font-semibold text-[#294052]">Acesso inicial</span><select name="accessStatus" value={values.accessStatus} onChange={(event) => update("accessStatus", event.target.value)} className="mt-2 h-11 w-full rounded-md border border-[#d7e0e7] bg-white px-3 text-sm text-[#10243c] outline-none focus:border-[#3189bc]"><option value="revisao_manual">Revisão manual</option><option value="ativo">Ativo</option><option value="em_tolerancia">Em tolerância</option></select></label>
        <Field label="Início" name="startDate" value={values.startDate} onChange={update} type="date" />
        <Field label="Renovação" name="renewalDate" value={values.renewalDate} onChange={update} type="date" />
      </div>
      <label className="mt-5 block"><span className="text-xs font-semibold text-[#294052]">Observações</span><textarea name="notes" value={values.notes} onChange={(event) => update("notes", event.target.value)} rows={4} className="mt-2 w-full resize-y rounded-md border border-[#d7e0e7] bg-white px-3 py-3 text-sm text-[#10243c] outline-none focus:border-[#3189bc]" placeholder="Anotações internas sobre contrato, implantação ou suporte." /></label>

      {message ? <p role="status" className="mt-5 rounded-md bg-[#edf7f2] px-3 py-3 text-sm font-medium text-[#267d5b]">{message}</p> : null}
      {error ? <p role="alert" className="mt-5 rounded-md bg-red-50 px-3 py-3 text-sm font-medium text-red-700">{error}</p> : null}
      <div className="mt-6 flex justify-end"><button type="submit" disabled={isSaving} className="inline-flex h-11 items-center gap-2 rounded-md bg-[#0d5e98] px-5 text-sm font-semibold text-white transition hover:bg-[#0a4e80] disabled:cursor-not-allowed disabled:opacity-60"><Save className="size-4" />{isSaving ? "Salvando..." : "Cadastrar cliente"}</button></div>
    </form>
  );
}
