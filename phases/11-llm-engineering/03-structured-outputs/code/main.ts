// 阶段 11 · 第 03 课: 结构化输出（Structured outputs，TypeScript 移植版）。
// Zod 风格的模式领域专用语言（Schema DSL）+ 验证器 + 带重试的模拟 LLM 提取器。
// 直接内联模式层而不引入 zod，使课程保持无外部依赖；
// API（`.parse`、`.safeParse`）对应真实 zod 的接口。
// 参考资料: https://zod.dev/?id=basic-usage
//       https://docs.anthropic.com/en/docs/build-with-claude/tool-use
//       https://platform.openai.com/docs/guides/structured-outputs

import process from "node:process";

type ValidationIssue = { path: string; message: string };
type ParseResult<T> = { ok: true; value: T } | { ok: false; issues: ValidationIssue[] };

// 所有模式实现相同契约（Contract）: 接收 unknown，返回 ParseResult。
interface Schema<T> {
  parse(input: unknown, path?: string): ParseResult<T>;
  toJSONSchema(): Record<string, unknown>;
}

function ok<T>(value: T): ParseResult<T> {
  return { ok: true, value };
}
function fail<T>(issues: ValidationIssue[]): ParseResult<T> {
  return { ok: false, issues };
}

class StringSchema implements Schema<string> {
  constructor(
    private opts: { enum?: readonly string[]; minLength?: number } = {},
  ) {}
  parse(input: unknown, path = ""): ParseResult<string> {
    if (typeof input !== "string") {
      return fail([{ path, message: `期望字符串（String），实际为 ${typeof input}` }]);
    }
    if (this.opts.minLength !== undefined && input.length < this.opts.minLength) {
      return fail([{ path, message: `字符串长度小于 ${this.opts.minLength}` }]);
    }
    if (this.opts.enum && !this.opts.enum.includes(input)) {
      return fail([
        { path, message: `${JSON.stringify(input)} 不在允许值中 [${this.opts.enum.join(", ")}]` },
      ]);
    }
    return ok(input);
  }
  toJSONSchema() {
    const out: Record<string, unknown> = { type: "string" };
    if (this.opts.enum) out.enum = [...this.opts.enum];
    if (this.opts.minLength !== undefined) out.minLength = this.opts.minLength;
    return out;
  }
}

class NumberSchema implements Schema<number> {
  constructor(private opts: { minimum?: number; maximum?: number; integer?: boolean } = {}) {}
  parse(input: unknown, path = ""): ParseResult<number> {
    if (typeof input !== "number" || Number.isNaN(input)) {
      return fail([{ path, message: `期望数值（Number），实际为 ${typeof input}` }]);
    }
    if (this.opts.integer && !Number.isInteger(input)) {
      return fail([{ path, message: `期望整数（Integer），实际为 ${input}` }]);
    }
    if (this.opts.minimum !== undefined && input < this.opts.minimum) {
      return fail([{ path, message: `${input} 小于最小值 ${this.opts.minimum}` }]);
    }
    if (this.opts.maximum !== undefined && input > this.opts.maximum) {
      return fail([{ path, message: `${input} 大于最大值 ${this.opts.maximum}` }]);
    }
    return ok(input);
  }
  toJSONSchema() {
    const out: Record<string, unknown> = { type: this.opts.integer ? "integer" : "number" };
    if (this.opts.minimum !== undefined) out.minimum = this.opts.minimum;
    if (this.opts.maximum !== undefined) out.maximum = this.opts.maximum;
    return out;
  }
}

class BoolSchema implements Schema<boolean> {
  parse(input: unknown, path = ""): ParseResult<boolean> {
    if (typeof input !== "boolean") {
      return fail([{ path, message: `期望布尔值（Boolean），实际为 ${typeof input}` }]);
    }
    return ok(input);
  }
  toJSONSchema() {
    return { type: "boolean" };
  }
}

