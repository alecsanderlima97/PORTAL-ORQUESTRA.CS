import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://portal.orquestracs.com"),
  title: "Orquestra.cs | Tecnologia completa para sua operação",
  description:
    "Consultoria, infraestrutura, equipamentos, software, sites e automação para operações comerciais, corporativas e industriais.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: "https://portal.orquestracs.com",
    siteName: "Orquestra.cs",
    title: "Orquestra.cs | Tecnologia completa para sua operação",
    description:
      "Consultoria, infraestrutura, equipamentos, software, sites e automação para operações comerciais, corporativas e industriais.",
  },
  twitter: {
    card: "summary",
    title: "Orquestra.cs | Tecnologia completa para sua operação",
    description:
      "Consultoria, infraestrutura, equipamentos, software, sites e automação para operações comerciais, corporativas e industriais.",
  },
  verification: {
    google: "FbVL3rdpZyPilU2AxvTO4kHnYDWInQtMLQNHdeLP28k",
  },
  icons: {
    icon: "/orquestra-app-icon-hermetico-v15.png",
    apple: "/orquestra-app-icon-hermetico-v15.png",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
