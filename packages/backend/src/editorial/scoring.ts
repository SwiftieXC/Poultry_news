import { z } from "zod";
import { ITEM_TYPES } from "@aihot/industry/taxonomy";
import { SELECTION } from "@aihot/industry/selection";
import { collapseWhitespace } from "../lib/text.ts";

const dimension = z.number().int().min(0).max(10);
export const ScoreSchema = z.object({
  itemType: z.enum(ITEM_TYPES),
  dimensions: z.object({ rel: dimension, impact: dimension, act: dimension, info: dimension, cred: dimension }).strict(),
  noise: z.enum(["none", "recipe", "promotion", "unverified", "insufficient", "roundup"]),
  evidence: z.string().trim().min(1).max(600).nullable(),
}).strict();

export type ScoreJudgment = ReturnType<typeof evaluateScore>;

/** The model supplies judgments; arithmetic and existing editorial ceilings belong to code. */
export function evaluateScore(data: z.infer<typeof ScoreSchema>, material: string | readonly string[]) {
  const dimensions = { ...data.dimensions };
  if (data.noise === "promotion") dimensions.act = Math.min(dimensions.act, 2);
  if (data.noise === "promotion" || data.noise === "roundup") dimensions.info = Math.min(dimensions.info, 3);
  const quote = collapseWhitespace(data.evidence ?? "");
  const sources = typeof material === "string" ? [material] : material;
  const evidence = (quote.match(/[\p{L}\p{N}]/gu)?.length ?? 0) >= 12 && sources.some(text => collapseWhitespace(text).includes(quote)) ? data.evidence : null;
  const weighted = Math.floor(Object.entries(SELECTION.scoring.weights).reduce((sum, [key, weight]) => sum + dimensions[key as keyof typeof dimensions] * weight, 0) / 10);
  const cap = Math.min(SELECTION.scoring.caps[data.noise], evidence ? 100 : SELECTION.scoring.caps.insufficient);
  return { ...data, dimensions, evidence, rawEvidence: data.evidence, rawDimensions: data.dimensions, weighted, cap, attentionScore: Math.min(weighted, cap), grounded: evidence !== null };
}
