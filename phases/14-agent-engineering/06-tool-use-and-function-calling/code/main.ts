// 第 14 阶段第 06 课——TypeScript 实现的工具使用（Tool use）与函数调用（Function calling）。
//
// 使用标准库实现工具注册表（Tool registry），支持 JSON 结构定义（JSON Schema）子集校验与并行分派。
// 子集：必填字段、string/integer/number/boolean/array/object、
// enum、minimum/maximum。每次校验失败都会转为结构化
// 观察结果（Observation），以便智能体重试。
//
// 参考资料：
//   OpenAI 函数调用   https://platform.openai.com/docs/guides/function-calling
//   Anthropic 工具使用        https://docs.anthropic.com/en/docs/build-with-claude/tool-use
//   JSON Schema 2020-12       https://json-schema.org/draft/2020-12
//
// 运行： npx tsx code/main.ts

type Primitive = "integer" | "number" | "boolean" | "string" | "array" | "object";

type PropSchema = {
  type: Primitive;
  enum?: unknown[];
  minimum?: number;
  maximum?: number;
};

type ToolInputSchema = {
  type: "object";
  properties: Record<string, PropSchema>;
  required?: string[];
};

type ToolArgs = Record<string, unknown>;

type ToolDef = {
  name: string;
  description: string;
  inputSchema: ToolInputSchema;
  executor: (args: ToolArgs) => string;
  timeoutMs?: number;
};

type ToolCall = {
  toolUseId: string;
  name: string;
  args: ToolArgs;
};

type ToolResult = {
  toolUseId: string;
  ok: boolean;
  content: string;
};

function describeType(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (typeof value === "number" && Number.isInteger(value)) return "integer";
  return typeof value;
}

function coerce(value: unknown, schema: PropSchema): { value: unknown; error: string | null } {
  const t = schema.type;
  if (t === "integer") {
    if (typeof value === "number" && Number.isInteger(value)) return { value, error: null };
    if (typeof value === "string") {
      const parsed = Number(value);
      if (Number.isInteger(parsed)) return { value: parsed, error: null };
      return { value, error: `无法将字符串 ${JSON.stringify(value)} 转换为整数（Integer）` };
    }
    return { value, error: `需要整数（Integer），实际为 ${describeType(value)}` };
  }
  if (t === "number") {
    if (typeof value === "number") return { value, error: null };
    if (typeof value === "string") {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return { value: parsed, error: null };
      return { value, error: `无法将字符串 ${JSON.stringify(value)} 转换为数值（Number）` };
    }
    return { value, error: `需要数值（Number），实际为 ${describeType(value)}` };
  }
  if (t === "boolean") {
    if (typeof value === "boolean") return { value, error: null };
    return { value, error: `需要布尔值（Boolean），实际为 ${describeType(value)}` };
  }
  if (t === "string") {
    if (typeof value === "string") return { value, error: null };
    return { value, error: `需要字符串（String），实际为 ${describeType(value)}` };
  }
  if (t === "array") {
    if (Array.isArray(value)) return { value, error: null };
    return { value, error: `需要数组（Array），实际为 ${describeType(value)}` };
  }
  if (t === "object") {
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      return { value, error: null };
    }
    return { value, error: `需要对象（Object），实际为 ${describeType(value)}` };
  }
  return { value, error: null };
}

function validate(args: ToolArgs, schema: ToolInputSchema): { out: ToolArgs; errors: string[] } {
  const errors: string[] = [];
  const props = schema.properties;
  const required = schema.required ?? [];
  const out: ToolArgs = {};

  for (const name of required) {
    if (!(name in args)) errors.push(`缺少必填字段：${name}`);
  }

  for (const [name, value] of Object.entries(args)) {
    const prop = props[name];
    if (!prop) {
      errors.push(`未知字段：${name}`);
      continue;
    }
    const { value: coerced, error } = coerce(value, prop);
    if (error) {
      errors.push(`${name}: ${error}`);
      continue;
    }
    if (prop.enum && !prop.enum.includes(coerced as never)) {
      errors.push(`${name}: ${JSON.stringify(coerced)} 不在允许值中 ${JSON.stringify(prop.enum)}`);
      continue;
    }
    if (prop.type === "number" || prop.type === "integer") {
      const numVal = coerced as number;
      if (prop.minimum !== undefined && numVal < prop.minimum) {
        errors.push(`${name}: ${numVal} < 最小值（minimum） ${prop.minimum}`);
        continue;
      }
      if (prop.maximum !== undefined && numVal > prop.maximum) {
        errors.push(`${name}: ${numVal} > 最大值（maximum） ${prop.maximum}`);
        continue;
      }
    }
    out[name] = coerced;
  }

  return { out, errors };
}

