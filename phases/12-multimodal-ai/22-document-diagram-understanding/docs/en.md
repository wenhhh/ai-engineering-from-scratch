# 文档与图示理解（Document and Diagram Understanding）

> 文档不是照片。PDF、科学论文、发票或手写表单具有布局、表格、图示、脚注、页眉和语义结构，普通图像理解无法捕获这些内容。视觉语言模型（VLM）之前的技术栈是流水线：Tesseract 光学字符识别（OCR）+ LayoutLMv3 + 表格提取启发式规则。VLM 浪潮用直接输出结构化标记的免 OCR 模型取代了它：Donut（2022）、Nougat（2023）、DocLLM（2023）。到 2026 年，前沿做法就是“将页面图像以 2576px 原生分辨率输入 Claude Opus 4.7”，结构化标记输出随之获得。本课解读文档 AI 的三个时代。

**Type:** Build
**Languages:** Python（标准库，布局感知文档解析器骨架）
**Prerequisites:** 阶段 12 · 05（LLaVA），阶段 5（自然语言处理）
**Time:** ~180 分钟

## 学习目标（Learning Objectives）

- 解释文档 AI 的三个时代：OCR 流水线、免 OCR、VLM 原生。
- 描述 LayoutLMv3 的三种输入流：文本、布局（边界框）、图像块，以及统一掩码。
- 比较 Donut（免 OCR，图像 → 标记）、Nougat（科学论文 → LaTeX）、DocLLM（布局感知生成式）、PaliGemma 2（VLM 原生）。
- 为新任务（发票、科学论文、手写表单、中文收据）选择文档模型。

## 问题（The Problem）

“理解这个 PDF”比看起来更难。信息存在于：

- 文本内容（90% 的信号）。
- 布局（页眉、脚注、侧栏、双栏格式）。
- 表格（行、列、合并单元格）。
- 图片与图示。
- 手写批注。
- 字体与排版（标题与正文）。

原始 OCR 只导出文本，丢失其余信息。关注发票的系统需要知道“总计：$1,245”来自右下角，而非脚注。

## 概念（The Concept）

### 时代 1：OCR 流水线，2021 年前（Era 1 — OCR pipeline (pre-2021)）

经典技术栈：

1. PDF → 每页一张图像。
2. Tesseract（或商业 OCR）提取文本及逐词边界框。
3. 布局分析器识别块（页眉、表格、段落）。
4. 表格结构识别器解析表格。
5. 领域规则 + 正则表达式提取字段。

适用于清晰印刷文本。遇到手写、倾斜扫描、复杂表格和非英语文字就容易失效。每种故障模式都需要定制异常处理路径。

### TrOCR（2021）（TrOCR (2021)）

TrOCR（Li 等人，arXiv:2109.10282）用在合成与真实文本图像上训练的变换器编码器-解码器，替代 Tesseract 经典的卷积神经网络与连接时序分类（CNN-CTC）结构。在手写和多语种文本上明确胜出。仍是流水线（先检测器，再 TrOCR，再布局），但 OCR 步骤得到大幅改善。

### 时代 2：免 OCR，2022-2023 年（Era 2 — OCR-free (2022-2023)）

第一批免 OCR 模型提出：完全跳过检测，直接将图像像素映射到结构化输出。

Donut（Kim 等人，arXiv:2111.15664）：
- 编码器-解码器变换器，编码器为 Swin-B。
- 表单理解输出 JSON，摘要输出 Markdown，也可输出任何任务专属模式。
- 无 OCR、无布局分析、无检测。

Nougat（Blecher 等人，arXiv:2308.13418）：
- 专门在科学论文上训练。
- 输出 LaTeX / Markdown。
- 处理公式、多栏布局、图片。
- 每个 arXiv 解析器都会调用的模型。

这些是专用模型，不是通用模型。Donut 处理科学论文会失败；Nougat 处理发票会失败。

### LayoutLMv3（2022）（LayoutLMv3 (2022)）

这是另一条路线。LayoutLMv3（Huang 等人，arXiv:2204.08387）保留 OCR，但加入布局理解：

- 三种输入流：OCR 文本词元、逐词元二维边界框、图像块。
- 对三种模态统一使用掩码训练目标（遮蔽文本、遮蔽图像块、遮蔽布局）。
- 下游任务：分类、实体提取、表格问答。

LayoutLMv3 是基于 OCR 的文档理解巅峰。擅长表单和发票。需要上游 OCR。在标准化文档基准上取得 VLM 出现前的最佳准确率。

### DocLLM（2023）（DocLLM (2023)）

DocLLM（Wang 等人，arXiv:2401.00908）是 LayoutLM 的生成式近亲。以布局词元为条件生成自由形式答案。更适合文档问答，但仍依赖 OCR 输入。

### 时代 3：VLM 原生，2024 年起（Era 3 — VLM-native (2024+)）

2024 年，VLM 已足够好，能够完全替代流水线。将完整页面图像以高分辨率输入 VLM，提出问题，得到答案。

- LLaVA-NeXT 的 336 分块任意分辨率（AnyRes）适合小文档。
- Qwen2.5-VL 动态分辨率原生处理 2048+ 像素。
- Claude Opus 4.7 支持 2576px 文档。
- PaliGemma 2（2025 年 4 月）专门针对文档与手写训练。

