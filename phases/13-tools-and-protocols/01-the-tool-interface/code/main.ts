// 阶段 13 第 01 课：TypeScript 实现的工具接口（Tool interface）。
//
// 对应 code/main.py：描述 -> 决策 -> 执行 -> 观察。
// 通过关键词路由器模拟“决策”步骤，使循环能够离线运行；
// 替换为任意真实服务商客户端后，结构保持一致。
//
// 规范参考：
//   OpenAI 工具调用（Tool calling）     https://platform.openai.com/docs/guides/function-calling
//   Anthropic 工具使用（Tool use）      https://docs.anthropic.com/en/docs/build-with-claude/tool-use
//   MCP 工具原语（Tool primitive）      https://modelcontextprotocol.io/specification/2026-07-28
//
// 运行： npx tsx code/main.ts

import { randomUUID } from "node:crypto";

const MAX_TURNS = 5;

type JsonSchema = {
  type?: "object" | "string" | "number" | "integer" | "boolean" | "array";
  properties?: Record<string, JsonSchema>;
  required?: string[];
  enum?: unknown[];
};

type ToolArgs = Record<string, unknown>;
type ToolResult = Record<string, unknown>;

type Tool = {
  name: string;
  description: string;
  inputSchema: JsonSchema;
  executor: (args: ToolArgs) => ToolResult;
  consequential?: boolean;
};

type HistoryEntry =
  | { role: "user"; content: string }
  | { role: "tool"; id: string; name: string; content: string };

type ToolCall = {
  id: string;
  name: string;
  arguments: ToolArgs;
};

type Decision = { content: string } | { toolCalls: ToolCall[] };

function toolAdd(args: ToolArgs): ToolResult {
  const a = args.a as number;
  const b = args.b as number;
  return { sum: a + b };
}

function toolGetTime(args: ToolArgs): ToolResult {
  const timezone = (args.timezone as string | undefined) ?? "UTC";
  const now = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  return { now, timezone };
}

function toolGetWeather(args: ToolArgs): ToolResult {
  const fake: Record<string, number> = {
    Bengaluru: 28,
    Tokyo: 12,
    Zurich: 4,
    Lagos: 31,
  };
  const city = args.city as string;
  const units = (args.units as string | undefined) ?? "celsius";
  const temp = fake[city] ?? 20;
  return { city, temp, units };
}

const REGISTRY: Tool[] = [
  {
    name: "add",
    description:
      "用户要求计算两个数之和时使用。" +
      "不要用于减法、乘法或符号代数（Symbolic algebra）。",
    inputSchema: {
      type: "object",
      properties: {
        a: { type: "number" },
        b: { type: "number" },
      },
      required: ["a", "b"],
    },
    executor: toolAdd,
  },
  {
    name: "get_time",
    description:
      "用户询问当前时间时使用。" +
      "不要用于查询历史日期或安排未来日程。",
    inputSchema: {
      type: "object",
      properties: {
        timezone: { type: "string" },
      },
      required: [],
    },
    executor: toolGetTime,
  },
  {
    name: "get_weather",
    description:
      "用户询问指定城市的当前天气时使用。" +
      "不要用于天气预报或历史天气数据。",
    inputSchema: {
      type: "object",
      properties: {
        city: { type: "string" },
        units: { type: "string", enum: ["celsius", "fahrenheit"] },
      },
      required: ["city"],
    },
    executor: toolGetWeather,
  },
];

function validate(schema: JsonSchema, value: unknown): string[] {
  const errors: string[] = [];
  const t = schema.type;

  if (t === "object") {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      return [`预期为对象（Object），实际为 ${describeType(value)}`];
    }
    const obj = value as Record<string, unknown>;
    for (const field of schema.required ?? []) {
      if (!(field in obj)) errors.push(`缺少必填字段 '${field}'`);
    }
    for (const [key, sub] of Object.entries(schema.properties ?? {})) {
      if (key in obj) errors.push(...validate(sub, obj[key]));
    }
    return errors;
  }

  if (t === "number" && typeof value !== "number") {
    errors.push(`预期为数值（Number），实际为 ${describeType(value)}`);
  }
  if (t === "string" && typeof value !== "string") {
    errors.push(`预期为字符串（String），实际为 ${describeType(value)}`);
  }
  if (schema.enum && !schema.enum.includes(value as never)) {
    errors.push(`值 ${JSON.stringify(value)} 不在枚举（Enum）中 ${JSON.stringify(schema.enum)}`);
  }
  return errors;
}

