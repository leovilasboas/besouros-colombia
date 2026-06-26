import { DATA } from "./data";

export type Status = "done" | "both" | "func" | "fisio" | "none";

export interface MarkedSets {
  fisio: Set<number>; // photographed for fisiologia only (does NOT count for funcional)
  both: Set<number>;  // photographed for both fisiologia + funcional
}

export interface BeetleRow {
  id: number;
  sp: string;
  green: boolean;
  prePhotographed: boolean;
  markedByUser: boolean;
  markedAsFisio: boolean;
  markedAsBoth: boolean;
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

// Photographed for funcional purposes (prePhoto or marked as both)
function isPhotographedForFunc(id: number, sets: MarkedSets): boolean {
  return (DATA.beetles[String(id)]?.prePhotographed ?? false) || sets.both.has(id);
}

// Photographed for fisiologia purposes (prePhoto, fisio-only, or both)
function isPhotographedForFisio(id: number, sets: MarkedSets): boolean {
  return (DATA.beetles[String(id)]?.prePhotographed ?? false) || sets.fisio.has(id) || sets.both.has(id);
}

// Photographed for ANY purpose
export function isPhotographed(id: number, sets: MarkedSets): boolean {
  return (DATA.beetles[String(id)]?.prePhotographed ?? false) || sets.fisio.has(id) || sets.both.has(id);
}

export function computeSpecies(sp: string, sets: MarkedSets) {
  const s = DATA.species[sp];
  // funcional: only prePhotographed or markedBoth count toward target
  const haveCount = s.ids.filter((id) => isPhotographedForFunc(id, sets)).length;
  const need = Math.max(0, s.target - haveCount);
  // fisiologia (green beetles of this species)
  const greenIds = s.ids.filter((id) => DATA.beetles[String(id)]?.green);
  const fisioHave = greenIds.filter((id) => isPhotographedForFisio(id, sets)).length;
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

function deriveStatus(
  doneForFunc: boolean,
  doneForFisio: boolean,
  spDone: boolean,
  green: boolean
): Status {
  const needsFunc = !doneForFunc && !spDone;
  const needsFisio = green && !doneForFisio;

  if (!needsFunc && !needsFisio) {
    return doneForFunc || doneForFisio ? "done" : "none";
  }
  if (needsFunc && needsFisio) return "both";
  if (needsFunc) return "func";
  return "fisio";
}

export function resolveBeetle(id: number, sets: MarkedSets): BeetleRow | null {
  const entry = DATA.beetles[String(id)];
  if (!entry) return null;

  const prePhotographed = entry.prePhotographed;
  const markedAsFisio = sets.fisio.has(id);
  const markedAsBoth = sets.both.has(id);
  const markedByUser = markedAsFisio || markedAsBoth;
  const doneForFunc = prePhotographed || markedAsBoth;
  const doneForFisio = prePhotographed || markedAsFisio || markedAsBoth;
  const photographed = doneForFunc || doneForFisio;

  const sp = computeSpecies(entry.sp, sets);
  const status = deriveStatus(doneForFunc, doneForFisio, sp.done, entry.green);

  return {
    id,
    sp: entry.sp,
    green: entry.green,
    prePhotographed,
    markedByUser,
    markedAsFisio,
    markedAsBoth,
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

export function computeAllRows(sets: MarkedSets): BeetleRow[] {
  const spCache: Record<string, ReturnType<typeof computeSpecies>> = {};
  for (const sp of Object.keys(DATA.species)) {
    spCache[sp] = computeSpecies(sp, sets);
  }
  return Object.entries(DATA.beetles)
    .map(([idStr, entry]) => {
      const id = Number(idStr);
      const prePhotographed = entry.prePhotographed;
      const markedAsFisio = sets.fisio.has(id);
      const markedAsBoth = sets.both.has(id);
      const markedByUser = markedAsFisio || markedAsBoth;
      const doneForFunc = prePhotographed || markedAsBoth;
      const doneForFisio = prePhotographed || markedAsFisio || markedAsBoth;
      const photographed = doneForFunc || doneForFisio;
      const sp = spCache[entry.sp];
      const status = deriveStatus(doneForFunc, doneForFisio, sp.done, entry.green);
      return {
        id, sp: entry.sp, green: entry.green,
        prePhotographed, markedByUser, markedAsFisio, markedAsBoth, photographed, status,
        sp_have: sp.haveCount, sp_target: sp.target,
        sp_total: sp.total, sp_done: sp.done, sp_need: sp.need,
        fisio_have: sp.fisioHave, fisio_total: sp.fisioTotal,
      };
    })
    .sort((a, b) => a.id - b.id);
}

export function computeAllSpeciesStats(sets: MarkedSets): SpeciesStats[] {
  return Object.keys(DATA.species).map((sp) => {
    const s = DATA.species[sp];
    const c = computeSpecies(sp, sets);
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

export function computeGlobalStats(sets: MarkedSets) {
  const spCache: Record<string, ReturnType<typeof computeSpecies>> = {};
  for (const sp of Object.keys(DATA.species)) spCache[sp] = computeSpecies(sp, sets);
  const totalSp = Object.keys(DATA.species).length;
  const doneSp  = Object.values(spCache).filter((s) => s.done).length;
  const totalInd = Object.keys(DATA.beetles).length;
  const photoInd = Object.keys(DATA.beetles).filter((id) => isPhotographed(Number(id), sets)).length;
  const allGreen = Object.entries(DATA.beetles).filter(([, b]) => b.green);
  const fisioDone = allGreen.filter(([id]) => isPhotographedForFisio(Number(id), sets)).length;
  return { totalSp, doneSp, totalInd, photoInd, fisioTotal: allGreen.length, fisioDone };
}
