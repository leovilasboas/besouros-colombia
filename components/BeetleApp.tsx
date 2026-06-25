"use client";

import { useState, useEffect, useMemo } from "react";
import { LookupTab }  from "./LookupTab";
import { SpeciesTab } from "./SpeciesTab";
import { TableTab }   from "./TableTab";
import { T, type Lang } from "@/lib/i18n";
import { DATA } from "@/lib/data";
import { computeGlobalStats } from "@/lib/logic";
import { cn } from "@/lib/utils";

const LS_MARKED = "beetle_photographed_v1";
const LS_LANG   = "beetle_lang_v1";

function loadMarked(): Set<number> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(LS_MARKED);
    return raw ? new Set(JSON.parse(raw) as number[]) : new Set();
  } catch { return new Set(); }
}
function saveMarked(ids: Set<number>) {
  localStorage.setItem(LS_MARKED, JSON.stringify([...ids]));
}

type Tab = "lookup" | "species" | "table";

export function BeetleApp() {
  const [lang, setLang]         = useState<Lang>("pt");
  const [tab, setTab]           = useState<Tab>("lookup");
  const [marked, setMarked]     = useState<Set<number>>(new Set());
  const [hydrated, setHydrated] = useState(false);

  const t = T[lang];

  useEffect(() => {
    setMarked(loadMarked());
    const l = localStorage.getItem(LS_LANG) as Lang | null;
    if (l === "pt" || l === "es") setLang(l);
    setHydrated(true);
  }, []);

  function mark(id: number)   { setMarked((p) => { const n = new Set(p); n.add(id);    saveMarked(n); return n; }); }
  function unmark(id: number) { setMarked((p) => { const n = new Set(p); n.delete(id); saveMarked(n); return n; }); }
  function toggleLang(l: Lang) { setLang(l); localStorage.setItem(LS_LANG, l); }

  const stats = useMemo(() => computeGlobalStats(marked), [marked]);

  const TABS: { key: Tab; label: string }[] = [
    { key: "lookup",  label: t.tabLookup },
    { key: "species", label: t.tabSpecies },
    { key: "table",   label: t.tabTable },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#f8f8f8]">
      {/* Header */}
      <header className="border-b border-[#e8e8e8] bg-white sticky top-0 z-20">
        <div className="max-w-3xl mx-auto px-5 h-14 flex items-center gap-3">
          {/* Title */}
          <span className="text-sm font-bold text-[#0a0a0a] tracking-tight whitespace-nowrap">
            {t.appTitle}
          </span>

          {/* Global mini-stats */}
          {hydrated && (
            <div className="hidden sm:flex items-center gap-2 ml-1">
              <span className="flex items-center gap-1 text-[11px] font-medium text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                {stats.doneSp}/{stats.totalSp}
              </span>
              <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {stats.fisioDone}/{stats.fisioTotal}
              </span>
            </div>
          )}

          {/* Tabs */}
          <div className="flex items-center border border-[#e5e5e5] rounded-lg overflow-hidden ml-auto">
            {TABS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={cn(
                  "px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap",
                  tab === key
                    ? "bg-[#0a0a0a] text-white"
                    : "bg-white text-[#777] hover:text-[#0a0a0a]"
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Lang */}
          <div className="flex items-center border border-[#e5e5e5] rounded-lg overflow-hidden">
            {(["pt", "es"] as const).map((l) => (
              <button
                key={l}
                onClick={() => toggleLang(l)}
                className={cn(
                  "px-2.5 py-1.5 text-xs font-bold uppercase transition-colors",
                  lang === l ? "bg-[#0a0a0a] text-white" : "bg-white text-[#aaa] hover:text-[#0a0a0a]"
                )}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Body */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-5 py-8">
        {tab === "lookup" && (
          <div className="max-w-xl mx-auto">
            <LookupTab marked={marked} onMark={mark} onUnmark={unmark} t={t} />
          </div>
        )}
        {tab === "species" && <SpeciesTab marked={marked} t={t} />}
        {tab === "table"}
        {tab === "table"  && <TableTab  marked={marked} onMark={mark} onUnmark={unmark} t={t} />}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#ececec] py-3 bg-white">
        <div className="max-w-3xl mx-auto px-5">
          <p className="text-[11px] text-[#ccc]">{t.generatedAt} {DATA.generatedAt}</p>
        </div>
      </footer>
    </div>
  );
}
