import type { Metadata } from "next";
import ContactCard from "@/components/contact-card";

export const metadata: Metadata = {
  title: "Alecsander Lima | Orquestra.CS",
  description:
    "Contato profissional de Alecsander Lima, fundador da Orquestra.CS. Sistemas, automação, consultoria e tecnologia sob medida para empresas.",
  openGraph: {
    title: "Alecsander Lima | Orquestra.CS",
    description:
      "Sistemas, automação, consultoria e tecnologia sob medida para empresas.",
    url: "https://portal.orquestracs.com/contato",
    images: ["/orquestra-cs-logo-portal-light.png"],
  },
};

export default function ContactPage() {
  return <ContactCard />;
}
