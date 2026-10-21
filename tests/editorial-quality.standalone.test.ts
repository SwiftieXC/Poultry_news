import assert from "node:assert/strict";
import { test } from "node:test";
import { ScoreSchema, evaluateScore } from "@aihot/backend/editorial/scoring";
import { extractQuantities, unmatchedQuantities } from "@aihot/backend/editorial/quantities";
import { groundCopy, groundStructure } from "@aihot/backend/editorial/grounding";
import { normalizeAnalysis, type AnalysisRun } from "@aihot/backend/editorial/analyze";

const judgment = {
  itemType: "industry_analysis" as const,
  dimensions: { rel: 10, impact: 8, act: 6, info: 4, cred: 2 },
  noise: "none" as const,
  evidence: "The cited source phrase.",
};

test("score schema requires current integer dimensions and rejects legacy or extra fields", () => {
  assert.equal(ScoreSchema.safeParse(judgment).success, true);
  assert.equal(ScoreSchema.safeParse({ attentionScore: 85 }).success, false);
  assert.equal(ScoreSchema.safeParse({ ...judgment, attentionScore: 85 }).success, false);
  assert.equal(ScoreSchema.safeParse({ ...judgment, extra: true }).success, false);
  assert.equal(ScoreSchema.safeParse({ ...judgment, dimensions: { ...judgment.dimensions, extra: 1 } }).success, false);
  for (const rel of [-1, 11, 1.5, Number.NaN]) {
    assert.equal(ScoreSchema.safeParse({ ...judgment, dimensions: { ...judgment.dimensions, rel } }).success, false, `rel=${rel}`);
  }
});

test("weighted score uses the existing five axis weights and each noise cap", () => {
  const result = evaluateScore(judgment, "The cited source phrase.");
  assert.equal(result.weighted, 70);
  assert.equal(result.attentionScore, 70);
  assert.equal(result.grounded, true);

  const recipe = evaluateScore({ ...judgment, noise: "recipe", dimensions: { rel: 10, impact: 10, act: 10, info: 10, cred: 10 } }, "The cited source phrase.");
  const promotion = evaluateScore({ ...judgment, noise: "promotion", dimensions: { rel: 10, impact: 10, act: 10, info: 10, cred: 10 } }, "The cited source phrase.");
  const unverified = evaluateScore({ ...judgment, noise: "unverified", dimensions: { rel: 10, impact: 10, act: 10, info: 10, cred: 10 } }, "The cited source phrase.");
  const insufficient = evaluateScore({ ...judgment, noise: "insufficient", dimensions: { rel: 10, impact: 10, act: 10, info: 10, cred: 10 } }, "The cited source phrase.");
  const roundup = evaluateScore({ ...judgment, noise: "roundup", dimensions: { rel: 10, impact: 10, act: 10, info: 10, cred: 10 } }, "The cited source phrase.");
  assert.equal(recipe.cap, 10);
  assert.equal(recipe.attentionScore, 10);
  assert.equal(promotion.dimensions.act, 2);
  assert.equal(promotion.dimensions.info, 3);
  assert.equal(promotion.cap, 35);
  assert.equal(promotion.attentionScore, 35);
  assert.equal(unverified.cap, 30);
  assert.equal(unverified.attentionScore, 30);
  assert.equal(insufficient.cap, 30);
  assert.equal(insufficient.attentionScore, 30);
  assert.equal(roundup.dimensions.info, 3);
  assert.equal(roundup.cap, 100);
  assert.equal(roundup.attentionScore, 89);
});

test("missing source evidence is ungrounded and receives the insufficient ceiling", () => {
  const result = evaluateScore(judgment, "A different source sentence.");
  assert.equal(result.evidence, null);
  assert.equal(result.grounded, false);
  assert.equal(result.cap, 30);
  assert.equal(result.attentionScore, 30);
});

test("short or punctuation-only evidence cannot remove the insufficient ceiling", () => {
  for (const evidence of ["a", "A short", ".................", "材料仅有短句"]) {
    const result = evaluateScore({ ...judgment, evidence }, evidence);
    assert.equal(result.grounded, false);
    assert.equal(result.attentionScore, 30);
    assert.equal(result.rawEvidence, evidence);
  }
  const evidence = "这是一句含有十二个以上汉字的连续原文依据";
  assert.equal(evaluateScore({ ...judgment, evidence }, evidence).grounded, true);
  assert.equal(evaluateScore(judgment, "The cited\nsource phrase.").grounded, true);
  assert.equal(evaluateScore(judgment, ["The cited", "source phrase."]).grounded, false, "a quote must not join separate material fields");
});

