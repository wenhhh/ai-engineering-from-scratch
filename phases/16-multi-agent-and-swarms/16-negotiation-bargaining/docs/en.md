# 协商与议价（Negotiation and Bargaining）

> 智能体协商资源、价格、任务分配与条款。2026 年基准结果明确：NegotiationArena（arXiv:2402.05863）显示，人设操纵（“迫切需求”）可提高 LLM 收益约 20%；《衡量议价能力》（arXiv:2402.15813）显示买方比卖方更难，规模无助，其 **OG-Narrator**（确定性报价生成器 + LLM 叙述者）把成交率从 26.67% 提至 88.88%；大规模自主协商竞赛（arXiv:2503.06416）运行约 180k 次协商，发现**隐藏思维链（Chain-of-thought-concealing）**者靠不向对方披露推理胜出；Bhattacharya 等 2025 年按 Harvard Negotiation Project 指标评为 Llama-3 最有效、Claude-3 激进、GPT-4 最公平。本课实现契约网协议（FIPA 前身，第 02 课），连接 LLM 风格买卖方，运行 OG-Narrator 式分解，测量各结构选择如何改变成交率。

**Type:** Learn + Build
**Languages:** Python (stdlib)
**Prerequisites:** Phase 16 · 02 FIPA-ACL 的传承（FIPA-ACL Heritage）, Phase 16 · 09 并行群体网络（Parallel Swarm Networks）
**Time:** ~75 分钟

## 问题（Problem）

两个智能体需要商定价格。只给自然语言提示词、任其交涉，2024–2026 年 LLM 的成交率出奇低（arXiv:2402.15813 严格参数化议价中约 27%）。规模无济于事：GPT-4 在议价结构上并不比 GPT-3.5 更好，只更擅长议价的*语言*。

根因是 LLM 混淆决定报价与表述报价。OG-Narrator 分离两者：确定性报价生成器计算数值动作，LLM 只叙述，成交率跃升至约 89%。

这呼应经典多智能体发现：机制与通信层解耦更好。契约网协议（Contract Net Protocol，FIPA 1996；Smith 1980）是任务市场参考机制。将 LLM 放进叙述位置，就得到现代 LLM 驱动任务市场。

## 概念（Concept）

### 一段话理解契约网（Contract Net, in one paragraph）

Smith 1980 契约网协议：**管理者（Manager）**广播**提案征集（cfp）**；**竞标者（Bidder）**用含报价的 **propose** 消息响应；管理者选赢家，向其发送 **accept-proposal**，向输家发送 **reject-proposal**。赢家执行工作。可选 **refuse** 表示拒绝提案。FIPA 将其规范为 `fipa-contract-net` 交互协议。

### OG-Narrator 为何有效（Why OG-Narrator wins）

《衡量语言模型议价能力》（arXiv:2402.15813）观察到：

- LLM 常违反议价规则，如不合理报价、忽略对方的可能协议区间（Zone of Possible Agreement，ZOPA）。
- 锚定不佳，接受糟糕首次报价，反报价金额象征性而非策略性。
- 仅扩大规模无法修复，大模型语言更合理，策略错误类似。

OG-Narrator 分解如下：

```
           ┌──────────────────┐        ┌──────────────────┐
  状态   → │ 报价生成器       │ 价格 → │  LLM 叙述器      │ → 消息
           │ （确定性）       │        │ （撰写           │
           │                  │        │  人类风格的      │
           └──────────────────┘        │  配套表述）      │
                                       └──────────────────┘
```

报价生成器采用经典协商策略：Rubinstein 议价模型、Zeuthen 策略，或价格上的简单以牙还牙（Tit-for-tat）。LLM 负责叙述，消息含确定性价格及自然语言表述。

成交率提升是因为：
- 价格留在议价区间。
- 锚定有策略，而非情绪化。
- LLM 做擅长的事：写作。

### NegotiationArena 发现（NegotiationArena findings）

arXiv:2402.05863 提供标准基准，关键发现：

