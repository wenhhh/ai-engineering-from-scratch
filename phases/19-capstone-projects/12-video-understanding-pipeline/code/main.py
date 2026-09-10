"""视频理解流水线：每个场景包含多个向量的索引示例。

每个场景保存描述、画面标签和转写三种表示，分别检索后用倒数排名融合（RRF）
合并结果，再在排名第一的场景内按转写词位置缩小时段。本例演示索引结构、
三路排名融合与时序定位的占位实现。

运行：python main.py

译注：没有加载视频、抽帧、语音转写或调用视觉模型。画面向量来自文字标签，
嵌入由 Python hash 构造；跨进程重现排名需固定 PYTHONHASHSEED。
三路检索按顺序执行，并非并行。时序定位假定转写词在场景内均匀分布，
不是帧级或音频对齐证据；本例不回答车辆计数或动作先后问题，只返回候选时段。
英文语料和查询影响哈希、分词与排名，因此保留原值并提供中文旁注。
"""

from __future__ import annotations

import math
import random
import re
from collections import defaultdict
from dataclasses import dataclass, field


EMB_DIM = 24


def tokenize(s: str) -> list[str]:
    return re.findall(r"\w+", s.lower())


def fake_embed(text: str) -> list[float]:
    v = [0.0] * EMB_DIM
    for tok in tokenize(text):
        h = hash(tok)
        v[h % EMB_DIM] += 1.0
        v[(h >> 8) % EMB_DIM] += 0.5
    n = math.sqrt(sum(x * x for x in v)) or 1.0
    return [x / n for x in v]


def cosine(a: list[float], b: list[float]) -> float:
    return sum(x * y for x, y in zip(a, b))


# ---------------------------------------------------------------------------
# 场景记录：描述／画面标签／转写三种向量。
# ---------------------------------------------------------------------------

@dataclass
class Scene:
    video_id: str
    scene_id: int
    start_ms: int
    end_ms: int
    caption: str
    transcript: str
    frame_tags: str              # 用文字标签代替真实画面嵌入特征。
    caption_emb: list[float] = field(default_factory=list)
    frame_emb: list[float] = field(default_factory=list)
    transcript_emb: list[float] = field(default_factory=list)

    def embed(self) -> None:
        self.caption_emb = fake_embed(self.caption)
        self.frame_emb = fake_embed(self.frame_tags)
        self.transcript_emb = fake_embed(self.transcript)


SAMPLE = [
    # 描述夹具：天际线上的日出，航拍画面。
    Scene("vid_001", 0,       0,  32_000, "sunrise over skyline, drone footage",
          # 转写夹具：我们从东京这里开始。
          "we start here in tokyo",
          # 画面标签：天际线、建筑、黎明、橙色天空、薄雾。
          "skyline buildings dawn orange sky haze"),
    # 描述夹具：有行人的繁忙路口。
    Scene("vid_001", 1,  32_000,  68_000, "busy intersection with pedestrians",
          # 转写夹具：日出后的涩谷十字路口。
          "shibuya crossing after sunrise",
          # 画面标签：街道、行人、步行、汽车、交通信号。
          "street people walking cars traffic signal"),
    # 描述夹具：车辆在红灯前停下。
    Scene("vid_001", 2,  68_000, 132_000, "cars stopped at a red light",
          # 转写夹具：让我数一下驶近的车辆。
          "let me count the vehicles approaching",
          # 画面标签：汽车、红灯、排队、路口、车道。
          "cars red light queue crossing lanes"),
    # 描述夹具：厨房里厨师先倒入食材，再搅拌。
    Scene("vid_001", 3, 132_000, 170_000, "kitchen scene chef pouring then stirring",
          # 转写夹具：先倒入，再慢慢搅拌。
          "first we pour then we stir it slowly",
          # 画面标签：厨师、锅、炉灶、倒入、搅拌、食材。
          "chef pan stove pour stir ingredient"),
    # 描述夹具：厨师为完成的菜肴装盘。
    Scene("vid_001", 4, 170_000, 210_000, "chef plating the finished dish",
          # 转写夹具：菜肴装盘展示。
          "plated presentation of the dish",
          # 画面标签：盘子、装饰、勺子、收尾、菜肴。
          "plate garnish spoon finishing dish"),
    # 描述夹具：日落时的海浪。
    Scene("vid_002", 0,       0,  40_000, "ocean waves at sunset",
          # 转写夹具：海边美丽的傍晚。
          "beautiful evening at the shore",
          # 画面标签：海洋、波浪、日落、天空、海岸。
          "ocean waves sunset sky shore"),
]


