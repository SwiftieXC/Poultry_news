// Poultry trade vocabulary. Category keys and entity ids are stable public identities.
export const CATEGORIES = [
  {"key": "regulation_access", "label": "政策与准入", "section": "政策与准入", "guide": "准入、工厂注册、卫生证书、检疫、Halal、关税、禁运和恢复准入。官方限制公告优先归本类；单纯发现疫情归疫情与风险。"},
  {"key": "trade_flow", "label": "进出口数据", "section": "进出口数据", "guide": "有来源和统计期的进出口量、金额、份额与流向变化。市场预测不当成实测贸易，报价不当成进出口量。"},
  {"key": "market_demand", "label": "市场与需求", "section": "市场与需求", "guide": "消费、产品规格、渠道需求和市场规模的证据。具体买家采购动作归客户与渠道；单店菜品上新不收。"},
  {"key": "competitor", "label": "企业与竞争", "section": "企业与竞争", "guide": "企业出口、扩产、投资、新工厂、新产品、并购与合作。核心为企业动作；具体采购归客户与渠道，宏观供应归供给与价格。"},
  {"key": "buyer_channel", "label": "客户与渠道", "section": "客户与渠道", "guide": "进口商、经销商、冷链、零售、餐饮集团的采购、招标、供应商调整及渠道动作。参展和企业目录不等于采购。"},
  {"key": "supply_price", "label": "供给与价格", "section": "供给与价格", "guide": "巴西、泰国等产量、库存、供应量、报价与成本变化。标清币种、单位、贸易条件与市场；不把不同价格口径直接比较。"},
  {"key": "biosecurity_risk", "label": "疫情与风险", "section": "疫情与风险", "guide": "禽流感、食品召回、残留、食品安全和物流中断。疫情不自动等于禁运；已有进口限制公告按政策与准入分类。"}
] as const satisfies ReadonlyArray<{ key: string; label: string; feedLabel?: string; section: string; guide: string; commentary?: true }>;

