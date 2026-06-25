import { DATA } from "./data";

export type Status = "done" | "both" | "func" | "fisio" | "none";

export interface BeetleRow {
  id: number;
  sp: string;
  green: boolean;
  prePhotographed: boolean;
  markedByUser: boolean;
  photographed: boolean;
  status: Status;
  // funcional species progress
  sp_have: number;
  sp_target: number;
  sp_total: number;
  sp_done: boolean;
  sp_need: number;
  // fisiologia species progress (green beetles only)
  fisio_have: number;
  fisio_total: number;
}

export interface SpeciesStats {
  sp: string;
  total: number;
  // funcional
  func_target: number;
  func_have: number;
  func_need: number;
  func_done: boolean;
  // fisiologia (green beetles)
  fisio_total: number;
  fisio_have: number;
  fisio_need: number;
  fisio_done: boolean;
}

export function isPhotographed(id: number, marked: Set<number>): boolean {
  return (DATA.beetles[String(id)]?.prePhotographed ?? false) || marked.has(id);
}

export function computeSpecies(sp: string, marked: Set<number>) {
  const s = DATA.species[sp];
  // funcional
  const haveCount = s.ids.filter((id) => isPhotographed(id, marked)).length;
  const need = Math.max(0, s.target - haveCount);
  // fisiologia (green beetles of this species)
  const greenIds = s.ids.filter((id) => DATA.beetles[String(id)]?.green);
  const fisioHave = greenIds.filter((id) => isPhotographed(id, marked)).length;
  return {
    haveCount,
    need,
    target: s.target,
    total: s.total,
    done: need === 0,
    fisioTotal: greenIds.length,
    fisioHave,
    fisioNeed: greenIds.length - fisioHave,
    fisioDone: fisioHave >= greenIds.length,
  };
}

function deriveStatus(photographed: boolean, spDone: boolean, green: boolean): Status {
  if (photographed) return "done";
  const funcional = !spDone;
  if (funcional && green) return "both";
  if (funcional) return "func";
  if (green) return "fisio";
  return "none";
}

export function resolveBeetle(id: number, marked: Set<number>): BeetleRow | null {
  const entry = DATA.beetles[String(id)];
  if (!entry) return null;

  const prePhotographed = entry.prePhotographed;
  const markedByUser = marked.has(id);
  const photographed = prePhotographed || markedByUser;
  const sp = computeSpecies(entry.sp, marked);
  const status = deriveStatus(photographed, sp.done, entry.green);

  return {
    id,
    sp: entry.sp,
    green: entry.green,
    prePhotographed,
    markedByUser,
    photographed,
    status,
    sp_have: sp.haveCount,
    sp_target: sp.target,
    sp_total: sp.total,
    sp_done: sp.done,
    sp_need: sp.need,
    fisio_have: sp.fisioHave,
    fisio_total: sp.fisioTotal,
  };
}

export function computeAllRows(marked: Set<number>): BeetleRow[] {
  const spCache: Record<string, ReturnType<typeof computeSpecies>> = {};
  for (const sp of Object.keys(DATA.species)) {
    spCache[sp] = computeSpecies(sp, marked);
  }
  return Object.entries(DATA.beetles)
    .map(([idStr, entry]) => {
      const id = Number(idStr);
      const prePhotographed = entry.prePhotographed;
      const markedByUser = marked.has(id);
      const photographed = prePhotographed || markedByUser;
      const sp = spCache[entry.sp];
      const status = deriveStatus(photographed, sp.done, entry.green);
      return {
        id, sp: entry.sp, green: entry.green,
        prePhotographed, markedByUser, photographed, status,
        sp_have: sp.haveCount, sp_target: sp.target,
        sp_total: sp.total, sp_done: sp.done, sp_need: sp.need,
        fisio_have: sp.fisioHave, fisio_total: sp.fisioTotal,
      };
    })
    .sort((a, b) => a.id - b.id);
}

export function computeAllSpeciesStats(marked: Set<number>): SpeciesStats[] {
  return Object.keys(DATA.species).map((sp) => {
    const s = DATA.species[sp];
    const c = computeSpecies(sp, marked);
    return {
      sp,
      total: s.total,
      func_target: c.target,
      func_have: c.haveCount,
      func_need: c.need,
      func_done: c.done,
      fisio_total: c.fisioTotal,
      fisio_have: c.fisioHave,
      fisio_need: c.fisioNeed,
      fisio_done: c.fisioDone,
    };
  }).sort((a, b) => a.sp.localeCompare(b.sp));
}

export function computeGlobalStats(marked: Set<number>) {
  const spCache: Record<string, ReturnType<typeof computeSpecies>> = {};
  for (const sp of Object.keys(DATA.species)) spCache[sp] = computeSpecies(sp, marked);
  const totalSp = Object.keys(DATA.species).length;
  const doneSp  = Object.values(spCache).filter((s) => s.done).length;
  const totalInd = Object.keys(DATA.beetles).length;
  const photoInd = Object.keys(DATA.beetles).filter((id) => isPhotographed(Number(id), marked)).length;
  // fisiologia global
  const allGreen = Object.entries(DATA.beetles).filter(([, b]) => b.green);
  const fisioDone = allGreen.filter(([id]) => isPhotographed(Number(id), marked)).length;
  return { totalSp, doneSp, totalInd, photoInd, fisioTotal: allGreen.length, fisioDone };
}