# ---------------------------------------------------------------------------
# 三路向量检索与倒数排名融合（RRF）。
# ---------------------------------------------------------------------------

def multi_vector_search(query: str, scenes: list[Scene], k: int = 5) -> list[tuple[Scene, float]]:
    qv = fake_embed(query)
    scored_caption = sorted(scenes, key=lambda s: -cosine(qv, s.caption_emb))
    scored_frame = sorted(scenes, key=lambda s: -cosine(qv, s.frame_emb))
    scored_transcript = sorted(scenes, key=lambda s: -cosine(qv, s.transcript_emb))

    fused: dict[tuple[str, int], float] = defaultdict(float)
    index: dict[tuple[str, int], Scene] = {}
    for ranks, stream in ((scored_caption, "cap"),
                          (scored_frame, "frm"),
                          (scored_transcript, "trn")):
        for rank, sc in enumerate(ranks):
            key = (sc.video_id, sc.scene_id)
            fused[key] += 1.0 / (60 + rank + 1)
            index[key] = sc

    ranked = sorted(fused.items(), key=lambda x: -x[1])
    return [(index[k_], s) for k_, s in ranked[:k]]


# ---------------------------------------------------------------------------
# 时序定位桩：在最佳场景内缩小起止时段。
# ---------------------------------------------------------------------------

def ground_window(query: str, scene: Scene) -> tuple[int, int]:
    """占位实现：按查询关键词在转写中的位置选择子时段。"""
    q = set(tokenize(query))
    t_tokens = tokenize(scene.transcript)
    if not q or not t_tokens:
        return scene.start_ms, scene.end_ms
    positions = [i for i, w in enumerate(t_tokens) if w in q]
    if not positions:
        return scene.start_ms, scene.end_ms
    span = scene.end_ms - scene.start_ms
    start_frac = min(positions) / max(1, len(t_tokens))
    end_frac = (max(positions) + 1) / max(1, len(t_tokens))
    start = int(scene.start_ms + span * max(0.0, start_frac - 0.05))
    end = int(scene.start_ms + span * min(1.0, end_frac + 0.05))
    return start, end


# ---------------------------------------------------------------------------
# 演示。
# ---------------------------------------------------------------------------

def fmt_ms(ms: int) -> str:
    s = ms // 1000
    return f"{s // 60:02d}:{s % 60:02d}"


def main() -> None:
    scenes = SAMPLE
    for s in scenes:
        s.embed()

    queries = [
        # 查询夹具：有多少辆车经过路口？
        ("how many cars pass through the intersection", False),
        # 查询夹具：先倒入还是先搅拌？
        ("what happened first pour or stir", False),
        # 查询夹具：菜肴装盘。
        ("plating of the dish", True),
        # 查询夹具：日落时的大海。
        ("ocean at sunset", True),
    ]

    for q, descriptive in queries:
        print(f"\n查询：{q}  （描述型查询={descriptive}）")
        hits = multi_vector_search(q, scenes, k=3)
        for sc, score in hits:
            print(f"  场景 {sc.video_id}/{sc.scene_id} @ [{fmt_ms(sc.start_ms)}-{fmt_ms(sc.end_ms)}] "
                  f"得分={score:.4f}  描述='{sc.caption[:40]}'")
        top = hits[0][0]
        start, end = ground_window(q, top)
        print(f"  定位时段：[{fmt_ms(start)}-{fmt_ms(end)}] "
              f"（原始时段：{fmt_ms(top.start_ms)}-{fmt_ms(top.end_ms)}）")


if __name__ == "__main__":
    main()
