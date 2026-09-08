# 在六种情境中论证同一套架构（Defend One Architecture Across Six Contexts）

> 架构是一组边界：即使场景发生变化、工具失效、证据不完整，这些边界仍然成立。

**Type:** Build
**Languages:** Python
**Prerequisites:** [多智能体编排与委派（Multi-Agent Orchestration and Delegation）](../../16-multi-agent-orchestration-and-delegation/), [工具契约、错误与渐进式发现（Tool Contracts, Errors, and Progressive Discovery）](../../18-tool-contracts-errors-and-progressive-discovery/), [Claude Code 的记忆、规则、技能与 CI（Claude Code Memory, Rules, Skills, and CI）](../../19-claude-code-memory-rules-skills-and-ci/), [可靠抽取、批处理与独立审查者（Reliable Extraction, Batch, and Independent Reviewers）](../../20-reliable-extraction-batch-and-reviewers/), [让大上下文可观测（Make Large Context Observable）](../../21-long-context-reliability-provenance-and-escalation/)
**Time:** ~6 小时，分两次集中完成

## 学习目标（Learning Objectives）

- 围绕 CCAR-F 的全部五个领域论证架构选择。
- 将同一种决策方法迁移到六种公开场景情境，而不是背诵一种拓扑结构。
- 为编排、工具、Claude Code、结构化输出和上下文可靠性实现确定性检查。
- 构建故障材料包，测试部分结果、过期状态、不安全工具和无效输出。
- 交付可供审查的架构材料包，明确说明权衡和升级处理方式。

## 问题（The Problem）

一位架构师为六种预期用例准备了六张图。支持业务图使用智能体循环（Agent Loop），代码图使用 Claude Code，研究图包含子智能体（Subagent），抽取图使用 JSON。

到了评审环节，这位架构师却无法解释为什么某一步使用工具，另一步使用子智能体。图中遗漏了重试语义、配置作用域、部分结果、来源版本和人工权限。每种设计都只能在理想路径上运行。

基于场景的架构问题考查迁移能力。名称和业务细节会变化，但相同的决策会反复出现：

- 哪些步骤的顺序是确定的，哪些选择需要模型推理？
- 每项关注点应由哪个上下文负责？
- 哪些工具可见、已获授权并且可以重试？
- 共享的 Claude Code 指导应存放在哪里？
- 如何让类型明确的结果同时满足语义有效性和证据有效性？
- 哪些状态需要在故障、压缩、恢复和人工交接后继续保留？

本综合项目将建立一种架构方法，并将其应用到全部六种公开情境。

## 概念（The Concept）

### 六种情境是观察视角，不是模板（The six contexts are lenses, not templates）

2026 年 7 月版 CCAR-F 公开指南列出了以下场景情境：

1. 客户支持问题解决智能体。
2. 使用 Claude Code 生成代码。
3. 多智能体研究。
4. 使用 Claude 提升开发者生产力。
5. 将 Claude Code 用于 CI/CD。
6. 结构化数据抽取。

本课程不会复现考试场景。你将为虚构的软件与服务公司 Cedar Bridge 创建一套原创系统。每个视角都会检验同一架构中的不同部分。

| 视角 | Cedar Bridge 原创任务 | 首要防范的故障 |
|---|---|---|
| 客户支持 | 根据现行政策和工单证据起草解决方案 | 未授权操作或过期政策 |
| 代码生成 | 修补单体仓库中的请求解析器 | 范围过大或缺少跨文件契约 |
| 研究 | 比较三种迁移方案 | 重复工作、冲突或来源不完整 |
| 开发者生产力 | 将获批决策转化为 ADR 和任务计划 | 对话状态过期或存在隐藏的本地配置 |
| CI/CD | 从干净的检出状态审查拉取请求 | 权限无边界或发现项无法复现 |
| 抽取 | 将变更通知规范化为记录 | 模式有效，但值是编造的或缺乏支持 |

你不需要六个互不相关的平台。你需要一套核心架构，并明确标出随场景变化的部分。

### 使用包含五道门禁的决策栈（Use a five-gate decision stack）

```mermaid
flowchart LR
    A["1. 编排"] --> B["2. 工具与 MCP 契约"]
    B --> C["3. Claude Code 配置"]
    C --> D["4. 结构化输出与审查"]
    D --> E["5. 上下文可靠性"]
    E --> F["架构交接"]
```

#### 门禁 1：智能体架构与编排（Gate 1: Agentic architecture and orchestration）

定义任务、前置条件、上下文边界、允许的工具、完成或部分完成状态，以及合并规则。固定顺序交给代码，语义选择交给模型推理。引入子智能体必须有理由：隔离、专业化、独立审查或安全并行。

