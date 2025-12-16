import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "../../../../components/Breadcrumbs";
import { SectionHeader } from "../../../../components/SectionHeader";
import { getChapterDetail } from "../../../../lib/mock";

interface PageProps {
  params: { chapterId: string };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const detail = await getChapterDetail(params.chapterId).catch(() => null);
  if (!detail) return { title: "Chapter tidak ditemukan" };
  return {
    title: `${detail.chapter.title} - ${detail.manga.title} | AniManga Hub`,
    description: `Baca ${detail.chapter.title} secara nyaman.`,
  };
}

export default async function ReadChapterPage({ params }: PageProps) {
  const detail = await getChapterDetail(params.chapterId).catch(() => null);
  if (!detail) return notFound();

  const { chapter, manga, prevChapterId, nextChapterId } = detail;

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Manga", href: "/manga" },
          { label: manga.title, href: `/manga/${manga.id}` },
          { label: chapter.title, href: `/manga/read/${chapter.id}` },
        ]}
      />
      <span className="inline-flex w-fit rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-200">
        Coming soon - Reader masih menggunakan data mock
      </span>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold text-white">{chapter.title}</h1>
        <span className="rounded-full bg-slate-800 px-3 py-1 text-sm text-slate-200">
          {chapter.pages.length} pages
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <NavChip href={prevChapterId ? `/manga/read/${prevChapterId}` : "#"} disabled={!prevChapterId}>
          {"<"} Chapter sebelumnya
        </NavChip>
        <NavChip href={nextChapterId ? `/manga/read/${nextChapterId}` : "#"} disabled={!nextChapterId}>
          Chapter selanjutnya {">"}
        </NavChip>
        <div className="flex items-center gap-2 rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300">
          <span className="rounded-full bg-slate-800 px-2 py-1">Vertical</span>
          <span className="rounded-full bg-slate-800 px-2 py-1">Paginated</span>
          <button className="rounded-full bg-slate-800 px-2 py-1">Zoom +</button>
          <button className="rounded-full bg-slate-800 px-2 py-1">Zoom -</button>
        </div>
        <button className="rounded-full border border-rose-400/50 px-3 py-1 text-xs text-rose-100 hover:bg-rose-500/10">
          Report issue
        </button>
      </div>

      <SectionHeader title="Reader" subtitle="Placeholder halaman bacaan" />
      <div className="flex flex-col gap-4">
        {chapter.pages.map((page) => (
          <div
            key={page}
            className="h-96 w-full rounded-2xl bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800"
          />
        ))}
      </div>
    </div>
  );
}

const NavChip = ({
  href,
  children,
  disabled,
}: {
  href: string;
  children: React.ReactNode;
  disabled?: boolean;
}) => {
  const classes =
    "rounded-full border px-3 py-1 text-xs font-semibold transition hover:-translate-y-0.5";
  if (disabled) {
    return <span className={`${classes} cursor-not-allowed border-slate-800 text-slate-500`}>{children}</span>;
  }
  return (
    <Link href={href} className={`${classes} border-primary text-white hover:shadow-card`}>
      {children}
    </Link>
  );
};
