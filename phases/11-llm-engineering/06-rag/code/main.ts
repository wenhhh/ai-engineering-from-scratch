// 第 11 阶段 · 第 06 课：最小检索增强生成（RAG，TypeScript 移植版）。
// 在微型语料库上实现 TF-IDF 向量存储、余弦相似度、检索和提示词组装。
// 端到端（end-to-end）流水线仅依赖 Node 标准库。
// 可将嵌入器替换为 OpenAI text-embedding-3-small（或任意 1536 维模型），
// 将 simple_generate 桩函数替换为真正的 /v1/messages 调用；
// 流水线其余部分保持不变。
// 参考文献： https://platform.openai.com/docs/guides/embeddings
//       https://en.wikipedia.org/wiki/Tf%E2%80%93idf
//       https://docs.anthropic.com/en/docs/build-with-claude/embeddings

import process from "node:process";

function chunkText(text: string, chunkSize = 200, overlap = 50): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const chunks: string[] = [];
  let start = 0;
  const step = Math.max(1, chunkSize - overlap);
  while (start < words.length) {
    chunks.push(words.slice(start, start + chunkSize).join(" "));
    start += step;
  }
  return chunks;
}

function buildVocabulary(documents: string[]): string[] {
  const vocab = new Set<string>();
  for (const doc of documents) for (const w of doc.toLowerCase().split(/\s+/)) if (w) vocab.add(w);
  return [...vocab].sort();
}

function computeTF(text: string, vocab: string[]): number[] {
  const words = text.toLowerCase().split(/\s+/).filter(Boolean);
  const counts = new Map<string, number>();
  for (const w of words) counts.set(w, (counts.get(w) ?? 0) + 1);
  const total = words.length;
  if (total === 0) return new Array<number>(vocab.length).fill(0);
  return vocab.map((w) => (counts.get(w) ?? 0) / total);
}

// 平滑逆文档频率（Smoothed IDF）：`+1` 避免除零，以及出现在所有文档中的
// 词项得到零 IDF。此处与 scikit-learn 默认公式一致。
function computeIDF(documents: string[], vocab: string[]): number[] {
  const n = documents.length;
  const docTokens = documents.map((d) => new Set(d.toLowerCase().split(/\s+/)));
  return vocab.map((word) => {
    let dc = 0;
    for (const tokens of docTokens) if (tokens.has(word)) dc += 1;
    return Math.log((n + 1) / (dc + 1)) + 1;
  });
}

function tfidfEmbed(text: string, vocab: string[], idf: number[]): number[] {
  const tf = computeTF(text, vocab);
  return tf.map((t, i) => t * (idf[i] ?? 0));
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i += 1) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    dot += x * y;
    na += x * x;
    nb += y * y;
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

type Retrieved = { chunk: string; source: string; score: number; index: number };

