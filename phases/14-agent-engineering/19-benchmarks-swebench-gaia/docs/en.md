# 基准测试：SWE-bench、GAIA、AgentBench（Benchmarks: SWE-bench, GAIA, AgentBench）

> 三个基准构成 2026 年智能体评估的支柱。SWE-bench 测试代码修补，GAIA 测试通用工具使用，AgentBench 测试多环境推理。你需要了解它们的构成、数据污染情况，以及它们不衡量什么。

**Type:** Learn
**Languages:** Python（标准库）
**Prerequisites:** 第 14 阶段 · 06（工具使用）
**Time:** 约 60 分钟

## 学习目标（Learning Objectives）

- 说出 SWE-bench 的测试执行框架（Harness）机制（FAIL_TO_PASS），解释为何以单元测试作为门禁。
- 解释 SWE-bench Verified（OpenAI，500 个任务）为何存在，以及它剔除了什么。
- 描述 GAIA 的设计：对人类简单、对 AI 困难；分为三个难度等级。
- 列出 AgentBench 的八个环境及开源 LLM 面临的主要障碍。
- 概述 SWE-bench+ 关于数据污染的发现及其影响。

## 问题（The Problem）

排行榜告诉你哪个模型在某个基准上获胜，但不会告诉你：

- 基准是否被污染，例如解答进入训练数据、测试泄漏。
- 基准是否衡量了你关心的能力，例如代码、浏览或通用能力。
- 评估器是否稳健，例如是否采用抽象语法树（AST）匹配、状态检查或人工审查。

引用数字之前，应先了解这三个核心基准及其失效模式。

## 概念（The Concept）

### SWE-bench（Jimenez 等，ICLR 2024 口头报告）（SWE-bench）

- 来自 12 个热门 Python 仓库的 2,294 个真实 GitHub 问题。
- 智能体获得：修复前提交对应的代码库，以及自然语言问题描述。
- 智能体产出：补丁。
- 评估器：应用补丁，运行仓库测试套件。补丁必须让 FAIL_TO_PASS 测试从此前失败变为通过，且不能破坏 PASS_TO_PASS 测试。

SWE-agent（Yang 等，2024）在发布时达到 12.5%，重点优化智能体与计算机的接口，包括文件编辑命令和模型能理解的搜索语法。

### SWE-bench Verified（SWE-bench Verified）

OpenAI 于 2024 年 8 月推出的人工筛选子集，包含 500 个任务。它去除了含糊的问题、不可靠测试，以及修复方式不明确的任务。这是衡量“智能体是否能交付真实补丁”的主要基准。

### 数据污染（Contamination）

- 超过 94% 的 SWE-bench 问题早于大多数模型的训练数据截止时间。
- **SWE-bench+** 发现，32.67% 的成功补丁对应的问题文本泄漏了解答，即模型在描述中看到了修复方法；另外 31.08% 因测试覆盖薄弱而值得怀疑。
- Verified 更干净，但并非完全没有污染。

实际影响：在 SWE-bench 上得分 50% 的模型，在 SWE-bench+ 上可能只有 35%。如果宣称 SWE-bench 性能，应始终同时报告二者。

### GAIA（Mialon 等，2023 年 11 月）（GAIA）

- 共 466 个问题；其中 300 个保留给 huggingface.co/gaia-benchmark 上的私有排行榜。
- 设计理念：“概念上对人类简单（92%），但对 AI 困难（带插件的 GPT-4：15%）。”
- 测试推理、多模态、网页和工具使用。
- 三个难度等级；第 3 级需要跨模态的长工具链。

GAIA 用于衡量“通用能力”，不要将它与专门面向代码的基准混淆。

### AgentBench（Liu 等，ICLR 2024）（AgentBench）

- 8 个环境，覆盖代码（Bash、DB、KG）、游戏（Alfworld、LTP）、网页（WebShop、Mind2Web）和开放式生成。
- 多轮交互，每个数据划分约有 4,000–13,000 轮。
- 主要发现：长期推理、决策和指令遵循，是开源 LLM 追赶商业模型的障碍。

