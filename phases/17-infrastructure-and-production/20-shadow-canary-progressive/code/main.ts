/**
 * 影子流量（Shadow）、金丝雀发布（Canary）与渐进式发布（Progressive Rollout），TypeScript 移植版与策略引擎。
 *
 * 三种策略：
 *   1. 影子模式（Shadow Mode）：将每个请求复制给候选版本，记录差异，不向用户返回候选输出；
 *      在用户接触候选版本前发现成本或输出长度退化（Regression）。
 *   2. 金丝雀发布：分阶段转移流量，设置五道大语言模型（LLM）专用关卡（Gate）；
 *      任一关卡超限就立即停止发布。
 *   3. 渐进式策略：串联影子流量、金丝雀与 100% 全量发布，通过策略开关实现秒级回滚。
 *
 * 还包含与 main.py 相同的金丝雀模拟器：六个阶段、五道关卡、六种退化场景，使数值可复现。
 *
 * 参考资料：
 *   - Argo Rollouts：Kubernetes 渐进式交付（Progressive Delivery）
 *     https://argo-rollouts.readthedocs.io/
 *   - Flagger：渐进式交付控制器（Operator）
 *     https://docs.flagger.app/
 *   - docs/en.md 引用的多次运行间约 15% 非确定性（Non-determinism），来自 GPU 浮点运算
 *     不满足结合律、批大小变化和采样。
 *
 * 基于 Node 20 及以上版本的标准库运行，不依赖 npm 包。
 */

// -- 基线（Baseline）与关卡 -------------------------------------------------

type Metrics = {
  latencyP99Ms: number;
  costPerReq: number;
  errorRate: number;
  outputLenP99: number;
  thumbsDownRate: number;
};

const BASELINE: Metrics = {
  latencyP99Ms: 900,
  costPerReq: 0.02,
  errorRate: 0.02,
  outputLenP99: 450,
  thumbsDownRate: 0.03,
};

// 超过基线多少倍视为超限。阈值应高于 LLM 非确定性的噪声下限（Noise Floor），
// docs/en.md 给出的该下限约为 15%。
const GATES: Record<keyof Metrics, number> = {
  latencyP99Ms: 1.5,
  costPerReq: 1.2,
  errorRate: 2.0,
  outputLenP99: 1.4,
  thumbsDownRate: 1.5,
};

const STAGES = [0.01, 0.1, 0.25, 0.5, 0.75, 1.0];

// -- Mulberry32 伪随机数生成器（PRNG） ---------------------------------------

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

function stageSeed(i: number): number {
  return 11 + i * 3;
}

// -- 性能退化注入器 ---------------------------------------------------------

type Regression = {
  latencyMult: number;
  costMult: number;
  errorMult: number;
  outputLenMult: number;
  thumbsDownMult: number;
};

const NO_REGRESSION: Regression = {
  latencyMult: 1,
  costMult: 1,
  errorMult: 1,
  outputLenMult: 1,
  thumbsDownMult: 1,
};

function measureStage(_stage: number, reg: Regression, seed: number): Metrics {
  const rng = makeRng(seed);
  // 噪声下限对应 docs/en.md 描述的非确定性：每次测量约 ±8%。
  const noise = (v: number): number => v * (0.92 + rng() * 0.16);
  return {
    latencyP99Ms: noise(BASELINE.latencyP99Ms * reg.latencyMult),
    costPerReq: noise(BASELINE.costPerReq * reg.costMult),
    errorRate: noise(BASELINE.errorRate * reg.errorMult),
    outputLenP99: noise(BASELINE.outputLenP99 * reg.outputLenMult),
    thumbsDownRate: noise(BASELINE.thumbsDownRate * reg.thumbsDownMult),
  };
}

function checkGates(metrics: Metrics): (keyof Metrics)[] {
  const breaches: (keyof Metrics)[] = [];
  for (const k of Object.keys(GATES) as (keyof Metrics)[]) {
    if (metrics[k] > BASELINE[k] * GATES[k]) breaches.push(k);
  }
  return breaches;
}

// -- 策略引擎（Policy Engine） ----------------------------------------------

type ShadowSample = {
  baselineCost: number;
  candidateCost: number;
  baselineLatencyMs: number;
  candidateLatencyMs: number;
};

type ShadowReport = {
  n: number;
  meanCostDeltaPct: number;
  meanLatencyDeltaPct: number;
  // 仅凭影子流量结果就足以在金丝雀发布前停止时，为 true。
  alert: boolean;
  reasons: string[];
};

