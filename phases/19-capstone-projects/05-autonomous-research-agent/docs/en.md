# 综合实践 05：自主研究智能体（Autonomous Research Agent，AI-Scientist 类）

> Sakana 的 AI-Scientist-v2 发表了完整论文。Agent Laboratory 执行了实验。Allen AI 分享了执行轨迹。2026 年的形态是围绕实验开展计划／执行／验证（Plan-Execute-Verify）树搜索（Tree Search），限制成本预算，在沙箱（Sandbox）中执行代码，配备利用视觉反馈的 LaTeX 写作器，以及采用 NeurIPS 风格的自动化评审器集成（Reviewer Ensemble）。本综合实践要求你构建这样的系统，在每篇论文 30 美元以内完成端到端运行，并通过针对 Sakana 已记录的沙箱逃逸（Sandbox Escape）问题开展的红队测试（Red Team）。

**Type:** Capstone
**Languages:** Python（智能体 + 沙箱）, LaTeX（输出）
**Prerequisites:** 阶段 2（机器学习，ML）、阶段 3（深度学习）、阶段 7（Transformer）、阶段 10（从零构建大语言模型，LLM）、阶段 14（智能体）、阶段 15（自主系统）、阶段 16（多智能体）、阶段 18（安全）
**涉及阶段（Phases exercised）:** P0 · P2 · P3 · P7 · P10 · P14 · P15 · P16 · P18
**Time:** 40 小时

## 问题（Problem）

自主研究智能体在 2026 年跨过了一道门槛。Sakana AI 的 AI-Scientist-v2 登上 Nature，生成的论文通过了研讨会同行评审（Peer Review）。ShinkaEvolve（ICLR 2026）将这条路线扩展到假设演化。AMD 的 Agent Laboratory 交付了可复现的执行轨迹。这些智能体并非魔法：它们在候选实验树上运行计划／执行／验证循环，配有成本上限、绑定随机种子的沙箱以及自动化评审。工程功夫在于循环、预算与安全保障。

你将针对狭窄领域中的一个初始想法实现该循环，例如在一亿参数的 Transformer 上进行注意力稀疏性（Attention Sparsity）消融实验（Ablation）。价值不在于首次运行就取得新发现，而在于基础设施：树搜索、实验沙箱、写作器与评审器循环，以及红队报告。Sakana 团队记录过沙箱逃逸失败案例；你的智能体必须通过相同的红队测试。

## 概念（Concept）

智能体采用最佳优先树搜索（Best-First Tree Search）。节点是实验规格：（假设、配置、代码、预期结果）。扩展步骤通过小幅修改提出子节点，例如更换优化器、调整批量大小或消融某个组件。每个子节点都在全新沙箱中运行，受硬性资源上限约束。结果回馈给评分函数，按（新颖性 × 质量 × 剩余预算）对节点排序。树持续增长直到预算耗尽，随后将最佳分支写成论文。

写作器是多模态（Multimodal）的。它生成 LaTeX 草稿、编译并渲染图形，再将渲染后的 PDF 交给 Claude Opus 4.7 的视觉模式，评议版式、图形可读性以及论断与证据的一致性（Claim-Evidence Alignment）。由五个大语言模型（Large Language Model，LLM）裁判组成的评审器集成输出 NeurIPS 风格评分，涵盖新颖性、严谨性、清晰度、可复现性与影响力；平均分低于阈值时，论文连同评议意见返回写作器。

安全是系统的关键支撑。每个实验都在 E2B 或 Daytona 沙箱中运行，禁止网络出站（Network Egress），限制实际运行时间（Wall-Clock），并固定资源上限。智能体的代码生成步骤经过策略层，阻断会逃出沙箱的系统调用（System Call）。红队报告复现 Sakana 已记录的攻击面（Attack Surface），包括进程炸弹（Fork Bomb）、文件系统逃逸以及 LLM 编写的网络调用。

## 架构（Architecture）

