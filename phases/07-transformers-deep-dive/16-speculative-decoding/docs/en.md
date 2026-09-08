# 推测解码：起草、验证、重复（Speculative Decoding — Draft, Verify, Repeat）

> 自回归解码是串行的，每个词元等待前一个。推测解码打破这条依赖链：低成本模型起草 N 个词元，高成本模型一次前向验证全部 N 个。草稿正确时，一次大模型前向就完成 N 次生成。

**Type:** Build
**Languages:** Python
**Prerequisites:** 阶段 7 · 07（GPT 因果语言模型），阶段 7 · 12（KV 缓存与 Flash Attention）
**Time:** ~60 分钟

## 问题（The Problem）

70B 大语言模型在 H100 上采样一个词元约 30 ms，3B 草稿模型约 3 ms。如果让 3B 提前起草 5 个词元，再用 70B *一次*验证全部 5 个，总计 `5×3 + 30 = 45 ms`，最多接受 5 个词元；直接生成则需 `5×30 = 150 ms`。推测解码的全部价值就是用少量额外 GPU 内存放草稿模型，换取低 2–4 倍的解码延迟。

这个技巧必须保持分布。Leviathan 等（2023）与同期 Chen 等提出的推测采样，保证输出序列与大模型独立生成的序列**分布完全相同**。不牺牲质量，只加速。

四类草稿—验证组合主导 2026 年推理：

1. **标准推测解码（Vanilla speculative，Leviathan，2023）。** 独立草稿模型，如 Llama 3 1B，加验证模型，如 Llama 3 70B。
2. **Medusa（Cai，2024）。** 验证模型上的多个解码头并行预测位置 `t+1..t+k`，无需独立草稿模型。
3. **EAGLE 家族（Li，2024、2025）。** 轻量草稿复用验证模型隐藏状态，比标准方案有更高接受率，通常快 3–4 倍。
4. **前瞻解码（Lookahead decoding，Fu，2024）。** Jacobi 迭代，完全不需要草稿模型。自我推测，较小众但无需依赖。

2026 年所有生产推理技术栈默认提供推测解码。vLLM、TensorRT-LLM、SGLang、llama.cpp 至少都支持标准方案和 EAGLE-2。

## 概念（The Concept）

### 核心算法（The core algorithm）

给定验证模型 `M_q` 与更便宜的草稿模型 `M_p`：

1. 设 `x_1..x_k` 为已解码前缀。
2. **起草**：用 `M_p` 自回归提出 `d_{k+1}, d_{k+2}, ..., d_{k+N}`，草稿概率为 `p_1..p_N`。
3. **并行验证**：在 `x_1..x_k, d_{k+1}, ..., d_{k+N}` 上运行一次 `M_q`，得到位置 `k+1..k+N+1` 的验证概率 `q_1..q_{N+1}`。
4. **从左至右接受或拒绝草稿词元**：对每个 `i`，以概率 `min(1, q_i(d_i) / p_i(d_i))` 接受。
5. 在位置 `j` 首次拒绝时，从归一化“残差”分布 `(q_j - p_j)_+` 采样 `t_j`。丢弃 `j` 之后所有草稿。
6. 若全部 `N` 个都接受，从 `q_{N+1}` 额外采样一个 `t_{N+1}`，即免费奖励词元。

残差分布技巧是关键数学洞见，使输出分布精确等同于 `M_q` 从零采样。

### 什么决定加速比（What determines speedup）

设 `α` 为每草稿词元预期接受率，`c` 为草稿与验证成本比。每步：

- 朴素生成每词元调用一次大模型。
- `α` 较高时，推测解码每 `(1 - α^{N+1}) / (1 - α) ≈ 1/(1-α)` 个词元调用一次大模型。

典型经验：`α = 0.75`、`N = 5` 时，大模型调用减少 3 倍。草稿成本是 5 次低成本调用，总实际耗时约减少 2.5 倍。

**α 取决于：**

- 草稿逼近验证模型的程度。同家族、同训练数据可显著提高 α。
- 解码策略。贪心草稿对贪心验证模型时 α 高；温度采样更难匹配，接受率下降。
- 任务类型。代码和结构化输出更可预测，接受率更高；自由创作接受率更低。

### Medusa：没有草稿模型的草稿（Medusa — drafts without a draft model）

Medusa 用验证模型上的额外输出头替代草稿模型。在位置 `t`：

```
共享主干 → 隐藏状态 h_t
    ├── head_0：预测 t+1 的词元（标准语言模型头）
    ├── head_1：预测 t+2 的词元
    ├── head_2：预测 t+3 的词元
    ├── head_3：预测 t+4 的词元
```

每个头输出自己的逻辑值。推理时从各头采样形成候选序列，再用树注意力方案一次前向验证，同时考虑全部候选续写。

优点是没有第二个模型。缺点是增加可训练参数，需要约 1B 词元的监督微调阶段，接受率略低于具有优质草稿模型的标准推测解码。

