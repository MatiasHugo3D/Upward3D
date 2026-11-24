import { Download, FileImage, Loader2, Package, Share2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CATALOG_MAX, renderCatalog, slug } from "@/lib/gram3d/canvas";
import { formatMoney } from "@/lib/gram3d/format";
import { downloadDataUrl } from "@/lib/gram3d/image";
import { shareToWhatsApp } from "@/lib/gram3d/share";
import { useAppState } from "@/lib/gram3d/store";

export function CatalogDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { parts, profile, settings } = useAppState();
  const [selected, setSelected] = useState<string[]>([]);
  const [preview, setPreview] = useState<string | undefined>();

  useEffect(() => {
    if (open) setSelected(parts.filter((p) => p.quantity > 0).slice(0, CATALOG_MAX).map((p) => p.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const chosen = parts.filter((p) => selected.includes(p.id));
  const key = chosen.map((p) => `${p.id}:${p.unitPrice}`).join("|") + settings.currency + profile.brandName + profile.contact;

  useEffect(() => {
    if (!open || chosen.length === 0) {
      setPreview(undefined);
      return;
    }
    let cancelled = false;
    setPreview(undefined);
    renderCatalog({
      brand: profile.brandName || "Gram3D",
      contact: profile.contact,
      items: chosen.map((p) => ({
        photo: p.photo,
        name: p.name,
        material: p.material,
        price: formatMoney(p.unitPrice, settings.currency),
      })),
    }).then((u) => !cancelled && setPreview(u));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, key]);

  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length >= CATALOG_MAX ? s : [...s, id]));

  const filename = `catalogo-${slug(profile.brandName)}.png`;
  const text = `📄 Catálogo ${profile.brandName}\n${chosen
    .map((p) => `• ${p.name} — ${formatMoney(p.unitPrice, settings.currency)}`)
    .join("\n")}${profile.contact ? `\n\n📲 Encomendas: ${profile.contact}` : ""}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileImage className="size-4 text-primary" /> Catálogo WhatsApp
          </DialogTitle>
          <DialogDescription>Escolhe até {CATALOG_MAX} peças para um flyer vertical com fotos e preços.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 md:grid-cols-[1fr_260px]">
          <div className="space-y-1.5">
            {parts.length === 0 && <p className="text-sm text-muted-foreground">Ainda não tens peças em stock.</p>}
            {parts.map((p) => (
              <label
                key={p.id}
                className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-2 transition-colors hover:bg-accent/50"
              >
                <Checkbox checked={selected.includes(p.id)} onCheckedChange={() => toggle(p.id)} aria-label={p.name} />
                <div className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-md bg-surface">
                  {p.photo ? <img src={p.photo} alt="" className="size-full object-cover" /> : <Package className="size-4 text-muted-foreground" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{p.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {p.material} · {p.quantity} em stock
                  </div>
                </div>
                <div className="text-sm font-semibold tabular">{formatMoney(p.unitPrice, settings.currency)}</div>
              </label>
            ))}
          </div>
          <div className="space-y-3">
            <div className="grid aspect-[9/16] place-items-center overflow-hidden rounded-xl border border-border bg-surface grid-bg">
              {preview ? (
                <img src={preview} alt="Pré-visualização do catálogo" className="size-full object-contain" />
              ) : chosen.length ? (
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              ) : (
                <p className="px-4 text-center text-xs text-muted-foreground">Seleciona peças</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" disabled={!preview} onClick={() => preview && downloadDataUrl(preview, filename)}>
                <Download /> PNG
              </Button>
              <Button
                size="sm"
                disabled={!preview}
                className="bg-gradient-primary shadow-glow hover:opacity-90"
                onClick={() => preview && shareToWhatsApp(preview, filename, text)}
              >
                <Share2 /> WhatsApp
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
