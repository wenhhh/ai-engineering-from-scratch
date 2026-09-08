# 层级架构及其故障模式（Hierarchical Architecture and Its Failure Mode）

> 层级结构（Hierarchical）就是嵌套的监督者：管理智能体下设子管理者，再下设工作者。CrewAI `Process.hierarchical` 是教科书式版本：`manager_llm` 动态委派任务并验证输出。LangGraph 对应形式为 `create_supervisor(create_supervisor(...))`。当任务确实呈现组织结构图时，这种模式很自然。但它也最容易陷入管理循环：管理智能体错误分配工作、误解下级输出或无法达成共识。串行模式往往胜过它。

**Type:** Learn + Build
**Languages:** Python (stdlib)
**Prerequisites:** Phase 16 · 05 监督者模式（Supervisor Pattern）
**Time:** ~60 分钟

## 问题（Problem）

理解监督者模式后，自然会问：“如果工作者本身也是监督者呢？”团队有子团队，公司部门下有子部门。层级架构映射了这种结构。

问题在于，LLM 管理者不等于人类管理者。人类对下属知道什么有稳定的先验认知。LLM 管理者每轮都根据上下文重新推断组织关系。上下文稍有漂移，整棵树就会错配工作。

## 概念（Concept）

### 结构（The shape）

```
                 管理者
                 ┌─────┐
                 └──┬──┘
           ┌────────┴────────┐
           ▼                 ▼
       子管理者 A        子管理者 B
       ┌─────┐           ┌─────┐
       └──┬──┘           └──┬──┘
         ┌┴──┬──┐          ┌┴──┐
         ▼   ▼  ▼          ▼   ▼
       W1  W2  W3         W4  W5
```

每个内部节点负责规划、委派与综合，只有叶节点执行工作。

### 适用优势（Where it shines）

- **明确的组织映射。** 若真实任务按部门划分（“法务评审文档，财务评审文档，工程评审文档，再汇总给高管”），层级关系就是显式的。
- **局部汇总（Local summarization）。** 每个子管理者先综合本团队输出，再交给顶层管理者。顶层看到的是三个子管理者摘要，而非十五个工作者输出。

### 失效之处（Where it breaks）

2026 年复盘反复发现三种故障模式：

1. **任务分配错误（Task assignment error）。** 管理者读目标时臆造分解方案，把任务交给错误子管理者。子管理者忠实执行收到的任务，错误直到顶层综合才显现，已经离人类原本可发现错误的位置远了一层。
2. **输出误解（Output misinterpretation）。** 子管理者返回“无法验证断言 X”，顶层概括为“断言 X 未获确认”。含义在每层漂移。
3. **共识循环（Consensus loops）。** 两个子管理者意见不一；顶层要求协调；它们重新向下委派；工作者重跑；子管理者返回稍有不同的答案；如此循环。CrewAI 的 `Process.hierarchical` 用步数限制防范，但限制本身又成了超参数。

### 决定性问题（The deciding question）

串行（线性流水线）还是层级：任务真的有独立子团队，还是一条伪装成树的线性流程？若是后者，用串行；若是前者，用层级，但要为明确的协调规则预留预算。

### 角色框架实现（Role-framework implementation）

CrewAI 的 `Process.hierarchical` 在专职团队上方设置管理者 LLM。管理者：

- 接收顶层任务，
- 把子任务分给团队，
- 评估团队输出，
- 决定接受、重新委派还是迭代。

文档：https://docs.crewai.com/en/introduction（在核心概念 Core Concepts 下查找“层级流程 Hierarchical Process”）。

### 图框架实现（Graph-framework implementation）

LangGraph 使用嵌套的 `create_supervisor` 调用。内层监督者拥有自己的图，外层把内层图视为不透明节点。调试时比 CrewAI 更清晰，因为可以分别单步检查每张图；但更难表达树结构的动态重塑。

参考：https://reference.langchain.com/python/langgraph-supervisor。

```figure
swarm-hierarchy-token
```

