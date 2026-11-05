import React from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

interface ErrorStateProps {
  title?: string;
  message: string;
  action?: React.ReactNode;
  onRetry?: () => void;
}

export function ErrorState({
  title = "Terjadi Kendala",
  message,
  action,
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="relative overflow-hidden rounded-3xl border-3 border-black bg-card p-8 text-center shadow-brutal-lg sm:p-12">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-black bg-brand-coral text-white shadow-brutal">
        <AlertTriangle className="h-8 w-8" />
      </div>

      <h3 className="mt-6 text-xl font-black uppercase tracking-tight text-white sm:text-2xl">
        {title}
      </h3>

      <p className="mx-auto mt-2 max-w-md text-sm font-medium leading-relaxed text-slate-300">
        {message}
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        {onRetry && (
          <button
            onClick={onRetry}
            className="btn-brutal inline-flex items-center gap-2 rounded-xl bg-brand-yellow px-5 py-2.5 text-xs font-black uppercase text-black"
          >
            <RefreshCw className="h-4 w-4" />
            Coba Lagi
          </button>
        )}

        <Link
          href="/"
          className="btn-brutal inline-flex items-center gap-2 rounded-xl bg-[#0b0e14] border-black px-5 py-2.5 text-xs font-black uppercase text-white hover:text-brand-yellow"
        >
          <Home className="h-4 w-4" />
          Ke Beranda
        </Link>

        {action}
      </div>
    </div>
  );
}
