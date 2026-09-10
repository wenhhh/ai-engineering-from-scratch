"""多模态 RAG 简化示例：三个检索器、分数融合与基于证据的生成器。

仅使用标准库。构造包含文字评论、图像特征标签和环境音评分的餐厅语料，
运行三个检索器，融合分数，并输出带引用标记的模拟答案。
同时演示在置信度较低时由智能体改写查询的过程。

译注：本例按英文空格分词并匹配关键词，评论、查询和图像标签保留原值，
不能只翻译其中一侧。五条评论依次表示：
  r1：纯素早午餐很棒，早晨安静，窗户很多。
  r2：全天供应纯素早午餐，音乐嘈杂，工业风格。
  r3：供应纯素午餐，灯光昏暗。
  r4：供应纯素早午餐，空间通透，阳光充足。
  r5：牛排餐厅，环境喧闹。
查询的含义是“找一家安静、供应纯素早午餐且有自然采光的餐厅”；追加词组
bright windows low noise 表示“明亮、窗户、低噪声”。natural_light、
minimal、industrial、warm_lighting、airy、dark 分别表示自然采光、极简、
工业风、暖色照明、通透、昏暗。餐厅 ID、名称及分贝数也保持原样。
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass
class Restaurant:
    id: str
    name: str
    review_text: str
    image_tags: list[str]
    ambient_db: float


CORPUS = [
    Restaurant("r1", "Sunday Plant Bistro",
               "best vegan brunch, quiet mornings, lots of windows", ["natural_light", "minimal"], 38),
    Restaurant("r2", "Orange Grove Cafe",
               "all-day vegan brunch, noisy music, industrial style", ["industrial"], 68),
    Restaurant("r3", "Vine & Leaf",
               "vegan lunch, dim lighting", ["warm_lighting"], 55),
    Restaurant("r4", "Morning Glow",
               "vegan brunch, airy space, lots of sun", ["natural_light", "airy"], 42),
    Restaurant("r5", "Steak Central",
               "steakhouse, loud atmosphere", ["dark"], 72),
]


def text_retrieve(query: str) -> dict[str, float]:
    """在查询与评论文本之间进行粗略的关键词匹配。"""
    keywords = [w.lower() for w in query.split() if len(w) > 2]
    scores = {}
    for r in CORPUS:
        text = r.review_text.lower()
        s = sum(text.count(k) for k in keywords)
        scores[r.id] = s / len(keywords) if keywords else 0
    return scores


def image_retrieve(query: str) -> dict[str, float]:
    q = query.lower()
    tag_hints = []
    if "light" in q or "sun" in q:
        tag_hints.append("natural_light")
    if "airy" in q or "spacious" in q:
        tag_hints.append("airy")
    if "minimal" in q:
        tag_hints.append("minimal")
    scores = {}
    for r in CORPUS:
        s = sum(1.0 for t in tag_hints if t in r.image_tags)
        scores[r.id] = s / max(1, len(tag_hints))
    return scores


def audio_retrieve(query: str) -> dict[str, float]:
    q = query.lower()
    scores = {}
    if "quiet" in q or "calm" in q:
        for r in CORPUS:
            scores[r.id] = max(0.0, 1.0 - r.ambient_db / 80.0)
    else:
        for r in CORPUS:
            scores[r.id] = 0.5
    return scores


def fuse(scores_list: list[dict[str, float]], weights: list[float]) -> dict[str, float]:
    fused = {}
    for r in CORPUS:
        s = 0.0
        for w, scores in zip(weights, scores_list):
            s += w * scores.get(r.id, 0)
        fused[r.id] = s
    return fused


def top_k(scored: dict[str, float], k: int = 3) -> list[tuple[str, float]]:
    return sorted(scored.items(), key=lambda x: -x[1])[:k]


def grounded_generate(query: str, ranked: list[tuple[str, float]]) -> str:
    lines = [f"针对以下查询的回答：'{query}'"]
    for i, (rid, score) in enumerate(ranked, 1):
        r = next(x for x in CORPUS if x.id == rid)
        lines.append(
            f"  {i}. {r.name}（分数 {score:.2f}）"
            f" [评论 {rid}] [图像标签 {r.image_tags}] [环境音 {r.ambient_db}dB]")
    return "\n".join(lines)


def agentic_loop(query: str, confidence_floor: float = 0.8) -> str:
    t = text_retrieve(query)
    i = image_retrieve(query)
    a = audio_retrieve(query)
    fused = fuse([t, i, a], [0.3, 0.4, 0.3])
    top = top_k(fused, k=3)
    confidence = top[0][1] if top else 0

    trace = [f"第 1 轮：最佳结果={top[0]}  置信度={confidence:.2f}"]
    if confidence < confidence_floor:
        trace.append("  置信度较低，正在改写查询")
        query2 = query + " bright windows low noise"
        i2 = image_retrieve(query2)
        a2 = audio_retrieve(query2)
        fused = fuse([t, i2, a2], [0.3, 0.5, 0.2])
        top = top_k(fused, k=3)
        trace.append(f"第 2 轮：最佳结果={top[0]}  置信度={top[0][1]:.2f}")
    return "\n".join(trace) + "\n\n" + grounded_generate(query, top)


def surveys_table() -> None:
    print("\n2025 年多模态 RAG 综述")
    print("-" * 60)
    rows = [
        ("Abootorabi 等", "2025年2月", "全面的分类体系"),
        ("Mei 等",        "2025年4月", "子任务基准与失败模式"),
        ("Zhao 等",       "2025年3月", "侧重视觉，对 ColPali 讨论较深入"),
    ]
    for name, date, note in rows:
        print(f"  {name:<22}{date:<10}{note}")


def main() -> None:
    print("=" * 60)
    print("多模态 RAG（阶段 12，第 24 课）")
    print("=" * 60)

    query = "find me a quiet vegan brunch with natural light"
    print(f"\n查询：{query}")
    print("-" * 60)
    result = agentic_loop(query, confidence_floor=0.7)
    print(result)

    surveys_table()

    print("\n融合策略")
    print("-" * 60)
    print("  分数融合：加权求和，简单、快速")
    print("  MoE 融合：门控路由到专家，可学习，需要训练")
    print("  注意力  ：用小型网络为检索结果分配权重")
    print("  默认方案：分数融合，并略微偏向主导模态")


if __name__ == "__main__":
    main()
