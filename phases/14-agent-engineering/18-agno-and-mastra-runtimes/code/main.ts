// 阶段 14，第 18 课——Agno 与 Mastra 运行时对比（TypeScript 版本）。
// 最小 Mastra 风格结构：智能体 + 工具注册表 + 工作流，并使用
// 模拟的 LLM 步骤；另以 Agno 风格结构作对比。仅依赖标准库；
// 原文中的真实 Mastra 包还集成 Zod、Vercel AI SDK 和遥测能力。
// 译注：本例不调用真实框架；Agno 对象在循环中复用，不是每次请求重新创建。
// 提示、工具结果和工作流输入保留英文，因为它们参与字符数估算和截断。
// mock reply 表示模拟回复；unknown tool 表示未知工具；missing field 表示缺少字段。
// 参考： https://mastra.ai/docs/agents/overview
//       https://mastra.ai/docs/workflows/overview
//       https://docs.agno.com/introduction
//       https://sdk.vercel.ai/docs/foundations/agents

import process from "node:process";

// --- 共用的 LLM 桩函数；真实 Mastra 可在此接入 Vercel AI SDK 的 generateText。

type LLMResponse = { text: string; inputTokens: number; outputTokens: number };

async function mockLLM(systemPrompt: string, userMessage: string): Promise<LLMResponse> {
  const inputTokens = Math.ceil((systemPrompt.length + userMessage.length) / 4);
  // 模拟网络延迟，不调用真实模型。
  await new Promise((r) => setTimeout(r, 5));
  return {
    text: `[mock reply to ${userMessage.slice(0, 60)}]`,
    inputTokens,
    outputTokens: 32,
  };
}

// --- Agno 风格：无状态智能体 + 会话存储。设计上可为每次请求创建新智能体，
// 历史记录保存在会话存储中（生产环境可使用数据库）；本演示实际复用同一对象。

type AgnoAgent = {
  name: string;
  run: (prompt: string) => Promise<string>;
};

class AgnoSession {
  private turns = new Map<string, string[]>();
  append(sessionId: string, turn: string): void {
    const list = this.turns.get(sessionId) ?? [];
    list.push(turn);
    this.turns.set(sessionId, list);
  }
  history(sessionId: string): string[] {
    return [...(this.turns.get(sessionId) ?? [])];
  }
}

async function agnoHandler(
  session: AgnoSession,
  agent: AgnoAgent,
  sessionId: string,
  prompt: string,
): Promise<{ reply: string; elapsedUs: number }> {
  const start = process.hrtime.bigint();
  session.append(sessionId, `user: ${prompt}`);
  const reply = await agent.run(prompt);
  session.append(sessionId, `assistant: ${reply}`);
  const elapsedUs = Number((process.hrtime.bigint() - start) / 1000n);
  return { reply, elapsedUs };
}

// --- Mastra 风格：智能体 + 工具 + 工作流。

type ToolInputSchema = Record<string, "string" | "number" | "boolean">;
type ToolInput = Record<string, string | number | boolean>;
type ToolResult = { output: string };

type MastraTool = {
  id: string;
  description: string;
  inputSchema: ToolInputSchema;
  execute: (input: ToolInput) => Promise<ToolResult>;
};

// 用轻量运行时检查拒绝结构不符的工具调用；真实 Mastra
// 在此使用 Zod 模式和推断出的 TypeScript 类型。
function checkSchema(schema: ToolInputSchema, input: ToolInput): string | null {
  for (const [key, expected] of Object.entries(schema)) {
    if (!(key in input)) return `missing field ${key}`;
    if (typeof input[key] !== expected) return `field ${key}: expected ${expected}, got ${typeof input[key]}`;
  }
  return null;
}

type ToolCall = { tool: string; input: ToolInput };
type AgentTrace = { tool: string; result: string }[];

class MastraAgent {
  constructor(
    readonly name: string,
    readonly instructions: string,
    private readonly tools: Map<string, MastraTool>,
  ) {}

  static withTools(name: string, instructions: string, tools: MastraTool[]): MastraAgent {
    const map = new Map<string, MastraTool>();
    for (const t of tools) map.set(t.id, t);
    return new MastraAgent(name, instructions, map);
  }

