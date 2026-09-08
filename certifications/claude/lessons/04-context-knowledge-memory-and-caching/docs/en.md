# 将每项事实放入合适的上下文（Put Each Fact in the Right Kind of Context）

> 上下文（Context）承载临时注意力，知识（Knowledge）是持续维护的证据，记忆（Memory）提供连续性，缓存（Caching）用于复用。混淆它们，会生成自信却过时的答案。

**Type:** Learn
**Languages:** Python
**Prerequisites:** [将请求转化为可测试的契约（Turn a Request Into a Testable Contract）](../../03-prompting-and-task-decomposition/), [上下文工程（Context Engineering）](../../../../../phases/11-llm-engineering/05-context-engineering/)
**Time:** ~105 分钟

## 学习目标（Learning Objectives）

- 区分对话上下文、Project 指令、Project 知识、记忆、连接器（Connector）、检索（Retrieval）和 API 提示词缓存（Prompt caching）。
- 选择哪些内容应持久保存、检索、总结、刷新或丢弃。
- 建立包含权威性、责任归属、敏感度和时效元数据的来源登记表（Source registry）。
- 在不删除必需证据的前提下减少上下文过载。
- 解释哪些 Claude 产品行为可能变化，必须在最新文档中核实。

## 问题背景（The Problem）

一个团队为季度规划创建 Claude Project，上传政策文件、会议笔记、销售导出数据和旧产品路线图，还添加 Project 指令：“使用最新获批计划。”

三个月后，Claude 根据旧路线图推荐上线日期。该日期存在于 Project 知识中，在多份历史会议笔记里出现，却与连接器中保存的新决策冲突。回答听起来很确定，因为上下文反复提供支持错误答案的证据。

团队称之为幻觉（Hallucination），但它主要是知识管理故障。他们把 Project 当成文档仓库，把记忆当成权威来源，把检索当成真实性保证。

更多上下文不等于更好上下文。可信系统知道哪些事实是临时的、哪些是权威的，以及谁负责保持它们最新。

## 核心概念（The Concept）

### 七种机制，各司其职（Seven mechanisms, seven jobs）

Claude 可以通过多种机制接收或复用信息。确切可用性、限制和名称可能随套餐及产品变化，但它们各自的用途是长期有效的区分。

| 机制（Mechanism） | 主要用途（Primary job） | 主要风险（Main risk） |
|---|---|---|
| 当前对话上下文（Current chat context） | 承载当前对话 | 旧轮次占用注意力或产生冲突 |
| Project 指令（Project instructions） | 设置可复用行为和约束 | 宽泛指令变得过时或模糊 |
| Project 知识（Project knowledge） | 提供持续维护的参考资料 | 文件缺少负责人或时效控制 |
| 记忆（Memory） | 在对话之间保留有用连续性 | 将记住的偏好误认为获批事实 |
| 连接器（Connectors） | 按当前权限访问外部系统 | 误解来源权限、同步或时效性 |
| 检索（Retrieval） | 从大语料库中选择相关片段 | 看似相关的文本不完整或权威性低 |
| 提示词缓存（Prompt caching） | 高效复用稳定 API 提示词前缀 | 缓存动态内容或忽略失效处理 |

一项功能可以服务多个用途，但明确区分可防止类别错误。记忆可以提醒 Claude 你喜欢简洁报告，却不应悄悄成为当前退款政策的来源。连接器可以提供最新文件，但不能证明文件已获批准。

### 上下文有注意力预算（Context has an attention budget）

大上下文窗口增加的是容量，不是确定性。每份额外文档都会争夺注意力，并增加一次产生矛盾的机会。

按四层思考：

```text
context package = governing instructions
                + task-specific input
                + retrieved authoritative evidence
                + minimal continuity
```

保持稳定指令不变，只加入当前决策所需的任务输入，按元数据和权威规则检索证据。只有先前对话会影响当前任务时，才携带它。

长对话常积累已放弃的计划、更正过的事实和格式试验。用核实后的简报开启新对话，可能比无限继续更安全。先区分决策与讨论，再做总结。

### 检索是选择，不是验证（Retrieval is selection, not verification）

检索系统通常按相关性排列片段。相关性无法回答：

- 来源是否获批？
- 是否最新？
- 覆盖完整规则，还是只有节选？
- 是否与更高权威来源冲突？
- 当前用户是否有权访问？

给每个来源附上元数据，在语义相关性筛选前或同时过滤。最小登记表包括：

| 字段（Field） | 问题（Question） |
|---|---|
| 来源 ID（Source ID） | 主张能否回溯到它？ |
| 负责人（Owner） | 谁对准确性负责？ |
| 权威性（Authority） | 它是政策、规程、笔记还是草稿？ |
| 生效日期（Effective date） | 何时开始有效？ |
| 复核日期（Review date） | 何时必须再次检查？ |
| 敏感度（Sensitivity） | 谁可以处理或查看？ |
| 替代关系（Supersedes） | 哪个早期来源不再具有权威性？ |
| 检索标签（Retrieval tags） | 覆盖哪些任务和区域？ |

