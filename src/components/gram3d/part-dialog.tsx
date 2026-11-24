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
import { currencySymbol } from "@/lib/gram3d/format";
import { actions, useAppState } from "@/lib/gram3d/store";
import type { ReadyPart } from "@/lib/gram3d/types";
import { cn } from "@/lib/utils";
import { PhotoPicker } from "./photo-picker";

const MATERIALS = ["PLA", "PLA+", "PETG", "ABS", "ASA", "TPU", "Silk PLA"];
const SWATCHES = ["#1c1c1f", "#eeeeea", "#f2791f", "#d63a3a", "#2f6fdc", "#2fa36b", "#f4c430", "#8a8f98"];

const toNum = (s: string) => {
  const v = parseFloat(s.replace(",", "."));
  return Number.isFinite(v) ? v : 0;
};

/** part = null → closed, "new" → create, ReadyPart → edit */
export function PartDialog({ part, onClose }: { part: ReadyPart | "new" | null; onClose: () => void }) {
  const { settings } = useAppState();
  const editing = part && part !== "new" ? part : null;
  const [name, setName] = useState("");
  const [material, setMaterial] = useState("PLA");
  const [colorHex, setColorHex] = useState<string>(SWATCHES[0]!);
  const [qty, setQty] = useState("1");
  const [price, setPrice] = useState("");
  const [cost, setCost] = useState("");
  const [grams, setGrams] = useState("");
  const [photo, setPhoto] = useState<string | undefined>();

  useEffect(() => {
    if (!part) return;
    const p = part === "new" ? null : part;
    setName(p?.name ?? "");
    setMaterial(p?.material ?? "PLA");
    setColorHex(p?.colorHex ?? SWATCHES[0]!);
    setQty(String(p?.quantity ?? 1));
    setPrice(p ? String(p.unitPrice) : "");
    setCost(p ? String(p.unitCost) : "");
    setGrams(p ? String(p.gramsPerUnit) : "");
    setPhoto(p?.photo);
  }, [part]);

  const save = () => {
    if (!name.trim()) {
      toast.error("Indica o nome da peça");
      return;
    }
    if (!(toNum(price) > 0)) {
      toast.error("Indica o preço de venda");
      return;
    }
    const data = {
      name: name.trim(),
      material,
      colorHex,
      quantity: Math.max(0, Math.floor(toNum(qty))),
      unitPrice: toNum(price),
      unitCost: toNum(cost),
      gramsPerUnit: toNum(grams),
      photo,
    };
    if (editing) {
      actions.updatePart(editing.id, data);
      toast.success("Peça atualizada");
    } else {
      actions.addPart({ ...data, hours: 0, minutes: 0 });
      toast.success("Peça adicionada ao stock");
    }
    onClose();
  };

  const sym = currencySymbol(settings.currency);

  return (
    <Dialog open={!!part} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar peça" : "Nova peça pronta"}</DialogTitle>
          <DialogDescription>Peças prontas a vender, com foto e preço.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-1">
          <PhotoPicker value={photo} onChange={setPhoto} />
          <div className="grid gap-1.5">
            <Label htmlFor="p-name">Nome</Label>
            <Input id="p-name" placeholder="Ex: Porta-chaves personalizado" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label>Material</Label>
            <div className="flex flex-wrap gap-1.5">
              {MATERIALS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMaterial(m)}
                  className={cn(
                    "rounded-md border px-2.5 py-1 text-xs transition-colors",
                    material === m ? "border-primary/50 bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground",
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {SWATCHES.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Cor ${c}`}
                onClick={() => setColorHex(c)}
                className={cn("size-7 rounded-full border-2", colorHex === c ? "scale-110 border-primary" : "border-border-strong")}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="p-price" className="text-xs">Preço de venda ({sym})</Label>
              <Input id="p-price" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} className="tabular" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="p-cost" className="text-xs">Custo ({sym}, opcional)</Label>
              <Input id="p-cost" inputMode="decimal" value={cost} onChange={(e) => setCost(e.target.value)} className="tabular" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="p-qty" className="text-xs">Quantidade</Label>
              <Input id="p-qty" inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value.replace(/\D/g, ""))} className="tabular" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="p-grams" className="text-xs">Peso por unidade (g)</Label>
              <Input id="p-grams" inputMode="decimal" value={grams} onChange={(e) => setGrams(e.target.value)} className="tabular" />
            </div>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={save}>{editing ? "Guardar" : "Adicionar peça"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
