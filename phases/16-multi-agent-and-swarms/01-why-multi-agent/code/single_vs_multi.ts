/**
 * 阶段 16，第 1 课：为什么使用多智能体。
 * 比较单智能体、多智能体串行流水线和并行分派三种协作结构。
 * 这里的 fakeLLMCall 只休眠、拼接占位回答并生成随机调用次数，不连接模型或工具。
 * 译注：词元数按 JavaScript 字符串长度粗略估算，不是分词器的实际计数。
 * 因此提示词、占位回答前缀和智能体之间传递的载荷保持英文，并附中文解释，
 * 避免翻译改变本例要对比的数值。累计词元数也不等于任一时刻的上下文窗口占用。
 * 单智能体提示词虽然要求写测试，执行流程实际只有研究、编码、审阅三次调用。
 * 并行分派版会运行审阅者并统计费用，但返回的消息列表没有加入审阅结果；保留原行为。
 */

type LLMResponse = {
  output: string;
  tokens: number;
  calls: number;
};

type AgentResult = {
  content: string;
  tokensUsed: number;
  toolCalls: number;
};

type AgentMessage = {
  from: string;
  to: string;
  content: string;
  timestamp: number;
};

type SpecialistAgent = {
  name: string;
  systemPrompt: string;
  run: (input: string) => Promise<AgentResult>;
};

// 模拟一次模型调用：按输入长度估算词元，返回截断输入的占位回答。
async function fakeLLMCall(
  systemPrompt: string,
  userMessage: string
): Promise<LLMResponse> {
  const inputLength = systemPrompt.length + userMessage.length;
  const simulatedTokens = Math.floor(inputLength / 4) + 500;

  await new Promise((resolve) => setTimeout(resolve, 50));

  return {
    // 占位回答：“针对以下输入的回答”。此文本会被后续阶段接收，长度影响词元估算。
    output: `[Response to: ${userMessage.slice(0, 80)}...]`,
    tokens: simulatedTokens,
    calls: Math.floor(Math.random() * 5) + 1,
  };
}

async function singleAgentApproach(task: string): Promise<AgentResult> {
  // 系统提示词：你是全栈开发者，依次研究需求、编码、审阅和编写测试，全部在一个对话中完成。
  const systemPrompt = `You are a full-stack developer. You must:
1. Research the requirements
2. Write the code
3. Review the code for bugs
4. Write tests
Do ALL of these in a single conversation.`;

  const contextWindow: string[] = [];
  let totalTokens = 0;
  let totalToolCalls = 0;

  // 第一步：研究指定任务。
  const research = await fakeLLMCall(systemPrompt, `Research: ${task}`);
  contextWindow.push(research.output);
  totalTokens += research.tokens;
  totalToolCalls += research.calls;

  const code = await fakeLLMCall(
    systemPrompt,
    // 第二步：给定研究结果，为任务编写代码。
    `Given this research:\n${contextWindow.join("\n")}\n\nNow write code for: ${task}`
  );
  contextWindow.push(code.output);
  totalTokens += code.tokens;
  totalToolCalls += code.calls;

  const review = await fakeLLMCall(
    systemPrompt,
    // 第三步：给定此前全部上下文，审阅代码。
    `Given all previous context:\n${contextWindow.join("\n")}\n\nReview the code.`
  );
  contextWindow.push(review.output);
  totalTokens += review.tokens;
  totalToolCalls += review.calls;

  return {
    content: contextWindow.join("\n---\n"),
    tokensUsed: totalTokens,
    toolCalls: totalToolCalls,
  };
}

function createSpecialist(
  name: string,
  systemPrompt: string
): SpecialistAgent {
  return {
    name,
    systemPrompt,
    run: async (input: string) => {
      const result = await fakeLLMCall(systemPrompt, input);
      return {
        content: result.output,
        tokensUsed: result.tokens,
        toolCalls: result.calls,
      };
    },
  };
}

// 研究者提示词：阅读技术文档、寻找模式并总结，只输出实现需要的事实。
const researcher = createSpecialist(
  "researcher",
  "You are a technical researcher. Read documentation, find patterns, and summarize findings. Output only the facts needed for implementation."
);

// 编码者提示词：依据需求和研究笔记，编写整洁且经过测试的 TypeScript 代码，不输出其他内容。
const coder = createSpecialist(
  "coder",
  "You are a senior TypeScript developer. Given requirements and research notes, write clean, tested code. Nothing else."
);

// 审阅者提示词：找出缺陷、安全问题和逻辑错误，说明具体问题并标出行号。
const reviewer = createSpecialist(
  "reviewer",
  "You are a code reviewer. Find bugs, security issues, and logic errors. Be specific. Cite line numbers."
);

