import vasePhoto from "@/assets/part-vase.jpg";
import headsetPhoto from "@/assets/part-headset.jpg";
import { calculateCost, channelFee, failureSplit } from "./calc";
import type { AppState, PrintJob, Roll, SalesChannel, Settings } from "./types";

export const DEFAULT_SETTINGS: Settings = {
  currency: "EUR",
  printerName: "Anycubic Kobra S1",
  printerPowerKw: 0.15,
  kwhRate: 0.22,
  wearPerHour: 0.25,
  lubeIntervalH: 100,
  nozzleIntervalH: 300,
  geminiKey: "",
  hfToken: "",
};

const day = (offset: number, hour = 10) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  d.setHours(hour, 0, 0, 0);
  return d;
};
const iso = (offset: number, hour?: number) => day(offset, hour).toISOString();
const ymd = (offset: number) => {
  const d = day(offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

function rolls(): Roll[] {
  return [
    { id: "roll-black", brand: "Anycubic", material: "PLA+", colorName: "Preto", colorHex: "#1c1c1f", totalGrams: 1000, remainingGrams: 840, price: 18.99, createdAt: iso(-20) },
    { id: "roll-orange", brand: "Bambu Lab", material: "PLA Basic", colorName: "Laranja", colorHex: "#f2791f", totalGrams: 1000, remainingGrams: 612, price: 24.99, createdAt: iso(-14) },
    { id: "roll-white", brand: "eSun", material: "PETG", colorName: "Branco", colorHex: "#eeeeea", totalGrams: 1000, remainingGrams: 95, price: 21.5, createdAt: iso(-40) },
  ];
}

function job(
  id: string,
  name: string,
  roll: Roll,
  grams: number,
  hours: number,
  minutes: number,
  margin: number,
  channel: SalesChannel,
  status: PrintJob["status"],
  createdAt: string,
  failedAt?: number,
): PrintJob {
  const s = DEFAULT_SETTINGS;
  const feePercent = channelFee(channel);
  const c = calculateCost({
    lines: [{ grams, rollPrice: roll.price, rollTotalGrams: roll.totalGrams }],
    purgeGrams: 0,
    hours,
    minutes,
    margin,
    packaging: 0,
    feePercent,
    kwhRate: s.kwhRate,
    wearPerHour: s.wearPerHour,
    powerKw: s.printerPowerKw,
  });
  const j: PrintJob = {
    id,
    name,
    filaments: [
      {
        rollId: roll.id,
        rollLabel: `${roll.brand} ${roll.material} ${roll.colorName}`,
        colorHex: roll.colorHex,
        material: roll.material,
        grams,
        totalGrams: grams,
      },
    ],
    grams,
    purgeGrams: 0,
    hours,
    minutes,
    margin,
    packaging: 0,
    channel,
    feePercent,
    filamentCost: c.filamentCost,
    electricityCost: c.electricityCost,
    wearCost: c.wearCost,
    realCost: c.realCost,
    fees: c.fees,
    profit: c.profit,
    finalPrice: c.finalPrice,
    status,
    createdAt,
  };
  if (status !== "printing") j.finishedAt = createdAt;
  if (status === "done") j.sentToStock = true;
  if (status === "failed" && failedAt) {
    const f = failureSplit(grams, failedAt);
    Object.assign(j, { failedAtPercent: f.percent, wastedGrams: f.wasted, returnedGrams: f.returned });
  }
  return j;
}

export function createSeedState(): AppState {
  const r = rolls();
  const [black, orange, white] = r as [Roll, Roll, Roll];
  const prints = [
    job("p-4", "Porta-cartões magnético", black, 38, 1, 50, 80, "direct", "printing", iso(0, 8)),
    job("p-3", "Vaso low-poly", orange, 142, 6, 35, 80, "direct", "done", iso(-2)),
    job("p-2", "Caixa de engrenagens", white, 210, 9, 50, 70, "direct", "failed", iso(-5), 38),
    job("p-1", "Suporte de headset", black, 86, 4, 12, 60, "direct", "done", iso(-8)),
    job("p-0", "Clip de cabos (x10)", white, 24, 0, 55, 100, "direct", "done", iso(-11)),
  ];
  const vase = prints[1]!;
  const headset = prints[3]!;
  return {
    version: 2,
    settings: { ...DEFAULT_SETTINGS },
    profile: {
      brandName: "Gram3D Studio",
      city: "Lisboa",
      niches: ["Decoração", "Gaming & Setup", "Brindes para empresas"],
      monthlyGoal: 300,
      contact: "+351 912 345 678",
    },
    rolls: r,
    prints,
    parts: [
      { id: "part-vase", name: "Vaso low-poly", material: orange.material, colorHex: orange.colorHex, quantity: 3, unitPrice: vase.finalPrice, unitCost: vase.realCost, gramsPerUnit: 142, hours: 6, minutes: 35, photo: vasePhoto, createdAt: iso(-2) },
      { id: "part-headset", name: "Suporte de headset", material: black.material, colorHex: black.colorHex, quantity: 2, unitPrice: headset.finalPrice, unitCost: headset.realCost, gramsPerUnit: 86, hours: 4, minutes: 12, photo: headsetPhoto, createdAt: iso(-8) },
    ],
    orders: [
      { id: "ord-1", client: "Café Miradouro", partId: "part-vase", partName: "Vaso low-poly", quantity: 2, unitPrice: vase.finalPrice, unitCost: vase.realCost, total: Math.round(vase.finalPrice * 2 * 100) / 100, dueDate: ymd(3), status: "pending", createdAt: iso(-1) },
    ],
    sales: [
      { id: "sale-1", date: iso(-6), description: "Suporte de headset · Marta S.", revenue: headset.finalPrice, profit: headset.profit },
      { id: "sale-2", date: iso(-10), description: "Clip de cabos (x10) · Loja Byte", revenue: prints[4]!.finalPrice, profit: prints[4]!.profit },
    ],
    maintenance: { lubeHours: 42, nozzleHours: 142, totalHours: 386, log: [] },
    events: [
      { id: "ev-1", title: "Publicar vaso no Instagram", date: ymd(1), time: "18:00", kind: "task", source: "mentor" },
    ],
    leads: [],
    chat: [],
  };
}
