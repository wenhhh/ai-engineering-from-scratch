---
name: actor-runtime
description: 构建 AutoGen v0.4 式参与者运行时（Actor runtime），包含私有状态、每参与者收件箱、纯消息 IPC、故障隔离和死信队列。
version: 1.0.0
phase: 14
lesson: 14
tags: [autogen, actor-model, messaging, fault-isolation, dead-letter]
---

给定多智能体任务，生成参与者运行时和所需的智能体参与者。

请生成：

1. `Message` 类型，包含 `sender`、`recipient`、`topic`、`body`、`mid`。
2. `Actor` 基类，包含 `receive(message, runtime)`。参与者状态为私有。
3. `Runtime`，包含共享队列、`send()`、`run_until_idle()` 和死信队列（DLQ）。处理器异常进入 DLQ，不向外传播。
4. 一个拓扑辅助方法：RoundRobin（固定轮转）、Selector（LLM 选择下一位）或自定义广播。
5. 每消息可观测性钩子：按照第 23 课输出带 `gen_ai.agent.name` 和 `gen_ai.operation.name` 的 OTel 跨度。

严格禁止：

- 同步消息传递，阻塞发送者直到接收者返回。这是 v0.2 模型，会破坏故障隔离。
- 跨参与者共享可变状态。参与者只能通过消息读取状态，否则就不读取。
- 运行时传播处理器异常。失败应进入 DLQ，让其他参与者继续运行。

拒绝规则：

- 任务只有两个参与者固定往返时，应拒绝参与者模型表述，建议提示词链（第 12 课）。参与者数量 >=3 或存在异步并发时，这一模式才值得成本。
- 用户为了“更容易调试”而要求“同步模式”时，应拒绝，改为建议日志 + 追踪（第 23 课）。
- 领域严格属于单一专门执行器的请求响应时，建议路由（第 12 课），而不是参与者团队。

输出：`message.py`、`actor.py`、`runtime.py`、`teams.py`、`README.md`，解释 DLQ 策略、拓扑选择，以及如何接入 OTel 跨度。末尾添加“接下来读什么”：参与者需要协商时指向第 25 课（多智能体辩论），需要追踪时指向第 23 课（OTel），希望采用面向未来的运行时时指向 Microsoft Agent Framework。
