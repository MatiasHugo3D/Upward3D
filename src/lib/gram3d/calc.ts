import type { PrintJob, ReadyPart, Roll, Sale, SalesChannel, Settings } from "./types";

export const LOW_STOCK_GRAMS = 150;

export const CHANNELS: { id: SalesChannel; label: string; fee: number }[] = [
  { id: "direct", label: "Venda Direta", fee: 0 },
  { id: "olx", label: "OLX/Vinted", fee: 5 },
  { id: "etsy", label: "Etsy/Marketplaces", fee: 15 },
];

export const channelFee = (c: SalesChannel) => CHANNELS.find((x) => x.id === c)?.fee ?? 0;

const n = (v: number) => (Number.isFinite(v) && v > 0 ? v : 0);
export const round2 = (v: number) => Math.round((v + Number.EPSILON) * 100) / 100;

export interface CostLine {
  grams: number;
  rollPrice: number;
  rollTotalGrams: number;
}

export interface CostInput {
  lines: CostLine[];
  purgeGrams: number;
  hours: number;
  minutes: number;
  margin: number;
  packaging: number;
  feePercent: number;
  kwhRate: number;
  wearPerHour: number;
  powerKw: number;
}

/** Splits purge grams over the colours proportionally to their weight. Returns grams taken per line. */
export function allocatePurge(grams: number[], purge: number): number[] {
  const total = grams.reduce((s, g) => s + n(g), 0);
  const p = n(purge);
  if (!grams.length) return [];
  if (total === 0) return grams.map((_, i) => (i === 0 ? round2(p) : 0));
  return grams.map((g) => round2(n(g) + (p * n(g)) / total));
}

export function calculateCost(input: CostInput) {
  const taken = allocatePurge(
    input.lines.map((l) => l.grams),
    input.purgeGrams,
  );
  const filamentCost = input.lines.reduce((s, l, i) => {
    const ppg = n(l.rollTotalGrams) > 0 ? n(l.rollPrice) / l.rollTotalGrams : 0;
    return s + (taken[i] ?? 0) * ppg;
  }, 0);
  const totalGrams = taken.reduce((s, g) => s + g, 0);
  const totalHours = n(input.hours) + n(input.minutes) / 60;
  const electricityCost = totalHours * n(input.powerKw) * n(input.kwhRate);
  const wearCost = totalHours * n(input.wearPerHour);
  const packaging = n(input.packaging);
  const realCost = filamentCost + electricityCost + wearCost + packaging;
  const profit = realCost * (n(input.margin) / 100);
  const fee = Math.min(n(input.feePercent), 90) / 100;
  // The channel takes its % of the final price, so gross it up: net profit stays guaranteed.
  const finalPrice = (realCost + profit) / (1 - fee);
  const fees = finalPrice - realCost - profit;
  return {
    taken,
    totalGrams: round2(totalGrams),
    totalHours,
    filamentCost: round2(filamentCost),
    electricityCost: round2(electricityCost),
    wearCost: round2(wearCost),
    packaging: round2(packaging),
    realCost: round2(realCost),
    fees: round2(fees),
    profit: round2(profit),
    finalPrice: round2(finalPrice),
  };
}

export function failureSplit(grams: number, percent: number) {
  const p = Math.min(99, Math.max(1, Math.round(percent)));
  const wasted = round2((n(grams) * p) / 100);
  const returned = round2(n(grams) - wasted);
  return { percent: p, wasted, returned };
}

export function monthKey(iso: string) {
  return iso.slice(0, 7);
}

export function realizedProfit(sales: Sale[], month?: string) {
  return round2(
    sales.filter((s) => !month || monthKey(s.date) === month).reduce((s, x) => s + x.profit, 0),
  );
}

