# 服务引擎内部机制（Serving Engine Internals）：PagedAttention、连续批处理与分块预填充

> 现代服务引擎的吞吐量依靠三项相互增强的默认机制，而非单一技巧。PagedAttention 始终开启。连续批处理（Continuous batching）在解码迭代之间将新请求加入活跃批次。分块预填充（Chunked prefill）切分长提示词，防止解码词元长期得不到执行。三者同时开启后，一块 H100 SXM5 上的 Llama 3.3 70B FP8 在 128 并发下达到 2,200-2,400 tok/s，比 vLLM 自身默认配置高约 25%，是朴素 PyTorch 循环的 3-4 倍。本课阅读这三项技术的参考引擎 vLLM 的调度器和注意力内核，让你理解到能够画图说明的程度，最后在 `code/main.py` 中实现简化连续批处理器，以 vLLM 的方式调度预填充和解码。

**Type:** Learn
**Languages:** Python (标准库，简化连续批处理调度器)
**Prerequisites:** 阶段 17 · 01（模型服务，Model Serving）、阶段 11（LLM 工程，LLM Engineering）
**Time:** ~75 分钟

## 学习目标（Learning Objectives）

- 将 PagedAttention 解释为 KV 缓存分配器，说明块、块表，以及为何生产负载下碎片率低于 4%。
- 按迭代绘制连续批处理过程：完成的序列如何离开，新序列如何加入，而无需清空批次。
- 用一句话描述分块预填充，并指出它保护的延迟指标（提示：是 TTFT 尾延迟，而非平均吞吐量）。
- 说出 2026 年 vLLM v0.18.0 中同时启用所有优化会遇到的陷阱。

## 问题背景（The Problem）

朴素 PyTorch 服务循环每次运行一个请求：分词、预填充、解码直到 EOS，然后返回。一个用户时可行，一百个用户时就变成了耐心等待的队列。直观修复是静态批处理（Static batching），但它将每个请求填充到窗口内最长提示词，将每次解码填充到最长预期输出，整个批次被最慢序列拖住。你为永远用不到的填充付费，快请求等待慢请求。

vLLM 同时解决三个问题。经典连续内存分配会让 KV 缓存碎片占用 60-80% 的 GPU 显存，PagedAttention 避免了这种浪费。连续批处理让请求在每次解码迭代之间加入和离开批次，使批次始终承担实际工作。分块预填充将 32k 词元提示词切成约 512 词元的片段，与解码交错执行，避免长提示词冻结 GPU 上所有解码词元。

2026 年的生产默认做法是三者全开。你需要理解各自作用，因为故障模式都出在调度器，而非模型。

## 核心概念（The Concept）

### 将 PagedAttention 理解为虚拟内存系统（PagedAttention as a virtual memory system）

每个序列的 KV 缓存大小为 `num_layers × 2 × num_heads × head_dim × seq_len × bytes_per_element`。对于 8192 词元的 Llama 3.3 70B，BF16 下每序列约为 1.25 GB。如果每个请求预留 8192 个位置，但平均只使用 1500 词元，就浪费了约 82% 的预留高带宽显存（HBM）。经典批处理承担这项浪费。

PagedAttention 借鉴操作系统虚拟内存：每个序列的 KV 缓存不必连续，而是按固定大小的块分配，默认每块 16 词元。每个序列有块表（Block table），将逻辑词元位置映射到物理块 ID。序列超过已分配块时再加一块，完成时将块归还池中。

碎片率从经典方案的 60-80% 降到 PagedAttention 的 4% 以下。无需通过开关启用 PagedAttention，它是 vLLM 唯一提供的分配器。可调参数是 `--gpu-memory-utilization`，默认 0.9，告诉 vLLM 在加载权重和激活后，为 KV 块预留多少 HBM。

### 迭代级连续批处理（Continuous batching at the iteration level）

旧式“动态批处理”等待一个窗口（例如 10 ms）凑齐批次，然后执行预填充和多轮解码，直到所有序列完成。快序列提前完成后，其位置闲置，等待 GPU 处理完慢序列。

