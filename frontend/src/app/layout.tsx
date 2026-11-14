import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "@fontsource-variable/plus-jakarta-sans";
import "leaflet/dist/leaflet.css";
import "./globals.css";
import { Providers } from "@/components/layout/providers";

export const metadata: Metadata = {
  title: { default: "Conecta Educação SLZ", template: "%s · Conecta Educação SLZ" },
  description: "Inteligência territorial, diagnóstico educacional e planejamento pedagógico para a rede municipal de São Luís (demonstração).",
  icons: { icon: "/favicon.svg" },
};
export const viewport: Viewport = { themeColor: "#17407a", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body><Providers>{children}</Providers></body>
    </html>
  );
}
