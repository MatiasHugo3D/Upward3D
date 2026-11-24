import { toast } from "sonner";
import { whatsappLink } from "./ad";
import { dataUrlToFile, downloadDataUrl } from "./image";

/** Native share sheet with the image when supported, otherwise download + open WhatsApp. */
export async function shareToWhatsApp(dataUrl: string, filename: string, text: string) {
  try {
    const file = await dataUrlToFile(dataUrl, filename);
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], text });
      return;
    }
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") return;
  }
  downloadDataUrl(dataUrl, filename);
  window.open(whatsappLink(text), "_blank", "noopener");
  toast.info("Imagem descarregada — anexa-a na conversa do WhatsApp");
}
