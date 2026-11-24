import { Recycle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LOW_STOCK_GRAMS, knownPieces, leftoverSuggestions } from "@/lib/gram3d/calc";
import { formatGrams, formatMoney } from "@/lib/gram3d/format";
import { useAppState } from "@/lib/gram3d/store";

export function LeftoversDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { rolls, prints, parts, settings } = useAppState();
  const results = open ? leftoverSuggestions(rolls, knownPieces(prints, parts), settings) : [];
  const fmt = (v: number) => formatMoney(v, settings.currency);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Recycle className="size-4 text-primary" /> O que imprimir com as sobras?
          </DialogTitle>
          <DialogDescription>
            Peças que já imprimiste e que cabem nos rolos com menos de {LOW_STOCK_GRAMS} g — sem abrir rolos novos.
          </DialogDescription>
        </DialogHeader>

        {results.length === 0 && (
          <p className="rounded-lg border border-border p-6 text-center text-sm text-muted-foreground">
            Nenhum rolo abaixo de {LOW_STOCK_GRAMS} g. Sem sobras para aproveitar.
          </p>
        )}

        <div className="space-y-4">
          {results.map(({ roll, options }) => (
            <div key={roll.id} className="panel p-4">
              <div className="mb-3 flex items-center gap-3">
                <span className="size-6 shrink-0 rounded-full ring-1 ring-inset ring-foreground/20" style={{ backgroundColor: roll.colorHex }} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">
                    {roll.brand} {roll.material} {roll.colorName}
                  </div>
                  <div className="text-xs text-muted-foreground">Sobra de {formatGrams(roll.remainingGrams)}</div>
                </div>
              </div>
              {options.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma peça conhecida cabe em {formatGrams(roll.remainingGrams)}.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {options.map((o, i) => (
                    <li key={o.piece.name} className="flex items-center gap-3 py-2.5 text-sm">
                      <span className="w-9 shrink-0 font-semibold tabular text-primary">{o.count}×</span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">
                          {o.piece.name}
                          {i === 0 && (
                            <span className="ml-2 rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                              Melhor lucro
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatGrams(o.piece.grams)} cada · {fmt(o.unitPrice)}/un · sobram {formatGrams(o.leftover)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold tabular text-success">+{fmt(o.totalProfit)}</div>
                        <div className="text-[11px] text-muted-foreground">lucro potencial</div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
