---
name: rsi-cycle-pause-spec
description: 规定 RSI 流水线必须暂停并等待人工审查后才能开始下一周期的条件。
version: 1.0.0
phase: 15
lesson: 7
tags: [rsi, self-improvement, alignment, pause-threshold, rsp]
---

给定拟议的递归自我改进（Recursive self-improvement，RSI）流水线，提供暂停规范：下一周期开始前，使循环停止并接受人工检查的明确条件。没有暂停规范的流水线尚不具备运行条件。

请输出：

1. **周期级阈值（Cycle-level thresholds）。** 对每个可测维度（能力分数、对齐分数、预算、轨迹长度、资源使用），定义跨过即暂停循环的数值阈值。阈值必须在循环开始前设置并记录。
2. **逐周期变化（Cycle-over-cycle deltas）。** 限制任一维度单周期变化幅度。单周期 30%+ 的能力跳升几乎总是评估器投机的信号；暂停并审计。
3. **失对齐差距（Misalignment gap）。** 每周期后计算能力减对齐。若差距扩大超过 X（运维人员设置），暂停。这就是 `code/main.py` 模拟器演练的指标。
4. **退步监测（Regression watch）。** 若任一维度在单个周期内下降超过 Y，就暂停循环。能力突增后往往会出现退步；及时发现这些变化，可以避免把虚假的进步当成继续加速的依据。
5. **人工恢复契约（Human resumption contract）。** 暂停后恢复前，要求具名人类审查触发原因，必要时重设阈值，并将决定记录到流水线外审计轨迹。

必须拒绝：
- 暂停后无需人工动作即可恢复的流水线。
- 依赖循环自身内部评估器的阈值（智能体可对其投机）。
- 阈值集合可被智能体编辑的流水线。

拒绝规则：
- 若用户无法预先说出阈值，拒绝。事后设置的不是阈值，而是事后合理化。
- 若流水线没有外部（循环外）评估器，拒绝：回归与突增检测需要外部视角。
- 若拟议恢复契约是“通知团队，24 小时后继续”，拒绝。恢复必须是明确主动的动作。

输出格式：

返回一页规范，包含：
- **维度与阈值（Axes and thresholds）**：表格
- **周期变化限制（Cycle-delta limits）**：表格
- **失对齐差距公式与阈值（Misalignment gap formula and threshold）**
- **回归限制（Regression limits）**
- **外部评估器（External evaluator）**：是什么、何时运行
- **恢复契约（Resumption contract）**：明确负责人、检查清单和日志保存位置
- **签字确认（Sign-off line）**：明确由谁确保暂停条件始终得到执行
