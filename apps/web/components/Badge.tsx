interface BadgeProps {
  children: React.ReactNode;
  variant?: "primary" | "secondary";
}

export function Badge({ children, variant = "primary" }: BadgeProps) {
  const classes =
    variant === "primary"
      ? "bg-primary/90 text-white"
      : "bg-slate-800 text-slate-100 border border-slate-700";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${classes}`}>
      {children}
    </span>
  );
}