test("entity grounding removes unsupported identities and matching entity tags without inventing Conab", () => {
  const material = "農林水産省（MAFF）と動物検疫所（AQS）が公表した資料。";
  const structure = {
    category: "biosecurity_risk",
    tags: ["MAFF", "AQS", "MHLW", "农业农村部"],
    subjects: ["maff", "aqs", "mhlw", "mara"],
    scope: "single",
    fact: { title: "检查公告", subject: "Conab", action: "发布资料", object: "资料" },
  };
  const result = groundStructure(structure, material);
  assert.deepEqual(result.subjects, ["maff", "aqs"]);
  assert.deepEqual(result.tags, ["MAFF", "AQS"]);
  assert.equal(result.fact?.subject, "Conab");
  assert.equal(result.grounding.rejected, false);
  assert.ok(result.grounding.issues.some(issue => issue.value === "mhlw"));
  assert.ok(result.grounding.issues.some(issue => issue.value === "MHLW"));
});

test("egg-only material removes meat tags while an explicit mixed egg and poultry article keeps them", () => {
  const base = { category: "trade_flow", subjects: [], scope: "single", fact: null };
  const tags = ["进出口数据", "鸡蛋", "禽肉", "鸡肉", "冷冻禽肉"];
  const eggOnly = groundStructure({ ...base, tags }, "As exportações brasileiras de ovos totalizaram 2,686 toneladas.");
  assert.deepEqual(eggOnly.tags, ["进出口数据", "鸡蛋"]);
  const mixed = groundStructure({ ...base, tags }, "As exportações de ovos e carne de frango foram divulgadas.");
  assert.deepEqual(mixed.tags, tags);
  assert.deepEqual(groundStructure({ ...base, tags }, "Food prices include eggs and poultry.").tags, tags);
  assert.deepEqual(groundStructure({ ...base, tags }, "A associação representa aves e ovos.").tags, tags);
});

test("Newcastle is not relabeled as avian influenza", () => {
  const base = { category: "biosecurity_risk", subjects: [], scope: "single", fact: null };
  const tags = ["疫情与风险", "新城疫", "禽流感"];
  const newcastle = groundStructure({ ...base, tags }, "Ocorrência de Doença de Newcastle no Brasil.");
  assert.deepEqual(newcastle.tags, ["疫情与风险", "新城疫"]);
  const both = groundStructure({ ...base, tags }, "Newcastle virus and avian influenza were detected.");
  assert.deepEqual(both.tags, tags);
});

test("Portuguese decimal and scale expressions canonicalize weight and currency values", () => {
  assert.deepEqual(extractQuantities("2,686 mil toneladas; US$ 5,866 milhões"), [
    { dimension: "tonnes", value: "2686", text: "2,686 mil toneladas" },
    { dimension: "USD", value: "5866000", text: "US$ 5,866 milhões" },
  ]);
  assert.deepEqual(extractQuantities("16,3 milhões toneladas"), [
    { dimension: "tonnes", value: "16300000", text: "16,3 milhões toneladas" },
  ]);
  assert.deepEqual(extractQuantities("0,125 mil toneladas; 25.9 kg"), [
    { dimension: "tonnes", value: "125", text: "0,125 mil toneladas" },
    { dimension: "tonnes", value: "0.0259", text: "25.9 kg" },
  ]);
  assert.deepEqual(extractQuantities("1.230,045 toneladas"), [
    { dimension: "tonnes", value: "1230.045", text: "1.230,045 toneladas" },
  ]);
  assert.deepEqual(extractQuantities("1,230.045 tonnes"), [
    { dimension: "tonnes", value: "1230.045", text: "1,230.045 tonnes" },
  ]);
});

test("quantity grounding rejects wrong thousand tonnes, money scale, and currency", () => {
  const source = "Ovos totalizaram 2,686 mil toneladas; a receita foi US$ 5,866 milhões.";
  assert.deepEqual(unmatchedQuantities("2686吨; 586.6万美元", source), []);
  assert.deepEqual(unmatchedQuantities("2,686千吨", source).map(q => [q.dimension, q.value]), [["tonnes", "2686000"]]);
  assert.deepEqual(unmatchedQuantities("5,866万美元", source).map(q => [q.dimension, q.value]), [["USD", "58660000"]]);
  assert.deepEqual(unmatchedQuantities("R$ 5,866 milhões", source).map(q => q.dimension), ["BRL"]);
  assert.deepEqual(unmatchedQuantities("1630万吨", "16,3 milhões toneladas"), []);
});

