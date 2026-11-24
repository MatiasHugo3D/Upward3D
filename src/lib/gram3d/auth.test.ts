import { describe, expect, it } from "vitest";
import { authErrorMessage, validateCredentials } from "./auth-messages";
import { pickInitialState } from "./sync-rules";
import type { AppState } from "./types";

const ws = (tag: string) => ({ version: 2, settings: { printerName: tag } }) as unknown as AppState;

describe("account sync", () => {
  it("uses the cloud copy when the account already has data", () => {
    const r = pickInitialState(ws("cloud"), ws("local"), null, "u1", () => ws("seed"));
    expect(r.state.settings.printerName).toBe("cloud");
    expect(r.upload).toBe(false);
  });

  it("carries this device's data into the account on first sign-in", () => {
    const r = pickInitialState(null, ws("local"), null, "u1", () => ws("seed"));
    expect(r.state.settings.printerName).toBe("local");
    expect(r.upload).toBe(true);
  });

  it("never hands another account's data to a new account", () => {
    const r = pickInitialState(null, ws("local"), "u2", "u1", () => ws("seed"));
    expect(r.state.settings.printerName).toBe("seed");
  });
});

describe("sign-in messages", () => {
  it("explains wrong password and unconfirmed email in Portuguese", () => {
    expect(authErrorMessage("Invalid login credentials")).toBe("Email ou palavra-passe errados");
    expect(authErrorMessage("Email not confirmed")).toContain("confirmaste o email");
  });

  it("requires a valid email and a 6+ character password", () => {
    expect(validateCredentials("nao-e-email", "segredo1")).not.toBeNull();
    expect(validateCredentials("m@example.com", "12345")).not.toBeNull();
    expect(validateCredentials("m@example.com", "123456")).toBeNull();
  });
});
