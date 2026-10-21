import assert from "node:assert/strict";
import { test } from "node:test";
import { spawnSync } from "node:child_process";
import type { ReportCitation, ReportDetail } from "@aihot/contracts/site";
import { renderDaily } from "../render.ts";

function item(overrides: Partial<ReportCitation> = {}): ReportCitation {
  return { itemId: "report-1", title: "巴西鸡肉出口 500.3 千吨", summary: "9 月出口 500.3 千吨。业务含义：供应增长。今日值得跟进：核对产品口径。", sourceName: "ABPA", sourceUrl: "https://example.org/article", sourceIconUrl: null, firstParty: true, publishedAt: "2026-10-07T12:08:35Z", available: true, ...overrides };
}

function daily(overrides: Partial<ReportDetail> = {}): ReportDetail {
  return { kind: "daily", key: "2026-10-08", issueNumber: 1, title: "日报", generatedAt: "2026-10-11T14:09:27Z", lead: null, leadItemId: null, overview: null, highlights: [], sections: [{ label: "贸易变化", summary: null, items: [item()] }], flashes: [], cover: null, metrics: {}, readingMinutes: 1, prev: null, next: null, ...overrides };
}

test("local daily retains units, evidence, action and Beijing cutoff without duplicating the lead", () => {
  const { html, markdown } = renderDaily(daily(), true);
  for (const output of [html, markdown]) {
    assert.match(output, /50\.03 万吨/);
    assert.doesNotMatch(output, /千吨/);
    assert.doesNotMatch(output, /500\.3 万吨/);
    assert.match(output, /业务含义：供应增长/);
    assert.match(output, /今日值得跟进：核对产品口径/);
    assert.match(output, /2026-10-07 08:00 至 2026-10-08 08:00/);
    assert.match(output, /2026-10-07 20:08/);
    assert.match(output, /历史回放样刊/);
    assert.match(output, /https:\/\/example.org\/article/);
  }
  assert.equal((html.match(/今日值得跟进：/g) ?? []).length, 1);
  assert.doesNotMatch(html, /<script|<img|<iframe/i);
});

test("withdrawn lead and related citations cannot leak titles, summaries or original URLs", () => {
  const withdrawn = item({ available: false, title: "removed-title", summary: "removed-secret", sourceUrl: "https://removed.example/" });
  const report = daily({ lead: { title: "removed-title", leadParagraph: "removed-secret" }, sections: [{ label: "政策", summary: null, items: [withdrawn, item({ related: [withdrawn] })] }] });
  const output = renderDaily(report);
  for (const text of [output.html, output.markdown]) {
    assert.match(text, /内容已撤回/);
    assert.doesNotMatch(text, /removed-title|removed-secret|removed\.example/);
  }
});

test("all markets and flashes appear in one continuously numbered daily without section headings", () => {
  const report = daily({ sections: [
    { label: "日本", summary: null, items: [item({ title: "日本渠道交流" })] },
    { label: "巴西", summary: null, items: [item({ title: "巴西出口数据" })] },
  ], flashes: [item({ title: "沙特进口动态" })] });
  const output = renderDaily(report);
  assert.equal((output.html.match(/<article>/g) ?? []).length, 3);
  assert.doesNotMatch(output.html, /<h2>/);
  assert.doesNotMatch(output.markdown, /^## /m);
  for (const text of [output.html, output.markdown]) {
    assert.match(text, /1\. 日本渠道交流/);
    assert.match(text, /2\. 巴西出口数据/);
    assert.match(text, /3\. 沙特进口动态/);
  }
});

test("source text and URLs cannot inject HTML, scripts or Markdown structure", () => {
  const output = renderDaily(daily({ sections: [{ label: "<script>bad</script>", summary: null, items: [item({ title: '<img src=x onerror="bad()">', summary: "<script>bad()</script>\n# forged", sourceUrl: "javascript:bad()", related: [item({ sourceUrl: "https://user:secret@example.org/", title: "credential-link" })] })] }] }));
  assert.doesNotMatch(output.html, /<script>|<img|javascript:|user:secret/);
  assert.match(output.html, /&lt;script&gt;/);
  assert.doesNotMatch(output.markdown, /\n# forged|javascript:|user:secret/);
  assert.match(output.markdown, /\\# forged/);
});

test("a quiet issue does not claim a quiet market; a weekly cannot masquerade as a daily", () => {
  const output = renderDaily(daily({ sections: [] }), true);
  assert.match(output.html, /本期无入选条目/);
  assert.match(output.markdown, /不代表市场没有变化或风险/);
  assert.throws(() => renderDaily(daily({ kind: "weekly" })), /Only daily/);
});

test("CLI rejects invalid dates, premature cutoffs and unlabelled isolated databases before connecting", () => {
  const run = (args: string[]) => spawnSync(process.execPath, ["modules/department-daily/scripts/generate.ts", ...args], { encoding: "utf8", env: { ...process.env, DATABASE_URL: "postgres://unreachable@127.0.0.1:1/daily_test" } });
  for (const date of ["2026-02-30", "../2026-10-08"]) {
    const result = run(["--date", date]);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /valid --date/);
  }
  assert.match(run(["--date", "2099-10-08", "--sample"]).stderr, /cutoff has not arrived/);
  assert.match(run(["--date", "2026-10-08"]).stderr, /requires --sample/);
});
