// TypeScript 函数调用（Function calling）：JSON-schema 工具定义、注册表、
// 校验器、沙箱分发器、模拟模型决策循环，以及并行调用。
// 对应 code/function_calling.py，遵循 OpenAI、Anthropic 和 Google 共同采用的
// 四步模式：定义、检测、执行、返回。
// 参考来源：
//   https://platform.openai.com/docs/guides/function-calling
//   https://docs.anthropic.com/en/docs/build-with-claude/tool-use
//   https://ai.google.dev/gemini-api/docs/function-calling

type JsonValue = string | number | boolean | null | JsonValue[] | { [k: string]: JsonValue };

type ParamType = "string" | "integer" | "number" | "boolean" | "array" | "object";

type ParamSchema = {
  type: ParamType;
  description?: string;
  enum?: readonly JsonValue[];
  default?: JsonValue;
};

type ToolParameters = {
  type: "object";
  properties: Readonly<Record<string, ParamSchema>>;
  required?: readonly string[];
};

type ToolDefinition = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: ToolParameters;
  };
};

type ToolFunction = (args: Readonly<Record<string, JsonValue>>) => JsonValue;

type RegisteredTool = {
  definition: ToolDefinition;
  fn: ToolFunction;
};

const TOOL_REGISTRY: Map<string, RegisteredTool> = new Map();

function registerTool(name: string, description: string, parameters: ToolParameters, fn: ToolFunction): void {
  TOOL_REGISTRY.set(name, {
    definition: { type: "function", function: { name, description, parameters } },
    fn,
  });
}

const ARITH_RE = /^[\d+\-*/().\s]+$/;

function calculator(args: Readonly<Record<string, JsonValue>>): JsonValue {
  const expression = String(args.expression ?? "");
  const precision = typeof args.precision === "number" ? args.precision : 2;
  if (!ARITH_RE.test(expression)) {
    return { error: true, message: "表达式中包含无效字符： " + expression };
  }
  try {
    // eslint-disable-next-line no-new-func
    const value = new Function("return (" + expression + ")")() as unknown;
    const num = Number(value);
    if (!Number.isFinite(num)) return { error: true, message: "结果不是有限数值" };
    return { result: Number(num.toFixed(precision)), expression };
  } catch (err) {
    return { error: true, message: String(err) };
  }
}

const WEATHER_DB: Readonly<Record<string, { temp_c: number; condition: string; humidity: number; wind_kph: number }>> = {
  tokyo: { temp_c: 18, condition: "cloudy", humidity: 72, wind_kph: 14 },
  "new york": { temp_c: 22, condition: "sunny", humidity: 45, wind_kph: 8 },
  london: { temp_c: 12, condition: "rainy", humidity: 88, wind_kph: 22 },
  "san francisco": { temp_c: 16, condition: "foggy", humidity: 80, wind_kph: 18 },
  sydney: { temp_c: 25, condition: "sunny", humidity: 55, wind_kph: 10 },
};

function getWeather(args: Readonly<Record<string, JsonValue>>): JsonValue {
  const city = String(args.city ?? "");
  const units = String(args.units ?? "celsius");
  const key = city.toLowerCase().trim();
  const row = WEATHER_DB[key];
  if (!row) {
    const suggestions = Object.keys(WEATHER_DB).filter((c) => c.startsWith(key.slice(0, 3)));
    return { error: true, message: "城市 '" + city + "' 不存在。", suggestions, code: "CITY_NOT_FOUND" };
  }
  if (units === "fahrenheit") {
    return { city, condition: row.condition, humidity: row.humidity, wind_kph: row.wind_kph, temp_f: Number((row.temp_c * 9 / 5 + 32).toFixed(1)) };
  }
  return { city, ...row };
}

const SEARCH_DB: Readonly<Record<string, ReadonlyArray<{ title: string; url: string; snippet: string }>>> = {
  "python function calling": [
    { title: "OpenAI Function Calling Guide", url: "https://platform.openai.com/docs/guides/function-calling", snippet: "Connect LLMs to external tools." },
    { title: "Anthropic Tool Use", url: "https://docs.anthropic.com/en/docs/build-with-claude/tool-use", snippet: "Claude can interact with tools and APIs." },
  ],
  "mcp protocol": [
    { title: "Model Context Protocol", url: "https://modelcontextprotocol.io", snippet: "Open standard connecting models to data sources." },
  ],
  "weather api": [
    { title: "OpenWeatherMap API", url: "https://openweathermap.org/api", snippet: "Free weather API." },
  ],
};

