"use client";

import Link from "next/link";
import { ClipboardList, FileText, ImagePlus, LoaderCircle, Plus, Search, Sparkles, Wrench } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { CompanyRecord, ServiceOrder, ServiceOrderPart } from "@/lib/platform-types";

type FormValues = {
  tenantId: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  dueDate: string;
  equipmentType: string;
  equipmentBrand: string;
  equipmentModel: string;
  serialNumber: string;
  reportedIssue: string;
  diagnosis: string;
  serviceDescription: string;
  warrantyTerms: string;
  technicianName: string;
  visitAmount: string;
  laborAmount: string;
  discountAmount: string;
};

const initialValues: FormValues = {
  tenantId: "", status: "orcamento", paymentStatus: "pendente", paymentMethod: "PIX", dueDate: "",
  equipmentType: "Computador", equipmentBrand: "", equipmentModel: "", serialNumber: "", reportedIssue: "", diagnosis: "", serviceDescription: "", warrantyTerms: "Garantia de 90 dias sobre o serviço realizado, salvo mau uso ou novos danos.", technicianName: "", visitAmount: "", laborAmount: "", discountAmount: "",
};

const statusLabels: Record<string, string> = { rascunho: "Rascunho", orcamento: "Orçamento", aprovado: "Aprovado", em_execucao: "Em execução", concluida: "Concluída", cancelada: "Cancelada" };
const paymentLabels: Record<string, string> = { pendente: "Pendente", parcial: "Parcial", recebido: "Recebido", isento: "Isento" };

function amount(value: string | number) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function money(value: number) {
  return value.toLocaleString("pt-BR", { currency: "BRL", style: "currency" });
}

function Field({ label, value, onChange, type = "text", placeholder }: { label: string; value: string; onChange: (value: string) => void; type?: string; placeholder?: string }) {
  return <label className="block"><span className="text-xs font-semibold text-[#294052]">{label}</span><input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="mt-2 h-11 w-full rounded-md border border-[#d7e0e7] bg-white px-3 text-sm text-[#10243c] outline-none transition placeholder:text-[#9aa9b5] focus:border-[#3189bc] focus:ring-2 focus:ring-[#dceef8]" /></label>;
}

