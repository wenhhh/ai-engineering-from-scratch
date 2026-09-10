"""开放权重 VLM 配方选择器——汇总 2024–2025 年论文的消融实验表。

将 MM1、Idefics2、Cambrian-1、Molmo 和 Prismatic VLMs 的主要发现
编码为简单的数据表，可用于回答：
  - 给定预算和任务组合，哪种配方表现更好
  - 替换维度 X 后，预期会有怎样的变化
  - 应先对哪个维度进行消融实验

不依赖 NumPy 或 pandas，只使用字典和打印表格。
重点是证据的组织结构，而不是数值精度。

译注：任务选择值 ocr（文字识别）、reasoning（推理）、agent（智能体）
参与条件判断，因此保留英文。本文件中的数值与历史结论沿用固定英文快照，
未作为当前模型排名重新核实。
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass
class Recipe:
    name: str
    encoder: str
    connector: str
    llm_b: int
    data: str
    resolution: str
    mmmu: float
    cv_bench: float
    docvqa: float


RECIPES = [
    Recipe("LLaVA-1.5", "CLIP L/14 @336", "MLP-2", 13, "LLaVA-Inst-150k", "336", 35.3, 56.0, 55.0),
    Recipe("LLaVA-NeXT", "CLIP L/14 @336", "MLP-2", 13, "LLaVA-Inst + shareGPT4V", "AnyRes 672", 36.2, 58.5, 77.4),
    Recipe("Idefics2-8B", "SigLIP SO400m/14", "Perceiver-64", 7, "OBELICS + Cauldron", "980 分辨率切分", 43.0, 60.0, 74.0),
    Recipe("MM1-3B", "CLIP L/14", "C-Abstractor", 3, "交错图文 + 图像描述", "672", 38.6, 59.0, 62.0),
    Recipe("MM1-30B", "CLIP L/14", "C-Abstractor", 30, "交错图文 + 图像描述", "672", 44.7, 64.0, 74.0),
    Recipe("Molmo-7B-D", "SigLIP SO400m/14", "MLP-2", 7, "PixMo（71.2 万条人工图像描述）", "AnyRes 672", 45.3, 65.0, 92.4),
    Recipe("Molmo-72B", "SigLIP SO400m/14", "MLP-2", 72, "PixMo（71.2 万条人工图像描述）", "AnyRes 672", 54.1, 73.0, 93.5),
    Recipe("Cambrian-1-8B", "CLIP + DINOv2 + SigLIP + ConvNeXt", "SVA", 8, "Cambrian-10M", "672", 42.7, 67.8, 77.8),
    Recipe("Prismatic-7B 默认配置", "SigLIP SO400m/14", "MLP-2", 7, "LLaVA-Inst + shareGPT4V", "336", 40.0, 58.0, 70.0),
]


def axis_impact() -> None:
    print("\n各维度影响分解（Prismatic VLMs 对照比较）")
    print("-" * 60)
    axes = [
        ("视觉词元数量", 60, "64 -> 576 -> 1024 个词元；超过 1024 后收益递减"),
        ("图像编码器",      20, "CLIP、SigLIP 与 DINOv2 的对比；拼接特征有帮助"),
        ("连接器架构",      5, "词元数相同时，MLP ≈ Q-Former ≈ Perceiver"),
        ("数据混合方案",           10, "详细的人工图像描述 > 蒸馏得到的 GPT-4V 数据"),
        ("LLM 规模",           15, "7B -> 70B，MMMU 在约 55 分附近进入平台期"),
        ("分辨率调度",    5, "从 224 逐步升至 448 > 始终使用 448；原生分辨率的 OCR 表现更好"),
    ]
    total_weight = sum(a[1] for a in axes)
    print(f"{'维度':<22}{'变异占比%':>8}  说明")
    for name, pct, note in axes:
        bar = "#" * (pct // 2)
        print(f"{name:<22}{pct:>6}% {bar}")
        print(f"{'':<22}       {note}")
    print(f"说明：取整后，将权重从约 {total_weight}% 重新归一化到约 100%。")


def compare_encoders() -> None:
    print("\n替换编码器带来的变化（固定 7B LLM，使用 LLaVA-Inst + shareGPT4V 数据）")
    print("-" * 60)
    rows = [
        ("CLIP ViT-L/14 @ 336",        38.5, 56.0, 70.0),
        ("SigLIP SO400m/14 @ 384",     41.0, 60.0, 75.0),
        ("DINOv2 ViT-g/14 @ 224",      37.0, 65.0, 52.0),
        ("SigLIP + DINOv2 特征拼接",     42.0, 67.0, 74.0),
        ("InternViT-6B @ 448",         43.0, 66.0, 78.0),
    ]
    print(f"{'编码器':<32}{'MMMU':>8}{'CV-B':>8}{'DocVQA':>10}")
    for name, mmmu, cv, doc in rows:
        print(f"{name:<32}{mmmu:>8.1f}{cv:>8.1f}{doc:>10.1f}")
    print("变化：SigLIP 的 MMMU 比 CLIP 高 2.5 分；DINOv2 在 CV-Bench 上更优；"
          "在以视觉为重点的基准测试中，拼接特征优于单独使用其中任一编码器。")


def compare_data() -> None:
    print("\n数据混合方案带来的变化（固定 SigLIP + 7B LLM + AnyRes）")
    print("-" * 60)
    rows = [
        ("LLaVA-Inst-150k",         40.0, "网络图像描述 + GPT-4 对话"),
        ("+ ShareGPT4V",            42.0, "+ GPT-4V 详细图像描述"),
        ("+ Cauldron",              43.0, "+ OCR + 图表 + 多模态指令"),
        ("PixMo（仅人工图像描述）", 45.3, "71.2 万条密集人工图像描述"),
        ("PixMo + Cauldron + 更多数据", 47.0, "截至 2025 年 7 月的最佳数据混合方案"),
    ]
    print(f"{'数据混合方案':<28}{'MMMU':>8}  说明")
    for name, mmmu, note in rows:
        print(f"{name:<28}{mmmu:>8.1f}  {note}")
    print("发现：在相同训练词元数下，密集人工图像描述的 MMMU")
    print("      比蒸馏图像描述高 2–3 分（Molmo 的核心论点）。")


def print_recipes() -> None:
    print("\n典型开放 VLM（消融实验报告的 MMMU、CV-Bench、DocVQA）")
    print("-" * 60)
    print(f"{'配方':<22}{'LLM':>6}{'MMMU':>8}{'CV-B':>8}{'DocVQA':>10}")
    for r in RECIPES:
        print(f"{r.name:<22}{r.llm_b:>5}B{r.mmmu:>8.1f}{r.cv_bench:>8.1f}{r.docvqa:>10.1f}")


def pick_recipe(budget_b: int, task: str) -> None:
    print(f"\n配方选择：参数预算 {budget_b}B，任务类型：{task}")
    print("-" * 60)
    weights = {"mmmu": 1.0, "cv": 1.0, "doc": 1.0}
    if task == "ocr":
        weights = {"mmmu": 0.4, "cv": 0.3, "doc": 1.2}
    elif task == "agent":
        weights = {"mmmu": 1.0, "cv": 1.2, "doc": 0.8}
    elif task == "reasoning":
        weights = {"mmmu": 1.5, "cv": 0.5, "doc": 0.8}

    def score(r: Recipe) -> float:
        return r.mmmu * weights["mmmu"] + r.cv_bench * weights["cv"] + r.docvqa * weights["doc"]

    candidates = [r for r in RECIPES if r.llm_b <= budget_b]
    candidates.sort(key=score, reverse=True)
    for r in candidates[:3]:
        print(f"  {r.name:<22} LLM {r.llm_b}B  分数={score(r):.1f}")
        print(f"    编码器={r.encoder}")
        print(f"    数据  ={r.data}")
        print(f"    分辨率={r.resolution}")


def main() -> None:
    print("=" * 60)
    print("开放权重 VLM 配方选择器（阶段 12，第 07 课）")
    print("=" * 60)

    print_recipes()
    axis_impact()
    compare_encoders()
    compare_data()

    pick_recipe(10, "ocr")
    pick_recipe(80, "reasoning")
    pick_recipe(10, "agent")


if __name__ == "__main__":
    main()
