---
name: durable-execution-review
description: 审查拟议长时间智能体部署的持久执行形态：活动、确定性、检查点后端、人工输入状态、恢复时 HITL。
version: 1.0.0
phase: 15
lesson: 12
tags: [durable-execution, workflows, checkpointing, temporal, langgraph, agents-sdk]
---

给定拟议长时间智能体部署（Temporal + OpenAI Agents SDK、带 PostgreSQL 检查点器的 LangGraph、Microsoft Agent Framework、Claude Code Routines、Cloudflare Durable Objects 或内部等价实现），按持久执行（Durable execution）模式审计设计。

请输出：

1. **活动清单（Activity inventory）。** 列出每个活动（LLM 调用、工具调用、HTTP 请求、文件写入），确认均包装为带重试策略、超时、幂等键的活动。活动封装外的原始 LLM 调用是可靠性漏洞。
2. **工作流确定性（Workflow determinism）。** 找出工作流代码内的所有非确定性读取（实际时钟、随机数、外部状态），必须逐一注册为副作用活动，使重放返回同值。隐藏非确定性是重放漂移最常见原因。
3. **检查点后端（Checkpoint backend）。** 说明使用的后端（PostgreSQL、SQLite、Redis、Durable Objects），确认重新部署后检查点数据仍然保留。SQLite 仅用于开发；Redis 需要配置 AOF 或快照；Cloudflare Durable Objects 对调用方透明地处理存储，但必须严格管理唯一键。
4. **人工输入状态（Human-input state）。** 确认 HITL 暂停是一等工作流状态，而非轮询循环。工作流应阻塞等待外部信号（批准队列、webhook、`interrupt()` 基本机制），在批准到达时准确恢复。
5. **恢复时 HITL 策略（HITL-on-resume policy）。** 对崩溃后恢复，说明下一活动执行前是否需新 HITL。否则，持久执行结合崩溃前批准，可能在上下文已变时重新触发获准动作。长时程下尤其重要。

必须拒绝：
- 使用 Agent SDK 却不将 LLM 调用包装为活动。
- 重新部署后无法保留检查点数据的后端。
- 工作流嵌入实际时钟或随机数却未包装为活动。
- 将人工输入建模为轮询而非信号。
- 超过一小时的长时程运行没有恢复时 HITL 策略。
- 持久性上未叠加预算紧急停止开关（第 13 课）的运行。

拒绝规则：
- 若持久工作流的副作用活动无明确幂等性，拒绝，要求先有幂等键，否则重试会重复执行。
- 若用户无法展示重放测试（运行工作流、中途崩溃、重放、断言无重复副作用），拒绝，要求生产前完成测试。
- 若拟议 24 小时无人值守运行无 HITL 检查点，拒绝。即使持久性正确，35 分钟退化（第 12 课说明）也使其成为可靠性问题。

输出格式：

返回设计审查备忘录，包含：
- **活动表（Activity table）**：活动、重试策略、超时、幂等键
- **确定性审计（Determinism audit）**：非确定性读取及各自处理方式
- **检查点后端（Checkpoint backend）**：名称、重新部署后是否保留数据 y/n、重放测试状态
- **HITL 状态形态（HITL state shape）**：一等状态 / 轮询 / 缺失
- **恢复时 HITL 策略（HITL-on-resume policy）**：明确说明并给理由
- **就绪性（Readiness）**：生产 / 预发布 / 仅研究