export function dashboardStats(rolls: Roll[], prints: PrintJob[], sales: Sale[]) {
  const done = prints.filter((p) => p.status === "done").length;
  const failed = prints.filter((p) => p.status === "failed");
  const finished = done + failed.length;
  return {
    totalStock: round2(rolls.reduce((s, r) => s + r.remainingGrams, 0)),
    realizedProfit: realizedProfit(sales),
    successRate: finished ? (done / finished) * 100 : 0,
    finished,
    waste: round2(failed.reduce((s, p) => s + (p.wastedGrams ?? 0), 0)),
  };
}

/** How many pieces / weeks until a new printer pays for itself. */
export function printerPayback(price: number, avgProfitPerPiece: number, piecesPerWeek: number) {
  if (!(avgProfitPerPiece > 0) || !(price > 0)) return { pieces: 0, weeks: 0, valid: false };
  const pieces = Math.ceil(price / avgProfitPerPiece);
  const weeks = piecesPerWeek > 0 ? Math.ceil(pieces / piecesPerWeek) : 0;
  return { pieces, weeks, valid: piecesPerWeek > 0 };
}

export interface KnownPiece {
  name: string;
  grams: number;
  hours: number;
  minutes: number;
  margin: number;
  packaging: number;
}

export function knownPieces(prints: PrintJob[], parts: ReadyPart[]): KnownPiece[] {
  const map = new Map<string, KnownPiece>();
  for (const p of prints) {
    if (p.status === "failed" || p.grams <= 0) continue;
    const key = p.name.trim().toLowerCase();
    if (!map.has(key))
      map.set(key, {
        name: p.name,
        grams: p.grams + p.purgeGrams,
        hours: p.hours,
        minutes: p.minutes,
        margin: p.margin,
        packaging: p.packaging,
      });
  }
  for (const part of parts) {
    const key = part.name.trim().toLowerCase();
    if (!map.has(key) && part.gramsPerUnit > 0) {
      const margin = part.unitCost > 0 ? ((part.unitPrice - part.unitCost) / part.unitCost) * 100 : 60;
      map.set(key, {
        name: part.name,
        grams: part.gramsPerUnit,
        hours: part.hours,
        minutes: part.minutes,
        margin: Math.max(0, Math.round(margin)),
        packaging: 0,
      });
    }
  }
  return [...map.values()];
}

/** Pieces that fit in rolls below the low-stock line, with their potential profit. */
export function leftoverSuggestions(rolls: Roll[], pieces: KnownPiece[], settings: Settings) {
  return rolls
    .filter((r) => r.remainingGrams > 0 && r.remainingGrams < LOW_STOCK_GRAMS)
    .map((roll) => {
      const options = pieces
        .filter((p) => p.grams > 0 && p.grams <= roll.remainingGrams)
        .map((p) => {
          const c = calculateCost({
            lines: [{ grams: p.grams, rollPrice: roll.price, rollTotalGrams: roll.totalGrams }],
            purgeGrams: 0,
            hours: p.hours,
            minutes: p.minutes,
            margin: p.margin,
            packaging: p.packaging,
            feePercent: 0,
            kwhRate: settings.kwhRate,
            wearPerHour: settings.wearPerHour,
            powerKw: settings.printerPowerKw,
          });
          const count = Math.floor(roll.remainingGrams / p.grams);
          return {
            piece: p,
            count,
            unitPrice: c.finalPrice,
            unitProfit: c.profit,
            totalProfit: round2(c.profit * count),
            leftover: round2(roll.remainingGrams - count * p.grams),
          };
        })
        .sort((a, b) => b.totalProfit - a.totalProfit);
      return { roll, options };
    });
}

/** Workshop health: "soon" from 80% of the interval, "due" once the interval is reached. */
export function maintenanceStatus(hours: number, interval: number) {
  const pct = interval > 0 ? Math.min(100, (n(hours) / interval) * 100) : 0;
  const state = pct >= 100 ? "due" : pct >= 80 ? "soon" : "ok";
  return { pct, state: state as "ok" | "soon" | "due", left: round2(Math.max(0, interval - n(hours))) };
}
