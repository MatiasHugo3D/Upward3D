import type { Session as SbSession } from "@supabase/supabase-js";
import { useSyncExternalStore } from "react";
import { lovable } from "@/integrations/lovable";
import { supabase } from "@/integrations/supabase/client";
import { authErrorMessage, validateCredentials } from "./auth-messages";
import { clearLocalWorkspace, flushSync, stopSync } from "./cloud-sync";

export interface Session {
  userId: string;
  name: string;
  email: string;
}

type Result = { ok: true; needsConfirm?: boolean } | { ok: false; error: string };

let current: Session | null | undefined;
let recovery = false;
let started = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function toSession(s: SbSession | null): Session | null {
  if (!s?.user) return null;
  const meta = (s.user.user_metadata ?? {}) as Record<string, unknown>;
  const email = s.user.email ?? "";
  const name = String(meta["display_name"] ?? meta["full_name"] ?? meta["name"] ?? email.split("@")[0] ?? "Maker");
  return { userId: s.user.id, name, email };
}

function set(next: Session | null) {
  if (current && next && current.userId === next.userId && current.name === next.name) return;
  if (current === null && next === null) return;
  current = next;
  emit();
}

function start() {
  if (started || typeof window === "undefined") return;
  started = true;
  // Leftovers from the earlier device-only login.
  window.localStorage.removeItem("gram3d:session");
  window.localStorage.removeItem("gram3d:accounts");
  supabase.auth.onAuthStateChange((event, s) => {
    if (event === "PASSWORD_RECOVERY") {
      recovery = true;
      emit();
    }
    set(toSession(s));
  });
  supabase.auth.getSession().then(({ data }) => set(toSession(data.session)));
}

function subscribe(l: () => void) {
  start();
  listeners.add(l);
  return () => listeners.delete(l);
}

/** `undefined` until the session is known, then the signed-in user or null. */
export function useSession(): Session | null | undefined {
  return useSyncExternalStore(subscribe, () => current, () => undefined);
}

export const isRecovery = () => recovery;

export async function signUp(name: string, email: string, password: string): Promise<Result> {
  if (!name.trim()) return { ok: false, error: "Indica o teu nome" };
  const invalid = validateCredentials(email, password);
  if (invalid) return { ok: false, error: invalid };
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: { emailRedirectTo: window.location.origin, data: { display_name: name.trim() } },
  });
  if (error) return { ok: false, error: authErrorMessage(error.message) };
  // An existing address comes back with no identities instead of an error.
  if (data.user && data.user.identities?.length === 0) return { ok: false, error: authErrorMessage("already registered") };
  return { ok: true, needsConfirm: !data.session };
}

export async function signIn(email: string, password: string): Promise<Result> {
  const invalid = validateCredentials(email, password);
  if (invalid) return { ok: false, error: invalid };
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  return error ? { ok: false, error: authErrorMessage(error.message) } : { ok: true };
}

export async function signInWithGoogle(): Promise<Result> {
  const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
  if (r.error) return { ok: false, error: authErrorMessage(r.error.message) };
  return { ok: true };
}

export async function sendPasswordReset(email: string): Promise<Result> {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return { ok: false, error: "Indica o teu email primeiro" };
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  return error ? { ok: false, error: authErrorMessage(error.message) } : { ok: true };
}

export async function updatePassword(password: string): Promise<Result> {
  if (password.length < 6) return { ok: false, error: "A palavra-passe precisa de pelo menos 6 caracteres" };
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { ok: false, error: authErrorMessage(error.message) };
  recovery = false;
  emit();
  return { ok: true };
}

/** Saves pending changes, signs out and removes this account's data from the device. */
export async function signOut() {
  await flushSync();
  stopSync();
  await supabase.auth.signOut();
  clearLocalWorkspace();
}
