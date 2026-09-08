# 词性标注与句法解析（POS Tagging and Syntactic Parsing）

> 语法一度不受重视，后来每条 LLM 流水线都需要验证结构化提取，它又回来了。

**Type:** Build
**Languages:** Python
**Prerequisites:** 阶段 5 · 01（文本处理，Text Processing），阶段 2 · 14（朴素贝叶斯，Naive Bayes）
**Time:** ~45 分钟

## 问题（The Problem）

第 01 课提到，词形还原（Lemmatization）需要词性标签。不知道 `running` 是动词，词形还原器就无法将它还原为 `run`；不知道 `better` 是形容词，就无法还原为 `good`。

这句话背后藏着一整个子领域。词性标注（Part-of-speech tagging，POS tagging）分配语法类别；句法解析（Syntactic parsing）恢复句子的树结构：哪个词修饰哪个词，哪个动词支配哪些论元（Argument）。传统 NLP 花了二十年完善两者。随后，深度学习将它们归并为预训练 Transformer 上的词元分类任务，研究界转向了其他方向。

应用界却没有。每条结构化提取流水线底层仍使用词性与依存树（Dependency tree）。LLM 生成的 JSON 要按语法约束验证；问答系统通过依存解析分解查询；机器翻译质量评估器检查解析树的对齐。

这些值得掌握。本课介绍标签集、基线，以及何时应停止从零实现，转而调用 spaCy。

## 概念（The Concept）

**词性标注（POS tagging）**为每个词元标注语法类别。**Penn Treebank（PTB）**标签集是英语默认选择，共 36 个标签，区分之细可能让普通读者觉得繁琐：`NN` 为单数名词，`NNS` 为复数名词，`NNP` 为单数专有名词，`VBD` 为动词过去式，`VBZ` 为第三人称单数现在时动词，等等。**通用依存（Universal Dependencies，UD）**标签集粒度更粗，共 17 个标签，且与语言无关，已成为跨语言工作的默认选择。

```
The/DET cats/NOUN were/AUX running/VERB at/ADP 3pm/NOUN ./PUNCT
```

**句法解析（Syntactic parsing）**生成一棵树，主要有两种形式：

- **成分句法解析（Constituency parsing）。** 名词短语、动词短语、介词短语相互嵌套。输出由非终结类别（NP、VP、PP）构成的树，词是叶节点。
- **依存句法解析（Dependency parsing）。** 每个词有一个它依赖的中心词（Head word），并以语法关系标记。输出一棵树，每条边是（中心词，依存词，关系）三元组。

依存解析在 2010 年代胜出，因为它能自然地泛化到不同语言，尤其是自由词序语言。

```
running 是 ROOT
cats 是 running 的 nsubj
were 是 running 的 aux
at 是 running 的 prep
3pm 是 at 的 pobj
```

```figure
pos-tagger
```

```figure
dependency-arcs
```

## 动手实现（Build It）

### 步骤 1：最高频标签基线（Most-frequent-tag baseline）

最朴素的可用词性标注器：为每个词预测它在训练中最常对应的标签。

```python
from collections import Counter, defaultdict


def train_mft(train_examples):
    word_tag_counts = defaultdict(Counter)
    all_tags = Counter()
    for tokens, tags in train_examples:
        for token, tag in zip(tokens, tags):
            word_tag_counts[token.lower()][tag] += 1
            all_tags[tag] += 1
    word_best = {w: c.most_common(1)[0][0] for w, c in word_tag_counts.items()}
    default_tag = all_tags.most_common(1)[0][0]
    return word_best, default_tag


def predict_mft(tokens, word_best, default_tag):
    return [word_best.get(t.lower(), default_tag) for t in tokens]
```

在 Brown 语料库上，这个基线准确率约为 85%。算不上好，但任何严肃模型都不应低于这个下限。

### 步骤 2：二元 HMM 标注器（Bigram HMM tagger）

建模序列的联合概率：

```
P(tags, words) = prod P(tag_i | tag_{i-1}) * P(word_i | tag_i)
```

使用两张表：转移概率，即给定前一标签时当前标签的概率；发射概率，即给定标签时词的概率。两者都通过计数加拉普拉斯平滑估计，使用 Viterbi 解码，即在标签格（Tag lattice）上做动态规划。

