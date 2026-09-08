# A2A：智能体间协议（The Agent-to-Agent Protocol）

> Google 于 2025 年 4 月宣布 A2A；到 2026 年 4 月，规范位于 https://a2a-protocol.org/latest/specification/，已有 150 多个组织支持。A2A 是 MCP（第 13 课）的横向补充：MCP 是纵向（智能体 ↔ 工具），A2A 是对等（智能体 ↔ 智能体）。它定义智能体卡片（发现）、带交付物的任务（文本、结构化数据、视频）、不透明任务生命周期和认证。生产系统越来越多地结合 MCP 与 A2A。Google Cloud 在 2025–2026 年为 Vertex AI Agent Builder 加入 A2A 支持。

**Type:** Learn + Build
**Languages:** Python (stdlib, `http.server`, `json`)
**Prerequisites:** Phase 16 · 04 原语模型（Primitive Model）
**Time:** ~75 分钟

## 问题（Problem）

你的智能体需要调用另一系统上的智能体，如何做？可以暴露 HTTP 端点、定义定制 JSON 模式，并期待对方理解。每对智能体都变成定制集成。

A2A 是用于这种调用的通用传输协议。标准发现、任务模型、传输、交付物。类似 HTTP+REST，但把智能体作为一等公民。

## 概念（Concept）

### 四个要素（The four elements）

**智能体卡片（Agent Card）。** 位于 `/.well-known/agent.json` 的 JSON 文档，描述名称、技能、端点、支持模态、认证要求。通过读取卡片完成发现。

```
GET https://agent.example.com/.well-known/agent.json
→ {
    "name": "code-review-agent",
    "skills": ["review-python", "review-typescript"],
    "endpoints": {
      "tasks": "https://agent.example.com/tasks"
    },
    "auth": {"type": "bearer"},
    "modalities": ["text", "structured"]
  }
```

**任务（Task）。** 工作单位，是具有生命周期的异步有状态对象：`submitted → working → completed / failed / canceled`。客户端发送任务，轮询或订阅更新。

**交付物（Artifact）。** 任务产出的结果类型：文本、结构化 JSON、图像、视频、音频。交付物带类型，使不同模态都是一等公民。

**不透明生命周期（Opaque lifecycle）。** A2A 不规定远程智能体*如何*解决任务。客户端看到状态转换与交付物，实现可自由使用任何框架。

### MCP/A2A 分工（The MCP/A2A split）

- **MCP**（第 13 课）：智能体 ↔ 工具。智能体通过 JSON-RPC 对工具服务器读写，默认无状态。
- **A2A**：智能体 ↔ 智能体。对等协议，双方都是具有自身推理的智能体。

生产多智能体系统同时使用两者。A2A 对等方在自身一侧调用 MCP 工具，分工使两个关注点清晰。

### 发现流程（Discovery flow）

```
客户端                     智能体服务器
  ├──GET /.well-known/agent.json──>
  <──智能体卡片（Agent Card）JSON─
  ├──POST /tasks {skill, input}──>
  <──201 task_id, state=submitted
  ├──GET /tasks/{id}──────────────>
  <──state=working，已完成 42%────
  ├──GET /tasks/{id}──────────────>
  <──state=completed, artifacts──
```

也可流式处理：通过 SSE 订阅 `/tasks/{id}/events` 接收推送更新。

### 认证（Auth）

A2A 支持三种常见模式：

- **持有者令牌（Bearer token）**：OAuth2 或不透明令牌。
- **双向 TLS（mTLS）**：组织相互证明身份。
- **签名请求（Signed requests）**：对有效载荷计算 HMAC。

认证要求在智能体卡片中声明，客户端发现后遵循。

### 到 2026 年 4 月已有 150 多个组织（150+ organizations by April 2026）

企业采用推动 A2A 扩展。关键在于：A2A 成为企业智能体跨信任边界的方式。Google Cloud 为 Vertex AI Agent Builder 推出 A2A 支持，Microsoft Agent Framework 也支持，多数主要框架（LangGraph、CrewAI、AutoGen）提供 A2A 适配器。

### A2A 的优势（Where A2A wins）

- **跨组织调用。** A 公司智能体调用 B 公司智能体。没有 A2A，每对都需定制契约。
- **异构框架。** LangGraph 智能体调用 CrewAI，再调用自定义 Python 智能体，A2A 统一接口。
- **类型化交付物。** 视频结果、结构化 JSON、音频都是一等公民。
- **长任务。** 不透明生命周期 + 轮询使数小时任务易于处理。

### A2A 的困难场景（Where A2A struggles）

