import { createHash, timingSafeEqual } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { getFirebaseAdminDb } from "@/lib/firebase-admin";

const sourceCatalogs: Record<string, { name: string; url: string; type: string }> = {
  orquestra_hub: { name: "Orquestra Hub", url: "https://hub.orquestracs.com", type: "sistema_web" },
  orquestra_studio: { name: "Orquestra Studio", url: "https://studio.orquestracs.com", type: "sistema_web" },
  orquestra_auto_detail: { name: "Orquestra Auto Detail", url: "https://autodetail.orquestracs.com", type: "sistema_web" },
  orquestra_fit: { name: "Orquestra Fit", url: "https://fit.orquestracs.com", type: "sistema_web" },
  mad360: { name: "Orquestra Mad360", url: "https://orquestracs.com", type: "sistema_web" },
  orquestracs_face_id: { name: "Orquestra Face ID", url: "https://faceid.orquestracs.com", type: "sistema_web" },
  orquestra_blend: { name: "Orquestra Blend", url: "https://blend.orquestracs.com", type: "sistema_web" },
  orquestra_moda: { name: "Orquestra Moda", url: "https://moda.orquestracs.com", type: "sistema_web" },
};
const supportedContractVersions = new Set(["v1"]);
const maximumSnapshotBytes = 1_000_000;
const sourceAliases: Record<string, string> = {
  orquestra_mad360: "mad360",
  orquestra_face_id: "orquestracs_face_id",
};
const subscriptionStatuses = new Set(["trial", "ativo", "pausado", "vencido", "bloqueado", "cancelado"]);
const billingMethods = new Set(["PIX", "BOLETO", "CREDIT_CARD", "UNDEFINED"]);
const billingMethodAliases: Record<string, string> = {
  pix: "PIX",
  boleto: "BOLETO",
  cartao: "CREDIT_CARD",
  cartao_de_credito: "CREDIT_CARD",
  credit_card: "CREDIT_CARD",
  transferencia: "TRANSFERENCIA",
  transferencia_bancaria: "TRANSFERENCIA",
  dinheiro: "DINHEIRO",
  outro: "OUTRO",
  undefined: "UNDEFINED",
};
const platformAdminEmails = new Set(["orquestracs@gmail.com"]);

