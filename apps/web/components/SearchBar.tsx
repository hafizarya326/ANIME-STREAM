"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Search, X, Loader2 } from "lucide-react";

interface SearchBarProps {
  placeholder?: string;
  className?: string;
}

export function SearchBar({
  placeholder = "Cari judul anime (misal: Naruto, Jujutsu, Solo)...",
  className = "",
}: SearchBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setValue(searchParams.get("q") ?? "");
  }, [searchParams]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    const params = new URLSearchParams(searchParams.toString());

    if (trimmed) {
      params.set("q", trimmed);
      params.set("page", "1");
    } else {
      params.delete("q");
      params.delete("page");
    }

    startTransition(() => {
      const qs = params.toString();
      router.push(qs ? `/?${qs}` : "/");
    });
  };

  const handleClear = () => {
    setValue("");
    const params = new URLSearchParams(searchParams.toString());
    params.delete("q");
    params.delete("page");
    startTransition(() => {
      const qs = params.toString();
      router.push(qs ? `/?${qs}` : "/");
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={`relative flex items-center rounded-xl border-2 border-black bg-card shadow-brutal transition-all focus-within:border-brand-yellow focus-within:shadow-brutal-yellow ${className}`}
    >
      <div className="pl-3.5 text-slate-400">
        <Search className="h-4 w-4" />
      </div>

      <input
        type="text"
        className="w-full bg-transparent px-3 py-2.5 text-sm font-medium text-white placeholder-slate-500 outline-none"
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />

      {value && (
        <button
          type="button"
          onClick={handleClear}
          className="p-1.5 text-slate-400 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="m-1 inline-flex items-center gap-1.5 rounded-lg border-2 border-black bg-brand-yellow px-4 py-1.5 text-xs font-black uppercase text-black transition-all hover:bg-brand-yellowHover active:translate-x-0.5 active:translate-y-0.5"
      >
        {isPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <span>Cari</span>
        )}
      </button>
    </form>
  );
}
