import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AlertTriangle, Cog, Layers, Play, Plus, TrendingUp, X, Zap } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
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
import { Slider } from "@/components/ui/slider";
import { ImageScan } from "@/components/gram3d/image-scan";
import { PageHeader } from "@/components/gram3d/page-header";
import { allocatePurge, calculateCost } from "@/lib/gram3d/calc";
import { parseDuration, parseGrams } from "@/lib/gram3d/ocr-parse";
import { formatGrams, formatMoney } from "@/lib/gram3d/format";
import { actions, useAppState } from "@/lib/gram3d/store";
import type { Roll } from "@/lib/gram3d/types";

export const Route = createFileRoute("/nova")({
  head: () => ({
    meta: [
      { title: "Nova Impressão — Gram3D" },
      {
        name: "description",
        content:
          "Lê gramas e tempo do print do slicer, junta várias cores e calcula o custo real e o preço de venda da tua impressão 3D.",
      },
      { property: "og:title", content: "Nova Impressão — Gram3D" },
      {
        property: "og:description",
        content: "Calculadora exata de custos de impressão 3D multicolorida com leitura automática de prints.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NewPrintPage,
});

const toNum = (s: string) => {
  const v = parseFloat(s.replace(",", "."));
  return Number.isFinite(v) ? v : 0;
};

interface Line {
  key: number;
  rollId: string;
  grams: string;
}

let lineKey = 1;

function NewPrintPage() {
  const { rolls, settings } = useAppState();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [lines, setLines] = useState<Line[]>([{ key: 0, rollId: "", grams: "" }]);
  const [purge, setPurge] = useState("");
  const [hours, setHours] = useState("");
  const [minutes, setMinutes] = useState("");
  const [margin, setMargin] = useState("60");

  // Default the first colour to the fullest roll once rolls are known.
  useEffect(() => {
    if (rolls.length && lines.some((l) => !l.rollId)) {
      const sorted = [...rolls].sort((a, b) => b.remainingGrams - a.remainingGrams);
      setLines((ls) =>
        ls.map((l) => {
          if (l.rollId) return l;
          const used = new Set(ls.map((x) => x.rollId));
          const pick = sorted.find((r) => !used.has(r.id)) ?? sorted[0];
          return { ...l, rollId: pick?.id ?? "" };
        }),
      );
    }
  }, [rolls, lines]);

  const resolved = lines.map((l) => ({ ...l, roll: rolls.find((r) => r.id === l.rollId), g: toNum(l.grams) }));
  const purgeG = toNum(purge);
  const taken = allocatePurge(
    resolved.map((l) => l.g),
    purgeG,
  );
  const partGrams = resolved.reduce((s, l) => s + l.g, 0);

  // Same roll picked twice: check the combined grams against what the roll holds.
  const shortRolls = useMemo(() => {
    const need = new Map<string, number>();
    resolved.forEach((l, i) => l.roll && need.set(l.roll.id, (need.get(l.roll.id) ?? 0) + (taken[i] ?? 0)));
    return rolls.filter((r) => (need.get(r.id) ?? 0) > r.remainingGrams);
  }, [resolved, taken, rolls]);

  const cost = calculateCost({
    lines: resolved.map((l) => ({
      grams: l.g,
      rollPrice: l.roll?.price ?? 0,
      rollTotalGrams: l.roll?.totalGrams ?? 0,
    })),
    purgeGrams: purgeG,
    hours: toNum(hours),
    minutes: toNum(minutes),
    margin: toNum(margin),
    packaging: 0,
    feePercent: 0,
    kwhRate: settings.kwhRate,
    wearPerHour: settings.wearPerHour,
    powerKw: settings.printerPowerKw,
  });

  const fmt = (v: number) => formatMoney(v, settings.currency);

  const updateLine = (key: number, patch: Partial<Line>) =>
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const addColor = () => {
    const used = new Set(lines.map((l) => l.rollId));
    const next = rolls.find((r) => !used.has(r.id)) ?? rolls[0];
    setLines((ls) => [...ls, { key: lineKey++, rollId: next?.id ?? "", grams: "" }]);
  };

  const onOcr = (text: string) => {
    const pg = parseGrams(text);
    const pt = parseDuration(text);
    if (pg !== null) setLines((ls) => ls.map((l, i) => (i === 0 ? { ...l, grams: String(pg) } : l)));
    if (pt) {
      setHours(String(pt.hours));
      setMinutes(String(pt.minutes));
    }
    if (pg === null && !pt) {
      toast.warning("Não encontrei gramas nem tempo. Confirma os valores manualmente.");
    } else {
      toast.success(
        `Lido: ${pg !== null ? `${pg} g` : "— g"} · ${pt ? `${pt.hours}h ${pt.minutes}min` : "— tempo"}`,
        { description: "Confirma os valores antes de iniciar." },
      );
    }
  };

  const start = () => {
    const valid = resolved.filter((l): l is typeof l & { roll: Roll } => !!l.roll && l.g > 0);
    const err =
      valid.length === 0
        ? "Indica o rolo e as gramas de pelo menos uma cor"
        : valid.length !== resolved.length
          ? "Cada cor precisa de um rolo e das gramas"
          : toNum(hours) <= 0 && toNum(minutes) <= 0
            ? "Indica o tempo de impressão"
            : shortRolls.length
              ? `Filamento insuficiente em ${shortRolls.map((r) => `${r.brand} ${r.colorName}`).join(", ")}`
              : null;
    if (err) {
      toast.error(err);
      return;
    }
    actions.startPrint({
      lines: valid.map((l) => ({ roll: l.roll, grams: l.g })),
      name: name.trim() || "Peça sem nome",
      grams: partGrams,
      purgeGrams: purgeG,
      hours: Math.floor(toNum(hours)),
      minutes: Math.floor(toNum(minutes)),
      margin: toNum(margin),
      packaging: 0,
      channel: "direct",
      feePercent: 0,
      filamentCost: cost.filamentCost,
      electricityCost: cost.electricityCost,
      wearCost: cost.wearCost,
      realCost: cost.realCost,
      fees: 0,
      profit: cost.profit,
      finalPrice: cost.finalPrice,
    });
    toast.success(
      valid.length > 1
        ? `Impressão iniciada · ${formatGrams(cost.totalGrams)} descontados de ${valid.length} rolos`
        : `Impressão iniciada · ${formatGrams(cost.totalGrams)} descontados de ${valid[0]!.roll.brand} ${valid[0]!.roll.colorName}`,
    );
    navigate({ to: "/impressoes" });
  };

  return (
    <>
      <PageHeader
        eyebrow={settings.printerName}
        title="Nova Impressão"
        description="Carrega o print do slicer e obtém o preço exato em segundos."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          <ImageScan
            title="Ler print do slicer"
            hint="Anycubic Slicer, Bambu Studio, OrcaSlicer ou app da impressora. Lemos as gramas e o tempo automaticamente."
            onText={onOcr}
          />

          <div className="panel space-y-5 p-4 sm:p-5">
            <div className="grid gap-1.5">
              <Label htmlFor="name">Nome da Peça</Label>
              <Input
                id="name"
                placeholder="Ex: Suporte de telemóvel"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label>Filamentos {lines.length > 1 && <span className="text-muted-foreground">· {lines.length} cores</span>}</Label>
                <span className="text-xs text-muted-foreground tabular">{formatGrams(partGrams)}</span>
              </div>
              {lines.map((l, i) => {
                const roll = rolls.find((r) => r.id === l.rollId);
                const short = roll && shortRolls.some((r) => r.id === roll.id);
                return (
                  <div key={l.key} className="rounded-lg border border-border bg-surface p-2.5">
                    <div className="flex items-center gap-2">
                      <span className="w-5 shrink-0 text-center text-[11px] text-muted-foreground tabular">{i + 1}</span>
                      <Select value={l.rollId} onValueChange={(v) => updateLine(l.key, { rollId: v })}>
                        <SelectTrigger className="h-10 min-w-0 flex-1" aria-label={`Rolo da cor ${i + 1}`}>
                          <SelectValue placeholder="Escolhe um rolo" />
                        </SelectTrigger>
                        <SelectContent>
                          {rolls.map((r) => (
                            <SelectItem key={r.id} value={r.id}>
                              <span className="flex items-center gap-2">
                                <span
                                  className="size-3 shrink-0 rounded-full border border-border-strong"
                                  style={{ backgroundColor: r.colorHex }}
                                />
                                <span className="truncate">
                                  {r.brand} {r.material} {r.colorName}
                                </span>
                                <span className="text-muted-foreground tabular">· {formatGrams(r.remainingGrams)}</span>
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="relative w-24 shrink-0">
                        <Input
                          inputMode="decimal"
                          aria-label={`Gramas da cor ${i + 1}`}
                          placeholder="0"
                          value={l.grams}
                          onChange={(e) => updateLine(l.key, { grams: e.target.value.replace(/[^\d.,]/g, "") })}
                          className="h-10 pr-6 text-base tabular"
                        />
                        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">g</span>
                      </div>
                      {lines.length > 1 && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-8 shrink-0 text-muted-foreground"
                          aria-label={`Remover cor ${i + 1}`}
                          onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))}
                        >
                          <X />
                        </Button>
                      )}
                    </div>
                    {short && (
                      <p className="mt-1.5 flex items-center gap-1.5 pl-7 text-xs text-destructive">
                        <AlertTriangle className="size-3.5" /> Só restam {formatGrams(roll.remainingGrams)} neste rolo.
                      </p>
                    )}
                  </div>
                );
              })}
              <Button variant="outline" size="sm" className="w-full border-dashed" onClick={addColor}>
                <Plus /> Adicionar Cor
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <NumField id="purge" label="Purga/Desperdício (g)" value={purge} onChange={setPurge} placeholder="Opcional" />
              <NumField id="hours" label="Horas" value={hours} onChange={setHours} placeholder="0" integer />
              <NumField id="minutes" label="Minutos" value={minutes} onChange={setMinutes} placeholder="0" integer />
            </div>

            <div className="grid gap-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="margin">Margem de Lucro</Label>
                <div className="flex items-center gap-1">
                  <Input
                    id="margin"
                    inputMode="decimal"
                    value={margin}
                    onChange={(e) => setMargin(e.target.value)}
                    className="h-8 w-16 text-right tabular"
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
              </div>
              <Slider
                value={[Math.min(300, toNum(margin))]}
                min={0}
                max={300}
                step={5}
                onValueChange={([v]) => setMargin(String(v ?? 0))}
              />
            </div>
          </div>
        </div>

        <aside className="lg:sticky lg:top-20 lg:self-start">
          <div className="panel overflow-hidden">
            <div className="border-b border-border p-5">
              <div className="text-xs text-muted-foreground">Preço Final de Venda</div>
              <div className="mt-1 text-4xl font-semibold tracking-tight tabular text-gradient-primary">
                {fmt(cost.finalPrice)}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-surface p-3">
                  <div className="text-[11px] text-muted-foreground">Custo Real</div>
                  <div className="mt-0.5 font-semibold tabular">{fmt(cost.realCost)}</div>
                </div>
                <div className="rounded-lg bg-surface p-3">
                  <div className="text-[11px] text-muted-foreground">Lucro Líquido</div>
                  <div className="mt-0.5 font-semibold tabular text-success">{fmt(cost.profit)}</div>
                </div>
              </div>
            </div>
            <ul className="space-y-3 p-5 text-sm">
              <Row
                icon={Layers}
                label={lines.length > 1 ? `Filamento · ${lines.length} cores` : "Filamento"}
                detail={`${formatGrams(cost.totalGrams)}${purgeG > 0 ? ` (inclui ${formatGrams(purgeG)} de purga)` : ""}`}
                value={fmt(cost.filamentCost)}
              />
              {resolved.length > 1 &&
                resolved.map((l, i) =>
                  l.roll ? (
                    <li key={l.key} className="-mt-1.5 flex items-center gap-2 pl-10 text-[11px] text-muted-foreground tabular">
                      <span className="size-2 rounded-full border border-border-strong" style={{ backgroundColor: l.roll.colorHex }} />
                      <span className="flex-1 truncate">{l.roll.brand} {l.roll.colorName}</span>
                      <span>{formatGrams(taken[i] ?? 0)}</span>
                    </li>
                  ) : null,
                )}
              <Row icon={Zap} label="Eletricidade" detail={`${cost.totalHours.toFixed(2)}h × ${settings.printerPowerKw} kW × ${formatMoney(settings.kwhRate, settings.currency, 3)}`} value={fmt(cost.electricityCost)} />
              <Row icon={Cog} label="Desgaste" detail={`${cost.totalHours.toFixed(2)}h × ${fmt(settings.wearPerHour)}/h`} value={fmt(cost.wearCost)} />
              <Row icon={TrendingUp} label={`Margem ${toNum(margin)}%`} detail="sobre o custo real" value={`+ ${fmt(cost.profit)}`} />
            </ul>
            <div className="border-t border-border p-4">
              <Button size="lg" className="h-12 w-full bg-gradient-primary shadow-glow hover:opacity-90" onClick={start}>
                <Play className="fill-current" />
                Iniciar Impressão e Descontar Stock
              </Button>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}

function NumField({
  id,
  label,
  value,
  onChange,
  placeholder,
  integer,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  integer?: boolean;
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id} className="truncate text-xs">{label}</Label>
      <Input
        id={id}
        inputMode={integer ? "numeric" : "decimal"}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value.replace(integer ? /[^\d]/g : /[^\d.,]/g, ""))}
        className="h-11 text-base tabular"
      />
    </div>
  );
}

function Row({
  icon: Icon,
  label,
  detail,
  value,
}: {
  icon: typeof Zap;
  label: string;
  detail: string;
  value: string;
}) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-md bg-surface">
        <Icon className="size-3.5 text-muted-foreground" />
      </span>
      <div className="min-w-0 flex-1">
        <div>{label}</div>
        <div className="truncate text-[11px] text-muted-foreground tabular">{detail}</div>
      </div>
      <div className="tabular">{value}</div>
    </li>
  );
}
