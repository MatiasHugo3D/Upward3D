import { describe, expect, it } from "vitest";
import { materialFamily, partQrText, rollQrText } from "./labels";

describe("labels", () => {
  it("groups material names into families", () => {
    expect(materialFamily("PLA Basic")).toBe("PLA");
    expect(materialFamily("PLA+")).toBe("PLA");
    expect(materialFamily("PETG")).toBe("PETG");
  });

  it("roll QR carries remaining grams and PETG temperatures", () => {
    const t = rollQrText({ brand: "eSun", material: "PETG", colorName: "Branco", remainingGrams: 128.4, totalGrams: 1000 });
    expect(t).toContain("Restante: 128 g / 1000 g");
    expect(t).toContain("Bico: 230–250 °C");
    expect(t).toContain("Mesa: 70–85 °C");
  });

  it("client QR carries the material care and the contact", () => {
    const t = partQrText({ name: "Vaso", material: "PLA" }, "Gram3D Studio", "+351 900 000 000");
    expect(t).toContain("50 °C");
    expect(t).toContain("Contacto: +351 900 000 000");
  });
});
