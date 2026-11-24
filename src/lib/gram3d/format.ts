import type { Currency } from "./types";

export const CURRENCIES: { code: Currency; label: string; symbol: string; locale: string }[] = [
  { code: "EUR", label: "EUR €", symbol: "€", locale: "pt-PT" },
  { code: "BRL", label: "BRL R$", symbol: "R$", locale: "pt-BR" },
  { code: "CHF", label: "CHF", symbol: "CHF", locale: "de-CH" },
];

export function formatMoney(value: number, currency: Currency, digits = 2) {
  const c = CURRENCIES.find((x) => x.code === currency) ?? CURRENCIES[0]!;
  return new Intl.NumberFormat(c.locale, {
    style: "currency",
    currency: c.code,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value || 0);
}

export function currencySymbol(currency: Currency) {
  return CURRENCIES.find((x) => x.code === currency)?.symbol ?? "€";
}

export function formatGrams(value: number) {
  return `${new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 1 }).format(value || 0)} g`;
}

export function formatDuration(hours: number, minutes: number) {
  if (!hours) return `${minutes}min`;
  return `${hours}h ${String(minutes).padStart(2, "0")}min`;
}

export function formatDate(iso: string) {
  return new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}
