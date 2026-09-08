# 为什么使用多智能体（Why Multi-Agent?）

> 一个智能体（Agent）碰到能力边界时，明智的做法不是换成更大的智能体，而是使用更多智能体。

**Type:** Learn
**Languages:** TypeScript
**Prerequisites:** Phase 14 智能体工程（Agent Engineering）
**Time:** ~60 分钟

## 学习目标（Learning Objectives）

- 识别单智能体能力上限（Single-agent ceiling），包括上下文溢出、专业能力混杂和串行瓶颈，并说明何时适合拆分为多个智能体
- 比较编排模式（Orchestration pattern）：流水线、并行扇出、监督者和层级结构，并为给定任务结构选择合适模式
- 设计具有明确角色边界、共享状态（Shared state）和通信契约（Communication contract）的多智能体系统
- 分析多智能体的复杂性（延迟、成本、调试难度）与单智能体的简单性之间的权衡

## 问题（The Problem）

你在阶段 14 构建了一个单智能体。它能够工作：读取文件、运行命令、调用 API，并对结果进行推理。接着，你让它处理一个真实代码库：200 个文件、三种语言、依赖基础设施的测试，而且编写代码之前还需要研究外部 API。

智能体应付不来了。这不是因为大语言模型（Large Language Model，LLM）愚笨，而是任务超出了单个智能体循环（Agent loop）的处理能力。文件内容塞满上下文窗口（Context Window）。智能体忘记了 40 次工具调用之前读过的内容。它试图同时担任研究员、程序员和评审员，结果三项都做不好。

这就是单智能体能力上限。只要任务有以下要求，你就会碰到它：

- **上下文超出单个窗口的容量**：读取 50 个文件会突破 200k 词元（Token）
- **不同阶段需要不同专业能力**：研究所需的提示词与代码生成不同
- **工作可以并行执行**：能够同时读取三个文件，为什么还要串行读取？

## 概念（The Concept）

### 单智能体能力上限（The Single-Agent Ceiling）

单智能体只有一个循环、一个上下文窗口和一个系统提示词（System prompt）。如下图所示：

```
┌─────────────────────────────────────────┐
│          单智能体（SINGLE AGENT）        │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │      上下文窗口（Context Window） │  │
│  │                                   │  │
│  │  研究笔记                         │  │
│  │  + 代码文件                       │  │
│  │  + 测试输出                       │  │
│  │  + 审查反馈                       │  │
│  │  + API 文档                       │  │
│  │  + ...                            │  │
│  │                                   │  │
│  │  ██████████████████████ 已满 ███   │  │
│  └───────────────────────────────────┘  │
│                                         │
│  一个系统提示试图覆盖                   │
│  研究 + 编码 + 审查 + 测试              │
│                                         │
│  结果：每个方面都表现平庸               │
└─────────────────────────────────────────┘
```

三个方面会出问题：

1. **上下文饱和（Context saturation）**：工具结果不断累积。到第 30 轮，文件内容、命令输出和先前推理已占用 150k 词元。第 5 轮的重要细节被遗忘。

2. **角色混淆（Role confusion）**：系统提示词说“你是研究员、程序员、评审员和测试员”，结果智能体研究做一半、代码写一半，评审始终无法完成。

3. **串行瓶颈（Sequential bottleneck）**：智能体先读文件 A，再读 B，再读 C。三次串行 LLM 调用、三次串行工具执行，没有并行。

### 多智能体解决方案（The Multi-Agent Solution）

拆分工作。为每个智能体分配一项工作、一个上下文窗口，以及一个针对该工作调校的系统提示词：

```
┌──────────────────────────────────────────────────────────┐
│                  编排器（ORCHESTRATOR）                  │
│                                                          │
│  “构建用于用户管理的 REST API”                           │
│                                                          │
│         ┌──────────┬──────────┬──────────┐               │
│         │          │          │          │               │
│         ▼          ▼          ▼          ▼               │
│   ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐     │
│   │  研究者  │ │  编码者  │ │  审查者  │ │  测试者  │     │
│   │          │ │          │ │          │ │          │     │
│   │ 阅读     │ │ 根据     │ │ 检查     │ │ 运行     │     │
│   │ 文档，   │ │ 研究     │ │ 代码     │ │ 测试，   │     │
│   │ 寻找     │ │ 和规范   │ │ 质量，   │ │ 报告     │     │
│   │ 模式     │ │ 编写     │ │ 发现     │ │ 结果     │     │
│   │          │ │ 代码     │ │ 缺陷     │ │          │     │
│   └─────┬────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘     │
│         │           │            │            │          │
│         └───────────┴────────────┴────────────┘          │
│                          │                               │
│                       合并结果                           │
└──────────────────────────────────────────────────────────┘
```

