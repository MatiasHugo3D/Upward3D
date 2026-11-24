import { Link, useLocation } from "@tanstack/react-router";
import { Boxes, Box, Cloud, CloudOff, Home, LayoutDashboard, Loader2, LogOut, Package, ScanLine, Settings } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { signOut, useSession } from "@/lib/gram3d/auth";
import { startSync, useSyncStatus } from "@/lib/gram3d/cloud-sync";
import { actions, useAppState } from "@/lib/gram3d/store";
import { CURRENCIES } from "@/lib/gram3d/format";
import type { Currency } from "@/lib/gram3d/types";
import { CostsDialog } from "./costs-dialog";
import { Landing } from "./landing";
import { Logo } from "./logo";

const NAV = [
  { to: "/", label: "Início", short: "Início", icon: Home },
  { to: "/nova", label: "Nova Impressão", short: "Nova", icon: ScanLine },
  { to: "/impressoes", label: "Impressões", short: "Impressões", icon: LayoutDashboard },
  { to: "/pecas", label: "Peças & Vendas", short: "Peças", icon: Package },
  { to: "/stock", label: "Stock", short: "Stock", icon: Boxes },
  { to: "/estudio", label: "Estúdio 3D", short: "Estúdio", icon: Box },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const session = useSession();
  const sync = useSyncStatus();
  const { pathname } = useLocation();
  const userId = session?.userId;
  useEffect(() => {
    if (userId) void startSync(userId);
  }, [userId]);

  // The password-reset page opens from an email link and handles its own session.
  if (pathname === "/reset-password") return <>{children}</>;
  if (session === undefined) return <Splash />;
  if (session === null) return <Landing />;
  if (sync === "idle" || sync === "loading") return <Splash />;
  return <Shell>{children}</Shell>;
}

function SyncBadge() {
  const s = useSyncStatus();
  const label = s === "offline" ? "Sem ligação à nuvem" : s === "saving" ? "A guardar na nuvem…" : "Guardado na nuvem";
  return (
    <span className="grid size-8 place-items-center text-muted-foreground" title={label} aria-label={label} role="status">
      {s === "offline" ? <CloudOff className="size-4 text-warning" /> : s === "saving" ? <Loader2 className="size-4 animate-spin" /> : <Cloud className="size-4" />}
    </span>
  );
}

function Splash() {
  return (
    <div className="carbon-bg grid min-h-screen place-items-center" aria-busy="true">
      <Logo className="size-14 animate-pulse text-glow" />
    </div>
  );
}

function Shell({ children }: { children: ReactNode }) {
  const { settings } = useAppState();
  const [costsOpen, setCostsOpen] = useState(false);

  return (
    <div className="min-h-screen pb-24 lg:pb-10">
      <header className="sticky top-0 z-40 border-b border-border bg-background/75 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
          <Link to="/" className="flex items-center gap-2">
            <Logo className="size-8 text-glow" />
            <span className="text-[15px] font-bold tracking-[0.08em]">
              GRAM<span className="text-gradient-primary">3D</span>
            </span>
          </Link>

          <nav className="ml-4 hidden items-center gap-0.5 lg:flex">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                activeOptions={{ exact: true }}
                className="rounded-md px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground data-[status=active]:bg-accent data-[status=active]:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-1.5">
            <SyncBadge />
            <Select value={settings.currency} onValueChange={(v) => actions.updateSettings({ currency: v as Currency })}>
              <SelectTrigger className="h-8 w-[88px] text-xs" aria-label="Moeda">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" className="size-8" onClick={() => setCostsOpen(true)} aria-label="Configurações" title="Configurações">
              <Settings />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-muted-foreground hover:text-foreground"
              onClick={() => void signOut()}
              aria-label="Sair"
              title="Sair"
            >
              <LogOut />
              <span className="hidden sm:inline">Sair</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pt-6 md:pt-10">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
        <div className="grid grid-cols-6">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: true }}
              className="flex flex-col items-center gap-1 py-2.5 text-[10px] text-muted-foreground transition-colors data-[status=active]:text-primary"
            >
              <item.icon className="size-5" />
              {item.short}
            </Link>
          ))}
        </div>
      </nav>

      <CostsDialog open={costsOpen} onOpenChange={setCostsOpen} />
    </div>
  );
}
