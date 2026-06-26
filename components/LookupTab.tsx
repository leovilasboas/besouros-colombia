"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { X, Check, RotateCcw, ArrowRight, Keyboard } from "lucide-react";
import { resolveBeetle, type BeetleRow, type Status, type MarkedSets } from "@/lib/logic";
import { DATA } from "@/lib/data";
import { cn, formatSpecies } from "@/lib/utils";
import { type Translations } from "@/lib/i18n";

// ── Color tokens ────────────────────────────────────────────────────────────
const C = {
  func: {
    header:  "bg-blue-600 text-white",
    tag:     "bg-blue-500/30 text-white",
    badge:   "bg-blue-100 text-blue-700 border border-blue-200",
    bar:     "bg-blue-500",
    barBg:   "bg-blue-100",
    dot:     "bg-blue-500",
    text:    "text-blue-700",
    ring:    "ring-blue-200",
  },
  fisio: {
    header:  "bg-emerald-600 text-white",
    tag:     "bg-emerald-500/30 text-white",
    badge:   "bg-emerald-100 text-emerald-700 border border-emerald-200",
    bar:     "bg-emerald-500",
    barBg:   "bg-emerald-100",
    dot:     "bg-emerald-500",
    text:    "text-emerald-700",
    ring:    "ring-emerald-200",
  },
  both: {
    header:  "bg-[#0a0a0a] text-white",
    tag:     "bg-white/15 text-white",
    bar:     "bg-[#0a0a0a]",
    barBg:   "bg-[#f0f0f0]",
    dot:     "bg-[#0a0a0a]",
    text:    "text-[#0a0a0a]",
    ring:    "ring-gray-200",
  },
  done: {
    header:  "bg-[#f5f5f5] text-[#777]",
    tag:     "bg-[#e8e8e8] text-[#888]",
    bar:     "bg-[#ccc]",
    barBg:   "bg-[#f0f0f0]",
    dot:     "bg-[#ccc]",
    text:    "text-[#888]",
    ring:    "ring-gray-100",
  },
  none: {
    header:  "bg-[#f5f5f5] text-[#aaa]",
    tag:     "bg-[#ebebeb] text-[#aaa]",
    bar:     "bg-[#ddd]",
    barBg:   "bg-[#f0f0f0]",
    dot:     "bg-[#ddd]",
    text:    "text-[#aaa]",
    ring:    "ring-gray-100",
  },
};

interface Props {
  marked: MarkedSets;
  onMarkFisio: (id: number) => void;
  onMarkBoth: (id: number) => void;
  onUnmark: (id: number) => void;
  t: Translations;
}

