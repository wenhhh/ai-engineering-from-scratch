# 资源设计指南（Resource Design Guide）

设计与审查 MCP 资源的一页参考，对齐 MCP 2026-07-28。

## 三个方法

| 方法 | 返回内容 | 是否可缓存 |
|---|---|---|
| `resources/list` | 调用方可见资源目录：uri、name、description、mimeType、icons | 是，携带 ttlMs、cacheScope |
| `resources/templates/list` | 适用于资源族的 RFC 6570 URI 模板 | 是，携带 ttlMs、cacheScope |
| `resources/read` | 在 `contents` 中返回指定 uri 的一个或多个内容项 | 是，携带 ttlMs、cacheScope |

## 选择 URI 方案

| 方案 | 适用情况 | 注意事项 |
|---|---|---|
| `https://` | 客户端可直接从网页获取相同字节 | 服务器是唯一访问路径时，宜采用其他方案 |
| `file://` | 内容表现为文件系统结构 | 不必对应真实文件系统，每个路径片段都要校验 |
| `git://` | 内容受版本控制 | 在 authority 或路径中标识 ref，不放在查询字符串中 |
| 自定义 | 其他情况 | 遵循 RFC 3986，并用服务器所属领域限定命名空间 |

## 内容结构

- 文本：`{"uri": ..., "mimeType": ..., "text": ...}`
- 二进制：`{"uri": ..., "mimeType": ..., "blob": "<base64>"}`
- 单次读取可以在 `contents` 中返回多项，例如目录类资源返回其下多个文件。

## 错误处理清单

- [ ] 缺失或无效资源返回 JSON-RPC 错误 `-32602`（Invalid params），不能使用 `-32601` 或 `-32002`。
- [ ] `error.data.uri` 标明请求的资源。
- [ ] 资源不存在时，不返回带空 `contents` 数组的 complete 结果。
- [ ] 内部失败使用 `-32603`，不能冒充资源不存在。
- [ ] 客户端仍识别旧服务器的 `-32002`，但 2026-07-28 服务器不能发送该代码。

## 缓存范围决策表

| 内容 | cacheScope | 典型 ttlMs |
|---|---|---|
| 对所有调用方完全相同的公开目录或变更日志 | `public` | 数分钟至数小时 |
| 内容依赖已认证调用方的资源 | `private` | 数秒至数分钟 |
| 每次读取都会变化的内容 | 两者均可，按授权范围选择 | `0` |

`cacheScope` 定义共享边界，本身不提供访问控制。无论缓存提示如何，每次读取仍须授权。

## 安全检查清单

- [ ] URI 进入存储或数据库查询前先校验。
- [ ] 按虚拟根目录清理路径，例如 `posixpath.normpath("/" + tail)`，确保 `..` 序列不能解析到该根目录之外。
- [ ] 每次读取独立授权；资源在 `resources/list` 中可见，不等于所有调用方自动有权读取。
- [ ] 二进制内容先编码为 base64，再放入 `blob`，不能把原始字节塞进 `text`。
- [ ] 资源进入模型时按不可信数据处理，不能提升为指令。

## 考试要点

- 资源由应用驱动，宿主决定何时放入上下文，模型不负责这一选择。
- `-32602` 是现代版本的资源不存在错误码，携带 `data.uri`；`-32002` 仅用于兼容旧版。
- 空 `contents` 数组不能用来报告资源不存在。
- `resources/read` 属于六种完整结果必须携带 `ttlMs` 和 `cacheScope` 的操作。
- 现代订阅使用带 `resourceSubscriptions` 过滤器的 `subscriptions/listen`，替代已移除的 `resources/subscribe`。

来源：`certifications/mcpa/research/mcp-2026-07-28-brief.md`，第 10 节。