function webSearch(args: Readonly<Record<string, JsonValue>>): JsonValue {
  const query = String(args.query ?? "");
  const maxResults = typeof args.max_results === "number" ? args.max_results : 3;
  const key = query.toLowerCase().trim();
  for (const dbKey of Object.keys(SEARCH_DB)) {
    if (dbKey.includes(key) || key.includes(dbKey)) {
      const all = SEARCH_DB[dbKey];
      return { query, results: all.slice(0, maxResults), total: all.length };
    }
  }
  return { query, results: [], total: 0 };
}

const FILE_SYSTEM: Readonly<Record<string, string>> = {
  "data/config.json": '{"model": "gpt-4o", "temperature": 0.7, "max_tokens": 4096}',
  "data/users.csv": "name,email,role\nAlice,alice@example.com,admin\nBob,bob@example.com,user",
  "README.md": "# My Project\nA tool-use agent built from scratch.",
};

function readFile(args: Readonly<Record<string, JsonValue>>): JsonValue {
  const path = String(args.path ?? "");
  if (path.includes("..") || path.startsWith("/")) {
    return { error: true, message: "不允许路径遍历（Path traversal）。", code: "FORBIDDEN" };
  }
  if (!(path in FILE_SYSTEM)) {
    return { error: true, message: "文件 '" + path + "' 不存在。", available_files: Object.keys(FILE_SYSTEM), code: "NOT_FOUND" };
  }
  const content = FILE_SYSTEM[path];
  return { path, content, size_bytes: content.length, lines: content.split("\n").length };
}

function runCode(args: Readonly<Record<string, JsonValue>>): JsonValue {
  const code = String(args.code ?? "");
  const language = String(args.language ?? "javascript");
  if (language !== "javascript") {
    return { error: true, message: "语言 '" + language + "' 不受支持。" };
  }
  const FORBIDDEN = ["require(", "process.", "fs.", "child_process", "import ", "eval(", "Function("];
  for (const p of FORBIDDEN) {
    if (code.includes(p)) {
      return { error: true, message: "禁止的操作： " + p, code: "SECURITY_VIOLATION" };
    }
  }
  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function("Math", "let result; " + code + "; return result;");
    const result = fn(Math) as unknown;
    return { success: true, result: result as JsonValue };
  } catch (err) {
    return { error: true, message: (err as Error).name + ": " + (err as Error).message };
  }
}

function registerAllTools(): void {
  registerTool(
    "calculator",
    "Evaluate a math expression. Supports +, -, *, /, parentheses, decimals.",
    {
      type: "object",
      properties: {
        expression: { type: "string", description: "Math expression, e.g. '(10 + 5) * 3'" },
        precision: { type: "integer", description: "Decimal places", default: 2 },
      },
      required: ["expression"],
    },
    calculator,
  );
  registerTool(
    "get_weather",
    "Get current weather for a city.",
    {
      type: "object",
      properties: {
        city: { type: "string", description: "City name" },
        units: { type: "string", description: "celsius or fahrenheit", enum: ["celsius", "fahrenheit"] },
      },
      required: ["city"],
    },
    getWeather,
  );
  registerTool(
    "web_search",
    "Search the web.",
    {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query" },
        max_results: { type: "integer", description: "Max results", default: 3 },
      },
      required: ["query"],
    },
    webSearch,
  );
  registerTool(
    "read_file",
    "Read file contents.",
    {
      type: "object",
      properties: { path: { type: "string", description: "Relative path" } },
      required: ["path"],
    },
    readFile,
  );
  registerTool(
    "run_code",
    "Execute JavaScript in a sandbox. Assign to 'result' to return output.",
    {
      type: "object",
      properties: {
        code: { type: "string", description: "JavaScript code to run" },
        language: { type: "string", description: "javascript only", enum: ["javascript"] },
      },
      required: ["code"],
    },
    runCode,
  );
}

type ToolCall = { name: string; arguments: Readonly<Record<string, JsonValue>> };

