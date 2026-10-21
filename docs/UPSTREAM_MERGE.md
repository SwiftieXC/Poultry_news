# 上游合并边界

## 2026-10-21 选择性移植

使用者授权移植下列三类行为，基于现有禽贸工作区逐项适配，不整批升级上游 `a0d1e75`：

- 正文：`47d50dd` 的缺材料等待，以及 `690456b`／`a0d1e75` 的登录、注册导航与跳转过滤；保留 RGPD 两个精确选择器，评测脚本按新输出语义适配。
- 归组：`9229843` 的业务归属／决定／状态与付费回执原子提交；`791a6f5` 的额度等待 pending 状态，以及 `4f9ff20` 的额度延后及修复队列优先级，失败回滚后复用已收到的响应。
- 搜索：`61613d3` 的中英文边界分词及正文英文／数字词首匹配；`a0b4c5e` 的相关度同分后依次按精选席位、质量分和时间排序。

本轮不引入上游七个数据库迁移、备用模型路由、内网信源放行、用词模型步骤及其他站点配置。测试只用新隔离 PostgreSQL 集群和本地服务替身，验证正文边界、回执回滚复用、队列延后和搜索过滤／排序；必要工程检查及限制以 SMOKE_TEST_V1.md 记录为准。

本轮实现已完成：类型检查、198项独立测试、500项Windows适用数据库测试、前端构建及30项smoke通过；浏览器40／42，两个既有失败类别和三个POSIX文件未覆盖边界保留。搜索同分排序使用独立的精选席位与质量分排序键，避免用固定加分混合两种优先级。当前结论仅为本地移植验证，详细结果见 [验证记录](SMOKE_TEST_V1.md#上游三类行为选择性移植)。

## 已有定制边界

改造前上游基线 commit 记录在 BASELINE.md。保留 @aihot/* 包名、现有锁文件、Compose／数据库内部名称和历史迁移；公开品牌通过 site/ 替换。

初始行业定制集中在 industry/ 和 site/，当时没有修改数据库、评分流程、publication、归组及报告编排；后续 Core 例外以本文件各阶段记录为准。packages/backend/src/lib/egress-proxy.ts 有双栈 DNS 汇总修复：一类地址查询失败不丢弃另一类的成功公共地址，原安全校验保留。对应 tests/outbound-protocol.standalone.test.ts 补 A-only／AAAA-only、全失败、空地址、私网和非法地址回归，合并上游时单独核对这两份文件，见 [网络验收](NETWORK_INGEST_V1.md) 。

2026-10-08 新增经用户授权的 Codex 订阅传输，Core 不再仅有 DNS 修复：providers/codex.ts 是独立传输；llm.ts 增加按 transport 选择的分支、强制 codex 预算存在与独立请求身份；receipts.ts 把明确额度拒绝记录为 failed，未知超时仍为 unknown。原 HTTP 请求身份与调用行为保持，数据库／迁移／publication 无 diff。合并时核对 site/models.ts 的可选字段、.env.example 的 CODEX_CLI_BIN、tests/setup.ts 的 HTTP 替身边界与 codex-provider 测试。没有新增依赖或默认模型切换。

2026-10-11 小批真实闭环发现 WP RGPD 弹窗被 Readability 当正文：content/extract.ts 仅在提取前移除 #rgpdCustomBox 与 #myModalrgpd 两个明确容器；tests/consent-body.standalone.test.ts 覆盖真实失败形态及负边界。合并时单独核对这两份文件；未引入通用 Cookie 文本过滤、依赖、数据库改动或安全放行。数字数量级与多产品范围规则仍在行业 content-understanding.md 中，原始失败及真实复测见 REAL_LOOP_V1.md。

前端仅调整 FeedItem、ReportPaper、item 和 story 的确定性中文排版，以及日报摘要显示长度；使用 site/format.ts，不改写原文证据。合并时检查这些前端文件与 site/package.json 的 format 导出。scripts/check-sources.ts 是免费、只读的源检查入口，不替代 worker。

上游部分测试仍以 AI 行业示例作为业务输入；新行业采用自己的 tests/poultry.standalone.test.ts 回归，并把涉及静态分类类型的示例换为本行业类别。不要通过恢复旧词表来迁就示例测试，也不要关闭测试规则。

使用者确认提交和推送后，开发使用 `poultry` 分支：`origin` 为用户公开 Fork `https://github.com/SwiftieXC/Poultry_news.git`，`upstream` 为 `https://github.com/KKKKhazix/AIHOT.git`。远端 `main` 保留上游版本，禽贸代码推送到 `origin/poultry`；禁止向 `upstream` 推送。后续更新上游需在保留行业配置及本文件边界的前提下单独评估。上游 README.en.md 保留为历史引擎说明，本地 README.md 是实际产品入口。

原生 Windows 测试库克隆修复：tests/databases.ts 的克隆名增加随机后缀，防止 Windows 在同一次运行中复用 PID 导致 CREATE DATABASE 同名冲突；不改被测业务或隔离要求。
