export interface Quantity { dimension: string; value: string | null; text: string }

const number = "[+-]?(?:\\d{1,3}(?:[.,]\\d{3})+|\\d+)(?:[.,]\\d+)?";
const scale = "milh(?:ão|ões)|mil|billion|million|thousand|百万|亿|億|万|千";
const powers: Record<string, number> = { mil: 3, milhão: 6, milhões: 6, thousand: 3, million: 6, billion: 9, 千: 3, 万: 4, 百万: 6, 亿: 8, 億: 8 };
const currencies: Record<string, string> = { "US$": "USD", USD: "USD", "$": "USD", 美元: "USD", 美金: "USD", "R$": "BRL", BRL: "BRL", 雷亚尔: "BRL", JPY: "JPY", 日元: "JPY", 円: "JPY", SAR: "SAR", 沙特里亚尔: "SAR", THB: "THB", 泰铢: "THB", CNY: "CNY", RMB: "CNY", 人民币: "CNY", EUR: "EUR", 欧元: "EUR" };
const currency = "US\\$|R\\$|USD|BRL|JPY|SAR|THB|CNY|RMB|EUR|沙特里亚尔|人民币|雷亚尔|美元|美金|日元|泰铢|欧元|円|\\$";

/** Canonical base units by decimal-string shifts, without floating point or exchange rates. */
function decimal(raw: string, pt: boolean, power: number): string | null {
  if (raw.length > 100 || !(pt ? /^[+-]?(?:\d{1,3}(?:\.\d{3})+|\d+)(?:,\d+)?$/ : /^[+-]?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?$/).test(raw)) return null;
  const normalized = pt ? raw.replaceAll(".", "").replace(",", ".") : raw.replaceAll(",", "");
  const negative = normalized.startsWith("-");
  const [whole, fraction = ""] = normalized.replace(/^[+-]/, "").split(".");
  const digits = whole! + fraction;
  const point = whole!.length + power;
  const shifted = point <= 0 ? `0.${"0".repeat(-point)}${digits}` : point >= digits.length ? digits + "0".repeat(point - digits.length) : `${digits.slice(0, point)}.${digits.slice(point)}`;
  const [integer, decimals = ""] = shifted.split(".");
  const trimmed = decimals.replace(/0+$/, "");
  const value = integer!.replace(/^0+(?=\d)/, "") + (trimmed ? `.${trimmed}` : "");
  return (negative && value !== "0" ? "-" : "") + value;
}

/** Recognises explicit weight and currency phrases; ratios, dates and inferred units stay outside. */
export function extractQuantities(text: string): Quantity[] {
  text = text.replace(/https?:\/\/[^\s<>“”‘’，。！？；]+|`[^`]*`/g, " ");
  const results: Quantity[] = [];
  const add = (match: RegExpMatchArray, raw: string, multiplier: string | undefined, unit: string, dimension: string) => {
    const pt = /toneladas?|milh(?:ão|ões)|^mil$/i.test(`${unit} ${multiplier ?? ""}`.trim()) || multiplier === "mil";
    const power = (powers[multiplier?.toLowerCase() ?? ""] ?? 0) + (/^(?:kg|kilograms?|公斤|千克)$/i.test(unit) ? -3 : 0);
    const value = decimal(raw, pt, power);
    results.push({ dimension, value, text: match[0] });
  };
  const weights = new RegExp(`(?<![\\w.,+-])(${number})\\s*(?:(${scale})\\s*)?(?:de\\s+)?(toneladas?|(?:metric\\s+)?(?:tonnes?|tons?)|kilograms?|kg\\b|t\\b|公斤|千克|吨|噸|トン)`, "giu");
  for (const m of text.matchAll(weights)) add(m, m[1]!, m[2], m[3]!, "tonnes");
  const prefix = new RegExp(`(?<![A-Za-z])(${currency})\\s*(${number})\\s*(?:(${scale})(?![A-Za-z]))?`, "giu");
  const isPrice = (m: RegExpMatchArray) => /^\s*\/\s*(?:kg\b|t\b|tonnes?\b|tons?\b|公斤|千克|吨)/i.test(text.slice(m.index! + m[0].length));
  for (const m of text.matchAll(prefix)) if (!isPrice(m)) add(m, m[2]!, m[3], m[1]!, currencies[m[1]!.toUpperCase()] ?? currencies[m[1]!]!);
  const suffix = new RegExp(`(?<![\\w.,+-])(${number})\\s*(?:(${scale})\\s*)?(${currency})(?![A-Za-z])`, "giu");
  for (const m of text.matchAll(suffix)) if (!isPrice(m)) add(m, m[1]!, m[2], m[3]!, currencies[m[3]!.toUpperCase()] ?? currencies[m[3]!]!);
  return results;
}

export function unmatchedQuantities(copy: string, material: string): Quantity[] {
  const known = new Set(extractQuantities(material).filter(q => q.value !== null).map(q => `${q.dimension}:${q.value}`));
  return extractQuantities(copy).filter(q => q.value === null || !known.has(`${q.dimension}:${q.value}`));
}
