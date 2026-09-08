---
name: prompt-sft-data-curator
description: 为监督微调设计和整理指令数据集
version: 1.0.0
phase: 10
lesson: 6
tags: [sft, instruction-tuning, fine-tuning, data-curation, alignment]
---

# SFT 数据整理助手（SFT Data Curator）

为代码生成、数学、对话、安全等特定能力设计指令微调（Instruction tuning）数据集时，用此框架规划数据收集、定义质量标准并组织训练流水线。

## 输入要求（Input Requirements）

请提供：
- **目标能力**，例如“Python 代码生成”“医疗问答”“多轮对话”
- **基础模型（Base model）**，例如 Llama 3 8B、Mistral 7B、Qwen 2.5 72B
- **预算**，包括标注工时、合成数据生成的 API 成本
- **格式偏好**，Alpaca、ShareGPT、ChatML

## 步骤 1：数据集设计（Step 1: Dataset Design）

### 规模指南（Size Guidelines）

| 质量级别 | 所需样例数 | 预期结果 |
|--------------|----------------|------------------|
| 研究原型 | 1,000-5,000 | LIMA 水平，若样例由专家编写，可媲美更大数据集 |
| 生产 v1 | 10,000-50,000 | Stanford Alpaca 水平，在常见任务中稳定遵循指令 |
| 生产 v2 | 50,000-200,000 | Vicuna/Llama 2 Chat 水平，可靠的多轮对话与领域覆盖 |

质量始终胜过数量。2023 年 5 月的 LIMA 使用 1,000 个专家编写样例，就媲美了用 50,000 多个样例训练的模型。优先考虑：

1. **多样性** -- 覆盖目标能力的全部范围
2. **准确性** -- 每个回答的事实必须正确
3. **清晰性** -- 回答应简洁、结构清楚
4. **难度梯度** -- 包含简单、中等、困难样例

### 多样性检查清单（Diversity Checklist）

通用助手可采用：
- 开放式问题，20%
- 事实问答，20%
- 创意写作，10%
- 代码生成，15%
- 推理过程（Reasoning）与数学，15%
- 摘要，10%
- 带约束的指令遵循，10%

针对领域模型调整比例。编程助手可以将 60% 分配给代码生成，20% 分配给代码解释。

## 步骤 2：数据格式（Step 2: Data Format）

### Alpaca 格式：单轮（Alpaca Format (single-turn)）

```json
{
  "instruction": "Write a function that reverses a string in Python.",
  "input": "",
  "output": "def reverse_string(s):\n    return s[::-1]"
}
```

适用于：单轮任务、简单指令与回答对、快速原型。

### ShareGPT 格式：多轮（ShareGPT Format (multi-turn)）

```json
{
  "conversations": [
    {"from": "system", "value": "You are a Python expert."},
    {"from": "human", "value": "How do I reverse a string?"},
    {"from": "gpt", "value": "Use slicing: s[::-1]"},
    {"from": "human", "value": "What about for a list?"},
    {"from": "gpt", "value": "Same syntax works: my_list[::-1]"}
  ]
}
```

适用于：对话应用，以及多轮上下文很重要的场景。

### ChatML 格式：带特殊词元（ChatML Format (with special tokens)）

```
<|im_start|>system
You are a Python expert.<|im_end|>
<|im_start|>user
How do I reverse a string?<|im_end|>
<|im_start|>assistant
Use slicing: s[::-1]<|im_end|>
```

适用于：以 Qwen、Yi 等原生使用 ChatML 的模型为目标。

## 步骤 3：质量标准（Step 3: Quality Criteria）

### 逐样例检查（Per-Example Checks）

1. **回答相关性**：是否真正回应指令？
2. **事实准确性**：所有说法是否可验证且正确？
3. **完整性**：是否完整满足指令？
4. **简洁性**：相同信息能否用更少文字表达？
5. **格式一致性**：是否符合预期风格？

### 警示信号：拒收该样例（Red Flags (reject the example)）

- 回答自相矛盾
- 回答包含有害内容，却没有拒绝
- 回答编造事实或引用
- 指令含糊，回答却没有澄清
- 回答只是改写并重复指令

### 数据集级检查（Dataset-Level Checks）

- 任一单一来源或模板的样例不超过 5%
- 至少 80% 回答词元有实际意义，而非填充内容
- 平均回答长度为 50-200 词元，避免过短或过长
- 系统提示词多样性：至少包含 10 种不同系统提示词

## 步骤 4：训练配置（Step 4: Training Configuration）

| 参数 | 推荐范围 | 说明 |
|-----------|------------------|-------|
| 学习率 | 1e-5 到 5e-5 | 模型越大越低，70B 用 1e-5，7B 用 5e-5 |
| 训练轮数（Epochs） | 1-3 | 监控验证损失，刚出现上升就停止 |
| 批大小 | 32-128 | GPU 受限时用梯度累积扩展 |
| 预热（Warmup） | 总步数的 0-5% | 不如预训练时关键 |
| 权重衰减（Weight decay） | 0.0-0.1 | 短程微调可选 |
| 损失掩码（Loss masking） | 仅回答词元 | 屏蔽指令和系统提示词词元 |
| 预训练数据混合 | 2-5% | 混入原始文本，防止灾难性遗忘 |

## 步骤 5：评估规程（Step 5: Evaluation Protocol）

训练后评估：

1. **指令遵循率**：测试提示词中，模型给出相关、完整回答的比例
2. **遗忘分数**：在留出的通用文本语料上测量困惑度（Perplexity），与基础模型比较
3. **格式合规率**：符合预期聊天格式的回答比例
4. **MT-Bench 或 AlpacaEval**：指令微调模型的标准基准测试（Benchmark）
5. **领域专用评估**：针对目标能力自定义评估

### 警示迹象（Warning Signs）

- 第 1 轮后验证损失上升：出现过拟合，应减少轮数或增加数据
- 遗忘分数上升 > 15%：学习率过高或轮数过多
- 模型逐字复现训练样例：严重过拟合，需要更多样的数据
- 模型拒绝无害指令：安全数据训练过度，应重新平衡数据集
