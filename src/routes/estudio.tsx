import { createFileRoute } from "@tanstack/react-router";
import { Canvas } from "@react-three/fiber";
import { Bounds, OrbitControls } from "@react-three/drei";
import { Copy, Download, ExternalLink, Upload } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { Font } from "three/examples/jsm/loaders/FontLoader.js";
import { PageHeader } from "@/components/gram3d/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { slug } from "@/lib/gram3d/canvas";
import { buildModel, estimateGrams, exportStl, type ModelParams } from "@/lib/gram3d/model3d";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/estudio")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Estúdio 3D — Gram3D" },
      { name: "description", content: "Cria porta-chaves e placas 3D a partir de texto ou logótipo e descarrega o .STL." },
      { property: "og:title", content: "Estúdio 3D — Gram3D" },
      { property: "og:description", content: "Texto ou logótipo em relevo 3D, pronto a fatiar, e atalhos para Foto → 3D por IA." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StudioPage,
});

const PROMPTS = [
  { label: "Figura colecionável", text: "Stylized chibi figurine of [character], standing pose, solid round base, chunky proportions, no thin parts, smooth surfaces, 3D printable without supports" },
  { label: "Vaso decorativo", text: "Low-poly geometric vase, 15 cm tall, hollow with flat bottom, 2 mm walls, faceted surface, 3D printable" },
  { label: "Suporte de headset", text: "Minimal headphone stand, wide flat base, smooth curves, no overhangs over 45 degrees, single solid piece, 3D printable" },
  { label: "Porta-chaves de personagem", text: "Flat keychain charm of a cute [animal], 4 mm thick, rounded edges, small loop hole on top, bold simple shapes" },
];

function StudioPage() {
  return (
    <>
      <PageHeader eyebrow="Criar" title="Estúdio 3D" description="Gera modelos prontos a fatiar ou usa IA para transformar fotos em 3D." />
      <Tabs defaultValue="local">
        <TabsList className="mb-4">
          <TabsTrigger value="local">Texto / Logótipo → 3D</TabsTrigger>
          <TabsTrigger value="ia">Foto → 3D por IA</TabsTrigger>
        </TabsList>
        <TabsContent value="local">
          <Generator />
        </TabsContent>
        <TabsContent value="ia">
          <AiHub />
        </TabsContent>
      </Tabs>
    </>
  );
}

function Num({ label, value, min, max, step, onChange, unit = "mm" }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; unit?: string }) {
  return (
    <div className="grid gap-2">
      <div className="flex justify-between text-sm">
        <Label>{label}</Label>
        <span className="tabular text-muted-foreground">
          {value} {unit}
        </span>
      </div>
      <Slider value={[value]} min={min} max={max} step={step} onValueChange={(v) => onChange(v[0] ?? value)} />
    </div>
  );
}