每个智能体都有：
- 聚焦的系统提示词（“你是代码评审员。你唯一的工作是找出缺陷。”）
- 自己的上下文窗口（不受其他智能体工作内容污染）
- 明确的输入输出契约（接收研究笔记，输出代码）

### 采用这种方式的真实系统（Real Systems That Do This）

**Claude Code 子智能体（Subagent）**：Claude Code 使用 `Task` 创建子智能体时，会为其限定任务范围。父智能体保持自身上下文整洁，子智能体专注完成工作并返回摘要。

**Devin**：运行规划智能体、编码智能体和浏览器智能体。规划者将工作拆成步骤，编码者编写代码，浏览器智能体研究文档。各自具有独立上下文。

**多智能体编码团队（SWE-bench）**：SWE-bench 上表现领先的系统使用研究员读取代码库、规划者设计修复方案、编码者实现方案。单智能体系统的得分更低。

**ChatGPT Deep Research**：并行创建多个搜索智能体，各自探索不同角度，然后综合结果。

### 复杂度谱系（The Spectrum）

多智能体不是非此即彼的选择，而是一条连续谱系：

```
简单 ──────────────────────────────────────────────── 复杂

 单个         子智能体      流水线         团队         群体
 智能体

 ┌───┐       ┌───┐        ┌───┐───┐    ┌───┐───┐    ┌─┐┌─┐┌─┐
 │ A │       │ A │        │ A │ B │    │ A │ B │    │ ││ ││ │
 └───┘       └─┬─┘        └───┘─┬─┘    └─┬─┘─┬─┘    └┬┘└┬┘└┬┘
               │                │        │   │       ┌┴──┴──┴┐
             ┌─┴─┐          ┌───┘───┐    │   │       │ 共享  │
             │ a │          │ C │ D │  ┌─┴───┴─┐    │ 状态  │
             └───┘          └───┘───┘  │  消息  │    └───────┘
                                       │  总线  │
 1 个循环    父任务 +     逐阶段        │        │    N 个对等体，
 1 个上下文  子任务       执行          └────────┘    涌现行为
                                        显式角色
```

**单智能体（Single agent）**：一个循环、一个提示词，适合简单任务。

**子智能体（Subagents）**：父智能体为聚焦的子任务创建子智能体。父智能体维护计划，子智能体汇报结果。Claude Code 就采用这种方式。

**流水线（Pipeline）**：智能体依次运行。智能体 A 的输出成为 B 的输入。适合分阶段工作流：研究 -> 编码 -> 评审 -> 测试。

**团队（Team）**：智能体通过共享消息总线（Message bus）并行运行，各有角色，由编排者（Orchestrator）协调。适合同时需要不同技能的情况。

**群体（Swarm）**：许多相同或近似的智能体共享状态，没有固定编排者。智能体从队列领取工作，适合高吞吐量并行任务。

### 四种多智能体模式（The Four Multi-Agent Patterns）

#### 模式 1：流水线（Pipeline）

```
输入 ──▶ 智能体 A ──▶ 智能体 B ──▶ 智能体 C ──▶ 输出
          （研究）     （编码）     （审查）
```

每个智能体转换数据并向下一环传递。这种模式易于理解；一个阶段失败会阻塞其余阶段。

#### 模式 2：扇出 / 扇入（Fan-out / Fan-in）

```
                ┌──▶ 智能体 A ──┐
                │                │
输入 ──▶ 拆分 ──┼──▶ 智能体 B ──┼──▶ 合并 ──▶ 输出
                │                │
                └──▶ 智能体 C ──┘
```

把工作拆给并行智能体，再合并结果。适合能够拆成独立子任务的工作。

#### 模式 3：编排者与工作者（Orchestrator-Worker）

