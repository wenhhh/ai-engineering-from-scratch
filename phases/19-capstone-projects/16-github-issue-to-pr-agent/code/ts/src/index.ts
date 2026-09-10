/**
 * 命令行演示与 HTTP 适配器。
 * 演示夹具参与 HMAC 摘要，保留原英文：Speak like a human.＝像人一样表达；
 * Add /healthz endpoint＝增加健康检查端点；evil＝恶意示例；skip me＝跳过此项。
 * 请求体过大错误中的 exceeds 用于选择 HTTP 413，必须保留；演示密钥不可用于真实服务。
 * HTTP 模式会监听端口，但不连接 GitHub，也不实际创建 PR。
 */

// GitHub 问题到 PR 智能体：TypeScript Webhook 接收器。
// Python 另行演示调度状态机；当前目录没有可直接部署的 Actions 工作流。
// 本项目验证 HMAC、按事件路由，并调用只记录日志的智能体桩。
// 课程参考：../../docs/zh.md；以下链接来自固定原文。
//   GitHub webhook signature: https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries
//   GitHub App docs: https://docs.github.com/en/apps

import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { AuditLog } from "./agent.js";
import { route } from "./router.js";
import { buildApp } from "./server.js";
import { expectedSig, verifySignature } from "./verify.js";

const DEMO_SECRET = "demo-shared-secret";

function demoDelivery(
  audit: AuditLog,
  event: string,
  payload: unknown,
  signingSecret: string,
  receiverSecret: string,
): void {
  const raw = Buffer.from(JSON.stringify(payload), "utf8");
  const sig = expectedSig(raw, signingSecret);
  const ok = verifySignature(raw, sig, receiverSecret);
  process.stdout.write(`\n>>> 投递事件=${event} 签名有效=${ok}\n`);
  if (!ok) {
    process.stdout.write("<<< 401 签名无效\n");
    return;
  }
  const result = route(audit, event, payload);
  process.stdout.write(`<<< ${result.code} ${JSON.stringify(result.body)}\n`);
}

function runDemo(): void {
  const audit = new AuditLog();
  const secret = DEMO_SECRET;

  process.stdout.write("=".repeat(72) + "\n");
  process.stdout.write("阶段 19 第 16 课：GitHub Webhook 接收器（TypeScript）\n");
  process.stdout.write("=".repeat(72) + "\n");

  demoDelivery(audit, "ping", { zen: "Speak like a human.", hook_id: 12345 }, secret, secret);

  demoDelivery(
    audit,
    "issues",
    {
      action: "opened",
      issue: {
        number: 42,
        title: "Add /healthz endpoint",
        user: { login: "octocat" },
      },
      repository: { full_name: "acme/widgets" },
    },
    secret,
    secret,
  );

  demoDelivery(
    audit,
    "issues",
    {
      action: "opened",
      issue: { number: 99, title: "evil" },
      repository: { full_name: "acme/widgets" },
    },
    "wrong-secret",
    secret,
  );

  demoDelivery(
    audit,
    "issues",
    {
      action: "closed",
      issue: { number: 41, title: "skip me" },
      repository: { full_name: "acme/widgets" },
    },
    secret,
    secret,
  );

  process.stdout.write(`\n已记录审计条目：${audit.count()}\n`);
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

function runServer(port: number, secret: string): void {
  const audit = new AuditLog();
  const app = buildApp(audit, secret);
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
    process.stdout.write(`Webhook 接收器地址：http://localhost:${port}/webhook\n`);
  });
}

const DEFAULT_PORT = 8081;

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
    const secret = process.env.GH_WEBHOOK_SECRET;
    if (!secret) {
      process.stderr.write(
        "运行 --serve 前，必须设置环境变量 GH_WEBHOOK_SECRET\n",
      );
      process.exit(1);
    }
    const port = parsePort(argv, DEFAULT_PORT);
    runServer(port, secret);
    return;
  }
  runDemo();
}

main();
