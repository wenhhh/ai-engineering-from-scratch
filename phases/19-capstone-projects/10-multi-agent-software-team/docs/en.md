# 综合实践 10：多智能体软件工程团队（Multi-Agent Software Engineering Team）

> 2026 年的多智能体工程团队形态已趋于一致：架构师制定计划，N 个编码者在并行工作树（Worktree）中实现，评审者把关，测试者验证。SWE-AF 的工厂架构（Factory Architecture）、MetaGPT 的角色提示词、AutoGen 0.4 的类型化执行者图（Typed Actor Graph）、Cognition 的 Devin 和 Factory 的 Droids 都独立采用了这种形态。并行工作树用实际运行时间换取吞吐量，共享状态和交接协议成为故障面。本综合实践要求构建团队，在 SWE-bench Pro 上评估，并报告哪些交接（Handoff）失效以及频率。

**Type:** Capstone
**Languages:** Python / TypeScript（智能体）, Shell（工作树脚本）
**Prerequisites:** 阶段 11（大语言模型工程）、阶段 13（工具）、阶段 14（智能体）、阶段 15（自主系统）、阶段 16（多智能体）、阶段 17（基础设施）
**涉及阶段（Phases exercised）:** P11 · P13 · P14 · P15 · P16 · P17
**Time:** 40 小时

## 问题（Problem）

单智能体编码运行框架（Harness）在大型任务上会遇到上限。原因不是某个智能体能力弱，而是 20 万词元的上下文无法同时容纳架构计划、四份并行代码库切片、评审意见和测试输出。多智能体工厂将问题拆开：架构师负责计划，编码者在并行工作树中负责实现，评审者把关，测试者验证。SWE-AF 的“工厂”架构、MetaGPT 的角色和 AutoGen 的类型化执行者图，这三种表述描述的是相同形态。

故障面在于交接：架构师的计划编码者无法实现，编码者的差异互相冲突，评审者批准虚构的修复，测试者与仍在写代码的编码者发生竞态（Race）。你将构建这样一个团队，在 50 个 SWE-bench Pro 问题上运行，追踪每次交接并发布事后复盘（Post-Mortem）。

## 概念（Concept）

角色是类型化智能体。**架构师（Architect）**（Claude Opus 4.7）读取问题、编写计划，并拆成接口明确的子任务。**编码者（Coders）**（Claude Sonnet 4.7，N 个并行实例，每个使用一个 `git worktree` + Daytona 沙箱）独立实现子任务。**评审者（Reviewer）**（GPT-5.4）读取合并差异，批准或提出具体修改要求。**测试者（Tester）**（Gemini 2.5 Pro）隔离运行测试套件，报告通过／失败并附交付物。

通信通过共享任务看板（Task Board）进行，以文件或 Redis 为后端。各角色消费自己获准处理的任务。交接使用符合智能体间协议（Agent-to-Agent，A2A）类型的消息。协调关注点包括：合并冲突解决（协调者角色或自动三方合并）、共享状态同步（编码者开始后冻结计划，重规划作为独立事件）、评审者把关（不能批准自己编写或建议的修改）。

词元放大（Token Amplification）是隐性成本。每个角色边界都会增加摘要提示词和交接上下文。单智能体的 40 轮运行，可能成为四个角色总计 160 轮。评分标准特别衡量相对单智能体基线的词元效率，因为问题不是“多智能体能否工作”，而是“每美元产出是否更好”。

## 架构（Architecture）

```
GitHub 问题 URL
      |
      v
架构师（Architect，Opus 4.7）
   读取问题，生成含子任务与接口的计划
      |
      v
任务看板（Task Board，文件 / Redis）
      |
   +-- 子任务 1 ---+-- 子任务 2 ---+-- 子任务 3 ---+-- 子任务 4 ---+
   v                v                v                v                v
编码者 A          编码者 B          编码者 C          编码者 D          （4 路并行）
 (Sonnet)         (Sonnet)         (Sonnet)         (Sonnet)
 工作树 A         工作树 B         工作树 C         工作树 D
 Daytona          Daytona          Daytona          Daytona
      |                |                |                |
      +--------+-------+-------+--------+
               v
           合并协调者（Merge Coordinator；三方合并 + 冲突解决）
               |
               v
           评审者（Reviewer，GPT-5.4）
               |
               v
           测试者（Tester，Gemini 2.5 Pro） -> 通过？ -> 创建 PR
                                           -> 失败？ -> 返回编码者
```

## 技术栈（Stack）

- 编排（Orchestration）：LangGraph，共享状态 + 每智能体子图
- 消息：A2A 协议（Google 2025），支持类型化智能体间消息
- 模型：Opus 4.7（架构师）、Sonnet 4.7（编码者）、GPT-5.4（评审者）、Gemini 2.5 Pro（测试者）
- 工作树隔离：每编码者执行 `git worktree add`，并配 Daytona 沙箱
- 合并协调者：自定义三方合并（Three-Way Merge）+ LLM 协助解决冲突
- 评估：SWE-bench Pro（50 个问题）、SWE-AF 场景，HumanEval++ 用于单元测试
- 可观测性（Observability）：Langfuse 跟踪区段（Span）带角色标签，逐智能体核算词元
- 部署：K8s 中每个角色对应独立 Deployment，HPA 根据积压量扩缩容

```figure
ce-team-handoff
```

## 动手实现（Build It）

1. **任务看板（Task Board）。** 文件支持的 JSONL，包含类型化消息：`plan_request`、`subtask`、`diff_ready`、`review_needed`、`test_needed`、`approved`、`rejected`、`replan_needed`。智能体按标签订阅。

