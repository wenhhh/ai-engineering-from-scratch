# 检查点与回滚（Checkpoints and Rollback）

> 工作流图的每次状态转移都要持久化。工作进程崩溃、租约到期后，另一个进程从最新检查点接手。Cloudflare Durable Objects 可以将状态保留数小时乃至数周。先提案后提交（第 15 课）要求为每项操作制定回滚计划，再通过执行后验证形成闭环。欧盟 AI 法案第 14 条要求对高风险系统实施有效的人工监督；在实际运行中，这意味着检查点必须可查询、回滚必须经过演练，而且重新部署后仍须保留审计记录。这里最需要防范的故障是：缺少幂等键和前置条件检查时，瞬时故障后的重试可能重复执行已经批准的操作。执行后验证可以发现这种问题。

**Type:** Learn
**Languages:** Python（标准库，检查点与回滚状态机）
**Prerequisites:** 阶段 15 · 12（持久执行，Durable execution），阶段 15 · 15（先提案后提交，Propose-then-commit）
**Time:** ~60 分钟

## 问题（The Problem）

持久执行（第 12 课）让智能体能在崩溃后恢复；先提案后提交（第 15 课）让已批准的操作有据可查。本课将两者结合起来：如果已批准的操作执行到一半就崩溃，恢复后会发生什么？何时应该回滚，又应该根据哪个状态执行回滚？

真实系统的连接方式不同：

- **LangGraph** 将每次图状态转移检查点写入 PostgreSQL。工作进程崩溃，租约释放，另一进程从最新检查点恢复。工作流在 `interrupt()` 暂停，该暂停本身也持久化。
- **Cloudflare Durable Objects** 按键保持状态数小时到数周，将已批准动作的计算与存储放在一起。
- **Microsoft Agent Framework** 在工作流 API 暴露 `Checkpoint` 基本机制，以重放加幂等性覆盖重试。

各情况下真正有效的组合都是：幂等键防重复执行 + 前置条件检查确认状态仍符合批准时依据 + 动作后验证确认副作用发生 + 验证失败时回滚。

## 概念（The Concept）

### 每次转移都持久化（Every transition persists）

图状态转移，是工作流从一个已命名状态进入另一个状态的步骤。简单实现只在特定提交点持久化；生产实现则会持久化每次状态转移。这样只增加少量写入，却能从任一已记录的状态恢复，并在租约交接后准确接续执行，可靠性收益远大于成本。

### 租约恢复（Lease recovery）

工作进程崩溃后，工作流不会丢失；该进程持有的租约（Lease，即在一段有限时间内负责执行本次任务的声明）会到期，另一个进程便可读取最新检查点并继续执行。通过这种租约机制，生产系统在滚动部署时也能保留进行中的任务。

### 幂等性加前置条件（Idempotency plus preconditions）

仅幂等性不够。设工作流获准“余额 > $1000 时从 A 向 B 转账 $100”，提交、中途崩溃、恢复。若只检查幂等键，转账执行一次，是正确的。但若崩溃到恢复之间，另一工作流使 A 余额降至 $500，幂等检查仍通过，前置条件却不成立。没有前置条件检查，就会造成透支。

每个有实质后果的动作都需要：

- **幂等键（Idempotency key）**：防重复执行。
- **前置条件检查（Precondition check）**：确认状态仍符合已批准内容。

### 动作后验证（Post-action verification）

“工具返回 200”不是验证。真实验证重新读取目标状态，确认副作用发生。模式包括：

- 数据库更新：`UPDATE ... RETURNING *`，再断言返回行符合预期状态。
- 邮件发送：提交后在已发送文件夹检查消息 ID。
- 文件写入：回读文件并计算哈希。
- API 调用：随后对目标资源发 `GET`。

验证失败意味着已知异常状态，启动回滚。

### 回滚计划（Rollback plans）

先提案后提交（第 15 课）的每个有实质后果动作都带回滚计划。类型：

- **带内回滚（In-band rollback）**：直接逆转副作用，`INSERT` 后 `DELETE`，发送后 `Send-correction-email`。
- **补偿事务（Compensating transaction）**：用新动作抵消原动作，标准 SAGA 模式。
- **带外回滚（Out-of-band rollback）**：告警人类、暂停工作流、保留异常状态调查。

