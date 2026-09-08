# 命名实体识别（Named Entity Recognition）

> 把名称提取出来。听上去容易，直到遇到模糊边界、嵌套实体和领域行话。

**Type:** Build
**Languages:** Python
**Prerequisites:** 阶段 5 · 02（词袋与 TF-IDF，BoW + TF-IDF），阶段 5 · 03（词嵌入，Word Embeddings）
**Time:** ~75 分钟

## 问题（The Problem）

“Apple sued Google over its iPhone search deal in the US.”（Apple 就其在美国的 iPhone 搜索交易起诉 Google。）有五个实体：Apple（ORG）、Google（ORG）、iPhone（PRODUCT）、search deal（也许算一个）、US（GPE）。好的命名实体识别（Named Entity Recognition，NER）系统会提取全部实体并正确标注类型；差的系统会漏掉 iPhone，混淆作为水果的 Apple 与公司 Apple，甚至将“US”标为 PERSON。

NER 是每条结构化提取（Structured extraction）流水线的基础主力：简历解析、合规日志扫描、病历匿名化、搜索查询理解、聊天机器人回答的依据关联（Grounding）、法律合同提取。你不一定看见它，却始终依赖它。

本课从传统路线（规则、HMM、CRF）走向现代路线（BiLSTM-CRF，再到 Transformer）。每一步都解决前一步的某个具体限制，这个演进模式正是本课重点。

## 概念（The Concept）

**BIO 标注（BIO tagging）**或 BILOU 将实体提取转化为序列标注（Sequence labeling）问题。给每个词元标记 `B-TYPE`（实体开始）、`I-TYPE`（实体内部）或 `O`（实体外部）。

```
Apple    B-ORG
sued     O
Google   B-ORG
over     O
its      O
iPhone   B-PRODUCT
search   O
deal     O
in       O
the      O
US       B-GPE
.        O
```

多词元实体串成链：`New B-GPE`、`York I-GPE`、`City I-GPE`。理解 BIO 的模型可以提取任意跨度（Span）。

架构演进如下：

- **基于规则（Rule-based）。** 正则表达式加专名词典（Gazetteer）查找。已知实体精确率高，对新实体则完全没有覆盖。
- **隐马尔可夫模型（Hidden Markov Model，HMM）。** 建模给定标签时词元的发射概率（Emission probability），以及标签之间的转移概率（Transition probability），使用 Viterbi 解码，在标注数据上训练。
- **条件随机场（Conditional Random Field，CRF）。** 类似 HMM，但属于判别式（Discriminative）模型，因此可混合任意特征，如词形、大小写、邻近词。到 2026 年，它仍是低资源部署中传统生产系统的主力。
- **双向 LSTM–条件随机场（BiLSTM-CRF）。** 用神经特征代替手工特征。LSTM 从两个方向读句子，顶部 CRF 层约束标签序列一致性。
- **基于 Transformer（Transformer-based）。** 加词元分类头（Token-classification head）微调 BERT，准确率最高，计算量也最大。

```figure
ner-bio-tagging
```

## 动手实现（Build It）

### 步骤 1：BIO 标注辅助函数（BIO tagging helpers）

```python
def spans_to_bio(tokens, spans):
    labels = ["O"] * len(tokens)
    for start, end, label in spans:
        labels[start] = f"B-{label}"
        for i in range(start + 1, end):
            labels[i] = f"I-{label}"
    return labels


def bio_to_spans(tokens, labels):
    spans = []
    current = None
    for i, label in enumerate(labels):
        if label.startswith("B-"):
            if current:
                spans.append(current)
            current = (i, i + 1, label[2:])
        elif label.startswith("I-") and current and current[2] == label[2:]:
            current = (current[0], i + 1, current[2])
        else:
            if current:
                spans.append(current)
                current = None
    if current:
        spans.append(current)
    return spans
```

```python
>>> tokens = ["Apple", "sued", "Google", "over", "iPhone", "sales", "."]
>>> labels = ["B-ORG", "O", "B-ORG", "O", "B-PRODUCT", "O", "O"]
>>> bio_to_spans(tokens, labels)
[(0, 1, 'ORG'), (2, 3, 'ORG'), (4, 5, 'PRODUCT')]
```

