// Live, read-only validation of the configured free RSS/web entrances. No database writes,
// model calls, Jina fallback or worker scheduling; address and TLS guards stay enabled.
import { readFileSync } from "node:fs";
import type { SourceRow } from "@aihot/backend/sources/types";

const args = process.argv.slice(2);
if (args.length && (args.length !== 2 || args[0] !== "--proxy")) throw new Error("usage: node scripts/check-sources.ts [--proxy http://host:port]");
if (args.length) {
  const proxy = new URL(args[1]);
  if (!["http:", "https:"].includes(proxy.protocol)) throw new Error("proxy must use HTTP or HTTPS");
  process.env.EGRESS_PROXY_URL = proxy.toString();
}
// Set before backend configuration loads, including when the caller supplies an env file.
for (const valve of ["COLLECT_ENABLED", "MODEL_CALLS_ENABLED", "FEISHU_CONTENT_PUSH_ENABLED", "FEISHU_INTERNAL_ENABLED", "INDEXNOW_SUBMIT_ENABLED", "ALLOW_PRIVATE_NETWORK_FETCH"]) process.env[valve] = "false";
const { fetchRss } = await import("@aihot/backend/sources/rss");
const { fetchWebList, fetchDetail } = await import("@aihot/backend/sources/web-list");
const { admitListing } = await import("@aihot/backend/sources/filters");
const { assertSupportedConfig } = await import("@aihot/backend/sources/config-keys");
const { guardedFetch } = await import("@aihot/backend/lib/http-fetch");
const { readable } = await import("@aihot/backend/content/extract");
const { closeDb } = await import("@aihot/backend/db");
const { sources } = JSON.parse(readFileSync(new URL("../industry/sources.json", import.meta.url), "utf8")) as { sources: SourceRow[] };

try {
  const results = await Promise.all(sources.map(async s => {
    let stage = "listing";
    try {
      assertSupportedConfig(s.kind, s.config);
      if (!["rss", "web_list"].includes(s.kind)) throw new Error("check supports free RSS and web lists only");
      const entrance = String(s.config.feedUrl ?? s.config.url ?? "");
      if (new URL(entrance).hostname === "r.jina.ai") throw new Error("paid listing adapters are not checked here");
      const source: SourceRow = { ...s, first_party: s.tier === "T1", cursor: null, fail_count: 0 };
      const raw = s.kind === "rss" ? (await fetchRss(source)).candidates : await fetchWebList(source);
      const items = admitListing(raw, source);
      if (!items.length) throw new Error("no admitted articles");
      const dated = items.filter(item => item.publishedAt).length;
      const target = items.find(item => /鶏|鳥|家きん|frango|aves|poultry|meat|food|import/i.test(item.title)) ?? items[0];
      stage = "detail";
      let body;
      let publishedAt = target.publishedAt;
      let httpStatus = 200;
      if (!publishedAt && s.config.detail) {
        const detail = await fetchDetail(target.url, source, { date: true, title: false, summary: false, body: true });
        body = detail.body;
        publishedAt = detail.publishedAt;
      } else {
        const page = await guardedFetch(target.url, { timeoutMs: 20_000 });
        httpStatus = page.status;
        body = page.status === 200 ? readable(page.text(), page.url, s.config.publishedAtUtcOffset) : null;
      }
      if (!publishedAt) throw new Error("sample has no trusted publication date");
      if (!body) throw new Error(`article body unavailable (HTTP ${httpStatus})`);
      return { id: s.id, status: "ok", rawCount: raw.length, admittedCount: items.length, dated,
        garbled: items.filter(item => /\uFFFD/.test(item.title)).length,
        detail: { url: target.url, httpStatus, bodyChars: body.text.length,
          publishedAt: publishedAt.toISOString() } };
    } catch (error) {
      const cause = error instanceof Error ? error.cause as { code?: unknown } | undefined : undefined;
      return { id: s.id, status: "failed", stage, error: error instanceof Error ? error.message : "source check failed",
        ...(typeof cause?.code === "string" && /^[A-Z0-9_]+$/.test(cause.code) ? { code: cause.code } : {}) };
    }
  }));
  console.log(JSON.stringify({ checkedAt: new Date().toISOString(), proxyConfigured: !!process.env.EGRESS_PROXY_URL,
    allowPrivateNetworkFetch: false, sources: results }, null, 2));
  if (results.some(result => result.status !== "ok")) process.exitCode = 1;
} finally { await closeDb(); }
