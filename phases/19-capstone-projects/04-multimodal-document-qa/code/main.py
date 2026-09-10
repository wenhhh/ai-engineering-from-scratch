"""多模态文档问答：ColPali 风格的后期交互检索示例框架。

核心算法让每个查询词元与文档的所有图块向量比较，取各查询词元的最大相似度
（MaxSim）并求和，再返回排名最高的 k 页。本例使用合成向量完整展示该打分流程，
无需加载真实 ColQwen 模型；另用简单图块裁剪演示 DocPruner 风格的思路。

运行：python main.py

译注：页面由预设文本词项代替，没有读取 PDF、图片、手写笔迹或真实图表。
图块向量由词项哈希生成，并非视觉模型输出；裁剪依据是向量的 L1 范数，不是
范数方差，也不是已验证的信息密度。跨进程复现需固定 PYTHONHASHSEED。
语料和查询参与分词与打分，保留英文并在相邻注释中解释；输出只是候选页面及分数，
没有生成答案，也没有调用同目录下的 TypeScript 查看器。
"""

from __future__ import annotations

import math
import random
import re
from dataclasses import dataclass, field


# ---------------------------------------------------------------------------
# 图块嵌入：用文本词项模拟每页的 16 维图块向量。
# ---------------------------------------------------------------------------

EMB_DIM = 16


def tokenize(text: str) -> list[str]:
    return re.findall(r"\w+", text.lower())


def hash_embed(tok: str) -> list[float]:
    rnd = random.Random(hash(tok) & 0xFFFFFFFF)
    v = [rnd.gauss(0, 1) for _ in range(EMB_DIM)]
    n = math.sqrt(sum(x * x for x in v)) or 1.0
    return [x / n for x in v]


@dataclass
class Page:
    doc_id: str
    page_num: int
    content_tokens: list[str]          # 用词项列表代替页面内容。
    patches: list[list[float]] = field(default_factory=list)

    def embed_patches(self) -> None:
        """多向量表示：每个内容词项转换为一个模拟图块向量。"""
        self.patches = [hash_embed(t) for t in self.content_tokens]


# ---------------------------------------------------------------------------
# 图块裁剪：按 L1 范数降序保留指定比例，不是范数方差。
# ---------------------------------------------------------------------------

def doc_prune(patches: list[list[float]], keep_fraction: float = 0.5) -> list[list[float]]:
    """保留 L1 范数最高的图块。这只是信息密度的粗略代理，
    用来展示原文所述“丢弃低信号图块”的思路，不是完整 DocPruner 实现。"""
    scored = [(sum(abs(x) for x in p), p) for p in patches]
    scored.sort(key=lambda x: -x[0])
    keep_n = max(1, int(len(scored) * keep_fraction))
    return [p for _, p in scored[:keep_n]]


# ---------------------------------------------------------------------------
# MaxSim 后期交互：展示 ColPali / ColQwen 风格的检索打分核心。
# ---------------------------------------------------------------------------

def dot(a: list[float], b: list[float]) -> float:
    return sum(x * y for x, y in zip(a, b))


def max_sim_score(query_tokens: list[list[float]],
                  doc_patches: list[list[float]]) -> float:
    """对每个查询词元向量，取其与所有文档图块点积的最大值；
    再对查询词元求和，即 MaxSim 后期交互打分。"""
    total = 0.0
    for q in query_tokens:
        best = -1e9
        for p in doc_patches:
            s = dot(q, p)
            if s > best:
                best = s
        total += best
    return total


# ---------------------------------------------------------------------------
# 索引与检索：按 MaxSim 得分返回前 k 页。
# ---------------------------------------------------------------------------

@dataclass
class Index:
    pages: list[Page] = field(default_factory=list)

    def add(self, p: Page) -> None:
        self.pages.append(p)

    def retrieve(self, query: str, k: int = 5) -> list[tuple[Page, float]]:
        q_tokens = [hash_embed(t) for t in tokenize(query)]
        scored = [(pg, max_sim_score(q_tokens, pg.patches)) for pg in self.pages]
        scored.sort(key=lambda x: -x[1])
        return scored[:k]


