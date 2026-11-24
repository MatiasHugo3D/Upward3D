import type { AppState } from "./types";

/**
 * Which workspace to use when a user signs in on this device:
 * - the account already has data in the cloud → the cloud copy wins;
 * - first sign-in and this device's data is not someone else's → carry it into the account;
 * - first sign-in but the device holds another account's data → start from the demo data.
 */
export function pickInitialState(
  cloud: AppState | null,
  local: AppState,
  localOwner: string | null,
  userId: string,
  seed: () => AppState,
): { state: AppState; upload: boolean } {
  if (cloud) return { state: cloud, upload: false };
  if (localOwner && localOwner !== userId) return { state: seed(), upload: true };
  return { state: local, upload: true };
}
