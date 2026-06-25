"use client";

import { useState, useMemo } from "react";
import { Check, X, Search, ChevronUp, ChevronDown } from "lucide-react";
import { computeAllRows, type BeetleRow, type Status } from "@/lib/logic";
import { cn, formatSpecies } from "@/lib/utils";
import { type Translations } from "@/lib/i18n";

interface Props {
  marked: Set<number>;
  onMark: (id: number) => void;
  onUnmark: (id: number) => void;
  t: Translations;
}

type FilterKey = "all" | "photo" | "pending" | "func" | "fisio";
type SortKey = "id" | "sp" | "status";

const STATUS_BADGE: Record<Status, { label: string; cls: string }> = {
  both:  { label: "Func+Fisio",   cls: "bg-[#0a0a0a] text-white" },
  func:  { label: "Funcional",    cls: "bg-blue-600 text-white" },
  fisio: { label: "Fisiologia",   cls: "bg-emerald-600 text-white" },
  done:  { label: "Fotografado",  cls: "bg-[#f0f0f0] text-[#777]" },
  none:  { label: "—",            cls: "text-[#ccc]" },
};

export function TableTab({ marked, onMark, onUnmark, t }: Props) {
  const [filter, setFilter]   = useState<FilterKey>("all");
  const [spFilter, setSpFilter] = useState<string>("all");
  const [search, setSearch]   = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("id");
  const [sortAsc, setSortAsc] = useState(true);
  const [page, setPage]       = useState(0);
  const PAGE_SIZE = 80;

  const allRows = useMemo(() => computeAllRows(marked), [marked]);
  const allSpecies = useMemo(() => [...new Set(allRows.map((r) => r.sp))].sort(), [allRows]);

  const counts = useMemo(() => ({
    all:     allRows.length,
    photo:   allRows.filter((r) => r.photographed).length,
    pending: allRows.filter((r) => !r.photographed).length,
    func:    allRows.filter((r) => r.status === "func" || r.status === "both").length,
    fisio:   allRows.filter((r) => r.status === "fisio" || r.status === "both").length,
  }), [allRows]);

  const filtered = useMemo(() => {
    let rows = allRows;
    if (filter === "photo")   rows = rows.filter((r) => r.photographed);
    else if (filter === "pending") rows = rows.filter((r) => !r.photographed);
    else if (filter === "func")    rows = rows.filter((r) => r.status === "func" || r.status === "both");
    else if (filter === "fisio")   rows = rows.filter((r) => r.status === "fisio" || r.status === "both");
    if (spFilter !== "all") rows = rows.filter((r) => r.sp === spFilter);
    const q = search.trim().toLowerCase();
    if (q) rows = rows.filter((r) => String(r.id).includes(q) || r.sp.toLowerCase().includes(q));
    return [...rows].sort((a, b) => {
      let cmp = sortKey === "id" ? a.id - b.id : sortKey === "sp" ? a.sp.localeCompare(b.sp) : a.status.localeCompare(b.status);
      return sortAsc ? cmp : -cmp;
    });
  }, [allRows, filter, spFilter, search, sortKey, sortAsc]);

  const paginated  = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  function toggleSort(k: SortKey) {
    if (sortKey === k) setSortAsc((v) => !v); else { setSortKey(k); setSortAsc(true); }
    setPage(0);
  }
  function changeFilter(f: FilterKey) { setFilter(f); setPage(0); }

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey === k ? (sortAsc ? <ChevronUp size={11} /> : <ChevronDown size={11} />) : <span className="w-3 inline-block" />;

  const FILTERS: { key: FilterKey; label: string }[] = [
    { key: "all",     label: t.tblFilterAll },
    { key: "photo",   label: t.tblFilterPhoto },
    { key: "pending", label: t.tblFilterPending },
    { key: "func",    label: t.tblFilterFuncional },
    { key: "fisio",   label: t.tblFilterFisio },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Filters */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => changeFilter(f.key)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors flex items-center gap-1.5",
                filter === f.key
                  ? f.key === "func"  ? "bg-blue-600 text-white border-blue-600"
                  : f.key === "fisio" ? "bg-emerald-600 text-white border-emerald-600"
                  : "bg-[#0a0a0a] text-white border-[#0a0a0a]"
                  : "bg-white text-[#555] border-[#e5e5e5] hover:border-[#bbb]"
              )}
            >
              {f.label}
              <span className={cn("text-[10px] tabular-nums rounded px-1",
                filter === f.key ? "bg-white/20 text-white" : "bg-[#f0f0f0] text-[#777]"
              )}>
                {counts[f.key]}
              </span>
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#ccc]" />
            <input
              type="text"
              placeholder={t.tblSearch}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              className="w-full pl-8 pr-3 py-2 text-sm border border-[#e5e5e5] rounded-lg outline-none focus:border-[#0a0a0a] bg-white placeholder:text-[#ccc]"
            />
          </div>
          <select
            value={spFilter}
            onChange={(e) => { setSpFilter(e.target.value); setPage(0); }}
            className="text-sm border border-[#e5e5e5] rounded-lg px-2.5 py-2 outline-none focus:border-[#0a0a0a] bg-white text-[#555] max-w-[190px]"
          >
            <option value="all">{t.tblFilterSpecies}</option>
            {allSpecies.map((sp) => <option key={sp} value={sp}>{formatSpecies(sp)}</option>)}
          </select>
        </div>
      </div>

      <p className="text-[11px] text-[#aaa]">
        {filtered.length} {t.tblRows}
        {totalPages > 1 && ` — pagina ${page + 1}/${totalPages}`}
      </p>

      {/* Table */}
      <div className="border border-[#e8e8e8] rounded-2xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-[#ccc]">{t.tblEmpty}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-[#e8e8e8] bg-[#fafafa]">
                  {[
                    { key: "id" as SortKey, label: t.tblColId },
                    { key: "sp" as SortKey, label: t.tblColSpecies },
                  ].map(({ key, label }) => (
                    <th key={key} onClick={() => toggleSort(key)}
                      className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-[#aaa] cursor-pointer hover:text-[#0a0a0a] select-none">
                      <span className="flex items-center gap-0.5">{label}<SortIcon k={key} /></span>
                    </th>
                  ))}
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-[#aaa]">{t.tblColGreen}</th>
                  <th onClick={() => toggleSort("status")}
                    className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-[#aaa] cursor-pointer hover:text-[#0a0a0a] select-none">
                    <span className="flex items-center gap-0.5">{t.tblColStatus}<SortIcon k="status" /></span>
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-[#aaa]">{t.tblColSource}</th>
                  <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-widest text-[#aaa]">{t.tblColAction}</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((row, i) => {
                  const badge = STATUS_BADGE[row.status];
                  return (
                    <tr key={row.id} className={cn("border-b border-[#f5f5f5] last:border-0", i % 2 === 1 && "bg-[#fafafa]")}>
                      <td className="px-4 py-2.5 tabular-nums font-semibold text-[#0a0a0a]">{row.id}</td>
                      <td className="px-4 py-2.5 italic text-[#555] text-xs max-w-[180px] truncate">{formatSpecies(row.sp)}</td>
                      <td className="px-4 py-2.5">
                        {row.green
                          ? <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                          : <span className="w-2 h-2 rounded-full bg-[#eee] inline-block" />
                        }
                      </td>
                      <td className="px-4 py-2.5">
                        {row.status === "none"
                          ? <span className="text-xs text-[#ccc]">—</span>
                          : <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide", badge.cls)}>{badge.label}</span>
                        }
                      </td>
                      <td className="px-4 py-2.5 text-xs text-[#aaa]">
                        {row.prePhotographed ? t.tblSourceFolder : row.markedByUser ? t.tblSourceApp : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {row.prePhotographed ? (
                          <span className="text-xs text-[#ccc]">{t.prePhotoNote2}</span>
                        ) : row.markedByUser ? (
                          <button onClick={() => onUnmark(row.id)}
                            className="inline-flex items-center gap-1 text-xs text-[#aaa] hover:text-red-500 border border-[#e5e5e5] hover:border-red-200 px-2.5 py-1 rounded-lg transition-colors">
                            <X size={10} />{t.tblActionRemove}
                          </button>
                        ) : (
                          <button onClick={() => onMark(row.id)}
                            className="inline-flex items-center gap-1 text-xs text-[#555] hover:bg-[#0a0a0a] hover:text-white border border-[#e5e5e5] hover:border-[#0a0a0a] px-2.5 py-1 rounded-lg transition-colors">
                            <Check size={10} />{t.tblActionMark}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}
            className="text-xs px-3 py-1.5 border border-[#e5e5e5] rounded-lg disabled:opacity-30 hover:border-[#0a0a0a] transition-colors">
            Anterior
          </button>
          <span className="text-xs text-[#aaa]">{page + 1} / {totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1}
            className="text-xs px-3 py-1.5 border border-[#e5e5e5] rounded-lg disabled:opacity-30 hover:border-[#0a0a0a] transition-colors">
            Proximo
          </button>
        </div>
      )}
    </div>
  );
}
