# 人在回路：先提案后提交（Human-in-the-Loop: Propose-Then-Commit）

> 2026 年对人在回路（HITL）的共识很具体：不是“智能体询问，用户点击批准”，而是先提案后提交（Propose-then-commit）。拟议动作带幂等键持久化，向审查者展示意图、数据血缘、涉及权限、影响范围和回滚计划；仅在明确确认后提交；执行后验证副作用确实发生。LangGraph 的 `interrupt()` 配 PostgreSQL 检查点、Microsoft Agent Framework 的 `RequestInfoEvent`、Cloudflare 的 `waitForApproval()` 都实现同一形态。典型失败是不经审查就点“批准”的橡皮图章式批准（Rubber-stamp approval）。已记录的缓解措施是带明确清单的挑战应答（Challenge-and-response）。

**Type:** Learn
**Languages:** Python（标准库，带幂等性的先提案后提交状态机）
**Prerequisites:** 阶段 15 · 12（持久执行，Durable execution），阶段 15 · 14（告警触发机制，Tripwires）
**Time:** ~60 分钟

## 问题（The Problem）

面对智能体的一项操作，用户必须决定是否批准。如果瞬间就作出决定，很可能并未进行审查；如果按照明确的步骤检查，虽然会慢一些，结果却更可信。工程上要解决的是：怎样让这种有步骤的审查成为最容易完成的操作流程？

2023 年 HITL 模式是同步提示：“智能体想给 X 发正文为 Y 的邮件，批准吗？”用户点批准，大家觉得安全。实践中这里大量出现橡皮图章式批准：用户快速批准，批准几乎没有预测力；智能体出错时，审计轨迹是一长串用户不记得的批准。

2026 年的先提案后提交模式，将 HITL 请求保存到持久存储中，附上结构化元数据，并要求明确确认后才提交执行。托管智能体 SDK 都提供了各自的实现：LangGraph `interrupt()`、Microsoft Agent Framework `RequestInfoEvent`、Cloudflare `waitForApproval()`。API 名称不同，采用的模式相同。

## 概念（The Concept）

### 先提案后提交状态机（The propose-then-commit state machine）

1. **提案（Propose）。** 智能体生成拟议动作，持久化到存储（PostgreSQL、Redis、Durable Object），包括：
   - 意图：为什么做
   - 数据血缘（Data lineage）：什么来源导致提案
   - 涉及权限：哪些范围 / 文件 / 端点
   - 影响范围（Blast radius）：最坏情况
   - 回滚计划：提交后如何撤销
   - 幂等键（Idempotency key）：每提案唯一，重新提交返回同一记录
2. **呈现（Surface）。** 审查者查看提案和全部元数据。审查者是人，不是智能体自审。
3. **提交（Commit）。** 明确确认，然后执行动作。
4. **验证（Verify）。** 执行后回读并确认副作用。验证失败即进入已知异常状态，启动告警。

### 幂等键（The idempotency key）

没有幂等键，瞬时故障后的重试可能重复执行已批准动作。例如用户批准“从 A 向 B 转账 $100”，网络抖动、工作流重试；只批准一次，却转账两次。幂等键将批准绑定到单一唯一副作用，第二次执行为空操作。

这与 Stripe、AWS API 使用的幂等模式相同。Microsoft Agent Framework 文档明确将其复用于智能体批准。

### 持久性：进程退出后为何仍能保留批准记录（Durability: why approvals outlast processes）

等待批准的请求是一种状态，不由智能体自身保管。工作流先暂停（第 12 课），收到批准后再从暂停点继续。因此，LangGraph 将 `interrupt()` 与 PostgreSQL 检查点配合使用，而不只依赖内存状态：即使两天后才收到批准，工作流状态仍然完整。

### 橡皮图章式批准与挑战应答（Rubber-stamp approvals and the challenge-and-response mitigation）

默认 HITL 界面（批准 / 拒绝按钮）产生快速但未经真实审查的批准。已记录的缓解是挑战应答清单：启用批准按钮前，必须对具体问题明确作答。形式例如：

- “你理解这会触及什么资源吗？[ ]”
- “你已验证影响范围可接受吗？[ ]”
- “失败时你有回滚计划吗？[ ]”

