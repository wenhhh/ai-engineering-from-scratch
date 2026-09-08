# 澄清 AI 常见误区（AI Myths Busted）

本篇列出关于人工智能（Artificial Intelligence，AI）、机器学习（Machine Learning，ML）和深度学习（Deep Learning，DL）的常见误解，并说明实际机制。

---

## “AI 理解语言”

**实际情况（Reality）：** 大语言模型（Large Language Model，LLM）根据训练数据中的统计模式预测下一个词元（Token）。它们没有理解、信念，也没有我们能够证实的世界模型（World Model）。它们擅长从数十亿个示例中匹配模式。输出看起来像是理解，是因为这些模式足够丰富，能够覆盖大多数情况。

**为什么重要（Why It Matters）：** 如果把大语言模型当作推理引擎，它言之凿凿却回答错误时，你就会感到意外。如果将它视为模式匹配器（Pattern Matcher），就更容易围绕它设计合适的系统。

---

## “参数越多，模型越聪明”

**实际情况（Reality）：** 使用高质量数据和合适技术训练的 70 亿参数（7B）模型，可能优于用劣质数据训练的 700 亿参数（70B）模型。Chinchilla 研究表明，当时大多数模型的参数量过大，而训练不足。训练数据的质量与数量和模型规模同样重要。Phi-2（27 亿参数，2.7B）在许多基准测试（Benchmark）中超过了规模是其 10 倍的模型。

**为什么重要（Why It Matters）：** 不要默认选择最大的模型。应根据任务与预算确定模型规模。

---

## “神经网络是黑箱”

**实际情况（Reality）：** 我们已有工具帮助理解神经网络（Neural Network）学到了什么。注意力可视化（Attention Visualization）展示模型关注哪些词元；探测分类器（Probing Classifier）揭示隐藏表示（Hidden Representation）中存储了什么信息；机制可解释性（Mechanistic Interpretability）研究正在寻找实际的计算回路，例如归纳头（Induction Head）和特征检测器（Feature Detector）。虽然还不能做到完全透明，但也并非无从观察的黑箱。

**为什么重要（Why It Matters）：** 神经网络可以调试。梯度分析（Gradient Analysis）、激活可视化（Activation Visualization）和注意力图（Attention Map）都是实际可用的工具，本课程会介绍这些方法。

---

## “AI 会取代程序员”

**实际情况（Reality）：** AI 改变了编程，而不是取代了编程。AI 编写样板代码（Boilerplate），人类设计系统、作出架构决策、审查正确性，并处理 AI 出错的情况。工程师的角色从“编写每一行代码”转向“审查、指导和架构设计”。优秀的工程师把 AI 当作工具使用，而不是只担心被它取代。

**为什么重要（Why It Matters）：** 你正在学习的是 AI 工程（AI Engineering），也就是编程与 AI 的结合。两种能力结合，比只掌握其中一种更有价值。

---

## “做 AI 必须有数学博士学位”

**实际情况（Reality）：** 你需要高中数学基础，以及本课程阶段 1 涵盖的特定知识：线性代数（Linear Algebra）、微积分（Calculus）、概率（Probability）和优化（Optimization）。你不需要掌握严格证明，而需要直观理解每种运算做了什么、为什么重要。只要会做矩阵乘法和求导，就能开始构建神经网络。

**为什么重要（Why It Matters）：** 阶段 1 的目的就是提供所需的数学基础，不额外扩大范围。

---

## “GPT 是通用技术（General Purpose Technology）的缩写”

**实际情况（Reality）：** GPT 是生成式预训练 Transformer（Generative Pre-trained Transformer）的缩写。生成式（Generative）表示它能生成文本；预训练（Pre-trained）表示它先在大规模语料上接受训练，再适配具体任务；Transformer 则指 2017 年论文《Attention Is All You Need》提出的架构。

---

## “温度让 AI 更有创造力”

**实际情况（Reality）：** 温度（Temperature）在 softmax 之前对未归一化得分（Logits）进行缩放。温度越高，概率分布越平坦，词元选择越随机；温度越低，分布越集中，输出越确定。这不是创造力，而是随机性。高温度模型并不会思考得更深入，只是更可能选择低概率词元。

