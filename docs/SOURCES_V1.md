# V1 信源状态

文中 `.data/` 路径指本地私有材料，不随仓库发布。

industry/sources.json 当前配置 10 个实测可解析入口；industry/source-candidates.json 是发现与状态清单，不参与 seed。各源的采集、使用范围和业务质量按下列实测记录核对。

## 2026-10-20 MEWA 限量接入

新增 `mewa-news`，从 [MEWA 英文新闻](https://www.mewa.gov.sa/en/MediaCenter/News/Pages/home.aspx) 的独立卡片读取标题、URL 与日期，日期按沙特 +03:00 处理。T1、owner=null、间隔 360 分钟、首次回填最多 3 条，全文展示与再分发关闭。沿用既有标题去噪规则，排除一般水务、环保、王室讲话及农业创业等消息，禽业／肉类贸易实质动作保留；后续未命中词表的其他主题仍可能进入预筛。

本次真实列表 12 条均有日期，去噪后 3 条。新隔离库 `poultry_mewa_20261020_test` 首轮采集 3 条，正文分别 2883／2655／2408 字符，日期与身份齐全；原配置复抓 created=0、revised=0。receipts／analyses／reports 为 0，自动 worker 未启用。配置只参与后续 seed，本次入库范围为新测试库。

三条分别为 10 月 6 日禽业措施、10 月 4 日展会签约报道、10 月 3 日展会预告；采集保留原始材料，预告的选材价值由后续预筛／评分判断。[禽业措施原文](https://www.mewa.gov.sa/en/MediaCenter/News/Pages/mewa-5-initiatives-poultry-localization.aspx) 提及禽肉进口许可管理从 SFDA 转至 MEWA，具体办理生效日及实施文件另核。日期只有日精度，存储的 UTC 值是沙特当日零点换算。

[robots](https://www.mewa.gov.sa/robots.txt) 未限制新闻路径，禁止 feed.aspx 等路径，本配置使用 HTML 列表。[使用条款](https://www.mewa.gov.sa/en/Ministry/AboutMinistry/RulesAndConditions/Ministrypolicies/Pages/PolicyOfUse.aspx) 要求复制／再发布取得授权，允许正确分享官方链接，并限制过量负载；本次为私有隔离核验，部门共享的适用范围待确认。证据及复抓结果在 `.data/mewa-integration-20261020/`，检查结果见 [验证记录](SMOKE_TEST_V1.md#mewa-限量接入)。

## 2026-10-20 网络复验与独立评测取样

14:19 信源质量回看完成：按 7 月 23 日至 10 月 20 日定向整理 14 份不同 URL 的代表资料，优先补强 ALIC 鸡肉统计、发行人经营披露、日冷集团 IR 与 MEWA 禽肉政策。MEWA 快照通过既有解析器取得 12 条唯一 URL／完整日期，目标正文取得成功，可优先限量试接。ALIC／协会共享 URL、PDF／Excel、SFDA 状态冲突及嘉吉 403／使用限制分别记录；配置仍为 9 源，候选清单已更新。详见 [业务价值与代表材料](SOURCE_QUALITY_REVIEW_20261020.md) 。

当前网络复验（北京时间 2026-10-20 13:03）：项目现有代理 `http://127.0.0.1:17890` 完成 9／9 配置源列表、日期及正文检查。随后按相同路径为独立标注收集 50 个新事件，来自 12 个来源，配置源总数仍为 9。新增来源用于本批人工评测，持续采集接入及使用范围按原有流程审阅；详情见 [核验记录](SMOKE_TEST_V1.md#t01-独立资料准备与代理复验) 。

## 2026-10-12 行业媒体补源

按主人补充加入 `poultrytimes-news`：[Poultry Times](https://www.poultrytimes.com/about/) 是行业出版物，使用首页显式提供的原生 [RSS](https://www.poultrytimes.com/feed/) 。10 条 URL 唯一且日期完整，排除赞助／获奖／周年庆／纯会议等后保留 4 条；分类 `Sponsored Content` 优先排除，即使标题有贸易关键词也不豁免。T2、owner=null、初始最多 3、间隔 360 分钟；媒体转述、客座观点、引用企业／协会资料不能标成官方公告或已核实成交。

独立测试库首次实际采集 3 条、正文／日期齐全，复抓 created=0、revised=0；receipts／analyses／reports 为 0。包括 [Hormel 收购 Brakebush 报道](https://www.poultrytimes.com/hormel-enters-agreement-to-acquire-brakebush-for-1-05b/) ，正文为 10.55 亿美元协议金额，标题为近似数；仍待交割条件／监管批准，不能写成收购已完成。另两条是季节性防疫准备及议案提出，不自动等同禁运或生效政策。

robots 仅禁止 wp-admin，首页与隐私页未发现明确自动抓取禁止；这是本轮访问证据，不代表已取得全文、图片或持续部门共享／公开发布许可。[隐私政策](https://www.poultrytimes.com/privacy-policy/) 引用了未定位到独立文本的 Visitor Agreement，持续运行／共享前仍需核实适用使用条件；本轮仅私有隔离试采，全文再发布关闭。RSS 的 lastBuildDate 比最新条目 pubDate 早 5 分 21 秒，条目日期不改，不把频道时间当文章日期。

其他媒体分别登记限制：[MEAT+POULTRY 条款](https://www.meatpoultry.com/terms-of-use) 明示自动读取／抓取限制，官方 RSS 说明未明确例外，项目请求另为 403；[The Poultry Site 条款](https://www.thepoultrysite.com/terms) 限个人用途及内容再使用书面许可，不能因列表可读就启用。Poultry World 已迁往 foodagribusiness.world，旧 feed 为 404；中国贸易报有日期禽肉报道可在网页工具读取，但项目安全读取器拒绝其保留／私有地址，稳定列表和使用条件未验。均未绕过限制或接入。

本轮行业媒体证据及材料保存在 `.data/media-sources-20261012/`，候选状态记录各自问题。当前补足一个国际禽肉媒体入口；中文、亚洲和 MENA 行业媒体覆盖仍不足，后续优先补真实贸易、价格与渠道材料，不堆养殖技术广告或将重复转载视作多项事件。

## 2026-10-12 聚焦禽肉动作补源

新增 `wellhope-news`：[禾丰英文官网新闻列表](https://en.wellhope-ag.com/news/hfxw9ec/) 共 20 条独立 URL、日期全齐；精确读取 h3 和 date，不把摘录／Read More 拼进标题。按已标注业务范围，标题去噪排除品牌、会议、纯猪／蛋／饲料消息共 17 条，保留 3 条；含有具体肉鸡出口或产能的会议豁免。T1_5、初始回填最多 3、间隔 360 分钟、主体未注册则 owner=null，全文／图片不再发布。robots 对全站 Allow 是机器访问线索，不是转载许可。

新隔离库首次实际采集 2 条、日期／正文全齐，复抓 created=0、revised=0；receipts／analyses／reports 为 0。既有首次回填默认 12×30 天窗口排除了 2024 年项目，3 是数量上限，不保证首次取满。保留这一行为，不扩大回填窗口；2024 项目仅独立历史审阅，不能当新供给。用户原库未导入，自动 worker 未启用。

主代理核对 [禾丰对马来西亚原料肉鸡出口公告](https://en.wellhope-ag.com/news/2203.html) ：审批办理中、当地合作讨论中，不能写成已获批／已成交／已发货。Luna 子代理承担日本与 MENA 有界检索、HTML 选择器和日期／条款证据整理及本地检查；主代理核对业务范围、配置与隔离入库。

[土屋商店企业新闻稿](https://prtimes.jp/main/html/rd/p/000000005.000182229.html) 明确 FOOPO 首个项目为巴西鸡腿肉，单家最小量 0.12 吨、募集 100 口，达到整柜后才向海外供方发单；不能把募集口数或最小量推成实际订单／整柜／已到货。企业专属 RSS 仅 1 条，条目日期 2026-05-18T09:30:01+09:00 与页面相符，Readability 日期晚 1 小时，本批采用条目日期。原稿与转载是同事件；[平台条款](https://prtimes.jp/main/html/kiyaku) 对一般信息取得／引用和报导用途分别限定，本系统相应用途范围未确认，暂不启用自动源。

SFDA 补查发现 [决定与通知列表](https://www.sfda.gov.sa/ar/circulars) 的独立详情为 `/ar/circulars/`，既有 sfda-news 只允许 `/en/news/`，不能宣称它覆盖所有进口禁令。列表与英国禽肉解除决定可读，但 [使用条款](https://www.sfda.gov.sa/en/terms-of-use) 明示个人用途、链接／展示事先批准要求；不新增自动源，既有 news 配置也不能当作已获部门共享或公开展示许可。原有配置和用户资料保留，正式持续采集／共享前需解决适用使用范围；未向 SFDA 自动发请求或通知。

ALIC 中国鸡肉分析包含明确调制品贸易数值，但该页只有 2026 年 10 月期号、无可信日级发布日期，未在海外新闻列表中核到同文，不接入普通新闻流。埃及 MSIT 官方检索能找到 2 月 8 日冷冻禽肉进口安排，原文／栏目／robots 均超时，未充作完整资料；SIS 降价公告与进口安排分开。GASC 合同栏目没有有日期条目；MENA 具体禽肉拒收与私人进口商已成交采购仍是缺口。

本轮 4 条有日期原文已形成独立 审阅包（`.data/targeted-sources-20261012/review.md`） ，全部 development，原 30＋16 条标签与材料 SHA256 校验不变；Agent 建议不预填用户标签。配置和候选状态见 industry/，验证见 [本轮记录](SMOKE_TEST_V1.md#聚焦禽肉动作补源) 。

## 2026-10-12 材料审阅与进口监管补源

新增 `mhlw-import-watch`：从 [MHLW 进口食品监管 HTML 栏目](https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/kenkou_iryou/shokuhin/yunyu_kanshi/) 读取独立公告，不使用受限制的 RSS。5 条列表均有可核对日期，公告正文可读；新隔离库首轮 3 条、3 条日期／正文齐全，重复抓取 created=0、revised=0，receipts／analyses／reports 均为 0。仍只展示摘要与原文，T1、6 小时间隔、初始回填 3 条；没有更新用户原库或启用 worker。

[网站使用规则](https://www.mhlw.go.jp/chosakuken/index.html) 对无特殊权利说明的内容采用 PDL1.0，要求出处及加工说明；RSS 的单独限制继续遵守。当前条目保留原文链接，中文为本系统转述，不能冒充官方译文。原文进口食品总体统计不能改为禽肉数据；芝麻检验命令也不等于禽肉禁令。名单快照／diff 与统计 ETL 仍未实现。

前轮 12 条资料补入日本年度进口监管、芝麻执法对照及迪拜两篇历史监管公告，共 16 条；北京时间 2026-10-12 21:50 主人完成点选，2 条入选、1 条相关、12 条无关、1 条暂不确定。冻结及逐条对照见 人工审阅结论（`.data/source-review-20261012/completed-20261012/review.md`） 。原 Agent 建议 4／9／3 单独保留，不覆盖用户判断；全部 development，不是今天的消息或新独立验证集。

本批具体禽肉扩产／销量及实际出口入选；日本食品年度监管总量和迪拜通关总量均未入选。解析成功仅证明入口可用，后续应优先补有日期的禽肉贸易、进口要求变化、具体拒收／污染与真实采购动作，而非继续堆泛食品公告；现有源配置不据此删除，门槛不变。

正文记录更正：前轮把日冷第 7 报称为“仅链接 PDF”没有充分依据。重新读食品子站页面，仅见标题／日期，未见 PDF 链接；[集团同标题同日期 HTML 公告](https://www.nichirei.co.jp/news/2026/524.html) 已独立核对。集团确认 7 月 24 日仓库与冷冻食品出货恢复通常运转，9 月新增披露主要是个人信息泄漏，不能当成新的供货中断。本轮仅把集团原文加入新审阅批次，未改旧原始资料或实现自动替代采集。

真实进口商角色核对：Foodlink 官方产品页明确经营国产／进口鸡肉；日本哈姆食肉事业官网说明进口食肉的收货与商社功能。角色出处在审阅包 `buyer-entrances.json`，未查到可直接采为禽肉采购需求的有日期公告，不启用一般宣传／人事消息、不补联系方式或建立 CRM。迪拜市政府两篇食品监管原文及发布时间已核对，但其 feed 路径实际返回首页 HTML、列表只能解析到一条招聘新闻，仍只登记候选。

本轮验证结果与限制见 [验证记录](SMOKE_TEST_V1.md#材料审阅与进口食品监管源) 。点选入口及批次边界见 [人工标注](LABELING_V1.md#第二批来源资料) 。以下保留首批扩源的验收快照。

## 2026-10-12 首批扩源

本轮增加中国凤祥股份、日本日冷食品、沙特 Almarai 三条公司来源，覆盖同行出口、目标市场渠道／价格和竞争供给。它们是公司动作的出处，不是对中国企业的采购需求，也不替代官方进口执法与准入公告。三源均为 T1_5、初始回填 3 条、初始间隔 360 分钟；全文与全文再分发关闭，未启动自动 worker。

| 新来源 | 当前入口 | 原始／过滤后 | 日期核对 | 样本正文字符 |
|---|---|---:|---|---:|
| fengxiang-news | [凤祥新闻](https://www.fengxiang.com/index/news/index.html) | 65／40 | 40 条列表日期；按中国时间读年月日字段 | 526 |
| nichirei-foods-news | [日冷食品官方 RSS](https://www.nichireifoods.co.jp/news/feed/) | 10／6 | 6 条 RSS 日期，保留原时区 | 2479 |
| almarai-news | [Almarai 公司新闻](https://www.almarai.com/en/corporate/media-center/almarai-news) | 46／42 | 列表日／月格式不猜；详情 meta 的 article:published_time 按 +03:00 读取 | 1354 |

六源的本次只读列表及各一篇正文检查均成功。过滤仅排除明确的广告／娱乐、公益、非业务培训等噪声，并保留出口、价格、供给和产能例外；过滤后仍包含品牌荣誉、其他食品及一般公司新闻，不能把数量当作值得入选条数。日冷 RSS 当前只含最近 10 条，5 月的价格公告仅做另行历史原文核对，不代表自动采集覆盖历史全文。

日期修复有失败复现：凤祥的 `<span>年</span><span>月</span><span>日</span>` 在真实 HTML 中成为 `YYYYMMDD`，原解析器返回空值。仅为完整八位日历字段增加校验与时区处理，不解析嵌在版本号／长编号内的数字，不修改数据库。Almarai 轮播与正文列表去重后取独立标题，以详情发布时间覆盖页面上相关报道的日期；每轮最多补 3 篇详情，其余待后续补齐。来源主体未在词表注册的日冷和 Almarai 保持 owner_entity_id=null，不伪造机构 id 或新增市场标签。

隔离库首轮每源 3 条，共 9 条，9 条有日期且身份唯一；8 条已具可用正文。日冷第 7 次系统障碍公告的食品子站正文不可用，保留为待补，不以标题补造事实；此前“只链接 PDF”的描述不准确，后续核对见上文。曾触发既有 Jina 回退路径，但未配置 key，立即失败；没有购买 Jina、绕过回执或改正文机制。自动正文替代与该失败路径仍需后续处理。

私有 资料审阅包（`.data/source-expansion-20261012/review.md`） 保留首轮 9 条原始资料，以及另行核对的 3 条历史业务材料（凤祥出口品牌／无疫区报道、日冷价格公告）。全部未标注，后者不是最新 RSS 回填或当日新闻，没有改动既有 corpus、人工标注日志或冻结评测集。可用于下一批选材价值审阅，不能直接充当金标。

重复检查仅限首轮 9 个 URL，在隔离库临时收窄白名单，三个源新增／修订均为 0；不是整站再次采集或长期稳定性证明，正式源配置未收窄。采集与 smoke 前后 receipts／analyses／reports 均为 0，无模型、送达或公开文章。seed 仅在本轮新隔离库运行，用户已有库尚未写入新信源；配置文件的 enabled=true 不等于已经启动自动采集。

使用条件逐项检查：日冷提供公开 RSS，但 [网站规则](https://www.nichireifoods.co.jp/notice.html) 保留版权及法定使用范围；Almarai 的 [robots](https://www.almarai.com/robots.txt) 允许抓取，已读其 [使用条款](https://www.almarai.com/en/terms-and-conditions)；凤祥仅见版权声明及不可导航的免责声明入口。上述检查不等于取得全文／图片或公开再分发许可。当前保持事实摘要与原文链接、内部审阅，不扩大原文再分发；公开上线仍需单独核对使用条件。

本轮未启用的重点入口：

- 中国海关主站连接失败，农业农村部主站／jhs 子站被保留地址校验拒绝；不放宽地址、TLS 或代理规则。圣农连接失败，仙坛列表也未通过。
- [AQS 首页](https://www.maff.go.jp/aqs/) 与禽流感汇总页现在可读，但多事件共用 URL、首页日期缺年份，不再把旧 403 当当前状态；普通新闻采集会混淆事件，保留快照／diff 路由。
- MHLW 食品 HTML 栏目可读，进口执法独立入口与正文待验；RSS 仍禁用。日本食肉输出入协会当前月表可读，但复用列表页，没有独立文章链接，保留统计快照路线。
- [JETRO 内容使用 FAQ](https://www.jetro.go.jp/biznews/faq/article_use.html) 明示内容加工、定期标题刊载需许可；[Tanmiah 条款](https://tanmiah.com/terms.php) 明示禁止 robot／spider 等自动访问，均不配置启用源。
- MOCCAE 已找到真实新闻路径，但 [版权页](https://www.moccae.gov.ae/en/copyright) 限制未经授权的使用／复制；CP Foods 条款限制公开传播，且列表出现晚于检查日的日期。两者保留候选。阿联酋农业食品安全局列表依赖动态内容，Emirates Rawabi RSS 以公益／报告链接为主，未作为高价值新源凑数。

北京时间 2026-10-12 20:35 验证：类型检查、192／192 独立测试、681／681 Windows 适用回归、前端 build、API／web smoke 30／30、补丁格式通过。完整浏览器仍为 39／42，原有三项失败与三份 POSIX 文件未覆盖限制保留。证据在本轮 `.tmp/source-expansion-20261012/`，正式运行只依赖 industry/ 配置及 scripts/check-sources.ts，不依赖临时目录。

## 配置与验证

| 配置 | 官方原文入口 | tier | 路由 |
|---|---|---|---|
| maff-press | https://www.maff.go.jp/j/press/rss.xml | T1 | RSS，带日期 |
| abpa-news | https://abpa-br.org/feed/ | T1_5 | RSS，带日期与正文内容 |
| sfda-news | https://www.sfda.gov.sa/en/news | T1 | web_list，实际 .news-card／.head-subtitle／日期 span |
| fengxiang-news | https://www.fengxiang.com/index/news/index.html | T1_5 | web_list，独立文章＋明确年月日 |
| nichirei-foods-news | https://www.nichireifoods.co.jp/news/feed/ | T1_5 | RSS，部分公告含正文；空正文公告需另核对 |
| almarai-news | https://www.almarai.com/en/corporate/media-center/almarai-news | T1_5 | web_list，详情元数据补发布日期 |
| mhlw-import-watch | https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/kenkou_iryou/shokuhin/yunyu_kanshi/ | T1 | web_list，仅独立 HTML 公告与明确日期，RSS 不启用 |

2026-10-07 获取官方真实页面快照，用项目实际 RSS 和 fromHtml 解析器读取，结果如下。RSS 的本机回放仅用于重用实际解析器，没有对外关闭地址校验；不是 fixture 编造页面。

| id | 原始条目 | 过滤后 | 有日期 | 乱码标题 |
|---|---:|---:|---:|---:|
| maff-press | 36 | 36 | 36 | 0 |
| abpa-news | 10 | 10 | 10 | 0 |
| sfda-news | 6 | 5 | 5 | 0 |

解析标题和链接不是详情正文／模型发布链路的验收。MAFF 当前 36 条含大量其他农业公告，ABPA 当前 10 条含鸡蛋与猪肉，SFDA 6 条多数为医疗新闻，依靠宽召回预筛辨别真实禽肉贸易；初始回填 3 条、间隔 360 分钟，避免无价值回灌。360 分钟只是初始间隔，不是长期频率上限；上游每天 04:20 自动调频，一般源可变为 15 至 60 分钟。判重和 RSS 304 避免重复处理，但费用控制仍必须用 budgets 与真实样本产出核对。没有声称当前 3 个源覆盖全部市场，也不把没有入选解释成市场无风险。

## 当前真实采集状态

2026-10-11 补验：3 源当前列表、日期和样本正文检查通过，隔离准备库首次回填共 9 条、均有日期，无模型分析或回执。业务回放另选 6 条真实资料并刷新正文；发现 ABPA 两个旧页面的 Cookie 弹窗会被 Readability 当作正文，移除两个明确的 WP RGPD 弹窗容器后，真实正文分别恢复为 2,172／2,446 字，新回归通过。仍未启动持续 worker；详细边界见 [小批闭环](REAL_LOOP_V1.md) 。下文是此前 16 条采集快照，不与本次新隔离库混计。

2026-10-07 已解决网络出口：实际 Mihomo mixed-port 为 17890，此前使用的 7890 属于设备服务，并非代理。使用 EGRESS_PROXY_URL=http://127.0.0.1:17890，并最小修复上游双栈 DNS 在 AAAA 失败时丢弃成功 A 的缺陷。系统 DNS、代理设置、.env 和地址安全校验均未改动。

3 个源现在通过真实生产读取器的列表、日期和一篇详情正文检查；隔离库手动 collectSource＋正文提取也通过。首轮每源 3 条，MAFF 第二轮补收 7 条不同近期资料，第三轮所有源新增 0；最终 16 条材料身份均唯一且有日期，无模型和付费回执。自动 worker 尚未启用，不能据此宣称持续采集或真实模型质量已验收。完整证据与复用命令见 [网络验收](NETWORK_INGEST_V1.md) 。

## 候选与延期

中国海关统计、日本贸易统计、AQS Excel、Comtrade 走 ETL／dataset；MAFF／SFDA／MOCCAE／GOVS 等准入名单走快照 diff；Gulfood／Saudi Food Show／Food Africa 走企业池；WAHIS 与 ePing 保留原始事件和通知阶段，再产生有出处、可读取正文的派生情报。这些链路本次未实现。

MHLW RSS 暂不接入，官方说明限制以 feed 信息制作网站、邮件和再分发，依据：https://www.mhlw.go.jp/rss/ 。后续需单独核对原页面使用条件。MAPA 猜测的 RSS URL 实测 404，官方 RSS 介绍页不构成可用 feed，依据：https://www.gov.br/agricultura/pt-br/rss 。AQS 早期候选列表曾返回 403，当前页面可读与路由限制见本轮扩源记录。未核实的公司／协会／埃及 GOVS 域名保持 null，避免造有效入口。

所有源默认只展示摘要与原文链接，site_fulltext=false、syndicate_fulltext=false；即使 RSS 含全文也不自动授权再分发。seed 只新增缺失 id，不覆盖后台 edits；已有库内旧 AI 示例源不会因文件替换自动删除，需要在后台逐一暂停。

## external 的真实限制

POST /api/ingest/items 需要 INGEST_TOKEN。只接 sourceId、items[] 中 title／url／publishedAt／author／raw，raw 并不自动作为正文分析；新未知 source 会被创建为 isolated。派生情报要有来源与可读取页面，再经原有采集、预筛、评分、归组和 publication，不能直接写公开投影。V1 没有把统计 API 返回 JSON 强塞 item。