```
                    ┌──────────┐
                    │  编排器  │
                    └──┬───┬───┘
                  任务 │   │ 任务
                 ┌─────┘   └─────┐
                 ▼               ▼
           ┌──────────┐   ┌──────────┐
           │ 工作者 A │   │ 工作者 B │
           └──────────┘   └──────────┘
```

具备判断能力的编排者决定做什么，将工作委派给工作者（Worker），并综合结果。编排者本身也是智能体，拥有创建工作者的工具。

#### 模式 4：对等群体（Peer Swarm）

```
         ┌───┐ ◄──── 消息 ───▶ ┌───┐
         │ A │                  │ B │
         └─┬─┘                  └─┬─┘
           │                      │
      消息 │    ┌───────────┐     │ 消息
           └───▶│   共享    │◄────┘
                │   状态    │
           ┌───▶│  / 队列   │◄────┐
           │    └───────────┘     │
      消息 │                      │ 消息
         ┌─┴─┐                  ┌─┴─┐
         │ C │ ◄──── 消息 ───▶ │ D │
         └───┘                  └───┘
```

没有中心编排者。智能体之间进行对等通信（Peer-to-peer），决策从交互中涌现。这种模式更难调试，但可扩展到大量智能体。

### 何时不应使用多智能体（When NOT to Use Multi-Agent）

多智能体会增加复杂度。智能体间每条消息都可能成为故障点。调试从“读一段对话”变成“追踪五个智能体之间的消息”。

**以下情况应继续使用单智能体：**
- 任务能放进一个上下文窗口（工作数据少于约 100k 词元）
- 不需要为不同阶段使用不同系统提示词
- 串行执行已经足够快
- 任务足够简单，拆分带来的开销超过价值

**复杂性的代价：**
- 每个智能体边界都是一次有损压缩（Lossy compression）：A 的完整上下文被概括成发给 B 的消息
- 协调逻辑（谁做什么、何时做、按什么顺序）本身就是缺陷来源
- 延迟增加：N 个智能体意味着至少 N 次串行 LLM 调用；需要来回交流时还会更多
- 成本成倍增加：每个智能体独立消耗词元

经验法则：若任务需要少于 20 次工具调用，且能放进 100k 词元，就继续使用单智能体。

```figure
swarm-messages
```

## 动手实现（Build It）

### 第 1 步：过载的单智能体（The Overloaded Single Agent）

下面的单智能体试图包办一切。它拥有一个庞大的系统提示词，以及一个同时容纳研究、代码和评审的上下文窗口：

```typescript
type AgentResult = {
  content: string;
  tokensUsed: number;
  toolCalls: number;
};

async function singleAgentApproach(task: string): Promise<AgentResult> {
  const systemPrompt = `You are a full-stack developer. You must:
1. Research the requirements
2. Write the code
3. Review the code for bugs
4. Write tests
Do ALL of these in a single conversation.`;

  const contextWindow: string[] = [];
  let totalTokens = 0;
  let totalToolCalls = 0;

  const research = await fakeLLMCall(systemPrompt, `Research: ${task}`);
  contextWindow.push(research.output);
  totalTokens += research.tokens;
  totalToolCalls += research.calls;

  const code = await fakeLLMCall(
    systemPrompt,
    `Given this research:\n${contextWindow.join("\n")}\n\nNow write code for: ${task}`
  );
  contextWindow.push(code.output);
  totalTokens += code.tokens;
  totalToolCalls += code.calls;

  const review = await fakeLLMCall(
    systemPrompt,
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
```

这种做法的问题：
- 上下文窗口中的内容随阶段推进而增长。到了评审步骤，里面同时有研究笔记、代码和先前推理。
- 系统提示词过于通用，无法针对每个阶段调校。
- 没有任何并行执行。

### 第 2 步：专职智能体（Specialist Agents）

现在将工作拆开，每个智能体只负责一项工作：

```typescript
type SpecialistAgent = {
  name: string;
  systemPrompt: string;
  run: (input: string) => Promise<AgentResult>;
};

function createSpecialist(name: string, systemPrompt: string): SpecialistAgent {
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

const researcher = createSpecialist(
  "researcher",
  "You are a technical researcher. Read documentation, find patterns, and summarize findings. Output only the facts needed for implementation."
);

const coder = createSpecialist(
  "coder",
  "You are a senior TypeScript developer. Given requirements and research notes, write clean, tested code. Nothing else."
);

const reviewer = createSpecialist(
  "reviewer",
  "You are a code reviewer. Find bugs, security issues, and logic errors. Be specific. Cite line numbers."
);
```

