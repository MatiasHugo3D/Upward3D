import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, Plus, QrCode, Recycle, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AddRollDialog } from "@/components/gram3d/add-roll-dialog";
import { LabelDialog } from "@/components/gram3d/label-dialog";
import { LeftoversDialog } from "@/components/gram3d/leftovers-dialog";
import { PageHeader } from "@/components/gram3d/page-header";
import type { LabelInput } from "@/lib/gram3d/canvas";
import { PRINT_TEMPS, materialFamily, rollQrText } from "@/lib/gram3d/labels";
import type { Roll } from "@/lib/gram3d/types";
import { LOW_STOCK_GRAMS } from "@/lib/gram3d/calc";
import { formatGrams, formatMoney } from "@/lib/gram3d/format";
import { actions, useAppState } from "@/lib/gram3d/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/stock")({
  head: () => ({
    meta: [
      { title: "Stock de Filamentos — Gram3D" },
      { name: "description", content: "Gere os teus rolos de filamento, gramas restantes e alertas de stock baixo." },
      { property: "og:title", content: "Stock de Filamentos — Gram3D" },
      { property: "og:description", content: "Rolos de filamento com gramas restantes, preço pago e alertas de stock." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StockPage,
});

function StockPage() {
  const { rolls, settings } = useAppState();
  const [open, setOpen] = useState(false);
  const [leftovers, setLeftovers] = useState(false);
  const [qr, setQr] = useState<LabelInput | null>(null);
  const low = rolls.filter((r) => r.remainingGrams < LOW_STOCK_GRAMS);

  return (
    <>
      <PageHeader
        eyebrow="Inventário"
        title="Stock de Filamentos"
        description={`${rolls.length} rolos · ${formatGrams(rolls.reduce((s, r) => s + r.remainingGrams, 0))} disponíveis`}
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setLeftovers(true)}>
              <Recycle /> O que imprimir com as minhas sobras?
            </Button>
            <Button onClick={() => setOpen(true)} className="bg-gradient-primary shadow-glow hover:opacity-90">
              <Plus /> Novo Rolo
            </Button>
          </div>
        }
      />

      {low.length > 0 && (
        <div className="mb-5 flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/10 p-3.5 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
          <div>
            <span className="font-medium text-warning">Stock baixo</span>
            <span className="text-muted-foreground">
              {" "}— {low.map((r) => `${r.brand} ${r.colorName}`).join(", ")} com menos de {LOW_STOCK_GRAMS} g.
            </span>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rolls.map((r) => {
          const pct = r.totalGrams > 0 ? (r.remainingGrams / r.totalGrams) * 100 : 0;
          const isLow = r.remainingGrams < LOW_STOCK_GRAMS;
          return (
            <div key={r.id} className={cn("panel relative overflow-hidden p-5", isLow && "border-warning/40")}>
              <div
                className="pointer-events-none absolute -right-10 -top-10 size-36 rounded-full opacity-25 blur-3xl"
                style={{ backgroundColor: r.colorHex }}
              />
              <div className="relative flex items-start gap-4">
                <Spool color={r.colorHex} pct={pct} />
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-muted-foreground">{r.brand}</div>
                  <div className="truncate font-semibold">
                    {r.material} {r.colorName}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground tabular">
                    {formatMoney(r.price, settings.currency)} · {formatMoney(r.price / r.totalGrams, settings.currency, 4)}/g
                  </div>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="-mt-2 text-muted-foreground"
                  aria-label={`QR do rolo ${r.brand} ${r.colorName}`}
                  title="QR Rolo"
                  onClick={() => setQr(rollLabel(r))}
                >
                  <QrCode />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="-mr-2 -ml-2 -mt-2 text-muted-foreground"
                  aria-label={`Remover ${r.brand} ${r.colorName}`}
                  onClick={() => {
                    if (confirm(`Remover o rolo ${r.brand} ${r.material} ${r.colorName}?`)) actions.removeRoll(r.id);
                  }}
                >
                  <Trash2 />
                </Button>
              </div>

              <div className="relative mt-5">
                <div className="flex items-baseline justify-between">
                  <span className="text-lg font-semibold tabular">
                    {Math.round(r.remainingGrams)}g
                    <span className="text-sm font-normal text-muted-foreground"> / {r.totalGrams}g</span>
                  </span>
                  {isLow ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-warning/30 bg-warning/10 px-2 py-0.5 text-[11px] font-medium text-warning">
                      <AlertTriangle className="size-3" /> Stock baixo
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground tabular">{pct.toFixed(0)}%</span>
                  )}
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface">
                  <div
                    className={cn("h-full rounded-full ring-1 ring-inset ring-foreground/15 transition-all", isLow && "bg-warning")}
                    style={{ width: `${pct}%`, backgroundColor: isLow ? undefined : r.colorHex }}
                  />
                </div>
              </div>
            </div>
          );
        })}

        <button
          onClick={() => setOpen(true)}
          className="flex min-h-[180px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border-strong text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
        >
          <Plus className="size-5" />
          Adicionar Novo Rolo
        </button>
      </div>

      <AddRollDialog open={open} onOpenChange={setOpen} />
      <LeftoversDialog open={leftovers} onOpenChange={setLeftovers} />
      <LabelDialog
        title="QR Rolo"
        description="Cola esta etiqueta na bobina: material, peso restante e temperaturas ideais."
        label={qr}
        onClose={() => setQr(null)}
      />
    </>
  );
}

function rollLabel(r: Roll): LabelInput {
  const t = PRINT_TEMPS[materialFamily(r.material)];
  return {
    heading: "Gram3D · Filamento",
    title: `${r.material} ${r.colorName}`,
    subtitle: `${r.brand} · restam ${Math.round(r.remainingGrams)} g de ${r.totalGrams} g`,
    lines: [`Bico: ${t.nozzle}`, `Mesa: ${t.bed}`, t.note, `Aberto em ${new Date(r.createdAt).toLocaleDateString("pt-PT")}`],
    qrText: rollQrText(r),
    swatch: r.colorHex,
  };
}

function Spool({ color, pct }: { color: string; pct: number }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 56 56" className="size-14 shrink-0" aria-hidden>
      <circle cx="28" cy="28" r="27" className="fill-surface stroke-border-strong" strokeWidth="1" />
      <circle
        cx="28"
        cy="28"
        r={r}
        fill="none"
        className="stroke-border-strong"
        strokeWidth="10"
        strokeDasharray={`${(c * pct) / 100} ${c}`}
        transform="rotate(-90 28 28)"
        strokeLinecap="round"
      />
      <circle
        cx="28"
        cy="28"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="8"
        strokeDasharray={`${(c * pct) / 100} ${c}`}
        transform="rotate(-90 28 28)"
        strokeLinecap="round"
      />
      <circle cx="28" cy="28" r="7" className="fill-background stroke-border-strong" strokeWidth="1" />
    </svg>
  );
}
