// Narrow, evidence-led exclusions. Mixed meat/egg articles keep their meat tags.
export const TAG_GROUNDING_RULES = [
  {
    when: /\bovos?\b|\beggs?\b|鸡蛋|蛋品|鶏卵/i,
    unless: /\bpoultry\b|\baves\b|\b(?:chicken|duck)\s+(?:meat|products?)\b|\bbroiler\b|carne\s+(?:de\s+)?(?:frango|aves|av[ií]cola)|禽肉|鸡肉|鸭肉|鶏肉|家きん肉/i,
    remove: ["禽肉", "鸡肉", "鸭肉", "生鲜禽肉", "冷冻禽肉", "分割品", "熟制禽肉", "深加工禽肉", "鸡胸", "鸡腿", "鸡翅", "整鸡"],
    claim: /禽肉|鸡肉|鸭肉|chicken meat|poultry meat|carne de frango/i,
    reason: "egg_only_material",
  },
  {
    when: /Newcastle|新城疫/i,
    unless: /avian influenza|HPAI|gripe avi[aá]ria|禽流感|鳥インフルエンザ/i,
    remove: ["禽流感"],
    claim: /禽流感|avian influenza|HPAI|gripe avi[aá]ria/i,
    reason: "different_disease",
  },
] as const;
