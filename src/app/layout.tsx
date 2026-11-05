import type { Metadata, Viewport } from "next";
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
    icon: [
      { url: "/orquestra-favicon-48.png", sizes: "48x48", type: "image/png" },
      { url: "/orquestra-app-icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/orquestra-apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
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