### EAGLE：复用隐藏状态得到更好草稿（EAGLE — better draft by reusing hidden states）

EAGLE-1/2/3（Li 等，2024–2025）使用微型 Transformer 草稿模型，通常 1 层，接收验证模型最后一层隐藏状态。草稿看到验证模型的特征表示，预测与验证输出分布高度相关，接受率从标准方案约 0.6 提高到 0.85+。

EAGLE-3（2025）增加候选续写树搜索。vLLM 和 SGLang 将 EAGLE-2/3 作为 Llama 3/4 与 Qwen 3 的默认推测路径。

### KV 缓存的协调（The KV cache dance）

验证把 `N` 个草稿词元一次前向送入验证模型，其 KV 缓存增长 `N` 项。若拒绝部分草稿，必须回滚缓存到已接受前缀长度。

生产实现（vLLM 的 `--speculative-model`、TensorRT-LLM 的 LookaheadDecoder）用临时 KV 缓冲区处理：先写入，接受后提交。概念不难，但细节繁琐。

```figure
draft-verify-tokens
```

## 动手实现（Build It）

参见 `code/main.py`。实现核心推测采样算法，即拒绝步骤与残差分布，包含：

- “大模型”：对手写分布执行确定性 softmax，便于解析验证接受概率数学。
- “草稿模型”：对大模型分布进行扰动。
- 接受/拒绝循环，产生与直接采样相同的边缘分布。

### 第 1 步：拒绝步骤（Step 1: the rejection step）

```python
def accept_or_reject(q_prob, p_prob, draft_token, u):
    ratio = q_prob / p_prob if p_prob > 0 else float("inf")
    return u < min(1.0, ratio)
```

`u` 是均匀随机数，`q_prob` 是验证模型赋予草稿词元的概率，`p_prob` 是草稿模型的概率。Leviathan 定理说明，这个伯努利决策加上拒绝后的残差采样，精确保留验证模型分布。

### 第 2 步：残差分布（Step 2: residual distribution）

```python
def residual_dist(q, p):
    raw = [max(0.0, qi - pi) for qi, pi in zip(q, p)]
    s = sum(raw)
    return [r / s for r in raw]
```

逐元素从 `q` 减去 `p`，负值截为零，再归一化。发生拒绝时从此分布采样。

### 第 3 步：一次推测步骤（Step 3: one speculative step）

```python
def spec_step(prefix, q_model, p_model, N, rng):
    drafts = []
    p_probs = []
    ctx = list(prefix)
    for _ in range(N):
        p_dist = p_model(ctx)
        d = sample(p_dist, rng)
        drafts.append(d)
        p_probs.append(p_dist[d])
        ctx.append(d)

    q_dists = [q_model(prefix + drafts[:i]) for i in range(N + 1)]

    for i, d in enumerate(drafts):
        u = rng.random()
        q_prob = q_dists[i][d]
        p_prob = p_probs[i]
        if u < min(1.0, q_prob / p_prob if p_prob > 0 else float("inf")):
            prefix = prefix + [d]
        else:
            res = residual_dist(q_dists[i], p_model(prefix))
            prefix = prefix + [sample(res, rng)]
            return prefix
    prefix = prefix + [sample(q_dists[N], rng)]
    return prefix
```

接受五个，加一个奖励词元，一次验证前向产生六个词元。

### 第 4 步：测量接受率（Step 4: measure acceptance rate）

在不同草稿质量下运行 10,000 次推测步骤，绘制接受率与草稿/验证分布之间相对熵（Kullback–Leibler Divergence，KL 散度）的关系，应看到明确单调关系。

### 第 5 步：验证分布等价性（Step 5: verify distribution equivalence）

实测推测循环生成词元的直方图，应与直接从验证模型采样的直方图一致。这是 Leviathan 定理的实践体现，卡方检验可确认差异在采样误差内。

## 实际应用（Use It）

生产部署：

```bash
# vLLM with EAGLE
vllm serve meta-llama/Llama-3.1-70B-Instruct \
    --speculative-model /models/llama-3.1-eagle-70b \
    --speculative-draft-tensor-parallel-size 1 \
    --num-speculative-tokens 5

# vLLM with vanilla draft model
vllm serve meta-llama/Llama-3.1-70B-Instruct \
    --speculative-model meta-llama/Llama-3.2-1B-Instruct \
    --num-speculative-tokens 5
```

截至 2026 年中，TensorRT-LLM 提供最快的 Medusa 路径。`faster-whisper` 为 Whisper-large 封装了小草稿模型的推测解码。

**选择草稿方案：**

| 策略 | 何时选择 | 加速比 |
|----------|--------------|---------|
| 标准草稿（1B/3B Llama 家族） | 快速原型，无需训练 | 1.8–2.3× |
| Medusa 头 | 可以微调验证模型 | 2–3× |
| EAGLE-2 / 3 | 生产环境，追求最高速度 | 3–4× |
| 前瞻解码 | 无草稿、无训练、无额外参数 | 1.3–1.6× |

