"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { Search, X } from "lucide-react";

export function ContactFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const search = searchParams.get("search") || "";
  const source = searchParams.get("source") || "";

  const [searchValue, setSearchValue] = useState(search);

  useEffect(() => {
    setSearchValue(search);
  }, [search]);

  const updateParams = useCallback(
    () => {
      const params = new URLSearchParams(searchParams.toString());
      if (searchValue) {
        params.set("search", searchValue);
      } else {
        params.delete("search");
      }
      const qs = params.toString();
      router.push(`/dashboard/contacts${qs ? `?${qs}` : ""}`);
    },
    [router, searchParams, searchValue]
  );

  useEffect(() => {
    if (searchValue === search) return;
    const timer = setTimeout(updateParams, 300);
    return () => clearTimeout(timer);
  }, [searchValue]);

  const setSource = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set("source", value);
    } else {
      params.delete("source");
    }
    const qs = params.toString();
    router.push(`/dashboard/contacts${qs ? `?${qs}` : ""}`);
  };

  const clearSearch = () => {
    setSearchValue("");
  };

  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search contacts..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background pl-8 pr-4 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        {searchValue && (
          <button
            onClick={clearSearch}
            className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <select
        value={source}
        onChange={(e) => setSource(e.target.value)}
        className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <option value="">All sources</option>
        <option value="cold">Cold</option>
        <option value="referral">Referral</option>
        <option value="inbound">Inbound</option>
      </select>
    </div>
  );
}
