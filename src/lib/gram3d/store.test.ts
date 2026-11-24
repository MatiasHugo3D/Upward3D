import { beforeEach, describe, expect, it } from "vitest";
import { actions, getState } from "./store";

describe("store rules", () => {
  beforeEach(() => {
    window.localStorage.clear();
    actions.resetDemo();
  });

  it("starts with a 95 g leftover roll, 2 ready parts, 1 order and a monthly goal", () => {
    const s = getState();
    expect(s.rolls.map((r) => r.remainingGrams)).toContain(95);
    expect(s.parts).toHaveLength(2);
    expect(s.orders).toHaveLength(1);
    expect(s.profile.monthlyGoal).toBeGreaterThan(0);
  });

  it("starting a multicolour print deducts each roll and adds hours to maintenance", () => {
    const s = getState();
    const [a, b] = s.rolls;
    const before = s.maintenance.lubeHours;
    actions.startPrint({
      lines: [
        { roll: a!, grams: 30 },
        { roll: b!, grams: 10 },
      ],
      name: "Teste",
      grams: 40,
      purgeGrams: 20,
      hours: 2,
      minutes: 0,
      margin: 50,
      packaging: 0,
      channel: "direct",
      feePercent: 0,
      filamentCost: 0,
      electricityCost: 0,
      wearCost: 0,
      realCost: 0,
      fees: 0,
      profit: 0,
      finalPrice: 0,
    });
    const after = getState();
    expect(after.rolls[0]!.remainingGrams).toBe(a!.remainingGrams - 45);
    expect(after.rolls[1]!.remainingGrams).toBe(b!.remainingGrams - 15);
    expect(after.maintenance.lubeHours).toBe(before + 2);
  });

  it("delivering an order removes parts from stock and adds the profit", () => {
    const s = getState();
    const order = s.orders[0]!;
    const part = s.parts.find((p) => p.id === order.partId)!;
    const salesBefore = s.sales.length;
    actions.setOrderStatus(order.id, "delivered");
    const after = getState();
    expect(after.parts.find((p) => p.id === part.id)!.quantity).toBe(part.quantity - order.quantity);
    expect(after.sales).toHaveLength(salesBefore + 1);
    expect(after.sales[0]!.profit).toBeCloseTo((order.unitPrice - order.unitCost) * order.quantity, 2);
  });

  it("registering maintenance resets the counter to zero", () => {
    actions.resetMaintenance("lube");
    expect(getState().maintenance.lubeHours).toBe(0);
  });
});
