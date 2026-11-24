import { geminiGenerate, hfGenerateImage } from "./ai.functions";

/** Sales text with the user's own Gemini key. */
export async function geminiText(key: string, prompt: string): Promise<string> {
  const r = await geminiGenerate({ data: { key, prompt } });
  if (!r.text) throw new Error(r.error ?? "Erro no Gemini");
  return r.text;
}

/** Background image (data URL) from FLUX.1-schnell with the user's own Hugging Face token. */
export async function hfImage(token: string, prompt: string): Promise<string> {
  const r = await hfGenerateImage({ data: { key: token, prompt } });
  if (!r.dataUrl) throw new Error(r.error ?? "Erro no Hugging Face");
  return r.dataUrl;
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

export async function removeBg(src: string, onProgress: (pct: number) => void): Promise<string> {
  const { removeBackground } = await import("@imgly/background-removal");
  const blob = await removeBackground(src, {
    output: { format: "image/png" },
    progress: (key, current, total) => {
      if (key.startsWith("fetch") && total > 0) onProgress(Math.round((current / total) * 100));
    },
  });
  return blobToDataUrl(blob);
}
