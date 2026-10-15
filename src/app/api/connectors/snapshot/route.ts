import { createHash, timingSafeEqual } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { getFirebaseAdminDb } from "@/lib/firebase-admin";

const SOURCE_SYSTEM = "orquestra_hub";
const subscriptionStatuses = new Set(["trial", "ativo", "vencido", "bloqueado", "cancelado"]);

function text(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function optionalDate(value: unknown) {
  const raw = text(value, 40);
  if (!raw) return null;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function optionalContractDate(value: unknown) {
  const parsed = optionalDate(value);
  return parsed ? parsed.slice(0, 10) : null;
}

function money(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed * 100) / 100 : null;
}

function secretMatches(received: string, expected: string) {
  const receivedBuffer = Buffer.from(received);
  const expectedBuffer = Buffer.from(expected);
  return receivedBuffer.length === expectedBuffer.length && timingSafeEqual(receivedBuffer, expectedBuffer);
}

type SnapshotUser = {
  externalUserId: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  lastActivityAt: string | null;
  lastSeenAt: string | null;
};

function snapshotUsers(value: unknown): SnapshotUser[] | null {
  if (!Array.isArray(value) || value.length > 500) return null;
  const users: SnapshotUser[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") return null;
    const data = entry as Record<string, unknown>;
    const externalUserId = text(data.externalUserId, 160);
    const email = text(data.email, 180).toLowerCase();
    if (!externalUserId || (email && !/^\S+@\S+\.\S+$/.test(email))) return null;
    users.push({
      externalUserId,
      name: text(data.name, 160) || "Usuário sem nome",
      email,
      role: text(data.role, 80) || "Não informado",
      active: data.active !== false,
      lastActivityAt: optionalDate(data.lastActivityAt),
      lastSeenAt: optionalDate(data.lastSeenAt),
    });
  }
  return users;
}

export async function POST(request: Request) {
  const expectedSecret = process.env.ORQUESTRA_CONNECTOR_SHARED_SECRET || "";
  const receivedSecret = request.headers.get("x-orquestra-connector-secret") || "";
  if (!expectedSecret || !receivedSecret || !secretMatches(receivedSecret, expectedSecret)) {
    return NextResponse.json({ error: "Conector não autorizado." }, { status: 401 });
  }

  let eventRef: FirebaseFirestore.DocumentReference | null = null;
  try {
    const body = await request.json() as Record<string, unknown>;
    const sourceSystem = text(body.sourceSystem, 80);
    const snapshotId = text(body.snapshotId, 160);
    const generatedAt = optionalDate(body.generatedAt);
    if (sourceSystem !== SOURCE_SYSTEM || !snapshotId || !/^[a-zA-Z0-9._:-]+$/.test(snapshotId) || !generatedAt) {
      return NextResponse.json({ error: "Identificação do snapshot inválida." }, { status: 400 });
    }
    if (Math.abs(Date.now() - new Date(generatedAt).getTime()) > 15 * 60 * 1000) {
      return NextResponse.json({ error: "Snapshot fora da janela de sincronização." }, { status: 400 });
    }
    if (!Array.isArray(body.tenants) || body.tenants.length > 100) {
      return NextResponse.json({ error: "Lista de clientes inválida." }, { status: 400 });
    }

    const db = getFirebaseAdminDb();
    const eventId = createHash("sha256").update(`${sourceSystem}:${snapshotId}`).digest("hex");
    eventRef = db.collection("connectorSnapshots").doc(eventId);
    const eventSnapshot = await eventRef.get();
    if (eventSnapshot.exists && eventSnapshot.data()?.status === "completed") {
      return NextResponse.json({ ok: true, duplicate: true, ...(eventSnapshot.data()?.result ?? {}) });
    }
    await eventRef.set({ sourceSystem, snapshotId, generatedAt, status: "processing", receivedAt: FieldValue.serverTimestamp() }, { merge: true });

    const servicesSnapshot = await db.collection("managedServices").where("sourceSystem", "==", sourceSystem).limit(250).get();
    const servicesByExternalTenant = new Map<string, FirebaseFirestore.QueryDocumentSnapshot[]>();
    for (const service of servicesSnapshot.docs) {
      const externalTenantId = text(service.data().externalTenantId, 160);
      if (!externalTenantId) continue;
      const items = servicesByExternalTenant.get(externalTenantId) ?? [];
      items.push(service);
      servicesByExternalTenant.set(externalTenantId, items);
    }

    const writer = db.bulkWriter();
    writer.onWriteError((error) => error.failedAttempts < 3);
    const unmatched: string[] = [];
    const ambiguous: string[] = [];
    let matched = 0;
    let synchronizedUsers = 0;

    for (const entry of body.tenants) {
      if (!entry || typeof entry !== "object") throw new Error("invalid tenant");
      const tenant = entry as Record<string, unknown>;
      const externalTenantId = text(tenant.externalTenantId, 160);
      const companyName = text(tenant.companyName, 160);
      const plan = text(tenant.plan, 80) || "Sem plano";
      const subscriptionStatus = text(tenant.subscriptionStatus, 30) || "trial";
      const users = snapshotUsers(tenant.users);
      if (!externalTenantId || !companyName || !users || !subscriptionStatuses.has(subscriptionStatus)) throw new Error("invalid tenant");

      const matches = servicesByExternalTenant.get(externalTenantId) ?? [];
      if (matches.length === 0) {
        unmatched.push(`${companyName} (${externalTenantId})`);
        continue;
      }
      if (matches.length !== 1) {
        ambiguous.push(`${companyName} (${externalTenantId})`);
        continue;
      }

      const serviceDoc = matches[0];
      const service = serviceDoc.data();
      const tenantId = text(service.tenantId, 160);
      if (!tenantId) {
        unmatched.push(`${companyName} (${externalTenantId})`);
        continue;
      }

      const activeUsers = users.filter((user) => user.active);
      const owners = activeUsers.filter((user) => ["proprietário", "dono"].includes(user.role.toLowerCase())).length;
      const administrators = activeUsers.filter((user) => user.role.toLowerCase().includes("admin")).length;
      const staff = activeUsers.filter((user) => user.role.toLowerCase() === "financeiro").length;
      const lastActivityAt = optionalDate(tenant.lastActivityAt);
      const onlineUsers = activeUsers.filter((user) => user.lastSeenAt && Date.now() - new Date(user.lastSeenAt).getTime() <= 5 * 60 * 1000).length;
      const presenceTracking = users.some((user) => Boolean(user.lastSeenAt));
      const recentChangesLast30Days = Math.max(0, Math.round(Number(tenant.recentChangesLast30Days) || 0));
      const activeUsersLast30Days = Math.max(0, Math.round(Number(tenant.activeUsersLast30Days) || 0));
      const updates: Record<string, unknown> = {
        plan,
        subscriptionStatus,
        accessStatus: subscriptionStatus === "ativo" || subscriptionStatus === "trial" ? "ativo" : subscriptionStatus === "cancelado" || subscriptionStatus === "bloqueado" ? "bloqueado" : "revisao_manual",
        connectorStatus: "ativo",
        externalTenantName: companyName,
        lastSyncAt: FieldValue.serverTimestamp(),
        lastKnownStatus: `Cadastro e usuários sincronizados pelo ${SOURCE_SYSTEM}.`,
        usageSummary: {
          totalUsers: activeUsers.length,
          owners,
          administrators,
          staff,
          endUsers: Math.max(0, activeUsers.length - owners - administrators - staff),
          onlineUsers,
          pendingInvitations: Math.max(0, Math.round(Number(tenant.pendingInvitations) || 0)),
          recentChangesLast30Days,
          activeUsersLast30Days,
          lastActivityAt,
          presenceTracking,
          updatedAt: FieldValue.serverTimestamp(),
        },
        updatedAt: FieldValue.serverTimestamp(),
      };
      const monthlyFee = money(tenant.monthlyFee);
      if (monthlyFee !== null) updates.monthlyFee = monthlyFee;
      const startDate = optionalContractDate(tenant.startDate);
      if (startDate) updates.startDate = startDate;
      const renewalDate = optionalContractDate(tenant.renewalDate);
      if (renewalDate) updates.renewalDate = renewalDate;
      writer.update(serviceDoc.ref, updates);

      const existingUsers = await db.collection("managedServiceUsers").where("serviceId", "==", serviceDoc.id).limit(500).get();
      const currentUserIds = new Set(users.map((user) => user.externalUserId));
      for (const existingUser of existingUsers.docs) {
        if (!currentUserIds.has(text(existingUser.data().externalUserId, 160))) {
          writer.update(existingUser.ref, { active: false, updatedAt: FieldValue.serverTimestamp() });
        }
      }
      for (const user of users) {
        const userDocumentId = createHash("sha256").update(`${sourceSystem}:${externalTenantId}:${user.externalUserId}`).digest("hex");
        writer.set(db.collection("managedServiceUsers").doc(userDocumentId), {
          serviceId: serviceDoc.id,
          tenantId,
          sourceSystem,
          externalTenantId,
          externalUserId: user.externalUserId,
          name: user.name,
          email: user.email,
          role: user.role,
          active: user.active,
          lastActivityAt: user.lastActivityAt,
          lastSeenAt: user.lastSeenAt,
          deviceType: null,
          operatingSystem: null,
          browser: null,
          updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });
      }
      writer.create(db.collection("auditLogs").doc(), {
        tenantId,
        actorUserId: `connector:${sourceSystem}`,
        actorRole: "system_connector",
        action: "connector.snapshot_synced",
        targetType: "managedService",
        targetId: serviceDoc.id,
        createdAt: FieldValue.serverTimestamp(),
        metadata: { sourceSystem, externalTenantId, snapshotId, users: users.length },
      });
      matched += 1;
      synchronizedUsers += users.length;
    }

    await writer.close();
    const result = { matched, synchronizedUsers, unmatched, ambiguous };
    await eventRef.set({ status: "completed", completedAt: FieldValue.serverTimestamp(), result }, { merge: true });
    return NextResponse.json({ ok: true, ...result });
  } catch {
    if (eventRef) await eventRef.set({ status: "failed", failedAt: FieldValue.serverTimestamp() }, { merge: true }).catch(() => undefined);
    return NextResponse.json({ error: "Não foi possível processar o resumo do sistema." }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({ error: "Método não permitido." }, { status: 405, headers: { Allow: "POST" } });
}
