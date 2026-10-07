import { Car, Clock3, Factory, Globe2, HeartHandshake, Network, Scissors, Store, WalletCards } from "lucide-react";

export type ProjectAvailability = "online" | "offline" | "nao_verificado";
export type ProjectRelation = "cliente_ativo" | "proprio" | "site";

export type ProjectCatalogDetails = {
  audience: string;
  highlights: readonly string[];
  previewImage?: string;
  previewAlt?: string;
  previewKind?: "ambiente" | "captura_interface";
};

export type DeployedProject = {
  id: string;
  name: string;
  vercelName: string;
  url: string | null;
  category: string;
  description: string;
  icon: typeof Factory;
  status: "publicado" | "legado" | "tecnico";
  availability: ProjectAvailability;
  relation: ProjectRelation;
};

export const deployedProjects: DeployedProject[] = [
  {
    id: "sistema-serraria",
    name: "Orquestra Mad360",
    vercelName: "sistema-serraria",
    url: "https://orquestracs.com",
    category: "Indústria e madeira",
    description: "Gestão operacional para serraria, madeira, estoque e produção.",
    icon: Factory,
    status: "publicado",
    availability: "nao_verificado",
    relation: "cliente_ativo",
  },
  {
    id: "orquestracs-face-id",
    name: "Orquestra Face ID",
    vercelName: "orquestracs-face-id",
    url: "https://faceid.orquestracs.com",
    category: "Ponto e RH",
    description: "Batida de ponto, jornadas e identificação para equipes.",
    icon: Clock3,
    status: "publicado",
    availability: "nao_verificado",
    relation: "cliente_ativo",
  },
  {
    id: "orquestra-fit",
    name: "Orquestra Fit",
    vercelName: "orquestra-fit",
    url: "https://orquestra-fit.vercel.app",
    category: "Academia e operação",
    description: "Gestão de academia, alunos, treinos e acompanhamento operacional.",
    icon: HeartHandshake,
    status: "publicado",
    availability: "nao_verificado",
    relation: "cliente_ativo",
  },
  {
    id: "orquestra-hub",
    name: "Orquestra Hub",
    vercelName: "orquestra-hub",
    url: "https://hub.orquestracs.com",
    category: "Financeiro",
    description: "Gestão financeira, fornecedores, compras e decisões empresariais.",
    icon: WalletCards,
    status: "publicado",
    availability: "nao_verificado",
    relation: "cliente_ativo",
  },
  {
    id: "orquestra-auto-detail",
    name: "Orquestra Auto Detail",
    vercelName: "orquestra-auto-detail",
    url: "https://autodetail.orquestracs.com",
    category: "Estética automotiva",
    description: "Agenda, ordens de serviço, clientes e operação de estética automotiva.",
    icon: Car,
    status: "publicado",
    availability: "nao_verificado",
    relation: "cliente_ativo",
  },
  {
    id: "orquestra-studio",
    name: "Orquestra Studio",
    vercelName: "orquestra-studio",
    url: "https://studio.orquestracs.com",
    category: "Serviços e beleza",
    description: "Sistema para serviços, agenda e relacionamento com clientes.",
    icon: Scissors,
    status: "publicado",
    availability: "nao_verificado",
    relation: "cliente_ativo",
  },
  {
    id: "orquestra-blend",
    name: "Orquestra Blend",
    vercelName: "orquestra-blend",
    url: null,
    category: "Gestão e operação",
    description: "Sistema personalizado para integrar rotina, dados e decisões da operação.",
    icon: Network,
    status: "publicado",
    availability: "nao_verificado",
    relation: "proprio",
  },
  {
    id: "orquestra-moda",
    name: "Orquestra Moda",
    vercelName: "orquestra-moda",
    url: null,
    category: "Varejo e moda",
    description: "Operação digital para lojas, produtos, atendimento e relacionamento.",
    icon: Store,
    status: "publicado",
    availability: "nao_verificado",
    relation: "cliente_ativo",
  },
  {
    id: "site-porto-belo",
    name: "Site Porto Belo",
    vercelName: "porto-belo",
    url: "https://portobelofretes.com.br",
    category: "Site institucional",
    description: "Presença digital e captação de contatos para Porto Belo.",
    icon: Globe2,
    status: "publicado",
    availability: "online",
    relation: "site",
  },
  {
    id: "site-pr-perfumaria",
    name: "Site PR Perfumaria",
    vercelName: "pr-perfumaria",
    url: null,
    category: "Site institucional",
    description: "Projeto de presença digital para PR Perfumaria.",
    icon: Globe2,
    status: "legado",
    availability: "offline",
    relation: "site",
  },
  {
    id: "site-dama-de-ferro",
    name: "Site Dama de Ferro",
    vercelName: "dama-de-ferro",
    url: null,
    category: "Site institucional",
    description: "Projeto de presença digital para Dama de Ferro.",
    icon: Globe2,
    status: "legado",
    availability: "offline",
    relation: "site",
  },
  {
    id: "site-vanmarte",
    name: "Site Vanmarte",
    vercelName: "vanmarte",
    url: null,
    category: "Site comercial",
    description: "Projeto de presença digital para Vanmarte.",
    icon: Globe2,
    status: "legado",
    availability: "offline",
    relation: "site",
  },
];