function simulateModelDecision(userMessage: string): ToolCall[] {
  const msg = userMessage.toLowerCase();
  if (/weather|temperature|forecast/.test(msg)) {
    const cities = Object.keys(WEATHER_DB).filter((c) => msg.includes(c));
    const targets = cities.length > 0 ? cities : ["tokyo"];
    return targets.map((city) => ({
      name: "get_weather",
      arguments: { city: city.replace(/\b\w/g, (c) => c.toUpperCase()) },
    }));
  }
  if (/calculate|compute|math|what is|how much/.test(msg)) {
    const m = msg.match(/[\d+\-*/().\s]{3,}/);
    if (m) return [{ name: "calculator", arguments: { expression: m[0].trim() } }];
    return [{ name: "calculator", arguments: { expression: "0" } }];
  }
  if (/search|find|look up/.test(msg)) {
    const query = msg.replace(/search for|look up|find|search/g, "").trim();
    return [{ name: "web_search", arguments: { query } }];
  }
  if (/read|file|open|show/.test(msg)) {
    for (const path of Object.keys(FILE_SYSTEM)) {
      const stem = path.split("/").pop()?.split(".")[0] ?? "";
      if (stem.length > 0 && msg.includes(stem)) {
        return [{ name: "read_file", arguments: { path } }];
      }
    }
    return [{ name: "read_file", arguments: { path: "README.md" } }];
  }
  if (/run|execute|code|javascript/.test(msg)) {
    return [{ name: "run_code", arguments: { code: "result = 'Hello from the sandbox!'", language: "javascript" } }];
  }
  return [];
}

type ToolResult = { tool: string; result: JsonValue; executionTimeMs: number };

function executeToolCall(call: ToolCall): ToolResult {
  const tool = TOOL_REGISTRY.get(call.name);
  if (!tool) {
    return { tool: call.name, result: { error: true, message: "未知工具： " + call.name, code: "UNKNOWN_TOOL" }, executionTimeMs: 0 };
  }
  const start = Date.now();
  let result: JsonValue;
  try {
    result = tool.fn(call.arguments);
  } catch (err) {
    result = { error: true, message: "无效参数： " + (err as Error).message };
  }
  return { tool: call.name, result, executionTimeMs: Date.now() - start };
}

function validateToolArguments(toolName: string, args: unknown): string[] {
  const tool = TOOL_REGISTRY.get(toolName);
  if (!tool) return ["未知工具： " + toolName];
  if (args === null || typeof args !== "object" || Array.isArray(args)) {
    return ["参数必须为对象（object），实际为 " + typeof args];
  }
  const schema = tool.definition.function.parameters;
  const errors: string[] = [];
  for (const required of schema.required ?? []) {
    if (!(required in (args as Record<string, unknown>))) {
      errors.push("缺少必需参数： " + required);
    }
  }
  const typeChecks: Readonly<Record<ParamType, (v: unknown) => boolean>> = {
    string: (v) => typeof v === "string",
    integer: (v) => Number.isInteger(v),
    number: (v) => typeof v === "number",
    boolean: (v) => typeof v === "boolean",
    array: (v) => Array.isArray(v),
    object: (v) => v !== null && typeof v === "object" && !Array.isArray(v),
  };
  for (const [argName, argValue] of Object.entries(args as Record<string, unknown>)) {
    const prop = schema.properties[argName];
    if (!prop) {
      errors.push("未知参数： " + argName);
      continue;
    }
    if (!typeChecks[prop.type](argValue)) {
      errors.push("参数 '" + argName + "'：预期为 " + prop.type + "，实际为 " + typeof argValue);
    }
    if (prop.enum && !prop.enum.includes(argValue as JsonValue)) {
      errors.push("参数 '" + argName + "': '" + String(argValue) + "' 不在 " + JSON.stringify(prop.enum));
    }
  }
  return errors;
}

function runFunctionCallingLoop(userMessage: string): { toolResults: ToolResult[]; iterations: number } {
  const calls = simulateModelDecision(userMessage);
  if (calls.length === 0) return { toolResults: [], iterations: 0 };
  const results = calls.map((c) => executeToolCall(c));
  return { toolResults: results, iterations: 1 };
}

