# 综合实践 04：多模态文档问答，视觉优先的 PDF、表格与图表（Capstone 04 — Multimodal Document QA）

> 2026 年文档问答的前沿已从先 OCR 再处理文本，转向视觉优先的后期交互（Late Interaction）。ColPali、ColQwen2.5 和 ColQwen3-omni 将每个 PDF 页面视为图像，以多向量后期交互进行嵌入，让查询直接关注图像块。在财务 10-K、科学论文和手写笔记上，这种模式明显优于 OCR 优先方案。对 10k 页构建端到端流水线，并发布与先 OCR 后文本方案的并列对比。

**Type:** Capstone
**Languages:** Python (pipeline), TypeScript (viewer UI)
**Prerequisites:** 阶段 4（计算机视觉）、阶段 5（自然语言处理）、阶段 7（Transformer）、阶段 11（大语言模型工程）、阶段 12（多模态）、阶段 17（基础设施）
**涉及阶段（Phases exercised）：** P4 · P5 · P7 · P11 · P12 · P17
**Time:** 30 小时

## 问题（Problem）

企业有大量 PDF 会被光学字符识别（Optical Character Recognition，OCR）流水线弄乱：表格旋转的扫描 10-K、公式密集的科学论文、只有作为图像才有意义的图表、手写批注。文本优先意味着丢失一半信号。2026 年的方案是在原始页面图像上做后期交互多向量检索。ColPali（Illuin Tech）率先提出，ColQwen2.5-v0.2 和 ColQwen3-omni 提高了准确率。在 ViDoRe v3 上，视觉优先检索明显领先先 OCR 后文本，且图表、表格和手写内容上的差距更大。

代价是存储和延迟。ColQwen 每页产生约 2048 个图像块向量，而非单个 1024 维向量，原始存储量激增。DocPruner（2026）可裁掉 50%，而没有可测的准确率损失。你将索引 10k 页、衡量 ViDoRe v3 nDCG@5、在 2s 内提供回答，并与先 OCR 后文本基线直接比较。

## 概念（Concept）

后期交互意味着每个查询词元都与每个图像块词元评分，再将各查询词元的最大分数求和。无需单一池化向量，就能细粒度匹配。多向量索引（Multi-vector Index），如 Vespa、Qdrant 多向量或 AstraDB，存储逐块嵌入，并在检索时执行 MaxSim。

回答器是视觉语言模型（Vision-Language Model，VLM），输入查询和检索出的前 k 页图像，输出附证据区域的回答，证据可为边界框或页面引用。Qwen3-VL-30B、Gemini 2.5 Pro 和 InternVL3 是 2026 年的前沿选择。公式和科学符号可接入 Nougat、dots.ocr 等 OCR 后备，作为可选文本通道。

评估采用二维矩阵。一轴是内容类型：纯文本段落、密集表格、柱状图 / 折线图、手写笔记、公式。另一轴是检索方法：视觉优先后期交互、先 OCR 后文本、混合。每个单元格填写 nDCG@5 和回答准确率，报告就是交付物。

## 架构（Architecture）

```
PDF -> 页面渲染器（PyMuPDF，180 DPI）
           |
           v
  ColQwen2.5-v0.2 嵌入（每页多向量，约 2048 个图像块）
           |
           +------> DocPruner 50% 压缩
           |
           v
   多向量索引（Vespa 或 Qdrant 多向量）
           |
查询 ------+----> 检索前 k 页（MaxSim）
           |
           v
  VLM 回答器：Qwen3-VL-30B | Gemini 2.5 Pro | InternVL3
    输入：查询 + 前 k 页图像 + 可选 OCR 文本
           |
           v
  回答附引用页码 + 证据区域
           |
           v
  Streamlit / Next.js 查看器：源页面上的高亮框
```

## 技术栈（Stack）

- 页面渲染：PyMuPDF（fitz），180 DPI，统一为纵向
- 后期交互模型：ColQwen2.5-v0.2 或 ColQwen3-omni，来自 Hugging Face 的 vidore 团队
- 索引：带多向量字段的 Vespa、Qdrant 多向量，或带 MaxSim 的 AstraDB
- 剪枝（Pruning）：DocPruner 2026 策略，保留高方差图像块，压缩 50% 时准确率损失 < 0.5%
- OCR 后备，针对公式 / 密集表格：dots.ocr 或 Nougat
- VLM 回答器：自托管 Qwen3-VL-30B 或托管 Gemini 2.5 Pro，InternVL3 作为后备
- 评估：ViDoRe v3 基准，多页推理使用 M3DocVQA
- 查看器界面：Next.js 15，用画布覆盖层显示证据区域

```figure
ce-late-interaction
```

## 动手实现（Build It）

1. **摄取。** 遍历包含 10-K、科学论文和扫描文档的 10k 页 PDF 语料，将每页渲染为 1536x2048 PNG，持久化 `{doc_id, page_num, image_path}`。

2. **嵌入。** 对每页图像运行 ColQwen2.5-v0.2，输出约 2048 个 128 维图像块嵌入。应用 DocPruner，保留信号最强的一半，写入 Vespa 多向量字段或 Qdrant 多向量。

3. **查询。** 用查询编码塔将输入查询嵌入为词元级向量。对索引运行 MaxSim：对每个查询词元，取它与页面图像块嵌入的最大点积，再求和。返回前 k 页。

