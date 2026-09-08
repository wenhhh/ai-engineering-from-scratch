# 更新日志（Changelog）

记录课程的新变化，按时间倒序排列。

格式大致遵循 [Keep a Changelog](https://keepachangelog.com/)。每条记录列明阶段、课程和改动，便于学习者直接定位变化。

## [尚未发布（Unreleased）][Unreleased]

### 新增（Added）
- `scripts/scaffold-lesson.sh`：脚手架（Scaffolder），用于创建 `phases/NN-phase/NN-lesson/` 的完整目录结构，并从 `LESSON_TEMPLATE.md` 预填 `docs/en.md` 骨架。
- `.github/PULL_REQUEST_TEMPLATE.md`：贡献者检查清单，包括代码可运行、不写代码注释、优先从零实现、每课独立的原子提交，以及 ROADMAP 行使用 Markdown 链接。
- `.github/ISSUE_TEMPLATE/bug_report.md` 和 `new_lesson_proposal.md`：用于结构化提交缺陷报告和课程提案。
- 本文件 `CHANGELOG.md`。

## 2026-04：阶段 4 计算机视觉（Computer Vision）完成

### 新增（Added）
- 阶段 4 的全部 28 课，涵盖图像基础至多模态视觉，包括视觉语言模型（VLM）、三维视觉、视频和自监督学习（Self-supervised learning）。
- `ROADMAP.md` 的阶段 4 条目添加指向课程目录的 Markdown 链接，使网站能够展示这些课程。

### 修复（Fixed）
- 对阶段 4 的 15 节以上课程进行了精度与准确性核查：
  - `phase-4/02`：形状计算器明确了自适应池化（Adaptive pooling）、展平（Flatten）和线性层的感受野（RF）及步幅（Stride）处理方式。
  - `phase-4/03`：骨干网络（Backbone）选择器说明列全所覆盖的模型家族；为光学字符识别（OCR）、医疗和工业场景补充任务头（Head）选择指导。
  - `phase-4/04`：分类诊断按故障模式使用定量阈值；未定义的指标标为 `n/a`；增加类别数少于 3 时的保护。
  - `phase-4/06`：检测指标解读器使用 `AP@0.5`，而非 `mAP@0.5`；明确逐类召回率为可选项；锚框（Anchor）设计器说明步幅截断及每层仅一个锚框的处理路径。
  - `phase-4/10`：采样器选择器将 `unet_forward_ms` 声明为输入；ControlNet 保护规则提升为规则 0。
  - `phase-4/14`：视觉 Transformer（ViT）检查器与拒绝规则对齐，对移植尝试只作审计，不予背书。
  - `phase-4/24`：开放词汇（Open-vocabulary）技术栈选择器明确规则优先级和许可证过滤语义；概念设计器解决步骤 5 与规则 80 的冲突。
  - `phase-4/25`：视觉语言模型（VLM）文档中的 `_merge` 在占位符不匹配时抛出描述清楚的 `ValueError`；CMER 在内部执行归一化。
  - `phase-4/27`：`synthetic_frames` 将真值（GT）边界框裁剪到帧的高、宽范围内。
  - `phase-4/28`：`rope_3d` 校验维度划分；从扩散 Transformer（DiT）模块示例中移除未使用的 `F` 导入。

## 2026 年第一季度及更早

### 新增（Added）
- 阶段 0，环境搭建与工具（Setup & Tooling）：全部 12 课。
- 阶段 1，数学基础（Math Foundations）：全部 22 课。
- 阶段 2，机器学习基础（ML Fundamentals）：全部 18 课。
- 阶段 3，深度学习核心（Deep Learning Core）：涵盖感知机（Perceptron）、反向传播（Backpropagation）和优化器（Optimizer）的核心课程。
- 内置 Claude Code 技能（Skills）：`find-your-level`（水平定位测验）和 `check-understanding`（分阶段测验）。
- 网站 `aiengineeringfromscratch.com`：课程目录、单课页面、路线图和包含 277 个术语的词汇表。
- 为全部 20 个阶段建立初始目录骨架，从 `phases/00-*` 到 `phases/19-*`。
- `LESSON_TEMPLATE.md`、`CONTRIBUTING.md`、`ROADMAP.md`、`README.md`。

[Unreleased]: https://github.com/rohitg00/ai-engineering-from-scratch/compare/HEAD...HEAD
