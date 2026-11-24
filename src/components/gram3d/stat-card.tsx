import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string;
  sub?: string;
  icon: LucideIcon;
  tone?: "default" | "primary" | "success" | "destructive";
}) {
  return (
    <div className="panel p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <Icon
          className={cn(
            "size-4 text-muted-foreground",
            tone === "primary" && "text-primary",
            tone === "success" && "text-success",
            tone === "destructive" && "text-destructive",
          )}
        />
      </div>
      <div className="mt-3 text-xl font-semibold tracking-tight tabular sm:text-2xl">{value}</div>
      {sub && <div className="mt-1 text-[11px] text-muted-foreground">{sub}</div>}
    </div>
  );
}
