import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/session";

const platformRoles = new Set(["platform_owner", "orquestra_admin"]);

export async function GET(_request: Request, { params }: { params: Promise<{ cep: string }> }) {
  const session = await getCurrentSession();
  if (!session || !platformRoles.has(session.role)) {
    return NextResponse.json({ error: "Acesso administrativo necessário." }, { status: 403 });
  }

  const { cep } = await params;
  const postalCode = cep.replace(/\D/g, "");
  if (postalCode.length !== 8) {
    return NextResponse.json({ error: "Informe um CEP válido com 8 números." }, { status: 400 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);
  try {
    const response = await fetch(`https://viacep.com.br/ws/${postalCode}/json/`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!response.ok) return NextResponse.json({ error: "Não foi possível consultar o CEP agora." }, { status: 502 });

    const data = await response.json() as Record<string, unknown>;
    if (data.erro === true) return NextResponse.json({ found: false, error: "CEP não encontrado." });

    return NextResponse.json({
      found: true,
      postalCode: typeof data.cep === "string" ? data.cep : postalCode,
      street: typeof data.logradouro === "string" ? data.logradouro : "",
      neighborhood: typeof data.bairro === "string" ? data.bairro : "",
      city: typeof data.localidade === "string" ? data.localidade : "",
      state: typeof data.uf === "string" ? data.uf : "",
    });
  } catch {
    return NextResponse.json({ error: "A busca automática de CEP está temporariamente indisponível." }, { status: 502 });
  } finally {
    clearTimeout(timeout);
  }
}
