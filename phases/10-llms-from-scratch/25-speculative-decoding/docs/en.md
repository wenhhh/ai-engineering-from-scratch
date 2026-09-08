# 推测解码与 EAGLE（Speculative Decoding and EAGLE）

> 前沿大语言模型（Large Language Model，LLM）生成一个词元，需要对数十亿参数执行完整前向传播（Forward Pass）。这次计算的能力严重过剩：多数时候，小得多的模型能正确猜中接下来 3–5 个词元，大模型只需验证猜测。猜对时，你以一个词元的代价获得五个。推测解码（Speculative Decoding，Leviathan 等人，2023）使该方法具有精确性；EAGLE-3（2025）将每次验证平均接受量提高到约 4.5 词元，在输出分布相同的情况下加速 4–5 倍。

**Type:** Build
**Languages:** Python (with numpy)
**Prerequisites:** 阶段 10 第 12 课（推理优化）、阶段 10 第 04 课（预训练 Mini-GPT）
**Time:** 约 75 分钟

## 问题（The Problem）

70B 级模型在 H100 上的典型解码吞吐量为每秒 40–80 词元。每个词元都需要完整前向，从高带宽内存（High Bandwidth Memory，HBM）读取全部权重。缩小模型会改变输出，批量大小又不能超过内存限制。除非让模型每次前向输出多个词元，否则难以突破。

自回归生成看似天然串行：`x_{t+1} = sample(p(· | x_{1:t}))`。但存在并发机会：若廉价预测器认为“接下来 4 个词元大概是 [a, b, c, d]”，就可以在**大模型的一次前向中**验证全部 5 个位置，接受最长匹配前缀（Prefix）。

Leviathan、Kalai、Matias（2023，《通过推测解码实现 Transformer 快速推理》）通过巧妙的接受/拒绝规则保持目标模型采样分布，使方法精确成立。输出分布相同，速度提高 2–4 倍。

## 概念（The Concept）

### 双模型配置（The Two-Model Setup）

- **目标模型（Target Model）** `M_p`：你真正希望采样的大型、较慢、高质量模型，分布为 `p(x)`。
- **草稿模型（Draft Model）** `M_q`：小型、快速、质量较低的模型，分布为 `q(x)`，规模小 5–30 倍。

每一步：

1. 草稿模型自回归提议 `K` 个词元：`x_1, x_2, ..., x_K ~ q`。
2. 目标模型一次前向并行处理全部 `K+1` 个位置，为各提议词元产生 `p(x_k)`。
3. 按下述修正拒绝采样（Rejection Sampling）规则，从左向右接受或拒绝各词元，接受最长匹配前缀。
4. 若有词元被拒绝，从修正分布采样替代词元并停止；否则从 `p(· | x_1...x_K)` 额外采样一个奖励词元（Bonus Token）。

草稿完全匹配目标时，每次目标前向得到 K+1 词元；若第一个位置就错，只得到 1 个。

### 精确性规则（The Exactness Rule）

推测解码**在分布上可证明等价于从 p 采样**。拒绝规则如下：

```
对每个草稿词元 x_t：
    r ~ Uniform(0, 1)
    if r < p(x_t) / q(x_t):
        接受 x_t
    else:
        从残差分布采样替代词元：(p - q)+ / ||(p - q)+||_1
        停止
```

其中 `(p - q)+` 表示逐点差值的正部。草稿与目标一致（`p ≈ q`）时，接受概率接近 1；不一致时，残差分布（Residual Distribution）的构造确保整体样本仍精确服从 `p`。

**贪心情况（Greedy Case）。** temperature=0 时，只需检查 `argmax(p) == x_t`。相等则接受，否则输出 `argmax(p)` 并停止。

### 预期加速（Expected Speedup）

若草稿模型的词元级接受率（Acceptance Rate）为 `α`，每次目标前向的预期词元数为：

```
E[tokens] = (1 - α^{K+1}) / (1 - α)        # K = 草稿长度，α in [0, 1]
```

在 `α = 0.8, K = 4` 时，每次前向得到 `(1 - 0.8^5)/(1 - 0.8) = 3.36` 个词元。一轮目标前向总成本约为 `cost_q * K + cost_p`，即 K 步草稿加一次目标验证。若 `cost_p >> cost_q * K`，吞吐量加速比为 `3.36× / 1 = 3.36×`。

真正关键的参数只有 `α`，完全取决于草稿与目标的对齐程度。优质草稿决定效果。

### 训练草稿：蒸馏（Training the Draft: Distillation）

随机小模型不是好草稿。标准方法是从目标模型蒸馏（Distillation）：

1. 选择小架构：70B 目标配约 1B，7B 目标配约 500M。
2. 在大文本语料上运行目标模型，保存其下一词元分布。
3. 使用与目标分布的 Kullback–Leibler 散度（Kullback–Leibler Divergence，KL）训练草稿，而非对照真实词元训练。