export function LookupTab({ marked, onMarkFisio, onMarkBoth, onUnmark, t }: Props) {
  const [query, setQuery]     = useState("");
  const [result, setResult]   = useState<BeetleRow | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [justMarked, setJustMarked] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const lookup = useCallback((raw: string) => {
    const id = parseInt(raw, 10);
    if (isNaN(id) || raw.trim() === "") { setResult(null); setNotFound(false); return; }
    const r = resolveBeetle(id, marked);
    if (!r) { setNotFound(true); setResult(null); }
    else     { setNotFound(false); setResult(r); }
  }, [marked]);

  // Re-resolve on mark/unmark
  useEffect(() => { if (query.trim()) lookup(query); }, [marked, lookup, query]);

  // Keyboard: Enter = markBoth (default), Escape = clear
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setQuery(""); setResult(null); setNotFound(false); inputRef.current?.focus(); }
      if (e.key === "Enter" && result && !result.photographed) {
        // Enter always marks as both (fuller action) unless only fisio is possible
        if (result.status === "fisio") onMarkFisio(result.id);
        else onMarkBoth(result.id);
        setJustMarked(true);
        setTimeout(() => setJustMarked(false), 1500);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [result, onMarkFisio, onMarkBoth]);

  function doMarkFisio() {
    if (!result) return;
    onMarkFisio(result.id);
    setJustMarked(true);
    setTimeout(() => setJustMarked(false), 1500);
  }

  function doMarkBoth() {
    if (!result) return;
    onMarkBoth(result.id);
    setJustMarked(true);
    setTimeout(() => setJustMarked(false), 1500);
  }

  // Next beetle in same species not yet photographed for funcional purposes
  const nextInSp: number | null = result
    ? DATA.species[result.sp].ids.find(
        (bid) => bid !== result.id &&
          !(DATA.beetles[String(bid)]?.prePhotographed ?? false) &&
          !marked.both.has(bid)
      ) ?? null
    : null;

  function goNext(id: number) {
    const v = String(id);
    setQuery(v);
    lookup(v);
    setJustMarked(false);
    inputRef.current?.focus();
  }

  const pctFunc  = result ? Math.min(100, Math.round((result.sp_have  / result.sp_target) * 100)) : 0;
  const pctFisio = result ? (result.fisio_total > 0 ? Math.min(100, Math.round((result.fisio_have / result.fisio_total) * 100)) : 100) : 0;

  const statusLabels: Record<Status, string> = {
    both: t.statusBoth, func: t.statusFunc, fisio: t.statusFisio, done: t.statusDone, none: t.statusNone,
  };

  // Photo rows
  type PhotoRow = { num: number; type: string; desc: string; note?: string; funcDot: boolean; fisioDot: boolean };
  const photoRows: Record<"both" | "func" | "fisio", PhotoRow[]> = {
    both: [
      { num: 1, type: t.typeDorsal,  desc: t.descDorsal,  note: t.servesBoth, funcDot: true,  fisioDot: true  },
      { num: 2, type: t.typeVentral, desc: t.descVentral, note: t.servesFunc, funcDot: true,  fisioDot: false },
    ],
    func: [
      { num: 1, type: t.typeDorsal,  desc: t.descDorsal,  funcDot: true,  fisioDot: false },
      { num: 2, type: t.typeVentral, desc: t.descVentral, funcDot: true,  fisioDot: false },
    ],
    fisio: [
      { num: 1, type: t.typeDorsal, desc: t.descDorsal,  funcDot: false, fisioDot: true },
    ],
  };

  const s = result?.status;
  const headerC = s ? C[s] : C.none;

  return (
    <div className="flex flex-col gap-5">
      {/* ── Input */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-semibold text-[#999] uppercase tracking-widest">
            {t.idLabel}
          </label>
          <span className="text-[10px] text-[#ccc] flex items-center gap-1">
            <Keyboard size={10} />
            {t.hintEnter} &nbsp;·&nbsp; {t.hintEsc}
          </span>
        </div>
        <div className="relative">
          <input
            ref={inputRef}
            type="number"
            inputMode="numeric"
            placeholder={t.placeholder}
            value={query}
            onChange={(e) => { setQuery(e.target.value); lookup(e.target.value); }}
            autoFocus
            className={cn(
              "w-full px-4 py-4 text-5xl font-light tracking-tighter rounded-xl border-2 outline-none transition-all bg-white placeholder:text-[#e0e0e0] text-[#0a0a0a]",
              notFound
                ? "border-red-300 ring-2 ring-red-100"
                : result
                  ? s === "func"  ? "border-blue-300 ring-2 ring-blue-100"
                  : s === "fisio" ? "border-emerald-300 ring-2 ring-emerald-100"
                  : s === "both"  ? "border-[#0a0a0a] ring-2 ring-gray-100"
                  : "border-[#e5e5e5]"
                : "border-[#e5e5e5] focus:border-[#0a0a0a] focus:ring-2 focus:ring-gray-100"
            )}
          />
          {query && (
            <button
              onClick={() => { setQuery(""); setResult(null); setNotFound(false); inputRef.current?.focus(); }}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 text-[#bbb] hover:text-[#0a0a0a] transition-colors"
              tabIndex={-1}
            >
              <X size={16} />
            </button>
          )}
        </div>
        {notFound && <p className="text-xs font-medium text-red-500 mt-0.5">{t.notFound}</p>}
      </div>

      {/* ── Result card */}
      {result && (
        <div className="flex flex-col gap-3">
          <div className="rounded-2xl border border-[#e8e8e8] overflow-hidden shadow-sm">

            {/* Status header */}
            <div className={cn("px-5 py-4 flex items-center justify-between gap-3", headerC.header)}>
              <span className="text-base font-semibold tracking-tight">
                {statusLabels[result.status]}
              </span>
              <div className="flex items-center gap-1.5 shrink-0">
                {(result.status === "func" || result.status === "both") && (
                  <span className={cn("text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded", s === "both" ? C.both.tag : C.func.tag)}>
                    {t.tagFuncional}
                  </span>
                )}
                {(result.status === "fisio" || result.status === "both") && (
                  <span className={cn("text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded", s === "both" ? C.both.tag : C.fisio.tag)}>
                    {t.tagFisio}
                  </span>
                )}
                {result.status === "done" && (
                  <Check size={16} className="opacity-60" />
                )}
              </div>
            </div>

            {/* Photo rows */}
            {(result.status === "both" || result.status === "func" || result.status === "fisio") && (
              <div className="px-5 py-4">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[#aaa] mb-3">
                  {t.photosNeeded}
                </p>
                <div className="flex flex-col gap-0">
                  {photoRows[result.status as "both" | "func" | "fisio"].map((row, i, arr) => (
                    <div
                      key={row.type}
                      className={cn("flex items-start gap-3 py-3", i < arr.length - 1 && "border-b border-[#f2f2f2]")}
                    >
                      {/* Number circle */}
                      <span className={cn(
                        "w-6 h-6 rounded-full text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5",
                        result.status === "func"  ? "bg-blue-500"
                      : result.status === "fisio" ? "bg-emerald-500"
                      : "bg-[#0a0a0a]"
                      )}>
                        {row.num}
                      </span>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-[#0a0a0a]">{row.type}</span>
                          <span className="text-xs text-[#888]">{row.desc}</span>
                        </div>
                        {row.note && (
                          <p className="text-[11px] text-[#aaa] mt-0.5 italic">{row.note}</p>
                        )}
                      </div>
                      {/* Color dots showing which parts benefit */}
                      <div className="flex items-center gap-1 shrink-0 mt-1">
                        {row.funcDot  && <span className="w-2 h-2 rounded-full bg-blue-500" title="Funcional" />}
                        {row.fisioDot && <span className="w-2 h-2 rounded-full bg-emerald-500" title="Fisiologia" />}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(result.status === "done" || result.status === "none") && (
              <div className="px-5 py-4">
                <p className="text-sm text-[#aaa]">
                  {result.status === "done"
                    ? result.prePhotographed ? t.prePhotoNote : t.markedLabel
                    : t.noPhotos}
                </p>
              </div>
            )}

            {/* Divider */}
            <div className="border-t border-[#f2f2f2]" />

            {/* Species + Progress */}
            <div className="px-5 py-4 flex flex-col gap-3.5">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[#aaa] mb-0.5">
                  {t.speciesLabel}
                </p>
                <p className="text-sm font-semibold italic text-[#0a0a0a]">
                  {formatSpecies(result.sp)}
                </p>
              </div>

              {/* Funcional progress */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                    <span className="text-xs font-semibold text-blue-700">{t.funcProgress}</span>
                  </div>
                  <span className="text-xs tabular-nums font-semibold text-[#0a0a0a]">
                    {result.sp_done
                      ? <span className="text-blue-600">{t.progressDone}</span>
                      : <>{result.sp_have}<span className="text-[#bbb] font-normal">/{result.sp_target}</span>
                          <span className="text-[#aaa] font-normal ml-1">— faltam {result.sp_need}</span></>
                    }
                  </span>
                </div>
                <div className="w-full h-1.5 bg-blue-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full transition-all duration-300" style={{ width: `${pctFunc}%` }} />
                </div>
              </div>

              {/* Fisiologia progress (only if species has green beetles) */}
              {result.fisio_total > 0 && (
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                      <span className="text-xs font-semibold text-emerald-700">{t.fisioProgress}</span>
                    </div>
                    <span className="text-xs tabular-nums font-semibold text-[#0a0a0a]">
                      {result.fisio_have >= result.fisio_total
                        ? <span className="text-emerald-600">{t.progressDone}</span>
                        : <>{result.fisio_have}<span className="text-[#bbb] font-normal">/{result.fisio_total}</span>
                            <span className="text-[#aaa] font-normal ml-1">— faltam {result.fisio_total - result.fisio_have}</span></>
                      }
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-emerald-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full transition-all duration-300" style={{ width: `${pctFisio}%` }} />
                  </div>
                </div>
              )}
            </div>

            {/* Action */}
            {result.status !== "none" && (
              <>
                <div className="border-t border-[#f2f2f2]" />
                <div className="px-4 py-3.5">
                  {result.prePhotographed ? (
                    <div className="flex items-center gap-2 text-sm text-[#aaa]">
                      <Check size={13} />
                      <span>{t.prePhotoNote}</span>
                    </div>
                  ) : result.markedByUser ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm font-semibold text-[#0a0a0a]">
                        <Check size={14} className="text-emerald-500" />
                        {result.markedAsFisio ? t.markedLabelFisio : t.markedLabelBoth}
                      </div>
                      <button
                        onClick={() => onUnmark(result.id)}
                        className="flex items-center gap-1.5 text-xs text-[#999] hover:text-[#0a0a0a] border border-[#e5e5e5] hover:border-[#bbb] px-3 py-1.5 rounded-lg transition-colors"
                      >
                        <RotateCcw size={11} />
                        {t.undoBtn}
                      </button>
                    </div>
                  ) : result.status === "both" ? (
                    /* Two buttons: user chooses if this beetle serves for funcional or not */
                    <div className="flex gap-2">
                      <button
                        onClick={doMarkFisio}
                        className="flex-1 flex items-center justify-center gap-2 text-white text-sm font-semibold py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 transition-all active:scale-[0.98]"
                      >
                        <Check size={15} />
                        {t.markBtnFisioOnly}
                      </button>
                      <button
                        onClick={doMarkBoth}
                        className="flex-1 flex items-center justify-center gap-2 text-white text-sm font-semibold py-3 rounded-xl bg-[#0a0a0a] hover:bg-[#222] transition-all active:scale-[0.98]"
                      >
                        <Check size={15} />
                        {t.markBtnFisioBoth}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={result.status === "fisio" ? doMarkFisio : doMarkBoth}
                      className={cn(
                        "w-full flex items-center justify-center gap-2 text-white text-sm font-semibold py-3 rounded-xl transition-all active:scale-[0.98]",
                        justMarked ? "bg-emerald-500" :
                        result.status === "func"  ? "bg-blue-600 hover:bg-blue-700" :
                        result.status === "fisio" ? "bg-emerald-600 hover:bg-emerald-700" :
                        "bg-[#0a0a0a] hover:bg-[#222]"
                      )}
                    >
                      <Check size={15} />
                      {justMarked ? t.markedLabel :
                       result.status === "fisio" ? t.markBtnFisioOnly : t.markBtnFisioBoth}
                    </button>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Legend */}
          {(result.status === "both") && (
            <div className="flex items-center gap-4 px-1 text-[11px] text-[#aaa]">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500" />{t.tagFuncional}</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" />{t.tagFisio}</span>
            </div>
          )}

          {/* Next in species */}
          {result.markedByUser && nextInSp !== null && !result.sp_done && (
            <button
              onClick={() => goNext(nextInSp)}
              className="flex items-center justify-between w-full px-4 py-3.5 border-2 border-dashed border-[#e5e5e5] hover:border-[#0a0a0a] rounded-2xl transition-colors group"
            >
              <span className="text-sm text-[#888] group-hover:text-[#0a0a0a] transition-colors">
                {t.nextLabel}
              </span>
              <div className="flex items-center gap-2 text-sm font-bold text-[#0a0a0a]">
                <span className="tabular-nums">{nextInSp}</span>
                <ArrowRight size={14} />
              </div>
            </button>
          )}
        </div>
      )}

      {!result && !notFound && (
        <div className="py-16 text-center">
          <p className="text-sm text-[#d0d0d0]">Digite o ID para consultar</p>
        </div>
      )}
    </div>
  );
}