class ArraySchema<T> implements Schema<T[]> {
  constructor(
    private item: Schema<T>,
    private opts: { minItems?: number; maxItems?: number } = {},
  ) {}
  parse(input: unknown, path = ""): ParseResult<T[]> {
    if (!Array.isArray(input)) {
      return fail([{ path, message: `期望数组（Array），实际为 ${typeof input}` }]);
    }
    if (this.opts.minItems !== undefined && input.length < this.opts.minItems) {
      return fail([{ path, message: `数组长度 ${input.length} < ${this.opts.minItems}` }]);
    }
    if (this.opts.maxItems !== undefined && input.length > this.opts.maxItems) {
      return fail([{ path, message: `数组长度 ${input.length} > ${this.opts.maxItems}` }]);
    }
    const issues: ValidationIssue[] = [];
    const out: T[] = [];
    for (let i = 0; i < input.length; i += 1) {
      const child = this.item.parse(input[i], `${path}[${i}]`);
      if (!child.ok) issues.push(...child.issues);
      else out.push(child.value);
    }
    return issues.length ? fail(issues) : ok(out);
  }
  toJSONSchema() {
    const out: Record<string, unknown> = { type: "array", items: this.item.toJSONSchema() };
    if (this.opts.minItems !== undefined) out.minItems = this.opts.minItems;
    if (this.opts.maxItems !== undefined) out.maxItems = this.opts.maxItems;
    return out;
  }
}

type ObjectShape = Record<string, { schema: Schema<unknown>; required: boolean }>;

class ObjectSchema<S extends ObjectShape> implements Schema<{ [K in keyof S]: unknown }> {
  constructor(private shape: S) {}
  parse(input: unknown, path = ""): ParseResult<{ [K in keyof S]: unknown }> {
    if (input === null || typeof input !== "object" || Array.isArray(input)) {
      return fail([{ path, message: `期望对象（Object），实际为 ${typeof input}` }]);
    }
    const issues: ValidationIssue[] = [];
    const out: Record<string, unknown> = {};
    const record = input as Record<string, unknown>;
    for (const [key, field] of Object.entries(this.shape)) {
      const childPath = path ? `${path}.${key}` : key;
      if (!(key in record)) {
        if (field.required) issues.push({ path: childPath, message: "缺少必填字段" });
        continue;
      }
      const child = field.schema.parse(record[key], childPath);
      if (!child.ok) issues.push(...child.issues);
      else out[key] = child.value;
    }
    return issues.length ? fail(issues) : ok(out as { [K in keyof S]: unknown });
  }
  toJSONSchema() {
    const properties: Record<string, unknown> = {};
    const required: string[] = [];
    for (const [key, field] of Object.entries(this.shape)) {
      properties[key] = field.schema.toJSONSchema();
      if (field.required) required.push(key);
    }
    return { type: "object", properties, required };
  }
}

const z = {
  string: (opts?: ConstructorParameters<typeof StringSchema>[0]) => new StringSchema(opts),
  number: (opts?: ConstructorParameters<typeof NumberSchema>[0]) => new NumberSchema(opts),
  integer: () => new NumberSchema({ integer: true }),
  boolean: () => new BoolSchema(),
  array: <T>(item: Schema<T>, opts?: ConstructorParameters<typeof ArraySchema>[1]) =>
    new ArraySchema(item, opts),
  object: <S extends ObjectShape>(shape: S) => new ObjectSchema(shape),
  field: <T>(schema: Schema<T>, required = true) => ({ schema: schema as Schema<unknown>, required }),
};

const ProductSchema = z.object({
  product: z.field(z.string({ minLength: 1 })),
  price: z.field(z.number({ minimum: 0 })),
  in_stock: z.field(z.boolean()),
  categories: z.field(z.array(z.string()), false),
});

