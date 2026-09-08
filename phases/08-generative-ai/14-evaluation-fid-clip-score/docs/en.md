# 评估：FID、CLIP 分数与人类偏好（Evaluation — FID, CLIP Score, Human Preference）

> 每个生成模型排行榜都引用 FID、CLIP 分数和人类偏好竞技场胜率。每个数字都有可被刻意利用的失效模式。不知道这些失效模式，就分不清真正改进和刷分运行。

**Type:** Build
**Languages:** Python
**Prerequisites:** 阶段 8 · 01（分类），阶段 2 · 04（评估指标）
**Time:** ~45 分钟

## 问题（The Problem）

生成模型按*样本质量（Sample Quality）*和*条件遵循（Conditioning Adherence）*评判。两者都没有闭式度量。模型要渲染 10,000 张图像，某种方法要给它们数字，你还必须相信这些数字能跨模型类别、分辨率、架构比较。三种指标经受住 2014 至 2026 年的考验：

- **弗雷歇起始距离（Fréchet Inception Distance，FID）。** Inception 网络特征空间中真实与生成分布间的距离，越低越好。
- **CLIP 分数（CLIP Score）。** 生成图像的 CLIP 图像嵌入与提示词的 CLIP 文本嵌入间余弦相似度，越高越好，衡量提示词遵循。
- **人类偏好（Human Preference）。** 两个模型在同一提示词上对决，由人类（或 GPT-4 级模型）选更好的，再汇总为 Elo 分数。

你还会遇到：起始分数（Inception Score，IS；基本退役）、核起始距离（Kernel Inception Distance，KID）、CMMD、ImageReward、PickScore、HPSv2、MJHQ-30k。每种都修正前一种的某项不足。

## 概念（The Concept）

![FID、CLIP 与偏好：三个维度，不同失效模式](../assets/evaluation.svg)

### FID：样本质量（FID — sample quality）

Heusel 等（2017）。步骤：

1. 提取 N 张真实图像与 N 张生成图像的 Inception-v3 特征（2048 维）。
2. 为每组拟合高斯分布，计算均值 `μ_r, μ_g` 与协方差 `Σ_r, Σ_g`。
3. FID = `||μ_r - μ_g||² + Tr(Σ_r + Σ_g - 2 · (Σ_r · Σ_g)^0.5)`。

解释：特征空间中两个多元高斯分布间的弗雷歇距离。越低，分布越相似。

失效模式：
- **小 N 时有偏。** FID 在特征分布上计算均方，小 N 低估协方差，给出虚低 FID。始终用 N ≥ 10,000。
- **依赖 Inception。** Inception-v3 在 ImageNet 上训练。远离 ImageNet 的领域（人脸、美术、文字图像）会得到无意义 FID。应使用领域专用特征提取器。
- **刷分。** 过拟合 Inception 先验可降低 FID，却不提升视觉质量。用下文 CMMD 应对。

### CLIP 分数：提示词遵循（CLIP score — prompt adherence）

Radford 等（2021）。对生成图像与提示词：

```text
clip_score = cos_sim( CLIP_image(x_gen), CLIP_text(prompt) )
```

在 30k 张生成图像上平均，得到模型间可比较的标量。

失效模式：
- **CLIP 自身盲点。** CLIP 的组合推理弱，“蓝色球体上的红色立方体”常失败。模型可以 CLIP 分数高，却并未遵循复杂提示词。
- **短提示词偏差。** 现实数据中短提示词有更多 CLIP 图像匹配。长提示词在机制上分数更低。
- **提示词刷分。** 提示词加入“高质量、4k、杰作”会抬高 CLIP 分数，却不改善图文绑定。

CMMD（Jayasumana 等，2024）修复部分问题：用 CLIP 特征替换 Inception，用最大均值差异（Maximum Mean Discrepancy，MMD）替换弗雷歇距离，更能检测细微质量差别。

### 人类偏好：评判依据（Human preference — the ground truth）

选择提示词集合，用模型 A、B 生成，将配对展示给人类或强大语言模型（LLM）裁判，把胜负汇总为 Elo 或 Bradley-Terry 分数。基准包括：

- **PartiPrompts（Google）**：1,600 个多样提示词，12 类。
- **HPSv2**：107k 人类标注，广泛用作自动代理指标。
- **ImageReward**：137k 提示词与图像偏好对，MIT 许可证。
- **PickScore**：在 Pick-a-Pic 的 2.6M 偏好上训练。
- **Chatbot Arena 式图像竞技场**：https://imagearena.ai/ 等。