对于客户支持，政策研究者和工单分析者可以在受理后独立工作。解决方案草稿依赖这两者的结果。获准执行操作的执行者是独立的权限边界，不属于只读建议循环。

对于研究，按互不重叠的问题扇出任务，再按断言 ID 归并结果。对于代码，使用清单（Manifest）和限定范围的探索者，而不是让每个智能体都处理整个仓库。

#### 门禁 2：工具设计与 MCP 集成（Gate 2: Tool design and MCP integration）

每个工具都应对应一个操作及其对象，提供何时使用和何时不使用的选择指导、封闭模式（Closed Schema）、权限范围、副作用声明以及结构化错误契约。写入工具需要新近确认的授权、幂等性（Idempotency）和状态核对（Reconciliation）。

使用 MCP 资源提供上下文数据，使用工具执行模型请求的操作，使用提示词提供可复用、由用户调用的模板。渐进式发现（Progressive Discovery）能够缩小工具目录，但必须保留访问范围约束。

在 CI 中，读取、搜索和测试接口应足以完成审查。不能仅仅因为工作流在流水线中运行，就授予生产部署权限。

#### 门禁 3：Claude Code 配置与工作流（Gate 3: Claude Code configuration and workflows）

项目指导应简洁、纳入版本管理并由团队共享。将文件特定要求放入路径规则，把可复用方法打包为技能（Skill），把明确的用户工作流封装为命令。使用钩子（Hook）确定性地控制范围和命令。

大范围修改之前先制定计划。在隔离的只读上下文中开展探索。CI 应从干净的提交开始，使用已声明的设置、受限工具、结构化发现项和确定性测试。它不应恢复开发者的交互式会话。

#### 门禁 4：提示词工程与结构化输出（Gate 4: Prompt engineering and structured output）

先定义评估标准，再斟酌提示词措辞。对含糊的判断提供边界示例，让未知值能够被表达。在受支持的地方强制执行模式，然后校验语法、模式、语义和来源溯源（Provenance）。

限制重试次数，只反馈最小且有用的校验错误。分离生成者与审查者的上下文。批处理适用于异步、相互独立的项目，不适用于必须观察中间结果的自适应工具循环。

#### 门禁 5：上下文管理与可靠性（Gate 5: Context management and reliability）

清楚放置硬约束和当前问题。检索最小的相关证据片段，并附带来源元数据。裁剪日志时不要删除故障信息或覆盖情况。将清单和副作用持久化到对话之外，向下游传递完成、部分完成和阻塞状态。

置信度应来自证据类别、覆盖情况、冲突、新颖性和测得的错误。人工审查按后果和不确定性分层，同时随机抽查普通通过项。

### 架构质量体现在故障行为中（Architecture quality appears in failure behavior）

图展示组件，场景材料包则展示系统承压时的行为：

- 某个来源在返回有效的部分结果后超时。
- 工具返回冲突，不应盲目重试。
- 子智能体违反结果模式。
- CI 收到仓库中不存在的隐藏本地指令。
- 抽取记录是有效 JSON，却引用了错误版本。
- 分支发生变化后，恢复的会话仍包含过时计划。
- 两项获批政策相互冲突，且没有优先级规则。

对每种故障，都要明确检测方式、遏制方式、重试或升级处理方式、持久化状态，以及人工负责人。

## 动手构建（Build It）

## 交互实验（Interactive Lab）

```figure
31-architect-foundation-readiness
```

使用就绪度矩阵，在六种场景视角下检验全部五道架构门禁。改变一项工具、配置、校验或上下文不变量，观察哪些场景会因此被阻塞，而不是依赖某一种拓扑结构。

## 实践实验（Practice Lab）

为每个架构领域运行一个故障夹具（Failure Fixture），并写出能够修复故障、又不削弱共享不变量的跨场景差异。

## 交付产物（Shipped Artifact）

架构材料包和填写完成的
[`outputs/demo-readiness-report.json`](../outputs/demo-readiness-report.json)
是本课的实践产出。

## 验证（Verify It）

使用下列命令复现报告并运行故障优先测试。课程测验检查你对各项决策的迁移能力。

## 与综合项目的联系（Capstone Connection）

完成的材料包、跨场景差异、架构决策记录（ADR）和独立审查共同构成架构师基础（Architect Foundations）综合项目的提交材料。

### 步骤 1：选择一个主要视角（Step 1: Choose one primary lens）

选择一个 Cedar Bridge 视角，或换成你自己的原创场景。写明：

```text
支持的决策：
用户和受影响的人：
输入来源及敏感程度：
允许的操作：
禁止的操作：
延迟与处理量：
故障后果：
人工权限：
```