### 步骤 2：手工特征（Hand-crafted features）

对传统非神经 NER 而言，特征是关键。下面这些特征很有用：

```python
def token_features(token, prev_token, next_token):
    return {
        "lower": token.lower(),
        "is_upper": token.isupper(),
        "is_title": token.istitle(),
        "has_digit": any(c.isdigit() for c in token),
        "suffix_3": token[-3:].lower(),
        "shape": word_shape(token),
        "prev_lower": prev_token.lower() if prev_token else "<BOS>",
        "next_lower": next_token.lower() if next_token else "<EOS>",
    }


def word_shape(word):
    out = []
    for c in word:
        if c.isupper():
            out.append("X")
        elif c.islower():
            out.append("x")
        elif c.isdigit():
            out.append("d")
        else:
            out.append(c)
    return "".join(out)
```

`word_shape("iPhone")` 返回 `xXxxxx`，`word_shape("USA-2024")` 返回 `XXX-dddd`。大小写模式对专有名词具有很强的提示作用。

### 步骤 3：简单的规则与词典基线（A simple rule-based + dictionary baseline）

```python
ORG_GAZETTEER = {"Apple", "Google", "Microsoft", "OpenAI", "Meta", "Amazon", "Netflix"}
GPE_GAZETTEER = {"US", "USA", "UK", "India", "Germany", "France"}
PRODUCT_GAZETTEER = {"iPhone", "Android", "Windows", "ChatGPT", "Claude"}


def rule_based_ner(tokens):
    labels = []
    for token in tokens:
        if token in ORG_GAZETTEER:
            labels.append("B-ORG")
        elif token in GPE_GAZETTEER:
            labels.append("B-GPE")
        elif token in PRODUCT_GAZETTEER:
            labels.append("B-PRODUCT")
        else:
            labels.append("O")
    return labels
```

生产专名词典包含从 Wikipedia 和 DBpedia 抓取的数百万条词条，覆盖不错，但消歧很差，例如区分公司 `Apple` 与水果。这就是统计模型胜出的原因。

### 步骤 4：CRF，示意而非完整实现（The CRF step）

没有概率论基础，用 50 行代码从零完整实现 CRF 并不能帮助理解。改用 `sklearn-crfsuite`：

```python
import sklearn_crfsuite

def to_features(tokens):
    out = []
    for i, tok in enumerate(tokens):
        prev = tokens[i - 1] if i > 0 else ""
        nxt = tokens[i + 1] if i + 1 < len(tokens) else ""
        out.append({
            "word.lower()": tok.lower(),
            "word.isupper()": tok.isupper(),
            "word.istitle()": tok.istitle(),
            "word.isdigit()": tok.isdigit(),
            "word.suffix3": tok[-3:].lower(),
            "word.shape": word_shape(tok),
            "prev.word.lower()": prev.lower(),
            "next.word.lower()": nxt.lower(),
            "BOS": i == 0,
            "EOS": i == len(tokens) - 1,
        })
    return out


crf = sklearn_crfsuite.CRF(algorithm="lbfgs", c1=0.1, c2=0.1, max_iterations=100, all_possible_transitions=True)
X_train = [to_features(s) for s in sentences_tokenized]
crf.fit(X_train, bio_labels_train)
```

`c1` 与 `c2` 分别是 L1 和 L2 正则化。`all_possible_transitions=True` 让模型学会非法序列（如 `O` 后接 `I-ORG`）不太可能出现，从而无须手写约束，CRF 就能维持 BIO 一致性。

### 步骤 5：BiLSTM-CRF 增加了什么（What a BiLSTM-CRF adds）

特征改为通过学习获得。输入是词元嵌入（GloVe 或 fastText）。LSTM 从左向右、从右向左读取，将拼接后的隐藏状态送入 CRF 输出层。CRF 仍负责标签序列一致性，LSTM 则用学习特征取代手工特征。

