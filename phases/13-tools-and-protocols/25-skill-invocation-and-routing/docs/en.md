# 技能调用与路由（Skill Invocation and Routing）

> 调用先作权限决定，再作相关性决定。好的描述帮助模型选择，好的策略决定该选择是否获准。

**Type:** Build
**Languages:** Python (stdlib)
**Prerequisites:** Phase 13 · 24（技能发现与渐进披露）
**Time:** ~105 分钟

## 学习目标（Learning Objectives）

- 区分用户显式调用、模型隐式调用、应用调用和技能间调用。
- 将人工可见性和模型资格建模为独立策略维度。
- 编写具有正向触发条件和近似未命中边界的路由描述。
- 在追踪和测试中分离资格、选择、激活、参数绑定和执行。
- 适配运行时专属调用字段，不将其呈现为可移植前置元数据。

## 问题（The Problem）

你安装了 `database-migration` 技能。用户可按名称运行它，但模型也看到描述，在有人问一般数据库问题时选择它。技能随后为本来只需解释的任务提出模式变更。

你添加 `user-invocable: false`，希望阻止人工运行。在另一个运行时，该字段被忽略。你添加 `disable-model-invocation: true`，希望技能完全消失。在理解它的运行时，用户仍能显式调用。

字段名没有错，错的是心智模型。“用户能看到”“模型能选择”“应用能预加载”和“内部工具能执行”是独立事实。单个名为 `invocable` 的布尔值无法表达它们。

路由还有第二种失败模式。描述含糊时，多个技能都看似可用；描述堆满关键词时，无关任务也会触发。目录是概率性接口：既要紧凑到能放下，又要具体到能路由。

## 概念（The Concept）

### 五种通道可启动生命周期（Five channels can start the lifecycle）

| 行为者 | 调用形式 | 典型用途 | 主要风险 |
|---|---|---|---|
| 人类用户 | 在 UI 或提示词点名技能 | 有意选择流程 | 用户期待宿主未授予的可用性或权限 |
| 模型或自主智能体 | 根据任务上下文选择目录条目 | 自动采用专家规程 | 路由假阳性 |
| 应用 | 通过运行时代码激活或预加载 | 固定产品流程 | 隐藏耦合到单一宿主 |
| 另一个技能或子智能体 | 将精确技能作为工作流依赖请求 | 组合 | 循环、缺失依赖或上下文泄漏 |
| 评估框架 | 在固定场景激活精确技能 | 可重复测量 | 测试技能时意外绕过正在研究的生产策略 |

可移植 Agent Skills 规范定义包，不标准化通用斜杠命令 UI、隐式路由标志、应用 API 或子智能体生命周期。

### 五个调用阶段（The five invocation stages）

```figure
skill-invocation-stages
```

精确使用这些词：

- **有资格（Eligible）**表示策略允许此行为者请求技能。
- **已选择（Selected）**表示用户点名或路由器判断相关。
- **已激活（Activated）**表示指令进入工作上下文。
- **执行中（Executing）**表示智能体开始在指令下进行模型或工具工作。
- **已完成（Completed）**表示输出满足独立成功检查。

只记录 `skill_used=true` 的追踪隐藏了失败所在边界。

### 人工与模型调用构成 2×2 矩阵（Human and model invocation form a 2x2 matrix）

| 人工可调用 | 模型可调用 | 模式 | 合适示例 |
|:---:|:---:|---|---|
| 是 | 是 | 共享 | 代码解释、测试规划、文档审查 |
| 是 | 否 | 仅人工 | 发布准备、账单导出、破坏性清理计划 |
| 否 | 是 | 仅模型 | 内部风格指南、领域参考、自动支持规程 |
| 否 | 否 | 禁用或仅应用 | 分阶段发布、已弃用包、程序化预加载 |

矩阵是策略模型，不是标准 YAML。

一个当前宿主用 `disable-model-invocation: true` 表示仅人工，用 `user-invocable: false` 表示仅模型，默认两者都允许。另一个宿主使用 `agents/openai.yaml` 中的 `allow_implicit_invocation: false`，保留显式调用并禁用隐式选择。这些是运行时适配器，未知宿主可能忽略。

容易混淆的细节很重要：`user-invocable: false` 不表示“模型不能使用”，它在定义此字段的宿主中移除用户直接调用。`disable-model-invocation: true` 不表示“技能禁用”，它移除模型发起选择，但保留用户显式访问。

### 显式调用以身份为先（Explicit invocation is identity-first）

显式调用直接提供身份：

```text
/release-readiness v2.4.0
```

或：

```text
release-readiness 检查 v2.4.0，不发布
```

当前 Codex 界面文档说明用 `/skills` 选择，在请求中用普通技能名显式调用。Claude Code 文档说明 `/skill-name` 和宿主专属参数展开。精确语法、菜单可见性、引用规则和变量展开归宿主所有。

