# ColPali 与视觉原生文档检索增强生成（ColPali and Vision-Native Document RAG）

> 传统检索增强生成（RAG）将 PDF 解析为文本、切成块、嵌入这些块并存储向量。每一步都会丢失信号：OCR 丢掉图表数据，分块打断表格行，文本嵌入忽略图片。ColPali（Faysse 等人，2024 年 7 月）提出了更简单的问题：为什么还要提取文本？直接通过 PaliGemma 嵌入页面图像，使用 ColBERT 风格的后期交互（Late interaction）检索，保留文档携带的全部布局、图片、字体与格式信号。已发表基准显示：在视觉丰富的文档上，端到端准确率比文本 RAG 高 20-40%。ColQwen2、ColSmol 和 VisRAG 扩展了这一模式。本课解读视觉原生 RAG 的主张，并构建微型类 ColPali 索引器。

**Type:** Build
**Languages:** Python（标准库，多向量索引器 + MaxSim 评分器）
**Prerequisites:** 阶段 11（LLM 工程：RAG 基础），阶段 12 · 05（LLaVA）
**Time:** ~180 分钟

## 学习目标（Learning Objectives）

- 解释双编码器检索（每个文档一个向量）与后期交互检索（每个文档多个向量）的区别。
- 描述 ColBERT 的最大相似度（MaxSim）运算，以及 ColPali 如何将它从文本词元推广到图像块。
- 构建微型类 ColPali 索引器：页面 → 图像块嵌入 → 对查询词嵌入执行 MaxSim → 前 k 个页面。
- 在发票 / 财务报告用例中，比较 ColPali + Qwen2.5-VL 生成器与文本 RAG + GPT-4。

## 问题（The Problem）

对 PDF 使用文本 RAG 会丢弃文档的大部分内容。财务报告中的 Q3 收入增长通常在图表里；医疗报告的发现出现在带标注图像中；法律合同的签名栏是布局事实，而非文本事实。

文本 RAG 流水线：

1. PDF → 通过 OCR / pdftotext 得到文本。
2. 文本 → 300-500 词元分块。
3. 分块 → 双编码器嵌入（一个向量）。
4. 用户查询 → 嵌入 → 余弦相似度 → 前 k 个分块。
5. 分块 + 查询 → 大语言模型（LLM）。

五个有损步骤。图表未被捕获，表格被分块打断，多栏布局被展平，图片标注消失。

ColPali 的解决办法：跳过 OCR，直接嵌入页面图像。使用 ColBERT 风格的后期交互检索，使模型在查询时能够关注细粒度图像块。

## 概念（The Concept）

### ColBERT（2020）（ColBERT (2020)）

ColBERT（Khattab 和 Zaharia，arXiv:2004.12832）是一种文本检索方法。它不是每个文档生成一个向量，而是每个词元生成一个向量。查询时：

- 查询词元获得各自嵌入（N_q 个向量）。
- 文档词元获得嵌入（N_d 个向量，通常缓存）。
- 分数 = 对每个查询词元取其与文档词元的最大余弦相似度，再求和：Σ_i max_j cos(q_i, d_j)。

这就是 MaxSim 运算。每个查询词元“挑选”与自己最匹配的文档词元。最终分数是这些值之和。

优点：召回率高，处理词项级语义。缺点：每个文档有 N_d 个向量，存储昂贵。

### ColPali（ColPali）

ColPali（Faysse 等人，arXiv:2407.01449）将 ColBERT 模式应用于图像。

- 每页由 PaliGemma（ViT + 语言）编码为图像块嵌入：每页 N_p 个向量。
- 每个用户查询（文本）编码为查询词元嵌入：N_q 个向量。
- 分数 = Σ_i max_j cos(q_i, p_j)，即对查询文本词元与页面图像块执行 MaxSim。
- 根据总分检索前 k 个页面。

文档摄取时：用 PaliGemma 嵌入每页，存储所有图像块嵌入。查询时：嵌入查询词元，对全部已存储页面嵌入计算 MaxSim，返回前 k 个页面。

优点：在视觉丰富的文档上，端到端表现比文本 RAG 高 20-40%。每个图像块向量捕获局部布局和内容。

缺点：每页 N_p 个图像块 × 4 字节浮点数 × D 维向量，存储增长很快。可用乘积量化（PQ）/ 优化乘积量化（OPQ）缓解。

### ColQwen2 与 ColSmol（ColQwen2 and ColSmol）

ColQwen2（illuin-tech，2024-2025）将 PaliGemma 换成 Qwen2-VL。基础编码器更好，检索也更好。

ColSmol 是用于本地 / 边缘场景的小规模变体。约 1B 参数的 ColSmol 检索器可在消费级 GPU 上运行。

### VisRAG（VisRAG）

VisRAG（Yu 等人，arXiv:2410.10594）是另一种变体：不对图像块执行 MaxSim，而是先用 VLM 将每页池化成单个向量，再进行双编码器检索。索引更快、存储更小，但召回率较弱。

质量与成本的权衡：质量优先选 ColPali，规模优先选 VisRAG。

