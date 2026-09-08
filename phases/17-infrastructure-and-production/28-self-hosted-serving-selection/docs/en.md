# 自托管服务选型：让引擎匹配硬件与规模（Self-Hosted Serving Selection — Matching Engine to Hardware and Scale）

> 引擎选型取决于硬件、规模和生态，而不是看排行榜。2026 年，llama.cpp、Ollama、vLLM、SGLang 四种引擎主导自托管推理，TGI 则进入维护模式而落后。**llama.cpp** 在 CPU 上最快，模型支持最广，可完全控制量化和线程。**Ollama** 适合开发笔记本，一条命令即可安装；由于 Go + CGo + HTTP 序列化，比 llama.cpp 慢约 15–30%，在类似生产的负载下吞吐量相差 3 倍。**TGI 于 2025 年 12 月 11 日进入维护模式**，此后只修复缺陷；原始吞吐量比 vLLM 慢约 10%，但历史上可观测性和 HF 生态集成领先。维护状态使其成为风险较高的长期选择，新项目默认选 SGLang 或 vLLM 更稳妥。**vLLM** 是通用生产默认选择，v0.15.1（2026 年 2 月）增加 PyTorch 2.10、RTX Blackwell SM120 和 H200 优化。**SGLang** 专长是多轮智能体与大量前缀复用，生产使用超过 400,000 块 GPU，用户包括 xAI、LinkedIn、Cursor、Oracle、GCP、Azure、AWS。硬件约束：CPU 优先 → llama.cpp；AMD 或非 NVIDIA → vLLM 是支持最完善的路径，TRT-LLM 仅限 NVIDIA。2026 年流水线模式为开发用 Ollama，预发布用 llama.cpp，生产用 vLLM 或 SGLang。引擎接受不同权重格式：llama.cpp 家族用 GGUF，GPU 引擎用 HF safetensors，因此阶段之间可能需要格式转换。

**Type:** Learn
**Languages:** Python（标准库，引擎决策树遍历器）
**Prerequisites:** 阶段 17 中所有涉及引擎的课程（04、06、07、09、18）
**Time:** ~45 分钟

## 学习目标（Learning Objectives）

- 根据硬件（CPU、AMD、NVIDIA Hopper、Blackwell）、规模（1、100、10,000 用户）和工作负载（通用聊天、智能体、长上下文）选择引擎。
- 指出 2026 年 TGI 的维护模式状态，始于 2025 年 12 月 11 日，并解释为什么新项目应倾向 vLLM 或 SGLang。
- 描述开发、预发布、生产流水线，包括阶段之间 GGUF 到 safetensors 格式转换的位置。
- 解释为什么“CPU 优先”指向 llama.cpp，而“AMD”排除 TRT-LLM。

## 问题（The Problem）

团队启动新的自托管 LLM 项目。一位工程师推荐 Ollama，另一位推荐 vLLM，第三位问“TGI 不是开箱即用吗？”。三者在不同场景下都对，但没有一个适合全部情况。

2026 年应按决策树选择：先硬件，再规模，最后工作负载。2025 年的一件具体事件，即 TGI 于 12 月 11 日进入维护模式，改变了新项目的默认选项。

## 概念（The Concept）

### 五种引擎（The five engines）

| 引擎 | 最适合 | 说明 |
|--------|----------|-------|
| **llama.cpp** | CPU、边缘、最少依赖、最广模型支持 | CPU 上最快，完全控制 |
| **Ollama** | 开发笔记本、单用户、一条命令安装 | 比 llama.cpp 慢 15–30%，生产吞吐量相差 3 倍 |
| **TGI** | HF 生态、受监管行业 | **2025 年 12 月 11 日进入维护模式** |
| **vLLM** | 通用生产、100 以上用户 | 广泛适用的生产默认项；v0.15.1 于 2026 年 2 月发布 |
| **SGLang** | 多轮智能体、大量前缀复用 | 生产使用超过 400,000 块 GPU |

### 先按硬件决策（Hardware-first decision）

**CPU 优先** → llama.cpp。Ollama 也能用，但更慢。其他引擎在 CPU 上都没有竞争力。

**AMD GPU** → vLLM 是支持最完善的路径，支持 AMD ROCm。SGLang 也可用。TRT-LLM 限定 NVIDIA，因此排除。

**NVIDIA Hopper（H100 / H200）** → vLLM、SGLang 或 TRT-LLM。三者都处于第一梯队。

**NVIDIA Blackwell（B200 / GB200）** → TRT-LLM 吞吐量领先（阶段 17 · 07），vLLM 和 SGLang 紧随其后。

**Apple Silicon（M 系列）** → llama.cpp（Metal）。Ollama 对其进行了封装。

### 再按规模决策（Scale-second decision）

**1 名用户或本地开发** → Ollama。一条命令，几秒内生成首词元。

**10–100 名用户或小团队** → 单 GPU vLLM。

**100–10k 名用户或生产环境** → vLLM production-stack（阶段 17 · 18）或 SGLang。

**10k 以上用户或企业环境** → vLLM production-stack + 分离式服务（阶段 17 · 17）+ LMCache（阶段 17 · 18）。