// No launch counter: market access is too conditional to count as an unconditional release.
export const RELEASE: { category: string; tag: string; unit: string } | null = null;
export const PLAIN_TERMS: readonly string[] = ["hs", "halal", "haccp", "sps", "tbt", "mena", "cif", "fob", "禽肉", "鸡肉", "进口", "出口"];
export const ITEM_TYPES = ["regulation", "official_data", "company_action", "buyer_signal", "market_signal", "disease_alert", "industry_analysis", "general_news"] as const;
export const CATEGORY_TAGS = ["政策与准入", "进出口数据", "市场与需求", "企业与竞争", "客户与渠道", "供给与价格", "疫情与风险", "其他"] as const;
export const TOPIC_TAGS = ["中国", "日本", "沙特阿拉伯", "阿联酋", "埃及", "巴西", "泰国", "全球", "禽肉", "鸡肉", "鸭肉", "生鲜禽肉", "冷冻禽肉", "分割品", "熟制禽肉", "深加工禽肉", "调理品", "鸡胸", "鸡腿", "鸡翅", "整鸡", "副产品", "新增准入", "取消准入", "恢复准入", "工厂注册", "新规", "标准修改", "检疫变化", "Halal", "HACCP", "进口增长", "进口下降", "出口增长", "出口下降", "价格上涨", "价格下降", "成本上涨", "扩产", "减产", "供应短缺", "库存增加", "新工厂", "新产品", "投资", "并购", "合作", "采购", "招标", "供应商调整", "禽流感", "禁运", "召回", "食品安全", "供应链中断", "市场缺口", "竞争国受限", "需求增长", "供应替代", "潜在商机", "风险信号"] as const;
export const ENTITY_TAGS = ["圣农发展", "凤祥股份", "春雪食品", "禾丰股份", "仙坛股份", "BRF", "JBS", "Aurora", "CP Foods", "Betagro", "GFPT", "Saha Farms", "中国海关", "农业农村部", "MAFF", "MHLW", "AQS", "SFDA", "MOCCAE", "Egypt GOVS", "ABPA", "MAPA", "TBPEA", "Thai DLD", "WOAH", "WTO"] as const;
export const TAG_SYNONYMS: Readonly<Record<string, string>> = {"沙特": "沙特阿拉伯", "UAE": "阿联酋", "uae": "阿联酋", "Saudi Arabia": "沙特阿拉伯", "清真": "Halal", "清真认证": "Halal", "熟制鸡肉": "熟制禽肉", "冷冻鸡肉": "冷冻禽肉", "恢复进口": "恢复准入", "商机": "潜在商机", "机会": "潜在商机", "风险": "风险信号", "CP Foods": "CP Foods", "CPF": "CP Foods", "Seara": "JBS", "政策": "政策与准入", "疫情": "疫情与风险"};
export const ENTITIES: Readonly<Record<string, { name: string; displayTag: string | null; aliases: readonly string[]; otherNames?: readonly string[] }>> = {"sunner": {"name": "圣农发展", "displayTag": "圣农发展", "aliases": ["圣农发展", "圣农", "Sunner"], "otherNames": ["圣农食品"]}, "fengxiang": {"name": "凤祥股份", "displayTag": "凤祥股份", "aliases": ["凤祥股份", "凤祥", "Fengxiang"]}, "spring-snow": {"name": "春雪食品", "displayTag": "春雪食品", "aliases": ["春雪食品", "春雪", "Spring Snow Food"]}, "wellhope": {"name": "禾丰股份", "displayTag": "禾丰股份", "aliases": ["禾丰股份", "禾丰", "Wellhope"]}, "xiantan": {"name": "仙坛股份", "displayTag": "仙坛股份", "aliases": ["仙坛股份", "仙坛", "Xiantan"]}, "brf": {"name": "BRF", "displayTag": "BRF", "aliases": ["BRF"], "otherNames": ["Sadia", "Perdigão"]}, "jbs": {"name": "JBS", "displayTag": "JBS", "aliases": ["JBS", "Seara"]}, "aurora": {"name": "Aurora", "displayTag": "Aurora", "aliases": ["Aurora Alimentos", "Aurora Coop"]}, "cpf": {"name": "CP Foods", "displayTag": "CP Foods", "aliases": ["CP Foods", "CPF", "Charoen Pokphand Foods"], "otherNames": ["正大食品"]}, "betagro": {"name": "Betagro", "displayTag": "Betagro", "aliases": ["Betagro", "倍高"]}, "gfpt": {"name": "GFPT", "displayTag": "GFPT", "aliases": ["GFPT"]}, "saha-farms": {"name": "Saha Farms", "displayTag": "Saha Farms", "aliases": ["Saha Farms"]}, "gacc": {"name": "中国海关", "displayTag": "中国海关", "aliases": ["中国海关", "海关总署", "GACC"]}, "mara": {"name": "农业农村部", "displayTag": "农业农村部", "aliases": ["农业农村部", "MARA"]}, "maff": {"name": "MAFF", "displayTag": "MAFF", "aliases": ["MAFF", "農林水産省", "日本农林水产省"]}, "mhlw": {"name": "MHLW", "displayTag": "MHLW", "aliases": ["MHLW", "厚生労働省", "日本厚生劳动省"]}, "aqs": {"name": "AQS", "displayTag": "AQS", "aliases": ["AQS", "動物検疫所", "日本动物检疫所"]}, "sfda": {"name": "SFDA", "displayTag": "SFDA", "aliases": ["SFDA", "Saudi Food and Drug Authority", "沙特食品药品管理局"]}, "moccae": {"name": "MOCCAE", "displayTag": "MOCCAE", "aliases": ["MOCCAE", "阿联酋气候变化与环境部"]}, "govs": {"name": "Egypt GOVS", "displayTag": "Egypt GOVS", "aliases": ["GOVS", "General Organization for Veterinary Services"]}, "abpa": {"name": "ABPA", "displayTag": "ABPA", "aliases": ["ABPA", "Associação Brasileira de Proteína Animal", "巴西动物蛋白协会"]}, "mapa": {"name": "MAPA", "displayTag": "MAPA", "aliases": ["MAPA", "Ministério da Agricultura e Pecuária", "巴西农业部"]}, "tbpea": {"name": "TBPEA", "displayTag": "TBPEA", "aliases": ["TBPEA", "Thai Broiler Processing Exporters Association"]}, "dld": {"name": "Thai DLD", "displayTag": "Thai DLD", "aliases": ["DLD", "Department of Livestock Development", "泰国畜牧发展厅"]}, "woah": {"name": "WOAH", "displayTag": "WOAH", "aliases": ["WOAH", "OIE", "世界动物卫生组织"], "otherNames": ["WAHIS"]}, "wto": {"name": "WTO", "displayTag": "WTO", "aliases": ["WTO", "世界贸易组织"], "otherNames": ["ePing"]}};
export const IDENTITY_LEXICON: ReadonlyArray<{ id: string; name: string; patterns: RegExp[] }> = [
  { id: "sunner", name: "圣农发展", patterns: [/圣农发展|圣农|\bSunner\b|圣农食品/i] },
  { id: "fengxiang", name: "凤祥股份", patterns: [/凤祥股份|凤祥|\bFengxiang\b/i] },
  { id: "spring-snow", name: "春雪食品", patterns: [/春雪食品|春雪|Spring\ Snow\ Food/i] },
  { id: "wellhope", name: "禾丰股份", patterns: [/禾丰股份|禾丰|\bWellhope\b/i] },
  { id: "xiantan", name: "仙坛股份", patterns: [/仙坛股份|仙坛|\bXiantan\b/i] },
  { id: "brf", name: "BRF", patterns: [/\bBRF\b|\bSadia\b|Perdigão/i] },
  { id: "jbs", name: "JBS", patterns: [/\bJBS\b|\bSeara\b/i] },
  { id: "aurora", name: "Aurora", patterns: [/Aurora\ Alimentos|Aurora\ Coop/i] },
  { id: "cpf", name: "CP Foods", patterns: [/CP\ Foods|\bCPF\b|Charoen\ Pokphand\ Foods|正大食品/i] },
  { id: "betagro", name: "Betagro", patterns: [/\bBetagro\b|倍高/i] },
  { id: "gfpt", name: "GFPT", patterns: [/\bGFPT\b/i] },
  { id: "saha-farms", name: "Saha Farms", patterns: [/Saha\ Farms/i] },
  { id: "gacc", name: "中国海关", patterns: [/中国海关|海关总署|\bGACC\b/i] },
  { id: "mara", name: "农业农村部", patterns: [/农业农村部|\bMARA\b/i] },
  { id: "maff", name: "MAFF", patterns: [/\bMAFF\b|農林水産省|日本农林水产省/i] },
  { id: "mhlw", name: "MHLW", patterns: [/\bMHLW\b|厚生労働省|日本厚生劳动省/i] },
  { id: "aqs", name: "AQS", patterns: [/\bAQS\b|動物検疫所|日本动物检疫所/i] },
  { id: "sfda", name: "SFDA", patterns: [/\bSFDA\b|Saudi\ Food\ and\ Drug\ Authority|沙特食品药品管理局/i] },
  { id: "moccae", name: "MOCCAE", patterns: [/\bMOCCAE\b|阿联酋气候变化与环境部/i] },
  { id: "govs", name: "Egypt GOVS", patterns: [/\bGOVS\b|General\ Organization\ for\ Veterinary\ Services/i] },
  { id: "abpa", name: "ABPA", patterns: [/\bABPA\b|Associação\ Brasileira\ de\ Proteína\ Animal|巴西动物蛋白协会/i] },
  { id: "mapa", name: "MAPA", patterns: [/\bMAPA\b|Ministério\ da\ Agricultura\ e\ Pecuária|巴西农业部/i] },
  { id: "tbpea", name: "TBPEA", patterns: [/\bTBPEA\b|Thai\ Broiler\ Processing\ Exporters\ Association/i] },
  { id: "dld", name: "Thai DLD", patterns: [/\bDLD\b|Department\ of\ Livestock\ Development|泰国畜牧发展厅/i] },
  { id: "woah", name: "WOAH", patterns: [/\bWOAH\b|\bOIE\b|世界动物卫生组织|\bWAHIS\b/i] },
  { id: "wto", name: "WTO", patterns: [/\bWTO\b|世界贸易组织|\bePing\b/i] }
];
export const PUBLISHER_DOMAINS: ReadonlyArray<{ entityId: string; domains: readonly string[] }> = [{"entityId":"brf","domains":["brf-global.com"]},{"entityId":"jbs","domains":["jbs.com.br"]},{"entityId": "gacc", "domains": ["customs.gov.cn"]}, {"entityId": "mara", "domains": ["moa.gov.cn"]}, {"entityId": "maff", "domains": ["maff.go.jp"]}, {"entityId": "mhlw", "domains": ["mhlw.go.jp"]}, {"entityId": "sfda", "domains": ["sfda.gov.sa"]}, {"entityId": "moccae", "domains": ["moccae.gov.ae"]}, {"entityId": "abpa", "domains": ["abpa-br.org"]}, {"entityId": "cpf", "domains": ["cpfworldwide.com"]}];
// AQS pages share maff.go.jp; do not assign the entire ministry domain to AQS.
export const IDENTITY_CONTEXT_ALIASES: ReadonlyArray<{ entityId: string; pattern: RegExp }> = [];
