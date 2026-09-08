// 第 14 阶段第 01 课——TypeScript 实现的教学用 ReAct 智能体循环（Agent loop）。
//
// 对应 code/main.py：消息缓冲区（Message buffer）、工具注册表（Tool registry）、
// 停止条件（Stop condition）、轮次预算（Turn budget）和观察结果格式化器（Observation formatter）。
// 模型使用预设脚本式 ToyLLM，因此循环可离线运行且结果确定；
// 替换为真实服务商客户端后，控制流仍完全相同。
//
// 参考资料：
//   ReAct 论文          https://arxiv.org/abs/2210.03629
//   Anthropic 智能体    https://www.anthropic.com/engineering/building-effective-agents
//
// 运行：npx tsx code/main.ts

type ToolFn = (args: Record<string, string>) => string;

type ToolCall = {
  name: string;
  args: Record<string, string>;
};

type Turn = {
  kind: "user" | "thought" | "action" | "final";
  content: string;
  toolCall?: ToolCall;
  observation?: string;
};

class ToolRegistry {
  private tools = new Map<string, ToolFn>();

  register(name: string, fn: ToolFn): void {
    this.tools.set(name, fn);
  }

  names(): string[] {
    return [...this.tools.keys()].sort();
  }

  dispatch(call: ToolCall): string {
    const fn = this.tools.get(call.name);
    if (!fn) return `错误：未知工具 ${JSON.stringify(call.name)}`;
    try {
      return fn(call.args);
    } catch (err) {
      const e = err as Error;
      return `错误：${e.name}：${e.message}`;
    }
  }
}

function calculator(args: Record<string, string>): string {
  const expr = args.expr;
  if (typeof expr !== "string") return "错误：缺少 expr";
  if (!/^[0-9+\-*/(). ]+$/.test(expr)) {
    return "错误：expr 中存在非法字符";
  }
  try {
    const fn = new Function(`"use strict"; return (${expr});`);
    const value = fn();
    if (typeof value !== "number" || !Number.isFinite(value)) {
      return `错误：${expr} 的结果不是有限数值`;
    }
    return String(value);
  } catch (err) {
    const e = err as Error;
    return `错误：${e.name}：${e.message}`;
  }
}

class KVStore {
  private store = new Map<string, string>();

  get = (args: Record<string, string>): string => {
    const key = args.key;
    if (!this.store.has(key)) return `missing:${key}`;
    return this.store.get(key) as string;
  };

  set = (args: Record<string, string>): string => {
    this.store.set(args.key, args.value);
    return `已存储 ${args.key}`;
  };
}

type ScriptEntry =
  | { kind: "action"; thought: string; action: string; args: Record<string, string> }
  | { kind: "finish"; content: string };

// 预设脚本式 ReAct 策略。每次调用返回一轮助手响应。
// 替换为服务商客户端后，循环保持不变。
class ToyLLM {
  private cursor = 0;
  constructor(private script: ScriptEntry[]) {}

  respond(_history: Turn[]): ScriptEntry {
    if (this.cursor >= this.script.length) {
      return { kind: "finish", content: "没有更多动作" };
    }
    return this.script[this.cursor++];
  }
}

class AgentLoop {
  history: Turn[] = [];

  constructor(
    private llm: ToyLLM,
    private tools: ToolRegistry,
    private maxTurns = 12,
  ) {}

  run(userMessage: string): string {
    this.history.push({ kind: "user", content: userMessage });
    for (let step = 0; step < this.maxTurns; step++) {
      const reply = this.llm.respond(this.history);
      if (reply.kind === "finish") {
        this.history.push({ kind: "final", content: reply.content });
        return reply.content;
      }
      this.history.push({ kind: "thought", content: reply.thought });
      const call: ToolCall = { name: reply.action, args: reply.args };
      const observation = this.tools.dispatch(call);
      this.history.push({
        kind: "action",
        content: call.name,
        toolCall: call,
        observation,
      });
    }
    this.history.push({ kind: "final", content: "预算已耗尽" });
    return "预算已耗尽";
  }

  toolNames(): string[] {
    return this.tools.names();
  }
}

function prettyTrace(history: Turn[]): void {
  history.forEach((turn, i) => {
    const tag = `[${String(i).padStart(2, "0")} ${turn.kind.padStart(7)}]`;
    if (turn.kind === "user" || turn.kind === "thought" || turn.kind === "final") {
      console.log(`${tag} ${turn.content}`);
    } else if (turn.kind === "action" && turn.toolCall) {
      const argText = JSON.stringify(turn.toolCall.args);
      console.log(`${tag} ${turn.toolCall.name}(${argText}) -> ${turn.observation}`);
    }
  });
}

function buildDemoAgent(): AgentLoop {
  const tools = new ToolRegistry();
  tools.register("calculator", calculator);
  const kv = new KVStore();
  tools.register("kv_get", kv.get);
  tools.register("kv_set", kv.set);

  const script: ScriptEntry[] = [
    {
      kind: "action",
      thought: "存储基础价格",
      action: "kv_set",
      args: { key: "base", value: "120" },
    },
    {
      kind: "action",
      thought: "计算 15% 的税额",
      action: "calculator",
      args: { expr: "120 * 0.15" },
    },
    {
      kind: "action",
      thought: "存储税额",
      action: "kv_set",
      args: { key: "tax", value: "18.0" },
    },
    {
      kind: "action",
      thought: "计算总额",
      action: "calculator",
      args: { expr: "120 + 18.0" },
    },
    {
      kind: "action",
      thought: "确认已存储的值",
      action: "kv_get",
      args: { key: "base" },
    },
    { kind: "finish", content: "含 15% 税额的总额为 138.0" },
  ];
  return new AgentLoop(new ToyLLM(script), tools, 10);
}

function main(): void {
  console.log("=".repeat(70));
  console.log("教学用 ReAct 循环——第 14 阶段，第 01 课（TypeScript 移植版）");
  console.log("=".repeat(70));

  const agent = buildDemoAgent();
  const final = agent.run("120 加上 15% 的税额是多少？请存入 kv。");
  console.log();
  prettyTrace(agent.history);
  console.log();
  console.log(`最终答案：${final}`);
  const actions = agent.history.filter((t) => t.kind === "action").length;
  console.log(`已用轮次：${actions}`);
  console.log(`使用的工具：${JSON.stringify(agent.toolNames())}`);
}

main();
