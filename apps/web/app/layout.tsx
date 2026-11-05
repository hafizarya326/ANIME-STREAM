import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import "../styles/globals.css";
import { SiteHeader } from "../components/SiteHeader";
import { SiteFooter } from "../components/SiteFooter";

const font = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "ANIME-STREAM | Nonton Anime Sub Indo Neo-Brutalist",
    template: "%s | ANIME-STREAM",
  },
  description:
    "Platform streaming anime Neo-Brutalist modern dengan multi-source upstream (Otakudesu, Kuramanime, Oploverz), player responsif, dan server mirror switching.",
  keywords: [
    "anime stream",
    "nonton anime",
    "anime sub indo",
    "otakudesu",
    "kuramanime",
    "oploverz",
    "neo-brutalist",
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${font.variable} dark`}>
      <body className="min-h-screen bg-[#0B0E14] text-slate-100 font-sans antialiased selection:bg-[#FFE600] selection:text-black">
        <div className="mx-auto max-w-7xl px-3 py-4 sm:px-6 sm:py-8">
          <SiteHeader />
          <main className="mt-8 space-y-10">{children}</main>
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
