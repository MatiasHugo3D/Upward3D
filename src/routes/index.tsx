import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, ArrowRight, ClipboardList, Hammer, Sparkles, TrendingUp, Zap } from "lucide-react";
import type { ReactNode } from "react";
import { MaintenanceCard } from "@/components/gram3d/maintenance-card";
import { useSession } from "@/lib/gram3d/auth";
import { LOW_STOCK_GRAMS, monthKey, realizedProfit, round2 } from "@/lib/gram3d/calc";
import { formatDuration, formatGrams, formatMoney } from "@/lib/gram3d/format";
import { useAppState } from "@/lib/gram3d/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Início — Gram3D" },
      { name: "description", content: "Resumo da tua oficina 3D: lucro do mês, encomendas pendentes, alertas de filamento e saúde da impressora." },
      { property: "og:title", content: "Gram3D — Faz acontecer! No teu bolso." },
      { property: "og:description", content: "O teu ecossistema inteligente de gestão, orçamentação e produção 3D." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomePage,
});

function partOfDay(d: Date) {
  const h = d.getHours();
  return h < 12 ? "Bom dia" : h < 20 ? "Boa tarde" : "Boa noite";
}

function HomePage() {
  const session = useSession();
  const { sales, orders, rolls, parts, prints, settings, profile } = useAppState();
  const fmt = (v: number) => formatMoney(v, settings.currency);
  const now = new Date();
  const first = session?.name.split(" ")[0] || "Maker";

  const monthProfit = realizedProfit(sales, monthKey(now.toISOString()));
  const open = orders.filter((o) => o.status !== "delivered").sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const expected = round2(open.reduce((s, o) => s + (o.unitPrice - o.unitCost) * o.quantity, 0));
  const goalPct = profile.monthlyGoal > 0 ? Math.min(100, ((monthProfit + expected) / profile.monthlyGoal) * 100) : 0;
  const low = rolls.filter((r) => r.remainingGrams < LOW_STOCK_GRAMS);
  const printing = prints.filter((p) => p.status === "printing");
  const adPart = parts.find((p) => p.quantity > 0) ?? parts[0];
  const today = new Intl.DateTimeFormat("pt-PT", { weekday: "long", day: "numeric", month: "long" }).format(now);

  return (
    <>
      <div className="mb-6">
        <div className="text-xs font-medium uppercase tracking-[0.14em] text-primary">
          {partOfDay(now)} · {today}
        </div>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
          Bonjour, <span className="text-gradient-primary">{first}!</span>
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {printing.length
            ? `${printing.length} ${printing.length === 1 ? "impressão" : "impressões"} a decorrer na ${settings.printerName}.`
            : `A ${settings.printerName} está livre. Bora imprimir?`}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
        <Shortcut to="/nova" icon={<Zap />} label="Nova Impressão" primary />
        {adPart ? (
          <Link
            to="/pecas"
            search={{ anuncio: adPart.id }}
            className="panel flex flex-col items-center gap-2 p-3 text-center text-xs font-medium transition-colors hover:border-primary/50 sm:flex-row sm:p-4 sm:text-left sm:text-sm"
          >
            <span className="grid size-9 place-items-center rounded-lg bg-primary/15 text-primary [&_svg]:size-4"><Sparkles /></span>
            Criar Anúncio
          </Link>
        ) : (
          <Shortcut to="/pecas" icon={<Sparkles />} label="Criar Anúncio" />
        )}
        <Shortcut to="/estudio" icon={<Hammer />} label="Estúdio 3D" />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <SummaryCard to="/pecas" icon={<TrendingUp />} label="Lucro do Mês" tone="primary">
          <div className="text-2xl font-semibold tracking-tight tabular">{fmt(monthProfit)}</div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            +{fmt(expected)} previsto em encomendas · meta {fmt(profile.monthlyGoal)}
          </div>
          <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-background">
            <div className="h-full rounded-full bg-gradient-primary" style={{ width: `${goalPct}%` }} />
          </div>
        </SummaryCard>

        <SummaryCard to="/pecas" icon={<ClipboardList />} label="Encomendas Pendentes">
          <div className="text-2xl font-semibold tracking-tight tabular">{open.length}</div>
          <div className="mt-1 truncate text-[11px] text-muted-foreground">
            {open[0] ? `Próxima: ${open[0].client} · ${open[0].dueDate}` : "Sem encomendas por entregar"}
          </div>
        </SummaryCard>

        <SummaryCard to="/stock" icon={<AlertTriangle />} label="Alertas de Filamento" tone={low.length ? "warning" : "default"}>
          <div className="text-2xl font-semibold tracking-tight tabular">{low.length}</div>
          <div className="mt-1 truncate text-[11px] text-muted-foreground">
            {low.length
              ? low.map((r) => `${r.brand} ${r.colorName} ${formatGrams(r.remainingGrams)}`).join(" · ")
              : `Todos os rolos acima de ${LOW_STOCK_GRAMS} g`}
          </div>
        </SummaryCard>
      </div>

      <MaintenanceCard className="mt-4" />

      {printing.length > 0 && (
        <section className="panel mt-4 divide-y divide-border">
          <div className="flex items-center justify-between p-4">
            <span className="text-sm font-medium">A imprimir agora</span>
            <Link to="/impressoes" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
              Ver todas <ArrowRight className="size-3" />
            </Link>
          </div>
          {printing.slice(0, 3).map((p) => (
            <div key={p.id} className="flex items-center gap-3 p-4 text-sm">
              <span className="size-2 rounded-full bg-primary animate-pulse-dot" />
              <span className="min-w-0 flex-1 truncate">{p.name}</span>
              <span className="text-xs text-muted-foreground tabular">{formatDuration(p.hours, p.minutes)}</span>
              <span className="font-medium tabular">{fmt(p.finalPrice)}</span>
            </div>
          ))}
        </section>
      )}
    </>
  );
}

function Shortcut({ to, icon, label, primary }: { to: "/nova" | "/pecas" | "/estudio"; icon: ReactNode; label: string; primary?: boolean }) {
  return (
    <Link
      to={to}
      className={cn(
        "flex flex-col items-center gap-2 rounded-xl border p-3 text-center text-xs font-medium transition-all sm:flex-row sm:p-4 sm:text-left sm:text-sm",
        primary
          ? "border-transparent bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"
          : "panel hover:border-primary/50",
      )}
    >
      <span
        className={cn(
          "grid size-9 place-items-center rounded-lg [&_svg]:size-4",
          primary ? "bg-primary-foreground/15" : "bg-primary/15 text-primary",
        )}
      >
        {icon}
      </span>
      {label}
    </Link>
  );
}

function SummaryCard({
  to,
  icon,
  label,
  tone = "default",
  children,
}: {
  to: "/pecas" | "/stock";
  icon: ReactNode;
  label: string;
  tone?: "default" | "primary" | "warning";
  children: ReactNode;
}) {
  return (
    <Link to={to} className={cn("panel block p-4 transition-colors hover:border-primary/40", tone === "warning" && "border-warning/40")}>
      <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
        {label}
        <span className={cn("[&_svg]:size-4", tone === "primary" && "text-primary", tone === "warning" && "text-warning")}>{icon}</span>
      </div>
      {children}
    </Link>
  );
}
