# MCPA 来源核验台账（MCPA Source Verification Ledger）

本课程中的每项考试信息都对应一个官方来源，并记录检索日期；协议信息对应 MCP 规范。课程和题目均为原创。来源变化时，应在此更新相应信息及日期。以下为上游保存的核验记录，本次只翻译记录，未重新查询来源，也未刷新核验日期。

## 来源（Sources）

- **PAGE**：MCPA 认证页面，https://training.linuxfoundation.org/certification/model-context-protocol-associate-mcpa/ （检索于 2026-09-24；页面最后修改于 2026-09-16）。
- **PRESS**：MCPA 发布公告，https://www.linuxfoundation.org/press/agentic-ai-foundation-launches-mcpa-certification-to-validate-mcp-expertise （Linux Foundation，2026 年 9 月 14 日）。
- **SPEC**：模型上下文协议 2026-07-28 版规范，https://modelcontextprotocol.io/specification/2026-07-28 。

## 已核验的考试信息（Verified exam facts）

| 信息（Fact） | 值（Value） | 来源（Source） | 备注（Notes） |
|------|-------|--------|-------|
| 认证 | 模型上下文协议助理认证（Model Context Protocol Associate，MCPA） | PAGE, PRESS | 首个官方 MCP 认证，也是 Agentic AI Foundation 的首项认证。 |
| 提供方 | Agentic AI Foundation，由 Linux Foundation Training and Certification 提供考试 | PAGE, PRESS | 厂商中立。 |
| 级别 | 入门／基础（Beginner / Foundational） | PAGE | 原字段为“Experience Level: Beginner”。 |
| 形式 | 在线监考，多项选择题 | PAGE, PRESS | |
| 时限 | 90 分钟 | PAGE | PAGE 写为“Duration of Exam 90 minutes”，PRESS 则写为 120 分钟。本课程采用认证页面的 90 分钟，并标出差异。依赖任一数值前，应重新核实。 |
| 费用 | 仅考试为 250 美元 | PAGE | 包含 THRIVE-ONE 年度订阅的组合为 495 美元。 |
| 认证有效期 | 2 年 | PAGE | |
| 报考资格有效期 | 12 个月 | PAGE | |
| 补考 | 包含一次补考 | PAGE | |
| 对齐规范 | MCP 2026-07-28 | PAGE, PRESS, SPEC | 上游核验时，考试对齐这一 MCP 发布版本。 |
| 题目数量 | 未公布 | PAGE | 官方页面没有列出题数。本课程完整模拟卷的 60 题只是练习规模，不能当作官方数字。 |
| 及格分数 | 未公布 | PAGE | 未公布换算分数或及格界限。 |
| 先修要求 | 无硬性要求，列有建议经验 | PAGE | JSON-RPC、LLM API、智能体模式、安全基础，以及阅读 MCP 清单。 |

## 已核验的领域与权重（Verified domains and weights）

来源为 PAGE 的“Domains and Competencies”部分，并由 PRESS 佐证。

| 领域（Domain） | 权重（Weight） | 子能力，保留公开名称（Sub-competencies, as published） |
|--------|--------|---------------------------------|
| MCP 基础（MCP Fundamentals） | 16% | MCP 的目的与范围（MCP Purpose and Scope）；MCP 核心概念（Core MCP Concepts）；互操作性与价值（Interoperability and Value） |
| 架构与组件（Architecture and Components） | 14% | 模式与结构化数据（Schemas and Structured Data）；MCP 宿主、客户端与服务器（MCP Hosts, Clients and Servers）；模型交互流程（Model Interaction Flow） |
| 交互与执行（Interactions and Execution） | 26% | 交互模式与响应处理（Interaction Patterns and Response Handling）；错误处理（Error Handling）；工具调用生命周期（Tool Invocation Lifecycle）；协议原语（Protocol Primitives） |
| 安全与治理（Security and Governance） | 24% | 信任边界（Trust Boundaries）；权限与同意授权（Permissions and Consent）；风险与安全控制（Risk and Safety Controls）；可审计性与可观测性（Auditability and Observability） |
| 用例与生态（Use Cases and Ecosystem） | 20% | 角色、职责与采用路径（Roles, Responsibilities and Adoption）；实际运行用例（Operational Use Cases）；生态与可移植性（Ecosystem and Portability） |

权重合计 100%。`tracks/mcpa-f.json` 中的领域目标是依据这些公开子能力名称和 MCP 2026-07-28 规范编写的原创学习目标，没有复制保密考试目标。