连续批处理在每个解码步骤之间运行。将运行中的序列集合称为 `RUNNING` 列表。每轮迭代：

1. 从 `RUNNING` 移除刚达到 EOS 或 max_tokens 的序列。
2. 调度器检查等待队列；如果有空闲 KV 块，就接纳新序列，包括预填充或恢复执行的序列。
3. 对当前 `RUNNING` 中的序列执行前向计算，每序列输出一个新词元。

批次大小从不填充到固定数量。输出进度不同的序列共享一次融合前向计算。2026 年 vLLM 将其称为 `V1 scheduler`。关键不变条件是：调度器每次解码迭代运行一次，而不是每请求运行一次。

### 分块预填充保护 TTFT 尾延迟（Chunked prefill protects TTFT tail）

预填充受计算限制。一块 H100 上，Llama 3.3 70B 处理 32k 词元提示词，仅预填充就耗时约 800 ms。预填充运行时，批次中其他序列的解码词元都在等待。在服务循环中，一个长提示词的首词元延迟（TTFT），会变成其他数十位用户的词元间延迟（Inter-token latency，ITL）尖峰。

分块预填充将预填充切为固定大小的块，默认 512 词元，逐块调度。块间调度器可以让解码序列前进一个词元。代价是预填充绝对延迟小幅增加，每块数 ms，收益是解码抖动大幅降低。公开基准中，混合负载的 P99 ITL 从约 50 ms 降至约 15 ms。

### 三种默认机制的交互（The three defaults interact）

三项功能相互依赖。PagedAttention 为调度器提供细粒度 KV 资源，用于权衡分配。连续批处理需要这种资源粒度，才能在接纳新序列时避免全局重排。分块预填充是调度器对同一 `RUNNING` 列表做出的决策，是另一项调度策略，而非独立系统。

你无需记住每个参数，但需要理解调度器优化的目标：在 KV 块预算内，并受分块预填充切分约束，优化有效吞吐量（Goodput）。

### 2026 年 v0.18.0 的陷阱（The 2026 v0.18.0 gotcha）

vLLM v0.18.0 不能同时使用 `--enable-chunked-prefill` 和草稿模型推测解码（`--speculative-model`）。文档列出的例外是 V1 调度器中的 N-gram GPU 推测解码（Speculative decoding）。不读发行说明就开启所有参数，会在启动时遇到运行时错误，而不是轻微性能退化。如果你因推测解码的收益而打算启用分块预填充，需要重新考虑：2026 年正确选择往往是不启用分块预填充的 EAGLE-3，而非无法编译的草稿模型加分块预填充组合。

### 应记住的数值（Numbers you should remember）

- Llama 3.3 70B FP8、H100 SXM5、128 并发，三项全开：2,200-2,400 tok/s。
- 同一模型，默认 vLLM（无分块预填充）：约 1,800 tok/s。
- 同一模型，朴素 PyTorch 前向循环：约 600 tok/s。
- 生产负载下 PagedAttention 的 KV 碎片浪费：<4%。
- 混合负载 P99 ITL：启用分块预填充约 15 ms，未启用约 50 ms。

### 调度器的样子（What the scheduler looks like）

```
while True:
    finished = [s for s in RUNNING if s.is_done()]
    for s in finished: release_blocks(s); RUNNING.remove(s)

    while WAITING and have_free_blocks_for(WAITING[0]):
        s = WAITING.pop(0)
        allocate_initial_blocks(s)
        RUNNING.append(s)

    # schedule prefill chunks + decode in one batch
    batch = []
    for s in RUNNING:
        if s.in_prefill:
            batch.append(next_prefill_chunk(s))   # e.g. 512 tokens
        else:
            batch.append(decode_one_token(s))     # 1 token

    run_forward(batch)                            # one fused GPU call
```

`code/main.py` 正是用 Python 标准库实现的这个循环，使用模拟词元数和前向计算延迟。运行后可以看到分块预填充如何让解码序列在长预填充期间继续推进。

