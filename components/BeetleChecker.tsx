"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { X, Check, RotateCcw, ArrowRight } from "lucide-react";
import { DATA } from "@/lib/data";
import { cn, formatSpecies } from "@/lib/utils";

// ─── i18n ─────────────────────────────────────────────────────────────────────

type Lang = "pt" | "es";

const T = {
  pt: {
    title: "Besouros Colômbia",
    subtitle: "Gestão de fotografia",
    idLabel: "ID do indivíduo",
    placeholder: "Ex: 798",
    notFound: "ID não encontrado",
    speciesLabel: "Espécie",
    photosNeeded: "Fotos necessárias",
    noPhotos: "Nenhuma foto necessária",
    typeDorsal: "Dorsal",
    typeVentral: "Ventral",
    descDorsal: "foto de cima — pronoto",
    descVentral: "foto de baixo — patas",
    tagFuncional: "Funcional",
    tagFisio: "Fisiologia",
    tagGreen: "Verde",
    progressLabel: "Progresso funcional",
    progressDone: "Espécie completa",
    markBtn: "Marcar como fotografado",
    markedBtn: "Fotografado",
    undoBtn: "Desfazer",
    prePhotoNote: "Já existe foto na pasta",
    statusDone: "Já fotografado",
    statusNone: "Nenhuma ação necessária",
    statusFisio: "Somente fisiologia",
    statusFunc: "Funcional",
    statusBoth: "Funcional + Fisiologia",
    statsOf: "de",
    statsSp: "espécies",
    statsInd: "indivíduos",
    emptyHint: "Digite um ID para ver o que fotografar",
    nextSuggestion: "Próximo desta espécie",
    generatedAt: "Dados de",
  },
  es: {
    title: "Escarabajos Colombia",
    subtitle: "Gestión de fotografía",
    idLabel: "ID del individuo",
    placeholder: "Ej: 798",
    notFound: "ID no encontrado",
    speciesLabel: "Especie",
    photosNeeded: "Fotos necesarias",
    noPhotos: "Sin fotos necesarias",
    typeDorsal: "Dorsal",
    typeVentral: "Ventral",
    descDorsal: "foto desde arriba — pronoto",
    descVentral: "foto desde abajo — patas",
    tagFuncional: "Funcional",
    tagFisio: "Fisiología",
    tagGreen: "Verde",
    progressLabel: "Progreso funcional",
    progressDone: "Especie completa",
    markBtn: "Marcar como fotografiado",
    markedBtn: "Fotografiado",
    undoBtn: "Deshacer",
    prePhotoNote: "Ya existe foto en la carpeta",
    statusDone: "Ya fotografiado",
    statusNone: "Sin acción necesaria",
    statusFisio: "Solo fisiología",
    statusFunc: "Funcional",
    statusBoth: "Funcional + Fisiología",
    statsOf: "de",
    statsSp: "especies",
    statsInd: "individuos",
    emptyHint: "Ingrese un ID para ver qué fotografiar",
    nextSuggestion: "Siguiente de esta especie",
    generatedAt: "Datos de",
  },
} as const;

// ─── localStorage ──────────────────────────────────────────────────────────────

const LS_KEY = "beetle_photographed_v1";
const LS_LANG = "beetle_lang_v1";

function loadMarked(): Set<number> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? new Set(JSON.parse(raw) as number[]) : new Set();
  } catch {
    return new Set();
  }
}

function saveMarked(ids: Set<number>) {
  localStorage.setItem(LS_KEY, JSON.stringify([...ids]));
}

// ─── Logic ────────────────────────────────────────────────────────────────────

type Status = "done" | "both" | "func" | "fisio" | "none";

function isPhotographed(id: number, marked: Set<number>): boolean {
  return (DATA.beetles[String(id)]?.prePhotographed ?? false) || marked.has(id);
}

function computeSpecies(sp: string, marked: Set<number>) {
  const s = DATA.species[sp];
  const haveCount = s.ids.filter((id) => isPhotographed(id, marked)).length;
  const need = Math.max(0, s.target - haveCount);
  const unphoto = s.ids.filter((id) => !isPhotographed(id, marked));
  const targeted = new Set(unphoto.slice(0, need));
  return { haveCount, need, target: s.target, total: s.total, targeted, done: need === 0 };
}

interface BeetleResult {
  id: number;
  sp: string;
  green: boolean;
  prePhotographed: boolean;
  markedByUser: boolean;
  status: Status;
  sp_have: number;
  sp_target: number;
  sp_total: number;
  sp_done: boolean;
  nextInSp: number | null;
}

