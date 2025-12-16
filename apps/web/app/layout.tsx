import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import "../styles/globals.css";
import { SiteHeader } from "../components/SiteHeader";
import { SiteFooter } from "../components/SiteFooter";

const font = Space_Grotesk({ subsets: ["latin"], variable: "--font-display" });

export const metadata: Metadata = {
  title: "AniManga Hub",
  description: "Temukan anime dan manga favoritmu dengan tampilan modern.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={font.variable}>
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:py-10">
          <SiteHeader />
          <main className="mt-6 space-y-10">{children}</main>
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