function text(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function isPlatformAdminEmail(value: unknown) {
  return typeof value === "string" && platformAdminEmails.has(value.trim().toLowerCase());
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

function snapshotMoney(value: unknown) {
  if (typeof value === "number") return money(value);
  const raw = text(value, 80).replace(/[^\d,.-]/g, "");
  if (!raw) return null;
  const comma = raw.lastIndexOf(",");
  const dot = raw.lastIndexOf(".");
  const normalized = comma > dot
    ? raw.replace(/\./g, "").replace(",", ".")
    : raw.replace(/,/g, "");
  return money(normalized);
}

function snapshotCount(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : null;
}

function hasOwn(value: Record<string, unknown>, key: string) {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function recordValue(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function fieldValue(primary: Record<string, unknown>, fallback: Record<string, unknown>, key: string) {
  if (hasOwn(primary, key)) return primary[key];
  if (hasOwn(fallback, key)) return fallback[key];
  return undefined;
}

function optionalTextField(value: unknown, maxLength: number) {
  if (value === undefined) return undefined;
  return text(value, maxLength) || null;
}

function optionalEmailField(value: unknown) {
  const parsed = optionalTextField(value, 180);
  if (parsed === undefined || parsed === null) return parsed;
  return /^\S+@\S+\.\S+$/.test(parsed) ? parsed.toLowerCase() : "invalid";
}

function optionalMoneyField(value: unknown) {
  if (value === undefined) return { present: false, value: null, valid: true };
  if (value === null || value === "") return { present: true, value: null, valid: true };
  const parsed = money(value);
  return { present: true, value: parsed, valid: parsed !== null };
}

function optionalDayField(value: unknown) {
  if (value === undefined) return { present: false, value: null, valid: true };
  if (value === null || value === "") return { present: true, value: null, valid: true };
  const parsed = Number(value);
  const day = Number.isInteger(parsed) ? parsed : null;
  return { present: true, value: day, valid: day !== null && day >= 1 && day <= 31 };
}

function optionalGraceDaysField(value: unknown) {
  if (value === undefined) return { present: false, value: null, valid: true };
  if (value === null || value === "") return { present: true, value: 3, valid: true };
  const parsed = Number(value);
  const days = Number.isInteger(parsed) ? parsed : null;
  return { present: true, value: days, valid: days !== null && days >= 0 && days <= 30 };
}

function optionalBillingMethod(value: unknown) {
  const parsed = optionalTextField(value, 30);
  if (parsed === undefined || parsed === null) return parsed;
  const normalized = parsed.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, "_");
  const canonical = billingMethodAliases[normalized] ?? parsed.toUpperCase();
  return billingMethods.has(canonical) || ["TRANSFERENCIA", "DINHEIRO", "OUTRO"].includes(canonical) ? canonical : "invalid";
}

function optionalContractDateField(value: unknown) {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const parsed = optionalContractDate(value);
  return parsed || "invalid";
}

function secretMatches(received: string, expected: string) {
  const receivedBuffer = Buffer.from(received);
  const expectedBuffer = Buffer.from(expected);
  return receivedBuffer.length === expectedBuffer.length && timingSafeEqual(receivedBuffer, expectedBuffer);
}

function identityName(value: unknown) {
  return text(value, 160)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function identityDocument(value: unknown) {
  return text(value, 40).replace(/\D/g, "");
}

function identityEmail(value: unknown) {
  const email = text(value, 180).toLowerCase();
  return /^\S+@\S+\.\S+$/.test(email) ? email : "";
}

function externalTenantKeys(sourceSystem: string, externalTenantId: string) {
  const prefix = `${sourceSystem}_`;
  const keys = [externalTenantId];
  if (externalTenantId.startsWith(prefix)) keys.push(externalTenantId.slice(prefix.length));
  else keys.push(`${prefix}${externalTenantId}`);
  return [...new Set(keys.filter(Boolean))];
}

function companyIdentity(customer: Record<string, unknown>) {
  const documents = new Set<string>();
  for (const value of [customer.document, customer.cnpj, customer.cpf]) {
    const document = identityDocument(value);
    if (document) documents.add(document);
  }
  const emails = new Set<string>();
  for (const value of [customer.contactEmail, customer.email, customer.ownerGoogleEmail, customer.googleEmail]) {
    const email = identityEmail(value);
    if (email) emails.add(email);
  }
  return { documents, emails };
}

function companyMatchesIdentity(data: FirebaseFirestore.DocumentData, identity: ReturnType<typeof companyIdentity>) {
  const documents = new Set<string>();
  for (const value of [data.document, data.cnpj, data.cpf]) {
    const document = identityDocument(value);
    if (document) documents.add(document);
  }
  const emails = new Set<string>();
  for (const value of [data.contactEmail, data.ownerGoogleEmail]) {
    const email = identityEmail(value);
    if (email) emails.add(email);
  }
  return [...identity.documents].some((document) => documents.has(document))
    || [...identity.emails].some((email) => emails.has(email));
}

type CompanyResolution = {
  ref: FirebaseFirestore.DocumentReference;
  ambiguous: boolean;
  created: boolean;
};

async function resolveCompanyForTenant(
  db: FirebaseFirestore.Firestore,
  writer: FirebaseFirestore.BulkWriter,
  sourceSystem: string,
  externalTenantId: string,
  companyName: string,
  customer: Record<string, unknown>,
) : Promise<CompanyResolution> {
  const externalMatches = await db.collection("companies")
    .where("externalTenantId", "==", externalTenantId)
    .limit(50)
    .get();
  const sameExternalName = externalMatches.docs.filter((doc) => {
    const data = doc.data();
    return identityName(data.tradeName ?? data.legalName ?? data.name) === identityName(companyName);
  });
  if (sameExternalName.length === 1) return { ref: sameExternalName[0].ref, ambiguous: false, created: false };

  const identity = companyIdentity(customer);
  const allCompanies = await db.collection("companies").limit(500).get();
  if (identity.documents.size || identity.emails.size) {
    const identityMatches = allCompanies.docs.filter((doc) => companyMatchesIdentity(doc.data(), identity));
    if (identityMatches.length === 1) return { ref: identityMatches[0].ref, ambiguous: false, created: false };
    if (identityMatches.length > 1) return { ref: identityMatches[0].ref, ambiguous: true, created: false };
  }

  const sameSource = externalMatches.docs.filter((doc) => text(doc.data().sourceSystem, 80) === sourceSystem);
  if (sameSource.length === 1) return { ref: sameSource[0].ref, ambiguous: false, created: false };
  if (sameSource.length > 1) return { ref: sameSource[0].ref, ambiguous: true, created: false };

  if (sameExternalName.length > 1 || externalMatches.docs.length > 1) {
    return { ref: externalMatches.docs[0]?.ref ?? db.collection("companies").doc(), ambiguous: true, created: false };
  }

  const sourceCompanies = await db.collection("companies")
    .where("sourceSystem", "==", sourceSystem)
    .limit(500)
    .get();
  const sameSourceName = sourceCompanies.docs.filter((doc) => {
    const data = doc.data();
    return identityName(data.tradeName ?? data.legalName ?? data.name) === identityName(companyName);
  });
  if (sameSourceName.length === 1) return { ref: sameSourceName[0].ref, ambiguous: false, created: false };
  if (sameSourceName.length > 1) return { ref: sameSourceName[0].ref, ambiguous: true, created: false };

  const sameGlobalName = allCompanies.docs.filter((doc) => {
    const data = doc.data();
    return identityName(data.tradeName ?? data.legalName ?? data.name) === identityName(companyName);
  });
  if (sameGlobalName.length === 1) return { ref: sameGlobalName[0].ref, ambiguous: false, created: false };
  if (sameGlobalName.length > 1) return { ref: sameGlobalName[0].ref, ambiguous: true, created: false };

  const companyId = createHash("sha256")
    .update(`company:${sourceSystem}:${externalTenantId}`)
    .digest("hex");
  const ref = db.collection("companies").doc(companyId);
  writer.set(ref, {
    legalName: companyName,
    tradeName: companyName,
    sourceSystem,
    externalTenantId,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  return { ref, ambiguous: false, created: true };
}

async function archiveCompanyIfUnlinked(
  db: FirebaseFirestore.Firestore,
  writer: FirebaseFirestore.BulkWriter,
  tenantId: string,
  replacementTenantId: string,
  ignoredServiceId: string,
) {
  if (!tenantId || tenantId === replacementTenantId) return;
  const linkedServices = await db.collection("managedServices")
    .where("tenantId", "==", tenantId)
    .limit(50)
    .get();
  const hasOtherActiveService = linkedServices.docs.some((doc) =>
    doc.id !== ignoredServiceId && doc.data().isArchived !== true,
  );
  if (!hasOtherActiveService) {
    writer.set(db.collection("companies").doc(tenantId), {
      isArchived: true,
      supersededBy: replacementTenantId,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  }
}

type SnapshotUser = {
  externalUserId: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  lastActivityAt: string | null;
  lastSeenAt: string | null;
  lastLoginAt: string | null;
  deviceType: string | null;
  operatingSystem: string | null;
  browser: string | null;
};

function snapshotUsers(value: unknown): SnapshotUser[] | null {
  if (!Array.isArray(value) || value.length > 500) return null;
  const users: SnapshotUser[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") return null;
    const data = entry as Record<string, unknown>;
    const device = recordValue(data.device);
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
      lastLoginAt: optionalDate(data.lastLoginAt),
      deviceType: text(data.deviceType ?? device.type, 80) || null,
      operatingSystem: text(data.operatingSystem ?? device.operatingSystem, 100) || null,
      browser: text(data.browser ?? device.browser, 100) || null,
    });
  }
  return users;
}

function normalizeSnapshotTenants(body: Record<string, unknown>) {
  if (Array.isArray(body.tenants)) return body.tenants;
  if (!Array.isArray(body.clients) || body.clients.length > 100) return null;

  return body.clients.map((entry) => {
    const clientEntry = recordValue(entry);
    const client = recordValue(clientEntry.client);
    const responsible = recordValue(clientEntry.responsible);
    const subscription = recordValue(clientEntry.subscription);
    const document = recordValue(client.document);
    const address = recordValue(client.address);
    const paidPeriod = recordValue(subscription.paidPeriod);
    const companyName = text(client.tradeName ?? client.name ?? clientEntry.companyName, 160) || "Empresa";
    const contactEmail = text(responsible.email ?? client.email, 180).toLowerCase();
    const monthlyFee = snapshotMoney(subscription.monthlyFee);
    const latestPaymentMethod = text(paidPeriod.method, 30);
    const paymentMethod = text(subscription.paymentMethod ?? subscription.formOfPayment, 30) || latestPaymentMethod || null;
    const billingStatus = text(subscription.billingStatus, 40) || (paidPeriod.paidAt ? "paid" : null);
    const onlineUserCount = snapshotCount(clientEntry.onlineUserCount);
    const users = Array.isArray(clientEntry.users)
      ? clientEntry.users.map((userEntry) => {
        const user = recordValue(userEntry);
        return {
          externalUserId: user.id ?? user.externalUserId,
          name: user.name,
          email: user.email,
          role: user.role,
          active: true,
          lastActivityAt: user.lastActivityAt,
          lastSeenAt: user.lastSeenAt ?? user.lastActivityAt,
          lastLoginAt: user.lastLoginAt ?? user.lastAccessAt,
          deviceType: user.device ?? user.deviceType,
          operatingSystem: user.operatingSystem ?? user.os,
          browser: user.browser,
        };
      })
      : [];
    const responsibleUser = users.find((user) => /propriet|dono|owner/i.test(String(user.role || ""))) || users[0];
    const ownerGoogleEmail = text(responsibleUser?.email, 180).toLowerCase();

    return {
      externalTenantId: clientEntry.externalCustomerId ?? clientEntry.id,
      companyName,
      plan: subscription.planName ?? subscription.planId,
      monthlyFee,
      billingDay: subscription.billingDay,
      startDate: subscription.startDate,
      renewalDate: subscription.renewalDate,
      nextDueDate: subscription.nextDueDate ?? subscription.nextBillingDate ?? subscription.renewalDate,
      paymentMethod,
      billingStatus,
      subscriptionStatus: subscription.subscriptionStatus ?? subscription.status,
      lastActivityAt: clientEntry.lastActivityAt,
      updatedAt: clientEntry.updatedAt,
      onlineUserCount,
      presenceTracking: onlineUserCount !== null || users.some((user) => Boolean(user.lastSeenAt)),
      dataVersion: clientEntry.dataVersion,
      users,
      customer: {
        companyName,
        legalName: client.legalName,
        tradeName: client.tradeName,
        googleBusinessName: client.googleBusinessName,
        googleAddress: address.googleAddress,
        instagramUrl: client.instagramUrl,
        responsibleName: responsible.name,
        ownerGoogleEmail,
        contactEmail,
        contactPhone: responsible.phone ?? client.phone,
        document: document.number,
        documentType: document.type,
        street: address.street,
        number: address.number,
        complement: address.complement,
        neighborhood: address.neighborhood,
        city: address.city,
        state: address.state,
        cep: address.cep,
        address: [address.street, address.number, address.neighborhood, address.city, address.state].filter(Boolean).join(", "),
        googleBusinessUrl: address.mapUrl,
      },
      contract: {
        plan: subscription.planName ?? subscription.planId,
        monthlyFee,
        billingDay: subscription.billingDay,
        graceDays: subscription.graceDays,
        startDate: subscription.startDate,
        renewalDate: subscription.renewalDate,
        nextDueDate: subscription.nextDueDate ?? subscription.nextBillingDate ?? subscription.renewalDate,
        paymentMethod,
        billingStatus,
        subscriptionStatus: subscription.subscriptionStatus ?? subscription.status,
        paidThroughDate: paidPeriod.nextBillingDate,
        notes: subscription.notes ?? client.notes ?? client.internalNotes,
        dataVersion: clientEntry.dataVersion,
        updatedAt: clientEntry.updatedAt,
      },
    };
  });
}

export async function POST(request: Request) {
  const expectedSecret = process.env.ORQUESTRA_CONNECTOR_SHARED_SECRET || "";
  const bearerSecret = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  const receivedSecret = request.headers.get("x-orquestra-connector-secret") || bearerSecret;
  if (!expectedSecret || !receivedSecret || !secretMatches(receivedSecret, expectedSecret)) {
    return NextResponse.json({ error: "Conector não autorizado." }, { status: 401 });
  }

  let eventRef: FirebaseFirestore.DocumentReference | null = null;
  try {
    const declaredLength = Number(request.headers.get("content-length") || 0);
    if (Number.isFinite(declaredLength) && declaredLength > maximumSnapshotBytes) {
      return NextResponse.json({ error: "Resumo do sistema excede o tamanho permitido." }, { status: 413 });
    }

    const rawBody = await request.text();
    if (Buffer.byteLength(rawBody, "utf8") > maximumSnapshotBytes) {
      return NextResponse.json({ error: "Resumo do sistema excede o tamanho permitido." }, { status: 413 });
    }
    const body = JSON.parse(rawBody) as Record<string, unknown>;
    const receivedSourceSystem = text(body.sourceSystem, 80);
    const sourceSystem = sourceAliases[receivedSourceSystem] || receivedSourceSystem;
    const headerSourceRaw = text(request.headers.get("x-orquestra-source-system"), 80);
    const headerSourceSystem = sourceAliases[headerSourceRaw] || headerSourceRaw;
    const contractVersion = text(body.contractVersion, 20);
    const headerContractVersion = text(request.headers.get("x-orquestra-contract-version"), 20);
    const dataVersion = Number(body.dataVersion);
    const sourceCatalog = sourceCatalogs[sourceSystem];
    const generatedAt = optionalDate(body.generatedAt);
    const receivedAt = new Date().toISOString();
    const snapshotId = text(body.snapshotId, 160)
      || (sourceCatalog && generatedAt && (Array.isArray(body.clients) || Array.isArray(body.tenants))
        ? createHash("sha256").update(`${sourceSystem}:${generatedAt}`).digest("hex")
        : "");
    if (!sourceCatalog || !snapshotId || !/^[a-zA-Z0-9._:-]+$/.test(snapshotId) || !generatedAt) {
      return NextResponse.json({ error: "Identificação do snapshot inválida." }, { status: 400 });
    }
    if (
      !supportedContractVersions.has(contractVersion)
      || headerContractVersion !== contractVersion
      || headerSourceSystem !== sourceSystem
      || !Number.isInteger(dataVersion)
      || dataVersion < 1
    ) {
      return NextResponse.json({ error: "Contrato do conector inválido ou incompatível." }, { status: 400 });
    }
    if (Math.abs(Date.now() - new Date(generatedAt).getTime()) > 15 * 60 * 1000) {
      return NextResponse.json({ error: "Snapshot fora da janela de sincronização." }, { status: 400 });
    }
    const tenants = normalizeSnapshotTenants(body);
    if (!tenants) {
      return NextResponse.json({ error: "Lista de clientes inválida." }, { status: 400 });
    }

    const db = getFirebaseAdminDb();
    const eventId = createHash("sha256").update(`${sourceSystem}:${snapshotId}`).digest("hex");
    eventRef = db.collection("connectorSnapshots").doc(eventId);
    const eventSnapshot = await eventRef.get();
    if (eventSnapshot.exists && eventSnapshot.data()?.status === "completed") {
      return NextResponse.json({ ok: true, duplicate: true, ...(eventSnapshot.data()?.result ?? {}) });
    }
    await eventRef.set({
      sourceSystem,
      snapshotId,
      contractVersion,
      dataVersion,
      generatedAt,
      status: "processing",
      receivedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    const servicesSnapshot = await db.collection("managedServices").where("sourceSystem", "==", sourceSystem).limit(250).get();
    const servicesByExternalTenant = new Map<string, Array<{
      id: string;
      ref: FirebaseFirestore.DocumentReference;
      data: FirebaseFirestore.DocumentData;
    }>>();
    const servicesByName = new Map<string, Array<{
      id: string;
      ref: FirebaseFirestore.DocumentReference;
      data: FirebaseFirestore.DocumentData;
    }>>();
    for (const service of servicesSnapshot.docs) {
      if (service.data().isArchived === true) continue;
      const externalTenantId = text(service.data().externalTenantId, 160);
      const serviceLink = { id: service.id, ref: service.ref, data: service.data() };
      if (externalTenantId) {
        const items = servicesByExternalTenant.get(externalTenantId) ?? [];
        items.push(serviceLink);
        servicesByExternalTenant.set(externalTenantId, items);
      }
      const serviceName = identityName(service.data().externalTenantName ?? service.data().name);
      if (serviceName) {
        const items = servicesByName.get(serviceName) ?? [];
        items.push(serviceLink);
        servicesByName.set(serviceName, items);
      }
    }

    const writer = db.bulkWriter();
    writer.onWriteError((error) => error.failedAttempts < 3);
    const unmatched: string[] = [];
    const ambiguous: string[] = [];
    let matched = 0;
    let synchronizedUsers = 0;
    let autoLinked = 0;
    let createdContracts = 0;
    let createdCompanies = 0;
    let ignoredAdminTenants = 0;

    for (const entry of tenants) {
      if (!entry || typeof entry !== "object") throw new Error("invalid tenant");
      const tenant = entry as Record<string, unknown>;
      const customer = recordValue(tenant.customer);
      const contract = recordValue(tenant.contract);
      const externalTenantId = text(tenant.externalTenantId, 160);
      const companyName = text(fieldValue(customer, tenant, "companyName") ?? fieldValue(customer, tenant, "tradeName"), 160);
      const plan = text(fieldValue(contract, tenant, "plan"), 80);
      const subscriptionStatus = text(fieldValue(contract, tenant, "subscriptionStatus"), 30);
      const sourceUsers = snapshotUsers(tenant.users);
      if (!externalTenantId || !companyName || !sourceUsers || (subscriptionStatus && !subscriptionStatuses.has(subscriptionStatus))) throw new Error("invalid tenant");

      const dataVersionRaw = fieldValue(contract, tenant, "dataVersion");
      const sourceDataVersion = dataVersionRaw === undefined || dataVersionRaw === null || dataVersionRaw === "" ? null : Number(dataVersionRaw);
      if (sourceDataVersion !== null && (!Number.isInteger(sourceDataVersion) || sourceDataVersion < 0)) throw new Error("invalid source version");

      const sourceUpdatedAtValue = fieldValue(contract, tenant, "sourceUpdatedAt") ?? fieldValue(contract, tenant, "updatedAt");
      const sourceUpdatedAt = sourceUpdatedAtValue === undefined ? generatedAt : optionalDate(sourceUpdatedAtValue);
      if (!sourceUpdatedAt) throw new Error("invalid source update date");

      const contactEmail = optionalEmailField(fieldValue(customer, tenant, "contactEmail") ?? fieldValue(customer, tenant, "email"));
      const ownerGoogleEmail = optionalEmailField(fieldValue(customer, tenant, "ownerGoogleEmail") ?? fieldValue(customer, tenant, "googleEmail"));
      if (contactEmail === "invalid" || ownerGoogleEmail === "invalid") throw new Error("invalid customer email");

      const adminTenant = isPlatformAdminEmail(contactEmail)
        || isPlatformAdminEmail(ownerGoogleEmail)
        || (sourceUsers.length > 0 && sourceUsers.every((user) => isPlatformAdminEmail(user.email)));
      const adminMatches = externalTenantKeys(sourceSystem, externalTenantId)
        .flatMap((key) => servicesByExternalTenant.get(key) ?? [])
        .filter((link, index, links) => links.findIndex((candidate) => candidate.id === link.id) === index);
      if (adminTenant) {
        const adminTenantIds = new Set<string>();
        for (const adminMatch of adminMatches) {
          const linkedTenantId = text(adminMatch.data.tenantId, 160);
          if (linkedTenantId) adminTenantIds.add(linkedTenantId);
          writer.set(adminMatch.ref, {
            isArchived: true,
            connectorStatus: "desativado",
            lastKnownStatus: "Conta administrativa da Orquestra.cs ignorada pelo Portal.",
            updatedAt: FieldValue.serverTimestamp(),
          }, { merge: true });
        }
        for (const adminTenantId of adminTenantIds) {
          const linkedServices = await db.collection("managedServices").where("tenantId", "==", adminTenantId).limit(50).get();
          const hasOtherActiveService = linkedServices.docs.some((doc) => !adminMatches.some((match) => match.id === doc.id) && doc.data().isArchived !== true);
          if (!hasOtherActiveService) {
            writer.set(db.collection("companies").doc(adminTenantId), {
              isArchived: true,
              lastKnownStatus: "Conta administrativa da Orquestra.cs ignorada pelo Portal.",
              updatedAt: FieldValue.serverTimestamp(),
            }, { merge: true });
          }
        }
        ignoredAdminTenants += 1;
        continue;
      }

      const users = sourceUsers.filter((user) => !isPlatformAdminEmail(user.email));

      const monthlyFee = optionalMoneyField(fieldValue(contract, tenant, "monthlyFee"));
      const billingDay = optionalDayField(fieldValue(contract, tenant, "billingDay"));
      const startDate = optionalContractDateField(fieldValue(contract, tenant, "startDate"));
      const renewalDate = optionalContractDateField(fieldValue(contract, tenant, "renewalDate"));
      const nextDueDate = optionalContractDateField(fieldValue(contract, tenant, "nextDueDate"));
      const billingMethod = optionalBillingMethod(fieldValue(contract, tenant, "billingMethod") ?? fieldValue(contract, tenant, "paymentMethod"));
      const graceDays = optionalGraceDaysField(fieldValue(contract, tenant, "graceDays"));
      const notes = optionalTextField(
        fieldValue(customer, tenant, "notes")
          ?? fieldValue(customer, tenant, "internalNotes")
          ?? fieldValue(contract, tenant, "notes")
          ?? fieldValue(contract, tenant, "internalNotes"),
        2000,
      );
      if (!monthlyFee.valid || !billingDay.valid || !graceDays.valid || startDate === "invalid" || renewalDate === "invalid" || nextDueDate === "invalid" || billingMethod === "invalid") {
        throw new Error("invalid contract data");
      }

      const matches = externalTenantKeys(sourceSystem, externalTenantId)
        .flatMap((key) => servicesByExternalTenant.get(key) ?? [])
        .filter((link, index, links) => links.findIndex((candidate) => candidate.id === link.id) === index);
      const nameMatches = matches.length === 0
        ? servicesByName.get(identityName(companyName)) ?? []
        : [];
      let resolvedMatches = matches.length > 0 ? matches : nameMatches;
      let companyResolution: CompanyResolution | null = null;
      if (resolvedMatches.length > 1) {
        companyResolution = await resolveCompanyForTenant(db, writer, sourceSystem, externalTenantId, companyName, customer);
        if (companyResolution.ambiguous) {
          ambiguous.push(`${companyName} (${externalTenantId})`);
          continue;
        }
        const identityServiceMatches = resolvedMatches.filter((link) =>
          text(link.data.tenantId, 160) === companyResolution?.ref.id,
        );
        if (identityServiceMatches.length !== 1) {
          ambiguous.push(`${companyName} (${externalTenantId})`);
          continue;
        }
        resolvedMatches = identityServiceMatches;
        for (const duplicate of matches) {
          if (duplicate.id === identityServiceMatches[0].id) continue;
          writer.set(duplicate.ref, {
            isArchived: true,
            supersededBy: identityServiceMatches[0].id,
            connectorStatus: "arquivado",
            updatedAt: FieldValue.serverTimestamp(),
          }, { merge: true });
          await archiveCompanyIfUnlinked(db, writer, text(duplicate.data.tenantId, 160), companyResolution.ref.id, duplicate.id);
        }
      }

      let serviceLink = resolvedMatches[0];
      let service = serviceLink?.data ?? {};
      let tenantId = text(service.tenantId, 160);
      if (serviceLink || !tenantId) {
        companyResolution ??= await resolveCompanyForTenant(db, writer, sourceSystem, externalTenantId, companyName, customer);
        if (companyResolution.ambiguous) {
          ambiguous.push(`${companyName} (${externalTenantId})`);
          continue;
        }
        const previousTenantId = tenantId;
        tenantId = companyResolution.ref.id;
        if (companyResolution.created) createdCompanies += 1;
        if (previousTenantId && previousTenantId !== tenantId && serviceLink) {
          await archiveCompanyIfUnlinked(db, writer, previousTenantId, tenantId, serviceLink.id);
        }

        if (!serviceLink) {
          const serviceId = createHash("sha256")
            .update(`service:${sourceSystem}:${externalTenantId}`)
            .digest("hex");
          const serviceRef = db.collection("managedServices").doc(serviceId);
          service = {
            name: sourceCatalog.name,
            sourceSystem,
            type: sourceCatalog.type,
            url: sourceCatalog.url,
            tenantId,
            externalTenantId,
            environment: "production",
            availabilityStatus: "nao_verificado",
            sslStatus: "nao_verificado",
            connectorStatus: "ativo",
            plan: plan || "Sem plano",
            subscriptionStatus: subscriptionStatus || "trial",
            accessStatus: "revisao_manual",
            createdAt: FieldValue.serverTimestamp(),
          };
          serviceLink = { id: serviceId, ref: serviceRef, data: service };
          servicesByExternalTenant.set(externalTenantId, [serviceLink]);
          writer.set(serviceRef, service, { merge: true });
          autoLinked += 1;
          createdContracts += 1;
        }
      }

      if (!serviceLink) throw new Error("service link resolution failed");
      const serviceDoc = serviceLink;
      const companySnapshot = await db.collection("companies").doc(tenantId).get();
      const existingCompany = companySnapshot.exists ? companySnapshot.data() : null;
      const existingCompanySource = text(existingCompany?.sourceSystem, 80);

      const activeUsers = users.filter((user) => user.active);
      const owners = activeUsers.filter((user) => ["proprietário", "dono"].includes(user.role.toLowerCase())).length;
      const administrators = activeUsers.filter((user) => user.role.toLowerCase().includes("admin")).length;
      const staff = activeUsers.filter((user) => user.role.toLowerCase() === "financeiro").length;
      const lastActivityAt = optionalDate(tenant.lastActivityAt);
      const sourceOnlineUsers = snapshotCount(tenant.onlineUserCount);
      const onlineUsers = sourceOnlineUsers === null
        ? activeUsers.filter((user) => user.lastSeenAt && Date.now() - new Date(user.lastSeenAt).getTime() <= 5 * 60 * 1000).length
        : Math.min(sourceOnlineUsers, activeUsers.length);
      const presenceTracking = tenant.presenceTracking === true || sourceOnlineUsers !== null || users.some((user) => Boolean(user.lastSeenAt));
      const recentChangesLast30Days = Math.max(0, Math.round(Number(tenant.recentChangesLast30Days) || 0));
      const activeUsersLast30Days = Math.max(0, Math.round(Number(tenant.activeUsersLast30Days) || 0));
      const sourceSyncUpdates: Record<string, unknown> = { sourceUpdatedAt };
      if (dataVersionRaw !== undefined) sourceSyncUpdates.sourceDataVersion = sourceDataVersion;
      const updates: Record<string, unknown> = {
        tenantId,
        externalTenantId,
        connectorStatus: "ativo",
        externalTenantName: companyName,
        lastSyncAt: receivedAt,
        lastKnownStatus: `Cadastro e usuários sincronizados pelo ${sourceCatalog.name}.`,
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
          updatedAt: receivedAt,
        },
        ...sourceSyncUpdates,
        updatedAt: receivedAt,
      };

      if (plan) updates.plan = plan;
      if (subscriptionStatus) {
        updates.subscriptionStatus = subscriptionStatus;
        updates.accessStatus = subscriptionStatus === "ativo" || subscriptionStatus === "trial"
          ? "ativo"
          : subscriptionStatus === "cancelado" || subscriptionStatus === "bloqueado" || subscriptionStatus === "pausado"
            ? "bloqueado"
            : "revisao_manual";
      }

      if (monthlyFee.present) updates.monthlyFee = monthlyFee.value;
      if (billingDay.present) updates.billingDay = billingDay.value;
      if (graceDays.present) updates.graceDays = graceDays.value;
      if (startDate !== undefined) updates.startDate = startDate;
      if (renewalDate !== undefined) updates.renewalDate = renewalDate;
      if (nextDueDate !== undefined) updates.nextDueDate = nextDueDate;
      if (billingMethod !== undefined) updates.billingMethod = billingMethod;
      const sourceBillingStatus = optionalTextField(fieldValue(contract, tenant, "billingStatus"), 40);
      const paidThroughDate = optionalContractDateField(fieldValue(contract, tenant, "paidThroughDate"));
      if (paidThroughDate === "invalid") throw new Error("invalid paid through date");
      if (sourceBillingStatus !== undefined) updates.sourceBillingStatus = sourceBillingStatus;
      if (paidThroughDate !== undefined) updates.sourcePaidThroughDate = paidThroughDate;

      const companyUpdates: Record<string, unknown> = {
        lastSyncAt: receivedAt,
        sourceUpdatedAt,
        updatedAt: FieldValue.serverTimestamp(),
      };
      if (!existingCompanySource || existingCompanySource === sourceSystem) {
        companyUpdates.sourceSystem = sourceSystem;
        companyUpdates.externalTenantId = externalTenantId;
      }
      if (dataVersionRaw !== undefined) companyUpdates.sourceDataVersion = sourceDataVersion;
      const customerFields: Array<[string, string, number]> = [
        ["legalName", "legalName", 160],
        ["responsibleName", "responsibleName", 120],
        ["contactPhone", "contactPhone", 40],
        ["document", "document", 32],
        ["cpf", "cpf", 20],
        ["cnpj", "cnpj", 24],
        ["rg", "rg", 20],
        ["cep", "cep", 9],
        ["street", "street", 160],
        ["number", "number", 30],
        ["complement", "complement", 120],
        ["neighborhood", "neighborhood", 120],
        ["city", "city", 100],
        ["state", "state", 2],
        ["address", "address", 240],
        ["googleBusinessName", "googleBusinessName", 160],
        ["googleBusinessUrl", "googleBusinessUrl", 500],
        ["googleAddress", "googleAddress", 240],
        ["instagramUrl", "instagramUrl", 500],
      ];
      const tradeName = optionalTextField(fieldValue(customer, tenant, "tradeName"), 160);
      const documentType = optionalTextField(fieldValue(customer, tenant, "documentType"), 20);
      companyUpdates.tradeName = tradeName === undefined ? companyName : tradeName;
      if (notes !== undefined) companyUpdates.notes = notes;
      if (documentType !== undefined) companyUpdates.documentType = documentType?.toUpperCase() || null;
      if (contactEmail !== undefined) companyUpdates.contactEmail = contactEmail;
      if (ownerGoogleEmail !== undefined) companyUpdates.ownerGoogleEmail = ownerGoogleEmail;
      for (const [target, source, maxLength] of customerFields) {
        const value = optionalTextField(fieldValue(customer, tenant, source), maxLength);
        if (value !== undefined) companyUpdates[target] = source === "state" && value ? value.toUpperCase() : value;
      }
      if (!companyUpdates.document && companyUpdates.cnpj) companyUpdates.document = companyUpdates.cnpj;
      if (!companyUpdates.document && companyUpdates.cpf) companyUpdates.document = companyUpdates.cpf;
      if (companyUpdates.document && String(documentType || "").toUpperCase() === "CNPJ") companyUpdates.cnpj = companyUpdates.document;
      if (companyUpdates.document && String(documentType || "").toUpperCase() === "CPF") companyUpdates.cpf = companyUpdates.document;

      // O vínculo pode existir no catálogo antes do cadastro completo da empresa.
      // O merge mantém a sincronização idempotente também nesse primeiro envio.
      writer.set(db.collection("companies").doc(tenantId), companyUpdates, { merge: true });
      writer.set(serviceDoc.ref, updates, { merge: true });

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
           lastLoginAt: user.lastLoginAt,
           deviceType: user.deviceType,
           operatingSystem: user.operatingSystem,
           browser: user.browser,
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
        metadata: {
          sourceSystem,
          externalTenantId,
          snapshotId,
          users: users.length,
          sourceDataVersion,
          synchronizedCustomerFields: Object.keys(companyUpdates).filter((field) => !["updatedAt", "lastSyncAt"].includes(field)),
          synchronizedContractFields: Object.keys(updates).filter((field) => !["updatedAt", "lastSyncAt", "usageSummary"].includes(field)),
        },
      });
      matched += 1;
      synchronizedUsers += users.length;
    }

    await writer.close();
    const result = { matched, synchronizedUsers, autoLinked, createdContracts, createdCompanies, ignoredAdminTenants, unmatched, ambiguous };
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
