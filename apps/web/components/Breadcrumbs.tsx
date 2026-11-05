import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

interface Crumb {
  label: string;
  href: string;
}

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav className="flex flex-wrap items-center gap-2 text-xs font-bold">
      <Link
        href="/"
        className="inline-flex items-center gap-1 rounded-lg border-2 border-black bg-card px-2.5 py-1 text-slate-300 shadow-brutal-sm hover:border-brand-yellow hover:text-brand-yellow transition-all"
      >
        <Home className="h-3.5 w-3.5" />
        <span>Beranda</span>
      </Link>

      {items.map((item, idx) => {
        const isLast = idx === items.length - 1;
        return (
          <div key={item.href} className="flex items-center gap-2">
            <ChevronRight className="h-3.5 w-3.5 text-slate-500" />
            {isLast ? (
              <span className="max-w-[200px] truncate rounded-lg border-2 border-black bg-brand-yellow px-2.5 py-1 font-black uppercase text-black shadow-brutal-sm sm:max-w-md">
                {item.label}
              </span>
            ) : (
              <Link
                href={item.href}
                className="max-w-[150px] truncate rounded-lg border-2 border-black bg-card px-2.5 py-1 text-slate-300 shadow-brutal-sm hover:border-brand-yellow hover:text-white transition-all sm:max-w-xs"
              >
                {item.label}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}
