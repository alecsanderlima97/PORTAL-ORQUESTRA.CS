import { FieldValue } from "firebase-admin/firestore";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { isIP } from "node:net";
import { getFirebaseAdminDb } from "@/lib/firebase-admin";
import { getCurrentSession } from "@/lib/session";

const platformRoles = new Set(["platform_owner", "orquestra_admin"]);

function isBlockedHost(hostname: string) {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  if (host === "localhost" || host.endsWith(".local") || host === "0.0.0.0" || host === "::1") return true;

  if (isIP(host) === 4) {
    const parts = host.split(".").map(Number);
    return parts[0] === 10 || parts[0] === 127 || (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) || (parts[0] === 192 && parts[1] === 168) || (parts[0] === 169 && parts[1] === 254);
  }

  return false;
}

export async function POST(request: Request, { params }: { params: Promise<{ serviceId: string }> }) {
  const session = await getCurrentSession();
  if (!session || !platformRoles.has(session.role)) {
    return NextResponse.json({ error: "Acesso administrativo necessário." }, { status: 403 });
  }

  try {
    const body = await request.json() as Record<string, unknown>;
    const csrfCookie = (await cookies()).get("orquestra_csrf")?.value;
    if (typeof body.csrfToken !== "string" || !csrfCookie || body.csrfToken !== csrfCookie) {
      return NextResponse.json({ error: "Sessão administrativa inválida." }, { status: 400 });
    }

    const { serviceId } = await params;
    const db = getFirebaseAdminDb();
    const serviceRef = db.collection("managedServices").doc(serviceId);
    const serviceSnapshot = await serviceRef.get();
    if (!serviceSnapshot.exists) return NextResponse.json({ error: "Serviço não encontrado." }, { status: 404 });

    const service = serviceSnapshot.data() ?? {};
    const serviceUrl = typeof service.url === "string" ? service.url : "";
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(serviceUrl);
      if (!["http:", "https:"].includes(parsedUrl.protocol) || isBlockedHost(parsedUrl.hostname)) throw new Error("blocked host");
    } catch {
      return NextResponse.json({ error: "O link deste serviço não pode ser verificado com segurança." }, { status: 400 });
    }

    const startedAt = Date.now();
    let status: "online" | "offline" | "erro" = "erro";
    let httpStatus: number | null = null;
    let errorMessage: string | null = null;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const response = await fetch(parsedUrl, { method: "GET", redirect: "follow", cache: "no-store", signal: controller.signal, headers: { "User-Agent": "OrquestraCS-Monitor/1.0" } });
      clearTimeout(timeout);
      httpStatus = response.status;
      status = response.status >= 200 && response.status < 500 ? "online" : "offline";
      if (response.body) await response.body.cancel();
    } catch (error) {
      errorMessage = error instanceof Error ? error.name : "request_failed";
      status = "offline";
    }

    const responseTimeMs = Date.now() - startedAt;
    const now = new Date().toISOString();
    const batch = db.batch();
    batch.update(serviceRef, {
      availabilityStatus: status,
      httpStatus,
      responseTimeMs,
      lastCheckedAt: now,
      sslStatus: parsedUrl.protocol === "https:" ? "seguro" : "nao_aplicavel",
      lastKnownStatus: status === "online" ? "Serviço respondeu ao monitoramento." : errorMessage ?? `Serviço respondeu HTTP ${httpStatus ?? "sem resposta"}.`,
      updatedAt: FieldValue.serverTimestamp(),
    });
    batch.set(db.collection("auditLogs").doc(), {
      tenantId: service.tenantId ?? null,
      actorUserId: session.uid,
      actorRole: session.role,
      action: "managedService.health.checked",
      targetType: "managedService",
      targetId: serviceId,
      createdAt: now,
      metadata: { status, httpStatus, responseTimeMs, sslStatus: parsedUrl.protocol === "https:" ? "seguro" : "nao_aplicavel" },
    });
    await batch.commit();

    return NextResponse.json({ ok: true, status, httpStatus, responseTimeMs });
  } catch {
    return NextResponse.json({ error: "Não foi possível verificar o serviço agora." }, { status: 500 });
  }
}
