export type Currency = "EUR" | "BRL" | "CHF";
export type SalesChannel = "direct" | "olx" | "etsy";

export interface Roll {
  id: string;
  brand: string;
  material: string;
  colorName: string;
  colorHex: string;
  totalGrams: number;
  remainingGrams: number;
  price: number;
  createdAt: string;
}

export interface FilamentUse {
  rollId: string;
  rollLabel: string;
  colorHex: string;
  material: string;
  /** grams of the part itself on this roll */
  grams: number;
  /** grams actually taken from the roll (part + its share of purge) */
  totalGrams: number;
}

export type PrintStatus = "printing" | "done" | "failed";

export interface PrintJob {
  id: string;
  name: string;
  filaments: FilamentUse[];
  grams: number;
  purgeGrams: number;
  hours: number;
  minutes: number;
  margin: number;
  packaging: number;
  channel: SalesChannel;
  feePercent: number;
  filamentCost: number;
  electricityCost: number;
  wearCost: number;
  realCost: number;
  fees: number;
  profit: number;
  finalPrice: number;
  status: PrintStatus;
  failedAtPercent?: number;
  wastedGrams?: number;
  returnedGrams?: number;
  sentToStock?: boolean;
  createdAt: string;
  finishedAt?: string;
}

export interface ReadyPart {
  id: string;
  name: string;
  material: string;
  colorHex: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  gramsPerUnit: number;
  hours: number;
  minutes: number;
  photo?: string | undefined;
  createdAt: string;
}

export type OrderStatus = "pending" | "printing" | "ready" | "delivered";

export interface Order {
  id: string;
  client: string;
  partId: string;
  partName: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  total: number;
  dueDate: string; // YYYY-MM-DD
  status: OrderStatus;
  createdAt: string;
  deliveredAt?: string;
}

export interface Sale {
  id: string;
  date: string;
  description: string;
  revenue: number;
  profit: number;
  orderId?: string;
}

export interface Maintenance {
  lubeHours: number;
  nozzleHours: number;
  totalHours: number;
  log: { type: "lube" | "nozzle"; date: string; atHours: number }[];
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm
  kind: "task" | "reminder";
  source: "user" | "mentor";
  done?: boolean;
}

export interface Lead {
  id: string;
  name: string;
  category: string;
  city: string;
  idea: string;
  script: string;
  createdAt: string;
}

export interface ChatMessage {
  role: "user" | "model";
  text: string;
  tasks?: { title: string; date: string }[];
}

export interface Profile {
  brandName: string;
  city: string;
  niches: string[];
  monthlyGoal: number;
  contact: string;
}

export interface Settings {
  currency: Currency;
  printerName: string;
  printerPowerKw: number;
  kwhRate: number;
  wearPerHour: number;
  lubeIntervalH: number;
  nozzleIntervalH: number;
  geminiKey: string;
  hfToken: string;
}

export interface PrintDraft {
  name: string;
  grams: number;
}

export interface AppState {
  version: 2;
  settings: Settings;
  profile: Profile;
  rolls: Roll[];
  prints: PrintJob[];
  parts: ReadyPart[];
  orders: Order[];
  sales: Sale[];
  maintenance: Maintenance;
  events: CalendarEvent[];
  leads: Lead[];
  chat: ChatMessage[];
  draft?: PrintDraft | undefined;
}