不要以“使用多智能体系统”为起点。先明确决策和边界。

### 步骤 2：完成架构材料包（Step 2: Complete the architecture packet）

复制 [`outputs/architecture-packet.md`](../outputs/architecture-packet.md)，填写每个领域的章节。材料包应包含：

- 情境和非目标。
- 任务依赖图和结果状态。
- 角色与工具能力矩阵。
- 包含结构化错误的工具与 MCP 契约。
- Claude Code 指令、规则、技能、命令、钩子和 CI 决策。
- 提示词契约、模式、校验器、重试上限和独立审查。
- 上下文预算、清单、来源溯源、升级处理和人工审查。
- 威胁、备选方案、上线部署和恢复。

### 步骤 3：将材料包编码为 JSON（Step 3: Encode the packet as JSON）

使用随附 Python 校验器演示的结构。该校验器有意只检查架构不变量，不评判文字质量。

运行能够通过校验的示例：

```bash
cd certifications/claude/lessons/31-architect-foundations-scenario-capstone
python3 code/main.py
```

然后保存你的材料包并运行：

```bash
python3 code/main.py --input outputs/my-scenario.json
```

程序会检查：

- 必需章节和可识别的场景情境。
- 唯一任务、已知前置条件、无环依赖和分配给任务的工具。
- 工具选择边界、结构化错误、授权和幂等性。
- 共享的 Claude Code 指导、限定范围的规则，以及从全新状态开始的结构化 CI 审查。
- 四层校验、有限重试、未知状态和审查者分离。
- 来源溯源字段、结果状态、升级处理原因和分层审查。
- 完整的架构交接。

它无法证明模型总能正确选择、政策有效，或人工负责人具备资格。请补充场景评估和组织层面的审查。

### 步骤 4：运行故障优先测试（Step 4: Run failure-first tests）

运行：

```bash
python3 -m unittest discover -s code/tests -v
```

为每个领域至少增加一个夹具：

| 领域 | 注入的故障 | 预期处置 |
|---|---|---|
| 编排 | 依赖成环，或缺少部分完成状态 | 阻塞 |
| 工具与 MCP | 写入工具缺少幂等性 | 阻塞 |
| Claude Code | CI 继承交互式状态 | 阻塞 |
| 结构化输出 | 模式通过，但缺少来源溯源校验层 | 阻塞 |
| 可靠性 | 政策冲突没有升级处理路径 | 阻塞 |

不要削弱校验器来让有缺陷的材料包通过。修复设计，或者解释该不变量为何不适用，并用等效控制替代。

### 步骤 5：迁移到全部六种视角（Step 5: Transfer across all six lenses）

为其余每种情境写一页差异说明：

```text
保持不变的部分：
新增的来源或权限边界：
新增的工具或 MCP 要求：
新增的 Claude Code 配置要求：
新增的校验或输出要求：
新增的上下文或升级处理风险：
移除的控制及原因：
新增的控制及原因：
```

有效变更示例：

- 客户支持增加政策时效性检查，并在执行退款前要求批准。
- 代码生成增加仓库范围、路径规则和测试。
- 研究增加断言级合并，并保留来源冲突。
- 开发者生产力增加简洁的项目记忆层级和明确的命令。
- CI/CD 增加从干净状态开始的无界面审查和只读权限。
- 抽取增加可为空的未知值、证据区间和批处理结果核对。

来源溯源、错误、受限权限和验证的核心要求应在所有视角下持续成立。

### 步骤 6：论证权衡（Step 6: Defend tradeoffs）

撰写三份架构决策记录：

1. 单智能体与协调者加子智能体的对比。
2. 直接工具目录与 MCP 加渐进式发现的对比。
3. 交互式处理与异步批处理的对比。

每份记录都要包含情境、所选方案、被否决的备选方案、后果、证据、变更触发条件和负责人。ADR 不是产品偏好声明，而是解释某项选择为什么适合这个场景。

### 步骤 7：开展独立审查（Step 7: Conduct independent review）

向全新的审查者提供材料包、校验器输出、威胁夹具和评分标准，不要提供带有说服性设计论述的对话记录。要求发现项包含稳定 ID、受影响领域、证据、严重程度和必要修正。

随后，架构师应依据证据解决或驳回每项发现。再次运行确定性校验，并保存最终交接材料。

## 实际应用（Use It）

### 考试场景分析方法（Exam scenario method）

阅读场景时：