没有负责人或复核日期的文档应考虑隔离，而不是自动摄入。

### 指令与知识不同（Instructions and knowledge are different）

指令描述行为，知识提供证据。

指令可以这样写：

```text
处理退款问题时，引用适用章节，并明确呈现区域冲突。
```

知识应包含实际获批的退款政策。把政策正文放进行为指令会增加维护难度；把行为规则放在零散知识文件里，则容易被遗漏。

Project 指令与用户请求或给定来源冲突时，如何解决取决于产品的指令层级和组织政策。不要凭空编造层级，应测试实际产品形态，并记录预期优先顺序。

### 记忆提供连续性，不是权威数据库（Memory is continuity, not a database of record）

记忆适合稳定偏好和持续背景，例如偏好语气、周期性目标或某项目存在这一事实。把记住的主张当成当前运营真相，就会产生风险。

依赖记忆前，问三个问题：

1. 事实是否可能已经变化？
2. 是否有核查成本低的权威来源？
3. 记忆中的事实若错误，会造成什么后果？

如果可能变化且后果重要，就核实。在工作流中标注来自记忆的上下文，并保留对实际权威记录来源的引用。

### 提示词缓存是一种经济机制（Prompt caching is an economic mechanism）

API 提示词缓存可以减少稳定前缀的重复处理，但不会提高真实性，也不会创建长期记忆。

当前 API 缓存行为支持时，将可复用内容放在动态内容之前：

```text
stable prefix: system rules + tool definitions + approved reference corpus
dynamic suffix: user request + fresh retrieval + current state
```

适合缓存的内容量大、重复且稳定。不合适的内容每次请求都变化，或包含不应超出获批边界持久保存的数据。

缓存寿命、最小大小、价格、模型支持和失效行为都是可变产品事实，应在最新官方文档中核实。设计正确性不能依赖过时缓存。

### 上下文质量需要生命周期责任归属（Context quality needs lifecycle ownership）

知识有自己的生命周期（Lifecycle）：

```mermaid
flowchart LR
    A["创建来源"] --> B["分类并批准"]
    B --> C["建立索引或上传"]
    C --> D["为任务检索"]
    D --> E["验证主张"]
    E --> F["按计划复核"]
    F -->|"仍有效"| C
    F -->|"已被取代"| G["归档并从活动检索中移除"]
```

难点不是上传，而是批准、更新和停用。

## 动手实现（Build It）

### 第 1 步：盘点上下文（Step 1: Inventory the context）

为一项周期性工作流列出每个信息来源并分类：

```text
行为指令：
任务输入：
权威知识：
参考知识：
对话连续性：
外部连接数据：
临时计算：
```

如果某项出现在多个类别中，确定哪个副本是权威版本，以及如何删除重复副本。

### 第 2 步：创建来源登记表（Step 2: Create a source registry）

为每个来源建立简单表格或 JSON 记录：

```json
{
  "source_id": "refund-policy-uk",
  "owner": "customer-operations",
  "authority": "approved-policy",
  "effective_date": "2026-07-01",
  "review_date": "2026-10-01",
  "sensitivity": "internal",
  "supersedes": "refund-policy-uk-2025"
}
```

这里的日期仅为示意，请使用实际记录。复核日期已过的来源应拒绝或标记。

### 第 3 步：设计支持弃答的检索（Step 3: Design retrieval with abstention）

定义检索契约：

- 按用户权限、区域、产品和活动状态过滤。
- 获批政策优先于讨论笔记。
- 检索足够的周边文本，保留例外条款。
- 片段一并返回来源 ID 和生效日期。
- 缺少必需权威来源时弃答（Abstention）。
- 明确暴露冲突，不要在不可见处合并。

测试正常案例、过时来源、权限不匹配、冲突和范围外问题。

### 第 4 步：为提示词设预算（Step 4: Budget the prompt）

测量或估算每类上下文。提示词过载时，按以下顺序缩减：

1. 删除重复和已被取代的材料。
2. 排除无关对话轮次。
3. 检索范围更窄的权威章节，同时保留足够周边上下文。
4. 用核实后的决策记录替代讨论历史。
5. 在验证边界处分割任务。

不要一开始就删除安全约束或必需证据。

### 第 5 步：建立维护机制（Step 5: Establish maintenance）

分配负责人和复核节奏：

| 资产（Asset） | 负责人（Owner） | 复核触发条件（Review trigger） | 停用规则（Retirement rule） |
|---|---|---|---|
| Project 指令 | 工作流负责人 | 流程变更 | 替换旧版本 |
| 政策知识 | 政策负责人 | 批准或到达复核日期 | 移除已被取代的副本 |
| 检索索引 | 平台负责人 | 来源更新 | 重建索引并验证 |
| 评估集 | 质量负责人 | 出现新故障类别 | 添加代表性案例 |

