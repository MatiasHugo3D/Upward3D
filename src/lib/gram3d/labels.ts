import type { ReadyPart, Roll } from "./types";

export type MaterialFamily = "PLA" | "PETG" | "ABS" | "ASA" | "TPU" | "OUTRO";

export function materialFamily(material: string): MaterialFamily {
  const m = material.toUpperCase();
  if (m.includes("PETG")) return "PETG";
  if (m.includes("TPU")) return "TPU";
  if (m.includes("ASA")) return "ASA";
  if (m.includes("ABS")) return "ABS";
  if (m.includes("PLA")) return "PLA";
  return "OUTRO";
}

/** Care notes printed on the client label. */
export const CARE: Record<MaterialFamily, string[]> = {
  PLA: [
    "Evitar calor acima de 50 °C (carro ao sol, máquina de lavar)",
    "Limpar com pano húmido, sem solventes",
    "Não usar para alimentos",
  ],
  PETG: [
    "Resiste até cerca de 70 °C",
    "Lavar à mão com água morna e sabão neutro",
    "Evitar acetona e álcool forte",
  ],
  ABS: ["Resiste até cerca de 90 °C", "Limpar com pano húmido", "Evitar acetona"],
  ASA: ["Resistente a sol e exterior", "Resiste até cerca de 90 °C", "Limpar com pano húmido"],
  TPU: ["Peça flexível — não esticar em excesso", "Lavar com água e sabão neutro", "Evitar calor acima de 60 °C"],
  OUTRO: ["Limpar com pano húmido", "Evitar calor intenso e sol direto"],
};

/** Ideal print temperatures for the roll label. */
export const PRINT_TEMPS: Record<MaterialFamily, { nozzle: string; bed: string; note: string }> = {
  PLA: { nozzle: "200–220 °C", bed: "55–60 °C", note: "Ventilador 100%" },
  PETG: { nozzle: "230–250 °C", bed: "70–85 °C", note: "Ventilador 30–50%, secar 65 °C/4h" },
  ABS: { nozzle: "240–260 °C", bed: "95–110 °C", note: "Câmara fechada, ventilador 0–20%" },
  ASA: { nozzle: "240–260 °C", bed: "90–105 °C", note: "Câmara fechada, ventilador 20–30%" },
  TPU: { nozzle: "210–230 °C", bed: "40–60 °C", note: "Velocidade baixa (20–30 mm/s)" },
  OUTRO: { nozzle: "ver fabricante", bed: "ver fabricante", note: "Guardar seco, com sílica" },
};

export function partQrText(part: Pick<ReadyPart, "name" | "material">, brand: string, contact: string) {
  return [
    `${brand} — ${part.name}`,
    `Material: ${part.material}`,
    "Cuidados:",
    ...CARE[materialFamily(part.material)].map((c) => `- ${c}`),
    contact ? `Contacto: ${contact}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function rollQrText(roll: Pick<Roll, "brand" | "material" | "colorName" | "remainingGrams" | "totalGrams">) {
  const t = PRINT_TEMPS[materialFamily(roll.material)];
  return [
    `${roll.brand} ${roll.material} ${roll.colorName}`,
    `Restante: ${Math.round(roll.remainingGrams)} g / ${roll.totalGrams} g`,
    `Bico: ${t.nozzle}`,
    `Mesa: ${t.bed}`,
    t.note,
  ].join("\n");
}
