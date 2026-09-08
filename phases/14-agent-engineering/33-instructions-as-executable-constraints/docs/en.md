# 将智能体指令变成可执行约束（Agent Instructions as Executable Constraints）

> 只用文字表达期望，指令就只是愿望；写成可检查的约束，指令才能成为测试。工作台将每条规则变成智能体运行时可检查、审查者事后可验证的条件。

**Type:** Build
**Languages:** Python（标准库）
**Prerequisites:** 第 14 阶段 · 32（最小工作台）
**Time:** 约 50 分钟

## 学习目标（Learning Objectives）

- 区分路由文字与操作规则。
- 将启动规则、禁止动作、完成定义、不确定性处理和审批边界表达为机器可检查约束。
- 实现规则检查器，按规则集为运行评分。
- 使规则集便于差异比较，让审查能看清变化。

## 问题（The Problem）

典型 `AGENTS.md` 像入职文档，要求智能体“小心”“充分测试”“不确定就问”。三天后，智能体交付的修改没有测试，写入禁止目录，也从未提问，因为它不知道边界在哪里。

指令具体可操作时有力，只有愿望时无力。解决办法是编写工作台可解释、审查者可评分的规则。

## 概念（The Concept）

规则应放在 `docs/agent-rules.md`，与简短根路由器分离。每条规则有名称、类别和检查。

```mermaid
flowchart LR
  Router[AGENTS.md] --> Rules[docs/agent-rules.md]
  Rules --> Checker[rule_checker.py]
  Checker --> Report[rule_report.json]
  Report --> Reviewer[审查者]
```

### 覆盖多数规则的五类（Five categories that cover most rules）

| 类别 | 规则回答的问题 | 示例 |
|----------|---------------------------|---------|
| 启动（Startup） | 工作开始前必须满足什么？ | “状态文件存在且未过期” |
| 禁止（Forbidden） | 什么绝不能发生？ | “不要修改 `scripts/release.sh`” |
| 完成定义（Definition of done） | 什么证明任务完成？ | “pytest 以 0 退出且验收项通过” |
| 不确定性（Uncertainty） | 智能体不确定时怎么办？ | “创建问题笔记，而非猜测” |
| 审批（Approval） | 什么需要人工批准？ | “任何新依赖、任何生产写入” |

无法归入这五类之一的规则，通常应拆成两条。强制拆分。

### 规则机器可读（Rules are machine-readable）

每条规则有短标识（Slug）、类别、一行描述和 `check` 字段，后者指向 `rule_checker.py` 中的函数。增加规则就意味着增加检查，检查器随工作台成长。

### 规则便于差异比较（Rules are diff-friendly）

规则存放在单个 Markdown 文件中，每条一个标题。重命名在差异中可见，新规则放在所属类别顶部。过时规则应删除，而不是注释掉，因为工作台是事实来源，不是记录团队上季度想法的聊天日志。

### 规则与框架护栏（Rules versus framework guardrails）

框架护栏，如 OpenAI Agents SDK 护栏、LangGraph 中断，在运行时层面执行规则。本课规则集是这些护栏实现的人类可读、可审查契约。两者都需要：运行时在轮次中捕获违规，规则集证明运行时在做正确的事。

### 渐进披露：地图，不是百科全书（Progressive disclosure: a map, not an encyclopedia）

`AGENTS.md` 不断增长，因为每次事故增加规则，却没有事故删除规则。一年后文件达到两千行，智能体读完第一屏就耗尽注意力预算，只按收到指令的一小部分行动。巨型指令文件失败的原因与四十页入职文档相同：读者浏览一遍，再也不回到关键部分。

解决办法不只是缩短文件，而是分层。根路由器小到每个会话都能读，只包含指针。深度内容放在主题文件中，任务涉及才加载。给智能体地图，而非整套百科全书，让它走到所需页面。

```
AGENTS.md                  # 路由入口，少于 50 行：仓库是什么、去哪里看、五条硬规则
docs/
  agent-rules.md           # 完整规则集（本课）
  architecture.md          # 任务涉及模块边界时加载
  testing.md               # 任务编写或运行测试时加载
  deploy.md                # 仅发布工作加载，受审批规则限制
feature_list.json          # 待办清单（阶段 14 · 36）
```

| 层级 | 所在位置 | 何时读取 | 大小预算 |
|------|----------|-----------|-------------|
| 路由器（Router） | `AGENTS.md` | 每个会话，始终 | 约 50 行以内 |
| 规则（Rules） | `docs/agent-rules.md` | 每个会话启动时 | 每类一屏 |
| 主题文档（Topic docs） | `docs/<topic>.md` | 仅任务涉及该主题时 | 按需深入 |

两种测试确保分层名副其实。可达性测试：智能体从路由器最多两跳应能到达任意规则，因此路由器必须按路径链接每个主题文档，而非用文字描述。新鲜度测试：路由器应足够短，让审查者每个 PR 都重读；这是防止它静默长回百科全书的唯一办法。失效指针比缺失规则更糟，因此路由器坏链接本身就是启动检查违规。

```figure
wb-rule-checkoff
```

## 动手实现（Build It）

`code/main.py` 提供：

- 将规则加载为数据类的 `agent-rules.md` 解析器。
- `rule_checker.py` 式检查函数，每个 `check` 引用对应一个。
- 故意违反两条规则的演示运行，以及捕获它们的一轮检查。

