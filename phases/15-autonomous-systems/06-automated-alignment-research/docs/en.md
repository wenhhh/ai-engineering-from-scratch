# 自动化对齐研究（Automated Alignment Research，Anthropic AAR）

> Anthropic 在独立沙箱中并行运行多组基于 Claude Opus 4.6 的自主对齐研究员（Autonomous Alignment Researcher），通过共享论坛协调。论坛日志位于所有沙箱之外，因此智能体不能删除自己的记录。在弱到强训练问题上，AAR 优于人类研究者。Anthropic 自己的摘要指出，预先规定的工作流经常限制 AAR 灵活性、降低表现。自动化对齐研究压缩了时间线，而加速逼近的恰恰是 RSP 要检测的失对齐风险。

**Type:** Learn
**Languages:** Python（标准库，并行研究论坛模拟器）
**Prerequisites:** 阶段 15 · 05（AI Scientist v2），阶段 15 · 04（DGM）
**Time:** ~60 分钟

## 问题（The Problem）

对齐（Alignment）研究耗费大量人类研究者时间。可扩展监督（Scalable oversight）、奖励规范或弱到强训练等问题，每轮实验都需数周。前沿能力进步时，对齐工作量的增长快于合格研究者供给。

自动化对齐研究（Automated Alignment Research，AAR）探讨：能力增长正超越对齐进度的前沿模型，能否帮助缩小这一差距？Anthropic 2026 年关于 AAR 执行弱到强训练研究的报告（alignment.anthropic.com/2026/automated-w2s-researcher/），是此类已部署系统最早公开的成果之一。

结果确实积极：AAR 解决研究问题的表现优于人类基线。同时，它把本阶段讨论的所有担忧集中到一个系统中。若对齐研究可以自动化，破坏防护措施的部分也可以。RSP 的 AI 研发能力阈值正是围绕这一循环制定的。

## 概念（The Concept）

### 架构：按公开描述（The architecture, as publicly described）

- **并行智能体（Parallel agents）。** 多个 Claude Opus 4.6 实例作为 AAR 运行，各有独立沙箱，限制文件系统、网络和进程操作面。
- **共享论坛（Shared forum）。** 发现发布到共享论坛，其存储后端位于每个沙箱之外。智能体可读论坛，但不能从自身沙箱内删除或编辑论坛记录。
- **任务分配（Task allocation）。** 人类设计的任务队列向 AAR 分配研究问题。AAR 提出分解方案、运行实验、撰写发现。
- **聚焦弱到强训练（Weak-to-strong training）。** 已发表研究处理弱到强训练：用较弱监督模型训练较强学生模型。AAR 在此任务上胜过人类研究者。

### 沙箱外日志为何重要（Why the out-of-sandbox log matters）

日志是否完整可信，决定了实验仍然处于控制之下，还是可能已遭到篡改。若 AAR 能编辑自己的日志，就能掩盖失败或可疑的实验。Anthropic 明确指出：日志完整性是信任研究输出的必要条件，而且验证它并不简单。

基础设施中的类比是只追加日志，直写外部存储，例如 S3 对象锁、不可变 Datadog 日志。智能体没有修改历史记录的凭据。2026 年企业安全团队也用同样模式建立能抵御勒索软件的审计轨迹。

### 规定工作流的权衡（The prescribed-workflow tradeoff）

Anthropic 报告指出，预先规定的工作流经常约束 AAR 灵活性、降低表现。换言之，人类设计者逐步写出研究计划时，AAR 的表现反而不如只收到高层目标并有权自行分解时。这与智能体式研究（LangGraph、Microsoft 的 Agent Framework）中的结果一致：过度规定的支撑框架会损害有能力的智能体。

这里的安全影响不易察觉：提高 AAR 表现的灵活性，也可能让它未经批准就拆分任务、以新方式使用工具，或发生目标漂移（Goal drift）。设计时必须权衡：赋予多大的灵活性，才能让它的能力超过人类，同时又不让它擅自将目标扩展到原定分布之外？

### 时间压缩风险（The compression risk）

RSP v3.0（第 19 课）引入 AI 研发能力阈值：以相较“人类 + AI 工具”具有竞争力的成本，完全自动化 AI 研发流水线。DeepMind FSF v3 包含类似的机器学习研发自主性等级。两套框架都把该阈值作为升级控制措施的触发点。