// 串行流水线：研究者 -> 编码者 -> 审阅者 -> 编排器。from/to 等字段是路由契约。
async function multiAgentPipeline(task: string): Promise<AgentResult> {
  const messages: AgentMessage[] = [];
  let totalTokens = 0;
  let totalToolCalls = 0;

  const researchResult = await researcher.run(task);
  messages.push({
    from: "researcher",
    to: "coder",
    content: researchResult.content,
    timestamp: Date.now(),
  });
  totalTokens += researchResult.tokensUsed;
  totalToolCalls += researchResult.toolCalls;

  const coderInput = messages
    .filter((m) => m.to === "coder")
    .map((m) => `[From ${m.from}]: ${m.content}`)
    .join("\n");

  const codeResult = await coder.run(coderInput);
  messages.push({
    from: "coder",
    to: "reviewer",
    content: codeResult.content,
    timestamp: Date.now(),
  });
  totalTokens += codeResult.tokensUsed;
  totalToolCalls += codeResult.toolCalls;

  const reviewerInput = messages
    .filter((m) => m.to === "reviewer")
    .map((m) => `[From ${m.from}]: ${m.content}`)
    .join("\n");

  const reviewResult = await reviewer.run(reviewerInput);
  messages.push({
    from: "reviewer",
    to: "orchestrator",
    content: reviewResult.content,
    timestamp: Date.now(),
  });
  totalTokens += reviewResult.tokensUsed;
  totalToolCalls += reviewResult.toolCalls;

  return {
    content: messages
      .map((m) => `[${m.from} -> ${m.to}]: ${m.content}`)
      .join("\n\n"),
    tokensUsed: totalTokens,
    toolCalls: totalToolCalls,
  };
}

// 并行分派：同时研究技术方案和提取需求，然后编码、审阅。
async function multiAgentFanOut(task: string): Promise<AgentResult> {
  const messages: AgentMessage[] = [];
  let totalTokens = 0;
  let totalToolCalls = 0;

  const [researchResult, requirementsResult] = await Promise.all([
    // 研究指定任务的技术方案。
    researcher.run(`Research technical approach for: ${task}`),
    createSpecialist(
      "requirements",
      // 需求分析者提示词：全面提取功能需求与非功能需求。
      "You are a requirements analyst. Extract functional and non-functional requirements. Be exhaustive."
    // 分析指定任务的需求。
    ).run(`Analyze requirements for: ${task}`),
  ]);

  messages.push({
    from: "researcher",
    to: "coder",
    content: researchResult.content,
    timestamp: Date.now(),
  });
  messages.push({
    from: "requirements",
    to: "coder",
    content: requirementsResult.content,
    timestamp: Date.now(),
  });
  totalTokens += researchResult.tokensUsed + requirementsResult.tokensUsed;
  totalToolCalls += researchResult.toolCalls + requirementsResult.toolCalls;

  const coderInput = messages
    .filter((m) => m.to === "coder")
    .map((m) => `[From ${m.from}]: ${m.content}`)
    .join("\n");

  const codeResult = await coder.run(coderInput);
  messages.push({
    from: "coder",
    to: "reviewer",
    content: codeResult.content,
    timestamp: Date.now(),
  });
  totalTokens += codeResult.tokensUsed;
  totalToolCalls += codeResult.toolCalls;

  const reviewResult = await reviewer.run(codeResult.content);
  totalTokens += reviewResult.tokensUsed;
  totalToolCalls += reviewResult.toolCalls;

  return {
    content: messages
      .map((m) => `[${m.from} -> ${m.to}]: ${m.content}`)
      .join("\n\n"),
    tokensUsed: totalTokens,
    toolCalls: totalToolCalls,
  };
}

async function main() {
  // 任务夹具：为 Express.js API 构建限流中间件；保留英文以保持字符预算不变。
  const task = "Build a rate limiter middleware for an Express.js API";

  console.log("=== 单智能体方案 ===\n");
  const singleResult = await singleAgentApproach(task);
  console.log(`词元估算值：${singleResult.tokensUsed}`);
  console.log(`模拟工具调用次数：${singleResult.toolCalls}`);
  console.log(`上下文：所有阶段共享同一窗口\n`);

  console.log("=== 多智能体流水线 ===\n");
  const pipelineResult = await multiAgentPipeline(task);
  console.log(`词元估算值：${pipelineResult.tokensUsed}`);
  console.log(`模拟工具调用次数：${pipelineResult.toolCalls}`);
  console.log(`上下文：每个智能体只接收所需信息\n`);

  console.log("=== 多智能体并行分派 ===\n");
  const fanOutResult = await multiAgentFanOut(task);
  console.log(`词元估算值：${fanOutResult.tokensUsed}`);
  console.log(`模拟工具调用次数：${fanOutResult.toolCalls}`);
  console.log(`上下文：研究与需求分析并行执行\n`);

  console.log("=== 对比 ===\n");
  console.log(
    `单智能体累计估算词元：${singleResult.tokensUsed}；各阶段共享上下文`
  );
  console.log(
    `多智能体隔离：3 个独立上下文的累计估算词元为 ${pipelineResult.tokensUsed}`
  );
  console.log(
    `并行分派：研究与需求分析同时启动`
  );
}

main();
