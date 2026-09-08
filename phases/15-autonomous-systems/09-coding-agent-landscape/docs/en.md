# 自主编程智能体版图（The Autonomous Coding Agent Landscape，2026）

> SWE-bench Verified 在不到三年内从 4% 升至 80.9%。同一 Claude Sonnet 4.5 在 SWE-agent v1 上得 43.2%，在 Cline 自主模式下得 59.8%：模型周围的支撑框架如今与模型本身同样重要。OpenHands（原 OpenDevin）是最活跃的 MIT 许可平台，其 CodeAct 循环直接在沙箱执行 Python 动作，而不是 JSON 工具调用。醒目数字掩盖了方法问题：SWE-bench Verified 的 500 题中，161 题只需改 1–2 行；同样的前沿模型在 SWE-bench Pro（10 行以上任务）上只有 23–59%。

**Type:** Learn
**Languages:** Python（标准库，CodeAct 与 JSON 工具调用对比）
**Prerequisites:** 阶段 14 · 07（工具使用，Tool use），阶段 15 · 01（长时程智能体，Long-horizon agents）
**Time:** ~45 分钟

## 问题（The Problem）

“哪个编程智能体最好”问错了。应当问：在符合我工作内容的任务分布上，使用我将在生产中运行的支撑框架，端到端可靠性是多少？

2022 至 2026 年，业界认识到支撑框架（Scaffolding）至关重要，包括检索层、规划器、沙箱、编辑验证循环、反馈格式。Claude Sonnet 4.5 配 SWE-agent v1，在 SWE-bench Verified 得 43.2%；相同模型放进 Cline 自主框架，得 59.8%。权重相同，绝对分差却有 16.6 个百分点。基础模型是组件，循环才是产品。

另一个问题是，基准成绩接近饱和后，可能掩盖实际能力的退步。SWE-bench Verified 已接近饱和，难度分布中偏简单的任务（500 题中 161 题只需修改 ≤2 行）拉高了领先系统的成绩。SWE-bench Pro（10 行以上修改）这样的任务分布更适合衡量实际质量；同样的领先系统在这里仍只有 23–59%。

## 概念（The Concept）

### 一段话理解 SWE-bench（SWE-bench, one paragraph）

SWE-bench（Jimenez 等）采用带真实修复补丁的 GitHub 问题，要求智能体生成使测试套件通过的补丁。SWE-bench Verified（OpenAI，2024）是人工筛选的 500 题子集，移除了模糊和有问题的任务。SWE-bench Pro 是更难的后继，要求 10 行以上修改，当前前沿智能体得分为 23–59%。

### 2022 → 2026 曲线实际展示了什么（What the 2022 → 2026 curve actually shows）

- **2022**：研究模型在原始 SWE-bench 上约 ~4%。
- **2024**：GPT-4 + Devin 式框架约 ~14%；SWE-agent 约 ~12%。
- **2025**：Aider 和 SWE-agent 中的 Claude 3.5/3.7 Sonnet 推进到 40–55%。
- **2026**：Claude Sonnet 4.5 及前沿竞争者在 SWE-bench Verified 达到 70–80%+。Epoch AI 排行榜实时跟踪。

斜率来自三个相互累积的来源：更好的基础模型、更好的框架（CodeAct、反思、验证器循环）、更好的基准（Verified 去除噪声）。

### CodeAct 与 JSON 工具调用（CodeAct vs JSON tool calls）

OpenHands（All-Hands-AI，arXiv:2407.16741，原 OpenDevin）采取特定架构选择：模型不输出由宿主解码执行的 JSON 工具调用，而输出 Python 代码，由 Jupyter 风格内核在沙箱运行。智能体能在一个动作中遍历文件、串联工具、捕获自身异常。

权衡如下：

- **JSON 工具调用（JSON tool calls）**：每个动作一轮；易审计；组合能力有限；默认安全，因为每次调用都经过显式校验器。
- **CodeAct**：一个动作可以是完整程序；可组合；需要加固沙箱（OpenHands 用 Docker 隔离）；失效模式包含沙箱运行时允许的一切行为。

两种架构都已投入生产。CodeAct 在开放平台（OpenHands、smolagents）占主导；JSON 工具调用仍主导执行器受服务商控制的托管服务（Anthropic Managed Agents、OpenAI Assistants）。

### 2026 年版图中的框架（Scaffolds in the 2026 landscape）

| 框架 | 许可证 | 执行模型 | 显著特点 |
|---|---|---|---|
| OpenHands（OpenDevin） | MIT | Docker 中的 CodeAct | 最活跃开放平台；事件流可重放 |
| SWE-agent | MIT | 智能体计算机接口（Agent-Computer Interface，ACI） | 首个端到端 SWE-bench 框架 |
| Aider | Apache-2 | 通过差异补丁编辑本地仓库 | 框架精简，较少出现能力退步 |
| Cline | Apache-2 | 带工具策略的 VS Code 智能体 | Sonnet 4.5 上得分最高的开放框架 |
| Devin（Cognition） | 专有 | 托管虚拟机 + 规划器 | 首个“AI 软件工程师”产品类别 |
| Claude Code | 专有 | 权限模式 + 例行任务 | 第 10 课详述其智能体循环 |

