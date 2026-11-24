import { describe, expect, it } from "vitest";
import { parseDuration, parseGrams, parsePercent } from "./ocr-parse";

describe("OCR parsers", () => {
  it("reads grams from a slicer summary", () => {
    expect(parseGrams("Filament: 3.21 m  Total 42.57 g\nCost 1.02")).toBe(42.57);
  });

  it("reads Bambu style duration", () => {
    expect(parseDuration("Total time 2h 35m\nModel 1h10m")).toEqual({ hours: 2, minutes: 35 });
  });

  it("reads days in duration", () => {
    expect(parseDuration("Print time: 1d 3h 5m")).toEqual({ hours: 27, minutes: 5 });
  });

  it("reads clock style duration", () => {
    expect(parseDuration("Estimated time 03:12:00")).toEqual({ hours: 3, minutes: 12 });
  });

  it("reads progress percent", () => {
    expect(parsePercent("Printing... 37% Layer 120/300")).toBe(37);
  });
});
