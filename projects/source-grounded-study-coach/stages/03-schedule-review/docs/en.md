# 回放答题事件，生成可见复习计划

> 根据稳定且带日期的答题事件计算到期日。

**Type:** Build  
**Language:** TypeScript  
**Stage:** 第 3 阶段，共 4 阶段  
**Time:** 约 2 小时

## 构建目标

将答题记录存为事件，以便重新计算进度。每个事件含 ID、卡片 ID、日期和答案。完全重复的事件不能让同一卡片晋级两次；同一 ID 对应不同内容应报错。按日期、再按事件 ID 排序，让同日顺序具有确定性。

```figure
pj-source-grounded-study-coach-3
```

译注：图表范围：前三图分别演示局部证据、字符串匹配和一次间隔计算，第四图使用固定三张卡片到期日，不读取实际题卡与答题日志。它不替代完整去重、版本迁移或页面事件回放。

## 示例推演

9 月 1 日第一次答对后，卡片进入第 1 盒，9 月 2 日到期。9 月 2 日再次答对后进入第 2 盒，9 月 4 日到期。答错会重置到第 0 盒，次日再练。最高第 5 盒，其答对后的复习间隔为 16 天。

编码前，写下该示例的返回字段，以及一个应当失败的输入。将预期结果放在实现旁边，以便区分契约变化与程序缺陷。

## 实现契约

- `parseDay(value: string): number`
- `buildProgress(deck, attempts, initialDate): Progress[]`
- `dueCards(progress, date): Progress[]`

只接受真实存在的 YYYY-MM-DD 日期，9 月 31 日必须失败。答题事件不能早于 initialDate，也不能引用未知卡片。每张卡片起始位于第 0 盒，在 initialDate 到期。答对晋升一盒，间隔为 2^(box-1) 天；答错重置并间隔一天。按题卡集顺序返回进度；dueCards 筛选 due <= date，按到期日、再按卡片 ID 排序。

保持前面阶段正常工作。在自己的学习者工作区实现这些函数；推演示例时先不打开参考解答。

## 提示与失败情况

在 UTC 午夜做日期运算，避免本地夏令时变化。处理前先对事件去重。将乱序输入与其排序版本对照，并用明确日期检查跨月计算。

## 运行本阶段

从仓库根目录初始化一次，然后运行累计测试：

```bash
python3 scripts/project_test.py source-grounded-study-coach --init my-source-grounded-study-coach
python3 scripts/project_test.py source-grounded-study-coach --stage 3 --path my-source-grounded-study-coach
```

起始代码故意抛出未实现错误。再次初始化会保留已有源码，不会替换。所有选定测试都必须实际运行才能通过；跳过测试不构成完成证据。

## 检查你的推理

即使调度器确定，同日两次正确作答为什么仍可能夸大学习程度？面对真实学习者，你会修改哪项调度策略？

## 接入最终交付物

独立的答案揭示练习页面，以及包含到期卡片和可复算计划状态的 progress.json。 核心采用人工编写的题目，对答案进行规范化后的精确匹配。它不评判任意文章，也不推断学习者是否理解。复习间隔采用确定性的教学策略，不代表经过实证验证的学习效果。来源偏移量使用 JavaScript UTF-16 代码单元。

完成项目后，尝试自己的输入：

```bash
cd my-source-grounded-study-coach
node --experimental-strip-types main.ts --deck ./fixtures/deck.json --attempts ./fixtures/attempts.json --initial-date 2026-09-01 --date 2026-09-03 --out ./study-output
```

加入有文档说明的同日晋级上限，或提供另一种复习策略。在同一份答题日志上比较行为，不要仅凭间隔长短声称学习效果更好。

## 权威参考资料

[官方 API 文档](https://nodejs.org/api/typescript.html)。实现、示例和夹具均为原创。参考资料解释底层 API；项目特定策略已在上文说明。
