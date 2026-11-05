import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalPages?: number | null;
  hasNextPage?: boolean;
  buildHref?: (page: number) => string;
}

export function Pagination({
  currentPage,
  totalPages,
  hasNextPage,
  buildHref,
}: PaginationProps) {
  const prevDisabled = currentPage <= 1;
  const nextDisabled =
    hasNextPage === false || (typeof totalPages === "number" ? currentPage >= totalPages : false);

  const prevPage = Math.max(1, currentPage - 1);
  const nextPage = currentPage + 1;

  if (prevDisabled && nextDisabled) return null;

  return (
    <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border-2 border-black bg-card p-4 shadow-brutal">
      <div className="flex items-center gap-2">
        <span className="rounded-lg border-2 border-black bg-black px-3 py-1 text-xs font-black uppercase tracking-wider text-brand-yellow shadow-[2px_2px_0px_0px_#000]">
          Halaman {currentPage}
        </span>
        {totalPages && (
          <span className="text-xs font-bold text-slate-400">
            dari total {totalPages} halaman
          </span>
        )}
      </div>

      <div className="flex items-center gap-2.5">
        <PageButton
          disabled={prevDisabled}
          href={buildHref && !prevDisabled ? buildHref(prevPage) : undefined}
          label="Sebelumnya"
          icon={<ChevronLeft className="h-4 w-4" />}
        />
        <PageButton
          disabled={nextDisabled}
          href={buildHref && !nextDisabled ? buildHref(nextPage) : undefined}
          label="Berikutnya"
          icon={<ChevronRight className="h-4 w-4" />}
          reverse
        />
      </div>
    </div>
  );
}

function PageButton({
  href,
  label,
  disabled,
  icon,
  reverse = false,
}: {
  href?: string;
  label: string;
  disabled?: boolean;
  icon: React.ReactNode;
  reverse?: boolean;
}) {
  if (disabled || !href) {
    return (
      <span className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-xl border-2 border-slate-800 bg-slate-900/60 px-4 py-2 text-xs font-bold text-slate-600">
        {!reverse && icon}
        <span>{label}</span>
        {reverse && icon}
      </span>
    );
  }

  return (
    <Link
      href={href}
      className="btn-brutal inline-flex items-center gap-1.5 rounded-xl bg-card border-black px-4 py-2 text-xs font-black uppercase text-white hover:bg-brand-yellow hover:text-black transition-all"
    >
      {!reverse && icon}
      <span>{label}</span>
      {reverse && icon}
    </Link>
  );
}