```python
import torch
import torch.nn as nn


class BiLSTM_CRF_Head(nn.Module):
    def __init__(self, vocab_size, embed_dim, hidden_dim, n_labels):
        super().__init__()
        self.embed = nn.Embedding(vocab_size, embed_dim)
        self.lstm = nn.LSTM(embed_dim, hidden_dim, bidirectional=True, batch_first=True)
        self.fc = nn.Linear(hidden_dim * 2, n_labels)

    def forward(self, token_ids):
        e = self.embed(token_ids)
        h, _ = self.lstm(e)
        emissions = self.fc(h)
        return emissions
```

CRF 层使用 `torchcrf.CRF`（pip install pytorch-crf）。相较手工特征 CRF 的提升可以测量，但除非你有数万条标注句子，否则收益会比预期小。

## 实际应用（Use It）

spaCy 开箱即用地提供生产级 NER。

```python
import spacy

nlp = spacy.load("en_core_web_sm")
doc = nlp("Apple sued Google over its iPhone search deal in the US.")
for ent in doc.ents:
    print(f"{ent.text:20s} {ent.label_}")
```

```
Apple                ORG
Google               ORG
iPhone               ORG
US                   GPE
```

注意 `iPhone` 被标为 `ORG` 而不是 `PRODUCT`，spaCy 小模型对产品实体的覆盖较弱。大模型（`en_core_web_lg`）更好，Transformer 模型（`en_core_web_trf`）还要更好。

用 Hugging Face 实现基于 BERT 的 NER：

```python
from transformers import pipeline

ner = pipeline("ner", model="dslim/bert-base-NER", aggregation_strategy="simple")
print(ner("Apple sued Google over its iPhone in the US."))
```

```
[{'entity_group': 'ORG', 'word': 'Apple', ...},
 {'entity_group': 'ORG', 'word': 'Google', ...},
 {'entity_group': 'MISC', 'word': 'iPhone', ...},
 {'entity_group': 'LOC', 'word': 'US', ...}]
```

`aggregation_strategy="simple"` 将连续的 B-X、I-X 词元合并成一个跨度。不设置它，得到的是词元级标签，需要自行合并。

### 基于 LLM 的 NER：2026 年的选择（LLM-based NER）

现在，零样本（Zero-shot）和少样本（Few-shot）LLM NER 在许多领域已能与微调模型竞争，标注稀缺时则明显更好。

- **零样本提示（Zero-shot prompting）。** 向 LLM 提供实体类型列表和模式（Schema）示例，要求输出 JSON。开箱可用，在新领域的准确率中等。
- **ZeroTuneBio 式提示（ZeroTuneBio-style prompting）。** 将任务拆为候选提取 → 含义解释 → 判断 → 复查。多阶段而非单次提示能显著提高生物医学 NER 准确率，同样的模式也适用于法律、金融和科学领域。
- **结合检索增强生成（RAG）的动态提示（Dynamic prompting）。** 每次推理调用时，从小型种子标注集中检索最相似样本，实时构建少样本提示词。在 2026 年基准上，相较静态提示，这使 GPT-4 生物医学 NER 的 F1 提高 11-12%。
- **按实体类型分解（Per-entity-type decomposition）。** 对长文档，一次调用同时提取所有类型，召回率会随长度增加而下降。每种实体类型单独提取一遍，推理成本更高，但准确率也明显更高。这是临床记录与法律合同的标准模式。

截至 2026 年的生产建议：收集训练数据之前，先做 LLM 零样本基线。其 F1 往往已经够用，以至于不必再微调。

### 传统 NER 仍然胜出的场景（Where classical NER still wins）

即使有 LLM，以下情况仍适合传统 NER：

- 延迟预算小于 50ms。
- 有数千个标注样本，且需要 98%+ F1。
- 领域本体（Ontology）稳定，预训练 CRF 或 BiLSTM 能有效迁移。
- 监管约束要求本地部署、非生成式模型。

### 失效场景（Where it falls apart）