显式请求仍需通过策略。点名技能不应绕过缺失权限、工作区约束、批准门槛或运行时隔离。

### 隐式调用以描述为先（Implicit invocation is description-first）

隐式路由时，模型最初看到目录元数据而非全文，因此描述就是技能路由接口。

薄弱描述：

```yaml
description: 帮助处理发布。
```

过宽描述：

```yaml
description: 用于发布、版本、包、构建、部署、公开发布、标签、变更日志、GitHub、CI 或软件任务。
```

有界描述：

```yaml
description: 检查已准备好的发布候选版本并生成就绪报告。当用户询问版本、标签、包或镜像是否准备好发布时使用；不用于普通构建失败或功能开发。
```

有界版本包含：

1. **能力（Capability）：** 检查已准备候选。
2. **输出（Output）：** 就绪报告。
3. **正向边界（Positive boundary）：** 询问发布制品是否就绪。
4. **负向边界（Negative boundary）：** 普通构建和开发不在范围内。

两个相邻技能共享词汇时，负向边界很有用，但不能替代近似未命中评估。

### 路由是带弃权选项的分类（Routing is classification with an abstain option）

对技能 `s` 和请求 `x`，设想路由器分数：

```text
score(s, x) = capability_match + trigger_match + context_match - exclusion_match - ambiguity_penalty
```

实际评分可能是 LLM 决定而非算术，工程原则仍成立：选择应超过阈值，也胜过竞争技能。证据弱时弃权。

```figure
skill-routing-abstention
```

高影响技能即使描述很强，隐式路由也可能不合适。假阳性成本超过自动选择便利时，使用仅人工策略。

### 资格必须先于排序（Eligibility must precede ranking）

不要给所有发现技能评分、选最强匹配后才检查该技能策略。被阻止的最高匹配会错误阻止考虑有资格的较低分候选。

隐式路由按此顺序：

1. 按请求行为者和活动宿主适配器过滤已发现技能。
2. 仅给有资格候选评分。
3. 若满足阈值和歧义规则，选择最强有资格匹配。
4. 无有资格候选，或有资格分数不足时弃权。

假设 `incident-triage` 得分 `0.80`，但宿主扩展禁止模型调用。`incident-review` 得分 `0.55`，允许模型调用。路由器应将 `incident-review` 作为最佳有资格候选评估，不应选择 `incident-triage`、拒绝它，然后停止。

此顺序还避免策略变化改变相关性分数含义。资格定义选择集合，相关性对该集合排序。

### 路由评估需要近似未命中（Routing evals need near misses）

正例证明召回：

```json
{"prompt":"Is version 2.4.0 ready to publish?","expected":"release-readiness"}
```

明确负例证明基础精确率：

```json
{"prompt":"Explain rotary position embeddings.","expected":null}
```

近似未命中揭示边界质量：

```json
{"prompt":"Why did today's package build fail?","expected":"build-diagnostics"}
```

该近似未命中与发布技能共享 `package` 和 `build`，但属于别处。只含明显正例和无关负例的路由集会高估质量。

### 参数有三种表示（Arguments have three representations）

调用参数跨越多个边界：

```figure
skill-argument-boundaries
```

每个边界都应保留意图，不把文本当代码。

- 宿主解析器决定命令语法和引用。
- 技能按宿主规则接收绑定文本或变量。
- 指令验证必需值和默认值。
- 工具调用将值转为类型化模式并重新验证。

不要将原始参数插入 shell 命令。优先用参数向量调用脚本，或使用类型化 MCP 工具。

### 应用调用是显式编排（Application invocation is explicit orchestration）

产品可因流程已知任务类型而激活技能。例如，用户按下审查后，拉取请求审查服务可预加载 `pull-request-risk-review`。

这消除路由不确定性，却引入运行时 API 依赖。将适配器置于可移植正文之外：

```figure
skill-host-adapter
```

由另一个兼容客户端打开时，技能仍应可理解。

### 技能间调用是类似工具的边（Skill-to-skill invocation is a tool-like edge）

假设依赖文件变化时，`release-readiness` 请求 `security-change-review`。

调用方应提供：

- 目标技能身份；
- 有界任务和制品路径；
- 预期响应契约；
- 调用原因；
- 不可用时的回退；
- 最大深度或循环规则。

```json
{
  "target_skill": "security-change-review",
  "task": "Review dependency changes in the candidate diff",
  "inputs": ["artifacts/release.diff"],
  "expected": "risk-report.json",
  "max_depth": 2
}
```

第二个技能不是盲目粘入第一个。宿主决定如何激活，以及是否共享上下文、在分叉中运行，或通过工具结果返回。

### 上下文生命周期由宿主定义（Context lifecycle is host-specific）

激活后，技能正文可能留在对话中、压缩时被总结，或在委托上下文运行。工具许可可能仅持续一轮，而指令保留更久。子智能体可能收到技能，却没有父级完整历史。