知识管理是产品的一部分，不是上线后的杂务。

## 交互实验（Interactive Lab）

使用上下文缓存图调整稳定前缀大小、请求量、缓存命中率、来源时效和失效行为。将成本节省与正确性边界对比：只有复用前缀仍获批准时，缓存命中才有价值。

```figure
04-context-cache
```

## 实践实验（Practice Lab）

运行上下文规划器。尝试缓存动态账户来源、未经新批准重新激活旧政策，或让提示词预算溢出。运行器必须优先遵守正确性和生命周期规则，再考虑缓存节省。

## 交付物（Shipped Artifact）

`outputs/context-registry.json` 是填写完整的退款工作流来源登记表，区分行为指令、获批政策、已被取代的草稿、对话连续性和动态连接数据，还包含提示词预算及明确缓存政策。

## 验证结果（Verify It）

验证登记表：

```bash
cd certifications/claude/lessons/04-context-knowledge-memory-and-caching/code
python3 main.py
python3 -m unittest discover tests -v
```

校验器检查来源 ID 唯一性、ISO 日期、责任归属、权威性、活动与已被取代状态、预算总数，以及是否只有稳定且非秘密的来源进入缓存前缀。

## 与综合实践的联系（Capstone Connection）

测验检查来源权威性、检索限制、缓存适配和上下文重置决策。在第 29 至 32 课综合实践中，将登记表和缓存政策作为来源追溯（Provenance）与上下文预算交付物。

## 实际应用（Use It）

### 考试决策模式（Exam decision pattern）

场景提到重复工作、过时答案或上下文缺失时：

1. 判断缺失项属于行为、证据、连续性还是外部数据。
2. 将它放入为该用途设计的机制。
3. 增加权威性、时效性、敏感度和责任归属控制。
4. 测试检索和权限故障。
5. 确立正确性后，再使用缓存。

### 常见陷阱（Common traps）

- **上传所有内容（Upload everything）：** 数据量增加矛盾和维护成本。
- **记忆就是真相（Memory as truth）：** 将连续性误当成权威记录来源。
- **连接器等于批准（Connector as approval）：** 将文件访问能力误当成权威性。
- **检索等于证明（Retrieval as proof）：** 不检查来源追溯和完整性，就接受相关片段。
- **无尽对话（One endless chat）：** 已更正和已放弃的上下文仍保持活动。
- **缓存当记忆（Cache as memory）：** 期待 API 优化机制保存持久用户状态。
- **没有停用路径（No retirement path）：** 被取代的文件永远可以检索。

### 练习（Exercises）

1. 从真实工作流选十项内容，按七种机制分类。
2. 为五个来源创建登记表，指出哪些不应进入活动检索。
3. 使用四层上下文包重写一条过载提示词。
4. 设计五个检索故障测试，包含过时证据和未授权访问。
5. 决定项目一周结束时哪些内容持久保存、总结或丢弃，并解释每项决策。

## 关键术语（Key Terms）

- **上下文（Context）：** 模型当前请求可用的信息。
- **Project 指令（Project instructions）：** 与 Claude Project 关联的可复用行为指导。
- **Project 知识（Project knowledge）：** 与 Project 关联的参考资料。
- **记忆（Memory）：** 产品支持的跨对话连续性，受当前功能行为约束。
- **连接器（Connector）：** 按配置权限提供外部数据或能力的集成。
- **检索（Retrieval）：** 为请求从大语料库中选择相关材料。
- **提示词缓存（Prompt caching）：** 复用符合条件的提示词内容，减少重复 API 处理。
- **权威记录来源（Source of record）：** 某项事实的权威系统或文档。
- **时效性（Freshness）：** 信息是否足够新，能满足预期用途。

## 延伸阅读（Further Reading）

- [Anthropic 帮助中心：什么是 Projects？](https://support.claude.com/en/articles/9517075-what-are-projects)
- [Anthropic 帮助中心：使用 Claude 对话搜索和记忆](https://support.claude.com/en/articles/11817273-use-claude-s-chat-search-and-memory-to-build-on-previous-context)
- [Anthropic 帮助中心：使用连接器扩展 Claude 能力](https://support.claude.com/en/articles/11176164-use-connectors-to-extend-claude-s-capabilities)
- [Anthropic：提示词缓存](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)
- [AI Engineering from Scratch：检索增强生成（Retrieval-Augmented Generation，RAG）](../../../../../phases/11-llm-engineering/06-rag/)
- [AI Engineering from Scratch：仓库记忆与状态](../../../../../phases/14-agent-engineering/34-repo-memory-and-state/)

Projects、记忆、连接器、检索模式和提示词缓存的名称、可用性、限制、保留行为与价格都可能变化。这些来源核查于 2026-08-08。部署或备考前，应核实最新官方产品和隐私文档。
