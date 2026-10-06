import { Car, Clock3, Factory, HeartHandshake, Scissors, WalletCards } from "lucide-react";

export type DeployedProject = {
  id: string;
  name: string;
  vercelName: string;
  url: string;
  category: string;
  description: string;
  icon: typeof Factory;
  status: "publicado" | "legado" | "tecnico";
};

export const deployedProjects: DeployedProject[] = [
  {
    id: "sistema-serraria",
    name: "Sistema Serraria",
    vercelName: "sistema-serraria",
    url: "https://orquestracs.com",
    category: "Indústria e madeira",
    description: "Sistema operacional para serraria, madeira, estoque e produção.",
    icon: Factory,
    status: "publicado",
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
  },
];
