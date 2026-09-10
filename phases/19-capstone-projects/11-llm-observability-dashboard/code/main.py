"""大语言模型可观测性仪表盘：span 接收、尾部采样与评估示例。

核心是尾部采样收集器和作为子 span 的评估记录：保留出错轨迹，抽样保留成功轨迹，
并为模型调用补充评分。本例用标准库实现 span 模型、采样、评估、漂移检测和告警。

运行：python main.py

译注：这里的 span 是内存记录，没有接收真实 SDK 或 OTLP 数据，也没有连接 ClickHouse。
忠实度只计算英文词集合重合比例，毒性与个人信息泄漏由固定词表和正则判断，
不是模型裁判。提示词及响应参与哈希或评分，保留英文并附中文释义。
费用按已被采样保留的模型 span 汇总，没有采样率校正，不能代表全部请求账单。
提示词哈希分桶的 PSI 只比较桶分布，不证明语义漂移；阈值是教学设定。
演示中的模型名、费用、天气和个人信息字符串均为固定或合成夹具。
"""

from __future__ import annotations

import hashlib
import math
import random
import time
from collections import defaultdict, deque
from dataclasses import dataclass, field


# ---------------------------------------------------------------------------
# span 模型：使用固定快照中的 GenAI 语义字段名。
# ---------------------------------------------------------------------------

@dataclass
class Span:
    trace_id: str
    span_id: str
    parent_span_id: str | None
    name: str
    start_ms: int
    duration_ms: int
    attributes: dict
    events: list[dict] = field(default_factory=list)
    status: str = "ok"

    def is_llm(self) -> bool:
        return "gen_ai.system" in self.attributes


# ---------------------------------------------------------------------------
# 尾部采样：保留错误轨迹，对其余轨迹抽样。
# ---------------------------------------------------------------------------

@dataclass
class TailSampler:
    sample_rate: float = 0.10
    rng: random.Random = field(default_factory=lambda: random.Random(3))

    def decide(self, trace: list[Span]) -> bool:
        if any(s.status == "error" for s in trace):
            return True
        # 含高毒性或高个人信息泄漏评分的轨迹始终保留。
        for s in trace:
            if s.name == "eval" and (
                s.attributes.get("toxicity", 0) > 0.5
                or s.attributes.get("pii_leak", 0) > 0.8
            ):
                return True
        return self.rng.random() < self.sample_rate


# ---------------------------------------------------------------------------
# ClickHouse 的内存占位实现。
# ---------------------------------------------------------------------------

@dataclass
class SpanStore:
    spans: list[Span] = field(default_factory=list)
    by_user: dict[str, int] = field(default_factory=lambda: defaultdict(int))
    by_model: dict[str, int] = field(default_factory=lambda: defaultdict(int))
    cost_by_user: dict[str, float] = field(default_factory=lambda: defaultdict(float))

    def insert_trace(self, trace: list[Span]) -> None:
        self.spans.extend(trace)
        for s in trace:
            if s.is_llm():
                u = s.attributes.get("user_id", "anon")
                m = s.attributes.get("gen_ai.request.model", "unknown")
                self.by_user[u] += 1
                self.by_model[m] += 1
                self.cost_by_user[u] += s.attributes.get("cost_usd", 0.0)


# ---------------------------------------------------------------------------
# 评估：忠实度、毒性、个人信息泄漏；均为规则桩，不调用模型裁判。
# ---------------------------------------------------------------------------

def eval_faithfulness(response: str, context: str) -> float:
    # 占位计算：响应词集合与上下文词集合的重合比例。
    r = set(response.lower().split())
    c = set(context.lower().split())
    if not r:
        return 0.0
    return len(r & c) / len(r)


def eval_toxicity(response: str) -> float:
    # 用于规则计数的英文词：仇恨。
    # 用于规则计数的英文词：杀害。
    # 用于规则计数的英文词：愚蠢。
    # 用于规则计数的英文词：垃圾。
    bad = {"hate", "kill", "stupid", "garbage"}
    words = response.lower().split()
    hits = sum(1 for w in words if w in bad)
    return min(1.0, hits / max(1, len(words)) * 10)


def eval_pii_leak(response: str) -> float:
    import re
    if re.search(r"\b\d{3}-\d{2}-\d{4}\b", response):
        return 0.95
    if re.search(r"[\w.+-]+@[\w.-]+", response):
        return 0.6
    return 0.05


# ---------------------------------------------------------------------------
# 漂移检测：对提示词指纹分桶计算群体稳定性指标 PSI。
# ---------------------------------------------------------------------------

def prompt_fingerprint(prompt: str, n_bins: int = 8) -> int:
    h = hashlib.sha256(prompt.encode()).digest()
    return h[0] % n_bins


def psi(a: list[int], b: list[int], n_bins: int = 8) -> float:
    ca = [0] * n_bins
    cb = [0] * n_bins
    for v in a:
        ca[v] += 1
    for v in b:
        cb[v] += 1
    total_a = max(sum(ca), 1)
    total_b = max(sum(cb), 1)
    score = 0.0
    for i in range(n_bins):
        pa = max(ca[i] / total_a, 0.0001)
        pb = max(cb[i] / total_b, 0.0001)
        score += (pa - pb) * math.log(pa / pb)
    return score


