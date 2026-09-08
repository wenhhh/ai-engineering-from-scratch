// 第 11 阶段 · 第 05 课：上下文工程（Context engineering，TypeScript 移植版）。
// 词元预算、滑动窗口历史压缩器，以及中间信息丢失重排（lost-in-the-middle）。
// 词元计数采用 1 word ≈ 1.3 tokens 的启发式估算，足以用于预算，
// 无需引入 tiktoken。实际组装器可在此接入分词器（tokenizer）。
// 参考文献： https://arxiv.org/abs/2307.03172  (Lost in the Middle — Liu et al.)
//       https://www.anthropic.com/news/contextual-retrieval
//       https://platform.openai.com/docs/guides/context-window

import process from "node:process";

const WORD_TO_TOKEN = 1.3;

function countTokens(text: string): number {
  if (!text) return 0;
  return Math.floor(text.trim().split(/\s+/).length * WORD_TO_TOKEN);
}

type AllocationResult = { content: string; tokens: number };

class ContextBudget {
  readonly maxTokens: number;
  readonly generationReserve: number;
  readonly available: number;
  private readonly allocations = new Map<string, number>();

  constructor(maxTokens = 128_000, generationReserve = 4_000) {
    this.maxTokens = maxTokens;
    this.generationReserve = generationReserve;
    this.available = maxTokens - generationReserve;
  }

  allocate(component: string, content: string, maxComponentTokens?: number): AllocationResult {
    let tokens = countTokens(content);
    let trimmed = content;

    if (maxComponentTokens !== undefined && tokens > maxComponentTokens) {
      const words = trimmed.split(/\s+/);
      trimmed = words.slice(0, Math.floor(maxComponentTokens / WORD_TO_TOKEN)).join(" ");
      tokens = countTokens(trimmed);
    }

    const used = this.usedTokens();
    if (used + tokens > this.available) {
      const allowed = this.available - used;
      if (allowed <= 0) return { content: "", tokens: 0 };
      const words = trimmed.split(/\s+/);
      trimmed = words.slice(0, Math.floor(allowed / WORD_TO_TOKEN)).join(" ");
      tokens = countTokens(trimmed);
    }

    this.allocations.set(component, tokens);
    return { content: trimmed, tokens };
  }

  usedTokens(): number {
    let total = 0;
    for (const v of this.allocations.values()) total += v;
    return total;
  }

  remaining(): number {
    return this.available - this.usedTokens();
  }

  report(): string {
    const lines: string[] = [];
    lines.push(`\n  上下文预算报告（Context Budget） (${this.maxTokens.toLocaleString()} 词元窗口）`);
    lines.push("  " + "-".repeat(55));
    for (const [component, tokens] of this.allocations) {
      const pct = (tokens / this.maxTokens) * 100;
      const bar = pct >= 0.5 ? "#".repeat(Math.floor(pct * 2)) : "";
      lines.push(`    ${component.padEnd(25)} ${String(tokens).padStart(6)} 词元（tokens） (${pct.toFixed(1).padStart(5)}%) ${bar}`);
    }
    lines.push("  " + "-".repeat(55));
    lines.push(`    ${"已使用（Used）".padEnd(25)} ${String(this.usedTokens()).padStart(6)} 词元（tokens）`);
    lines.push(`    ${"生成预留（Generation reserve）".padEnd(25)} ${String(this.generationReserve).padStart(6)} 词元（tokens）`);
    lines.push(`    ${"剩余（Remaining）".padEnd(25)} ${String(this.remaining()).padStart(6)} 词元（tokens）`);
    return lines.join("\n");
  }
}

// Liu 等人（2023）：长上下文中间位置的词元获得的注意力（attention）较少。
// 因此将相关度最高的文档放在首尾，
// 将相关度最低的文档放在中间。
function reorderLostInMiddle<T>(items: T[], scores: number[]): T[] {
  const paired = items.map((item, i) => ({ item, score: scores[i] ?? 0 }));
  paired.sort((a, b) => b.score - a.score);
  const sorted = paired.map((p) => p.item);
  if (sorted.length <= 2) return sorted;
  const head: T[] = [];
  const tail: T[] = [];
  for (let i = 0; i < sorted.length; i += 1) {
    if (i % 2 === 0) head.push(sorted[i]!);
    else tail.unshift(sorted[i]!);
  }
  return [...head, ...tail];
}

type Turn = { role: "user" | "assistant"; content: string };

class ConversationManager {
  private turns: Turn[] = [];
  private summaries: string[] = [];
  constructor(private readonly maxHistoryTokens = 5_000) {}

  addTurn(role: Turn["role"], content: string): void {
    this.turns.push({ role, content });
    this.compress();
  }

  // 滑动窗口（Sliding window）配合低成本摘要。实际系统使用
  // LLM 生成摘要；这里仅保留每个被压缩轮次的前 100 个字符。
  private compress(): void {
    let total = this.totalTurnTokens();
    while (total > this.maxHistoryTokens && this.turns.length > 4) {
      const oldTurns = this.turns.slice(0, 2);
      this.summaries.push(this.summarise(oldTurns));
      this.turns = this.turns.slice(2);
      total = this.totalTurnTokens();
    }
  }

  private totalTurnTokens(): number {
    let total = 0;
    for (const t of this.turns) total += countTokens(t.content);
    return total;
  }

  private summarise(turns: Turn[]): string {
    const parts = turns.map((t) => {
      const slice = t.content.length > 100 ? `${t.content.slice(0, 100)}...` : t.content;
      return `${t.role}: ${slice}`;
    });
    return `Previous: ${parts.join(" | ")}`;
  }

