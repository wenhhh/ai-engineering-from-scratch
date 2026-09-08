# 综合实践 17：个人 AI 导师（Personal AI Tutor，自适应、多模态、带记忆）

> Khanmigo（Khan Academy）、Duolingo Max、Google LearnLM / Gemini for Education、Quizlet Q-Chat 和 Synthesis Tutor 在 2026 年都已大规模提供自适应多模态辅导。共同形态包括苏格拉底式策略（Socratic Policy，不直接倾倒答案）、每次交互后更新的学习者模型（Learner Model，贝叶斯知识追踪风格）、语音与文本及数学题拍照输入、课程图谱（Curriculum Graph）检索、间隔重复（Spaced Repetition）调度，以及针对适龄内容的严格安全过滤。本综合实践要求交付特定学科导师，如 K-12 代数或 Python 入门，让 10 名学习者参加两周效果研究（Efficacy Study），并通过内容安全审计。

**Type:** Capstone
**Languages:** Python（后端、学习者模型）, TypeScript（网页应用）, SQL（通过 Postgres + Neo4j 实现课程图谱）
**Prerequisites:** 阶段 5（自然语言处理，NLP）、阶段 6（语音）、阶段 11（大语言模型工程）、阶段 12（多模态）、阶段 14（智能体）、阶段 17（基础设施）、阶段 18（安全）
**涉及阶段（Phases exercised）:** P5 · P6 · P11 · P12 · P14 · P17 · P18
**Time:** 30 小时

## 问题（Problem）

自适应辅导（Adaptive Tutoring）曾是教育科技研究中的小众方向，到 2026 年已成为消费产品。Khanmigo 部署到美国大多数学区，Duolingo Max 月活跃用户（Monthly Active Users，MAU）达到数千万，Google 的 LearnLM / Gemini for Education 为 Google Classroom 的辅导提供支持，Quizlet Q-Chat 与闪卡并列，Synthesis Tutor 因面向好奇儿童的导师产品广泛传播。共同要素是多模态输入（打字、说话、拍摄方程）、苏格拉底式教学（先问后讲）、逐交互更新的学习者模型，以及严格适龄安全。

你将为特定群体构建这样的导师。衡量标准是实际效果研究：10 名学习者，持续两周，比较前测和后测分数。语音循环必须自然，复用综合实践 03 的子技术栈。记忆必须尊重隐私。安全过滤器必须通过针对 K-12、考虑儿童在线隐私保护法（Children's Online Privacy Protection Act，COPPA）的红队测试。

## 概念（Concept）

系统有四个组件。**导师策略（Tutor Policy）**是苏格拉底式循环：学习者索要答案时提出引导问题，答对时进入下一概念，卡住时提供支架式提示（Scaffolded Hint）。**学习者模型（Learner Model）**采用贝叶斯知识追踪（Bayesian Knowledge Tracing，BKT）或简单变体，每次交互后更新课程节点的掌握概率（Mastery Probability）。**课程图谱（Curriculum Graph）**在 Neo4j 中保存概念与先修边，策略遍历图来选择下一概念。**记忆（Memory）**采用 agentmemory 风格的情景与语义存储，保存以往交互、错误和偏好。

用户体验是多模态的：文本输入用于键入答案；LiveKit + Whisper 支持语音输入，复用综合实践 03；dots.ocr 或 PaliGemma 2 处理数学题照片；Cartesia Sonic-2 输出语音。安全采用 Llama Guard 4、阻断成人内容、暴力和自伤的适龄过滤器，以及考虑 COPPA 的记忆保留策略。

效果研究就是交付物：10 名学习者，两周，前测与后测。报告学习增益变化及置信区间（Confidence Interval）。与非自适应基线比较：内容相同，线性呈现，不使用导师策略。

## 架构（Architecture）