# ---------------------------------------------------------------------------
# 合成语料：十条页面描述，涉及表格、图表、手写与正文，不含实际页面。
# ---------------------------------------------------------------------------

CORPUS = [
    # 语料：EMEA 分部营业利润率从 18.2 降至 16.8，下降 140 个基点，见表四；为合成描述。
    ("10k-2024", 88, "segment EMEA operating margin 18.2 to 16.8 decline 140bp table four"),
    # 语料：管理层讨论与分析中的 EMEA 经营表现、宏观不利因素及汇率影响。
    ("10k-2024", 92, "MDA operating performance EMEA macro headwinds FX impact narrative"),
    # 语料：执行摘要、营收增长 7% 与合并总额。
    ("10k-2024", 14, "executive summary revenue growth 7 percent consolidated totals"),
    # 语料：后期交互、多向量检索与 ColPali / ColQwen 基准。
    ("paper-vidore-v3", 3, "late interaction multi vector retrieval ColPali ColQwen benchmark"),
    # 语料：nDCG 结果表，比较视觉优先与先 OCR 再处理文本的路线。
    ("paper-vidore-v3", 7, "nDCG results table vision first vs OCR then text columns"),
    # 语料：M3DocVQA 的多页推理评测协议。
    ("paper-m3docrag", 2, "M3DocVQA multi page reasoning evaluation protocol"),
    # 语料：手写实验笔记，包含电路板与 pH 读数。
    ("handwritten-lab", 5, "experiment notes circuit board pH readings handwritten"),
    # 语料：带标注误差棒的图及图三标题。
    ("handwritten-lab", 6, "graph with annotated error bars figure 3 caption"),
    # 语料：按 EMEA、美洲、亚太分部展示第一至第四季度收入的折线图。
    ("chart-report", 11, "line chart revenue by segment EMEA americas APAC Q1 Q4"),
    # 语料：比较 2023 与 2024 年各分部营业利润率的柱状图。
    ("chart-report", 12, "bar chart operating margin by segment with 2023 2024 comparison"),
]


def build_index(prune: bool = True) -> Index:
    idx = Index()
    for doc, page, text in CORPUS:
        p = Page(doc_id=doc, page_num=page, content_tokens=tokenize(text))
        p.embed_patches()
        if prune:
            p.patches = doc_prune(p.patches, keep_fraction=0.5)
        idx.add(p)
    return idx


def main() -> None:
    print("=== 构建启用模拟图块裁剪的索引（保留约 50% 图块） ===")
    idx = build_index(prune=True)
    print(f"已索引页数：{len(idx.pages)}")

    queries = [
        # 查询：EMEA 在 2024 年的营业利润率如何变化？查询词项参与打分，保留英文。
        "what was the 2024 operating margin change for EMEA",
        # 查询：后期交互检索与 OCR 的比较。
        "late interaction retrieval vs OCR",
        # 查询：带误差棒的手写实验图。
        "handwritten experimental figures with error bars",
        # 查询：比较各分部利润率的柱状图。
        "bar chart comparing segment margins",
    ]

    for q in queries:
        print(f"\n问题：{q}")
        hits = idx.retrieve(q, k=3)
        for pg, score in hits:
            print(f"  得分={score:+.3f}  {pg.doc_id} 页码 {pg.page_num}")

    # 裁剪消融对照。
    print("\n=== 消融对照：关闭裁剪与开启裁剪 ===")
    full = build_index(prune=False)
    pruned = build_index(prune=True)
    # 消融查询：比较各分部利润率的图。
    q = "chart comparing segment margins"
    full_top = [(p.doc_id, p.page_num) for p, _ in full.retrieve(q, 3)]
    prn_top = [(p.doc_id, p.page_num) for p, _ in pruned.retrieve(q, 3)]
    print(f"  完整图块的前三项：{full_top}")
    print(f"  裁剪后的前三项：{prn_top}")
    print(f"  两组重合数：{len(set(full_top) & set(prn_top))}/3")


if __name__ == "__main__":
    main()
