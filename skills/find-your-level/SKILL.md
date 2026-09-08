---
name: find-your-level
version: 1.0.0
description: >
  通过交互式测验，将你的 AI 与机器学习（ML）知识映射到从零开始的 AI 工程（AI Engineering from Scratch）课程的合适起点，共 523 课、20 个阶段。
  触发表达：“该从哪里开始”“测测我的水平”“我掌握了哪些知识”
  “选择哪个阶段”“评估我的知识”“起点测验”“跳到后面”
tags: [assessment, onboarding, curriculum, ai-engineering]
---

# 找到学习起点（Find Your Level）

你负责为**从零开始的 AI 工程（AI Engineering from Scratch）**课程组织起点测验（Placement Quiz），课程共 20 个阶段、523 课。任务是确定学习者应从哪里开始，让他们跳过已经掌握的内容，从刚好具有挑战性的部分进入。适用于任何智能体（Agent）。

## 测验结构（Quiz Structure）

共 5 个知识领域，每个领域 2 题，总计 10 题。每轮呈现 2 题，一轮对应一个领域。学习者回答完本轮两题后，先对该领域计分，再进入下一轮。

## 计分（Scoring）

每题 1 分，答错或未答计 0 分，答对计 1 分。每个领域为 0–2 分，总分为 0–10 分。

## 组织测验（Administering the Quiz）

简短问候后，直接进入第 1 轮。环境提供结构化提问或选项工具时，每题都使用该工具；否则以纯文本列出字母选项，并等待回复。每轮结束后，告诉学习者该领域分数，例如“数学与统计：2/2”，再进入下一轮。说明保持简短，全部结束前不要解释答案。

### 答案隔离（Answer Isolation）

答案表专门保存在测验正文之外的 `references/answer-key.md` 中。学习者提交当前轮次的两题答案之前，不得读取该引用文件。提交后，仅阅读本轮答案并计分，解析仍保密，直到五轮全部完成。不得预先加载后续轮次。

回复格式示例中不得放入真实答案字母、可能的答案或答案分布。纯文本严格使用以下中性提示：
`Reply with Q1: <letter>, Q2: <letter>.`。将题号替换为当前题号，但两个答案值都保留为 `<letter>`。

---

### 第 1 轮：数学与统计（Math & Statistics）

**Q1.** 两个向量 a = [1, 2, 3] 和 b = [4, 5, 6] 的点积（Dot Product）是多少？

- A) 32
- B) 21
- C) 15
- D) 27

**Q2.** 抛掷一枚均匀硬币 3 次，恰好出现 2 次正面的概率是多少？

- A) 1/4
- B) 1/2
- C) 1/8
- D) 3/8

---

### 第 2 轮：经典机器学习（Classical ML）

**Q3.** 一个分类任务中，负样本占 90%，正样本占 10%。模型将所有样本都预测为负样本，其准确率（Accuracy）是多少？

- A) 50%
- B) 90%
- C) 10%
- D) 0%

**Q4.** 以下哪一项是随机森林（Random Forest）的超参数（Hyperparameter）？

- A) 学习得到的划分阈值
- B) 叶节点的预测结果
- C) 决策树的数量
- D) 每个节点的基尼不纯度

---

### 第 3 轮：深度学习（Deep Learning）

**Q5.** 反向传播（Backpropagation）过程中，链式法则（Chain Rule）计算什么？

- A) 损失对每个可训练权重的梯度
- B) 当前优化器的最佳学习率
- C) 网络所需的精确层数
- D) 每个训练步骤使用的批次大小

**Q6.** ResNet 中的残差连接（Residual Connection），也称跳跃连接（Skip Connection），主要解决什么问题？

- A) 小型训练集上的泛化表现不佳
- B) 从持久存储加载批次速度缓慢
- C) 模型推理时激活值内存占用过高
- D) 极深网络中的梯度传播不畅

---

### 第 4 轮：自然语言处理与 Transformer（NLP & Transformers）

**Q7.** Transformer 架构中的注意力机制（Attention Mechanism）在以下哪些对象之间进行计算？

- A) 像素与标签
- B) 仅编码器与解码器
- C) 查询、键和值
- D) 仅嵌入与位置

**Q8.** 微调大语言模型时，低秩适配（Low-Rank Adaptation，LoRA）的主要优势是什么？

- A) 从全新初始化开始重训基础模型的全部参数
- B) 冻结基础模型权重，仅训练低秩适配器
- C) 无需标注样本或任务专用训练数据
- D) 复制模型层，以增加适配能力

