import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { cleanKey } from "./ai-keys";

/**
 * The user's own free keys (kept in their browser) are sent per request and used only
 * for this call; the server relays it so the browser never talks to the providers directly.
 */
const input = z.object({ key: z.string().min(1).max(400), prompt: z.string().min(1).max(4000) });

export const geminiGenerate = createServerFn({ method: "POST" })
  .inputValidator((d) => input.parse(d))
  .handler(async ({ data }): Promise<{ text?: string; error?: string }> => {
    try {
      const res = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
        {
          method: "POST",
          headers: { "content-type": "application/json", "x-goog-api-key": cleanKey(data.key) },
          body: JSON.stringify({ contents: [{ parts: [{ text: data.prompt }] }] }),
        },
      );
      if (!res.ok) {
        const body = await res.text();
        console.error("gemini", res.status, body.slice(0, 500));
        if (body.includes("API_KEY_INVALID") || res.status === 401) return { error: "Chave Gemini inválida. Confirma-a em Configurações." };
        if (res.status === 403) return { error: "Esta chave Gemini não tem acesso à API. Cria uma nova em aistudio.google.com/apikey." };
        if (res.status === 429) return { error: "Limite gratuito do Gemini atingido. Tenta daqui a 1 minuto." };
        if (res.status === 503) return { error: "O Gemini está sobrecarregado. Tenta novamente." };
        return { error: "O Gemini recusou o pedido. Tenta novamente." };
      }
      const json = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
      const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("").trim();
      return text ? { text } : { error: "O Gemini não devolveu texto. Tenta novamente." };
    } catch (e) {
      console.error("gemini fetch", e);
      return { error: "Sem ligação ao Gemini. Tenta novamente." };
    }
  });

/** Free text-to-image models, tried in order; the Hub routes each to whichever provider serves it today. */
export const IMAGE_MODELS = ["black-forest-labs/FLUX.1-schnell", "stabilityai/stable-diffusion-xl-base-1.0"];

function hfStatus(e: unknown) {
  const r = (e as { httpResponse?: { status?: number } } | null)?.httpResponse;
  return typeof r?.status === "number" ? r.status : 0;
}

function hfMessage(status: number) {
  if (status === 401) return "Token Hugging Face inválido. Confirma-o em Configurações.";
  if (status === 403)
    return "O token precisa da permissão “Make calls to Inference Providers”. Cria um token novo em huggingface.co/settings/tokens.";
  if (status === 402) return "Os créditos gratuitos do Hugging Face deste mês acabaram. Usa um cenário pronto.";
  if (status === 429) return "Limite do Hugging Face atingido. Tenta daqui a pouco.";
  return "O Hugging Face não conseguiu gerar o cenário. Usa um cenário pronto ou tenta novamente.";
}

export const hfGenerateImage = createServerFn({ method: "POST" })
  .inputValidator((d) => input.parse(d))
  .handler(async ({ data }): Promise<{ dataUrl?: string; model?: string; error?: string }> => {
    const { InferenceClient } = await import("@huggingface/inference");
    const client = new InferenceClient(cleanKey(data.key));
    let status = 0;
    for (const model of IMAGE_MODELS) {
      try {
        const dataUrl = await client.textToImage(
          { provider: "auto", model, inputs: data.prompt, parameters: { width: 1024, height: 1024 } },
          { outputType: "dataUrl" },
        );
        return { dataUrl, model };
      } catch (e) {
        status = hfStatus(e);
        console.error("hf", model, status, e instanceof Error ? e.message.slice(0, 300) : e);
        // Token or credit problems are the same for every model: stop here.
        if ([401, 402, 403].includes(status)) break;
      }
    }
    return { error: hfMessage(status) };
  });
