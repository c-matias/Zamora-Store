import type { Metadata, Viewport } from "next";
import "./globals.css";
import { siteConfig } from "@/lib/config";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: { default: `${siteConfig.name} — Eletrónica recondicionada por encomenda`, template: `%s | ${siteConfig.name}` },
  description: "Equipamentos selecionados na Europa, disponíveis por encomenda e entregues em Portugal e Angola.",
  openGraph: { type: "website", locale: "pt_PT", siteName: siteConfig.name },
  alternates: { canonical: "/" },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#10264A" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-PT">
      <body className="font-sans">{children}</body>
    </html>
  );
}
