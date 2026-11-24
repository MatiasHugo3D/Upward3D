import { ExternalLink } from "lucide-react";
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
import { actions, useAppState } from "@/lib/gram3d/store";
import { cleanKey } from "@/lib/gram3d/ai-keys";
import { currencySymbol } from "@/lib/gram3d/format";

export function CostsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { settings, profile } = useAppState();
  const [kwh, setKwh] = useState(String(settings.kwhRate));
  const [wear, setWear] = useState(String(settings.wearPerHour));
  const [printer, setPrinter] = useState(settings.printerName);
  const [brand, setBrand] = useState(profile.brandName);
  const [contact, setContact] = useState(profile.contact);
  const [gemini, setGemini] = useState(settings.geminiKey);
  const [hf, setHf] = useState(settings.hfToken);

  useEffect(() => {
    if (open) {
      setKwh(String(settings.kwhRate));
      setWear(String(settings.wearPerHour));
      setPrinter(settings.printerName);
      setBrand(profile.brandName);
      setContact(profile.contact);
      setGemini(settings.geminiKey);
      setHf(settings.hfToken);
    }
  }, [open, settings, profile]);

  const sym = currencySymbol(settings.currency);

  const save = () => {
    const k = parseFloat(kwh.replace(",", "."));
    const w = parseFloat(wear.replace(",", "."));
    if (!Number.isFinite(k) || k < 0 || !Number.isFinite(w) || w < 0) {
      toast.error("Valores inválidos");
      return;
    }
    actions.updateSettings({
      kwhRate: k,
      wearPerHour: w,
      printerName: printer.trim() || "Impressora",
      geminiKey: cleanKey(gemini),
      hfToken: cleanKey(hf),
    });
    actions.updateProfile({ brandName: brand.trim() || "Gram3D", contact: contact.trim() });
    toast.success("Configurações guardadas");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Configurações</DialogTitle>
          <DialogDescription>Guardado só neste navegador. Consumo fixo da impressora: 0,15 kW.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="text-xs font-medium uppercase tracking-[0.14em] text-primary">Impressora & custos</div>
          <div className="grid gap-1.5">
            <Label htmlFor="printer">Impressora</Label>
            <Input id="printer" value={printer} onChange={(e) => setPrinter(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="kwh">Tarifa ({sym}/kWh)</Label>
              <Input id="kwh" inputMode="decimal" value={kwh} onChange={(e) => setKwh(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="wear">Desgaste ({sym}/hora)</Label>
              <Input id="wear" inputMode="decimal" value={wear} onChange={(e) => setWear(e.target.value)} />
            </div>
          </div>

          <div className="mt-2 text-xs font-medium uppercase tracking-[0.14em] text-primary">Marca & contacto</div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="brand">Nome da marca</Label>
              <Input id="brand" value={brand} onChange={(e) => setBrand(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="contact">Contacto</Label>
              <Input id="contact" value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Telefone ou @instagram" />
            </div>
          </div>
          <p className="-mt-2 text-xs text-muted-foreground">Aparece nos anúncios, no catálogo e nas etiquetas QR.</p>

          <div className="mt-2 text-xs font-medium uppercase tracking-[0.14em] text-primary">Chaves de IA gratuitas</div>
          <div className="grid gap-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="gemini">Chave Google Gemini</Label>
              <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                Criar grátis <ExternalLink className="size-3" />
              </a>
            </div>
            <Input id="gemini" type="password" autoComplete="off" value={gemini} onChange={(e) => setGemini(e.target.value)} placeholder="AIza…" />
          </div>
          <div className="grid gap-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="hf">Token Hugging Face</Label>
              <a href="https://huggingface.co/settings/tokens" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                Criar grátis <ExternalLink className="size-3" />
              </a>
            </div>
            <Input id="hf" type="password" autoComplete="off" value={hf} onChange={(e) => setHf(e.target.value)} placeholder="hf_…" />
          </div>
        </div>
        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            variant="ghost"
            className="text-muted-foreground"
            onClick={() => {
              if (confirm("Repor todos os dados de demonstração? Isto apaga os teus dados.")) {
                actions.resetDemo();
                toast.success("Dados de demonstração repostos");
                onOpenChange(false);
              }
            }}
          >
            Repor demo
          </Button>
          <Button onClick={save}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