```
初始想法 + 领域
      |
      v
  文献搜索（Literature Search；Semantic Scholar + OpenAlex + FAISS 缓存）
      |
      v
  LangGraph 计划／执行／验证树
      |
      v
  +--- 扩展节点 -------+      每节点沙箱
  |                    |      (E2B / Daytona)
  v                    v      资源上限
  child_1           child_k   禁止网络出站
  |                    |      确定性随机种子
  v                    v
  运行实验             运行实验
  |                    |
  v                    v
  按（新颖性、质量、预算）为节点评分
      |
      v
  最佳分支 -> LaTeX 写作器
      |
      v
  编译 + 视觉评议（Vision Critique；Opus 4.7 视觉模式）
      |
      v
  评审器集成（5 个 LLM 裁判，NeurIPS 评分标准）
      |
      v
  paper.pdf + review.md + trace.json
```

## 技术栈（Stack）

- 编排（Orchestration）：LangGraph，带检查点（Checkpointing）和人工审批关卡（Human-Approval Gate）
- 树搜索：围绕实验节点定制最佳优先搜索（采用 Sakana v2 的 AB-MCTS 风格）
- 沙箱：每个实验使用 E2B，以 Docker-in-Docker 作为备用方案；通过 cgroups 限制资源
- 文献：Semantic Scholar Graph API + OpenAlex + 本地 FAISS 摘要缓存
- 写作器：LaTeX 模板 + Claude Opus 4.7（视觉模式），用于图形评议与版式检查
- 评审器：5 个裁判（Opus 4.7、GPT-5.4、Gemini 3 Pro、DeepSeek R1、Qwen3-Max）的集成，采用加权汇总（Weighted Aggregation）
- 实验框架：PyTorch 2.5 执行实际实验，W&B 记录日志
- 可观测性（Observability）：Langfuse 记录智能体轨迹，每篇论文硬性预算 30 美元

```figure
ce-experiment-tree
```

## 动手实现（Build It）

1. **初始想法与领域界定（Seed and Domain Scoping）。** 选取初始想法，例如“研究十亿参数以下 Transformer 的注意力图中的稀疏模式”。定义搜索空间：模型、数据集和计算预算。

2. **文献调研（Literature Pass）。** 通过 Semantic Scholar + OpenAlex 查询引用量最高的 50 篇相关论文；本地缓存摘要；生成一页领域概览。

3. **树结构搭建（Tree Scaffolding）。** 用初始假设初始化根节点。实现 `expand(node) -> children`，提出小幅修改建议（每个子节点只改一项配置）。将 `score(node)` 实现为带权的新颖性 × 质量 × 预算项。

4. **沙箱封装（Sandbox Wrapping）。** 每个实验运行 `docker run --network=none --memory=8g --cpus=2 --pids-limit=256 --read-only`（或等效 E2B 策略）。随机种子写入沙箱；输出以只读方式挂载回外部。

5. **计划／执行／验证循环（Plan-Execute-Verify Loop）。** `plan` 提出子节点。`execute` 运行沙箱，捕获日志与指标。`verify` 对指标执行单项检查：损失是否下降？消融是否隔离出所研究的效应？失败节点的失败原因存入树中。

6. **写作器（Writer）。** 预算用尽后选取最佳分支。用 matplotlib 渲染图形。将分支轨迹放入上下文，通过 Claude Opus 4.7 生成 LaTeX 草稿并编译。将编译后的 PDF 交回 Opus 4.7 视觉模式评议，随后迭代。

7. **评审器集成（Reviewer Ensemble）。** 五个裁判用 NeurIPS 风格标准为草稿的新颖性、严谨性、清晰度、可复现性和影响力评分。若平均分 < 4.0/5，则连同评议意见返回写作器。重写 3 次后强制停止。

8. **红队测试（Red Team）。** 构建或集成针对沙箱的对抗任务：进程炸弹、网络数据外传（Network Exfiltration）尝试、文件系统逃逸和 LLM 编写的 shell 元字符（Metacharacter）。确认全部被阻止，写出发现。

9. **可复现性（Reproducibility）。** 每篇论文附带树搜索轨迹 JSON、随机种子、W&B 运行链接、沙箱配置，以及能够端到端复现的 README。

## 实际应用（Use It）

