import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "@fontsource/poppins/500.css";
import "@fontsource/poppins/600.css";
import "@fontsource/poppins/700.css";
import "@fontsource/poppins/800.css";
import "leaflet/dist/leaflet.css";
import "./globals.css";
import { Providers } from "@/components/layout/providers";

export const metadata: Metadata = {
  title: { default: "Conecta Educação SLZ", template: "%s · Conecta Educação SLZ" },
  description: "Inteligência territorial, diagnóstico educacional e planejamento pedagógico para a rede municipal de São Luís (demonstração).",
  icons: { icon: "/favicon.svg" },
};
export const viewport: Viewport = { themeColor: "#0d2b4a", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body><Providers>{children}</Providers></body>
    </html>
  );
}
