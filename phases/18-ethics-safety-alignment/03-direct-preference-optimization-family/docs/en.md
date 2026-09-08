# 直接偏好优化系列（The Direct Preference Optimization Family）

> Rafailov 等人（2023）证明，RLHF 的最优解可以用偏好数据表示为闭式形式，因此可以跳过显式奖励模型，直接优化策略。这一见解衍生出了 IPO、KTO、SimPO、ORPO 和 BPO 等一系列方法，每种方法都修复 DPO 的一种失效模式。2026 年，采用直接对齐算法（Direct Alignment Algorithms，DAA）的前沿模型后训练任务已经多于采用 PPO 的任务。但第 2 课的过度优化曲线依然适用：DAA 无法摆脱古德哈特现象（Goodhart），只是改变了它发生的位置。

**Type:** Learn
**Languages:** Python (stdlib, six-variant preference-loss comparator)
**Prerequisites:** 阶段 18 · 01（InstructGPT）、阶段 18 · 02（奖励投机（Reward hacking））、阶段 10 · 08（直接偏好优化基础（DPO basics））
**Time:** ~75 分钟

## 学习目标（Learning Objectives）

- 从带 KL 约束的 RLHF 最优解推导 DPO 的闭式形式。
- 说明 IPO、KTO、SimPO、ORPO 和 BPO 分别修复了 DPO 的哪种失效模式。
- 区分“隐式奖励差距（Implicit reward gap）”与“偏好强度（Preference strength）”，并解释 IPO 的恒等映射（Identity mapping）为什么重要。
- 解释 Rafailov 等人（NeurIPS 2024）为何证明，即使没有显式奖励模型，DAA 仍会过度优化。

## 问题（The Problem）

第 1 课的 RLHF 目标：

```
max_pi E_{x,y~pi} [ r(x, y) ] - beta * KL(pi || pi_ref)
```

具有已知的最优解：

```
pi*(y|x) = (1/Z(x)) * pi_ref(y|x) * exp(r(x, y) / beta)
```

因此，奖励可由最优策略与参考策略之比隐式定义：

```
r(x, y) = beta * log(pi*(y|x) / pi_ref(y|x)) + beta * log Z(x)
```

将它代入 Bradley-Terry 偏好似然后，配分函数（Partition function）`Z(x)` 会被消去，因为它只依赖于 `x`。剩下的是一个只涉及策略参数的损失函数，不再需要奖励模型。这就是直接偏好优化（Direct Preference Optimization，DPO）。

问题在于，这一推导假设最优解可达、偏好数据位于分布内，而且参考策略是真正的模式锚点。这些假设都不能完全成立。该系列中的每种方法，都修复一种不同的假设违背情形。

## 概念（The Concept）

### 直接偏好优化（DPO，Rafailov 等，2023）

```
L_DPO = -log sigmoid(
  beta * log(pi(y_w | x) / pi_ref(y_w | x))
  - beta * log(pi(y_l | x) / pi_ref(y_l | x))
)
```

可能出现的问题：

- 隐式奖励差距 `beta * (log(pi/pi_ref)_w - log(pi/pi_ref)_l)` 没有上界。微小的偏好也可能产生任意大的差距。
- 损失会推动被选中回答与被拒绝回答的对数概率朝相反方向变化。只要被拒绝回答下降得更快，被选中回答的绝对对数概率也可以被压低。这就是被选中回答退化（Degraded Chosen Response）现象。
- 分布外偏好（罕见配对与罕见配对之间的比较）会产生任意的隐式奖励。

### 恒等偏好优化（IPO，Azar 等，2024）

恒等偏好优化（Identity Preference Optimization）用偏好概率上的恒等映射替代对数 sigmoid。损失变为针对有界目标的平方误差：

```
L_IPO = (log(pi(y_w | x) / pi_ref(y_w | x)) - log(pi(y_l | x) / pi_ref(y_l | x)) - 1/(2 beta))^2
```

间隔受 `1/(2 beta)` 限制。偏好强度与隐式奖励差距成正比，不会无限膨胀。

### 卡尼曼–特沃斯基优化（KTO，Ethayarajh 等，2024）

