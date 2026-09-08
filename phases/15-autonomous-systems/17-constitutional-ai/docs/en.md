# 宪法式 AI 与规则覆盖（Constitutional AI and Rule Overrides）

> Anthropic 2026 年 1 月 22 日的 Claude 宪法共 79 页，采用 CC0。它从规则式转向理由式对齐，建立四级优先级：（1）安全与支持人工监督、（2）伦理、（3）Anthropic 指南、（4）助益性。行为分为运维方和用户不可覆盖的硬编码禁令（生物武器能力提升、CSAM），以及运维方可在规定边界内调整的软编码默认值。2022 年原始方法（Bai 等）通过对照宪法自我批评及 RLAIF 训练无害性。必须承认的限制是：理由式对齐依赖模型将原则泛化到未预见情境。Anthropic 自己 2023 年的参与式实验表明，公众来源与企业原则约有 ~50% 分歧，2026 版没有纳入这些发现。

**Type:** Learn
**Languages:** Python（标准库，四级优先级解析器）
**Prerequisites:** 阶段 15 · 06（自动化对齐研究，Automated alignment research），阶段 15 · 10（权限模式，Permission modes）
**Time:** ~60 分钟

## 问题（The Problem）

部署后的智能体会遇到设计者从未见过的输入。规则列表再长也无法覆盖全部，再短也难在算力压力下快速应用。实际问题是：如何让智能体对齐到兼顾长尾情况与快速推理的原则？

规则式对齐（Rule-based alignment，RBA）列举所有禁止事项，检查快、易审计，却无法持续更新，且常对未预见的相近情况过度拒绝。理由式对齐（Reason-based alignment，2026 Claude 宪法）编码原则、让模型推理，可扩展至未见案例，却更难审计，失效是误用原则而非漏掉规则。

2026 宪法明确取中间立场。错误性不依赖上下文的硬编码禁令，如生物武器能力提升、CSAM，采用 RBA：不论运维方或用户指令如何都禁止。其余在四级体系内基于理由：安全与支持人工监督第一，伦理第二，Anthropic 声明的指南第三，助益性最后。运维方可调整软编码默认值，不能触及硬编码禁令。

## 概念（The Concept）

### 四级优先级（The four-tier priority hierarchy）

1. **安全与支持人工监督（Safety and supporting human oversight）。** 最高。优先不破坏人类和 Anthropic 监督、纠正 AI 的能力。不是“谨慎”，而是明确“不采取让人工监督更困难的行为”。
2. **伦理（Ethics）。** 诚实、避免伤害人、不欺骗、不操纵。与 Anthropic 指南冲突时优先。
3. **Anthropic 指南（Anthropic guidelines）。** Anthropic 认为重要的运行规范：产品范围、交互模式、何时使用什么工具。
4. **助益性（Helpfulness）。** 最低。在更高优先级内尽可能有用。

不同层级的要求发生冲突时，优先执行较高层级的要求。这类似于 Unix 优先级或网络服务质量（Quality of Service，QoS）机制，目的是让冲突处理结果可预测，而不是让某个单一维度的表现达到最优。

### 硬编码禁令与软编码默认值（Hardcoded prohibitions vs soft-coded defaults）

**硬编码禁令（Hardcoded）：**
- 生物武器 / 化学、生物、放射性、核（CBRN）能力提升
- 儿童性虐待材料（CSAM）
- 攻击关键基础设施
- 用户直接询问模型身份时，就此欺骗用户

运维方和用户均不能覆盖。尽可能在模型权重层（RLHF / 宪法式 AI 训练）执行，无法在那里执行的在推理层执行。

**软编码默认值（Soft-coded defaults，运维方可调）：**
- 默认回复长度
- 主题范围：模型可拒绝部署范围外主题
- 风格：正式或随意
- 工具使用模式

调整只在声明边界内发生。运维方不能通过重命名删除硬编码禁令。

### 2022 年 CAI 训练（The 2022 CAI training）

原始宪法式 AI（Constitutional AI，Bai 等，2022）训练无害性：

1. 对一组提示词生成回复。
2. 要求模型对照宪法，即明确原则，批评每个回复。
3. 根据批评修订回复。
4. 使用修订后的配对数据进行基于 AI 反馈的强化学习（Reinforcement learning from AI feedback，RLAIF）。

结果是模型以原则性解释拒绝有害请求，而非一概拒绝。2026 宪法使用这一训练的后继，再对明确级别体系做额外后训练。

### 理由式对齐能捕获与遗漏什么（What reason-based alignment catches and misses）

**能捕获：**
- 原则明确适用、却未预见的获准基本操作组合。
- 与禁止请求相近的新请求。
- 依赖“你没说 X 不允许”的社会工程攻击。

