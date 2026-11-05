import React from "react";

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  badge?: string;
  action?: React.ReactNode;
}

export function SectionHeader({
  title,
  subtitle,
  badge,
  action,
}: SectionHeaderProps) {
  return (
    <div className="flex flex-col gap-2 border-b-2 border-card-border pb-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-1">
        <div className="flex items-center gap-2.5">
          <div className="h-4 w-2 rounded-sm bg-brand-yellow shadow-[2px_2px_0px_0px_#000000]" />
          {badge && (
            <span className="rounded border-2 border-black bg-brand-cyan px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-black shadow-[2px_2px_0px_0px_#000000]">
              {badge}
            </span>
          )}
          <h2 className="text-xl font-black uppercase tracking-tight text-white sm:text-2xl">
            {title}
          </h2>
        </div>
        {subtitle && (
          <p className="pl-4 text-xs font-medium text-slate-400 sm:text-sm">
            {subtitle}
          </p>
        )}
      </div>
      {action && <div className="sm:self-end">{action}</div>}
    </div>
  );
}
