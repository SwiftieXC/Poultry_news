# 改造前 Baseline

上游：https://github.com/KKKKhazix/AIHOT 。commit：`8e34e05feb161cb5838e592ee22715f791c7f814`，分支 main，克隆后的工作区为空；无用户已有业务文件、.env 或数据库。Review 之后先测原始行业配置，再实施行业改造。

运行环境：Windows、Node.js 24.19.0、npm 11.17.0；npm ci 成功安装锁定的 296 个包，未新增业务依赖。未检测到 Docker、PostgreSQL 服务／客户端或可用 WSL。

| 检查 | 原始结果 |
|---|---|
| npm run typecheck | 通过 |
| npm run test:standalone | 首次 152 通过、1 文件失败，原因 spawn openssl ENOENT |
| 当前进程 PATH 加入既有 Git usr/bin 后重跑 standalone | 156／156 通过，不改系统 PATH |
| npm run build -w @aihot/web | 通过，client 与 SSR 均构建成功 |
| node --test apps/web/tests/*.test.ts | 浏览器测试缺 Chromium／WebKit，未通过完整套件；不是业务回归结论 |
| npm test | 需隔离 PostgreSQL 测试库，本机未执行数据库测试 |
| scripts/smoke.ts | 需运行真实 API／DB，尚未执行完整站点 smoke |

定制限制：标签 normalizeTags 最多 6 个；UnderstandSchema 严格检查 itemType；评分只接受 attentionScore；structure 的 category 来自 CATEGORIES。REPORTS.quiet 可配置；日报主逻辑在 reports/edition.ts 与 compose.ts，直接使用条目 summary，不能靠虚构 report-daily prompt 修改日报。

安全边界：没有运行 init-env，没有模型调用和推送，没有提交、推送、部署或创建远端仓库。MIT 与 NOTICE 保留。
