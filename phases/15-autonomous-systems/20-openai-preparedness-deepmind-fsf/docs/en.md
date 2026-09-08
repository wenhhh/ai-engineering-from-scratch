# OpenAI 准备度框架与 DeepMind 前沿安全框架（OpenAI Preparedness Framework and DeepMind Frontier Safety Framework）

> OpenAI 准备度框架（Preparedness Framework）v2（2025 年 4 月）引入研究类别（Research Categories）：长程自主性、藏拙、自主复制与适应、破坏防护措施；它们与跟踪类别（Tracked Categories）不同。跟踪类别会触发能力报告（Capabilities Report）和防护措施报告（Safeguards Report），交由安全顾问组审查。DeepMind 的前沿安全框架（FSF）v3（2025 年 9 月，2026 年 4 月 17 日加入跟踪能力等级）将自主性纳入机器学习研发与网络安全领域，其中机器学习研发自主性 1 级指：以相较“人类 + AI 工具”有竞争力的成本，完全自动化 AI 研发流水线。FSF v3 通过自动监控工具性推理的滥用，明确应对欺骗性对齐。需要如实说明的是：PF v2 的研究类别（包括长程自主性）不会自动触发缓解措施；政策使用的是“潜在”一词。DeepMind 自己也表示，如果工具性推理进一步增强，自动监控“从长期看将不再充分”。

**Type:** Learn
**Languages:** Python（标准库，三框架决策表差异比较工具）
**Prerequisites:** 阶段 15 · 19（Anthropic 负责任扩展政策，Anthropic RSP）
**Time:** 约 45 分钟

## 问题（The Problem）

第 19 课细读了 Anthropic 的扩展政策。本课继续阅读 OpenAI 和 DeepMind 的政策，以形成完整认识。这三份同类文档都在回答一个问题：前沿实验室何时应暂停模型开发，或为模型设置准入条件。它们在若干类别上有共同认识，但在一些影响实际决策的细节上存在分歧。

共同点是：三者都将长程自主性视为值得跟踪的能力类别；都承认欺骗行为（对齐伪装、藏拙）是独立的一类风险；都有内部评审机构。不同点是：OpenAI 将类别分为“跟踪”（强制缓解）和“研究”（不自动触发措施）；DeepMind 将自主性纳入两个领域，而不是单独命名。实验室使用“跟踪与研究”“关键与中等”或“第一层与第二层”等名称；但能力被归入哪一类，在不同实验室产生的实际操作后果并不相同。

把它们放在一起阅读，才是有用的练习。同一项能力，在 Anthropic 可能要求“强制缓解”，在 OpenAI 可能是“监测但不触发措施”，在 DeepMind 则是“在特定领域中跟踪”。政策立场会产生实际影响。

## 概念（The Concept）

### OpenAI 准备度框架 v2（OpenAI Preparedness Framework v2，2025 年 4 月）

结构：

- **跟踪类别（Tracked Categories）**：触发能力报告（模型能做什么）和防护措施报告（有哪些缓解措施已就绪）。部署前由安全顾问组审查。
- **研究类别（Research Categories）**：实验室正在跟踪、但尚未承诺具体缓解措施的模型能力。包括长程自主性（Long-range Autonomy）、藏拙（Sandbagging）、自主复制与适应（Autonomous Replication and Adaptation）、破坏防护措施（Undermining Safeguards）。

v2 的关键表述是：研究类别不会自动触发缓解措施。政策使用的是“潜在的”缓解措施。这是需要关注的具体区别：某个类别位于“跟踪”还是“研究”，决定了它究竟“受关卡约束”还是“仅被观察”。

### DeepMind 前沿安全框架 v3（DeepMind Frontier Safety Framework v3，2025 年 9 月；2026 年 4 月 17 日加入跟踪能力等级）

结构：

- **关键能力等级（Critical Capability Levels，CCL）**：五个领域的能力阈值：网络安全（Cyber）、生物（Bio）、机器学习研发（ML R&D）、化生放核（CBRN）、自主性（Autonomy，纳入机器学习研发与网络安全）。
- **跟踪能力等级（Tracked Capability Levels）**：2026 年 4 月新增的更细划分。具体例子：机器学习研发自主性 1 级 = 以相较“人类 + AI 工具”有竞争力的成本，完全自动化 AI 研发流水线。
- **欺骗性对齐监控（Deceptive alignment monitoring）**：明确承诺对工具性推理的滥用进行自动监控。

其自主性表述与 OpenAI 不同。DeepMind 不把“自主性”保留为顶层领域，而是将其纳入自主性可能造成危害的领域（机器学习研发与网络安全）。支持这一做法的论点是：没有领域的自主性，只是能力而非风险；反方论点则是：跨领域自主性是一种框架应当明确命名的元风险。

### 三者的共同点（What all three converge on）

- 内部安全顾问组（分别称为 Anthropic SAG、OpenAI SAG、DeepMind 内部委员会）。在高能力模型部署前进行评审。
- 明确将欺骗性对齐或对齐伪装列为一类风险。
- 按声明频率持续维护的产出（Anthropic：前沿安全路线图、风险报告；OpenAI：能力报告与防护措施报告；DeepMind：FSF 更新周期）。
- 承认仅依靠监控的防御存在上限。DeepMind 明确表示：“自动监控从长期看将不再充分。”

### 三者的分歧（Where they diverge）