不要编写依赖不可见生命周期假设的技能。将持久输出放入文件或类型化状态，使重入安全，并说明中断后必须重新加载什么。

```markdown
恢复时，若 `artifacts/release-readiness.json` 存在则读取。
继续前重新验证候选提交。
不要重复幂等键已记录的外部写入。
```

## 动手实现（Build It）

`code/main.py` 将策略和路由实现为独立适配器。

模型包含：

- `Actor`：人工、模型、自主智能体、应用、技能和框架调用方；
- `SkillMetadata`：路由身份；
- `InvocationPolicy`：人工/模型矩阵；
- `InvocationRequest` 和 `InvocationDecision`：可追踪输入与结果；
- `CorePolicyAdapter`：无宿主扩展的可移植行为；
- `ExtensionPolicyAdapter`：已识别运行时字段；
- `build_invocation_matrix(policy)`：2×2 视图；
- `route_request(skills, request, adapter)`：先资格过滤，再相关性排序、选择和拒绝。

运行：

```bash
cd phases/13-tools-and-protocols/25-skill-invocation-and-routing
python3 code/main.py
python3 -m unittest discover -s code/tests -v
```

演示打印一个矩阵，以及人工显式、模型隐式、自主智能体、应用、技能组合和框架通道的决定。扩展适配器结果显示，被阻止的最高词汇匹配在有资格替代项排序前被移除。它还包含精确名称允许列表。无需模型 API。确定性路由器用于让策略边界可检查，不声称词汇匹配能重现生产模型路由。

### 为何核心与扩展适配器分离（Why core and extension adapters are separate）

如果一个解析器为每个观察到的前置元数据字段赋予含义，就会静默将运行时约定提升为虚假标准。独立适配器迫使调用方点明当前启用哪种宿主语义。

`CorePolicyAdapter` 仅使用应用提供策略。`ExtensionPolicyAdapter` 识别显式宿主字段集合，并记录哪个字段改变了决定。

## 实际应用（Use It）

发布技能前编写调用契约：

```yaml
actors:
  human: allow
  model: deny
  application: allow
  skill: deny
explicit_name: release-readiness
arguments:
  candidate: required
  publish: fixed_false
ambiguity: ask_user
missing_dependency: stop
context:
  durable_state: artifacts/release-readiness.json
  max_composition_depth: 2
```

此契约是适配器和测试的设计文档。除非标准明确采纳，否则不是可移植 `SKILL.md` 前置元数据。

## 交付（Ship It）

本课生成 `skill-invocation-router` 包，含调用模型参考、宿主策略示例和不执行目标操作的 CLI。它评估一个人工、模型、自主智能体、应用、技能组合或框架请求，返回含通道、适配器、分数和原因的 JSON 决定。

单请求 CLI 是策略探针，不是完整触发评估。使用第 27 课标注正例和近似未命中设计，计算混淆计数、精确率、召回率和重复运行稳定性。

## 练习（Exercises）

1. 创建人工/模型矩阵全部四行，为每行写一个合法用例。
2. 向 `CorePolicyAdapter` 添加仅应用激活，证明人工和模型调用方仍被拒绝。
3. 为部署技能写十个近似未命中。每个提示词必须共享技能词汇，却属于不同流程。
4. 在前两名路由分数间添加歧义差值，差值过小时返回 `ask`。
5. 为技能间请求添加最大组合深度，检测两个技能的循环。
6. 将同一标注集通过核心和扩展适配器运行，解释每个变化决定。

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|---|---|---|
| 显式调用（Explicit invocation） | “斜杠命令” | 行为者直接提供技能身份，受策略约束 |
| 隐式调用（Implicit invocation） | “模型选择” | 路由器根据任务上下文从有资格目录元数据选择 |
| 用户可调用（User-invocable） | “人可以使用” | 宿主专属菜单或直接调用属性，不是核心字段 |
| 模型可调用（Model-invocable） | “智能体可以使用” | 宿主策略下隐式模型选择的资格 |
| 调用适配器（Invocation adapter） | “前置元数据解析器” | 将宿主字段和 API 映射到声明策略模型的代码 |
| 近似未命中（Near miss） | “困难负例” | 类似技能预期输入但不应触发的请求 |
| 弃权（Abstention） | “未选择技能” | 证据缺失或含糊时的有意路由结果 |

## 延伸阅读（Further Reading）

- [优化技能描述](https://agentskills.io/skill-creation/optimizing-descriptions)：正向触发、具体性和评估。
- [评估技能](https://agentskills.io/skill-creation/evaluating-skills)：触发和输出评估设计。
- [OpenAI：构建技能](https://learn.chatgpt.com/docs/build-skills)：当前 Codex 显式和隐式调用控制。
- [Claude Code 技能](https://code.claude.com/docs/en/skills)：一个宿主的 `user-invocable`、`disable-model-invocation`、参数和委托上下文。