1. 写出后果、证据和权限边界。
2. 先画出确定性的前置依赖，再选择智能体。
3. 为每个角色提供最小工具范围。
4. 将共享配置与用户本地上下文分离。
5. 区分结构有效性、语义有效性和来源溯源有效性。
6. 传递部分完成的工作，并将不可重试的缺口升级处理。
7. 优先选择能够维持全部必要不变量的最小架构。

不要因为某个选项提到了更多 Claude 功能就选择它。应选择能够修复指定故障、又不会引入更大故障的控制。

### 提交证据（Submission evidence）

完整的综合项目包含：

- 一份完成的主要架构材料包。
- 一份有效 JSON 材料包及其校验器输出。
- 五页跨场景差异说明。
- 至少五个新增故障夹具，每个领域一个。
- 三份包含被否决备选方案的 ADR。
- 独立审查者的发现项及其处置结果。
- 通过测试的输出。
- 一份剩余风险与人工责任归属声明。

### 常见陷阱（Common traps）

- **拓扑优先（Topology first）：** 尚未明确需求和依赖，就先选择智能体。
- **把子智能体当函数（Subagent as function）：** 给确定性工具函数配置不必要的推理上下文。
- **把工具描述当授权（Tool description as authorization）：** 用自然语言替代服务端强制执行。
- **把个人配置当团队政策（Personal config as team policy）：** CI 和协作者无法复现行为。
- **把模式当真相（Schema as truth）：** 无依据的值也能通过类型检查。
- **把恢复会话当故障恢复（Resume as recovery）：** 用过期对话代替对外部状态的核对。
- **按场景名称各做一套设计（One design per scenario name）：** 共享架构原则始终无法迁移。
- **把功能堆叠当成熟度（Feature density as sophistication）：** 额外组件增加成本，却没有封堵故障路径。

### 练习（Exercises）

1. 从设计中移除一个子智能体，判断质量是否变化。
2. 在模型只需要上下文的地方，用 MCP 资源替换一个操作工具。
3. 将一条全局指令移入经过测试的路径规则。
4. 添加一个语义校验器，捕获模式有效但事实错误的断言。
5. 将长会话压缩成恢复材料包，并证明外部状态仍具有权威性。
6. 与另一位学习者交换架构材料包，运行对方的故障夹具。

## 关键术语（Key Terms）

- **场景视角（Scenario lens）：** 用来检验共享架构决策的业务情境。
- **变化点（Variation point）：** 在核心不变量保持不变时，预期会随场景变化的组件或政策。
- **能力矩阵（Capability matrix）：** 角色与允许使用的工具、数据和操作之间的映射。
- **架构不变量（Architecture invariant）：** 在跨组件和故障情况下都必须成立的条件。
- **故障夹具（Failure fixture）：** 用于证明检测和恢复行为的受控场景。
- **跨场景差异（Cross-scenario delta）：** 将一套架构适配到另一种情境所需的明确变更。
- **剩余风险（Residual risk）：** 实施控制后仍然存在的已知风险，附有负责人和处置方式。
- **架构交接（Architecture handoff）：** 为安全实施而提供的决策、证据、控制、缺口和后续责任归属材料包。

## 延伸阅读（Further Reading）

- [Claude 认证架构师基础考试指南（Claude Certified Architect Foundations Exam Guide）](https://everpath-course-content.s3-accelerate.amazonaws.com/instructor%2F6nizmqk8tpzpfjvt6qmmav7rh%2Fpublic%2F1783542750%2FClaude+Certified+Architect+%E2%80%93+Foundations+Exam+Guide.pdf)
- [Anthropic：构建有效的智能体（Building effective agents）](https://www.anthropic.com/research/building-effective-agents)
- [Anthropic：Claude Agent SDK](https://platform.claude.com/docs/en/agent-sdk/overview)
- [Anthropic：工具使用（Tool use）](https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview)
- [模型上下文协议规范（Model Context Protocol specification）](https://modelcontextprotocol.io/specification/latest)
- [Anthropic：结构化输出（Structured outputs）](https://platform.claude.com/docs/en/build-with-claude/structured-outputs)
- [AI Engineering from Scratch：编排模式（Orchestration Patterns）](../../../../../phases/14-agent-engineering/28-orchestration-patterns/)
- [AI Engineering from Scratch：持久执行（Durable Execution）](../../../../../phases/15-autonomous-systems/12-durable-execution/)
- [AI Engineering from Scratch：审查者智能体（Reviewer Agent）](../../../../../phases/14-agent-engineering/39-reviewer-agent/)

Agent SDK、Claude Code、API、MCP、上下文、模型和批处理的行为都可能变化。本课于 2026-08-08 核查了公开考试蓝图和参考资料。在固定实现细节之前，请核实最新官方文档和准确的运行时版本。
