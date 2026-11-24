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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatMoney } from "@/lib/gram3d/format";
import { actions, useAppState } from "@/lib/gram3d/store";

const inDays = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export function OrderDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { parts, settings } = useAppState();
  const [client, setClient] = useState("");
  const [partId, setPartId] = useState("");
  const [qty, setQty] = useState("1");
  const [due, setDue] = useState(inDays(7));

  useEffect(() => {
    if (open) {
      setClient("");
      setPartId(parts[0]?.id ?? "");
      setQty("1");
      setDue(inDays(7));
    }
  }, [open, parts]);

  const part = parts.find((p) => p.id === partId);
  const q = Math.max(1, parseInt(qty || "1"));
  const total = part ? part.unitPrice * q : 0;

  const save = () => {
    if (!client.trim()) {
      toast.error("Indica o nome do cliente");
      return;
    }
    if (!part) {
      toast.error("Escolhe uma peça do stock");
      return;
    }
    if (!due) {
      toast.error("Indica a data de entrega");
      return;
    }
    actions.addOrder({
      client: client.trim(),
      partId: part.id,
      partName: part.name,
      quantity: q,
      unitPrice: part.unitPrice,
      unitCost: part.unitCost,
      dueDate: due,
    });
    toast.success("Encomenda registada");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nova encomenda</DialogTitle>
          <DialogDescription>O preço vem automaticamente da peça escolhida.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-1">
          <div className="grid gap-1.5">
            <Label htmlFor="o-client">Cliente</Label>
            <Input id="o-client" placeholder="Ex: Ana Costa" value={client} onChange={(e) => setClient(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label>Peça</Label>
            <Select value={partId} onValueChange={setPartId}>
              <SelectTrigger className="h-11" aria-label="Peça">
                <SelectValue placeholder={parts.length ? "Escolhe uma peça" : "Sem peças no stock"} />
              </SelectTrigger>
              <SelectContent>
                {parts.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} · {formatMoney(p.unitPrice, settings.currency)}
                    <span className="text-muted-foreground"> · {p.quantity} em stock</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="o-qty">Quantidade</Label>
              <Input id="o-qty" inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value.replace(/\D/g, ""))} className="tabular" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="o-due">Data de entrega</Label>
              <Input id="o-due" type="date" value={due} onChange={(e) => setDue(e.target.value)} />
            </div>
          </div>
          <div className="flex items-baseline justify-between rounded-lg bg-surface p-3">
            <span className="text-sm text-muted-foreground">Total</span>
            <span className="text-xl font-semibold tabular text-gradient-primary">{formatMoney(total, settings.currency)}</span>
          </div>
          {part && q > part.quantity && (
            <p className="text-xs text-warning">Só tens {part.quantity} em stock — vais precisar de imprimir mais.</p>
          )}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={save}>Registar encomenda</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
