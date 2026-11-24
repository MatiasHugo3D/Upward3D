/** Turns sign-in errors into short Portuguese messages. */
export function authErrorMessage(raw: string | undefined | null): string {
  const m = (raw ?? "").toLowerCase();
  if (m.includes("invalid login credentials")) return "Email ou palavra-passe errados";
  if (m.includes("email not confirmed")) return "Ainda não confirmaste o email. Abre a mensagem que te enviámos.";
  if (m.includes("already registered") || m.includes("already been registered")) return "Já existe uma conta com este email. Entra com a tua palavra-passe.";
  if (m.includes("pwned") || m.includes("leaked") || m.includes("compromised")) return "Esta palavra-passe apareceu em fugas de dados. Escolhe outra.";
  if (m.includes("password should be") || m.includes("weak password")) return "A palavra-passe precisa de pelo menos 6 caracteres";
  if (m.includes("rate limit") || m.includes("for security purposes") || m.includes("too many")) return "Muitas tentativas seguidas. Espera um minuto e tenta outra vez.";
  if (m.includes("invalid email") || m.includes("unable to validate email")) return "Indica um email válido";
  if (m.includes("failed to fetch") || m.includes("network")) return "Sem ligação à internet. Tenta novamente.";
  return "Não foi possível concluir. Tenta novamente.";
}

export function validateCredentials(email: string, password: string): string | null {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return "Indica um email válido";
  if (password.length < 6) return "A palavra-passe precisa de pelo menos 6 caracteres";
  return null;
}