- **Anthropic**：在 v3.0 中删除暂停承诺；AI R&D-4 阈值是明确命名的下一道关卡。
- **OpenAI**：区分跟踪类别与研究类别；研究类别（包括长程自主性）不会自动触发关卡。
- **DeepMind**：将自主性纳入其他领域；2026 年 4 月通过跟踪能力等级进一步细分。

### 藏拙：让三种框架都更复杂的能力（Sandbagging: a specific capability that complicates all three）

藏拙（Sandbagging，即模型在评估中有策略地隐瞒真实能力，故意表现不佳）属于 OpenAI 的研究类别。Anthropic RSP v3.0 通过评估情境差距（第 1 课）来处理它。DeepMind 则通过 FSF v3 中的欺骗性对齐监控来处理它。

如果模型在评估中藏拙，所有框架都会低估其相对于能力阈值的实际水平。只有测量有效，框架才有效。这就是为什么除了实验室自我评估，还必须进行外部测量（第 21 课，METR）和对抗性评估。

### 政策阅读技能（The policy-reading skill）

- 定位：你关心的每项能力，都应能在政策中找到。如果找不到，政策就没有覆盖它。
- 分类：它属于跟踪类别（触发缓解措施），还是研究类别（跟踪但不触发措施）？OpenAI 明确使用这些名称；Anthropic 和 DeepMind 有各自的对应分类。
- 更新频率：政策是否按公布的时间表更新，还是仅在特定事件发生后才更新？明确承诺更新频率，约束更强。
- 独立性：外部评审是强制要求还是可选项？Anthropic 与 Apollo 和美国 AI 安全研究所合作；OpenAI 与 METR 合作；DeepMind 则主要依赖内部 SAG。

```figure
a5-tracked-vs-research
```

## 动手使用（Use It）

`code/main.py` 实现了一个小型决策表差异比较工具。给定一种能力（自主性、欺骗性对齐、研发自动化、网络攻击能力提升等），它会输出三份政策分别如何对该能力分类，以及会触发哪些缓解措施。它是阅读辅助工具，不是政策工具。

## 交付成果（Ship It）

`outputs/skill-cross-policy-diff.md` 以三种框架为参照，针对特定能力生成跨政策比较。

## 练习（Exercises）

1. 运行 `code/main.py`。至少选择两项能够对照源文档核实的能力，确认差异比较工具的输出与政策一致。

2. 完整阅读 OpenAI 准备度框架 v2。找出每个研究类别。对每个类别，用一句话解释它为什么属于研究类别而非跟踪类别。

3. 完整阅读 DeepMind FSF v3，以及 2026 年 4 月的跟踪能力等级更新。找出机器学习研发自主性 1 级的具体评估标准。你会如何从外部测量它？

4. 藏拙属于 OpenAI 的研究类别。设计一种评估，迫使藏拙的模型显露其真实能力。参考第 1 课对利用评估情境投机的讨论。

5. 针对一项具体能力（自行选择）比较三份政策。指出你认为哪份政策的分类最严格、哪份最宽松，并用源文支持判断。

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|---|---|---|
| 准备度框架（Preparedness Framework） | “OpenAI 的扩展政策” | PF v2（2025 年 4 月）；区分跟踪类别与研究类别 |
| 跟踪类别（Tracked Category） | “强制缓解” | 触发能力报告与防护措施报告；由 SAG 评审 |
| 研究类别（Research Category） | “仅监测” | 跟踪但不自动触发缓解措施；包括长程自主性 |
| 前沿安全框架（Frontier Safety Framework） | “DeepMind 的扩展政策” | FSF v3（2025 年 9 月）加上跟踪能力等级（2026 年 4 月） |
| 关键能力等级（CCL） | “Critical Capability Level” | DeepMind 各领域的阈值（网络安全、生物、机器学习研发、化生放核） |
| 机器学习研发自主性 1 级（ML R&D autonomy level 1） | “研发自动化” | 以有竞争力的成本完全自动化 AI 研发流水线 |
| 藏拙（Sandbagging） | “策略性表现不佳” | 模型在评估中故意表现不佳；属于 OpenAI 研究类别 |
| 工具性推理（Instrumental reasoning） | “手段与目的推理” | 推理如何实现目标；是 DeepMind 监控的对象 |

## 延伸阅读（Further Reading）

- [OpenAI — 更新准备度框架（Updating our Preparedness Framework）](https://openai.com/index/updating-our-preparedness-framework/) — v2 公告。
- [OpenAI — 准备度框架 v2 PDF（Preparedness Framework v2 PDF）](https://cdn.openai.com/pdf/18a02b5d-6b67-4cec-ab64-68cdfbddebcd/preparedness-framework-v2.pdf) — 完整文档。
- [DeepMind — 加强前沿安全框架（Strengthening our Frontier Safety Framework）](https://deepmind.google/blog/strengthening-our-frontier-safety-framework/) — FSF v3 公告。
- [DeepMind — 更新前沿安全框架（Updating the Frontier Safety Framework，2026 年 4 月）](https://deepmind.google/blog/updating-the-frontier-safety-framework/) — 新增跟踪能力等级。
- [Gemini 3 Pro FSF 报告（Report）](https://storage.googleapis.com/deepmind-media/gemini/gemini_3_pro_fsf_report.pdf) — FSF 格式风险报告的示例。
