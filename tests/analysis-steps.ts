// Which step of the article analysis a model request is for, and a score that selects. Each step sends
// its own system prompt, rendered from the industry pack, and the thresholds come from the pack too: a
// test that recognises a request by its whole prompt and scores against the pack's threshold keeps
// working when a site rewrites the prompts and recalibrates the thresholds for its own industry.
import { SCORE_SYSTEM, STRUCTURE_SYSTEM, tierThreshold } from "@aihot/backend/editorial/analyze";
import { PREFILTER_SYSTEM, UNDERSTAND_SYSTEM } from "@aihot/backend/editorial/writing";

export type AnalysisStep = "prefilter" | "score" | "structure" | "understand" | "summarize";

const BY_SYSTEM = new Map<string, AnalysisStep>([
  [PREFILTER_SYSTEM, "prefilter"], [SCORE_SYSTEM, "score"], [STRUCTURE_SYSTEM, "structure"], [UNDERSTAND_SYSTEM, "understand"],
]);

/** The step of a chat request, from its body as the provider receives it; the title/summary prompt comes without a system message. */
export function analysisStep(body: string): AnalysisStep {
  const { messages } = JSON.parse(body) as { messages: Array<{ role: string; content: unknown }> };
  if (messages[0]?.role !== "system") return "summarize";
  const step = BY_SYSTEM.get(String(messages[0].content));
  if (!step) throw new Error(`not a request of the article analysis: ${String(messages[0].content).slice(0, 80)}`);
  return step;
}

/** Both score calls at the T1 threshold: material from a T1 source is selected, with this mean score. */
export const SELECTING_SCORE = tierThreshold("T1")!;

const SCORE_WEIGHTS = [30, 25, 20, 15, 10] as const;
const SCORE_VECTORS = new Map<number, { rel: number; impact: number; act: number; info: number; cred: number }>();
for (let rel = 0; rel <= 10; rel++) for (let impact = 0; impact <= 10; impact++)
  for (let act = 0; act <= 10; act++) for (let info = 0; info <= 10; info++)
    for (let cred = 0; cred <= 10; cred++) {
      const score = Math.floor((rel * SCORE_WEIGHTS[0] + impact * SCORE_WEIGHTS[1] + act * SCORE_WEIGHTS[2] + info * SCORE_WEIGHTS[3] + cred * SCORE_WEIGHTS[4]) / 10);
      if (!SCORE_VECTORS.has(score)) SCORE_VECTORS.set(score, { rel, impact, act, info, cred });
    }

/** Build a schema-valid score fixture whose dimensions deterministically produce the requested total. */
export function scoreAnswer(user: string, attentionScore: number) {
  const dimensions = SCORE_VECTORS.get(attentionScore);
  if (!dimensions) throw new Error(`no five-axis score vector for ${attentionScore}`);
  const body = user.match(/【完整正文】\n([\s\S]*)$/)?.[1]?.trim() ?? "";
  const evidence = body.slice(0, Math.min(body.length, 80)).trim();
  if (!evidence) throw new Error("score fixture has no original body evidence");
  return { itemType: "company_action", dimensions, noise: "none", evidence };
}

/** Same fixture builder for tests that receive the provider's serialized request. */
export function scoreAnswerFromRequest(body: string, attentionScore: number) {
  const request = JSON.parse(body) as { messages: Array<{ content: unknown }> };
  return scoreAnswer(String(request.messages.at(-1)?.content ?? ""), attentionScore);
}