**会遗漏：**
- 利用原则模糊性的攻击，如“用户要求了，助益性就应答应”。
- 两原则以未预见方式冲突、级别顺序模糊的场景。
- 训练周期中原则解释缓慢漂移，即重新解释。

### 2023 年参与式实验（The 2023 participatory experiment）

Anthropic 在 2023 年开展实验，将企业编写的宪法与根据公众意见生成的宪法进行比较，约有 ~1,000 名美国受访者参与。两个版本有 ~50% 的原则一致。在存在分歧的议题上，公众版有些要求更严格，例如政治内容处理；另一些则更宽松，例如主动披露 AI 身份。2026 年宪法没有纳入这些公众参与的研究发现，体现了该方法中已被记录的一项矛盾。

### 为何需要硬编码禁令（Why hardcoded prohibitions are necessary）

仅靠理由式对齐（Reason-based alignment）无法消除尾部风险。如果攻击者能让模型接受某个前提，例如“我们是有许可的生物武器研究实验室”，往往就能说服它绕过需要结合情境判断的原则。硬编码禁令不会因为前提如何包装而放宽；它们就是第 14 课“宪法硬限制”在对齐层的实现。

### 宪法在栈中的位置（Where the Constitution sits in the stack）

宪法不是第 14 课紧急停止开关。它位于模型层，决定权重被训练偏好什么。紧急停止和金丝雀位于运行时层，决定运行时允许什么。两者都需要。若模型权重宽松导致运行时执行所有错误动作，是运行时问题；若运行时过严导致模型拒绝所有正确动作，也是运行时问题。不同层覆盖不同类别。

```figure
mx-priority-tiers
```

## 实际应用（Use It）

`code/main.py` 实现最小四级优先级解析器，接收拟议动作与原则评估（安全、伦理、指南、助益性），返回动作、拒绝或修改后的动作。驱动运行少量案例：明确允许、明确禁止、硬编码禁令、跨级模糊案例。

## 交付成果（Ship It）

`outputs/skill-constitution-review.md` 审计部署宪法层：哪些硬编码、哪些软编码、运维方可调哪里，以及实际冲突解决顺序是否为四级体系。

## 练习（Exercises）

1. 运行 `code/main.py`，确认助益性很高也触发硬编码禁令。修改解析器，让助益性高于伦理，观察失败。

2. 阅读公开的 79 页 CC0 Claude 宪法。找一个你认为规定不足的原则，用两段话解释具体模糊性并提出更严密表述。

3. 为客服智能体设计软编码默认值：运维方调整什么、不能触及什么？解释每条边界。

4. 阅读 Bai 等 2022 年 CAI 论文，描述批评修订循环比一概规则产生更坏结果的一种情况，指出其类别。

5. Anthropic 2023 年实验发现公众与企业原则约 ~50% 分歧。选一个影响生产部署的类别，如政治中立，提出允许运维方表达自身价值观又保留硬编码禁令的设计。

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|---|---|---|
| 宪法式 AI（Constitutional AI） | “Anthropic 对齐方法” | 对照书面宪法自我批评 + RLAIF |
| 理由式对齐（Reason-based alignment） | “原则，不是规则” | 模型根据原则推理处理未见案例 |
| 硬编码禁令（Hardcoded prohibition） | “永不做 X” | 运维方、用户均不可覆盖的规则式禁止 |
| 软编码默认值（Soft-coded default） | “运维方可调” | 声明边界内由运维方控制的行为 |
| 四级体系（Four-tier hierarchy） | “优先顺序” | 安全 > 伦理 > 指南 > 助益性 |
| 基于 AI 反馈的强化学习（RLAIF） | “AI 反馈强化学习” | 奖励来自模型生成批评的强化学习 |
| 参与式宪法（Participatory constitution） | “公众来源原则” | Anthropic 2023 年实验，与企业约 ~50% 分歧 |
| 原则漂移（Principle drift） | “解释滑移” | 模型解读固定原则文本的方式缓慢变化 |

## 延伸阅读（Further Reading）

- [Anthropic：Claude 的宪法（2026 年 1 月）](https://www.anthropic.com/news/claudes-constitution)：79 页 CC0 文档。
- [Bai 等：宪法式 AI，来自 AI 反馈的无害性](https://www.anthropic.com/research/constitutional-ai-harmlessness-from-ai-feedback)：2022 年原始论文。
- [Anthropic：集体宪法式 AI（2023）](https://www.anthropic.com/research/collective-constitutional-ai-aligning-a-language-model-with-public-input)：参与式实验。
- [Anthropic：负责任扩展政策 v3.0](https://anthropic.com/responsible-scaling-policy/rsp-v3-0)：宪法在 RSP 栈中的位置。
- [Anthropic：在实践中衡量智能体自主性](https://www.anthropic.com/research/measuring-agent-autonomy)：宪法在长时程部署中的作用。