- **领域偏移（Domain shift）。** 在 CoNLL 上训练的 NER 用于法律合同，表现比专名词典还差。应在你的领域上微调。
- **嵌套实体（Nested entities）。** “Bank of America Tower”同时是 ORG 和 FACILITY。标准 BIO 无法表示重叠跨度，需要嵌套 NER，即多轮或基于跨度的模型。
- **长实体（Long entities）。** “United States Federal Deposit Insurance Corporation.” 词元级模型有时会把它拆开。使用 `aggregation_strategy` 或后处理。
- **稀疏类型（Sparse types）。** 医学 NER 标签如 DRUG_BRAND、ADVERSE_EVENT、DOSE，通用模型并不了解。可从 Scispacy 和 BioBERT 起步。

## 交付成果（Ship It）

保存为 `outputs/skill-ner-picker.md`：

```markdown
---
name: ner-picker
description: 为给定提取任务选择合适的命名实体识别（NER）方法。
version: 1.0.0
phase: 5
lesson: 06
tags: [nlp, ner, extraction]
---

根据任务描述（领域、标签集、语言、延迟、数据量），输出：

1. 方法：规则加专名词典、CRF、BiLSTM-CRF 或 Transformer 微调。
2. 起始模型：给出名称，如 spaCy 模型 ID、Hugging Face 检查点 ID，或“自定义，从零训练”。
3. 标注策略：BIO、BILOU 或基于跨度，用一句话说明理由。
4. 评估：使用 `seqeval`。始终报告实体级 F1，而不是词元级 F1。

标注样本少于 500 个时，拒绝推荐微调 Transformer，除非用户已有预训练领域模型。指出嵌套实体需要基于跨度或多轮模型。用户提及“生产规模”且标签仍与 CoNLL-2003 相同时，要求审计专名词典。
```

## 练习（Exercises）

1. **简单。** 实现 `bio_to_spans`，即 `spans_to_bio` 的逆操作，在 10 个句子上验证往返转换一致性。
2. **中等。** 在 CoNLL-2003 英语 NER 数据集上训练上述 sklearn-crfsuite CRF，使用 `seqeval` 报告各实体类型 F1，典型结果约为 84 F1。
3. **困难。** 在医学、法律或金融等领域专用 NER 数据集上微调 `distilbert-base-cased`，与 spaCy 小模型比较。记录数据泄漏（Data leakage）检查，写下令你意外的发现。

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|------|-----------------|-----------------------|
| 命名实体识别（NER） | 提取名称 | 为词元跨度标注类型，如 PERSON、ORG、GPE、DATE 等。 |
| BIO 标注（BIO） | 标注方案 | `B-X` 表示开始，`I-X` 表示延续，`O` 表示外部。 |
| BILOU 标注（BILOU） | 更好的 BIO | 增加 `L-X`（末尾）、`U-X`（单词元实体），使边界更清晰。 |
| 条件随机场（CRF） | 结构化分类器 | 不只建模发射，还建模标签之间的转移，约束有效序列。 |
| 嵌套 NER（Nested NER） | 重叠实体 | 一个跨度与其子跨度属于不同实体，BIO 无法表达。 |
| 实体级 F1（Entity-level F1） | 正确的 NER 指标 | 预测跨度必须精确匹配真实跨度；词元级 F1 会夸大准确性。 |

## 延伸阅读（Further Reading）

- [Lample 等（2016）：命名实体识别的神经架构（Neural Architectures for Named Entity Recognition）](https://arxiv.org/abs/1603.01360)：经典 BiLSTM-CRF 论文。
- [Devlin 等（2018）：BERT，深度双向 Transformer 预训练（Pre-training of Deep Bidirectional Transformers）](https://arxiv.org/abs/1810.04805)：介绍了后来成为标准的词元分类模式。
- [spaCy 语言特征：命名实体（Named entities）](https://spacy.io/usage/linguistic-features#named-entities)：`Doc.ents` 和 `Span` 各属性的实用参考。
- [seqeval](https://github.com/chakki-works/seqeval)：正确的指标库，始终使用它。