每个专职智能体都有聚焦的提示词，并获得只包含所需输入的干净上下文窗口。

### 第 3 步：通过消息协调（Coordinate Through Messages）

通过显式消息传递（Message passing）连接各个专职智能体：

```typescript
type AgentMessage = {
  from: string;
  to: string;
  content: string;
  timestamp: number;
};

async function multiAgentApproach(task: string): Promise<AgentResult> {
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
    content: messages.map((m) => `[${m.from} -> ${m.to}]: ${m.content}`).join("\n\n"),
    tokensUsed: totalTokens,
    toolCalls: totalToolCalls,
  };
}
```

每个智能体只接收发给自己的消息，不会污染上下文。研究员阅读的 50k 词元文档永远不会进入评审员的上下文。

### 第 4 步：比较（Compare）

```typescript
async function compare() {
  const task = "Build a rate limiter middleware for an Express.js API";

  console.log("=== Single Agent ===");
  const single = await singleAgentApproach(task);
  console.log(`Tokens: ${single.tokensUsed}`);
  console.log(`Tool calls: ${single.toolCalls}`);

  console.log("\n=== Multi-Agent ===");
  const multi = await multiAgentApproach(task);
  console.log(`Tokens: ${multi.tokensUsed}`);
  console.log(`Tool calls: ${multi.toolCalls}`);
}
```

多智能体版本消耗更多总词元（三个智能体、三次独立 LLM 调用），但每个智能体的上下文保持整洁。系统提示词经过专门设计，因此每个阶段的质量都有提升。

## 实际应用（Use It）

本课产出一份可复用的提示词，用于判断何时采用多智能体。参见 `outputs/prompt-multi-agent-decision.md`。

## 练习（Exercises）

1. 添加第四个专职智能体：“测试员”接收编码者的代码和评审员的反馈，然后编写测试
2. 修改流水线，让评审员能够把反馈发回编码者，形成修改循环（最多 2 轮）
3. 将串行流水线改为扇出：并行运行研究员和“需求分析员”智能体，合并输出后再交给编码者

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|------|----------------|----------------------|
| 群体（Swarm） | “AI 智能体的集体意识” | 一组共享状态、没有固定领导者的对等智能体。行为由局部交互涌现。 |
| 编排者（Orchestrator） | “老板智能体” | 工具包括创建和管理其他智能体的智能体。它负责规划与委派，但未必亲自执行工作。 |
| 协调器（Coordinator） | “交通警察” | 按规则在智能体之间路由消息的非智能体组件（通常只是代码，而非 LLM）。 |
| 共识（Consensus） | “智能体达成一致” | 要求多个智能体先达成一致才能继续的协议，用于解决输出冲突。 |
| 涌现行为（Emergent behavior） | “智能体自己想明白了” | 由智能体交互产生、未经显式编程的系统级模式，可能有益，也可能有害。 |
| 扇出 / 扇入（Fan-out / fan-in） | “智能体的映射归约” | 把任务拆给并行智能体（扇出），再合并它们的结果（扇入）。 |
| 消息传递（Message passing） | “智能体相互交流” | 智能体间的通信机制：从一个智能体向另一个发送结构化数据，取代共享上下文窗口。 |

## 延伸阅读（Further Reading）

- [新兴 AI 智能体架构全景（The Landscape of Emerging AI Agent Architectures）](https://arxiv.org/abs/2409.02977)：多智能体模式综述
- [AutoGen：赋能下一代 LLM 应用（AutoGen: Enabling Next-Gen LLM Applications）](https://arxiv.org/abs/2308.08155)：Microsoft 的多智能体对话框架
- [Claude Code 子智能体文档（Claude Code subagents documentation）](https://docs.anthropic.com/en/docs/claude-code)：Claude Code 如何通过 Task 委派工作
- [CrewAI 文档（CrewAI documentation）](https://docs.crewai.com/)：基于角色的多智能体框架
