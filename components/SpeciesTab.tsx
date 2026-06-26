"use client";

import { useMemo, useState } from "react";
import { computeAllSpeciesStats, type MarkedSets } from "@/lib/logic";
import { cn, formatSpecies } from "@/lib/utils";
import { type Translations } from "@/lib/i18n";

interface Props {
  marked: MarkedSets;
  t: Translations;
}

type SpFilter = "all" | "pending" | "funcDone" | "fisioDone";

export function SpeciesTab({ marked, t }: Props) {
  const [filter, setFilter] = useState<SpFilter>("all");

  const stats = useMemo(() => computeAllSpeciesStats(marked), [marked]);

  const filtered = useMemo(() => {
    if (filter === "pending")   return stats.filter((s) => !s.func_done || !s.fisio_done);
    if (filter === "funcDone")  return stats.filter((s) => s.func_done);
    if (filter === "fisioDone") return stats.filter((s) => s.fisio_done);
    return stats;
  }, [stats, filter]);

  const totalFuncDone  = stats.filter((s) => s.func_done).length;
  const totalFisioDone = stats.filter((s) => s.fisio_done).length;
  const totalSp        = stats.length;

  const FILTERS: { key: SpFilter; label: string; count: number }[] = [
    { key: "all",       label: t.spAll,       count: totalSp },
    { key: "pending",   label: t.spOnlyPending, count: stats.filter((s) => !s.func_done || !s.fisio_done).length },
    { key: "funcDone",  label: t.spFuncDone,  count: totalFuncDone },
    { key: "fisioDone", label: t.spFisioDone, count: totalFisioDone },
  ];

  return (
    <div className="flex flex-col gap-5">
      {/* Global stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="border border-blue-200 bg-blue-50 rounded-2xl p-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-blue-600 mb-1">
            {t.tagFuncional}
          </p>
          <p className="text-3xl font-light tabular-nums text-blue-700">
            {totalFuncDone}
            <span className="text-base font-normal text-blue-400">/{totalSp}</span>
          </p>
          <p className="text-xs text-blue-500 mt-0.5">{t.statsFuncSp}</p>
        </div>
        <div className="border border-emerald-200 bg-emerald-50 rounded-2xl p-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-emerald-600 mb-1">
            {t.tagFisio}
          </p>
          <p className="text-3xl font-light tabular-nums text-emerald-700">
            {totalFisioDone}
            <span className="text-base font-normal text-emerald-400">/{totalSp}</span>
          </p>
          <p className="text-xs text-emerald-500 mt-0.5">{t.statsFuncSp}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors flex items-center gap-1.5",
              filter === f.key
                ? "bg-[#0a0a0a] text-white border-[#0a0a0a]"
                : "bg-white text-[#555] border-[#e5e5e5] hover:border-[#bbb]"
            )}
          >
            {f.label}
            <span className={cn("text-[10px] tabular-nums rounded px-1",
              filter === f.key ? "bg-white/20 text-white" : "bg-[#f0f0f0] text-[#777]"
            )}>
              {f.count}
            </span>
          </button>
        ))}
      </div>

      {/* Species list */}
      <div className="flex flex-col gap-2.5">
        {filtered.map((sp) => {
          const funcPct  = Math.min(100, Math.round((sp.func_have  / Math.max(1, sp.func_target))  * 100));
          const fisioPct = sp.fisio_total > 0
            ? Math.min(100, Math.round((sp.fisio_have / sp.fisio_total) * 100))
            : 100;

          return (
            <div
              key={sp.sp}
              className="border border-[#e8e8e8] rounded-2xl p-4 flex flex-col gap-3 bg-white"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold italic text-[#0a0a0a] leading-tight">
                  {formatSpecies(sp.sp)}
                </p>
                <div className="flex gap-1.5 shrink-0">
                  {sp.func_done  && <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-700 border border-blue-200">OK</span>}
                  {sp.fisio_done && <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 border border-emerald-200">OK</span>}
                </div>
              </div>

              {/* Funcional bar */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                    <span className="text-[11px] font-semibold text-blue-700">{t.spFunc}</span>
                  </div>
                  <span className="text-[11px] tabular-nums font-semibold text-[#555]">
                    {sp.func_done
                      ? <span className="text-blue-600">{t.progressDone}</span>
                      : <>{sp.func_have}<span className="text-[#bbb] font-normal">/{sp.func_target}</span> — <span className="text-[#999]">faltam {sp.func_need}</span></>
                    }
                  </span>
                </div>
                <div className="w-full h-1.5 bg-blue-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${funcPct}%` }} />
                </div>
              </div>

              {/* Fisiologia bar */}
              {sp.fisio_total > 0 && (
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                      <span className="text-[11px] font-semibold text-emerald-700">{t.spFisio}</span>
                    </div>
                    <span className="text-[11px] tabular-nums font-semibold text-[#555]">
                      {sp.fisio_done
                        ? <span className="text-emerald-600">{t.progressDone}</span>
                        : <>{sp.fisio_have}<span className="text-[#bbb] font-normal">/{sp.fisio_total}</span> — <span className="text-[#999]">faltam {sp.fisio_need}</span></>
                      }
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-emerald-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${fisioPct}%` }} />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
