# 禽肉国际贸易情报系统 V1 Review

Review 对象：AIHOT 上游 `8e34e05feb161cb5838e592ee22715f791c7f814`。本文件在行业实现改动之前形成，按实际源码核对此前讨论，不把旧对话中的引用当成已核实依据。

## 结论

后续实施授权（2026-10-21，T01校验）：主人确认继续处理评分依据、主体与数值一致性。根据两轮已保存错例，增加评分的内容类型、五轴整数、噪声类型与连续原文依据，由后端按既有权重及上限计算总分；双评分、门槛和模型路线保持。依据须连续命中发送给评分器的材料，且至少含12个字母、数字或汉字，过短或未命中时沿用材料不足上限30；该长度检查不代表语义已核验。主体／产品规则放行业包，后端执行原文命中和金额／重量等值核对；删除无依据的ID或标签，拒绝错误事实，错误文案留内部审查。明细写入现有analyses.output与模型回执，不新增数据库列或迁移。先用本地替身与冻结旧输出回放验证；现有真实请求累计297／300，本轮不扩充请求预算。此处为有错例证据的通用编辑校验例外，业务分类仍由行业包维护。

后续实施授权（2026-10-21）：选择性移植 AIHOT 上游的三类改进：普通文章缺少材料时等待补齐、登录／注册页过滤；归组结果与付费回执原子写入、额度等待及补排队优先级；中英文搜索分词、正文词首匹配与相关度同分排序。保留禽贸词表与提示词、Codex CLI 传输及预算／unknown 语义、RGPD 精确过滤和中文展示层；本轮不引入数据库迁移、备用模型、内网信源配置或其他上游功能。实施及验收范围见 [上游合并边界](UPSTREAM_MERGE.md)。