4. **生成。** 将查询与前 5 页图像传给 Qwen3-VL-30B。提示词：“仅使用提供的页面回答。每个论断按 (doc_id, page) 引用，并指出区域名称，如图、表或段落。”

5. **证据区域。** 后处理回答以提取引用区域。如果 VLM 输出边界框，Qwen3-VL 支持，将其作为覆盖层显示在查看器中。

6. **OCR 后备。** 对基于图像方差启发式判定为公式密集的页面，运行 Nougat 或 dots.ocr，将 OCR 文本作为额外通道与图像一起输入。

7. **评估。** 运行 ViDoRe v3，衡量检索 nDCG@5，以及 M3DocVQA，衡量多页问答准确率。使用相同语料和生成器运行先 OCR 后文本流水线，形成内容类型 × 方法矩阵。

8. **界面。** 先用 Streamlit 原型，再构建 Next.js 15 生产查看器，逐页叠加证据区域。

## 实际应用（Use It）

```
$ doc-qa ask "what was the 2024 operating margin change for segment EMEA?"
[retrieve]   top-5 pages in 320ms (ColQwen2.5, MaxSim, Vespa)
[synth]      qwen3-vl-30b, 1.4s, cited (form-10k-2024, p. 88) + (..., p. 92)
answer:
  EMEA operating margin moved from 18.2% to 16.8%, a 140bp decline.
  cited: 10-K-2024.pdf p.88 (Table 4, Segment Operating Margin)
         10-K-2024.pdf p.92 (MD&A, Operating Performance)
[viewer]     open with highlighted bounding boxes overlaid on p.88 Table 4
```

## 交付成果（Ship It）

`outputs/skill-doc-qa.md` 描述交付物：针对特定语料调优的视觉优先多模态文档问答系统，并在 ViDoRe v3 上与先 OCR 后文本基线比较。

| 权重 | 标准 | 衡量方式 |
|:-:|---|---|
| 25 | ViDoRe v3 / M3DocVQA 准确率 | 对比 OCR 文本基线与公开排行榜的基准结果 |
| 20 | 证据区域依据关联 | 引用区域确实包含答案片段的比例 |
| 20 | 存储与延迟工程 | DocPruner 压缩比、索引 p95、回答 p95 |
| 20 | 多页推理 | 人工标注的 100 问题多页集合上的准确率 |
| 15 | 源文档检查体验 | 查看器清晰度、覆盖层保真度、并列比较工具 |
| **100** | | |

## 练习（Exercises）

1. 在相同语料上比较 ColQwen2.5-v0.2 与 ColQwen3-omni。哪些页面一个正确而另一个漏掉？给索引加“内容类别”标签，按类型路由。

2. 激进剪枝嵌入，取 75%、90%。找出压缩临界点，即 ViDoRe nDCG@5 低于 OCR 基线的位置。

3. 构建混合方案：并行运行先 OCR 后文本和 ColQwen，通过倒数排名融合（Reciprocal Rank Fusion，RRF）合并，再用交叉编码器重排。混合是否优于任一单独方案？哪里帮助最大？

4. 将 Qwen3-VL-30B 换成较小的 VLM，如 Qwen2.5-VL-7B，衡量准确率与美元成本关系曲线。

5. 添加手写笔记支持。渲染手写语料，用 ColQwen 嵌入并衡量检索，与手写 OCR 流水线比较。

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|------|-----------------|------------------------|
| 后期交互（Late Interaction） | “ColPali 风格检索” | 查询词元独立对页面图像块评分，由 MaxSim 聚合 |
| 多向量（Multi-vector） | “逐图像块嵌入” | 每份文档有多个向量，而非一个池化向量 |
| MaxSim | “后期交互评分” | 对每个查询词元取文档向量上的最大相似度，再求和 |
| DocPruner | “图像块压缩” | 2026 年的剪枝方法，保留 50% 图像块且准确率损失可忽略 |
| ViDoRe v3 | “文档检索基准” | 2026 年衡量视觉文档检索的标准 |
| 证据区域（Evidence Region） | “引用边界框” | 源页面上用于定位答案片段的边界框 |
| OCR 后备（OCR Fallback） | “公式通道” | 公式或表格密集页面中，与视觉一起使用的文本流水线 |

## 延伸阅读（Further Reading）

- [ColPali（Illuin Tech）仓库](https://github.com/illuin-tech/colpali)：后期交互文档检索参考
- [ColPali 论文（arXiv:2407.01449）](https://arxiv.org/abs/2407.01449)：基础方法论文
- [Hugging Face 上的 ColQwen 系列](https://huggingface.co/vidore)：可用于生产的检查点
- [M3DocRAG（Adobe）](https://arxiv.org/abs/2411.04952)：多页多模态 RAG 基线
- [Vespa 多向量教程](https://docs.vespa.ai/en/colpali.html)：服务技术栈参考
- [Qdrant 多向量支持](https://qdrant.tech/documentation/concepts/vectors/#multivectors)：替代索引
- [AstraDB 多向量](https://docs.datastax.com/en/astra-db-serverless/databases/vector-search.html)：替代托管索引
- [Nougat OCR](https://github.com/facebookresearch/nougat)：支持公式的 OCR 后备
