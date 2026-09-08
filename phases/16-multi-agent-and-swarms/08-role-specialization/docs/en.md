# 角色专门化：规划者、批评者、执行者、验证者（Role Specialization — Planner, Critic, Executor, Verifier）

> 2026 年最常见的多智能体分工：一个规划，一个执行，一个批评或验证。MetaGPT（arXiv:2308.00352）将其形式化为编码在角色提示词中的标准操作规程（Standard Operating Procedure，SOP）：产品经理、架构师、项目经理、工程师、质量保证工程师，遵循 `Code = SOP(Team)`。ChatDev（arXiv:2307.07924）通过“聊天链（Chat chain）”串联设计者、程序员、评审员、测试员，并采用“沟通式去幻觉（Communicative dehallucination）”，即智能体明确索取缺失细节。验证者承担关键作用：Cemri 等人（MAST，arXiv:2503.13657）表明，每种多智能体失败都可追溯到验证缺失或失效。PwC 报告，CrewAI 中的结构化验证循环带来 7 倍准确率提升（10% → 70%）。

**Type:** Learn + Build
**Languages:** Python (stdlib)
**Prerequisites:** Phase 16 · 04 原语模型（Primitive Model）, Phase 16 · 05 监督者（Supervisor）
**Time:** ~60 分钟

## 问题（Problem）

通用多智能体系统产出通用结果。群聊中三个编码者写出同样平庸代码的三种版本。增加智能体、增加轮次，仍可能达不到质量门槛。

解决办法不是更多智能体，而是*不同*的智能体。分配不同角色，给批评者规划者没有的工具，给验证者客观测试套件。系统由此获得有依据纠正的内部异议，而非并行猜测。

## 概念（Concept）

### 四种标准角色（The four canonical roles）

**规划者（Planner）。** 读取目标，产出步骤列表或规范。工具：知识检索、文档。输出：结构化计划。

**执行者（Executor）。** 每次读取计划中的一步，产出交付物。工具：实际工作工具（代码编译器、shell、API 客户端）。输出：交付物。

**批评者（Critic）。** 依据规划者意图审阅执行者输出。工具：交付物只读访问、静态分析。输出：接受/拒绝及理由。

**验证者（Verifier）。** 读取交付物，运行确定性检查。工具：测试运行器、类型检查器、模式校验器。输出：通过/失败及证据。

批评者主观、有立场，通常基于 LLM；验证者客观、确定性，通常基于代码。两者不是同一角色。

### MetaGPT 的 SOP 模式（MetaGPT's SOP pattern）

MetaGPT（arXiv:2308.00352）将软件工程 SOP 编码为角色提示词：

- **产品经理（Product Manager）**编写产品需求文档（PRD）。
- **架构师（Architect）**产出系统设计。
- **项目经理（Project Manager）**拆分任务。
- **工程师（Engineer）**实现。
- **质量保证工程师（QA Engineer）**运行测试。

每个角色都有严格的输入输出模式。角色提示词说明角色*是什么*以及*必须产出什么*。`Code = SOP(Team)` 的表述意味着：确定性 SOP 将 LLM 团队变为可预测流水线。

### ChatDev 的沟通式去幻觉（ChatDev's communicative dehallucination）

ChatDev 增加一个关键动作：执行者需要计划中未给出的具体细节时，先明确询问设计者再继续。这可防止 LLM 看似合理地编造细节这一典型失败。

实现方式：角色提示词包含“需要未提供的具体信息时，先按角色名称询问相关角色，再产出结果”。

### 验证者为何最重要（Why verifier matters most）

Cemri 等人（MAST）追踪了 1642 次多智能体执行失败。21.3% 是验证缺口（Verification gap），即系统交付了无人检查的答案。其余 79% 往往可追溯到“有检查，但静默失败或根本没运行”。验证者承担关键作用。

PwC 报告（2025 年 CrewAI 部署），增加结构化验证循环后，准确率从 10% 提升至 70%。一个角色带来 7 倍收益。

### 批评者与验证者（Critic vs verifier）

- 批评者是评审交付物质量的 LLM。主观，可能被看似合理的文字蒙蔽。
- 验证者是在交付物上运行的确定性程序。客观，给出带证据的通过/失败结果。

两者都用。批评者发现验证者无法表述的品味问题；验证者发现仅在运行时出现、批评者看不到的缺陷。

### 反模式（The anti-pattern）

系统每个角色都是 LLM，每个角色的输出都是“我看没问题”。这是典型 MAST 故障模式。至少增加一个由代码而非 LLM 决定通过/失败的验证者。

### 框架映射（Framework mappings）