function main(): void {
  registerAllTools();
  console.log("=".repeat(60));
  console.log("  函数调用与工具使用（Function Calling and Tool Use）");
  console.log("=".repeat(60));

  console.log("\n--- 已注册工具（Registered Tools） ---");
  for (const [name, tool] of TOOL_REGISTRY) {
    const params = Object.keys(tool.definition.function.parameters.properties);
    console.log("  " + name + ": " + tool.definition.function.description.slice(0, 60) + " | 参数： " + params.join(","));
  }

  console.log("\n--- 参数校验（Argument Validation） ---");
  const validationTests: ReadonlyArray<{ tool: string; args: unknown; label: string }> = [
    { tool: "get_weather", args: { city: "Tokyo" }, label: "有效调用" },
    { tool: "get_weather", args: {}, label: "缺少必需参数" },
    { tool: "get_weather", args: { city: "Tokyo", units: "kelvin" }, label: "无效枚举值（enum value）" },
    { tool: "calculator", args: { expression: 123 }, label: "类型错误（以 number 代替 string）" },
    { tool: "unknown_tool", args: { x: 1 }, label: "未知工具" },
  ];
  for (const { tool, args, label } of validationTests) {
    const errors = validateToolArguments(tool, args);
    console.log("  " + label + ": " + (errors.length === 0 ? "VALID" : "错误： " + errors.join(" / ")));
  }

  console.log("\n--- 直接工具执行（Direct Tool Execution） ---");
  const directTests: readonly ToolCall[] = [
    { name: "calculator", arguments: { expression: "(10 + 5) * 3 / 2" } },
    { name: "get_weather", arguments: { city: "Tokyo" } },
    { name: "get_weather", arguments: { city: "Mars" } },
    { name: "web_search", arguments: { query: "python function calling" } },
    { name: "read_file", arguments: { path: "data/config.json" } },
    { name: "read_file", arguments: { path: "../etc/passwd" } },
    { name: "run_code", arguments: { code: "let s=0; for(let i=1;i<=100;i++) s+=i; result=s;" } },
    { name: "run_code", arguments: { code: "require('child_process').exec('ls')" } },
  ];
  for (const call of directTests) {
    const r = executeToolCall(call);
    const argsStr = JSON.stringify(call.arguments);
    const resStr = JSON.stringify(r.result).slice(0, 90);
    console.log("\n  " + call.name + "(" + argsStr.slice(0, 60) + ")");
    console.log("    -> " + resStr);
    console.log("    耗时：" + r.executionTimeMs + "ms");
  }

  console.log("\n--- 函数调用循环（Function Calling Loop） ---");
  const queries = [
    "What's the weather in Tokyo?",
    "Calculate (100 + 250) * 0.15",
    "Search for MCP protocol",
    "Read the config file",
    "Run some JavaScript code",
    "Tell me a joke",
  ];
  for (const q of queries) {
    const { toolResults, iterations } = runFunctionCallingLoop(q);
    console.log("\n  用户： " + q);
    for (const tr of toolResults) {
      console.log("    工具： " + tr.tool + " (" + tr.executionTimeMs + "ms)");
    }
    if (toolResults.length === 0) console.log("    [未调用工具]");
    console.log("    迭代次数： " + iterations);
  }

  console.log("\n--- 并行工具调用（Parallel Tool Calls） ---");
  const { toolResults: multi } = runFunctionCallingLoop("What's the weather in tokyo and london?");
  console.log("  已执行工具调用数： " + multi.length);
  for (const tr of multi) {
    const r = tr.result as Record<string, JsonValue>;
    console.log("    " + String(r.city) + ": " + String(r.temp_c ?? r.temp_f) + ", " + String(r.condition));
  }

  console.log("\n--- 安全检查（Security Checks） ---");
  const securityTests: ReadonlyArray<{ tool: string; args: Record<string, JsonValue> }> = [
    { tool: "read_file", args: { path: "../../etc/passwd" } },
    { tool: "run_code", args: { code: "process.exit(0)" } },
    { tool: "calculator", args: { expression: "Function('return 1')()" } },
  ];
  for (const { tool, args } of securityTests) {
    const r = executeToolCall({ name: tool, arguments: args });
    const blocked = typeof r.result === "object" && r.result !== null && (r.result as Record<string, JsonValue>).error === true;
    const firstArg = Object.values(args)[0];
    const argDisplay = String(firstArg).slice(0, 40);
    console.log("  " + tool + "(" + argDisplay + "): " + (blocked ? "BLOCKED" : "ALLOWED"));
  }
}

main();
