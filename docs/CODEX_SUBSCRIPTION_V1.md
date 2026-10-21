# Codex 订阅接入

本机已通过 ChatGPT 登录调用 gpt-6-luna，不需要项目 API key。调用使用 Codex CLI，消耗账户共享订阅额度，不是无限量服务；普通 OpenAI API 余额与订阅是不同路径。依据：[认证方式](https://learn.chatgpt.com/docs/auth) 、[非交互调用](https://learn.chatgpt.com/docs/non-interactive-mode) 、[模型说明](https://learn.chatgpt.com/docs/models) 。

## 已实现行为

- codex-luna-low：gpt-6-luna、low，用于预筛。
- codex-luna：gpt-6-luna、medium，用于双评分、抽取和写作；其他文本步骤也可选择此预设。
- DEFAULTS 保持为空，原 API 模型预设仍可用。只注册新预设不会启用模型调用。
- 后端每次先检查 ChatGPT 登录，拒绝 API-key 登录；不读取或复制认证文件，不接受用户在文章中的命令。
- CLI 使用 read-only、ephemeral、固定 OpenAI provider，关闭 shell、多代理、hooks、Web search 等工具能力；检测到工具事件立即中止并保留未知结果。
- 子进程移除 OPENAI_API_KEY、CODEX_API_KEY、OPENAI_BASE_URL，不换模型、不回退 HTTP API、不购买 credits。
- 调用经过原 receipts／receipt_attempts 与服务请求预算；必须有 codex 预算行。相同输入复用收到的回执，超时／中断保持 unknown，不直接重发。订阅额度错误使现有任务进入等待，当前按 1 小时后再试，不承诺这就是账户重置时间。
- 保存 CLI 实际 token usage；cost=null，表示没有 API 金额账单数据，不表示额度消耗为零。CLI 不支持本适配器的 temperature／maxTokens 控制，预算按请求次数限制。

本次仅在隔离测试库启用过模型，没有修改 .env、账户登录、默认模型或生产数据，没有启动自动 worker。真实试跑和质量限制见 [Luna 试跑](LUNA_PILOT_V1.md) 。

## Windows 配置方式

先按 WINDOWS_START.md 准备本机 PostgreSQL 与根目录配置。以下是使用者主动启用时的操作说明，本次没有替使用者执行正式库配置。

在项目根目录确认本机原生 CLI：

```powershell
Set-Location D:\dev\projects\poultry_news
$env:CODEX_CLI_BIN=(Get-Command codex.exe -ErrorAction Stop).Source
& $env:CODEX_CLI_BIN login status
```

应显示 Logged in using ChatGPT。若未登录，使用 CLI 官方登录流程；不在聊天中填写密钥。CODEX_CLI_BIN 必须是可直接执行的原生文件，不用 PowerShell／cmd 包装脚本。本机实测是 Codex 桌面应用附带的 codex.exe；应用更新后路径可能改变，重新获取。后台进程需要以已登录的同一 Windows 用户运行。

在已确认 DATABASE_URL 指向目标项目库后，可通过已有预算管理函数初始化请求上限；这会写该库的预算和审计记录，不改 schema：

```powershell
node --env-file=.env --input-type=module -e "const {updateBudget}=await import('@aihot/backend/admin/settings'); const {closeDb}=await import('@aihot/backend/db'); try {await updateBudget('codex',{perMinute:5,perHour:20,perDay:20,reason:'本机订阅试用请求上限'},'local-operator');} finally {await closeDb();}"
```

之后可在后台设置页调整已有 codex 上限；任一窗口设为 0 就停止新请求。20 次／天通常只够 4 条通过预筛后的完整基础分析，归组、综述、周报和翻译还会增加请求，不能把请求数当文章数。

在将要启动后端的同一终端选择步骤模型：

```powershell
$env:PREFILTER_MODEL='codex-luna-low'
foreach ($step in 'SCORE','UNDERSTAND','SUMMARIZE','STRUCTURE','GROUP','GROUP_REVIEW','DIGEST','REPORT','TRANSLATE') {
  Set-Item -Path "Env:$($step)_MODEL" -Value 'codex-luna'
}
$env:COLLECT_ENABLED='false'
$env:MODEL_CALLS_ENABLED='false'
$env:FEISHU_CONTENT_PUSH_ENABLED='false'
$env:FEISHU_INTERNAL_ENABLED='false'
$env:INDEXNOW_SUBMIT_ENABLED='false'
```

后台手工模型设置优先于这些环境变量，需核对是否有旧步骤覆盖。用户完成质量验收后，再在目标后端进程显式启用 MODEL_CALLS_ENABLED；COLLECT_ENABLED 是另一项独立开关。网页浏览不会触发模型。

未配置 embedding key 时，上游已有文本召回路径可以运行；不要为了订阅路线新增 embedding API key。若已有其他付费 provider 凭据，需核对对应步骤／提取回退选择，订阅适配器并不接管全部外部服务。

## 边界

- 当前适配器接受纯文本，不支持图片分析；没有修改 publication、归组算法、门槛或数据库迁移。
- 本机路线依赖用户登录和原生 CLI。Docker 镜像没有自动安装 CLI，也没有自动挂载用户凭据；不能照搬 Windows 路径到容器。
- 请求预算无法精确预测订阅百分比。本次账户 credits 为 0；以后若用户自行开启账户 credits 补量，项目不能强制区分订阅额度与账户补量扣款。
- 真实基础分析已验证，自动归组／持续日报的完整真实模型验收仍未完成。不得把离线替身测试作为内容准确率。

实现位置：site/models.ts、providers/codex.ts、providers/llm.ts 与 providers/receipts.ts。合并上游时见 [边界说明](UPSTREAM_MERGE.md) 。
