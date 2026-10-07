# 为每个答案标明来源位置

> 根据不可变来源段落校验人工题卡。

**Type:** Build  
**Language:** TypeScript  
**Stage:** 第 1 阶段，共 4 阶段  
**Time:** 约 2 小时

## 构建目标

练习卡片不仅需要问题和答案，还要保存证据引文的来源 ID 及起止偏移量。学习者可以据此检查预期答案的依据；编辑者也能发现来源变化导致卡片失效。在创建练习队列前完成校验。

```figure
pj-source-grounded-study-coach-1
```

译注：图表范围：前三图分别演示局部证据、字符串匹配和一次间隔计算，第四图使用固定三张卡片到期日，不读取实际题卡与答题日志。它不替代完整去重、版本迁移或页面事件回放。

## 示例推演

来源写道 Each packet records the harvest year。卡片询问包装记录哪一年，答案为 harvest year，证据覆盖该句。若编辑者把答案改为 purchase year，却保留相同来源，校验应拒绝这张卡片。

编码前，写下该示例的返回字段，以及一个应当失败的输入。将预期结果放在实现旁边，以便区分契约变化与程序缺陷。

## 实现契约

- `validateDeck(value: unknown): Deck`

要求 sources 和 cards 数组、唯一且非空的 ID、来源标题以及非空文本。每张卡片引用已知来源，包含非空问题和答案，整数偏移量满足 0 <= start < end <= text.length。标准答案必须逐字出现在引文中。其他可接受形式必须显式列为非空字符串。返回脱离输入对象的副本，使之后修改原对象不会改变已校验题卡集。

保持前面阶段正常工作。在自己的学习者工作区实现这些函数；推演示例时先不打开参考解答。

## 提示与失败情况

使用来源 ID 映射查找段落。偏移量按 UTF-16 位置处理，因为 JavaScript slice 使用该单位。在留出示例中给引文前加一个 emoji，以暴露误用码点索引的问题。

## 运行本阶段

从仓库根目录初始化一次，然后运行累计测试：

```bash
python3 scripts/project_test.py source-grounded-study-coach --init my-source-grounded-study-coach
python3 scripts/project_test.py source-grounded-study-coach --stage 1 --path my-source-grounded-study-coach
```

起始代码故意抛出未实现错误。再次初始化会保留已有源码，不会替换。所有选定测试都必须实际运行才能通过；跳过测试不构成完成证据。

## 检查你的推理

答案出现在段落中，能证明问题写得好吗？除结构检查外，哪些部分仍需编辑审阅？

## 接入最终交付物

独立的答案揭示练习页面，以及包含到期卡片和可复算计划状态的 progress.json。 核心采用人工编写的题目，对答案进行规范化后的精确匹配。它不评判任意文章，也不推断学习者是否理解。复习间隔采用确定性的教学策略，不代表经过实证验证的学习效果。来源偏移量使用 JavaScript UTF-16 代码单元。

完成项目后，尝试自己的输入：

```bash
cd my-source-grounded-study-coach
node --experimental-strip-types main.ts --deck ./fixtures/deck.json --attempts ./fixtures/attempts.json --initial-date 2026-09-01 --date 2026-09-03 --out ./study-output
```

加入题卡集版本或来源摘要，仅根据明确的迁移策略使答题记录失效。来源编辑后，不得静默重新映射证据。

## 权威参考资料

[官方 API 文档](https://nodejs.org/api/typescript.html)。实现、示例和夹具均为原创。参考资料解释底层 API；项目特定策略已在上文说明。
