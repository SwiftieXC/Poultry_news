import assert from "node:assert/strict";
import { after, test } from "node:test";
import { mkdtempSync, readFileSync, rmSync, mkdirSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { BudgetExceededError } from "../packages/backend/src/providers/receipts.ts";

const repo = process.cwd();
const root = path.join(repo, ".tmp");
mkdirSync(root, { recursive: true });
const taskDir = mkdtempSync(path.join(root, "codex-tests-"));
const previous = new Map<string, string | undefined>();
const keys = ["CODEX_CLI_BIN", "CODEX_STUB_MODE", "CODEX_STUB_CAPTURE", "NODE_OPTIONS", "OPENAI_API_KEY", "CODEX_API_KEY", "OPENAI_BASE_URL"];
for (const key of keys) previous.set(key, process.env[key]);
const stub = pathToFileURL(path.join(repo, "tests", "codex-stub.mjs")).href;
process.env.CODEX_CLI_BIN = process.execPath;
process.env.NODE_OPTIONS = `${process.env.NODE_OPTIONS ?? ""} --import=${stub}`.trim();
process.env.CODEX_STUB_CAPTURE = path.join(taskDir, "capture.json");
process.env.OPENAI_API_KEY = "fake-test-key";
process.env.CODEX_API_KEY = "fake-codex-key";
process.env.OPENAI_BASE_URL = "http://127.0.0.1:1";

after(() => {
  for (const [key, value] of previous) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  rmSync(taskDir, { recursive: true, force: true });
});

async function provider() {
  return import(`../packages/backend/src/providers/codex.ts?case=${Math.random()}`);
}

function mode(value: string) { process.env.CODEX_STUB_MODE = value; }

test("Codex CLI succeeds with UTF-8 split across output chunks and safe arguments", async () => {
  mode("success");
  const result = await (await provider()).callCodex({ model: "gpt-6-luna", system: "只输出 JSON", user: "样本", json: true, reasoningEffort: "low", timeoutMs: 1000 });
  assert.equal(result.requestId, "stub-thread");
  assert.equal((result.response as any).choices[0].message.content, "{\"ok\":true,\"label\":\"禽肉贸易\"}");
  assert.deepEqual(result.usage, { prompt_tokens: 17, completion_tokens: 9, prompt_tokens_details: { cached_tokens: 3 }, reasoning_tokens: 2, subscription: true });
  const capture = JSON.parse(readFileSync(process.env.CODEX_STUB_CAPTURE!, "utf8"));
  assert.ok(capture.args.includes("--ephemeral"));
  assert.ok(capture.args.includes("--ignore-user-config"));
  assert.ok(capture.args.includes("read-only"));
  assert.ok(capture.args.includes('web_search="disabled"'));
  assert.equal(capture.args[capture.args.indexOf("--model") + 1], "gpt-6-luna");
  assert.ok(capture.args.includes('model_reasoning_effort="low"'));
  assert.ok(capture.args.includes('model_provider="openai"'));
  for (const feature of ["shell_tool", "multi_agent", "hooks", "shell_snapshot", "skill_mcp_dependency_install"]) {
    assert.ok(capture.args.some((arg: string, index: number) => arg === "--disable" && capture.args[index + 1] === feature));
  }
  assert.deepEqual(capture.leakedKeys, []);
});

test("Codex CLI rejects API-key login, unapproved models, tool events, quota exhaustion, and timeout", async () => {
  mode("api-key-login");
  await assert.rejects((await provider()).callCodex({ model: "gpt-6-luna", system: "s", user: "u", json: true, reasoningEffort: "low", timeoutMs: 500 }), /ChatGPT login/);

  mode("success");
  await assert.rejects((await provider()).callCodex({ model: "other-model", system: "s", user: "u", json: true, reasoningEffort: "low", timeoutMs: 500 }), /Only the approved/);

  mode("tool");
  await assert.rejects((await provider()).callCodex({ model: "gpt-6-luna", system: "s", user: "u", json: true, reasoningEffort: "low", timeoutMs: 500 }), /tool use/);

  mode("tool-completed");
  await assert.rejects((await provider()).callCodex({ model: "gpt-6-luna", system: "s", user: "u", json: true, reasoningEffort: "low", timeoutMs: 500 }), /tool use/);

  mode("quota");
  await assert.rejects((await provider()).callCodex({ model: "gpt-6-luna", system: "s", user: "u", json: true, reasoningEffort: "low", timeoutMs: 500 }), BudgetExceededError);

  mode("timeout");
  await assert.rejects((await provider()).callCodex({ model: "gpt-6-luna", system: "s", user: "u", json: true, reasoningEffort: "low", timeoutMs: 40 }), /timed out/);

  mode("incomplete");
  await assert.rejects((await provider()).callCodex({ model: "gpt-6-luna", system: "s", user: "u", json: true, reasoningEffort: "low", timeoutMs: 500 }), /without a usable final response/);
});
