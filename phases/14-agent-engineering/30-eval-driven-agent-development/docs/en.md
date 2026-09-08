# 评估驱动的智能体开发（Eval-Driven Agent Development）

> Anthropic 建议：“从简单提示词开始，通过全面评估优化，只在需要时增加多步骤智能体系统。”评估不是最后一步，而是驱动第 14 阶段所有其他选择的外层循环。

**Type:** Learn + Build
**Languages:** Python（标准库）
**Prerequisites:** 第 14 阶段全部内容。
**Time:** 约 60 分钟

## 学习目标（Learning Objectives）

- 列出三个评估层：静态基准、自定义离线、在线生产，以及各自用途。
- 解释评估器优化器的紧密循环。
- 描述 2026 年最佳实践：评估与代码放在一起，在 CI 中运行，为 PR 把关。
- 将第 14 阶段每一课关联到它所生成的评估用例。

## 问题（The Problem）

智能体能通过演示，却会以演示无法预测的方式在生产中失败。基准回答的是“模型总体上有能力吗”，而不是“智能体是否为我的产品交付正确补丁”。答案是在三个层面持续评估，并将每个护栏和学到的规则映射到评估用例。

## 概念（The Concept）

### 三个评估层（Three evaluation layers）

1. **静态基准（Static benchmarks）**：代码使用 SWE-bench Verified（第 19 课），网页/桌面使用 WebArena/OSWorld（第 20 课），通用能力使用 GAIA（第 19 课），工具使用采用 BFCL V4（第 06 课）。用于跨模型比较和回归门禁。污染确实存在：SWE-bench+ 发现 32.67% 解答泄漏。始终报告 Verified / + 审计分数。

2. **自定义离线评估（Custom offline evals）**：针对产品形态：
   - LLM 作为裁判（Langfuse、Phoenix、Opik，第 24 课）。
   - 基于执行：运行补丁，检查测试。
   - 基于轨迹：将动作序列与黄金轨迹比较；OSWorld-Human 显示顶尖智能体步骤数为黄金轨迹的 1.4–2.7 倍。

3. **在线评估（Online evals）**：面向生产：
   - 会话回放（Langfuse）。
   - 护栏触发告警（第 16、21 课）。
   - 逐步骤成本与延迟跟踪（第 23 课 OTel 跨度）。

### 评估器优化器（Evaluator-optimizer，Anthropic）

紧密循环：

1. 提议者生成输出。
2. 评估器判断。
3. 改进，直到评估器判定通过。

这是自我改进（Self-Refine，第 05 课）的推广。对于任何需要保证可靠性的智能体流程，都可以在外层加入评估器与优化器组成的循环。

### 2026 年最佳实践（2026 best practice）

- 评估与代码放在一起。
- 每个 PR 都在 CI 中运行。
- 按评估分数把关合并，例如“相对 main 不得回归 > 5%”。
- 每个护栏映射到一个评估用例。
- 每个学到的规则，如 Reflexion、pro-workflow learn-rule，都映射到一个失败用例。

### 串联第 14 阶段（Tying Phase 14 together）

第 14 阶段每一课都会生成评估用例：

| 课程 | 生成的评估用例 |
|--------|------------------------|
| 01 智能体循环（Agent Loop） | 预算耗尽、无限循环守卫 |
| 02 ReWOO | 工具失败时规划器正确重规划 |
| 03 Reflexion | 重试时应用学到的反思 |
| 05 Self-Refine/CRITIC | 裁判判定改进后的输出通过 |
| 06 工具使用（Tool Use） | 参数强制转换有效，未知工具被拒绝 |
| 07-10 记忆（Memory） | 检索引用匹配来源，过期事实失效 |
| 12 工作流模式（Workflow Patterns） | 每种模式产生正确输出 |
| 13 LangGraph | 恢复准确重现状态 |
| 14 AutoGen 参与者（Actors） | 死信队列捕获崩溃处理器 |
| 16 OpenAI Agents SDK | 护栏针对正确输入触发拦截 |
| 17 Claude Agent SDK | 子智能体结果返回编排器 |
| 19-20 基准（Benchmarks） | SWE-bench Verified 分数、WebArena 成功率、OSWorld 效率 |
| 21 计算机使用（Computer Use） | 逐步骤安全捕获注入 DOM |
| 23 OTel | 跨度发出必需属性 |
| 26 失效模式（Failure Modes） | 检测器标注已知失败 |
| 27 提示词注入（Prompt Injection） | PVE 拒绝被投毒的检索内容 |
| 28 编排（Orchestration） | 监督者路由到正确专家 |
| 29 运行时形态（Runtime Shapes） | 死信队列处理 N% 的失败 |

