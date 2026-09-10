"""LLaVA-OneVision 词元预算与课程学习规划器——仅使用标准库。

给定每个样本的视觉词元总预算，以及任务混合比例（单图、多图和视频），分配：
  - 单图任务的 AnyRes 切片数量与池化因子
  - 多图任务中每个样本的图像数量和每幅图像的分辨率
  - 视频任务中每个样本的帧数和每帧的池化方式

打印分阶段训练计划及预期的单样本浮点运算量（FLOPs）。
让不同场景的预算大致一致，避免超出 LLM 的上下文窗口。

译注：输出中的原始字段保留为程序字段：scenario 为场景，tiles 为切片数，
 tile_res 为切片分辨率，pool 为池化因子，per_tile 为每片词元数，
 n_images 为图像数，resolution 为分辨率，per_image 为每图词元数，
 n_frames 为帧数，per_frame 为每帧词元数，total 为词元总数。
场景枚举 single-image、multi-image、video 分别表示单图、多图和视频。
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass
class Budget:
    single_image_tokens: int
    multi_image_tokens: int
    video_tokens: int

    def max(self) -> int:
        return max(self.single_image_tokens, self.multi_image_tokens, self.video_tokens)

    def min(self) -> int:
        return min(self.single_image_tokens, self.multi_image_tokens, self.video_tokens)


def anyres_tokens(tiles: int, per_tile: int) -> int:
    return (tiles + 1) * per_tile


def per_tile_tokens(resolution: int, patch: int, pool: int) -> int:
    g = resolution // patch
    pooled = g // pool
    return pooled * pooled


def plan_single_image(budget: int) -> dict:
    for tiles in [9, 4, 1]:
        for per_tile_size in [(384, 14, 2), (384, 14, 1), (336, 14, 2)]:
            res, patch, pool = per_tile_size
            per = per_tile_tokens(res, patch, pool)
            total = anyres_tokens(tiles, per)
            if total <= budget:
                return {
                    "scenario": "single-image",
                    "tiles": tiles,
                    "tile_res": res,
                    "pool": pool,
                    "per_tile": per,
                    "total": total,
                }
    return {"scenario": "single-image", "tiles": 1, "per_tile": 81, "total": 162}


def plan_multi_image(budget: int) -> dict:
    for n_images in [8, 6, 4, 2]:
        for res_pool in [(384, 2), (384, 1), (336, 2)]:
            res, pool = res_pool
            per = per_tile_tokens(res, 14, pool)
            total = n_images * per
            if total <= budget:
                return {
                    "scenario": "multi-image",
                    "n_images": n_images,
                    "resolution": res,
                    "pool": pool,
                    "per_image": per,
                    "total": total,
                }
    return {"scenario": "multi-image", "n_images": 2, "per_image": 81, "total": 162}


def plan_video(budget: int) -> dict:
    for n_frames in [32, 16, 8]:
        for res_pool in [(384, 3), (384, 2), (336, 2)]:
            res, pool = res_pool
            per = per_tile_tokens(res, 14, pool)
            total = n_frames * per
            if total <= budget:
                return {
                    "scenario": "video",
                    "n_frames": n_frames,
                    "resolution": res,
                    "pool": pool,
                    "per_frame": per,
                    "total": total,
                }
    return {"scenario": "video", "n_frames": 8, "per_frame": 64, "total": 512}


def print_plan(plan: dict, budget: int) -> None:
    pct = 100 * plan["total"] / budget
    print(f"\n{plan['scenario'].upper():<12} 目标预算 {budget:>5}，已使用 {plan['total']:>5}  ({pct:>5.1f}%)")
    for k, v in plan.items():
        if k in ("scenario", "total"):
            continue
        print(f"    {k:<12}: {v}")


def curriculum_stages(mix: dict) -> None:
    print("\n课程学习计划（三个阶段）")
    print("-" * 60)
    stages = [
        ("SI 阶段", 1.0, 0.0, 0.0, "仅单图，使用 AnyRes 高分辨率输入"),
        ("OV 阶段", 0.5, 0.3, 0.2, "OneVision 混合任务，统一预算"),
        ("TT 阶段", mix["single"], mix["multi"], mix["video"],
         "针对目标任务微调"),
    ]
    print(f"{'阶段':<12}{'单图':>8}{'多图':>8}{'视频':>8}   说明")
    for name, s, m, v, note in stages:
        print(f"{name:<12}{s:>8.2f}{m:>8.2f}{v:>8.2f}   {note}")
    print("\n顺序很重要：根据 LLaVA-OneVision 的消融实验，将阶段顺序倒置（先训练视频）"
          "会使 MMMU 降低 2–4 分。")


def main() -> None:
    print("=" * 60)
    print("LLaVA-OneVision 词元预算与课程学习（阶段 12，第 08 课）")
    print("=" * 60)

    budget = 4096

    si = plan_single_image(budget)
    mi = plan_multi_image(budget)
    vi = plan_video(budget)

    print(f"\n各场景共用的单样本视觉词元预算：{budget}")
    for p in (si, mi, vi):
        print_plan(p, budget)

    spread = max(si["total"], mi["total"], vi["total"]) - min(si["total"], mi["total"], vi["total"])
    print(f"\n不同场景之间的预算差值：{spread} 个词元 "
          f"（占 {100*spread/budget:.1f}% 的预算）")
    print("LLaVA-OneVision 的目标：将差值控制在 30% 以内，使 LLM 开销可预测。")

    mix = {"single": 0.4, "multi": 0.3, "video": 0.3}
    curriculum_stages(mix)

    print("\n涌现能力（LLaVA-OneVision 第 4.3 节报告）")
    print("-" * 60)
    print("  多摄像头推理       ：结合多图与视频课程学习")
    print("  标记集合提示（Set-of-Mark）：空间定位 + 多图引用")
    print("  iPhone 截图智能体  ：迁移 UI 截图与视频工作流中的能力")
    print("  这三种能力都未出现在 SI 阶段的数据中，而是通过课程学习获得。")


if __name__ == "__main__":
    main()
