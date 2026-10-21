import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { z } from "zod";
import { sql } from "../packages/backend/src/db.ts";
import { chatJson } from "../packages/backend/src/providers/llm.ts";
import { BudgetExceededError, ReceiptUnknownError } from "../packages/backend/src/providers/receipts.ts";
import { tag } from "./setup.ts";

const root = path.join(process.cwd(), ".tmp");
mkdirSync(root, { recursive: true });
const taskDir = mkdtempSync(path.join(root, "codex-tests-"));
const countFile = path.join(taskDir, "calls.txt");
writeFileSync(countFile, "");
const previous = new Map<string, string | undefined>();
const keys = ["CODEX_CLI_BIN", "CODEX_STUB_MODE", "CODEX_STUB_CAPTURE", "CODEX_STUB_COUNT_FILE", "NODE_OPTIONS"];
for (const key of keys) previous.set(key, process.env[key]);
process.env.CODEX_CLI_BIN = process.execPath;
process.env.NODE_OPTIONS = `${process.env.NODE_OPTIONS ?? ""} --import=${pathToFileURL(path.join(process.cwd(), "tests", "codex-stub.mjs")).href}`.trim();
process.env.CODEX_STUB_CAPTURE = path.join(taskDir, "capture.json");
process.env.CODEX_STUB_COUNT_FILE = path.join(taskDir, "calls.txt");

let originalBudget: { per_minute: number; per_hour: number; per_day: number } | undefined;

before(async () => {
  const [row] = await sql<{ per_minute: number; per_hour: number; per_day: number }[]>`SELECT per_minute, per_hour, per_day FROM budgets WHERE service='codex'`;
  originalBudget = row;
  await sql`INSERT INTO budgets (service, per_minute, per_hour, per_day) VALUES ('codex', 100, 100, 100)
            ON CONFLICT (service) DO UPDATE SET per_minute=100, per_hour=100, per_day=100`;
});

after(async () => {
  await sql`DELETE FROM budgets WHERE service='codex'`;
  if (originalBudget) {
    await sql`INSERT INTO budgets (service, per_minute, per_hour, per_day) VALUES ('codex', ${originalBudget.per_minute}, ${originalBudget.per_hour}, ${originalBudget.per_day})`;
  }
  for (const [key, value] of previous) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  await sql.end();
  rmSync(taskDir, { recursive: true, force: true });
});

const opts = (subject: string) => ({ model: "codex-luna", purpose: "codex_offline_test", subject, promptVersion: "t1", system: "Return JSON", user: `input ${subject}`, schema: z.object({ ok: z.boolean(), label: z.string() }), timeoutMs: 1000 });
const calls = () => readFileSync(countFile, "utf8").split("\n").filter(Boolean).length;

test("Codex received receipt is reused without another CLI call", async () => {
  process.env.CODEX_STUB_MODE = "success";
  const subject = `codex-reuse:${tag()}`;
  const before = calls();
  const first = await chatJson(opts(subject));
  const second = await chatJson(opts(subject));
  assert.equal(first.reused, false);
  assert.equal(second.reused, true);
  assert.equal(first.receiptId, second.receiptId);
  assert.equal(second.usage?.subscription, true);
  assert.equal(calls(), before + 1);
  const [receipt] = await sql<{ status: string; cost: number | null }[]>`SELECT status, cost FROM receipts WHERE id=${first.receiptId}`;
  assert.equal(receipt?.status, "received");
  assert.equal(receipt?.cost, null);
});

test("Codex budget absence and stopped budget reject before spawning the CLI", async () => {
  const [saved] = await sql<{ per_minute: number; per_hour: number; per_day: number }[]>`SELECT per_minute, per_hour, per_day FROM budgets WHERE service='codex'`;
  assert.ok(saved, "the isolated migrated database has a codex budget row");
  const before = calls();
  try {
    await sql`DELETE FROM budgets WHERE service='codex'`;
    await assert.rejects(chatJson(opts(`codex-no-budget:${tag()}`)), /budget is not configured/i);
    await sql`INSERT INTO budgets (service, per_minute, per_hour, per_day) VALUES ('codex', ${saved.per_minute}, ${saved.per_hour}, ${saved.per_day})`;
    await sql`UPDATE budgets SET per_minute=0, per_hour=0, per_day=0 WHERE service='codex'`;
    await assert.rejects(chatJson(opts(`codex-budget-stop:${tag()}`)), BudgetExceededError);
    assert.equal(calls(), before);
  } finally {
    await sql`DELETE FROM budgets WHERE service='codex'`;
    await sql`INSERT INTO budgets (service, per_minute, per_hour, per_day) VALUES ('codex', ${saved.per_minute}, ${saved.per_hour}, ${saved.per_day})`;
  }
});

test("quota failures become failed receipts and ambiguous turns become unknown without HTTP fallback", async () => {
  const before = calls();
  const originalFetch = globalThis.fetch;
  let httpCalls = 0;
  globalThis.fetch = async () => { httpCalls++; throw new Error("Unexpected HTTP fallback"); };
  try {
  process.env.CODEX_STUB_MODE = "quota";
  const quotaSubject = `codex-quota:${tag()}`;
  await assert.rejects(chatJson(opts(quotaSubject)), BudgetExceededError);
  const [failed] = await sql<{ status: string }[]>`SELECT status FROM receipts WHERE subject=${quotaSubject}`;
  assert.equal(failed?.status, "failed");

  process.env.CODEX_STUB_MODE = "unknown";
  const unknownSubject = `codex-unknown:${tag()}`;
  await assert.rejects(chatJson(opts(unknownSubject)), ReceiptUnknownError);
  const [unknown] = await sql<{ status: string }[]>`SELECT status FROM receipts WHERE subject=${unknownSubject}`;
  assert.equal(unknown?.status, "unknown");
  await assert.rejects(chatJson(opts(unknownSubject)), ReceiptUnknownError);
  assert.equal(httpCalls, 0);
  assert.equal(calls(), before + 2, "each attempted Codex call spawned exactly one local stub process");

  process.env.CODEX_STUB_MODE = "timeout";
  const timeoutSubject = `codex-timeout:${tag()}`;
  await assert.rejects(chatJson({ ...opts(timeoutSubject), timeoutMs: 1000 }), ReceiptUnknownError);
  const [timedOut] = await sql<{ status: string }[]>`SELECT status FROM receipts WHERE subject=${timeoutSubject}`;
  assert.equal(timedOut?.status, "unknown");
  await assert.rejects(chatJson({ ...opts(timeoutSubject), timeoutMs: 1000 }), ReceiptUnknownError);
  assert.equal(calls(), before + 3);
  assert.equal(httpCalls, 0);
  } finally { globalThis.fetch = originalFetch; }
});