### 这些基准不衡量什么（What these do not measure）

- 现实运行成本，例如词元和实际耗时。
- 对抗条件下的安全行为。
- 你所在领域的性能，应使用自己的评估（第 30 课）。
- 尾部失败：基准关注平均值，而生产运维人员关心最差的 1%。

### 基准测试的误区（Where benchmarking goes wrong）

- **执着于单个数字（Single-number fixation）。** SWE-bench 50% 提供的信息不如 P50/P75/P95 成本加步骤数分布。
- **受污染的性能宣称（Contaminated claims）。** 报告 SWE-bench 却不提 Verified 或 SWE-bench+，会产生误导。
- **把基准当作开发目标（Benchmark-as-development-target）。** 针对基准优化会偏离生产实用性。

```figure
ae-swebench-gate
```

## 动手实现（Build It）

`code/main.py` 实现了一个类似 SWE-bench 的实验性评估执行框架（Harness）：

- 合成的缺陷修复任务，共 3 个。
- 提出补丁的脚本化“智能体”。
- 检查 FAIL_TO_PASS（缺陷已修复）与 PASS_TO_PASS（没有破坏其他功能）的测试运行器。
- 根据问题分解深度分类的 GAIA 式难度分类器。

运行：

```
python3 code/main.py
```

输出展示每个任务和每个难度等级的解决率，使评估规则具体可见。

## 实际应用（Use It）

- **SWE-bench Verified**：面向代码智能体。始终报告 Verified 分数。
- **GAIA**：面向通用智能体。使用私有排行榜数据划分。
- **AgentBench**：用于多环境比较。
- **自定义评估（Custom evals）**（第 30 课）：针对产品的实际形态。

## 交付成果（Ship It）

`outputs/skill-benchmark-harness.md` 为任意代码库与任务组合构建 SWE-bench 式评估执行框架（Harness），使用 FAIL_TO_PASS / PASS_TO_PASS 门禁。

## 练习（Exercises）

1. 选择一个自己的真实仓库，将实验性评估执行框架（Harness）移植过去。为已知缺陷编写 3 个 FAIL_TO_PASS 测试。
2. 添加步骤数指标。在这 3 个任务上，每次解决问题需要多少智能体步骤？
3. 阅读 SWE-bench+ 论文。实现解答泄漏检查，将问题文本与差异内容做模式匹配。
4. 从 GAIA 公开数据划分下载一个问题。追踪 GPT-4 级别智能体会如何处理。它需要什么工具？
5. 阅读 AgentBench 按环境划分的结果。哪个环境与你的产品使用场景相近？该环境中的当前最佳水平（SOTA）是什么样？

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|------|----------------|------------------------|
| SWE-bench | “代码智能体基准” | 2,294 个 GitHub 问题；补丁必须使 FAIL_TO_PASS 测试转为通过 |
| SWE-bench Verified | “干净的 SWE-bench” | OpenAI 人工筛选的 500 个任务 |
| FAIL_TO_PASS | “修复门禁” | 此前失败、补丁后必须通过的测试 |
| PASS_TO_PASS | “无回归门禁” | 此前通过、之后必须继续通过的测试 |
| GAIA | “通用能力基准” | 466 个对人类简单、对 AI 困难的多工具问题 |
| AgentBench | “多环境基准” | 8 个环境，长周期多轮交互 |
| 数据污染（Contamination） | “训练集泄漏” | 基准任务出现在模型训练中 |
| SWE-bench+ | “污染审计” | 在成功的 SWE-bench 补丁中发现 32.67% 存在解答泄漏 |

## 延伸阅读（Further Reading）

- [Jimenez 等，SWE-bench（arXiv:2310.06770）](https://arxiv.org/abs/2310.06770)：原始基准
- [OpenAI，SWE-bench Verified](https://openai.com/index/introducing-swe-bench-verified/)：人工筛选子集
- [Mialon 等，GAIA（arXiv:2311.12983）](https://arxiv.org/abs/2311.12983)：通用能力基准
- [Liu 等，AgentBench（arXiv:2308.03688）](https://arxiv.org/abs/2308.03688)：多环境套件
