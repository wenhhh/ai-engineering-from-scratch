# A2A：智能体间协议（Agent-to-Agent Protocol）

> MCP 是智能体到工具。A2A（Agent2Agent）是智能体到智能体，是让不同框架构建、内部不透明的智能体协作的开放协议。Google 于 2025 年 4 月发布，2025 年 6 月捐赠给 Linux Foundation，2026 年 4 月达到 v1.0，获得包括 AWS、Cisco、Microsoft、Salesforce、SAP 和 ServiceNow 在内的 150 多家支持者。它吸收了 IBM 的 ACP，并加入 AP2 支付扩展。本课介绍智能体卡片、任务生命周期和两种传输绑定。

**Type:** Build
**Languages:** Python (stdlib, Agent Card + Task harness)
**Prerequisites:** Phase 13 · 06（MCP 基础），Phase 13 · 08（MCP 客户端）
**Time:** ~75 分钟

## 学习目标（Learning Objectives）

- 区分智能体到工具（MCP）和智能体到智能体（A2A）的用例。
- 在 `/.well-known/agent.json` 发布包含技能和端点元数据的智能体卡片（Agent Card）。
- 走完任务（Task）生命周期：submitted → working → input-required → completed / failed / canceled / rejected。
- 使用带部件（Parts：文本、文件、数据）的消息（Messages），并以制品（Artifacts）作为输出。

## 问题（The Problem）

客服智能体需要将报告撰写委托给专门的写作智能体。A2A 出现前的选项：

- 自定义 REST API。可行，但每种配对都是一次性集成。
- 共享代码库。要求两个智能体运行相同框架。
- MCP。不合适：MCP 用于调用工具，而不是让两个智能体在保留各自不透明内部推理的同时协作。

A2A 填补了空白。它将交互建模为一个智能体向另一个发送任务，具有生命周期、消息和制品。被调用智能体的内部状态保持不透明，调用方只看到任务状态转移和最终输出。

A2A 是“让跨框架智能体相互对话”的协议。它不替代 MCP，两者互补。

## 概念（The Concept）

### 智能体卡片（Agent Card）

每个符合 A2A 的智能体在 `/.well-known/agent.json` 发布卡片：

```json
{
  "schemaVersion": "1.0",
  "name": "research-agent",
  "description": "Summarizes academic papers and drafts citations.",
  "url": "https://research.example.com/a2a",
  "version": "1.2.0",
  "skills": [
    {
      "id": "summarize_paper",
      "name": "Summarize a paper",
      "description": "Read a paper PDF and produce a 3-paragraph summary.",
      "inputModes": ["text", "file"],
      "outputModes": ["text", "artifact"]
    }
  ],
  "capabilities": {"streaming": true, "pushNotifications": true}
}
```

发现基于 URL：获取卡片，了解 A2A 端点 URL，枚举技能。

### 已签名智能体卡片（Signed Agent Cards，AP2）

AP2 扩展于 2025 年 9 月为智能体卡片添加密码学签名。发布者用 JWT 签名自己的卡片，消费者验证，以防冒充。

### 任务生命周期（Task lifecycle）

```
submitted -> working -> completed | failed | canceled | rejected
             -> input_required -> working（通过消息循环）
```

客户端通过 `tasks/send` 发起。被调用智能体在状态间转移，客户端通过 SSE 订阅状态更新或轮询。

### 消息与部件（Messages and Parts）

消息携带一个或多个部件：

- `text`：普通内容。
- `file`：带 mimeType 的 base64 二进制块。
- `data`：类型化 JSON 载荷，即被调用智能体的结构化输入。

示例：

```json
{
  "role": "user",
  "parts": [
    {"type": "text", "text": "Summarize this paper."},
    {"type": "file", "file": {"name": "paper.pdf", "mimeType": "application/pdf", "bytes": "..."}},
    {"type": "data", "data": {"targetLength": "3 paragraphs"}}
  ]
}
```

### 制品（Artifacts）

输出是制品，不是原始字符串。制品是有名称、有类型的输出：

```json
{
  "name": "summary",
  "parts": [{"type": "text", "text": "..."}],
  "mimeType": "text/markdown"
}
```

制品可分块流式输出，由调用方累积。

### 两种传输绑定（Two transport bindings）

1. **HTTP 上的 JSON-RPC（JSON-RPC over HTTP）。** `/a2a` 端点，请求使用 POST，流式输出可选 SSE。这是默认绑定。
2. **gRPC。** 面向原生使用 gRPC 的企业环境。

两种绑定承载相同的逻辑消息结构。

### 保持不透明性（Opacity preservation）

核心设计原则是：被调用智能体的内部状态不透明。调用方看到任务状态和制品。被调用智能体的思维链、工具调用、子智能体委托全部不可见。这与工具调用透明的 MCP 不同。

