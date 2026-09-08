# 综合实践 08：受监管垂直领域的生产级检索增强生成聊天机器人（Production RAG Chatbot for a Regulated Vertical）

> 2026 年，Harvey、Glean、Mendable 和 LlamaCloud 都采用相同的生产形态。用 docling 或 Unstructured 摄取内容，用 ColPali 处理视觉信息；执行混合搜索（Hybrid Search），用 bge-reranker-v2-gemma 重排序（Re-Ranking）；由 Claude Sonnet 4.7 综合生成（Synthesis），提示词缓存（Prompt Caching）命中率达到 60–80%；用 Llama Guard 4 和 NeMo Guardrails 防护，用 Langfuse 和 Phoenix 观测，用 RAGAS 在 200 题黄金集（Golden Set）上评分。在法律、临床或保险等受监管领域构建一个系统，本综合实践的验收是通过黄金集、红队测试（Red Team）以及漂移仪表盘（Drift Dashboard）检查。

**Type:** Capstone
**Languages:** Python（流水线 + API）, TypeScript（聊天界面）
**Prerequisites:** 阶段 5（自然语言处理，NLP）、阶段 7（Transformer）、阶段 11（大语言模型工程）、阶段 12（多模态）、阶段 17（基础设施）、阶段 18（安全）
**涉及阶段（Phases exercised）:** P5 · P7 · P11 · P12 · P17 · P18
**Time:** 30 小时

## 问题（Problem）

受监管领域的检索增强生成（Retrieval-Augmented Generation，RAG），如法律合同、临床试验方案和保险条款，是 2026 年交付最多的生产形态，因为投资回报（Return on Investment，ROI）明确，风险后果具体。Harvey（Allen & Overy）为法律领域构建了这种系统。Mendable 交付开发者文档版本，Glean 覆盖企业搜索。模式是：高保真摄取，混合检索加重排序，强制引用并使用提示词缓存进行综合生成，多层安全防护，以及持续监控漂移。

难点不在模型，而在于考虑司法管辖区的合规要求（HIPAA、GDPR、SOC2）、引用级可审计性、成本控制（命中率高时提示词缓存可节省 60–90% 费用）、通过 RAGAS 忠实度（Faithfulness）检测幻觉（Hallucination），以及源文档更新而索引未跟进时的漂移检测。本综合实践要求交付全部能力，使用 200 题黄金集，并配备红队套件。

## 概念（Concept）

流水线分为两侧。**摄取（Ingestion）**：docling 或 Unstructured 解析结构化文档；ColPali 处理视觉内容丰富的文档；分块（Chunk）附加摘要、标签和基于角色的访问标签。向量存入 pgvector + pgvectorscale（少于 5000 万向量）或 Qdrant Cloud；旁路运行稀疏 BM25。**对话（Conversation）**：LangGraph 管理记忆和多轮交互；每个查询执行混合检索，用 bge-reranker-v2-gemma-2b 重排序，再由 Claude Sonnet 4.7 综合生成（启用提示词缓存），输出经过 Llama Guard 4 和 NeMo Guardrails，最终返回锚定引用的回答。

评估栈有四层。**黄金集（Golden Set）**：200 组带引用的已标注问答，用于检验正确性。**红队测试（Red Team）**：越狱（Jailbreak）、个人身份信息（Personally Identifiable Information，PII）提取尝试和领域外问题，用于检验安全。**RAGAS**：每轮自动评定忠实度、答案相关性（Answer Relevance）与上下文精确率（Context Precision）。**漂移仪表盘（Drift Dashboard）**：Arize Phoenix 每周监控检索质量与幻觉得分。

提示词缓存是降低成本的关键。Claude 4.5+ 和 GPT-5+ 支持缓存系统提示词与检索上下文。在 60–80% 命中率下，每查询成本降至原来的三分之一至五分之一。流水线必须采用稳定前缀设计（系统提示词与重排后的上下文放在前面），才能达到高缓存命中率。

## 架构（Architecture）

