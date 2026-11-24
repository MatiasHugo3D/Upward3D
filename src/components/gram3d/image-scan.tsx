import { Camera, ImageUp, Loader2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { recognizeImage } from "@/lib/gram3d/ocr";

/** Upload / camera capture + OCR. Calls onText with the recognised text. */
export function ImageScan({
  onText,
  title,
  hint,
}: {
  onText: (text: string) => void;
  title: string;
  hint: string;
}) {
  const uploadRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);

  const handle = async (file?: File) => {
    if (!file) return;
    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(file));
    setProgress(0);
    try {
      const text = await recognizeImage(file, setProgress);
      onText(text);
    } catch (e) {
      console.error(e);
      toast.error("Não foi possível ler a imagem. Preenche os campos manualmente.");
    } finally {
      setProgress(null);
    }
  };

  const busy = progress !== null;

  return (
    <div className="panel relative overflow-hidden p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative grid h-28 w-full shrink-0 place-items-center overflow-hidden rounded-lg border border-dashed border-border-strong bg-surface grid-bg sm:w-40">
          {preview ? (
            <img src={preview} alt="Print carregado" className="h-full w-full object-cover opacity-80" />
          ) : (
            <ImageUp className="size-6 text-muted-foreground" />
          )}
          {busy && (
            <>
              <div className="pointer-events-none absolute inset-x-0 top-0 h-1/4 bg-gradient-to-b from-transparent via-primary/40 to-transparent animate-scan" />
              <div className="absolute inset-x-0 bottom-0 bg-background/80 px-2 py-1 text-center text-[11px] tabular">
                A ler… {Math.round((progress ?? 0) * 100)}%
              </div>
            </>
          )}
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-medium">{title}</h3>
          <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" onClick={() => uploadRef.current?.click()} disabled={busy}>
              {busy ? <Loader2 className="animate-spin" /> : <ImageUp />}
              Carregar print
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => cameraRef.current?.click()}
              disabled={busy}
            >
              <Camera />
              Tirar foto
            </Button>
          </div>
        </div>
      </div>
      <input
        ref={uploadRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          handle(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          handle(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}