理由是 A2A 让竞争者无需公开内部实现也能协作。A2A 可以表达“调用这个客服智能体”，而调用方不必知道它如何实现服务。

### 时间线（Timeline）

- **2025-04-09。** Google 宣布 A2A。
- **2025-06-23。** 捐赠给 Linux Foundation。
- **2025-08。** 吸收 IBM 的 ACP。
- **2025-09。** AP2 扩展（Agent Payments）发布。
- **2026-04。** v1.0 发布，支持组织超过 150 家。

### 与 MCP 的关系（Relationship to MCP）

| 维度 | MCP | A2A |
|-----------|-----|-----|
| 用例 | 智能体到工具 | 智能体到智能体 |
| 不透明性 | 透明工具调用 | 不透明内部推理 |
| 典型调用方 | 智能体运行时 | 另一个智能体 |
| 状态 | 工具调用结果 | 带生命周期的任务 |
| 授权 | OAuth 2.1（Phase 13 · 16） | JWT 签名的智能体卡片（AP2） |
| 传输 | Stdio / Streamable HTTP | HTTP 上的 JSON-RPC / gRPC |

想调用特定工具时使用 MCP。想将整个任务委托给另一个智能体时使用 A2A。许多生产系统同时使用两者：智能体的工具层用 MCP，协作层用 A2A。

```figure
a2a-task-lifecycle
```

## 实际应用（Use It）

`code/main.py` 实现最小 A2A 测试框架：研究智能体发布卡片，写作智能体收到带 PDF 和文本指令部件的 `tasks/send`，经过 working → input_required → working → completed，返回文本制品。全部使用标准库，以内存传输聚焦消息结构。

观察：

- 智能体卡片 JSON 结构。
- 任务 id 分配和状态转移。
- 混合类型部件的消息。
- 任务中途需要输入的分支。
- 完成时返回制品。

## 交付（Ship It）

本课生成 `outputs/skill-a2a-agent-spec.md`。给定一个应可被其他智能体调用的新智能体，该技能生成智能体卡片 JSON、技能模式和端点蓝图。

## 练习（Exercises）

1. 运行 `code/main.py`。追踪完整任务生命周期，包括被调用智能体请求澄清时的输入等待暂停。

2. 添加已签名智能体卡片。对卡片规范 JSON 使用 HMAC 签名。编写验证器并确认卡片被修改时验证失败。

3. 实现任务流式输出：写作智能体通过 SSE 发出三个增量制品块，由调用方累积。

4. 设计包装 MCP 服务器的 A2A 智能体。将每个 MCP 工具映射到 A2A 技能。注意权衡：失去了哪些不透明性？

5. 阅读 A2A v1.0 公告，找出截至 2026 年 4 月尚未被任何框架实现的一项功能。提示：与多跳任务委托有关。

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|------|----------------|------------------------|
| A2A | “智能体间协议” | 面向不透明智能体协作的开放协议 |
| 智能体卡片（Agent Card） | “`.well-known/agent.json`” | 描述智能体技能和端点的已发布元数据 |
| 技能（Skill） | “可调用单元” | 智能体支持的具名操作，类似 MCP 工具 |
| 任务（Task） | “委托单元” | 带生命周期和最终制品的工作项 |
| 消息（Message） | “任务输入” | 携带文本、文件和数据部件 |
| 部件（Part） | “类型化块” | 消息中的 `text` / `file` / `data` 元素 |
| 制品（Artifact） | “任务输出” | 完成时返回的具名、类型化输出 |
| AP2 | “智能体支付协议” | 用于信任和支付的已签名智能体卡片扩展 |
| 不透明性（Opacity） | “黑盒协作” | 被调用智能体的内部实现对调用方隐藏 |
| 需要输入（Input-required） | “任务暂停” | 智能体需要更多信息时的生命周期状态 |

## 延伸阅读（Further Reading）

- [a2a-protocol.org](https://a2a-protocol.org/latest/) - A2A 权威规范
- [a2aproject/A2A：GitHub](https://github.com/a2aproject/A2A) - 参考实现和 SDK
- [Linux Foundation：A2A 启动新闻稿](https://www.linuxfoundation.org/press/linux-foundation-launches-the-agent2agent-protocol-project-to-enable-secure-intelligent-communication-between-ai-agents) - 2025 年 6 月治理权转移
- [Google Cloud：A2A 协议升级](https://cloud.google.com/blog/products/ai-machine-learning/agent2agent-protocol-is-getting-an-upgrade) - 路线图和合作伙伴进展
- [Google Dev：A2A 1.0 里程碑](https://discuss.google.dev/t/the-a2a-1-0-milestone-ensuring-and-testing-backward-compatibility/352258) - v1.0 发布说明和向后兼容指导