**何时不使用推测解码：**

- 单序列只生成 1–5 个词元，额外开销占主导。
- 高创造性或高温度采样，α 会下降。
- 内存受限部署，草稿模型会增加显存。

## 交付成果（Ship It）

参见 `outputs/skill-spec-decode-picker.md`。该技能为新推理负载选择推测解码策略（标准、Medusa、EAGLE、前瞻）与调节参数（N、草稿温度）。

## 练习（Exercises）

1. **简单。** 运行 `code/main.py`，在 50,000 词元上确认推测分布与验证模型直接采样分布一致，卡方检验 p > 0.05。
2. **中等。** 在 `α = 0.5, 0.7, 0.85` 下绘制加速比（每大模型前向产生的词元数）关于 `N` 的函数，找出各 α 最优 `N`。（提示：每验证调用的预期词元数 = `(1 - α^{N+1}) / (1 - α)`。）
3. **困难。** 实现微型 Medusa：取第 14 课综合实践 GPT，添加 3 个额外语言模型头，预测 t+2、t+3、t+4。在 tinyshakespeare 上用联合多头损失训练，与截断同一模型得到的标准草稿比较接受率。
4. **困难。** 实现回滚：从 10 词元前缀 KV 缓存开始，输入 5 个草稿，模拟在位置 3 拒绝。验证下次迭代读取缓存正确对应“前缀加前 2 个已接受草稿”。

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|------|-----------------|-----------------------|
| 草稿模型（Draft model） | “便宜的那个” | 提出候选词元的较小模型，通常比验证模型便宜 10–50 倍。 |
| 验证模型（Verifier） | “大的那个” | 我们要保持其分布的目标模型，每推测步骤运行一次。 |
| 接受率（Acceptance rate，α） | “草稿多常正确” | 验证模型接受草稿的逐词元概率，通常 0.7–0.9。 |
| 残差分布（Residual distribution） | “拒绝后的备用分布” | 归一化的 `(q - p)_+`，拒绝时从中采样可保留验证模型分布。 |
| 奖励词元（Bonus token） | “免费的那个” | 全部 N 个草稿被接受时，再从验证模型下一步分布采样一个。 |
| Medusa | “无独立草稿的推测” | 验证模型上的多个语言模型头并行预测 t+1..t+k。 |
| EAGLE | “隐藏状态草稿” | 以验证模型最后一层隐藏状态为条件的微型 Transformer 草稿。 |
| 前瞻解码（Lookahead decoding） | “Jacobi 迭代” | 通过不动点迭代自我推测，无需草稿模型。 |
| 树注意力（Tree attention） | “同时验证多个候选” | 同时考虑多条草稿续写的分支验证。 |
| KV 回滚（KV rollback） | “撤销拒绝的草稿” | 临时 KV 缓冲区，接受时提交，拒绝时丢弃。 |

## 延伸阅读（Further Reading）

- [Leviathan、Kalman、Matias（2023）：通过推测解码实现 Transformer 快速推理（Fast Inference from Transformers via Speculative Decoding）](https://arxiv.org/abs/2211.17192)：核心算法与等价定理。
- [Chen 等（2023）：用推测采样加速大语言模型解码（Accelerating Large Language Model Decoding with Speculative Sampling）](https://arxiv.org/abs/2302.01318)：同期提出，伯努利拒绝证明清晰。
- [Cai 等（2024）：Medusa：具有多个解码头的简易大语言模型推理加速框架（Medusa: Simple LLM Inference Acceleration Framework with Multiple Decoding Heads）](https://arxiv.org/abs/2401.10774)：Medusa 论文与树注意力验证。
- [Li 等（2024）：EAGLE：推测采样需要重新思考特征不确定性（EAGLE: Speculative Sampling Requires Rethinking Feature Uncertainty）](https://arxiv.org/abs/2401.15077)：EAGLE-1，隐藏状态条件草稿。
- [Li 等（2024）：EAGLE-2：用动态草稿树加速语言模型推理（EAGLE-2: Faster Inference of Language Models with Dynamic Draft Trees）](https://arxiv.org/abs/2406.16858)：EAGLE-2，动态树深度。
- [Li 等（2025）：EAGLE-3：通过训练时测试扩大大语言模型推理加速（EAGLE-3: Scaling up Inference Acceleration of Large Language Models via Training-Time Test）](https://arxiv.org/abs/2503.01840)：EAGLE-3。
- [Fu 等（2024）：用前瞻解码打破大语言模型推理的串行依赖（Break the Sequential Dependency of LLM Inference Using Lookahead Decoding）](https://arxiv.org/abs/2402.02057)：无草稿的前瞻方案。
- [vLLM 文档：推测解码（Speculative Decoding）](https://docs.vllm.ai/en/latest/features/spec_decode.html)：接入全部四种策略的典型生产参考。
- [SafeAILab / EAGLE 参考实现](https://github.com/SafeAILab/EAGLE)：EAGLE-1/2/3 参考代码。
