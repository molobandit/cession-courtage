import type { Metadata } from "next";
import { IBM_Plex_Sans, Source_Serif_4 } from "next/font/google";
import "./globals.css";
import { MemberChrome } from "@/components/app/member-chrome";
import { legalIdentityIncomplete } from "@/lib/legal/entity";
import { siteUrl, BRAND_NAME } from "@/lib/site";

const sans = IBM_Plex_Sans({
  variable: "--font-ibm-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const serif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
  weight: ["600", "700"],
});

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: `${BRAND_NAME} · cession de portefeuilles de courtage`,
    template: `%s · ${BRAND_NAME}`,
  },
  description:
    "Place de marché B2B pour la cession de portefeuilles de courtage d'assurance entre professionnels ORIAS.",
  // Ceinture et bretelles : robots.txt peut etre ignore, la balise non. Elle
  // disparait d'elle-meme quand l'identite legale est renseignee.
  robots: legalIdentityIncomplete() ? { index: false, follow: false } : undefined,
  icons: {
    icon: "/brand/mark.png",
    apple: "/brand/mark.png",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body className={`${sans.variable} ${serif.variable} min-h-screen bg-page text-ink antialiased`}>
        <MemberChrome>{children}</MemberChrome>
      </body>
    </html>
  );
}
