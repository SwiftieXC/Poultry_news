// Loaded only by child Node processes in codex-provider tests.
import { appendFileSync, writeFileSync, writeSync } from "node:fs";
import { basename } from "node:path";

const mode = process.env.CODEX_STUB_MODE ?? "success";
const capture = process.env.CODEX_STUB_CAPTURE;
const args = [basename(process.argv[1] ?? ""), ...process.argv.slice(2)];
const isLogin = args[0] === "login";
if (capture) writeFileSync(capture, JSON.stringify({ args, leakedKeys: ["OPENAI_API_KEY", "CODEX_API_KEY", "OPENAI_BASE_URL"].filter((key) => process.env[key] !== undefined) }));
if (process.env.CODEX_STUB_COUNT_FILE && !isLogin) appendFileSync(process.env.CODEX_STUB_COUNT_FILE, "call\n");
if (isLogin) {
  if (mode === "api-key-login") process.stderr.write("Logged in using API key\n");
  else process.stdout.write("Logged in using ChatGPT\n");
  process.exit(0);
}
if (mode === "timeout") {
  process.on("uncaughtException", () => {});
  setInterval(() => {}, 1000);
} else if (mode === "quota") {
  process.stdout.write(`${JSON.stringify({ type: "turn.failed", error: { message: "usage limit reached" } })}\n`);
  process.exit(0);
} else if (mode === "tool") {
  process.stdout.write(`${JSON.stringify({ type: "item.started", item: { type: "command_execution" } })}\n`);
  process.exit(0);
} else if (mode === "tool-completed") {
  process.stdout.write(`${JSON.stringify({ type: "item.completed", item: { type: "command_execution", command: "echo unsafe" } })}\n`);
  process.exit(0);
} else if (mode === "unknown") {
  process.stdout.write(`${JSON.stringify({ type: "turn.failed", error: { message: "temporary provider failure" } })}\n`);
  process.exit(0);
} else if (mode === "incomplete") {
  process.stdout.write(`${JSON.stringify({ type: "item.completed", item: { type: "agent_message", text: '{"ok":true}' } })}\n`);
  process.exit(0);
} else {
  const events = [
    { type: "thread.started", thread_id: "stub-thread" },
    { type: "item.completed", item: { type: "agent_message", text: "{\"ok\":true,\"label\":\"禽肉贸易\"}" } },
    { type: "turn.completed", usage: { input_tokens: 17, output_tokens: 9, cached_input_tokens: 3, reasoning_output_tokens: 2 } },
  ];
  const bytes = Buffer.from(events.map((event) => JSON.stringify(event) + "\n").join(""));
  // Deliberately split a multibyte Chinese character across writes.
  const split = bytes.indexOf(Buffer.from("禽")) + 1;
  writeSync(1, bytes.subarray(0, split));
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 40);
  writeSync(1, bytes.subarray(split));
  process.exit(0);
}
