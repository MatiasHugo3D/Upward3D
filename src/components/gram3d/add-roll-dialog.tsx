import { useState } from "react";
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
import { cn } from "@/lib/utils";

const MATERIALS = ["PLA", "PLA+", "PETG", "ABS", "ASA", "TPU", "Silk PLA"];
const SWATCHES = ["#1c1c1f", "#eeeeea", "#f2791f", "#d63a3a", "#2f6fdc", "#2fa36b", "#f4c430", "#8a8f98"];

export function AddRollDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { settings } = useAppState();
  const [brand, setBrand] = useState("");
  const [material, setMaterial] = useState("PLA");
  const [colorName, setColorName] = useState("");
  const [colorHex, setColorHex] = useState<string>(SWATCHES[0]!);
  const [total, setTotal] = useState("1000");
  const [remaining, setRemaining] = useState("");
  const [price, setPrice] = useState("");

  const reset = () => {
    setBrand("");
    setMaterial("PLA");
    setColorName("");
    setColorHex(SWATCHES[0]!);
    setTotal("1000");
    setRemaining("");
    setPrice("");
  };

  const save = (): void => {
    const t = parseFloat(total.replace(",", "."));
    const r = remaining.trim() ? parseFloat(remaining.replace(",", ".")) : t;
    const p = parseFloat(price.replace(",", "."));
    if (!brand.trim()) { toast.error("Indica a marca"); return; }
    if (!colorName.trim()) { toast.error("Indica a cor"); return; }
    if (!(t > 0) || !(r >= 0) || r > t) { toast.error("Gramas inválidas"); return; }
    if (!(p >= 0)) { toast.error("Indica o preço pago"); return; }
    actions.addRoll({
      brand: brand.trim(),
      material,
      colorName: colorName.trim(),
      colorHex,
      totalGrams: t,
      remainingGrams: r,
      price: p,
    });
    toast.success("Rolo adicionado");
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar Novo Rolo</DialogTitle>
          <DialogDescription>O preço por grama é calculado a partir do preço pago.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="brand">Marca</Label>
              <Input id="brand" placeholder="Ex: Sunlu" value={brand} onChange={(e) => setBrand(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="cname">Cor</Label>
              <Input id="cname" placeholder="Ex: Azul" value={colorName} onChange={(e) => setColorName(e.target.value)} />
            </div>
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
          <div className="grid gap-1.5">
            <Label>Cor do filamento</Label>
            <div className="flex flex-wrap items-center gap-2">
              {SWATCHES.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={`Cor ${c}`}
                  onClick={() => setColorHex(c)}
                  className={cn(
                    "size-8 rounded-full border-2 transition-transform",
                    colorHex === c ? "scale-110 border-primary" : "border-border-strong",
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
              <label className="relative size-8 cursor-pointer overflow-hidden rounded-full border-2 border-dashed border-border-strong">
                <input
                  type="color"
                  value={colorHex}
                  onChange={(e) => setColorHex(e.target.value)}
                  className="absolute inset-0 size-full cursor-pointer opacity-0"
                  aria-label="Cor personalizada"
                />
                <span className="grid size-full place-items-center text-xs text-muted-foreground">+</span>
              </label>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="total" className="text-xs">Total (g)</Label>
              <Input id="total" inputMode="decimal" value={total} onChange={(e) => setTotal(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="remaining" className="text-xs">Restante (g)</Label>
              <Input id="remaining" inputMode="decimal" placeholder={total} value={remaining} onChange={(e) => setRemaining(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="price" className="text-xs">Preço ({currencySymbol(settings.currency)})</Label>
              <Input id="price" inputMode="decimal" placeholder="19,99" value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={save}>Adicionar rolo</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
