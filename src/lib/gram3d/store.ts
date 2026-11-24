import { useSyncExternalStore } from "react";
import { allocatePurge, failureSplit, round2 } from "./calc";
import { createSeedState } from "./seed";
import type {
  AppState,
  CalendarEvent,
  ChatMessage,
  Lead,
  Order,
  OrderStatus,
  PrintDraft,
  PrintJob,
  Profile,
  ReadyPart,
  Roll,
  Settings,
} from "./types";

const STORAGE_KEY = "gram3d:v2";

let state: AppState | null = null;
let serverState: AppState | null = null;
const listeners = new Set<() => void>();

function load(): AppState {
  if (state) return state;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppState;
      if (isWorkspace(parsed)) {
        state = normalize(parsed);
        return state;
      }
    }
  } catch {
    /* corrupted storage: reseed */
  }
  state = migrateV1() ?? createSeedState();
  persist();
  return state;
}

export function isWorkspace(x: unknown): x is AppState {
  const s = x as AppState | null;
  return s?.version === 2 && Array.isArray(s.rolls);
}

function normalize(parsed: AppState): AppState {
  const seed = createSeedState();
  return {
    ...seed,
    ...parsed,
    settings: { ...seed.settings, ...parsed.settings },
    profile: { ...seed.profile, ...parsed.profile },
    maintenance: { ...seed.maintenance, ...parsed.maintenance },
  };
}

/** Replaces the whole workspace (e.g. with the account's cloud copy). */
export function replaceState(next: AppState) {
  state = normalize(next);
  persist();
  listeners.forEach((l) => l());
}

/** Forgets this device's workspace (on sign-out); the next account starts clean. */
export function resetLocalState() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem("printflow3d:v1");
  } catch {
    /* ignore */
  }
  state = createSeedState();
  listeners.forEach((l) => l());
}

/** Notifies on every workspace change (used by cloud sync). */
export function onStateChange(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

/** Carries data over from the earlier PrintFlow 3D version (single roll per print). */
function migrateV1(): AppState | null {
  try {
    const raw = window.localStorage.getItem("printflow3d:v1");
    if (!raw) return null;
    const old = JSON.parse(raw) as {
      settings?: Partial<Settings>;
      rolls?: Roll[];
      prints?: (Omit<PrintJob, "filaments" | "purgeGrams" | "packaging" | "channel" | "feePercent" | "fees"> & {
        rollId: string;
        rollLabel: string;
        colorHex: string;
      })[];
    };
    if (!Array.isArray(old.rolls)) return null;
    const seed = createSeedState();
    return {
      ...seed,
      settings: { ...seed.settings, ...old.settings },
      rolls: old.rolls,
      prints: (old.prints ?? []).map(({ rollId, rollLabel, colorHex, ...p }) => ({
        ...p,
        filaments: [
          {
            rollId,
            rollLabel,
            colorHex,
            material: old.rolls!.find((r) => r.id === rollId)?.material ?? "PLA",
            grams: p.grams,
            totalGrams: p.grams,
          },
        ],
        purgeGrams: 0,
        packaging: 0,
        channel: "direct",
        feePercent: 0,
        fees: 0,
      })),
    };
  } catch {
    return null;
  }
}

function persist() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* quota exceeded (large photos) */
  }
}

