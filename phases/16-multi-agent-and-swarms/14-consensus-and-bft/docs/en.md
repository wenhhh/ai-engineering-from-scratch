# 智能体共识与拜占庭容错（Consensus and Byzantine Fault Tolerance for Agents）

> 经典分布式系统拜占庭容错（Byzantine Fault Tolerance，BFT）遇上随机 LLM。2025–2026 年出现三个方向：**CP-WBFT**（arXiv:2511.10400）以置信探针加权投票；**DecentLLMs**（arXiv:2507.14928）无领导者，工作者并行提案并用几何中位数聚合；**WBFT**（arXiv:2505.05103）结合加权投票和层级结构聚类，划分核心与边缘节点。《AI 智能体能达成一致吗？》（arXiv:2603.01213）的实证结果并不乐观：今天连标量一致也脆弱，单个欺骗智能体就能破坏智能体混合（Mixture-of-Agents）。BFT 必要但不充分。本课构建最小 BFT 协议，注入三种智能体特有攻击（拜占庭谎言、迎合式从众、相关错误的单一模型生态），测量各共识变体的应对。

**Type:** Learn + Build
**Languages:** Python (stdlib)
**Prerequisites:** Phase 16 · 07 心智社会与辩论（Society of Mind and Debate）, Phase 16 · 13 共享记忆（Shared Memory）
**Time:** ~75 分钟

## 问题（Problem）

N 个 LLM 智能体各产出答案，彼此不同。多数投票选错，因为两个智能体相关：同基础模型、同训练数据、同故障模式。第三个又以新方式答错，因此多数是错误多数。

再加一个故意说谎的欺骗智能体，或一个同意最后发言者的迎合智能体。经典 BFT 假设拜占庭节点为 `f < n/3`，可任意行动。2026 年现实是，LLM 节点即使诚实也随机，跨模型相关且受彼此输出影响，不能当独立伯努利投票者。

经典 BFT（PBFT，1999）不是错误，而是不完整。它处理任意比特翻转，却不处理“三个诚实智能体因共享训练数据而共享幻觉”。本课以 PBFT 为基础，叠加三种 2025–2026 年适配。

## 概念（Concept）

### 经典 BFT 提供什么（What classical BFT gives you）

实用拜占庭容错（Practical Byzantine Fault Tolerance，Castro 与 Liskov，OSDI 1999）容忍 `f < n/3` 个拜占庭节点。协议三阶段：预准备、准备、提交；两种原语：签名消息、法定人数证书（Quorum certificate）。在 `n >= 3f + 1` 个诚实或恶意节点间就单个值达成一致。

保证很强，但假设：

1. **独立故障。** 拜占庭节点不协调行动。
2. **诚实节点确实诚实。** 诚实输出正确性不是问题，协议只协调分歧。
3. **问题有真实答案。** 对错误事实达成共识仍然是共识。

LLM 智能体违反三者。同基础模型共享故障，“诚实”LLM 仍会幻觉，模糊问题的“真相”由智能体决定，没有外部预言机（Oracle）。

### 三种 LLM 特有攻击（The three LLM-specific attacks）

**拜占庭谎言（Byzantine lie）。** 一个智能体故意输出错误答案。`f < n/3` 时经典 BFT 可处理。

**迎合式从众（Sycophantic conformity）。** 一个智能体投票前读其他答案，跟随最后发言者。不是恶意，但与最大声音相关。它通过所有签名检查，因此经典 BFT 无法防止。

**相关错误的单一模型生态（Correlated-error monoculture）。** 三个智能体共享基础模型，幻觉出同一错误，多数错误。三者“诚实”一致，经典 BFT 无助。

### 2025–2026 年应对（The 2025-2026 responses）

**CP-WBFT**（arXiv:2511.10400），置信探针加权 BFT（Confidence-Probed Weighted BFT）。各投票者为答案附置信探针（自报概率或独立校准模型预测），票权随置信度变化。报告完全图上 BFT 提升 85.71%。缓解迎合式从众，因为从众者对主动表述的立场往往低置信。

**DecentLLMs**（arXiv:2507.14928），无领导者。工作者并行提案，评估智能体评分，最终答案为评分位置的几何中位数（Geometric median）。`f < n/2` 时鲁棒。缓解拜占庭谎言与相关错误：几何中位数抗离群值，拉向密集簇，而非模型偏置平均值。

**WBFT**（arXiv:2505.05103），结合层级结构聚类的加权 BFT。按响应质量与历史学习的信任分数分配票权。聚类为核心（Core）与边缘（Edge），核心先共识，边缘跟随。改善扩展性，核心共识小且快；也部分缓解单一生态，因为核心可按多样性选择。

### 实证：AI 智能体能达成一致吗（Can AI Agents Agree?，arXiv:2603.01213）

论文跨多个前沿模型测量标量一致，即 LLM 智能体就单个数值达成一致。发现令人不安：

- 没有对手时，多项基准上标量问题分歧率也超过 30%。
- 单个采用欺骗人设的智能体可使智能体混合共识偏离诚实基线 40 多个百分点。
- 分歧率与模型多样性相关：异构集成比同构分歧更多（好处：错误不相关），但漂移也更慢（坏处：达成一致更久）。

结论：BFT 提供对齐输出的机制，却不说明对齐结果是否正确。要结合验证（阶段 16 · 08 角色专门化）、多样性（阶段 16 · 15 辩论变体）、评估智能体（阶段 16 · 24 基准）。

### 精简核心协议（The core protocol, stripped down）

LLM 智能体的一轮最小 BFT：

