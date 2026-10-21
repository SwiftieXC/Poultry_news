# 真实采集网络与入库验收

记录时间：北京时间 2026-10-07 19:23。第一步已完成：3 个初始源的真实列表、日期、详情正文，以及隔离库手动采集入库通过。自动 worker、真实模型和推送没有启用。

## 根因与最小修复

此前将 127.0.0.1:7890 误认为代理端口，是本任务前一阶段的判断错误。按监听端口的所属进程重新核对：7890 属于 NGENUITY 的 hxn-srv-communication-hub.exe；Mihomo 的 mixed-port 为 17890，SOCKS 为 17891，HTTP 为 17892。使用本机已有 http://127.0.0.1:17890，不改系统设置或代理配置。

系统 DNS 的 198.18.* 是当前网络的保留地址返回，仍由地址校验拒绝。上游已支持 EGRESS_PROXY_URL，通过代理发出可信 DNS-over-HTTPS 查询、校验地址，并固定 CONNECT 的目标 IP，保留原始 Host、SNI 和 TLS 证书校验。

SFDA 的 DNS 查询另有可复现问题：Cloudflare 和 Google 都返回 A 查询 Status=0、地址 195.189.212.79；AAAA 查询 Status=2，权威服务器拒绝 IPv6 查询。旧 Promise.all 因 AAAA 失败连成功的 A 也丢弃。响应字段含义参考 [Cloudflare JSON API](https://developers.cloudflare.com/1.1.1.1/encryption/dns-over-https/make-api-requests/dns-json/) 与 [Google JSON API](https://developers.google.com/speed/public-dns/docs/doh/json) 。

packages/backend/src/lib/egress-proxy.ts 仅修改双栈查询结果的汇总：保留成功查询的地址；两类都失败或没有地址仍失败；任意返回地址属于私网、保留段或非法值仍整体拒绝。原来的固定 IP、Host、SNI、TLS、期限、缓存和并发合并机制保留；没有改用系统假地址，没有关闭 DNSSEC 或地址校验，没有硬编码 SFDA 的 IP。

## 实际 HTTP 验证

scripts/check-sources.ts 使用生产 RSS／web_list 读取器、日期与过滤规则，并直接用 guardedFetch＋Readability 验证一篇详情；不写数据库、不调用模型、不使用 Jina 回退。无日期、无正文、网络失败会以非零退出码报告阶段和安全的错误码。

| 源 | 原始条目 | 过滤后 | 有日期 | 详情 HTTP | 正文字符 |
|---|---:|---:|---:|---:|---:|
| MAFF | 36 | 36 | 36 | 200 | 879 |
| ABPA | 10 | 10 | 10 | 200 | 892 |
| SFDA | 6 | 5 | 5 | 200 | 1394 |

3 个样本均无标题乱码，详情检查保留列表的可信发布时间。MAFF 与 SFDA 的 Readability 正文日期未知时，不清空已经从列表取得的日期。该命令曾遇到一次 ABPA fetch failed，随后复测及实际采集通过；这不是长期稳定性或持续运行的保证。

## 实际隔离库采集

在本次新建的 poultry_network_20261007_test 上运行 collectSource，未启动 worker。首轮每源收 3 条，遵守初始回填限制；MAFF、SFDA 各实际提取一篇正文，ABPA 首轮的 3 条已带可用正文。库中样本正文分别为 3978、3967、1394 字符。

MAFF 第二轮补收 7 条不同的近期资料，这是上游回填窗口行为，不是重复。第三轮所有源 created=0、revised=0，MAFF 使用 304；最终 MAFF 10、ABPA 3、SFDA 3 条，共 16 条、16 个唯一材料身份，16 条都有日期。receipts=0、analyses=0，无模型或付费回退请求。

## 可复用命令

```powershell
Set-Location D:\dev\projects\poultry_news
node scripts/check-sources.ts --proxy http://127.0.0.1:17890
```

命令会在自己的进程中强制关闭自动采集、模型、推送和私网放行。退出码 0 表示这次各源的列表、日期和样本正文检查成功，不表示所有列表正文、业务相关性或自动调度已验收。

后续启动 API／worker 时，需在各自的启动终端或容器设置 EGRESS_PROXY_URL。当前只验证网络时保持以下值：

```powershell
$env:EGRESS_PROXY_URL='http://127.0.0.1:17890'
$env:COLLECT_ENABLED='false'
$env:MODEL_CALLS_ENABLED='false'
$env:FEISHU_CONTENT_PUSH_ENABLED='false'
$env:FEISHU_INTERNAL_ENABLED='false'
$env:INDEXNOW_SUBMIT_ENABLED='false'
```

API、worker 和检查命令读取自己的进程环境，已运行进程不会因另一终端设置变量自动更新。Docker 中的 127.0.0.1 指容器自身，不能把本机代理地址原样当成容器出口；需单独验证实际可达的宿主机代理路径，不自动开启 allow-lan。

## 回归与边界

- 先补回归，原实现稳定复现 A-only／AAAA-only 两项失败；修复后协议与安全测试 12／12 通过。
- 类型检查通过，独立测试 169／169 通过，Windows 适用数据库诊断 654／654 通过；前端构建与真实站点 smoke 30／30 通过。
- Windows 诊断仍未包含原有 analyze-shutdown、translate-shutdown、backup 三个 POSIX 专属文件，不宣称完整 npm test 全绿。
- 没有新增依赖、数据库字段或迁移，没有修改 .env、密钥、系统 DNS 或代理，没有提交／推送。Core 的唯一新增差异是上述通用双栈 DNS 缺陷修复。
- 验证证据保存在 .tmp/network-ingest/，结论已记录在本文件；正式检查入口不依赖临时目录。采集到的内容并不全与禽肉相关，真实模型过滤、预算和业务日报质量属于下一步。
