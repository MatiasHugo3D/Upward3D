import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { KeyRound, Loader2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Logo } from "@/components/gram3d/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updatePassword, useSession } from "@/lib/gram3d/auth";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Nova palavra-passe — Gram3D" },
      { name: "description", content: "Escolhe uma nova palavra-passe para a tua conta Gram3D." },
      { property: "og:title", content: "Nova palavra-passe — Gram3D" },
      { property: "og:description", content: "Recupera o acesso à tua conta Gram3D." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const session = useSession();
  const navigate = useNavigate();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (pw !== pw2) {
      setError("As palavras-passe não coincidem");
      return;
    }
    setBusy(true);
    const r = await updatePassword(pw);
    setBusy(false);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    toast.success("Palavra-passe atualizada");
    navigate({ to: "/" });
  };

  return (
    <div className="carbon-bg grid min-h-screen place-items-center px-5">
      <div className="panel w-full max-w-md p-8 shadow-glow">
        <div className="mb-6 flex items-center gap-2">
          <Logo className="size-9 text-glow" />
          <span className="font-bold tracking-[0.08em]">
            GRAM<span className="text-gradient-primary">3D</span>
          </span>
        </div>
        {session === undefined ? (
          <Loader2 className="mx-auto size-6 animate-spin text-muted-foreground" />
        ) : session === null ? (
          <div className="space-y-4 text-sm text-muted-foreground">
            <p>Este link já expirou ou não é válido. Pede um novo em “Esqueci-me da palavra-passe”.</p>
            <Button asChild variant="outline">
              <Link to="/">Voltar à entrada</Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={submit} className="grid gap-4">
            <h1 className="flex items-center gap-2 text-xl font-semibold">
              <KeyRound className="size-5 text-primary" /> Nova palavra-passe
            </h1>
            <div className="grid gap-1.5">
              <Label htmlFor="np1">Nova palavra-passe</Label>
              <Input id="np1" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="np2">Repetir palavra-passe</Label>
              <Input id="np2" type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
            </div>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={busy} className="bg-gradient-primary shadow-glow hover:opacity-90">
              {busy && <Loader2 className="animate-spin" />} Guardar e entrar
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