# ---------------------------------------------------------------------------
# 模拟接收：合成不同模型标签的轨迹，并注入泄漏标记。
# ---------------------------------------------------------------------------

def synth_trace(trace_id: str, leak_pii: bool, rng: random.Random) -> list[Span]:
    model = rng.choice(["claude-sonnet-4-7", "gpt-5-4", "gemini-3-pro"])
    user = rng.choice(["u_01", "u_02", "u_03", "u_04"])
    root = Span(trace_id=trace_id, span_id=f"{trace_id}_0", parent_span_id=None,
                name="chat_turn", start_ms=int(time.time() * 1000),
                duration_ms=rng.randint(400, 2400),
                attributes={"app_id": "chatbot"})
    prompt = rng.choice([
        # 提示词夹具：东京今天天气如何？
        "what is the weather in Tokyo today",
        # 提示词夹具：总结近期东京天气预报。
        "summarize the recent Tokyo forecast",
        # 提示词夹具：给我一条东京旅行建议。
        "give me a travel tip for Tokyo",
        # 提示词夹具：东京这周有多暖和？
        "how warm is Tokyo this week",
    ])
    # 合成泄漏夹具：一段含社会安全号码格式的文本，不是真实用户资料。
    # 响应夹具：东京天气温和。
    resp = "your ssn is 123-45-6789" if leak_pii else "the weather in Tokyo is mild"
    # 上下文词项夹具：相关、天气、上下文、东京、温和。
    ctx = "relevant weather context Tokyo mild"
    llm = Span(trace_id=trace_id, span_id=f"{trace_id}_1", parent_span_id=root.span_id,
               name="llm_call",
               start_ms=root.start_ms + 50, duration_ms=root.duration_ms - 80,
               attributes={
                   "gen_ai.system": model.split("-")[0],
                   "gen_ai.request.model": model,
                   "gen_ai.usage.input_tokens": rng.randint(80, 800),
                   "gen_ai.usage.output_tokens": rng.randint(20, 300),
                   "user_id": user,
                   "prompt": prompt,
                   "response": resp,
                   "context": ctx,
                   "cost_usd": round(rng.uniform(0.002, 0.05), 4),
               })
    return [root, llm]


def enrich_with_evals(trace: list[Span]) -> list[Span]:
    """为每个模型调用 span 添加一个评估子 span。"""
    out = list(trace)
    for s in trace:
        if s.is_llm():
            resp = s.attributes.get("response", "")
            ctx = s.attributes.get("context", "")
            ev = Span(trace_id=s.trace_id, span_id=f"{s.span_id}_eval",
                      parent_span_id=s.span_id, name="eval",
                      start_ms=s.start_ms + s.duration_ms,
                      duration_ms=120,
                      attributes={
                          "faithfulness": eval_faithfulness(resp, ctx),
                          "toxicity": eval_toxicity(resp),
                          "pii_leak": eval_pii_leak(resp),
                      })
            out.append(ev)
    return out


# ---------------------------------------------------------------------------
# 告警器：评分超过阈值时生成告警文本。
# ---------------------------------------------------------------------------

def alerter(store: SpanStore) -> list[str]:
    alerts: list[str] = []
    pii_events = [s for s in store.spans
                  if s.name == "eval" and s.attributes.get("pii_leak", 0) > 0.8]
    if pii_events:
        alerts.append(f"检测到个人信息泄漏：{len(pii_events)} 个事件 "
                      f"（首个轨迹：{pii_events[0].trace_id}）")
    tox_events = [s for s in store.spans
                  if s.name == "eval" and s.attributes.get("toxicity", 0) > 0.5]
    if tox_events:
        alerts.append(f"毒性评分超阈值：{len(tox_events)} 个事件")
    return alerts


# ---------------------------------------------------------------------------
# 演示：生成 200 个轨迹，每个轨迹以 1% 的概率注入个人信息泄漏。
# ---------------------------------------------------------------------------

def main() -> None:
    rng = random.Random(5)
    sampler = TailSampler(sample_rate=0.20, rng=rng)
    store = SpanStore()

    baseline_fps: list[int] = []
    current_fps: list[int] = []

    for i in range(200):
        leak = rng.random() < 0.01
        trace = synth_trace(f"t{i:04d}", leak_pii=leak, rng=rng)
        trace = enrich_with_evals(trace)
        if sampler.decide(trace):
            store.insert_trace(trace)
        # 跟踪提示词指纹，比较输入分布而不是输出分布。
        llm_span = trace[1]
        fp = prompt_fingerprint(llm_span.attributes.get("prompt", ""))
        (current_fps if i > 150 else baseline_fps).append(fp)

    print(f"已存入的 span 数：{len(store.spans)}")
    print(f"按模型统计调用 span：{dict(store.by_model)}")
    print(f"按用户统计已保留调用的费用：{dict((k, round(v, 4)) for k, v in store.cost_by_user.items())}")

    alerts = alerter(store)
    if alerts:
        print("\n告警：")
        for a in alerts:
            print(f"  - {a}")
    else:
        print("\n无告警")

    psi_val = psi(baseline_fps, current_fps, n_bins=8)
    print(f"\nPSI（当前分布与基线）：{psi_val:.3f}")
    if psi_val > 0.2:
        print("  漂移告警（PSI > 0.2）")


if __name__ == "__main__":
    main()
