import "../../../tests/setup.ts";
import assert from "node:assert/strict";
import { after, test } from "node:test";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { resolve, join } from "node:path";
import { sql, closeDb } from "@aihot/backend/db";

mkdirSync(".tmp/department-daily", { recursive: true });
const scratch = mkdtempSync(resolve(".tmp/department-daily/cli-test-"));
after(async () => { await closeDb(); rmSync(scratch, { recursive: true }); });

function generate(date: string, out: string) {
  return spawnSync(process.execPath, ["modules/department-daily/scripts/generate.ts", "--date", date, "--sample", "--out", out], { encoding: "utf8", timeout: 30_000, env: process.env });
}

test("the generator preserves existing editions and receipts, and refuses an unprocessed window", async () => {
  const date = "2020-01-02";
  const content = { lead: { title: "本期无入选条目", leadParagraph: "仅限已筛选资料。" }, sections: [], flashes: [], metrics: { totalEvents: 0 } };
  await sql`INSERT INTO reports(kind,key,window_start,window_end,content,generated_at,origin)
    VALUES ('daily',${date},'2020-01-01T00:00:00Z','2020-01-02T00:00:00Z',${sql.json(content)},now(),'model')`;
  const before = await sql`SELECT id, revision, content, generated_at FROM reports WHERE kind='daily' AND key=${date}`;
  const [receiptsBefore] = await sql`SELECT count(*)::int AS count FROM receipts`;
  const out = join(scratch, "edition");
  const first = generate(date, out);
  assert.equal(first.status, 0, first.stderr);
  const md = readFileSync(join(out, "daily.md"), "utf8");
  assert.match(md, /历史回放样刊/);
  assert.match(md, /本期无入选条目/);
  assert.ok(existsSync(join(out, "daily.html")));

  const repeat = generate(date, out);
  assert.notEqual(repeat.status, 0);
  assert.match(repeat.stderr, /Output already exists/);
  assert.equal(readFileSync(join(out, "daily.md"), "utf8"), md);
  assert.equal(generate(date, join(scratch, "second-copy")).status, 0);
  assert.deepEqual(await sql`SELECT id, revision, content, generated_at FROM reports WHERE kind='daily' AND key=${date}`, before);
  const [receiptsAfter] = await sql`SELECT count(*)::int AS count FROM receipts`;
  assert.equal(receiptsAfter.count, receiptsBefore.count);

  const missingOut = join(scratch, "unprocessed");
  const missing = generate("2020-01-03", missingOut);
  assert.notEqual(missing.status, 0);
  assert.match(missing.stderr, /nothing judged in its window/);
  assert.equal(existsSync(missingOut), false);
  assert.equal((await sql`SELECT 1 FROM reports WHERE kind='daily' AND key='2020-01-03'`).length, 0);
});
