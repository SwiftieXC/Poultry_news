import assert from "node:assert/strict";
import { test } from "node:test";
import { once } from "node:events";
import { request } from "node:http";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, existsSync } from "node:fs";
import path from "node:path";
import { createReviewServer, type Corpus } from "../scripts/label-review.ts";

const fixture: Corpus = { batchId: "annotation-fixture", title: "Synthetic annotation test", preparedAt: "2026-10-11T00:00:00Z", items:
  Array.from({ length: 3 }, (_, i) => ({ id: `case-${i}`, titleZh: `合成资料 ${i}`, originalTitle: `Synthetic case ${i}`, summaryZh: "仅供保存和导出测试的合成材料。",
    sourceName: "Synthetic source", sourceUrl: `https://example.org/${i}`, publishedAt: "2026-10-10T00:00:00Z", sourceKind: "rss", sourceTier: "T1",
    language: "en", bodyOriginal: `Original synthetic evidence ${i}`, stratum: "policy", eventKey: `event-${i}`, benchmarkSplit: i === 2 ? "holdout" : "development", sourceEvidence: "Synthetic test only" })) };

async function workspace(work: (ctx: { dir: string; base: string; restart: () => Promise<void> }) => Promise<void>) {
  const root = path.resolve(".tmp/labeling-v1"); mkdirSync(root, { recursive: true });
  const dir = mkdtempSync(path.join(root, "test-"));
  writeFileSync(path.join(dir, "corpus.json"), JSON.stringify(fixture));
  let server = createReviewServer(dir), base = "";
  const listen = async () => { server.listen(0, "127.0.0.1"); await once(server, "listening"); base = `http://127.0.0.1:${(server.address() as { port: number }).port}`; };
  const stop = async () => { await new Promise<void>((resolve, reject) => server.close(err => err ? reject(err) : resolve())); };
  await listen();
  const ctx = { dir, get base() { return base; }, restart: async () => { await stop(); server = createReviewServer(dir); await listen(); } };
  try { await work(ctx); } finally { await stop(); rmSync(dir, { recursive: true, force: true }); }
}
const payload = (decision: string, baseVersion = 0, notes = "用户备注") => ({ decision, notes, flags: ["numbers"], baseVersion });
const save = (base: string, id: string, value: unknown, origin = base) => fetch(`${base}/api/labels/${id}`, {
  method: "POST", headers: { "content-type": "application/json", origin }, body: JSON.stringify(value),
});

test("annotation choices survive service restart and preserve earlier revisions", async () => {
  await workspace(async ctx => {
    assert.equal((await (await fetch(`${ctx.base}/api/labels`)).json()).count, 0);
    const first = await save(ctx.base, "case-0", payload("select")); assert.equal(first.status, 200);
    await ctx.restart();
    const reloaded = await (await fetch(`${ctx.base}/api/labels`)).json();
    assert.equal(reloaded.labels["case-0"].decision, "select"); assert.equal(reloaded.labels["case-0"].version, 1);
    const updated = await save(ctx.base, "case-0", payload("related", 1, "修改后的理由")); assert.equal(updated.status, 200);
    const history = readFileSync(path.join(ctx.dir, "labels.events.jsonl"), "utf8").trim().split("\n").map(line => JSON.parse(line));
    assert.deepEqual(history.map(row => row.decision), ["select", "related"]);
    assert.equal(history[0].notes, "用户备注");
  });
});

test("a lost-response retry is idempotent while a stale conflicting tab cannot overwrite", async () => {
  await workspace(async ctx => {
    await save(ctx.base, "case-0", payload("select"));
    const retry = await save(ctx.base, "case-0", payload("select"));
    assert.equal(retry.status, 200); assert.equal((await retry.json()).label.version, 1);
    const conflict = await save(ctx.base, "case-0", payload("irrelevant")); assert.equal(conflict.status, 409);
    const events = readFileSync(path.join(ctx.dir, "labels.events.jsonl"), "utf8").trim().split("\n"); assert.equal(events.length, 1);
    assert.equal((await (await fetch(`${ctx.base}/api/labels`)).json()).labels["case-0"].decision, "select");
  });
});

test("untrusted browser origins, hosts, unknown cases and invalid choices cannot write labels", async () => {
  await workspace(async ctx => {
    assert.equal((await save(ctx.base, "case-0", payload("select"), "https://untrusted.example")).status, 403);
    const hostStatus = await new Promise<number>(resolve => {
      const req = request(`${ctx.base}/api/labels`, { headers: { host: "untrusted.example" } }, res => { res.resume(); resolve(res.statusCode!); });
      req.end();
    });
    assert.equal(hostStatus, 403);
    assert.equal((await save(ctx.base, "unknown", payload("select"))).status, 404);
    assert.equal((await save(ctx.base, "case-0", payload("not-a-decision"))).status, 400);
    assert.equal((await save(ctx.base, "case-0", payload("select", 0, "x".repeat(2001)))).status, 400);
    assert.equal((await save(ctx.base, "case-0", { ...payload("select"), flags: ["invented"] })).status, 400);
    assert.equal(existsSync(path.join(ctx.dir, "labels.events.jsonl")), false);
  });
});

test("gold export omits unlabelled cases, preserves original evidence and treats uncertainty as either", async () => {
  await workspace(async ctx => {
    assert.equal(await (await fetch(`${ctx.base}/api/gold`)).text(), "");
    await save(ctx.base, "case-0", payload("select")); await save(ctx.base, "case-2", payload("uncertain"));
    const rows = (await (await fetch(`${ctx.base}/api/gold`)).text()).trim().split("\n").map(line => JSON.parse(line));
    assert.deepEqual(rows.map(row => row.gold.decision), ["select", "either"]);
    assert.equal(rows[0].material.bodyOriginal, fixture.items[0]!.bodyOriginal);
    assert.equal(rows[1].samplingContext.benchmarkSplit, "holdout");
    const exported = await (await fetch(`${ctx.base}/api/export`)).json();
    assert.equal(exported.items.length, 3); assert.equal(exported.items[1].label, null);
  });
});

test("changed corpus identity or an incomplete journal stops writes instead of dropping user data", async () => {
  const root = path.resolve(".tmp/labeling-v1"); mkdirSync(root, { recursive: true });
  const dir = mkdtempSync(path.join(root, "corrupt-"));
  try {
    writeFileSync(path.join(dir, "corpus.json"), JSON.stringify(fixture));
    writeFileSync(path.join(dir, "labels.events.jsonl"), '{"incomplete":');
    assert.throws(() => createReviewServer(dir), /incomplete/);
    assert.equal(readFileSync(path.join(dir, "labels.events.jsonl"), "utf8"), '{"incomplete":');
    writeFileSync(path.join(dir, "labels.events.jsonl"), JSON.stringify({ batchId: "another-batch", corpusHash: "wrong", id: "case-0" }) + "\n");
    assert.throws(() => createReviewServer(dir), /different corpus/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