```
1. 任务到达；每个智能体 i 产生答案 a_i
2. 每个智能体附加置信度探针 c_i，取值在 [0, 1]
3. 聚合器从所有 n 个智能体收集 (a_i, c_i)
4. 聚合器按语义簇（等价答案）分组
5. 聚合器计算每个簇 C 的权重：
     w(C) = sum_{i in C} c_i
6. winner = 权重最大的簇，条件为 max > threshold * sum(c_i)
   否则：重试或升级处理
7. 记录少数派簇及其来源，以便事后审计
```

语义聚类（Semantic clustering）是 LLM 特有变化。“研究报告 4.2%”与“提升 4.2%”属于同簇，朴素字符串相等检查会漏掉。生产中用便宜嵌入模型或显式规范化。

### 阈值调节（Threshold tuning）

`threshold` 决定接受或重试。太低则接受弱多数，太高则永不接受。`n=5-7` 时经验范围 0.5-0.67，更小 `n` 时更高。低于阈值则升级给人类或不同智能体集成。

### 共识无助的场景（Where consensus does not help）

- **模糊问题。** 没有真实答案，共识就是意见，应明确称其为意见。
- **复合问题。** “写代码并解释”包含两个答案，应各自独立投票。
- **对抗多轮。** 若智能体能观察前轮并模仿（Du 2023 辩论），就会不顾真相互相同意。限制轮数，通常 2-3 轮。

```figure
swarm-consensus-wave
```

## 动手实现（Build It）

`code/main.py` 实现：

- `AgentVoter`：包含 (answer, confidence) 的脚本化策略。
- `MajorityVote`：经典相对多数投票（Plurality）。
- `CPWBFT`：带语义聚类的置信加权投票。
- `DecentLLMs`：评分提案上的几何中位数聚合。
- `Scenario`：在三种攻击下运行各聚合器。

实现的攻击：

1. `byzantine`：一个智能体高置信说谎。
2. `sycophancy`：复制看到的首个答案及其置信度。
3. `monoculture`：三个智能体以中等置信共享错误答案，即相关错误。

运行：

```
python3 code/main.py
```

预期输出：(attack, aggregator) -> 最终答案的表，突出正确答案。相对多数在单一生态场景失败；CPWBFT 置信加权缓解迎合；单一生态少于总体一半时，DecentLLMs 几何中位数拉向诚实簇。

## 实际应用（Use It）

`outputs/skill-consensus-designer.md` 为多智能体集成设计共识协议：聚类、加权、阈值，以及低于阈值轮次的升级策略。

## 交付成果（Ship It）

交付共识机制前：

- **至少测试上述三种攻击。** 协议应以可预测方式失败，而非静默失败。
- **记录每个少数簇及来源。** 少数簇是相关错误的预警系统。
- **强制有界轮数。** 不要“辩论直到一致”，那会奖励迎合。
- **区分一致与正确。** 共识输出交给独立于集成的验证者。
- **监控一致率。** 骤升意味着从众偏差，骤降意味着模型漂移。

## 练习（Exercises）

1. 运行 `code/main.py`。确认相对多数在单一生态攻击下失败，而其置信度低于 0.7 时 CPWBFT 部分缓解。
2. 增加第四种攻击：**静默弃权（Silent abstention）**，一个智能体拒答“我不知道”。各聚合器应如何对待？实现你的选择。
3. 将语义聚类从字符串规范化换为嵌入相似度，使用任意开源嵌入模型。迎合攻击有何变化？
4. 阅读 CP-WBFT（arXiv:2511.10400），实现置信探针校准：独立校准模型检查各智能体自报置信度。测量单一生态场景准确率收益。
5. 阅读《AI 智能体能达成一致吗？》（arXiv:2603.01213），复现简化标量一致实验：三个智能体、一个标量问题、欺骗人设提示词。CPWBFT 或 DecentLLMs 能发现吗？

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|------|----------------|------------------------|
| 拜占庭容错（Byzantine fault tolerance，BFT） | “拜占庭容错” | Castro-Liskov 1999 协议，在 `f < n/3` 任意故障下共识。 |
| 拜占庭行为（Byzantine） | “任意不良行为” | 节点可说谎、丢消息、静默失败，而不只是安全崩溃。 |
| 置信探针（Confidence probe） | “有多确定？” | 投票附带的自报或校准器预测概率。 |
| 语义聚类（Semantic clustering） | “同答案，不同措辞” | 计票前把等价答案分组。 |
| 几何中位数（Geometric median） | “鲁棒中心” | 到样本点距离和最小的点，与均值不同，抗离群值。 |
| 单一模型生态（Monoculture） | “同模型，同故障” | 共享训练数据或基础模型引起相关错误。 |
| 迎合式从众（Sycophantic conformity） | “同意最大声音” | 投票偏向最先或最响亮的发言者。 |
| 核心/边缘（Core/Edge） | “层级 BFT” | WBFT 先由小核心共识、边缘跟随，限制延迟。 |

## 延伸阅读（Further Reading）

- [Castro 与 Liskov：实用拜占庭容错（Practical Byzantine Fault Tolerance，OSDI 1999）](https://pmg.csail.mit.edu/papers/osdi99.pdf)：基础
- [CP-WBFT：置信探针加权 BFT（Confidence-Probe Weighted BFT）](https://arxiv.org/abs/2511.10400)：按置信度加权投票
- [DecentLLMs：无领导者多智能体共识（leaderless multi-agent consensus）](https://arxiv.org/abs/2507.14928)：几何中位数聚合
- [WBFT：带层级结构聚类的加权 BFT（Weighted BFT with Hierarchical Structure Clustering）](https://arxiv.org/abs/2505.05103)：核心/边缘划分以限制延迟
- [AI 智能体能达成一致吗（Can AI Agents Agree?）](https://arxiv.org/abs/2603.01213)：标量一致脆弱性与欺骗人设攻击
