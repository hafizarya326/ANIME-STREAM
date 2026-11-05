import React from "react";

interface ChipProps {
  label: string;
  active?: boolean;
  onClick?: () => void;
  className?: string;
  color?: "yellow" | "cyan" | "purple" | "neutral";
}

export function Chip({
  label,
  active = false,
  onClick,
  className = "",
  color = "neutral",
}: ChipProps) {
  const isClickable = Boolean(onClick);

  const colorStyles = {
    yellow: active
      ? "bg-brand-yellow text-black border-black shadow-[2px_2px_0px_0px_#000000]"
      : "bg-card text-slate-300 border-card-border hover:border-brand-yellow hover:text-white",
    cyan: active
      ? "bg-brand-cyan text-black border-black shadow-[2px_2px_0px_0px_#000000]"
      : "bg-card text-slate-300 border-card-border hover:border-brand-cyan hover:text-white",
    purple: active
      ? "bg-brand-purple text-white border-black shadow-[2px_2px_0px_0px_#000000]"
      : "bg-card text-slate-300 border-card-border hover:border-brand-purple hover:text-white",
    neutral: active
      ? "bg-white text-black border-black shadow-[2px_2px_0px_0px_#000000]"
      : "bg-card text-slate-300 border-card-border hover:border-slate-500 hover:text-white",
  };

  const Component = isClickable ? "button" : "span";

  return (
    <Component
      type={isClickable ? "button" : undefined}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-lg border-2 px-3 py-1 text-xs font-bold transition-all duration-150 ${
        colorStyles[color]
      } ${
        isClickable
          ? "cursor-pointer active:translate-x-0.5 active:translate-y-0.5"
          : ""
      } ${className}`}
    >
      {label}
    </Component>
  );
}
