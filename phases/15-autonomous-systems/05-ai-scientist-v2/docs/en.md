# AI Scientist v2：研讨会水平的自主研究（Workshop-Level Autonomous Research）

> Sakana 的 AI Scientist v2（Yamada 等，arXiv:2504.08066）运行完整研究循环：假设、代码、实验、图表、写作、投稿。它是首个生成论文通过 ICLR 2025 研讨会同行评审的系统。独立评估（Beel 等）发现，42% 的实验因编码错误失败，文献综述经常把已有概念误标为新颖。Sakana 自己的文档警告，代码库会执行 LLM 编写的代码，建议使用 Docker 隔离。这两面共同构成本课要点。

**Type:** Learn
**Languages:** Python（标准库，研究循环状态机玩具示例）
**Prerequisites:** 阶段 15 · 03（AlphaEvolve），阶段 15 · 04（DGM）
**Time:** ~60 分钟

## 问题（The Problem）

研究是开放式任务。与 AlphaEvolve 的算法搜索或 DGM 受基准约束的自修改不同，研究成果没有机器可检查的正确性标准。论文由评审者判断，不由单元测试判断。这让闭环更难实现；若实现，也更有价值，因为研究是进步产生复利的地方。

AI Scientist v1（Sakana，2024）以人类编写的模板为起点实现研究闭环，LLM 在固定的支撑框架内补充实验。AI Scientist v2（Yamada 等，2025）将智能体式树搜索（Agentic tree search）与视觉语言模型（Vision-language model，VLM）的评议循环结合起来，不再依赖模板。系统生成想法、实现实验、制作图表、撰写论文，并根据评审反馈迭代。

同行评审结论：一篇 v2 生成的论文在披露来源后被 ICLR 2025 研讨会接收。独立评估结论：系统远不可靠。两者都成立。

## 概念（The Concept）

### 架构（The architecture）

1. **想法生成（Idea generation）。** LLM 根据主题和已有文献提出研究想法。v1 用模板，v2 在假设空间上进行智能体式搜索。
2. **新颖性检查（Novelty check）。** 文献检索检查想法是否已发表。Beel 等的评估在此发现误标：已有方法经常被归为新方法。
3. **实验计划（Experiment plan）。** 智能体起草实验方案并编写代码。
4. **执行（Execution）。** 代码在沙箱中运行，失败反馈到重试循环。Beel 等测量中，42% 的实验在此因编码错误失败。
5. **图表生成（Figure generation）。** 视觉语言模型读取已生成的图表，再修改图表，使其表达更清楚。这是 v2 新增的关键技术。
6. **写作（Writeup）。** LLM 起草论文，与内部评审者迭代。
7. **可选：投稿（submission）。** 将论文提交至发表场所。

### 研讨会接收结果意味着什么（What the workshop-acceptance result means）

一篇 v2 生成的论文通过了 ICLR 2025 研讨会同行评审。作者向程序委员会披露了论文来源。接收是一个数据点，不是声称系统“会做研究”的许可。

重要背景：研讨会论文的门槛低于主会议论文。同行评审存在噪声，在某次评审中总有少部分投稿被接收。一次成功是概念验证，不是可靠性声明。2026 年 Nature 论文记录了端到端循环，且本身由人类研究者共同署名；这不是“系统写了一篇 Nature 论文”。

### 独立评估发现了什么（What the independent evaluation found）

Beel 等（arXiv:2502.14297）开展了外部评估，主要发现：

- **实验失败（Experiment failures）。** 42% 的实验因编码错误失败，包括错误导入、形状不匹配、未定义变量。重试循环捕获了部分，但不是全部。
- **新颖性误标（Novelty mislabeling）。** 文献检索步骤经常把已有概念标为新颖。这相当于研究中的幻觉（Hallucination）。
- **呈现与研究质量的差距（Presentation-quality gap）。** 视觉语言模型对图表的评议让图表达到了出版级视觉效果，却掩盖了实验本身的缺陷。

最后一点对本阶段尤其重要。没有做出可信研究、却能生成可信输出的系统，比明显失败的系统更危险，而非更安全。评估必须深入底层声明，不能止步于图表。

### 沙箱逃逸担忧（The sandbox-escape concern）

Sakana 自己仓库的 README 警告：

> 由于本软件会执行 LLM 生成的代码，我们无法保证安全。存在危险软件包、不受控网络访问和派生非预期进程的风险。请自行承担使用风险，并考虑 Docker 隔离。

