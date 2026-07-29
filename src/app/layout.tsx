import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";

/**
 * Manrope no lugar da Geist: mais quente e geométrica, sem o desenho técnico
 * que lia como "console". Carrega os pesos 500–800 porque a hierarquia do
 * produto depende de peso, não só de tamanho — rótulo em 600, valor em 700.
 */
const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Flow",
    template: "%s · Flow",
  },
  description:
    "Gestão financeira empresarial: importe o extrato, categorize e veja a DRE pronta.",
  applicationName: "Flow",
  manifest: "/manifest.webmanifest",
  icons: {
    // `icon.svg` em app/ já é servido automaticamente pelo Next; o apple-touch
    // precisa ser PNG — iOS não aceita SVG para o ícone da tela de início.
    apple: "/apple-icon.png",
  },
  appleWebApp: {
    // Sem isto, "Adicionar à Tela de Início" no iOS abre uma aba comum do
    // Safari, com barra de endereço — não um app instalado.
    capable: true,
    title: "Flow",
    // `black-translucent` deixa a barra de status transparente, desenhando
    // por cima do conteúdo — é o que permite a zona escura do topo se
    // estender de verdade por trás do notch/Dynamic Island, em vez de vazar
    // uma faixa preta acima dela.
    statusBarStyle: "black-translucent",
  },
  other: {
    // O Next só emite a tag moderna `mobile-web-app-capable`. iOS antes da
    // versão 17 só reconhece a variante com prefixo — sem ela, o app abre
    // como aba comum do Safari em vez de instalado.
    "apple-mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: "#2563eb",
  // O app tem barra inferior fixa e uma zona escura no topo: as duas
  // precisam desenhar sob o recorte do aparelho (notch, Dynamic Island, home
  // indicator), não parar antes dele.
  viewportFit: "cover",
  // Zoom por pinça desativado a pedido: instalado como PWA, o Flow deve se
  // comportar como qualquer app nativo, não como uma página que amplia.
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${manrope.variable} antialiased`}>
      <body>{children}</body>
    </html>
  );
}
