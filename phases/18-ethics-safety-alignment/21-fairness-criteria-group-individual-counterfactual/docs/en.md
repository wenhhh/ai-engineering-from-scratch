# 公平性标准：群体、个体与反事实（Fairness Criteria — Group, Individual, Counterfactual）

> 公平性文献分为三大类。群体公平性（Group Fairness）包括人口统计均等、均等化机会和条件使用准确率相等，要求受保护群体的平均比率相同。个体公平性（Individual Fairness，Dwork 等，2012）要求相似个体得到相似决策，并对决策映射施加 Lipschitz 条件。反事实公平性（Counterfactual Fairness，Kusner 等，2017）要求：反事实地改变敏感属性后，某人的决策结果不变，才算对该人公平。2024 年的理论结果（NeurIPS 2024）表明，反事实公平性（CF）与准确率之间存在内在取舍；一种模型无关的方法可以将最优但不公平的预测器转换为满足 CF 的预测器，并使准确率损失有界。回溯反事实（Backtracking Counterfactuals，arXiv:2401.13935，2024 年 1 月）提供了新范式，避免要求对法律保护的属性进行干预。哲学层面的协调观点（ICLR Blogposts 2024）认为，在给定因果图时，满足某些群体公平性指标就意味着满足反事实公平性。

**Type:** Learn
**Languages:** Python (stdlib, three-criteria comparison)
**Prerequisites:** 阶段 18 · 20（偏差（bias））、阶段 02（经典机器学习（classical ML））
**Time:** ~60 分钟

## 学习目标（Learning Objectives）

- 陈述三项群体公平性标准，即人口统计均等、均等化机会和条件使用准确率相等，并说明一个不可能性结果。
- 使用 Dwork 等人 2012 年的 Lipschitz 表述说明个体公平性。
- 说明反事实公平性及其对因果图的依赖。
- 解释回溯反事实，以及它为什么能避开对受保护属性进行干预的问题。

## 问题（The Problem）

第 20 课讨论如何测量偏差。第 21 课讨论如何定义测量应服务的公平性标准。这三类标准在结构上不同：模型可能对群体公平，却对个体不公平；也可能满足反事实公平性，却不满足群体公平性。选择标准是一项政策决策，没有普遍最优的标准。

## 核心概念（The Concept）

### 群体公平性（Group Fairness）