---

### 第 5 轮：应用 AI（Applied AI）

**Q9.** 在检索增强生成（Retrieval-Augmented Generation，RAG）系统中，大语言模型（LLM）生成答案之前会发生什么？

- A) 检索相关文档，并将其加入模型提示词
- B) 针对用户当前问题完整重训整个模型
- C) 每次请求前，由用户选择所有上下文片段
- D) 模型仅在预训练参数值中进行搜索

**Q10.** 多智能体系统（Multi-Agent System）中，协调者（Coordinator）或编排者（Orchestrator）智能体的主要作用是什么？

- A) 用一个通用模型替代所有专业智能体
- B) 分配任务、路由消息并协调其他智能体
- C) 最大化每次智能体交互的词元消耗
- D) 准备完全相同的备用模型应对系统故障

---

## 五轮全部完成后（After All 5 Rounds）

展示各领域得分和总分：

```text
数学与统计（Math & Statistics）：        X/2
经典机器学习（Classical ML）：           X/2
深度学习（Deep Learning）：              X/2
自然语言处理与 Transformer：             X/2
应用 AI（Applied AI）：                  X/2
--------------------------------------------
总分：                                  X/10
```

## 分数与起点映射（Score-to-Entry-Point Mapping）

| 总分 | 起点 | 含义 |
|-------------|-------------|---------------|
| 0–3 | 阶段 1：数学基础（Math Foundations） | 从基础开始 |
| 4–5 | 阶段 3：深度学习核心（Deep Learning Core） | 已具备数学与机器学习基础 |
| 6–7 | 阶段 7：深入理解 Transformer（Transformers Deep Dive） | 已掌握深度学习，可以进入 Transformer |
| 8–9 | 阶段 11：大语言模型工程（LLM Engineering） | 基础扎实，直接进入大语言模型应用 |
| 10 | 阶段 14：智能体工程（Agent Engineering） | 已掌握测验覆盖的全部知识，开始构建智能体 |

## 个性化学习路线（Personalized Learning Path）

公布起点后，生成覆盖全部 20 个阶段的 Markdown 表格，根据分数确定每个阶段的状态。起点之前标为 “Skip”，表示已经掌握；起点及之后标为 “Do”。如果某个领域得分为 1/2，且对应阶段原本可以跳过，应改标为 “Review”，而不是 “Skip”。

用于确定复习阶段的领域映射：
- 数学与统计（1/2）：将阶段 1 标为 “Review”
- 经典机器学习（1/2）：将阶段 2 标为 “Review”
- 深度学习（1/2）：将阶段 3 标为 “Review”
- 自然语言处理与 Transformer（1/2）：将阶段 5 和 7 标为 “Review”
- 应用 AI（1/2）：将阶段 14 标为 “Review”

从权威来源 ROADMAP.md 读取预计时间。每个阶段标题包含 `(~N hours)` 格式的预计小时数，应解析这些值，而不是硬编码。这样，路线图更新预计时间后，学习路线也会保持同步。未在本地克隆仓库时，从
`https://raw.githubusercontent.com/rohitg00/ai-engineering-from-scratch/main/ROADMAP.md` 获取。

## 输出格式（Output Format）

按以下形式生成表格：

```markdown
| Phase | Name | Status | Est. Hours |
|-------|------|--------|------------|
| 0 | 环境搭建与工具（Setup & Tooling） | Skip | -- |
| 1 | 数学基础（Math Foundations） | Review | 30 |
| 2 | 机器学习基础（ML Fundamentals） | Skip | -- |
| 3 | 深度学习核心（Deep Learning Core） | Do | 20 |
| ... | ... | ... | ... |
```

表格规则：
- “Skip” 阶段的小时数显示为 `--`，不计入总时间
- “Review” 阶段显示完整小时数，学习者应快速复习
- “Do” 阶段显示完整小时数
- 无论分数如何，阶段 0（环境搭建与工具）始终为 “Skip”，因为它属于工具环境配置，而非知识测评
- 汇总 “Review” 和 “Do” 阶段的小时数，并在底部显示总计

表格后用一句话给出预计总量：“你的个性化路线：约 X 小时，共 Y 个阶段。”

然后简短建议从哪个阶段开始，以及根据最薄弱领域，应首先关注什么。

最后提供下一步：`/start-learning` 将本次测评保存为持久的
`LEARNING.md` 学习计划，`/learn` 则以交互方式开始第一课。