后续实施更新（2026-10-21）：主人确认继续修订T01。最新人工口径将具体渠道经营、蛋品实际贸易数据、准入恢复纳入评价，车辆替换及小规模单店处置降作背景；身份、病种、绝对日期与简洁写作约束收紧，详细定义以 [当前业务词表规范](TAXONOMY_V1.md#维度与上限) 为准。50条原独立评测及原标签保持原样；本轮从已暴露样本中选24条作定向开发回归，不将回归结果重记为独立准确率。沿用原总预算300次，已用146次，后续尝试累计计数，不重置预算或门槛。旧30个提示词／配置版本已归档到 `.data/t01-remediation-20261021/baseline/`。

同日10:55历史快照：两轮开发对照后累计297／300次，质量仍未达标；V2五轴示例候选已归档，当时提示词保留V1完整回归版本。随后按本页顶部授权实现评分明细、确定性算分及主体／产品／数值核对；原回归版本保留，新契约尚待真实模型验收。[历史修订结果](T01_REMEDIATION_20261021.md) · [当前实现](T01_GROUNDING_20261021.md)。

后续实施更新（2026-10-12）：首批扩源加入凤祥、日冷食品与 Almarai，其后补入 MHLW 进口监管 HTML、禾丰英文官网新闻及 Poultry Times 行业媒体 RSS，配置总数 9。凤祥真实页面年月日相邻显示为 YYYYMMDD，原日期解析失败；先复现后仅补完整八位日历字段的通用解析，非法日期、时区及嵌入编号回归通过。Almarai 使用既有详情元数据补日期，禾丰与媒体复用既有列表／RSS／去噪／首次窗口，不新增机制或 schema；空正文、角色、采购与使用条件范围见 [信源状态](SOURCES_V1.md) 。当前 Core 例外包含下述历史修复、Codex 传输及日期解析；选材质量与持续运行仍未验收。

后续实施更新（2026-10-11）：小批真实历史日报闭环发现 Cookie 弹窗替代正文，在失败复现、3 个回归与两个真实页面复验后最小修改 content/extract.ts，仅排除明确的 WP RGPD 弹窗容器。数量级与品种范围仍在行业写作提示词中收紧；不新增数据结构、门槛或归组机制，质量仍待人工金标。当前 Core 的例外还包含下文 10 月 8 日授权的 Codex 传输，不能用初始“不改 Core”描述现状。见 [小批闭环](REAL_LOOP_V1.md) 。

后续实施更新（2026-10-07）：网络验收发现上游 DNS 双栈查询缺陷，已在有失败复现及安全回归证据的前提下，最小修改 egress-proxy.ts 的结果汇总。没有扩大数据结构或架构；“不改 Core”是初始行业配置范围，当前例外仅为这处通用传输修复，见 [网络验收](NETWORK_INGEST_V1.md) 。

没有阻止 V1 实施的重大架构冲突。保留“禽肉国际贸易竞争情报系统”定位，采用 `site/` 品牌、`industry/` 词表与提示词定制，不新增数据库字段、不改迁移、不改采集、评分、公开读取层。V1 是有证据的事件索引与跟进辅助，尚不是买家 CRM、准入合规判定系统或贸易数据仓库。

必须调整的三点：结构抽取标签最多 6 个，最终管线可能追加已核验主体标签，不可能把全部业务维度塞进单条标签；原生日报不调用模型，业务含义和今日跟进应先写入条目摘要；外部 ingest 只接收标题、URL、时间、作者和 raw，并不把任意 JSON 正文直接当可分析事实，派生情报必须有可读取的原文页面。

## 阅读与代码证据

- 完整阅读 README.md、docs/customize.md、docs/architecture.md、docs/selection.md、docs/sources.md；补读 docs/deploy.md 的运行方式。
- 检查 industry/taxonomy.ts、topics.json、sources.json、selection.ts、prompts/，site/site.ts、models.ts、brand/ 和 site/modules/ 三份注册表。
- 检查 packages/backend/src/editorial/analyze.ts、prompts.ts、vocabulary.ts，sources/ 各读取器和 config-keys.ts，ingest/items.ts，publication/，reports/compose.ts、edition.ts，以及 database/migrations/0001_core.sql、0002_events_reports.sql 和后续迁移目录。
- 当前定制指南：[上游 customize](https://github.com/KKKKhazix/AIHOT/blob/8e34e05feb161cb5838e592ee22715f791c7f814/docs/customize.md) 。架构：[上游 architecture](https://github.com/KKKKhazix/AIHOT/blob/8e34e05feb161cb5838e592ee22715f791c7f814/docs/architecture.md) 。评分：[上游 selection](https://github.com/KKKKhazix/AIHOT/blob/8e34e05feb161cb5838e592ee22715f791c7f814/docs/selection.md) 。

## 架构与数据流

信源 → sources/collect → articles 与 revisions → prefilter → 两次独立评分及 structure → 中文标题摘要 → facts / fact_articles / stories → publications → 网页、RSS、API、MCP 与 reports。

api、worker、web 是三个进程，PostgreSQL 与 pg-boss 承担持久化和任务。publications 是公开投影，不可直接向它写入绕过撤回、精选席位和全文许可。资料中的指令始终视为不可信数据；所有付费调用保留 receipts 与 budgets；打开网页不调模型。

articles 保存材料与发布时间；analyses 保存分类、tags、subjects、summary、reason、score 和原始输出；facts 保存主体、动作、对象、时间、条件，fact_articles 保存原文证据；stories 表达跨报道事件；publications 的 tags 已有 GIN 索引。旧迁移包含曾经的 AI 专属表，但运行时模块注册表均为空，不能为换行业删除历史迁移或表。

## 产品建议

| 项目 | 决策 | 理由与 V1 边界 |
|---|---|---|
| 7 个一级分类 | 保留 | 表达读者的决策任务，政策优先于风险新闻的背景；分类看当前动作，不能按发布机构归类 |
| 国家 | 调整 | 国家放 TOPIC_TAGS，由 field 主题引用；不是公司 entity，也不新建 topic group；field 对外显示“市场与产品” |
| 中国、日本、沙特、阿联酋、埃及 | 保留 | 中国为出口基准，日本偏准入与项目采购，MENA 偏进口商动作与采购；埃及先监测重点公告 |
| 巴西、泰国 | 保留 | 竞争供给国标签，与目标进口国可同时存在；不能从源所在国家推断贸易流向 |
| 产品维度 | 调整 | 种类、形态、部位是不同轴；优先保留最具体品类，避免“禽肉＋鸡肉＋鸡胸”占掉所有标签；冷冻不等于生鲜，熟制不等于获批 |
| Signal Tags | 保留并收敛 | 当前事实有证据才标；“机会”与“风险”改为潜在商机、风险信号，不能把推断写成已成交、已禁运 |
| Entity | 保留 | 中国同行、国际竞争企业、机构用稳定 id；JBS 和 BRF 分开，Seara 作为 JBS 别名；别名防身份混淆 |
| 买家数据库 | V2 | V1 只记录公开采购动作，参展不等于采购，拒绝从展商名录推导买家需求或联系方式 |
| 8 个 Item Types | 保留 | 内容形态与分类正交，例如政策类公告与行业分析都可讨论准入；general_news 为低信息兜底而非新增首页分类 |
| 机会、风险数值分 | 删除 V1 设计 | 缺少标注与可验证定义，容易把模型自信包装成交易判断；现有 attentionScore 只是编辑筛选分 |
| 日报 | 调整 | 原生按规则取事件、最多 12 条正文＋10 条快讯、每源最多 2 条、记忆 7 期；通过摘要中的“业务含义／风险或机会／今日值得跟进”提供行动价值，不新增昂贵日报模型 |
| 独立跟进清单、市场交叉筛选 | V2 | V1 不承诺多标签 AND、时间窗与 HS 的任意组合查询；需先定义查询接口与报告结构 |

## 配置适配与核心边界

site/site.ts 管站名、行业词、MCP 前缀、页面与报告文案；industry/taxonomy.ts 管类别、标签、Entity 与身份防幻觉词典；topics.json 的 group 只能 company / field / genre；sources.json 是首次 seed 增量，删除文件配置不删除数据库已有源；prompts/ 管相关性、评分、事实、归组与写作。

此前提到的 industry/site.ts、industry/features.ts、leaderboard 和 codexResetMonitor 并不适用于当前版本。site/modules/index.ts、server.ts、web.ts 已为空，保持为空即可达到停用效果；没有必要发明 feature flag，或删除通用模块和数据库历史。

业务相关性30、影响程度25、可行动性20、信息价值15、可信度10由后端按五轴整数计算。保留类型权重表、噪声上限和安全边界，评分输出按2026-10-21授权改为类型／五轴／噪声／依据四字段；8种内容形态采用同一组权重。门槛仍T1 60、T1_5 65、T2 76，understandFloor 50，禽肉业务质量校准继续进行。

## 数据结构建议

V1 不增加 country、market、product、buyer、competitor 或机会风险评分列。国家与产品由 tags 表达，主体由 subjects / ENTITIES 表达，政策范围由 fact.object 与原文 conditions 表达，业务建议由 summary / reason 表达。category 首标签固定，余下最多 5 个优先依次选目标市场、原产国、具体产品形态、关键事件、实体；公司主体已由 subjects 表达，不必重复占标签。

局限：fact 不是通用数值事实表；tags 不能区分 reporter / partner 的方向；模型无法可靠维护工厂名单。若需求变成“同 HS、月份、报告国、伙伴国、流向、重量、金额的可比趋势”，V2 必须使用独立 dataset / ETL，不应继续靠标签或新闻摘要回答。跨市场准入审查需要工厂编号、产品范围、版本、生效／终止日期及原文名单快照，也应单独建模。

## 数据源路由

| 资料 | V1 路由 | V2／后续要求 |
|---|---|---|
| 有日期新闻与公告 | 实测 RSS / web_list / json_list | 每个源实测非导航条目、URL、日期、详情正文，不把首页 200 当接入成功 |
| 政府政策网页 | 有稳定列表则入采集；其余 disabled external | 条文版本与生效时间核对，不自动给法律结论 |
| 准入名单 | 先登记待接入 | crawler 快照与 diff，按工厂编号和产品范围产生有出处的派生情报 |
| Excel / CSV 月统计 | 先登记待接入 | 独立 ETL，保存原始文件、单位、币种、时间窗、HS 版本、修订与缺失值 |
| UN Comtrade、贸易统计 | structured dataset，V1 不采普通 item | reporter / partner / flow / period / HS / qty / value；保留分母、净重、修订，零值不能代替缺失 |
| 展商名录 | 独立候选企业池，V1 不采 item | 明确展商／采购商角色、去重与出处，不把参展当采购信号 |
| 企业官网／公告 | 有日期稳定入口可接；否则等待验证 | 采购、产能、出口等实质动作；营销口号不能等于可执行买家线索 |
| WAHIS 与 ePing | 先 external 路由登记 | 疫情不是进口禁令；SPS 通知不是已生效法律；保留对象、草案阶段与期限 |

P0 候选不是 P0 已接入。MHLW RSS 官方说明明确限制以订阅信息制作网站、邮件及再分发，因此该 feed 不启用，后续单独确认原网页使用条件；来源：[MHLW RSS](https://www.mhlw.go.jp/rss/) 。MAPA 官方订阅入口：[MAPA RSS](https://www.gov.br/agricultura/pt-br/rss) 。其余真实探测结果在 SOURCES_V1.md 记录。

## 成本与噪声

预筛宽召回，但明确 BLOCK 菜谱、家庭烹饪、单店菜品上新、营养科普、宠物、纯鸡蛋／饲料／育种营销及无贸易关联鸡肉趣闻。禽流感、检疫、Halal、买家采购、冷链／产能变化不能机械拦截；来源很权威但无禽肉业务关联同样应拦。

原文不足 UNKNOWN，评分上限 30；无证据传闻上限 30；普通促销与展会日程低分，不因官方来源加事件价值。生效禁令、取消准入等即使仅一手源公告也按业务价值评价，不依赖热点讨论数。

初始每源间隔 6 小时（上游自动调频后可能变为 15 至 60 分钟，不是预算上限）、首次回填 3 条，关闭全文再分发；优先稳定源，避免日更大量无关政府文件。没有 label 样本前不购买模型、不调生产阈值；预筛与简单翻译可用较廉模型，评分两次与跨语言条件抽取先测试可靠性，归组复核可换独立模型。费用上限依赖既有 budgets，不绕过回执。

## In Scope

- 本地克隆并记录 baseline、品牌、7 分类、8 类型、市场与产品主题、Entity 和 Signal Tags。
- 改写全部含 AI 行业假设的提示词，保留机器输出契约、安全和原文证据条件。
- 接入少量实测可解析的稳定源；其他候选登记状态和下一步，不做假接入。
- 独立配置测试、类型检查、前端构建与测试、可执行 smoke；运行条件不足时明确未验证项。
- 与官方评测脚本兼容的合成案例模板及真实人工标注指南；改造日报文案与条目业务写作。
- Windows 启动文档、上游合并边界、Git 工作区状态，保持 .env／密钥安全。

## Out of Scope

- 新数据库列／迁移、生产数据改动、付费模型调用、外部推送、公开部署、远端 Fork、提交或推送。
- 贸易数据库、工厂准入名单 diff、展商爬虫、买家 CRM、联系方式补全、自动外联、实时合规结论。
- 移除通用功能和历史迁移；凭感觉改阈值；宣称未经真实人工样本评测的质量或机会准确率。

## 实施与验收

2026-10-08 后续授权补充：用户选择 ChatGPT Plus 内的 gpt-6-luna，允许有上限的真实订阅试跑与接入。原 API-only 传输无法承接 CLI 登录，经 10 条真实资料试跑后新增独立 Codex provider，仍通过原预算／回执；不改 schema、评分门槛或 publication。阶段／产品／采购误标签在 industry prompts 修正。此补充不授权生产数据修改、公开发布或付费 API 回退；实际质量限制见 LUNA_PILOT_V1.md。

Review → baseline → site rebrand → taxonomy 与文档 → prompt layer → 源实测与配置 → smoke 与验证证据 → eval 模板 → 日报业务表达。主要修改限定 site/、industry/、docs/ 与项目规范；必要的行业回归测试放 tests/。若没有 PostgreSQL / Docker，不得把仅前端构建说成完整链路已跑通；后续在测试库与真实模型金标上补验。
