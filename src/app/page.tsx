import { PortalLanding } from "@/components/portal-landing";
import styles from "./holographic-preview.module.css";

export default async function Home({ searchParams }: { searchParams: Promise<{ efeito?: string }> }) {
  const { efeito } = await searchParams;
  return <div className={efeito === "holografico" ? styles.preview : undefined}><PortalLanding /></div>;
}