- **CrewAI**：`Agent(role, goal, backstory)` 是教科书式专门化接口。
- **LangGraph**：节点可有专门提示词，边强制执行流水线。
- **AutoGen**：GroupChat 中使用单词名称、面向特定角色的 ConversableAgents。
- **OpenAI Agents SDK**：角色专门化 Agents 之间的交接工具。

```figure
swarm-roles
```

## 动手实现（Build It）

`code/main.py` 实现构建简单 Python 函数的 4 角色流水线：

- **规划者（Planner）**产出规范。
- **执行者（Executor）**生成代码字符串。
- **批评者（Critic）**模拟 LLM，指出明显问题。
- **验证者（Verifier）**在沙箱（`exec`）中运行生成代码，用测试用例检验。

演示运行两次：一次执行者生成正确代码，批评者和验证者都通过；另一次生成偏离规范的代码，批评者因代码看起来合理而漏掉缺陷，验证者因测试失败而发现。

运行：

```
python3 code/main.py
```

## 实际应用（Use It）

`outputs/skill-role-designer.md` 接收任务，产出角色名单（3-5 个角色）、每个角色的输入输出模式和验证者检查。在将智能体接入框架前使用。

## 交付成果（Ship It）

检查清单：

- **至少一个确定性验证者。** 绝不全部使用 LLM。
- **每个角色明确输入输出模式。** 规划者返回规范而非散文；执行者读取该模式。
- **沟通式去幻觉。** 信息缺失时执行者必须询问规划者，绝不编造。
- **批评者/验证者顺序。** 先运行批评者（便宜，发现设计问题），再运行验证者（慢，发现缺陷）。
- **循环预算。** 批评者与执行者最多修改 2 轮，再升级交由人类。

## 练习（Exercises）

1. 运行 `code/main.py`，观察验证者如何发现批评者遗漏的缺陷。增加统计 `return` 次数的静态分析检查作为额外验证者。它能发现运行时测试漏掉的什么问题？
2. 增加第五个角色“需求分析员”，将用户愿望转换为可交给规划者的规范。哪些沟通式去幻觉问题应向上提交给它？
3. 阅读 MetaGPT 第 3 节“智能体（Agents）”，列出其 5 个角色的输入输出模式。
4. 阅读 ChatDev 聊天链图（arXiv:2307.07924 图 3），指出沟通式去幻觉在哪打破原本无限的循环。
5. PwC 的 7 倍准确率收益来自验证循环。设想三个增加验证者也无帮助的任务：无法确定性检查正确性，或检查成本高得难以承担。

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|------|----------------|------------------------|
| 角色专门化（Role specialization） | “不同智能体，不同工作” | 为规划者/执行者/批评者/验证者调校不同系统提示词。 |
| SOP 模式（SOP pattern） | “编码的标准操作规程” | MetaGPT 思路：每个角色严格的输入输出模式把团队变成流水线。 |
| 沟通式去幻觉（Communicative dehallucination） | “先问，别编” | ChatDev 模式：缺细节时执行者问规划者，而非编造。 |
| 批评者（Critic） | “LLM 评审员” | 主观、有立场的评审者，发现品味问题，但可能被合理文字蒙蔽。 |
| 验证者（Verifier） | “确定性检查” | 基于代码判定通过/失败，如测试运行器、类型检查器、模式校验器，不会被蒙蔽。 |
| 验证缺口（Verification gap） | “没人检查” | 占 MAST 失败的 21.3%。交付答案时未运行本能发现缺陷的检查。 |
| 修改循环（Revision loop） | “批评者退回” | 批评者拒绝后，执行者根据反馈重跑，需要预算。 |
| 全 LLM 反模式（All-LLM anti-pattern） | “我看没问题” | 每个角色都是 LLM，没有确定性检查，是典型 MAST 故障。 |

## 延伸阅读（Further Reading）

- [Hong 等：MetaGPT，多智能体协作元编程（MetaGPT: Meta Programming for Multi-Agent Collaboration）](https://arxiv.org/abs/2308.00352)：SOP 作为角色提示词的参考论文
- [Qian 等：软件开发沟通智能体（Communicative Agents for Software Development，ChatDev）](https://arxiv.org/abs/2307.07924)：聊天链 + 沟通式去幻觉
- [Cemri 等：多智能体 LLM 系统为何失败（Why Do Multi-Agent LLM Systems Fail?）](https://arxiv.org/abs/2503.13657)：MAST 分类法，验证缺口占失败的 21.3%
- [CrewAI 文档：智能体角色（Agent roles）](https://docs.crewai.com/en/introduction)：生产角色定义接口