```python
import math


def train_hmm(train_examples, alpha=0.01):
    transitions = defaultdict(Counter)
    emissions = defaultdict(Counter)
    tags = set()
    vocab = set()

    for tokens, ts in train_examples:
        prev = "<BOS>"
        for token, tag in zip(tokens, ts):
            transitions[prev][tag] += 1
            emissions[tag][token.lower()] += 1
            tags.add(tag)
            vocab.add(token.lower())
            prev = tag
        transitions[prev]["<EOS>"] += 1

    return transitions, emissions, tags, vocab


def log_prob(table, given, key, smooth_denom, alpha):
    return math.log((table[given].get(key, 0) + alpha) / smooth_denom)


def viterbi(tokens, transitions, emissions, tags, vocab, alpha=0.01):
    tags_list = list(tags)
    n = len(tokens)
    V = [[0.0] * len(tags_list) for _ in range(n)]
    back = [[0] * len(tags_list) for _ in range(n)]

    for j, tag in enumerate(tags_list):
        em_denom = sum(emissions[tag].values()) + alpha * (len(vocab) + 1)
        tr_denom = sum(transitions["<BOS>"].values()) + alpha * (len(tags_list) + 1)
        tr = log_prob(transitions, "<BOS>", tag, tr_denom, alpha)
        em = log_prob(emissions, tag, tokens[0].lower(), em_denom, alpha)
        V[0][j] = tr + em
        back[0][j] = 0

    for i in range(1, n):
        for j, tag in enumerate(tags_list):
            em_denom = sum(emissions[tag].values()) + alpha * (len(vocab) + 1)
            em = log_prob(emissions, tag, tokens[i].lower(), em_denom, alpha)
            best_prev = 0
            best_score = -1e30
            for k, prev_tag in enumerate(tags_list):
                tr_denom = sum(transitions[prev_tag].values()) + alpha * (len(tags_list) + 1)
                tr = log_prob(transitions, prev_tag, tag, tr_denom, alpha)
                score = V[i - 1][k] + tr + em
                if score > best_score:
                    best_score = score
                    best_prev = k
            V[i][j] = best_score
            back[i][j] = best_prev

    last_best = max(range(len(tags_list)), key=lambda j: V[n - 1][j])
    path = [last_best]
    for i in range(n - 1, 0, -1):
        path.append(back[i][path[-1]])
    return [tags_list[j] for j in reversed(path)]
```

二元 HMM 在 Brown 上达到约 93% 准确率。从 85% 到 93% 的提升主要来自转移概率：模型学会 `DET NOUN` 常见，而 `NOUN DET` 少见。

### 步骤 3：现代标注器为何更好（Why modern taggers beat this）

转移与发射概率都是局部的，无法捕捉 `saw` 在“I bought a saw”（我买了一把锯子）中是名词，而在“I saw the movie”（我看了那部电影）中是动词。使用任意特征（后缀、词形、前后词、词本身）的 CRF 可达到约 97%，BiLSTM-CRF 或 Transformer 则可达到约 98%+。

这项任务的上限由标注者分歧决定。人工标注者在 Penn Treebank 上的一致率约为 97%。超过 98% 的模型可能在过拟合测试集。

### 步骤 4：依存解析概述（Dependency parsing sketch）

从零完整实现依存解析超出本课范围，权威教材讲解见 Jurafsky 与 Martin。需要了解两类传统方法：

- **基于转移（Transition-based）**的解析器，如 arc-eager、arc-standard，类似移进–归约（Shift-reduce）解析器：读取词元，移进栈，再通过创建弧的归约动作处理。贪心解码速度快。经典实现是 MaltParser，现代神经版本是 Chen 与 Manning 的转移式解析器。
- **基于图（Graph-based）**的解析器，如 Eisner 算法、Dozat-Manning 双仿射（Biaffine）模型，为所有可能的中心词–依存词边评分，再选择最大生成树（Maximum spanning tree）。速度较慢，但准确率更高。

多数应用工作直接调用 spaCy：

```python
import spacy

nlp = spacy.load("en_core_web_sm")
doc = nlp("The cats were running at 3pm.")
for token in doc:
    print(f"{token.text:10s} tag={token.tag_:5s} pos={token.pos_:6s} dep={token.dep_:10s} head={token.head.text}")
```

```
The        tag=DT    pos=DET    dep=det        head=cats
cats       tag=NNS   pos=NOUN   dep=nsubj      head=running
were       tag=VBD   pos=AUX    dep=aux        head=running
running    tag=VBG   pos=VERB   dep=ROOT       head=running
at         tag=IN    pos=ADP    dep=prep       head=running
3pm        tag=NN    pos=NOUN   dep=pobj       head=at
.          tag=.     pos=PUNCT  dep=punct      head=running
```

从下到上阅读 `dep` 列，句子的语法结构便清楚了。

## 实际应用（Use It）

各生产 NLP 库都将词性与依存解析器作为标准流水线的一部分提供。