**为什么重要（Why It Matters）：** 输出过于重复时，提高温度；输出过于混乱时，降低温度。它控制的是随机性，仅此而已。

---

## “微调能教会模型新知识”

**实际情况（Reality）：** 微调（Fine-tuning）调整的是模型使用已有知识的方式，而不是它掌握哪些知识。如果某条信息没有出现在预训练数据中，微调并不能可靠地把它补进去。相较于添加事实，微调更适合改变行为，例如风格、格式、语气以及特定任务的处理模式。需要补充新知识时，应使用检索增强生成（Retrieval-Augmented Generation，RAG）。

**为什么重要（Why It Matters）：** 要让模型使用公司的内部文档，采用检索增强生成（RAG）；要让它按特定格式回答，采用微调。

---

## “上下文窗口越大越好”

**实际情况（Reality）：** 模型在长上下文（Long Context）上的表现会下降。“中间遗失”（Lost in the Middle）问题是指：模型更关注长提示词开头和结尾的信息，而对中间部分关注不足。20 万词元（200K）的上下文窗口（Context Window），不代表模型对全部 20 万个词元都能同样有效地利用。此外，上下文越长，成本越高，速度也越慢。

**为什么重要（Why It Matters）：** 不要把所有内容都塞进上下文，应有所筛选。采用针对性检索的检索增强生成（RAG），优于直接塞入整份文档。

---

## “AI 智能体具有自主性”

**实际情况（Reality）：** 当前 AI 智能体（Agent）运行的是一个循环：思考、行动、观察、重复。它们遵循执行框架（Harness）定义的模式，并没有自身的目标、计划或自我意识。它们是响应式系统（Reactive System），借助大语言模型决定下一步调用哪个工具。所谓“自主性”来自这个循环，而不是 AI 本身。

**为什么重要（Why It Matters）：** 构建智能体时，你实际构建的是循环、工具和防护机制（Guardrails）。大语言模型只是系统内部负责决策的组件。

---

## “有了位置编码，Transformer 就理解顺序”

**实际情况（Reality）：** Transformer 并不天然具备顺序感。自注意力（Self-Attention）将输入视为集合，而不是序列。位置编码（Positional Encoding）通过向输入添加与位置相关的向量，补入顺序信息。正弦位置编码（Sinusoidal Positional Encoding）、可学习位置编码（Learned Positional Encoding）、旋转位置编码（Rotary Position Embedding，RoPE）和带线性偏置的注意力（Attention with Linear Biases，ALiBi）采用了不同处理方法，但都没有像循环神经网络（Recurrent Neural Network，RNN）那样，让模型以递归方式处理序列顺序。

**为什么重要（Why It Matters）：** 这也是位置编码研究仍在持续的原因。现有方法对大多数用途已经够用，但从根本上说，仍是在补足架构本身缺少的能力。

---

## “预训练就是阅读互联网”

**实际情况（Reality）：** 预训练（Pre-training）是在海量语料上进行下一词元预测（Next-Token Prediction）。模型学习根据前文预测后续内容。通过这个简单目标，它学到语法、事实、推理模式、代码结构等知识，但也会学到互联网上的无意义内容、偏见和错误信息。因此，数据整理（Data Curation）、过滤（Filtering）和去重（Deduplication）至关重要。

**为什么重要（Why It Matters）：** 垃圾进，垃圾出。预训练数据的质量，是拉开模型表现差距的主要因素之一。

---

## “RLHF 能让 AI 与人类价值观对齐”

**实际情况（Reality）：** 基于人类反馈的强化学习（Reinforcement Learning from Human Feedback，RLHF）让 AI 对齐的是提供反馈的那一群人的偏好。这些人彼此可能意见不一，也有各自的偏见，而且无法覆盖所有情况。RLHF 使模型按评分者定义的方式表现得有用、无害，并不意味着它对齐了某种普遍适用的人类价值体系。

**为什么重要（Why It Matters）：** RLHF 是一种训练技术，不是对齐（Alignment）问题的完整解决方案。它只是更大工具箱中的一种工具。

---

## “嵌入能够表示意义”

**实际情况（Reality）：** 嵌入（Embedding）表示的是统计上的共现模式（Co-occurrence Pattern）。出现在相似上下文中的词，会获得相似的向量。这种关系与语义的相关性足以支持实用功能，但并不等于语义理解。“King - Man + Woman = Queen”成立，是因为分布模式（Distributional Pattern），而不是模型理解了君主制或性别。

