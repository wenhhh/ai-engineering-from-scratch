---
name: rollback-rehearsal
description: 为拟议自主工作流设计回滚演练测试，并审计检查点后端的审计轨迹持久性。
version: 1.0.0
phase: 15
lesson: 16
tags: [checkpointing, rollback, idempotency, eu-ai-act-article-14, durable-execution]
---

给定拟议长时程自主工作流，设计回滚演练（Rollback rehearsal）测试，证明幂等性 + 前置条件 + 验证 + 回滚栈实际端到端有效，并审计检查点后端的监管就绪性。

请输出：

1. **演练脚本（Rehearsal script）。** 具体测试：（a）启动工作流、（b）提交中使其崩溃、（c）恢复、（d）断言动作恰好一次、（e）注入验证失败、（f）断言回滚触发且状态恢复。测试至少通过一次前，不应运行生产工作流。
2. **幂等性审计（Idempotency audit）。** 确认键从提案内容推导（第 15 课），提交逻辑使用明确执行状态（`pending` -> `executing` -> `committed`/`failed`）。副作用前按幂等键预留/锁定，仅验证副作用后标记 `committed`。
3. **前置条件清单（Precondition inventory）。** 列出提交时必须重新检查的每项条件。检查与使用之间的状态变化（Time-of-check vs time-of-use，TOCTOU）是常见的生产故障来源；必须在提交时评估前置条件，不能只在提出方案时检查。
4. **验证清单（Verify inventory）。** 每个有实质后果动作，都指出确认副作用发生的具体读取。“返回 200”不可接受。
5. **回滚清单（Rollback inventory）。** 每个有实质后果动作，分类为带内回滚、补偿事务或带外告警。空操作回滚（“无法撤销”）必须在提案明确说明（第 15 课元数据）。

必须拒绝：
- 没有演练过回滚的工作流。
- 部署时丢失数据的检查点后端。
- 执行后而非执行前写状态的提交路径。
- 仅检查工具调用返回码的“已验证”状态。
- 仅提案时而非提交时运行的前置条件检查。

拒绝规则：
- 若用户未在预发布环境至少运行一次演练脚本，拒绝生产发布。
- 若用户无法提供检查点存储的结构定义（Schema），应拒绝并要求先补充结构文档。监管者需要能够查询的状态记录。
- 若工作流依赖无持久化的内存检查点，拒绝。

输出格式：

返回演练计划，包含：
- **测试脚本纲要（Test script outline）**：步骤及断言
- **幂等性表（Idempotency table）**：键组成、状态写入顺序
- **前置条件表（Precondition table）**：检查、评估时机、后果
- **验证表（Verify table）**：动作、确认读取
- **回滚表（Rollback table）**：动作、类型、目标状态
- **后端能力确认（Backend attestation）**：存储、重新部署后是否保留数据 y/n、是否可查询 y/n
- **就绪性（Readiness）**：生产 / 预发布 / 仅研究
