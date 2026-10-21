# 禽贸情报

Poultry Trade Intelligence，基于 AIHOT 的禽肉国际贸易竞争情报系统本地开发版。面向出口业务判断、同行监控、目标市场研究、客户与商机线索、政策风险和竞争供给监控。

禽贸开发代码位于 [SwiftieXC/Poultry_news 的 poultry 分支](https://github.com/SwiftieXC/Poultry_news/tree/poultry)，`main` 保留上游版本。当前为开发中版本，验证结果与限制见 [Smoke](docs/SMOKE_TEST_V1.md)。

当前优先供部门内部审阅日报，每个日期一份，所有国家的条目合在同一连续列表，不按国家或业务类别分栏。支持本地生成独立 HTML 与 Markdown 文件，阅读无需启动网站。生成命令与前置条件见 [部门日报](docs/DAILY_V1.md) 。

中文重量展示使用吨／万吨，文案层对明确的阿拉伯数字千吨数量进行精确换算，例如 500.3 千吨显示为 50.03 万吨、0.3 千吨显示为 300 吨。

## 当前功能

- 7 个业务分类：政策与准入、进出口数据、市场与需求、企业与竞争、客户与渠道、供给与价格、疫情与风险。
- 国家与产品用主题和标签表达；中国、日本、沙特阿拉伯、阿联酋、埃及及巴西／泰国竞争供给进入词表。
- 中国重点同行、国际竞争企业与机构名录，保留原文证据和产品／工厂／日期条件。
- 禽肉相关性预筛、双评分、按 source tier 入选和事件去重；屏蔽菜谱、家庭烹饪、无贸易关联营销等噪声。
- 评分保留五轴整数、噪声类型与连续原文依据，后端按既定权重／上限计算总分；明细保存在分析JSON与模型回执。
- 按原文别名核对主体ID，检查蛋肉／病种标签及可识别金额／重量的等值换算；异常写作保留内部审阅记录，暂停公开。范围与回放结果见 [T01原文核对](docs/T01_GROUNDING_20261021.md)。
- 普通文章缺少正文、摘要及帖子文字时等待补齐材料，不凭标题评分或写作；列表过滤登录／注册链接，正文抓取拒绝登录跳转。
- 归组归属、决定与状态和使用的付费回执在同一事务完成；额度耗尽时保留待处理状态并延后排队，历史资料的补排队优先级低于当期内容。
- 搜索支持中英文相邻分词；Agent／MCP 正文搜索的英文与数字词要求从词首匹配，标题／摘要保留子串匹配；相关度同分时依次按精选席位、质量分和时间排序。
- 中文条目写作包含业务含义、条件性风险／机会和今日值得跟进；日报按规则编排，不增加日报模型调用。
- `npm run daily:generate -- --date YYYY-MM-DD` 复用或编排指定日期日报，输出独立 HTML／Markdown；保留原文链接、北京时间窗口与撤回状态，拒绝覆盖已有导出目录。
- 官网公告源配置、主题页、RSS、公开 API、MCP、后台、日报／周报／月报沿用上游引擎。
- 信源配置包含 MAFF、MHLW 进口食品监管、ABPA、SFDA、MEWA、凤祥股份、禾丰食品、日冷食品、Almarai 与 Poultry Times 行业媒体；网页列表可按详情元数据补发布日期，只展示摘要与原文链接。MHLW 仅采独立 HTML 公告，不使用 RSS；MEWA 读取英文新闻列表日期，首次最多回填 3 条，排除一般水务、环保等噪声；禾丰取英文官网完整标题及列表日期，排除荣誉与普通会议等噪声。Poultry Times 使用原生 RSS、分级 T2，排除赞助文章，不视为官方监管来源。配置 seed 只添加缺失 ID，不覆盖已有后台设置。信源范围、使用条件与正文限制见 [信源状态](docs/SOURCES_V1.md) 。
- 品牌、报头及图标已替换；公开 UI 隐藏编辑评分，机器接口保留原契约。
- 可选 Codex ChatGPT 订阅模型：codex-luna-low／codex-luna，支持请求预算、持久回执和重复输入复用；配置见 [订阅接入](docs/CODEX_SUBSCRIPTION_V1.md) 。
- `node scripts/label-review.ts` 提供本机点选标注页面，选择和备注自动保存，可导出 JSON 结果和评测兼容 JSONL；无需截图，使用方式见 [人工标注](docs/LABELING_V1.md) 。

## 启动

需要 Node.js ≥24.11；标准部署使用 PostgreSQL 17 与 Docker Compose。完整 Windows 配置、关闭真实采集／模型时的首次启动和本次验证环境见 [Windows 启动](docs/WINDOWS_START.md) 。配置与信源说明不是“已经稳定采集”的保证，实际验证证据在 [Smoke](docs/SMOKE_TEST_V1.md) 。

在本项目根目录安装依赖：

```powershell
Set-Location D:\dev\projects\poultry_news
npm ci
```

完成 .env 配置后，标准 Compose 启动：

```powershell
docker compose up -d --build
```

默认网页 http://localhost:3000 ，后台 /admin，MCP /api/mcp。正式配置来源是 site/ 与 industry/；网站地址从 SITE_URL 读取。不要把模型或管理员密钥放进前端配置、文档或 Git。

## 目录与文档

| 入口 | 内容 |
|---|---|
| AGENTS.md | 项目规范唯一内容源 |
| ROADMAP.md | 当前进度与下一阶段 |
| docs/V1_REVIEW.md | 产品、架构、数据、成本及范围 Review |
| docs/BASELINE.md | 改造前上游与验证基线 |
| docs/TAXONOMY_V1.md | 类别、标签、主体与主题 |
| docs/SOURCES_V1.md | 真实信源验证状态与采集路由 |
| docs/NETWORK_INGEST_V1.md | 安全代理路径、真实入库与只读源检查 |
| docs/CODEX_SUBSCRIPTION_V1.md | ChatGPT 登录、Luna 预设与请求预算配置 |
| docs/LUNA_PILOT_V1.md | 真实材料试跑与质量限制 |
| docs/REAL_LOOP_V1.md | 小批真实资料、历史日报回放与审阅边界 |
| docs/DAILY_V1.md | 日报业务表达 |
| docs/EVAL_V1.md | 合成模板与真实金标流程 |
| docs/LABELING_V1.md | 本机点选标注、完成快照与小批校准 |
| docs/SMOKE_TEST_V1.md | 验证结果与明确限制 |
| docs/UPSTREAM_MERGE.md | 上游合并边界 |
| docs/DELIVERY_V1.md | 本次交付结论 |
| site/ | 品牌、UI 文案、模型配置及空模块注册 |
| industry/ | 行业词表、主题、源配置、提示词和 eval 模板 |
| packages/backend/src/publication/ | 所有公开出口的共同读取层 |

## 本地检查

在当前 Windows 主机已有 Mihomo 代理时，可只读检查配置源的列表、日期和一篇详情正文：

```powershell
node scripts/check-sources.ts --proxy http://127.0.0.1:17890
```

该命令不写数据库、不调用模型或付费回退，并保留地址与 TLS 校验；返回非零表示有源本次未通过。其他机器使用其实际 HTTP 代理，API／worker 的启动进程设置 EGRESS_PROXY_URL，不能仅依赖另一终端的环境变量。

```powershell
npm run typecheck
npm run test:standalone
npm run build -w @aihot/web
node --test "apps/web/tests/*.test.ts"
```

独立测试中的 TLS 用例需要 OpenSSL；本机可临时把现有 Git 的 usr/bin 加进当前进程 PATH。浏览器用例需要当前项目 Playwright 版本对应的 Chromium／WebKit。数据库全量测试需要具备 CREATEDB 权限的隔离库：

```powershell
$env:DATABASE_URL='postgres://USER:PASSWORD@127.0.0.1:5432/poultry_test'
npm test
```

库名必须以 _test 或 _ci 结尾。原生 Windows 和完整套件的适用边界见 Smoke 文档，完整 POSIX 回归在 Docker／WSL2／Linux 中运行。服务启动之后用 node scripts/smoke.ts --base http://localhost:3000 检查真实公开入口。

MIT 与 NOTICE 许可证保留。上游：https://github.com/KKKKhazix/AIHOT 。内部 @aihot 包名与 Compose 名称保留以便合并，上游名字不作为本站品牌。
