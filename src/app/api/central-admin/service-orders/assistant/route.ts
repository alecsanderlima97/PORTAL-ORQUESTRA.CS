import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getCurrentSession } from "@/lib/session";

const platformRoles = new Set(["platform_owner", "orquestra_admin"]);

function text(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function extractText(data: { output_text?: string; output?: Array<{ content?: Array<{ text?: string }> }> }) {
  if (typeof data.output_text === "string" && data.output_text.trim()) return data.output_text.trim();
  return (data.output || []).flatMap((item) => item.content || []).map((content) => content.text || "").filter(Boolean).join("\n\n").trim();
}

export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (!session || !platformRoles.has(session.role)) return NextResponse.json({ error: "Acesso administrativo necessário." }, { status: 403 });
  const body = await request.json() as Record<string, unknown>;
  const csrfCookie = (await cookies()).get("orquestra_csrf")?.value;
  if (typeof body.csrfToken !== "string" || !csrfCookie || body.csrfToken !== csrfCookie) return NextResponse.json({ error: "Sessão administrativa inválida." }, { status: 400 });
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "OPENAI_API_KEY não configurada no Portal." }, { status: 503 });
  const mode = text(body.mode, 30) || "diagnostico";
  const prompt = [
    `Modo solicitado: ${mode}.`,
    `Equipamento: ${text(body.equipmentType, 80)} ${text(body.equipmentBrand, 100)} ${text(body.equipmentModel, 120)}.`,
    `Número de série: ${text(body.serialNumber, 120) || "não informado"}.`,
    `Problema relatado: ${text(body.reportedIssue, 3000) || "não informado"}.`,
    `Diagnóstico já observado: ${text(body.diagnosis, 4000) || "não informado"}.`,
    `Serviço descrito: ${text(body.serviceDescription, 4000) || "não informado"}.`,
    `Peças consideradas: ${text(body.parts, 3000) || "nenhuma"}.`,
  ].join("\n");
  const instructions = mode === "peca"
    ? "Ajude a identificar especificações e critérios para comprar uma peça compatível. Não invente compatibilidade, estoque ou preço. Informe o que precisa ser confirmado e sugira termos de pesquisa."
    : mode === "relatorio"
      ? "Escreva um relatório técnico profissional em português, com resumo, diagnóstico, serviço executado, peças, testes realizados, limitações e recomendações. Não invente etapas que não foram informadas."
      : "Ajude o técnico a raciocinar sobre o diagnóstico. Liste hipóteses, testes seguros e informações que ainda precisam ser confirmadas. Não dê certeza sobre defeitos sem evidência.";
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: process.env.OPENAI_MODEL || "gpt-5-nano", instructions: `${instructions} Responda em Markdown simples, objetivo e sem inventar valores. Contexto do técnico: ${prompt}`, input: prompt }),
  });
  const raw = await response.text();
  const data = raw ? JSON.parse(raw) : {};
  if (!response.ok) return NextResponse.json({ error: data.error?.message || "A IA não respondeu." }, { status: 502 });
  return NextResponse.json({ text: extractText(data) });
}
