import Link from "next/link";
import { Zap, Heart, ShieldCheck, Film, ExternalLink } from "lucide-react";
import { SOURCES } from "../lib/api";

export function SiteFooter() {
  return (
    <footer className="mt-16 rounded-3xl border-3 border-black bg-card p-6 sm:p-8 shadow-brutal-lg">
      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {/* Brand */}
        <div className="space-y-3 sm:col-span-2">
          <div className="flex items-center gap-2.5">
            <div className="grid h-8 w-8 place-items-center rounded-xl border-2 border-black bg-brand-yellow text-black shadow-brutal-sm">
              <Zap className="h-4 w-4 fill-black" />
            </div>
            <span className="text-lg font-black uppercase tracking-wider text-white">
              ANIME<span className="text-brand-yellow">-</span>STREAM
            </span>
          </div>
          <p className="text-xs leading-relaxed text-slate-400 max-w-md">
            Platform streaming anime berbasis Neo-Brutalist Dark UI dengan integrasi multi-source Express BFF. Menikmati tontonan berkualitas tinggi dengan player responsif, mirror switcher, dan subtitle Indonesia.
          </p>
          <div className="flex items-center gap-2 pt-1 text-xs font-bold text-slate-400">
            <ShieldCheck className="h-4 w-4 text-brand-cyan" />
            <span>Multi-Source Resilient Architecture</span>
          </div>
        </div>

        {/* Upstream Providers */}
        <div className="space-y-3">
          <h4 className="text-xs font-black uppercase tracking-wider text-brand-yellow">
            Sumber Upstream
          </h4>
          <ul className="space-y-2 text-xs font-semibold text-slate-300">
            {SOURCES.map((source) => (
              <li key={source.id}>
                <Link
                  href={`/?source=${source.id}`}
                  className="inline-flex items-center gap-1.5 transition-colors hover:text-brand-yellow"
                >
                  <Film className="h-3.5 w-3.5 text-brand-cyan" />
                  <span>{source.label}</span>
                  <span className="rounded bg-black px-1.5 py-0.2 text-[9px] font-black uppercase text-slate-400">
                    {source.badge}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Tech Stack */}
        <div className="space-y-3">
          <h4 className="text-xs font-black uppercase tracking-wider text-brand-cyan">
            Teknologi
          </h4>
          <ul className="space-y-1.5 text-xs text-slate-400 font-medium">
            <li>Next.js 14 App Router</li>
            <li>Express BFF Proxy</li>
            <li>HLS.js & Native MP4 Stream</li>
            <li>Tailwind Neo-Brutalist Tokens</li>
          </ul>
        </div>
      </div>

      <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t-2 border-black/80 pt-6 text-xs font-medium text-slate-500 sm:flex-row">
        <p>
          © {new Date().getFullYear()} ANIME-STREAM. Dikembangkan untuk keperluan eksperimen antarmuka streaming.
        </p>
        <p className="inline-flex items-center gap-1">
          Dibuat dengan <Heart className="h-3.5 w-3.5 text-rose-500 fill-rose-500" /> & Neo-Brutalism
        </p>
      </div>
    </footer>
  );
}