  contextText(): string {
    const parts: string[] = [];
    if (this.summaries.length) {
      parts.push("[Conversation Summary]");
      parts.push(...this.summaries);
    }
    if (this.turns.length) {
      parts.push("[Recent Conversation]");
      for (const t of this.turns) parts.push(`${t.role}: ${t.content}`);
    }
    return parts.join("\n");
  }

  stats(): { liveTurns: number; summaries: number; tokens: number } {
    return {
      liveTurns: this.turns.length,
      summaries: this.summaries.length,
      tokens: countTokens(this.contextText()),
    };
  }
}

function scoreRelevance(query: string, docs: string[]): number[] {
  const queryWords = new Set(query.toLowerCase().split(/\s+/));
  if (queryWords.size === 0) return docs.map(() => 0);
  return docs.map((doc) => {
    const docWords = new Set(doc.toLowerCase().split(/\s+/));
    let overlap = 0;
    for (const w of queryWords) if (docWords.has(w)) overlap += 1;
    return Number((overlap / queryWords.size).toFixed(3));
  });
}

function runBudgetDemo(): void {
  process.stdout.write("=".repeat(60) + "\n  步骤 1：上下文预算管理器（Context Budget Manager）\n" + "=".repeat(60) + "\n");
  const budget = new ContextBudget(128_000, 4_000);
  budget.allocate("system_prompt", "You are a helpful assistant. ".repeat(20), 500);
  budget.allocate("tools", JSON.stringify(["read_file", "write_file", "search_code", "run_command"]), 2_000);
  budget.allocate("retrieved_docs", "The project uses PostgreSQL. ".repeat(50), 3_000);
  budget.allocate("history", "user: How? assistant: Check logs. ".repeat(20), 5_000);
  budget.allocate("query", "Fix the auth bug in JWT validation", 500);
  process.stdout.write(budget.report() + "\n");
}

function runReorderDemo(): void {
  process.stdout.write("\n" + "=".repeat(60) + "\n  步骤 2：中间信息丢失重排（Lost-in-the-middle reordering）\n" + "=".repeat(60) + "\n");
  const docs = [
    "Doc A: PostgreSQL connection pooling",
    "Doc B: Redis caching layer",
    "Doc C: CSS styling guide",
    "Doc D: Database migration scripts",
    "Doc E: CI/CD pipeline config",
    "Doc F: API authentication flow",
    "Doc G: Frontend routing",
  ];
  const scores = [0.95, 0.6, 0.05, 0.8, 0.3, 0.75, 0.1];
  const reordered = reorderLostInMiddle(docs, scores);
  process.stdout.write("\n  重排后（高相关度放在首尾，低相关度放在中间）:\n");
  for (let i = 0; i < reordered.length; i += 1) {
    const position = i < 2 ? "START" : i >= reordered.length - 2 ? "END" : "middle";
    process.stdout.write(`    [${position.padStart(6)}] ${reordered[i]}\n`);
  }
}

function runConversationDemo(): void {
  process.stdout.write("\n" + "=".repeat(60) + "\n  步骤 3：对话压缩（滑动窗口，sliding window）\n" + "=".repeat(60) + "\n");
  const conv = new ConversationManager(200);
  const exchanges: [string, string][] = [
    ["How do I set up the database?", "Run docker-compose up to start PostgreSQL, then run migrations."],
    ["What about environment variables?", "Copy .env.example to .env and fill in DATABASE_URL and JWT_SECRET."],
    ["The migrations are failing.", "Check PostgreSQL is on port 5432 and DATABASE_URL matches."],
    ["How do I seed test data?", "Run npm run seed which loads fixtures from test/fixtures."],
    ["Can I run the tests?", "Yes, run npm test. Use a separate test database."],
  ];
  exchanges.forEach(([user, assistant], idx) => {
    conv.addTurn("user", user);
    conv.addTurn("assistant", assistant);
    const stats = conv.stats();
    process.stdout.write(
      `\n  第 ${idx + 1} 轮后：保留轮次=${stats.liveTurns} 摘要数=${stats.summaries} 词元数=${stats.tokens}\n`,
    );
  });
  process.stdout.write("\n  最终上下文：\n");
  for (const line of conv.contextText().split("\n")) process.stdout.write(`    ${line}\n`);
}

function runRelevanceDemo(): void {
  process.stdout.write("\n" + "=".repeat(60) + "\n  步骤 4：相关度评分（Relevance scoring）\n" + "=".repeat(60) + "\n");
  const docs = [
    "Python 3.12 introduced type parameter syntax for generic classes.",
    "The project uses PostgreSQL 16 with pgvector for embedding storage.",
    "Authentication is handled by Supabase Auth with JWT tokens.",
    "The frontend is built with Next.js 15 using the App Router.",
    "API rate limits are 100 requests per minute per user.",
  ];
  const query = "How do I fix the JWT authentication token expiry bug?";
  const scores = scoreRelevance(query, docs);
  const ranked = docs.map((d, i) => ({ d, s: scores[i] ?? 0 })).sort((a, b) => b.s - a.s);
  process.stdout.write(`\n  查询：${query}\n\n`);
  for (const { d, s } of ranked) {
    const marker = s >= 0.05 ? "*" : " ";
    process.stdout.write(`    ${marker} ${s.toFixed(3)}  ${d}\n`);
  }
}

function main(): void {
  runBudgetDemo();
  runReorderDemo();
  runConversationDemo();
  runRelevanceDemo();
}

main();