空操作回滚（“无法撤销”）必须在提案明示。无回滚动作提交时需更强 HITL，即第 15 课挑战应答。

### 欧盟 AI 法案第 14 条的运行解读（EU AI Act Article 14 operational reading）

第 14 条要求高风险系统“有效人工监督”。实施者在运行层解读为：

- 审计者可查询检查点。
- 回滚已演练，至少一次端到端测试。
- 重新部署后仍保留审计记录，检查点后端必须提供持久存储。
- 验证失败告警，而非静默写日志。

若工作流提交中崩溃、恢复、完成副作用，却没有验证加回滚路径，就无法通过第 14 条检验。

### 关键失效模式：重复执行（The sharp failure mode: the double-execute）

此领域最常见生产事故：

1. 动作获批，幂等键 k。
2. 提交开始，执行，返回 200。
3. 持久化“已提交”状态前崩溃。
4. 恢复后看到“已批准但未提交”，重新执行。
5. 副作用发生两次。

缓解：执行前持久化“进行中”意图，带幂等键执行，仅在动作后验证成功才标记“已提交”。若动作发生而状态写入失败，就知道应验证并在必要时重试；若状态写入成功而动作失败，就经恢复路径验证并确保恰好执行一次。

```figure
checkpoint-replay
```

## 实际应用（Use It）

`code/main.py` 实现了带检查点、幂等性、前置条件检查、验证和回滚的工作流。驱动程序模拟四种场景：正常运行、崩溃后重试（幂等检查阻止重复执行）、前置条件不成立（不执行操作，直接中止）、验证失败（触发回滚）。

## 交付成果（Ship It）

`outputs/skill-rollback-rehearsal.md` 为拟议工作流设计回滚演练测试，并审计检查点后端的审计轨迹持久性。

## 练习（Exercises）

1. 运行 `code/main.py`，验证四场景。提交中崩溃场景需确认跨重试动作恰好执行一次。

2. 修改“先标完成，再执行”模式，让状态写入发生在动作后。重跑崩溃场景，测量重复动作数。

3. 为具体生产动作如“向 Slack 频道发帖”设计回滚计划，分类为带内、补偿、带外并解释。

4. 选择熟悉工作流，找出全部状态转移，标注持久性要求（持久化 / 不持久化），统计当前未持久化的转移。

5. 设计端到端回滚演练测试，运行真实工作流、使其崩溃、确认回滚路径触发。测试断言什么？

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|---|---|---|
| 检查点（Checkpoint） | “存档点” | 每次图状态转移都持久化 |
| 租约（Lease） | “工作进程声明” | 执行某次运行的短期声明，崩溃后过期 |
| 前置条件（Precondition） | “状态门禁” | 断言状态仍符合获准动作 |
| 动作后验证（Post-action verify） | “回读检查” | 确认副作用确实在目标系统发生 |
| 带内回滚（In-band rollback） | “直接撤销” | 用逆操作逆转副作用 |
| 补偿事务（Compensating transaction） | “SAGA 撤销” | 用新动作抵消原动作 |
| 先标记完成（Mark-as-done-first） | “状态写入顺序” | 从提交返回前持久化已提交状态 |
| 第 14 条（Article 14） | “欧盟 AI 法案人工监督” | 运行要求：可查询检查点、已演练回滚、可审计轨迹 |

## 延伸阅读（Further Reading）

- [Microsoft Agent Framework：检查点与 HITL](https://learn.microsoft.com/en-us/agent-framework/workflows/human-in-the-loop)：检查点机制、租约恢复。
- [Cloudflare Agents：人在回路](https://developers.cloudflare.com/agents/concepts/human-in-the-loop/)：Durable Objects 作为状态底座。
- [欧盟 AI 法案第 14 条：人工监督](https://artificialintelligenceact.eu/article/14/)：监管基线。
- [Anthropic：在实践中衡量智能体自主性](https://www.anthropic.com/research/measuring-agent-autonomy)：长时程工作流可靠性框架。
- [Anthropic：Claude Code Agent SDK 智能体循环](https://code.claude.com/docs/en/agent-sdk/agent-loop)：Claude Code Routines 工作流形态。
