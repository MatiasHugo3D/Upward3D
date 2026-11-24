/** Browser-only canvas renderers for ads, catalog flyers and QR labels. */
import { loadImage } from "./image";

const FONT = "Geist, ui-sans-serif, system-ui, sans-serif";
const ORANGE_A = "#ff8a1f";
const ORANGE_B = "#ff6b00";

async function ready() {
  try {
    await document.fonts?.ready;
  } catch {
    /* ignore */
  }
}

function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d")!] as const;
}

function rrect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const s = Math.max(w / img.width, h / img.height);
  const sw = w / s;
  const sh = h / s;
  ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, x, y, w, h);
}

function truncate(ctx: CanvasRenderingContext2D, text: string, max: number) {
  if (ctx.measureText(text).width <= max) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > max) t = t.slice(0, -1);
  return `${t.trimEnd()}…`;
}

function wrap(ctx: CanvasRenderingContext2D, text: string, max: number) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (ctx.measureText(next).width > max && line) {
      lines.push(line);
      line = w;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

function fitFont(ctx: CanvasRenderingContext2D, text: string, weight: number, size: number, max: number) {
  let s = size;
  ctx.font = `${weight} ${s}px ${FONT}`;
  while (s > 12 && ctx.measureText(text).width > max) {
    s -= 2;
    ctx.font = `${weight} ${s}px ${FONT}`;
  }
  return s;
}

function orange(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, ORANGE_A);
  g.addColorStop(1, ORANGE_B);
  return g;
}

export interface AdInput {
  background?: string | undefined;
  photo: string;
  cutout: boolean;
  name: string;
  material: string;
  brand: string;
  price?: string | undefined;
}

export async function renderAd(o: AdInput): Promise<string> {
  await ready();
  const S = 1080;
  const [c, ctx] = canvas(S, S);
  if (o.background) drawCover(ctx, await loadImage(o.background), 0, 0, S, S);
  else {
    const g = ctx.createRadialGradient(S / 2, S * 0.4, 50, S / 2, S / 2, S * 0.8);
    g.addColorStop(0, "#26262b");
    g.addColorStop(1, "#0b0b0d");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);
  }

  const img = await loadImage(o.photo);
  if (o.cutout) {
    const boxW = 780;
    const boxH = 680;
    const s = Math.min(boxW / img.width, boxH / img.height);
    const w = img.width * s;
    const h = img.height * s;
    const x = (S - w) / 2;
    const y = 120 + (boxH - h);
    // floor shadow
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.filter = "blur(24px)";
    ctx.beginPath();
    ctx.ellipse(S / 2, y + h - 6, w * 0.42, 34, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.5)";
    ctx.shadowBlur = 50;
    ctx.shadowOffsetY = 24;
    ctx.drawImage(img, x, y, w, h);
    ctx.restore();
  } else {
    const w = 700;
    const x = (S - w) / 2;
    const y = 110;
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.55)";
    ctx.shadowBlur = 60;
    ctx.shadowOffsetY = 30;
    rrect(ctx, x, y, w, w, 36);
    ctx.fillStyle = "#111";
    ctx.fill();
    ctx.restore();
    ctx.save();
    rrect(ctx, x, y, w, w, 36);
    ctx.clip();
    drawCover(ctx, img, x, y, w, w);
    ctx.restore();
    rrect(ctx, x, y, w, w, 36);
    ctx.strokeStyle = "rgba(255,255,255,0.14)";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // bottom fade for text
  const fade = ctx.createLinearGradient(0, S - 330, 0, S);
  fade.addColorStop(0, "rgba(8,8,10,0)");
  fade.addColorStop(1, "rgba(8,8,10,0.92)");
  ctx.fillStyle = fade;
  ctx.fillRect(0, S - 330, S, 330);

  ctx.fillStyle = "#ffffff";
  ctx.font = `700 66px ${FONT}`;
  ctx.textBaseline = "alphabetic";
  ctx.fillText(truncate(ctx, o.name, S - 144), 72, S - 118);
  ctx.font = `500 32px ${FONT}`;
  ctx.fillStyle = "rgba(255,255,255,0.72)";
  ctx.fillText(`Impresso em 3D · ${o.material}`, 72, S - 66);

  // brand pill
  ctx.font = `600 26px ${FONT}`;
  const bw = ctx.measureText(o.brand).width + 48;
  rrect(ctx, 56, 56, bw, 54, 27);
  ctx.fillStyle = "rgba(10,10,12,0.6)";
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = "#ffffff";
  ctx.fillText(o.brand, 80, 92);

  if (o.price) {
    const cx = S - 190;
    const cy = 200;
    const r = 136;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-0.14);
    ctx.shadowColor = "rgba(234,106,28,0.55)";
    ctx.shadowBlur = 50;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = orange(ctx, -r, -r, r, r);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.lineWidth = 4;
    ctx.strokeStyle = "rgba(255,255,255,0.55)";
    ctx.setLineDash([10, 10]);
    ctx.beginPath();
    ctx.arc(0, 0, r - 16, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.textAlign = "center";
    ctx.fillStyle = "#1a1005";
    ctx.font = `700 24px ${FONT}`;
    ctx.fillText("SÓ", 0, -38);
    fitFont(ctx, o.price, 800, 60, r * 1.6);
    ctx.fillText(o.price, 0, 22);
    ctx.font = `600 20px ${FONT}`;
    ctx.fillText("PRONTO A ENVIAR", 0, 62);
    ctx.restore();
  }
  return c.toDataURL("image/png");
}

