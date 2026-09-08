/**
 * AI 网关（Gateway）骨架，TypeScript 移植版。
 *
 * 实现 docs/en.md 中的四项网关基础能力：
 *   1. 身份验证（Auth）：常量时间比较 API 密钥，并解析对应租户（Tenant）。
 *   2. 限流（Rate Limit）：LiteLLM 式的租户级令牌桶（Token Bucket）。
 *   3. 重试（Retry）：针对暂时性 429/5xx，进行带抖动（Jitter）的指数退避（Exponential Backoff），次数有上限。
 *   4. 回退链（Fallback Chain）：依次尝试供应商，直至成功。
 *
 * 还包含与 main.py 相同的回退模拟器：4 种网关配置、3 家供应商组成的调用链和错误注入，
 * 使数值结果可复现。
 *
 * 参考资料：
 *   - Kong AI Gateway 基准测试（相对 Portkey 为 228%，相对 LiteLLM 为 859%）：
 *     https://konghq.com/blog/engineering/ai-gateway-benchmark-kong-ai-gateway-portkey-litellm
 *   - LiteLLM（MIT 开源软件，100 多家供应商）：https://github.com/BerriAI/litellm
 *   - Portkey（自 2026 年 3 月起采用 Apache 2.0）：https://github.com/Portkey-AI/gateway
 *   - Kong AI Gateway 文档：https://docs.konghq.com/gateway/latest/ai-gateway/
 *
 * 基于 Node 20 及以上版本的标准库运行，不依赖 npm 包。
 */

import { timingSafeEqual, createHash } from "node:crypto";

// -- 身份验证（Auth） --------------------------------------------------------

type Tenant = {
  id: string;
  // 已签发 API 密钥的 SHA-256 十六进制摘要，绝不明文存储密钥。
  keyHashHex: string;
  // 租户套餐等级，决定限流预算。
  tier: "free" | "trial" | "paid";
};

class AuthService {
  private readonly tenants = new Map<string, Tenant>();
  private readonly hashByKey = new Map<string, Tenant>();

  register(tenant: Tenant): void {
    this.tenants.set(tenant.id, tenant);
    this.hashByKey.set(tenant.keyHashHex, tenant);
  }

  // 通过常量时间（Constant-time）摘要比较进行验证。
  authenticate(presentedKey: string): Tenant | undefined {
    const digest = createHash("sha256").update(presentedKey).digest("hex");
    // 遍历所有已知摘要，让未知密钥与已知密钥的实际耗时相同。
    let match: Tenant | undefined;
    const presented = Buffer.from(digest, "hex");
    for (const t of this.tenants.values()) {
      const stored = Buffer.from(t.keyHashHex, "hex");
      if (
        stored.length === presented.length &&
        timingSafeEqual(stored, presented)
      ) {
        match = t;
      }
    }
    return match;
  }
}

// -- 限流器：令牌桶（Token Bucket） -----------------------------------------

type Bucket = {
  tokens: number;
  capacity: number;
  refillPerSec: number;
  lastNs: bigint;
};

class TokenBucketLimiter {
  private readonly buckets = new Map<string, Bucket>();
  private readonly tierConfig: Record<
    Tenant["tier"],
    { capacity: number; refillPerSec: number }
  >;
  private readonly now: () => bigint;

  constructor(
    tierConfig: Record<
      Tenant["tier"],
      { capacity: number; refillPerSec: number }
    >,
    now: () => bigint = process.hrtime.bigint,
  ) {
    this.tierConfig = tierConfig;
    this.now = now;
  }

  private getOrCreate(tenant: Tenant): Bucket {
    const existing = this.buckets.get(tenant.id);
    if (existing) return existing;
    const cfg = this.tierConfig[tenant.tier];
    const bucket: Bucket = {
      tokens: cfg.capacity,
      capacity: cfg.capacity,
      refillPerSec: cfg.refillPerSec,
      lastNs: this.now(),
    };
    this.buckets.set(tenant.id, bucket);
    return bucket;
  }