  async run(userMessage: string, calls: ToolCall[]): Promise<{ output: string; trace: AgentTrace; tokens: number }> {
    const trace: AgentTrace = [];
    let tokens = 0;

    // 智能体决定要调用哪些工具（本例预先给定）；成功调用
    // 向轨迹中追加一个步骤，失败调用则记录错误。
    for (const call of calls) {
      const tool = this.tools.get(call.tool);
      if (!tool) {
        trace.push({ tool: call.tool, result: "error: unknown tool" });
        continue;
      }
      const schemaError = checkSchema(tool.inputSchema, call.input);
      if (schemaError) {
        trace.push({ tool: call.tool, result: `error: ${schemaError}` });
        continue;
      }
      const { output } = await tool.execute(call.input);
      trace.push({ tool: call.tool, result: output });
    }

    // 最后的 LLM 步骤把工具轨迹和用户消息合成为回复。
    const traceText = trace.map((t) => `${t.tool}: ${t.result}`).join("\n");
    const reply = await mockLLM(this.instructions, `${userMessage}\n\nTool results:\n${traceText}`);
    tokens = reply.inputTokens + reply.outputTokens;
    return { output: reply.text, trace, tokens };
  }
}

// 工作流：有序的步骤列表，每一步接收上一步的输出。
type WorkflowStep<I, O> = { name: string; run: (input: I) => Promise<O> | O };

class MastraWorkflow {
  private steps: WorkflowStep<unknown, unknown>[] = [];
  addStep<I, O>(name: string, run: (input: I) => Promise<O> | O): MastraWorkflow {
    this.steps.push({ name, run: run as (input: unknown) => unknown });
    return this;
  }
  async run(initial: unknown): Promise<{ name: string; output: unknown }[]> {
    const trace: { name: string; output: unknown }[] = [];
    let current: unknown = initial;
    for (const step of this.steps) {
      current = await step.run(current);
      trace.push({ name: step.name, output: current });
    }
    return trace;
  }
}

// --- 演示

const searchTool: MastraTool = {
  id: "search",
  description: "在固定语料中模拟网页搜索",
  inputSchema: { query: "string" },
  execute: async (input) => ({ output: `3 results for ${String(input.query)}` }),
};

const summariseTool: MastraTool = {
  id: "summarise",
  description: "把文本压缩为一句话",
  inputSchema: { text: "string" },
  execute: async (input) => ({ output: `summary: ${String(input.text).slice(0, 40)}...` }),
};

async function main(): Promise<void> {
  process.stdout.write("=".repeat(70) + "\nAgno 与 Mastra 运行时——阶段 14，第 18 课\n" + "=".repeat(70) + "\n");

  // 1. Agno 风格——测量处理函数耗时；实际计时范围不含智能体创建。
  process.stdout.write("\n1. Agno 风格（无状态的 FastAPI 风格处理函数）\n");
  const session = new AgnoSession();
  const agnoAgent: AgnoAgent = {
    name: "agno_a",
    run: async (prompt) => `[agno reply] ${prompt.slice(0, 40)}`,
  };
  for (let i = 0; i < 3; i += 1) {
    const { reply, elapsedUs } = await agnoHandler(session, agnoAgent, "s001", `query ${i}: how do I ship an agent`);
    process.stdout.write(`  轮次 ${i}：${reply}  （处理函数 ${elapsedUs} us）\n`);
  }
  process.stdout.write(`  会话历史长度：${session.history("s001").length}\n`);
  process.stdout.write("  设计思路：按请求新建智能体，会话保存状态，FastAPI/Hono 处理层无状态；本例复用智能体。\n");

  // 2. Mastra 风格——智能体先执行工具，再总结结果。
  process.stdout.write("\n2. Mastra 风格（智能体 + 工具 + 工作流）\n");
  const mastraAgent = MastraAgent.withTools(
    "research_agent",
    "Search, summarise, cite",
    [searchTool, summariseTool],
  );
  const result = await mastraAgent.run("research agent engineering", [
    { tool: "search", input: { query: "agent engineering 2026" } },
    { tool: "search", input: { query: "BFCL V4 benchmarks" } },
    { tool: "unknown_tool", input: { query: "fails on purpose" } },
  ]);
  process.stdout.write(`  智能体输出：${result.output}  （约 ${result.tokens} 个词元）\n`);
  for (const t of result.trace) process.stdout.write(`    工具 ${t.tool}：${t.result}\n`);

  // 3. 工作流——归一化 → 搜索 → 总结。
  process.stdout.write("\n3. 运行工作流\n");
  const workflow = new MastraWorkflow()
    .addStep<string, string>("normalise", (p) => p.trim().toLowerCase())
    .addStep<string, string>("search", async (p) => (await searchTool.execute({ query: p })).output)
    .addStep<string, string>("summarise", async (p) => (await summariseTool.execute({ text: p })).output);
  const workflowTrace = await workflow.run("  Agent Engineering 2026  ");
  for (const { name, output } of workflowTrace) process.stdout.write(`    ${name}: ${String(output)}\n`);

  process.stdout.write("\n按技术栈选择（原文建议）：Python + FastAPI → Agno；TypeScript + Next/Vercel → Mastra。\n");
}

main();
