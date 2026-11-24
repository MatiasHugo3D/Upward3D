import { CheckCircle2 } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { currencySymbol, formatMoney } from "@/lib/gram3d/format";
import { actions, useAppState } from "@/lib/gram3d/store";
import type { PrintJob } from "@/lib/gram3d/types";
import { PhotoPicker } from "./photo-picker";

const toNum = (s: string) => {
  const v = parseFloat(s.replace(",", "."));
  return Number.isFinite(v) ? v : 0;
};

export function CompleteDialog({ job, onClose }: { job: PrintJob | null; onClose: () => void }) {
  const { settings } = useAppState();
  const [name, setName] = useState("");
  const [material, setMaterial] = useState("");
  const [price, setPrice] = useState("");
  const [qty, setQty] = useState("1");
  const [photo, setPhoto] = useState<string | undefined>();

  useEffect(() => {
    if (!job) return;
    setName(job.name);
    setMaterial([...new Set(job.filaments.map((f) => f.material))].join(" + ") || "PLA");
    setPrice(String(job.finalPrice));
    setQty("1");
    setPhoto(undefined);
  }, [job]);

  if (!job) return null;

  const finish = (toStock: boolean) => {
    actions.completePrint(job.id);
    if (toStock) {
      const q = Math.max(1, Math.floor(toNum(qty)));
      actions.addPartFromPrint(job.id, {
        quantity: q,
        name: name.trim() || job.name,
        material: material.trim() || "PLA",
        unitPrice: toNum(price),
        photo,
      });
      toast.success(`${q}× ${name.trim() || job.name} guardada no Stock de Peças Prontas`);
    } else {
      toast.success("Impressão marcada como concluída");
    }
    onClose();
  };

  return (
    <Dialog open={!!job} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="size-5 text-success" /> Impressão concluída
          </DialogTitle>
          <DialogDescription>Queres guardar esta peça no Stock de Peças Prontas para vender?</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-1">
          <div className="grid gap-1.5">
            <Label>Foto da peça</Label>
            <PhotoPicker value={photo} onChange={setPhoto} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="c-name">Nome</Label>
            <Input id="c-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-[1fr_1fr_72px] gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="c-mat" className="text-xs">Material</Label>
              <Input id="c-mat" value={material} onChange={(e) => setMaterial(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="c-price" className="text-xs">Preço ({currencySymbol(settings.currency)})</Label>
              <Input id="c-price" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} className="tabular" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="c-qty" className="text-xs">Qtd.</Label>
              <Input id="c-qty" inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value.replace(/\D/g, ""))} className="tabular" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Preço calculado: {formatMoney(job.finalPrice, settings.currency)} · custo {formatMoney(job.realCost, settings.currency)}
          </p>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => finish(false)}>
            Só concluir
          </Button>
          <Button onClick={() => finish(true)}>Guardar no stock</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
