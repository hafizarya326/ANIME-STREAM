"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

interface Props {
  placeholder: string;
  scope?: "anime" | "manga";
}

export function SearchBar({ placeholder, scope = "anime" }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const pathname = usePathname();
  const [value, setValue] = useState("");

  useEffect(() => {
    setValue(params.get("q") ?? "");
  }, [params]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;
    const search = new URLSearchParams(params.toString());
    search.set("q", value.trim());
    search.delete("page");
    const target = scope === "manga" || pathname.startsWith("/manga") ? "/manga" : "/";
    const query = search.toString();
    router.push(query ? `${target}?${query}` : target);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-900/70 px-4 py-2"
    >
      <input
        className="flex-1 bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <button
        type="submit"
        className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white shadow-card transition hover:-translate-y-0.5 hover:shadow-lg"
      >
        Search
      </button>
    </form>
  );
}