export function ServiceOrdersCenter({ companies }: { companies: CompanyRecord[] }) {
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [values, setValues] = useState<FormValues>(initialValues);
  const [parts, setParts] = useState<ServiceOrderPart[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [assistantMode, setAssistantMode] = useState("diagnostico");
  const [assistantText, setAssistantText] = useState("");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [assistantBusy, setAssistantBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function csrf() {
    const response = await fetch("/api/auth/csrf", { cache: "no-store" });
    const body = await response.json() as { csrfToken?: string };
    if (!response.ok || !body.csrfToken) throw new Error("Não foi possível iniciar a sessão segura.");
    return body.csrfToken;
  }

  async function loadOrders() {
    const response = await fetch("/api/central-admin/service-orders", { cache: "no-store" });
    const body = await response.json() as { orders?: ServiceOrder[]; error?: string };
    if (!response.ok) throw new Error(body.error || "Não foi possível carregar as ordens.");
    setOrders(body.orders || []);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadOrders().catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Não foi possível carregar as ordens."));
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  function update(name: keyof FormValues, value: string) { setValues((current) => ({ ...current, [name]: value })); }
  function addPart() { setParts((current) => [...current, { description: "", partNumber: "", quantity: 1, supplierUrl: "", unitCost: 0, unitPrice: 0 }]); }
  function updatePart(index: number, key: keyof ServiceOrderPart, value: string) { setParts((current) => current.map((part, itemIndex) => itemIndex === index ? { ...part, [key]: ["quantity", "unitCost", "unitPrice"].includes(key) ? amount(value) : value } : part)); }
  function removePart(index: number) { setParts((current) => current.filter((_, itemIndex) => itemIndex !== index)); }

  const total = useMemo(() => Math.max(0, parts.reduce((sum, part) => sum + part.quantity * part.unitPrice, 0) + amount(values.visitAmount) + amount(values.laborAmount) - amount(values.discountAmount)), [parts, values.visitAmount, values.laborAmount, values.discountAmount]);
  const visibleOrders = orders.filter((order) => `${order.number} ${order.companyName} ${order.equipmentBrand} ${order.equipmentModel}`.toLowerCase().includes(search.toLowerCase()));

  async function runAssistant() {
    setAssistantBusy(true); setError(""); setAssistantText("");
    try {
      const token = await csrf();
      const response = await fetch("/api/central-admin/service-orders/assistant", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...values, mode: assistantMode, parts: parts.map((part) => `${part.description} ${part.partNumber || ""}`).join(", "), csrfToken: token }) });
      const body = await response.json() as { text?: string; error?: string };
      if (!response.ok || !body.text) throw new Error(body.error || "A IA não retornou uma sugestão.");
      setAssistantText(body.text);
    } catch (assistantError) { setError(assistantError instanceof Error ? assistantError.message : "Não foi possível consultar a IA."); } finally { setAssistantBusy(false); }
  }

  function useAssistantText() {
    if (assistantMode === "diagnostico") update("diagnosis", assistantText);
    if (assistantMode === "relatorio") update("serviceDescription", assistantText);
    if (assistantMode === "peca") update("reportedIssue", `${values.reportedIssue}\n\nPesquisa sugerida pela IA:\n${assistantText}`.trim());
    setMessage("Sugestão aplicada ao rascunho. Revise antes de salvar.");
  }

  async function saveOrder(event: React.FormEvent<HTMLFormElement>, createFinance: boolean) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      const token = await csrf();
      const response = await fetch("/api/central-admin/service-orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...values, parts, visitAmount: amount(values.visitAmount), laborAmount: amount(values.laborAmount), discountAmount: amount(values.discountAmount), createFinance, csrfToken: token }) });
      const body = await response.json() as { orderId?: string; number?: string; error?: string };
      if (!response.ok || !body.orderId) throw new Error(body.error || "Não foi possível salvar a ordem.");
      for (const file of files) {
        const form = new FormData(); form.append("file", file); form.append("csrfToken", token);
        const upload = await fetch(`/api/central-admin/service-orders/${body.orderId}/attachments`, { method: "POST", body: form });
        if (!upload.ok) throw new Error("A ordem foi salva, mas um anexo não pôde ser enviado.");
      }
      setMessage(`${body.number} criada com sucesso${createFinance ? " e lançada no Financeiro" : ""}.`);
      setValues(initialValues); setParts([]); setFiles([]); setAssistantText(""); setShowForm(false); await loadOrders();
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Não foi possível salvar a ordem."); } finally { setBusy(false); }
  }

  async function closeOrder(order: ServiceOrder) {
    setError("");
    try {
      const token = await csrf();
      const response = await fetch(`/api/central-admin/service-orders/${order.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "concluida", paymentStatus: order.paymentStatus, createFinance: !order.financeChargeId, csrfToken: token }) });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(body.error || "Não foi possível concluir a ordem.");
      await loadOrders(); setMessage(`${order.number} concluída e enviada ao Financeiro.`);
    } catch (closeError) { setError(closeError instanceof Error ? closeError.message : "Não foi possível concluir a ordem."); }
  }

  return <div>
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#1769b0]">Operação técnica</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#173044]">Ordens de serviço</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-[#708198]">Orçamentos, manutenção, peças, fotos, relatórios e lançamentos no Financeiro em um padrão único.</p></div><button type="button" onClick={() => { setShowForm(true); setMessage(""); setError(""); }} className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#12345b] px-4 text-sm font-semibold text-white hover:bg-[#0d2949]"><Plus className="size-4" /> Nova ordem</button></div>
    {message ? <p role="status" className="mt-5 rounded-md bg-[#edf7f2] px-4 py-3 text-sm font-medium text-[#267d5b]">{message}</p> : null}{error ? <p role="alert" className="mt-5 rounded-md bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p> : null}
    {showForm ? <form onSubmit={(event) => void saveOrder(event, false)} className="mt-6 rounded-lg border border-[#dfe6ee] bg-white p-5 shadow-[0_12px_30px_rgba(18,51,82,0.05)] sm:p-7"><div className="flex items-start justify-between gap-4 border-b border-[#edf1f5] pb-5"><div className="flex items-start gap-3"><span className="flex size-10 items-center justify-center rounded-md bg-[#e9f1fb] text-[#1769b0]"><ClipboardList className="size-5" /></span><div><h2 className="text-base font-semibold text-[#173044]">Nova ordem de serviço</h2><p className="mt-1 text-sm text-[#718196]">O orçamento só entra no Financeiro quando você confirmar o fechamento.</p></div></div><button type="button" onClick={() => setShowForm(false)} className="text-sm font-semibold text-[#60738a] hover:text-[#173044]">Fechar</button></div>
      <div className="mt-6 grid gap-5 md:grid-cols-2"><label className="block"><span className="text-xs font-semibold text-[#294052]">Cliente *</span><select required value={values.tenantId} onChange={(event) => update("tenantId", event.target.value)} className="mt-2 h-11 w-full rounded-md border border-[#d7e0e7] bg-white px-3 text-sm text-[#10243c] outline-none focus:border-[#3189bc]"><option value="">Selecione o cliente</option>{companies.map((company) => <option value={company.id} key={company.id}>{company.tradeName || company.legalName}</option>)}</select></label><Field label="Técnico responsável" value={values.technicianName} onChange={(value) => update("technicianName", value)} placeholder="Seu nome ou equipe" /><label className="block"><span className="text-xs font-semibold text-[#294052]">Status inicial</span><select value={values.status} onChange={(event) => update("status", event.target.value)} className="mt-2 h-11 w-full rounded-md border border-[#d7e0e7] bg-white px-3 text-sm text-[#10243c] outline-none focus:border-[#3189bc]">{Object.entries(statusLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label><Field label="Vencimento do orçamento" value={values.dueDate} onChange={(value) => update("dueDate", value)} type="date" /></div>
      <div className="mt-8 border-t border-[#edf1f5] pt-6"><h3 className="font-semibold text-[#173044]">Equipamento</h3><div className="mt-5 grid gap-5 md:grid-cols-2 lg:grid-cols-4"><Field label="Tipo" value={values.equipmentType} onChange={(value) => update("equipmentType", value)} placeholder="Notebook, impressora..." /><Field label="Marca" value={values.equipmentBrand} onChange={(value) => update("equipmentBrand", value)} /><Field label="Modelo" value={values.equipmentModel} onChange={(value) => update("equipmentModel", value)} /><Field label="Número de série" value={values.serialNumber} onChange={(value) => update("serialNumber", value)} /></div></div>
      <div className="mt-8 grid gap-5 border-t border-[#edf1f5] pt-6 md:grid-cols-2"><label className="block"><span className="text-xs font-semibold text-[#294052]">Problema relatado</span><textarea value={values.reportedIssue} onChange={(event) => update("reportedIssue", event.target.value)} rows={5} className="mt-2 w-full rounded-md border border-[#d7e0e7] p-3 text-sm outline-none focus:border-[#3189bc]" placeholder="O que o cliente informou?" /></label><label className="block"><span className="text-xs font-semibold text-[#294052]">Diagnóstico</span><textarea value={values.diagnosis} onChange={(event) => update("diagnosis", event.target.value)} rows={5} className="mt-2 w-full rounded-md border border-[#d7e0e7] p-3 text-sm outline-none focus:border-[#3189bc]" placeholder="Causa identificada, testes e observações" /></label><label className="block md:col-span-2"><span className="text-xs font-semibold text-[#294052]">Serviço realizado / relatório técnico</span><textarea value={values.serviceDescription} onChange={(event) => update("serviceDescription", event.target.value)} rows={5} className="mt-2 w-full rounded-md border border-[#d7e0e7] p-3 text-sm outline-none focus:border-[#3189bc]" placeholder="Descreva o que foi feito, testes e resultado" /></label></div>
      <div className="mt-6 rounded-md border border-[#dfe8ef] bg-[#f8fbfd] p-4"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><h3 className="flex items-center gap-2 text-sm font-semibold text-[#173044]"><Sparkles className="size-4 text-[#1769b0]" /> Assistente técnico</h3><p className="mt-1 text-xs text-[#708198]">A IA sugere conteúdo; você revisa antes de salvar ou enviar ao cliente.</p></div><div className="flex gap-2"><select value={assistantMode} onChange={(event) => setAssistantMode(event.target.value)} className="h-10 rounded-md border border-[#cbd7e4] bg-white px-2 text-xs"><option value="diagnostico">Ajudar no diagnóstico</option><option value="peca">Pesquisar peça</option><option value="relatorio">Montar relatório</option></select><button type="button" onClick={() => void runAssistant()} disabled={assistantBusy} className="inline-flex h-10 items-center gap-2 rounded-md border border-[#9dbbd4] bg-white px-3 text-xs font-semibold text-[#1769b0] disabled:opacity-60">{assistantBusy ? <LoaderCircle className="size-4 animate-spin" /> : <Search className="size-4" />}{assistantBusy ? "Analisando" : "Consultar IA"}</button></div></div>{assistantText ? <div className="mt-4 rounded-md border border-[#dfe6ee] bg-white p-4 text-sm leading-6 text-[#294052] whitespace-pre-wrap">{assistantText}<button type="button" onClick={useAssistantText} className="mt-4 inline-flex items-center gap-2 rounded-md bg-[#e9f1fb] px-3 py-2 text-xs font-semibold text-[#0d5e98]">Usar no rascunho</button></div> : null}</div>
      <div className="mt-8 border-t border-[#edf1f5] pt-6"><div className="flex items-center justify-between gap-3"><div><h3 className="font-semibold text-[#173044]">Peças e materiais</h3><p className="mt-1 text-xs text-[#708198]">Separe custo interno, preço cobrado e referência de compra.</p></div><button type="button" onClick={addPart} className="inline-flex items-center gap-1.5 rounded-md border border-[#cbd7e4] px-3 py-2 text-xs font-semibold text-[#294052]"><Plus className="size-3.5" /> Adicionar peça</button></div>{parts.length === 0 ? <p className="mt-4 rounded-md bg-[#f8fafc] px-3 py-3 text-sm text-[#708198]">Nenhuma peça adicionada.</p> : <div className="mt-4 space-y-3">{parts.map((part, index) => <div key={`${index}-${part.description}`} className="grid gap-3 rounded-md border border-[#edf1f5] p-3 md:grid-cols-[1.5fr_1fr_90px_110px_110px_auto]"><Field label="Descrição" value={part.description} onChange={(value) => updatePart(index, "description", value)} placeholder="Ex.: cabo de rede CAT6" /><Field label="Código / modelo" value={part.partNumber || ""} onChange={(value) => updatePart(index, "partNumber", value)} /><Field label="Qtd." value={String(part.quantity)} onChange={(value) => updatePart(index, "quantity", value)} type="number" /><Field label="Custo" value={String(part.unitCost || "")} onChange={(value) => updatePart(index, "unitCost", value)} type="number" /><Field label="Preço" value={String(part.unitPrice || "")} onChange={(value) => updatePart(index, "unitPrice", value)} type="number" /><button type="button" onClick={() => removePart(index)} className="self-end pb-2 text-xs font-semibold text-red-700">Remover</button></div>)}</div>}</div>
      <div className="mt-8 grid gap-5 border-t border-[#edf1f5] pt-6 md:grid-cols-2 lg:grid-cols-4"><Field label="Visita técnica (R$)" value={values.visitAmount} onChange={(value) => update("visitAmount", value)} type="number" /><Field label="Mão de obra (R$)" value={values.laborAmount} onChange={(value) => update("laborAmount", value)} type="number" /><Field label="Desconto (R$)" value={values.discountAmount} onChange={(value) => update("discountAmount", value)} type="number" /><div className="rounded-md bg-[#f0f6fb] px-4 py-3"><span className="block text-xs font-semibold text-[#60738a]">Total da ordem</span><strong className="mt-1 block text-xl text-[#173044]">{money(total)}</strong></div></div>
      <div className="mt-5 grid gap-5 md:grid-cols-3"><label className="block"><span className="text-xs font-semibold text-[#294052]">Forma de pagamento</span><select value={values.paymentMethod} onChange={(event) => update("paymentMethod", event.target.value)} className="mt-2 h-11 w-full rounded-md border border-[#d7e0e7] bg-white px-3 text-sm"><option>PIX</option><option>Dinheiro</option><option>Cartão</option><option>Transferência</option><option>Outro</option></select></label><label className="block"><span className="text-xs font-semibold text-[#294052]">Situação do pagamento</span><select value={values.paymentStatus} onChange={(event) => update("paymentStatus", event.target.value)} className="mt-2 h-11 w-full rounded-md border border-[#d7e0e7] bg-white px-3 text-sm">{Object.entries(paymentLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label><Field label="Garantia" value={values.warrantyTerms} onChange={(value) => update("warrantyTerms", value)} /></div>
      <div className="mt-6 rounded-md border border-dashed border-[#b9cad8] bg-[#fbfdff] p-4"><label className="flex cursor-pointer items-center gap-3 text-sm font-semibold text-[#294052]"><ImagePlus className="size-5 text-[#1769b0]" /> Anexar fotos, laudos ou comprovantes<input type="file" multiple accept="image/*,.pdf,application/pdf" className="sr-only" onChange={(event) => setFiles(Array.from(event.target.files || []))} /></label>{files.length ? <p className="mt-3 text-xs text-[#60738a]">{files.map((file) => file.name).join(" · ")}</p> : <p className="mt-2 text-xs text-[#8290a1]">Até 8 MB por arquivo. Os anexos ficam vinculados à ordem.</p>}</div>
      <div className="mt-7 flex flex-col-reverse justify-between gap-3 border-t border-[#edf1f5] pt-6 sm:flex-row sm:items-center"><button type="button" onClick={() => setShowForm(false)} className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-[#cbd7e4] px-4 text-sm font-semibold text-[#294052]">Cancelar</button><div className="flex flex-col gap-2 sm:flex-row"><button type="submit" disabled={busy} className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-[#0d5e98] px-4 text-sm font-semibold text-[#0d5e98] disabled:opacity-60">{busy ? <LoaderCircle className="size-4 animate-spin" /> : <FileText className="size-4" />}Salvar orçamento</button><button type="button" disabled={busy} onClick={(event) => void saveOrder(event as unknown as React.FormEvent<HTMLFormElement>, true)} className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#12345b] px-4 text-sm font-semibold text-white disabled:opacity-60"><Wrench className="size-4" />Finalizar e lançar no Financeiro</button></div></div>
    </form> : null}
    <section className="mt-7 rounded-lg border border-[#dfe6ee] bg-white"><div className="flex flex-col justify-between gap-3 border-b border-[#edf1f5] p-5 sm:flex-row sm:items-center"><div><h2 className="font-semibold text-[#173044]">Ordens recentes</h2><p className="mt-1 text-xs text-[#708198]">Cada ordem mantém cliente, equipamento, peças, anexos e financeiro separados.</p></div><label className="flex h-10 items-center gap-2 rounded-md border border-[#d7e0e7] px-3 text-sm text-[#708198]"><Search className="size-4" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar OS ou cliente" className="w-48 outline-none" /></label></div>{visibleOrders.length === 0 ? <div className="p-5"><p className="rounded-md bg-[#f8fafc] px-4 py-10 text-center text-sm text-[#708198]">Nenhuma ordem encontrada.</p></div> : <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-[#f8fafc] text-xs text-[#77879a]"><tr><th className="px-5 py-3">Ordem</th><th className="px-5 py-3">Cliente / equipamento</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Total</th><th className="px-5 py-3">Pagamento</th><th className="px-5 py-3">Ações</th></tr></thead><tbody className="divide-y divide-[#edf1f5]">{visibleOrders.map((order) => <tr key={order.id}><td className="px-5 py-4 font-semibold text-[#203752]">{order.number}<span className="mt-1 block text-xs font-normal text-[#8593a5]">{order.createdAt ? new Date(order.createdAt).toLocaleDateString("pt-BR") : ""}</span></td><td className="px-5 py-4"><span className="font-medium">{order.companyName}</span><span className="mt-1 block text-xs text-[#708198]">{[order.equipmentType, order.equipmentBrand, order.equipmentModel].filter(Boolean).join(" · ") || "Equipamento não informado"}</span></td><td className="px-5 py-4"><span className="rounded-full bg-[#eef5fd] px-2.5 py-1 text-xs font-semibold text-[#1769b0]">{statusLabels[order.status] || order.status}</span></td><td className="px-5 py-4 font-semibold">{money(order.totalAmount)}</td><td className="px-5 py-4 text-xs text-[#60738a]">{paymentLabels[order.paymentStatus] || order.paymentStatus}{order.financeChargeId ? <span className="mt-1 block text-[#267d5b]">No Financeiro</span> : null}</td><td className="px-5 py-4"><div className="flex flex-wrap gap-2"><Link href={`/central-admin/ordens-servico/${order.id}/imprimir`} target="_blank" className="inline-flex items-center gap-1.5 rounded-md border border-[#cbd7e4] px-2.5 py-1.5 text-xs font-semibold text-[#294052]"><FileText className="size-3.5" /> PDF / imprimir</Link>{order.status !== "concluida" && order.status !== "cancelada" ? <button type="button" onClick={() => void closeOrder(order)} className="inline-flex items-center gap-1.5 rounded-md border border-[#b8dccb] px-2.5 py-1.5 text-xs font-semibold text-[#267d5b]">Concluir</button> : null}</div></td></tr>)}</tbody></table></div>}</section>
  </div>;
}