```
文档（合同、方案、条款）
      |
      v
docling / Unstructured 解析 + ColPali 处理视觉内容
      |
      v
分块 + 摘要 + 角色标签 + 司法管辖区标签
      |
      v
pgvector + pgvectorscale  +  BM25 (Tantivy)
      |
查询 + 角色 + 司法管辖区
      |
      v
LangGraph 对话智能体（Conversational Agent）
   +--- 检索（混合）
   +--- 按角色 + 司法管辖区过滤
   +--- 重排序（bge-reranker-v2-gemma-2b 或 Voyage rerank-2）
   +--- 综合生成（Claude Sonnet 4.7，提示词已缓存）
   +--- 防护（Llama Guard 4 + NeMo Guardrails + Presidio 输出 PII 清理）
   +--- 引用 + 返回
      |
      v
评估：
  RAGAS faithfulness / answer_relevance / context_precision（在线）
  Langfuse 标注队列（抽样）
  Arize Phoenix 漂移监控（每周）
  红队套件（发布前）
```

## 技术栈（Stack）

- 摄取：Unstructured.io 或 docling 处理结构化文档；ColPali 处理视觉内容丰富的 PDF
- 向量数据库（Vector DB）：少于 5000 万向量时用 pgvector + pgvectorscale，否则用 Qdrant Cloud
- 稀疏检索（Sparse）：带字段权重的 Tantivy BM25
- 编排（Orchestration）：LlamaIndex Workflows 负责摄取，LangGraph 负责对话
- 重排序器（Re-Ranker）：自托管 bge-reranker-v2-gemma-2b 或托管 Voyage rerank-2
- 大语言模型（Large Language Model，LLM）：Claude Sonnet 4.7 启用提示词缓存；自托管 Llama 3.3 70B 作为备用
- 评估：在线 RAGAS 0.2，DeepEval 用于幻觉与越狱套件
- 可观测性（Observability）：自托管 Langfuse 带标注队列；Arize Phoenix 检测漂移
- 防护机制（Guardrails）：Llama Guard 4 输入／输出分类器、NeMo Guardrails v0.12 策略、Presidio PII 清理
- 合规（Compliance）：分块附基于角色的访问标签；为 GDPR/HIPAA 附司法管辖区标签

```figure
canary-rollout
```

## 动手实现（Build It）

1. **摄取（Ingestion）。** 用 Unstructured 或 docling 解析语料（正式构建建议 1000–10000 份文档）。扫描页或视觉内容较多的页面交由 ColPali 处理。生成附摘要、角色标签、司法管辖区标签的分块。

2. **索引（Index）。** 将稠密嵌入（Dense Embedding，Voyage-3 或 Nomic-embed-v2）写入 pgvector + pgvectorscale。通过 Tantivy 创建 BM25 辅助索引。将角色和司法管辖区过滤信息作为载荷（Payload）。

3. **混合检索（Hybrid Retrieve）。** 先按角色与司法管辖区过滤，再并行执行稠密检索与 BM25；用倒数排名融合（Reciprocal Rank Fusion，RRF）合并；前 20 项交给重排序器，前 5 项交给生成器。

4. **启用提示词缓存的综合生成（Synthesize with Prompt Caching）。** 系统提示词与静态策略放在缓存头部，重排后的上下文作为缓存扩展，用户问题作为不缓存的后缀。稳态缓存命中率目标为 60–80%。

5. **防护机制（Guardrails）。** 对输入使用 Llama Guard 4；NeMo Guardrails 规则阻止领域外问题或策略禁止话题；Presidio 清理输出中意外出现的 PII；后置过滤器强制要求引用。

6. **黄金集（Golden Set）。** 由领域专家标注 200 组问答，包含答案和引用。按引用精确匹配、答案正确性和 RAGAS 忠实度为智能体评分。

7. **红队测试（Red Team）。** 50 条对抗提示词：越狱（PAIR、TAP）、PII 外传尝试、领域外问题和跨司法管辖区泄露。记录通过／失败与严重程度。

8. **漂移仪表盘（Drift Dashboard）。** Arize Phoenix 每周追踪检索质量，包括归一化折损累计增益（Normalized Discounted Cumulative Gain，nDCG）和引用忠实度。下降 5% 时告警。

9. **成本报告（Cost Report）。** Langfuse 记录提示词缓存命中率、每查询词元数及按阶段拆分的每查询美元成本。

## 实际应用（Use It）