  // 桶中令牌足以处理请求时返回 true，否则返回 false。
  allow(tenant: Tenant, cost = 1): boolean {
    const bucket = this.getOrCreate(tenant);
    const nowNs = this.now();
    const elapsedSec = Number(nowNs - bucket.lastNs) / 1e9;
    bucket.tokens = Math.min(
      bucket.capacity,
      bucket.tokens + elapsedSec * bucket.refillPerSec,
    );
    bucket.lastNs = nowNs;
    if (bucket.tokens >= cost) {
      bucket.tokens -= cost;
      return true;
    }
    return false;
  }
}

// -- 供应商抽象与重试 / 故障回退 -------------------------------------------

type ProviderResponse = {
  provider: string;
  text: string;
  latencyMs: number;
  attempt: number;
};

type ProviderError = {
  retryable: boolean;
  status: 429 | 500 | 502 | 503 | 504 | 400;
  message: string;
};

type Provider = {
  name: string;
  // 真实调用使用 HTTP，因此接口为异步；返回文本与延迟，或抛出符合 ProviderError 结构的值。
  call(prompt: string): Promise<{ text: string; latencyMs: number }>;
};

// 根据请求计数器确定性地注入错误的模拟供应商（Mock Provider）。
function makeMockProvider(
  name: string,
  baseLatencyMs: number,
  // 决定第 n 次调用是否出错，以及错误类型。
  errorPolicy: (n: number) => ProviderError | null,
): Provider {
  let n = 0;
  return {
    name,
    async call(prompt: string): Promise<{ text: string; latencyMs: number }> {
      const callN = ++n;
      const err = errorPolicy(callN);
      // 让出一个微任务（Microtask），保持异步调用行为。
      await Promise.resolve();
      if (err) {
        throw err;
      }
      return {
        text: `[${name}] ${prompt.slice(0, 60)}`,
        latencyMs: baseLatencyMs,
      };
    },
  };
}

type RetryConfig = {
  maxAttempts: number;
  baseBackoffMs: number;
  // 让测试与演示结果具有确定性（Determinism）。
  jitter: () => number;
  sleep: (ms: number) => Promise<void>;
};

type RetryOutcome = {
  response: ProviderResponse;
  // 对此供应商的全部重试与退避等待累计耗时。
  // 首次尝试成功、没有退避时，等于 response.latencyMs。
  totalLatencyMs: number;
};

async function callWithRetry(
  provider: Provider,
  prompt: string,
  cfg: RetryConfig,
): Promise<RetryOutcome> {
  let lastErr: ProviderError | undefined;
  let totalLatencyMs = 0;
  for (let attempt = 1; attempt <= cfg.maxAttempts; attempt++) {
    try {
      const r = await provider.call(prompt);
      totalLatencyMs += r.latencyMs;
      return {
        response: {
          provider: provider.name,
          text: r.text,
          latencyMs: r.latencyMs,
          attempt,
        },
        totalLatencyMs,
      };
    } catch (raw) {
      const err = raw as ProviderError;
      lastErr = err;
      if (!err.retryable || attempt === cfg.maxAttempts) break;
      const backoffMs = cfg.baseBackoffMs * 2 ** (attempt - 1) * cfg.jitter();
      totalLatencyMs += backoffMs;
      await cfg.sleep(backoffMs);
    }
  }
  // 将最后一次错误交给故障回退层。
  throw lastErr ?? ({ retryable: false, status: 500, message: "未知错误" } as ProviderError);
}

async function callWithFallback(
  chain: readonly Provider[],
  prompt: string,
  cfg: RetryConfig,
): Promise<{ response: ProviderResponse; fallbackHits: number; totalLatencyMs: number }> {
  let fallbackHits = 0;
  let totalLatencyMs = 0;
  let lastErr: ProviderError | undefined;
  for (let i = 0; i < chain.length; i++) {
    if (i > 0) fallbackHits++;
    try {
      const outcome = await callWithRetry(chain[i], prompt, cfg);
      totalLatencyMs += outcome.totalLatencyMs;
      return { response: outcome.response, fallbackHits, totalLatencyMs };
    } catch (err) {
      lastErr = err as ProviderError;
    }
  }
  throw lastErr ?? { retryable: false, status: 500, message: "没有可用供应商" };
}