function resolve(id: number, marked: Set<number>): BeetleResult | null {
  const entry = DATA.beetles[String(id)];
  if (!entry) return null;

  const prePhotographed = entry.prePhotographed;
  const markedByUser = marked.has(id);
  const photographed = prePhotographed || markedByUser;

  const spState = computeSpecies(entry.sp, marked);
  const funcional = !photographed && spState.targeted.has(id);
  const fisio = entry.green;

  let status: Status;
  if (photographed) status = "done";
  else if (funcional && fisio) status = "both";
  else if (funcional) status = "func";
  else if (fisio) status = "fisio";
  else status = "none";

  // next unphoto in this species after current id
  const sp = DATA.species[entry.sp];
  const unphotoSorted = sp.ids.filter((bid) => bid !== id && !isPhotographed(bid, marked));
  const nextInSp = unphotoSorted.length > 0 ? unphotoSorted[0] : null;

  return {
    id,
    sp: entry.sp,
    green: entry.green,
    prePhotographed,
    markedByUser,
    status,
    sp_have: spState.haveCount,
    sp_target: spState.target,
    sp_total: spState.total,
    sp_done: spState.done,
    nextInSp,
  };
}

// ─── Stats ────────────────────────────────────────────────────────────────────

function computeStats(marked: Set<number>) {
  const totalSp = Object.keys(DATA.species).length;
  const doneSp = Object.values(DATA.species).filter((s) => {
    const haveCount = s.ids.filter((id) => isPhotographed(id, marked)).length;
    return haveCount >= s.target;
  }).length;
  const totalInd = Object.keys(DATA.beetles).length;
  const photoInd = Object.keys(DATA.beetles).filter((id) =>
    isPhotographed(Number(id), marked)
  ).length;
  return { totalSp, doneSp, totalInd, photoInd };
}

// ─── Component ────────────────────────────────────────────────────────────────

