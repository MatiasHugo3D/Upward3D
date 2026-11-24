import { Check, Copy, Download, Loader2, Scissors, Share2, Sparkles, Wand2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { adText } from "@/lib/gram3d/ad";
import { geminiText, hfImage, removeBg } from "@/lib/gram3d/ai";
import { AD_BACKGROUNDS } from "@/lib/gram3d/backgrounds";
import { renderAd, slug } from "@/lib/gram3d/canvas";
import { currencySymbol, formatMoney } from "@/lib/gram3d/format";
import { downloadDataUrl } from "@/lib/gram3d/image";
import { shareToWhatsApp } from "@/lib/gram3d/share";
import { useAppState } from "@/lib/gram3d/store";
import type { ReadyPart } from "@/lib/gram3d/types";
import { cn } from "@/lib/utils";
import { PhotoPicker } from "./photo-picker";

type BgId = (typeof AD_BACKGROUNDS)[number]["id"] | "ai";
const AI_PROMPT =
  "fundo de fotografia de produto, mesa de madeira clara, luz suave de estúdio, sombras suaves, desfocado, sem objetos, sem texto";

const toNum = (s: string) => {
  const v = parseFloat(s.replace(",", "."));
  return Number.isFinite(v) ? v : 0;
};

export function AdStudioDialog({ part, onClose }: { part: ReadyPart | null; onClose: () => void }) {
  const { settings, profile } = useAppState();
  const [photo, setPhoto] = useState<string | undefined>();
  const [cutout, setCutout] = useState<string | undefined>();
  const [useCutout, setUseCutout] = useState(true);
  const [removing, setRemoving] = useState<number | null>(null);
  const [bg, setBg] = useState<BgId>("dark");
  const [aiBg, setAiBg] = useState<string | undefined>();
  const [aiPrompt, setAiPrompt] = useState(AI_PROMPT);
  const [generating, setGenerating] = useState(false);
  const [badge, setBadge] = useState(true);
  const [price, setPrice] = useState("");
  const [text, setText] = useState("");
  const [writing, setWriting] = useState(false);
  const [preview, setPreview] = useState<string | undefined>();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!part) return;
    setPhoto(part.photo);
    setCutout(undefined);
    setUseCutout(true);
    setRemoving(null);
    setBg("dark");
    setBadge(true);
    setPrice(String(part.unitPrice));
    setText(adText(part, part.unitPrice, settings.currency, profile.contact));
    setPreview(undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [part]);

  const priceLabel = formatMoney(toNum(price), settings.currency);
  const background = bg === "ai" ? aiBg : AD_BACKGROUNDS.find((b) => b.id === bg)?.src;
  const showCutout = Boolean(cutout && useCutout);

  useEffect(() => {
    if (!part || !photo) {
      setPreview(undefined);
      return;
    }
    let cancelled = false;
    renderAd({
      background,
      photo: showCutout ? cutout! : photo,
      cutout: showCutout,
      name: part.name,
      material: part.material,
      brand: profile.brandName || "Gram3D",
      price: badge ? priceLabel : undefined,
    })
      .then((url) => !cancelled && setPreview(url))
      .catch(() => !cancelled && toast.error("Não foi possível compor o anúncio"));
    return () => {
      cancelled = true;
    };
  }, [part, photo, cutout, showCutout, background, badge, priceLabel, profile.brandName]);

  if (!part) return null;
  const filename = `anuncio-${slug(part.name)}.png`;

  const doRemove = async () => {
    if (!photo) return;
    setRemoving(0);
    try {
      setCutout(await removeBg(photo, setRemoving));
      setUseCutout(true);
      toast.success("Fundo removido");
    } catch {
      toast.error("Não foi possível remover o fundo desta foto");
    } finally {
      setRemoving(null);
    }
  };

  const doAiBg = async () => {
    if (!settings.hfToken) return;
    setGenerating(true);
    try {
      setAiBg(await hfImage(settings.hfToken, aiPrompt));
      setBg("ai");
      toast.success("Cenário gerado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao gerar cenário");
    } finally {
      setGenerating(false);
    }
  };

  const doWrite = async () => {
    if (!settings.geminiKey) return;
    setWriting(true);
    try {
      const t = await geminiText(
        settings.geminiKey,
        [
          "Escreve um texto curto de venda em Português de Portugal para WhatsApp, Instagram e OLX.",
          `Peça impressa em 3D: ${part.name}. Material: ${part.material}. Preço: ${priceLabel}.`,
          profile.contact ? `Contacto para encomendas: ${profile.contact}.` : "",
          "Tom próximo e profissional, 3 a 5 emojis, 3 tópicos curtos com benefícios, máximo 90 palavras, termina com o preço e o contacto.",
          "Devolve apenas o texto, sem aspas nem markdown.",
        ].join(" "),
      );
      setText(t);
      toast.success("Texto gerado pelo Gemini");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro no Gemini");
    } finally {
      setWriting(false);
    }
  };

  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Texto copiado");
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" /> Estúdio de Anúncio
          </DialogTitle>
          <DialogDescription>
            {part.name} · {part.material} · {formatMoney(part.unitPrice, settings.currency)}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-3">
            <div className="grid aspect-square place-items-center overflow-hidden rounded-xl border border-border bg-surface grid-bg">
              {preview ? (
                <img src={preview} alt={`Anúncio de ${part.name}`} className="size-full object-contain" />
              ) : photo ? (
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              ) : (
                <p className="px-6 text-center text-sm text-muted-foreground">Adiciona uma foto da peça para criar o anúncio.</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" disabled={!preview} onClick={() => preview && downloadDataUrl(preview, filename)}>
                <Download /> Baixar PNG
              </Button>
              <Button
                disabled={!preview}
                className="bg-gradient-primary shadow-glow hover:opacity-90"
                onClick={() => preview && shareToWhatsApp(preview, filename, text)}
              >
                <Share2 /> WhatsApp
              </Button>
            </div>
          </div>

          <div className="space-y-5">
            <section className="space-y-2">
              <Label>Foto</Label>
              <PhotoPicker
                value={photo}
                onChange={(v) => {
                  setPhoto(v);
                  setCutout(undefined);
                }}
              />
              <div className="flex flex-wrap items-center gap-3">
                <Button size="sm" variant="secondary" disabled={!photo || removing !== null} onClick={doRemove}>
                  {removing !== null ? <Loader2 className="animate-spin" /> : <Scissors />}
                  {removing !== null ? `A remover fundo… ${removing ? `${removing}%` : ""}` : "Remover fundo"}
                </Button>
                {cutout && (
                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Switch checked={useCutout} onCheckedChange={setUseCutout} /> Usar recorte
                  </label>
                )}
              </div>
              {removing !== null && (
                <p className="text-xs text-muted-foreground">Na primeira vez descarrega o modelo (~40 MB). Depois é imediato.</p>
              )}
            </section>

            <section className="space-y-2">
              <Label>Cenário</Label>
              <div className="grid grid-cols-4 gap-2">
                {AD_BACKGROUNDS.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setBg(b.id)}
                    className={cn(
                      "group overflow-hidden rounded-lg border text-left transition-colors",
                      bg === b.id ? "border-primary ring-1 ring-primary" : "border-border hover:border-border-strong",
                    )}
                  >
                    <img src={b.src} alt="" className="aspect-square w-full object-cover" />
                    <div className="truncate px-1.5 py-1 text-[10px] text-muted-foreground">{b.label}</div>
                  </button>
                ))}
                <button
                  type="button"
                  disabled={!aiBg}
                  onClick={() => setBg("ai")}
                  className={cn(
                    "overflow-hidden rounded-lg border text-left transition-colors disabled:opacity-50",
                    bg === "ai" ? "border-primary ring-1 ring-primary" : "border-border",
                  )}
                >
                  {aiBg ? (
                    <img src={aiBg} alt="" className="aspect-square w-full object-cover" />
                  ) : (
                    <div className="grid aspect-square place-items-center bg-surface">
                      <Wand2 className="size-4 text-muted-foreground" />
                    </div>
                  )}
                  <div className="truncate px-1.5 py-1 text-[10px] text-muted-foreground">Gerado por IA</div>
                </button>
              </div>
              <div className="flex gap-2">
                <Input
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  aria-label="Descrição do cenário por IA"
                  disabled={!settings.hfToken}
                />
                <Button variant="secondary" disabled={!settings.hfToken || generating || !aiPrompt.trim()} onClick={doAiBg}>
                  {generating ? <Loader2 className="animate-spin" /> : <Wand2 />} Gerar
                </Button>
              </div>
              {!settings.hfToken && (
                <p className="text-xs text-muted-foreground">
                  Para gerar cenários por IA, adiciona o teu token gratuito Hugging Face em Configurações.
                </p>
              )}
            </section>

            <section className="flex items-end gap-3">
              <div className="grid flex-1 gap-1.5">
                <Label htmlFor="ad-price">Preço no selo ({currencySymbol(settings.currency)})</Label>
                <Input id="ad-price" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} />
              </div>
              <label className="flex h-9 items-center gap-2 text-sm">
                <Switch checked={badge} onCheckedChange={setBadge} /> Selo de preço
              </label>
            </section>

            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="ad-text">Texto de venda</Label>
                <Button size="sm" variant="ghost" disabled={!settings.geminiKey || writing} onClick={doWrite}>
                  {writing ? <Loader2 className="animate-spin" /> : <Sparkles />} Gerar com Gemini
                </Button>
              </div>
              <Textarea id="ad-text" rows={8} value={text} onChange={(e) => setText(e.target.value)} />
              {!settings.geminiKey && (
                <p className="text-xs text-muted-foreground">
                  Texto pronto incluído. Para textos únicos, adiciona a tua chave Gemini gratuita em Configurações.
                </p>
              )}
              <Button variant="outline" size="sm" onClick={copy}>
                {copied ? <Check /> : <Copy />} Copiar texto
              </Button>
            </section>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
