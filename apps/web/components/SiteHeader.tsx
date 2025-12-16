import Link from "next/link";
import { SearchBar } from "./SearchBar";

export function SiteHeader() {
  return (
    <header className="flex flex-col gap-4 rounded-3xl border border-slate-800/60 bg-slate-900/60 p-5">
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/" className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-primary to-accent text-xl font-black text-white shadow-card">
            AM
          </div>
          <div>
            <p className="text-lg font-bold text-white">AniManga Hub</p>
            <p className="text-xs text-slate-400">Anime & Manga explorer</p>
          </div>
        </Link>
        <div className="flex items-center gap-3 text-sm font-semibold text-slate-300">
          <NavLink href="/" label="Anime" />
          <NavLink href="/manga" label="Manga" />
        </div>
      </div>
      <SearchBar placeholder="Cari anime atau manga..." />
    </header>
  );
}

const NavLink = ({ href, label }: { href: string; label: string }) => (
  <Link
    href={href}
    className="rounded-full border border-transparent px-3 py-1 transition hover:border-primary hover:text-white"
  >
    {label}
  </Link>
);
