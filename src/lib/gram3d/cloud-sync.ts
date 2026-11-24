/** Keeps the browser workspace and the account's cloud copy in step (last write wins). */
import { useSyncExternalStore } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { createSeedState } from "./seed";
import { getState, isWorkspace, onStateChange, replaceState, resetLocalState } from "./store";
import { pickInitialState } from "./sync-rules";

export type SyncStatus = "idle" | "loading" | "saving" | "saved" | "offline";

const OWNER_KEY = "gram3d:owner";
let status: SyncStatus = "idle";
let active: { userId: string; unsub: () => void } | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let canPush = false;
const listeners = new Set<() => void>();

function setStatus(s: SyncStatus) {
  status = s;
  listeners.forEach((l) => l());
}

export function useSyncStatus() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => status,
    () => "idle" as SyncStatus,
  );
}

async function push() {
  if (!active || !canPush) return;
  timer = null;
  setStatus("saving");
  const { error } = await supabase
    .from("app_states")
    .upsert({ user_id: active.userId, state: getState() as unknown as Json });
  if (error) {
    console.error("sync push", error);
    setStatus("offline");
  } else setStatus("saved");
}

function schedule() {
  if (!canPush) return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(push, 1200);
}

export async function startSync(userId: string) {
  if (active?.userId === userId) return;
  stopSync();
  active = { userId, unsub: () => {} };
  canPush = false;
  setStatus("loading");
  const { data, error } = await supabase.from("app_states").select("state").eq("user_id", userId).maybeSingle();
  if (active?.userId !== userId) return;
  if (error) {
    console.error("sync load", error);
    setStatus("offline");
    toast.error("Sem ligação à nuvem. Recarrega a página para sincronizar.");
    return;
  }
  const cloud = isWorkspace(data?.state) ? data.state : null;
  const pick = pickInitialState(cloud, getState(), window.localStorage.getItem(OWNER_KEY), userId, createSeedState);
  replaceState(pick.state);
  window.localStorage.setItem(OWNER_KEY, userId);
  canPush = true;
  active.unsub = onStateChange(schedule);
  if (pick.upload) await push();
  else setStatus("saved");
}

export async function flushSync() {
  if (timer) {
    clearTimeout(timer);
    await push();
  }
}

export function stopSync() {
  if (timer) clearTimeout(timer);
  timer = null;
  active?.unsub();
  active = null;
  canPush = false;
  setStatus("idle");
}

export function clearLocalWorkspace() {
  window.localStorage.removeItem(OWNER_KEY);
  resetLocalState();
}
