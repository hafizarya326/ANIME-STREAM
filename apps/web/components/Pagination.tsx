import Link from "next/link";

interface Props {
  currentPage: number;
  totalPages?: number | null;
  hasNextPage?: boolean;
  buildHref?: (page: number) => string;
}

export function Pagination({ currentPage, totalPages, hasNextPage, buildHref }: Props) {
  const prevDisabled = currentPage <= 1;
  const nextDisabled =
    hasNextPage === false || (typeof totalPages === "number" ? currentPage >= totalPages : false);

  const prevPage = Math.max(1, currentPage - 1);
  const nextPage = currentPage + 1;

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800/70 bg-slate-900/60 px-4 py-3 text-sm text-slate-200">
      <div>
        Halaman {currentPage}
        {totalPages ? ` dari ${totalPages}` : ""}
      </div>
      <div className="flex items-center gap-2">
        <PageButton
          disabled={prevDisabled}
          href={buildHref && !prevDisabled ? buildHref(prevPage) : undefined}
          label="Sebelumnya"
        />
        <PageButton
          disabled={nextDisabled}
          href={buildHref && !nextDisabled ? buildHref(nextPage) : undefined}
          label="Selanjutnya"
        />
      </div>
    </div>
  );
}

const PageButton = ({ href, label, disabled }: { href?: string; label: string; disabled?: boolean }) => {
  const base =
    "rounded-full border px-4 py-2 text-xs font-semibold transition hover:-translate-y-0.5 hover:border-primary hover:text-white";
  if (disabled || !href) {
    return <span className={`${base} cursor-not-allowed border-slate-800 text-slate-500`}>{label}</span>;
  }
  return (
    <Link href={href} className={base}>
      {label}
    </Link>
  );
};