卡尼曼–特沃斯基优化（Kahneman-Tversky Optimization）完全舍弃成对结构。给定单个已标注输出，以及“期望”或“不期望”的二元信号，它会映射到前景理论（Prospect theory）效用：

```
v(x, y) = sigma(beta * log(pi(y|x) / pi_ref(y|x)) - z_ref)
```

收益与损失采用不同权重，体现损失厌恶（Loss aversion）。好处是可以使用数量丰富得多的非配对数据。

### 简单偏好优化（SimPO，Meng 等，2024）

简单偏好优化（Simple Preference Optimization）使训练信号与生成过程一致。它完全移除参考策略，并按长度归一化对数似然：

```
L_SimPO = -log sigmoid(
  (beta / |y_w|) * log pi(y_w | x)
  - (beta / |y_l|) * log pi(y_l | x)
  - gamma
)
```

其中使用间隔 `gamma` 保持稳定。长度归一化消除了利用 DPO 长度偏差失效模式的动机；按照构造方式，更长的 `y_w` 会带来更大的对数概率差距。

### 优势比偏好优化（ORPO，Hong 等，2024）

优势比偏好优化（Odds-Ratio Preference Optimization）在标准 SFT 负对数似然（Negative log-likelihood）中添加偏好项：

```
L_ORPO = L_NLL(y_w) + lambda * L_OR
L_OR = -log sigmoid(log(odds(y_w) / odds(y_l)))
```

它不使用参考策略，而由 SFT 项充当正则化项。训练只需一个阶段，就能从基础模型得到对齐模型，不需要单独的 SFT 检查点（Checkpoint）。

### 行为保持优化（BPO，ICLR 2026 投稿，OpenReview id=b97EwMUWu7）

该方法指出了被选中回答退化问题：DPO 保留排序 `y_w > y_l`，但 `y_w` 的绝对对数概率可能下降。行为保持优化（Behavior Preservation Optimization，BPO）加入一行修正，对被选中回答概率的下降施加惩罚。论文报告，在 Llama-3.1-8B-Instruct 的数学推理任务上，相比 DPO，准确率提高了 +10.1%。

### 普遍结论：DAA 仍会过度优化（The universal result: DAAs still over-optimize）

Rafailov 等人的《直接对齐算法中奖励模型过度优化的缩放定律》（Scaling Laws for Reward Model Overoptimization in Direct Alignment Algorithms，NeurIPS 2024）在多个数据集和不同 KL 预算下，使用 DPO、IPO、SLiC 训练策略。金标准奖励随 KL 变化的曲线，与 Gao 等人的曲线一样，呈现先达到峰值再崩塌的形状。训练期间，隐式奖励会查询分布外样本；KL 正则化无法使这一过程稳定下来。

DAA 无法摆脱古德哈特现象。它们只是将问题发生的位置从“奖励模型被过度优化”改成了“参考策略比值被过度优化”。更好的数据、集成和提前停止这些通用修复方法，对两者都适用。

### 如何选择（Choosing among them，2026）

- 如果有大量成对偏好数据，使用保守 beta 的 DPO；如果长度偏差明显，则使用 SimPO。
- 如果有非配对二元反馈，使用 KTO。
- 如果希望从基础模型开始采用单阶段流水线，使用 ORPO。
- 如果 DPO 日志中出现被选中回答的对数概率退化，使用 BPO。
- 如果偏好强度差异很大，而且 DPO 正趋于饱和，使用 IPO。

每家实验室都会对全部五种方法进行一系列测试，再为每项任务选择表现最好的方法。没有理由认为数学推理与安全任务的最优选择必然相同。

```figure
dpo-margin
```

## 实际应用（Use It）

`code/main.py` 在一个玩具偏好数据集上比较六种损失：DPO、IPO、KTO、SimPO、ORPO 和 BPO，其中真实偏好强度随配对而变化。每种损失都使用一个小型 softmax 策略，在相同的 500 对样本上优化。程序绘制每种方法的最终胜率、被选中回答的对数概率偏移，以及隐式奖励的分散程度。

## 交付成果（Ship It）

