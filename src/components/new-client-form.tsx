"use client";

import { FormEvent, useEffect, useState } from "react";
import { Building2, LoaderCircle, MapPin, Save } from "lucide-react";
import { formatCep, formatCnpj, formatCpf, formatPhoneBR, formatRg } from "@/lib/client-data";

type FormValues = {
  legalName: string;
  tradeName: string;
  responsibleName: string;
  ownerGoogleEmail: string;
  contactEmail: string;
  contactPhone: string;
  document: string;
  cpf: string;
  cnpj: string;
  rg: string;
  cep: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
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
  cpf: "",
  cnpj: "",
  rg: "",
  cep: "",
  street: "",
  number: "",
  complement: "",
  neighborhood: "",
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

type RadarCandidate = {
  placeId?: string;
  name: string;
  address: string;
  phone: string;
  city: string;
  websiteUrl?: string;
  googleUrl?: string;
  coordinates?: { lat: number; lng: number };
  segment?: string;
  dataSource?: string;
};

function readRadarCandidate(searchParams: URLSearchParams): RadarCandidate | null {
  if (searchParams.get("source") !== "radar") return null;
  const raw = searchParams.get("candidate");
  if (!raw || raw.length > 6000) return null;

  try {
    const value = JSON.parse(raw) as Partial<RadarCandidate>;
    if (typeof value.name !== "string" || !value.name.trim() || typeof value.address !== "string" || !value.address.trim()) return null;
    return {
      placeId: typeof value.placeId === "string" ? value.placeId.slice(0, 200) : undefined,
      name: value.name.trim().slice(0, 160),
      address: value.address.trim().slice(0, 240),
      phone: typeof value.phone === "string" ? value.phone.trim().slice(0, 40) : "",
      city: typeof value.city === "string" ? value.city.trim().slice(0, 100) : "",
      websiteUrl: typeof value.websiteUrl === "string" ? value.websiteUrl.trim().slice(0, 500) : undefined,
      googleUrl: typeof value.googleUrl === "string" ? value.googleUrl.trim().slice(0, 500) : undefined,
      coordinates: value.coordinates && Number.isFinite(value.coordinates.lat) && Number.isFinite(value.coordinates.lng)
        ? { lat: value.coordinates.lat, lng: value.coordinates.lng }
        : undefined,
      segment: typeof value.segment === "string" ? value.segment.trim().slice(0, 80) : undefined,
      dataSource: typeof value.dataSource === "string" ? value.dataSource.slice(0, 40) : undefined,
    };
  } catch {
    return null;
  }
}

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
  const [isLookingUpCep, setIsLookingUpCep] = useState(false);
  const [cepMessage, setCepMessage] = useState<string | null>(null);
  const [radarNotice, setRadarNotice] = useState<string | null>(null);

  useEffect(() => {
    const candidate = readRadarCandidate(new URLSearchParams(window.location.search));
    if (!candidate) return;

    const timer = window.setTimeout(() => {
      setValues((current) => ({
        ...current,
        tradeName: candidate.name,
        contactPhone: candidate.phone && candidate.phone !== "Não informado" ? formatPhoneBR(candidate.phone) : "",
        address: candidate.address,
        city: candidate.city,
        notes: [
          "Dados públicos encontrados pelo Radar; confirme antes de salvar.",
          candidate.segment ? `Segmento encontrado: ${candidate.segment}.` : "",
          candidate.googleUrl ? `Google Maps: ${candidate.googleUrl}` : "",
          candidate.websiteUrl ? `Site encontrado: ${candidate.websiteUrl}` : "",
          candidate.placeId ? `Google Place ID: ${candidate.placeId}` : "",
        ].filter(Boolean).join("\n"),
        serviceType: "",
        serviceName: "",
        sourceSystem: "",
        externalTenantId: "",
        systemUrl: "",
        plan: "A confirmar",
        monthlyFee: "0",
        contractStatus: "teste",
        accessStatus: "revisao_manual",
      }));
      setRadarNotice("Ficha pública do Radar carregada. Confirme razão social, responsável, endereço e vínculo do sistema antes de cadastrar.");
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  function update(name: keyof FormValues, value: string) {
    const formattedValue = name === "contactPhone" ? formatPhoneBR(value)
      : name === "cpf" ? formatCpf(value)
        : name === "cnpj" ? formatCnpj(value)
          : name === "rg" ? formatRg(value)
            : name === "cep" ? formatCep(value)
              : name === "state" ? value.replace(/[^a-zA-Z]/g, "").slice(0, 2).toUpperCase()
                : value;
    setValues((current) => ({ ...current, [name]: formattedValue }));
  }

  async function lookupCep() {
    const postalCode = values.cep.replace(/\D/g, "");
    if (postalCode.length !== 8) {
      setCepMessage("Informe os 8 números do CEP para buscar o endereço.");
      return;
    }

    setIsLookingUpCep(true);
    setCepMessage(null);
    try {
      const response = await fetch(`/api/central-admin/cep/${postalCode}`, { cache: "no-store" });
      const result = await response.json() as { found?: boolean; error?: string; street?: string; neighborhood?: string; city?: string; state?: string };
      if (!response.ok || !result.found) throw new Error(result.error ?? "CEP não encontrado.");
      setValues((current) => ({ ...current, street: result.street ?? "", neighborhood: result.neighborhood ?? "", city: result.city ?? "", state: result.state ?? "" }));
      setCepMessage("Endereço localizado. Confira número e complemento antes de salvar.");
    } catch (lookupError) {
      setCepMessage(lookupError instanceof Error ? lookupError.message : "Não foi possível consultar o CEP.");
    } finally {
      setIsLookingUpCep(false);
    }
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

      {radarNotice ? <p className="mt-5 rounded-md border border-[#cfe3f1] bg-[#f2f8fc] px-3 py-3 text-sm leading-6 text-[#285a78]">{radarNotice}</p> : null}

      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <Field label="Razão social" name="legalName" value={values.legalName} onChange={update} required />
        <Field label="Nome fantasia" name="tradeName" value={values.tradeName} onChange={update} />
        <Field label="Responsável" name="responsibleName" value={values.responsibleName} onChange={update} required />
        <Field label="E-mail comercial" name="contactEmail" value={values.contactEmail} onChange={update} type="email" placeholder="contato@empresa.com" />
        <Field label="Telefone / WhatsApp" name="contactPhone" value={values.contactPhone} onChange={update} placeholder="(15) 99847-8705" />
        <div className="md:col-span-2"><p className="text-xs font-bold uppercase tracking-[0.12em] text-[#1769b0]">Documentos e identificação</p><p className="mt-1 text-xs text-[#8290a1]">Preencha apenas o que for necessário para o cadastro do cliente.</p></div>
        <Field label="CPF" name="cpf" value={values.cpf} onChange={update} placeholder="000.000.000-00" />
        <Field label="CNPJ" name="cnpj" value={values.cnpj} onChange={update} placeholder="00.000.000/0000-00" />
        <Field label="RG" name="rg" value={values.rg} onChange={update} placeholder="00.000.000-0" />
        <div className="md:col-span-2 mt-2 border-t border-[#edf1f5] pt-5"><div className="flex items-center gap-2"><MapPin className="size-4 text-[#1769b0]" /><div><p className="text-xs font-bold uppercase tracking-[0.12em] text-[#1769b0]">Endereço comercial</p><p className="mt-1 text-xs text-[#8290a1]">Digite o CEP e o cadastro preencherá a cidade, UF, rua e bairro automaticamente.</p></div></div></div>
        <div className="md:col-span-2"><Field label="Endereço encontrado no Radar" name="address" value={values.address} onChange={update} placeholder="Confira o endereço comercial" /></div>
        <label className="block">
          <span className="text-xs font-semibold text-[#294052]">CEP</span>
          <div className="mt-2 flex gap-2">
            <input name="cep" value={values.cep} onChange={(event) => update("cep", event.target.value)} onBlur={() => { if (values.cep.replace(/\D/g, "").length === 8) void lookupCep(); }} placeholder="00000-000" className="h-11 min-w-0 flex-1 rounded-md border border-[#d7e0e7] bg-white px-3 text-sm text-[#10243c] outline-none transition placeholder:text-[#9aa9b5] focus:border-[#3189bc] focus:ring-2 focus:ring-[#dceef8]" />
            <button type="button" onClick={() => void lookupCep()} disabled={isLookingUpCep} className="inline-flex h-11 shrink-0 items-center gap-2 rounded-md border border-[#b9d4e7] px-3 text-xs font-semibold text-[#1769b0] transition hover:bg-[#f2f8fc] disabled:cursor-wait disabled:opacity-60">{isLookingUpCep ? <LoaderCircle className="size-4 animate-spin" /> : <MapPin className="size-4" />}{isLookingUpCep ? "Buscando" : "Buscar CEP"}</button>
          </div>
          {cepMessage ? <span className="mt-2 block text-xs text-[#5f7890]">{cepMessage}</span> : null}
        </label>
        <Field label="Rua / avenida" name="street" value={values.street} onChange={update} />
        <Field label="Número" name="number" value={values.number} onChange={update} />
        <Field label="Complemento" name="complement" value={values.complement} onChange={update} placeholder="Sala, galpão, bloco..." />
        <Field label="Bairro" name="neighborhood" value={values.neighborhood} onChange={update} />
        <Field label="Cidade" name="city" value={values.city} onChange={update} />
        <Field label="UF" name="state" value={values.state} onChange={update} placeholder="SP" />
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