### M3DocRAG（M3DocRAG）

M3DocRAG（Cho 等人，arXiv:2411.04952）将多模态检索扩展到多页、多文档推理。跨文档检索页面，为 VLM 组织多页上下文。

### ViDoRe：基准（ViDoRe — the benchmark）

这是 ColPali 的配套基准，即视觉文档检索评估（Visual Document Retrieval Evaluation）。任务包括财务报告、科学论文、行政文档、医疗记录和手册。指标为 nDCG@5。

ColPali-v1 在 ViDoRe 上的 nDCG@5 约为 80%；相同文档上的文本 RAG 约为 50-60%。

### 端到端 RAG 流水线（The end-to-end RAG pipeline）

视觉原生 RAG 的流程：

1. 摄取：PDF → 页面图像 → PaliGemma 编码 → 存储全部图像块嵌入。
2. 查询：用户文本 → 查询词元嵌入 → 对所有已索引页面执行 MaxSim → 前 k 个页面。
3. 生成：前 k 个页面图像 + 查询 → VLM（Qwen2.5-VL 或 Claude）→ 答案。

全程没有 OCR。图片、图表、字体和布局都参与答案生成。

### 存储计算（Storage math）

一份 50 页财务报告，每页 729 个图像块，嵌入为 128 维：

- ColPali：50 * 729 * 128 * 4 bytes = 约 18 MB 原始存储，PQ 后约 4 MB。
- 文本 RAG：50 chunks * 768-dim * 4 bytes = 约 150 kB。

ColPali 每个文档的存储约为 30x。大规模场景下，OPQ / PQ 将其降到约 5-10x，通常可以接受。

### 文本 RAG 何时仍然胜出（When text-RAG still wins）

- 没有布局信号的纯文本文档（维基文章、聊天日志）。文本 RAG 更简单，存储更便宜。
- 存储成本占主导的数百万页档案。
- 严格监管要求检索时同时提供可提取的 OCR 文本。

对于 2026 年其他所有场景，包括财务报告、科学论文、法律合同、医疗记录、用户体验文档，视觉原生 RAG 胜出。

```figure
mm-maxsim
```

## 动手使用（Use It）

`code/main.py`：

- 简化图像块编码器：将“页面”（特征向量组成的小网格）映射为图像块嵌入数组。
- MaxSim 评分器：计算查询词元嵌入集合与页面图像块集合之间的 ColBERT 风格分数。
- 索引 5 个简化页面，运行 3 个查询，返回带分数的前 k 个结果。

## 交付成果（Ship It）

本课产出 `outputs/skill-vision-rag-designer.md`。给定文档 RAG 项目，选择 ColPali / ColQwen2 / VisRAG / 文本 RAG，并估算存储。

## 练习（Exercises）

1. 200 页年报，每页 729 个图像块，128 维嵌入，4 字节浮点数。计算原始存储和 PQ 压缩（8x）后的存储。

2. MaxSim 是 Σ_i max_j cos(q_i, p_j)。这个求和捕获了简单平均相似度没有捕获的什么？

3. ColPali 将页面索引为图像块集合。如果改为词级索引（像 ColBERT 那样），会发生什么变化？有哪些权衡？

4. 为 1M 页语料设计端到端流水线，每个查询延迟预算为 500ms。在 ColQwen2 / VisRAG 中选择并论证。

5. 阅读 M3DocRAG（arXiv:2411.04952）。描述多页注意力模式，以及它与单页 ColPali 检索有何不同。

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|------|-----------------|------------------------|
| 后期交互（Late interaction） | “ColBERT 风格” | 使用逐词元或逐图像块嵌入 + MaxSim 检索，而非单个文档向量 |
| 最大相似度（MaxSim） | “对图像块取最大值” | 为每个查询词元选择相似度最高的文档词元，再沿查询求和 |
| 双编码器（Bi-encoder） | “单向量” | 每个文档一个向量；更快，但丢失细粒度信息 |
| 多向量（Multi-vector） | “每文档多个向量” | 每个文档 / 页面存储 N_p 个向量；存储成本增加，但召回率提高 |
| 图像块嵌入（Patch embedding） | “页面特征” | VLM 编码器为每个图像块产生一个向量，按页面缓存 |
| ViDoRe | “视觉文档基准” | ColPali 的视觉文档检索基准套件 |
| PQ 量化（PQ quantization） | “乘积量化” | 保持向量相似度、同时将存储缩小约 8x 的压缩 |

## 延伸阅读（Further Reading）

- [Faysse 等人：ColPali（arXiv:2407.01449）](https://arxiv.org/abs/2407.01449)
- [Khattab 与 Zaharia：ColBERT（arXiv:2004.12832）](https://arxiv.org/abs/2004.12832)
- [Yu 等人：VisRAG（arXiv:2410.10594）](https://arxiv.org/abs/2410.10594)
- [Cho 等人：M3DocRAG（arXiv:2411.04952）](https://arxiv.org/abs/2411.04952)
- [illuin-tech/colpali 的 GitHub 仓库](https://github.com/illuin-tech/colpali)