// -- 网关实现 --------------------------------------------------------------

class AIGateway {
  constructor(
    private readonly auth: AuthService,
    private readonly limiter: TokenBucketLimiter,
    private readonly chain: readonly Provider[],
    private readonly retry: RetryConfig,
    private readonly overheadMs: number,
  ) {}

  async handle(
    presentedKey: string,
    prompt: string,
  ): Promise<
    | { ok: true; response: ProviderResponse; totalLatencyMs: number; fallbackHits: number }
    | { ok: false; status: number; reason: string }
  > {
    const tenant = this.auth.authenticate(presentedKey);
    if (!tenant) return { ok: false, status: 401, reason: "API 密钥无效" };
    if (!this.limiter.allow(tenant)) {
      return { ok: false, status: 429, reason: "超过速率限制（Rate Limit）" };
    }
    try {
      const { response, fallbackHits, totalLatencyMs } = await callWithFallback(
        this.chain,
        prompt,
        this.retry,
      );
      return {
        ok: true,
        response,
        // 端到端（End-to-end）实际耗时：网关开销、各次重试、各次退避等待，
        // 以及到达成功供应商之前所有失败供应商的延迟。
        totalLatencyMs: totalLatencyMs + this.overheadMs,
        fallbackHits,
      };
    } catch (err) {
      const e = err as ProviderError;
      return { ok: false, status: e.status ?? 500, reason: e.message };
    }
  }
}

// -- 模拟器：与 main.py 的模型结构一致 --------------------------------------

type ProviderProfile = { name: string; baseLatencyMs: number; errorRate: number };

const PROVIDERS: ProviderProfile[] = [
  { name: "OpenAI", baseLatencyMs: 180, errorRate: 0.03 },
  { name: "Anthropic", baseLatencyMs: 220, errorRate: 0.02 },
  { name: "自托管（Self-hosted）", baseLatencyMs: 100, errorRate: 0.05 },
];

const GATEWAY_OVERHEAD: Record<string, number> = {
  LiteLLM: 10,
  Portkey: 30,
  Kong: 5,
  Cloudflare: 2,
};

function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type SimRow = {
  gateway: string;
  successRate: number;
  meanLatency: number;
  // 内层循环每次只尝试一家供应商一次，失败就回退；因此这里统计的是供应商调用失败次数，
  // 不是同一供应商内的重试次数。
  providerFailures: number;
  fallbackHits: number;
};

function simulateFallback(gateway: string, n = 1000, seed = 7): SimRow {
  const rng = makeRng(seed);
  let success = 0;
  let totalLatency = 0;
  let providerFailures = 0;
  let fallbackHits = 0;
  const gwOverhead = GATEWAY_OVERHEAD[gateway];

  for (let i = 0; i < n; i++) {
    let reqLatency = gwOverhead;
    let done = false;
    for (let attempt = 0; attempt < PROVIDERS.length; attempt++) {
      const p = PROVIDERS[attempt];
      const errored = rng() < p.errorRate;
      reqLatency += errored ? p.baseLatencyMs * 0.3 : p.baseLatencyMs;
      if (attempt > 0) fallbackHits++;
      if (!errored) {
        success++;
        done = true;
        break;
      }
      providerFailures++;
    }
    void done;
    totalLatency += reqLatency;
  }

  return {
    gateway,
    successRate: success / n,
    meanLatency: totalLatency / n,
    providerFailures,
    fallbackHits,
  };
}