export interface CatalogItem {
  photo?: string | undefined;
  name: string;
  material: string;
  price: string;
}

export const CATALOG_MAX = 8;

export async function renderCatalog(o: { brand: string; contact: string; items: CatalogItem[] }): Promise<string> {
  await ready();
  const W = 1080;
  const H = 1920;
  const [c, ctx] = canvas(W, H);
  ctx.fillStyle = "#0b0b0d";
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W, 0, 40, W, 0, 900);
  glow.addColorStop(0, "rgba(234,106,28,0.38)");
  glow.addColorStop(1, "rgba(234,106,28,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = "#ffffff";
  fitFont(ctx, o.brand, 800, 80, W - 128);
  ctx.fillText(o.brand, 64, 168);
  ctx.font = `600 34px ${FONT}`;
  ctx.fillStyle = orange(ctx, 64, 0, 600, 0);
  ctx.fillText("Catálogo de peças impressas em 3D", 64, 228);
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.fillRect(64, 268, W - 128, 2);

  const items = o.items.slice(0, CATALOG_MAX);
  const cols = items.length <= 1 ? 1 : 2;
  const rows = Math.max(1, Math.ceil(items.length / cols));
  const gap = 32;
  const top = 310;
  const bottom = H - 190;
  const cellW = (W - 128 - gap * (cols - 1)) / cols;
  const cellH = Math.min(cellW + 150, (bottom - top - gap * (rows - 1)) / rows);
  const photoH = cellH - 140;
  const imgs = await Promise.all(items.map((i) => (i.photo ? loadImage(i.photo).catch(() => null) : null)));

  items.forEach((it, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = 64 + col * (cellW + gap);
    const y = top + row * (cellH + gap);
    rrect(ctx, x, y, cellW, cellH, 28);
    ctx.fillStyle = "#151518";
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.save();
    rrect(ctx, x + 14, y + 14, cellW - 28, photoH - 14, 20);
    ctx.clip();
    const img = imgs[i];
    if (img) drawCover(ctx, img, x + 14, y + 14, cellW - 28, photoH - 14);
    else {
      ctx.fillStyle = "#202024";
      ctx.fillRect(x, y, cellW, photoH);
    }
    ctx.restore();
    ctx.fillStyle = "#ffffff";
    ctx.font = `700 34px ${FONT}`;
    ctx.fillText(truncate(ctx, it.name, cellW - 48), x + 24, y + photoH + 52);
    ctx.font = `500 24px ${FONT}`;
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.fillText(it.material, x + 24, y + photoH + 92);
    ctx.font = `800 30px ${FONT}`;
    const pw = ctx.measureText(it.price).width + 36;
    rrect(ctx, x + cellW - pw - 20, y + photoH + 66, pw, 48, 24);
    ctx.fillStyle = orange(ctx, x + cellW - pw, 0, x + cellW, 0);
    ctx.fill();
    ctx.fillStyle = "#1a1005";
    ctx.fillText(it.price, x + cellW - pw - 2, y + photoH + 101);
  });

  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.fillRect(64, H - 170, W - 128, 2);
  ctx.fillStyle = "#ffffff";
  ctx.font = `700 40px ${FONT}`;
  ctx.fillText(o.contact ? `Encomendas: ${o.contact}` : "Encomendas por mensagem", 64, H - 96);
  ctx.font = `500 24px ${FONT}`;
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.fillText("Personalização de cores por encomenda · Envio ou entrega em mão", 64, H - 52);
  return c.toDataURL("image/png");
}

