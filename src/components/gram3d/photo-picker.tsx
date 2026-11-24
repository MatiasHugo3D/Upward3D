import { Camera, ImagePlus, X } from "lucide-react";
import { useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { fileToDataUrl } from "@/lib/gram3d/image";

export function PhotoPicker({ value, onChange }: { value?: string | undefined; onChange: (v: string | undefined) => void }) {
  const upload = useRef<HTMLInputElement>(null);
  const camera = useRef<HTMLInputElement>(null);
  const handle = async (f?: File) => {
    if (!f) return;
    try {
      onChange(await fileToDataUrl(f));
    } catch {
      toast.error("Não foi possível ler a foto");
    }
  };
  return (
    <div className="flex items-center gap-3">
      <div className="relative grid size-20 shrink-0 place-items-center overflow-hidden rounded-lg border border-dashed border-border-strong bg-surface grid-bg">
        {value ? (
          <>
            <img src={value} alt="Foto da peça" className="size-full object-cover" />
            <button
              type="button"
              onClick={() => onChange(undefined)}
              aria-label="Remover foto"
              className="absolute right-1 top-1 grid size-5 place-items-center rounded-full bg-background/80 text-foreground"
            >
              <X className="size-3" />
            </button>
          </>
        ) : (
          <ImagePlus className="size-5 text-muted-foreground" />
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" onClick={() => upload.current?.click()}>
          <ImagePlus /> Carregar foto
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => camera.current?.click()}>
          <Camera /> Tirar foto
        </Button>
      </div>
      <input ref={upload} type="file" accept="image/*" className="hidden" onChange={(e) => { handle(e.target.files?.[0]); e.target.value = ""; }} />
      <input ref={camera} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { handle(e.target.files?.[0]); e.target.value = ""; }} />
    </div>
  );
}
