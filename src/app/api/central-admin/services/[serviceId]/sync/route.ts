import { FieldValue } from "firebase-admin/firestore";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getFirebaseAdminDb } from "@/lib/firebase-admin";
import { getCurrentSession } from "@/lib/session";

const platformRoles = new Set(["platform_owner", "orquestra_admin"]);

type Deployment = {
  id?: string;
  url?: string;
  createdAt?: number;
  readyState?: string;
  name?: string;
  meta?: Record<string, unknown>;
  gitSource?: { sha?: string };
};

function githubRepository(value: unknown) {
  if (typeof value !== "string" || !value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.hostname !== "github.com") return null;
    const [owner, repository] = url.pathname.split("/").filter(Boolean);
    if (!owner || !repository) return null;
    return { owner, repository: repository.replace(/\.git$/, "") };
  } catch {
    return null;
  }
}

async function fetchJson(url: string, init: RequestInit) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(url, { ...init, cache: "no-store", signal: controller.signal });
    const body = await response.json().catch(() => null) as Record<string, unknown> | null;
    return { response, body };
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ serviceId: string }> }) {
  const session = await getCurrentSession();
  if (!session || !platformRoles.has(session.role)) return NextResponse.json({ error: "Acesso administrativo necessário." }, { status: 403 });

  try {
    const body = await request.json() as Record<string, unknown>;
    const csrfCookie = (await cookies()).get("orquestra_csrf")?.value;
    if (typeof body.csrfToken !== "string" || !csrfCookie || body.csrfToken !== csrfCookie) return NextResponse.json({ error: "Sessão administrativa inválida." }, { status: 400 });

    const { serviceId } = await params;
    const db = getFirebaseAdminDb();
    const serviceRef = db.collection("managedServices").doc(serviceId);
    const serviceSnapshot = await serviceRef.get();
    if (!serviceSnapshot.exists) return NextResponse.json({ error: "Serviço não encontrado." }, { status: 404 });

    const service = serviceSnapshot.data() ?? {};
    const projectName = typeof service.vercelProjectName === "string" ? service.vercelProjectName : "";
    const vercelToken = process.env.VERCEL_API_TOKEN;
    if (!projectName) return NextResponse.json({ error: "Cadastre primeiro o projeto Vercel deste serviço." }, { status: 400 });
    if (!vercelToken) return NextResponse.json({ error: "A integração de leitura da Vercel ainda não foi configurada no ambiente." }, { status: 503 });

    const vercelHeaders = { Authorization: `Bearer ${vercelToken}` };
    const projectResult = await fetchJson(`https://api.vercel.com/v9/projects/${encodeURIComponent(projectName)}`, { headers: vercelHeaders });
    if (!projectResult.response.ok) return NextResponse.json({ error: "Não foi possível localizar este projeto na Vercel." }, { status: 502 });

    const deploymentsResult = await fetchJson(`https://api.vercel.com/v6/deployments?projectIdOrName=${encodeURIComponent(projectName)}&limit=1`, { headers: vercelHeaders });
    if (!deploymentsResult.response.ok) return NextResponse.json({ error: "Não foi possível consultar os deployments da Vercel." }, { status: 502 });
    const deployments = Array.isArray(deploymentsResult.body?.deployments) ? deploymentsResult.body.deployments as Deployment[] : [];
    const deployment = deployments[0];
    if (!deployment) return NextResponse.json({ error: "A Vercel ainda não possui um deployment para este projeto." }, { status: 404 });

    const repository = githubRepository(service.repositoryUrl);
    let commitSha = deployment.gitSource?.sha ?? (typeof deployment.meta?.githubCommitSha === "string" ? deployment.meta.githubCommitSha : null);
    let commitMessage = typeof deployment.meta?.githubCommitMessage === "string" ? deployment.meta.githubCommitMessage : null;
    let commitDate = deployment.createdAt ? new Date(deployment.createdAt).toISOString() : new Date().toISOString();

    if (repository) {
      const githubHeaders: HeadersInit = { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" };
      if (process.env.GITHUB_TOKEN) githubHeaders.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
      const commitResult = await fetchJson(`https://api.github.com/repos/${encodeURIComponent(repository.owner)}/${encodeURIComponent(repository.repository)}/commits?per_page=1`, { headers: githubHeaders });
      const latestCommit = Array.isArray(commitResult.body) ? commitResult.body[0] as Record<string, unknown> | undefined : undefined;
      const commit = latestCommit?.commit && typeof latestCommit.commit === "object" ? latestCommit.commit as Record<string, unknown> : null;
      const author = commit?.author && typeof commit.author === "object" ? commit.author as Record<string, unknown> : null;
      if (latestCommit && typeof latestCommit.sha === "string") commitSha = latestCommit.sha;
      if (commit && typeof commit.message === "string") commitMessage = commit.message.split("\n")[0];
      if (author && typeof author.date === "string") commitDate = author.date;
    }

    const version = commitSha ? commitSha.slice(0, 12) : deployment.id ?? "sem versão";
    const lastUpdateSummary = commitMessage || (deployment.name ? `Deployment ${deployment.name}` : `Deployment ${deployment.readyState ?? "registrado"}`);
    const now = new Date().toISOString();
    const batch = db.batch();
    batch.update(serviceRef, {
      currentVersion: version,
      lastUpdatedAt: commitDate,
      lastUpdateSummary,
      lastKnownStatus: deployment.url ? `Último deployment: https://${deployment.url}` : "Versão sincronizada pela Vercel.",
      updatedAt: FieldValue.serverTimestamp(),
    });
    batch.set(db.collection("auditLogs").doc(), {
      tenantId: service.tenantId ?? null,
      actorUserId: session.uid,
      actorRole: session.role,
      action: "managedService.release.synced",
      targetType: "managedService",
      targetId: serviceId,
      createdAt: now,
      metadata: { source: repository ? "vercel_github" : "vercel", version },
    });
    await batch.commit();

    return NextResponse.json({ ok: true, version, lastUpdatedAt: commitDate, lastUpdateSummary });
  } catch {
    return NextResponse.json({ error: "Não foi possível sincronizar a versão agora." }, { status: 500 });
  }
}
