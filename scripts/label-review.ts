// Private local annotation workspace. No database, model calls or public publication routes.
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { formatChineseCopy } from "@aihot/site/format";

export const DECISIONS = ["select", "related", "irrelevant", "uncertain"] as const;
export const FLAGS = ["numbers", "products", "stage", "buyer", "summary"] as const;
type Decision = typeof DECISIONS[number];
type Flag = typeof FLAGS[number];
export interface LabelItem {
  id: string; titleZh: string; originalTitle: string; summaryZh: string;
  sourceName: string; sourceUrl: string; publishedAt: string | null;
  sourceKind: string; sourceTier: string; language: string; bodyOriginal: string;
  stratum: string; eventKey: string; benchmarkSplit: string; sourceEvidence: string;
}
export interface Corpus { batchId: string; title: string; preparedAt: string; items: LabelItem[] }
interface Label { id: string; decision: Decision; notes: string; flags: Flag[]; version: number; updatedAt: string }
interface Event extends Label { batchId: string; corpusHash: string }
const identifier = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,99}$/;
const assetDir = fileURLToPath(new URL("./label-review/", import.meta.url));
const isObject = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);

function parseCorpus(raw: string): Corpus {
  const corpus = JSON.parse(raw) as Corpus;
  if (!identifier.test(corpus.batchId) || !corpus.title || !Array.isArray(corpus.items) || !corpus.items.length || corpus.items.length > 200) throw new Error("Invalid annotation corpus");
  const ids = new Set<string>(), urls = new Set<string>(), splits = new Map<string, string>();
  for (const item of corpus.items) {
    if (!identifier.test(item.id) || ids.has(item.id)) throw new Error("Duplicate or invalid case id");
    const url = new URL(item.sourceUrl);
    if (!["http:", "https:"].includes(url.protocol) || urls.has(url.href)) throw new Error("Duplicate or invalid source URL");
    if ([item.titleZh, item.originalTitle, item.summaryZh, item.sourceName, item.bodyOriginal, item.eventKey, item.stratum, item.sourceEvidence].some(v => typeof v !== "string" || !v.trim())) throw new Error(`Incomplete material: ${item.id}`);
    if (!item.benchmarkSplit || (splits.has(item.eventKey) && splits.get(item.eventKey) !== item.benchmarkSplit)) throw new Error("One event cannot cross benchmark splits");
    if (item.publishedAt !== null && !Number.isFinite(Date.parse(item.publishedAt))) throw new Error("Invalid source publication date");
    ids.add(item.id); urls.add(url.href); splits.set(item.eventKey, item.benchmarkSplit);
  }
  return corpus;
}

function parseChoice(value: unknown): { decision: Decision; notes: string; flags: Flag[]; baseVersion: number } {
  if (!isObject(value) || !DECISIONS.includes(value.decision as Decision) || typeof value.notes !== "string" || value.notes.length > 2000
      || !Array.isArray(value.flags) || value.flags.length > FLAGS.length || !value.flags.every(f => FLAGS.includes(f as Flag))
      || !Number.isSafeInteger(value.baseVersion) || Number(value.baseVersion) < 0) throw new Error("Invalid label payload");
  return { decision: value.decision as Decision, notes: value.notes, flags: [...new Set(value.flags as Flag[])].sort(), baseVersion: Number(value.baseVersion) };
}