本课生成 `outputs/skill-preference-loss-selector.md`。给定数据集统计信息（配对或非配对、偏好强度可变或一致、长度分布）和训练目标（单阶段，或先 SFT 再偏好训练），推荐一种偏好损失，并报告它所防范的失效模式。

## 练习（Exercises）

1. 运行 `code/main.py`，报告 DPO 和 BPO 最终的被选中回答对数概率下降量。BPO 应当保留更高的被选中回答绝对概率，请验证这一点。

2. 修改偏好数据，使所有配对具有相同强度。六种方法中哪种最稳健，哪种会退化？解释 IPO 在这里的优势。

3. 让被拒绝回答的平均长度达到被选中回答的 2 倍。在不改变其他设置的情况下，用数值展示 DPO 对长度的利用，以及 SimPO 对这一问题的修复。

4. Rafailov 等人（NeurIPS 2024）认为 DAA 会过度优化。复现一个单点版本：绘制被选中回答减去被拒绝回答的 KL 散度，并观察 beta 较大时 DPO 的过度优化。

5. 阅读 BPO 论文摘要（OpenReview b97EwMUWu7）。写出 BPO 在 DPO 上添加的那一行修正，并与 `code/main.py` 中的实现核对。

## 关键术语（Key Terms）

| 术语（Term） | 常见说法 | 实际含义 |
|------|-----------------|------------------------|
| 直接偏好优化（DPO） | “没有奖励模型的 RLHF” | 从 RLHF 闭式最优解推导的损失，只涉及策略参数 |
| 隐式奖励（Implicit reward） | “对数比” | `beta * log(pi(y\|x) / pi_ref(y\|x))`，即 DPO 隐含的奖励 |
| 恒等偏好优化（IPO） | “有界 DPO” | 用恒等映射替代对数 sigmoid；隐式奖励差距以 `1/(2 beta)` 为上限 |
| 卡尼曼–特沃斯基优化（KTO） | “非配对 DPO” | 在单个标签上使用带损失厌恶的前景理论效用 |
| 简单偏好优化（SimPO） | “无参考策略的 DPO” | 长度归一化对数似然加间隔，不使用参考策略 |
| 优势比偏好优化（ORPO） | “单阶段 DPO” | 负对数似然加优势比偏好项，从基础模型开始一次完成训练 |
| 行为保持优化（BPO） | “保持被选中回答的 DPO” | 在 DPO 上增加惩罚项，惩罚被选中回答绝对对数概率的下降 |
| 被选中回答退化（Degraded Chosen） | “被选中的也下降了” | 只要被拒绝回答下降得更快，DPO 就会降低被选中回答的对数概率 |
| 直接对齐算法（DAA） | “直接对齐算法” | 任何跳过显式奖励模型的偏好损失方法 |

## 延伸阅读（Further Reading）

- [Rafailov 等：直接偏好优化（Direct Preference Optimization，NeurIPS 2023，arXiv:2305.18290）](https://arxiv.org/abs/2305.18290)
- [Azar 等：理解从人类偏好中学习的通用理论范式（A General Theoretical Paradigm to Understand Learning from Human Preferences，AISTATS 2024，arXiv:2310.12036）](https://arxiv.org/abs/2310.12036)：IPO。
- [Ethayarajh 等：KTO，将模型对齐视为前景理论优化（KTO: Model Alignment as Prospect Theoretic Optimization，arXiv:2402.01306）](https://arxiv.org/abs/2402.01306)
- [Meng、Xia、Chen：简单偏好优化（SimPO，NeurIPS 2024，arXiv:2405.14734）](https://arxiv.org/abs/2405.14734)
- [Hong、Lee、Thorne：优势比偏好优化（ORPO，EMNLP 2024，arXiv:2403.07691）](https://arxiv.org/abs/2403.07691)
- [BPO：行为保持优化（Behavior Preservation Optimization，ICLR 2026，OpenReview b97EwMUWu7）](https://openreview.net/forum?id=b97EwMUWu7)
- [Rafailov 等：直接对齐算法中奖励模型过度优化的缩放定律（Scaling Laws for RM Overoptimization in DAAs，NeurIPS 2024，arXiv:2406.02900）](https://arxiv.org/abs/2406.02900)
