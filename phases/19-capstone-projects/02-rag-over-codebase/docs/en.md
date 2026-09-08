# 综合实践 02：代码库 RAG，跨仓库语义搜索（Capstone 02 — RAG over Codebase）

> 2026 年，每个成熟工程组织都有理解语义而非仅匹配字符串的内部代码搜索。Sourcegraph Amp、Cursor 代码库问答、Augment 企业图谱、Aider 仓库映射、Pinterest 内部 MCP，结构相同：摄取多个仓库，以 tree-sitter 解析，嵌入函数与类级代码块，混合搜索，重排序，附引用回答。本综合实践要求构建一个处理 10 个仓库、2M 行代码的系统，并能在每次 git push 后完成增量重建索引。

**Type:** Capstone
**Languages:** Python (ingestion), TypeScript (API + UI)
**Prerequisites:** 阶段 5（自然语言处理基础）、阶段 7（Transformer）、阶段 11（大语言模型工程）、阶段 13（工具）、阶段 17（基础设施）
**涉及阶段（Phases exercised）：** P5 · P7 · P11 · P13 · P17
**Time:** 30 小时

## 问题（Problem）

到 2026 年，每个前沿编码智能体都有代码库检索层，因为单靠上下文窗口无法解决跨仓库问题。Claude 的 1M 词元上下文有帮助，但不能消除排序检索的必要性。对原始代码块进行朴素余弦搜索，会被生成代码、单体仓库重复内容，以及少见导入符号的长尾污染。生产方案是对抽象语法树（Abstract Syntax Tree，AST）感知代码块进行稠密 + BM25 混合搜索，配合重排序器，并由符号引用图支撑。

你要通过索引真实仓库群，而非单个教程仓库，衡量 MRR@10、引用忠实度和增量新鲜度来学习。失效模式来自基础设施：含 100k 个文件的单体仓库、一次改动半数文件的推送，以及必须跨四个仓库才能正确回答的查询。

## 概念（Concept）

AST 感知摄取流水线用 tree-sitter 解析每个文件，提取函数和类节点，在节点边界切块，而非固定词元窗口。每块有三种表示：稠密嵌入（Voyage-code-3 或 nomic-embed-code）、稀疏 BM25 词项、简短自然语言摘要。摘要增加第三种可检索模态：用户问“X 如何授权”，摘要会提及“authz”，即使代码只有 `check_permission`。

检索采用混合方式。查询同时发起稠密和 BM25 搜索，合并前 k 项，将并集交给交叉编码器重排序器（Cross-encoder Reranker），如 Cohere rerank-3 或 bge-reranker-v2-gemma-2b。重排列表送入长上下文回答生成器，例如带提示词缓存的 Claude Sonnet 4.7，或自托管 Llama 3.3 70B，并要求每个论断引用文件与行范围。后置过滤器拒绝无引用回答。

增量新鲜度是基础设施问题。Git push 触发差异计算，识别变化的文件和符号。只有受影响代码块重新嵌入，受影响的跨文件符号边，如导入和方法调用，重新计算。每次提交无需重处理 2M 行，也能保持索引一致。

## 架构（Architecture）

```
git push --> webhook --> 摄取工作器（LlamaIndex Workflow）
                           |
                           v
             tree-sitter 解析 + AST 分块
                           |
            +--------------+----------------+
            v              v                v
          稠密嵌入      BM25 索引       摘要（LLM）
        (Voyage / bge)  (Tantivy)        (Haiku 4.5)
            |              |                |
            +------> Qdrant / pgvector <----+
                            |
                            v
                      符号图（Neo4j / kuzu）
                            |
  查询 --> LangGraph 智能体（检索 -> 重排序 -> 生成）
                            |
                            v
                 Claude Sonnet 4.7，1M 上下文
                            |
                            v
                 回答 + file:line 引用
```

## 技术栈（Stack）

- 解析：tree-sitter，提供 17 种语言语法，包括 Python、TS、Rust、Go、Java、C++ 等
- 稠密嵌入（Dense Embeddings）：托管 Voyage-code-3 或自托管 nomic-embed-code-v1.5，bge-code-v1 作为后备
- 稀疏索引（Sparse Index）：Rust 编写的 Tantivy，采用 BM25F，对符号名和主体设置不同字段权重
- 向量数据库：Qdrant 1.12 混合搜索；向量少于 50M 的团队也可用 pgvector + pgvectorscale
- 代码块摘要模型：Claude Haiku 4.5 或 Gemini 2.5 Flash，使用提示词缓存
- 重排序器：Cohere rerank-3 或自托管 bge-reranker-v2-gemma-2b
- 编排：LlamaIndex Workflows 负责摄取，LangGraph 负责查询智能体
- 回答生成器：Claude Sonnet 4.7，1M 上下文与提示词缓存
- 符号图（Symbol Graph）：托管 Neo4j 或嵌入式 kuzu，存储导入边和调用边
- 可观测性：每个检索与生成步骤都有 Langfuse 跨度

```figure
ce-hybrid-retrieval
```

## 动手实现（Build It）

1. **摄取遍历器。** 每次推送钩子触发时遍历 git 历史，收集变化文件。逐文件用 tree-sitter 解析，提取函数、类节点及完整源码范围，输出代码块记录 `{repo, path, start_line, end_line, symbol, body}`。

2. **代码块摘要器。** 将代码块批量提交给 Haiku 4.5，对系统前言启用提示词缓存。提示词：“用一句话概括这个函数，指出其公开契约与副作用。”将摘要与代码块一起存储。

3. **嵌入池。** 两个并行队列：稠密代码队列，Voyage-code-3 每批 128；摘要队列，使用相同模型但输入摘要字符串。向量写入 Qdrant，载荷为 `{repo, path, start_line, end_line, symbol, kind}`。

