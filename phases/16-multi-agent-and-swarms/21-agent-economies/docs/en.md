# 智能体经济、代币激励与声誉（Agent Economies, Token Incentives, Reputation）

> 长程自主智能体（METR 从 1 小时到 8 小时的工作曲线）需要经济自主权。正在形成的**五层技术栈**是：**DePIN**（物理计算）→ **身份（Identity）**（W3C DID + 声誉资本）→ **认知（Cognition）**（RAG + MCP）→ **结算（Settlement）**（账户抽象）→ **治理（Governance）**（智能体 DAO）。生产级智能体激励网络包括 **Bittensor**（TAO 子网奖励特定任务模型）、**Fetch.ai / ASI Alliance**（ASI-1 Mini LLM + FET 代币），以及 **Gonka**（基于 Transformer 的工作量证明，将计算重新分配给有产出的 AI 任务）。学术工作方面：AAMAS 2025 的去中心化 LaMAS 使用 **Shapley 值贡献归因（Shapley-value credit attribution）**，公平奖励有贡献的智能体；Google Research 的“大语言模型机制设计”提出在单调聚合下按第二价格支付的**代币拍卖（token auctions）**。本课构建最小化智能体市场，将 Shapley 值贡献归因应用于多智能体流水线，并运行第二价格代币拍卖，让博弈论机制具体落地。

**Type:** Learn
**Languages:** Python (stdlib)
**Prerequisites:** Phase 16 · 16 协商与议价（Negotiation and Bargaining）, Phase 16 · 09 并行群体网络（Parallel Swarm Networks）
**Time:** ~75 分钟

## 问题（Problem）

当智能体共同创造价值、却需要分别获得奖励时，多智能体系统会变得复杂。传统机制，如平均分配、最后贡献者全部获得，既不公平又易被操纵。通过 Shapley 值按联盟奖励，从构造上公平，但计算昂贵。2025–2026 年文献推动了实用近似：Shapley 采样、单调聚合拍卖，以及基于已确认贡献累积的链上声誉。

除贡献归因外，该领域也转向实际经济智能体：Bittensor TAO 奖励用于微调子网专属模型的挖矿计算；Fetch.ai/ASI 用 FET 代币奖励 ASI-1 Mini LLM 使用；Gonka 将 Transformer 工作量证明重新用于有产出的 AI 任务。自主交易的智能体今天已经存在；问题在于如何对齐激励。

本课将智能体经济视为一组具体问题：贡献归因、机制设计、声誉，并以最少必要数学分别构建，帮助理解这些思想。

## 概念（Concept）

### 智能体经济五层技术栈（The 5-layer agent-economy stack）

1. **DePIN（物理计算）。**出租 GPU、存储、带宽的去中心化基础设施。包括 Bittensor 子网、Render Network、Akash。并非专为智能体设计，但智能体会使用它。
2. **身份（Identity）。**W3C 去中心化标识符（Decentralized Identifiers，DID）为每个智能体提供独立于任何平台的持久 ID。声誉累积在 DID 上。Agent Network Protocol（ANP）将 DID 用作发现层。
3. **认知（Cognition）。**智能体的推理循环：LLM + RAG + MCP。这是其他阶段构建的内容。
4. **结算（Settlement）。**账户抽象（Account abstraction，ERC-4337）让智能体无需持有 ETH，也能从自身余额支付 gas。智能体可以为服务、彼此或计算付费。
5. **治理（Governance）。**智能体 DAO（Agentic DAOs）：人类*和*智能体共同对协议变更投票，投票权与声誉绑定的治理结构。

并非每个生产系统都使用全部五层。Bittensor 使用第 1、2 层，部分使用第 3、4 层，不使用第 5 层。OpenAI 智能体只使用第 3 层。该技术栈是参考地图，不是要求。

### Bittensor、Fetch.ai、Gonka：实际运行的内容（what runs）

**Bittensor（TAO）。**子网对应专门任务（语言建模、图像生成、预测）。矿工提交模型输出，验证者对其排序；按质押加权的评分分配 TAO 奖励。每个子网有自己的评估。其经济启示：为特定任务的输出质量付费，而非消耗的计算量。

**Fetch.ai / ASI Alliance。**ASI-1 Mini LLM 运行在 Fetch.ai 网络；用户以 FET 代币支付推理费用。这里的智能体对等体叙事更强：Fetch 上的智能体可以调用另一个智能体完成任务，并以 FET 付款。

