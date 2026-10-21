import type { ReportCitation, ReportDetail } from "@aihot/contracts/site";
import { addDays, beijingDate, beijingTime } from "@aihot/contracts/time";
import { EDITION_TIMES, SITE } from "@aihot/site";
import { formatChineseCopy } from "@aihot/site/format";

function html(text: string): string {
  return text.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function markdown(text: string): string {
  return text.replace(/\r?\n/g, " ").replace(/([\\`*_{}\[\]()<>#!|])/g, "\\$1");
}

function sourceUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

function timestamp(value: string): string {
  return `${beijingDate(value)} ${beijingTime(value)}`;
}

function citation(item: ReportCitation, index: number): { html: string; markdown: string } {
  if (!item.available) return {
    html: `<article class="removed"><h3>${index}. 内容已撤回</h3><p>本条不再展示摘要和原文链接。</p></article>`,
    markdown: `### ${index}. 内容已撤回\n\n本条不再展示摘要和原文链接。`,
  };
  const title = formatChineseCopy(item.title);
  const summary = formatChineseCopy(item.summary ?? "暂无摘要，请核对原文。");
  const source = formatChineseCopy(item.sourceName);
  const url = sourceUrl(item.sourceUrl);
  const published = item.publishedAt ? ` · 原文发布 ${timestamp(item.publishedAt)}` : " · 原文发布时间待核对";
  const followUp = item.followUp ? ` · 跟进 ${item.followUp} 日报中的事件` : "";
  const paragraphs = summary.split(/(?=业务含义：|今日值得跟进：)/).filter(Boolean);
  const related = (item.related ?? []).filter(r => r.available).map(r => {
    const link = sourceUrl(r.sourceUrl);
    const label = formatChineseCopy(`${r.sourceName}：${r.title}`);
    return {
      html: `<li>${link ? `<a href="${html(link)}">${html(label)}</a>` : html(label)}</li>`,
      markdown: `- ${link ? `[${markdown(label)}](<${link.replace(/[<>]/g, c => encodeURIComponent(c))}>)` : markdown(label)}`,
    };
  });
  return {
    html: `<article><h3>${index}. ${html(title)}</h3><p class="source">${html(source + published + followUp)}</p>${paragraphs.map(p => `<p>${html(p)}</p>`).join("")}${url ? `<p><a href="${html(url)}">查看原文 ↗</a></p>` : ""}${related.length ? `<details><summary>相关报道</summary><ul>${related.map(r => r.html).join("")}</ul></details>` : ""}</article>`,
    markdown: `### ${index}. ${markdown(title)}\n\n${markdown(source + published + followUp)}\n\n${paragraphs.map(markdown).join("\n\n")}\n\n${url ? `[查看原文](<${url.replace(/[<>]/g, c => encodeURIComponent(c))}>)` : "原文链接不可用"}${related.length ? `\n\n相关报道：\n\n${related.map(r => r.markdown).join("\n")}` : ""}`,
  };
}

/** Uses the current publication DTO: withdrawn material never reappears from a raw report snapshot. */
export function renderDaily(report: ReportDetail, sample = false): { html: string; markdown: string } {
  if (report.kind !== "daily") throw new Error("Only daily reports can be exported");
  const title = `${SITE.name} · 部门日报`;
  const status = sample ? "历史回放样刊 · 待审阅" : "内部日报";
  const notice = sample
    ? "本期使用小批历史资料回放，仅供审阅格式与内容，不代表当日完整市场动态或当前政策状态。"
    : "本期覆盖已采集并完成筛选的资料；历史期号反映当时信息，政策与准入条件请核对原文。";
  const window = `${addDays(report.key, -1)} ${EDITION_TIMES.daily} 至 ${report.key} ${EDITION_TIMES.daily}（北京时间）`;
  const entries = [...report.sections.flatMap(s => s.items), ...report.flashes];
  const items = entries.map((item, index) => citation(item, index + 1));
  const available = entries.filter(i => i.available).length;
  const empty = items.length === 0 ? "本期采集并筛选的资料中，没有入选条目；这不代表市场没有变化或风险。" : null;
  const contents = items.map(i => i.html).join("")
    + (empty ? `<section class="empty"><h2>本期无入选条目</h2><p>${html(empty)}</p></section>` : "");
  const md = [
    `# ${title}`, `${report.key} · ${status}`, `> ${notice}`, `资料窗口：${window}`,
    `可读条目：${available} 条 · 生成时间：${timestamp(report.generatedAt)}（北京时间）`,
    ...items.map(i => i.markdown),
    ...(empty ? [`## 本期无入选条目\n\n${empty}`] : []),
  ].join("\n\n") + "\n";
  return { markdown: md, html: `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'">
<title>${html(title)} · ${report.key}</title><style>
:root{color-scheme:light}*{box-sizing:border-box}body{margin:0;background:#f3f1eb;color:#20332e;font-family:"Microsoft YaHei","PingFang SC",sans-serif;line-height:1.85}main{max-width:860px;margin:40px auto;padding:44px 54px;background:#fffdf8;border-top:6px solid #215e49;box-shadow:0 8px 36px #20332e0b}.kicker{font-size:12px;letter-spacing:.12em;color:#58776b}h1{font-size:32px;line-height:1.35;margin:10px 0 16px}h2{font-size:18px;padding:8px 0;border-bottom:1px solid #d4ddd5;margin-top:32px}h3{font-size:21px;line-height:1.55;margin:0 0 8px}p{margin:10px 0}.meta,.source,footer{font-size:12px;color:#64776d}.notice{border-left:3px solid #a4b696;background:#edf1e8;padding:12px 16px;font-size:13px;margin:24px 0}article{padding:16px 0 24px;border-bottom:1px solid #e4e8e0}article:last-child{border:0}a{color:#21654d;text-underline-offset:4px;overflow-wrap:anywhere}.removed{color:#718077}details{font-size:13px}footer{border-top:1px solid #d4ddd5;margin-top:30px;padding-top:18px}body,p,h3,li{overflow-wrap:anywhere}@media(max-width:600px){main{margin:0;padding:28px 22px;box-shadow:none;min-height:100vh}h1{font-size:27px}h3{font-size:19px}}@media print{body{background:white}main{margin:0;max-width:none;padding:12px;box-shadow:none}article{break-inside:avoid}details{display:none}}
</style></head><body><main><header><div class="kicker">${html(status)}</div><h1>${html(title)}</h1><div>${report.key}</div><p class="meta">资料窗口：${html(window)}<br>可读条目 ${available} 条 · 生成于 ${timestamp(report.generatedAt)}（北京时间）</p></header><p class="notice">${html(notice)}</p>${contents}<footer>原文链接保留在每条情报中，业务判断以原文范围、产品和日期条件为依据。</footer></main></body></html>\n` };
}
