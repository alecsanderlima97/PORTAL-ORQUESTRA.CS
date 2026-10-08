"use client";

import { useMemo, useState } from "react";
import { Building2, CalendarClock, CheckCircle2, MapPin, Search, Target } from "lucide-react";
import { formatMoney, formatSnapshotDate } from "@/lib/formatters";
import { normalizeLeadName } from "@/lib/client-data";
import type { CompanyAccessStatus, OpportunityRecord } from "@/lib/platform-types";

type LeadCompany = {
  id: string;
  legalName: string;
  tradeName: string | null;
  responsibleName: string;
  city: string;
  state: string;
  plan: string;
  accessStatus: CompanyAccessStatus;
  monthlyFee: number;
  renewalDate: string | null;
};

type LeadFilter = "todos" | "fidelizados" | "pipeline";

function accessLabel(status: CompanyAccessStatus) {
  return status.replaceAll("_", " ");
}

export function LeadsCenter({ companies, opportunities }: { companies: LeadCompany[]; opportunities: OpportunityRecord[] }) {
  const [filter, setFilter] = useState<LeadFilter>("todos");
  const [query, setQuery] = useState("");

  const companyNames = useMemo(() => new Set(companies.map((company) => normalizeLeadName(company.tradeName || company.legalName))), [companies]);
  const uniqueOpportunities = useMemo(() => opportunities.filter((opportunity) => !companyNames.has(normalizeLeadName(opportunity.companyName))), [companyNames, opportunities]);
  const visibleCompanies = useMemo(() => companies.filter((company) => {
    if (filter === "pipeline") return false;
    const haystack = [company.tradeName, company.legalName, company.responsibleName, company.city, company.state].filter(Boolean).join(" ").toLowerCase();
    return !query || haystack.includes(query.toLowerCase());
  }), [companies, filter, query]);
  const visibleOpportunities = useMemo(() => uniqueOpportunities.filter((opportunity) => {
    if (filter === "fidelizados") return false;
    const haystack = [opportunity.companyName, opportunity.segment, opportunity.city, opportunity.state, opportunity.commercialStatus].join(" ").toLowerCase();
    return !query || haystack.includes(query.toLowerCase());
  }), [filter, query, uniqueOpportunities]);

  const activeCompanies = companies.filter((company) => ["ativo", "liberado", "em_tolerancia"].includes(company.accessStatus));
  const potentialMonthly = uniqueOpportunities.reduce((total, opportunity) => total + opportunity.potentialMonthlyFee, 0);
  const filterButtons: Array<[LeadFilter, string]> = [["todos", "Todos"], ["fidelizados", "Fidelizados"], ["pipeline", "Pipeline"]];

  return (
    <div className="mt-6 space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <LeadMetric icon={<Target className="size-4" />} label="Registros comerciais" value={String(companies.length + uniqueOpportunities.length)} detail="clientes e oportunidades" />
        <LeadMetric icon={<CheckCircle2 className="size-4" />} label="Fidelizados" value={String(companies.length)} detail={`${activeCompanies.length} com acesso regular`} tone="success" />
        <LeadMetric icon={<Building2 className="size-4" />} label="Em pipeline" value={String(uniqueOpportunities.length)} detail="sem cliente duplicado" />
        <LeadMetric icon={<CalendarClock className="size-4" />} label="Potencial mensal" value={formatMoney(potentialMonthly)} detail="oportunidades abertas" />
      </div>

      <section className="rounded-lg border border-[#dfe6ee] bg-white">
        <div className="flex flex-col gap-4 border-b border-[#edf1f5] px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-semibold text-[#203752]">Central de Leads</h2>
            <p className="mt-1 text-xs text-[#8290a1]">Clientes cadastrados entram automaticamente como fidelizados; oportunidades continuam no pipeline.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="flex h-10 min-w-[230px] items-center gap-2 rounded-md border border-[#dfe6ee] px-3 text-sm text-[#5f7890] focus-within:border-[#3189bc]">
              <Search className="size-4" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar empresa, cidade..." className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-[#9aa9b5]" />
            </label>
            <div className="flex rounded-md border border-[#dfe6ee] p-1">
              {filterButtons.map(([value, label]) => <button key={value} type="button" onClick={() => setFilter(value)} className={`rounded px-3 py-1.5 text-xs font-semibold transition ${filter === value ? "bg-[#12345b] text-white" : "text-[#60738a] hover:bg-[#f4f8fb]"}`}>{label}</button>)}
            </div>
          </div>
        </div>

        {visibleCompanies.length === 0 && visibleOpportunities.length === 0 ? <div className="px-5 py-12 text-center text-sm text-[#708198]">Nenhum lead encontrado com esses filtros.</div> : <div className="grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-3">
          {visibleCompanies.map((company) => <article key={`company-${company.id}`} className="rounded-md border border-[#bfe3d0] bg-[#f5fbf7] p-4">
            <div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold text-[#173044]">{company.tradeName || company.legalName}</h3><p className="mt-1 text-xs text-[#60738a]">{company.responsibleName || "Responsável não informado"}</p></div><span className="inline-flex items-center gap-1 rounded-full bg-[#dff4e8] px-2.5 py-1 text-[11px] font-bold text-[#267d5b]"><CheckCircle2 className="size-3" /> Fidelizado</span></div>
            <p className="mt-4 flex items-center gap-1.5 text-xs text-[#60738a]"><MapPin className="size-3.5 text-[#23825c]" />{company.city || "Cidade não informada"}{company.state ? ` · ${company.state}` : ""}</p>
            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-[#d9eee1] pt-3 text-xs"><div><span className="block text-[#8290a1]">Plano</span><strong className="mt-1 block text-[#203752]">{company.plan || "Sem plano"}</strong></div><div><span className="block text-[#8290a1]">Mensalidade</span><strong className="mt-1 block text-[#203752]">{formatMoney(company.monthlyFee)}</strong></div><div><span className="block text-[#8290a1]">Acesso</span><strong className="mt-1 block capitalize text-[#267d5b]">{accessLabel(company.accessStatus)}</strong></div><div><span className="block text-[#8290a1]">Renovação</span><strong className="mt-1 block text-[#203752]">{formatSnapshotDate(company.renewalDate)}</strong></div></div>
          </article>)}
          {visibleOpportunities.map((opportunity) => <article key={`opportunity-${opportunity.id}`} className="rounded-md border border-[#e5ebf1] bg-white p-4">
            <div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold text-[#173044]">{opportunity.companyName}</h3><p className="mt-1 text-xs text-[#60738a]">{opportunity.segment || "Segmento não informado"}</p></div><span className="rounded-full bg-[#eef5fd] px-2.5 py-1 text-[11px] font-bold capitalize text-[#1769b0]">{opportunity.commercialStatus.replaceAll("_", " ")}</span></div>
            <p className="mt-4 flex items-center gap-1.5 text-xs text-[#60738a]"><MapPin className="size-3.5 text-[#1769b0]" />{opportunity.city || "Cidade não informada"}{opportunity.state ? ` · ${opportunity.state}` : ""}</p>
            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-[#edf1f5] pt-3 text-xs"><div><span className="block text-[#8290a1]">Potencial mensal</span><strong className="mt-1 block text-[#203752]">{formatMoney(opportunity.potentialMonthlyFee)}</strong></div><div><span className="block text-[#8290a1]">Desenvolvimento</span><strong className="mt-1 block text-[#203752]">{formatMoney(opportunity.potentialDevelopmentFee)}</strong></div><div className="col-span-2"><span className="block text-[#8290a1]">Próxima tarefa</span><strong className="mt-1 block text-[#203752]">{formatSnapshotDate(opportunity.nextTaskAt)}</strong></div></div>
          </article>)}
        </div>}
      </section>
    </div>
  );
}

function LeadMetric({ icon, label, value, detail, tone = "default" }: { icon: React.ReactNode; label: string; value: string; detail: string; tone?: "default" | "success" }) {
  return <div className="rounded-lg border border-[#dfe6ee] bg-white p-4"><div className={`flex size-8 items-center justify-center rounded-md ${tone === "success" ? "bg-[#eaf8f2] text-[#23825c]" : "bg-[#eef5fd] text-[#1769b0]"}`}>{icon}</div><p className="mt-3 text-xs font-medium text-[#74849a]">{label}</p><p className="mt-1 text-2xl font-semibold tracking-tight text-[#10243c]">{value}</p><p className="mt-1 text-xs text-[#8593a5]">{detail}</p></div>;
}
