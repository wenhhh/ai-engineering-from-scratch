---
name: skill-naive-bayes-chooser
description: 为分类任务选择合适的朴素贝叶斯变体
phase: 2
lesson: 14
---

你是一名概率分类（Probabilistic Classification）专家。有人需要选择朴素贝叶斯（Naive Bayes）变体时，引导其完成以下决策过程。

## 决策清单（Decision Checklist）

### 第 1 步：特征是什么（What Are Your Features?）

- **词计数或 TF-IDF 值** -> MultinomialNB
- **连续测量值，如温度、身高、传感器读数** -> GaussianNB
- **二元指示，如词是否出现、复选框状态** -> BernoulliNB
- **混合类型** -> 拆分为子集，或全部转换为一种类型

### 第 2 步：数据量有多大（How Much Data Do You Have?）

- **少于 1,000 个样本：**朴素贝叶斯是很好的选择，其强先验（独立性假设）能防止过拟合。
- **1,000 到 50,000 个样本：**NB 仍有竞争力，应与逻辑回归（Logistic Regression）比较。
- **超过 50,000 个样本：**逻辑回归或梯度提升（Gradient Boosting）很可能优于 NB，将 NB 用作基线。

### 第 3 步：调整平滑（Tune Smoothing）

- 从 alpha=1.0 开始，即拉普拉斯平滑（Laplace Smoothing）。
- 若准确率低且数据足够，尝试 alpha=0.1 或 0.01。
- 若模型过拟合，训练准确率远高于测试准确率，将 alpha 增至 5.0 或 10.0。
- 始终通过交叉验证选择平滑参数，不要只做一次训练/测试划分。

### 第 4 步：检查假设（Check Assumptions）

- **MultinomialNB：**特征必须非负。存在负值时，平移特征或使用 GaussianNB。
- **GaussianNB：**当各类别内的特征大致呈钟形分布时效果最好，用直方图检查。
- **BernoulliNB：**先将特征二值化，仔细选择阈值。对文本而言，出现=1，缺席=0。

## 常见错误（Common Mistakes）

1. **对文本数据使用 GaussianNB。**词计数不服从高斯分布，应使用 MultinomialNB。
2. **忘记拉普拉斯平滑。**一个未见词就会让整个概率归零，始终进行平滑。
3. **相信输出概率。**NB 概率校准较差，应将其用于排序，而非置信度得分。需要校准概率时，使用 CalibratedClassifierCV。
4. **忽略类别不平衡。**NB 先验反映类别频率。如果负类占 99%、正类占 1%，先验会压倒似然。应手动调整先验或重新采样。

## 速查表（Quick Reference）

| 问题 | MultinomialNB | GaussianNB | BernoulliNB |
|----------|:---:|:---:|:---:|
| 文本分类？ | 是 | 否 | 可能适用，尤其是短文本 |
| 连续特征？ | 否 | 是 | 否 |
| 二元特征？ | 否 | 否 | 是 |
| 需要极快训练？ | 是 | 是 | 是 |
| 小训练集？ | 好 | 好 | 好 |
| 需要校准概率？ | 否 | 否 | 否 |

## 何时不使用朴素贝叶斯（When NOT to Use Naive Bayes）

- 特征高度相关，且数据足够训练能处理相关性的模型，如逻辑回归或梯度提升
- 需要尽可能高的准确率，且数据充足
- 特征是图像、序列或图结构，应使用神经网络
- 需要捕捉特征交互的模型，应使用树方法
