import { createFileRoute, Link } from "@tanstack/react-router";
import { Boxes, CheckCircle2, Coins, Flame, Plus, Trash2, XCircle } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FailDialog } from "@/components/gram3d/fail-dialog";
import { CompleteDialog } from "@/components/gram3d/complete-dialog";
import { MaintenanceCard } from "@/components/gram3d/maintenance-card";
import { PageHeader } from "@/components/gram3d/page-header";
import { StatCard } from "@/components/gram3d/stat-card";
import { dashboardStats } from "@/lib/gram3d/calc";
import { formatDate, formatDuration, formatGrams, formatMoney } from "@/lib/gram3d/format";
import { actions, useAppState } from "@/lib/gram3d/store";
import type { PrintJob, PrintStatus } from "@/lib/gram3d/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/impressoes")({
  head: () => ({
    meta: [
      { title: "Impressões & Falhas — Gram3D" },
      {
        name: "description",
        content: "Acompanha impressões em curso, taxa de sucesso, receita e desperdício por falhas.",
      },
      { property: "og:title", content: "Impressões & Falhas — Gram3D" },
      {
        property: "og:description",
        content: "Dashboard de impressões 3D com stock, receita, sucesso e desperdício.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PrintsPage,
});

const FILTERS: { key: "all" | PrintStatus; label: string }[] = [
  { key: "all", label: "Todas" },
  { key: "printing", label: "A imprimir" },
  { key: "done", label: "Concluídas" },
  { key: "failed", label: "Falhadas" },
];

function PrintsPage() {
  const { rolls, prints, settings, sales } = useAppState();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["key"]>("all");
  const [failing, setFailing] = useState<PrintJob | null>(null);
  const stats = dashboardStats(rolls, prints, sales);
  const revenue = prints.filter((p) => p.status !== "failed").reduce((a, p) => a + p.finalPrice, 0);
  const [completing, setCompleting] = useState<PrintJob | null>(null);
  const list = filter === "all" ? prints : prints.filter((p) => p.status === filter);
  const fmt = (v: number) => formatMoney(v, settings.currency);

  return (
    <>
      <PageHeader
        eyebrow="Dashboard"
        title="Impressões & Falhas"
        action={
          <Button asChild variant="outline" size="sm">
            <Link to="/nova">
              <Plus /> Nova impressão
            </Link>
          </Button>
        }
      />

      <MaintenanceCard className="mb-4" />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Stock Total" value={formatGrams(stats.totalStock)} sub={`${rolls.length} rolos`} icon={Boxes} />
        <StatCard label="Receita Estimada" value={fmt(revenue)} sub="Concluídas + em curso" icon={Coins} tone="primary" />
        <StatCard
          label="Taxa de Sucesso"
          value={stats.finished ? `${stats.successRate.toFixed(0)}%` : "—"}
          sub={`${stats.finished} terminadas`}
          icon={CheckCircle2}
          tone="success"
        />
        <StatCard label="Desperdício por Falhas" value={formatGrams(stats.waste)} sub="Filamento perdido" icon={Flame} tone="destructive" />
      </div>

      <div className="mt-8 mb-3 flex gap-1 overflow-x-auto">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1 text-xs transition-colors",
              filter === f.key
                ? "border-border-strong bg-accent text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {f.label}
            <span className="ml-1.5 tabular text-muted-foreground">
              {f.key === "all" ? prints.length : prints.filter((p) => p.status === f.key).length}
            </span>
          </button>
        ))}
      </div>

      <div className="panel divide-y divide-border">
        {list.length === 0 && (
          <div className="p-10 text-center text-sm text-muted-foreground">Sem impressões aqui.</div>
        )}
        {list.map((p) => (
          <div key={p.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <span
                className="mt-1 size-3 shrink-0 rounded-full border border-border-strong"
                style={{ backgroundColor: p.filaments[0]?.colorHex }}
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate font-medium">{p.name}</span>
                  <StatusBadge status={p.status} />
                </div>
                <div className="mt-1 text-xs text-muted-foreground tabular">
                  {formatGrams(p.grams)} · {formatDuration(p.hours, p.minutes)} · {p.filaments.map((f) => f.rollLabel).join(" + ")}
                </div>
                <div className="mt-0.5 text-[11px] text-muted-foreground">
                  {formatDate(p.createdAt)}
                  {p.status === "failed" && p.failedAtPercent !== undefined && (
                    <span className="text-destructive">
                      {" "}· parou nos {p.failedAtPercent}% · perda {formatGrams(p.wastedGrams ?? 0)} · +{formatGrams(p.returnedGrams ?? 0)} ao stock
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 sm:justify-end">
              <div className="text-left sm:text-right">
                <div className={cn("font-semibold tabular", p.status === "failed" && "text-muted-foreground line-through")}>
                  {fmt(p.finalPrice)}
                </div>
                <div className="text-[11px] text-muted-foreground tabular">custo {fmt(p.realCost)}</div>
              </div>
              {p.status === "printing" ? (
                <div className="flex gap-2">
                  <Button size="sm" variant="success" onClick={() => setCompleting(p)}>
                    <CheckCircle2 /> Concluída
                  </Button>
                  <Button size="sm" variant="destructiveOutline" onClick={() => setFailing(p)}>
                    <XCircle /> Falhou (%)
                  </Button>
                </div>
              ) : (
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Apagar registo"
                  className="text-muted-foreground"
                  onClick={() => {
                    if (confirm(`Apagar o registo "${p.name}"? O stock não é alterado.`)) actions.deletePrint(p.id);
                  }}
                >
                  <Trash2 />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      <FailDialog job={failing} onClose={() => setFailing(null)} />
      <CompleteDialog job={completing} onClose={() => setCompleting(null)} />
    </>
  );
}

function StatusBadge({ status }: { status: PrintStatus }) {
  const map = {
    printing: { label: "A imprimir", cls: "border-primary/30 bg-primary/10 text-primary" },
    done: { label: "Concluída", cls: "border-success/30 bg-success/10 text-success" },
    failed: { label: "Falhou", cls: "border-destructive/30 bg-destructive/10 text-destructive" },
  }[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium", map.cls)}>
      {status === "printing" && <span className="size-1.5 rounded-full bg-primary animate-pulse-dot" />}
      {map.label}
    </span>
  );
}
