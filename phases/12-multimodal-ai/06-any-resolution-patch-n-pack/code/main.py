"""用于可变分辨率视觉 Transformer 批次的切块打包（Patch-n'-pack）——仅使用标准库。

给定一批尺寸为 (H, W) 的图像和图块大小 P，计算：
  - 每幅图像的图块网格 (H/P, W/P) 及序列长度 n_i = (H/P)(W/P)
  - 打包后的总长度 N = sum(n_i)
  - 块对角注意力掩码（稠密形式，N×N）
  - 用于对比的 AnyRes 切片开销（切片 + 缩略图）
  - 用于对比的正方形缩放开销（固定序列长度）

针对收据、图表、截图和照片等实际工作负载，打印预算表。
不依赖 NumPy 或 PyTorch，让每个单元的字节开销计算保持直观。
"""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class Image:
    name: str
    h: int
    w: int

    def grid(self, p: int) -> tuple[int, int]:
        return (self.h // p, self.w // p)

    def seq(self, p: int) -> int:
        gh, gw = self.grid(p)
        return gh * gw


@dataclass
class PackResult:
    total_tokens: int
    per_image: list[int]
    mask_nonzero: int
    mask_size: int
    cu_seqlens: list[int] = field(default_factory=list)


def pack_batch(images: list[Image], patch: int) -> PackResult:
    lens = [img.seq(patch) for img in images]
    total = sum(lens)
    nz = sum(n * n for n in lens)
    offsets = [0]
    for n in lens:
        offsets.append(offsets[-1] + n)
    return PackResult(total, lens, nz, total * total, offsets)


def build_dense_mask(pack: PackResult) -> list[list[int]]:
    n = pack.total_tokens
    mask = [[0] * n for _ in range(n)]
    for b in range(len(pack.cu_seqlens) - 1):
        lo = pack.cu_seqlens[b]
        hi = pack.cu_seqlens[b + 1]
        for i in range(lo, hi):
            for j in range(lo, hi):
                mask[i][j] = 1
    return mask


def anyres_cost(img: Image, tile: int = 336, thumb: int = 336) -> dict:
    tile_grid = tile // 14
    thumb_grid = thumb // 14
    if img.h <= tile and img.w <= tile:
        grid_r, grid_c = 1, 1
    else:
        best = None
        for gr in range(1, 4):
            for gc in range(1, 4):
                if gr * gc > 6:
                    continue
                tile_h, tile_w = gr * tile, gc * tile
                ratio = img.h / img.w
                tile_ratio = tile_h / tile_w
                score = abs(ratio - tile_ratio) + 0.1 * (gr + gc)
                if best is None or score < best[0]:
                    best = (score, gr, gc)
        _, grid_r, grid_c = best
    tile_tokens = grid_r * grid_c * tile_grid * tile_grid
    thumb_tokens = thumb_grid * thumb_grid
    return {
        "grid": (grid_r, grid_c),
        "tile_tokens": tile_tokens,
        "thumb_tokens": thumb_tokens,
        "total": tile_tokens + thumb_tokens,
    }


def square_cost(img: Image, side: int = 336, patch: int = 14) -> int:
    g = side // patch
    return g * g


def fmt(n: int) -> str:
    if n >= 1_000_000:
        return f"{n / 1e6:.2f}M"
    if n >= 1_000:
        return f"{n / 1e3:.1f}K"
    return str(n)


def demo_toy_pack() -> None:
    print("\n示例批次：两幅图像，图块大小为 2")
    print("-" * 60)
    imgs = [Image("A", 6, 4), Image("B", 4, 8)]
    for img in imgs:
        gh, gw = img.grid(2)
        print(f"  {img.name}: {img.h}x{img.w} -> 网格 {gh}x{gw} = {img.seq(2)} 个词元")
    pack = pack_batch(imgs, 2)
    print(f"打包后的总长度：{pack.total_tokens}")
    print(f"cu_seqlens（FlashAttn 的变长序列接口）：{pack.cu_seqlens}")
    print(f"稠密掩码大小：{pack.mask_size} 个单元，"
          f"非零单元：{pack.mask_nonzero} "
          f"({pack.mask_nonzero * 100 / pack.mask_size:.1f}%)")
    mask = build_dense_mask(pack)
    print("\n块对角掩码（1=允许关注，.=屏蔽）：")
    for row in mask:
        print("  " + "".join("1" if v else "." for v in row))


def budget_table(workload: list[Image]) -> None:
    print("\n" + "=" * 72)
    print(f"{'图像':<26}{'原生分辨率':>10}{'正方形缩放':>10}{'AnyRes':>14}{'网格':>10}")
    print("-" * 72)
    native_sum = 0
    square_sum = 0
    anyres_sum = 0
    for img in workload:
        nat = img.seq(14)
        sq = square_cost(img, 336, 14)
        ar = anyres_cost(img)
        native_sum += nat
        square_sum += sq
        anyres_sum += ar["total"]
        gr, gc = ar["grid"]
        print(f"{img.name:<26}{nat:>10}{sq:>10}{ar['total']:>14}   {gr}x{gc}")
    print("-" * 72)
    print(f"{'合计':<26}{native_sum:>10}{square_sum:>10}{anyres_sum:>14}")
    print(f"\n原生分辨率 / 正方形缩放：{native_sum / square_sum:>6.2f} 倍词元，"
          f"保留 OCR 和版面细节")
    print(f"原生分辨率 / AnyRes：{native_sum / anyres_sum:>6.2f} 倍词元，"
          f"不会出现约 2 个切片之后切片与缩略图叠加带来的开销膨胀")
    print(f"AnyRes / 正方形缩放：{anyres_sum / square_sum:>6.2f} 倍词元，"
          f"当编码器分辨率固定为 336 时，可作为折中方案")


def main() -> None:
    print("=" * 60)
    print("任意分辨率 VLM 的切块打包（阶段 12，第 06 课）")
    print("=" * 60)

    demo_toy_pack()

    workload = [
        Image("收据 600x1500（1:2.5）", 600, 1500),
        Image("图表 1280x720（16:9）", 1280, 720),
        Image("手机屏幕 1170x2532", 1170, 2532),
        Image("照片 2048x1536（4:3）", 2048, 1536),
        Image("收据 504x1260（1:2.5）", 504, 1260),
    ]
    for img in workload:
        img.h -= img.h % 14
        img.w -= img.w % 14

    budget_table(workload)

    print("\n" + "=" * 60)
    print("各策略的适用场景")
    print("-" * 60)
    print("  原生分辨率打包（NaViT / NaFlex / M-RoPE）：")
    print("    批次包含多种宽高比，需要尽可能高的保真度和尽可能少的词元")
    print("  AnyRes（LLaVA-NeXT）：")
    print("    编码器固定在 336×336，但仍需要保留细节")
    print("  正方形缩放：")
    print("    快速基线，仅处理照片，不需要 OCR")


if __name__ == "__main__":
    main()