function shadowEvaluate(samples: ShadowSample[]): ShadowReport {
  if (samples.length === 0) {
    return {
      n: 0,
      meanCostDeltaPct: 0,
      meanLatencyDeltaPct: 0,
      alert: false,
      reasons: [],
    };
  }
  let costDelta = 0;
  let latDelta = 0;
  let costN = 0;
  let latN = 0;
  for (const s of samples) {
    // 跳过基线非正的行，避免单个零值让平均数变成 Infinity/NaN，导致关卡判定失真。
    if (s.baselineCost > 0) {
      costDelta += (s.candidateCost - s.baselineCost) / s.baselineCost;
      costN++;
    }
    if (s.baselineLatencyMs > 0) {
      latDelta += (s.candidateLatencyMs - s.baselineLatencyMs) / s.baselineLatencyMs;
      latN++;
    }
  }
  const meanCost = costN > 0 ? (costDelta / costN) * 100 : 0;
  const meanLat = latN > 0 ? (latDelta / latN) * 100 : 0;
  const reasons: string[] = [];
  if (meanCost > 30) reasons.push(`成本 +${meanCost.toFixed(1)}%（>30%）`);
  if (meanLat > 50) reasons.push(`延迟 +${meanLat.toFixed(1)}%（>50%）`);
  return {
    n: samples.length,
    meanCostDeltaPct: meanCost,
    meanLatencyDeltaPct: meanLat,
    alert: reasons.length > 0,
    reasons,
  };
}

type CanaryDecision = {
  promoted: boolean;
  stagesAdvanced: number;
  breaches: (keyof Metrics)[];
};

function canaryRollout(reg: Regression): CanaryDecision {
  for (let i = 0; i < STAGES.length; i++) {
    const metrics = measureStage(STAGES[i], reg, stageSeed(i));
    const breaches = checkGates(metrics);
    if (breaches.length > 0) {
      return { promoted: false, stagesAdvanced: i, breaches };
    }
  }
  return { promoted: true, stagesAdvanced: STAGES.length, breaches: [] };
}

// PolicyEngine 封装特性开关（Feature Flag），在 O(1) 时间内将 pinnedModel 从候选切回基线，
// 对应 LaunchDarkly / Flagsmith / Unleash 的开关回滚方式。
class PolicyEngine {
  private baselineDigest: string;
  private pinnedDigest: string;
  private rolloutPct = 0;

  constructor(initialDigest: string) {
    this.baselineDigest = initialDigest;
    this.pinnedDigest = initialDigest;
  }

  promote(candidateDigest: string, pct: number): void {
    this.pinnedDigest = candidateDigest;
    this.rolloutPct = pct;
  }

  // 常量时间回滚，供操作手册（Runbook）中的切换步骤调用。
  // 重新固定到构造时记录的基线，或最近一次回滚时显式覆盖的基线。
  rollback(baselineDigest?: string): void {
    if (baselineDigest !== undefined) this.baselineDigest = baselineDigest;
    this.pinnedDigest = this.baselineDigest;
    this.rolloutPct = 0;
  }

  pick(rng: () => number): { digest: string; chose: "baseline" | "candidate" } {
    return rng() < this.rolloutPct
      ? { digest: this.pinnedDigest, chose: "candidate" }
      : { digest: this.baselineDigest, chose: "baseline" };
  }
}

// -- 结果报告 --------------------------------------------------------------

function rolloutReport(name: string, reg: Regression): void {
  console.log(`\n${name}`);
  console.log(
    `退化倍数：延迟=${reg.latencyMult}，成本=${reg.costMult}，错误率=${reg.errorMult}，输出长度=${reg.outputLenMult}，负反馈率=${reg.thumbsDownMult}`,
  );
  for (let i = 0; i < STAGES.length; i++) {
    const stage = STAGES[i];
    const metrics = measureStage(stage, reg, stageSeed(i));
    const breaches = checkGates(metrics);
    const status =
      breaches.length === 0 ? "通过" : `停止发布（超限字段：${breaches.join(",")}）`;
    const pct = Math.round(stage * 100);
    console.log(
      `  流量阶段 ${String(pct).padStart(3)}%  ` +
        `P99 延迟=${metrics.latencyP99Ms.toFixed(0).padStart(5)}  ` +
        `成本=${metrics.costPerReq.toFixed(4)} 美元  ` +
        `错误率=${(metrics.errorRate * 100).toFixed(1).padStart(4)}%  ` +
        `负反馈率=${(metrics.thumbsDownRate * 100).toFixed(1).padStart(4)}%  ` +
        `${status}`,
    );
    if (breaches.length > 0) {
      console.log("  → 回滚（Rollback）：切换策略，将固定模型版本恢复为基线");
      return;
    }
  }
  console.log("  → 发布成功，流量提升至 100%");
}

// -- 演示 ------------------------------------------------------------------

