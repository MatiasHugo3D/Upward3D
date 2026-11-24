import { describe, expect, it } from "vitest";
import {
  allocatePurge,
  maintenanceStatus,
  calculateCost,
  channelFee,
  failureSplit,
  leftoverSuggestions,
  printerPayback,
} from "./calc";
import type { Roll, Settings } from "./types";

const settings = {
  kwhRate: 0.2,
  wearPerHour: 0.3,
  printerPowerKw: 0.15,
} as Settings;

const base = {
  lines: [{ grams: 100, rollPrice: 20, rollTotalGrams: 1000 }],
  purgeGrams: 0,
  hours: 2,
  minutes: 30,
  margin: 50,
  packaging: 0,
  feePercent: 0,
  kwhRate: 0.2,
  wearPerHour: 0.3,
  powerKw: 0.15,
};

describe("sales channel fees", () => {
  it("are 0% direct, 5% OLX/Vinted, 15% Etsy", () => {
    expect([channelFee("direct"), channelFee("olx"), channelFee("etsy")]).toEqual([0, 5, 15]);
  });
});

describe("calculateCost", () => {
  it("sums filament + electricity (h × kW × tariff) + wear + packaging", () => {
    const c = calculateCost({ ...base, packaging: 1 });
    // 2 + 0.075 + 0.75 + 1 = 3.825
    expect(c.realCost).toBe(3.83);
  });

  it("charges each colour at its own roll price", () => {
    const c = calculateCost({
      ...base,
      lines: [
        { grams: 50, rollPrice: 20, rollTotalGrams: 1000 },
        { grams: 50, rollPrice: 40, rollTotalGrams: 1000 },
      ],
    });
    expect(c.filamentCost).toBe(3);
  });

  it("keeps the net profit intact after a 15% marketplace fee", () => {
    const c = calculateCost({ ...base, feePercent: 15 });
    // real 2.825, profit 1.4125, price = 4.2375 / 0.85 = 4.985
    expect(c.profit).toBe(1.41);
    expect(c.finalPrice).toBe(4.99);
    expect(c.finalPrice - c.fees).toBeCloseTo(4.24, 2);
  });
});

describe("purge", () => {
  it("is shared across colours by weight", () => {
    expect(allocatePurge([30, 10], 20)).toEqual([45, 15]);
  });
});

describe("failure", () => {
  it("returns the unprinted share to the roll", () => {
    expect(failureSplit(200, 40)).toEqual({ percent: 40, wasted: 80, returned: 120 });
  });
});

describe("printerPayback", () => {
  it("counts pieces and weeks to pay a new printer", () => {
    expect(printerPayback(400, 5, 20)).toEqual({ pieces: 80, weeks: 4, valid: true });
  });
});

describe("leftoverSuggestions", () => {
  it("only suggests pieces that fit in rolls under 150 g", () => {
    const rolls: Roll[] = [
      { id: "a", brand: "", material: "PLA", colorName: "", colorHex: "", totalGrams: 1000, remainingGrams: 95, price: 20, createdAt: "" },
      { id: "b", brand: "", material: "PLA", colorName: "", colorHex: "", totalGrams: 1000, remainingGrams: 600, price: 20, createdAt: "" },
    ];
    const res = leftoverSuggestions(
      rolls,
      [
        { name: "Pequena", grams: 30, hours: 1, minutes: 0, margin: 50, packaging: 0 },
        { name: "Grande", grams: 120, hours: 4, minutes: 0, margin: 50, packaging: 0 },
      ],
      settings,
    );
    expect(res).toHaveLength(1);
    expect(res[0]!.options.map((o) => [o.piece.name, o.count])).toEqual([["Pequena", 3]]);
  });
});

describe("maintenanceStatus", () => {
  it("flags lubrication at 100 h and the nozzle at 300 h", () => {
    expect(maintenanceStatus(42, 100)).toMatchObject({ state: "ok", left: 58 });
    expect(maintenanceStatus(85, 100).state).toBe("soon");
    expect(maintenanceStatus(100, 100).state).toBe("due");
    expect(maintenanceStatus(142, 300)).toMatchObject({ state: "ok", left: 158 });
    expect(maintenanceStatus(301, 300).state).toBe("due");
  });
});