```
学习者设备
  |
  +-- 文本         -> 网页应用
  +-- 语音         -> LiveKit Agents（ASR + TTS）
  +-- 数学题拍照   -> dots.ocr / PaliGemma 2
       |
       v
  导师策略（LangGraph）
       - 苏格拉底式决策头（Decision Head）
       - 下一概念选择器（课程图谱遍历）
       - 提示支架构建器（Hint Scaffolder）
       - 掌握程度更新
       |
       v
  学习者模型（BKT / 项目反应理论（Item-Response Theory））
       - 逐概念掌握概率
       - 间隔重复调度器（SM-2 或 FSRS）
       |
       v
  记忆（agentmemory 风格）
       - 情景记忆：每次交互
       - 语义记忆：归纳的错误与偏好
       - 保留策略：考虑 COPPA / GDPR
       |
       v
  课程图谱（Neo4j）
       - 先修关系边
       - 附开放教育资源（Open Educational Resources，OER）内容
       |
       v
  安全：
    Llama Guard 4 + 适龄过滤器
    记忆访问由学习者 ID 范围保护
```

## 技术栈（Stack）

- 学科选择：K-12 代数或 Python 入门，选择其一深入
- 导师策略：LangGraph 调用 Claude Sonnet 4.7，启用提示词缓存（Prompt Caching）
- 学习者模型：经典贝叶斯知识追踪，或用 FSRS 安排复习间隔
- 课程图谱：Neo4j 中的概念、先修边与 OER 内容
- 记忆：agentmemory 风格持久向量、情景与语义存储
- 语音：LiveKit Agents 1.0 + Cartesia Sonic-2，复用综合实践 03 子技术栈
- 数学题拍照：dots.ocr 或 PaliGemma 2 识别方程
- 安全：Llama Guard 4 + 自定义适龄过滤器
- 评估：按布卢姆层级（Bloom Level）生成问题、前后测框架、效果研究工具

```figure
cf-tutor-loop
```

## 动手实现（Build It）

1. **课程图谱（Curriculum Graph）。** 在 Neo4j 中建立 50–150 个概念节点，例如 K-12 代数从“数轴”到“求根公式”，附先修边。每节点附 OER 内容，来源如 Open Textbook、OpenStax。

2. **学习者模型（Learner Model）。** 以猜测（Guess）、失误（Slip）、学习率（Learn-Rate）先验初始化 BKT。每次交互更新逐概念掌握程度，逐学习者持久保存。

3. **导师策略（Tutor Policy）。** LangGraph 节点：`read_signal` 判断学习者回答正确、部分正确或卡住；`select_concept` 遍历课程图谱选择优先级最高概念；`scaffold` 提供苏格拉底式提示词；`update_mastery` 更新掌握程度。

4. **记忆（Memory）。** 每次交互写入情景存储，错误与偏好提升为语义记忆。考虑 COPPA 的保留策略：一年后自动删除，家长可访问。

5. **语音路径（Voice Path）。** LiveKit Agents 工作者连接导师策略。Whisper-v3-turbo 进行自动语音识别（Automatic Speech Recognition，ASR），Cartesia Sonic-2 进行文本转语音（Text-to-Speech，TTS）。支持插话打断（Barge-In），复用综合实践 03 机制。

6. **数学题拍照路径（Photo-Math Path）。** 上传或拍摄图像，运行 dots.ocr 或 PaliGemma 2 识别方程，作为结构化输入交给导师。

7. **安全（Safety）。** 每个模型输出都经过 Llama Guard 4 与适龄过滤器，阻断自伤、成人内容、暴力。记忆访问按学习者 ID 限定，提供家长删除入口。

8. **效果研究（Efficacy Study）。** 10 名学习者，前测采用标准化 30 题基线，两周导师交互，每周 3 次，随后后测。与学习相同内容的 10 名非自适应基线学习者比较。

9. **每周进度报告（Weekly Progress Reports）。** 逐学习者自动生成 PDF，总结涉及主题、掌握轨迹与建议后续步骤。

## 实际应用（Use It）