**Gonka。**Transformer 工作量证明：所谓“工作”是 Transformer 的前向传播。矿工通过运行具有已知正确输出（来自训练数据）的推理任务获利。这是能产出有效计算的 PoW，而非基于哈希的 PoW。

截至 2026 年 4 月，三者均达到生产级。收益分配方式不同。Bittensor 按子网验证者评估的相对质量奖励；Fetch 按付费用户衡量的效用奖励；Gonka 奖励可验证推理工作。

### Shapley 值贡献归因（Shapley-value credit attribution）

三个智能体协作完成任务，输出得分为 0.8。谁贡献了多少？

Shapley 值：唯一满足四项公理（效率、对称性、线性、零贡献）的贡献分配。对智能体 `i`：

```
shapley(i) = (1/N!) * sum over all orderings O of (v(S_i_O ∪ {i}) - v(S_i_O))
```

其中，`S_i_O` 是排序 `O` 中位于 `i` 之前的智能体集合。实际做法：枚举全部排列，记录各智能体在每个排列中的边际贡献，再取平均。

N=3 个智能体时有 6 种排列；N=10 时有 360 万种，因此实际会采样排序，而非枚举。

### 用于聚合的第二价格拍卖（Second-price auction for aggregation）

Google Research（“大语言模型机制设计”）提出第二价格代币拍卖，用于聚合 LLM 输出。设定：N 个智能体各提出一个补全结果，并分别拥有其结果被选中的私人价值。拍卖方选择价值最高的提案，并支付*第二高*的价值。在单调聚合下（价值取决于选中了哪个提案，而非有多少出价），该机制具有诚实性：智能体会报出真实价值。

这对 LLM 系统的意义：你可以将补全任务外包给定价不同的多个智能体；拍卖选出最优方案并公平支付，而且智能体没有虚报的激励。

### 声誉资本（Reputation capital）

与 DID 绑定的声誉分数由已确认贡献累积而来。一个简单更新规则：

```
rep(i, t+1) = alpha * rep(i, t) + (1 - alpha) * contribution_quality(i, t)
```

衰减因子 `alpha` 接近 1。声誉具有以下特征：

- 为路由决策读取的成本低（“把难题交给高声誉智能体”）。
- 伪造成本高（随时间累积，与 DID 绑定）。
- 可以罚减：验证失败的贡献会扣分。

### AAMAS 2025 去中心化 LaMAS（decentralized LaMAS）

LaMAS 提案（AAMAS 2025）结合了 DID 身份、Shapley 值贡献归因和简单拍卖机制。核心主张：将贡献归因步骤去中心化，使系统可审计，且免受单点操纵。

### 经济机制失效之处（Where the economics falls apart）

- **价格预言机操纵（Price oracle manipulation）。**如果贡献函数可被利用，智能体就会利用它。每种机制都需要对抗测试。
- **女巫攻击（Sybil attacks）。**一个运营方启动 N 个假智能体，夸大自己的贡献。DID 能减缓但无法阻止；缓解方法是提高声誉伪造成本。
- **验证成本（Verification cost）。**贡献归因的公平性受验证者限制。如果验证便宜（小型 LLM），就可能被操纵；如果昂贵（人工评审组），系统便无法扩展。
- **监管不确定性（Regulatory overhang）。**智能体经济与金融监管相交。截至 2026 年，Bittensor、Fetch 和 Gonka 在某些司法管辖区均处于法律灰色地带。

### 智能体经济何时合理（When agent economies make sense）

- **具有异构运营方的开放网络（Open networks with heterogeneous operators）。**没有一个团队控制全部智能体。
- **可验证输出（Verifiable outputs）。**没有验证，贡献归因只是猜测。
- **长程工作流（Long-horizon workflows）。**一次性任务无法从声誉累积中受益。
- 在你的司法管辖区，**代币化支付在法律上可行（Tokenized payments are legally viable）**。

封闭企业系统中，经济机制让位于更简单的分配方式（管理者分配工作，指标内部使用）。经济学文献主要适用于开放网络。

```figure
swarm-auction
```

## 动手构建（Build It）

`code/main.py` 实现了：

- `shapley(value_fn, agents)`：在 N 较小时通过枚举精确计算 Shapley 值。
- `second_price_auction(bids)`：诚实机制；赢家支付第二高价格。
- `Reputation`：与 DID 绑定的声誉，具有指数衰减和罚减。
- 演示 1：三个智能体协作，以精确 Shapley 值分配贡献。
- 演示 2：五个智能体竞拍任务名额；第二价格拍卖决定赢家及支付额。
- 演示 3：向声誉不同的智能体分配任务，共 100 轮；声誉加权路由优于随机路由。