2. **架构师（Architect）。** 读取 GitHub 问题，用要求明确子任务接口的计划模板运行 Opus 4.7，接口包含改动文件、公共函数和测试影响。输出一条 `plan_request`，内含子任务有向无环图（Directed Acyclic Graph，DAG）。

3. **编码者（Coders）。** N 个并行工作者，各自从看板领取一个子任务。每个创建全新的 `git worktree add` 分支和 Daytona 沙箱，实现子任务，输出 `diff_ready`，附补丁与测试变化。

4. **合并协调者（Merge Coordinator）。** 所有编码者完成后，将 N 个分支三方合并到暂存分支。仅有文件级重叠时才由 LLM 协助解决冲突。

5. **评审者（Reviewer）。** GPT-5.4 读取合并后的差异，不能批准自己编写的差异。输出 `approved`（不做额外操作），或输出 `review_feedback`，将具体修改请求路由回相关编码者。

6. **测试者（Tester）。** Gemini 2.5 Pro 在干净沙箱中运行测试套件并捕获交付物。输出 `test_passed`，或带堆栈轨迹的 `test_failed`。失败测试返回负责对应失败子任务的编码者。

7. **交接核算（Handoff Accounting）。** 每条跨角色边界消息都在 Langfuse 中建立跟踪区段，记录载荷大小与使用的模型。计算每子任务词元放大率（coder_tokens + reviewer_tokens + tester_tokens + architect_share / coder_tokens）。

8. **评估（Eval）。** 在 50 个 SWE-bench Pro 问题上运行。将 pass@1 和每个已解决问题的美元成本与单智能体基线比较：一个 Sonnet 4.7，在单个工作树中运行。

9. **事后复盘（Post-Mortem）。** 对每个失败问题，识别失效交接：计划过于模糊、合并冲突、评审错误批准、测试偶发失败。生成交接失败直方图（Histogram）。

## 实际应用（Use It）

```
$ team run --issue https://github.com/acme/widget/issues/842
[architect] plan: 4 subtasks (parser, cache, api, migration)
[board]     dispatched to 4 coders in parallel worktrees
[coder-A]   subtask parser  -> 42 lines, tests pass locally
[coder-B]   subtask cache   -> 88 lines, tests pass locally
[coder-C]   subtask api     -> 31 lines, tests pass locally
[coder-D]   subtask migration -> 19 lines, tests pass locally
[merge]     3-way merge: 0 conflicts
[reviewer]  comments on cache (thread pool sizing); routed to coder-B
[coder-B]   revision: 92 lines; submits
[reviewer]  approved
[tester]    all 412 tests pass
[pr]        opened #3382   4 coders, 1 revision, $4.90, 18m
```

## 交付成果（Ship It）

`outputs/skill-multi-agent-team.md` 是交付物。给定问题 URL 与并行度，团队生成可合并的 PR，并附逐角色词元核算。

| 权重 | 标准 | 衡量方式 |
|:-:|---|---|
| 25 | SWE-bench Pro pass@1 | 匹配的 50 问题子集，pass@1 |
| 20 | 并行加速比（Parallel Speedup） | 相比单智能体基线的实际运行时间 |
| 20 | 评审质量 | 注入缺陷探测中的错误批准率（False-Approval Rate） |
| 20 | 词元效率 | 每个已解决问题的总词元数，与单智能体比较 |
| 15 | 协调工程 | 合并冲突解决、交接失败直方图 |
| **100** | | |

## 练习（Exercises）

1. 运行中向差异注入明显缺陷：在主体前额外加入 `return None`。测量评审者错误批准率，调整评审提示词，直到错误批准率低于 5%。

2. 减至两个编码者（架构师 + 编码者 + 评审者 + 测试者，编码者顺序执行两个子任务）。比较实际运行时间与通过率。

3. 用单写者约束（Single-Writer Constraint）替换合并协调者，使子任务改动互不相交的文件集。测量架构师的规划负担。

4. 将评审者从 GPT-5.4 换为 Claude Opus 4.7。测量错误批准率与词元成本变化。

5. 增加第五个角色：文档编写者（Documenter，Haiku 4.5）。评审后生成变更日志条目。衡量文档质量是否值得额外词元支出。

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|------|-----------------|------------------------|
| 并行工作树（Parallel Worktree） | “隔离分支” | `git worktree add` 为每个编码者生成全新工作树 |
| 任务看板（Task Board） | “共享消息总线” | 保存智能体所订阅类型化消息的文件或 Redis 存储 |
| 交接（Handoff） | “角色边界” | 从一个角色上下文跨入另一个角色上下文的任何消息 |
| 词元放大（Token Amplification） | “多智能体开销” | 各角色总词元数 / 相同任务单智能体词元数 |
| 智能体间协议（Agent-to-Agent，A2A） | “智能体到智能体” | Google 2025 年发布的类型化智能体间消息规范 |
| 合并协调者（Merge Coordinator） | “集成者” | 执行三方合并并调解冲突的组件 |
| 错误批准（False Approval） | “评审者幻觉” | 评审者批准包含已知缺陷的差异 |

## 延伸阅读（Further Reading）

- [SWE-AF 工厂架构](https://github.com/Agent-Field/SWE-AF)：2026 年多智能体工厂参考
- [MetaGPT](https://github.com/FoundationAgents/MetaGPT)：基于角色的多智能体框架
- [AutoGen v0.4](https://github.com/microsoft/autogen)：Microsoft 的类型化执行者框架
- [Cognition AI（Devin）](https://cognition.ai)：参考产品
- [Factory Droids](https://www.factory.ai)：另一参考产品
- [Google A2A 协议](https://a2a-protocol.org/latest/)：智能体间消息规范
- [git worktree 文档](https://git-scm.com/docs/git-worktree)：隔离基础
- [SWE-bench Pro](https://www.swebench.com)：评估目标
