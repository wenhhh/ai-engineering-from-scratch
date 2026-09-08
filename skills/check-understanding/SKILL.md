---
name: check-understanding
version: 1.0.0
description: 从零开始的 AI 工程（AI Engineering from Scratch）阶段测验。可用“考考我”“阶段测试”“检查我的理解”“我掌握阶段 3 了吗”，或 `/check-understanding <phase>` 触发。
---

# 检查理解（Check Understanding）

检验你对从零开始的 AI 工程（AI Engineering from Scratch）课程中已学完阶段的掌握程度。

## 触发方式（Activation）

用户使用以下表达时，启用本技能：
- `/check-understanding 3` 或 `/check-understanding deep-learning`
- “考考我阶段 2 的内容”
- “测试阶段 1”
- “检查我对 Transformer 的理解”
- “我掌握阶段 3 了吗”
- “我能开始下一阶段了吗”

## 输入（Input）

接受阶段编号（0–19）或阶段名称作为参数。未提供参数时，列出全部 20 个阶段，询问用户想测试哪一个阶段。

## 阶段映射（Phase Map）

将参数映射到 `phases/` 下的正确阶段目录：

| 输入 | 目录 | 阶段名称 |
|-------|-----------|------------|
| 0, setup, tooling | `00-setup-and-tooling` | 环境搭建与工具（Setup & Tooling） |
| 1, math, math-foundations | `01-math-foundations` | 数学基础（Math Foundations） |
| 2, ml, ml-fundamentals | `02-ml-fundamentals` | 机器学习基础（ML Fundamentals） |
| 3, deep-learning, dl | `03-deep-learning-core` | 深度学习核心（Deep Learning Core） |
| 4, cv, computer-vision, vision | `04-computer-vision` | 计算机视觉（Computer Vision） |
| 5, nlp | `05-nlp-foundations-to-advanced` | 自然语言处理：从基础到进阶（NLP -- Foundations to Advanced） |
| 6, speech, audio | `06-speech-and-audio` | 语音与音频（Speech & Audio） |
| 7, transformers | `07-transformers-deep-dive` | 深入理解 Transformer（Transformers Deep Dive） |
| 8, generative, gen-ai, genai | `08-generative-ai` | 生成式 AI（Generative AI） |
| 9, rl, reinforcement-learning | `09-reinforcement-learning` | 强化学习（Reinforcement Learning） |
| 10, llms, llm, llms-from-scratch | `10-llms-from-scratch` | 从零实现大语言模型（LLMs from Scratch） |
| 11, llm-engineering, llm-eng | `11-llm-engineering` | 大语言模型工程（LLM Engineering） |
| 12, multimodal | `12-multimodal-ai` | 多模态 AI（Multimodal AI） |
| 13, tools, protocols, mcp | `13-tools-and-protocols` | 工具与协议（Tools & Protocols） |
| 14, agents, agent-engineering | `14-agent-engineering` | 智能体工程（Agent Engineering） |
| 15, autonomous | `15-autonomous-systems` | 自主系统（Autonomous Systems） |
| 16, multi-agent, swarms | `16-multi-agent-and-swarms` | 多智能体与群体智能（Multi-Agent & Swarms） |
| 17, infrastructure, production, infra | `17-infrastructure-and-production` | 基础设施与生产（Infrastructure & Production） |
| 18, ethics, safety, alignment | `18-ethics-safety-alignment` | 伦理、安全与对齐（Ethics, Safety & Alignment） |
| 19, capstone, projects | `19-capstone-projects` | 综合实践项目（Capstone Projects） |

## 执行流程（Procedure）

### 第 1 步：确定阶段（Resolve the Phase）

解析参数。如果是数字，检查它是否在 0 到 19 之间，包含两端。超出范围时，告诉用户：“阶段 [N] 不存在。有效阶段编号为 0–19。”并列出全部阶段供选择。如果是名称或关键词，在上方阶段映射表中查找。关键词未匹配时，告诉用户：“未知阶段 '[keyword]'，请从下面的列表中选择：”并展示全部 20 个阶段。未提供参数时，也让用户从完整列表中选择。

### 第 2 步：阅读阶段内容（Read the Phase Content）

如果仓库已克隆，即当前目录或上级目录存在 `phases/`，找到 `phases/<phase-dir>/` 下的所有课程目录，读取每课的 `docs/en.md`。如果未克隆，从 README 的目录部分获取课程列表，读取地址为 `https://raw.githubusercontent.com/rohitg00/ai-engineering-from-scratch/main/README.md`，再从同一原始文件基础地址获取各课的 `docs/en.md`。这些文档是生成题目的教学依据。

