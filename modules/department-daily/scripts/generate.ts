// Local composition and file export only. No collection, model execution, worker or outbound delivery.
import { access, mkdir, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { parseArgs } from "node:util";
import { beijingAt, isValidDate } from "@aihot/contracts/time";
import { EDITION_TIMES } from "@aihot/site";
import { renderDaily } from "../render.ts";

const usage = "npm run daily:generate -- --date YYYY-MM-DD [--out DIRECTORY] [--sample]";
const { values } = parseArgs({ options: { date: { type: "string" }, out: { type: "string" }, sample: { type: "boolean" }, help: { type: "boolean" } } });
if (values.help) { console.log(usage); process.exit(0); }
const date = values.date;
if (!date || !isValidDate(date)) throw new Error(`A valid --date is required. ${usage}`);
if (beijingAt(date, EDITION_TIMES.daily).getTime() > Date.now()) throw new Error("The daily cutoff has not arrived; do not generate a partial issue");
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL must be explicitly configured");
const database = decodeURIComponent(new URL(process.env.DATABASE_URL).pathname.slice(1));
if (/_(test|ci)$/.test(database) && !values.sample) throw new Error("An isolated test database requires --sample");
const output = resolve(values.out ?? `.data/dailies/${date}`);
try {
  await access(output);
  throw new Error("Output already exists; use a new --out directory to preserve the earlier edition");
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
}

for (const key of ["COLLECT_ENABLED", "MODEL_CALLS_ENABLED", "FEISHU_CONTENT_PUSH_ENABLED", "FEISHU_INTERNAL_ENABLED", "INDEXNOW_SUBMIT_ENABLED"]) process.env[key] = "false";
const { composeDaily } = await import("@aihot/backend/reports/compose");
const { loadReport } = await import("@aihot/backend/publication/reports");
const { closeDb } = await import("@aihot/backend/db");
try {
  // No regeneration reason: an existing report is reused, never replaced by this command.
  await composeDaily(date);
  const report = await loadReport("daily", date);
  if (!report) throw new Error("No daily report is available after composition");
  const rendered = renderDaily(report, values.sample);
  await mkdir(dirname(output), { recursive: true });
  await mkdir(output);
  await writeFile(resolve(output, "daily.html"), rendered.html, { flag: "wx" });
  await writeFile(resolve(output, "daily.md"), rendered.markdown, { flag: "wx" });
  console.log(JSON.stringify({ date, sample: values.sample ?? false, html: resolve(output, "daily.html"), markdown: resolve(output, "daily.md") }, null, 2));
} finally { await closeDb(); }
