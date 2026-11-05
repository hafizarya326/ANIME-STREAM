import React from "react";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "yellow" | "cyan" | "coral" | "mint" | "dark" | "outline";
  className?: string;
  size?: "sm" | "md";
}

export function Badge({
  children,
  variant = "yellow",
  className = "",
  size = "sm",
}: BadgeProps) {
  const variantStyles = {
    yellow: "bg-brand-yellow text-black border-black shadow-[2px_2px_0px_0px_#000000]",
    cyan: "bg-brand-cyan text-black border-black shadow-[2px_2px_0px_0px_#000000]",
    coral: "bg-brand-coral text-white border-black shadow-[2px_2px_0px_0px_#000000]",
    mint: "bg-brand-mint text-black border-black shadow-[2px_2px_0px_0px_#000000]",
    dark: "bg-card text-slate-200 border-card-border shadow-[2px_2px_0px_0px_#000000]",
    outline: "bg-transparent text-slate-300 border-slate-700",
  };

  const sizeStyles = {
    sm: "px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider",
    md: "px-3 py-1 text-sm font-bold uppercase tracking-wider",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border-2 font-black ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {children}
    </span>
  );
}