export const projectCatalogDetails: Record<string, ProjectCatalogDetails> = {
  "sistema-serraria": {
    audience: "Serrarias, indústrias e operações de madeira",
    highlights: ["Estoque e produção", "Frotas e manutenção", "Rotinas operacionais"],
    previewImage: "/catalogo/mad360-industrial.jpg",
    previewAlt: "Ambiente industrial de uma operação de madeira",
    previewKind: "ambiente",
  },
  "orquestracs-face-id": {
    audience: "Empresas com equipes, jornadas e controle de ponto",
    highlights: ["Registro de ponto", "Jornadas e equipes", "Acompanhamento administrativo"],
  },
  "orquestra-fit": {
    audience: "Academias, professores e alunos",
    highlights: ["Alunos e treinos", "Professores e permissões", "Rotina financeira e estoque"],
  },
  "orquestra-hub": {
    audience: "Empresas que precisam organizar gestão e financeiro",
    highlights: ["Contas e fornecedores", "Compras e decisões", "Visão administrativa"],
  },
  "orquestra-auto-detail": {
    audience: "Estéticas automotivas e centros de serviço",
    highlights: ["Agenda e clientes", "Ordens de serviço", "Acompanhamento da operação"],
    previewImage: "/catalogo/auto-detail-ambiente.png",
    previewAlt: "Ambiente real de uma operação de estética automotiva",
    previewKind: "ambiente",
  },
  "orquestra-studio": {
    audience: "Studios, salões e serviços de beleza",
    highlights: ["Agenda de serviços", "Clientes e atendimento", "Organização da rotina"],
    previewImage: "/catalogo/studio-ambiente.png",
    previewAlt: "Ambiente visual de um studio de beleza",
    previewKind: "ambiente",
  },
  "orquestra-blend": {
    audience: "Operações que precisam conectar dados e processos",
    highlights: ["Fluxos personalizados", "Dados centralizados", "Automação de rotinas"],
  },
  "orquestra-moda": {
    audience: "Lojas, marcas e operações de moda",
    highlights: ["Produtos e catálogo", "Atendimento e vendas", "Rotina comercial"],
  },
  "site-porto-belo": {
    audience: "Empresas de transporte e logística",
    highlights: ["Apresentação comercial", "Captação de contatos", "Presença digital"],
    previewImage: "/catalogo/porto-belo-frota.jpeg",
    previewAlt: "Frota real da Porto Belo Transportes",
    previewKind: "ambiente",
  },
  "site-pr-perfumaria": {
    audience: "Lojas de perfumaria e beleza",
    highlights: ["Vitrine digital", "Categorias de produtos", "Experiência de marca"],
    previewImage: "/catalogo/pr-perfumaria-produto.png",
    previewAlt: "Imagem real de produto da PR Perfumaria",
    previewKind: "ambiente",
  },
  "site-dama-de-ferro": {
    audience: "Marcas e negócios que precisam de presença digital",
    highlights: ["Apresentação da marca", "Conteúdo institucional", "Contato comercial"],
    previewImage: "/catalogo/dama-de-ferro.jpg",
    previewAlt: "Imagem real do projeto Dama de Ferro",
    previewKind: "ambiente",
  },
  "site-vanmarte": {
    audience: "Empresas que precisam apresentar seus serviços online",
    highlights: ["Página comercial", "Informações de contato", "Estrutura pronta para evolução"],
  },
};
