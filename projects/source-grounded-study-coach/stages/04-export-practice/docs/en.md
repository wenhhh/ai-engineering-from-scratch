# 将阅读内容变成实用练习页面

> 导出可移植的答案揭示与复习页面，保留可复算进度。

**Type:** Build  
**Language:** TypeScript  
**Stage:** 第 4 阶段，共 4 阶段  
**Time:** 约 2 小时

## 构建目标

完成的页面让学习者输入答案，再揭示预期答案和支持引文，并显示每张卡片的到期日。揭示来源后，在本地检查并记录实际输入的答案。页面显示下次到期日，将先前与新增答题记录一起下载为 CLI 可用的 JSON。同一卡片再次记录会修改当前会话中的答题记录；下载前重新加载会丢失它。页面不发起网络请求。

```figure
pj-source-grounded-study-coach-4
```

译注：图表范围：前三图分别演示局部证据、字符串匹配和一次间隔计算，第四图使用固定三张卡片到期日，不读取实际题卡与答题日志。它不替代完整去重、版本迁移或页面事件回放。

## 示例推演

人工编写的种子图书馆题卡集包含三张卡片。存储问题答对两次、采收年份问题答错一次后，9 月 3 日报告将未练习的分类卡片和采收年份卡片列为到期；存储卡片则在 9 月 4 日到期。重新导出相同事件会得到相同日期。

编码前，写下该示例的返回字段，以及一个应当失败的输入。将预期结果放在实现旁边，以便区分契约变化与程序缺陷。

## 实现契约

- `renderPractice(deck, progress, date): string`
- `exportPractice(deck, attempts, initialDate, date, out)`
- `proposeCard(source, endpoint, model, apiKey="")`

写入 progress.json 和 index.html。拒绝早于初始日期或任一次答题日期的报告日期。转义问题、答案、来源标题和引文。注明精确评分方法与教学调度策略。可选真实 HTTP 提议适配器要求非空问题、答案与逐字引文，且答案出现在引文内、引文出现在来源内。模型建议单独保存，供作者审阅。

保持前面阶段正常工作。在自己的学习者工作区实现这些函数；推演示例时先不打开参考解答。

## 提示与失败情况

使用原生 details/summary 揭示答案，使页面无需框架或服务器。测试类似 HTML 的来源标题。适配器验证可启动本地 HTTP 服务器，检查发出的请求，并分别返回有效及伪造证据。

## 运行本阶段

从仓库根目录初始化一次，然后运行累计测试：

```bash
python3 scripts/project_test.py source-grounded-study-coach --init my-source-grounded-study-coach
python3 scripts/project_test.py source-grounded-study-coach --stage 4 --path my-source-grounded-study-coach
```

起始代码故意抛出未实现错误。再次初始化会保留已有源码，不会替换。所有选定测试都必须实际运行才能通过；跳过测试不构成完成证据。

## 检查你的推理

仅有 index.html 时，学习者可离线做什么？要重新计算进度或迁移到其他界面，还需要保留什么？

## 接入最终交付物

独立的答案揭示练习页面，以及包含到期卡片和可复算计划状态的 progress.json。 核心采用人工编写的题目，对答案进行规范化后的精确匹配。它不评判任意文章，也不推断学习者是否理解。复习间隔采用确定性的教学策略，不代表经过实证验证的学习效果。来源偏移量使用 JavaScript UTF-16 代码单元。

完成项目后，尝试自己的输入：

```bash
cd my-source-grounded-study-coach
node --experimental-strip-types main.ts --deck ./fixtures/deck.json --attempts ./fixtures/attempts.json --initial-date 2026-09-01 --date 2026-09-03 --out ./study-output
```

使用“下载答题 JSON（Download attempts JSON）”按钮，再将该文件传给 --attempts，所选复习日期传给 --date。另设独立留出评估检查生成题目的质量；传输与浏览器事件导出可用，并不能证明题目优质。

## 权威参考资料

[官方 API 文档](https://nodejs.org/api/typescript.html)。实现、示例和夹具均为原创。参考资料解释底层 API；项目特定策略已在上文说明。