## 动手实现（Build It）

`code/main.py` 运行一个 3 层结构：

- 顶层管理者：把任务拆为“工程”和“法务”分支，
- 工程子管理者：拆为“前端”和“后端”工作者，
- 法务子管理者：一个工作者。

演示对比正常路径（各方一致）与**扰动路径（Perturbed path）**：顶层分解时将“法务”误标为“财务”，观察错误级联传播。子管理者忠实执行财务工作，顶层综合器报告财务发现，原来的法务问题无人回答。

运行：

```
python3 code/main.py
```

输出并排展示两条路径中“提出了什么要求”与“交付了什么”。

## 实际应用（Use It）

`outputs/skill-hierarchy-fitness.md` 评估给定任务应使用层级、串行还是扁平监督者。输入：任务描述、组织结构、协调预算。输出：模式建议及需要防范的具体故障模式。

## 交付成果（Ship It）

交付层级模式时：

- **树深度上限设为 2。** 三层就会让大多数错误脱离可观测范围。
- **明确协调预算。** 设置顶层管理者必须作出最终决定前的最大轮数，通常为 2。
- **每次综合保留来源（Provenance）。** 每个节点的摘要必须引用生成它的叶节点输出。
- **分解漂移告警。** 每步记录管理者分解结果，与用户查询比较。若分解不再覆盖查询，触发告警。

## 练习（Exercises）

1. 运行 `code/main.py`，对比正常与扰动路径。经过几层管理者交接，顶层输出就会完全偏离用户问题？
2. 增加第三层（顶层 → 子层 → 子子层 → 工作者）。测量深度增加时，扰动路径自行纠正与完全偏离的发生频率。
3. 在每个子管理者处实现“金丝雀（Canary）”工作者，始终原样接收原始用户问题。用它的答案检测分解漂移。当金丝雀答案与综合答案不同，管理者应如何反应？
4. 阅读 CrewAI 的 `Process.hierarchical` 文档，指出一项具体防护机制（步数限制、manager_llm 约束），描述它针对的故障模式。
5. 比较嵌套 LangGraph 监督者与 CrewAI 层级模式。哪种能以更低成本检测协调循环？

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|------|----------------|------------------------|
| 层级结构（Hierarchical） | “组织结构图模式” | 监督者之上还有监督者，只有叶节点执行工作。 |
| 管理者 LLM（Manager LLM） | “老板” | 在内部节点负责分解、分配和验证的 LLM。 |
| 分解漂移（Decomposition drift） | “老板偏离了主题” | 顶层管理者的拆分不再覆盖原始问题。 |
| 协调循环（Reconciliation loop） | “无休止开会” | 子管理者有分歧，顶层重新委派，工作者重跑，循环到预算耗尽。 |
| 深度 2 上限（Depth-2 ceiling） | “别超过 2 层” | 经验防护机制：3 层及以上会摧毁可观测性。 |
| 金丝雀问题（Canary question） | “每层都有真实基准” | 始终原样接收原始查询、用于检测漂移的工作者。 |
| 来源链（Provenance chain） | “谁说了什么” | 从每次综合追溯到生成它的叶节点输出。 |

## 延伸阅读（Further Reading）

- [CrewAI 简介：Process.hierarchical（CrewAI introduction）](https://docs.crewai.com/en/introduction)：带管理者 LLM 的教科书式层级模式
- [LangGraph 监督者参考（LangGraph supervisor reference）](https://reference.langchain.com/python/langgraph-supervisor)：通过 `create_supervisor` 嵌套监督者
- [Anthropic 工程：Research 系统（Research system）](https://www.anthropic.com/engineering/multi-agent-research-system)：Anthropic 为何有意选择扁平监督者而非层级模式
- [Cemri 等：多智能体 LLM 系统为何失败（Why Do Multi-Agent LLM Systems Fail?）](https://arxiv.org/abs/2503.13657)：MAST 分类法；协调故障章节记录了分解漂移
