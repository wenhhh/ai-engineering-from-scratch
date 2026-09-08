<a id="ai-engineering-glossary"></a>
# AI 工程术语表（AI Engineering Glossary）

当课程、论文、模型卡（Model Card）或代码审阅引入术语，却来不及解释时，可以查阅本术语表。按准确术语或别名搜索，先读直接定义，再通过实践说明，将概念与自己能构建的系统联系起来。

每个条目归属于一个学习分类。`Related terms` 提供接下来值得了解的相关概念，而不强制规定学习顺序。定义描述常见的工程含义，但不同提供方的具体行为可能有差异。当 API 契约或模型卡与通用定义不一致时，以当前官方文档为准。

十二个分类分别是：数学与训练（Math & training）；模型与推理（Models & inference）；数据与表示（Data & representations）；检索与生成（Retrieval & generation）；提示词与上下文（Prompting & context）；智能体与工具（Agents & tools）；评估与安全（Evaluation & safety）；AI 原生开发（AI-native development）；基础设施与服务（Infrastructure & serving）；可靠性与运维（Reliability & operations）；安全与治理（Security & governance）；多模态系统（Multimodal systems）。

## A

<a id="activation-checkpointing"></a>
### 激活检查点（Activation Checkpointing）
- **分类（Category）:** 数学与训练（Math & training）
- **准确含义（What it actually means）:** 一种训练内存优化技术：只保存选定的前向传播激活值，在反向传播时重新计算未保存的部分。
- **重要性（Why it matters）:** 它用额外计算换取更少的激活存储，让你在固定内存预算内训练更大的模型或处理更长的序列。
- **实际应用（In practice）:** 对占用内存较多的 Transformer 块启用激活检查点，测量每步增加的耗时，并将故障恢复检查点与激活重计算设置分开管理。
- **常见混淆（Common confusion）:** 激活检查点不是持久化的训练检查点。它帮助单次前向和反向传播适配内存容量，却无法恢复崩溃的训练任务。
- **相关术语（Related terms）:** Autograd, Backpropagation, Checkpoint, Mixed Precision
- **来源（Sources）:** [以亚线性内存开销训练深度网络](https://arxiv.org/abs/1604.06174)

<a id="activation-function"></a>
### 激活函数（Activation Function）
- **分类（Category）:** 数学与训练（Math & training）
- **常见说法（What people say）:** 层与层之间的非线性运算。
- **准确含义（What it actually means）:** 在线性层或仿射层之后应用、用于引入非线性的函数。没有它，多个带权重和偏置的层复合后仍等价于一次仿射变换。常见选择包括 ReLU、GELU 和 SiLU。具体选择直接影响训练时梯度能否传递。
- **学习课程（Learn it）:** [激活函数](../phases/03-deep-learning-core/04-activation-functions/)
- **相关术语（Related terms）:** ReLU, Gradient, Backpropagation

<a id="adam-optimizer"></a>
### 自适应矩估计优化器（Adam (Optimizer)）
- **分类（Category）:** 数学与训练（Math & training）
- **常见说法（What people say）:** 不假思索就会选用的优化器。
- **准确含义（What it actually means）:** 即自适应矩估计（Adaptive Moment Estimation）。它结合梯度的指数平均与梯度平方的指数平均，进行偏差校正，并针对每个参数调整更新尺度。它是实用的基线，但仍需要合适的学习率及调度方案。
- **常见混淆（Common confusion）:** Adam 是有竞争力的基线，而不是普遍最优的优化器。
- **来源（Sources）:** [Adam 论文](https://arxiv.org/abs/1412.6980)
- **相关术语（Related terms）:** AdamW, Optimizer, Learning Rate

<a id="adamw"></a>
### 解耦权重衰减优化器（AdamW）
- **分类（Category）:** 数学与训练（Math & training）
- **常见说法（What people say）:** 修正了权重衰减方式的 Adam。
- **准确含义（What it actually means）:** 将权重衰减与基于梯度的参数更新解耦的 Adam 变体。与在 Adam 自适应缩放的梯度中加入 L2 惩罚相比，这使参数收缩的行为更容易分析。
- **常见混淆（Common confusion）:** 解耦权重衰减并不意味着 AdamW 普遍最优。最佳优化器和调度方案仍取决于模型、数据与训练规模。
- **来源（Sources）:** [解耦权重衰减正则化](https://arxiv.org/abs/1711.05101)
- **相关术语（Related terms）:** Adam (Optimizer), Weight Decay, Optimizer

<a id="admission-control"></a>
### 准入控制（Admission Control）
- **分类（Category）:** 可靠性与运维（Reliability & operations）
- **准确含义（What it actually means）:** 在接受请求之前设置的门禁，根据系统当前容量、优先级和策略，决定请求能否进入有界队列或服务。
- **重要性（Why it matters）:** 在受控边界拒绝超量工作，可以保护已获准的请求，避免队列膨胀、超时级联和资源耗尽。
- **实际应用（In practice）:** 估算请求成本，检查租户和系统容量，以原子方式预留所需预算，并在拒绝时指出哪个范围过载。只有当问题是暂时的，且调用方的重试预算允许再次尝试时，才提供重试建议。
- **常见混淆（Common confusion）:** 准入控制发生在接受请求之前。负载丢弃则可在入口、队列、依赖项或其他过载边界拒绝或移除工作。
- **相关术语（Related terms）:** Load Shedding, Backpressure, Rate Limit, Saturation
- **来源（Sources）:** [Google SRE：处理过载](https://sre.google/sre-book/handling-overload/)

<a id="agent"></a>
### 智能体（Agent）
- **分类（Category）:** 智能体与工具（Agents & tools）
- **常见说法（What people say）:** 能够独立思考和行动的自主模型。
- **准确含义（What it actually means）:** 一种软件系统，让模型能够围绕目标选择动作、观察工具或环境返回的结果，并在编排策略约束下继续执行。智能体可以使用循环、状态机、工作流引擎或人工审批。模型只是其中一个组件，而不是整个系统。
- **重要性（Why it matters）:** 可靠性来自围绕模型构建的运行框架、工具契约、状态、权限和验证机制。
- **实际应用（In practice）:** 编程智能体读取仓库上下文，提出补丁，在沙箱中运行测试，并在部署前停下来请求批准。
- **常见混淆（Common confusion）:** 自主性表示被委派权限的程度，不是每个智能体都必须具备的属性。
- **学习课程（Learn it）:** [智能体循环](../phases/14-agent-engineering/01-the-agent-loop/)
- **相关术语（Related terms）:** Agent Harness, Agent State, Tool Contract, Human-in-the-Loop (HITL)

<a id="agent-harness"></a>
### 智能体运行框架（Agent Harness）
- **分类（Category）:** 智能体与工具（Agents & tools）
- **准确含义（What it actually means）:** 围绕模型构建的运行时，负责组装上下文、提供工具、管理状态、执行限制、记录追踪，并决定智能体何时继续、重试、询问或停止。
- **重要性（Why it matters）:** 即使使用同一模型，两个系统的表现也可能相差很大，因为运行框架提供的上下文、工具、反馈和安全边界不同。
- **实际应用（In practice）:** 运行框架可以将智能体限制为最多调用五次工具，在每次补丁被接受后持久化检查点，并要求完成前必须有一条测试命令通过。
- **常见混淆（Common confusion）:** 运行框架的范围比提示词模板广，但比完整产品窄。
- **学习课程（Learn it）:** [最小智能体工作台](../phases/14-agent-engineering/32-minimal-agent-workbench/)
- **相关术语（Related terms）:** Agent, Tool Contract, Agent State, Verification Gate, Sandbox

<a id="agent-memory"></a>
### 智能体记忆（Agent Memory）
- **分类（Category）:** 智能体与工具（Agents & tools）
- **准确含义（What it actually means）:** 存储在模型之外、经筛选供后续智能体步骤使用的信息，例如此前的决策、用户偏好、任务经历或已核实的事实。
- **重要性（Why it matters）:** 它让智能体在单个上下文窗口之外保持连续性，而不必把每件过去发生的事塞进每条提示词。
- **实际应用（In practice）:** 保存带来源记录的精简任务结果，只在相关时检索，并允许用户查看或纠正持久保存的个人信息。
- **常见混淆（Common confusion）:** 智能体记忆不等于智能体状态。状态跟踪当前运行，记忆则保留精选信息，供未来可能的运行使用。
- **相关术语（Related terms）:** Agent State, Context Engineering, Checkpoint, Semantic Cache
- **来源（Sources）:** [生成式智能体](https://arxiv.org/abs/2304.03442)

<a id="agent-state"></a>
### 智能体状态（Agent State）
- **分类（Category）:** 智能体与工具（Agents & tools）
- **准确含义（What it actually means）:** 智能体在步骤之间携带的显式数据，例如当前目标、已完成动作、工具结果、待解问题、预算、审批和交付物引用。
- **重要性（Why it matters）:** 显式状态让长任务可恢复、可检查，减少对模型从对话记录中重建进度的依赖。
- **实际应用（In practice）:** 将选定的问题单、已改文件、最新测试结果和剩余检查项存入带类型定义的对象，并在每次动作后更新。
- **常见混淆（Common confusion）:** 状态不等于对话历史。对话记录是证据；状态则是决定下一步操作所用的精简运行记录。
- **学习课程（Learn it）:** [仓库记忆与状态](../phases/14-agent-engineering/34-repo-memory-and-state/)
- **相关术语（Related terms）:** Checkpoint, Durable Execution, Context Engineering, Handoff

<a id="agent-skill"></a>
### 智能体技能（Agent Skill）
- **分类（Category）:** 智能体与工具（Agents & tools）
- **准确含义（What it actually means）:** 以 `SKILL.md` 为入口、可被发现的过程性指令目录，可附带参考资料、脚本和资源，由兼容运行时分阶段加载。
- **重要性（Why it matters）:** 它将可复用的任务知识与单次对话分离打包，同时让更深入的上下文和确定性辅助程序按需可用。
- **实际应用（In practice）:** 发布简洁的名称和路由描述，只在技能激活后加载工作流程，并在任务进行到相应分支时读取该分支的参考资料。
- **常见混淆（Common confusion）:** 激活技能只是提供上下文，并不意味着暴露工具、授予权限、创建沙箱，或证明最终工作正确。
- **学习课程（Learn it）:** [智能体技能：可移植契约与运行时边界](../phases/13-tools-and-protocols/22-skills-and-agent-sdks/)
- **相关术语（Related terms）:** Skill Bundle, Skill Catalog, Skill Invocation, Progressive Disclosure, MCP (Model Context Protocol)
- **来源（Sources）:** [智能体技能规范](https://agentskills.io/specification)

<a id="ai-risk-assessment"></a>
### 人工智能风险评估（AI Risk Assessment）
- **分类（Category）:** 安全与治理（Security & governance）
- **准确含义（What it actually means）:** 以文档形式分析 AI 系统如何影响个人、组织和环境，内容包括背景、危害、发生可能性、影响、控制措施、残余风险和监测责任。
- **重要性（Why it matters）:** 风险并非只由模型能力决定。部署场景、受影响群体、人的权限、数据及系统集成都会改变可能的伤害和所需控制措施。
- **实际应用（In practice）:** 定义预期用途与受影响方，识别可信的失效和滥用场景，为控制措施指定负责人，记录残余风险，并为重大变更设定复审触发条件。
- **常见混淆（Common confusion）:** 风险评估为特定假设下的决策提供支持。它不是一次性的安全证书，也不证明已发现所有危害。
- **相关术语（Related terms）:** Threat Model, Guardrails, Human-in-the-Loop (HITL), Data Classification
- **来源（Sources）:** [NIST 人工智能风险管理框架](https://www.nist.gov/itl/ai-risk-management-framework)

<a id="alignment"></a>
### 对齐（Alignment）
- **分类（Category）:** 评估与安全（Evaluation & safety）
- **常见说法（What people say）:** 让 AI 安全。
- **准确含义（What it actually means）:** 在预期情境和对抗情境下，使模型或 AI 系统的行为符合预定目标、约束与人类偏好的努力。
- **重要性（Why it matters）:** 系统可能一边优化指定指标，一边违背用户真实意图。因此，对齐不仅需要模型训练，也需要评估、监督和系统控制。
- **相关术语（Related terms）:** Guardrails, Evaluation (Eval), Human-in-the-Loop (HITL)

<a id="approval-gate"></a>
### 审批门禁（Approval Gate）
- **分类（Category）:** 智能体与工具（Agents & tools）
- **准确含义（What it actually means）:** 阻止重要动作执行的控制点，直到获授权的人或策略授予许可。
- **重要性（Why it matters）:** 它限制不确定模型决策的影响范围，同时保留可逆工作的自动化。
- **实际应用（In practice）:** 让智能体编写数据库迁移方案，并在一次性数据库中试运行，但任何生产执行都必须获得负责人的批准。
- **常见混淆（Common confusion）:** 审批门禁判断动作是否获得授权；验证门禁判断证据是否表明动作正确。
- **学习课程（Learn it）:** [验证门禁](../phases/14-agent-engineering/38-verification-gates/)
- **相关术语（Related terms）:** Human-in-the-Loop (HITL), Verification Gate, Least Privilege

<a id="approximate-nearest-neighbor-ann"></a>
### 近似最近邻（Approximate Nearest Neighbor (ANN)）
- **分类（Category）:** 检索与生成（Retrieval & generation）
- **准确含义（What it actually means）:** 无需将查询向量与所有已存向量逐一比较，就能返回很可能属于其最近邻的向量的搜索方法。
- **重要性（Why it matters）:** 近似搜索使大规模向量索引切实可行，但也带来搜索速度、内存和检索召回率之间可度量的权衡。
- **实际应用（In practice）:** 在留出的查询集上调优索引和搜索参数，同时报告延迟与 Recall@K，不要假设每个真正的近邻都会被找到。
- **常见混淆（Common confusion）:** ANN 描述搜索目标和权衡，而 HNSW 是可实现该目标的一种具体索引算法。
- **相关术语（Related terms）:** Vector Database, HNSW, Cosine Similarity, Recall@K
- **来源（Sources）:** [使用 HNSW 进行高效且稳健的近似最近邻搜索](https://dl.acm.org/doi/10.1109/TPAMI.2018.2889473)

<a id="attention"></a>
### 注意力（Attention）
- **分类（Category）:** 模型与推理（Models & inference）
- **常见说法（What people say）:** 模型如何关注重要词元。
- **准确含义（What it actually means）:** 通过比较查询向量与键向量、归一化所得分数，再按这些分数组合值向量，形成上下文表示的机制。掩码、位置规则或稀疏模式可以限制哪些位置参与运算。
- **重要性（Why it matters）:** 注意力让模型能够在序列位置之间传递信息，但它本身无法解释或证明模型理解了什么。
- **常见混淆（Common confusion）:** 注意力权重是计算系数，不是对模型推理过程的忠实解释。
- **学习课程（Learn it）:** [从零实现自注意力](../phases/07-transformers-deep-dive/02-self-attention-from-scratch/)
- **来源（Sources）:** [注意力就是你所需要的一切](https://arxiv.org/abs/1706.03762)
- **相关术语（Related terms）:** Self-Attention, Transformer, KV Cache

<a id="audio-token"></a>
### 音频词元（Audio Token）
- **分类（Category）:** 多模态系统（Multimodal systems）
- **准确含义（What it actually means）:** 由音频编解码器或分词器生成的离散标识符，表示音频信号的一小段或某个特征，有时涉及多个码本。
- **重要性（Why it matters）:** 离散音频表示让序列模型能够使用面向词元的架构处理、预测、存储或生成声音。
- **实际应用（In practice）:** 让编解码器与模型一起进行版本管理，保留采样率和码本元数据，测量重建质量，并区分语义音频词元与波形压缩词元。
- **常见混淆（Common confusion）:** 音频词元并不对应固定时长、音素或单词。其含义和时间跨度取决于分词器与码本设计。
- **学习课程（Learn it）:** [神经音频编解码器](../phases/06-speech-and-audio/13-neural-audio-codecs/)
- **相关术语（Related terms）:** Token, Embedding, Automatic Speech Recognition (ASR), Multimodal Model
- **来源（Sources）:** [SoundStream 论文](https://arxiv.org/abs/2107.03312)

<a id="audit-log"></a>
### 审计日志（Audit Log）
- **分类（Category）:** 安全与治理（Security & governance）
- **准确含义（What it actually means）:** 关于安全或问责相关事件的持久记录，受访问控制保护，包含谁或什么执行了动作、改动了什么、何时发生，以及最终状态。
- **重要性（Why it matters）:** 重要的智能体动作需要证据，不仅用于性能调试，还要支持调查、策略复审和责任追溯。
- **实际应用（In practice）:** 记录工具授权、审批决定、外部写入、策略版本及交付物标识符，同时隐去机密信息并限制日志访问。
- **常见混淆（Common confusion）:** 追踪用于诊断一条执行路径；审计日志则跨多次执行、随时间保留问责所需的事件。
- **相关术语（Related terms）:** Trace, Observability, Approval Gate, Provenance Attestation
- **来源（Sources）:** [NIST SP 800-92 标准](https://csrc.nist.gov/pubs/sp/800/92/final)

<a id="autograd"></a>
### 自动求导（Autograd）
- **分类（Category）:** 数学与训练（Math & training）
- **常见说法（What people say）:** 自动计算梯度。
- **准确含义（What it actually means）:** 记录或变换张量运算，以计算导数的系统，通常使用反向模式自动微分。你编写前向计算，框架推导反向传播所需的梯度。
- **学习课程（Learn it）:** [链式法则与自动微分](../phases/01-math-foundations/05-chain-rule-and-autodiff/)
- **相关术语（Related terms）:** Backpropagation, Gradient, Tensor

<a id="automatic-speech-recognition-asr"></a>
### 自动语音识别（Automatic Speech Recognition (ASR)）
- **分类（Category）:** 多模态系统（Multimodal systems）
- **准确含义（What it actually means）:** 将语音信号映射为转写文本的任务及系统流水线，通常还可提供词元或片段的时间信息与置信度。
- **重要性（Why it matters）:** 语音接口并不只依赖语言建模。声学变化、切分、解码、词汇和领域条件都会影响最终转写文本。
- **实际应用（In practice）:** 按语言、说话人、噪声和领域评估词错误率或字符错误率；下游依据关联需要时间戳时予以保留，并测试生产环境实际使用的音频预处理流程。
- **常见混淆（Common confusion）:** ASR 转写说出的内容。确定是谁说话需要说话人分离或说话人识别；翻译与意图理解则是另外的任务。
- **学习课程（Learn it）:** [语音识别与 ASR](../phases/06-speech-and-audio/04-speech-recognition-asr/)
- **相关术语（Related terms）:** Audio Token, Encoder, Tokenization, Multimodal Model
- **来源（Sources）:** [连接时序分类](https://www.cs.toronto.edu/~graves/icml_2006.pdf)

<a id="autoregressive"></a>
### 自回归（Autoregressive）
- **分类（Category）:** 模型与推理（Models & inference）
- **常见说法（What people say）:** 模型每次生成一个单词。
- **准确含义（What it actually means）:** 一种分解方式，根据前面的词元预测每个输出词元。生成时，选定词元被追加到序列中，成为下一次预测上下文的一部分。
- **常见混淆（Common confusion）:** 生成单位是词元，不一定是单词；解码方法也不局限于每次选择概率最高的词元。
- **相关术语（Related terms）:** Token, Temperature, KV Cache

<a id="autoscaling"></a>
### 自动扩缩容（Autoscaling）
- **分类（Category）:** 基础设施与服务（Infrastructure & serving）
- **准确含义（What it actually means）:** 根据观测到的需求、资源使用或应用指标，在配置边界内调整服务工作单元数量或容量的控制循环。
- **重要性（Why it matters）:** AI 工作负载的变化可能快于人工配置资源，但扩缩容决策必须考虑模型加载时间、加速器可用性、排队和请求成本。
- **实际应用（In practice）:** 根据与有效工作相关的需求信号扩缩容，设置最低预热容量，限制缩容引发的反复变化，并确认新副本通过就绪检查后才接收流量。
- **常见混淆（Common confusion）:** 自动扩缩容增加或减少容量。它不会让过载的依赖项变快，也不保证能及时获得足够硬件。
- **学习课程（Learn it）:** [Kubernetes 上的 GPU 自动扩缩容](../phases/17-infrastructure-and-production/03-gpu-autoscaling-kubernetes/)
- **相关术语（Related terms）:** Model Serving, Saturation, Readiness Probe, Backpressure
- **来源（Sources）:** [Kubernetes 水平 Pod 自动扩缩容](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/)

<a id="availability"></a>
### 可用性（Availability）
- **分类（Category）:** 可靠性与运维（Reliability & operations）
- **准确含义（What it actually means）:** 在明确的度量边界内，用户能够获得已定义的可接受服务的合格服务交互或时间窗口所占比例。
- **重要性（Why it matters）:** 服务可能仍在运行，用户却无法完成有用的请求。因此，可用性必须与用户可见的成功相关，而不能只看进程运行时间。
- **实际应用（In practice）:** 定义合格事件与可接受结果，只排除有文档依据的情况，在固定窗口内计算指标，并调查完全失败及长时间部分退化两类问题。
- **常见混淆（Common confusion）:** 可用性只是可靠性的一项结果，并不描述延迟、正确性、安全性或每类用户的体验。
- **相关术语（Related terms）:** Service Level Indicator (SLI), Service Level Objective (SLO), Error Budget, Incident Response
- **来源（Sources）:** [Google SRE：服务级别目标](https://sre.google/sre-book/service-level-objectives/)

## B

<a id="backpressure"></a>
### 背压（Backpressure）
- **分类（Category）:** AI 原生开发（AI-native development）
- **准确含义（What it actually means）:** 当下游组件无法以当前速率安全处理工作时，减缓或拒绝上游工作的流量控制机制。
- **重要性（Why it matters）:** 没有背压，排队中的智能体任务、工具调用或流式事件可能耗尽内存、超出速率限制，并放大重试。
- **实际应用（In practice）:** 当评估器队列达到上限时，暂停新的智能体任务或返回可重试响应，而不是无限接受工作。
- **常见混淆（Common confusion）:** 背压在失败之前保护容量；熔断器则在失败表明依赖项不健康后停止调用。
- **相关术语（Related terms）:** Rate Limit, Retry with Backoff, Circuit Breaker

<a id="backpropagation"></a>
### 反向传播（Backpropagation）
- **分类（Category）:** 数学与训练（Math & training）
- **常见说法（What people say）:** 神经网络的学习方式。
- **准确含义（What it actually means）:** 高效应用链式法则，将导数从标量损失沿计算图向后传播。它计算梯度，再由优化器使用这些梯度更新参数。
- **常见混淆（Common confusion）:** 反向传播计算梯度，并不选择更新规则或学习率。
- **名称由来（Why it's called that）:** 导数信息从损失向更早的运算反向传递。
- **学习课程（Learn it）:** [从零实现反向传播](../phases/03-deep-learning-core/03-backpropagation/)
- **相关术语（Related terms）:** Autograd, Gradient, Optimizer

<a id="batch-size"></a>
### 批大小（Batch Size）
- **分类（Category）:** 数学与训练（Math & training）
- **常见说法（What people say）:** 一次处理多少个样本。
- **准确含义（What it actually means）:** 在一次优化器更新之前，其损失共同参与一次梯度估计的样本数量。更大的批次可以提高硬件利用率、降低梯度噪声，但需要更多内存，也可能需要不同的学习率或调度选择。
- **常见混淆（Common confusion）:** 不存在通用的批大小范围，也没有规则要求每次增大批次都按同样幅度提高学习率。
- **相关术语（Related terms）:** Learning Rate, Gradient, Optimizer

<a id="benchmark-contamination"></a>
### 基准测试污染（Benchmark Contamination）
- **分类（Category）:** 评估与安全（Evaluation & safety）
- **准确含义（What it actually means）:** 评估样本与用于预训练、调优、提示、选择或以其他方式改进被评估系统的数据之间存在重叠或信息泄漏。
- **重要性（Why it matters）:** 污染可能让基准分数反映系统此前接触过这些内容，而非泛化到未见任务的能力。
- **实际应用（In practice）:** 跟踪数据集来源，在训练来源中搜索完全重复与近似重复内容，保留私有测试用例，并用新编写的样本更新公开评估集。
- **常见混淆（Common confusion）:** 污染不只包括原样复制。改写文本、标准答案、基准元数据和反复调优提示词，也可能泄漏评估信息。
- **相关术语（Related terms）:** Data Leakage, Data Deduplication, Eval Set, Exact Match (EM)
- **来源（Sources）:** [现代大语言模型基准测试中的数据污染调查](https://arxiv.org/abs/2311.09783)

<a id="bm25"></a>
### 词项相关性排序函数（BM25）
- **分类（Category）:** 检索与生成（Retrieval & generation）
- **准确含义（What it actually means）:** 根据查询词项的匹配情况为文档评分的词法排序函数，同时考虑词项稀有程度、重复次数和文档长度。
- **重要性（Why it matters）:** 它是有竞争力的精确词项检索基线，在标识符、罕见词和领域专用短语上可补充稠密检索。
- **实际应用（In practice）:** 使用 BM25 与稠密搜索检索候选项，融合排名，先评估合并结果，再决定是否加入成本更高的重排序器。
- **常见混淆（Common confusion）:** BM25 不直接理解语义相似性，其分数在不同查询或索引配置之间也没有统一含义。
- **相关术语（Related terms）:** Hybrid Retrieval, Dense Retrieval, Reranker, RAG (Retrieval-Augmented Generation)
- **来源（Sources）:** [概率相关性框架：BM25 及其扩展](https://doi.org/10.1561/1500000019)

<a id="byte-pair-encoding-bpe"></a>
### 字节对编码（Byte Pair Encoding (BPE)）
- **分类（Category）:** 数据与表示（Data & representations）
- **准确含义（What it actually means）:** 一种子词分词方法，通过反复合并频繁出现的相邻单元，从训练文本构造固定词表。
- **重要性（Why it matters）:** 它在词表大小与用较小单元表示罕见词或未见词的能力之间取得平衡。
- **实际应用（In practice）:** 只使用获准的语料划分训练分词器，将合并规则与模型一起版本化，并检查它如何切分代码、多语言文本和空白字符。
- **常见混淆（Common confusion）:** BPE 是一类分词器方法，不是所有模型生成词元方式的通用描述。
- **相关术语（Related terms）:** Tokenization, Vocabulary, Token, Embedding
- **来源（Sources）:** [使用子词单元进行罕见词神经机器翻译](https://arxiv.org/abs/1508.07909)

## C

<a id="calibration"></a>
### 校准（Calibration）
- **分类（Category）:** 评估与安全（Evaluation & safety）
- **准确含义（What it actually means）:** 系统声明的置信度，与具有该置信度的预测实际正确频率之间的一致程度。
- **重要性（Why it matters）:** 系统即使平均准确率较高，在用户依赖分数作决定的案例上仍可能危险地过度自信。
- **实际应用（In practice）:** 按置信度将预测分桶，比较置信度与实际准确率；差距不可接受时，重新校准或弃答。
- **常见混淆（Common confusion）:** 校准衡量置信度的可靠性，而非总体准确率、事实性或推理质量。
- **相关术语（Related terms）:** Softmax, Evaluation (Eval), Precision & Recall, Logits
- **来源（Sources）:** [现代神经网络的校准研究](https://proceedings.mlr.press/v70/guo17a.html)

<a id="canary-release"></a>
### 金丝雀发布（Canary Release）
- **分类（Category）:** 可靠性与运维（Reliability & operations）
- **准确含义（What it actually means）:** 先让有限的一部分流量或基础设施使用新版本，再扩大推出范围的部署策略。
- **重要性（Why it matters）:** 它限制缺陷影响，并在新模型、提示词、智能体或服务覆盖所有人之前提供生产证据。
- **实际应用（In practice）:** 将一小组合格用户路由至新版本，与对照组比较质量和运行指标，并在出现预定义失败时停止或回滚。
- **常见混淆（Common confusion）:** 金丝雀发布限制暴露范围，但不能替代部署前测试、审批或回滚准备。
- **相关术语（Related terms）:** Evaluation (Eval), Observability, Rollback, Verification Gate
- **来源（Sources）:** [Kubernetes 部署：金丝雀部署](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/#canary-deployment)

<a id="chain-of-thought-cot"></a>
### 思维链（Chain of Thought (CoT)）
- **分类（Category）:** 提示词与上下文（Prompting & context）
- **常见说法（What people say）:** 要求模型展示每一步思考。
- **准确含义（What it actually means）:** 在生成答案前用于分解任务的中间推理过程。提示词可以要求可见的理由说明，也有系统使用不向用户返回的内部推理。
- **重要性（Why it matters）:** 分解任务有助于多步骤问题，但流畅的理由说明不能证明答案正确，也不能证明文本忠实反映了模型的内部计算。
- **实际应用（In practice）:** 要求简洁计划，独立检查结果，并请求可验证的计算或引用，而不是依赖冗长的推理记录。
- **常见混淆（Common confusion）:** 思维链不能替代工具、测试或外部验证。
- **学习课程（Learn it）:** [少样本与思维链](../phases/11-llm-engineering/02-few-shot-cot/)
- **相关术语（Related terms）:** Prompt Engineering, Verification Gate, Evaluation (Eval)

<a id="checkpoint"></a>
### 检查点（Checkpoint）
- **分类（Category）:** 智能体与工具（Agents & tools）
- **准确含义（What it actually means）:** 用于从已知边界恢复的持久快照。在工作流中，它保存运行状态和交付物引用；在模型训练中，它可保存参数、优化器状态、调度器状态及训练位置。
- **重要性（Why it matters）:** 长时间运行的工作流和训练任务可以从中断中恢复，无须重做已完成工作，也不会丢失代价高昂的进展。
- **实际应用（In practice）:** 在经过验证的步骤后，保存智能体已接受的补丁及测试证据；或在关闭训练前保存权重、优化器状态、随机状态和数据位置。
- **常见混淆（Common confusion）:** 工作流检查点与模型训练检查点有相同的恢复目标，但保留的状态不同。二者都不只是对话记录，也不只是缺少恢复元数据的权重文件。
- **学习课程（Learn it）:** [检查点保存与恢复](../phases/19-capstone-projects/47-checkpoint-save-resume/); [仓库记忆与状态](../phases/14-agent-engineering/34-repo-memory-and-state/)
- **相关术语（Related terms）:** Agent State, Durable Execution, Parameter, Optimizer

<a id="chunked-prefill"></a>
### 分块预填充（Chunked Prefill）
- **分类（Category）:** 基础设施与服务（Infrastructure & serving）
- **准确含义（What it actually means）:** 将长提示词的预填充工作拆成较小、可调度片段的服务技术，使提示词处理可以与其他请求的解码工作交错执行。
- **重要性（Why it matters）:** 否则，一个长提示词可能占据加速器并拖延正在生成的请求，即使总体吞吐量看似正常，尾延迟仍很差。
- **实际应用（In practice）:** 根据实测工作负载选择分块策略，计入调度开销，并在混合提示词长度下比较预填充完成时间、解码延迟和有效吞吐量。
- **常见混淆（Common confusion）:** 分块预填充改变提示词计算的调度方式，不会把用户上下文切成独立语义块，也不改变模型的上下文窗口。
- **学习课程（Learn it）:** [vLLM 服务内部机制](../phases/17-infrastructure-and-production/04-vllm-serving-internals/)
- **相关术语（Related terms）:** Prefill, Decode Phase, Dynamic Batching, Tail Latency
- **来源（Sources）:** [Sarathi-Serve 论文](https://arxiv.org/abs/2403.02310)

<a id="chunking"></a>
### 分块（Chunking）
- **分类（Category）:** 检索与生成（Retrieval & generation）
- **常见说法（What people say）:** 把文档切成小块。
- **准确含义（What it actually means）:** 在建立索引前，将源材料划分为可检索单元。块边界、重叠、元数据及文档结构决定检索能否返回足够上下文，同时避免提示词被淹没。
- **重要性（Why it matters）:** 合适的分块策略取决于文档结构、查询类型、嵌入模型和评估结果。不存在通用的词元块大小或重叠比例。
- **实际应用（In practice）:** 保持标题和代码块完整，附加来源元数据，并在调整大小前用真实问题测量检索质量。
- **相关术语（Related terms）:** RAG (Retrieval-Augmented Generation), Reranker, Grounding

<a id="circuit-breaker"></a>
### 熔断器（Circuit Breaker）
- **分类（Category）:** AI 原生开发（AI-native development）
- **准确含义（What it actually means）:** 当失败次数超过阈值后，暂时停止调用某个依赖项，并随后探测其是否恢复的可靠性控制。
- **重要性（Why it matters）:** 它防止反复发生的模型或工具失败消耗系统其余部分的延迟预算、费用预算和容量。
- **实际应用（In practice）:** 提供方反复超时后打开熔断器，切换备用服务或返回受控响应；冷却一段时间后，允许有限的健康探测。
- **常见混淆（Common confusion）:** 熔断器针对依赖项健康状态作出反应；速率限制控制允许的请求量。
- **相关术语（Related terms）:** Retry with Backoff, Rate Limit, Model Router, Backpressure

<a id="cnn-convolutional-neural-network"></a>
### 卷积神经网络（CNN (Convolutional Neural Network)）
- **分类（Category）:** 模型与推理（Models & inference）
- **常见说法（What people say）:** 处理图像的神经网络。
- **准确含义（What it actually means）:** 利用卷积运算，即在输入上滑动滤波器，检测局部模式的神经网络。堆叠卷积可以检测逐渐复杂的特征：边缘、纹理和物体。
- **常见混淆（Common confusion）:** 卷积也适用于音频、时间序列和其他网格状数据。
- **相关术语（Related terms）:** Feature, Inductive Bias, Activation Function

<a id="coding-agent"></a>
### 编程智能体（Coding Agent）
- **分类（Category）:** AI 原生开发（AI-native development）
- **准确含义（What it actually means）:** 专门处理软件工作的智能体，能检查仓库、编辑文件、运行开发工具，并根据工具输出推进有明确范围的工程任务。
- **重要性（Why it matters）:** 其价值取决于仓库上下文、工具权限、审阅边界和验证，而不只是代码生成质量。
- **实际应用（In practice）:** 向智能体提供问题单、范围契约、仓库指令和测试命令；接受结果前审阅补丁及证据。
- **常见混淆（Common confusion）:** 只建议文本的编程助手不一定是智能体。智能体通过工具行动，并观察结果。
- **学习课程（Learn it）:** [技能发现与渐进式披露](../phases/13-tools-and-protocols/24-skill-discovery-and-progressive-disclosure/)
- **相关术语（Related terms）:** Agent Harness, Repository Map, Patch, Scope Contract, Reviewer Agent

<a id="compensating-action"></a>
### 补偿动作（Compensating Action）
- **分类（Category）:** 智能体与工具（Agents & tools）
- **准确含义（What it actually means）:** 当原操作无法原子回滚时，有意执行一个在语义上抵消已完成副作用的操作。
- **重要性（Why it matters）:** 多步骤智能体工作流跨越数据库和外部服务，后续失败无法通过单个事务撤销此前所有写入。
- **实际应用（In practice）:** 如果预订流程已扣款却预订失败，应发起可追踪的退款，并保留两个事件，而不是删除历史。
- **常见混淆（Common confusion）:** 补偿是新的业务动作，不是让时间倒流。它也可能失败，因此需要幂等性、监测和升级处理机制。
- **相关术语（Related terms）:** Durable Execution, Idempotency, Checkpoint, Approval Gate
- **来源（Sources）:** [Saga 事务论文](https://dl.acm.org/doi/10.1145/38713.38742)

<a id="content-provenance"></a>
### 内容溯源（Content Provenance）
- **分类（Category）:** 安全与治理（Security & governance）
- **准确含义（What it actually means）:** 关于媒体或其他数字内容起源及编辑历史的可验证信息，包括相关参与者、工具、变换和附加声明。
- **重要性（Why it matters）:** 生成式系统让人难以仅凭外观推断来源声明，因此消费者和平台需要能检查的内容生产证据。
- **实际应用（In practice）:** 将来源声明绑定到内容，用受控身份签名，保留变换历史，并明确展示证据缺失或无法验证的情况。
- **常见混淆（Common confusion）:** 溯源能确定是谁声明了这段历史、记录是否被篡改，但不能证明内容描绘的事件真实，也不能证明内容无害。
- **学习课程（Learn it）:** [水印、SynthID、Stable Signature 与 C2PA](../phases/18-ethics-safety-alignment/23-watermarking-synthid-stable-signature-c2pa/)
- **相关术语（Related terms）:** Data Provenance, Provenance Attestation, Audit Log, Grounding
- **来源（Sources）:** [C2PA 技术规范](https://c2pa.org/specifications/specifications/2.2/specs/C2PA_Specification.html)

<a id="context-compression"></a>
### 上下文压缩（Context Compression）
- **分类（Category）:** 提示词与上下文（Prompting & context）
- **准确含义（What it actually means）:** 减少源材料占用的词元数量，同时尽量保留后续模型决策所需的信息。
- **重要性（Why it matters）:** 压缩可以让长任务适配预算，但每个被省略的细节都可能导致模型失去证据、约束或尚未解决的状态信息。
- **实际应用（In practice）:** 逐字保留权威事实和标识符，概括冗余历史，附加来源指针，并用代表性任务测试压缩后的上下文。
- **常见混淆（Common confusion）:** 除非保留完整原文，否则压缩是有损的。更短的摘要不自动等价于原上下文。
- **相关术语（Related terms）:** Token Budget, Context Engineering, Progressive Disclosure, Handoff
- **来源（Sources）:** [LLMLingua 论文](https://arxiv.org/abs/2310.05736)

<a id="context-engineering"></a>
### 上下文工程（Context Engineering）
- **分类（Category）:** 提示词与上下文（Prompting & context）
- **准确含义（What it actually means）:** 设计每一步提供给模型的完整信息环境，包括指令、选定文件、检索证据、工具结果、示例、状态和输出约束。
- **重要性（Why it matters）:** 模型表现不佳，往往是因为相关证据缺失、过时、排序不当，或被噪声淹没。
- **实际应用（In practice）:** 构建精简任务包，包含目标、仓库规则、相关接口、近期工具输出和待决问题，并随状态变化更新。
- **常见混淆（Common confusion）:** 提示词工程着重于指令措辞；上下文工程还决定哪些证据和状态进入模型的工作上下文。
- **学习课程（Learn it）:** [上下文工程](../phases/11-llm-engineering/05-context-engineering/)
- **相关术语（Related terms）:** Context Window, Progressive Disclosure, Agent State, Repository Map

<a id="context-window"></a>
### 上下文窗口（Context Window）
- **分类（Category）:** 提示词与上下文（Prompting & context）
- **常见说法（What people say）:** 模型能记住多少内容。
- **准确含义（What it actually means）:** 在特定模型与 API 契约下，单次模型推理可用的最大词元容量。它可能包括系统指令、消息、检索内容、工具交互和生成输出；计量方式与输出限制因提供方而异。
- **重要性（Why it matters）:** 只有应用发送或重建对话历史时，模型才能使用它。窗口大并不保证其中每个细节都能被可靠利用。
- **常见混淆（Common confusion）:** 上下文是一次推理的临时输入。持久记忆存储在模型之外，经筛选再进入后续上下文。
- **学习课程（Learn it）:** [上下文工程](../phases/11-llm-engineering/05-context-engineering/)
- **相关术语（Related terms）:** Token Budget, Context Engineering, Prompt Cache, Agent State

<a id="continuous-batching"></a>
### 连续批处理（Continuous Batching）
- **分类（Category）:** 基础设施与服务（Infrastructure & serving）
- **准确含义（What it actually means）:** 在迭代边界添加或移除生成请求，而不等待固定批次内所有请求完成的服务调度方式。
- **重要性（Why it matters）:** 自回归请求的输出长度不同，连续批处理可以维持加速器利用率，而不迫使短请求等待最长的请求。
- **实际应用（In practice）:** 容量空出时接受新请求，跟踪每个请求的延迟，并在活动批次或键值缓存预算耗尽时施加背压。
- **常见混淆（Common confusion）:** 连续批处理是推理调度策略，不是梯度累积，也不是训练批大小技术。
- **相关术语（Related terms）:** Dynamic Batching, Decode Phase, Backpressure, Rate Limit
- **来源（Sources）:** [Orca 论文](https://www.usenix.org/conference/osdi22/presentation/yu)

<a id="contrastive-learning"></a>
### 对比学习（Contrastive Learning）
- **分类（Category）:** 数学与训练（Math & training）
- **常见说法（What people say）:** 通过比较进行学习。
- **准确含义（What it actually means）:** 在嵌入空间中拉近相似样本对、推远不相似样本对的训练方式。CLIP 就采用这种方式，比较匹配与不匹配的图文对。
- **相关术语（Related terms）:** Embedding, Cosine Similarity, Loss Function

<a id="cosine-similarity"></a>
### 余弦相似度（Cosine Similarity）
- **分类（Category）:** 数据与表示（Data & representations）
- **常见说法（What people say）:** 两个向量有多相似。
- **准确含义（What it actually means）:** 两个向量的归一化点积，比较方向而不是大小。对于实值向量，其范围为 -1 到 1。
- **常见混淆（Common confusion）:** 高余弦相似度只有相对于特定嵌入模型和数据分布才有意义，并不证明事实或语义等价。
- **相关术语（Related terms）:** Embedding, Semantic Search, Reranker

<a id="cost-per-successful-task"></a>
### 每个成功任务的成本（Cost per Successful Task）
- **分类（Category）:** AI 原生开发（AI-native development）
- **准确含义（What it actually means）:** 系统总成本除以满足既定成功标准的任务数，成本包括重试、失败运行、工具使用和评估开销。
- **重要性（Why it matters）:** 单次模型调用即使便宜，若频繁失败或反复需要人工纠正，整个工作流仍可能昂贵。
- **实际应用（In practice）:** 统计 100 个仓库任务的提供方费用和基础设施成本，再除以补丁通过测试与审阅的任务数。
- **常见混淆（Common confusion）:** 每词元成本衡量用量；每个成功任务的成本衡量有用的成果。
- **相关术语（Related terms）:** Evaluation (Eval), Retry with Backoff, Model Router, Verification Gate

<a id="cross-attention"></a>
### 交叉注意力（Cross-Attention）
- **分类（Category）:** 多模态系统（Multimodal systems）
- **准确含义（What it actually means）:** 查询表示来自一个序列或表示，而键和值来自另一个序列或表示的注意力机制。
- **重要性（Why it matters）:** 它让一条信息流能以可学习的方式检索另一条流的信息，例如语言词元关注视觉特征。
- **实际应用（In practice）:** 明确哪条流提供查询、键和值，为缺失或无效位置应用掩码，并检查消融一个模态后模型是否仍能正常表现。
- **常见混淆（Common confusion）:** 交叉注意力并不天然等于多模态。它也可连接两个文本序列或其他表示；自注意力则从同一序列表示产生查询、键和值。
- **相关术语（Related terms）:** Attention, Self-Attention, Vision-Language Model (VLM), Multimodal Fusion
- **来源（Sources）:** [注意力就是你所需要的一切](https://arxiv.org/abs/1706.03762)

<a id="cross-entropy"></a>
### 交叉熵（Cross-Entropy）
- **分类（Category）:** 数学与训练（Math & training）
- **常见说法（What people say）:** 分类损失。
- **准确含义（What it actually means）:** 基于目标结果所获概率的负对数构造的损失。在下一词元训练中，当模型给实际出现的下一词元分配较低概率时，它会施加惩罚。
- **常见混淆（Common confusion）:** 只有平均方式和对数底数的定义一致时，困惑度才等于平均交叉熵的指数。
- **相关术语（Related terms）:** Loss Function, Softmax, Perplexity

<a id="cuda"></a>
### 统一计算设备架构（CUDA）
- **分类（Category）:** 模型与推理（Models & inference）
- **常见说法（What people say）:** GPU 编程。
- **准确含义（What it actually means）:** NVIDIA 面向兼容 GPU 通用计算的平台和编程模型。深度学习框架使用 CUDA 库和内核并行执行大量张量运算。
- **常见混淆（Common confusion）:** GPU 加速不等同于 CUDA，还存在其他硬件与软件技术栈。
- **相关术语（Related terms）:** Tensor, Mixed Precision, JAX

## D

<a id="data-augmentation"></a>
### 数据增强（Data Augmentation）
- **分类（Category）:** 数学与训练（Math & training）
- **常见说法（What people say）:** 制造更多训练数据。
- **准确含义（What it actually means）:** 通过变换图像、扰动音频或改写文本等方式生成修改后的样本，无须收集全新源数据即可增加训练多样性。当变换保留任务信号时，它能减少过拟合。
- **常见混淆（Common confusion）:** 增强操作必须保留希望模型学会的目标标签或行为。
- **相关术语（Related terms）:** Overfitting, Epoch, Eval Set

<a id="data-classification"></a>
### 数据分类分级（Data Classification）
- **分类（Category）:** 安全与治理（Security & governance）
- **准确含义（What it actually means）:** 将数据归入有文档定义的敏感性或影响等级，使处理、访问、保留、共享及事件规则与泄露或丢失的后果相匹配。
- **重要性（Why it matters）:** 如果把源文档、提示词、追踪和生成交付物视为同等敏感，AI 流水线就无法施加适度的控制。
- **实际应用（In practice）:** 在摄取时分类，让标签随衍生交付物传递，按等级限制工具与目的地，并定义变换或聚合后标签如何变化。
- **常见混淆（Common confusion）:** 数据分类分级描述保护要求，不等同于机器学习分类任务，也不代表数据准确。
- **相关术语（Related terms）:** Data Minimization, Trust Boundary, Least Privilege, Audit Log
- **来源（Sources）:** [NIST SP 1800-39 首次公开草案：数据分类实践](https://www.nccoe.nist.gov/sites/default/files/2026-02/nist-sp-1800-39-ipd.pdf); [NIST FIPS 199：联邦信息与信息系统分类](https://csrc.nist.gov/pubs/fips/199/final)

<a id="data-deduplication"></a>
### 数据去重（Data Deduplication）
- **分类（Category）:** 数据与表示（Data & representations）
- **准确含义（What it actually means）:** 检测并移除单个或多个数据集内完全重复和近似重复的样本。
- **重要性（Why it matters）:** 重复可能扭曲训练分布、增加记忆化、泄漏测试材料，让评估看起来比实际更好。
- **实际应用（In practice）:** 规范化内容，使用精确哈希和相似性方法，审阅边界情况的聚类，并记录每个样本由哪个版本和规则移除。
- **常见混淆（Common confusion）:** 去重不是普通的数据清洗。两条不同记录可能合理地共享文本，而两段改写也可能携带相同的泄漏信息。
- **相关术语（Related terms）:** Data Provenance, Benchmark Contamination, Dataset Split, Overfitting
- **来源（Sources）:** [训练数据去重让语言模型更好](https://arxiv.org/abs/2107.06499)

<a id="data-exfiltration"></a>
### 数据外泄（Data Exfiltration）
- **分类（Category）:** 安全与治理（Security & governance）
- **准确含义（What it actually means）:** 未经授权，将受保护数据从系统或信任区域转移给无权接收它的个人、工具、服务或存储位置。
- **重要性（Why it matters）:** 即使原始数据存储完好，智能体仍可能通过生成文本、工具参数、URL、日志或副作用暴露机密。
- **实际应用（In practice）:** 尽量减少可读数据，设置目的地允许列表，检查出站工具调用，隐去敏感字段，并对跨信任边界的异常传输告警。
- **常见混淆（Common confusion）:** 外泄指未经授权的数据移动或披露。获授权组件正常检索数据不属于外泄，但后续使用可能构成外泄。
- **学习课程（Learn it）:** [EchoLeak 与 AI 的通用漏洞披露](../phases/18-ethics-safety-alignment/25-echoleak-cves-for-ai/)
- **相关术语（Related terms）:** Trust Boundary, Least Privilege, Indirect Prompt Injection, Audit Log
- **来源（Sources）:** [NIST SP 800-53 第 5 修订版：AC-4 信息流强制控制](https://csrc.nist.gov/files/pubs/sp/800/53/r5/upd1/final/docs/sp800-53r5-controls.xlsx)

<a id="data-leakage"></a>
### 数据泄漏（Data Leakage）
- **分类（Category）:** 数据与表示（Data & representations）
- **准确含义（What it actually means）:** 训练或构造特征时，无意使用真实预测时点不可获得的信息，或属于留出评估边界的信息。
- **重要性（Why it matters）:** 泄漏产生过于乐观的指标，当系统遇到真正未见输入时，这些指标就会失效。
- **实际应用（In practice）:** 拟合预处理器之前先划分数据，避免未来信息进入历史特征，并将测试标签和基准答案与提示词、调优循环隔离。
- **常见混淆（Common confusion）:** 泄漏不只来自重复行。全局归一化统计量、时间戳、目标衍生特征及反复依据测试修改提示词，都可能泄漏信息。
- **相关术语（Related terms）:** Dataset Split, Benchmark Contamination, Eval Set, Data Provenance
- **来源（Sources）:** [scikit-learn：数据泄漏](https://scikit-learn.org/stable/common_pitfalls.html#data-leakage)

<a id="data-lineage"></a>
### 数据血缘（Data Lineage）
- **分类（Category）:** 安全与治理（Security & governance）
- **准确含义（What it actually means）:** 记录数据交付物如何经由来源、变换、连接、过滤、版本及下游使用而派生形成。
- **重要性（Why it matters）:** 当来源被纠正、撤销或发现不安全时，血缘可识别哪些数据集、嵌入、评估及模型交付物可能受影响。
- **实际应用（In practice）:** 为输入输出赋予稳定标识符，记录每次变换及版本，保留父子关系，并测试受影响来源能否追踪到所有衍生物。
- **常见混淆（Common confusion）:** 数据溯源广泛描述来源和保管关系；数据血缘侧重变换路径及数据交付物之间的依赖。
- **相关术语（Related terms）:** Data Provenance, Datasheet for Datasets, Audit Log, Content Provenance
- **来源（Sources）:** [W3C 来源本体 PROV-O 规范](https://www.w3.org/TR/prov-o/)

<a id="data-minimization"></a>
### 数据最小化（Data Minimization）
- **分类（Category）:** 安全与治理（Security & governance）
- **准确含义（What it actually means）:** 对于个人数据，将收集、处理、暴露和保留的范围限制为特定目的所必需的内容。团队也可将同样原则用于敏感的非个人数据，作为工程控制措施。
- **重要性（Why it matters）:** 每个不必要地进入提示词、追踪、缓存或工具调用的字段，都会增加隐私暴露，以及滥用或系统遭入侵后的潜在影响。
- **实际应用（In practice）:** 收集前明确必需字段，在最早边界隐去或聚合数据，设置保留期限，并在保留可选上下文前验证它确实改善了可度量的任务结果。
- **常见混淆（Common confusion）:** 最小化不意味着不保留任何数据，而是能根据既定目的，为每个数据项、用途、接收方和保留期说明必要性。
- **相关术语（Related terms）:** Purpose Limitation, Data Classification, Least Privilege, Context Engineering
- **来源（Sources）:** [《通用数据保护条例》第 5(1)(c) 条](https://eur-lex.europa.eu/eli/reg/2016/679/oj)

<a id="data-provenance"></a>
### 数据溯源（Data Provenance）
- **分类（Category）:** 数据与表示（Data & representations）
- **准确含义（What it actually means）:** 可追踪的数据来源信息，包括由谁或什么进行了变换、使用了哪些版本，以及衍生交付物与来源的关系。
- **重要性（Why it matters）:** 复现结果、遵守使用约束、调查污染，以及来源变化时移除受影响数据，都需要溯源。
- **实际应用（In practice）:** 为数据集分配不可变版本，记录变换任务和来源标识符，并将血缘元数据带入嵌入、评估案例和模型交付物。
- **常见混淆（Common confusion）:** 源 URL 只是溯源的一部分，无法说明收集时间、许可、过滤、变换或下游使用。
- **相关术语（Related terms）:** Dataset Split, Data Deduplication, Provenance Attestation, Grounding
- **来源（Sources）:** [W3C PROV 概览](https://www.w3.org/TR/prov-overview/)

<a id="dataset-split"></a>
### 数据集划分（Dataset Split）
- **分类（Category）:** 数据与表示（Data & representations）
- **准确含义（What it actually means）:** 有文档记录地将样本分成相互分离的子集，分别用于拟合、开发决策和最终评估。
- **重要性（Why it matters）:** 分离可避免用于选择系统的证据，同时又被当作该系统具有泛化能力的独立证明。
- **实际应用（In practice）:** 按真实部署单元划分，例如用户、仓库、组织或时间，而不是随机分割彼此相关的行。
- **常见混淆（Common confusion）:** 随机划分不自动意味着独立。近似重复、未来观测或同一实体的记录，都可能跨越边界。
- **相关术语（Related terms）:** Eval Set, Overfitting, Data Leakage, Distribution Shift
- **来源（Sources）:** [数据集说明书](https://cacm.acm.org/research/datasheets-for-datasets/)

<a id="datasheet-for-datasets"></a>
### 数据集说明书（Datasheet for Datasets）
- **分类（Category）:** 安全与治理（Security & governance）
- **准确含义（What it actually means）:** 结构化记录数据集的动机、组成、收集流程、预处理、用途、分发、维护及已知局限的文档。
- **重要性（Why it matters）:** 数据集不会仅因可获取就安全或适用。下游构建者需要了解它如何创建，以及其假设在哪些地方不成立。
- **实际应用（In practice）:** 随版本化数据集发布说明书，指出谁能回答问题，记录未覆盖的人群和所做变换，并在数据集变化时更新文档。
- **常见混淆（Common confusion）:** 说明书记录证据和预期用途，不是许可证、质量保证，也不能替代针对具体部署的评估。
- **学习课程（Learn it）:** [模型卡、系统卡与数据集卡](../phases/18-ethics-safety-alignment/26-model-system-dataset-cards/)
- **相关术语（Related terms）:** Data Lineage, Data Provenance, Model Card, Dataset Split
- **来源（Sources）:** [数据集说明书](https://arxiv.org/abs/1803.09010)

<a id="deadline-propagation"></a>
### 截止时间传递（Deadline Propagation）
- **分类（Category）:** 可靠性与运维（Reliability & operations）
- **准确含义（What it actually means）:** 将剩余端到端时间预算传给下游调用，使各依赖项知道原始请求还能有意义地等待多久。
- **重要性（Why it matters）:** 相互独立的超时可能超过用户的截止时间，让结果已无用的废弃工作继续占用容量。
- **实际应用（In practice）:** 在入口设置一个请求截止时间，每次下游调用扣除已耗时间，取消过期工作，并记录哪个边界耗尽了预算。
- **常见混淆（Common confusion）:** 截止时间是绝对或剩余的完成边界；重试延迟控制下次尝试何时开始，也必须处于同一预算内。
- **相关术语（Related terms）:** Retry with Backoff, Retry Budget, Tail Latency, Service Level Objective (SLO)
- **来源（Sources）:** [gRPC 截止时间指南](https://grpc.io/docs/guides/deadlines/)

<a id="decode-phase"></a>
### 解码阶段（Decode Phase）
- **分类（Category）:** 基础设施与服务（Infrastructure & serving）
- **准确含义（What it actually means）:** 输入前缀处理完毕后，自回归推理逐步生成新词元的迭代阶段。
- **重要性（Why it matters）:** 解码在计算、内存和调度方面与预填充不同，因此单个总体延迟值可能掩盖真正的服务瓶颈。
- **实际应用（In practice）:** 分别测量词元间延迟和输出吞吐量，计入键值缓存占用，并测试活动解码与新预填充共享容量的混合工作负载。
- **常见混淆（Common confusion）:** 解码阶段不是编码器-解码器模型中的解码器组件，而是运行时的生成阶段。
- **学习课程（Learn it）:** [预填充与解码分离](../phases/17-infrastructure-and-production/17-disaggregated-prefill-decode/)
- **相关术语（Related terms）:** Prefill, Autoregressive, KV Cache, Time per Output Token (TPOT)
- **来源（Sources）:** [DistServe 论文](https://arxiv.org/abs/2401.09670)

<a id="decoder"></a>
### 解码器（Decoder）
- **分类（Category）:** 模型与推理（Models & inference）
- **常见说法（What people say）:** 模型的输出侧。
- **准确含义（What it actually means）:** 将表示映射为输出的组件。在编码器-解码器 Transformer 中，解码器通过掩码自注意力和交叉注意力生成输出；仅解码器语言模型则使用单个因果堆叠生成。
- **相关术语（Related terms）:** Encoder, Transformer, Autoregressive

<a id="decoding-strategy"></a>
### 解码策略（Decoding Strategy）
- **分类（Category）:** 模型与推理（Models & inference）
- **准确含义（What it actually means）:** 将模型连续产生的下一词元分数转换为选定词元及完整输出的算法。
- **重要性（Why it matters）:** 对于同样的原始分数，贪心选择、采样、截断和搜索可能产生不同的质量、多样性、延迟和可重复性。
- **实际应用（In practice）:** 在评估配置中定义任务的解码设置、停止规则及随机种子行为，使结果能够公平比较。
- **常见混淆（Common confusion）:** 解码改变输出的选择方式，不改变模型训练所得的参数，也不增加知识。
- **相关术语（Related terms）:** Autoregressive, Temperature, Top-k Sampling, Nucleus Sampling (Top-p)
- **来源（Sources）:** [神经文本退化的奇特现象](https://arxiv.org/abs/1904.09751)

<a id="defense-in-depth"></a>
### 纵深防御（Defense in Depth）
- **分类（Category）:** 安全与治理（Security & governance）
- **准确含义（What it actually means）:** 在多个系统边界使用相互独立的预防、检测和纠正控制，使单个控制失效不会决定最终结果。
- **重要性（Why it matters）:** AI 系统结合了概率模型、不可信内容、工具与外部服务，因此任何单个过滤器或提示词都不足以充当安全边界。
- **实际应用（In practice）:** 将指令控制与有限权限、沙箱、模式验证、重要动作审批、监测及经过测试的恢复路径配合使用。
- **常见混淆（Common confusion）:** 控制措施越多不自动意味着越好。各层应针对不同失效模式，并保持可测试，而不是重复同一个假设。
- **相关术语（Related terms）:** Guardrails, Sandbox, Least Privilege, Trust Boundary
- **来源（Sources）:** [NIST 术语表：纵深防御](https://csrc.nist.gov/glossary/term/defense_in_depth)

<a id="delegation"></a>
### 委派（Delegation）
- **分类（Category）:** 智能体与工具（Agents & tools）
- **准确含义（What it actually means）:** 将有明确边界的子任务交给另一个人或智能体，同时提供所需上下文、权限、输出契约和返回条件。
- **重要性（Why it matters）:** 显式委派支持专业分工与并行工作，同时保留责任归属、范围和整合结果的能力。
- **实际应用（In practice）:** 向审阅智能体提供确切文件、评分准则、证据及截止时间，要求它返回发现，而不是悄悄修改主要交付物。
- **常见混淆（Common confusion）:** 向另一个智能体发送模糊消息不等于可靠委派。接收方需要范围契约和明确的回交方式。
- **相关术语（Related terms）:** Scope Contract, Handoff, Reviewer Agent, Orchestration
- **来源（Sources）:** [构建有效的智能体](https://www.anthropic.com/research/building-effective-agents)

<a id="dense-retrieval"></a>
### 稠密检索（Dense Retrieval）
- **分类（Category）:** 检索与生成（Retrieval & generation）
- **准确含义（What it actually means）:** 将查询与候选项嵌入为向量表示，并通过相似度函数排序候选项的第一阶段检索。
- **重要性（Why it matters）:** 它能找出几乎不共享原词的改写和语义匹配，补充 BM25 等词法方法。
- **实际应用（In practice）:** 为领域训练或选择嵌入模型，为候选向量建立索引，并在将结果接入生成前评估检索召回率。
- **常见混淆（Common confusion）:** 稠密检索不是重排序器。它搜索整个集合，而重排序器对较小候选集重新评分。
- **相关术语（Related terms）:** Embedding, Semantic Search, BM25, Hybrid Retrieval
- **来源（Sources）:** [稠密段落检索](https://aclanthology.org/2020.emnlp-main.550/)

<a id="diffusion-model"></a>
### 扩散模型（Diffusion Model）
- **分类（Category）:** 模型与推理（Models & inference）
- **常见说法（What people say）:** 从噪声生成图像的模型。
- **准确含义（What it actually means）:** 围绕渐进加噪过程及学习到的逆过程训练的生成模型。采样通常从噪声开始，反复去噪，有时在学习到的潜在空间中进行。
- **常见混淆（Common confusion）:** 扩散是通用生成框架，并非只用于图像。
- **相关术语（Related terms）:** Latent Space, VAE (Variational Autoencoder), Inference

<a id="disaggregated-serving"></a>
### 分离式服务（Disaggregated Serving）
- **分类（Category）:** 基础设施与服务（Infrastructure & serving）
- **准确含义（What it actually means）:** 在分别配置资源的工作单元池中运行预填充与解码，并在二者之间传输所需注意力状态的服务架构。
- **重要性（Why it matters）:** 预填充和解码对硬件的压力不同，独立资源池可以针对各自瓶颈设置容量和调度，而非在同一队列中争抢资源。
- **实际应用（In practice）:** 测量状态传输成本，确保请求经过兼容的模型版本，根据各自需求信号扩缩容，并测试两个阶段之间的故障恢复。
- **常见混淆（Common confusion）:** 分离式服务分开的是运行时阶段，不是将一个模型在阶段内部拆成张量并行或流水线并行分片。
- **学习课程（Learn it）:** [预填充与解码分离](../phases/17-infrastructure-and-production/17-disaggregated-prefill-decode/)
- **相关术语（Related terms）:** Prefill, Decode Phase, Model Serving, Goodput
- **来源（Sources）:** [DistServe 论文](https://arxiv.org/abs/2401.09670)

<a id="distribution-shift"></a>
### 分布偏移（Distribution Shift）
- **分类（Category）:** 评估与安全（Evaluation & safety）
- **准确含义（What it actually means）:** 构建或评估系统时使用的数据分布，与部署后遇到的数据分布之间的差异。
- **重要性（Why it matters）:** 模型可能通过留出测试，却在用户、任务、语言、工具或运行条件变化时失败。
- **实际应用（In practice）:** 定义预期部署切片，按切片监测性能和输入特征，并将新失败纳入版本化评估集。
- **常见混淆（Common confusion）:** 分布偏移不总是模型漂移。模型可能没变，变化的是环境或用户群体。
- **相关术语（Related terms）:** Dataset Split, Eval Set, Overfitting, Model Card
- **来源（Sources）:** [WILDS 论文](https://proceedings.mlr.press/v139/koh21a.html)

<a id="dpo-direct-preference-optimization"></a>
### 直接偏好优化（DPO (Direct Preference Optimization)）
- **分类（Category）:** 数学与训练（Math & training）
- **常见说法（What people say）:** 不需要单独奖励模型阶段的偏好训练。
- **准确含义（What it actually means）:** 相对于参考策略，直接使用偏好与被拒绝的回答对训练策略的偏好优化目标。它避免在这一阶段运行显式奖励模型和强化学习循环。
- **常见混淆（Common confusion）:** DPO 仍依赖偏好数据的质量与覆盖范围，不会消除评估需求或对齐风险。
- **学习课程（Learn it）:** [直接偏好优化](../phases/10-llms-from-scratch/08-dpo/)
- **来源（Sources）:** [直接偏好优化论文](https://arxiv.org/abs/2305.18290)
- **相关术语（Related terms）:** RLHF (Reinforcement Learning from Human Feedback), SFT (Supervised Fine-Tuning), Alignment

<a id="dropout"></a>
### 随机失活（Dropout）
- **分类（Category）:** 数学与训练（Math & training）
- **常见说法（What people say）:** 随机关闭激活值。
- **准确含义（What it actually means）:** 训练时随机将一部分激活值置零，鼓励网络不要依赖某一条激活路径。标准推理通常关闭它，但蒙特卡洛随机失活会有意保留，以估计不确定性。
- **相关术语（Related terms）:** Overfitting, Weight Decay, Activation Function

<a id="durable-execution"></a>
### 持久执行（Durable Execution）
- **分类（Category）:** 智能体与工具（Agents & tools）
- **准确含义（What it actually means）:** 以能跨进程崩溃、重启或长时间等待保留状态和已完成步骤的方式运行工作流，并避免重复已确认的副作用。
- **重要性（Why it matters）:** 智能体任务往往跨越模型调用、工具、审批和外部系统。临时进程不应成为进度的唯一记录。
- **实际应用（In practice）:** 持久化每次工作流状态转换，对外部写入使用幂等键，并在工作单元重启后从最新检查点恢复。
- **常见混淆（Common confusion）:** 持久执行不会自动让每个操作安全。副作用仍需要幂等与补偿规则。
- **相关术语（Related terms）:** Checkpoint, Agent State, Idempotency, Approval Gate

<a id="dynamic-batching"></a>
### 动态批处理（Dynamic Batching）
- **分类（Category）:** 基础设施与服务（Infrastructure & serving）
- **准确含义（What it actually means）:** 根据兼容形状、最大大小、优先级和允许的排队延迟，从队列请求中组成推理批次的运行时策略。
- **重要性（Why it matters）:** 合并请求可以提高硬件利用率，但流量稀疏或请求差异很大时，等待组成批次可能恶化延迟。
- **实际应用（In practice）:** 根据实测延迟目标设置排队延迟和批次限制，分离形状不兼容的请求，并在真实到达速率下比较吞吐量与尾延迟。
- **常见混淆（Common confusion）:** 动态批处理从排队工作中组批；连续批处理则在自回归生成已进行时改变批次成员。
- **学习课程（Learn it）:** [vLLM 服务内部机制](../phases/17-infrastructure-and-production/04-vllm-serving-internals/)
- **相关术语（Related terms）:** Admission Control, Continuous Batching, Saturation, Tail Latency
- **来源（Sources）:** [NVIDIA Triton：模型与调度器](https://docs.nvidia.com/deeplearning/triton-inference-server/user-guide/docs/user_guide/model_configuration.html#scheduling-and-batching)

## E

<a id="early-fusion"></a>
### 早期融合（Early Fusion）
- **分类（Category）:** 多模态系统（Multimodal systems）
- **准确含义（What it actually means）:** 在大部分任务专用建模发生之前，组合多个模态的原始或低层表示。
- **重要性（Why it matters）:** 早期交互能揭示细粒度跨模态关系，但也需要兼容表示，并谨慎处理对齐和缺失输入。
- **实际应用（In practice）:** 将各模态转换为明确的词元或特征表示，保留来源和位置标记，在共享骨干网络之前融合，并与单模态及晚期融合基线比较。
- **常见混淆（Common confusion）:** 早期融合描述各信息流在架构中的汇合位置，不保证模型会学到有用的跨流对齐。
- **学习课程（Learn it）:** [Chameleon 早期融合词元](../phases/12-multimodal-ai/11-chameleon-early-fusion-tokens/)
- **相关术语（Related terms）:** Late Fusion, Multimodal Fusion, Modality Alignment, Token
- **来源（Sources）:** [Chameleon：混合模态早期融合基础模型](https://arxiv.org/abs/2405.09818); [多模态机器学习：综述与分类体系](https://arxiv.org/abs/1705.09406)

<a id="eigenvalue"></a>
### 特征值（Eigenvalue）
- **分类（Category）:** 数学与训练（Math & training）
- **常见说法（What people say）:** 主成分分析中用到的矩阵性质。
- **准确含义（What it actually means）:** 描述线性变换如何缩放对应非零特征向量、而不改变其方向的标量。在基于协方差矩阵的主成分分析中，更大的特征值对应方差更大的方向。
- **相关术语（Related terms）:** Tensor, Feature, Latent Space

<a id="embedding"></a>
### 嵌入（Embedding）
- **分类（Category）:** 数据与表示（Data & representations）
- **常见说法（What people say）:** 表示含义的向量。
- **准确含义（What it actually means）:** 将离散项，例如单词、图像和用户，映射到连续空间中稠密向量的学习所得映射，使相似项最终彼此接近。
- **常见混淆（Common confusion）:** 相似性取决于模型、训练目标和度量。一种嵌入空间中的距离不能直接套用到另一种空间。
- **名称由来（Why it's called that）:** 这些项被放置，也就是“嵌入”到一个几何表示空间中。
- **学习课程（Learn it）:** [嵌入](../phases/11-llm-engineering/04-embeddings/)
- **相关术语（Related terms）:** Cosine Similarity, Semantic Search, Vector Database

<a id="encoder"></a>
### 编码器（Encoder）
- **分类（Category）:** 模型与推理（Models & inference）
- **常见说法（What people say）:** 模型的输入侧。
- **准确含义（What it actually means）:** 将输入转换为表示的组件。Transformer 编码器通常使用非因果自注意力，在所用掩码的约束下，让各位置整合整个输入的上下文。
- **常见混淆（Common confusion）:** 仅编码器模型虽通常不用于自回归文本生成，仍可通过任务头产生输出。
- **相关术语（Related terms）:** Decoder, Transformer, Embedding

<a id="epoch"></a>
### 训练轮次（Epoch）
- **分类（Category）:** 数学与训练（Math & training）
- **常见说法（What people say）:** 遍历训练数据一次。
- **准确含义（What it actually means）:** 遍历一遍所定义的训练数据集。在分布式或采样训练中，一个轮次的具体实现取决于数据加载器和采样策略。
- **常见混淆（Common confusion）:** 更多轮次不保证更好的泛化，应在留出数据上评估。
- **相关术语（Related terms）:** Batch Size, Overfitting, Eval Set

<a id="error-budget"></a>
### 错误预算（Error Budget）
- **分类（Category）:** 可靠性与运维（Reliability & operations）
- **准确含义（What it actually means）:** 服务级别目标在其度量窗口内允许的失败服务量，超过该量就耗尽目标允许的预算。
- **重要性（Why it matters）:** 它为可靠性与产品工作提供共同决策边界：团队可以用剩余预算推进变更，但当用户可见失败消耗预算时应放缓风险活动。
- **实际应用（In practice）:** 从服务级别目标推导预算，按原因和用户群体跟踪消耗，在耗尽前明确发布应对动作，并避免事件后重置统计。
- **常见混淆（Common confusion）:** 错误预算不是主动制造事故的配额，而是由面向用户的可靠性目标推导出的运行策略。
- **相关术语（Related terms）:** Service Level Objective (SLO), Service Level Indicator (SLI), Availability, Incident Response
- **来源（Sources）:** [Google SRE 工作手册：错误预算策略](https://sre.google/workbook/error-budget-policy/)

<a id="eval-set"></a>
### 评估集（Eval Set）
- **分类（Category）:** 评估与安全（Evaluation & safety）
- **别名（Aliases）:** Evaluation set
- **准确含义（What it actually means）:** 包含输入、期望属性、评分规则和元数据的版本化集合，用于度量 AI 系统的特定能力或风险。
- **重要性（Why it matters）:** 可重复使用的数据集能将模糊的质量声明转化为可比较证据，并在提示词、模型、工具或检索变化后发现回归。
- **实际应用（In practice）:** 将有代表性的支持问题、对抗指令、预期引用和失败标签放在经审阅的数据集中，与开发示例分开。
- **常见混淆（Common confusion）:** 开发评估指导迭代；最终留出测试在选择确定后估计性能；标准化基准则支持在共同协议下比较。针对任何留出集反复调优，都会泄漏测试信息并夸大结果。
- **学习课程（Learn it）:** [评估驱动的智能体开发](../phases/14-agent-engineering/30-eval-driven-agent-development/)
- **相关术语（Related terms）:** Evaluation (Eval), Regression Test, LLM-as-a-Judge, Verification Gate

<a id="evaluation-eval"></a>
### 评估（Evaluation (Eval)）
- **分类（Category）:** 评估与安全（Evaluation & safety）
- **别名（Aliases）:** Eval
- **准确含义（What it actually means）:** 使用明确的成功标准、数据、评分器及审阅流程，在代表性任务上度量模型或系统行为的既定过程。
- **重要性（Why it matters）:** 如果成功只是观看几个演示后的主观印象，就无法改进可靠性。
- **实际应用（In practice）:** 在改变检索前后运行相同客服场景，评估正确性及引用支撑程度，并按类别检查失败。
- **常见混淆（Common confusion）:** 基准分数只是一个评估结果，不能完整说明生产质量。
- **学习课程（Learn it）:** [大语言模型评估](../phases/11-llm-engineering/10-evaluation/)
- **相关术语（Related terms）:** Eval Set, LLM-as-a-Judge, Cost per Successful Task, Regression Test

<a id="exact-match-em"></a>
### 完全匹配（Exact Match (EM)）
- **分类（Category）:** 评估与安全（Evaluation & safety）
- **准确含义（What it actually means）:** 只有输出的规范化表示与某个获认可的参考答案完全一致时，才计为正确的指标。
- **重要性（Why it matters）:** 对于只有一个标准答案的任务，它具有确定性且易于审计，但不提供部分得分。
- **实际应用（In practice）:** 评估前定义规范化规则及全部可接受参考答案；允许多种有效输出时，结合任务专用检查使用完全匹配。
- **常见混淆（Common confusion）:** 完全匹配得分低可能只是无害的格式差异；而字符串即使匹配，在上下文中仍可能缺乏依据或不安全。
- **相关术语（Related terms）:** ROUGE, Eval Set, Structured Output, Pass@k
- **来源（Sources）:** [SQuAD 数据集论文](https://aclanthology.org/D16-1264/)

<a id="expert-parallelism"></a>
### 专家并行（Expert Parallelism）
- **分类（Category）:** 基础设施与服务（Infrastructure & serving）
- **准确含义（What it actually means）:** 将混合专家子网络分布在多个设备上，并将每个词元的激活路由到承载其选中专家的设备。
- **重要性（Why it matters）:** 稀疏专家无需对每个词元执行所有专家即可增大模型容量，但路由会引入通信、负载均衡和放置约束。
- **实际应用（In practice）:** 按专家测量词元分布，配置通信带宽，有意识地限制或转移溢出负载，并测试流量导致专家需求不均时的质量。
- **常见混淆（Common confusion）:** 专家并行划分路由器所选的专家；张量并行划分层内部的张量运算。
- **学习课程（Learn it）:** [混合专家](../phases/07-transformers-deep-dive/11-mixture-of-experts/)
- **相关术语（Related terms）:** MoE (Mixture of Experts), Tensor Parallelism, Pipeline Parallelism, Model Serving
- **来源（Sources）:** [GShard 论文](https://arxiv.org/abs/2006.16668)

## F

<a id="feature"></a>
### 特征（Feature）
- **分类（Category）:** 数据与表示（Data & representations）
- **常见说法（What people say）:** 数据集中的一列。
- **准确含义（What it actually means）:** 数据的一项可测量属性。在经典机器学习中，特征通常手工设计；在深度学习中，网络从原始数据自动学习特征。
- **常见混淆（Common confusion）:** 一列存储数据可能包含多个有用特征，学习到的表示也可能包含难以赋予简单人类标签的特征。
- **相关术语（Related terms）:** Embedding, Latent Space, Inductive Bias

<a id="few-shot"></a>
### 少样本（Few-Shot）
- **分类（Category）:** 提示词与上下文（Prompting & context）
- **常见说法（What people say）:** 在提示词中给模型几个示例。
- **准确含义（What it actually means）:** 一种上下文学习，在目标输入之前加入少量示范，让模型推断期望任务、格式或决策边界。
- **重要性（Why it matters）:** 示例质量与覆盖范围比某个通用示例数量更重要。质量差或互相矛盾的示范可能降低可靠性。
- **相关术语（Related terms）:** Zero-Shot, In-Context Learning, Prompt Engineering, Context Window

<a id="fine-tuning"></a>
### 微调（Fine-tuning）
- **分类（Category）:** 数学与训练（Math & training）
- **常见说法（What people say）:** 用你的数据训练模型。
- **准确含义（What it actually means）:** 从预训练参数出发，在更窄的数据集或目标上继续训练。根据方法不同，可以更新全部参数、选定参数或新增适配器参数。
- **重要性（Why it matters）:** 微调能调整行为、风格、格式或任务表现，但当事实必须保持最新或可追溯时，它不能可靠地替代检索。
- **常见混淆（Common confusion）:** 微调会影响模型编码的知识，但不是简单地向模型内部的可搜索数据库追加记录。
- **学习课程（Learn it）:** [微调与低秩适配](../phases/11-llm-engineering/08-fine-tuning-lora/)
- **相关术语（Related terms）:** SFT (Supervised Fine-Tuning), LoRA (Low-Rank Adaptation), QLoRA, RAG (Retrieval-Augmented Generation)

<a id="flaky-test"></a>
### 不稳定测试（Flaky Test）
- **分类（Category）:** AI 原生开发（AI-native development）
- **准确含义（What it actually means）:** 在代码或预期测试环境未发生相关变化的等价运行中，可能时而通过、时而失败的测试。
- **重要性（Why it matters）:** 不稳定性削弱验证门禁，还可能让人或智能体习惯于忽略真实失败，或不断重试直到得到虚假的通过结果。
- **实际应用（In practice）:** 保留失败的随机种子和环境；仅在有负责人和截止日期时隔离测试，然后修复失控的时间、并发、网络、顺序或共享状态依赖。
- **常见混淆（Common confusion）:** 稳定地暴露间歇性产品缺陷的测试是有价值的证据，不一定属于不稳定测试。
- **相关术语（Related terms）:** Regression Test, Test Oracle, Retry with Backoff, Verification Gate
- **来源（Sources）:** [消除测试的不稳定性](https://conferences.computer.org/icsme/pdfs/ICSME2020-1oOutvkGTwF4GyVvNtr3Mm/561900a736/561900a736.pdf)

<a id="flashattention"></a>
### 高效精确注意力算法（FlashAttention）
- **分类（Category）:** 基础设施与服务（Infrastructure & serving）
- **准确含义（What it actually means）:** 一种精确注意力算法，通过分块计算减少加速器内存层级间的数据传输，并避免在高带宽内存中显式存储完整注意力矩阵。
- **重要性（Why it matters）:** 注意力的瓶颈可能是数据移动而非算术运算，长序列尤其如此，因此感知输入输出开销的内核能提高实际速度和内存效率。
- **实际应用（In practice）:** 使用支持模型形状、掩码、数据类型及硬件的内核，验证数值容差，并测量端到端延迟，而不是将论文结果当作固定加速倍数。
- **常见混淆（Common confusion）:** FlashAttention 改变注意力的计算方式，不改变其目标数学结果。它与键值缓存、量化是不同技术。
- **学习课程（Learn it）:** [键值缓存与 Flash Attention](../phases/07-transformers-deep-dive/12-kv-cache-flash-attention/)
- **相关术语（Related terms）:** Attention, Self-Attention, KV Cache, Mixed Precision
- **来源（Sources）:** [FlashAttention 论文](https://arxiv.org/abs/2205.14135)

<a id="function-calling"></a>
### 函数调用（Function Calling）
- **分类（Category）:** 智能体与工具（Agents & tools）
- **常见说法（What people say）:** 模型使用工具。
- **准确含义（What it actually means）:** 由提供方或应用提供的接口，模型通过它输出包含工具名和参数的结构化请求。应用代码验证请求、执行操作，并可将结果返回给下一步模型调用。
- **常见混淆（Common confusion）:** 模型只是请求函数调用；是否执行、如何执行由受信代码决定。单独的函数调用不构成完整智能体。
- **学习课程（Learn it）:** [函数调用](../phases/11-llm-engineering/09-function-calling/)
- **相关术语（Related terms）:** Structured Output, Tool Contract, Agent, MCP (Model Context Protocol)

## G

<a id="gan-generative-adversarial-network"></a>
### 生成对抗网络（GAN (Generative Adversarial Network)）
- **分类（Category）:** 模型与推理（Models & inference）
- **常见说法（What people say）:** 训练时相互竞争的两个神经网络。
- **准确含义（What it actually means）:** 生成器网络试图创造逼真数据，判别器网络则试图区分真实与伪造。二者共同训练：生成器更善于欺骗判别器，判别器更善于识别伪造。
- **相关术语（Related terms）:** Loss Function, Latent Space, Diffusion Model

<a id="goodput"></a>
### 有效吞吐量（Goodput）
- **分类（Category）:** 基础设施与服务（Infrastructure & serving）
- **准确含义（What it actually means）:** 在明确工作负载下，完成且满足既定服务约束的请求速率，例如同时满足首词元时间与每词元延迟目标。
- **重要性（Why it matters）:** 原始吞吐量可能上升，用户却遇到更多慢请求。有效吞吐量只统计符合服务契约的工作。
- **实际应用（In practice）:** 明确请求分布和延迟阈值，只统计合规完成项，在总体速率旁报告分位数，并避免比较目标不同的系统。
- **常见混淆（Common confusion）:** 有效吞吐量不是全部已完成吞吐量，也不是模型的通用属性；它取决于工作负载和成功阈值。
- **学习课程（Learn it）:** [推理指标与有效吞吐量](../phases/17-infrastructure-and-production/08-inference-metrics-goodput/)
- **相关术语（Related terms）:** Service Level Objective (SLO), Time to First Token (TTFT), Time per Output Token (TPOT), Cost per Successful Task
- **来源（Sources）:** [DistServe 论文](https://arxiv.org/abs/2401.09670)

<a id="gpt"></a>
### 生成式预训练变换器（GPT）
- **分类（Category）:** 模型与推理（Models & inference）
- **常见说法（What people say）:** 任何聊天机器人的泛称。
- **准确含义（What it actually means）:** 即生成式预训练 Transformer（Generative Pre-trained Transformer），指一类先通过序列预测目标预训练、再适配下游用途的生成式 Transformer 模型。产品名称与模型架构不应混为一谈。
- **名称由来（Why it's called that）:** “生成式”描述产生输出，“预训练”描述最初的广泛训练阶段，“Transformer”标识其架构家族。
- **相关术语（Related terms）:** Transformer, Autoregressive, LLM (Large Language Model)

<a id="graceful-degradation"></a>
### 平稳降级（Graceful Degradation）
- **分类（Category）:** 可靠性与运维（Reliability & operations）
- **准确含义（What it actually means）:** 当容量或依赖项受损时，降低可选质量、功能、时效性或工作负载，以保留有限的核心服务，而不是让所有请求失败。
- **重要性（Why it matters）:** AI 系统经常依赖多个缓慢或可能失败的组件，因此明确的降级模式能在部分故障时保护关键用户成果。
- **实际应用（In practice）:** 预先定义可关闭的能力，让运维人员能看到降级模式，保护安全检查，在依赖故障下测试回退方案，并有计划地恢复完整服务。若正确性、安全性、时效性或承诺的契约有重大变化，应告知用户。
- **常见混淆（Common confusion）:** 平稳降级不是悄悄返回更差答案并假装无事发生。运维人员始终需要可见性；降级实质影响结果或服务契约时，用户也需要知情。
- **学习课程（Learn it）:** [生产级大语言模型应用](../phases/11-llm-engineering/13-production-app/)
- **相关术语（Related terms）:** Circuit Breaker, Load Shedding, Model Router, Availability
- **来源（Sources）:** [Google SRE：应对级联故障](https://sre.google/sre-book/addressing-cascading-failures/)

<a id="gradient"></a>
### 梯度（Gradient）
- **分类（Category）:** 数学与训练（Math & training）
- **常见说法（What people say）:** 损失的斜率。
- **准确含义（What it actually means）:** 由偏导数组成、指向增长最快方向的向量。在机器学习中，沿梯度反方向移动，即梯度下降，以最小化损失。
- **常见混淆（Common confusion）:** 优化器可以变换、平均、裁剪或自适应调整梯度，而不是简单沿负梯度走一步。
- **相关术语（Related terms）:** Backpropagation, Gradient Descent, Optimizer

<a id="gradient-accumulation"></a>
### 梯度累积（Gradient Accumulation）
- **分类（Category）:** 数学与训练（Math & training）
- **准确含义（What it actually means）:** 在一次优化器更新前，对多个微批次的梯度求和或取平均。
- **重要性（Why it matters）:** 当单个设备无法同时容纳所有样本与激活时，它能近似实现更大的有效批次。
- **实际应用（In practice）:** 一致地缩放损失，仅在达到选定微批次数后调用优化器，并测量归一化或分布式同步是否改变行为。
- **常见混淆（Common confusion）:** 梯度累积减少每步激活内存，但不能复现整批样本同时处理的所有性质。
- **相关术语（Related terms）:** Batch Size, Mixed Precision, Optimizer, Backpropagation
- **来源（Sources）:** [PyTorch 自动混合精度示例：梯度累积](https://docs.pytorch.org/docs/stable/notes/amp_examples.html#gradient-accumulation)

<a id="gradient-clipping"></a>
### 梯度裁剪（Gradient Clipping）
- **分类（Category）:** 数学与训练（Math & training）
- **准确含义（What it actually means）:** 在优化器更新前，当梯度值或其整体范数超过阈值时加以限制。
- **重要性（Why it matters）:** 它可防止异常大的梯度破坏某个训练步骤的稳定性，产生非有限数值。
- **实际应用（In practice）:** 记录裁剪前范数，在混合精度梯度反缩放后裁剪，并调查反复发生的裁剪，而不是用裁剪代替不稳定性诊断。
- **常见混淆（Common confusion）:** 裁剪控制更新幅度，不能修复无效数据、错误损失函数或持续不合适的学习率。
- **相关术语（Related terms）:** Gradient, NaN (Not a Number), Mixed Precision, Learning Rate
- **来源（Sources）:** [训练循环神经网络的困难](https://arxiv.org/abs/1211.5063)

<a id="gradient-descent"></a>
### 梯度下降（Gradient Descent）
- **分类（Category）:** 数学与训练（Math & training）
- **常见说法（What people say）:** 沿损失曲面下坡。
- **准确含义（What it actually means）:** 利用目标函数负梯度移动参数的一类优化更新方法，梯度通常由批次估计，而非整个数据集。
- **相关术语（Related terms）:** Gradient, Learning Rate, Optimizer

<a id="grounding"></a>
### 依据关联（Grounding）
- **分类（Category）:** 检索与生成（Retrieval & generation）
- **准确含义（What it actually means）:** 将生成答案或动作与系统能够识别并检查的证据、状态或观测联系起来。
- **重要性（Why it matters）:** 依据关联让系统拥有超出无约束生成的依据，也更容易发现无支持的断言。
- **实际应用（In practice）:** 检索政策章节，要求答案引用它，并拒绝引用段落不支持的断言。
- **常见混淆（Common confusion）:** 将文档加入提示词只是创造依据关联的机会，不保证模型会正确使用。
- **学习课程（Learn it）:** [检索增强生成](../phases/11-llm-engineering/06-rag/)
- **相关术语（Related terms）:** RAG (Retrieval-Augmented Generation), Hallucination, Verification Gate, Reranker

<a id="guardrails"></a>
### 防护机制（Guardrails）
- **分类（Category）:** 评估与安全（Evaluation & safety）
- **常见说法（What people say）:** 围绕模型的安全过滤器。
- **准确含义（What it actually means）:** 约束输入、工具使用、输出、权限和升级处理的系统控制，可包括模式、策略检查、分类器、允许列表、沙箱、审批和动作后验证。
- **重要性（Why it matters）:** 没有单一过滤器覆盖所有失效模式，因此应按风险分层设置控制。
- **常见混淆（Common confusion）:** 防护机制降低风险，不证明 AI 系统安全。
- **学习课程（Learn it）:** [防护机制](../phases/11-llm-engineering/12-guardrails/)
- **相关术语（Related terms）:** Least Privilege, Approval Gate, Sandbox, Evaluation (Eval)

## H

<a id="hallucination"></a>
### 幻觉（Hallucination）
- **分类（Category）:** 评估与安全（Evaluation & safety）
- **常见说法（What people say）:** 模型在撒谎。
- **准确含义（What it actually means）:** 生成的内容错误、缺乏现有证据支持，或与任务的权威事实来源不一致。即使输出流畅且模型并未试图欺骗，也可能产生幻觉。
- **重要性（Why it matters）:** 通常无法检查某个陈述是否曾出现在训练数据中，因此生产检查应关注依据支持、正确性与可追溯性。
- **实际应用（In practice）:** 要求事实性回答引用证据，并评估每条引用是否真正支持对应断言。
- **常见混淆（Common confusion）:** 幻觉属于输出质量失败，不是对模型意图的诊断。
- **相关术语（Related terms）:** Grounding, RAG (Retrieval-Augmented Generation), Verification Gate

<a id="handoff"></a>
### 交接（Handoff）
- **分类（Category）:** AI 原生开发（AI-native development）
- **准确含义（What it actually means）:** 在人或智能体之间结构化转移任务，保留目标、当前状态、证据、决策、约束和剩余工作。
- **重要性（Why it matters）:** 良好的交接可避免下一位执行者从冗长记录中重建整个任务，或重复已完成动作。
- **实际应用（In practice）:** 用精简任务包传递已接受计划、变更文件、测试命令与结果、未解决风险和确切下一步动作。
- **常见混淆（Common confusion）:** 摘要说明发生了什么；交接还说明哪些状态具有权威性，以及下一步应做什么。
- **学习课程（Learn it）:** [多会话交接](../phases/14-agent-engineering/40-multi-session-handoff/)
- **相关术语（Related terms）:** Agent State, Checkpoint, Scope Contract, Progressive Disclosure

<a id="hnsw"></a>
### 分层可导航小世界（HNSW）
- **分类（Category）:** 检索与生成（Retrieval & generation）
- **别名（Aliases）:** Hierarchical Navigable Small World
- **准确含义（What it actually means）:** 将向量组织为分层邻近图，并从粗粒度上层搜索到精细下层的近似最近邻索引。
- **重要性（Why it matters）:** 当穷举比较过慢时，它是实现大规模高召回向量搜索的常见方法。
- **实际应用（In practice）:** 按延迟、内存和 Recall@K 目标调优构建与查询参数，嵌入版本改变时重建索引。
- **常见混淆（Common confusion）:** HNSW 是索引算法，不是相似度度量、嵌入模型或完整向量数据库。
- **相关术语（Related terms）:** Approximate Nearest Neighbor (ANN), Vector Database, Embedding, Recall@K
- **来源（Sources）:** [使用 HNSW 进行高效且稳健的近似最近邻搜索](https://dl.acm.org/doi/10.1109/TPAMI.2018.2889473)

<a id="human-in-the-loop-hitl"></a>
### 人在回路（Human-in-the-Loop (HITL)）
- **分类（Category）:** 智能体与工具（Agents & tools）
- **别名（Aliases）:** Human oversight, human review
- **准确含义（What it actually means）:** 在 AI 驱动流程的明确节点，由人提供判断、纠正、批准或升级处理的工作流设计。
- **重要性（Why it matters）:** 人工参与最适合高影响、含糊或不可逆的边界，而不是每一步之后都设置一个未定义的兜底。
- **实际应用（In practice）:** 让智能体自动分类常规请求，但将不确定或高价值案例连同证据和建议动作一起交给审阅者。
- **常见混淆（Common confusion）:** 人在回路不会自动让系统安全。审阅者需要时间、上下文、权限和明确决策标准。
- **相关术语（Related terms）:** Approval Gate, Verification Gate, Agent, Guardrails

<a id="hybrid-retrieval"></a>
### 混合检索（Hybrid Retrieval）
- **分类（Category）:** 检索与生成（Retrieval & generation）
- **准确含义（What it actually means）:** 融合不同方法的信号，通常是词法匹配与稠密向量相似度，再合并或重排结果的检索方式。
- **重要性（Why it matters）:** 精确标识符、罕见术语和语义改写的表现不同，因此单一检索信号可能遗漏有用证据。
- **实际应用（In practice）:** 同时使用 BM25 式关键词搜索和嵌入检索候选项，融合排名，再针对用户查询重排合并后的集合。
- **常见混淆（Common confusion）:** 混合检索组合候选信号；重排序器则对已检索候选项应用第二个相关性模型。
- **学习课程（Learn it）:** [高级检索增强生成](../phases/11-llm-engineering/07-advanced-rag/)
- **相关术语（Related terms）:** Semantic Search, Reranker, RAG (Retrieval-Augmented Generation), Embedding

<a id="hyperparameter"></a>
### 超参数（Hyperparameter）
- **分类（Category）:** 数学与训练（Math & training）
- **常见说法（What people say）:** 需要调优的设置。
- **准确含义（What it actually means）:** 影响模型结构、优化、数据处理或推理的配置选择，而不是作为普通模型参数学习所得的值。例如学习率、批大小、层数和解码设置。
- **常见混淆（Common confusion）:** 有些超参数在训练前选定，有些可在调度过程中或推理时改变。
- **相关术语（Related terms）:** Parameter, Learning Rate, Batch Size, Temperature

## I

<a id="idempotency"></a>
### 幂等性（Idempotency）
- **分类（Category）:** AI 原生开发（AI-native development）
- **准确含义（What it actually means）:** 以相同身份重复同一操作，不会产生超出首次成功应用之外的额外副作用的性质。
- **重要性（Why it matters）:** 分布式智能体系统中的重试很常见。没有幂等性，一次不确定响应就可能造成重复付款、评论、部署或记录。
- **实际应用（In practice）:** 为工具请求附加幂等键，并持久保存完成结果，让重试返回该结果，而不是再次执行写入。
- **常见混淆（Common confusion）:** 幂等性不意味着每次响应逐字节相同，而是预期状态变化不会重复发生。
- **来源（Sources）:** [HTTP 语义：幂等方法](https://www.rfc-editor.org/rfc/rfc9110.html#name-idempotent-methods)
- **相关术语（Related terms）:** Retry with Backoff, Durable Execution, Checkpoint

<a id="image-token"></a>
### 图像词元（Image Token）
- **分类（Category）:** 多模态系统（Multimodal systems）
- **准确含义（What it actually means）:** 模型特有的视觉单元，以向量或离散编码表示，通常由图像块、区域或学习到的视觉码本条目产生。
- **重要性（Why it matters）:** 将视觉输入转化为序列，使 Transformer 类组件能将图像与文本或其他词元化模态一起处理。
- **实际应用（In practice）:** 记录词元是连续图像块还是离散编码，保留空间位置，测试分辨率和宽高比变化，并把视觉词元计入模型输入预算。
- **常见混淆（Common confusion）:** 图像词元不一定是一个像素、一个物体或固定物理区域，其范围由视觉编码器或分词器决定。
- **学习课程（Learn it）:** [视觉语言模型](../phases/04-computer-vision/25-vision-language-models/)
- **相关术语（Related terms）:** Patch Embedding, Token, VAE (Variational Autoencoder), Vision Transformer (ViT)
- **来源（Sources）:** [视觉 Transformer](https://arxiv.org/abs/2010.11929); [向量量化变分自编码器论文](https://arxiv.org/abs/1711.00937)

<a id="in-context-learning"></a>
### 上下文学习（In-Context Learning）
- **分类（Category）:** 提示词与上下文（Prompting & context）
- **准确含义（What it actually means）:** 模型根据当前输入提供的指令、示例或模式调整行为，而不进行普通参数更新。
- **重要性（Why it matters）:** 它解释了一个预训练模型如何在权重不变的情况下，凭上下文执行新任务。
- **实际应用（In practice）:** 在目标输入前放置代表性示范，测试顺序和格式变体，并将评估样本与示范分开。
- **常见混淆（Common confusion）:** 上下文学习是临时条件化，不是微调、持久记忆，也不证明模型推断出了预期规则。
- **相关术语（Related terms）:** Few-Shot, Zero-Shot, Context Window, Prompt Engineering
- **来源（Sources）:** [语言模型是少样本学习者](https://arxiv.org/abs/2005.14165)

<a id="incident-response"></a>
### 事件响应（Incident Response）
- **分类（Category）:** 可靠性与运维（Reliability & operations）
- **准确含义（What it actually means）:** 针对威胁服务、数据、功能安全或信息安全的事件，协调开展检测、分析、遏制、恢复、沟通和复盘学习的过程。
- **重要性（Why it matters）:** 事件发生时，清晰角色和证据比临时个人救火更重要，尤其当模型行为和分布式依赖掩盖故障边界时。
- **实际应用（In practice）:** 定义严重程度与指挥角色，保留追踪和审计记录，停止有害动作，沟通影响，验证恢复，并跟踪纠正工作直至完成。
- **常见混淆（Common confusion）:** 事件响应处理事件及其后果。即时服务恢复后，根因分析和长期预防仍要继续。
- **学习课程（Learn it）:** [面向 AI 的站点可靠性工程](../phases/17-infrastructure-and-production/23-sre-for-ai/)
- **相关术语（Related terms）:** Observability, Audit Log, Postmortem, Availability
- **来源（Sources）:** [Google SRE：事件管理](https://sre.google/sre-book/managing-incidents/); [NIST SP 800-61 第 3 修订版](https://csrc.nist.gov/pubs/sp/800/61/r3/final)

<a id="indirect-prompt-injection"></a>
### 间接提示词注入（Indirect Prompt Injection）
- **分类（Category）:** 安全与治理（Security & governance）
- **准确含义（What it actually means）:** 通过系统检索或观察到的内容传递的提示词注入攻击，例如网页、文档、邮件、图像文字或工具结果，而非直接来自用户指令。
- **重要性（Why it matters）:** 智能体执行获授权任务时，可能遇到攻击者控制的指令，并误把内容当作具有权威性的指导。
- **实际应用（In practice）:** 将外部内容标为不可信数据，与指令分离，尽量缩小工具权限，重要动作要求审批，并在回归测试中加入恶意检索内容。
- **常见混淆（Common confusion）:** “间接”描述传递路径，不代表攻击更弱。检索内容中的隐藏指令可能与直接用户提示同样具有重大后果。
- **学习课程（Learn it）:** [间接提示词注入](../phases/18-ethics-safety-alignment/15-indirect-prompt-injection/)
- **相关术语（Related terms）:** Prompt Injection, Instruction Hierarchy, Trust Boundary, Data Exfiltration
- **来源（Sources）:** [利用间接提示词注入攻陷现实中的大语言模型集成应用](https://arxiv.org/abs/2302.12173)

<a id="inductive-bias"></a>
### 归纳偏置（Inductive Bias）
- **分类（Category）:** 模型与推理（Models & inference）
- **常见说法（What people say）:** 内置于学习系统的假设。
- **准确含义（What it actually means）:** 偏向某些函数或表示而非其他函数或表示的结构性或统计假设。卷积偏向局部性与共享滤波器；因果掩码偏向从前序位置预测。
- **常见混淆（Common confusion）:** Transformer 仍通过分词、位置处理、掩码、架构、数据和目标函数具有归纳偏置。
- **相关术语（Related terms）:** CNN (Convolutional Neural Network), Transformer, Feature

<a id="inference"></a>
### 推理（Inference）
- **分类（Category）:** 模型与推理（Models & inference）
- **常见说法（What people say）:** 运行训练好的模型。
- **准确含义（What it actually means）:** 执行训练好的模型以产生预测、分数、嵌入或生成词元，而不对参数进行普通训练更新。
- **常见混淆（Common confusion）:** 推理期间模型权重虽不变，应用仍可更新缓存、对话状态或外部记忆。
- **相关术语（Related terms）:** Autoregressive, Streaming, KV Cache

<a id="instruction-following"></a>
### 指令遵循（Instruction Following）
- **分类（Category）:** 提示词与上下文（Prompting & context）
- **准确含义（What it actually means）:** 模型将自然语言要求与提供的上下文映射为满足指定任务和约束的行为的能力。
- **重要性（Why it matters）:** 语言生成可以很流畅，却未遵循用户要求的操作、格式、边界或优先级。
- **实际应用（In practice）:** 使用冲突约束、格式要求、无关上下文及拒答案例，将指令遵循与答案质量分开评估。
- **常见混淆（Common confusion）:** 指令遵循不等于事实正确性、对齐，也不是服从所有看似指令的字符串。
- **相关术语（Related terms）:** SFT (Supervised Fine-Tuning), Prompt Engineering, Instruction Hierarchy, Alignment
- **来源（Sources）:** [微调后的语言模型是零样本学习者](https://arxiv.org/abs/2109.01652)

<a id="instruction-hierarchy"></a>
### 指令层级（Instruction Hierarchy）
- **分类（Category）:** 提示词与上下文（Prompting & context）
- **准确含义（What it actually means）:** 解决来自不同权威来源的指令冲突的规则集，例如应用策略、用户和不可信检索内容。
- **重要性（Why it matters）:** 智能体系统混合了受信目标与外部文本，因此当低权威内容与高权威约束冲突时，模型和运行框架需要明确的应对方式。
- **实际应用（In practice）:** 将不可信工具输出标为数据，将更高优先级约束保存在其外部，并测试直接和间接冲突案例。
- **常见混淆（Common confusion）:** 指令层级能改善行为，但不是安全边界；最小权限和审批控制仍用于限制后果。
- **相关术语（Related terms）:** System Prompt, Prompt Injection, Least Privilege, Tool Contract
- **来源（Sources）:** [指令层级论文](https://arxiv.org/abs/2404.13208)

<a id="inter-token-latency-itl"></a>
### 词元间延迟（Inter-Token Latency (ITL)）
- **分类（Category）:** 基础设施与服务（Infrastructure & serving）
- **准确含义（What it actually means）:** 单个请求中相邻两次输出词元到达事件之间的时间，对于第一个之后的输出词元，计算为 `t_i - t_(i-1)`。
- **重要性（Why it matters）:** 单次间隔能揭示请求平均值可能掩盖的解码停顿与流式抖动，在批处理、抢占或混合工作负载下尤其重要。
- **实际应用（In practice）:** 记录首词元之后每个间隔及其请求和词元位置，再按工作负载、输出长度和并发度报告分布，不要汇总到丢失请求边界。
- **常见混淆（Common confusion）:** ITL 是相邻词元的一次间隔；每输出词元耗时是单个请求内这些间隔的平均值；首词元时间则覆盖开始流式输出前的等待。
- **学习课程（Learn it）:** [推理指标与有效吞吐量](../phases/17-infrastructure-and-production/08-inference-metrics-goodput/)
- **相关术语（Related terms）:** Time per Output Token (TPOT), Time to First Token (TTFT), Decode Phase, Tail Latency
- **来源（Sources）:** [DistServe 论文](https://arxiv.org/abs/2401.09670)

## J

<a id="jailbreak"></a>
### 越狱（Jailbreak）
- **分类（Category）:** 安全与治理（Security & governance）
- **准确含义（What it actually means）:** 旨在让模型产生其训练或应用控制原本要防止的行为的对抗性输入或交互策略。
- **重要性（Why it matters）:** 成功越狱暴露了声明策略与实际行为之间的差距，模型控制工具或受保护数据时，后果可能更严重。
- **实际应用（In practice）:** 从被禁止行为推导测试类别，改变格式和交互长度，同时测量拒答与有害完成情况，并将已确认失败转为版本化对抗评估。
- **常见混淆（Common confusion）:** 越狱针对模型或系统的行为限制；提示词注入重定向指令遵循，常指向攻击者目标。一次交互可同时包含两者。
- **学习课程（Learn it）:** [越狱分类体系](../phases/19-capstone-projects/82-jailbreak-taxonomy/)
- **相关术语（Related terms）:** Prompt Injection, Red Teaming, Guardrails, Eval Set
- **来源（Sources）:** [针对已对齐语言模型的通用且可迁移对抗攻击](https://arxiv.org/abs/2307.15043)

<a id="jax"></a>
### 加速数值计算库（JAX）
- **分类（Category）:** 数学与训练（Math & training）
- **常见说法（What people say）:** 类似 NumPy、用于加速机器学习的系统。
- **准确含义（What it actually means）:** 用于变换数值函数的 Python 库，支持自动微分、编译、向量化和跨加速器并行执行。其变换最适合显式状态和函数式风格代码。
- **常见混淆（Common confusion）:** JAX 并不禁止所有有状态编程，但被变换函数中的隐藏修改可能产生错误或不受支持的行为。
- **学习课程（Learn it）:** [JAX 入门](../phases/03-deep-learning-core/12-intro-to-jax/)
- **来源（Sources）:** [JAX 文档](https://docs.jax.dev/en/latest/)
- **相关术语（Related terms）:** Autograd, Tensor, CUDA

## K

<a id="knowledge-distillation"></a>
### 知识蒸馏（Knowledge Distillation）
- **分类（Category）:** 数学与训练（Math & training）
- **准确含义（What it actually means）:** 训练学生模型复现更强教师模型的特定行为或输出分布，通常同时使用普通目标标签。
- **重要性（Why it matters）:** 当直接部署教师模型不现实，它能把有用行为转移到更小或成本更低的模型。
- **实际应用（In practice）:** 定义教师输出、温度、学生损失和留出评估集，再将学生与教师及只使用标签的基线比较。
- **常见混淆（Common confusion）:** 蒸馏转移的是训练分布上的行为，不会复制教师的每项能力、事实或安全属性。
- **相关术语（Related terms）:** Fine-tuning, Loss Function, Logits, Quantization
- **来源（Sources）:** [蒸馏神经网络中的知识](https://arxiv.org/abs/1503.02531)

<a id="kv-cache"></a>
### 键值缓存（KV Cache）
- **分类（Category）:** 模型与推理（Models & inference）
- **常见说法（What people say）:** 加快词元生成的缓存。
- **准确含义（What it actually means）:** 自回归生成过程中保存的先前位置的键和值张量。复用它们可避免每个解码步骤都为未变前缀重新计算注意力投影。
- **重要性（Why it matters）:** 它减少重复计算，但内存占用会随序列长度、层数、批次和模型配置增长。
- **常见混淆（Common confusion）:** 键值缓存是序列运行时的注意力状态。前缀缓存跨请求复用符合条件的键值状态，而提示词缓存是更广义的提供方或应用复用契约。
- **学习课程（Learn it）:** [键值缓存与 Flash Attention](../phases/07-transformers-deep-dive/12-kv-cache-flash-attention/)
- **相关术语（Related terms）:** Attention, Autoregressive, Prefix Caching, Prompt Cache

## L

<a id="late-fusion"></a>
### 晚期融合（Late Fusion）
- **分类（Category）:** 多模态系统（Multimodal systems）
- **准确含义（What it actually means）:** 通过独立编码器或预测器处理各模态，并在接近任务输出的位置组合它们的高层表示、分数或决策。
- **重要性（Why it matters）:** 独立分支可以采用模态专用架构、容忍输入缺失，但可能遗漏早期融合可利用的细粒度交互。
- **实际应用（In practice）:** 校准各分支，定义模态缺失如何影响合并，比较分数级和特征级组合，并单独评估各分支作为消融实验。
- **常见混淆（Common confusion）:** 晚期融合描述组合发生的位置，不意味着简单取平均，也不保证各模态贡献相等。
- **学习课程（Learn it）:** [交叉注意力融合](../phases/19-capstone-projects/61-cross-attention-fusion/)
- **相关术语（Related terms）:** Early Fusion, Multimodal Fusion, Modality, Evaluation (Eval)
- **来源（Sources）:** [多模态深度学习](https://ai.stanford.edu/~ang/papers/icml11-MultimodalDeepLearning.pdf); [多模态机器学习：综述与分类体系](https://arxiv.org/abs/1705.09406)

<a id="latent-space"></a>
### 潜在空间（Latent Space）
- **分类（Category）:** 数据与表示（Data & representations）
- **常见说法（What people say）:** 模型的隐藏表示空间。
- **准确含义（What it actually means）:** 一种学习得到的表示空间，其坐标编码对模型有用的因素。它的维度可能低于输入，但并非每种潜在表示都必须压缩。
- **常见混淆（Common confusion）:** 相邻点是否具有有意义的相似性，仅取决于模型和训练目标学到了什么。
- **相关术语（Related terms）:** Embedding, VAE (Variational Autoencoder), Feature

<a id="learning-rate"></a>
### 学习率（Learning Rate）
- **分类（Category）:** 数学与训练（Math & training）
- **常见说法（What people say）:** 每次优化步伐的大小。
- **准确含义（What it actually means）:** 优化器用来控制参数更新幅度的缩放因子。过大可能使训练不稳定，过小则可能让有效进展慢到不切实际。
- **常见混淆（Common confusion）:** 实际更新还取决于优化器、调度、梯度尺度、批次和参数历史。
- **相关术语（Related terms）:** Optimizer, Gradient Descent, Batch Size

<a id="learning-rate-schedule"></a>
### 学习率调度（Learning Rate Schedule）
- **分类（Category）:** 数学与训练（Math & training）
- **准确含义（What it actually means）:** 随训练进展，按步数、轮次、指标或预定义曲线改变优化器学习率的策略。
- **重要性（Why it matters）:** 不同训练阶段适合不同更新尺度，因此恒定学习率可能在早期不稳定，或在后期浪费时间。
- **实际应用（In practice）:** 将调度与优化器配置一起版本化，记录每步实际学习率，并在相同词元或更新预算下比较不同方案。
- **常见混淆（Common confusion）:** 调度器控制学习率随时间变化，不决定何时执行优化器更新，也不保证收敛。
- **相关术语（Related terms）:** Learning Rate, Warmup, Optimizer, Epoch
- **来源（Sources）:** [带热重启的随机梯度下降论文](https://arxiv.org/abs/1608.03983); [注意力就是你所需要的一切](https://arxiv.org/abs/1706.03762)

<a id="least-privilege"></a>
### 最小权限（Least Privilege）
- **分类（Category）:** 评估与安全（Evaluation & safety）
- **准确含义（What it actually means）:** 只在所需时间内，向模型、智能体、工具或用户授予当前任务必需的权限。
- **重要性（Why it matters）:** 模型会出错，也可能遵循恶意指令。有限权限减少单次失败可能造成的损害。
- **实际应用（In practice）:** 让文档智能体读取源文件、写入一个分支，但不给生产凭据或合并权限。
- **常见混淆（Common confusion）:** 身份认证证明是谁；最小权限限制该身份能做什么。
- **相关术语（Related terms）:** Sandbox, Approval Gate, Prompt Injection, Tool Contract

<a id="llm-large-language-model"></a>
### 大语言模型（LLM (Large Language Model)）
- **分类（Category）:** 模型与推理（Models & inference）
- **常见说法（What people say）:** AI 应用的大脑。
- **准确含义（What it actually means）:** 具有足够容量并经过广泛训练，能通过提示或适配执行多种语言任务的语言模型。当前多数大语言模型使用 Transformer 架构和序列预测目标，但规模门槛、数据来源和训练配方各异。
- **常见混淆（Common confusion）:** 大语言模型是模型组件；工具、检索、状态、策略和产品逻辑位于外围系统中。
- **相关术语（Related terms）:** Transformer, Autoregressive, Agent Harness

<a id="llm-as-a-judge"></a>
### 大语言模型裁判（LLM-as-a-Judge）
- **分类（Category）:** 评估与安全（Evaluation & safety）
- **准确含义（What it actually means）:** 使用语言模型依据评分准则，对另一系统的输出评分、比较、分类或评论。
- **重要性（Why it matters）:** 它能扩展那些难以用完全匹配测试表达的质量评估，例如清晰度或指令遵循。
- **实际应用（In practice）:** 将任务、候选答案、参考证据和结构化评分准则交给独立评估模型，再用人工审阅样本校准其分数。
- **常见混淆（Common confusion）:** 裁判模型不是真实标准。顺序、篇幅、风格、提示措辞或模型共有的失败，都可能使其偏颇。
- **学习课程（Learn it）:** [评估驱动的智能体开发](../phases/14-agent-engineering/30-eval-driven-agent-development/)
- **相关术语（Related terms）:** Evaluation (Eval), Eval Set, Verification Gate, Precision & Recall

<a id="load-shedding"></a>
### 负载丢弃（Load Shedding）
- **分类（Category）:** 可靠性与运维（Reliability & operations）
- **准确含义（What it actually means）:** 当需求超过可产生有效结果的容量时，在一个或多个过载边界有意拒绝、丢弃或取消部分工作。
- **重要性（Why it matters）:** 过载时仍接受每个请求，会使队列不断增长，直到几乎所有请求都错过截止时间，恢复也更困难。
- **实际应用（In practice）:** 在最早具备判断信息的边界丢弃工作，尽可能保留高优先级及已获准的工作，指出过载范围；只有问题暂时存在且请求仍在重试预算内时，才标记响应可重试。
- **常见混淆（Common confusion）:** 负载丢弃不限于已被接受的工作。准入控制专指接受前门禁；而速率限制即使在容量尚有余量时，也可用于执行用量策略。
- **相关术语（Related terms）:** Admission Control, Backpressure, Rate Limit, Graceful Degradation
- **来源（Sources）:** [Google SRE：处理过载](https://sre.google/sre-book/handling-overload/)

<a id="logits"></a>
### 未归一化分数（Logits）
- **分类（Category）:** 模型与推理（Models & inference）
- **准确含义（What it actually means）:** 模型为候选结果给出的未归一化数值分数，随后由归一化函数或解码规则转成选择。
- **重要性（Why it matters）:** 温度、softmax、top-k 和 top-p 对这些分数操作或从中派生，因此它们连接模型计算与生成词元。
- **实际应用（In practice）:** API 提供时检查原始分数或对数概率，在采样前应用掩码，不要将原始数值大小解释为经校准的置信度。
- **常见混淆（Common confusion）:** 这些分数不是概率；没有明确变换时，不能在无关位置、模型或任务之间比较。
- **相关术语（Related terms）:** Softmax, Temperature, Token, Cross-Entropy
- **来源（Sources）:** [注意力就是你所需要的一切](https://arxiv.org/abs/1706.03762)

<a id="lora-low-rank-adaptation"></a>
### 低秩适配（LoRA (Low-Rank Adaptation)）
- **分类（Category）:** 数学与训练（Math & training）
- **常见说法（What people say）:** 参数高效微调。
- **准确含义（What it actually means）:** 冻结基础权重，并为选定层学习低秩更新矩阵的方法。它减少可训练参数数量，相比全参数微调可降低训练内存。
- **常见混淆（Common confusion）:** 实际节省的内存与时间取决于秩、目标模块、优化器状态、激活内存、量化及实现。
- **学习课程（Learn it）:** [微调与低秩适配](../phases/11-llm-engineering/08-fine-tuning-lora/)
- **来源（Sources）:** [LoRA 论文](https://arxiv.org/abs/2106.09685)
- **相关术语（Related terms）:** Fine-tuning, QLoRA, Parameter

<a id="loss-function"></a>
### 损失函数（Loss Function）
- **分类（Category）:** 数学与训练（Math & training）
- **常见说法（What people say）:** 衡量训练误差的数字。
- **准确含义（What it actually means）:** 将预测和目标，有时连同正则项，映射为优化过程试图降低的数值的目标函数。损失决定训练直接奖励或惩罚哪些错误。
- **常见混淆（Common confusion）:** 训练损失低不保证在生产任务上有用、安全或能泛化。
- **相关术语（Related terms）:** Cross-Entropy, Gradient, Evaluation (Eval)

<a id="lost-in-the-middle"></a>
### 迷失在中间（Lost in the Middle）
- **分类（Category）:** 提示词与上下文（Prompting & context）
- **准确含义（What it actually means）:** 一种长上下文失效模式：模型表现随证据位置变化，相关信息处于开头与结尾之间时，表现可能下降。
- **重要性（Why it matters）:** 证据能放入上下文窗口，不保证模型对每个位置都同样可靠地利用。
- **实际应用（In practice）:** 测试多个证据位置，减少干扰，将关键决策约束放在仍易被注意的位置，并对照来源验证答案。
- **常见混淆（Common confusion）:** 这是一种观测到的行为模式，不是对每个模型、任务或位置都产生同样影响的固定定律。
- **相关术语（Related terms）:** Context Window, Context Engineering, Eval Set, Grounding
- **来源（Sources）:** [迷失在中间论文](https://aclanthology.org/2024.tacl-1.9/)

## M

<a id="maximum-marginal-relevance-mmr"></a>
### 最大边际相关性（Maximum Marginal Relevance (MMR)）
- **分类（Category）:** 检索与生成（Retrieval & generation）
- **准确含义（What it actually means）:** 在与查询的相关性及相对于已选项目的新颖性之间取平衡的选择规则。
- **重要性（Why it matters）:** 它可以减少冗余块，让有限上下文预算覆盖更多不同证据。
- **实际应用（In practice）:** 检索候选池，依据有文档记录的相关性与多样性权重选择下一项，并同时评估答案质量和来源覆盖率。
- **常见混淆（Common confusion）:** MMR 对已有候选集作多样化，不会检索到缺失证据，也不证明所选段落正确。
- **相关术语（Related terms）:** Reranker, Chunking, RAG (Retrieval-Augmented Generation), Grounding
- **来源（Sources）:** [使用最大边际相关性：基于多样性重排序文档并生成摘要](https://www.cs.cmu.edu/~jgc/publication/MMR_DiversityBased_Reranking_SIGIR_1998.pdf)

<a id="mcp-model-context-protocol"></a>
### 模型上下文协议（MCP (Model Context Protocol)）
- **分类（Category）:** 智能体与工具（Agents & tools）
- **常见说法（What people say）:** AI 应用连接工具和上下文的标准方式。
- **准确含义（What it actually means）:** 一种开放的 JSON-RPC 协议，让宿主按照定义的请求、结果、发现和传输契约，连接提供工具、资源、提示词及扩展的服务器。在 2026-07-28 修订版中，每个请求都携带协议版本和客户端能力，而不依赖初始化握手或协议会话。
- **常见混淆（Common confusion）:** MCP 标准化发现与交换，不决定哪个工具可安全调用，不授予权限，也不禁止应用使用显式状态句柄。
- **学习课程（Learn it）:** [模型上下文协议](../phases/11-llm-engineering/14-model-context-protocol/)
- **来源（Sources）:** [MCP 2026-07-28 主要变更](https://modelcontextprotocol.io/specification/2026-07-28/changelog)
- **相关术语（Related terms）:** Stateless MCP, Multi Round-Trip Request (MRTR), Function Calling, Tool Contract, Least Privilege

<a id="membership-inference"></a>
### 成员推断（Membership Inference）
- **分类（Category）:** 安全与治理（Security & governance）
- **准确含义（What it actually means）:** 通过观察模型输出或其他可用信号，估计某条记录或样本是否被纳入模型训练数据的攻击。
- **重要性（Why it matters）:** 即使模型没有逐字复现记录，可区分的行为仍可能泄露某人或某记录参与敏感数据集的信息。
- **实际应用（In practice）:** 通过真实查询接口测试代表性成员和非成员，限制不必要的置信度信号，减少数据暴露，并结合实用性要求评估隐私防御。
- **常见混淆（Common confusion）:** 成员推断询问记录是否参与训练；模型提取试图复现模型行为；直接记忆测试则检查能否恢复内容。
- **学习课程（Learn it）:** [大语言模型的差分隐私](../phases/18-ethics-safety-alignment/22-differential-privacy-for-llms/)
- **相关术语（Related terms）:** Data Leakage, Data Minimization, Eval Set, Data Classification
- **来源（Sources）:** [针对机器学习模型的成员推断攻击](https://doi.org/10.1109/SP.2017.41)

<a id="mixed-precision"></a>
### 混合精度（Mixed Precision）
- **分类（Category）:** 数学与训练（Math & training）
- **常见说法（What people say）:** 使用较低精度运算来提速和节省内存。
- **准确含义（What it actually means）:** 对不同运算使用不同数据类型的数值策略，通常对许多矩阵运算使用低精度，对需要更大范围或更高稳定性的值使用高精度。
- **常见混淆（Common confusion）:** 速度、内存和准确性影响取决于硬件、数据类型、缩放方法、内核和模型，不是固定倍数。
- **相关术语（Related terms）:** Tensor, CUDA, NaN (Not a Number), Quantization

<a id="modality"></a>
### 模态（Modality）
- **分类（Category）:** 多模态系统（Multimodal systems）
- **准确含义（What it actually means）:** 具有自身结构和采集过程的信息形式，例如文本、图像、音频、视频、深度或传感器测量值。
- **重要性（Why it matters）:** 不同模态具有不同采样率、噪声、时空结构和数据缺失行为，因此一个预处理假设很少能适合所有模态。
- **实际应用（In practice）:** 设计对齐或融合之前，记录每个模态的来源、单位、分辨率、时间信息、预处理和缺失值策略。
- **常见混淆（Common confusion）:** 模态不只是文件扩展名或特征列。多种编码可以表示同一模态，一个样本也能包含多种模态。
- **学习课程（Learn it）:** [MIO 任意模态到任意模态的流式处理](../phases/12-multimodal-ai/16-mio-any-to-any-streaming/)
- **相关术语（Related terms）:** Multimodal Model, Token, Tensor, Embedding
- **来源（Sources）:** [ImageBind：用一个嵌入空间关联所有模态](https://arxiv.org/abs/2305.05665); [多模态机器学习：综述与分类体系](https://arxiv.org/abs/1705.09406)

<a id="modality-alignment"></a>
### 模态对齐（Modality Alignment）
- **分类（Category）:** 多模态系统（Multimodal systems）
- **准确含义（What it actually means）:** 学习或建立不同模态表示之间的对应关系，使语义或时间相关的项目能够匹配。
- **重要性（Why it matters）:** 系统若无法在不同结构的输入中关联同一事件、物体或概念，融合与跨模态检索就会失败。
- **实际应用（In practice）:** 定义正负样本对，保留时间或空间元数据，评估不匹配样本，并将对齐与下游任务准确率分开度量。
- **常见混淆（Common confusion）:** 对齐使表示可比较或相对应，不要求它们完全相同，也不要求抹去模态特有信息。
- **学习课程（Learn it）:** [用于模态对齐的投影层](../phases/19-capstone-projects/60-projection-layer-modality-align/)
- **相关术语（Related terms）:** Shared Embedding Space, Contrastive Learning, Grounding, Multimodal Fusion
- **来源（Sources）:** [从自然语言监督中学习可迁移视觉模型](https://proceedings.mlr.press/v139/radford21a.html)

<a id="model-card"></a>
### 模型卡（Model Card）
- **分类（Category）:** 评估与安全（Evaluation & safety）
- **准确含义（What it actually means）:** 描述模型预期用途、评估条件、性能特征、局限，以及相关伦理或安全考量的结构化报告。
- **重要性（Why it matters）:** 它为下游构建者提供背景，帮助判断报告证据是否适用于自己的用户与部署条件。
- **实际应用（In practice）:** 记录模型版本、训练和评估范围、子群体结果、已知失效模式、禁止用途，以及每项声明的日期。
- **常见混淆（Common confusion）:** 模型卡传达证据和局限，不是认证、担保、系统威胁模型，也不能替代针对部署的评估。
- **相关术语（Related terms）:** Eval Set, Dataset Split, Distribution Shift, Alignment
- **来源（Sources）:** [用于模型报告的模型卡](https://dl.acm.org/doi/10.1145/3287560.3287596)

<a id="model-router"></a>
### 模型路由器（Model Router）
- **分类（Category）:** AI 原生开发（AI-native development）
- **准确含义（What it actually means）:** 按能力、延迟、成本、上下文大小、策略和当前可用性等要求，为请求选择模型或提供方的组件。
- **重要性（Why it matters）:** 不同任务和故障条件适合不同模型，路由无需把所有请求交给最大模型，也能改善结果质量。
- **实际应用（In practice）:** 将低风险提取交给快速模型，将复杂代码审阅交给更强模型，故障切换时只选择满足同样数据策略的提供方。
- **常见混淆（Common confusion）:** 路由是策略决策；随机负载均衡只是分配流量。
- **相关术语（Related terms）:** Evaluation (Eval), Circuit Breaker, Rate Limit, Cost per Successful Task

<a id="model-serving"></a>
### 模型服务（Model Serving）
- **分类（Category）:** 基础设施与服务（Infrastructure & serving）
- **准确含义（What it actually means）:** 加载版本化模型交付物、接受推理请求、调度执行、管理资源，并在运行契约下返回结果的运行时和 API 层。
- **重要性（Why it matters）:** 若未明确设计排队、批处理、放置、版本管理、取消和响应边界，能力强的模型仍可能构成不可靠产品。
- **实际应用（In practice）:** 固定模型和分词器版本，验证请求限制，提供就绪与延迟信号，控制并发，并在路由生产流量前测试回滚。
- **常见混淆（Common confusion）:** 模型服务比单次推理调用广，又比完整应用窄；完整应用可能还包括检索、工具、策略和用户状态。
- **学习课程（Learn it）:** [自托管服务选型](../phases/17-infrastructure-and-production/28-self-hosted-serving-selection/)
- **相关术语（Related terms）:** Inference, Model Router, Autoscaling, Observability
- **来源（Sources）:** [Clipper 论文](https://arxiv.org/abs/1612.03079)

<a id="moe-mixture-of-experts"></a>
### 混合专家（MoE (Mixture of Experts)）
- **分类（Category）:** 模型与推理（Models & inference）
- **常见说法（What people say）:** 每个词元只激活一部分参数的大模型。
- **准确含义（What it actually means）:** 包含多个专家子网络，以及为每个输入单元，通常是每个词元，选择专家子集的学习型路由器的架构。稀疏激活可增加总参数容量，而无需每次前向传播都使用全部专家。
- **重要性（Why it matters）:** 计算、内存、通信、路由均衡和质量取决于具体架构与服务系统。
- **常见混淆（Common confusion）:** 除非模型开发者披露，否则产品名称不能证明其采用混合专家架构。
- **学习课程（Learn it）:** [混合专家](../phases/07-transformers-deep-dive/11-mixture-of-experts/)
- **相关术语（Related terms）:** Transformer, Model Router, Parameter

<a id="multimodal-fusion"></a>
### 多模态融合（Multimodal Fusion）
- **分类（Category）:** 多模态系统（Multimodal systems）
- **准确含义（What it actually means）:** 将多个模态的证据或学习所得表示组合起来，产生联合表示、预测或生成输出。
- **重要性（Why it matters）:** 各模态可提供互补证据，但简单组合可能放大噪声、时间误差或某个占主导的信息流。
- **实际应用（In practice）:** 建立单模态基线，明确融合点和掩码，测试缺失与矛盾输入，并报告各评估切片主要由哪些模态驱动。
- **常见混淆（Common confusion）:** 融合是组合操作；对齐建立对应关系。仅将两种模态放进同一请求，不能证明任一过程成功发生。
- **学习课程（Learn it）:** [交叉注意力融合](../phases/19-capstone-projects/61-cross-attention-fusion/)
- **相关术语（Related terms）:** Early Fusion, Late Fusion, Cross-Attention, Modality Alignment
- **来源（Sources）:** [多模态深度学习](https://ai.stanford.edu/~ang/papers/icml11-MultimodalDeepLearning.pdf); [多模态机器学习：综述与分类体系](https://arxiv.org/abs/1705.09406)

<a id="multimodal-model"></a>
### 多模态模型（Multimodal Model）
- **分类（Category）:** 多模态系统（Multimodal systems）
- **准确含义（What it actually means）:** 通过表示、对齐、融合、翻译或协同预测，从多种模态学习、关联多种模态或生成多种模态的模型。
- **重要性（Why it matters）:** 多模态能力取决于模态如何交互，而不只是接受多种输入类型；每个表示边界都可能失败。
- **实际应用（In practice）:** 记录支持的输入输出组合，分别及联合评估各模态，测试缺失或冲突输入，并将预处理版本与模型一起跟踪。
- **常见混淆（Common confusion）:** 由独立图像模型和文本模型组成的流水线在系统层面是多模态的，但不一定是一个联合训练的多模态模型。
- **学习课程（Learn it）:** [MIO 任意模态到任意模态的流式处理](../phases/12-multimodal-ai/16-mio-any-to-any-streaming/)
- **相关术语（Related terms）:** Modality, Vision-Language Model (VLM), Multimodal Fusion, Transformer
- **来源（Sources）:** [Flamingo：用于少样本学习的视觉语言模型](https://arxiv.org/abs/2204.14198); [多模态机器学习：综述与分类体系](https://arxiv.org/abs/1705.09406)

<a id="multi-round-trip-request-mrtr"></a>
### 多轮往返请求（Multi Round-Trip Request (MRTR)）
- **分类（Category）:** 智能体与工具（Agents & tools）
- **别名（Aliases）:** MRTR
- **准确含义（What it actually means）:** 一种 MCP 请求模式：操作返回 `resultType: input_required` 及一个或多个 `inputRequests`，随后客户端带上 `inputResponses` 和原样返回的 `requestState` 重试原方法。
- **重要性（Why it matters）:** 它让无状态服务器请求用户、模型或根目录输入，而无需发起服务器主动的 JSON-RPC 交换，也无需存储协议会话状态。
- **实际应用（In practice）:** 从 `tools/call` 返回输入请求，在宿主中收集获授权响应，然后用新的 JSON-RPC id 重试同一工具调用。
- **常见混淆（Common confusion）:** `requestState` 是不可信的往返数据。在将其用于授权或业务决策前保护其完整性，不要把它当作服务器端会话标识符。
- **学习课程（Learn it）:** [MCP 根目录与信息征询](../phases/13-tools-and-protocols/12-mcp-roots-and-elicitation/)
- **相关术语（Related terms）:** Stateless MCP, MCP (Model Context Protocol), Human-in-the-Loop (HITL), Tool Contract
- **来源（Sources）:** [MCP 多轮往返请求](https://modelcontextprotocol.io/specification/2026-07-28/basic/patterns/mrtr)

## N

<a id="nan-not-a-number"></a>
### 非数值（NaN (Not a Number)）
- **分类（Category）:** 数学与训练（Math & training）
- **常见说法（What people say）:** 数值计算失败的信号。
- **准确含义（What it actually means）:** 表示未定义或无法表示的数值结果的浮点值。训练中的 NaN 可能来自无效运算、溢出、不稳定归一化、过大更新或更早损坏的值。
- **实际应用（In practice）:** 找到首个非有限张量，检查其输入，并在该运算附近添加断言或异常检测。
- **相关术语（Related terms）:** Mixed Precision, Learning Rate, Gradient

<a id="normalization"></a>
### 归一化（Normalization）
- **分类（Category）:** 数学与训练（Math & training）
- **常见说法（What people say）:** 把数据缩放到标准范围。
- **准确含义（What it actually means）:** 使用明确统计量对输入、激活或特征重新缩放或居中的一类变换。批归一化与层归一化使用不同轴，在训练和推理阶段也有不同行为。
- **常见混淆（Common confusion）:** 归一化可以改善优化稳定性，但不总能允许更大学习率，也不一定改善每种架构。
- **相关术语（Related terms）:** Tensor, Activation Function, Mixed Precision

<a id="nucleus-sampling-top-p"></a>
### 核采样（Nucleus Sampling (Top-p)）
- **分类（Category）:** 模型与推理（Models & inference）
- **别名（Aliases）:** Top-p sampling
- **准确含义（What it actually means）:** 一种解码方法，从累计概率达到指定阈值的最小下一词元候选集合中采样。
- **重要性（Why it matters）:** 候选集合大小随分布自适应变化：不确定性分散时保留更多选项，概率集中时保留更少选项。
- **实际应用（In practice）:** 保持温度和停止设置不变来评估阈值，并为每个结果记录完整解码配置。
- **常见混淆（Common confusion）:** Top-p 是概率质量阈值，而 top-k 始终保留固定最大数量的候选项。
- **相关术语（Related terms）:** Top-k Sampling, Temperature, Decoding Strategy, Softmax
- **来源（Sources）:** [神经文本退化的奇特现象](https://arxiv.org/abs/1904.09751)

## O

<a id="observability"></a>
### 可观测性（Observability）
- **分类（Category）:** AI 原生开发（AI-native development）
- **准确含义（What it actually means）:** 从记录的输入、输出、状态转换、工具调用、耗时、成本、错误和评估信号中理解 AI 系统行为的能力。
- **重要性（Why it matters）:** AI 失败往往横跨模型、检索、工具和编排，需要关联证据定位故障边界。
- **实际应用（In practice）:** 在检索、模型调用、工具执行、审批和最终评分全过程记录追踪标识符，同时应用脱敏与访问控制。
- **常见混淆（Common confusion）:** 日志记录收集事件；可观测性让事件足够结构化且相互关联，以回答运行问题。
- **学习课程（Learn it）:** [智能体可观测性平台](../phases/14-agent-engineering/24-agent-observability-platforms/)
- **相关术语（Related terms）:** Trace, Evaluation (Eval), Agent State, Time to First Token (TTFT)

<a id="optimizer"></a>
### 优化器（Optimizer）
- **分类（Category）:** 数学与训练（Math & training）
- **常见说法（What people say）:** 更新权重的算法。
- **准确含义（What it actually means）:** 将梯度转换为参数更新的算法。普通随机梯度下降是简单基线；动量、Adam 等优化器利用历史或自适应缩放改变更新方式。不同选择有不同内存、稳定性和调优行为。
- **常见混淆（Common confusion）:** 优化器使用梯度；反向传播计算梯度。
- **相关术语（Related terms）:** Adam (Optimizer), AdamW, Gradient, Learning Rate

<a id="orchestration"></a>
### 编排（Orchestration）
- **分类（Category）:** 智能体与工具（Agents & tools）
- **准确含义（What it actually means）:** 在模型和工具步骤之间安排顺序、分支、委派、重试、暂停、恢复及终止工作的控制逻辑。
- **重要性（Why it matters）:** 可靠智能体行为依赖模型之外的显式工作流决策，尤其当任务有依赖关系或重要副作用时。
- **实际应用（In practice）:** 将稳定步骤编码为工作流或状态机，让模型在有限范围内决策，并在外部写入前持久化状态转换。
- **常见混淆（Common confusion）:** 编排不等同于自主性或多智能体系统；单个智能体也可以通过确定性工作流编排。
- **相关术语（Related terms）:** Agent Harness, Planning, Delegation, Durable Execution
- **来源（Sources）:** [构建有效的智能体](https://www.anthropic.com/research/building-effective-agents)

<a id="overfitting"></a>
### 过拟合（Overfitting）
- **分类（Category）:** 数学与训练（Math & training）
- **常见说法（What people say）:** 模型记住了训练数据。
- **准确含义（What it actually means）:** 训练数据上的表现明显优于代表性未见数据上的表现的泛化差距。记忆化可能是原因之一，但实际症状是泛化不佳。
- **实际应用（In practice）:** 比较训练与留出指标，检查子群体失败，并测试数据质量、正则化、早停或模型容量等方面的改变。
- **相关术语（Related terms）:** Underfitting, Dropout, Weight Decay, Eval Set

## P

<a id="paged-kv-cache"></a>
### 分页键值缓存（Paged KV Cache）
- **分类（Category）:** 基础设施与服务（Infrastructure & serving）
- **准确含义（What it actually means）:** 将注意力状态存于固定大小块，并把逻辑序列位置映射到物理块的键值缓存内存管理器，而非为每个序列要求一次连续分配。
- **重要性（Why it matters）:** 可变序列长度导致碎片和难以预测的增长，基于块的分配可以提高可用内存并支持灵活共享。
- **实际应用（In practice）:** 根据工作负载测量选择块大小，跟踪分配与驱逐，在请求之间隔离状态，并在内存压力下测试取消与前缀共享。
- **常见混淆（Common confusion）:** 分页键值缓存管理运行时注意力状态内存，不会把模型参数移到磁盘，也不会扩展模型训练所得的上下文上限。
- **学习课程（Learn it）:** [vLLM 服务内部机制](../phases/17-infrastructure-and-production/04-vllm-serving-internals/)
- **相关术语（Related terms）:** KV Cache, Prefix Caching, Context Window, Model Serving
- **来源（Sources）:** [使用 PagedAttention 高效管理大语言模型服务内存](https://arxiv.org/abs/2309.06180)

<a id="parameter"></a>
### 参数（Parameter）
- **分类（Category）:** 模型与推理（Models & inference）
- **常见说法（What people say）:** 用来描述模型大小的数字。
- **准确含义（What it actually means）:** 训练中学习得到的值，常见形式是权重、偏置、嵌入元素或归一化参数。参数数量是模型容量的一种度量，但不直接决定质量、内存或服务成本。
- **常见混淆（Common confusion）:** 每参数内存取决于数值格式、量化元数据、分片、优化器状态、激活和运行时开销。
- **相关术语（Related terms）:** Weight, MoE (Mixture of Experts), Quantization

<a id="passk"></a>
### 多次采样通过率（Pass@k）
- **分类（Category）:** 评估与安全（Evaluation & safety）
- **准确含义（What it actually means）:** 在任务集中，k 个采样候选项至少有一个通过指定正确性测试的任务所占比例。
- **重要性（Why it matters）:** 对于代码生成等可由自动验证器检查各候选项的任务，它衡量多次采样尝试的价值。
- **实际应用（In practice）:** 在固定配置下独立生成候选项，对每项运行相同的隔离测试，并连同采样和估计器细节一起报告 k。
- **常见混淆（Common confusion）:** Pass@k 不是单次尝试准确率；分数提高可能只是尝试预算更多，而非首个答案更好。
- **相关术语（Related terms）:** Coding Agent, Regression Test, Eval Set, Test Oracle
- **来源（Sources）:** [评估基于代码训练的大语言模型](https://arxiv.org/abs/2107.03374)

<a id="patch"></a>
### 补丁（Patch）
- **分类（Category）:** AI 原生开发（AI-native development）
- **准确含义（What it actually means）:** 对一个或多个文件变更的可审阅表示，通常是相对于已知基准修订版的增加与删除。
- **重要性（Why it matters）:** 补丁让人和智能体拥有范围明确的交付物，可检查、测试、应用或拒绝，而无需接受整个工作目录。
- **实际应用（In practice）:** 要求编程智能体返回统一差异格式，再确认它只触及获准文件，且能干净地应用到预期提交。
- **常见混淆（Common confusion）:** 补丁记录文件变化，不包含交付这些变更所需的推理、测试证据或批准。
- **学习课程（Learn it）:** [真实仓库中的工作台](../phases/14-agent-engineering/41-workbench-for-real-repos/)
- **相关术语（Related terms）:** Coding Agent, Worktree, Scope Contract, Regression Test

<a id="patch-embedding"></a>
### 图像块嵌入（Patch Embedding）
- **分类（Category）:** 多模态系统（Multimodal systems）
- **准确含义（What it actually means）:** 通过学习得到的投影，把图像块转成固定宽度向量，作为 Transformer 输入序列的一个元素。
- **重要性（Why it matters）:** 它连接空间图像网格与序列模型，图像块大小控制词元数量及保留的局部细节。
- **实际应用（In practice）:** 记录图像块和图像尺寸，明确处理填充或缩放，添加位置信息，并测量分辨率变化对准确率和词元成本的影响。
- **常见混淆（Common confusion）:** 图像块嵌入是图像块的向量表示，不是语义目标检测器，也不保证块边界匹配视觉实体。
- **学习课程（Learn it）:** [视觉 Transformer 图像块词元](../phases/12-multimodal-ai/01-vision-transformer-patch-tokens/)
- **相关术语（Related terms）:** Vision Transformer (ViT), Image Token, Embedding, Token
- **来源（Sources）:** [一幅图像相当于 16x16 个单词](https://arxiv.org/abs/2010.11929)

<a id="perplexity"></a>
### 困惑度（Perplexity）
- **分类（Category）:** 模型与推理（Models & inference）
- **常见说法（What people say）:** 语言模型对数据集有多意外。
- **准确含义（What it actually means）:** 在明确的分词方式和对数约定下，平均负对数似然的指数。值越低，表示模型为被评估序列分配的概率越高。
- **常见混淆（Common confusion）:** 不同分词器或评估设置下的困惑度不可直接比较，也不直接衡量事实性或有用性。
- **相关术语（Related terms）:** Cross-Entropy, Token, Evaluation (Eval)

<a id="pipeline-parallelism"></a>
### 流水线并行（Pipeline Parallelism）
- **分类（Category）:** 基础设施与服务（Infrastructure & serving）
- **准确含义（What it actually means）:** 将连续模型层组划分到不同设备，让微批次或请求像流水线一样通过各阶段。
- **重要性（Why it matters）:** 它让模型可以超过单设备内存，但阶段不均、流水线气泡、激活传输和故障协调会影响实际性能。
- **实际应用（In practice）:** 均衡阶段成本，选择微批次调度，测量空闲时间和互连流量，并对模型及检查点的分区元数据进行版本管理。
- **常见混淆（Common confusion）:** 流水线并行按深度划分层；张量并行划分层内部的张量运算。
- **学习课程（Learn it）:** [扩展与分布式训练](../phases/10-llms-from-scratch/05-scaling-distributed/)
- **相关术语（Related terms）:** Tensor Parallelism, Expert Parallelism, Batch Size, Model Serving
- **来源（Sources）:** [GPipe 论文](https://arxiv.org/abs/1811.06965)

<a id="planning"></a>
### 规划（Planning）
- **分类（Category）:** 智能体与工具（Agents & tools）
- **准确含义（What it actually means）:** 构造、选择或修订动作序列及依赖关系，以从当前状态推进到目标。
- **重要性（Why it matters）:** 显式计划让假设和顺序在智能体执行昂贵或不可逆动作前就可见。
- **实际应用（In practice）:** 要求简短且考虑依赖的计划，对照可用工具和权限验证，并在观测推翻假设时重新规划。
- **常见混淆（Common confusion）:** 生成计划只是提案，不证明步骤可行、充分或安全。
- **相关术语（Related terms）:** Agent State, ReAct, Orchestration, Verification Gate
- **来源（Sources）:** [LLM+P 论文](https://arxiv.org/abs/2304.11477)

<a id="postmortem"></a>
### 事后复盘（Postmortem）
- **分类（Category）:** 可靠性与运维（Reliability & operations）
- **准确含义（What it actually means）:** 记录事件影响、检测、响应、促成条件、恢复及有负责人跟进动作的持久文档，不以追责代替分析。
- **重要性（Why it matters）:** 已解决的故障仍有证据价值。记录系统条件和决策，可将单次事件转化为减少复发及响应耗时的改进。
- **实际应用（In practice）:** 从追踪和日志重建时间线，区分触发事件与促成条件，分配带期限的动作，并检查每项动作是否改变了相关控制。
- **常见混淆（Common confusion）:** 复盘不是会议记录，也不是寻找某个人的错误，应产出可测试的系统改进。
- **相关术语（Related terms）:** Incident Response, Regression Test, Audit Log, Observability
- **来源（Sources）:** [Google SRE：事后复盘文化](https://sre.google/sre-book/postmortem-culture/)

<a id="precision--recall"></a>
### 精确率与召回率（Precision & Recall）
- **分类（Category）:** 评估与安全（Evaluation & safety）
- **常见说法（What people say）:** 分类或检索质量的两个指标。
- **准确含义（What it actually means）:** 精确率问被标记项中多少是正确的，召回率问相关项中找到了多少。对于固定评分模型，改变决策阈值时，提高召回率通常降低精确率，反之亦然；更好的模型可以同时改善两者。F1 是二者的调和平均。
- **常见混淆（Common confusion）:** 合适的阈值和指标取决于各类错误的成本，以及目标类别的占比。
- **相关术语（Related terms）:** Eval Set, Semantic Search, Guardrails

<a id="prefill"></a>
### 预填充（Prefill）
- **分类（Category）:** 基础设施与服务（Infrastructure & serving）
- **别名（Aliases）:** Prefill Phase
- **准确含义（What it actually means）:** 推理的初始阶段，处理所有已提供的输入词元，产生其表示及后续自回归生成所需的注意力状态。
- **重要性（Why it matters）:** 提示词形状、排队和缓存复用影响预填充成本；其计算竞争方式与解码不同，因此显著影响启动延迟与服务调度。
- **实际应用（In practice）:** 记录提示词的词元数量和预填充延迟，区分排队与执行时间，比较缓存和未缓存前缀，并在活动解码流量旁测试长提示词。
- **常见混淆（Common confusion）:** 预填充是运行时提示词处理阶段，不是首个生成词元本身。只有预填充与排队都完成后，首词元才出现。
- **学习课程（Learn it）:** [预填充与解码分离](../phases/17-infrastructure-and-production/17-disaggregated-prefill-decode/)
- **相关术语（Related terms）:** Decode Phase, KV Cache, Time to First Token (TTFT), Chunked Prefill
- **来源（Sources）:** [Sarathi-Serve 论文](https://www.usenix.org/system/files/osdi24-agrawal.pdf); [DistServe 论文](https://arxiv.org/abs/2401.09670)

<a id="prefix-caching"></a>
### 前缀缓存（Prefix Caching）
- **分类（Category）:** 基础设施与服务（Infrastructure & serving）
- **准确含义（What it actually means）:** 跨请求复用相同且符合条件的词元前缀产生的键值缓存块，使服务运行时跳过重复前缀计算。
- **重要性（Why it matters）:** 共享系统指令、模板或文档可能消耗大量预填充工作，但只有词元序列和缓存资格都匹配时，复用才有帮助。
- **实际应用（In practice）:** 将稳定词元放在请求特有内容之前，在缓存身份中纳入模型及分词器版本，隔离租户敏感状态，监测命中率，并将驱逐视为正常现象。
- **常见混淆（Common confusion）:** 前缀缓存复用精确词元前缀的运行时注意力状态；提示词缓存是更广义的提供方或应用契约；语义缓存则为相似请求复用此前结果。
- **学习课程（Learn it）:** [推理优化](../phases/10-llms-from-scratch/12-inference-optimization/)
- **相关术语（Related terms）:** Prompt Cache, Semantic Cache, KV Cache, Paged KV Cache
- **来源（Sources）:** [SGLang 论文](https://arxiv.org/abs/2312.07104)

<a id="progressive-disclosure"></a>
### 渐进式披露（Progressive Disclosure）
- **分类（Category）:** AI 原生开发（AI-native development）
- **准确含义（What it actually means）:** 先向人或模型提供最少但有用的上下文，再在任务或证据需要时提供更深入细节。
- **重要性（Why it matters）:** 它限制上下文噪声与成本，同时让权威细节按需可用。
- **实际应用（In practice）:** 先给编程智能体仓库规则和地图，等它识别相关模块后才加载完整实现文件。
- **常见混淆（Common confusion）:** 渐进式披露是分阶段获取细节，不是故意隐瞒决策所需信息。
- **学习课程（Learn it）:** [真实仓库中的工作台](../phases/14-agent-engineering/41-workbench-for-real-repos/)
- **相关术语（Related terms）:** Context Engineering, Repository Map, Token Budget, Handoff

<a id="prompt-cache"></a>
### 提示词缓存（Prompt Cache）
- **分类（Category）:** 提示词与上下文（Prompting & context）
- **准确含义（What it actually means）:** 复用提供方或应用侧对相同或符合条件的提示词前缀所做的计算，使重复推理省去部分预处理。
- **重要性（Why it matters）:** 满足提供方缓存契约时，稳定指令和大型共享文档在反复调用中可以更便宜或更快。
- **实际应用（In practice）:** 将稳定策略文本放在请求特有内容前，监测缓存命中元数据，并将未命中视为正常情况，因为资格与有效期因提供方而异。
- **常见混淆（Common confusion）:** 提示词缓存是提供方或应用的复用契约，内部可能使用前缀缓存。前缀缓存专门复用合格的精确词元键值状态；语义缓存则为足够相似的请求复用此前结果。
- **学习课程（Learn it）:** [提示词缓存](../phases/11-llm-engineering/15-prompt-caching/)
- **相关术语（Related terms）:** Semantic Cache, Prefix Caching, KV Cache, Time to First Token (TTFT)

<a id="prompt-engineering"></a>
### 提示词工程（Prompt Engineering）
- **分类（Category）:** 提示词与上下文（Prompting & context）
- **常见说法（What people say）:** 通过措辞让模型遵循任务。
- **准确含义（What it actually means）:** 设计面向模型的指令、示例、约束和输出要求，以改善特定任务上的行为。
- **常见混淆（Common confusion）:** 提示词措辞无法弥补证据缺失、不安全权限、糟糕工具契约或缺少评估。
- **学习课程（Learn it）:** [提示词工程](../phases/11-llm-engineering/01-prompt-engineering/)
- **相关术语（Related terms）:** Context Engineering, Few-Shot, System Prompt, Structured Output

<a id="prompt-injection"></a>
### 提示词注入（Prompt Injection）
- **分类（Category）:** 评估与安全（Evaluation & safety）
- **常见说法（What people say）:** 重定向模型行为的对抗指令。
- **准确含义（What it actually means）:** 不可信内容影响模型，使其忽视预定指令、暴露数据、误用工具或执行用户目标之外动作的攻击或失效模式。内容可直接来自用户，也可间接来自检索页面、文件、消息或工具输出。
- **重要性（Why it matters）:** 模型通过同一语言通道处理指令与数据，因此仅靠输入过滤，无法可靠地区分所有恶意指令和合法内容。
- **实际应用（In practice）:** 将外部内容视为不可信，与有权威性的指令隔离，尽量缩小工具权限，重要写入要求审批，并验证输出与动作。
- **常见混淆（Common confusion）:** 提示词注入在技术机制上不同于 SQL 注入，更强的系统提示词也不是完整防御。
- **学习课程（Learn it）:** [提示词注入防御](../phases/14-agent-engineering/27-prompt-injection-defense/)
- **来源（Sources）:** [OWASP 提示词注入指南](https://genai.owasp.org/llmrisk/llm01-prompt-injection/)
- **相关术语（Related terms）:** Least Privilege, Sandbox, Approval Gate, Tool Contract

<a id="prompt-sensitivity"></a>
### 提示词敏感性（Prompt Sensitivity）
- **分类（Category）:** 提示词与上下文（Prompting & context）
- **准确含义（What it actually means）:** 在保持预期任务不变时，提示词措辞、顺序、格式或示例变化引起的模型输出或实测性能变化。
- **重要性（Why it matters）:** 只在一种有利表述下成功的系统，对真实用户可能不可靠，也可能误导评估。
- **实际应用（In practice）:** 构造语义等价的提示词变体，按案例测量方差，将变体保留在回归测试中，而不是针对一个评估集只优化一条提示词。
- **常见混淆（Common confusion）:** 敏感性不总是提示词缺陷，也可能揭示歧义、模型稳健性弱、解码不稳定或评分规则不足。
- **相关术语（Related terms）:** Prompt Engineering, Eval Set, Regression Test, Few-Shot
- **来源（Sources）:** [ProSA 论文](https://aclanthology.org/2024.findings-emnlp.108/)

<a id="provenance-attestation"></a>
### 来源证明（Provenance Attestation）
- **分类（Category）:** 安全与治理（Security & governance）
- **准确含义（What it actually means）:** 经过认证、机器可读的元数据，将交付物绑定到关于它如何、何地、何时、由哪些输入产生的声明。
- **重要性（Why it matters）:** 它让自动化策略和审阅者验证供应链声明，而不是信任未签名的构建说明。
- **实际应用（In practice）:** 在构建系统中生成证明，将其绑定到交付物摘要，以受控身份签名，并在发布前验证。
- **常见混淆（Common confusion）:** 签名识别证明者并保护完整性，不证明其中每项声明都真实。
- **相关术语（Related terms）:** Data Provenance, Reproducible Build, Audit Log, Verification Gate
- **来源（Sources）:** [SLSA 软件证明规范](https://slsa.dev/spec/v1.2/attestation-model)

<a id="purpose-limitation"></a>
### 目的限制（Purpose Limitation）
- **分类（Category）:** 安全与治理（Security & governance）
- **准确含义（What it actually means）:** 对于个人数据，只为指定且明确的目的收集和使用，除非新用途具有适当的兼容或授权依据。
- **重要性（Why it matters）:** 适用于某工作流的数据，若被悄悄复用于模型训练、评估、个性化或无关分析，可能产生隐私和治理风险。
- **实际应用（In practice）:** 随每个数据集记录目的，在访问前据此检查新流水线，隔离不兼容用途，并在目的改变时要求有文档记录的决策。
- **常见混淆（Common confusion）:** 目的限制规定为什么使用数据；数据最小化规定该目的实际需要多少数据。
- **相关术语（Related terms）:** Data Minimization, Data Classification, AI Risk Assessment, Audit Log
- **来源（Sources）:** [《通用数据保护条例》第 5(1)(b) 条](https://eur-lex.europa.eu/eli/reg/2016/679/oj)

## Q

<a id="qlora"></a>
### 量化低秩适配（QLoRA）
- **分类（Category）:** 数学与训练（Math & training）
- **常见说法（What people say）:** 基础模型量化后的 LoRA。
- **准确含义（What it actually means）:** 一种参数高效微调方法，以低比特量化表示冻结预训练基础模型，同时在需要时以较高精度计算训练 LoRA 适配器。
- **重要性（Why it matters）:** 它可减少适配大模型所需内存，但节省幅度和质量取决于模型、秩、优化器、序列长度、硬件及实现。
- **常见混淆（Common confusion）:** QLoRA 不保证特定内存占用，也不保证与全参数微调保持固定质量差距。
- **学习课程（Learn it）:** [微调与低秩适配](../phases/11-llm-engineering/08-fine-tuning-lora/)
- **来源（Sources）:** [QLoRA 论文](https://arxiv.org/abs/2305.14314)
- **相关术语（Related terms）:** LoRA (Low-Rank Adaptation), Quantization, Fine-tuning

<a id="quantization"></a>
### 量化（Quantization）
- **分类（Category）:** 模型与推理（Models & inference）
- **常见说法（What people say）:** 用更少比特存储或计算模型数值。
- **准确含义（What it actually means）:** 以更低精度格式表示权重、激活或缓存，以减少内存、带宽或计算成本。不同方法在校准、粒度、数据类型，以及转换发生在训练前、训练中还是训练后等方面存在差异。
- **常见混淆（Common confusion）:** 从一种标称位宽改为另一种，不保证端到端内存或速度同比变化，因为元数据、内核、缓存和硬件支持也有影响。
- **相关术语（Related terms）:** QLoRA, Mixed Precision, Parameter

## R

<a id="rag-retrieval-augmented-generation"></a>
### 检索增强生成（RAG (Retrieval-Augmented Generation)）
- **分类（Category）:** 检索与生成（Retrieval & generation）
- **常见说法（What people say）:** 模型利用检索知识回答问题。
- **准确含义（What it actually means）:** 一种系统模式：检索与请求相关的证据，在生成模型回答或行动之前向其提供选定内容。检索可使用词法、向量、结构化或混合方法。
- **重要性（Why it matters）:** RAG 可提供最新或私有证据而无需写入模型权重，但检索与依据关联必须分开评估。
- **名称由来（Why it's called that）:** “检索”寻找证据，“增强”将选定证据加入上下文，“生成”产生响应。
- **学习课程（Learn it）:** [检索增强生成](../phases/11-llm-engineering/06-rag/)
- **来源（Sources）:** [检索增强生成论文](https://arxiv.org/abs/2005.11401)
- **相关术语（Related terms）:** Grounding, Hybrid Retrieval, Reranker, Hallucination

<a id="rate-limit"></a>
### 速率限制（Rate Limit）
- **分类（Category）:** AI 原生开发（AI-native development）
- **准确含义（What it actually means）:** 在明确的时间或容量窗口内，限制请求、词元、并发工作或其他资源的策略。
- **重要性（Why it matters）:** 它保护提供方和自己的系统，避免过载、费用失控和不公平资源使用。
- **实际应用（In practice）:** 执行每租户词元与并发限制，读取提供方重试元数据，并以可预测方式排队或拒绝超量工作。
- **常见混淆（Common confusion）:** 速率限制控制允许用量；背压在系统内传递下游容量约束。
- **相关术语（Related terms）:** Backpressure, Retry with Backoff, Circuit Breaker

<a id="react"></a>
### 推理与行动交替（ReAct）
- **分类（Category）:** 智能体与工具（Agents & tools）
- **准确含义（What it actually means）:** 在决定下一步之前，交替进行任务推理、具体动作及环境返回观测的智能体模式。
- **重要性（Why it matters）:** 环境反馈可以纠正假设，为后续决策提供依据，而不迫使模型仅靠内部生成完成整个任务。
- **实际应用（In practice）:** 提供少量带类型定义的工具，返回简洁观测，限制循环次数，并验证最终交付物，而不是存储私有推理追踪。
- **常见混淆（Common confusion）:** ReAct 是提示与控制模式，不保证自主性、正确性或安全工具使用。
- **相关术语（Related terms）:** Agent, Function Calling, Planning, Grounding
- **来源（Sources）:** [ReAct 论文](https://arxiv.org/abs/2210.03629)

<a id="readiness-probe"></a>
### 就绪探针（Readiness Probe）
- **分类（Category）:** 可靠性与运维（Reliability & operations）
- **准确含义（What it actually means）:** 向流量路由层说明服务实例当前是否能接受请求的诊断。
- **重要性（Why it matters）:** 进程可能存活，但模型尚未加载、依赖不可用或预热未完成，过早发送流量会造成可避免的失败。
- **实际应用（In practice）:** 检查提供服务所必需的最少依赖，在启动和排空期间标为未就绪，保持探针开销低，不要仅因未就绪就重启进程。
- **常见混淆（Common confusion）:** 就绪状态控制是否有资格接收流量；存活检查决定是否重启进程；二者都不证明每次模型响应正确。
- **学习课程（Learn it）:** [生产级大语言模型应用](../phases/11-llm-engineering/13-production-app/)
- **相关术语（Related terms）:** Autoscaling, Model Serving, Availability, Graceful Degradation
- **来源（Sources）:** [Kubernetes 存活、就绪与启动探针](https://kubernetes.io/docs/concepts/configuration/liveness-readiness-startup-probes/)

<a id="recallk"></a>
### 前若干项召回率（Recall@K）
- **分类（Category）:** 检索与生成（Retrieval & generation）
- **准确含义（What it actually means）:** 对单个查询，Recall@K 为 `|relevant items intersecting the top k| / |relevant items|`。数据集分数按明确规则聚合各查询的值。
- **重要性（Why it matters）:** 它说明检索阶段是否为下游生成或重排序提供了足够相关候选项。
- **实际应用（In practice）:** 定义相关性判定、k、聚合方法，以及没有被判定为相关项目的查询的处理策略，再检查完全没有召回证据的查询。
- **常见混淆（Common confusion）:** Recall@K 高不代表首个结果好、排序合理或最终答案有依据。没有相关项的查询分母为零，必须明确排除或赋值策略。
- **相关术语（Related terms）:** Precision & Recall, Eval Set, Reranker, Approximate Nearest Neighbor (ANN)
- **来源（Sources）:** [BEIR 基准论文](https://openreview.net/forum?id=wCu6T5xFjeJ)

<a id="reciprocal-rank-fusion-rrf"></a>
### 倒数排名融合（Reciprocal Rank Fusion (RRF)）
- **分类（Category）:** 检索与生成（Retrieval & generation）
- **准确含义（What it actually means）:** 一种排名融合方法，将多个结果列表合并，各项目从各列表获得的贡献随其排名降低，并对这些贡献求和。
- **重要性（Why it matters）:** 它能合并词法、稠密或多查询排名，无须假设原始分数具有相同尺度。
- **实际应用（In practice）:** 独立检索候选列表，按稳定文档身份去重，应用统一且版本化的融合常数，并与各单独检索器比较评估。
- **常见混淆（Common confusion）:** RRF 合并排名，而不是嵌入或相关性分数，也不能找回所有输入列表中都不存在的项目。
- **相关术语（Related terms）:** Hybrid Retrieval, BM25, Dense Retrieval, Reranker
- **来源（Sources）:** [倒数排名融合优于孔多塞法与单独排名学习方法](https://dl.acm.org/doi/10.1145/1571941.1572114)

<a id="red-teaming"></a>
### 红队测试（Red Teaming）
- **分类（Category）:** 安全与治理（Security & governance）
- **准确含义（What it actually means）:** 由获授权测试者依据有文档记录的目标、威胁假设、案例和证据寻找失效的结构化对抗测试过程。
- **重要性（Why it matters）:** 普通质量测试很少探索系统在操纵、滥用、目标冲突或蓄意绕过控制时的行为。
- **实际应用（In practice）:** 从威胁模型推导攻击，在隔离环境中执行，记录可复现案例，分层修复，并将确认的失败转成回归评估。
- **常见混淆（Common confusion）:** 越狱提示词列表不构成完整红队计划，红队测试也不能证明不存在未知失败。
- **相关术语（Related terms）:** Threat Model, Guardrails, Prompt Injection, Eval Set
- **来源（Sources）:** [使用语言模型对语言模型进行红队测试](https://arxiv.org/abs/2202.03286)

<a id="regression-test"></a>
### 回归测试（Regression Test）
- **分类（Category）:** AI 原生开发（AI-native development）
- **准确含义（What it actually means）:** 保护已知正常行为的可重复检查，尤其用于代码、提示词、模型、检索或工具变化之后。
- **重要性（Why it matters）:** AI 系统变更可能改善平均质量，却悄悄重新引入先前已修复的失败。
- **实际应用（In practice）:** 将已纠正的提示词注入事件转为永久评估案例，要求下次部署前必须通过。
- **常见混淆（Common confusion）:** 回归测试保护特定预期行为；广泛基准测试估计更广任务分布上的表现。
- **学习课程（Learn it）:** [评估驱动的智能体开发](../phases/14-agent-engineering/30-eval-driven-agent-development/)
- **相关术语（Related terms）:** Eval Set, Verification Gate, Patch, Evaluation (Eval)

<a id="relu"></a>
### 修正线性单元（ReLU）
- **分类（Category）:** 数学与训练（Math & training）
- **常见说法（What people say）:** 简单的激活函数。
- **准确含义（What it actually means）:** 即修正线性单元（Rectified Linear Unit），定义为 `f(x) = max(0, x)`。它计算开销低，正值分支不饱和，但负输入上的零梯度可能导致单元不再激活。
- **相关术语（Related terms）:** Activation Function, Gradient, CNN (Convolutional Neural Network)

<a id="repository-instructions"></a>
### 仓库指令（Repository Instructions）
- **分类（Category）:** AI 原生开发（AI-native development）
- **准确含义（What it actually means）:** 纳入版本控制的指导，告诉编程智能体仓库如何组织、适用哪些命令与约定、应遵守哪些边界，以及如何验证工作。
- **重要性（Why it matters）:** 它将反复依赖口耳相传的知识转为随代码流转的本地上下文，并可按子项目细化。
- **实际应用（In practice）:** 在仓库根目录保留 `AGENTS.md`，为子目录添加范围更窄的文件，写明准确的构建、测试、生成文件、安全和贡献规则。
- **常见混淆（Common confusion）:** 仓库指令补充源代码和面向人的文档，不覆盖用户当前请求，也不保证智能体正确遵循。
- **相关术语（Related terms）:** Repository Map, Scope Contract, Coding Agent, Progressive Disclosure
- **来源（Sources）:** [AGENTS.md 规范](https://agents.md/)

<a id="repository-map"></a>
### 仓库地图（Repository Map）
- **分类（Category）:** AI 原生开发（AI-native development）
- **准确含义（What it actually means）:** 一份精简且持续维护的仓库说明，涵盖重要目录、所有权边界、入口点、构建命令、测试、生成文件及本地指令。
- **重要性（Why it matters）:** 它帮助编码智能体（Coding Agent）在加载大型文件或误改子系统之前找到正确证据。
- **实际应用（In practice）:** 根据目录树和清单生成索引，再补充关于模块边界与验证命令的权威说明。
- **常见混淆（Common confusion）:** 原始文件树展示名称；仓库地图解释哪些路径重要，以及它们与任务的关系。
- **学习课程（Learn it）:** [仓库记忆与状态](../phases/14-agent-engineering/34-repo-memory-and-state/)
- **相关术语（Related terms）:** Coding Agent, Progressive Disclosure, Scope Contract, Context Engineering

<a id="reproducible-build"></a>
### 可复现构建（Reproducible Build）
- **分类（Category）:** AI 原生开发（AI-native development）
- **准确含义（What it actually means）:** 依据声明的源代码、环境和指令，能够由独立执行者重新运行，并生成逐位一致的指定产物的构建。
- **重要性（Why it matters）:** 它使产物能够在原始构建机器或智能体之外得到验证，并暴露隐藏的构建输入。
- **实际应用（In practice）:** 固定工具链与依赖版本，消除时间戳和不稳定的排序，记录环境，然后比较独立重建产物的摘要。
- **常见混淆（Common confusion）:** 构建成功两次是可重复执行的证据，但可复现性要求满足声明的独立条件，且输出完全一致。
- **相关术语（Related terms）:** Repository Instructions, Verification Gate, Provenance Attestation, Software Bill of Materials (SBOM)
- **来源（Sources）:** [可复现构建的定义](https://reproducible-builds.org/docs/definition/)

<a id="reranker"></a>
### 重排序器（Reranker）
- **分类（Category）:** 检索与生成（Retrieval & generation）
- **准确含义（What it actually means）:** 第二阶段的模型或评分函数，通过更丰富的查询与候选项比较，对规模较小的候选集重新排序。
- **重要性（Why it matters）:** 快速的第一阶段检索尽可能扩大候选覆盖面，而重排序能够改善进入有限上下文窗口的证据质量。
- **实际应用（In practice）:** 使用混合检索（Hybrid Retrieval）获取 50 个候选项，以交叉编码器（Cross-Encoder）为每个查询与文档对评分，再将排名最高的 5 个有依据的文本块送入生成阶段。
- **常见混淆（Common confusion）:** 重排序器不会搜索整个语料库，只会重新排列检索已经找到的候选项。
- **相关术语（Related terms）:** Hybrid Retrieval, Semantic Search, RAG (Retrieval-Augmented Generation)

<a id="retry-budget"></a>
### 重试预算（Retry Budget）
- **分类（Category）:** 可靠性与运维（Reliability & operations）
- **准确含义（What it actually means）:** 对重试流量的限制，通常相对于原始请求数量或按时间窗口表达，用于防止重试无限消耗容量。
- **重要性（Why it matters）:** 当依赖项变慢或失效时，不受约束的重试会在系统最缺乏余量的时候成倍增加负载。
- **实际应用（In practice）:** 将重试与首次尝试分别计数，按服务和租户设置上限，遵守截止时间，采用带抖动的退避，并停止重试非暂时性故障或非幂等操作的失败。
- **常见混淆（Common confusion）:** 重试预算限制额外尝试次数；错误预算（Error Budget）衡量服务等级目标（Service Level Objective，SLO）允许的用户可见不可靠程度。
- **相关术语（Related terms）:** Retry with Backoff, Error Budget, Rate Limit, Admission Control
- **来源（Sources）:** [Google 站点可靠性工程：应对级联故障](https://sre.google/sre-book/addressing-cascading-failures/)

<a id="retry-with-backoff"></a>
### 退避重试（Retry with Backoff）
- **分类（Category）:** AI 原生开发（AI-native development）
- **准确含义（What it actually means）:** 对暂时失败的操作进行重试，每次等待逐渐延长，通常还加入随机抖动并设置严格的重试次数上限。
- **重要性（Why it matters）:** 立即同步重试可能加剧故障、消耗速率配额，并重复产生副作用。
- **实际应用（In practice）:** 提供方请求超时后，按有上限的指数延迟重试，遵循服务端的重试指引，并为任何写操作复用同一个幂等键（Idempotency Key）。
- **常见混淆（Common confusion）:** 不要重试永久性的校验错误或权限错误；没有防重复策略时，也不要重试非幂等操作。
- **相关术语（Related terms）:** Idempotency, Rate Limit, Circuit Breaker, Backpressure

<a id="reviewer-agent"></a>
### 审查智能体（Reviewer Agent）
- **分类（Category）:** AI 原生开发（AI-native development）
- **准确含义（What it actually means）:** 负责依据明确标准检查另一个智能体的产物或决策，并返回问题或结论的智能体。
- **重要性（Why it matters）:** 角色分离有助于发现遗漏，但前提是审查者获得独立证据和具体的评分准则。
- **实际应用（In practice）:** 一个智能体生成补丁后，将差异、范围契约、仓库规则和测试输出交给独立审查者，并要求给出定位到具体行的问题。
- **常见混淆（Common confusion）:** 第二次模型调用并不自动意味着独立或正确；共享上下文、模型偏差和模糊标准可能重现同样的错误。
- **学习课程（Learn it）:** [审查智能体](../phases/14-agent-engineering/39-reviewer-agent/)
- **相关术语（Related terms）:** Coding Agent, Verification Gate, Scope Contract, LLM-as-a-Judge

<a id="rlhf-reinforcement-learning-from-human-feedback"></a>
### 基于人类反馈的强化学习（RLHF (Reinforcement Learning from Human Feedback)）
- **分类（Category）:** 数学与训练（Math & training）
- **常见说法（What people say）:** 依据人类偏好训练模型。
- **准确含义（What it actually means）:** 一类利用人类反馈学习奖励或偏好信号，再据此优化模型策略的流水线。具体实现各不相同，不一定使用同一种强化学习（Reinforcement Learning）算法。
- **常见混淆（Common confusion）:** 基于人类反馈的强化学习（RLHF）优化的是从收集到的反馈中学到的代理目标，并不保证对每个用户或情境都实现广泛的对齐。
- **学习课程（Learn it）:** [基于人类反馈的强化学习](../phases/10-llms-from-scratch/07-rlhf/)
- **来源（Sources）:** [InstructGPT 论文](https://arxiv.org/abs/2203.02155)
- **相关术语（Related terms）:** DPO (Direct Preference Optimization), SFT (Supervised Fine-Tuning), Alignment

<a id="rollback"></a>
### 回滚（Rollback）
- **分类（Category）:** 可靠性与运维（Reliability & operations）
- **准确含义（What it actually means）:** 当当前发布违反运维、质量或安全标准时，恢复到先前已知的部署或配置。
- **重要性（Why it matters）:** 即使通过部署前评估，智能体和模型变更仍可能在生产环境失效，因此必须在发布前设计恢复方案。
- **实际应用（In practice）:** 保留有版本记录的产物和配置，定义回滚触发条件，演练命令及其数据影响，并在恢复后验证服务健康状态。
- **常见混淆（Common confusion）:** 代码回滚不会自动撤销数据库迁移、外部副作用、缓存输出，或问题版本写入的数据。
- **相关术语（Related terms）:** Canary Release, Checkpoint, Regression Test, Durable Execution
- **来源（Sources）:** [Kubernetes 部署：回滚](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/#rolling-back-a-deployment)

<a id="rouge"></a>
### 面向摘要评估的召回导向指标（ROUGE）
- **分类（Category）:** 评估与安全（Evaluation & safety）
- **常见说法（What people say）:** 一种常用于摘要的参考文本重叠度指标。
- **准确含义（What it actually means）:** 一组使用词元片段（n-gram）重叠或最长公共子序列等单位，将生成文本与参考文本进行比较的指标。
- **常见混淆（Common confusion）:** 表面重叠可能漏掉语义等价的表达，也可能奖励照抄措辞，却无法证明事实质量。
- **相关术语（Related terms）:** Evaluation (Eval), Precision & Recall, LLM-as-a-Judge

## S

<a id="sandbox"></a>
### 沙箱（Sandbox）
- **分类（Category）:** 智能体与工具（Agents & tools）
- **准确含义（What it actually means）:** 一种隔离执行环境，限制智能体对文件、进程、网络目标、凭据和宿主资源的访问。
- **重要性（Why it matters）:** 生成的代码和工具调用可能有误或带有恶意。隔离能够限制其影响范围，使一次性验证环境切实可行。
- **实际应用（In practice）:** 在临时容器中运行测试，使用只读基础环境、限定范围的可写工作区，不提供生产凭据，并明确设置网络允许列表。
- **常见混淆（Common confusion）:** 沙箱降低影响，但不能证明其中的代码正确或无害。
- **学习课程（Learn it）:** [生产级智能体运行时](../phases/14-agent-engineering/29-production-runtimes/)
- **相关术语（Related terms）:** Least Privilege, Approval Gate, Coding Agent, Guardrails

<a id="saturation"></a>
### 饱和度（Saturation）
- **分类（Category）:** 可靠性与运维（Reliability & operations）
- **准确含义（What it actually means）:** 受限资源或服务的容量被耗尽的程度，包括无法及时开始执行的排队工作。
- **重要性（Why it matters）:** 即使利用率看起来尚可，内存、加速器槽位、队列深度或下游配额也可能已经限制有效吞吐量。
- **实际应用（In practice）:** 识别每种关键资源，测量正在执行和等待的工作，将饱和度与尾延迟及错误关联，并在队列进入不稳定增长状态之前告警。
- **常见混淆（Common confusion）:** 饱和度不是一个通用百分比；瓶颈资源及其排队行为取决于工作负载和架构。
- **相关术语（Related terms）:** Observability, Autoscaling, Backpressure, Tail Latency
- **来源（Sources）:** [Google 站点可靠性工程：监控分布式系统](https://sre.google/sre-book/monitoring-distributed-systems/)

<a id="scope-contract"></a>
### 范围契约（Scope Contract）
- **分类（Category）:** AI 原生开发（AI-native development）
- **准确含义（What it actually means）:** 明确任务目标、允许及禁止修改的范围、预期产物、验证要求和停止条件的具体约定。
- **重要性（Why it matters）:** 它防止智能体将小范围修复扩大为难以审查的重构，或在没有证据时声称完成。
- **实际应用（In practice）:** 明确规定只能修改解析器模块及其测试，公共应用程序接口（Application Programming Interface，API）必须保持兼容，而且指定测试套件必须通过。
- **常见混淆（Common confusion）:** 任务描述说明你想要什么；范围契约还规定边界与证明要求。
- **学习课程（Learn it）:** [范围契约](../phases/14-agent-engineering/36-scope-contracts/)
- **相关术语（Related terms）:** Coding Agent, Patch, Verification Gate, Handoff

<a id="self-attention"></a>
### 自注意力（Self-Attention）
- **分类（Category）:** 模型与推理（Models & inference）
- **常见说法（What people say）:** 由词元决定其他哪些词元重要。
- **准确含义（What it actually means）:** 查询、键和值均由同一序列表示导出的注意力机制。对缩放后的相似度分数进行归一化，再据此组合值，同时遵守因果、填充、局部或其他掩码约束。
- **重要性（Why it matters）:** 它构建依赖上下文的词元表示，但允许使用的注意力连接模式取决于架构。
- **常见混淆（Common confusion）:** 并非每个词元总能关注所有其他词元；因果模型与稀疏模型会有意限制连接。
- **学习课程（Learn it）:** [从零实现自注意力](../phases/07-transformers-deep-dive/02-self-attention-from-scratch/)
- **相关术语（Related terms）:** Attention, Transformer, Context Window

<a id="semantic-cache"></a>
### 语义缓存（Semantic Cache）
- **分类（Category）:** AI 原生开发（AI-native development）
- **准确含义（What it actually means）:** 当新请求在选定的表示方式和阈值下被判定为足够相似时，复用先前结果的缓存。
- **重要性（Why it matters）:** 它能够降低重复意图请求的延迟和成本，但错误匹配可能返回过时或不适合当前用户的输出。
- **实际应用（In practice）:** 按归一化后的意图缓存低风险常见问题答案，将租户和策略版本纳入键，并对个性化或时间敏感请求绕过缓存。
- **常见混淆（Common confusion）:** 语义相似不保证两个请求具有相同的正确答案。语义缓存复用先前结果；前缀缓存（Prefix Caching）复用精确词元对应的键值（Key-Value，KV）状态；提示词缓存（Prompt Caching）则遵循提供方或应用的适用规则。
- **相关术语（Related terms）:** Prompt Cache, Embedding, Cost per Successful Task, Grounding

<a id="semantic-search"></a>
### 语义搜索（Semantic Search）
- **分类（Category）:** 检索与生成（Retrieval & generation）
- **常见说法（What people say）:** 按含义而非精确字词搜索。
- **准确含义（What it actually means）:** 将查询和候选项表示在嵌入空间（Embedding Space）中，并使用向量相似度函数对候选项排序的检索方式。
- **重要性（Why it matters）:** 它能够检索改写表达和概念上相关的文本，但精确标识符与罕见字符串仍可能需要词法搜索（Lexical Search）。
- **相关术语（Related terms）:** Embedding, Hybrid Retrieval, Vector Database, Reranker

<a id="separation-of-duties"></a>
### 职责分离（Separation of Duties）
- **分类（Category）:** 安全与治理（Security & governance）
- **准确含义（What it actually means）:** 将相互冲突的职责或权限分配给独立角色，使单个主体无法在缺少另一个授权决策的情况下完成高风险操作。
- **重要性（Why it matters）:** 遭到入侵的账户或出错的智能体不应能够独自提出、批准、执行并掩盖同一项影响重大的变更。
- **实际应用（In practice）:** 将产物创建与发布审批分开，使用不同身份，在审计日志中保留双方决策，并制定需事后复核的紧急访问机制。
- **常见混淆（Common confusion）:** 职责分离关注相互冲突的权限，而不只是把工作分给共享同一凭据的多个人或智能体。
- **相关术语（Related terms）:** Approval Gate, Reviewer Agent, Audit Log, Least Privilege
- **来源（Sources）:** [美国国家标准与技术研究院特别出版物 800-53 第 5 次修订版](https://csrc.nist.gov/pubs/sp/800/53/r5/upd1/final)

<a id="service-level-indicator-sli"></a>
### 服务等级指标（Service Level Indicator (SLI)）
- **分类（Category）:** 可靠性与运维（Reliability & operations）
- **准确含义（What it actually means）:** 在明确且与用户相关的边界上，对服务行为进行定量衡量的指标，例如成功请求比例或延迟低于阈值的比例。
- **重要性（Why it matters）:** 只有明确观测行为、符合统计条件的事件和测量位置，可靠性讨论才能转化为行动。
- **实际应用（In practice）:** 定义分子、分母、排除项、数据源和聚合窗口，再验证该指标确实跟踪用户实际体验到的结果。
- **常见混淆（Common confusion）:** 服务等级指标（SLI）是测量值；服务等级目标（SLO）是在指定时段内施加于该测量值的目标。
- **相关术语（Related terms）:** Service Level Objective (SLO), Availability, Tail Latency, Observability
- **来源（Sources）:** [Google 站点可靠性工程：服务等级目标](https://sre.google/sre-book/service-level-objectives/)

<a id="service-level-objective-slo"></a>
### 服务等级目标（Service Level Objective (SLO)）
- **分类（Category）:** 可靠性与运维（Reliability & operations）
- **准确含义（What it actually means）:** 针对指定总体和测量窗口内的服务等级指标设定的目标范围或阈值。
- **重要性（Why it matters）:** 它将预期用户结果转化为监控、容量、发布风险和事件决策的运维边界。
- **实际应用（In practice）:** 选择用户关心的指标，依据产品需求而非当前表现设定目标，定义窗口及排除项，并配套错误预算策略。
- **常见混淆（Common confusion）:** 服务等级目标（SLO）是内部可靠性目标；具有合同性质的服务等级协议（Service-Level Agreement）可能包含补救措施，并采用不同定义。
- **学习课程（Learn it）:** [推理指标与有效吞吐量](../phases/17-infrastructure-and-production/08-inference-metrics-goodput/)
- **相关术语（Related terms）:** Service Level Indicator (SLI), Error Budget, Availability, Goodput
- **来源（Sources）:** [Google 站点可靠性工程：服务等级目标](https://sre.google/sre-book/service-level-objectives/)

<a id="sft-supervised-fine-tuning"></a>
### 监督微调（SFT (Supervised Fine-Tuning)）
- **分类（Category）:** 数学与训练（Math & training）
- **常见说法（What people say）:** 利用示例输入与期望输出进行训练。
- **准确含义（What it actually means）:** 使用成对的输入和期望响应，对预训练模型进行微调，使其在训练分布下学习示例展示的行为。
- **常见混淆（Common confusion）:** 监督微调（SFT）能够适配聊天之外的许多行为，而示例质量决定哪些行为得到强化。
- **相关术语（Related terms）:** Fine-tuning, DPO (Direct Preference Optimization), RLHF (Reinforcement Learning from Human Feedback)

<a id="shadow-traffic"></a>
### 影子流量（Shadow Traffic）
- **分类（Category）:** 可靠性与运维（Reliability & operations）
- **准确含义（What it actually means）:** 将实时请求流量的副本发送给候选系统进行观察，而候选响应不进入用户主响应路径。由于副本请求仍会执行，必须隔离其副作用。
- **重要性（Why it matters）:** 它使候选系统接触真实输入形态和负载，同时限制对用户的影响，因此能够暴露合成测试中没有出现的故障。
- **实际应用（In practice）:** 移除敏感字段或对其进行令牌化处理，将工具和依赖项路由至沙箱目标或无操作目标，在能力边界阻止写入，保留请求关联，并防止影子负载与用户流量争用资源。
- **常见混淆（Common confusion）:** 候选响应不进入主路径并不意味着执行没有副作用。金丝雀发布（Canary Release）不同之处在于，它让候选系统承接受控比例的流量，直接服务真实用户。
- **学习课程（Learn it）:** [影子流量、金丝雀与渐进式交付](../phases/17-infrastructure-and-production/20-shadow-canary-progressive/)
- **相关术语（Related terms）:** Canary Release, Evaluation (Eval), Trace, Model Serving
- **来源（Sources）:** [Istio 流量镜像](https://istio.io/latest/docs/tasks/traffic-management/mirroring/)

<a id="shared-embedding-space"></a>
### 共享嵌入空间（Shared Embedding Space）
- **分类（Category）:** 多模态系统（Multimodal systems）
- **准确含义（What it actually means）:** 一种公共向量空间，使不同模态的表示可以通过同一个相似度函数进行比较。
- **重要性（Why it matters）:** 它支持跨模态检索与匹配，例如以文本查找图像，而不要求双方具有相同的原始表示。
- **实际应用（In practice）:** 有计划地利用配对样本和非配对负样本进行训练，在目标函数要求时归一化向量，评估两个方向的检索效果，并检查各子群体与语言的表现。
- **常见混淆（Common confusion）:** 向量维度相同并不意味着形成了共享语义空间；训练目标和数据必须建立跨模态可比性。
- **学习课程（Learn it）:** [对比语言图像预训练](../phases/12-multimodal-ai/02-clip-contrastive-pretraining/)
- **相关术语（Related terms）:** Embedding, Cosine Similarity, Modality Alignment, Semantic Search
- **来源（Sources）:** [通过自然语言监督学习可迁移的视觉模型](https://proceedings.mlr.press/v139/radford21a.html)

<a id="skill-bundle"></a>
### 技能包（Skill Bundle）
- **分类（Category）:** 智能体与工具（Agents & tools）
- **准确含义（What it actually means）:** 完整的可安装技能目录，包括 `SKILL.md` 以及工作流所需的全部参考资料、脚本、资源、测试夹具或配套文件。
- **重要性（Why it matters）:** 只复制入口文件，可能使指令看似有效却指向缺失资源，或丢失工作流依赖的确定性代码。
- **实际应用（In practice）:** 将目录树作为整体安装，记录哈希值和源修订版本，验证安装后的副本，并在替换现有技能包前展示冲突。
- **常见混淆（Common confusion）:** `SKILL.md` 是入口，不一定是完整产物。
- **学习课程（Learn it）:** [技能评估、打包与可移植性](../phases/13-tools-and-protocols/27-skill-evals-packaging-and-portability/)
- **相关术语（Related terms）:** Agent Skill, Skill Catalog, Reproducible Build, Provenance Attestation
- **来源（Sources）:** [智能体技能规范](https://agentskills.io/specification)

<a id="skill-catalog"></a>
### 技能目录（Skill Catalog）
- **分类（Category）:** 智能体与工具（Agents & tools）
- **准确含义（What it actually means）:** 模型可见的、符合条件的技能精简清单，通常包含名称、描述和内部源标识符等路由元数据，而不是每个技能的完整正文。
- **重要性（Why it matters）:** 目录使智能体不必把所有已安装的软件包都加载到工作上下文，也能发现相关流程。
- **实际应用（In practice）:** 先验证软件包，应用明确的同名处理策略，测量序列化目录的预算，并为被缩短、省略或遮蔽的条目保留诊断信息。
- **常见混淆（Common confusion）:** 目录条目表示技能可被发现，并不表示其正文已经激活或其工具已经获得授权。
- **学习课程（Learn it）:** [技能发现与渐进披露](../phases/13-tools-and-protocols/24-skill-discovery-and-progressive-disclosure/)
- **相关术语（Related terms）:** Skill Discovery, Skill Invocation, Progressive Disclosure, Token Budget
- **来源（Sources）:** [智能体技能规范](https://agentskills.io/specification)

<a id="skill-discovery"></a>
### 技能发现（Skill Discovery）
- **分类（Category）:** 智能体与工具（Agents & tools）
- **准确含义（What it actually means）:** 一种运行时流水线：搜索已配置的根目录，识别候选技能目录，验证其打包契约，附加作用域和来源信息，解决冲突，并发布符合条件的目录条目。
- **重要性（Why it matters）:** 确定性的发现过程使缺失、格式错误、被遮蔽及不安全的软件包在模型路由开始之前就能得到诊断。
- **实际应用（In practice）:** 声明搜索范围和同名处理方式，决定如何处理符号链接，拒绝越界资源访问，并记录每个候选项被接受或拒绝的原因。
- **常见混淆（Common confusion）:** 技能发现不是不受限制地递归搜索名为 `SKILL.md` 的文件；安装位置和优先级属于运行时策略。
- **学习课程（Learn it）:** [技能发现与渐进披露](../phases/13-tools-and-protocols/24-skill-discovery-and-progressive-disclosure/)
- **相关术语（Related terms）:** Skill Catalog, Skill Bundle, Progressive Disclosure, Trust Boundary
- **来源（Sources）:** [智能体技能客户端实现指南](https://agentskills.io/client-implementation/adding-skills-support)

<a id="skill-invocation"></a>
### 技能调用（Skill Invocation）
- **分类（Category）:** 智能体与工具（Agents & tools）
- **准确含义（What it actually means）:** 由运行时协调的过程：符合条件的人、模型、应用或其他技能选择某个技能，并使其指令进入工作上下文。
- **重要性（Why it matters）:** 用户的显式访问、模型的隐式路由、激活、参数绑定、工具权限和执行是独立决策，具有不同的失败模式。
- **实际应用（In practice）:** 定义调用主体策略，使用正例请求与近似但不匹配的请求评估描述，记录所选技能包身份，并将宿主特定的调用字段保留在经过测试的适配器中。
- **常见混淆（Common confusion）:** 调用会激活指令，但不会自动执行命令，也不会绕过审批和沙箱策略。
- **学习课程（Learn it）:** [技能调用与路由](../phases/13-tools-and-protocols/25-skill-invocation-and-routing/)
- **相关术语（Related terms）:** Agent Skill, Skill Catalog, Approval Gate, Sandbox
- **来源（Sources）:** [评估智能体技能](https://agentskills.io/skill-creation/evaluating-skills)

<a id="softmax"></a>
### 归一化指数函数（Softmax）
- **分类（Category）:** 数学与训练（Math & training）
- **常见说法（What people say）:** 将未归一化分数（Logits）转换为归一化正值的函数。
- **准确含义（What it actually means）:** 定义为 `softmax(x_i) = exp(x_i) / sum(exp(x_j))` 的函数，实现时使用数值稳定化处理。其输出为正数且总和为一，因此可用于参数化类别分布（Categorical Distribution）。
- **常见混淆（Common confusion）:** 归一化指数函数（Softmax）的数值并不自动成为经过校准的、关于现实世界正确性的概率。
- **相关术语（Related terms）:** Temperature, Cross-Entropy, Attention

<a id="software-bill-of-materials-sbom"></a>
### 软件物料清单（Software Bill of Materials (SBOM)）
- **分类（Category）:** 安全与治理（Security & governance）
- **别名（Aliases）:** SBOM
- **准确含义（What it actually means）:** 与产品或产物相关的软件组件及其关系的结构化清单，通常包括版本、供应方、许可证和标识符。
- **重要性（Why it matters）:** 软件发生变化或出现漏洞时，需要组件清单来评估受影响的依赖、许可证义务以及供应链风险暴露。
- **实际应用（In practice）:** 在可信构建期间生成软件物料清单（SBOM），将其绑定到发布产物，在策略检查中验证，并在依赖或打包方式变化时更新。
- **常见混淆（Common confusion）:** 软件物料清单是清单，而不是组件安全、许可证合规或实际存在的证明，除非其生成过程和来源可信。
- **相关术语（Related terms）:** Provenance Attestation, Reproducible Build, Data Provenance, Audit Log
- **来源（Sources）:** [软件包数据交换规范 3.0.1](https://spdx.github.io/spdx-spec/v3.0/)

<a id="speculative-decoding"></a>
### 推测解码（Speculative Decoding）
- **分类（Category）:** 模型与推理（Models & inference）
- **准确含义（What it actually means）:** 一种推理方法：成本更低的草稿过程提出多个词元，目标模型则并行计算这些草稿位置的分数。在精确采样变体中，接受与修正规则保持目标模型的输出分布。
- **重要性（Why it matters）:** 当草稿被接受时，它可以减少目标模型的串行解码工作，而不需要改变目标模型已训练的权重。
- **实际应用（In practice）:** 在真实提示词上测量接受率和端到端延迟，计入草稿模型的开销，并验证实现保持了预期的解码分布。
- **常见混淆（Common confusion）:** 推测解码不是普通的模型路由或未经验证的自动补全。精确变体通过接受与修正保持目标分布，而近似变体可能牺牲这一保证来换取速度。
- **相关术语（Related terms）:** Autoregressive, KV Cache, Decoding Strategy, Tokens per Second (TPS)
- **来源（Sources）:** [通过推测解码实现变换器快速推理](https://proceedings.mlr.press/v202/leviathan23a.html)

<a id="stateless-mcp"></a>
### 无状态模型上下文协议（Stateless MCP）
- **分类（Category）:** 智能体与工具（Agents & tools）
- **准确含义（What it actually means）:** 模型上下文协议（MCP）2026-07-28 的请求模型：每个请求在 `params._meta` 中携带协议版本和客户端能力，结果则携带显式的 `resultType`；协议状态不以初始化握手、连接或 `Mcp-Session-Id` 为索引。
- **重要性（Why it matters）:** 任何工作进程都可以依据请求内容及授权上下文进行验证和处理，从而避免隐藏的连接亲和性，使水平路由更容易分析。
- **实际应用（In practice）:** 实现 `server/discover`，在每次调用时重新构建请求元数据，对照 JSON-RPC 正文校验传输头，并在需要连续性时将服务器签发的应用句柄作为普通工具参数传递。
- **常见混淆（Common confusion）:** 无状态模型上下文协议移除的是协议会话，而不是应用状态、传输连接、流式响应、任务或显式句柄。
- **学习课程（Learn it）:** [模型上下文协议基础](../phases/13-tools-and-protocols/06-mcp-fundamentals/)
- **相关术语（Related terms）:** MCP (Model Context Protocol), Multi Round-Trip Request (MRTR), Tool Contract, Idempotency
- **来源（Sources）:** [模型上下文协议 2026-07-28 关键变更](https://modelcontextprotocol.io/specification/2026-07-28/changelog); [模型上下文协议可流式传输的超文本传输协议](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http)

<a id="stochastic-gradient-descent-sgd"></a>
### 随机梯度下降（Stochastic Gradient Descent (SGD)）
- **分类（Category）:** 数学与训练（Math & training）
- **别名（Aliases）:** SGD
- **准确含义（What it actually means）:** 一类优化器，使用从采样示例或小批量估计的梯度更新参数，而非使用完整训练数据集的梯度。
- **重要性（Why it matters）:** 它是理解梯度噪声、动量、批量缩放及现代训练所用自适应优化器的基础。
- **实际应用（In practice）:** 记录批量采样方式、学习率、使用的动量和调度策略，再在相同更新次数或词元预算下比较验证表现。
- **常见混淆（Common confusion）:** 当前实践中的随机梯度下降（SGD）通常指小批量随机梯度下降，其适用学习率并不遵循唯一通用的批量缩放规则。
- **相关术语（Related terms）:** Gradient Descent, Batch Size, Learning Rate, Optimizer
- **来源（Sources）:** [大规模机器学习的优化方法](https://arxiv.org/abs/1606.04838); [精确的大批量随机梯度下降](https://arxiv.org/abs/1706.02677)

<a id="stop-sequence"></a>
### 停止序列（Stop Sequence）
- **分类（Category）:** 模型与推理（Models & inference）
- **准确含义（What it actually means）:** 应用指定的词元或文本模式，解码系统遇到它时便停止生成。
- **重要性（Why it matters）:** 停止序列为输出协议和分段生成设定边界，无须等待模型从语义上决定自己已经完成。
- **实际应用（In practice）:** 选择无歧义的分隔符，测试词元化及流式传输中的部分匹配，同时仍强制执行输出长度限制与模式校验。
- **常见混淆（Common confusion）:** 停止序列是一种机械性的解码条件，并不能证明答案完整或智能体目标已经实现。
- **相关术语（Related terms）:** Decoding Strategy, Structured Output, Token, Termination Condition
- **来源（Sources）:** [Transformers 文本生成文档](https://huggingface.co/docs/transformers/main/en/main_classes/text_generation)

<a id="streaming"></a>
### 流式传输（Streaming）
- **分类（Category）:** 模型与推理（Models & inference）
- **常见说法（What people say）:** 在输出生成的同时展示输出。
- **准确含义（What it actually means）:** 在完整结果就绪之前交付增量响应事件。根据应用程序接口（Application Programming Interface，API）的不同，流中可能包含词元文本、结构化增量、工具调用参数、用量元数据或状态事件。
- **重要性（Why it matters）:** 它改善用户感知的响应速度，但不会缩短模型生成完整答案的实际时间。
- **常见混淆（Common confusion）:** 网络传输、事件形态和分块边界因提供方而异，不保证与单词或词元对齐。
- **学习课程（Learn it）:** [生产级大语言模型应用](../phases/11-llm-engineering/13-production-app/)
- **相关术语（Related terms）:** Time to First Token (TTFT), Autoregressive, Observability

<a id="structured-output"></a>
### 结构化输出（Structured Output）
- **分类（Category）:** 智能体与工具（Agents & tools）
- **准确含义（What it actually means）:** 依据机器可读模式（Schema）约束或校验的模型输出，使应用代码无须解析自由形式的正文即可读取字段。
- **重要性（Why it matters）:** 它减少模型与软件边界处的格式歧义，并支持字段级校验和重试。
- **实际应用（In practice）:** 要求事件分诊结果包含允许的严重程度枚举、证据数组及可为空的升级处理原因，然后拒绝任何不符合模式的响应。
- **常见混淆（Common confusion）:** 符合模式的输出仍可能包含错误值；结构不等于事实验证。
- **学习课程（Learn it）:** [结构化输出](../phases/11-llm-engineering/03-structured-outputs/)
- **相关术语（Related terms）:** Function Calling, Tool Contract, Verification Gate

<a id="swarm"></a>
### 智能体群体（Swarm）
- **分类（Category）:** 智能体与工具（Agents & tools）
- **常见说法（What people say）:** 多个智能体在没有固定单一控制者的情况下协作。
- **准确含义（What it actually means）:** 一种松散协调的多智能体模式，由局部智能体决策和消息交换产生系统级行为。该术语的用法并不一致，因此必须明确实际拓扑、状态所有权和终止规则。
- **常见混淆（Common confusion）:** 多个具名智能体并不保证产生有用的专业分工或涌现式协调。
- **相关术语（Related terms）:** Agent, Reviewer Agent, Handoff, Agent State

<a id="system-prompt"></a>
### 系统提示词（System Prompt）
- **分类（Category）:** 提示词与上下文（Prompting & context）
- **常见说法（What people say）:** 由开发者控制、用于模型交互的指令。
- **准确含义（What it actually means）:** 应用提供的一种由提供方定义的指令消息或配置，用于在该提供方的指令层级内确立行为和约束。
- **重要性（Why it matters）:** 系统指令可以引导行为，但不保证始终保密，不应将其视为安全边界。
- **常见混淆（Common confusion）:** 优先级规则、消息角色、持久性和可见性在不同应用程序接口（API）之间存在差异，应检查提供方当前的契约。
- **学习课程（Learn it）:** [将指令作为可执行约束](../phases/14-agent-engineering/33-instructions-as-executable-constraints/)
- **相关术语（Related terms）:** Prompt Engineering, Prompt Injection, Context Engineering, Guardrails

## T

<a id="tail-latency"></a>
### 尾延迟（Tail Latency）
- **分类（Category）:** 可靠性与运维（Reliability & operations）
- **准确含义（What it actually means）:** 最慢一部分请求经历的延迟，通常在指定工作负载和时间窗口下，以较高百分位数概括。
- **重要性（Why it matters）:** 平均值可能看起来正常，但仍有相当一部分用户由于排队、资源争用、重试或请求成本差异而等待更久。
- **实际应用（In practice）:** 按路由和工作负载报告多个百分位数，依据有文档记录的规则将超时保留为删失观测或失败观测，并跨依赖追踪慢请求。
- **常见混淆（Common confusion）:** 尾延迟不是单个最慢请求；没有百分位数、统计总体和测量边界，它就没有明确含义。
- **学习课程（Learn it）:** [推理指标与有效吞吐量](../phases/17-infrastructure-and-production/08-inference-metrics-goodput/)
- **相关术语（Related terms）:** Time to First Token (TTFT), Time per Output Token (TPOT), Saturation, Goodput
- **来源（Sources）:** [大规模系统中的尾延迟](https://research.google/pubs/the-tail-at-scale/)

<a id="temperature"></a>
### 温度（Temperature）
- **分类（Category）:** 模型与推理（Models & inference）
- **常见说法（What people say）:** 一种创造力设置。
- **准确含义（What it actually means）:** 在形成概率分布前对未归一化分数（Logits）重新缩放的解码参数。较高的正值通常使分布更平坦，较低的正值则使其更尖锐。
- **重要性（Why it matters）:** 温度改变采样行为，而不是模型的知识或事实准确性。
- **常见混淆（Common confusion）:** 零值设置通常以贪心解码（Greedy Decoding）实现，但具体行为和确定性取决于提供方、采样器、随机种子支持及服务系统。
- **相关术语（Related terms）:** Softmax, Autoregressive, Token

<a id="tensor"></a>
### 张量（Tensor）
- **分类（Category）:** 数据与表示（Data & representations）
- **常见说法（What people say）:** 用于数值计算的多维数组。
- **准确含义（What it actually means）:** 具有形状、数据类型和设备位置的带类型数组，框架用它表示输入、参数、激活值和梯度。自动微分元数据取决于框架与操作，并不是所有张量的固有属性。
- **相关术语（Related terms）:** Autograd, Parameter, Mixed Precision

<a id="tensor-parallelism"></a>
### 张量并行（Tensor Parallelism）
- **分类（Category）:** 基础设施与服务（Infrastructure & serving）
- **准确含义（What it actually means）:** 将模型某一层内部的张量运算划分到多个设备，在该层计算过程中通过集合通信（Collective Communication）合并部分结果。
- **重要性（Why it matters）:** 它让单层能够使用多个设备的内存和算力，但互连或划分方式不合适时，频繁通信可能占据主要开销。
- **实际应用（In practice）:** 使划分维度匹配模型形状，对集合通信流量进行基准测试，将各进程置于高速互连上，并随检查点和服务配置记录分片布局。
- **常见混淆（Common confusion）:** 张量并行拆分层内工作；流水线并行（Pipeline Parallelism）则将不同层组放在不同设备上。
- **学习课程（Learn it）:** [扩展与分布式训练](../phases/10-llms-from-scratch/05-scaling-distributed/)
- **相关术语（Related terms）:** Tensor, Pipeline Parallelism, Expert Parallelism, Parameter
- **来源（Sources）:** [Megatron-LM 论文](https://arxiv.org/abs/1909.08053)

<a id="termination-condition"></a>
### 终止条件（Termination Condition）
- **分类（Category）:** 智能体与工具（Agents & tools）
- **准确含义（What it actually means）:** 一条明确规则：当智能体成功、失败、耗尽预算、到达安全边界或需要升级处理时，结束或暂停其运行。
- **重要性（Why it matters）:** 没有终止条件，智能体可能陷入循环、重复产生副作用、浪费预算，或在未实现目标时声称完成。
- **实际应用（In practice）:** 在开始循环前，定义成功证据、最大步数和成本、不可重试的错误及升级处理状态。
- **常见混淆（Common confusion）:** 停止序列结束文本生成；终止条件决定任务或工作流是否应停止。
- **相关术语（Related terms）:** Agent Harness, Token Budget, Verification Gate, Stop Sequence
- **来源（Sources）:** [AutoGen 论文](https://arxiv.org/abs/2308.08155)

<a id="test-oracle"></a>
### 测试判定依据（Test Oracle）
- **分类（Category）:** AI 原生开发（AI-native development）
- **准确含义（What it actually means）:** 用于判断所观测程序行为是否正确的机制、规格、参考、不变量或人工判断。
- **重要性（Why it matters）:** 仅生成测试输入还不够；自动化验证需要独立依据来判定每个结果。
- **实际应用（In practice）:** 优先采用可执行不变量、参考实现、模式和确定性的预期输出，然后记录哪些地方仍需人工判断。
- **常见混淆（Common confusion）:** 不能仅仅因为向编写代码的模型询问其输出是否正确，就将它视为独立的判定依据。
- **相关术语（Related terms）:** Regression Test, Verification Gate, Eval Set, Human-in-the-Loop (HITL)
- **来源（Sources）:** [软件测试中的判定依据问题](https://www.computer.org/csdl/journal/ts/2015/05/06963470/13rRUx0geBw)

<a id="threat-model"></a>
### 威胁模型（Threat Model）
- **分类（Category）:** 安全与治理（Security & governance）
- **准确含义（What it actually means）:** 以文档形式记录受保护资产、信任边界、潜在对手、假定能力、攻击路径、影响及计划采取的控制措施。
- **重要性（Why it matters）:** 不说明保护什么、防御谁以及基于哪些假设，就无法评价安全控制措施。
- **实际应用（In practice）:** 梳理数据和权限在模型、检索、工具、用户及外部服务之间的流动，再将可信的滥用路径转化为红队测试（Red Teaming）用例和缓解措施。
- **常见混淆（Common confusion）:** 威胁模型对可信风险进行优先排序；它不是证明系统安全或预测所有未来攻击的检查清单。
- **相关术语（Related terms）:** Least Privilege, Prompt Injection, Sandbox, Red Teaming
- **来源（Sources）:** [美国国家标准与技术研究院特别出版物 800-154](https://csrc.nist.gov/pubs/sp/800/154/ipd); [美国国家标准与技术研究院生成式人工智能风险管理概况](https://nvlpubs.nist.gov/nistpubs/ai/nist.ai.600-1.pdf)

<a id="time-per-output-token-tpot"></a>
### 每输出词元耗时（Time per Output Token (TPOT)）
- **分类（Category）:** 基础设施与服务（Infrastructure & serving）
- **准确含义（What it actually means）:** 对于具有 `N > 1` 个输出词元的单个请求，首个词元之后的平均间隔为：`(t_N - t_1) / (N - 1)`。系统级分布再聚合这些逐请求平均值。
- **重要性（Why it matters）:** 用户可能很快收到首个词元，但答案其余部分仍缓慢流出，因此仅凭启动延迟无法描述生成的响应速度。
- **实际应用（In practice）:** 分别计算每个请求的每输出词元耗时（TPOT），按输出长度和并发量报告请求间的百分位数，避免将所有词元间隔混合统计，也不要比较分词器或测量边界不同的系统。
- **常见混淆（Common confusion）:** 每输出词元耗时是逐请求平均值。单次词元间延迟是相邻词元之间的一个间隔，而首词元时间（Time to First Token）包含输出开始前的等待。
- **学习课程（Learn it）:** [推理指标与有效吞吐量](../phases/17-infrastructure-and-production/08-inference-metrics-goodput/)
- **相关术语（Related terms）:** Decode Phase, Time to First Token (TTFT), Streaming, Goodput
- **来源（Sources）:** [DistServe 论文](https://arxiv.org/abs/2401.09670)

<a id="time-to-first-token-ttft"></a>
### 首词元时间（Time to First Token (TTFT)）
- **分类（Category）:** 模型与推理（Models & inference）
- **别名（Aliases）:** TTFT
- **准确含义（What it actually means）:** 在明确的测量边界下，从提交生成请求到客户端收到首个输出词元或内容事件所经过的时间。
- **重要性（Why it matters）:** 首词元时间（TTFT）显著影响用户感知的响应速度，并能揭示排队、提示词处理、缓存或网络延迟。
- **实际应用（In practice）:** 按模型、提示词长度、区域和缓存状态记录客户端的首词元时间，并将其与总完成时间分开。
- **常见混淆（Common confusion）:** 首词元时间不是每秒词元数（Tokens per Second）。前者测量启动延迟，后者测量输出开始后的生成吞吐量。
- **相关术语（Related terms）:** Streaming, Prompt Cache, Observability, Token Budget

<a id="token"></a>
### 词元（Token）
- **分类（Category）:** 数据与表示（Data & representations）
- **常见说法（What people say）:** 模型输入或输出中大小类似单词的片段。
- **准确含义（What it actually means）:** 由模型专用的分词器（Tokenizer）根据文本、字节、图像、音频或其他输入表示生成的整数标识符。词元可以是完整单词、单词的一部分、标点、空白、字节序列或特殊控制符号。
- **常见混淆（Common confusion）:** 字符与词元的比例随语言、内容和分词器变化，因此应使用目标模型的分词器或提供方工具进行计数。
- **学习课程（Learn it）:** [分词器](../phases/10-llms-from-scratch/01-tokenizers/)
- **相关术语（Related terms）:** Token Budget, Context Window, Autoregressive

<a id="token-budget"></a>
### 词元预算（Token Budget）
- **分类（Category）:** 提示词与上下文（Prompting & context）
- **准确含义（What it actually means）:** 在指令、证据、历史记录、工具结果、推理或工作空间以及输出之间明确分配的词元容量。
- **重要性（Why it matters）:** 每个纳入的词元都会争用上下文容量，并影响延迟与成本。预算管理迫使你优先保留高价值证据。
- **实际应用（In practice）:** 预留输出容量，限制检索文本块数量，将旧工具结果总结为状态，并在达到模型限制之前停止或压缩上下文。
- **常见混淆（Common confusion）:** 词元预算是一种规划约束，不等于模型的最大上下文窗口。
- **学习课程（Learn it）:** [上下文工程](../phases/11-llm-engineering/05-context-engineering/)
- **相关术语（Related terms）:** Context Window, Context Engineering, Progressive Disclosure, Cost per Successful Task

<a id="tokenization"></a>
### 词元化（Tokenization）
- **分类（Category）:** 数据与表示（Data & representations）
- **准确含义（What it actually means）:** 将输入表示转换为特定模型或分词器接受的有序词元标识符。
- **重要性（Why it matters）:** 词元化决定序列长度、词表边界、成本核算、截断行为，以及文本或代码在嵌入之前的表示方式。
- **实际应用（In practice）:** 使用目标模型的确切分词器，随产物记录其版本，并测试多语言文本、代码、空白和特殊词元。
- **常见混淆（Common confusion）:** 词元化并不总是按单词切分，而且两个模型可以为同一输入分配不同的词元数量和标识符。
- **相关术语（Related terms）:** Token, Vocabulary, Byte Pair Encoding (BPE), Embedding
- **来源（Sources）:** [使用子词单元进行罕见词神经机器翻译](https://arxiv.org/abs/1508.07909)

<a id="tokens-per-second-tps"></a>
### 每秒词元数（Tokens per Second (TPS)）
- **分类（Category）:** 基础设施与服务（Infrastructure & serving）
- **别名（Aliases）:** TPS, output token throughput
- **准确含义（What it actually means）:** 一种吞吐量指标，报告服务系统在明确范围和工作负载下，每单位时间生成的输出词元数量。
- **重要性（Why it matters）:** 它补充启动延迟，展示输出开始后的生成速度，以及服务在负载下的表现。
- **实际应用（In practice）:** 说明每秒词元数（TPS）是单请求值还是聚合值，排除或标明预填充（Prefill），并报告批量、并发量、序列长度、硬件和延迟百分位数。
- **常见混淆（Common confusion）:** 不同分词器、工作负载、质量设置或测量边界下的每秒词元数不能直接比较。
- **相关术语（Related terms）:** Time to First Token (TTFT), Streaming, Prefill, Observability
- **来源（Sources）:** [Sarathi-Serve 论文](https://www.usenix.org/system/files/osdi24-agrawal.pdf)

<a id="tool-contract"></a>
### 工具契约（Tool Contract）
- **分类（Category）:** 智能体与工具（Agents & tools）
- **准确含义（What it actually means）:** 针对工具边界的完整约定：用途、带类型的输入、输出、校验、权限、副作用、错误、超时、幂等性，以及返回给调用者的证据。
- **重要性（Why it matters）:** 模式告诉模型有哪些字段；契约则告诉系统工具何时可以安全使用，以及必须如何处理失败。
- **实际应用（In practice）:** 为文件写入工具定义允许的根目录、预期基础修订版本、最大大小、试运行模式、明确的冲突错误及返回的补丁哈希值。
- **常见混淆（Common confusion）:** JSON Schema 是工具契约的一部分，而不是全部。
- **学习课程（Learn it）:** [工具使用与函数调用](../phases/14-agent-engineering/06-tool-use-and-function-calling/)
- **相关术语（Related terms）:** Function Calling, Structured Output, Least Privilege, Idempotency

<a id="top-k-sampling"></a>
### 前若干项采样（Top-k Sampling）
- **分类（Category）:** 模型与推理（Models & inference）
- **准确含义（What it actually means）:** 一种解码方法，将下一个词元的分布限制为得分最高的 k 个候选项，对其概率重新归一化，再从该集合中采样。
- **重要性（Why it matters）:** 它从采样中移除低概率长尾，同时保持固定的最大候选数量。
- **实际应用（In practice）:** 将 k 与温度、核采样（Top-p）和停止设置一起评估，并随生成结果记录完整采样器配置。
- **常见混淆（Common confusion）:** 前若干项采样（Top-k）使用固定候选数量，而核采样使用概率质量阈值，其候选数量随步骤变化。
- **相关术语（Related terms）:** Nucleus Sampling (Top-p), Temperature, Decoding Strategy, Logits
- **来源（Sources）:** [神经文本退化的奇特现象](https://arxiv.org/abs/1904.09751)

<a id="trace"></a>
### 追踪（Trace）
- **分类（Category）:** AI 原生开发（AI-native development）
- **准确含义（What it actually means）:** 围绕同一请求或任务，将模型调用、检索、工具、状态转换、重试、审批和评估关联起来的记录。
- **重要性（Why it matters）:** 它让你能够重建多步骤工作流中时间、成本和故障产生的位置。
- **实际应用（In practice）:** 在智能体运行框架（Agent Harness）中传递同一个追踪标识符，并为每次模型和工具操作附加经过脱敏的跨度（Span）记录。
- **常见混淆（Common confusion）:** 追踪应记录运维证据，而不应暴露模型的隐藏推理、秘密信息或未经脱敏的敏感内容。
- **学习课程（Learn it）:** [OpenTelemetry 生成式人工智能约定](../phases/14-agent-engineering/23-otel-genai-conventions/)
- **来源（Sources）:** [OpenTelemetry 追踪](https://opentelemetry.io/docs/concepts/signals/traces/)
- **相关术语（Related terms）:** Observability, Agent State, Time to First Token (TTFT), Evaluation (Eval)

<a id="transfer-learning"></a>
### 迁移学习（Transfer Learning）
- **分类（Category）:** 数学与训练（Math & training）
- **常见说法（What people say）:** 将预训练模型复用于新任务。
- **准确含义（What it actually means）:** 从某种数据分布或目标上学到的表示或参数出发，将其适配到另一种分布或目标。可迁移的组件及更新策略取决于架构和任务。
- **常见混淆（Common confusion）:** 迁移不限于后面的网络层；源任务和目标任务差异很大时，也不保证迁移成功。
- **相关术语（Related terms）:** Fine-tuning, Feature, SFT (Supervised Fine-Tuning)

<a id="transformer"></a>
### 变换器（Transformer）
- **分类（Category）:** 模型与推理（Models & inference）
- **常见说法（What people say）:** 许多现代语言模型背后的架构。
- **准确含义（What it actually means）:** 一种由注意力机制、位置信息、前馈子层、残差连接和归一化构成的神经网络架构。编码器、解码器及编码器—解码器变体使用不同的掩码和信息流。
- **重要性（Why it matters）:** 训练时可以并行处理多个序列位置，而自回归生成（Autoregressive Generation）仍然逐步产生输出。
- **常见混淆（Common confusion）:** 自注意力并不意味着每个变换器中都存在不受限制的全连接注意力。
- **学习课程（Learn it）:** [构建完整变换器](../phases/07-transformers-deep-dive/05-full-transformer/)
- **来源（Sources）:** [注意力机制就是你所需要的一切](https://arxiv.org/abs/1706.03762)
- **相关术语（Related terms）:** Attention, Self-Attention, Encoder, Decoder

<a id="trust-boundary"></a>
### 信任边界（Trust Boundary）
- **分类（Category）:** 安全与治理（Security & governance）
- **准确含义（What it actually means）:** 数据、指令、身份或权限跨越具有不同信任假设的组件或主体时经过的接口。
- **重要性（Why it matters）:** 系统必须在跨越边界时认证行为主体、验证数据、约束权限，并决定哪些声明能够影响行动。
- **实际应用（In practice）:** 围绕用户、模型上下文、检索来源、工具、网络和数据存储划定边界，然后为每次跨越规定验证与授权要求。
- **常见混淆（Common confusion）:** 网络边界只是信任边界的一种。不可信文档文本进入具有特权的智能体上下文，同样跨越了信任边界。
- **学习课程（Learn it）:** [越狱分类体系](../phases/19-capstone-projects/82-jailbreak-taxonomy/)
- **相关术语（Related terms）:** Threat Model, Least Privilege, Sandbox, Indirect Prompt Injection
- **来源（Sources）:** [Microsoft Learn：信任边界，信任区域变更元素](https://learn.microsoft.com/en-us/training/modules/tm-create-a-threat-model-using-foundational-data-flow-diagram-elements/6-trust-boundary-the-trust-zone-change-element); [开放式网络应用程序安全项目威胁建模](https://owasp.org/www-community/Threat_Modeling)

## U

<a id="underfitting"></a>
### 欠拟合（Underfitting）
- **分类（Category）:** 数学与训练（Math & training）
- **常见说法（What people say）:** 模型无法充分拟合训练任务。
- **准确含义（What it actually means）:** 模型或训练配置缺乏足够的有效容量、优化、特征或训练信号，无法捕获训练数据中的有用模式。
- **实际应用（In practice）:** 先诊断数据和优化，再考虑延长训练、改变特征、减少过度正则化，或增加合适的容量。
- **相关术语（Related terms）:** Overfitting, Loss Function, Hyperparameter

## V

<a id="vae-variational-autoencoder"></a>
### 变分自编码器（VAE (Variational Autoencoder)）
- **分类（Category）:** 模型与推理（Models & inference）
- **常见说法（What people say）:** 一种概率生成式自编码器。
- **准确含义（What it actually means）:** 一种潜变量模型，使用重建目标和使近似后验接近选定先验的正则项进行训练。重参数化估计器（Reparameterization Estimator）使梯度能够通过随机潜变量采样过程传播。
- **常见混淆（Common confusion）:** 变分自编码器（VAE）不会强迫每个潜变量分布都成为某个固定高斯分布；具体的先验和近似后验属于建模选择。
- **来源（Sources）:** [自编码变分贝叶斯](https://arxiv.org/abs/1312.6114)
- **相关术语（Related terms）:** Latent Space, Encoder, Decoder, Diffusion Model

<a id="vector-database"></a>
### 向量数据库（Vector Database）
- **分类（Category）:** 检索与生成（Retrieval & generation）
- **常见说法（What people say）:** 针对向量相似度搜索优化的数据库。
- **准确含义（What it actually means）:** 一种支持对向量表示进行近邻查询的存储和索引系统，通常具有元数据过滤、持久化和近似索引功能。
- **常见混淆（Common confusion）:** 向量数据库存储和搜索向量；它不会创建高质量嵌入，也不保证检索结果相关。
- **相关术语（Related terms）:** Embedding, Semantic Search, Hybrid Retrieval

<a id="verification-gate"></a>
### 验证关卡（Verification Gate）
- **分类（Category）:** 评估与安全（Evaluation & safety）
- **准确含义（What it actually means）:** 在规定的证据满足正确性或质量标准之前阻止流程继续的控制点。
- **重要性（Why it matters）:** 它将模型声称的完成转化为有证据支撑的决策。
- **实际应用（In practice）:** 在补丁可应用、范围内测试通过、禁止修改的文件保持不变且所需产物存在之前，不允许编码任务完成。
- **常见混淆（Common confusion）:** 验证检查证据是否满足标准；审批则授予继续执行的权限，即使证据早已明确。
- **学习课程（Learn it）:** [验证关卡](../phases/14-agent-engineering/38-verification-gates/)
- **相关术语（Related terms）:** Approval Gate, Regression Test, Scope Contract, Structured Output

<a id="vision-language-model-vlm"></a>
### 视觉语言模型（Vision-Language Model (VLM)）
- **分类（Category）:** 多模态系统（Multimodal systems）
- **准确含义（What it actually means）:** 学习视觉表示与语言表示之间的关系，或联合处理这些表示的模型，用于检索、描述、问答或有依据的生成等任务。
- **重要性（Why it matters）:** 视觉语言模型（VLM）的表现取决于视觉编码器、语言组件、连接机制、训练数据和分辨率策略，而不是某个笼统的能力标签。
- **实际应用（In practice）:** 评估仅文本和仅视觉的对照条件，改变图像分辨率与布局，尽可能要求定位证据，并按视觉技能和语言报告失败情况。
- **常见混淆（Common confusion）:** 能接收图像不证明模型正确使用了图像，而且视觉语言模型不一定能够生成图像。
- **学习课程（Learn it）:** [视觉语言模型](../phases/04-computer-vision/25-vision-language-models/)
- **相关术语（Related terms）:** Multimodal Model, Vision Transformer (ViT), Cross-Attention, Visual Grounding
- **来源（Sources）:** [对比语言图像预训练论文](https://arxiv.org/abs/2103.00020); [Flamingo 论文](https://arxiv.org/abs/2204.14198)

<a id="vision-transformer-vit"></a>
### 视觉变换器（Vision Transformer (ViT)）
- **分类（Category）:** 多模态系统（Multimodal systems）
- **准确含义（What it actually means）:** 一种视觉架构，将图像表示为带位置信息的图像块嵌入序列，再用变换器编码器块处理该序列。
- **重要性（Why it matters）:** 它为视觉数据提供序列模型接口，但性能和计算量取决于图像块大小、分辨率、预训练和归纳偏置（Inductive Bias）。
- **实际应用（In practice）:** 使分块和归一化方式与训练保持一致，考虑位置嵌入在新分辨率下的行为，并在目标数据集上与合适的视觉基线比较。
- **常见混淆（Common confusion）:** 视觉变换器（ViT）是一个架构家族，并非所有接收图像的变换器；其图像块也不天然对应语义对象。
- **学习课程（Learn it）:** [视觉变换器](../phases/04-computer-vision/14-vision-transformers/)
- **相关术语（Related terms）:** Transformer, Patch Embedding, Self-Attention, Encoder
- **来源（Sources）:** [一张图像相当于 16x16 个词](https://arxiv.org/abs/2010.11929)

<a id="visual-grounding"></a>
### 视觉定位（Visual Grounding）
- **分类（Category）:** 多模态系统（Multimodal systems）
- **准确含义（What it actually means）:** 将语言表达与图像或视频中的空间证据关联起来，例如区域、对象、掩码或被跟踪的实体。
- **重要性（Why it matters）:** 流畅的视觉回答可能没有依据，而视觉定位使其声称指向的对象可以被检查，并支持区域级评估。
- **实际应用（In practice）:** 要求答案附带边界框、掩码或时间片段，测试指代不明确及指代对象不存在的情况，并将定位准确性与语言正确性分别评分。
- **常见混淆（Common confusion）:** 视觉定位指出所引用证据的位置；一般图像描述可以描述场景，而无须为每项陈述定位。
- **学习课程（Learn it）:** [交叉注意力融合](../phases/19-capstone-projects/61-cross-attention-fusion/)
- **相关术语（Related terms）:** Grounding, Vision-Language Model (VLM), Attention, Evaluation (Eval)
- **来源（Sources）:** [MDETR 论文](https://arxiv.org/abs/2104.12763)

<a id="vocabulary"></a>
### 词表（Vocabulary）
- **分类（Category）:** 数据与表示（Data & representations）
- **准确含义（What it actually means）:** 词元标识符与分词器能够输出的单元之间的有限映射，包括普通词元、字节级词元和特殊控制词元。
- **重要性（Why it matters）:** 词表设计影响序列长度、多语言覆盖、代码表示、嵌入大小，以及分词器与模型权重之间的兼容性。
- **实际应用（In practice）:** 随模型对词表和特殊词元分配进行版本管理，测试编码后再解码的往返过程，绝不要仅因为词元名称相似就替换分词器。
- **常见混淆（Common confusion）:** 模型词表不是人类词语的字典；许多条目是片段、字节、空白模式或控制符号。
- **相关术语（Related terms）:** Tokenization, Byte Pair Encoding (BPE), Token, Embedding
- **来源（Sources）:** [使用子词单元进行罕见词神经机器翻译](https://arxiv.org/abs/1508.07909)

## W

<a id="warmup"></a>
### 学习率预热（Warmup）
- **分类（Category）:** 数学与训练（Math & training）
- **准确含义（What it actually means）:** 训练初期的一个阶段，学习率从较小值逐渐上升至主调度策略的目标值。
- **重要性（Why it matters）:** 早期梯度和优化器统计量可能不稳定，尤其是在大批量或变换器训练中，因此突然采用完整幅度的更新可能损害优化过程。
- **实际应用（In practice）:** 以步数或已处理词元数定义预热，记录实际曲线，并在明确批量、优化器和总训练预算的前提下调节。
- **常见混淆（Common confusion）:** 并非每个模型都需要预热，而且预热不会使原本不合适的学习率变得安全。
- **相关术语（Related terms）:** Learning Rate Schedule, Learning Rate, Batch Size, AdamW
- **来源（Sources）:** [精确的大批量随机梯度下降](https://arxiv.org/abs/1706.02677)

<a id="weight"></a>
### 权重（Weight）
- **分类（Category）:** 数学与训练（Math & training）
- **常见说法（What people say）:** 模型内部学到的一个数值。
- **准确含义（What it actually means）:** 模型变换中的可训练系数。权重通常组织为张量，优化过程通过调整它们降低训练目标。
- **常见混淆（Common confusion）:** 并非所有参数都称为权重；偏置、嵌入和归一化缩放系数也都是参数。
- **相关术语（Related terms）:** Parameter, Tensor, Optimizer

<a id="weight-decay"></a>
### 权重衰减（Weight Decay）
- **分类（Category）:** 数学与训练（Math & training）
- **常见说法（What people say）:** 在优化过程中缩小权重的正则化方式。
- **准确含义（What it actually means）:** 在训练期间减小选定参数幅值的更新规则，通常通过独立于梯度更新的收缩因子乘以权重来实现。
- **重要性（Why it matters）:** 它能够改善泛化，但适用系数及应排除的参数组取决于模型、优化器、调度策略和数据。
- **常见混淆（Common confusion）:** 对于某些简单优化器，解耦权重衰减（Decoupled Weight Decay）等价于 L2 损失惩罚，但对 Adam 等自适应优化器通常不成立。
- **相关术语（Related terms）:** AdamW, Overfitting, Optimizer

<a id="worktree"></a>
### 工作树（Worktree）
- **分类（Category）:** AI 原生开发（AI-native development）
- **准确含义（What it actually means）:** 在 Git 中，关联到仓库及分支或提交的工作目录，共享对象存储，但拥有自己的检出文件和索引。
- **重要性（Why it matters）:** 独立工作树使人员和智能体能够并发工作，无须反复切换或覆盖同一个检出目录。
- **实际应用（In practice）:** 为每个编码智能体分配具名功能分支和确切的工作树路径，然后通过常规 Git 历史审查并集成补丁。
- **常见混淆（Common confusion）:** 工作树隔离的是检出文件，而不是机器上的所有进程、端口、缓存、数据库或秘密信息。
- **学习课程（Learn it）:** [面向真实仓库的工作台](../phases/14-agent-engineering/41-workbench-for-real-repos/)
- **来源（Sources）:** [git-worktree 文档](https://git-scm.com/docs/git-worktree)
- **相关术语（Related terms）:** Coding Agent, Patch, Scope Contract, Handoff

## Z

<a id="zero-shot"></a>
### 零样本（Zero-Shot）
- **分类（Category）:** 提示词与上下文（Prompting & context）
- **常见说法（What people say）:** 在当前提示词中不提供示例而要求执行任务。
- **准确含义（What it actually means）:** 依据指令或任务描述执行任务，不在直接输入中包含针对该任务的示范。
- **常见混淆（Common confusion）:** 零样本不意味着模型没有相关预训练、指令微调、工具或检索上下文。
- **相关术语（Related terms）:** Few-Shot, Prompt Engineering, Transfer Learning

<a id="zero-trust"></a>
### 零信任（Zero Trust）
- **分类（Category）:** 安全与治理（Security & governance）
- **准确含义（What it actually means）:** 一种安全模型，不因网络位置或资产所有权而授予隐式信任，而是依据身份、设备、资源、策略和当前上下文评估每次访问请求。
- **重要性（Why it matters）:** 人工智能工具和智能体跨越本地文件、云服务、模型和外部内容，因此以受信任的内部网络作为授权依据过于宽泛。
- **实际应用（In practice）:** 认证每个行为主体和工作负载，为每个资源操作授权，签发短期凭据，分段控制访问，并持续记录和重新评估与策略相关的信号。
- **常见混淆（Common confusion）:** 零信任不意味着什么都不信任，也不意味着阻止所有自动化；它意味着将信任决策明确化、限定范围，并使其能够持续验证。
- **学习课程（Learn it）:** [安全、秘密信息与审计](../phases/17-infrastructure-and-production/25-security-secrets-audit/)
- **相关术语（Related terms）:** Least Privilege, Trust Boundary, Approval Gate, Audit Log
- **来源（Sources）:** [美国国家标准与技术研究院特别出版物 800-207](https://csrc.nist.gov/pubs/sp/800/207/final)
