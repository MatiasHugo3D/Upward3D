import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { failureSplit } from "@/lib/gram3d/calc";
import { formatGrams } from "@/lib/gram3d/format";
import { parsePercent } from "@/lib/gram3d/ocr-parse";
import { actions } from "@/lib/gram3d/store";
import type { PrintJob } from "@/lib/gram3d/types";
import { ImageScan } from "./image-scan";

export function FailDialog({ job, onClose }: { job: PrintJob | null; onClose: () => void }) {
  const [percent, setPercent] = useState(50);

  useEffect(() => {
    if (job) setPercent(50);
  }, [job]);

  if (!job) return null;
  const split = failureSplit(job.grams + job.purgeGrams, percent);

  return (
    <Dialog open={!!job} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Registar falha · {job.name}</DialogTitle>
          <DialogDescription>
            Em que ponto parou a impressão? O filamento não gasto volta {job.filaments.length > 1 ? `aos ${job.filaments.length} rolos usados` : `ao rolo ${job.filaments[0]?.rollLabel ?? ""}`}.
          </DialogDescription>
        </DialogHeader>

        <ImageScan
          title="Ler % da app da impressora"
          hint="Carrega o print do progresso (ex: Anycubic App, Bambu Handy)."
          onText={(text) => {
            const p = parsePercent(text);
            if (p === null) toast.warning("Não encontrei uma percentagem. Usa a barra.");
            else {
              setPercent(p);
              toast.success(`Lido: parou nos ${p}%`);
            }
          }}
        />

        <div className="panel p-5">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-muted-foreground">Parou em</span>
            <span className="text-4xl font-semibold tabular text-destructive">{split.percent}%</span>
          </div>
          <Slider
            className="mt-5"
            value={[percent]}
            min={1}
            max={99}
            step={1}
            onValueChange={([v]) => setPercent(v ?? 50)}
            aria-label="Percentagem onde a impressão parou"
          />
          <div className="mt-2 flex justify-between text-[11px] text-muted-foreground tabular">
            <span>1%</span>
            <span>99%</span>
          </div>

          <div className="mt-5 flex h-2 overflow-hidden rounded-full bg-surface">
            <div className="bg-destructive" style={{ width: `${split.percent}%` }} />
            <div className="bg-success" style={{ width: `${100 - split.percent}%` }} />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg bg-surface p-3">
              <div className="text-[11px] text-muted-foreground">Desperdício</div>
              <div className="mt-0.5 font-semibold tabular text-destructive">{formatGrams(split.wasted)}</div>
            </div>
            <div className="rounded-lg bg-surface p-3">
              <div className="text-[11px] text-muted-foreground">Volta ao stock</div>
              <div className="mt-0.5 font-semibold tabular text-success">+ {formatGrams(split.returned)}</div>
            </div>
          </div>
        </div>

        {job.filaments.length > 1 && (
          <ul className="space-y-1.5 rounded-lg border border-border bg-surface p-3 text-xs">
            {job.filaments.map((f) => (
              <li key={f.rollId + f.grams} className="flex items-center gap-2 tabular">
                <span className="size-2.5 rounded-full border border-border-strong" style={{ backgroundColor: f.colorHex }} />
                <span className="flex-1 truncate text-muted-foreground">{f.rollLabel}</span>
                <span className="text-success">+ {formatGrams(failureSplit(f.totalGrams, split.percent).returned)}</span>
              </li>
            ))}
          </ul>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              actions.failPrint(job.id, split.percent);
              toast.success(`${formatGrams(split.returned)} devolvidos ao stock`, {
                description: `Perda registada: ${formatGrams(split.wasted)}`,
              });
              onClose();
            }}
          >
            Confirmar falha
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
