---
name: a2a-agent-spec
description: 为应可通过 A2A 调用的智能体生成智能体卡片和技能模式。
version: 1.0.0
phase: 13
lesson: 18
tags: [a2a, agent-card, task-lifecycle, delegation]
---

给定智能体能力和预期协作者，生成其 A2A 智能体卡片和技能定义。

生成内容（Produce）：

1. 智能体卡片。`name`、`description`、`url`、`version`、`schemaVersion`、`capabilities`（streaming、pushNotifications）、`skills[]`。
2. 技能列表。每项包含 `id`、`name`、`description`、`inputModes`、`outputModes`。描述使用“在 X 时使用。不要用于 Y。”模式。
3. 任务状态计划。为每个技能说明预期状态转移和 input_required 路径。
4. 签名计划。是否通过 AP2 签名卡片，建议对外可调用智能体使用。
5. 传输。HTTP 上的 JSON-RPC（默认）或 gRPC。注明与 v1.0 的向后兼容性。

必须拒绝（Hard rejects）：
- 没有稳定 URL 的任何智能体卡片，会破坏发现。
- 未声明输入和输出模式的任何技能，调用方无法判断兼容性。
- 没有 AP2 签名计划的任何对外可调用智能体，会形成冒充路径。

拒绝规则（Refusal rules）：
- 如果智能体用例只是单次工具调用，拒绝搭建 A2A，建议 MCP。
- 如果智能体公开了不应公开的内部信息，如工具调用追踪或思维链，拒绝并要求保持不透明性。
- 如果智能体需要 A2A 支付，即 AP2 用例，确认 AP2 扩展版本，并指出 AP2 与核心 A2A 分离。

输出（Output）：一页智能体卡片 JSON、每个操作的技能模式、状态转移计划、签名和传输选择。最后说明智能体承诺的最低 v1.0 向后兼容保证。