function reportRow(r: SimRow): void {
  console.log(
    `${r.gateway.padEnd(12)}  ` +
      `成功率=${(r.successRate * 100).toFixed(1).padStart(5)}%  ` +
      `平均延迟=${r.meanLatency.toFixed(0).padStart(6)}ms  ` +
      `供应商调用失败=${String(r.providerFailures).padStart(4)}  ` +
      `回退次数=${String(r.fallbackHits).padStart(4)}`,
  );
}

// -- 演示 ------------------------------------------------------------------

async function liveDemo(): Promise<void> {
  console.log("--- AI 网关基础能力：身份验证（Auth）、限流（Rate Limit）、重试（Retry）、回退（Fallback） ---");

  const auth = new AuthService();
  // 预先签发两个示例密钥："secret-paid-key" 对应付费套餐，"secret-free-key" 对应免费套餐。
  const paidHash = createHash("sha256").update("secret-paid-key").digest("hex");
  const freeHash = createHash("sha256").update("secret-free-key").digest("hex");
  auth.register({ id: "tenant-paid", keyHashHex: paidHash, tier: "paid" });
  auth.register({ id: "tenant-free", keyHashHex: freeHash, tier: "free" });

  const limiter = new TokenBucketLimiter({
    free: { capacity: 2, refillPerSec: 0.5 },
    trial: { capacity: 5, refillPerSec: 1 },
    paid: { capacity: 100, refillPerSec: 10 },
  });

  // 供应商 1：首次调用返回 429，之后成功。
  const flaky = makeMockProvider("openai", 180, (n) =>
    n === 1
      ? { retryable: true, status: 429, message: "rate_limit_exceeded" }
      : null,
  );
  // 供应商 2：一半调用返回 5xx。
  const wobble = makeMockProvider("anthropic", 220, (n) =>
    n % 2 === 1
      ? { retryable: true, status: 503, message: "upstream_unavailable" }
      : null,
  );
  // 供应商 3：始终正常。
  const healthy = makeMockProvider("self-hosted", 100, () => null);

  const retry: RetryConfig = {
    maxAttempts: 2,
    baseBackoffMs: 1,
    jitter: () => 1.0,
    sleep: (ms: number) => new Promise((res) => setTimeout(res, ms)),
  };

  const gateway = new AIGateway(
    auth,
    limiter,
    [flaky, wobble, healthy],
    retry,
    /* 网关开销 overheadMs */ 5,
  );

  console.log("付费租户：应通过重试或回退获得成功响应：");
  for (let i = 0; i < 3; i++) {
    const r = await gateway.handle("secret-paid-key", `hello world ${i}`);
    console.log("  →", JSON.stringify(r));
  }

  console.log("\n免费租户：容量为 2，第三次调用触发限流：");
  for (let i = 0; i < 4; i++) {
    const r = await gateway.handle("secret-free-key", `q ${i}`);
    console.log("  →", JSON.stringify(r));
  }

  console.log("\n无效密钥：返回 401：");
  console.log("  →", JSON.stringify(await gateway.handle("nope", "x")));
}

function simulatorDemo(): void {
  console.log("\n" + "=".repeat(80));
  console.log("AI 网关故障回退：错误注入下的三供应商调用链");
  console.log("=".repeat(80));
  const header =
    `${"网关".padEnd(12)}  ` +
    `${"成功率".padStart(7)}         ${"平均延迟".padStart(12)}  供应商调用失败  回退次数`;
  console.log(header);
  console.log("-".repeat(header.length));
  for (const gw of ["LiteLLM", "Portkey", "Kong", "Cloudflare"]) {
    reportRow(simulateFallback(gw));
  }
  console.log(
    "\n说明：单供应商错误率为 3% 时，成功率为 97%。",
  );
  console.log(
    "双供应商回退的成功率为 99.94%，即 1 − 0.03 × 0.02。",
  );
  console.log(
    "三供应商回退的成功率为 99.997%。触发回退时，延迟会上升。",
  );
}

async function main(): Promise<void> {
  await liveDemo();
  simulatorDemo();
}

main().catch((err: unknown) => {
  console.error(err);
  process.exitCode = 1;
});