如果评估套件为每项都有用例，你就覆盖了第 14 阶段。

### 评估驱动开发的失效点（Where eval-driven development fails）

- **没有基线（No baseline）。** 没有最后已知正常状态的评估难以解读，应存储基线。
- **LLM 裁判缺乏事实依据（LLM-judge without grounding）。** 裁判也会幻觉。采用 CRITIC 模式（第 05 课），用外部工具为判断提供依据。
- **对评估过拟合（Over-fitting to evals）。** 针对评估优化会偏离生产实用性，应轮换用例。
- **不稳定评估（Flaky evals）。** 非确定性用例产生误报，应固定随机种子、保存状态快照。

```figure
ae-eval-three-layers
```

## 动手实现（Build It）

`code/main.py` 是使用标准库实现的评估执行框架（Harness）：

- 带类别（benchmark、custom、online）的用例注册表。
- 待测脚本化智能体。
- 评估器优化器循环：提议、判断、改进，直到通过或达到最大轮数。
- CI 门禁：汇总通过率，以及相对于基线的回归。

运行：

```
python3 code/main.py
```

输出：逐用例通过或失败、回归标志、CI 门禁裁决。

## 实际应用（Use It）

- 将评估用例写在智能体代码的同一仓库中。
- 每个 PR 都通过 CI 运行。
- 回归时使构建失败。
- 持续跟踪通过率。
- 将每次生产失败关联到一个新用例。

## 交付成果（Ship It）

`outputs/skill-eval-suite.md` 为智能体产品构建三层评估套件，包含 CI 门禁与回归跟踪。

## 练习（Exercises）

1. 选一次生产失败，编写可复现它的评估用例。智能体现在能通过吗？
2. 为自身领域构建包含事实、语气、范围三个维度的 LLM 裁判量规，对 50 个会话评分。
3. 将评估套件接入 CI，回归 >=5% 时使构建失败。
4. 添加轨迹效率指标：智能体相对黄金轨迹用了多少步？
5. 将第 14 阶段每课映射到套件中的评估用例。有遗漏吗？那就是需要补齐的缺口。

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|------|----------------|------------------------|
| 静态基准（Static benchmark） | “现成评估” | SWE-bench、GAIA、AgentBench、WebArena、OSWorld |
| 自定义离线评估（Custom offline eval） | “领域评估” | 针对产品形态使用 LLM 裁判、执行或轨迹评估 |
| 在线评估（Online eval） | “生产评估” | 会话回放、护栏告警、成本和延迟跟踪 |
| 评估器优化器（Evaluator-optimizer） | “提议—判断—改进” | 迭代直到裁判判定通过 |
| CI 门禁（CI gate） | “合并阻断器” | 评估回归时使构建失败 |
| 基线（Baseline） | “最后已知正常状态” | 用于检测回归的参考分数 |
| 轨迹效率（Trajectory efficiency） | “相对黄金轨迹的步骤数” | 智能体步骤数除以人类专家最少步骤数 |

## 延伸阅读（Further Reading）

- [Anthropic《构建有效的智能体》（Building Effective Agents）](https://www.anthropic.com/research/building-effective-agents)：“从简单开始，用评估优化”
- [OpenAI，SWE-bench Verified](https://openai.com/index/introducing-swe-bench-verified/)：人工筛选基准
- [Berkeley 函数调用排行榜（Function Calling Leaderboard）](https://gorilla.cs.berkeley.edu/leaderboard.html)：工具使用基准
- [Langfuse 文档](https://langfuse.com/)：评估与会话回放实践