```figure
tensor-parallel
```

## 实际应用（Use It）

`code/main.py` 模拟支持功能开关的 vLLM 式调度器。运行它，观察：

- `NAIVE` 模式：一次一个请求，无批处理。
- `STATIC` 模式：填充并等待，即经典批处理。
- `CONTINUOUS` 模式：每次迭代执行接纳和释放。
- `CONTINUOUS + CHUNKED` 模式：预填充片段与解码交错执行。

输出展示总吞吐量（每虚拟秒词元数）、平均 TTFT 和 P99 ITL。混合流量下，`CONTINUOUS + CHUNKED` 这一行应占优。

## 交付成果（Ship It）

本课产出 `outputs/skill-vllm-scheduler-reader.md`。输入服务配置，包括批次大小、KV 显存利用率、预填充分块大小和推测解码配置，即可获得调度器诊断，指出三种默认机制中哪项构成瓶颈，以及应调整什么。

## 练习（Exercises）

1. 运行 `code/main.py`。在长短请求混合的工作负载上比较 `STATIC` 与 `CONTINUOUS`。吞吐量差距来自预填充效率、解码效率，还是尾延迟？
2. 修改简化调度器，增加 `--max-num-batched-tokens`。H100 上运行 Llama 3.3 70B FP8 时，正确值是多少？提示：它取决于 KV 块大小和空闲块数，而非原始 HBM 容量。
3. 重读 vLLM v0.18.0 发行说明，列出互斥参数组合。
4. 对 1,000 个请求的轨迹计算 KV 缓存碎片浪费：平均输出 1,500 词元，标准差 600 词元。比较（a）每请求按最大 8192 连续分配，（b）PagedAttention 每块 16 词元。
5. 用一段话解释为何分块预填充改善 P99 ITL，但单独使用并不提高吞吐量。实际吞吐量收益从何而来？

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|------|----------------|------------------------|
| PagedAttention | “KV 技巧” | KV 缓存固定大小块分配器，碎片率 <4% |
| 块表（Block table） | “页表” | 每序列从逻辑词元位置到物理 KV 块的映射 |
| 连续批处理（Continuous batching） | “正确的动态批处理” | 每次解码迭代都做出接纳与释放决策 |
| 分块预填充（Chunked prefill） | “拆分预填充” | 将长预填充分成 512 词元片段，与解码交错执行 |
| 首词元延迟（TTFT） | “首个词元时间” | 预填充、排队与网络耗时之和，长提示词下由预填充主导 |
| 词元间延迟（ITL） | “词元之间的延迟” | 相邻解码词元的时间间隔，主要受批次大小影响 |
| 有效吞吐量（Goodput） | “满足 SLO 的吞吐量” | 每个请求均达到 TTFT 和 ITL 目标时的词元/秒 |
| V1 调度器（V1 scheduler） | “新调度器” | vLLM 的 2026 年调度器，N-gram 推测解码是兼容分块预填充的路径 |
| `--gpu-memory-utilization` | “显存旋钮” | 加载权重和激活后，为 KV 块预留的 HBM 比例 |

## 延伸阅读（Further Reading）

- [vLLM 文档：推测解码](https://docs.vllm.ai/en/latest/features/spec_decode/)：分块预填充与推测解码兼容性的官方资料。
- [vLLM 发行说明（NVIDIA）](https://docs.nvidia.com/deeplearning/frameworks/vllm-release-notes/index.html)：2026 年发布节奏和版本特定行为。
- [vLLM 博客：PagedAttention](https://blog.vllm.ai/2023/06/20/vllm.html)：最初介绍文章，至今仍定义了理解该分配器的方法。
- [PagedAttention 论文（arXiv:2309.06180）](https://arxiv.org/abs/2309.06180)：碎片分析和调度器设计。
- [Aleksa Gordic：深入 vLLM](https://www.aleksagordic.com/blog/vllm)：附火焰图的 V1 调度器详解。
