// 阶段 0 · 第 04 课：API 与密钥（Keys），TypeScript 移植版。
// 从环境变量读取 ANTHROPIC_API_KEY，解析一个最简 .env 文件，随后通过全局 fetch
// 调用一次 /v1/messages。设置 MOCK=1 可完全跳过网络请求。
// 参考资料：https://docs.anthropic.com/en/api/messages
//       https://nodejs.org/api/process.html#processenv
//       https://nodejs.org/api/globals.html#fetch （Node 18+ 内置 fetch）

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";


type MessagesRequest = {
  model: string;
  max_tokens: number;
  messages: { role: "user" | "assistant"; content: string }[];
};

type MessagesResponse = {
  content: { type: string; text: string }[];
  usage: { input_tokens: number; output_tokens: number };
};

// .env 加载器（Loader）。沿用各框架的通用格式；不引入依赖，以保持可移植性。
// 每行使用 KEY=VALUE，# 表示注释，值两侧的引号可省略。
function loadDotenv(path: string): Record<string, string> {
  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch {
    return {};
  }
  const out: Record<string, string> = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

function mergeEnv(): NodeJS.ProcessEnv {
  // process.env 优先，用户无需编辑文件即可覆盖其中的值。
  const fromFile = loadDotenv(resolve(process.cwd(), ".env"));
  return { ...fromFile, ...process.env };
}

// 测试夹具（Fixture）与真实 /v1/messages 响应结构一致，
// 因此无论是否设置 MOCK=1，周边代码都相同。
const MOCK_RESPONSE: MessagesResponse = {
  content: [
    {
      type: "text",
      text: "A neural network is a stack of differentiable functions that learns patterns by adjusting weights against a loss signal.",
    },
  ],
  usage: { input_tokens: 12, output_tokens: 28 },
};

async function callMessages(apiKey: string, request: MessagesRequest): Promise<MessagesResponse> {
  if (process.env.MOCK === "1" || apiKey === "mock") {
    return MOCK_RESPONSE;
  }

  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(request),
  });

  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`anthropic ${resp.status}: ${body.slice(0, 200)}`);
  }
  return (await resp.json()) as MessagesResponse;
}

async function main(): Promise<number> {
  const env = mergeEnv();
  const model = (env.LLM_MODEL ?? "").trim() || "claude-sonnet-5";
  const apiKey = env.ANTHROPIC_API_KEY ?? "mock";
  const usingMock = process.env.MOCK === "1" || apiKey === "mock";

  process.stdout.write("=== API 调用（API Calls）===\n\n");
  process.stdout.write(
    usingMock
      ? "模式：MOCK（不联网）。要发起真实调用，请取消设置 MOCK 并导出 ANTHROPIC_API_KEY。\n\n"
      : "模式：LIVE（真实调用）。\n\n",
  );

  const request: MessagesRequest = {
    model,
    max_tokens: 256,
    messages: [{ role: "user", content: "What is a neural network in one sentence?" }],
  };

  try {
    const response = await callMessages(apiKey, request);
    const text = response.content[0]?.text ?? "";
    process.stdout.write(`响应（Response）：${text}\n`);
    process.stdout.write(
      `词元（Token）用量：输入 ${response.usage.input_tokens}，输出 ${response.usage.output_tokens}\n`,
    );
    return 0;
  } catch (err) {
    process.stderr.write(`请求失败：${(err as Error).message}\n`);
    return 1;
  }
}

main().then((code) => process.exit(code));
