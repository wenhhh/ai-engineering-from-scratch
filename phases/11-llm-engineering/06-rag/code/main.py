import math
from collections import Counter


def chunk_text(text, chunk_size=200, overlap=50):
    words = text.split()
    chunks = []
    start = 0
    while start < len(words):
        end = start + chunk_size
        chunk = " ".join(words[start:end])
        chunks.append(chunk)
        start += chunk_size - overlap
    return chunks


def build_vocabulary(documents):
    vocab = set()
    for doc in documents:
        vocab.update(doc.lower().split())
    return sorted(vocab)


def compute_tf(text, vocab):
    words = text.lower().split()
    count = Counter(words)
    total = len(words)
    if total == 0:
        return [0.0] * len(vocab)
    return [count.get(word, 0) / total for word in vocab]


def compute_idf(documents, vocab):
    n = len(documents)
    idf = []
    for word in vocab:
        doc_count = sum(1 for doc in documents if word in doc.lower().split())
        idf.append(math.log((n + 1) / (doc_count + 1)) + 1)
    return idf


def tfidf_embed(text, vocab, idf):
    tf = compute_tf(text, vocab)
    return [t * i for t, i in zip(tf, idf)]


def cosine_similarity(a, b):
    dot_product = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(x * x for x in b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot_product / (norm_a * norm_b)


def search(query_embedding, stored_embeddings, top_k=5):
    scores = []
    for i, emb in enumerate(stored_embeddings):
        sim = cosine_similarity(query_embedding, emb)
        scores.append((i, sim))
    scores.sort(key=lambda x: x[1], reverse=True)
    return scores[:top_k]


def build_rag_prompt(query, retrieved_chunks):
    context = "\n\n---\n\n".join(
        f"[Source {i+1}]\n{chunk}"
        for i, chunk in enumerate(retrieved_chunks)
    )
    return (
        "Answer the question based ONLY on the following context.\n"
        "If the context doesn't contain enough information, "
        "say \"I don't have enough information to answer that.\"\n\n"
        f"Context:\n{context}\n\n"
        f"Question: {query}\n\n"
        "Answer:"
    )


def simple_generate(prompt, retrieved_chunks):
    query_section = prompt.lower().split("question:")[-1]
    query_words = set(query_section.split())
    stop_words = {"the", "a", "an", "is", "are", "was", "were", "what", "how",
                  "why", "when", "where", "do", "does", "for", "of", "in", "to",
                  "and", "or", "on", "at", "by", "it", "its", "this", "that"}
    query_words = query_words - stop_words

    best_sentence = ""
    best_score = 0

    for chunk in retrieved_chunks:
        for sentence in chunk.split("."):
            sentence = sentence.strip()
            if len(sentence) < 10:
                continue
            words = set(sentence.lower().split())
            overlap = len(query_words & words)
            if overlap > best_score:
                best_score = overlap
                best_sentence = sentence

    return best_sentence if best_sentence else "I don't have enough information."


class RAGPipeline:
    def __init__(self, chunk_size=200, overlap=50, top_k=5):
        self.chunk_size = chunk_size
        self.overlap = overlap
        self.top_k = top_k
        self.chunks = []
        self.embeddings = []
        self.vocab = []
        self.idf = []
        self.sources = []

    def index(self, documents, source_names=None):
        all_chunks = []
        all_sources = []
        for i, doc in enumerate(documents):
            doc_chunks = chunk_text(doc, self.chunk_size, self.overlap)
            all_chunks.extend(doc_chunks)
            name = source_names[i] if source_names else f"doc_{i}"
            all_sources.extend([name] * len(doc_chunks))

        self.chunks = all_chunks
        self.sources = all_sources
        self.vocab = build_vocabulary(all_chunks)
        self.idf = compute_idf(all_chunks, self.vocab)
        self.embeddings = [
            tfidf_embed(chunk, self.vocab, self.idf)
            for chunk in all_chunks
        ]
        return len(all_chunks)

    def query(self, question, top_k=None):
        k = top_k or self.top_k
        query_emb = tfidf_embed(question, self.vocab, self.idf)
        results = search(query_emb, self.embeddings, k)

        retrieved = []
        for idx, score in results:
            retrieved.append({
                "chunk": self.chunks[idx],
                "source": self.sources[idx],
                "score": score,
                "index": idx
            })

        chunk_texts = [r["chunk"] for r in retrieved]
        prompt = build_rag_prompt(question, chunk_texts)
        answer = simple_generate(prompt, chunk_texts)

        return {
            "question": question,
            "answer": answer,
            "prompt": prompt,
            "retrieved": retrieved
        }


SAMPLE_DOCUMENTS = [
    """Acme Corp Refund Policy.
    All standard plan customers are eligible for a full refund within 30 days of purchase.
    Enterprise plan customers receive an extended 60-day refund window with pro-rated refunds
    calculated from the date of cancellation. Refunds are processed within 5-7 business days
    and returned to the original payment method. No refunds are available after the refund
    window closes. Customers must submit refund requests through the support portal or by
    contacting their account manager directly. Annual subscriptions that are cancelled mid-term
    will receive a pro-rated credit for the remaining months.""",

    """Acme Corp Product Overview.
    Acme Corp offers three product tiers: Starter, Professional, and Enterprise.
    The Starter plan includes basic features for individual users at $29 per month.
    The Professional plan adds team collaboration, advanced analytics, and priority
    support for $99 per month per user. The Enterprise plan includes everything in
    Professional plus custom integrations, dedicated account management, SSO,
    audit logs, and a 99.99% uptime SLA. Enterprise pricing is custom and starts
    at $500 per month for up to 50 users. All plans include a 14-day free trial
    with no credit card required.""",

    """Acme Corp Security Practices.
    Acme Corp maintains SOC 2 Type II compliance and undergoes annual third-party
    security audits. All data is encrypted at rest using AES-256 and in transit
    using TLS 1.3. Customer data is stored in isolated tenants within AWS
    us-east-1 and eu-west-1 regions. Data residency can be configured per
    organization for Enterprise customers. Backups are performed every 6 hours
    with 30-day retention. Acme Corp does not sell or share customer data with
    third parties. Enterprise customers can request data deletion within 24 hours.
    Bug bounty program available through HackerOne.""",

    """Acme Corp API Documentation.
    The Acme API uses REST with JSON request and response bodies. Authentication
    is via Bearer tokens issued through OAuth 2.0. Rate limits are 100 requests
    per minute for Starter, 1000 for Professional, and 10000 for Enterprise.
    Rate limit headers are included in every response: X-RateLimit-Limit,
    X-RateLimit-Remaining, and X-RateLimit-Reset. Exceeding the rate limit
    returns HTTP 429 with a Retry-After header. The API supports pagination
    via cursor-based pagination using the next_cursor field. Webhooks are
    available for real-time event notifications on Professional and Enterprise
    plans. API versioning uses date-based versions in the URL path.""",

    """Acme Corp Uptime and Reliability.
    Acme Corp guarantees 99.9% uptime for Professional plans and 99.99% uptime
    for Enterprise plans. Uptime is calculated monthly excluding scheduled
    maintenance windows which are announced 72 hours in advance. If uptime
    falls below the guaranteed level, customers receive service credits:
    10% credit for each 0.1% below the SLA threshold, up to a maximum of
    30% of the monthly fee. Service credits must be requested within 30 days
    of the incident. Status page updates are posted at status.acme.com
    within 5 minutes of any detected incident. Post-incident reports are
    published within 48 hours for any outage exceeding 15 minutes."""
]


if __name__ == "__main__":
    print("=" * 60)
    print("步骤 1：文档分块（Document Chunking）")
    print("=" * 60)

    sample = SAMPLE_DOCUMENTS[0]
    chunks = chunk_text(sample, chunk_size=30, overlap=10)
    print(f"  文档长度： {len(sample.split())} 个单词")
    print(f"  分块大小：30 个单词，重叠：10 个单词")
    print(f"  分块数量： {len(chunks)}")
    for i, chunk in enumerate(chunks):
        print(f"\n  分块 {i}： ({len(chunk.split())} 个单词)")
        print(f"    {chunk[:100]}...")

    print("\n" + "=" * 60)
    print("步骤 2：TF-IDF 嵌入（Embedding）")
    print("=" * 60)

    mini_docs = [
        "The cat sat on the mat",
        "The dog sat on the rug",
        "Machine learning is a branch of artificial intelligence"
    ]
    vocab = build_vocabulary(mini_docs)
    idf = compute_idf(mini_docs, vocab)

    print(f"  词表大小： {len(vocab)}")
    print(f"  示例词语与逆文档频率（IDF）分数：")
    for word, score in sorted(zip(vocab, idf), key=lambda x: x[1], reverse=True)[:8]:
        print(f"    {word:20s} IDF={score:.3f}")

    emb1 = tfidf_embed(mini_docs[0], vocab, idf)
    emb2 = tfidf_embed(mini_docs[1], vocab, idf)
    emb3 = tfidf_embed(mini_docs[2], vocab, idf)

    print(f"\n  嵌入维度： {len(emb1)}")
    print(f"  非零项数量，文本为 'cat sat on mat': {sum(1 for v in emb1 if v > 0)}")
    print(f"  非零项数量，文本为 'dog sat on rug': {sum(1 for v in emb2 if v > 0)}")
    print(f"  非零项数量，文本为 'machine learning': {sum(1 for v in emb3 if v > 0)}")

    print("\n" + "=" * 60)
    print("步骤 3：余弦相似度（Cosine Similarity）")
    print("=" * 60)

    sim_12 = cosine_similarity(emb1, emb2)
    sim_13 = cosine_similarity(emb1, emb3)
    sim_23 = cosine_similarity(emb2, emb3)

    print(f"  'cat on mat' vs 'dog on rug':     {sim_12:.4f}  （结构相似）")
    print(f"  'cat on mat' vs 'machine learning': {sim_13:.4f}  （不相关）")
    print(f"  'dog on rug' vs 'machine learning': {sim_23:.4f}  （不相关）")
    print(f"\n  符合预期：相似句子的得分更高。")

    print("\n" + "=" * 60)
    print("步骤 4：完整检索增强生成流水线（RAG Pipeline）")
    print("=" * 60)

    rag = RAGPipeline(chunk_size=50, overlap=10, top_k=3)
    source_names = [
        "refund-policy.md",
        "product-overview.md",
        "security.md",
        "api-docs.md",
        "uptime-sla.md"
    ]
    num_chunks = rag.index(SAMPLE_DOCUMENTS, source_names)
    print(f"  已将 {len(SAMPLE_DOCUMENTS)} 篇文档索引为 {num_chunks} 个分块")
    print(f"  词表大小： {len(rag.vocab)} 个词项")

    queries = [
        "What is the refund policy for enterprise customers?",
        "What are the API rate limits?",
        "How is customer data encrypted?",
        "What happens if uptime falls below the SLA?",
        "How much does the Professional plan cost?"
    ]

    for query in queries:
        print(f"\n  查询：{query}")
        result = rag.query(query, top_k=3)
        print(f"  回答：{result['answer']}")
        print(f"  检索到 {len(result['retrieved'])} 个分块：")
        for r in result["retrieved"]:
            preview = r["chunk"][:80].replace("\n", " ")
            print(f"    [{r['source']}] score={r['score']:.4f} | {preview}...")

    print("\n" + "=" * 60)
    print("步骤 5：分块大小对比（Chunk Size Comparison）")
    print("=" * 60)

    test_query = "What is the refund policy for enterprise customers?"
    for chunk_size in [20, 50, 100, 200]:
        rag_test = RAGPipeline(chunk_size=chunk_size, overlap=max(5, chunk_size // 5))
        n = rag_test.index(SAMPLE_DOCUMENTS)
        result = rag_test.query(test_query, top_k=3)
        top_score = result["retrieved"][0]["score"] if result["retrieved"] else 0
        print(f"  chunk_size={chunk_size:>3d}: {n:>3d} 个分块， "
              f"top_score={top_score:.4f}, "
              f"answer_len={len(result['answer'])}")

    print("\n" + "=" * 60)
    print("步骤 6：提示词检查（Prompt Inspection）")
    print("=" * 60)

    result = rag.query("What encryption does Acme use?", top_k=2)
    prompt_lines = result["prompt"].split("\n")
    print(f"  提示词长度： {len(result['prompt'])} 个字符")
    print(f"  提示词行数： {len(prompt_lines)}")
    print(f"\n  所生成提示词的前 5 行：")
    for line in prompt_lines[:5]:
        print(f"    {line}")
    print(f"  ...")
    print(f"  所生成提示词的后 3 行：")
    for line in prompt_lines[-3:]:
        print(f"    {line}")

    print("\n" + "=" * 60)
    print("总结（SUMMARY）")
    print("=" * 60)
    print("  RAG 流水线：查询（Query）-> 嵌入（Embed）-> 检索（Search）-> 增强（Augment）-> 生成（Generate）")
    print(f"  已索引文档数： {len(SAMPLE_DOCUMENTS)}")
    print(f"  分块总数： {num_chunks}")
    print(f"  词表大小： {len(rag.vocab)}")
    print(f"  嵌入维度： {len(rag.vocab)}")
    print("  相似度度量：余弦相似度（cosine similarity）")
    print("  嵌入方法：TF-IDF")
    print("\n  生产环境中，应将 TF-IDF 替换为神经嵌入（neural embeddings）")
    print("  （text-embedding-3-small），并将简单生成器替换为")
    print("  实际的 LLM API 调用。流水线结构保持不变。")
