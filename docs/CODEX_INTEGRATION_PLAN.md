# Codex Luna 订阅接入施工清单

目标：用户已同意用 ChatGPT Plus 内的 gpt-6-luna，继续将本机试跑接入现有分析链路。固定指定模型，不回退付费 API，不买 credits，不修改 .env 或登录凭据。

## 已验证入口

本机 codex login status 显示 ChatGPT 登录；10 条公开真实样本已用 5 个只读批次完成预筛、两次独立评分、抽取与写作。材料和原始结果在 .data/luna-pilot-20261008/，原计划在 .tmp/luna-pilot/PLAN.md。没有用户人工金标，不能宣称准确率。预筛 3 条 BLOCK、7 条通过，4 条达到暂定分数门槛；没有发布。

## 检查点与允许改动

1. 标签规则：industry/prompts/structure.md 与 content-understanding.md 明确禁止从泛称推断生鲜／冷冻形态、从待批恢复推断已恢复准入、从交流参展推断采购。原文条件与证据规则保留。
2. 原生传输：packages/backend/src/providers/codex.ts 新增 callCodex 接口；输入固定 model=gpt-6-luna、system、user 纯文本、json、reasoningEffort（low／medium）、timeoutMs；输出沿用 receipts 的 CallOutcome，包含 OpenAI-compatible choices、真实 token usage，cost=null 表示不折算 API 账单。
3. ModelPreset／ModelSpec 新增可区分的 codex-cli 传输，注册 codex-luna-low 和 codex-luna 两个具名预设，DEFAULTS 保持为空。原 HTTP 预设、输入校验、回执和缓存身份保持原行为。
4. CLI 调用必须是 ChatGPT 登录，移除子进程的 API key 环境变量，固定 OpenAI provider，使用只读、ephemeral、禁用 shell／多代理／hooks／Web search，不加载用户模型配置；检测工具事件即失败。超时保留未知回执，不隐式重新消费额度。订阅限额进入等待状态，不换模型／API。
5. 订阅调用要求已有 codex 服务请求预算；在隔离库配置有限请求数，不新增 schema。调用仍经过 paidRequest，成功响应先持久化再做业务提交，相同输入重跑复用回执。
6. 离线测试：tests/codex-provider.standalone.test.ts 与 tests/codex-provider.test.ts 使用本机子进程替身，禁止连接真实 Codex／模型。覆盖成功、API-key 登录拒绝、参数与密钥隔离、工具事件拒绝、限额、超时、回执复用和预算缺失／熔断。
7. 真实最小回归：仅对已导出的 1 条政策资料调用原 runAnalysis，最多 5 次 Luna 请求；再跑相同输入核对 0 个新增请求。结果保存私有文件，不写公开 projection，不启动自动 worker。

禁止修改：数据库 schema／迁移、真实生产数据、.env、认证文件、系统配置、公开部署、Git 提交／推送。API／worker 原流程、publications 读取层、归组规则与 source thresholds 保留。

## 子任务 Q1：廉价代理质量复核

目标：只读核对 .data/luna-pilot-20261008/results.json 与 materials.json 的事实、日期、数量和阶段范围。重点 luna-01、04、05、08、10；返回确定问题、原文依据及原始／结构标签区别，不创造人工金标。允许读取这些文件及本施工文档；不允许修改、联网、模型调用、读凭据或发布。

验收：不把待批当已批准、局部限制当全国限制、交流当采购、预计金额当成交；未发现明确问题如实说明。主代理核对原文和实际输出后判断。

## 交付与验证

## 子任务 T1：离线订阅传输与回执测试

入口：packages/backend/src/providers/codex.ts、llm.ts、receipts.ts、tests/setup.ts 与 tests/databases.ts。实现决策已固定：使用 CODEX_CLI_BIN=process.execPath 与 NODE_OPTIONS preload 构造本地 CLI 替身，不调用真实 Codex；必要时用带查询字符串的动态 import 隔离登录缓存。替身只在本次测试创建的 .tmp/codex-tests-* 目录运行，退出前恢复环境并清理自己创建的目录。

允许新增 tests/codex-provider.standalone.test.ts、tests/codex-provider.test.ts 与必要的 tests/codex-stub.mjs 共用辅助文件；禁止改实现、其他测试、凭据、联网或真实模型调用。预期覆盖：成功与 UTF-8 分块、CLI 参数／密钥隔离、API-key 登录拒绝、非批准模型拒绝、工具事件拒绝、订阅额度耗尽、超时；数据库测试覆盖预算缺失／熔断、收到回执复用、额度失败记录为 failed、未知结果记录为 unknown、无 HTTP 回退。数据库仅 poultry_v1_test 的框架隔离副本；启动 PG 已由主代理完成。交付实际文件、精确运行命令和测试结果，失败不得弱化断言。主代理独立运行与核对。

README 描述实际可用入口，ROADMAP 保留真实质量校准／自动运行未完成状态；新增订阅接入及试跑文档，记录当前模型选择、共享额度限制、token usage 和未完成项目。必要检查为类型检查、独立测试、相关回执／预算测试及 Windows 适用回归；明确保留 POSIX 与已有浏览器失败的边界。
