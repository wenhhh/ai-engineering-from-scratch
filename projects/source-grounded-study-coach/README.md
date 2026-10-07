# 基于来源证据的学习教练（Source-Grounded Study Coach）

构建有来源证据支持的练习题，并展示复习计划。

你将构建独立的答案揭示练习页面，以及包含到期卡片和可复算计划状态的 progress.json。输入为 JSON 题卡集，包含来源段落、人工编写的问题、可接受答案和证据偏移量，以及带日期的答题事件。

## 开始之前

需要 Node.js 22.18 或更新版本。必需核心使用标准库并可离线运行。TypeScript 使用同一组明确的数据类型，完成题卡校验、事件处理和可移植的 HTML 练习展示。

- 能够编写 TypeScript 函数、数组和对象类型。
- 能够从本地文件读取 JSON，并处理抛出的错误。
- 理解答案字符串匹配不等于语义理解。

## 动手构建

```bash
python3 scripts/project_test.py source-grounded-study-coach --init my-source-grounded-study-coach
python3 scripts/project_test.py source-grounded-study-coach --stage 1 --path my-source-grounded-study-coach
python3 scripts/project_test.py source-grounded-study-coach --all --solution --strict
```

第一条命令创建一个故意未完成的工作区。后续阶段扩展同一个源文件，并在测试中加入新的留出输入。参考实现通过仅验证示例，不会授予学习者证书。

## 使用方法

```bash
cd projects/source-grounded-study-coach/solution
node --experimental-strip-types main.ts --deck ./fixtures/deck.json --attempts ./fixtures/attempts.json --initial-date 2026-09-01 --date 2026-09-03 --out ./study-output
```

在本地打开生成的 index.html。输入答案，揭示证据，再选择“检查并记录我的答案（Check and record my answer）”。下载答题 JSON，保留本次实际输入与先前事件。同一页面会话中再次记录某张卡片，会更新该卡片的一条新增答题记录；下载前重新加载页面会丢失该记录。浏览器按同一确定性策略立即显示下次到期日。

使用下载的文件重新运行调度器：

```bash
node --experimental-strip-types main.ts --deck ./fixtures/deck.json --attempts ./attempts.json --initial-date 2026-09-01 --date 2026-09-03 --out ./next-study-output
```

将页面所选复习日期用于 --date。浏览器中的处理全部在本地进行。你可以把 HTML 和 JSON 接入自己的流程，也可以从 main 导入具名函数。随附演示使用原创夹具运行同一实现：

```bash
node --experimental-strip-types demo.ts
```

## 阶段

1. [为每个答案标明来源位置](stages/01-ground-the-deck/docs/en.md)
2. [返回附带来源的反馈](stages/02-grade-with-evidence/docs/en.md)
3. [回放答题事件，生成可见复习计划](stages/03-schedule-review/docs/en.md)
4. [将阅读内容变成实用练习页面](stages/04-export-practice/docs/en.md)

## 结果能够说明什么

核心采用人工编写的题目，对答案进行规范化后的精确匹配。它不评判任意文章，也不推断学习者是否理解。复习间隔采用确定性的教学策略，不代表经过实证验证的学习效果。来源偏移量使用 JavaScript UTF-16 代码单元。

可选：追加 --provider-url http://127.0.0.1:1234/v1/chat/completions --model YOUR_MODEL。需要认证时，通过 STUDY_MODEL_API_KEY 提供。端点接收第一个来源段落，必须返回逐字引文和答案。建议单独写入 card-proposal.json 供审阅，绝不静默加入题卡集。

服务商测试使用受控响应或回环 HTTP，验证请求和响应契约，不验证模型质量或在线服务可用性。本项目不配置账户连接、消息发送、周期任务或云部署。

## 接入自己的场景

将人工夹具替换为自己工作流的一小份导出，运行前写下预期结果。另保留一组样例用于评估。有用的前后对比应展示输入、可检查的中间证据和可移植输出，不能用流行程度的宣传替代实际测量。

## 权威参考资料

[官方 API 文档](https://nodejs.org/api/typescript.html)。项目代码、课程正文和夹具均为原创。

译注：展示范围：原测试依赖 Check and record my answer、Download attempts JSON 及 Accepted 标签，页面保留这些英文并附中文说明，未修改测试。题卡、答案、评分反馈字段和模型提示保留原值。可选提议适配器允许任意 HTTP(S) 端点，未显式禁止重定向，且在完整读取响应后才检查字符串长度；这些行为不构成安全的远程服务边界。
