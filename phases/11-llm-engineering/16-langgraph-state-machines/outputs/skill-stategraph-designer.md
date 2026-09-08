---
name: stategraph-designer
description: 将智能体任务转化为 LangGraph StateGraph，包含命名节点、类型化状态、归约器、检查点保存器和人工中断。
version: 1.0.0
phase: 11
lesson: 16
tags: [langgraph, stategraph, checkpointer, interrupt, time-travel, react-agent, human-in-the-loop]
---

给定智能体任务，包括面向用户的目标、可用工具、预期轮次、副作用及其安全影响范围、持久性要求和目标延迟预算，输出：

1. 节点清单（Node list）。为每个独立步骤命名：LLM 思考器、各工具执行器、每个人工审查步骤、所有摘要器或批评器，以及检索器。若任何节点涉及多个职责，就拒绝该设计并拆分节点。
2. 状态模式（State schema）。使用 TypedDict 或 Pydantic 字段，为每个列表配置归约器（Reducer）。消息日志始终使用 Annotated[list, add_messages]。将任务特有列表及字段移出 messages，例如计划、预算计数器、检索文档列表，以确保归约器在并行更新时仍然正确。
3. 边映射（Edge map）。下一步确定时使用静态边。只有模型选择下一步时，才使用带有命名路由函数的条件边。如果路由函数依赖一次尚未在先前节点中执行的新 LLM 调用，就拒绝该图。
4. 中断位置（Interrupt placement）。在每个具有不可逆副作用的节点上设置 interrupt_before，包括写入、删除、付款和产生费用的外部 API 调用。当输出校验在独立进程中运行时，在模型节点上设置 interrupt_after。拒绝在任何有副作用的节点上使用 interrupt_after，因为到那时副作用已经发生。
5. 检查点保存器（Checkpointer）。MemorySaver 仅用于测试。对于必须能在重启后恢复的环境，从 PostgresSaver、SQLiteSaver、RedisSaver 中选择。确认 thread_id 策略，即按用户、按会话或按对话划分，以及检查点的生存时间（TTL）。

拒绝交付没有检查点保存器的 LangGraph。没有保存器就无法恢复、无法时间旅行（Time-travel），也无法进行人类在环（Human-in-the-loop）重放。拒绝交付没有 add_messages 的 messages 字段，否则第二次写入会悄悄覆盖第一次，导致一半对话消失。拒绝每次转移都由规划器 LLM 路由条件边的图；那相当于增加了步骤的 AutoGen，每一轮都会消耗额外词元（Token）。

示例输入：“基于 Anthropic Claude 的退款处理智能体，有三个工具（lookup_order、issue_refund、send_email）；超过 100 美元的退款必须先暂停等待人工处理，服务器重启后必须能够恢复，p95 延迟预算为 8 秒。”

示例输出：
- 节点：agent（LLM 调用）、lookup_tool、refund_tool、email_tool、human_review。
- 状态：messages 使用 add_messages；order_context、refund_amount、reviewer_decision 均为覆盖。
- 边：agent 连接 should_continue 路由器，分支为 lookup_tool、refund_tool、email_tool、human_review、END。工具节点返回 agent。
- 中断：refund_amount > 100 时，在 refund_tool 上设置 interrupt_before。lookup_tool 和 email_tool 不设置中断。
- 检查点保存器：PostgresSaver，thread_id 为 "user:{user_id}:case:{case_id}"，TTL 为 30 天。