### 支撑框架为何起主导作用（Why scaffolding dominates）

编程运行是长时程轨迹（第 1 课），可靠性跨步骤累积。框架在三个环节提高分数：

1. **检索（Retrieval）**：找到需要读取的文件，是一个容易被忽视的瓶颈。SWE-agent 的 ACI、OpenHands 的文件索引、Aider 的仓库映射都在解决这一问题。
2. **验证器循环（Verifier loop）**：运行测试、读取堆栈跟踪（Stack trace）并重试，在 SWE-bench 上能带来 10 个以上百分点的差异。
3. **故障遏制（Failure containment）**：出错时回滚的沙箱防止损害累积。同一模型有无验证器循环，看起来就像两种产品。

### 基准饱和与真实分布（Benchmark saturation and the real distribution）

OpenHands 作者和 Epoch AI 都指出，SWE-bench Verified 有简单任务尾部：500 题中 161 题只需 1–2 行修改。高分部分由此驱动。SWE-bench Pro 限定 10 行以上修改，即使前沿系统也只得到 23–59%。你的生产分布几乎肯定更接近 Pro，而非 Verified。

据此选择智能体时，应从自己的待修复缺陷列表中挑选一组难度类似 Pro 的任务进行测试。真正有用的成绩，是智能体在能代表实际交付工作的任务上的表现。

```figure
a5-scaffold-delta
```

## 实际应用（Use It）

`code/main.py` 在固定微型任务分布上对比两种玩具框架：

1. 每轮执行一个动作的 **JSON 工具调用**框架。
2. 每动作能输出一小段 Python 的 **CodeAct** 框架。

两者都使用桩“模型”（确定性规则），从而将框架差异与模型质量分离。输出展示，CodeAct 用更少轮次解决更多任务，代价是单动作影响范围（Blast radius）更大。

## 交付成果（Ship It）

`outputs/skill-scaffold-audit.md` 帮助采用框架前审计：检索质量、是否有验证器、沙箱隔离、基准与分布匹配度。

## 练习（Exercises）

1. 运行 `code/main.py`。同一任务集下，每种框架用多少轮？各自单动作影响范围多大？

2. 阅读 OpenHands 论文（arXiv:2407.16741）。论文认为 CodeAct 在复杂任务上优于 JSON 工具调用。指出论文承认的一种失效模式，用一句话说明它何时会主导生产故障。

3. 从缺陷积压选一个需要跨两个文件修改 10 行以上的任务。估计前沿模型采用（a）JSON 工具调用、（b）CodeAct 时的端到端成功概率，解释差距。

4. SWE-bench Verified 有 161 个单文件、1–2 行任务。构造排除它们的分数，排行榜怎样重排？

5. 阅读 OpenAI“介绍 SWE-bench Verified”，解释移除模糊任务的具体方法，并指出筛选会遗漏的一类任务。

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|---|---|---|
| SWE-bench | “编程基准” | 带真实补丁和测试套件的真实 GitHub 问题 |
| SWE-bench Verified | “清洗后的子集” | 500 个人工筛选任务，仍含简单任务尾部 |
| SWE-bench Pro | “更难子集” | 10 行以上修改；前沿模型为 23–59% |
| CodeAct | “代码即动作（Code-as-action）” | 智能体输出 Python，Jupyter 风格内核在沙箱执行 |
| JSON 工具调用（JSON tool call） | “函数调用（Function calling）” | 每个动作是执行前校验的结构化 JSON 载荷 |
| 支撑框架（Scaffold） | “智能体框架” | 基础模型周围的检索 + 规划器 + 执行器 + 验证器循环 |
| 智能体计算机接口（ACI，Agent-Computer Interface） | “SWE-agent 的格式” | 为 LLM 易用性而非人类 shell 设计的命令集 |
| 验证器循环（Verifier loop） | “测试并重试” | 运行测试、读输出、修订补丁；模型之外最大的可靠性增益 |

## 延伸阅读（Further Reading）

- [Jimenez 等：SWE-bench](https://www.swebench.com/)：原始基准与方法。
- [OpenAI：介绍 SWE-bench Verified](https://openai.com/index/introducing-swe-bench-verified/)：筛选子集如何构建。
- [Wang 等：OpenHands，面向 AI 软件开发者的开放平台](https://arxiv.org/abs/2407.16741)：CodeAct 架构与事件流设计。
- [Epoch AI：SWE-bench 排行榜](https://epoch.ai/benchmarks)：实时跟踪分数。
- [Anthropic：衡量智能体自主性](https://www.anthropic.com/research/measuring-agent-autonomy)：长时程编程智能体可靠性框架。