失效模式：
- **裁判差异。** 非专家和专家偏好不同，两者都用。
- **提示词分布。** 精选提示词可能偏袒某类模型，必须记录分布。
- **LLM 裁判奖励投机（Reward Hacking）。** GPT-4 裁判会被漂亮但错误的输出欺骗，要与人类交叉核对。

## 组合使用（Use together）

生产评估报告应包含：

1. 在 10k 至 30k 样本上，相对留出真实分布的 FID（样本质量）。
2. 同一批样本相对提示词的 CLIP 分数／CMMD（遵循）。
3. 相对前一模型的盲测竞技场胜率（总体偏好）。
4. 失效模式分析：随机抽取 50 个输出，标记已知问题（手部解剖、文字渲染、物体数量一致性）。

单一指标都不可信。三个相互佐证的指标加定性评审，才支撑结论。

```figure
gx-fid-distributions
```

## 动手实现（Build It）

`code/main.py` 在合成“特征向量”上实现 FID、类 CLIP 分数与 Elo 汇总（用四维向量替代 Inception 特征）。你会看到：

- 小 N 与大 N 的 FID 计算及其偏差。
- 特征集合间余弦相似度形式的“CLIP 分数”。
- 合成偏好流驱动的 Elo 更新规则。

### 第 1 步：四行实现 FID（Step 1: FID in four lines）

```python
def fid(real_features, gen_features):
    mu_r, cov_r = mean_and_cov(real_features)
    mu_g, cov_g = mean_and_cov(gen_features)
    mean_diff = sum((a - b) ** 2 for a, b in zip(mu_r, mu_g))
    trace_term = trace(cov_r) + trace(cov_g) - 2 * sqrt_cov_product(cov_r, cov_g)
    return mean_diff + trace_term
```

### 第 2 步：CLIP 式余弦相似度（Step 2: CLIP-style cosine-similarity）

```python
def clip_like(image_feat, text_feat):
    dot = sum(a * b for a, b in zip(image_feat, text_feat))
    norm = math.sqrt(dot_self(image_feat) * dot_self(text_feat))
    return dot / max(norm, 1e-8)
```

### 第 3 步：Elo 汇总（Step 3: Elo aggregation）

```python
def elo_update(r_a, r_b, winner, k=32):
    expected_a = 1 / (1 + 10 ** ((r_b - r_a) / 400))
    actual_a = 1.0 if winner == "a" else 0.0
    r_a_new = r_a + k * (actual_a - expected_a)
    r_b_new = r_b - k * (actual_a - expected_a)
    return r_a_new, r_b_new
```

## 常见陷阱（Pitfalls）

- **N=1000 的 FID。** N 低于 10k 时这种启发式不可靠。报告低 N FID 的论文是在刷分。
- **跨分辨率比较 FID。** Inception 的 299×299 缩放会改变特征分布，只在匹配分辨率下比较。
- **仅报告一个种子。** 至少跑 3 个种子，报告标准差。
- **负向提示词抬高 CLIP 分数。** 有些流水线通过过拟合提示词提高 CLIP，检查视觉过饱和。
- **提示词重叠造成 Elo 偏差。** 两模型若训练时都见过基准提示词，Elo 就无意义。使用留出提示词集。
- **付费众包人评偏差。** Prolific、MTurk 标注者偏年轻、偏技术友好。混合招募美术／设计专家。

## 实际应用（Use It）

2026 年生产评估方案：

| 支柱 | 最低要求 | 推荐 |
|--------|---------|-------------|
| 样本质量 | 10k 样本对留出真实集的 FID | 加 5k CMMD 与逐类子集 FID |
| 提示词遵循 | 30k CLIP 分数 | 加 HPSv2、ImageReward、视觉问答（Visual Question Answering，VQA）式问答 |
| 偏好 | 相对基线的 200 对盲测 | 加 2000 对人评、LLM 裁判、Chatbot Arena |
| 失效分析 | 人工标记 50 个 | 人工标记 500 个，加自动安全分类器 |

四根支柱放在一份报告中才构成结论。任何单项独用都只是营销。

## 交付成果（Ship It）