```
$ chat --role=analyst --jurisdiction=GDPR
> what is the data-retention obligation for EU user profiles under our contract?
[retrieve]  hybrid top-20 filtered to GDPR + analyst-role
[rerank]    top-5 kept
[synth]     claude-sonnet-4.7, cache hit 74%, 0.8s
answer:
  The contract (Section 12.4, Master Services Agreement dated 2024-03-11)
  obligates EU user profile deletion within 30 days of termination per GDPR
  Article 17. The DPA amendment (DPA-v2.1, Section 5) extends this to 14 days
  for "restricted" category data.
  citations: [MSA-2024-03-11 s12.4, DPA-v2.1 s5]
```

## 交付成果（Ship It）

`outputs/skill-production-rag.md` 描述交付物：一个带合规标签部署的受监管领域聊天机器人，通过评分标准验收，并接受实时漂移监控。

| 权重 | 标准 | 衡量方式 |
|:-:|---|---|
| 25 | RAGAS 忠实度 + 答案相关性 | 黄金集（200 组问答）上的在线评分 |
| 20 | 引用正确性 | 具有可验证来源锚点的答案比例 |
| 20 | 防护覆盖率 | Llama Guard 4 通过率 + 越狱套件结果 |
| 20 | 成本／延迟工程 | 提示词缓存命中率、p95 延迟、每查询美元成本 |
| 15 | 漂移监控仪表盘 | Phoenix 实时仪表盘，呈现每周检索质量趋势 |
| **100** | | |

## 练习（Exercises）

1. 在不同司法管辖区下构建第二份语料切片，例如在 GDPR 之外增加 HIPAA。通过 20 个跨司法管辖区探测问题，展示角色与司法管辖区过滤能够阻止交叉泄露。

2. 测量一周生产流量的提示词缓存命中率。识别哪些查询破坏缓存前缀，重组结构。

3. 增加带一万词元摘要缓冲区的多轮记忆。测量忠实度是否随对话增长而下降。

4. 将 Claude Sonnet 4.7 替换为自托管 Llama 3.3 70B。测量每查询美元成本与忠实度变化。

5. 增加“不确定”模式：若重排序最高分低于阈值，智能体不作答，而是说“我没有足够可信的引用”。测量错误自信减少多少。

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|------|-----------------|------------------------|
| 提示词缓存（Prompt Caching） | “缓存系统提示词 + 上下文” | Claude/OpenAI 功能：命中时，已缓存前缀词元的费用降低 60–90% |
| RAGAS | “RAG 评估器” | 自动评定忠实度、答案相关性和上下文精确率 |
| 黄金集（Golden Set） | “已标注评估集” | 200 多组专家标注的带引用问答，作为真实参考标准（Ground Truth） |
| 司法管辖区标签（Jurisdiction Tag） | “合规标签” | 附在分块上的 GDPR/HIPAA/SOC2 适用范围，由检索过滤器强制执行 |
| 引用忠实度（Citation Faithfulness） | “有据回答率” | 有可检索来源片段支持的论断比例 |
| 漂移（Drift） | “检索质量衰退” | nDCG 或引用评分的每周变化；告警阈值 5% |
| 红队测试（Red Team） | “对抗评估” | 发布前的越狱、PII 提取、领域外问题探测 |

## 延伸阅读（Further Reading）

- [Harvey AI](https://www.harvey.ai)：法律领域生产技术栈参考
- [Glean 企业搜索](https://www.glean.com)：企业规模 RAG 参考
- [Mendable 文档](https://mendable.ai)：开发者文档 RAG 参考
- [LlamaCloud 解析与索引（Parse + Index）](https://docs.cloud.llamaindex.ai/llamaparse/getting_started)：托管摄取
- [Anthropic 提示词缓存](https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching)：成本优化参考
- [RAGAS 0.2 文档](https://docs.ragas.io/)：典型 RAG 评估框架
- [Arize Phoenix](https://github.com/Arize-ai/phoenix)：漂移可观测性参考
- [Llama Guard 4](https://www.llama.com/docs/model-cards-and-prompt-formats/llama-guard-4/)：2026 安全分类器
- [NeMo Guardrails v0.12](https://docs.nvidia.com/nemo-guardrails/)：策略防护规则框架