这样做不是为了增加形式上的流程，而是为了强制完成必要检查。审查者如果无法勾选某一项，就应要求澄清、交由更合适的人处理，或按安全默认值拒绝。Anthropic 的智能体安全研究明确将清单驱动的 HITL 视为减少橡皮图章式批准的措施。

### 什么算有实质后果（What counts as consequential）

不是所有动作都需要先提案后提交。2026 年指导：

- **有实质后果的动作**（始终 HITL）：不可逆写入、金融交易、对外通信、生产数据库变更、破坏性文件系统操作。
- **可逆动作**（有时 HITL）：本地文件编辑、预发布环境修改、有明确回滚的可逆写入。
- **读取与检查**（从不 HITL）：读文件、列资源、调用只读 API。

### 动作后验证（Post-action verification）

“提交操作已经执行”不等于“预期的外部变更已经发生”。网络分区或竞态条件可能使工作流误以为操作成功，而后端实际上并未保存变更。因此，提交后还要重新读取目标资源，确认执行结果。这类似于带 `RETURNING` 子句的数据库事务，或在 AWS `PutObject` 后调用 `GetObject`。

### 欧盟 AI 法案第 14 条（EU AI Act Article 14）

第 14 条要求欧盟高风险 AI 系统受到有效人工监督。“有效”不是装饰词，监管表述明确排除橡皮图章模式。在 Microsoft Agent Governance Toolkit 合规文档中，带挑战应答的先提案后提交模式能经受第 14 条审查。

```figure
mx-propose-then-commit
```

## 实际应用（Use It）

`code/main.py` 用 Python 标准库实现先提案后提交状态机。JSON 文件作为持久存储，幂等键为（thread_id、action_signature）的哈希。驱动模拟三种情况：正常批准、瞬时故障后重试（不得重复执行）、默认橡皮图章与挑战应答流程对比。

## 交付成果（Ship It）

`outputs/skill-hitl-design.md` 审查拟议 HITL 工作流是否符合先提案后提交形态，标记元数据、幂等性、验证、挑战应答缺失。

## 练习（Exercises）

1. 运行 `code/main.py`，确认已批准提案重试复用持久记录、不重新执行。再让幂等键包含时间戳，展示重复执行。

2. 给提案记录增加 `rollback` 字段，模拟验证失败的执行，展示自动触发回滚。

3. 阅读 Microsoft Agent Framework 的 `RequestInfoEvent` 文档，找出 API 有而玩具引擎缺少的元数据字段，加入并解释它防范什么。

4. 为具体动作如“向公开 Twitter 账号发帖”设计挑战应答清单。审查者必须回答哪三个问题，为什么？

5. 选择同步“批准吗”提示已足够、无需持久存储的情况，解释原因及接受的风险类别。

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|---|---|---|
| 先提案后提交（Propose-then-commit） | “两阶段批准” | 持久提案 + 明确提交 + 验证 |
| 幂等键（Idempotency key） | “可安全重试的令牌” | 每提案唯一，第二次执行为空操作 |
| 数据血缘（Data lineage） | “来自哪里” | 导致提案的具体源内容 |
| 影响范围（Blast radius） | “最坏情况” | 动作出错后的影响范围 |
| 橡皮图章（Rubber-stamp） | “快速批准” | 未真实审查就点击批准 |
| 挑战应答（Challenge-and-response） | “强制清单” | 审查者必须明确确认具体问题 |
| RequestInfoEvent | “MS Agent Framework 基本机制” | 带结构化元数据的持久 HITL 请求 |
| `interrupt()` / `waitForApproval()` | “框架基本机制” | LangGraph / Cloudflare 中相同形态的等价实现 |

## 延伸阅读（Further Reading）

- [Microsoft Agent Framework：人在回路](https://learn.microsoft.com/en-us/agent-framework/workflows/human-in-the-loop)：`RequestInfoEvent`、持久批准。
- [Cloudflare Agents：人在回路](https://developers.cloudflare.com/agents/concepts/human-in-the-loop/)：`waitForApproval()` 与 Durable Objects。
- [Anthropic：在实践中衡量智能体自主性](https://www.anthropic.com/research/measuring-agent-autonomy)：HITL 缓解长时程风险。
- [欧盟 AI 法案第 14 条：人工监督](https://artificialintelligenceact.eu/article/14/)：高风险系统监管基线。
- [Anthropic：Claude 的宪法（2026 年 1 月）](https://www.anthropic.com/news/claudes-constitution)：监督的宪法框架。