保存 `outputs/skill-eval-report.md`。技能接收新模型检查点与基线，输出完整评估计划：样本量、指标、失效模式探针、签核标准。

## 练习（Exercises）

1. **简单。** 运行 `code/main.py`。在同一合成分布上比较 N=100 与 N=1000 的 FID，报告偏差幅度。
2. **中等。** 用合成 CLIP 式特征实现 CMMD（公式见 Jayasumana 等，2024），比较其与 FID 对质量差异的敏感性。
3. **困难。** 复现 HPSv2 设置：从 Pick-a-Pic 子集取 1000 个图像与提示词对，根据偏好微调小型 CLIP 评分器，测量与留出集的一致度。

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|------|-----------------|-----------------------|
| FID | “弗雷歇起始距离” | 真实与生成 Inception 特征高斯拟合之间的弗雷歇距离。 |
| CLIP 分数（CLIP Score） | “图文相似度” | CLIP 图像与文本嵌入间余弦相似度。 |
| CMMD | “FID 替代品” | CLIP 特征 MMD，偏差更小，无高斯假设。 |
| IS | “起始分数” | Exp KL(p(y|x) || p(y))；与现代模型质量相关性差，已退役。 |
| HPSv2 / ImageReward / PickScore | “学习得到的偏好代理” | 在人类偏好上训练的小模型，用作自动裁判。 |
| Elo | “国际象棋等级分” | 配对胜负的 Bradley-Terry 汇总。 |
| PartiPrompts | “基准提示词集” | Google 精选的 1,600 个提示词，覆盖 12 类。 |
| FD-DINO | “自监督替代品” | 使用 DINOv2 特征的弗雷歇距离（FD），更适合 ImageNet 之外领域。 |

## 生产说明：评估也是推理负载（Production note: evaluation is an inference workload too）

对 10k 样本计算 FID，意味着生成 10k 张图像。单张 L4 上，1024²、50 步 SDXL base 的单请求推理约需 11 小时。评估预算真实存在，完全属于离线推理情形：最大化吞吐量，忽略首词元时间（TTFT）。

- **增大批次，忽略延迟。** 离线评估就是采用显存可容纳的最大静态批次。80GB H100 上用 `pipe(...).images` 和 `num_images_per_prompt=8`，实际耗时比单请求快 4 至 6 倍。
- **缓存真实特征。** 真实参考集的 Inception（FID）或 CLIP（CLIP 分数、CMMD）特征提取只运行*一次*，保存为 `.npz`，不要每次评估重算。

持续集成（Continuous Integration，CI）／回归门禁：每个 PR 在 500 样本子集上运行 FID 与 CLIP 分数（约 30 分钟）；每夜运行完整 10k FID、HPSv2 和 Elo。

## 延伸阅读（Further Reading）

- [Heusel 等（2017）：双时间尺度更新规则训练的 GAN 收敛到局部纳什均衡（GANs Trained by a Two Time-Scale Update Rule Converge to a Local Nash Equilibrium，FID）](https://arxiv.org/abs/1706.08500)：FID 论文。
- [Jayasumana 等（2024）：重新思考 FID：迈向更好的图像生成评估指标（Rethinking FID: Towards a Better Evaluation Metric for Image Generation，CMMD）](https://arxiv.org/abs/2401.09603)：CMMD。
- [Radford 等（2021）：从自然语言监督学习可迁移视觉模型（Learning Transferable Visual Models from Natural Language Supervision，CLIP）](https://arxiv.org/abs/2103.00020)：CLIP。
- [Wu 等（2023）：HPSv2：全面的人类偏好分数（HPSv2: A Comprehensive Human Preference Score）](https://arxiv.org/abs/2306.09341)：HPSv2。
- [Xu 等（2023）：ImageReward：学习和评估文生图的人类偏好（ImageReward: Learning and Evaluating Human Preferences for Text-to-Image Generation）](https://arxiv.org/abs/2304.05977)：ImageReward。
- [Yu 等（2023）：扩展自回归模型以生成内容丰富的文生图（Scaling Autoregressive Models for Content-Rich Text-to-Image Generation，Parti + PartiPrompts）](https://arxiv.org/abs/2206.10789)：PartiPrompts。
- [Stein 等（2023）：揭示生成模型评估指标的缺陷（Exposing flaws of generative model evaluation metrics）](https://arxiv.org/abs/2306.04675)：失效模式综述。
