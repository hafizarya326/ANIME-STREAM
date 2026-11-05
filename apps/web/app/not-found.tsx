import Link from "next/link";
import { AlertCircle, Home, Zap } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border-3 border-black bg-card p-8 text-center shadow-brutal-xl sm:p-12">
      <div className="grid h-16 w-16 place-items-center rounded-2xl border-3 border-black bg-brand-yellow text-black shadow-brutal mb-4">
        <AlertCircle className="h-8 w-8" />
      </div>
      <span className="rounded-md border-2 border-black bg-brand-cyan px-2.5 py-0.5 text-xs font-black uppercase text-black shadow-[2px_2px_0px_0px_#000]">
        404 Not Found
      </span>
      <h2 className="mt-3 text-2xl font-black uppercase tracking-tight text-white sm:text-3xl">
        Halaman Tidak Ditemukan
      </h2>
      <p className="mt-2 max-w-md text-xs sm:text-sm text-slate-400 font-medium leading-relaxed">
        Halaman, anime, atau episode yang kamu tuju tidak ditemukan atau URL mungkin telah kedaluwarsa.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link
          href="/"
          className="btn-brutal inline-flex items-center gap-2 rounded-xl border-black bg-brand-yellow px-5 py-2.5 text-xs font-black uppercase text-black hover:bg-brand-yellowHover shadow-brutal"
        >
          <Home className="h-4 w-4" />
          <span>Kembali ke Beranda</span>
        </Link>
      </div>
    </div>
  );
}
