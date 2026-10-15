import fs from "node:fs";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

function loadLocalEnv() {
  const envPath = process.env.DOTENV_CONFIG_PATH || ".env.local";
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const separator = line.indexOf("=");
    if (separator <= 0) continue;
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim().replace(/^"|"$/g, "");
    if (key && !key.startsWith("#") && !process.env[key]) process.env[key] = value;
  }
}

function normalize(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function serviceLabel(sourceSystem) {
  return {
    mad360: "Orquestra Mad360 / Serraria",
    orquestra_hub: "Orquestra Hub",
    orquestra_blend: "Orquestra Blend",
    orquestra_studio: "Orquestra Studio",
    orquestra_auto_detail: "Orquestra Auto Detail",
    orquestracs_face_id: "Orquestra Face ID",
  }[sourceSystem] || sourceSystem;
}

function initAdmin() {
  if (getApps().length) return getFirestore();
  const filePath = process.env.FIREBASE_SERVICE_ACCOUNT_FILE;
  const raw = filePath ? fs.readFileSync(filePath, "utf8") : process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error("Credencial administrativa do Firebase não configurada.");
  initializeApp({ credential: cert(JSON.parse(raw)) });
  return getFirestore();
}

const companySnapshots = [
  {
    key: "vanmarte",
    legalName: "Vanmarte",
    tradeName: "Vanmarte",
    responsibleName: "Marcelo Teobaldo",
    city: "Ribeirão Branco",
    state: "SP",
    address: "Ribeirão Branco - SP",
    googleBusinessName: "Serraria Vanmarte Ribeirão Branco",
    googleBusinessUrl: "https://share.google/R3XbcHSpuT1P0u2QW",
    googleAddress: "Ribeirão Branco - SP",
    plan: "Teste",
    monthlyFee: 300,
    contractStatus: "ativo",
    accessStatus: "ativo",
    startDate: "2026-06-01",
    renewalDate: "2026-10-20",
    notes: "Cadastro enriquecido com a referência pública do Mad360/Vanmarte. Endereço exato ainda precisa ser confirmado.",
  },
  {
    key: "mister-21",
    legalName: "MISTER 21",
    tradeName: "Mister 21",
    responsibleName: "Amanda Dimas",
    city: "Itapeva",
    state: "SP",
    address: "R. Lucas de Camargo, 367 - Centro, Itapeva - SP, 18400-340",
    googleBusinessName: "MISTER 21 Itapeva",
    googleBusinessUrl: "https://share.google/lSPLb6noSHW0GcJoW",
    googleAddress: "R. Lucas de Camargo, 367 - Centro, Itapeva - SP, 18400-340",
    plan: "Profissional",
    monthlyFee: 120,
    contractStatus: "ativo",
    accessStatus: "ativo",
    startDate: "2026-06-30",
    renewalDate: "2026-10-30",
    notes: "Snapshot importado do Admin Orquestra Hub em 13/10/2026.",
  },
  {
    key: "valen-studio",
    legalName: "Valen Studio",
    tradeName: "Valen Studio",
    responsibleName: "Responsável não informado",
    city: "Ribeirão Branco",
    state: "SP",
    address: "R. Joaquim Vicente Ubaldo - Ribeirão Branco - SP",
    googleBusinessName: "Studio Beauty Valen",
    googleBusinessUrl: "https://share.google/eD7ItwCkuuELXgXXN",
    googleAddress: "R. Joaquim Vicente Ubaldo - Ribeirão Branco - SP",
    plan: "Profissional",
    monthlyFee: 120,
    contractStatus: "teste",
    accessStatus: "revisao_manual",
    startDate: "2026-07-16",
    renewalDate: "2026-08-05",
    notes: "Snapshot importado do Admin Orquestra Studio em 13/10/2026. Status original: trial; vencimento precisa de revisão comercial.",
  },
  {
    key: "alisson-estetica-automotiva",
    legalName: "Alisson Estética Automotiva",
    tradeName: "Alisson Estética Automotiva",
    responsibleName: "Responsável não informado",
    city: "Ribeirão Branco",
    state: "SP",
    address: "R. Ângelo Santos Penteado, 186 - Centro, Ribeirão Branco - SP, 18430-000",
    googleBusinessName: "Alisson Estética Automotiva Ribeirão Branco",
    googleBusinessUrl: "https://share.google/Und5Qeth2hUPsSs7h",
    googleAddress: "R. Ângelo Santos Penteado, 186 - Centro, Ribeirão Branco - SP, 18430-000",
    plan: "Médio",
    monthlyFee: 120,
    contractStatus: "ativo",
    accessStatus: "bloqueado",
    startDate: "2026-09-01",
    renewalDate: "2026-10-01",
    notes: "Snapshot importado do Admin Orquestra Auto Detail em 13/10/2026. Status original: ativo; situação calculada: bloqueado.",
  },
  {
    key: "copao-da-blank",
    legalName: "Copão da Blank",
    tradeName: "Copão da Blank",
    responsibleName: "Responsável não informado",
    city: "Ribeirão Branco",
    state: "SP",
    address: "Av. Cel. Estevan de Souza, 455 - Ribeirão Branco - SP",
    googleBusinessName: "Copão da Blank Ribeirão Branco",
    googleBusinessUrl: "https://share.google/9yt4yeHviApZzDZfp",
    googleAddress: "Av. Cel. Estevan de Souza, 455 - Ribeirão Branco - SP",
    plan: "Não informado",
    monthlyFee: 0,
    contractStatus: "teste",
    accessStatus: "revisao_manual",
    notes: "Cliente associado publicamente ao Orquestra Blend. Dados comerciais ainda não informados.",
  },
  {
    key: "porto-belo",
    legalName: "Porto Belo Fretes",
    tradeName: "Porto Belo",
    responsibleName: "Responsável não informado",
    city: "Sorocaba",
    state: "SP",
    address: "Alameda das Violetas, 308 - Jardim Simus, Sorocaba - SP, 18055-153",
    googleBusinessName: "Porto Belo Fretes Sorocaba",
    googleBusinessUrl: "https://share.google/Il1JpUXfrknxJ69md",
    googleAddress: "Alameda das Violetas, 308 - Jardim Simus, Sorocaba - SP, 18055-153",
    plan: "Não informado",
    monthlyFee: 0,
    contractStatus: "teste",
    accessStatus: "revisao_manual",
    notes: "Site comercial sem painel Admin/Dev do cliente. Cadastro feito a partir da referência pública.",
  },
  {
    key: "pr-perfumaria",
    legalName: "PR Perfumaria",
    tradeName: "PR Perfumaria",
    responsibleName: "Pablo Ricardo",
    city: "",
    state: "",
    address: null,
    googleBusinessName: null,
    googleBusinessUrl: null,
    googleAddress: null,
    instagramUrl: "https://www.instagram.com/pr__perfumaria/",
    plan: "Não informado",
    monthlyFee: 0,
    contractStatus: "teste",
    accessStatus: "revisao_manual",
    notes: "Site comercial sem domínio e sem painel Admin/Dev. Dados públicos conferidos no Instagram; endereço comercial ainda não confirmado.",
  },
];

const serviceSnapshots = [
  {
    sourceSystem: "mad360",
    externalTenantId: "vanmarte",
    companyKey: "vanmarte",
    type: "sistema_web",
    url: "https://orquestracs.com",
    plan: "Teste",
    monthlyFee: 300,
    startDate: "2026-06-01",
    renewalDate: "2026-10-20",
    subscriptionStatus: "ativo",
    lastKnownStatus: "Pagamento informado como ativo para o Mad360; resumo de uso já recebido pelo conector.",
  },
  {
    sourceSystem: "orquestra_hub",
    externalTenantId: "cb2f868f-eb79-461d-be73-b315f1b5269c",
    companyKey: "mister-21",
    type: "sistema_web",
    url: "https://hub.orquestracs.com",
    plan: "Profissional",
    monthlyFee: 120,
    startDate: "2026-06-30",
    renewalDate: "2026-10-30",
    subscriptionStatus: "ativo",
    lastKnownStatus: "Snapshot do Admin Hub: ativo; último acesso 09/10/2026 15:23; offline no momento da leitura.",
  },
  {
    sourceSystem: "orquestra_studio",
    externalTenantId: "qweG04xZbPKeB6PZFJU5",
    companyKey: "valen-studio",
    type: "sistema_web",
    url: "https://studio.orquestracs.com",
    plan: "Profissional",
    monthlyFee: 120,
    startDate: "2026-07-16",
    renewalDate: "2026-08-05",
    subscriptionStatus: "trial",
    lastKnownStatus: "Snapshot do Admin Studio: trial; situação calculada vencida; online no momento da leitura.",
  },
  {
    sourceSystem: "orquestra_studio",
    externalTenantId: "soJSRmsVLGQgLHFaDv4Q",
    companyKey: "vanmarte",
    type: "sistema_web",
    url: "https://studio.orquestracs.com",
    plan: "Profissional",
    monthlyFee: 120,
    startDate: "2026-07-15",
    renewalDate: "2026-07-15",
    subscriptionStatus: "ativo",
    lastKnownStatus: "Snapshot do Admin Studio: ativo; situação calculada vencida; online no momento da leitura.",
  },
  {
    sourceSystem: "orquestra_auto_detail",
    externalTenantId: "alisson-estetica-automotiva-legado",
    companyKey: "alisson-estetica-automotiva",
    type: "sistema_web",
    url: "https://autodetail.orquestracs.com",
    plan: "Médio",
    monthlyFee: 120,
    startDate: "2026-09-01",
    renewalDate: "2026-10-01",
    subscriptionStatus: "bloqueado",
    lastKnownStatus: "Snapshot do Admin Auto Detail: assinatura ativa; situação calculada bloqueado; offline e sem registro de acesso na leitura.",
  },
  {
    sourceSystem: "orquestracs_face_id",
    externalTenantId: null,
    companyKey: "vanmarte",
    type: "sistema_web",
    url: "https://faceid.orquestracs.com",
    plan: "Compartilhado com Mad360",
    monthlyFee: null,
    startDate: null,
    renewalDate: null,
    subscriptionStatus: "ativo",
    lastKnownStatus: "Vínculo informado com o cliente Mad360/Vanmarte; identificador externo e conector Face ID ainda pendentes.",
  },
  {
    sourceSystem: "orquestra_blend",
    externalTenantId: "copao-da-blank-publico",
    companyKey: "copao-da-blank",
    type: "sistema_web",
    url: "https://orquestra-blend.vercel.app",
    plan: "Não informado",
    monthlyFee: null,
    startDate: null,
    renewalDate: null,
    subscriptionStatus: "revisao_manual",
    lastKnownStatus: "Cliente associado por referência pública; painel Admin e dados comerciais ainda não conferidos.",
  },
  {
    sourceSystem: null,
    externalTenantId: null,
    companyKey: "porto-belo",
    name: "Site Porto Belo",
    type: "site",
    url: "https://portobelofretes.com.br",
    plan: "Não informado",
    monthlyFee: null,
    startDate: null,
    renewalDate: null,
    subscriptionStatus: "revisao_manual",
    lastKnownStatus: "Site comercial cadastrado por referência pública; não possui painel Admin/Dev do cliente.",
  },
  {
    sourceSystem: null,
    externalTenantId: null,
    companyKey: "pr-perfumaria",
    name: "Site PR Perfumaria",
    type: "site",
    url: "https://pr-perfumaria-azure.vercel.app",
    plan: "Não informado",
    monthlyFee: null,
    startDate: null,
    renewalDate: null,
    subscriptionStatus: "revisao_manual",
    lastKnownStatus: "Site sem domínio e sem painel Admin/Dev; dados comerciais não informados.",
  },
];

async function findCompany(db, snapshot) {
  const companies = await db.collection("companies").limit(250).get();
  return companies.docs.find((doc) => {
    const data = doc.data();
    return [data.legalName, data.tradeName].some((value) => normalize(value) === normalize(snapshot.legalName) || normalize(value) === normalize(snapshot.tradeName));
  }) || null;
}

async function findService(db, snapshot, tenantId) {
  const services = await db.collection("managedServices").limit(500).get();
  const sameSource = services.docs.filter((doc) => doc.data().sourceSystem === snapshot.sourceSystem);
  if (snapshot.sourceSystem && snapshot.externalTenantId) {
    return sameSource.find((doc) => doc.data().externalTenantId === snapshot.externalTenantId)
      || sameSource.find((doc) => !doc.data().externalTenantId && !doc.data().tenantId)
      || null;
  }
  if (snapshot.sourceSystem) {
    return sameSource.find((doc) => !doc.data().externalTenantId && doc.data().tenantId === tenantId)
      || sameSource.find((doc) => !doc.data().externalTenantId && !doc.data().tenantId)
      || null;
  }
  return services.docs.find((doc) => normalize(doc.data().name) === normalize(snapshot.name) && doc.data().tenantId === tenantId)
    || services.docs.find((doc) => normalize(doc.data().name) === normalize(snapshot.name))
    || null;
}

async function main() {
  loadLocalEnv();
  const db = initAdmin();
  const apply = process.argv.includes("--apply");
  if (!apply) console.log("Modo simulação. Use --apply para gravar os snapshots na Central.");

  const companyRefs = new Map();
  for (const snapshot of companySnapshots) {
    const existing = await findCompany(db, snapshot);
    const ref = existing?.ref || db.collection("companies").doc();
    companyRefs.set(snapshot.key, ref);
    const existingData = existing?.data() || {};
    const data = {
      legalName: snapshot.legalName,
      tradeName: snapshot.tradeName,
      responsibleName: snapshot.responsibleName,
      city: snapshot.city,
      state: snapshot.state,
      address: snapshot.address,
      googleBusinessName: snapshot.googleBusinessName ?? null,
      googleBusinessUrl: snapshot.googleBusinessUrl ?? null,
      googleAddress: snapshot.googleAddress ?? null,
      instagramUrl: snapshot.instagramUrl ?? null,
      plan: snapshot.plan,
      monthlyFee: snapshot.monthlyFee,
      contractStatus: snapshot.contractStatus,
      accessStatus: snapshot.accessStatus,
      billingDay: existingData.billingDay ?? 10,
      graceDays: existingData.graceDays ?? 5,
      startDate: snapshot.startDate ?? existingData.startDate ?? null,
      renewalDate: snapshot.renewalDate ?? existingData.renewalDate ?? null,
      notes: snapshot.notes,
      updatedAt: FieldValue.serverTimestamp(),
    };
    if (!existing) data.createdAt = FieldValue.serverTimestamp();
    console.log(`${existing ? "Atualizar" : "Criar"} cliente: ${snapshot.tradeName}`);
    if (apply) await ref.set(data, { merge: true });
  }

  const vanmarte = await findCompany(db, { legalName: "Vanmarte", tradeName: "Vanmarte" });
  if (vanmarte) companyRefs.set("vanmarte", vanmarte.ref);

  for (const snapshot of serviceSnapshots) {
    const companyRef = companyRefs.get(snapshot.companyKey);
    if (!companyRef) throw new Error(`Cliente não encontrado para ${snapshot.companyKey}`);
    const existing = await findService(db, snapshot, companyRef.id);
    const ref = existing?.ref || db.collection("managedServices").doc();
    const sourceSystem = snapshot.sourceSystem ?? null;
    const data = {
      name: snapshot.name || serviceLabel(snapshot.sourceSystem),
      sourceSystem,
      type: snapshot.type,
      url: snapshot.url || "",
      tenantId: companyRef.id,
      externalTenantId: snapshot.externalTenantId ?? null,
      plan: snapshot.plan,
      monthlyFee: snapshot.monthlyFee,
      developmentFee: existing?.data().developmentFee ?? null,
      implementationFee: existing?.data().implementationFee ?? null,
      supportFee: existing?.data().supportFee ?? null,
      billingDay: existing?.data().billingDay ?? 10,
      startDate: snapshot.startDate,
      renewalDate: snapshot.renewalDate,
      subscriptionStatus: snapshot.subscriptionStatus,
      environment: "production",
      accessStatus: snapshot.subscriptionStatus === "bloqueado" ? "bloqueado" : snapshot.subscriptionStatus === "ativo" ? "ativo" : "revisao_manual",
      connectorStatus: "pendente",
      currentVersion: existing?.data().currentVersion ?? null,
      lastUpdatedAt: existing?.data().lastUpdatedAt ?? null,
      lastUpdateSummary: existing?.data().lastUpdateSummary ?? null,
      vercelProjectName: existing?.data().vercelProjectName ?? null,
      repositoryUrl: existing?.data().repositoryUrl ?? null,
      availabilityStatus: existing?.data().availabilityStatus ?? "nao_verificado",
      httpStatus: existing?.data().httpStatus ?? null,
      responseTimeMs: existing?.data().responseTimeMs ?? null,
      lastCheckedAt: existing?.data().lastCheckedAt ?? null,
      sslStatus: existing?.data().sslStatus ?? "nao_verificado",
      lastSyncAt: FieldValue.serverTimestamp(),
      lastKnownStatus: snapshot.lastKnownStatus,
      updatedAt: FieldValue.serverTimestamp(),
    };
    if (!existing) data.createdAt = FieldValue.serverTimestamp();
    console.log(`${existing ? "Atualizar" : "Criar"} serviço: ${data.name} -> ${snapshot.companyKey}`);
    if (apply) await ref.set(data, { merge: true });
    if (apply) {
      await db.collection("auditLogs").add({
        tenantId: companyRef.id,
        actorUserId: "admin-snapshot-import",
        actorRole: "system_connector",
        action: "managedService.admin_snapshot_imported",
        targetType: "managedService",
        targetId: ref.id,
        createdAt: new Date().toISOString(),
        metadata: { sourceSystem, externalTenantId: snapshot.externalTenantId ?? null },
      });
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