- 采用人设（“我迫切需要周五前卖掉”）可提高收益约 20%，人设操纵是真实战术。
- 公平/合作智能体会被对抗者利用，防御需要明确的反向姿态策略。
- 约 40% 基准场景中，对称配对收敛到不公平结果。

不是“LLM 不善谈判”，而是“LLM 太像人类谈判，包括可被利用的部分”。

### 思维链隐藏（Chain-of-thought concealment）

大规模自主协商竞赛（arXiv:2503.06416）跨多种 LLM 策略运行约 180k 次协商。赢家向对方隐藏推理：

- 若智能体在公开草稿中写“最多 $75，保留价格是 $70”，对手就能看到。
- 赢家私下计算策略，输出通道只有报价及最低限度叙述。

这是经典博弈论（Aumann 1976 关于理性与信息）在 2026 年的回声：披露私人估值会损失收益。LLM 没有这一直觉，会在对手可见的推理轨迹中写出底线。

工程结论：私有草稿上下文与公开消息上下文必须分开，不是可选项。

### Bhattacharya 等 2025 年模型排名（model rankings）

根据 Harvard Negotiation Project 指标（原则性谈判、尊重最佳替代方案 BATNA、利益互惠）：

- **Llama-3** 最有效，兼顾成交率与收益。
- **Claude-3** 最激进，高锚定、晚让步。
- **GPT-4** 最公平，不同配对收益方差最小。

这是 2025 年快照。重点不是 2026 年 4 月谁胜出，而是不同基础模型有持久协商风格，异构集成（第 15 课）可将其作为多样性来源。

### 契约网 + LLM 分配任务（Task allocation via Contract Net + LLM）

契约网在 LLM 多智能体中的现代复用：

1. 管理智能体把任务拆成单元。
2. 向工作者广播含任务描述的 `cfp`。
3. 各工作者报价 `(price, eta, confidence)`，价格可以是词元、计算单位或美元。
4. 管理者按任务选一个或多个赢家并授标。
5. 未中标工作者可自由竞标其他任务。

协调是广播响应而非同步聊天，因此轻松扩展到 100 个以上工作者。生产使用包括 Microsoft Agent Framework 编排模式、部分 LangGraph 实现。

### LLM 利益相关者交互协商（LLM-Stakeholders Interactive Negotiation）

NeurIPS 2024（https://proceedings.neurips.cc/paper_files/paper/2024/file/984dd3db213db2d1454a163b65b84d08-Paper-Datasets_and_Benchmarks_Track.pdf）提出带**秘密评分（Secret scores）**和**最低接受阈值（Minimum-acceptance thresholds）**的可评分多方博弈。各方有私有效用，LLM 须从消息推断。这将双边议价推广为 N 方联盟形成，适用于能力异构的生产任务市场。

### 叙述与机制规则（The narration-vs-mechanism rule）

2024–2026 年协商基准呈现一致工程规则：

> 让 LLM 叙述，不让 LLM 计算报价。

报价为数值（价格、预计时间、数量）时，从协商状态确定性生成，再让 LLM 表述。报价为提案结构（任务分解、角色分配）时，让 LLM 起草，但发送前按模式验证并检查约束。

```figure
a5-og-narrator
```

## 动手实现（Build It）

`code/main.py` 实现：

- `ContractNetManager`、`ContractNetTask`、`Bid`：管理者与竞标者，广播 cfp、收集提案、授标。
- `og_narrator_bargain(state, rng)`：OG-Narrator 买方，确定性 Zeuthen 式向中点让步。
- `seller_response(state, rng)`：确定性卖方反报价，两种风格共同的结构真实基准。
- `naive_llm_bargain(state, rng)`：模拟全 LLM 议价者，高方差选价，经常越出 ZOPA。
- 测量：1000 次试验成交率，每次重新采样保留价格。

运行：

```
python3 code/main.py
```

