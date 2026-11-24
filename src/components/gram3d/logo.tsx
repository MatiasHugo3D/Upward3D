import { useId } from "react";
import { cn } from "@/lib/utils";

/** Gram3D symbol: a "G" drawn in filament with an upward arrow. */
export function Logo({ className }: { className?: string }) {
  const id = useId();
  return (
    <svg viewBox="22 16 60 60" className={cn("size-8", className)} role="img" aria-label="Gram3D">
      <defs>
        <linearGradient id={id} x1="1" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: "var(--primary)" }} />
          <stop offset="1" style={{ stopColor: "var(--primary-glow)" }} />
        </linearGradient>
      </defs>
      <g fill="none" stroke={`url(#${id})`} strokeLinecap="round" strokeLinejoin="round" strokeWidth="7.5">
        <path d="M55.3 36.7A17 17 0 1 0 63 51" />
        <path d="M44 51C52 49.5 62 42 71.5 27.5" />
        <path d="M65.4 28.8L74.7 24.4L74.2 35.2" />
      </g>
    </svg>
  );
}