**为什么重要（Why It Matters）：** 嵌入适合相似性搜索（Similarity Search）、聚类（Clustering）和检索（Retrieval），但不要过度解读这里的“相似”。

---

## “零样本意味着没有训练”

**实际情况（Reality）：** 零样本（Zero-shot）是指推理（Inference）时不提供任务专用的示例。模型仍然接受过数十亿词元的训练，只是没有看到当前任务格式的示例，而是从预训练中的模式泛化过来。少样本（Few-shot）则是在提示词中给出少量示例。两者都不意味着模型未经训练就学会了任务。

---

## “AI 模型像人类一样学习”

**实际情况（Reality）：** 人类可以从少量示例中学习、跨领域泛化，并持续更新认识。神经网络通常需要数百万个示例，主要在训练分布（Training Distribution）内泛化，而且训练结束后权重就固定了。把两者都称为“学习”，最多只是宽泛的类比。反向传播（Backpropagation）与生物神经元的学习方式并不相同。

**为什么重要（Why It Matters）：** 不要把模型拟人化，否则容易对其能力边界产生错误预期。

---

## “缩放定律说明规模越大总是越好”

**实际情况（Reality）：** 缩放定律（Scaling Laws）描述了计算量、数据量和模型规模之间可预测的关系。它表明收益会递减：参数翻倍，并不意味着性能也翻倍。此外，这些规律假设数据量也按比例增长。实际应用中的许多改进来自更好的架构、训练技术与数据质量，而不只是扩大规模。

**为什么重要（Why It Matters）：** 工程实现得当的 70 亿参数（7B）模型就可能解决你的问题，不要默认选择 700 亿参数（70B）模型。

---

## “开源 AI 等于开放权重”

**实际情况（Reality）：** 大多数被称为“开源”的模型，实际上只是开放权重（Open Weights）。你能拿到模型文件，但拿不到训练数据、训练代码或数据处理流程。真正的开源（Open Source），例如 OLMo，会公开数据、代码、中间检查点（Checkpoint）和评估内容。开放权重有价值，但它与开源并不是同等程度的开放承诺。

**为什么重要（Why It Matters）：** 要弄清自己获得了什么。开放权重允许你运行和微调模型；真正的开源则让你能够复现并理解模型的构建过程。

---

## “提示词工程不算真正的工程”

**实际情况（Reality）：** 提示词工程（Prompt Engineering）是一种系统设计。你设计的是连接人类意图与模型行为的接口。做好提示词工程，需要理解分词（Tokenization）、注意力模式（Attention Pattern）、上下文窗口限制和输出解析（Output Parsing）。它更接近 API 设计，而不是“对 AI 说几句好听的话”。

**为什么重要（Why It Matters）：** 本课程在阶段 11 将提示词工程作为一门正式的工程实践来教授。

---

## “CNN 已经过时，现在一切都用 Transformer”

**实际情况（Reality）：** 视觉 Transformer（Vision Transformer，ViT）在许多基准测试中超过了卷积神经网络（Convolutional Neural Network，CNN），但 CNN 仍被广泛使用。它们推理更快，适合移动端与边缘端（Edge），需要的数据更少，还具有平移不变性（Translation Invariance）、局部模式（Local Pattern）等有用的归纳偏置（Inductive Bias）。许多生产视觉系统仍使用 CNN，优秀的架构也经常结合两者。

**为什么重要（Why It Matters）：** 两种架构都要学习，分别见阶段 4 和阶段 7。根据实际约束选择可行方案。

---

## “训练有用的模型需要海量算力”

**实际情况（Reality）：** 预训练基础模型（Foundation Model）确实需要大量算力，但微调、低秩适配（Low-Rank Adaptation，LoRA）和迁移学习（Transfer Learning）让你可以在单张 GPU 上适配模型。许多实用 AI 应用根本不需要训练，只需要合适的提示词和检索增强生成（RAG）。所谓“算力门槛”，针对的是构建基础模型，而不是使用基础模型。

**为什么重要（Why It Matters）：** 用笔记本电脑也可以构建实际的 AI 应用，本课程会展示这一点。