test("structure grounding clears a fact with unsupported quantities but retains its other fields", () => {
  const structure = {
    category: "trade_flow",
    tags: ["进出口数据", "巴西"],
    subjects: ["abpa"],
    scope: "single",
    fact: {
      title: "巴西鸡蛋出口统计",
      subject: "ABPA",
      action: "发布出口统计",
      object: "出口量为2,686千吨；出口额为5,866万美元",
    },
  };
  const result = groundStructure(structure, "ABPA reported 2,686 mil toneladas and US$ 5,866 milhões.");
  assert.equal(result.fact, null);
  assert.deepEqual(result.subjects, ["abpa"]);
  assert.deepEqual(result.tags, structure.tags);
  assert.equal(result.category, structure.category);
  assert.equal(result.grounding.rejected, true);
  assert.ok(result.grounding.issues.some(issue => issue.code === "unmatched_quantity"));
  const wrongCondition = groundStructure({ ...structure, fact: { title: "出口统计", subject: "ABPA", conditions: [{ text: "规模为2686万吨", quote: "2,686 mil toneladas" }] } }, "ABPA reported 2,686 mil toneladas.");
  assert.equal(wrongCondition.fact, null, "condition paraphrases cannot introduce an unsupported quantity");
});

test("copy grounding rejects unsupported quantities", () => {
  const result = groundCopy({ titleZh: "鸡蛋出口", summaryZh: "出口量2,686千吨，收入5,866万美元", reasonZh: null }, "2,686 mil toneladas and US$ 5,866 milhões");
  assert.equal(result.rejected, true);
  assert.equal(result.issues.length, 2);
});

test("normalizeAnalysis does not select a record with a quantity-rejected copy and clears Chinese copy", () => {
  const rejectedCopy = groundCopy({ titleZh: "鸡蛋出口", summaryZh: "出口量2,686千吨", reasonZh: "收入5,866万美元" }, "2,686 mil toneladas and US$ 5,866 milhões");
  const run = {
    prefilter: { label: "PASS", reason: "", model: "fixture", receiptId: 1, reused: true },
    // Legacy score payload shape remains accepted by normalizeAnalysis; new scoring parsing is tested above.
    scores: { model: "fixture", threshold: 60, values: [90, 90], receiptIds: [2, 3], reused: true },
    writing: { kind: "understand", model: "fixture", titleZh: "鸡蛋出口", summaryZh: "出口量2,686千吨", reasonZh: "收入5,866万美元", grounding: rejectedCopy, receiptIds: [4], reused: true },
    structure: { category: "trade_flow", tags: ["进出口数据"], subjects: [], scope: "single", fact: null, model: "fixture", receiptId: 5, reused: true },
  } as unknown as AnalysisRun;
  const result = normalizeAnalysis(run);
  assert.equal(result.selected, false);
  assert.equal(result.titleZh, "");
  assert.equal(result.summaryZh, "");
  assert.equal(result.reasonZh, null);
});

test("quantity scanning leaves URL and code tokens alone; unit-price and separator cases stay explicit", () => {
  assert.deepEqual(extractQuantities("https://example.test/items/250kg `const pack = \"25kg\"`"), []);
  // A per-kilogram unit price is not parsed as a shipment total.
  assert.deepEqual(extractQuantities("US$ 5.99/kg"), []);
  // These locale-specific forms are distinct: decimal comma in Portuguese, grouping comma in English.
  assert.deepEqual(extractQuantities("0,5 toneladas").map(q => q.value), ["0.5"]);
  assert.deepEqual(extractQuantities("0.5 tonnes").map(q => q.value), ["0.5"]);
  assert.deepEqual(extractQuantities("2,686吨").map(q => q.value), ["2686"]);
  assert.deepEqual(extractQuantities("16,3 milhões de toneladas").map(q => q.value), ["16300000"]);
  assert.deepEqual(unmatchedQuantities("16万吨", "160,000 metric tons"), []);
  assert.deepEqual(unmatchedQuantities("22.6亿日元", "香港22.6億円"), []);
  assert.equal(extractQuantities("25,9 kg")[0]?.value, null, "ambiguous universal units require review");
  assert.equal(unmatchedQuantities("25,9 kg", "25,9 kg").length, 1, "an unparsed phrase is not silently verified");
  assert.deepEqual(extractQuantities("1,234 units"), []);
});
