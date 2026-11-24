import { useNavigate } from "@tanstack/react-router";
import { Calculator, Loader2, MailCheck, Package, Sparkles } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { sendPasswordReset, signIn, signInWithGoogle, signUp } from "@/lib/gram3d/auth";
import { Logo } from "./logo";

const FEATURES = [
  { icon: Calculator, title: "Orçamentos exatos", text: "Filamento, energia e desgaste ao cêntimo." },
  { icon: Package, title: "Stock & produção", text: "Rolos, falhas e peças prontas num só sítio." },
  { icon: Sparkles, title: "Vendas com IA", text: "Anúncios, catálogos e QR em segundos." },
];

export function Landing() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const r = mode === "signup" ? await signUp(name, email, password) : await signIn(email, password);
    setBusy(false);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    if (r.needsConfirm) {
      setSentTo(email.trim());
      return;
    }
    toast.success("Sessão iniciada");
    navigate({ to: "/" });
  };

  const google = async () => {
    setError(null);
    const r = await signInWithGoogle();
    if (!r.ok) setError(r.error);
  };

  const forgot = async () => {
    setError(null);
    const r = await sendPasswordReset(email);
    if (!r.ok) setError(r.error);
    else toast.success("Enviámos-te um email para escolheres uma nova palavra-passe");
  };

  return (
    <div className="carbon-bg min-h-screen">
      <div className="mx-auto grid min-h-screen max-w-6xl items-center gap-10 px-5 py-10 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
        <div className="text-center lg:text-left">
          <div className="flex items-center justify-center gap-3 lg:justify-start">
            <Logo className="size-14 text-glow sm:size-16" />
            <span className="text-2xl font-bold tracking-[0.08em] sm:text-3xl">
              GRAM<span className="text-gradient-primary">3D</span>
            </span>
          </div>
          <h1 className="mt-8 text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
            <span className="text-gradient-primary text-glow">Faz acontecer!</span>
            <br />
            No teu bolso.
          </h1>
          <p className="mx-auto mt-5 max-w-md text-base text-muted-foreground sm:text-lg lg:mx-0">
            O teu ecossistema inteligente de gestão, orçamentação e produção 3D.
          </p>
          <ul className="mx-auto mt-8 grid max-w-md gap-3 text-left sm:grid-cols-3 sm:gap-4 lg:mx-0 lg:max-w-none">
            {FEATURES.map((f) => (
              <li key={f.title} className="flex gap-3 rounded-xl border border-border bg-card/60 p-3 backdrop-blur sm:flex-col sm:gap-2">
                <f.icon className="size-5 shrink-0 text-primary" />
                <div>
                  <div className="text-sm font-medium">{f.title}</div>
                  <div className="text-xs text-muted-foreground">{f.text}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {sentTo ? (
          <div className="panel mx-auto w-full max-w-md p-8 text-center shadow-glow">
            <MailCheck className="mx-auto size-10 text-primary" />
            <h2 className="mt-4 text-xl font-semibold">Confirma o teu email</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Enviámos um link para <span className="font-medium text-foreground">{sentTo}</span>. Abre-o para ativar a conta e entrar.
            </p>
            <Button variant="outline" className="mt-6" onClick={() => { setSentTo(null); setMode("signin"); }}>
              Já confirmei — entrar
            </Button>
          </div>
        ) : (
        <form onSubmit={submit} className="panel mx-auto w-full max-w-md p-6 shadow-glow sm:p-8" noValidate>
          <Tabs value={mode} onValueChange={(v) => { setMode(v as typeof mode); setError(null); }}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signup">Criar conta</TabsTrigger>
              <TabsTrigger value="signin">Entrar</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="mt-6 grid gap-4">
            {mode === "signup" && (
              <div className="grid gap-1.5">
                <Label htmlFor="auth-name">Nome</Label>
                <Input id="auth-name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="O teu nome" />
              </div>
            )}
            <div className="grid gap-1.5">
              <Label htmlFor="auth-email">Email</Label>
              <Input id="auth-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@exemplo.pt" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="auth-pass">Palavra-passe</Label>
              <Input
                id="auth-pass"
                type="password"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
              />
            </div>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <Button type="submit" size="lg" disabled={busy} className="bg-gradient-primary shadow-glow hover:opacity-90">
              {busy && <Loader2 className="animate-spin" />}
              {mode === "signup" ? "Criar conta e começar" : "Entrar na Gram3D"}
            </Button>
            {mode === "signin" && (
              <button type="button" onClick={forgot} className="-mt-1 text-left text-xs text-muted-foreground hover:text-primary">
                Esqueci-me da palavra-passe
              </button>
            )}
            <div className="flex items-center gap-3 text-[11px] uppercase tracking-wider text-muted-foreground">
              <span className="h-px flex-1 bg-border" /> ou <span className="h-px flex-1 bg-border" />
            </div>
            <Button
              type="button"
              onClick={google}
              className="gap-2.5 border hover:opacity-90"
              style={{ backgroundColor: "#131314", borderColor: "#8E918F", color: "#E3E3E3" }}
            >
              <GoogleG />
              Continuar com Google
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              {mode === "signup" ? "Já tens conta? " : "Ainda não tens conta? "}
              <button
                type="button"
                className="font-medium text-primary hover:underline"
                onClick={() => { setMode(mode === "signup" ? "signin" : "signup"); setError(null); }}
              >
                {mode === "signup" ? "Entrar" : "Criar conta"}
              </button>
            </p>
          </div>
        </form>
        )}
      </div>
    </div>
  );
}

function GoogleG() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z" />
      <path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z" />
      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z" />
    </svg>
  );
}