结果：编程任务 `α` 通常为 0.6–0.8，自然语言聊天为 0.7–0.85，生产中加速 2–3 倍。

### EAGLE：树状草稿与特征复用（EAGLE: Tree Drafting + Feature Reuse）

Li、Wei、Zhang、Zhang（2024，《EAGLE：推测采样需要重新思考特征不确定性》）发现标准推测解码的两处低效：

1. 草稿执行 K 个串行步骤，每步经过完整网络。但它本可复用最近一次目标验证计算出的特征，即隐藏状态（Hidden States）。目标已经算出丰富表示，草稿却从零重新推导。
2. 草稿输出线性链。若改为候选树（每个节点有多个猜测），目标就能用树注意力掩码（Tree Attention Mask）在一次前向中并行验证多条路径，选出最长接受分支。

EAGLE-1 的变化：
- 草稿输入为目标在位置 t 的最终隐藏状态，而非原始词元。
- 草稿架构为 1 层 Transformer 解码器，而非独立小模型。
- 输出为树，每深度 K = 4–8 个候选，深度 4–6。

EAGLE-2（2024）增加动态树拓扑（Dynamic Tree Topology）：草稿不确定时树更宽，有信心时保持窄，提升 `α_effective` 而不增加验证成本。

EAGLE-3（Li 等人，2025，《EAGLE-3：通过训练时测试扩大大语言模型推理加速》）移除固定顶层特征依赖，用新的“测试时模拟”损失训练草稿。训练输出匹配目标的测试时分布，而非教师强制（Teacher Forcing）的训练分布。接受率从 EAGLE-2 的 0.75 升至 0.82，平均每次验证词元数从 3.0 升至 4.5。

### 树注意力验证（Tree Attention Verification）

草稿输出树时，目标用**树注意力掩码**在一次前向中验证。该因果掩码（Causal Mask）编码树拓扑，而非纯线性关系，每个词元只关注树中的祖先。验证仍是一次前向、一次矩阵乘法，拓扑掩码只多占少量 KV 条目。

```
        根（Root）
       /    \
      a      b
     / \    / \
    c  d   e   f
```

若 `a, b` 是竞争的首词元候选，`c, d, e, f` 是第二词元候选，全部六个位置一次前向即可验证。输出是任意接受路径上的最长前缀。

### 何时获益，何时不获益（When It Wins, When It Doesn't）

**获益：**
- 文本可预测的聊天或补全，例如代码、常见英语、结构化输出，`α` 较高。
- 解码时 GPU 计算能力闲置，即内存受限（Memory-Bound）阶段，树状草稿可利用空闲浮点运算能力（Floating-Point Operations，FLOPs）。

**亏损或无收益：**
- 高随机性输出，例如高温度创意写作，`α` 向 `1/|vocab|` 下降。
- 并发极高的批量服务，批处理已用满 FLOPs，树验证空间很少。
- 目标模型很小，草稿没有小很多。

生产团队通常报告：聊天实际耗时加速 2–3 倍，代码生成 3–5 倍，创意写作接近零收益。

```figure
speculative-decoding
```

## 动手实现（Build It）

`code/main.py`:

- 参考实现 `speculative_decode(target, draft, prompt, K, temperature)`，实现精确拒绝规则，并验证保持目标分布：相对直接目标采样的经验 KL < 0.01。
- EAGLE 式树状草稿生成器，按核采样（Top-p）分支构建深度 K 的树。
- 树注意力掩码构建器，为验证器产生正确因果模式。
- 接受率测试工具，在微型语言模型（Language Model，LM）上运行两种方法：从 GPT-2-medium 目标蒸馏 GPT-2-small。

```python
def speculative_step(p_target, q_draft, K, temperature=1.0):
    """One round of speculative decoding. Returns list of accepted tokens."""
    # 1. Draft K tokens
    draft_tokens = []
    q_probs = []
    state = draft_state_init()
    for _ in range(K):
        probs = softmax(q_draft(state) / temperature)
        t = np.random.choice(len(probs), p=probs)
        draft_tokens.append(t)
        q_probs.append(probs[t])
        state = draft_step(state, t)

    # 2. Target computes p at every drafted position + 1 extra
    p_probs_all = target_forward_batched(p_target, draft_tokens, temperature)

    # 3. Accept/reject left-to-right
    accepted = []
    for k, tok in enumerate(draft_tokens):
        r = np.random.uniform()
        if r < p_probs_all[k][tok] / q_probs[k]:
            accepted.append(tok)
        else:
            residual = np.maximum(p_probs_all[k] - q_probs[k], 0)
            residual /= residual.sum()
            accepted.append(np.random.choice(len(residual), p=residual))
            return accepted
    # 4. All K accepted → sample bonus token from target
    accepted.append(np.random.choice(len(p_probs_all[-1]), p=p_probs_all[-1]))
    return accepted
```

## 使用方法（Use It）

