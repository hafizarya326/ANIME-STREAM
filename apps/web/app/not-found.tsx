import Link from "next/link";

export default function NotFound() {
  return (
    <div className="glass rounded-3xl p-8 text-center">
      <h2 className="text-2xl font-bold text-white">Halaman tidak ditemukan</h2>
      <p className="mt-3 text-sm text-slate-400">ID yang kamu cari tidak tersedia.</p>
      <div className="mt-4 flex justify-center gap-3">
        <Link
          href="/"
          className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-card transition hover:-translate-y-0.5 hover:shadow-lg"
        >
          Kembali ke beranda
        </Link>
        <Link
          href="/manga"
          className="rounded-full border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:-translate-y-0.5 hover:border-primary"
        >
          Lihat Manga
        </Link>
      </div>
    </div>
  );
}
