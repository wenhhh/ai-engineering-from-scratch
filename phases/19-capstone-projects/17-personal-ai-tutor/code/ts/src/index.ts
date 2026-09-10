/**
 * 课程遍历演示与 HTTP 适配器。
 * 演示使用确定性伪随机数模拟正确率，并直接推进逻辑时钟；不与真实学习者交互。
 * 选课原因保留 new_eligible/review_overdue 枚举，中文释义见 types.ts。
 * 过大请求体错误中的 exceeds 参与 HTTP 413 分支匹配，不翻译该错误字符串。
 */

// 个人 AI 导师：综合项目的 TypeScript HTTP 应用部分。
// Python 另行演示 BKT 与辅导策略；本项目暴露以下独立接口：
// /lesson/next（课程图拓扑遍历）与 /lesson/:id/submit。
// 课程参考：../../docs/zh.md；以下链接来自固定英文原文。
//   Bayesian Knowledge Tracing: https://en.wikipedia.org/wiki/Bayesian_knowledge_tracing
//   FSRS spaced-repetition: https://github.com/open-spaced-repetition/fsrs4anki

import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { buildIndex, CURRICULUM, pickNextLesson, topoOrder } from "./curriculum.js";
import { MasteryStore } from "./mastery.js";
import { buildApp } from "./server.js";

function runDemo(): void {
  const store = new MasteryStore();
  const index = buildIndex(CURRICULUM);
  const topo = topoOrder(CURRICULUM);

  process.stdout.write("=".repeat(72) + "\n");
  process.stdout.write("阶段 19 第 17 课：个人导师（TypeScript）\n");
  process.stdout.write("=".repeat(72) + "\n");

  process.stdout.write(`\n拓扑顺序：${topo.join(", ")}\n`);

  let now = Date.now();
  const learnerCorrectRate = 0.75;
  let seed = 1;
  const rng = (): number => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };

  for (let step = 0; step < 14; step += 1) {
    const pick = pickNextLesson(topo, index, store.all(), now);
    if (!pick) {
      process.stdout.write(`\n第 ${step} 步：当前没有可选课程或到期复习\n`);
      break;
    }
    const correct = rng() < learnerCorrectRate;
    const updated = store.record(pick.lesson.id, correct, now);
    process.stdout.write(
      `\n第 ${step} 步：${pick.lesson.id}（${pick.lesson.title}），选择原因=${pick.reason}，` +
        `学习者${correct ? "答对" : "答错"}，` +
        `分数=${updated.score.toFixed(2)}，下次复习在 ${Math.floor(updated.interval_ms / 1000)} 秒后\n`,
    );
    now = updated.next_due_at + 1;
  }

  process.stdout.write("\n最终掌握度快照：\n");
  for (const id of topo) {
    const m = store.peek(id);
    if (!m) continue;
    process.stdout.write(
      `  ${id}：分数=${m.score.toFixed(2)}，作答次数=${m.attempts}，答对次数=${m.successes}\n`,
    );
  }
}

const MAX_BODY_SIZE = 1024 * 1024;

function nodeAdapter(app: ReturnType<typeof buildApp>) {
  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    const host = req.headers.host ?? "localhost";
    const url = new URL(req.url ?? "/", `http://${host}`);
    const body = await new Promise<Buffer | undefined>((resolve, reject) => {
      const chunks: Buffer[] = [];
      let received = 0;
      req.on("data", (chunk: Buffer) => {
        received += chunk.length;
        if (received > MAX_BODY_SIZE) {
          req.destroy();
          reject(new Error(`request body exceeds ${MAX_BODY_SIZE} bytes`));
          return;
        }
        chunks.push(chunk);
      });
      req.on("end", () => resolve(chunks.length > 0 ? Buffer.concat(chunks) : undefined));
      req.on("error", reject);
    });
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (typeof value === "string") headers.set(key, value);
      else if (Array.isArray(value)) headers.set(key, value.join(", "));
    }
    const init: RequestInit = {
      method: req.method ?? "GET",
      headers,
    };
    if (body && req.method !== "GET" && req.method !== "HEAD") init.body = body;
    const fetchRes = await app.fetch(new Request(url.toString(), init));
    res.writeHead(fetchRes.status, Object.fromEntries(fetchRes.headers));
    res.end(Buffer.from(await fetchRes.arrayBuffer()));
  };
}

function runServer(port: number): void {
  const store = new MasteryStore();
  const app = buildApp(store);
  const handler = nodeAdapter(app);
  const server = createServer((req, res) => {
    handler(req, res).catch((err) => {
      const message = String(err);
      const tooLarge = message.includes("exceeds");
      if (res.headersSent) return;
      res.writeHead(tooLarge ? 413 : 500, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: message }));
    });
  });
  server.listen(port, () => {
    process.stdout.write(`导师 API 地址：http://localhost:${port}\n`);
  });
}

const DEFAULT_PORT = 8090;

function parsePort(argv: string[], defaultPort: number): number {
  const portFlag = argv.indexOf("--port");
  if (portFlag < 0) return defaultPort;
  const raw = argv[portFlag + 1];
  if (raw === undefined) {
    process.stderr.write("--port 需要提供值\n");
    process.exit(2);
  }
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1 || n > 65535) {
    process.stderr.write(`--port 值 ${raw} 无效：必须是 1..65535 范围的整数\n`);
    process.exit(2);
  }
  return n;
}

function main(): void {
  const argv = process.argv.slice(2);
  if (argv.includes("--serve")) {
    const port = parsePort(argv, DEFAULT_PORT);
    runServer(port);
    return;
  }
  runDemo();
}

main();