export function createReviewServer(dataDir: string) {
  const raw = readFileSync(path.join(dataDir, "corpus.json"), "utf8");
  const corpus = parseCorpus(raw);
  const corpusHash = createHash("sha256").update(raw).digest("hex");
  const ids = new Set(corpus.items.map(i => i.id));
  const eventsFile = path.join(dataDir, "labels.events.jsonl");
  const labels = new Map<string, Label>();
  mkdirSync(dataDir, { recursive: true });
  if (existsSync(eventsFile)) {
    const saved = readFileSync(eventsFile, "utf8");
    if (saved && !saved.endsWith("\n")) throw new Error("Label journal is incomplete; inspect it before writing");
    for (const line of saved.split("\n").filter(Boolean)) {
      const event = JSON.parse(line) as Event;
      if (event.batchId !== corpus.batchId || event.corpusHash !== corpusHash || !ids.has(event.id)) throw new Error("Labels belong to a different corpus; do not overwrite them");
      parseChoice({ ...event, baseVersion: event.version - 1 });
      if (event.version !== (labels.get(event.id)?.version ?? 0) + 1 || !Number.isFinite(Date.parse(event.updatedAt))) throw new Error("Invalid annotation journal sequence");
      labels.set(event.id, event);
    }
  }
  const snapshot = () => ({ batchId: corpus.batchId, corpusHash, labels: Object.fromEntries(labels), count: labels.size });
  const send = (res: ServerResponse, status: number, body: unknown, type = "application/json; charset=utf-8") => {
    res.writeHead(status, { "content-type": type, "cache-control": "no-store", "x-content-type-options": "nosniff",
      "content-security-policy": "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'" });
    res.end(typeof body === "string" ? body : JSON.stringify(body));
  };
  let writeFailed = false;
  const server = createServer(async (req, res) => {
    try {
      const port = (server.address() as { port: number } | null)?.port;
      const host = req.headers.host ?? "";
      if (![ `127.0.0.1:${port}`, `localhost:${port}` ].includes(host)) return send(res, 403, { error: "只允许本机标注页面访问。" });
      const url = new URL(req.url ?? "/", `http://${host}`);
      const assets: Record<string, [string, string]> = { "/": ["index.html", "text/html; charset=utf-8"], "/app.js": ["app.js", "text/javascript; charset=utf-8"], "/styles.css": ["styles.css", "text/css; charset=utf-8"] };
      if (req.method === "GET" && assets[url.pathname]) {
        const [name, type] = assets[url.pathname]!;
        return send(res, 200, readFileSync(path.join(assetDir, name), "utf8"), type);
      }
      if (req.method === "GET" && url.pathname === "/api/corpus") return send(res, 200, {
        ...corpus, corpusHash, items: corpus.items.map(i => ({ ...i, titleZh: formatChineseCopy(i.titleZh), summaryZh: formatChineseCopy(i.summaryZh) })),
      });
      if (req.method === "GET" && url.pathname === "/api/labels") return send(res, 200, snapshot());
      if (req.method === "GET" && url.pathname === "/api/export") {
        res.setHeader("content-disposition", `attachment; filename="${corpus.batchId}-labels.json"`);
        return send(res, 200, { ...snapshot(), exportedAt: new Date().toISOString(), items: corpus.items.map(item => ({ ...item, label: labels.get(item.id) ?? null })) });
      }
      if (req.method === "GET" && url.pathname === "/api/gold") {
        const rows = corpus.items.flatMap(item => {
          const label = labels.get(item.id);
          if (!label) return [];
          return [{ caseId: item.id, material: { title: item.titleZh, originalTitle: item.originalTitle, publishedAt: item.publishedAt,
            sourceName: item.sourceName, sourceUrl: item.sourceUrl, bodyZh: null, bodyOriginal: item.bodyOriginal },
            sourceFacts: { sourceKind: item.sourceKind, sourceTier: item.sourceTier, firstParty: item.sourceTier === "T1", language: item.language },
            samplingContext: { benchmarkSplit: item.benchmarkSplit, samplingStratum: item.stratum, eventKey: item.eventKey },
            gold: { decision: label.decision === "select" ? "select" : label.decision === "uncertain" ? "either" : "reject" },
            humanReview: { decision: label.decision, notes: label.notes, flags: label.flags, updatedAt: label.updatedAt } }];
        });
        res.setHeader("content-disposition", `attachment; filename="${corpus.batchId}-gold.jsonl"`);
        return send(res, 200, rows.map(row => JSON.stringify(row)).join("\n") + (rows.length ? "\n" : ""), "application/x-ndjson; charset=utf-8");
      }
      const match = /^\/api\/labels\/([a-zA-Z0-9_-]+)$/.exec(url.pathname);
      if (req.method === "POST" && match) {
        if (req.headers.origin !== `http://${host}` || !/^application\/json(?:;|$)/i.test(req.headers["content-type"] ?? "")) return send(res, 403, { error: "请从本机标注页面保存。" });
        if (!ids.has(match[1]!)) return send(res, 404, { error: "资料不存在。" });
        if (writeFailed) return send(res, 503, { error: "上次保存结果未确认，请停止标注并检查本机记录。" });
        let choice: ReturnType<typeof parseChoice>;
        try { choice = parseChoice(JSON.parse(await readBody(req))); }
        catch { return send(res, 400, { error: "标注格式不正确，备注最多 2000 字。" }); }
        const id = match[1]!;
        const current = labels.get(id);
        // Identical retries are safe, including a lost successful HTTP response.
        if (current && current.decision === choice.decision && current.notes === choice.notes && JSON.stringify(current.flags) === JSON.stringify(choice.flags)) return send(res, 200, { label: current });
        if (choice.baseVersion !== (current?.version ?? 0)) return send(res, 409, { error: "这条资料已在另一个页面更新，请刷新后核对。", label: current ?? null });
        const event: Event = { id, decision: choice.decision, notes: choice.notes, flags: choice.flags, version: choice.baseVersion + 1,
          updatedAt: new Date().toISOString(), batchId: corpus.batchId, corpusHash };
        try { appendFileSync(eventsFile, JSON.stringify(event) + "\n", { encoding: "utf8", flush: true }); }
        catch { writeFailed = true; return send(res, 503, { error: "保存结果未确认，请停止标注并检查本机记录。" }); }
        labels.set(id, event);
        return send(res, 200, { label: event });
      }
      return send(res, 404, { error: "页面不存在。" });
    } catch { return send(res, 500, { error: "读取失败，请检查本机标注服务。" }); }
  });
  return server;
}

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = []; let bytes = 0;
  for await (const chunk of req) {
    bytes += chunk.length;
    if (bytes > 16000) throw new Error("Request too large");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { values } = parseArgs({ options: { data: { type: "string", default: ".data/labeling-v1" }, port: { type: "string", default: "53200" } } });
  const port = Number(values.port);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Invalid port");
  const dataDir = path.resolve(values.data!);
  const root = path.resolve(import.meta.dirname, "..");
  if (![".data", ".tmp"].some(dir => dataDir.startsWith(path.join(root, dir) + path.sep))) throw new Error("Annotation data must stay in this project's .data or .tmp");
  const server = createReviewServer(dataDir);
  server.listen(port, "127.0.0.1", () => console.log(`标注页面：http://127.0.0.1:${port} ；选择自动保存，可直接告诉我“标好了”。`));
  const stop = () => server.close(() => process.exit(0));
  process.on("SIGINT", stop); process.on("SIGTERM", stop);
}
