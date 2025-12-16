import Link from "next/link";

interface Crumb {
  label: string;
  href: string;
}

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
      {items.map((item, idx) => (
        <span key={item.href} className="flex items-center gap-2">
          {idx > 0 && <span className="text-slate-600">/</span>}
          <Link href={item.href} className="hover:text-white hover:underline">
            {item.label}
          </Link>
        </span>
      ))}
    </nav>
  );
}