预期：朴素 LLM 成交率约 65-75%，OG-Narrator 约 85-95%；15-25 个百分点差距体现分离报价生成和叙述的结构优势。另有三竞标者、一任务的契约网分配示例。

## 实际应用（Use It）

`outputs/skill-bargainer-designer.md` 设计议价协议：谁生成报价（确定性或 LLM）、谁叙述、私有草稿如何与公开消息隔离、如何监测成交率。

## 交付成果（Ship It）

生产议价检查清单：

- **独立草稿。** 私有状态绝不进入对方上下文，不可妥协。
- **确定性报价生成。** 价格、数量、预计时间应计算，不靠提示词。
- **按模式验证所有传入报价。** 在协议边界拒绝越出 ZOPA 的报价。
- **限制轮数。** 最多 3-5 轮，僵局升级给调解者。
- **持续测量成交率与收益方差。** 成交率下降是症状，常为提示词漂移或对方攻击。
- **记录所有被拒提案及确定性理由。** 契约网未中标者需要理解原因。

## 练习（Exercises）

1. 运行 `code/main.py`，确认 OG-Narrator 成交率胜过朴素 LLM，差多少？
2. 实现**基于人设的收益提升**（arXiv:2402.05863）：买方仅在叙述中采用“本周迫切想买”人设，不改报价生成器。成交率或收益改变吗？
3. 实现思维链**隐藏**：保留不传给对方的私有草稿字符串。误泄露会怎样？交换通道模拟。
4. 将契约网扩展为带保留价格的 N 竞标者拍卖。所有报价超过保留价时，管理者如何在最低价与最高质量之间选择？选何授标规则，为什么？
5. 阅读 Bhattacharya 等 2025 年 Harvard Negotiation Project 指标研究，实现激进与公平两种风格议价者，测量对称和非对称配对收益方差。

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|------|----------------|------------------------|
| 契约网（Contract Net） | “任务市场” | Smith 1980、FIPA 1996，cfp + propose + accept/reject，标准任务市场。 |
| 可能协议区间（Zone of possible agreement，ZOPA） | “可能达成协议的区间” | 买方最高价与卖方最低价的重叠，区间外无法成交。 |
| 谈判协议的最佳替代方案（Best alternative to a negotiated agreement，BATNA） | “最佳替代方案” | 交易失败后的退路，决定保留价格。 |
| OG-Narrator | “报价生成器 + 叙述者” | 确定性报价与 LLM 叙述分离。 |
| Zeuthen 策略（Zeuthen strategy） | “风险最小化让步” | 按风险限制让步的经典报价生成器。 |
| Rubinstein 议价（Rubinstein bargaining） | “交替报价均衡” | 带折扣的无限时域议价博弈模型。 |
| 思维链隐藏（CoT concealment） | “隐藏推理” | arXiv:2503.06416 赢家保留私有草稿，公开通道只展示报价。 |
| 人设操纵（Persona manipulation） | “情绪姿态” | arXiv:2402.05863，迫切/紧急人设带来约 20% 收益。 |

## 延伸阅读（Further Reading）

- [NegotiationArena](https://arxiv.org/abs/2402.05863)：基准、人设操纵与利用发现
- [衡量语言模型议价能力（Measuring Bargaining Abilities of Language Models）](https://arxiv.org/abs/2402.15813)：OG-Narrator、买方比卖方更难
- [大规模自主协商竞赛（Large-Scale Autonomous Negotiation Competition）](https://arxiv.org/abs/2503.06416)：约 180k 次协商，隐藏思维链胜出
- [LLM 利益相关者交互协商（LLM-Stakeholders Interactive Negotiation，NeurIPS 2024）](https://proceedings.neurips.cc/paper_files/paper/2024/file/984dd3db213db2d1454a163b65b84d08-Paper-Datasets_and_Benchmarks_Track.pdf)：私有效用的多方可评分博弈
- [Smith 1980：契约网协议（The Contract Net Protocol）](https://ieeexplore.ieee.org/document/1675516)：经典机制，IEEE Transactions on Computers
