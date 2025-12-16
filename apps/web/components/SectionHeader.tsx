interface Props {
  title: string;
  subtitle?: string;
}

export function SectionHeader({ title, subtitle }: Props) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.3em] text-accent">{title}</p>
      {subtitle ? <p className="text-sm text-slate-400">{subtitle}</p> : null}
    </div>
  );
}
