import { ENTITIES, IDENTITY_LEXICON } from "@aihot/industry/taxonomy";
import { TAG_GROUNDING_RULES } from "@aihot/industry/quality";
import { unmatchedQuantities } from "./quantities.ts";

export interface GroundingIssue { field: string; code: string; value: string }
export interface GroundingCheck { issues: GroundingIssue[]; rejected: boolean }

const identities = (text: string) => new Set(IDENTITY_LEXICON.filter(e => e.patterns.some(p => p.test(text))).map(e => e.id));

export function groundStructure<T extends { subjects: string[]; tags: string[]; fact: { title: string; subject?: string | null; action?: string | null; object?: string | null; conditions?: { text?: string; quote: string }[] } | null }>(structure: T, material: string) {
  const supported = identities(material), issues: GroundingIssue[] = [];
  const subjects = structure.subjects.filter(id => {
    if (supported.has(id)) return true;
    issues.push({ field: "subjects", code: "unsupported_entity", value: id });
    return false;
  });
  const tags = structure.tags.filter(tag => {
    const entity = Object.entries(ENTITIES).find(([, e]) => e.displayTag === tag);
    const rule = TAG_GROUNDING_RULES.find(r => r.remove.some(t => t === tag) && r.when.test(material) && !r.unless.test(material));
    const code = entity && !supported.has(entity[0]) ? "unsupported_entity" : rule?.reason;
    if (!code) return true;
    issues.push({ field: "tags", code, value: tag });
    return false;
  });
  let fact = structure.fact;
  if (fact) {
    for (const rule of TAG_GROUNDING_RULES) if (rule.when.test(material) && !rule.unless.test(material) && rule.claim.test([fact.title, fact.subject, fact.action, fact.object].filter(Boolean).join("\n"))) issues.push({ field: "fact", code: rule.reason, value: fact.title });
    for (const id of identities(fact.subject ?? "")) if (!supported.has(id)) issues.push({ field: "fact.subject", code: "unsupported_entity", value: id });
    for (const q of unmatchedQuantities([fact.title, fact.action, fact.object, ...fact.conditions?.map(c => c.text ?? c.quote) ?? []].filter(Boolean).join("\n"), material)) issues.push({ field: "fact", code: "unmatched_quantity", value: q.text });
    if (issues.some(i => i.field.startsWith("fact"))) fact = null;
  }
  return { ...structure, subjects, tags, fact, grounding: { issues, rejected: structure.fact !== null && fact === null } };
}

export function groundCopy(copy: { titleZh: string; summaryZh: string; reasonZh?: string | null }, material: string): GroundingCheck {
  const issues: GroundingIssue[] = [];
  for (const field of ["titleZh", "summaryZh", "reasonZh"] as const) {
    for (const q of unmatchedQuantities(copy[field] ?? "", material)) issues.push({ field, code: "unmatched_quantity", value: q.text });
    if (field !== "reasonZh") for (const rule of TAG_GROUNDING_RULES) if (rule.when.test(material) && !rule.unless.test(material) && rule.claim.test(copy[field])) issues.push({ field, code: rule.reason, value: copy[field] });
  }
  return { issues, rejected: issues.length > 0 };
}