### 最后按工作负载决策（Workload-third decision）

**通用聊天或问答** → vLLM 作为广泛适用的默认项胜出。

**多轮智能体，包括工具、规划、记忆** → SGLang 的 RadixAttention（阶段 17 · 06）占优。

**大量前缀复用的 RAG** → SGLang。

**代码生成** → vLLM 足够好，SGLang 在缓存方面略优。

**长上下文（128K+）** → vLLM 加分块预填充，或 SGLang 加分层 KV。

### TGI 维护模式陷阱（The TGI maintenance trap）

Hugging Face TGI 于 2025 年 12 月 11 日进入维护模式，之后只修复缺陷。历史上，它拥有一流可观测性、领先的 HF 生态集成（模型卡、安全工具），原始吞吐量略落后于 vLLM。

2026 年的新项目不应默认选择 TGI。现有 TGI 部署可以继续运行，但最终应迁移。SGLang 和 vLLM 是更稳妥的默认选择。

### 流水线模式（The pipeline pattern）

开发（Ollama）→ 预发布（llama.cpp）→ 生产（vLLM）。各引擎接受不同权重格式：llama.cpp 家族用 GGUF，GPU 引擎用 HF safetensors，因此阶段之间可能需要格式转换。工程师在笔记本上快速迭代，预发布环境对齐生产量化配置，生产环境是最终服务目标。

### Ollama 的注意事项（Ollama caveat）

Ollama 很适合开发，却不适合共享生产：Go HTTP 序列化增加开销，并发管理比 vLLM 简单，OpenTelemetry 支持也落后。应在它擅长的单用户、一条命令场景使用它，共享服务则切换到 vLLM。

### 自托管与托管是另一项决策（Self-hosted vs managed is a separate decision）

阶段 17 · 01（托管超大规模云）和 · 02（推理平台）介绍托管。本课假设你已经决定自托管。理由包括数据驻留、自定义微调、规模化后的总拥有成本，以及托管服务没有所需领域模型。

### 应记住的数字（Numbers you should remember）

- TGI 维护模式：2025 年 12 月 11 日。
- vLLM v0.15.1：2026 年 2 月，PyTorch 2.10，支持 Blackwell SM120。
- SGLang 生产规模：超过 400,000 块 GPU。
- Ollama 与 llama.cpp 的吞吐量差距：慢 15–30%，生产负载下相差 3 倍。

```figure
data-parallel
```

## 动手使用（Use It）

`code/main.py` 是决策树遍历器：给定硬件、规模和工作负载，选择引擎并解释原因。

## 交付成果（Ship It）

本课产出 `outputs/skill-engine-picker.md`。它根据约束选择引擎，并编写迁移计划。

## 练习（Exercises）

1. 用你的硬件、规模、工作负载运行 `code/main.py`。输出符合直觉吗？
2. 基础设施有 12 块 H100 和 8 块 AMD MI300X，应选什么引擎？为什么不能选择 TRT-LLM？
3. 团队因为“我们熟悉它”而想在 2026 年使用 TGI。论证迁移的理由。
4. 从 Ollama 开发迁移到 vLLM 生产时，量化、配置和可观测性有什么变化？
5. RAG 产品的 P99 前缀长度为 8K，跨租户复用率高。选择引擎，并与阶段 17 · 11 和 18 组合。

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|------|----------------|------------------------|
| llama.cpp | “CPU 上的那个” | 模型支持最广，CPU 上最快 |
| Ollama | “笔记本上的那个” | 一条命令安装，开发级吞吐量 |
| TGI | “HF 的服务引擎” | 自 2025 年 12 月起进入维护模式 |
| vLLM | “默认项” | 2026 年广泛适用的生产基准 |
| SGLang | “智能体专用的那个” | 大量前缀复用、RadixAttention |
| TRT-LLM | “限定 NVIDIA” | Blackwell 吞吐量领先，仅支持 NVIDIA |
| GGUF | “llama.cpp 格式” | 打包的 K-quant 变体 |
| Production-stack | “vLLM K8s” | 阶段 17 · 18 的参考部署 |
| 流水线模式（Pipeline pattern） | “开发→预发布→生产” | Ollama → llama.cpp → vLLM，各引擎权重格式不同 |

## 延伸阅读（Further Reading）

- [AI Made Tools：2026 年 vLLM、Ollama、llama.cpp、TGI 对比](https://www.aimadetools.com/blog/vllm-vs-ollama-vs-llamacpp-vs-tgi/)
- [Morph：2026 年 llama.cpp 与 Ollama 对比](https://www.morphllm.com/comparisons/llama-cpp-vs-ollama)
- [n1n.ai：LLM 推理引擎全面对比](https://explore.n1n.ai/blog/llm-inference-engine-comparison-vllm-tgi-tensorrt-sglang-2026-03-13)
- [PremAI：2026 年十大 vLLM 替代方案](https://blog.premai.io/10-best-vllm-alternatives-for-llm-inference-in-production-2026/)
- [TGI 维护公告](https://github.com/huggingface/text-generation-inference)：发布说明。
- [vLLM v0.15.1 发布说明](https://github.com/vllm-project/vllm/releases)