```
learner: "I don't understand why 3x + 6 = 12 means x = 2"
[signal]   stuck
[concept]  'isolating variables' (prerequisite: addition-subtraction-equality)
[scaffold] "what number would you subtract from both sides to start?"
learner: "6"
[signal]   correct
[mastery]  addition-subtraction-equality: 0.62 -> 0.77
[concept]  continue 'isolating variables'
[scaffold] "great. now what is 3x / 3 equal to?"
```

## 交付成果（Ship It）

`outputs/skill-ai-tutor.md` 是交付物：特定学科自适应导师，具有多模态输入、学习者模型、记忆、安全与实测效果。

| 权重 | 标准 | 衡量方式 |
|:-:|---|---|
| 25 | 学习增益变化 | 10 学习者两周研究的前后测变化 |
| 20 | 苏格拉底式忠实度（Socratic Fidelity） | 对交互记录样本按标准评分 |
| 20 | 多模态用户体验（UX） | 语音、照片、文本端到端连贯性 |
| 20 | 安全与隐私保障 | Llama Guard 4 通过率 + 考虑 COPPA 的保留策略 |
| 15 | 课程广度与图谱质量 | 概念覆盖 + 先修图一致性 |
| **100** | | |

## 练习（Exercises）

1. 分别启用和禁用自适应学习者模型运行效果研究，禁用时随机安排概念顺序。报告差值。预期自适应胜出，但增益幅度才值得关注。

2. 增加多模态探测：同一概念问题分别通过文本、语音和照片呈现。测量学习者使用偏好模态时是否更快掌握。

3. 构建家长仪表盘：练习主题、掌握轨迹、后续概念、安全事件，包括任何防护命中。与 COPPA 要求对齐。

4. 增加语言切换模式：导师接受西班牙语输入并用西班牙语教学。测量 X-Guard 覆盖。

5. 对记忆隐私施压：验证即使通过语音片段重新摄取攻击，学习者 A 也无法看到 B 的数据。记录访问尝试并告警。

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|------|-----------------|------------------------|
| 苏格拉底式策略（Socratic Policy） | “提问，不倾倒答案” | 导师提出引导问题，而非给出答案 |
| 贝叶斯知识追踪（Bayesian Knowledge Tracing，BKT） | “BKT” | 计算逐概念掌握概率的经典学习者模型方程 |
| 自由间隔重复调度器（Free Spaced Repetition Scheduler，FSRS） | “自由间隔重复调度器” | 2024 年间隔重复调度器，优于 SM-2 |
| 课程图谱（Curriculum Graph） | “概念有向无环图（DAG）” | Neo4j 中带先修边的概念图 |
| 情景记忆（Episodic Memory） | “逐交互日志” | 保存每次交互，供后续检索 |
| 语义记忆（Semantic Memory） | “已学模式存储” | 从情景记忆提升的压缩错误与偏好 |
| 儿童在线隐私保护法（Children's Online Privacy Protection Act，COPPA） | “儿童隐私法” | 限制收集 13 岁以下儿童数据的美国法律 |

## 延伸阅读（Further Reading）

- [Khanmigo（Khan Academy）](https://www.khanmigo.ai)：消费级 K-12 导师参考
- [Duolingo Max](https://blog.duolingo.com/duolingo-max/)：语言学习导师参考
- [Google LearnLM / Gemini for Education](https://blog.google/technology/google-deepmind/learnlm)：托管参考模型
- [Quizlet Q-Chat](https://quizlet.com)：另一参考
- [Synthesis Tutor](https://www.synthesis.com)：初创公司参考
- [FSRS 算法](https://github.com/open-spaced-repetition/fsrs4anki)：间隔重复调度器
- [贝叶斯知识追踪（Bayesian Knowledge Tracing）](https://en.wikipedia.org/wiki/Bayesian_knowledge_tracing)：经典学习者模型
- [LiveKit Agents](https://github.com/livekit/agents)：语音技术栈
