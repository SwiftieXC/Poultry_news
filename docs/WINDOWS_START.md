# Windows 启动

项目路径：D:\dev\projects\poultry_news 。Node.js 当前实测 24.19.0。长期运行使用 Docker Desktop＋WSL2 或已有 PostgreSQL 17；本次未安装任何系统服务或更改系统配置。

本机无需 API key 的 Luna 路线见 [Codex 订阅接入](CODEX_SUBSCRIPTION_V1.md) 。该路线使用同一 Windows 用户的原生 CLI 登录，已验证单条分析和回执复用；Docker 配置与自动持续运行另行验收。

## 标准 Docker Compose

1. 在 Windows 上准备 Docker Desktop 的 Linux 容器环境与 Compose，确认 docker compose version 能执行。
2. 项目根目录运行 npm ci。若尚无 .env，用户自行从 .env.example 复制；现有 .env 不覆盖。
3. 在本地编辑器填写 POSTGRES_PASSWORD、ADMIN_PASSWORD（≥12 位）、SESSION_SECRET、IMG_PROXY_SIGN_SECRET 及 SITE_URL=http://localhost:3000；模型凭据只填写在本地。可先保持模型服务未配置。
4. .env.example 的 COLLECT_ENABLED 与 MODEL_CALLS_ENABLED 默认为 false，第一次只验证界面时保持关闭；FEISHU_CONTENT_PUSH_ENABLED、FEISHU_INTERNAL_ENABLED、INDEXNOW_SUBMIT_ENABLED 同样保持 false。不要直接运行 init-env，它会启用采集与模型并打印新管理员密码。
5. 启动：

```powershell
Set-Location D:\dev\projects\poultry_news
docker compose up -d --build
docker compose ps
node scripts/smoke.ts --base http://localhost:3000
```

打开 http://localhost:3000 ，后台 http://localhost:3000/admin 。没有模型和采集时页面为空是正常的，不能当成采集成功。启用真实 worker 采集前，先逐个后台试抓、核对日期与详情，并完成预算与源质量检查。

Compose 的 db／setup／api／worker／web 均保留上游结构；内部数据库与镜像名称仍是 aihot，不代表对外品牌。site_fulltext 与 syndicate_fulltext 默认关闭。停止容器使用 docker compose stop，不执行 down -v，避免删除数据卷。

## 已有本机 PostgreSQL 的开发方式

先在本机已配置的 PostgreSQL 创建本项目数据库，确保 .env 的 DATABASE_URL 指向它。测试库另用 *_test，不使用真实内容库运行 npm test。以下只在用户配置完成后运行：

```powershell
npm run db:migrate
node --env-file=.env scripts/seed.ts
```

分别在三个终端、同一项目根目录运行：

```powershell
npm run dev:api
```

```powershell
npm run dev:worker
```

```powershell
npm run dev:web
```

api／worker 脚本读取根目录 .env。前端开发服务器只需要公开地址与 API 地址；若修改默认端口，在前端终端显式设置 API_BASE_URL 与 SITE_URL，不把后端密钥提供给前端。默认 3001 为 API，3000 为网页，仅监听本机。

## 本次临时验收环境

使用项目 .tmp/v1/ 内的 PostgreSQL 17.11 便携包，仅监听 127.0.0.1:55432；隔离 poultry_v1_test 与 poultry_v1_smoke。实际 API／网页在 53001／53000 跑过 smoke，采集、模型、推送均关闭，不安装服务、不创建 .env。该实例只用于本次验收，不是长期启动方式，不应把正式项目建立在 .tmp/ 内容上。

原生 Windows 会无条件终止收到 subprocess.kill(SIGTERM) 的进程，无法验证 POSIX 优雅退出语义；完整此类测试用 Docker／WSL2，依据：https://nodejs.org/api/process.html#signal-events 。备份故障注入测试还使用 POSIX sh 与冒号 PATH，不能把本机缩减诊断套件当全量 npm test 通过。

## 采集网络

本机已有 Mihomo 的 mixed-port 是 17890，HTTP 端口是 17892；7890 是其他设备服务。系统 DNS 的保留地址仍会被拒绝，使用既有安全代理路径，不开启 ALLOW_PRIVATE_NETWORK_FETCH。

只读检查真实列表、日期和一篇正文：

```powershell
node scripts/check-sources.ts --proxy http://127.0.0.1:17890
```

启动 API／worker 前，在对应终端设置 $env:EGRESS_PROXY_URL='http://127.0.0.1:17890'，并保持自动采集、模型与推送关闭，直至下一阶段配置和质量验收。没有自动生成或修改 .env。Docker 内的 127.0.0.1 是容器自身，不能直接照搬本机出口；需单独验证宿主机代理路径，不自动修改代理 allow-lan。完整结果和操作边界见 [网络验收](NETWORK_INGEST_V1.md) 。