// 模拟 LLM。针对 "headphones" 的第一次尝试故意返回错误内容，
// 以便触发重试循环。
function simulateLLM(text: string, attempt: number): string {
  const t = text.toLowerCase();
  if (t.includes("headphones") || t.includes("sony")) {
    if (attempt === 0) {
      return 'Here is the JSON:\n```\n{"product": "Sony WH-1000XM5", "price": "348.00", "in_stock": true}\n```';
    }
    return '{"product": "Sony WH-1000XM5", "price": 348, "in_stock": true, "categories": ["audio", "headphones"]}';
  }
  if (t.includes("macbook") || t.includes("laptop")) {
    return '{"product": "MacBook Pro 16", "price": 2499, "in_stock": false, "categories": ["computers"]}';
  }
  if (t.includes("keyboard")) {
    return '{"product": "Keychron Q1", "price": 169, "in_stock": true, "categories": ["peripherals"]}';
  }
  return '{"product": "Unknown", "price": 0, "in_stock": false}';
}

// 去除真实模型常添加的 Markdown 围栏和开场文字。
function extractJSONBlock(raw: string): string {
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) return fence[1]!.trim();
  const first = raw.indexOf("{");
  const last = raw.lastIndexOf("}");
  if (first >= 0 && last > first) return raw.slice(first, last + 1);
  return raw.trim();
}

type Product = { product: string; price: number; in_stock: boolean; categories?: string[] };

function extractWithRetry(text: string, maxRetries = 3): Product | null {
  for (let attempt = 0; attempt < maxRetries; attempt += 1) {
    const raw = simulateLLM(text, attempt);
    let parsed: unknown;
    try {
      parsed = JSON.parse(extractJSONBlock(raw));
    } catch (err) {
      process.stdout.write(`    尝试 ${attempt + 1}: JSON 解析错误 — ${(err as Error).message}\n`);
      continue;
    }
    const result = ProductSchema.parse(parsed);
    if (result.ok) return result.value as Product;
    process.stdout.write(
      `    尝试 ${attempt + 1}: 模式（Schema）错误 — ${result.issues.map((i) => i.message).join("; ")}\n`,
    );
  }
  return null;
}

function runSchemaDemo(): void {
  process.stdout.write("=".repeat(60) + "\n  步骤 1: 模式验证（Schema validation）\n" + "=".repeat(60) + "\n");
  const cases: { data: unknown; label: string }[] = [
    { data: { product: "Sony WH-1000XM5", price: 348, in_stock: true }, label: "有效的最小对象" },
    { data: { product: "Test", price: -5, in_stock: true }, label: "价格为负数" },
    { data: { product: "Test", in_stock: true }, label: "缺少价格" },
    { data: { product: 123, price: 10, in_stock: true }, label: "将数值用作产品名称" },
    { data: { product: "Test", price: 10, in_stock: "yes" }, label: "将字符串用作布尔值" },
  ];
  for (const c of cases) {
    const result = ProductSchema.parse(c.data);
    const status = result.ok ? "PASS" : `FAIL: ${result.issues.map((i) => i.message).join("; ")}`;
    process.stdout.write(`  ${c.label}: ${status}\n`);
  }
}

function runJSONSchemaDemo(): void {
  process.stdout.write("\n" + "=".repeat(60) + "\n  步骤 2: 模式（Schema）→ JSON Schema（用于服务商 API）\n" + "=".repeat(60) + "\n");
  process.stdout.write(JSON.stringify(ProductSchema.toJSONSchema(), null, 2) + "\n");
}

function runExtractionDemo(): void {
  process.stdout.write("\n" + "=".repeat(60) + "\n  步骤 3: 带重试的提取（Extraction with retry）\n" + "=".repeat(60) + "\n");
  const inputs = [
    "The Sony WH-1000XM5 headphones are priced at $348 and currently in stock.",
    "The new MacBook Pro 16 laptop costs $2499 but is sold out.",
    "I just bought a Keychron Q1 keyboard for $169.",
    "This sentence has no product information at all.",
  ];
  for (const text of inputs) {
    process.stdout.write(`\n  输入（Input）: ${text.slice(0, 70)}...\n`);
    const result = extractWithRetry(text);
    process.stdout.write(`  输出（Output）: ${result ? JSON.stringify(result) : "重试后仍失败"}\n`);
  }
}

function main(): void {
  runSchemaDemo();
  runJSONSchemaDemo();
  runExtractionDemo();
}

main();
