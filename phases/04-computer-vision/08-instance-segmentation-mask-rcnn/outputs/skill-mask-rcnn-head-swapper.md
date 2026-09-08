---
name: skill-mask-rcnn-head-swapper
description: 根据自定义 num_classes，生成替换 torchvision Mask R-CNN 边界框头和掩码头的精确代码
version: 1.0.0
phase: 4
lesson: 8
tags: [computer-vision, mask-rcnn, fine-tuning, torchvision]
---

# Mask R-CNN 任务头替换器（Mask R-CNN Head Swapper）

专门生成 Mask R-CNN 的任务头替换样板代码。下方模板假设存在 `model.roi_heads.box_predictor` 和 `model.roi_heads.mask_predictor`，它们只在 `maskrcnn_resnet50_fpn` 和 `maskrcnn_resnet50_fpn_v2` 中同时存在。Faster R-CNN 有框预测器但没有掩码预测器；RetinaNet 使用 `RetinaNetHead`，根本没有 `roi_heads`，两者都需要其他技能。

## 使用时机（When to use）

- 在自定义类别集上微调 `maskrcnn_resnet50_fpn` 或 `maskrcnn_resnet50_fpn_v2`。
- 将 COCO 训练的 Mask R-CNN 检查点迁移到不同类别数。
- 调试因 `cls_score.out_features` 或 `mask_predictor` 不匹配而崩溃的 Mask R-CNN 训练。

## 范围之外（Out of scope）

- `fasterrcnn_*`：没有 mask_predictor，只替换 `box_predictor`，使用专门的 Faster R-CNN 任务头替换配方。
- `retinanet_*`：没有 `roi_heads`；分类与回归头分别位于 `model.head.classification_head` 和 `model.head.regression_head`。使用 RetinaNet 专用技能。
- `keypointrcnn_*`：使用 `keypoint_predictor`，而非 `mask_predictor`。

## 输入（Inputs）

- `model_name`：torchvision 检测模型构造函数，例如 `maskrcnn_resnet50_fpn_v2`。
- `num_classes`：包含背景。有 4 个物体类别的数据集意味着 `num_classes=5`。
- `freeze`：`backbone`、`backbone_fpn`、`none` 之一。

## 步骤（Steps）

1. 导入模型构造函数与两个预测器类（`FastRCNNPredictor`、`MaskRCNNPredictor`）。
2. 加载默认权重的预训练模型。
3. 用新的 `FastRCNNPredictor(in_features, num_classes)` 替换 `model.roi_heads.box_predictor`。
4. 用新的 `MaskRCNNPredictor(in_features_mask, hidden_layer=256, num_classes)` 替换 `model.roi_heads.mask_predictor`。
5. 应用要求的冻结策略。
6. 打印确认信息块，列出各模块可训练参数量。

## 输出代码模板（Output code template）

```python
from torchvision.models.detection import {MODEL_NAME}, {MODEL_WEIGHTS}
from torchvision.models.detection.faster_rcnn import FastRCNNPredictor
from torchvision.models.detection.mask_rcnn import MaskRCNNPredictor

def build_model(num_classes={NUM_CLASSES}):
    model = {MODEL_NAME}(weights={MODEL_WEIGHTS}.DEFAULT)
    in_features = model.roi_heads.box_predictor.cls_score.in_features
    model.roi_heads.box_predictor = FastRCNNPredictor(in_features, num_classes)
    in_features_mask = model.roi_heads.mask_predictor.conv5_mask.in_channels
    model.roi_heads.mask_predictor = MaskRCNNPredictor(in_features_mask, 256, num_classes)

    {FREEZE_BLOCK}

    return model
```

其中 `{FREEZE_BLOCK}` 为：

- `none` -> 空
- `backbone` ->
  ```python
  for p in model.backbone.parameters():
      p.requires_grad = False
  ```
- `backbone_fpn` ->
  ```python
  for p in model.backbone.parameters():
      p.requires_grad = False
  # FPN 参数位于 backbone.fpn 内部
  ```

## 报告（Report）

```
[head-swap]
  model:         <MODEL_NAME>
  num_classes:   <N>  （包含背景）
  freeze policy: <选项>
  trainable:     <N>
  total:         <N>
```

## 规则（Rules）

- 绝不推荐未包含背景的 `num_classes`，始终提醒用户。
- torchvision 检测模型有 `_v2` 变体时始终使用它，其预训练权重比旧版更好。
- 不在本技能内实例化模型，只生成代码块，让用户运行。
- 数据集超过 10,000 张图像时，若用户要求 `freeze backbone`，建议考虑同时微调骨干。