- **延迟敏感的微调用。** A2A 生命周期是异步的，不适合亚毫秒智能体间调用，应直接用 RPC。
- **进程内紧耦合智能体。** 两者同处一个 Python 进程时，A2A 的 HTTP 往返过于繁重。
- **小团队。** 规范有实际开销，纯内部智能体未必需要如此正式。

### A2A 与 ACP、ANP、NLIP（A2A vs ACP, ANP, NLIP）

2024–2026 年出现了数种相关规范：

- **ACP**（IBM/Linux Foundation）：A2A 前身，范围更窄。
- **ANP**（Agent Network Protocol）：侧重对等发现，去中心化优先。
- **NLIP**（Ecma 自然语言交互协议，Natural Language Interaction Protocol，2025 年 12 月标准化）：自然语言内容类型。

截至 2026 年 4 月，A2A 是采用最多的对等协议。比较见 arXiv:2505.02279，Liu 等《智能体互操作协议综述》。

```figure
sw-agent-card-discovery
```

## 动手实现（Build It）

`code/main.py` 使用 `http.server` 和 JSON 实现最小 A2A 服务器与客户端。服务器：

- 暴露 `/.well-known/agent.json`，
- 接收 `POST /tasks`，
- 管理任务状态，
- 通过 `GET /tasks/{id}` 返回交付物。

客户端：

- 获取智能体卡片，
- 提交任务，
- 轮询直到完成，
- 读取交付物。

运行：

```
python3 code/main.py
```

脚本在后台线程启动服务器，再运行客户端访问它。你会看到完整流程：发现、提交、轮询、交付物。

## 实际应用（Use It）

`outputs/skill-a2a-integrator.md` 设计 A2A 集成：智能体卡片内容、任务模式、认证选择、流式或轮询。

## 交付成果（Ship It）

检查清单：

- **固定规范版本。** A2A 仍在演进，智能体卡片应声明协议版本。
- **幂等任务创建。** 重复提交（网络重试）应只产生一个任务。
- **交付物模式。** 声明智能体返回形状，消费者应验证。
- **限流 + 认证。** A2A 面向公网，应用标准 Web 安全措施。
- **失败任务进入死信。** 随时间检查模式，识别反复出现的故障类型。

## 练习（Exercises）

1. 运行 `code/main.py`，确认客户端发现服务器并收到正确交付物。
2. 为服务器增加第二项技能（如“summarize”），更新智能体卡片，编写按任务类型选择技能的客户端。
3. 实现发出状态变化的 SSE 端点 `/tasks/{id}/events`。客户端需要怎样改变？
4. 阅读 A2A 规范（https://a2a-protocol.org/latest/specification/），指出规范要求但演示未实现的三项内容。
5. 比较 A2A 卡片发现与 MCP 通过 `listTools` 列举服务器能力。自描述智能体和能力探测之间有何权衡？

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|------|----------------|------------------------|
| A2A | “智能体到智能体” | 跨系统调用其他智能体的对等协议，Google 2025。 |
| 智能体卡片（Agent Card） | “智能体名片” | `/.well-known/agent.json` 中描述技能、端点、认证的 JSON。 |
| 任务（Task） | “工作单位” | 有生命周期的异步有状态对象，完成后产出交付物。 |
| 交付物（Artifact） | “结果” | 类型化输出：文本、结构化 JSON、图像、视频、音频，媒体是一等公民。 |
| 不透明生命周期（Opaque lifecycle） | “如何解决归智能体管” | 客户端看到状态转换，服务器自由选择框架/工具。 |
| 发现（Discovery） | “找到智能体” | `GET /.well-known/agent.json` 返回卡片。 |
| MCP 与 A2A（MCP vs A2A） | “工具与对等方” | MCP 纵向智能体 ↔ 工具，A2A 横向智能体 ↔ 智能体。 |
| ACP / ANP / NLIP | “兄弟协议” | 相邻规范，2026 年 A2A 采用最多。 |

## 延伸阅读（Further Reading）

- [A2A 规范（A2A specification）](https://a2a-protocol.org/latest/specification/)：标准规范
- [Google Developers Blog：A2A 公告（A2A announcement）](https://developers.googleblog.com/en/a2a-a-new-era-of-agent-interoperability/)：2025 年 4 月发布文章
- [A2A GitHub 仓库（repo）](https://github.com/a2aproject/A2A)：参考实现与 SDK
- [Liu 等：智能体互操作协议综述（A Survey of Agent Interoperability Protocols）](https://arxiv.org/html/2505.02279v1)：MCP、ACP、A2A、ANP 对比