function describeType(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

function newCallId(): string {
  return `call_${randomUUID().replace(/-/g, "").slice(0, 8)}`;
}

// 模型的替身。根据关键词路由，使循环能够离线运行。
// 生产环境替代方式：换成返回相同结构的服务商调用。
function fakeDecide(userMsg: string, history: HistoryEntry[]): Decision {
  const last = history[history.length - 1];
  if (last && last.role === "tool") {
    return { content: `根据工具输出生成的最终回答：${last.content}` };
  }
  const msg = userMsg.toLowerCase();

  if (/\b(add|sum|plus)\b/.test(msg)) {
    const nums = (msg.match(/-?\d+\.?\d*/g) ?? []).map((n) => Number(n));
    if (nums.length >= 2) {
      return {
        toolCalls: [
          { id: newCallId(), name: "add", arguments: { a: nums[0], b: nums[1] } },
        ],
      };
    }
  }

  if (msg.includes("time")) {
    return {
      toolCalls: [
        { id: newCallId(), name: "get_time", arguments: { timezone: "UTC" } },
      ],
    };
  }

  const weatherMatch = msg.match(/weather in (\w+)/);
  if (weatherMatch) {
    const city = weatherMatch[1][0].toUpperCase() + weatherMatch[1].slice(1);
    return {
      toolCalls: [
        {
          id: newCallId(),
          name: "get_weather",
          arguments: { city, units: "celsius" },
        },
      ],
    };
  }

  return { content: "无法将该查询路由至任何已注册工具。" };
}

function runLoop(userMsg: string): void {
  console.log("=".repeat(72));
  console.log(`用户： ${userMsg}`);
  console.log("-".repeat(72));

  const toolsByName = new Map(REGISTRY.map((t) => [t.name, t]));
  const history: HistoryEntry[] = [{ role: "user", content: userMsg }];

  for (let turn = 1; turn <= MAX_TURNS; turn++) {
    const decision = fakeDecide(userMsg, history);

    if ("content" in decision) {
      console.log(`第 ${turn} 轮 决策（Decide）：最终回答`);
      console.log(`模型： ${decision.content}`);
      return;
    }

    for (const call of decision.toolCalls) {
      const tool = toolsByName.get(call.name);
      console.log(`第 ${turn} 轮 决策（Decide）：调用 ${call.name} id=${call.id}`);
      console.log(`           参数 = ${JSON.stringify(call.arguments)}`);

      if (!tool) {
        console.log(`           错误：未知工具 ${call.name}`);
        return;
      }
      const errs = validate(tool.inputSchema, call.arguments);
      if (errs.length > 0) {
        console.log(`           验证错误：${JSON.stringify(errs)}`);
        return;
      }
      if (tool.consequential) {
        console.log("           门禁（Gate）：该工具会产生实际影响，需要确认");
      }

      const start = performance.now();
      const result = tool.executor(call.arguments);
      const ms = performance.now() - start;
      console.log(
        `第 ${turn} 轮 执行（Execute）： ${tool.name} -> ${JSON.stringify(result)} [${ms.toFixed(2)} ms]`,
      );
      history.push({
        role: "tool",
        id: call.id,
        name: tool.name,
        content: JSON.stringify(result),
      });
    }
    console.log(`第 ${turn} 轮 观察（Observe）：历史记录长度 = ${history.length}`);
  }
  console.log("循环已终止：触发 MAX_TURNS 熔断器（Circuit breaker）");
}

function describeRegistry(): void {
  console.log("工具注册表（Tool registry）");
  console.log("-".repeat(72));
  for (const t of REGISTRY) {
    const kind = t.consequential ? "有实际影响（Consequential）" : "纯函数（Pure）";
    console.log(`  ${t.name.padEnd(14)} [${kind}] - ${t.description}`);
  }
  console.log();
}

function main(): void {
  console.log("=".repeat(72));
  console.log("阶段 13 第 01 课：工具接口（The Tool Interface） （TypeScript 移植版）");
  console.log("=".repeat(72));
  describeRegistry();
  const queries = [
    "please add 7 and 35",
    "what time is it?",
    "tell me the weather in Bengaluru",
    "write me a haiku about tea",
  ];
  for (const q of queries) {
    runLoop(q);
    console.log();
  }
}

main();