function search(queryEmb: number[], embeddings: number[][], topK = 5): { index: number; score: number }[] {
  const scored = embeddings.map((emb, i) => ({ index: i, score: cosineSimilarity(queryEmb, emb) }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}

function buildRagPrompt(query: string, chunks: string[]): string {
  const context = chunks.map((c, i) => `[Source ${i + 1}]\n${c}`).join("\n\n---\n\n");
  return [
    "Answer the question based ONLY on the following context.",
    'If the context does not contain enough information, say "I don\'t have enough information to answer that."',
    "",
    `Context:\n${context}`,
    "",
    `Question: ${query}`,
    "",
    "Answer:",
  ].join("\n");
}

// 生成步骤的替代实现：选出与问题具有最多非停用词（non-stopword）重叠的
// 分块句子。生产环境中，此处将 `prompt` 作为用户消息，
// 执行一次 /v1/messages 调用。
const STOPWORDS = new Set([
  "the", "a", "an", "is", "are", "was", "were", "what", "how",
  "why", "when", "where", "do", "does", "for", "of", "in", "to",
  "and", "or", "on", "at", "by", "it", "its", "this", "that",
]);

function simpleGenerate(query: string, chunks: string[]): string {
  const queryWords = new Set(
    query
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w && !STOPWORDS.has(w)),
  );
  let best = "";
  let bestScore = 0;
  for (const chunk of chunks) {
    for (const sentence of chunk.split(".")) {
      const trimmed = sentence.trim();
      if (trimmed.length < 10) continue;
      const words = new Set(trimmed.toLowerCase().split(/\s+/));
      let overlap = 0;
      for (const w of queryWords) if (words.has(w)) overlap += 1;
      if (overlap > bestScore) {
        bestScore = overlap;
        best = trimmed;
      }
    }
  }
  return best || "I don't have enough information.";
}

class RAGPipeline {
  private chunks: string[] = [];
  private sources: string[] = [];
  private embeddings: number[][] = [];
  vocab: string[] = [];
  private idf: number[] = [];

  constructor(
    private readonly chunkSize = 200,
    private readonly overlap = 50,
    private readonly topK = 5,
  ) {}

  index(documents: string[], sourceNames?: string[]): number {
    const allChunks: string[] = [];
    const allSources: string[] = [];
    documents.forEach((doc, i) => {
      const docChunks = chunkText(doc, this.chunkSize, this.overlap);
      allChunks.push(...docChunks);
      const name = sourceNames?.[i] ?? `doc_${i}`;
      for (let j = 0; j < docChunks.length; j += 1) allSources.push(name);
    });
    this.chunks = allChunks;
    this.sources = allSources;
    this.vocab = buildVocabulary(allChunks);
    this.idf = computeIDF(allChunks, this.vocab);
    this.embeddings = allChunks.map((c) => tfidfEmbed(c, this.vocab, this.idf));
    return allChunks.length;
  }

  query(question: string, topK?: number): {
    question: string;
    answer: string;
    prompt: string;
    retrieved: Retrieved[];
  } {
    const k = topK ?? this.topK;
    const queryEmb = tfidfEmbed(question, this.vocab, this.idf);
    const results = search(queryEmb, this.embeddings, k);
    const retrieved: Retrieved[] = results.map(({ index, score }) => ({
      chunk: this.chunks[index] ?? "",
      source: this.sources[index] ?? "",
      score,
      index,
    }));
    const chunkTexts = retrieved.map((r) => r.chunk);
    const prompt = buildRagPrompt(question, chunkTexts);
    const answer = simpleGenerate(question, chunkTexts);
    return { question, answer, prompt, retrieved };
  }
}

const SAMPLE_DOCUMENTS = [
  `Acme Corp Refund Policy. All standard plan customers are eligible for a full refund within 30 days of purchase. Enterprise plan customers receive an extended 60-day refund window with pro-rated refunds. Refunds are processed within 5-7 business days. No refunds are available after the refund window closes. Customers must submit refund requests through the support portal.`,
  `Acme Corp Product Overview. Acme offers three product tiers: Starter, Professional, and Enterprise. The Starter plan includes basic features for individual users at $29 per month. The Professional plan adds team collaboration and priority support for $99 per month per user. The Enterprise plan includes everything in Professional plus custom integrations, dedicated account management, SSO, audit logs, and a 99.99% uptime SLA. Enterprise pricing starts at $500 per month.`,
  `Acme Corp Security Practices. Acme maintains SOC 2 Type II compliance and undergoes annual third-party security audits. All data is encrypted at rest using AES-256 and in transit using TLS 1.3. Customer data is stored in isolated tenants within AWS us-east-1 and eu-west-1 regions. Backups are performed every 6 hours with 30-day retention.`,
  `Acme Corp API Documentation. The Acme API uses REST with JSON request and response bodies. Authentication is via Bearer tokens issued through OAuth 2.0. Rate limits are 100 requests per minute for Starter, 1000 for Professional, and 10000 for Enterprise. Exceeding the rate limit returns HTTP 429 with a Retry-After header. Webhooks are available for real-time event notifications.`,
  `Acme Corp Uptime and Reliability. Acme guarantees 99.9% uptime for Professional plans and 99.99% uptime for Enterprise plans. If uptime falls below the guaranteed level, customers receive service credits: 10% credit for each 0.1% below the SLA threshold, up to a maximum of 30% of the monthly fee. Status updates are posted at status.acme.com within 5 minutes of any incident.`,
];

function bar(): string {
  return "=".repeat(60);
}

function main(): void {
  process.stdout.write(`${bar()}\n步骤 1：分块（chunking）\n${bar()}\n`);
  const sample = SAMPLE_DOCUMENTS[0]!;
  const chunks = chunkText(sample, 30, 10);
  process.stdout.write(`  文档： ${sample.split(/\s+/).length} 个单词 → ${chunks.length} 个分块\n`);
  chunks.forEach((c, i) => {
    process.stdout.write(`    分块 ${i} (${c.split(/\s+/).length} 个单词): ${c.slice(0, 80)}...\n`);
  });

  process.stdout.write(`\n${bar()}\n步骤 2：微型语料库上的 TF-IDF\n${bar()}\n`);
  const miniDocs = [
    "The cat sat on the mat",
    "The dog sat on the rug",
    "Machine learning is a branch of artificial intelligence",
  ];
  const vocab = buildVocabulary(miniDocs);
  const idf = computeIDF(miniDocs, vocab);
  process.stdout.write(`  词表大小： ${vocab.length}\n`);
  const ranked = vocab.map((w, i) => ({ w, s: idf[i] ?? 0 })).sort((a, b) => b.s - a.s).slice(0, 6);
  for (const { w, s } of ranked) process.stdout.write(`    ${w.padEnd(18)} IDF=${s.toFixed(3)}\n`);

  const e1 = tfidfEmbed(miniDocs[0]!, vocab, idf);
  const e2 = tfidfEmbed(miniDocs[1]!, vocab, idf);
  const e3 = tfidfEmbed(miniDocs[2]!, vocab, idf);
  process.stdout.write(`\n${bar()}\n步骤 3：余弦相似度（cosine similarity）\n${bar()}\n`);
  process.stdout.write(`  cat-mat 对比 dog-rug:       ${cosineSimilarity(e1, e2).toFixed(4)}\n`);
  process.stdout.write(`  cat-mat 对比 ml/ai:         ${cosineSimilarity(e1, e3).toFixed(4)}\n`);
  process.stdout.write(`  dog-rug 对比 ml/ai:         ${cosineSimilarity(e2, e3).toFixed(4)}\n`);

  process.stdout.write(`\n${bar()}\n步骤 4：完整 RAG 流水线（pipeline）\n${bar()}\n`);
  const rag = new RAGPipeline(50, 10, 3);
  const sourceNames = ["refund-policy.md", "product-overview.md", "security.md", "api-docs.md", "uptime-sla.md"];
  const numChunks = rag.index(SAMPLE_DOCUMENTS, sourceNames);
  process.stdout.write(`  已索引 ${SAMPLE_DOCUMENTS.length} 篇文档 → ${numChunks} 个分块, 词表大小=${rag.vocab.length}\n`);

  const queries = [
    "What is the refund policy for enterprise customers?",
    "What are the API rate limits?",
    "How is customer data encrypted?",
    "What happens if uptime falls below the SLA?",
  ];
  for (const q of queries) {
    const result = rag.query(q, 3);
    process.stdout.write(`\n  查询：${q}\n  回答：${result.answer}\n`);
    for (const r of result.retrieved) {
      const preview = r.chunk.slice(0, 80).replace(/\n/g, " ");
      process.stdout.write(`    [${r.source}] score=${r.score.toFixed(4)} | ${preview}...\n`);
    }
  }

  process.stdout.write(`\n${bar()}\n总结（SUMMARY）\n${bar()}\n`);
  process.stdout.write("  RAG：查询（query）→ 嵌入（embed）→ 检索（search）→ 增强（augment）→ 生成（generate）\n");
  process.stdout.write("  将 TF-IDF 替换为 text-embedding-3-small，并将 simpleGenerate 替换为实际 LLM 调用。\n");
}

main();
