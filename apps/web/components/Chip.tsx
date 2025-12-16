export function Chip({ label }: { label: string }) {
  return (
    <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-200 shadow-sm shadow-black/20">
      {label}
    </span>
  );
}
