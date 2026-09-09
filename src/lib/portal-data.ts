import {
  BadgeCheck,
  BarChart3,
  BriefcaseBusiness,
  Building2,
  CalendarClock,
  Car,
  ChefHat,
  Clock3,
  Factory,
  HeartHandshake,
  MessageSquareText,
  Scissors,
  ShieldCheck,
  Sparkles,
  WalletCards,
} from "lucide-react";

export type ProductStatus = "ativo" | "em_teste" | "planejado";
export type CompanyStatus = "ativo" | "teste" | "vencendo" | "inadimplente" | "bloqueado";

export type Product = {
  id: string;
  name: string;
  shortName: string;
  category: string;
  audience: string;
  description: string;
  features: string[];
  status: ProductStatus;
  icon: typeof Factory;
  accent: string;
};

export type Company = {
  id: string;
  name: string;
  document: string;
  owner: string;
  productIds: string[];
  plan: string;
  monthlyFee: number;
  dueDate: string;
  status: CompanyStatus;
  users: number;
  aiCredits: number;
  externalUrl: string;
  lastAccess: string;
};

export const products: Product[] = [
  {
    id: "madeira",
    name: "Orquestra Madeira",
    shortName: "Madeira / Serraria",
    category: "Madeira",
    audience: "Serrarias, madeireiras e paleteiras",
    description:
      "Controle de producao, romaneios, estoque, clientes, financeiro e operacao de patio para empresas do setor madeireiro.",
    features: ["Romaneios", "Estoque", "Producao", "Financeiro"],
    status: "ativo",
    icon: Factory,
    accent: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  },
  {
    id: "beleza",
    name: "Orquestra Beleza",
    shortName: "Beleza",
    category: "Beleza",
    audience: "Saloes, barbearias e clinicas de estetica",
    description:
      "Agenda, clientes, equipe, servicos, comissoes, recorrencia e visao financeira para negocios de beleza e atendimento.",
    features: ["Agenda", "Clientes", "Equipe", "Comissoes"],
    status: "planejado",
    icon: Scissors,
    accent: "bg-rose-50 text-rose-700 ring-rose-100",
  },
  {
    id: "auto",
    name: "Orquestra Auto",
    shortName: "Estetica Automotiva",
    category: "Servicos",
    audience: "Estetica automotiva, lava-rapido e oficinas leves",
    description:
      "Ordens de servico, pacotes, clientes, veiculos, controle de equipe e planos comerciais para operacoes automotivas.",
    features: ["OS", "Veiculos", "Pacotes", "Planos"],
    status: "ativo",
    icon: Car,
    accent: "bg-cyan-50 text-cyan-700 ring-cyan-100",
  },
  {
    id: "food",
    name: "Orquestra Food",
    shortName: "Restaurante",
    category: "Alimentacao",
    audience: "Restaurantes, lanchonetes e delivery local",
    description:
      "Pedidos, produtos, caixa, atendimento e operacao simples para restaurantes que precisam sair de controles manuais.",
    features: ["Pedidos", "Caixa", "Produtos", "Delivery"],
    status: "planejado",
    icon: ChefHat,
    accent: "bg-amber-50 text-amber-700 ring-amber-100",
  },
  {
    id: "ponto",
    name: "Orquestra Ponto",
    shortName: "Ponto / Face ID",
    category: "RH",
    audience: "Empresas com equipe, jornada e auditoria trabalhista",
    description:
      "Batida de ponto com Face ID, PIN protegido, jornadas, banco de horas, relatorios e trilha de auditoria.",
    features: ["Face ID", "Jornadas", "Relatorios", "Auditoria"],
    status: "ativo",
    icon: Clock3,
    accent: "bg-indigo-50 text-indigo-700 ring-indigo-100",
  },
  {
    id: "hub",
    name: "Orquestra Hub",
    shortName: "Financeiro",
    category: "Financeiro",
    audience: "Empresas que precisam controlar vencimentos e pagamentos",
    description:
      "Fornecedores, compras, parcelas, contas a pagar, lojas, vencimentos, pagamentos e visao gerencial simples.",
    features: ["Fornecedores", "Parcelas", "Vencimentos", "Relatorios"],
    status: "ativo",
    icon: WalletCards,
    accent: "bg-teal-50 text-teal-700 ring-teal-100",
  },
  {
    id: "comercial",
    name: "Orquestra Comercial",
    shortName: "Comercial",
    category: "Vendas",
    audience: "Times que vendem por WhatsApp, indicacao e atendimento",
    description:
      "CRM, oportunidades, contatos, lembretes, documentos, canais e automacoes comerciais para acompanhamento de clientes.",
    features: ["Oportunidades", "Contatos", "Lembretes", "Automacao"],
    status: "em_teste",
    icon: MessageSquareText,
    accent: "bg-violet-50 text-violet-700 ring-violet-100",
  },
];

