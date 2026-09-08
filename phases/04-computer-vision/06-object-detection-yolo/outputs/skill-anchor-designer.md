---
name: skill-anchor-designer
description: 给定真实边界框数据集，在 (w, h) 上运行 k 均值聚类，返回各 FPN 层级的锚框集合及覆盖率统计
version: 1.0.0
phase: 4
lesson: 6
tags: [computer-vision, detection, anchors, kmeans]
---

# 锚框设计器（Anchor Designer）

在基于锚框的检测器中，锚框（Anchor）是最依赖数据集的超参数。默认 COCO 锚框在细胞培养图像、卫星切片和小目标监控上表现不佳。本技能推导真正匹配目标数据的锚框。

## 使用时机（When to use）

- 在新数据集上首次训练之前。
- 模型其他方面正常，但极小或极大目标的召回率较弱。
- 数据集大幅扩充后，边界框尺寸分布可能发生变化。

## 输入（Inputs）

- `boxes`：形状为 (N, 4) 的 NumPy 数组，格式为 `(cx, cy, w, h)` 或 `(x1, y1, x2, y2)`；建议至少 1000 个正例框。
- `num_anchors_per_level`：通常为 3。
- `num_fpn_levels`：通常为 3（P3、P4、P5）或 4。
- `input_size`：训练分辨率 HxW。
- 可选的 `strides`：各层级步幅；省略时，取 `[8, 16, 32, 64]` 的前 `num_fpn_levels` 项。若检测器 FPN 步幅不同，显式传入更长或更短的数组。

## 步骤（Steps）

1. **规范化边界框**：转为 `input_size` 下以像素为单位的 `(w, h)` 对，丢弃 w 或 h < 2 像素的框。

2. **运行 k 均值聚类（K-means）**：对 `(w, h)` 对聚类，`k = num_anchors_per_level * num_fpn_levels`。距离函数使用 `1 - IoU(box, cluster)`，而非欧氏距离；在 `(w, h)` 上使用欧氏距离会将细高框和正方形框归到一起。所有框贡献相同，不加权；若类别不平衡且希望提高大框召回率，应在输入数组中重复稀有类别框，而非传入权重向量。

3. **按面积升序排列聚类中心**。分为 `num_fpn_levels` 组，每组 `num_anchors_per_level` 个。最小面积分配给最高分辨率层级，即最小步幅层级。

4. **逐层级计算覆盖统计**：
   - `median IoU`：每个真实框与该层级最佳锚框的 IoU 中位数。
   - `recall@IoU=0.5`：最佳锚框 IoU >= 0.5 的真实框百分比。
   - `area coverage`：面积处于该层级 `[anchor_min_area / 4, anchor_max_area * 4]` 内的框比例。

5. **报告各层级锚框**，标记 `recall@IoU=0.5 < 0.9` 的层级；它的锚框与数据不够匹配，应重新调整，或增加每层级锚框数。

## 报告格式（Report format）

```
[anchor-designer]
  total boxes:         <N>
  clusters:            <k>
  distance metric:     1 - IoU

[level P3  stride=8]
  anchors (w, h):      [(A, B), (C, D), (E, F)]
  median IoU:          <X>
  recall@IoU=0.5:      <X>
  coverage:            <X>
  flag:                ok | retune

[level P4  stride=16]
  ...

[summary]
  overall recall@IoU=0.5: <X>
  smallest anchor:        <w x h>
  largest anchor:         <w x h>
  recommendation:         <若有层级被标记，用一句话给出建议>
```

## 规则（Rules）

- 始终使用基于 IoU 的距离。欧氏 k 均值产生的锚框视觉上合理，但实验表现更差。
- 按面积排列聚类中心，再按升序分配给各层级。
- 当 `num_anchors_per_level = 1` 时，完全跳过 k 均值：按面积分位数将框分为 `num_fpn_levels` 个区间，例如三层级用三等分位；每层级锚框设为区间内 (w, h) 的中位数。在小数据集上，这比运行 `k = num_fpn_levels` 的 k 均值更稳健。
- 绝不输出负锚框尺寸，将下限截为 1。
- 若数据集框数 < 200，警告用户锚框搜索不可靠，建议使用默认 COCO 锚框并增加训练数据。
