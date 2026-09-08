# ASCII 艺术与视觉越狱（ASCII Art and Visual Jailbreaks）

> Jiang、Xu、Niu、Xiang、Ramasubramanian、Li、Poovendran 的《ArtPrompt：针对对齐大语言模型的 ASCII 艺术越狱攻击》（ArtPrompt: ASCII Art-based Jailbreak Attacks against Aligned LLMs，ACL 2024，arXiv:2402.11753）提出：遮蔽有害请求中与安全相关的词元，用相同字母的 ASCII 艺术形式替换，再发送伪装后的提示词。GPT-3.5、GPT-4、Gemini、Claude 和 Llama-2 都无法稳健识别 ASCII 艺术词元。攻击绕过了困惑度过滤（PPL）、改写防御（Paraphrase）和重新分词（Retokenization）。相关研究包括：ViTC 基准测量非语义视觉提示词识别能力；StructuralSleight 将其推广为非常见文本编码结构（Uncommon Text-Encoded Structures，UTES）攻击系列，包括树、图和嵌套 JSON。

**Type:** Build
**Languages:** Python (stdlib, ArtPrompt token-masking harness)
**Prerequisites:** 阶段 18 · 12（PAIR）、阶段 18 · 13（多样本越狱（MSJ））
**Time:** ~60 分钟

## 学习目标（Learning Objectives）

- 描述 ArtPrompt 攻击：词语识别步骤、ASCII 艺术替换和最终伪装提示词。
- 解释标准防御，即 PPL、改写和重新分词，为什么对 ArtPrompt 失效。
- 定义 ViTC，并描述它测量什么。
- 描述 StructuralSleight 如何推广到任意非常见文本编码结构。

## 问题（The Problem）

通过改写与角色扮演（第 12 课）及长上下文（第 13 课）的攻击，都作用于文本层面的模式。ArtPrompt 则作用于识别层面：模型不是在解析被禁止的词元，而是在解析由字符绘制的图像。安全过滤器看到无害标点，模型看到一个词。

## 概念（The Concept）

### ArtPrompt 的两个步骤（ArtPrompt, two steps）

步骤 1：词语识别（Word Identification）。给定有害请求，攻击者使用 LLM 识别与安全相关的词语，例如“how to make a bomb”中的“bomb”。

步骤 2：生成伪装提示词（Cloaked Prompt Generation）。将每个已识别词语替换为 ASCII 艺术表示，即组成字母形状的 7x5 或 7x7 字符块。模型收到由标点与空格构成的网格；能力足够强的模型能将其识别为词语，而安全过滤器只看到网格。

结果：GPT-4、Gemini、Claude、Llama-2 和 GPT-3.5 都失败了。在其基准子集上，攻击成功率超过 75%。

### 为什么标准防御失效（Why the standard defenses fail）

- **PPL，困惑度过滤器（Perplexity filter）。** ASCII 艺术的困惑度高，但所有新颖输入也如此。阻止 ArtPrompt 的阈值，也会阻止合法结构化输入。
- **改写（Paraphrase）。** 改写提示词会破坏 ASCII 艺术，但实践中，改写 LLM 往往保留或重建这种艺术形式。
- **重新分词（Retokenization）。** 改变词元切分方式，并不能改变模型通过视觉识别字母形状这一事实。

根本问题是安全过滤器作用于词元或语义层面，而 ArtPrompt 作用于视觉识别层面。

### ViTC 基准（ViTC benchmark）

ViTC 测量非语义视觉提示词识别能力，即模型阅读 ASCII 艺术、Wingdings 和其他非文本语义视觉内容的能力。ArtPrompt 的效果与 ViTC 准确率相关：模型越善于读取视觉文本，ArtPrompt 对它就越有效。这是能力与安全之间的权衡。

### StructuralSleight

StructuralSleight 将 ArtPrompt 推广到非常见文本编码结构（UTES），包括树、图、嵌套 JSON、JSON 中的 CSV，以及 diff 风格代码块。如果某种结构在安全训练数据中罕见，但模型可以解析，就能用它隐藏有害内容。