这就是不可验证领域中自主性的运行形态：LLM 写代码，代码执行，代码可以做进程获准做的任何事。若没有严格限制文件系统、网络和进程动作的沙箱，自主研究智能体就可能窃取数据、消耗算力或重写自身。

AlphaEvolve 的沙箱问题更容易处理，因为评估器约束严格。AI Scientist v2 的循环则以开放式目标运行开放式代码，因此需要更强隔离（至少 Docker，优先 seccomp / gVisor），并在每份投稿离开系统前进行人工审查。

### v2 在前沿技术栈中的位置（Where v2 sits in the frontier stack）

| 系统 | 目标 | 输出种类 | 评估器 | 已知失败 |
|---|---|---|---|---|
| AlphaEvolve | 算法 | 代码 | 单元测试 + 基准测试 | 受评估器严谨性约束 |
| DGM | 智能体支撑框架 | 代码 | SWE-bench | 奖励投机 |
| AI Scientist v2 | 研究论文 | 文本 + 代码 + 图表 | 同行评审（弱） | 实验失败、误标、润色掩盖弱点 |

在这三个系统中，v2 的自动评估器最弱，输出内容的范围最广，生成的成果也最容易直接进入公开传播环节。因此，大部分安全保障都依赖运行控制措施，包括沙箱、审查和披露。

```figure
mx-research-loop
```

## 实际应用（Use It）

`code/main.py` 将 v2 循环模拟为状态机（State machine）：想法 → 新颖性检查 → 实验 → 图表 → 写作 → 评审 → 接收或迭代。每个状态都有可配置的失败概率，取自 Beel 等的发现。运行 N 次循环并统计：

- 多少想法进入投稿。
- 多少投稿具有被润色论文隐藏的关键实验缺陷。
- 重试预算如何权衡质量与产出率。

## 交付成果（Ship It）

`outputs/skill-ai-scientist-sandbox-review.md` 为研究循环智能体的任何产物提供离开沙箱前的双门禁审查清单。

## 练习（Exercises）

1. 用默认参数运行 `code/main.py`。有多大比例的循环产出“无缺陷”论文？又有多大比例产出的论文存在实验失败问题，却被图表评议阶段的润色掩盖了？

2. 默认值已使用 Beel 等的 42% / 25%。先用 `--experiment-failure 0.20 --novelty-mislabel 0.10` 重跑，再用 `--experiment-failure 0.60 --novelty-mislabel 0.40`。两次运行中，精美却有缺陷的论文占比如何变化？

3. 阅读 Sakana AI Scientist v2 仓库 README 的沙箱要求。指出为多日自主运行增加的两项限制（除 Docker 外）。

4. 阅读 Beel 等第 4 节的展示质量差距。设计额外评估器，捕获外观精美但实验有缺陷的论文。

5. 为研究智能体输出提出一个比“博士逐篇阅读”更易扩展的人工审查协议。指出瓶颈并围绕它设计。

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|---|---|---|
| AI Scientist v1 | “Sakana 的模板式研究智能体” | 在固定支撑框架中填入实验 |
| AI Scientist v2 | “无需模板的研究智能体” | 智能体式树搜索，结合视觉语言模型（VLM）图表批评 |
| 智能体式树搜索（Agentic tree search） | “分支研究智能体” | 并行展开多个实验计划，由内部批评者剪枝 |
| 视觉语言模型评议（Vision-language critique） | “VLM 润色图表” | 多模态模型读取并修改图表，使表达更清楚 |
| 文献检索（Literature retrieval） | “新颖性检查” | 搜索已有工作以确认想法新颖性，已有误标记录 |
| 润色掩盖（Polish masking） | “论文漂亮，研究有问题” | 展示质量超过实验质量，隐藏弱点 |
| 沙箱逃逸（Sandbox escape） | “LLM 代码突破限制” | 智能体执行的代码做了循环设计者未预期的事 |

## 延伸阅读（Further Reading）

- [Yamada 等（2025）：The AI Scientist-v2](https://arxiv.org/abs/2504.08066)：论文。
- [Sakana 关于 2026 年 Nature 发表的博客](https://sakana.ai/ai-scientist-nature/)：厂商摘要，含同行评审背景。
- [Beel 等（2025）：The AI Scientist 的独立评估](https://arxiv.org/abs/2502.14297)：外部评估数据。
- [Sakana AI Scientist v1 论文](https://arxiv.org/abs/2408.06292)：模板式前身。
- [Anthropic：衡量 AI 智能体自主性](https://www.anthropic.com/research/measuring-agent-autonomy)：开放式研究智能体的更广泛背景。