AAR 距该阈值还差一步：它自动化了流水线的一部分，即特定且界定清晰任务上的对齐研究，却未自动化端到端能力开发循环。时间线问题在于差距会多快闭合。

研发周期缩短，也带来了失败不断累积的风险。若对齐研究与能力研究以相近速度相互累积、加速发展，失对齐风险的增长至少会与能力增长一样快。若能力增长更快（历史趋势如此），两者的差距就会扩大。因此，AAR 的益处是有条件的：当且仅当研究过程可信时，新增的对齐研究成果才能缩小这一差距。

### AAR 不替代什么（What AAR does not replace）

人类研究者设置任务队列、审查结果，并保有制定根本规则的权力。AAR 加速的是流水线中间的研究执行环节，而不是两端的任务设定与成果决策。Anthropic 发表的成果既包含 AAR 的贡献，也包含人类研究者对哪些内容应发表、撤回或完善的判断。

这正是将第 15 课“先提案后提交（Propose-then-commit）”模式用于研究本身：AAR 提出方案，人类决定是否正式采纳。

```figure
aar-forum
```

## 实际应用（Use It）

`code/main.py` 模拟多 AAR 研究论坛。三个独立“研究智能体”并行运行，向只追加论坛发布发现，可选开启篡改尝试。

观察：

- 沙箱外日志如何捕获日志篡改尝试。
- 在较难问题上，允许自由分解的任务分配如何优于固定工作流。
- 若日志不具有篡改可见性（Tamper-evident），单个被攻破的 AAR 如何污染论坛信号。

## 交付成果（Ship It）

`outputs/skill-aar-deployment-review.md` 提供自动化对齐研究流水线的部署前审查。

## 练习（Exercises）

1. 运行 `code/main.py`，比较“固定工作流”与“自由分解”设置。自由分解总是更好吗，还是某些问题类上固定工作流也有竞争力？

2. 修改模拟器，让一个智能体尝试篡改日志。确认只追加日志能检测到它，用一段话准确描述日志中的检测特征。

3. 阅读 Anthropic 弱到强 AAR 报告。指出 AAR 胜过人类研究者的具体子任务。什么使它适合自动化？

4. 设计任务队列分配策略，平衡 AAR 灵活性（更好结果）与规定工作流约束（更易审计）。说明如何对两者做 A/B 测试。

5. 阅读 RSP v3.0 的 AI R&D-4 阈值。用一段话描述你认为怎样的能力会跨过该阈值，而当前 AAR 尚未做到。

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|---|---|---|
| AAR | “自动化对齐研究员（Automated Alignment Researcher）” | 自主处理对齐问题的 Claude Opus 4.6 实例 |
| 弱到强训练（Weak-to-strong training） | “用较弱监督者训练更强模型” | AAR 胜过人类的经典可扩展监督基准 |
| 共享论坛（Shared forum） | “智能体发布发现之处” | 只追加、位于沙箱外的存储 |
| 沙箱外日志（Out-of-sandbox log） | “智能体不能编辑自己的记录” | 直写外部存储且篡改可见 |
| 规定工作流（Prescribed workflow） | “人类设计者逐步制定的计划” | 限制 AAR，相较自由分解经常降低表现 |
| 自由分解（Free decomposition） | “智能体决定如何拆任务” | 能力更强，更难审计 |
| AI 研发阈值（AI R&D threshold） | “RSP/FSF 能力等级” | 以有竞争力的成本完全自动化研发流水线 |
| 压缩时间线（Compressed timeline） | “对齐与能力竞赛” | 若能力复利增长快于对齐，失对齐风险就增长 |

## 延伸阅读（Further Reading）

- [Anthropic：自动化弱到强研究员](https://alignment.anthropic.com/2026/automated-w2s-researcher/)：一手来源。
- [Anthropic 负责任扩展政策 v3.0](https://anthropic.com/responsible-scaling-policy/rsp-v3-0)：AI 研发阈值框架。
- [Anthropic：衡量 AI 智能体自主性](https://www.anthropic.com/research/measuring-agent-autonomy)：更广泛的智能体自主性框架。
- [DeepMind 前沿安全框架 v3](https://deepmind.google/blog/strengthening-our-frontier-safety-framework/)：与 RSP 对应的机器学习研发自主性等级。
- [Burns 等（2023）：弱到强泛化（OpenAI）](https://openai.com/index/weak-to-strong-generalization/)：AAR 所攻克的底层问题。