function setState(updater: (s: AppState) => AppState) {
  state = updater(load());
  persist();
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

const getServerSnapshot = () => (serverState ??= createSeedState());

export function useAppState(): AppState {
  return useSyncExternalStore(subscribe, load, getServerSnapshot);
}

export const getState = () => load();

export const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const now = () => new Date().toISOString();

export type NewPrint = Omit<PrintJob, "id" | "createdAt" | "status" | "filaments"> & {
  lines: { roll: Roll; grams: number }[];
};

export const actions = {
  updateSettings(patch: Partial<Settings>) {
    setState((s) => ({ ...s, settings: { ...s.settings, ...patch } }));
  },
  updateProfile(patch: Partial<Profile>) {
    setState((s) => ({ ...s, profile: { ...s.profile, ...patch } }));
  },
  setDraft(draft: PrintDraft | undefined) {
    setState((s) => ({ ...s, draft }));
  },

  // Rolls
  addRoll(roll: Omit<Roll, "id" | "createdAt">) {
    setState((s) => ({ ...s, rolls: [...s.rolls, { ...roll, id: uid(), createdAt: now() }] }));
  },
  removeRoll(id: string) {
    setState((s) => ({ ...s, rolls: s.rolls.filter((r) => r.id !== id) }));
  },

  // Prints
  startPrint(input: NewPrint) {
    const { lines, ...rest } = input;
    const taken = allocatePurge(
      lines.map((l) => l.grams),
      input.purgeGrams,
    );
    const filaments = lines.map((l, i) => ({
      rollId: l.roll.id,
      rollLabel: `${l.roll.brand} ${l.roll.material} ${l.roll.colorName}`,
      colorHex: l.roll.colorHex,
      material: l.roll.material,
      grams: l.grams,
      totalGrams: taken[i] ?? l.grams,
    }));
    const hours = input.hours + input.minutes / 60;
    setState((s) => ({
      ...s,
      rolls: s.rolls.map((r) => {
        const used = filaments.filter((f) => f.rollId === r.id).reduce((a, f) => a + f.totalGrams, 0);
        return used ? { ...r, remainingGrams: round2(Math.max(0, r.remainingGrams - used)) } : r;
      }),
      maintenance: {
        ...s.maintenance,
        lubeHours: round2(s.maintenance.lubeHours + hours),
        nozzleHours: round2(s.maintenance.nozzleHours + hours),
        totalHours: round2(s.maintenance.totalHours + hours),
      },
      prints: [{ ...rest, filaments, id: uid(), status: "printing", createdAt: now() }, ...s.prints],
    }));
  },
  completePrint(id: string) {
    setState((s) => ({
      ...s,
      prints: s.prints.map((p) => (p.id === id ? { ...p, status: "done", finishedAt: now() } : p)),
    }));
  },
  failPrint(id: string, percent: number) {
    setState((s) => {
      const job = s.prints.find((p) => p.id === id);
      if (!job || job.status !== "printing") return s;
      const per = job.filaments.map((f) => ({ f, split: failureSplit(f.totalGrams, percent) }));
      const total = failureSplit(job.grams + job.purgeGrams, percent);
      const unprinted = ((job.hours + job.minutes / 60) * (100 - total.percent)) / 100;
      return {
        ...s,
        rolls: s.rolls.map((r) => {
          const back = per.filter((x) => x.f.rollId === r.id).reduce((a, x) => a + x.split.returned, 0);
          return back ? { ...r, remainingGrams: round2(Math.min(r.totalGrams, r.remainingGrams + back)) } : r;
        }),
        maintenance: {
          ...s.maintenance,
          lubeHours: round2(Math.max(0, s.maintenance.lubeHours - unprinted)),
          nozzleHours: round2(Math.max(0, s.maintenance.nozzleHours - unprinted)),
          totalHours: round2(Math.max(0, s.maintenance.totalHours - unprinted)),
        },
        prints: s.prints.map((p) =>
          p.id === id
            ? {
                ...p,
                status: "failed",
                failedAtPercent: total.percent,
                wastedGrams: round2(per.reduce((a, x) => a + x.split.wasted, 0)),
                returnedGrams: round2(per.reduce((a, x) => a + x.split.returned, 0)),
                finishedAt: now(),
              }
            : p,
        ),
      };
    });
  },
  deletePrint(id: string) {
    setState((s) => ({ ...s, prints: s.prints.filter((p) => p.id !== id) }));
  },
  resetMaintenance(type: "lube" | "nozzle") {
    setState((s) => ({
      ...s,
      maintenance: {
        ...s.maintenance,
        ...(type === "lube" ? { lubeHours: 0 } : { nozzleHours: 0 }),
        log: [{ type, date: now(), atHours: s.maintenance.totalHours }, ...s.maintenance.log],
      },
    }));
  },

  // Ready parts
  /** Marks a finished print as stock: same name merges into the existing part. */
  addPartFromPrint(
    printId: string,
    opts: { quantity: number; name: string; material: string; unitPrice: number; photo?: string | undefined },
  ) {
    setState((s) => {
      const p = s.prints.find((x) => x.id === printId);
      if (!p) return s;
      const main = p.filaments[0];
      const key = opts.name.trim().toLowerCase();
      const existing = s.parts.find((x) => x.name.trim().toLowerCase() === key);
      const parts = existing
        ? s.parts.map((x) =>
            x.id === existing.id
              ? {
                  ...x,
                  quantity: x.quantity + opts.quantity,
                  unitPrice: opts.unitPrice,
                  unitCost: p.realCost,
                  photo: opts.photo ?? x.photo,
                }
              : x,
          )
        : [
            {
              id: uid(),
              name: opts.name.trim(),
              material: opts.material,
              colorHex: main?.colorHex ?? "#888888",
              quantity: opts.quantity,
              unitPrice: opts.unitPrice,
              unitCost: p.realCost,
              gramsPerUnit: round2(p.grams + p.purgeGrams),
              hours: p.hours,
              minutes: p.minutes,
              photo: opts.photo,
              createdAt: now(),
            } satisfies ReadyPart,
            ...s.parts,
          ];
      return { ...s, parts, prints: s.prints.map((x) => (x.id === printId ? { ...x, sentToStock: true } : x)) };
    });
  },
  addPart(part: Omit<ReadyPart, "id" | "createdAt">) {
    setState((s) => ({ ...s, parts: [{ ...part, id: uid(), createdAt: now() }, ...s.parts] }));
  },
  updatePart(id: string, patch: Partial<ReadyPart>) {
    setState((s) => ({ ...s, parts: s.parts.map((p) => (p.id === id ? { ...p, ...patch } : p)) }));
  },
  removePart(id: string) {
    setState((s) => ({ ...s, parts: s.parts.filter((p) => p.id !== id) }));
  },

  // Orders
  addOrder(o: Omit<Order, "id" | "createdAt" | "status" | "total">) {
    setState((s) => ({
      ...s,
      orders: [
        { ...o, id: uid(), status: "pending", total: round2(o.unitPrice * o.quantity), createdAt: now() },
        ...s.orders,
      ],
    }));
  },
  setOrderStatus(id: string, status: OrderStatus) {
    setState((s) => {
      const order = s.orders.find((o) => o.id === id);
      if (!order || order.status === "delivered") return s;
      if (status !== "delivered") {
        return { ...s, orders: s.orders.map((o) => (o.id === id ? { ...o, status } : o)) };
      }
      return {
        ...s,
        orders: s.orders.map((o) => (o.id === id ? { ...o, status, deliveredAt: now() } : o)),
        parts: s.parts.map((p) =>
          p.id === order.partId ? { ...p, quantity: Math.max(0, p.quantity - order.quantity) } : p,
        ),
        sales: [
          {
            id: uid(),
            date: now(),
            description: `${order.partName} ×${order.quantity} · ${order.client}`,
            revenue: order.total,
            profit: round2((order.unitPrice - order.unitCost) * order.quantity),
            orderId: order.id,
          },
          ...s.sales,
        ],
      };
    });
  },
  removeOrder(id: string) {
    setState((s) => ({ ...s, orders: s.orders.filter((o) => o.id !== id) }));
  },

  // Calendar / mentor
  addEvent(e: Omit<CalendarEvent, "id">) {
    setState((s) => ({ ...s, events: [...s.events, { ...e, id: uid() }] }));
  },
  toggleEvent(id: string) {
    setState((s) => ({ ...s, events: s.events.map((e) => (e.id === id ? { ...e, done: !e.done } : e)) }));
  },
  removeEvent(id: string) {
    setState((s) => ({ ...s, events: s.events.filter((e) => e.id !== id) }));
  },
  addLead(l: Omit<Lead, "id" | "createdAt">) {
    setState((s) => ({ ...s, leads: [{ ...l, id: uid(), createdAt: now() }, ...s.leads] }));
  },
  removeLead(id: string) {
    setState((s) => ({ ...s, leads: s.leads.filter((l) => l.id !== id) }));
  },
  pushChat(m: ChatMessage) {
    setState((s) => ({ ...s, chat: [...s.chat, m].slice(-40) }));
  },
  clearChat() {
    setState((s) => ({ ...s, chat: [] }));
  },
  resetDemo() {
    setState(() => createSeedState());
  },
};