```
$ ai-scientist run --seed "attention sparsity in sub-1B transformers" --budget 30
[lit]    50 papers, digest in 12s
[tree]   expanded 8 nodes, budget 12/30
[exec]   node #3 sparsity=top-8, loss=2.83 (best so far)
[exec]   node #6 sparsity=top-4, loss=3.12 (worse)
[exec]   ...
[tree]   chose branch rooted at node #3 (novelty 0.62, quality 0.81)
[write]  LaTeX draft v1 complete
[vision] critique: figure 2 legend too small, claim-evidence ok
[write]  draft v2 after 3 edits
[review] mean 4.2/5 (novelty 3.9, rigor 4.3, clarity 4.1, repro 4.5, impact 4.2)
[done]   paper.pdf + review.md + trace.json     $28.40 spent
```

## 交付成果（Ship It）

`outputs/skill-ai-scientist.md` 是交付物（Artifact）。给定初始想法、领域和 30 美元预算，它运行完整流水线，输出可供评审的论文及可复现材料包。

| 权重 | 标准 | 衡量方式 |
|:-:|---|---|
| 25 | 论文质量 | 依据评分标准进行盲评，与已发表研讨会论文比较 |
| 20 | 实验严谨性 | 基线、随机种子、消融；每项论断都有结果表中的一个单元格支持 |
| 20 | 成本与计算资源纪律 | 强制执行每篇论文 30 美元上限，由 Langfuse 追踪 |
| 20 | 安全 | 通过沙箱红队测试；验证网络策略与紧急停止开关（Kill-Switch） |
| 15 | 可复现性 | 使用相同随机种子，一条命令重新运行即可复现论文 |
| **100** | | |

## 练习（Exercises）

1. 针对同一领域中的三个不同初始想法运行流水线。比较树搜索哪些部分重合，识别重复浪费的计算。

2. 对预计花费超过 5 美元的节点，在实验执行前增加人在回路（Human-in-the-loop，HITL）关卡。测量总成本下降多少。

3. 将评审器集成替换为单个裁判。在已知有问题论文的留出集（Held-Out Set）上测量错误接受率（False-Accept Rate）。

4. 加入网络数据外传红队测试：让智能体编写代码，尝试对外部地址执行 `curl`。确认 `--network=none` 策略将其阻止，并记录这次尝试。

5. 将树搜索与平坦随机基线（预算相同，无扩展策略）进行比较。报告新颖性 × 质量的增益。

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|------|-----------------|------------------------|
| 树搜索（Tree Search） | “AB-MCTS 风格扩展” | 根据新颖性×质量×预算评分，对实验节点进行最佳优先探索 |
| 沙箱（Sandbox） | “实验隔离” | 无网络、CPU／内存有限、随机种子固定、输入只读的容器 |
| 视觉评议（Vision Critique） | “渲染后再读取” | 将论文编译为 PDF，再交给视觉语言模型（Vision-Language Model，VLM）评议版式及论断与证据 |
| 评审器集成（Reviewer Ensemble） | “自动化同行评审” | 多个 LLM 裁判使用 NeurIPS 标准评分；加权汇总结果控制流水线能否继续 |
| 新颖性评分（Novelty Score） | “这是新的吗？” | 对与 50 篇论文文献缓存过于接近的内容施加惩罚的启发式方法（Heuristic） |
| 成本上限（Cost Ceiling） | “美元预算” | 每篇论文总花费的硬上限；由 Langfuse 计数器与运行前估算共同支撑 |
| 红队测试（Red Team） | “沙箱逃逸审计” | 策略错误时能够逃出沙箱的对抗任务 |

## 延伸阅读（Further Reading）

- [Sakana AI-Scientist-v2 仓库](https://github.com/SakanaAI/AI-Scientist-v2)：参考生产级研究智能体
- [Sakana AI-Scientist-v1 论文（arXiv:2408.06292）](https://arxiv.org/abs/2408.06292)：原始方法
- [ShinkaEvolve（Sakana ICLR 2026）](https://sakana.ai)：演化扩展
- [Agent Laboratory（AMD）](https://github.com/SamuelSchmidgall/AgentLaboratory)：多角色研究实验室框架
- [LangGraph 文档](https://langchain-ai.github.io/langgraph/)：参考编排层
- [Semantic Scholar Graph 应用编程接口（API）](https://api.semanticscholar.org/)：文献搜索
- [E2B 沙箱](https://e2b.dev)：参考实验隔离方案
- [NeurIPS 评审指南](https://neurips.cc/Conferences/2026/ReviewerGuidelines)：评审器集成所编码的评分标准