export function BeetleChecker() {
  const [lang, setLang] = useState<Lang>("pt");
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<BeetleResult | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [marked, setMarked] = useState<Set<number>>(new Set());
  const [hydrated, setHydrated] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const t = T[lang];

  // hydrate from localStorage
  useEffect(() => {
    setMarked(loadMarked());
    const savedLang = localStorage.getItem(LS_LANG) as Lang | null;
    if (savedLang === "es" || savedLang === "pt") setLang(savedLang);
    setHydrated(true);
  }, []);

  // re-resolve when marked changes
  useEffect(() => {
    if (!hydrated) return;
    const id = parseInt(query, 10);
    if (!isNaN(id) && DATA.beetles[String(id)]) {
      setResult(resolve(id, marked));
    }
  }, [marked, hydrated, query]);

  const lookup = useCallback(
    (raw: string) => {
      const id = parseInt(raw, 10);
      if (isNaN(id) || raw.trim() === "") {
        setResult(null);
        setNotFound(false);
        return;
      }
      const r = resolve(id, marked);
      if (!r) {
        setResult(null);
        setNotFound(true);
      } else {
        setNotFound(false);
        setResult(r);
      }
    },
    [marked]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    lookup(val);
  };

  const handleClear = () => {
    setQuery("");
    setResult(null);
    setNotFound(false);
    inputRef.current?.focus();
  };

  const handleMark = () => {
    if (!result) return;
    const next = new Set(marked);
    next.add(result.id);
    setMarked(next);
    saveMarked(next);
  };

  const handleUnmark = () => {
    if (!result) return;
    const next = new Set(marked);
    next.delete(result.id);
    setMarked(next);
    saveMarked(next);
  };

  const handleLang = (l: Lang) => {
    setLang(l);
    localStorage.setItem(LS_LANG, l);
  };

  const handleNext = (id: number) => {
    const val = String(id);
    setQuery(val);
    lookup(val);
    inputRef.current?.focus();
  };

  const stats = useMemo(() => computeStats(marked), [marked]);

  // ── Labels
  const statusLabel: Record<Status, string> = {
    done: t.statusDone,
    both: t.statusBoth,
    func: t.statusFunc,
    fisio: t.statusFisio,
    none: t.statusNone,
  };

  const photos: Record<"both" | "func" | "fisio", { type: string; desc: string }[]> = {
    both: [
      { type: t.typeDorsal, desc: t.descDorsal },
      { type: t.typeVentral, desc: t.descVentral },
    ],
    func: [
      { type: t.typeDorsal, desc: t.descDorsal },
      { type: t.typeVentral, desc: t.descVentral },
    ],
    fisio: [{ type: t.typeDorsal, desc: t.descDorsal }],
  };

  const pct = result
    ? Math.min(100, Math.round((result.sp_have / result.sp_target) * 100))
    : 0;

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* ── Header */}
      <header className="border-b border-[#e5e5e5]">
        <div className="max-w-xl mx-auto px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold tracking-tight text-[#0a0a0a]">
              {t.title}
            </span>
            <span className="text-xs text-[#999] hidden sm:block">{t.subtitle}</span>
          </div>
          <div className="flex items-center gap-3">
            {/* Stats */}
            {hydrated && (
              <span className="text-xs text-[#999] hidden sm:block">
                {stats.doneSp}/{stats.totalSp} {t.statsSp} &middot;{" "}
                {stats.photoInd}/{stats.totalInd} {t.statsInd}
              </span>
            )}
            {/* Lang toggle */}
            <div className="flex items-center border border-[#e5e5e5] rounded-md overflow-hidden">
              <button
                onClick={() => handleLang("pt")}
                className={cn(
                  "px-2.5 py-1 text-xs font-medium transition-colors",
                  lang === "pt"
                    ? "bg-[#0a0a0a] text-white"
                    : "bg-white text-[#666] hover:text-[#0a0a0a]"
                )}
              >
                PT
              </button>
              <button
                onClick={() => handleLang("es")}
                className={cn(
                  "px-2.5 py-1 text-xs font-medium transition-colors",
                  lang === "es"
                    ? "bg-[#0a0a0a] text-white"
                    : "bg-white text-[#666] hover:text-[#0a0a0a]"
                )}
              >
                ES
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ── Main */}
      <main className="flex-1 max-w-xl mx-auto w-full px-5 py-10 flex flex-col gap-6">
        {/* Input */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-[#666] uppercase tracking-widest">
            {t.idLabel}
          </label>
          <div className="relative">
            <input
              ref={inputRef}
              type="number"
              inputMode="numeric"
              placeholder={t.placeholder}
              value={query}
              onChange={handleChange}
              autoFocus
              className={cn(
                "w-full px-4 py-4 text-4xl font-light tracking-tight",
                "border rounded-lg outline-none transition-all bg-white",
                "placeholder:text-[#d4d4d4] text-[#0a0a0a]",
                notFound
                  ? "border-[#0a0a0a] ring-1 ring-[#0a0a0a]"
                  : "border-[#e5e5e5] focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a]"
              )}
            />
            {query && (
              <button
                onClick={handleClear}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-[#bbb] hover:text-[#0a0a0a] transition-colors"
                tabIndex={-1}
              >
                <X size={16} />
              </button>
            )}
          </div>
          {notFound && (
            <p className="text-xs text-[#0a0a0a] font-medium mt-0.5">{t.notFound}</p>
          )}
        </div>

        {/* Result */}
        {result && (
          <div className="flex flex-col gap-3 animate-in fade-in duration-150">
            {/* Status header */}
            <div className="flex items-center justify-between">
              <span
                className={cn(
                  "text-[11px] font-semibold uppercase tracking-widest px-2.5 py-1 rounded",
                  result.status === "done" || result.status === "none"
                    ? "bg-[#f5f5f5] text-[#666]"
                    : "bg-[#0a0a0a] text-white"
                )}
              >
                {statusLabel[result.status]}
              </span>
              <div className="flex gap-1.5">
                {result.green && (
                  <span className="text-[11px] font-medium px-2.5 py-1 rounded border border-[#e5e5e5] text-[#555]">
                    {t.tagGreen}
                  </span>
                )}
                {(result.status === "func" || result.status === "both") && (
                  <span className="text-[11px] font-medium px-2.5 py-1 rounded border border-[#e5e5e5] text-[#555]">
                    {t.tagFuncional}
                  </span>
                )}
                {(result.status === "fisio" || result.status === "both") && (
                  <span className="text-[11px] font-medium px-2.5 py-1 rounded border border-[#e5e5e5] text-[#555]">
                    {t.tagFisio}
                  </span>
                )}
              </div>
            </div>

            {/* Main card */}
            <div className="border border-[#e5e5e5] rounded-xl overflow-hidden">
              {/* Photo instructions */}
              {(result.status === "both" ||
                result.status === "func" ||
                result.status === "fisio") && (
                <div className="p-5 flex flex-col gap-0">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-[#999] mb-3">
                    {t.photosNeeded}
                  </p>
                  {photos[result.status as "both" | "func" | "fisio"].map((p, i) => (
                    <div
                      key={p.type}
                      className={cn(
                        "flex items-center justify-between py-3",
                        i < photos[result.status as "both" | "func" | "fisio"].length - 1 &&
                          "border-b border-[#f0f0f0]"
                      )}
                    >
                      <span className="text-base font-semibold text-[#0a0a0a]">
                        {p.type}
                      </span>
                      <span className="text-sm text-[#777]">{p.desc}</span>
                    </div>
                  ))}
                </div>
              )}

              {(result.status === "done" || result.status === "none") && (
                <div className="p-5">
                  <p className="text-sm text-[#777]">
                    {result.status === "done"
                      ? result.prePhotographed
                        ? t.prePhotoNote
                        : t.markedBtn
                      : t.noPhotos}
                  </p>
                </div>
              )}

              {/* Divider */}
              <div className="border-t border-[#f0f0f0]" />

              {/* Species info */}
              <div className="p-5 flex flex-col gap-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-[#999] mb-1">
                      {t.speciesLabel}
                    </p>
                    <p className="text-sm font-medium text-[#0a0a0a] italic">
                      {formatSpecies(result.sp)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-[#999] mb-1">
                      {t.progressLabel}
                    </p>
                    <p className="text-sm font-semibold text-[#0a0a0a] tabular-nums">
                      {result.sp_have}
                      <span className="font-normal text-[#999]">/{result.sp_target}</span>
                    </p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="flex flex-col gap-1.5">
                  <div className="w-full h-1.5 bg-[#f0f0f0] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#0a0a0a] rounded-full transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  {result.sp_done && (
                    <p className="text-[11px] text-[#22c55e] font-medium">
                      {t.progressDone}
                    </p>
                  )}
                </div>
              </div>

              {/* Actions */}
              {result.status !== "none" && (
                <>
                  <div className="border-t border-[#f0f0f0]" />
                  <div className="p-4 flex items-center gap-2">
                    {result.prePhotographed ? (
                      <div className="flex items-center gap-2 text-sm text-[#999]">
                        <Check size={14} />
                        <span>{t.prePhotoNote}</span>
                      </div>
                    ) : result.markedByUser ? (
                      <>
                        <div className="flex items-center gap-2 text-sm font-medium text-[#0a0a0a]">
                          <Check size={14} />
                          <span>{t.markedBtn}</span>
                        </div>
                        <button
                          onClick={handleUnmark}
                          className="ml-auto flex items-center gap-1.5 text-xs text-[#999] hover:text-[#0a0a0a] transition-colors py-1.5 px-3 rounded border border-[#e5e5e5] hover:border-[#ccc]"
                        >
                          <RotateCcw size={11} />
                          {t.undoBtn}
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={handleMark}
                        className="w-full flex items-center justify-center gap-2 bg-[#0a0a0a] hover:bg-[#222] text-white text-sm font-medium py-2.5 px-4 rounded-lg transition-colors"
                      >
                        <Check size={14} />
                        {t.markBtn}
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Next suggestion */}
            {result.markedByUser && result.nextInSp !== null && !result.sp_done && (
              <button
                onClick={() => handleNext(result.nextInSp!)}
                className="flex items-center justify-between w-full px-4 py-3 border border-[#e5e5e5] rounded-xl text-sm hover:border-[#0a0a0a] transition-colors group"
              >
                <span className="text-[#555] group-hover:text-[#0a0a0a] transition-colors">
                  {t.nextSuggestion}
                </span>
                <div className="flex items-center gap-2 font-semibold text-[#0a0a0a]">
                  <span className="tabular-nums">{result.nextInSp}</span>
                  <ArrowRight size={14} />
                </div>
              </button>
            )}
          </div>
        )}

        {/* Empty state */}
        {!result && !notFound && (
          <div className="flex flex-col items-center justify-center py-20 gap-2 text-center">
            <p className="text-[#ccc] text-sm">{t.emptyHint}</p>
          </div>
        )}
      </main>

      {/* ── Footer */}
      <footer className="border-t border-[#f0f0f0] py-4">
        <div className="max-w-xl mx-auto px-5 flex items-center justify-between">
          <p className="text-[11px] text-[#bbb]">
            {t.generatedAt} {DATA.generatedAt}
          </p>
          {hydrated && (
            <p className="text-[11px] text-[#bbb] sm:hidden">
              {stats.doneSp}/{stats.totalSp} {t.statsSp}
            </p>
          )}
        </div>
      </footer>
    </div>
  );
}