- **spaCy**（`en_core_web_sm` / `md` / `lg` / `trf`）：快速、准确，与分词、NER、词形还原集成。`token.tag_` 是 Penn 标签，`token.pos_` 是 UD 标签，`token.dep_` 是依存关系。
- **Stanford NLP（stanza）**：Stanford 的 CoreNLP 后继项目，在 60+ 种语言上达到最先进水平。
- **trankit**：基于 Transformer，UD 准确率高。
- **NLTK**：`pos_tag`。可用但较慢、较旧，适合教学。

### 2026 年仍然重要的用途（Where this still matters in 2026）

- **词形还原（Lemmatization）。** 第 01 课要正确还原词形就需要词性，一直如此。
- **从 LLM 输出中结构化提取（Structured extraction）。** 验证生成句子遵守语法约束，如主谓一致、必需修饰语。
- **基于方面的情感分析（Aspect-based sentiment）。** 依存解析告诉你哪个形容词修饰哪个名词。
- **查询理解（Query understanding）。** “movies directed by Wes Anderson starring Bill Murray”（Wes Anderson 执导、Bill Murray 主演的电影）可通过解析分解为结构化约束。
- **跨语言迁移（Cross-lingual transfer）。** UD 标签和依存关系与语言无关，因此可以对新语言进行零样本结构化分析。
- **低计算量流水线（Low-compute pipelines）。** 无法交付 Transformer 时，词性加依存解析再加专名词典，仍能完成超乎预期的工作。

## 交付成果（Ship It）

保存为 `outputs/skill-grammar-pipeline.md`：

```markdown
---
name: grammar-pipeline
description: 为下游 NLP 任务设计传统词性（POS）与依存（Dependency）流水线。
version: 1.0.0
phase: 5
lesson: 07
tags: [nlp, pos, parsing]
---

根据下游任务（信息提取、改写验证、查询分解、词形还原），输出：

1. 标签集：纯英语旧流水线用 Penn Treebank，多语言或跨语言用 Universal Dependencies。
2. 库：多数生产场景用 spaCy，学术级多语言用 stanza，追求最高 UD 准确率用 trankit。给出具体模型 ID。
3. 集成模式：展示 3-5 行调用库并使用所需属性（`.pos_`、`.dep_`、`.head`）的代码。
4. 待测失效情况：名词与动词歧义（`saw`、`book`、`can`）及介词短语附着歧义（PP-attachment ambiguity）是经典陷阱。抽取 20 个输出人工检查。

拒绝推荐自行编写解析器。从零构建解析器是研究项目，不是应用任务。对使用词性标签却不处理大小写变体的流水线，指出其脆弱性。
```

## 练习（Exercises）

1. **简单。** 在小型标注语料（如 NLTK 的 Brown 子集）上使用最高频标签基线，测量留出句子（Held-out sentences）的准确率，验证约 85% 的结果。
2. **中等。** 训练上述二元 HMM，报告各标签精确率与召回率。HMM 最容易混淆哪些标签？
3. **困难。** 用 spaCy 依存解析从 1000 句样本提取主语–动词–宾语三元组，在 50 个人工标注三元组上评估。记录提取失效的场景，常见于被动句、并列结构和省略主语。

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|------|-----------------|-----------------------|
| 词性标签（POS tag） | 词的类型 | 语法类别，PTB 有 36 个，UD 有 17 个。 |
| Penn Treebank | 标准标签集 | 英语专用，细分动词时态与名词的数。 |
| 通用依存（Universal Dependencies） | 多语言标签集 | 比 PTB 更粗，与语言无关，是跨语言工作的默认选择。 |
| 依存解析（Dependency parse） | 句子树 | 每个词有一个中心词，每条边有一种语法关系。 |
| Viterbi | 动态规划（Dynamic programming） | 给定发射与转移概率，寻找概率最高的标签序列。 |

## 延伸阅读（Further Reading）

- [Jurafsky 与 Martin：《语音与语言处理》（Speech and Language Processing）第 8、18 章](https://web.stanford.edu/~jurafsky/slp3/)：词性与解析的权威教材讲解。
- [通用依存（Universal Dependencies）项目](https://universaldependencies.org/)：各种多语言解析器使用的跨语言标签集与树库集合。
- [spaCy 语言特征指南](https://spacy.io/usage/linguistic-features)：`Token` 暴露的各属性的实用参考。
- [Chen 与 Manning（2014）：使用神经网络的快速准确依存解析器（A Fast and Accurate Dependency Parser using Neural Networks）](https://nlp.stanford.edu/pubs/emnlp2014-depparser.pdf)：推动神经解析器进入主流的论文。