export interface LabelInput {
  heading: string;
  title: string;
  subtitle: string;
  lines: string[];
  footer?: string | undefined;
  qrText: string;
  swatch?: string | undefined;
}

/** Printable white label (1200×600) with a QR code on the right. */
export async function renderLabel(o: LabelInput): Promise<string> {
  await ready();
  const QRCode = (await import("qrcode")).default;
  const W = 1200;
  const H = 600;
  const [c, ctx] = canvas(W, H);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = orange(ctx, 0, 0, 0, H);
  ctx.fillRect(0, 0, 18, H);

  const qr = await loadImage(await QRCode.toDataURL(o.qrText, { width: 440, margin: 0, errorCorrectionLevel: "M" }));
  ctx.drawImage(qr, W - 440 - 70, (H - 440) / 2, 440, 440);

  const left = 70;
  const maxW = W - 440 - 70 - left - 50;
  ctx.fillStyle = ORANGE_B;
  ctx.font = `700 24px ${FONT}`;
  ctx.fillText(o.heading.toUpperCase(), left, 82);

  let tx = left;
  if (o.swatch) {
    ctx.beginPath();
    ctx.arc(left + 22, 132, 22, 0, Math.PI * 2);
    ctx.fillStyle = o.swatch;
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.25)";
    ctx.lineWidth = 2;
    ctx.stroke();
    tx = left + 60;
  }
  ctx.fillStyle = "#111113";
  fitFont(ctx, o.title, 800, 52, maxW - (tx - left));
  ctx.fillText(truncate(ctx, o.title, maxW - (tx - left)), tx, 150);
  ctx.font = `500 28px ${FONT}`;
  ctx.fillStyle = "#55555c";
  ctx.fillText(truncate(ctx, o.subtitle, maxW), left, 196);

  ctx.font = `500 26px ${FONT}`;
  ctx.fillStyle = "#222226";
  let y = 256;
  for (const l of o.lines) {
    for (const [i, w] of wrap(ctx, l, maxW - 28).entries()) {
      if (y > H - 90) break;
      if (i === 0) {
        ctx.fillStyle = ORANGE_B;
        ctx.fillText("•", left, y);
        ctx.fillStyle = "#222226";
      }
      ctx.fillText(w, left + 28, y);
      y += 36;
    }
    y += 6;
  }
  if (o.footer) {
    ctx.fillStyle = "#111113";
    ctx.font = `700 28px ${FONT}`;
    ctx.fillText(truncate(ctx, o.footer, maxW), left, H - 50);
  }
  return c.toDataURL("image/png");
}

export function slug(s: string) {
  return (
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "gram3d"
  );
}