class ToolRegistry {
  private tools = new Map<string, ToolDef>();

  register(tool: ToolDef): void {
    this.tools.set(tool.name, tool);
  }

  catalog(): Array<Pick<ToolDef, "name" | "description" | "inputSchema">> {
    return [...this.tools.values()].map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
    }));
  }

  dispatch(call: ToolCall): ToolResult {
    const tool = this.tools.get(call.name);
    if (!tool) {
      return { toolUseId: call.toolUseId, ok: false, content: `错误：未知工具 ${JSON.stringify(call.name)}` };
    }
    const { out, errors } = validate(call.args, tool.inputSchema);
    if (errors.length > 0) {
      return {
        toolUseId: call.toolUseId,
        ok: false,
        content: `校验错误：${errors.join("; ")}`,
      };
    }
    try {
      return { toolUseId: call.toolUseId, ok: true, content: tool.executor(out) };
    } catch (err) {
      const e = err as Error;
      return {
        toolUseId: call.toolUseId,
        ok: false,
        content: `执行错误：${e.name}: ${e.message}`,
      };
    }
  }

  dispatchMany(calls: ToolCall[]): ToolResult[] {
    return calls.map((c) => this.dispatch(c));
  }
}

function add(args: ToolArgs): string {
  const a = args.a as number;
  const b = args.b as number;
  return String(a + b);
}

function multiply(args: ToolArgs): string {
  const a = args.a as number;
  const b = args.b as number;
  return String(a * b);
}

function classify(args: ToolArgs): string {
  return `分类为 ${args.status as string}`;
}

function main(): void {
  console.log("=".repeat(70));
  console.log("工具使用（Tool use）与函数调用（Function calling）——第 14 阶段，第 06 课（TypeScript 移植版）");
  console.log("=".repeat(70));

  const reg = new ToolRegistry();
  reg.register({
    name: "add",
    description: "将两个整数 a 和 b 相加。适用于任意整数加法。",
    inputSchema: {
      type: "object",
      properties: { a: { type: "integer" }, b: { type: "integer" } },
      required: ["a", "b"],
    },
    executor: add,
  });
  reg.register({
    name: "multiply",
    description: "将两个整数 a 和 b 相乘。优先使用乘法，而非循环累加。",
    inputSchema: {
      type: "object",
      properties: { a: { type: "integer" }, b: { type: "integer" } },
      required: ["a", "b"],
    },
    executor: multiply,
  });
  reg.register({
    name: "classify",
    description: "将状态归入允许的标签之一。",
    inputSchema: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["open", "closed", "pending"] },
      },
      required: ["status"],
    },
    executor: classify,
  });

  console.log("\n工具目录（呈现给模型的内容）");
  for (const entry of reg.catalog()) {
    console.log(`  - ${entry.name}: ${entry.description}`);
  }

  const calls: ToolCall[] = [
    { toolUseId: "u01", name: "add", args: { a: 2, b: 3 } },
    { toolUseId: "u02", name: "multiply", args: { a: "4", b: 5 } },
    { toolUseId: "u03", name: "classify", args: { status: "in_progress" } },
    { toolUseId: "u04", name: "classify", args: { status: "open" } },
    { toolUseId: "u05", name: "subtract", args: { a: 1, b: 2 } },
  ];

  console.log("\n并行分派（Parallel dispatch，一轮内调用 5 次）");
  for (const result of reg.dispatchMany(calls)) {
    const tag = result.ok ? "通过 " : "错误";
    console.log(`  ${result.toolUseId} ${tag}: ${result.content}`);
  }

  console.log();
  console.log("观察结果的形式：每次校验失败均返回结构化错误字符串，");
  console.log("供智能体读取并据此重试，绝不向循环抛出异常。");
}

main();
