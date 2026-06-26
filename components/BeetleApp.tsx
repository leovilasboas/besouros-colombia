"use client";

import { useState, useEffect, useMemo } from "react";
import { LookupTab }  from "./LookupTab";
import { SpeciesTab } from "./SpeciesTab";
import { TableTab }   from "./TableTab";
import { T, type Lang } from "@/lib/i18n";
import { DATA } from "@/lib/data";
import { computeGlobalStats, type MarkedSets } from "@/lib/logic";
import { cn } from "@/lib/utils";

const LS_LANG      = "beetle_lang_v1";
const LS_MARKED_V1 = "beetle_photographed_v1"; // legacy key for migration
const LS_FISIO     = "beetle_marked_fisio_v2";
const LS_BOTH      = "beetle_marked_both_v2";

function loadMarkedSets(): MarkedSets {
  if (typeof window === "undefined") return { fisio: new Set(), both: new Set() };
  try {
    const rawFisio = localStorage.getItem(LS_FISIO);
    const rawBoth  = localStorage.getItem(LS_BOTH);
    if (rawFisio !== null || rawBoth !== null) {
      return {
        fisio: rawFisio ? new Set(JSON.parse(rawFisio) as number[]) : new Set(),
        both:  rawBoth  ? new Set(JSON.parse(rawBoth)  as number[]) : new Set(),
      };
    }
    // Migrate v1 marks → treat as "both"
    const rawV1 = localStorage.getItem(LS_MARKED_V1);
    return { fisio: new Set(), both: rawV1 ? new Set(JSON.parse(rawV1) as number[]) : new Set() };
  } catch { return { fisio: new Set(), both: new Set() }; }
}
function saveMarkedSets(sets: MarkedSets) {
  localStorage.setItem(LS_FISIO, JSON.stringify([...sets.fisio]));
  localStorage.setItem(LS_BOTH,  JSON.stringify([...sets.both]));
}

type Tab = "lookup" | "species" | "table";

export function BeetleApp() {
  const [lang, setLang]         = useState<Lang>("pt");
  const [tab, setTab]           = useState<Tab>("lookup");
  const [markedSets, setMarkedSets] = useState<MarkedSets>({ fisio: new Set(), both: new Set() });
  const [hydrated, setHydrated]     = useState(false);

  const t = T[lang];

  useEffect(() => {
    setMarkedSets(loadMarkedSets());
    const l = localStorage.getItem(LS_LANG) as Lang | null;
    if (l === "pt" || l === "es") setLang(l);
    setHydrated(true);
  }, []);

  function markFisio(id: number) {
    setMarkedSets((prev) => {
      const fisio = new Set(prev.fisio); fisio.add(id);
      const next = { ...prev, fisio }; saveMarkedSets(next); return next;
    });
  }
  function markBoth(id: number) {
    setMarkedSets((prev) => {
      const both = new Set(prev.both); both.add(id);
      const next = { ...prev, both }; saveMarkedSets(next); return next;
    });
  }
  function unmark(id: number) {
    setMarkedSets((prev) => {
      const fisio = new Set(prev.fisio); fisio.delete(id);
      const both  = new Set(prev.both);  both.delete(id);
      const next = { fisio, both }; saveMarkedSets(next); return next;
    });
  }
  function toggleLang(l: Lang) { setLang(l); localStorage.setItem(LS_LANG, l); }

  const stats = useMemo(() => computeGlobalStats(markedSets), [markedSets]);

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
            <LookupTab marked={markedSets} onMarkFisio={markFisio} onMarkBoth={markBoth} onUnmark={unmark} t={t} />
          </div>
        )}
        {tab === "species" && <SpeciesTab marked={markedSets} t={t} />}
        {tab === "table"}
        {tab === "table"  && <TableTab  marked={markedSets} onMarkFisio={markFisio} onMarkBoth={markBoth} onUnmark={unmark} t={t} />}
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
