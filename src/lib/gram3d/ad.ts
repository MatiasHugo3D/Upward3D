import { formatMoney } from "./format";
import type { Currency, ReadyPart } from "./types";

export function adText(part: Pick<ReadyPart, "name" | "material">, price: number, currency: Currency, contact?: string) {
  const lines = [
    `✨ ${part.name} ✨`,
    "",
    `Peça impressa em 3D com acabamento cuidado, em ${part.material}.`,
    "• Feita à mão, peça a peça",
    "• Leve, resistente e pronta a usar",
    "• Personalização de cor por encomenda",
    "",
    `💰 Preço: ${formatMoney(price, currency)}`,
    "📦 Envio ou entrega em mão",
  ];
  if (contact) lines.push(`📲 Encomendas: ${contact}`);
  return lines.join("\n");
}

export function whatsappLink(text: string) {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