运行：

```
python3 code/main.py
```

预期输出：各智能体的 Shapley 值；显示真实出价均衡的拍卖结果；声誉加权路由在预热后相对随机路由取得 10–20% 的质量提升。

## 实际使用（Use It）

`outputs/skill-economy-designer.md` 设计最小化智能体经济：选择身份层、贡献归因机制、支付机制和声誉规则。

## 交付上线（Ship It）

2026 年运行智能体经济时：

- **从声誉开始，而非代币（Start with reputation, not tokens）。**声誉实现便宜，本身就有价值；代币增加法律与经济复杂性。
- **先验证，再奖励（Verify before you reward）。**没有独立验证步骤，绝不分配贡献。自报质量会引来女巫攻击博弈。
- **采用 Shapley 采样，而非精确枚举（Shapley-sample, not Shapley-exact）。**采样 100–1000 种排序；精确枚举无法扩展。
- **限制衰减因子，并设置声誉下限（Cap decay factor and floor reputation）。**无界衰减会抹掉正当贡献者；衰减过慢会奖励声誉已过时的高分智能体。
- **以对抗方式审计机制（Audit mechanisms adversarially）。**开放网络前运行红队场景。每种机制都有博弈逻辑；应由你先发现漏洞，而不是攻击者。

## 练习（Exercises）

1. 运行 `code/main.py`。确认 Shapley 值之和等于总价值（效率公理）。改变价值函数；Shapley 分配是否按预期方向变化？
2. 实现 Shapley *采样（sampling）*（对 K 种排序进行蒙特卡洛采样）。K 如何影响近似精度？在 N=4 时与精确值比较。
3. 在拍卖前实现联盟形成步骤：智能体可合并为团队，以整体出价。会形成哪些联盟？结果是否比单独出价帕累托更优？
4. 阅读 Google Research 的机制设计文章。指出一个一旦违反就会破坏诚实性的假设。在 LLM 场景中，这种失败模式是什么样的？
5. 阅读 AAMAS 2025 的去中心化 LaMAS 论文。在合成任务上，为 10 个智能体实现其 Shapley 步骤。精确计算需要多久？采样 100 次能多接近精确值？

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|------|----------------|------------------------|
| DePIN | “去中心化物理基础设施（Decentralized physical infrastructure）” | 代币激励的计算 / 存储 / 带宽。Bittensor、Akash、Render。 |
| 去中心化标识符（DID） | “Decentralized identifier” | W3C 的可移植 ID 规范。智能体声誉绑定到 DID，而非平台。 |
| ERC-4337 | “账户抽象（Account abstraction）” | 可赞助 gas 的合约账户，支持智能体支付。 |
| Shapley 值（Shapley value） | “公平贡献归因” | 唯一满足效率、对称性、线性、零贡献公理的分配。 |
| 第二价格拍卖（Second-price auction） | “维克里拍卖（Vickrey auction）” | 诚实机制：赢家支付第二高出价。兼容单调聚合。 |
| 声誉资本（Reputation capital） | “累积质量分数” | 来自已确认贡献、与 DID 绑定的分数，随时间衰减。 |
| 智能体 DAO（Agentic DAO） | “智能体与人类共同治理” | 将智能体投票者作为一等参与者的 DAO，投票权与声誉绑定。 |
| TAO / FET / GPU 额度 | “代币计价单位” | Bittensor TAO、Fetch.ai FET、各种 DePIN 代币。 |

## 延伸阅读（Further Reading）

- [智能体经济（The Agent Economy）](https://arxiv.org/abs/2602.14219)：2026 年智能体经济五层技术栈综述。
- [Google Research：大语言模型机制设计（Mechanism design for large language models）](https://research.google/blog/mechanism-design-for-large-language-models/)：具有单调聚合的代币拍卖。
- [AAMAS 2025：去中心化 LaMAS（decentralized LaMAS）](https://www.ifaamas.org/Proceedings/aamas2025/pdfs/p2896.pdf)：Shapley 值贡献归因。
- [Bittensor TAO 文档（documentation）](https://docs.bittensor.com/)：子网结构与奖励分配。
- [Fetch.ai / ASI Alliance](https://fetch.ai/)：ASI-1 Mini LLM 与 FET 代币。
- [W3C 去中心化标识符（Decentralized Identifiers，DID）规范](https://www.w3.org/TR/did-core/)：身份基础。