function Generator() {
  const [font, setFont] = useState<Font | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [p, setP] = useState<ModelParams>({
    mode: "keychain",
    source: "text",
    text: "GRAM3D",
    size: 10,
    base: 3,
    relief: 1.6,
    padding: 4,
    ringDiameter: 5,
    screwHoles: false,
  });
  const set = (patch: Partial<ModelParams>) => setP((s) => ({ ...s, ...patch }));

  useEffect(() => {
    let alive = true;
    Promise.all([import("three/examples/jsm/loaders/FontLoader.js"), import("@/lib/gram3d/fonts/droid_sans_bold.typeface.json")]).then(
      ([{ FontLoader }, json]) => alive && setFont(new FontLoader().parse((json as { default: unknown }).default as never)),
    );
    return () => {
      alive = false;
    };
  }, []);

  const result = useMemo(() => {
    try {
      return { model: buildModel(font, p), error: null as string | null };
    } catch (e) {
      return { model: null, error: e instanceof Error ? e.message : "SVG inválido" };
    }
  }, [font, p]);

  useEffect(() => {
    const m = result.model;
    return () => {
      m?.base.dispose();
      m?.relief?.dispose();
    };
  }, [result]);

  const m = result.model;
  const name = p.source === "text" ? p.text || "modelo" : "logotipo";

  return (
    <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
      <div className="panel space-y-5 p-5">
        <div className="grid grid-cols-2 gap-2">
          {(["keychain", "plate"] as const).map((mode) => (
            <Button key={mode} variant={p.mode === mode ? "default" : "outline"} size="sm" onClick={() => set({ mode })}>
              {mode === "keychain" ? "Porta-Chaves" : "Placa"}
            </Button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {(["text", "svg"] as const).map((source) => (
            <Button key={source} variant={p.source === source ? "secondary" : "ghost"} size="sm" onClick={() => set({ source, size: source === "svg" ? 40 : 10 })}>
              {source === "text" ? "Texto" : "Logótipo SVG"}
            </Button>
          ))}
        </div>
        {p.source === "text" ? (
          <div className="grid gap-1.5">
            <Label htmlFor="st-text">Texto</Label>
            <Input id="st-text" value={p.text} maxLength={24} onChange={(e) => set({ text: e.target.value })} />
          </div>
        ) : (
          <div className="grid gap-1.5">
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
              <Upload /> {p.svg ? "Trocar SVG" : "Carregar SVG"}
            </Button>
            <p className="text-xs text-muted-foreground">Usa um SVG com formas preenchidas (não só contornos).</p>
            <input
              ref={fileRef}
              type="file"
              accept=".svg,image/svg+xml"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) set({ svg: await f.text() });
              }}
            />
          </div>
        )}
        <Num label={p.source === "text" ? "Altura das letras" : "Largura do logótipo"} value={p.size} min={p.source === "text" ? 5 : 15} max={p.source === "text" ? 30 : 120} step={1} onChange={(size) => set({ size })} />
        <Num label="Espessura da base" value={p.base} min={1.2} max={8} step={0.2} onChange={(base) => set({ base })} />
        <Num label="Relevo" value={p.relief} min={0.4} max={5} step={0.2} onChange={(relief) => set({ relief })} />
        <Num label="Margem" value={p.padding} min={1} max={12} step={0.5} onChange={(padding) => set({ padding })} />
        {p.mode === "keychain" ? (
          <Num label="Furo da argola" value={p.ringDiameter} min={3} max={10} step={0.5} onChange={(ringDiameter) => set({ ringDiameter })} />
        ) : (
          <label className="flex items-center justify-between text-sm">
            Furos para parafuso <Switch checked={p.screwHoles} onCheckedChange={(screwHoles) => set({ screwHoles })} />
          </label>
        )}
      </div>

      <div className="space-y-3">
        <div className="panel grid-bg relative aspect-[4/3] overflow-hidden">
          {result.error ? (
            <p className="grid size-full place-items-center px-6 text-center text-sm text-muted-foreground">{result.error}</p>
          ) : (
            m && (
              <Canvas camera={{ position: [0, 70, 90], fov: 40 }} dpr={[1, 2]}>
                <ambientLight intensity={0.6} />
                <directionalLight position={[40, 80, 60]} intensity={1.6} />
                <directionalLight position={[-50, 30, -40]} intensity={0.5} />
                <Bounds fit clip observe margin={1.3}>
                  <group rotation={[-Math.PI / 2, 0, 0]}>
                    <mesh geometry={m.base}>
                      <meshStandardMaterial color="#2a2a2e" roughness={0.6} />
                    </mesh>
                    {m.relief && (
                      <mesh geometry={m.relief}>
                        <meshStandardMaterial color="#ff6b00" roughness={0.45} />
                      </mesh>
                    )}
                  </group>
                </Bounds>
                <OrbitControls makeDefault />
              </Canvas>
            )
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className={cn("text-sm text-muted-foreground tabular", !m && "invisible")}>
            {m ? `${m.width.toFixed(1)} × ${m.height.toFixed(1)} × ${m.depth.toFixed(1)} mm · ≈ ${estimateGrams(m.volumeMm3)} g de PLA` : "—"}
          </div>
          <Button className="ml-auto bg-gradient-primary shadow-glow hover:opacity-90" disabled={!m} onClick={() => m && exportStl(m, `${p.mode === "keychain" ? "porta-chaves" : "placa"}-${slug(name)}`)}>
            <Download /> Baixar .STL
          </Button>
        </div>
      </div>
    </div>
  );
}

function AiHub() {
  const copy = async (t: string) => {
    await navigator.clipboard.writeText(t);
    toast.success("Prompt copiado");
  };
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
      <div className="space-y-3">
        {[
          { name: "Tripo AI", url: "https://www.tripo3d.ai/app", text: "Foto → 3D em segundos. Ótimo para figuras e objetos orgânicos." },
          { name: "Meshy AI", url: "https://www.meshy.ai/workspace", text: "Imagem ou texto → 3D, com texturas e exportação .STL/.OBJ." },
        ].map((s) => (
          <a key={s.name} href={s.url} target="_blank" rel="noreferrer" className="panel flex items-center gap-3 p-4 transition-colors hover:border-primary/50">
            <div className="flex-1">
              <div className="font-medium">{s.name}</div>
              <div className="text-xs text-muted-foreground">{s.text}</div>
            </div>
            <ExternalLink className="size-4 text-primary" />
          </a>
        ))}
        <div className="panel p-4 text-sm text-muted-foreground">
          <div className="mb-1 font-medium text-foreground">Dicas para a foto</div>
          Fundo liso, luz difusa, objeto inteiro no centro, de frente ou a 3/4, sem reflexos. Depois exporta em .STL e abre no slicer.
        </div>
      </div>
      <div className="panel divide-y divide-border">
        {PROMPTS.map((pr) => (
          <div key={pr.label} className="flex items-start gap-3 p-4">
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium">{pr.label}</div>
              <p className="mt-1 text-xs text-muted-foreground">{pr.text}</p>
            </div>
            <Button size="icon" variant="ghost" aria-label={`Copiar prompt ${pr.label}`} onClick={() => copy(pr.text)}>
              <Copy />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