- **人口统计均等（Demographic Parity）。** 对所有群体，P(Y=1 | A=a) = P(Y=1 | A=a')。也就是接受率相等。
- **均等化机会（Equalized Odds）。** P(Y=1 | Y*=y, A=a) = P(Y=1 | Y*=y, A=a')。各群体的真正率（TPR）和假正率（FPR）相等。
- **条件使用准确率相等（Conditional Use Accuracy Equality）。** P(Y*=y | Y=y, A=a) = P(Y*=y | Y=y, A=a')。各群体的预测值相等。

不可能性结果（Chouldechova、Kleinberg-Mullainathan-Raghavan，2017）指出：当基础发生率不相等时，这三项标准无法同时满足。

### 个体公平性（Individual Fairness）

Dwork 等人于 2012 年提出：对于任务特定的相似度度量 d，如果存在某个 Lipschitz 常数 L，使决策映射 f 满足 |f(x) - f(x')| <= L * d(x, x')，那么它就是个体公平的。相似个体应得到相似决策。

这要求先定义 d。如何定义是政策问题，而不是统计问题。

### 反事实公平性（Counterfactual Fairness）

Kusner 等人于 2017 年提出：在总体的因果模型下，如果反事实地改变个体 i 的敏感属性后，决策保持不变，那么该决策对 i 就是反事实公平的。

这需要因果有向无环图（Causal DAG）。DAG 的选择属于建模决策；反事实公平性主张的合理性取决于该 DAG 是否合理。

### CF 与准确率的取舍（The CF-vs-Accuracy Trade-Off）

NeurIPS 2024 的理论结果表明，反事实公平性与预测准确率之间存在内在取舍。一种模型无关的方法可以将最优但不公平的预测器转换为满足 CF 的预测器，并将准确率代价控制在有界范围内。准确率代价取决于最优不公平预测器中敏感属性系数的大小。

### 回溯反事实（Backtracking Counterfactuals）

arXiv:2401.13935（2024 年 1 月）。传统反事实要求干预敏感属性，例如“如果这个人是另一种性别，决策会改变吗？”这在法律上存在问题：有关分类的法律不允许对受保护属性进行干预。

回溯反事实将推理方向反过来：不干预属性，而是询问该个体实际特征的哪种组合会产生反事实结果。这避开了上述法律异议。

### 哲学层面的协调（Philosophical Reconciliation）

ICLR Blogposts 2024 提出，在已有因果图的情况下，满足某些群体公平性指标就意味着满足反事实公平性。三类标准并非相互独立，而是同一底层因果结构的不同侧面。

这并未消除不可能性定理：基础发生率不相等，仍会阻止所有群体公平性标准同时满足。但它表明，“群体”与“个体／反事实”之间看似对立，部分原因在于没有明确说明因果模型。

### 在第 18 阶段中的位置（Where This Fits in Phase 18）

第 20 课讨论偏差测量，第 21 课讨论公平性定义，第 22 课讨论隐私，具体是差分隐私，第 23 课讨论水印。这些与分配相关的课程，补充了第 7–11 课中与欺骗相关的内容。

```figure
an-fairness-trilemma
```

## 动手使用（Use It）

`code/main.py` 构建了一个包含敏感属性、且各群体基础发生率不相等的玩具二分类数据集。对简单分类器计算人口统计均等、均等化机会和条件使用准确率相等指标，观察三者如何给出不同结论。针对人口统计均等进行重新加权，再观察它给另外两项指标带来的代价。

## 交付成果（Ship It）

本课产出 `outputs/skill-fairness-criterion.md`。给定公平性声明或政策，它会识别所声称的标准，判断在声明所述的基础发生率不相等条件下，模型能否满足其余标准，并指出声明依赖什么因果 DAG。

## 练习（Exercises）

1. 运行 `code/main.py`。报告默认数据上的三项群体指标，应用针对人口统计均等的重新加权，再次报告结果。

2. 使用非敏感特征上的 L2 距离，实现 Dwork 等人 2012 年的个体公平性指标。报告有多少个体对违反了常数 L=1 的 Lipschitz 条件。

3. 阅读 Kusner 等人 2017 年的论文。为简历评分构建一个包含两个特征的简单因果 DAG，并指出它所隐含的反事实公平性条件。

4. 2024 年的回溯反事实论文避免干预受保护属性。描述一个这种区别对法律合规很重要的场景。

5. ICLR 2024 的协调观点认为，群体公平性与反事实公平性是同一结构的不同侧面。从 `code/main.py` 的三项标准中选两项，说明什么因果假设会使它们等价。

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|------|-----------------|------------------------|
| 人口统计均等（Demographic Parity） | “比率相等” | 各群体的 P(Y=1 | A=a) 相等 |
| 均等化机会（Equalized Odds） | “TPR/FPR 相等” | 各群体的真正率和假正率相等 |
| 条件使用准确率（Conditional Use Accuracy） | “PPV/NPV 相等” | 各群体的预测值相等 |
| 个体公平性（Individual Fairness） | “Lipschitz 条件” | 相似个体得到相似决策 |
| 反事实公平性（Counterfactual Fairness） | “因果改变不变性” | 反事实地改变属性后，决策不变 |
| 回溯反事实（Backtracking Counterfactual） | “通过实际特征解释” | 从结果向后推理反事实，而不是从属性向前推理 |
| 不可能性定理（Impossibility Theorem） | “三者冲突” | Chouldechova／KMR 2017：基础发生率不相等时，群体标准无法兼得 |

## 延伸阅读（Further Reading）

- [Dwork 等 —《通过知情实现公平》（arXiv:1104.3913）](https://arxiv.org/abs/1104.3913) — 个体公平性
- [Kusner、Loftus、Russell、Silva —《反事实公平性》（arXiv:1703.06856）](https://arxiv.org/abs/1703.06856) — 反事实公平性
- [Chouldechova —《存在差别影响时的公平预测》（arXiv:1703.00056）](https://arxiv.org/abs/1703.00056) — 不可能性
- [回溯反事实（arXiv:2401.13935）](https://arxiv.org/abs/2401.13935) — 处理受保护属性干预的新范式
