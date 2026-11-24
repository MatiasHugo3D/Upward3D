/** Pure parsers for OCR text from slicer / printer app screenshots. */

const num = (s: string) => parseFloat(s.replace(",", "."));

export function parseGrams(text: string): number | null {
  const t = text.replace(/\s+/g, " ");
  const re = /(\d{1,5}(?:[.,]\d{1,2})?)\s?(?:g|gr|grams|gramas)\b/gi;
  const keyword = /(filament|filamento|weight|peso|total|used|usado|material)/i;
  const candidates: { value: number; score: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(t))) {
    const value = num(m[1] ?? "");
    if (!Number.isFinite(value) || value <= 0 || value > 20000) continue;
    const before = t.slice(Math.max(0, m.index - 40), m.index);
    const score = (keyword.test(before) ? 10 : 0) + (/total/i.test(before) ? 5 : 0);
    candidates.push({ value, score });
  }
  if (!candidates.length) return null;
  candidates.sort((a, b) => b.score - a.score || b.value - a.value);
  return candidates[0]!.value;
}

export function parseDuration(text: string): { hours: number; minutes: number } | null {
  const t = text.replace(/\s+/g, " ");
  const candidates: { total: number; score: number }[] = [];
  const keyword = /(time|tempo|duração|duration|estimated|estimado|print)/i;
  const push = (total: number, index: number) => {
    if (total <= 0 || total > 60 * 24 * 30) return;
    const before = t.slice(Math.max(0, index - 40), index);
    candidates.push({ total, score: keyword.test(before) ? 10 : 0 });
  };

  // 1d 2h 30m / 2h 30min / 2 h 5 m / 45min
  const re =
    /(?:(\d{1,2})\s?d(?:ays?|ias?)?\s?)?(?:(\d{1,3})\s?h(?:ours?|oras?|rs?)?\s?)?(?:(\d{1,2})\s?m(?:in(?:utes?|utos?)?)?\b)?/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(t))) {
    if (m[0].trim() === "") {
      re.lastIndex++;
      continue;
    }
    const d = m[1] ? parseInt(m[1]) : 0;
    const h = m[2] ? parseInt(m[2]) : 0;
    const mi = m[3] ? parseInt(m[3]) : 0;
    if (!m[2] && !m[3]) continue;
    // Plain "45m" could be metres; only accept minutes alone if 'min' spelled out
    if (!m[1] && !m[2] && !/min/i.test(m[0])) continue;
    push(d * 1440 + h * 60 + mi, m.index);
  }

  // 01:23:45 or 1:23
  const clock = /\b(\d{1,3}):([0-5]\d)(?::([0-5]\d))?\b/g;
  while ((m = clock.exec(t))) {
    const h = parseInt(m[1] ?? "0");
    const mi = parseInt(m[2] ?? "0");
    push(h * 60 + mi, m.index);
  }

  if (!candidates.length) return null;
  candidates.sort((a, b) => b.score - a.score || b.total - a.total);
  const total = candidates[0]!.total;
  return { hours: Math.floor(total / 60), minutes: total % 60 };
}

export function parsePercent(text: string): number | null {
  const re = /(\d{1,3}(?:[.,]\d)?)\s?%/g;
  const values: number[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const v = num(m[1] ?? "");
    if (v >= 1 && v <= 99) values.push(Math.round(v));
  }
  return values[0] ?? null;
}