VLM 原生与 OCR 流水线之间的差距迅速缩小。到 2026 年，VLM 原生在以下方面胜出：

- 场景文字（手写 + 印刷，混合文字系统）。
- 带合并单元格的复杂表格。
- 嵌入文本中的数学公式。
- 带文本标注的图片。

OCR 流水线仍在以下方面胜出：

- 大规模纯扫描工作负载，每页延迟很重要。
- 流水线可靠性（确定性故障与 VLM 幻觉的对比）。
- 要求可审计 OCR 输出的受监管环境。

### Claude 4.7 / GPT-5 前沿（The Claude 4.7 / GPT-5 frontier）

在 2576 像素原生输入下，前沿 VLM 的文档理解准确率接近人类。2026 年初的基准数字：

- DocVQA：Claude 4.7 约 95.1，PaliGemma 2 约 88.4，Nougat 约 77.3，流水线 LayoutLMv3 约 83。
- ChartQA：Claude 4.7 约 92.2，GPT-4V 约 78。
- VisualMRC：Claude 4.7 约 94。

闭源模型的差距主要来自分辨率和基础大语言模型（LLM）规模。7B 开放模型落后几分，但正在追赶。

### 数学公式与 LaTeX 输出（Math equations and LaTeX output）

科学论文需要精确的公式 LaTeX 输出。Nougat 为此接受过训练。以 LaTeX 为目标训练的 VLM（Qwen2.5-VL-Math、Nougat 衍生模型）能产生可用 LaTeX。没有显式 LaTeX 训练的 VLM，会生成可读但不精确的转录。

对于 2026 年的科学论文流水线：先用 Nougat 处理 PDF，再用 VLM 处理难页。

### 手写（Handwriting）

这仍是最难的子任务。在印刷与手写混合内容（医生笔记、已填写表单）上，OCR 流水线的成本仍优于 VLM。专注手写的 VLM 正在改善（Claude 4.7、PaliGemma 2）。

### 2026 年配方（2026 recipe）

对于新的文档 AI 项目：

- 大规模纯印刷发票：LayoutLMv3 + 规则，成本效率高。
- 混合文档（科学 + 手写 + 表单）：VLM 原生（PaliGemma 2 或 Qwen2.5-VL）。
- 完整 arXiv 摄取：Nougat 处理数学，VLM 处理图片。
- 监管场景：OCR 流水线 + VLM 验证器进行交叉核对。

```figure
mm-doc-layout
```

## 动手使用（Use It）

`code/main.py`：

- 简化的布局感知分词器：给定（文本、边界框）对，生成 LayoutLMv3 风格输入。
- Donut 风格任务模式生成器：表单的 JSON 模板。
- 比较 OCR 流水线、Donut、Nougat 和 VLM 原生的每页词元预算。

## 交付成果（Ship It）

本课产出 `outputs/skill-document-ai-stack-picker.md`。给定文档 AI 项目（领域、规模、质量、监管），在 OCR 流水线、免 OCR 专用模型和 VLM 原生之间选择。

## 练习（Exercises）

1. 项目每天处理 10M 张发票。哪个技术栈能在不损失准确率的情况下最小化每页成本？

2. 为什么 LayoutLMv3 在表单问答上优于纯 CLIP VLM，却在场景文字上较弱？边界框输入流放弃了什么？

3. Nougat 生成 LaTeX。提出一个 VLM 原生输出在 LaTeX 保真度上优于 Nougat 的测试案例，以及一个 Nougat 胜出的案例。

4. 阅读 PaliGemma 2 论文（Google，2024）。与 PaliGemma 1 相比，新增了哪些关键训练数据，使文档准确率提高？

5. 设计满足监管要求的混合方案：OCR 流水线为主，VLM 为辅进行交叉核对。如何解决两者分歧？

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|------|-----------------|------------------------|
| OCR 流水线（OCR pipeline） | “Tesseract 风格” | 分阶段技术栈：检测 -> OCR -> 布局 -> 规则；确定性强，但脆弱 |
| 免 OCR（OCR-free） | “Donut 风格” | 跳过显式 OCR、直接从图像到输出的单个变换器模型 |
| 布局感知（Layout-aware） | “LayoutLM” | 输入包含逐词元边界框坐标；跨模态统一掩码 |
| VLM 原生（VLM-native） | “前沿 VLM” | 直接将高分辨率页面图像输入 Claude/GPT/Qwen VLM；无流水线 |
| DocVQA | “文档基准” | 文档视觉问答标准；被引用最多的分数 |
| 标记输出（Markup output） | “LaTeX / MD” | 用结构化输出格式替代自由文本，使下游自动化成为可能 |

## 延伸阅读（Further Reading）

- [Li 等人：TrOCR（arXiv:2109.10282）](https://arxiv.org/abs/2109.10282)
- [Blecher 等人：Nougat（arXiv:2308.13418）](https://arxiv.org/abs/2308.13418)
- [Huang 等人：LayoutLMv3（arXiv:2204.08387）](https://arxiv.org/abs/2204.08387)
- [Kim 等人：Donut（arXiv:2111.15664）](https://arxiv.org/abs/2111.15664)
- [Wang 等人：DocLLM（arXiv:2401.00908）](https://arxiv.org/abs/2401.00908)
