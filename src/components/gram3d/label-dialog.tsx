import { Download, Loader2, QrCode } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { renderLabel, slug, type LabelInput } from "@/lib/gram3d/canvas";
import { downloadDataUrl } from "@/lib/gram3d/image";

/** Shows a printable QR label; `label` null → closed. */
export function LabelDialog({
  title,
  description,
  label,
  onClose,
}: {
  title: string;
  description: string;
  label: LabelInput | null;
  onClose: () => void;
}) {
  const [url, setUrl] = useState<string | undefined>();
  const key = label ? JSON.stringify(label) : "";

  useEffect(() => {
    setUrl(undefined);
    if (!label) return;
    let cancelled = false;
    renderLabel(label).then((u) => !cancelled && setUrl(u));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const print = () => {
    if (!url) return;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(
      `<title>${title}</title><body style="margin:0;display:grid;place-items:center;min-height:100vh"><img src="${url}" style="width:90mm" onload="setTimeout(()=>print(),200)"></body>`,
    );
    w.document.close();
  };

  return (
    <Dialog open={Boolean(label)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="size-4 text-primary" /> {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="grid aspect-[2/1] place-items-center overflow-hidden rounded-xl border border-border bg-surface">
          {url ? <img src={url} alt={title} className="size-full object-contain" /> : <Loader2 className="size-5 animate-spin text-muted-foreground" />}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" disabled={!url} onClick={print}>
            Imprimir
          </Button>
          <Button disabled={!url} onClick={() => url && label && downloadDataUrl(url, `etiqueta-${slug(label.title)}.png`)}>
            <Download /> Baixar PNG
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