- **vLLM** 和 **SGLang** 原生支持推测解码，参数为 `--speculative_model`、`--num_speculative_tokens`。通过 `--spec_decoding_algorithm eagle` 支持 EAGLE-2/3。
- **NVIDIA TensorRT-LLM** 原生支持 Medusa 和 EAGLE 树。
- **参考草稿模型（Reference Draft Models）**：`Qwen/Qwen3-0.6B-spec`（为 Qwen3-32B 生成草稿）、`meta-llama/Llama-3.2-1B-Instruct-spec`（为 70B 生成草稿）。
- **Medusa 头（Medusa Heads）**（Cai 等人，2024，《Medusa：基于多个解码头的简单 LLM 推理加速框架》）：不使用草稿模型，而是在目标本身增加 K 个并行预测头。部署更简单，接受率略低于 EAGLE。

## 交付成果（Ship It）

本课产出 `outputs/skill-speculative-tuning.md`，该技能分析目标模型负载，选择草稿模型、K（草稿长度）、树宽度、温度，以及何时回退到普通解码。

## 练习（Exercises）

1. 实现精确拒绝规则并实测验证。分别用 `speculative_decode` 和直接目标采样生成 10K 样本，计算两个输出分布的总变差距离（Total Variation Distance，TV），应小于 0.01。

2. 计算加速公式。给定固定 `α` 和 `K`，绘制每次目标前向的预期词元数，求 α ∈ {0.5, 0.7, 0.9} 时的最佳 K。

3. 训练微型草稿。以 124M GPT-2 为目标，在 100M 词元上用 KL 损失蒸馏 30M GPT-2 草稿。在留出文本上测量 `α`，预期为 0.6–0.7。

4. 实现 EAGLE 式树状草稿。草稿不再输出链，而是在每个深度输出前 3 个分支。构建树注意力掩码，验证目标接受最长正确分支。

5. 测量失败模式。在 temperature=1.5 的高随机性下运行推测解码，展示 α 大幅下降，且因草稿开销导致算法比普通解码更慢。

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|------|-----------------|------------------------|
| 目标模型（Target Model） | “大模型” | 希望从中采样的慢速高质量模型，服从 p 分布 |
| 草稿模型（Draft Model） | “推测者” | 小型快速预测器，服从 q 分布，规模小 5–30 倍 |
| K / 草稿长度（Draft Length） | “向前看” | 每轮验证所推测的词元数 |
| α / 接受率（Acceptance Rate） | “命中率” | 每词元草稿提议被接受的概率 |
| 精确拒绝规则（Exact Rejection Rule） | “接受测试” | 保持目标分布的 r < p/q 比较 |
| 残差分布（Residual Distribution） | “修正后的 p-q” | (p - q)+ / ||(p - q)+||_1，拒绝时用于采样的分布 |
| 树状草稿（Tree Drafting） | “分支推测” | 草稿输出候选树，用树结构注意力掩码一次验证 |
| 树注意力掩码（Tree Attention Mask） | “拓扑掩码” | 编码树拓扑的因果掩码，各节点只关注祖先 |
| Medusa 头（Medusa Heads） | “并行头” | 在目标本身增加 K 个预测头，不需要独立草稿模型 |
| EAGLE 特征复用（EAGLE Feature Reuse） | “隐藏状态草稿” | 输入为目标最后隐藏状态而非原始词元，从而缩小草稿 |
| 测试时模拟损失（Test-Time Simulation Loss） | “EAGLE-3 训练” | 用匹配目标测试时分布的输出训练草稿，而非教师强制 |

## 延伸阅读（Further Reading）

- [Leviathan、Kalai、Matias，2023：通过推测解码实现 Transformer 快速推理](https://arxiv.org/abs/2211.17192)：精确拒绝规则及理论加速分析。
- [Chen、Borgeaud、Irving 等人，2023：用推测采样加速大语言模型解码](https://arxiv.org/abs/2302.01318)：DeepMind 同期推测采样论文。
- [Cai、Li、Geng、Wang、Wang、Zhu、Dao，2024：Medusa，基于多个解码头的简单 LLM 推理加速框架](https://arxiv.org/abs/2401.10774)：以并行头替代草稿模型。
- [Li、Wei、Zhang、Zhang，2024：EAGLE，推测采样需要重新思考特征不确定性](https://arxiv.org/abs/2401.15077)：特征复用和树状草稿。
- [Li 等人，2024：EAGLE-2，通过动态草稿树加速语言模型推理](https://arxiv.org/abs/2406.16858)：动态树拓扑。
- [Li 等人，2025：EAGLE-3，通过训练时测试扩大大语言模型推理加速](https://arxiv.org/abs/2503.01840)：训练与测试分布匹配。
- [Fu、Haotian、Peng 等人，2024：用前瞻解码打破 LLM 推理的顺序依赖](https://arxiv.org/abs/2402.02057)：雅可比（Jacobi）/前瞻解码（Lookahead Decoding），无需推测模型的替代方案。