按需读取足够多的课程，覆盖整个阶段的知识范围。如果阶段课程较多（15 课以上），优先选择有代表性的分布：开头、中间和结尾的若干课。

### 第 3 步：生成 8 道题（Generate 8 Questions）

根据刚才阅读的课程内容，生成恰好 8 道选择题：

**第 1–4 题：概念理解（What/Why）**
考查对概念、定义和推理的理解。例如：
- “X 的用途是什么？”
- “为什么在 Z 条件下会发生 Y？”
- “哪项陈述最准确地描述了 A 与 B 的关系？”
- “X 解决了什么问题？”

**第 5–8 题：实践应用（How/Build）**
考查知识应用与实现思路。例如：
- “你会如何实现 X？”
- “哪种方法能正确解决 Y？”
- “构建 Z 的正确步骤顺序是什么？”
- “训练时观察到 X，应该怎么处理？”

每道题必须恰好有四个选项，标记为 A、B、C、D，且只有一个正确选项。错误选项应有迷惑性，但学过内容的人应能明确判断其错误。

为每道题标明所依据的具体课程，例如“第 03 课：矩阵变换（Matrix Transformations）”。

### 第 4 步：逐题提问（Present Questions One at a Time）

使用 AskUserQuestion 工具或同等交互式提问方式，一次呈现一道题。格式如下：

```text
第 1/8 题（概念理解）——来自第 03 课：矩阵变换（Matrix Transformations）

特征值（Eigenvalue）的几何意义是什么？

A) 矩阵施加的旋转角度
B) 变换过程中特征向量（Eigenvector）的缩放倍数
C) 变换矩阵的行列式（Determinant）
D) 变换后矩阵的秩（Rank）
```

等待用户回答后，再进入下一题。

### 答案隔离（Answer Isolation）

学习者回答当前题目之前，不得公开正确选项或解析。不要在回复格式提示中放入真实答案字母、可能的答案或生成的答案分布。需要纯文本格式提示时，严格使用：`Reply with one letter: <A|B|C|D>.`

### 第 5 步：记录与计分（Track and Score）

持续记录：
- 8 道题中答对的总数
- 每道错题的题号、用户答案、正确答案和来源课程

### 第 6 步：展示结果（Show Results）

全部 8 题结束后，展示分数和等级：

**答对 7–8 题：已掌握（Mastered）**
如果是阶段 19（综合实践项目），告诉用户：“你已掌握最后一个阶段，也就是阶段 19。”只有能够确认其他阶段也已完成时，才能补充“恭喜，你已完成全部课程。”确认依据是当前目录的 `LEARNING.md` 中，路径（Path）表将阶段 0–18 全部标记为 Done 或 Skip。单次阶段测验不能证明全课程完成。
其他阶段则说明：“你已经掌握阶段 N，可以继续阶段 N+1：[下一阶段名称]。”

**答对 5–6 题：接近掌握（Almost）**
“你已具备基础，继续学习前请复习这些具体内容：”
然后列出错题对应课程。

**答对 3–4 题：理解形成中（Developing）**
“你已经有一定理解，还需要回顾以下课程：”
然后逐项列出错题和应重读的课程。

**答对 0–2 题：重新学习（Start Over）**
“这一阶段还需要投入时间，请从头学习，并重点关注：”
然后列出所有答错的主题。

### 第 7 步：错题分析（Wrong Answer Breakdown）

对每道错题，展示：

```text
第 N 题：[题目简述]
你的答案：B
正确答案：C —— [正确选项文字]
原因：[用 1–2 句话解释 C 为什么正确]
复习：第 NN 课 —— [课程名称]（phases/<phase-dir>/NN-<lesson-slug>/docs/en.md）
```

### 第 8 步：下一步（What Next?）

最后提供三种选择：

1. **重做本阶段测验**：从同一阶段重新生成 8 道题
2. **测试其他阶段**：选择另一个阶段进行测试
3. **讲解某个主题**：针对错题中的任意概念提问

等待用户选择，再执行相应操作。

## 规则（Rules）

- 重测时避免重复题目，直到题库用尽；用尽后，后续重测可以调整顺序或改写题目。
- 题目必须直接依据课程文档，不能只凭常识生成。
- 用户作答前，不得展示正确答案。
- 不要在学习者回复方式的示例中写出真实答案字母；使用 `<A|B|C|D>` 占位符。
- 题目应简洁，最多一两句话。
- 错误选项应具有迷惑性，不要编写玩笑选项。
- 如果某阶段尚未编写正文，即未找到 `en.md`，告诉用户：“阶段 N 还没有课程内容，请选择已有内容的阶段进行测验。”