function shadowDemo(): void {
  console.log("--- 影子模式（Shadow Mode）评估，不影响用户 ---");
  // 三种场景：候选版本大致相当、更便宜，以及贵 40%（文档中的典型问题场景）。
  const rng = makeRng(99);
  const mkSamples = (costMult: number, latMult: number): ShadowSample[] =>
    Array.from({ length: 200 }, () => ({
      baselineCost: 0.02 * (0.95 + rng() * 0.1),
      candidateCost: 0.02 * costMult * (0.95 + rng() * 0.1),
      baselineLatencyMs: 800 * (0.95 + rng() * 0.1),
      candidateLatencyMs: 800 * latMult * (0.95 + rng() * 0.1),
    }));

  const scenarios: { name: string; samples: ShadowSample[] }[] = [
    { name: "候选版本大致相当", samples: mkSamples(1.05, 1.02) },
    { name: "候选版本便宜 20%", samples: mkSamples(0.8, 0.95) },
    { name: "候选版本贵 40%，应回滚", samples: mkSamples(1.4, 1.0) },
  ];

  for (const s of scenarios) {
    const r = shadowEvaluate(s.samples);
    console.log(
      `  ${s.name}：样本数=${r.n} 成本变化=${r.meanCostDeltaPct.toFixed(1)}%  ` +
        `延迟变化=${r.meanLatencyDeltaPct.toFixed(1)}%  ` +
        `告警=${r.alert}${r.reasons.length ? "  原因=" + r.reasons.join("; ") : ""}`,
    );
  }
}

function policyEngineDemo(): void {
  console.log("\n--- 策略引擎（PolicyEngine）：发布后以 O(1) 时间回滚 ---");
  const engine = new PolicyEngine("baseline-digest");
  engine.promote("candidate-digest-v2", 0.1);
  const rng = makeRng(42);
  let candidateCount = 0;
  for (let i = 0; i < 1000; i++) {
    if (engine.pick(rng).chose === "candidate") candidateCount++;
  }
  console.log(
    `  发布到 10% 后：1000 次选择中 ${candidateCount} 次选中候选版本，目标约 100 次`,
  );
  engine.rollback();
  let postCount = 0;
  for (let i = 0; i < 1000; i++) {
    if (engine.pick(rng).chose === "candidate") postCount++;
  }
  console.log(`  回滚后：${postCount}/1000 次选中候选版本，目标为 0`);
}

function canaryDemo(): void {
  console.log("\n" + "=".repeat(95));
  console.log("金丝雀发布（Canary Rollout）：六个阶段、五道关卡、注入性能退化");
  console.log("=".repeat(95));

  rolloutReport("无退化的正常发布", NO_REGRESSION);
  rolloutReport("成本小幅上升 10%，未超过关卡阈值", {
    ...NO_REGRESSION,
    costMult: 1.1,
  });
  rolloutReport("成本上升 25%", { ...NO_REGRESSION, costMult: 1.25 });
  rolloutReport("延迟上升 80%", {
    ...NO_REGRESSION,
    latencyMult: 1.8,
  });
  rolloutReport("负反馈率上升 60%", {
    ...NO_REGRESSION,
    thumbsDownMult: 1.6,
  });
  rolloutReport("质量悄然下降，成本逐渐上升", {
    ...NO_REGRESSION,
    costMult: 1.15,
    thumbsDownMult: 1.45,
  });

  // canaryRollout() 对相同六种场景给出的程序化结果。
  console.log("\n--- canaryRollout() 程序化判定 ---");
  const scenarios: { name: string; reg: Regression }[] = [
    { name: "无退化", reg: NO_REGRESSION },
    { name: "成本上升 10%", reg: { ...NO_REGRESSION, costMult: 1.1 } },
    { name: "成本上升 25%", reg: { ...NO_REGRESSION, costMult: 1.25 } },
    { name: "延迟上升 80%", reg: { ...NO_REGRESSION, latencyMult: 1.8 } },
    { name: "负反馈率上升 60%", reg: { ...NO_REGRESSION, thumbsDownMult: 1.6 } },
    {
      name: "成本上升 15%，负反馈率上升 45%",
      reg: { ...NO_REGRESSION, costMult: 1.15, thumbsDownMult: 1.45 },
    },
  ];
  for (const s of scenarios) {
    const d = canaryRollout(s.reg);
    const verdict = d.promoted
      ? "发布成功"
      : `第 ${d.stagesAdvanced} 阶段停止，超限字段：${d.breaches.join(",")}`;
    console.log(`  ${s.name.padEnd(28)} → ${verdict}`);
  }
}

function main(): void {
  shadowDemo();
  policyEngineDemo();
  canaryDemo();
}

main();
