import { describe, expect, it } from "vitest";
import { adText, whatsappLink } from "./ad";

describe("ad text", () => {
  it("includes the part name, material and the sale price", () => {
    const t = adText({ name: "Vaso low-poly", material: "PLA" }, 12.5, "EUR");
    expect(t).toContain("Vaso low-poly");
    expect(t).toContain("PLA");
    expect(t).toContain("12,50");
  });

  it("builds a WhatsApp share link with the text", () => {
    expect(whatsappLink("Olá 3D")).toBe("https://wa.me/?text=Ol%C3%A1%203D");
  });
});