4. **BM25 索引。** 使用字段加权 Tantivy 索引：符号名权重 4、符号主体权重 1、摘要权重 2。同时支持“查找名为 X 的函数”和“查找执行 X 的函数”。

5. **符号图。** 逐代码块记录导入边（当前文件使用仓库 Z 的符号 Y）、调用边（当前函数调用类 C 的方法 M）和继承边，存入 kuzu。查询时用于跨仓库边界扩展检索。

6. **查询智能体。** LangGraph 包含三个节点。`retrieve` 并行发起稠密与 BM25 搜索，按 (repo, path, symbol) 去重。`rerank` 用交叉编码器评估前 50 项，保留前 10 项。`synth` 调用 Claude Sonnet 4.7，将重排代码块放入上下文，缓存系统提示词，并要求 file:line 引用。

7. **强制引用。** 解析模型输出，任何没有 `(repo/path:start-end)` 锚点的论断都标记为重新提问或删除。只向用户返回带引用的回答。

8. **增量重建索引。** 每次 webhook 计算符号级差异。仅对文本变化的代码块重新嵌入，仅为导入变化的代码块重算符号边。衡量目标：2M 行代码仓库群上，50 文件推送在 60 秒内完成重新索引。

9. **评估。** 为 100 个跨仓库问题标注金标准 file:line 答案，衡量 MRR@10、nDCG@10、引用忠实度（具有可验证锚点的论断比例）和 p50/p99 延迟。

## 实际应用（Use It）

```
$ code-rag ask "how is S3 multipart abort wired into our retry budget?"
[retrieve]  12 chunks dense + 7 chunks bm25, 16 unique after dedup
[rerank]    top-5 kept (cohere rerank-3)
[synth]     claude-sonnet-4.7, cache hit rate 68%, 2.1s
answer:
  Multipart aborts are triggered by `AbortMultipartOnFail` in
  services/uploader/retry.go:122-148, which decrements the per-bucket
  retry budget defined in config/budgets.yaml:34-51 ...
  citations: [services/uploader/retry.go:122-148, config/budgets.yaml:34-51,
              libs/s3client/multipart.ts:44-61]
```

## 交付成果（Ship It）

交付技能为 `outputs/skill-codebase-rag.md`。给定仓库语料，它搭建摄取流水线、混合索引和查询智能体，为跨仓库问题返回带引用的回答。评分标准：

| 权重 | 标准 | 衡量方式 |
|:-:|---|---|
| 25 | 检索质量 | 100 问题留出集上的 MRR@10 与 nDCG@10 |
| 20 | 引用忠实度 | 回答中具有可验证 file:line 锚点的论断比例 |
| 20 | 延迟与规模 | 在该索引语料规模上，10k QPS 时的 p95 查询延迟 |
| 20 | 增量索引正确性 | 50 文件提交从 git push 到可搜索的耗时 |
| 15 | 用户体验与回答格式 | 引用可点击性、片段预览、追问入口 |
| **100** | | |

## 练习（Exercises）

1. 将 Voyage-code-3 换为自托管 nomic-embed-code。衡量 MRR@10 差值，报告启用重排序后差距是否缩小。

2. 向语料注入 20% 生成代码，即大语言模型生成的样板代码，重新评估并观察检索污染。向载荷加入“generated”标记，降低这些命中的权重。

3. 在你的语料规模上对比 Qdrant 混合搜索与 pgvector + pgvectorscale，报告批量大小 1 时的 p99。

4. 添加基于采样的漂移检查：每周重跑 100 问题评估，MRR@10 下降 > 5% 时告警。

5. 扩展到跨语言符号解析，例如 Python 函数通过 gRPC 调用 Go 服务。用符号图连接两者。

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|------|-----------------|------------------------|
| AST 感知分块（AST-aware Chunking） | “函数级切分” | 在 tree-sitter 节点边界切分代码，而不是固定词元窗口 |
| 混合搜索（Hybrid Search） | “稠密 + 稀疏” | 并行运行 BM25 与向量搜索，合并前 k 项，再重排序 |
| 交叉编码器重排序（Cross-encoder Rerank） | “二阶段排序” | 联合评价每个查询—候选对，比余弦相似度更准确 |
| 提示词缓存（Prompt Caching） | “缓存系统提示词” | 2026 年 Claude / OpenAI 功能，重复前缀词元最高可获得 90% 折扣 |
| 符号图（Symbol Graph） | “代码图” | 跨文件和仓库的导入、调用、继承边 |
| 引用忠实度（Citation Faithfulness） | “有依据回答率” | 用户可点击锚点并阅读引用片段来验证的论断比例 |
| 增量重建索引（Incremental Re-index） | “推送到搜索时间” | 从 git push 到变化符号可查询的实际耗时 |

## 延伸阅读（Further Reading）

- [Sourcegraph Amp](https://ampcode.com)：生产级跨仓库代码智能
- [Sourcegraph Cody 的 RAG 架构](https://sourcegraph.com/blog/how-cody-understands-your-codebase)：本综合实践的深入参考
- [Aider 仓库映射](https://aider.chat/docs/repomap.html)：基于 tree-sitter 排序的仓库视图
- [Augment Code 企业图谱](https://www.augmentcode.com)：商业符号图 RAG
- [Qdrant 混合搜索文档](https://qdrant.tech/documentation/concepts/hybrid-queries/)：参考实现
- [Voyage AI 代码嵌入](https://docs.voyageai.com/docs/embeddings)：Voyage-code-3 细节
- [Cohere rerank-3](https://docs.cohere.com/reference/rerank)：交叉编码器参考
- [Pinterest MCP 内部搜索](https://medium.com/pinterest-engineering)：内部平台参考
