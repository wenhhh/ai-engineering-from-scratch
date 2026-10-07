# 返回附带来源的反馈

> 评判受限短答案，并揭示支持段落。

**Type:** Build  
**Language:** TypeScript  
**Stage:** 第 2 阶段，共 4 阶段  
**Time:** 约 2 小时

## 构建目标

对入门项目，范围明确的评分契约比没有解释的模型分数更易检查。规范化 Unicode 兼容形式、大小写、空白和句尾标点，再与标准答案及题卡作者显式批准的其他形式比较。另一种表达在日常语言中可能正确，但在这里仍需人工审阅。

```figure
pj-source-grounded-study-coach-2
```

译注：图表范围：前三图分别演示局部证据、字符串匹配和一次间隔计算，第四图使用固定三张卡片到期日，不读取实际题卡与答题日志。它不替代完整去重、版本迁移或页面事件回放。

## 示例推演

标准答案为 paper envelopes 时，响应 PAPER   ENVELOPES! 经规范化后可接受，Plastic envelopes 不通过。空响应也不通过，即使规范化会去掉其中标点。作者若将 a paper envelope 列为可接受形式，该形式在精确规范化比较后也可通过。

编码前，写下该示例的返回字段，以及一个应当失败的输入。将预期结果放在实现旁边，以便区分契约变化与程序缺陷。

## 实现契约

- `normalizeAnswer(answer: string): string`
- `gradeAnswer(deck, cardId, response)`

返回 cardId、correct、expected、quote、sourceId、start、end、method 和 feedback。未知卡片 ID 和非字符串响应抛出错误。反馈保留原预期答案和原引文；规范化只用于比较，不能重写证据。

保持前面阶段正常工作。在自己的学习者工作区实现这些函数；推演示例时先不打开参考解答。

## 提示与失败情况

测试相近的正例与反例。子串规则会错误接受 not paper envelopes。保持精确相等规则，并在 method 字段说明显式变体。不要把正确与否解释为置信度分数。

## 运行本阶段

从仓库根目录初始化一次，然后运行累计测试：

```bash
python3 scripts/project_test.py source-grounded-study-coach --init my-source-grounded-study-coach
python3 scripts/project_test.py source-grounded-study-coach --stage 2 --path my-source-grounded-study-coach
```

起始代码故意抛出未实现错误。再次初始化会保留已有源码，不会替换。所有选定测试都必须实际运行才能通过；跳过测试不构成完成证据。

## 检查你的推理

若 accepted 未包含某个科学上有效的同义表达，会发生什么？如何让教师复核这些假阴性，同时不削弱证据要求？

## 接入最终交付物

独立的答案揭示练习页面，以及包含到期卡片和可复算计划状态的 progress.json。 核心采用人工编写的题目，对答案进行规范化后的精确匹配。它不评判任意文章，也不推断学习者是否理解。复习间隔采用确定性的教学策略，不代表经过实证验证的学习效果。来源偏移量使用 JavaScript UTF-16 代码单元。

完成项目后，尝试自己的输入：

```bash
cd my-source-grounded-study-coach
node --experimental-strip-types main.ts --deck ./fixtures/deck.json --attempts ./fixtures/attempts.json --initial-date 2026-09-01 --date 2026-09-03 --out ./study-output
```

新增申诉事件，保存学习者响应供教师审阅。人工复核结果与自动评分分开记录，并对可接受答案的修改进行版本管理。

## 权威参考资料

[官方 API 文档](https://nodejs.org/api/typescript.html)。实现、示例和夹具均为原创。参考资料解释底层 API；项目特定策略已在上文说明。
