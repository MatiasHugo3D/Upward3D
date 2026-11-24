import { Droplets, RotateCcw, Wrench } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { maintenanceStatus } from "@/lib/gram3d/calc";
import { actions, useAppState } from "@/lib/gram3d/store";
import { cn } from "@/lib/utils";

const fmtH = (h: number) => `${new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 1 }).format(h)}h`;

export function MaintenanceCard({ className }: { className?: string }) {
  const { maintenance, settings } = useAppState();
  const items = [
    { type: "lube" as const, label: "Lubrificação & Limpeza", icon: Droplets, hours: maintenance.lubeHours, interval: settings.lubeIntervalH },
    { type: "nozzle" as const, label: "Troca de Bico", icon: Wrench, hours: maintenance.nozzleHours, interval: settings.nozzleIntervalH },
  ];
  return (
    <section className={cn("panel p-4 sm:p-5", className)} aria-label="Saúde da impressora">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <div className="text-xs font-medium uppercase tracking-[0.14em] text-primary">Saúde da oficina</div>
          <div className="mt-1 font-semibold">{settings.printerName}</div>
        </div>
        <div className="text-xs text-muted-foreground tabular">{fmtH(maintenance.totalHours)} de trabalho acumulado</div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {items.map((it) => {
          const st = maintenanceStatus(it.hours, it.interval);
          return (
            <div key={it.type} className="rounded-lg border border-border bg-surface/60 p-3">
              <div className="flex items-center gap-2">
                <it.icon className={cn("size-4", st.state === "due" ? "text-destructive" : st.state === "soon" ? "text-warning" : "text-primary")} />
                <span className="flex-1 text-sm font-medium">{it.label}</span>
                <span className="text-sm font-semibold tabular">
                  {fmtH(it.hours)} <span className="font-normal text-muted-foreground">/ {it.interval}h</span>
                </span>
              </div>
              <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-background">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    st.state === "due" ? "bg-destructive" : st.state === "soon" ? "bg-warning" : "bg-gradient-primary",
                  )}
                  style={{ width: `${Math.max(2, st.pct)}%` }}
                />
              </div>
              <div className="mt-2.5 flex items-center justify-between gap-2">
                <span className={cn("text-xs", st.state === "due" ? "font-medium text-destructive" : "text-muted-foreground")}>
                  {st.state === "due" ? "Fazer manutenção agora" : `Faltam ${fmtH(st.left)}`}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs"
                  onClick={() => {
                    if (!confirm(`Registar ${it.label.toLowerCase()} e pôr o contador a zero?`)) return;
                    actions.resetMaintenance(it.type);
                    toast.success(`${it.label} registada`);
                  }}
                >
                  <RotateCcw /> Registar manutenção
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
