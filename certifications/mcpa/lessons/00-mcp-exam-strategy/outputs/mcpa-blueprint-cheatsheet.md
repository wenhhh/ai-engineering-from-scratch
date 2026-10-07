# MCPA 考试大纲速查表

MCPA 考试大纲的单页参考：五个领域、公开权重与子能力，不随所学领域变化的考试安排，旧版协议干扰项检查表，以及完整的 34 课路线。

## 五个领域及权重

| 领域 | 权重 | 公开子能力 |
|--------|--------|----------------------------------|
| MCP 基础（MCP Fundamentals） | 16% | MCP 目的与范围；MCP 核心概念；互操作性与价值 |
| 架构与组件（Architecture and Components） | 14% | 模式与结构化数据；MCP 宿主、客户端和服务器；模型交互流程 |
| 交互与执行（Interactions and Execution） | 26% | 交互模式与响应处理；错误处理；工具调用生命周期；协议原语 |
| 安全与治理（Security and Governance） | 24% | 信任边界；权限与同意；风险与安全控制；可审计性与可观测性 |
| 用例与生态（Use Cases and Ecosystem） | 20% | 角色、职责与采用；实际运行用例；生态与可移植性 |

权重合计 100%。交互与执行、安全与治理共同占据一半大纲，应获得最多的学习时间和额外练习。

## 将权重换算为小时

学习预算为 `H` 小时、领域权重为 `W` 百分比时，该领域分配 `H * W / 100` 小时。40 小时预算的示例：

- MCP 基础（16%）：6.4 小时。
- 架构与组件（14%）：5.6 小时。
- 交互与执行（26%）：10.4 小时。
- 安全与治理（24%）：9.6 小时。
- 用例与生态（20%）：8.0 小时。

使用 `code/main.py` 中的 `allocate_study_hours`，根据自己的预算重新计算。

## 将练习成绩换算为准备度

将每个领域的练习准确率乘以其大纲份额后求和，不采用五个领域的简单平均。未作答领域有意计零分，以暴露覆盖缺口。未知领域名会被拒绝，不会被静默忽略。使用 `code/main.py` 的 `estimate_readiness` 和自己的作答统计重新计算。

## 固定考试信息

- 形式：在线监考、选择题。
- 对齐规范：Model Context Protocol 2026-07-28。
- 费用：仅考试为 250 美元。
- 有效期：2 年。
- 补考：包含一次补考。
- 时长：认证页面为 90 分钟，Linux Foundation 发布新闻稿为 120 分钟。本课程采用认证页面并保留冲突记录；依赖任一数字前应再次核查。
- 题数：两个官方来源均未公布。
- 及格分数：两个官方来源均未公布。

## 阅读题目：识别旧版干扰项

- 首次实际请求前存在配置、握手或版本协商：2026-07-28 没有这些步骤，每个请求通过 `_meta` 自带版本和能力。
- 通过会话或粘性连接记忆跨调用状态：协议没有会话，跨请求状态使用服务器生成的显式句柄，以普通参数传回。
- 用 `-32601` 表示未知工具：正确值是 `-32602`；`-32601` 表示方法本身未知。
- 将参数不符合模式报告为协议错误：这属于工具执行错误，应返回带 `isError: true` 的普通结果，不返回 JSON-RPC 错误。
- 完整陷阱表见 `certifications/mcpa/research/mcp-2026-07-28-brief.md` 第 16 节。

## 34 课学习路线

| 课程标识 | 所属领域 |
|--------|-----------|
| 00 mcp-exam-strategy | MCP 基础 |
| 01 reading-the-specification | MCP 基础 |
| 02 the-integration-problem | MCP 基础 |
| 03 json-rpc-and-meta | MCP 基础, 架构与组件 |
| 04 the-stateless-core | MCP 基础 |
| 05 protocol-eras-and-compatibility | MCP 基础 |
| 06 hosts-clients-and-servers | 架构与组件 |
| 07 discovery-and-capability-negotiation | 架构与组件 |
| 08 tool-schemas-and-structured-content | 架构与组件 |
| 09 reading-server-manifests | 架构与组件 |
| 10 model-interaction-flow | 架构与组件 |
| 11 the-tools-primitive | 交互与执行 |
| 12 the-resources-primitive | 交互与执行 |
| 13 prompts-and-completion | 交互与执行 |
| 14 multi-round-trip-requests-and-elicitation | 交互与执行 |
| 15 deprecated-client-features | 交互与执行 |
| 16 notifications-and-subscriptions | 交互与执行 |
| 17 tool-invocation-lifecycle | 交互与执行 |
| 18 error-handling | 交互与执行 |
| 19 transports-and-http-headers | 交互与执行, 架构与组件 |
| 20 caching-and-pagination | 交互与执行 |
| 21 long-running-work-and-tasks | 交互与执行 |
| 22 trust-boundaries | 安全与治理 |
| 23 oauth-authorization | 安全与治理 |
| 24 client-registration-and-identity | 安全与治理 |
| 25 consent-and-least-privilege | 安全与治理 |
| 26 risk-and-safety-controls | 安全与治理 |
| 27 auditability-and-observability | 安全与治理 |
| 28 roles-and-adoption | 用例与生态 |
| 29 operational-use-cases | 用例与生态 |
| 30 the-extensions-framework | 用例与生态 |
| 31 mcp-apps | 用例与生态 |
| 32 registry-gateways-and-sdk-tiers | 用例与生态 |
| 33 mcpa-capstone-readiness | 全部五个领域 |

使用 `code/main.py` 中的 `allocate_study_hours` 和 `estimate_readiness`，按自己的数字重新计算时间和准备度；同一文件中的 `route_for_domain` 可通过程序查询路线。

上述信息及检索日期的来源：仓库中的 `certifications/mcpa/research/source-verification-ledger.md`。