运行：

```
python3 code/main.py
```

输出：解析后的规则集、运行追踪、逐规则通过或失败，以及保存在脚本旁的 `rule_report.json`。

## 真实生产模式（Production patterns in the wild）

三种模式决定规则集能维持一个季度，还是一周就腐化。

**编写时标注严重性。** 每条规则携带 `severity`：`block`、`warn` 或 `info`。检查器报告三者，运行时仅在 `block` 时拒绝。多数团队早期夸大严重性，截止日期压力下又静默削弱；编写时标注迫使事先校准。配合验证门禁（第 14 阶段 · 38），对任何 `block` 规则的覆盖都签名写入 `overrides.jsonl` 审计日志。

**以规则过期强制审查。** 每条规则携带 `expires_at` 日期，默认编写后 90 天。未过期规则连续 60 天零违规时，检查器发出警告；下次季度审查要么说明保留理由，要么降为 `info`，要么删除。Cloudflare 生产 AI Code Review 数据（2026 年 4 月，30 天内在 5,169 个仓库执行 131,246 次审查）显示，显式过期的规则集保持每仓库 30 条以内；没有过期机制的增长到 80 多条，且多数从未触发。

**Markdown 为源，JSON 为缓存。** `agent-rules.md` 是编写文件；`agent-rules.lock.json` 是检查器在热路径读取的缓存。锁文件由提交前钩子再生成。Markdown 差异可审查，JSON 解析不进入每一轮。结构与 `package.json` / `package-lock.json`、`Cargo.toml` / `Cargo.lock` 相同。

## 实际应用（Use It）

生产中：

- Claude Code、Codex、Cursor 在会话启动时读取规则，拒绝动作时引用规则。检查器在 CI 中重新运行，以捕获静默漂移。
- OpenAI Agents SDK 护栏将相同检查注册为输入与输出护栏。Markdown 提供文档层的支撑能力，SDK 提供运行时层的支撑能力（Workbench Surfaces）。
- LangGraph 中断在执行中的节点违反规则时触发。中断处理器读取规则、询问人类，再恢复。

规则集可在三者之间移植，因为它只是 Markdown 加函数名。

## 交付成果（Ship It）

`outputs/skill-rule-set-builder.md` 访谈项目负责人，将现有散文式指令归入五类，输出版本化 `agent-rules.md` 和检查器桩。

## 练习（Exercises）

1. 产品确实需要时增加第六类，论证为什么不能归入五类之一。
2. 扩展检查器，使规则可携带严重性（`block`、`warn`、`info`），报告据此汇总。
3. 将检查器接入 CI：最新智能体运行违反阻断严重性规则时，使构建失败。
4. 每条规则增加“过期”字段。90 天没有检查失败后，规则进入审查。
5. 找一份真实 `AGENTS.md`，重写为五类规则。多少行可操作，多少行只是愿望？

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|------|----------------|------------------------|
| 操作规则（Operational rule） | “真实指令” | 工作台运行时可检查的规则 |
| 愿望规则（Aspirational rule） | “小心” | 没有检查的规则，应删除或升级 |
| 完成定义（Definition of done） | “验收” | 有文件依据、客观的任务完成证明 |
| 阻断级别（Block severity） | “硬规则” | 违规时停止运行，只有运维人员才能批准例外放行 |
| 规则过期（Rule expiry） | “清扫过时规则” | N 天无失败的规则进入退役评审 |

## 延伸阅读（Further Reading）

- [OpenAI Agents SDK 护栏（Guardrails）](https://openai.github.io/openai-agents-python/guardrails/)
- [LangGraph 中断（Interrupts）](https://langchain-ai.github.io/langgraph/how-tos/human_in_the_loop/breakpoints/)
- [Anthropic《构建有效的智能体》（Building Effective Agents）](https://www.anthropic.com/research/building-effective-agents)
- [Rick Hightower，Agent RuleZ：确定性策略引擎（A Deterministic Policy Engine）](https://medium.com/@richardhightower/agent-rulez-a-deterministic-policy-engine-for-ai-coding-agents-9489e0561edf)：生产中的 block/warn/info 严重性
- [Cloudflare《大规模编排 AI 代码审查》（Orchestrating AI Code Review at Scale）](https://blog.cloudflare.com/ai-code-review/)：13.1 万次审查，规则组合经验
- [microservices.io《GenAI 开发平台，第 1 部分：护栏》（GenAI development platform — part 1: guardrails）](https://microservices.io/post/architecture/2026/03/09/genai-development-platform-part-1-development-guardrails.html)：规则与 CI 之间的纵深防御
- [类型检查的合规：确定性护栏（Type-Checked Compliance: Deterministic Guardrails，arXiv 2604.01483）](https://arxiv.org/pdf/2604.01483)：Lean 4 作为规则即检查的上限
- [logi-cmd/agent-guardrails](https://github.com/logi-cmd/agent-guardrails)：合并门禁实现，包括范围、变异测试、违规预算
- 第 14 阶段 · 32：本规则集嵌入的最小工作台
- 第 14 阶段 · 38：消费规则报告的验证门禁
- 第 14 阶段 · 39：为规则遵循评分的审查智能体
