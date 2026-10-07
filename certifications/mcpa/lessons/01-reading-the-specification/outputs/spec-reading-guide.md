# 规范阅读指南（Spec Reading Guide）

按照考试所采用的方法阅读 MCP 2026-07-28 规范的单页参考。

## 从哪里开始

- 规范索引：所有实现 MUST 支持基础协议、版本管理和消息模式；授权、服务器功能、客户端功能、实用功能则 MAY 按需添加。
- schema.ts 是所有消息和结构的权威来源；schema.json 由它生成，供工具使用，不具有独立权威。
- 本课程对应的当前修订版为 2026-07-28。修订版有 Draft、Current、Final 三种状态，同一时刻只有一个 Current。

## 理解 MUST、SHOULD 与 MAY

| 关键字（仅限全大写） | 强度 |
|---|---|
| MUST, SHALL, REQUIRED | 必需（required） |
| MUST NOT, SHALL NOT | 禁止（forbidden） |
| SHOULD, RECOMMENDED | 建议（recommended） |
| SHOULD NOT, NOT RECOMMENDED | 不建议（not recommended） |
| MAY, OPTIONAL | 可选（optional） |

根据 BCP 14（RFC 2119、RFC 8174），普通说明中小写的 must、should、may 不具有规范性强度。只有与规范一致的全大写形式才有效。

## 功能状态与修订版状态

整份带日期的规范修订版处于 Draft、Current 或 Final 状态。单项功能——一条消息、一种能力或一种传输——处于 Active、Deprecated 或 Removed 状态，由弃用功能注册表追踪。两者独立；Current 修订版内的某项功能可以为 Deprecated，而不改变修订版自身状态。

## 弃用时间安排

- 最短弃用窗口为十二个月，从首次将功能标记为 Deprecated 的规范修订版发布日计算，不从相关 SEP 达到 Final 时计算。
- 最早移除机会是窗口结束当天或之后发布的首个 Current 修订版。实际移除仍需核心维护者在发布时决定；功能可以远超最短期限仍保持 Deprecated。
- 后续取代原提案的 SEP 可以将 Deprecated 功能恢复为 Active。

## 阅读 SEP 及变更日志

- SEP 是 seps 目录中的 Markdown 文件，经历 draft、in review、accepted、final；其他可能结果包括 rejected、withdrawn、dormant、superseded。
- 四种类型：标准类（Standards Track）、信息类（Informational）、流程类（Process）、扩展类（Extensions Track）。
- 变更日志引用产生该变更的 SEP。应打开提案文件，核对精确规范文本、理由及是否确实达到 Final，避免只依赖一句摘要。

## 考试要点

- Deprecated 功能仍存在。Roots、Sampling、Logging 和 Dynamic Client Registration 在 2026-07-28 中被弃用，但仍按规范正常工作。
- JSON-RPC 批处理在 2025-03-26 发布的版本中加入，下一版 2025-06-18 就被移除，未提供弃用窗口；这一缺口促成了功能生命周期政策。
- schema.ts 与 schema.json 不一致时，以 schema.ts 为准。

来源：`certifications/mcpa/research/mcp-2026-07-28-brief.md` 第 1、15 节。