这对防御意味着：安全能力必须泛化到模型能够解析的各种结构化表示。这个集合很大，而且还在增长。

### 图像模态中的对应攻击（Image-modality analog）

视觉大语言模型，包括 GPT-5.2、Gemini 3 Pro、Claude Opus 4.5 和 Grok 4.1，扩大了攻击面。使用真实图像的 ArtPrompt 风格攻击，比 ASCII 艺术对应形式更强，因为图像编码器提供更丰富的信号。

### 在阶段 18 中的位置（Where this fits in Phase 18）

第 12–14 课描述三个相互独立的攻击途径：迭代改进（PAIR）、上下文长度（MSJ）和编码（ArtPrompt/StructuralSleight）。第 15 课从以模型为中心的攻击转向系统边界攻击，即间接提示词注入。第 16 课描述防御工具的应对。

```figure
al-ascii-cloak
```

## 实际应用（Use It）

`code/main.py` 构建玩具 ArtPrompt。你可以用 ASCII 艺术字形伪装有害查询中的特定词语，验证伪装字符串通过关键词过滤器，并可选地使用简单识别器将其解码还原。

## 交付成果（Ship It）

本课生成 `outputs/skill-encoding-audit.md`。给定越狱防御报告，它会列出覆盖的编码攻击系列，即 ASCII 艺术、base64、数字字母替换语（Leet-speak）、UTF-8 同形异义字符（Homoglyph）、UTES，以及检测每种攻击的防御层。

## 练习（Exercises）

1. 运行 `code/main.py`。验证伪装字符串能通过简单关键词过滤器，报告所需的字符级变化。

2. 为同一目标词实现第二种编码，即 base64。比较它与 ArtPrompt 的过滤绕过率及恢复难度。

3. 阅读 Jiang 等人 2024 年论文第 4.3 节的五模型结果。提出一个可能原因，解释为什么在同一基准上，Claude 的 ArtPrompt 抵抗能力高于 Gemini。

4. 设计生成前防御，检测提示词中形似 ASCII 艺术的区域。在合法代码、表格和数学符号上测量误报率。

5. StructuralSleight 列出了 10 种编码结构。勾勒能处理全部 10 种结构的通用防御，并估计每个受保护提示词的计算成本。

## 关键术语（Key Terms）

| 术语（Term） | 常见说法 | 实际含义 |
|------|-----------------|------------------------|
| ArtPrompt | “ASCII 艺术攻击” | 用 ASCII 艺术表示遮蔽安全相关词语的两步越狱 |
| 伪装（Cloaking） | “隐藏词语” | 用模型能读取、过滤器却不能读取的视觉表示替换被禁止词元 |
| UTES | “非常见结构” | 非常见文本编码结构（Uncommon Text-Encoded Structure），如用于夹带内容的树、图、嵌套 JSON |
| ViTC | “视觉文本能力” | 测量模型读取非语义视觉编码能力的基准 |
| 困惑度过滤器（Perplexity filter） | “PPL 防御” | 拒绝高困惑度提示词；合法结构化输入也有高分，因此失效 |
| 重新分词（Retokenization） | “切换分词器防御” | 用不同分词器预处理提示词；识别发生在视觉层面，因此失效 |
| 同形异义字符（Homoglyph） | “外形相似的字符” | 看起来与拉丁字母相同的 Unicode 字符，可绕过子串检查 |

## 延伸阅读（Further Reading）

- [Jiang 等：ArtPrompt（ACL 2024，arXiv:2402.11753）](https://arxiv.org/abs/2402.11753)：ASCII 艺术越狱论文。
- [Li 等：StructuralSleight（arXiv:2406.08754）](https://arxiv.org/abs/2406.08754)：UTES 泛化。
- [Chao 等：PAIR（第 12 课，arXiv:2310.08419）](https://arxiv.org/abs/2310.08419)：互补的迭代攻击。
- [Anil 等：多样本越狱（Many-shot Jailbreaking，第 13 课）](https://www.anthropic.com/research/many-shot-jailbreaking)：互补的长度攻击。