export const companies: Company[] = [
  {
    id: "vanmarte",
    name: "Serraria Vanmarte",
    document: "12.345.678/0001-90",
    owner: "Administrador Vanmarte",
    productIds: ["madeira"],
    plan: "Profissional",
    monthlyFee: 497,
    dueDate: "2026-09-10",
    status: "ativo",
    users: 8,
    aiCredits: 0,
    externalUrl: "https://sistema-serraria.exemplo.com",
    lastAccess: "Hoje, 09:42",
  },
  {
    id: "alisson-auto",
    name: "Alisson Estetica Automotiva",
    document: "23.456.789/0001-10",
    owner: "Alisson",
    productIds: ["auto"],
    plan: "Essencial",
    monthlyFee: 197,
    dueDate: "2026-09-05",
    status: "vencendo",
    users: 4,
    aiCredits: 120,
    externalUrl: "https://estetica-automotiva.exemplo.com",
    lastAccess: "Ontem, 18:10",
  },
  {
    id: "hub-moda",
    name: "Orquestra Hub Financeiro",
    document: "34.567.890/0001-20",
    owner: "Gestor financeiro",
    productIds: ["hub"],
    plan: "Empresa",
    monthlyFee: 397,
    dueDate: "2026-08-20",
    status: "inadimplente",
    users: 5,
    aiCredits: 60,
    externalUrl: "https://orquestra-hub.exemplo.com",
    lastAccess: "25/08/2026, 14:03",
  },
  {
    id: "ponto-demo",
    name: "Empresa Ponto Inteligente",
    document: "45.678.901/0001-30",
    owner: "RH responsavel",
    productIds: ["ponto"],
    plan: "Teste assistido",
    monthlyFee: 0,
    dueDate: "2026-09-15",
    status: "teste",
    users: 12,
    aiCredits: 0,
    externalUrl: "https://orquestra-faceid.exemplo.com",
    lastAccess: "Hoje, 07:58",
  },
];

export const platformMetrics = [
  { label: "Clientes ativos", value: "18", detail: "+4 em implantacao", icon: Building2 },
  { label: "MRR previsto", value: "R$ 7.940", detail: "cobranca manual", icon: BarChart3 },
  { label: "Vencendo em 5 dias", value: "3", detail: "acompanhar hoje", icon: CalendarClock },
  { label: "Ambiente protegido", value: "tenantId", detail: "isolamento por empresa", icon: ShieldCheck },
];

export const auditEvents = [
  {
    title: "Pagamento confirmado",
    detail: "Orquestra Hub Financeiro - referencia 08/2026",
    when: "Hoje, 10:22",
    icon: BadgeCheck,
  },
  {
    title: "Modulo liberado",
    detail: "Orquestra Madeira ativado para Serraria Vanmarte",
    when: "Ontem, 16:40",
    icon: BriefcaseBusiness,
  },
  {
    title: "Solicitacao de suporte",
    detail: "Cliente pediu ajuste de usuarios no portal",
    when: "25/08/2026",
    icon: HeartHandshake,
  },
  {
    title: "Credito de IA atualizado",
    detail: "Limite mensal ajustado para teste assistido",
    when: "24/08/2026",
    icon: Sparkles,
  },
];

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function formatDate(date: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(`${date}T12:00:00-03:00`));
}
