# 阶段 13：工具与协议（Phase 13: Tools & Protocols）

> AI 与现实世界之间的接口。

本阶段从函数调用与工具模式走向可互操作协议、Agent Skills、安全和生产治理。编号顺序方便浏览；下方专题路线才是可靠的学习顺序。

## 在 GitHub 开始本阶段（Start this phase on GitHub）

**Prerequisites:** 阶段 11 的 LLM 补全 API。学习 MCP 或 Agent Skills 时，使用下方专题路线，不要假定按课程编号顺序学习。

**全阶段首课：** [工具接口（The Tool Interface）](01-the-tool-interface/)

从仓库根目录运行：

```bash
python3 phases/13-tools-and-protocols/01-the-tool-interface/code/main.py
```

保留命令、退出码、描述-决策-执行-观察跟踪、拒绝输入的证据，以及一句对轮次上限的解释。

**下一步：** 继续[深入函数调用（Function Calling Deep Dive）](02-function-calling-deep-dive/)，或选择下方模型上下文协议（MCP）或 Agent Skills 路线。

浏览[阶段 13 完整课程列表（Full Phase 13 lesson list）](../../README.md#phase-13)或[跨阶段路线图（Cross-phase roadmap）](../../ROADMAP.md)。

## 模型上下文协议路线（Model Context Protocol (MCP) path）

MCP 专题路线共 17 课，约 23 小时 15 分钟。它沿着 MCP `2026-07-28`，从一条自描述 JSON-RPC 请求走到可运维的一致性门禁。

| 阶段 | 课程 | 要证明的内容 | 时长 |
|---|---|---|---:|
| 核心（Core） | [06](06-mcp-fundamentals/), [07](07-building-an-mcp-server/), [08](08-building-an-mcp-client/), [09](09-mcp-transports/), [10](10-mcp-resources-and-prompts/) | 封装、发现、客户端与服务器行为、传输、资源与提示词。 | 5 小时 50 分钟 |
| 双向（Bidirectional） | [11](11-mcp-sampling/), [12](12-mcp-roots-and-elicitation/), [13](13-mcp-async-tasks/), [14](14-mcp-apps/) | 不使用服务器发起请求的 MRTR 输入、显式范围、持久任务与应用边界。 | 5 小时 |
| 安全（Secure） | [15](15-mcp-security-tool-poisoning/), [16](16-mcp-security-oauth-2-1/), [18](18-mcp-auth-production/), [17](17-mcp-gateways-and-registries/) | 投毒防御、授权、生产令牌、网关路由与注册中心准入。 | 5 小时 15 分钟 |
| 进阶（Advanced） | [28](28-mcp-tool-contracts-and-content/), [29](29-mcp-reliability-cancellation-and-flow-control/), [30](30-mcp-registry-supply-chain-and-drift/), [31](31-mcp-conformance-versioning-and-operations/) | 契约保真、取消竞态、供应链漂移与发布证据。 | 7 小时 10 分钟 |

确切顺序为 06、07、08、09、10、11、12、13、14、15、16、18、17、28、29、30、31，定义在 [`learning-paths/model-context-protocol.json`](../../learning-paths/model-context-protocol.json)。导师创建 `MCP-LEARNING.md`，每次调用教一课，记录每个检查点所需的请求、响应、命令、工作目录、退出码和脱敏边界证据。

使用宿主支持的调用方式开始：

| 宿主 | 调用方式 |
|---|---|
| Codex | `learn-mcp`，或从 `/skills` 选择 |
| Claude Code | `/learn-mcp` |
| 其他兼容宿主 | `Use learn-mcp to start or resume the Model Context Protocol (MCP) path.` |

### 最初十分钟（Your first ten minutes）

从仓库根目录运行第 06 课的无状态交互记录：

```bash
python3 phases/13-tools-and-protocols/06-mcp-fundamentals/code/main.py
```

在输出中找到四项：重复请求元数据、完整的 `server/discover` 结果、不支持版本的错误 `-32022`，以及不创建或终止 MCP 协议会话的传输关闭。该交互记录是首个检查点，不只是演示。

仓库或 Python 3 不可用时，阅读[第 06 课（Lesson 06）](06-mcp-fundamentals/)，手工跟踪一组请求与响应。将检查点标为概念性，运行时、传输、授权与部署证据仍待完成。

在任何非回环地址绑定、共享入口、托管端点或注册中心发布之前，完成第 15 课的可执行安全检查点。审查外部目标和请求权限，再显式确认部署动作。完成教程不授予部署权限。

旧版 `initialize`、`Mcp-Session-Id`、独立 SSE `GET`、会话 `DELETE` 和服务器发起请求流程，仅出现在显式兼容说明中。现代请求在 `params._meta` 中声明协议版本和客户端能力，使用 `server/discover`，携带足够信息以独立校验、授权、路由和重试。

[第 23 课（Lesson 23）](23-capstone-tool-ecosystem/)是 MCP 路线唯一可选综合实践。开始之前，完成 17 门必修课及[第 19 课（Lesson 19）](19-a2a-protocol/)和[第 20 课（Lesson 20）](20-opentelemetry-genai/)。

## Agent Skills 快速路线（Agent Skills fast path）

专题路线共五课，约 9 小时 30 分钟：

| 步骤 | 课程 | 成果 | 时长 |
|---:|---|---|---:|
| 1 | [22：可移植契约与运行时边界（Portable Contract and Runtime Boundary）](22-skills-and-agent-sdks/) | 创建、安装、调用、验证并移除完整技能包。 | 90 分钟 |
| 2 | [24：发现与渐进式披露（Discovery and Progressive Disclosure）](24-skill-discovery-and-progressive-disclosure/) | 跟踪发现、编目、激活与资源加载。 | 105 分钟 |
| 3 | [25：调用与路由（Invocation and Routing）](25-skill-invocation-and-routing/) | 控制显式、隐式、人工、模型与弃权路径。 | 105 分钟 |
| 4 | [26：权限、沙箱与信任（Permissions, Sandboxes, and Trust）](26-skill-permissions-sandboxes-and-trust/) | 分开指令、权限、包含性与验证。 | 120 分钟 |
| 5 | [27：评估、打包与可移植性（Evals, Packaging, and Portability）](27-skill-evals-packaging-and-portability/) | 构建发布门禁，在真实宿主中证明行为。 | 150 分钟 |

使用宿主支持的调用方式开始：

| 宿主 | 调用方式 |
|---|---|
| Codex | `learn-agent-skills`，或从 `/skills` 选择 |
| Claude Code | `/learn-agent-skills` |
| 其他兼容宿主 | `Use learn-agent-skills to start or resume the Agent Skills Engineering path.` |

导师创建或恢复 `AGENT-SKILLS-LEARNING.md`，每次调用教一课，记录每个检查点所需证据。路线定义在 [`learning-paths/agent-skills.json`](../../learning-paths/agent-skills.json)。

偏好先阅读时，从[第 22 课（Lesson 22）](22-skills-and-agent-sdks/)开始。其首个实验用约十分钟将技能接入真实宿主。

### 先修快速通道（Prerequisite fast lane）

- 真实实验需要 `node`、`npx`、`python3`，一个选定的支持技能的宿主，以及所选项目或用户技能范围的写权限。安装前用 `node --version`、`npx --version` 和 `python3 --version` 验证三个命令。
- 无法完成预检时，使用网站或手工阅读各 `docs/en.md`。可以完成概念工作，但发现、调用、脚本、更新和卸载证据仍标为待完成。
- 不熟悉工具契约时，略读[第 01 课（Lesson 01）](01-the-tool-interface/)和[第 05 课（Lesson 05）](05-tool-schema-design/)。
- 第 26 课之前，确认你能解释工具投毒和不可信指令。[第 15 课（Lesson 15）](15-mcp-security-tool-poisoning/)是该预检的可选复习，不是这条路线的第六门必修课。
- [第 23 课（Lesson 23）](23-capstone-tool-ecosystem/)是可选系统综合实践，不是第 22 课之后的下一门 Agent Skills 课。开始之前完成第 06 至 20 课。

## 完整阶段（Full phase）

完整课程计划见[路线图（ROADMAP.md）](../../ROADMAP.md)。
