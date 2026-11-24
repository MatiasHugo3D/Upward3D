import { describe, expect, it } from "vitest";
import { cleanKey } from "./ai-keys";

describe("cleanKey", () => {
  it("strips spaces, quotes and invisible characters from a pasted key", () => {
    expect(cleanKey('  "hf_abc123"\n')).toBe("hf_abc123");
    expect(cleanKey("AIza\u200bXYZ ")).toBe("AIzaXYZ");
  });
});
