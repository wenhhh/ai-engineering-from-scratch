# 发布报告

> 供人阅读的报告和供机器读取的轨迹服务于不同使用者。

**Type:** Build
**Languages:** Python, TypeScript
**Stage:** 第 6 阶段，共 7 阶段（core）
**Time:** 约 2 小时

## 构建目标

Python 运行流水线，将 `report.json` 与 `trace.json` 序列化。`viewer/render.ts` 消费 JSON 并生成自包含的 `report.html`。阅读器使用真正的 TypeScript，为章节、句子、片段、文档和轨迹定义接口。请使用内置类型剥离功能的 Node 22.18 或更新版本；上游记录的已验证本地运行时为 Node 25.6.1。

```figure
pj-rra-publish
```

JSON 边界要求发布契约在序列化后仍然成立。直接将 Python 对象传给模板无法验证该边界。TypeScript 类型注解用于描述契约；JSON 数据本身仍需运行时校验，才能拒绝格式损坏的文件。

## 保持证据契约完整

```json
{
  "schema_version": 1,
  "question": "How does a secrets proxy protect credentials?",
  "sections": [],
  "snippets": {},
  "documents": [],
  "trace": null
}
```

每个渲染出的引用都必须对应片段和文档，并校验原文切片等于片段文本。Python 偏移量按 Unicode 码点计数，JavaScript 字符串切片按 UTF-16 单元计数。应使用 `[...source.text].slice(start, end).join('')`，防止前面的 emoji 导致证据区间错位。

按首次出现顺序编号脚注。两个句子复用 `S4` 时，生成两个引用链接和一个脚注。即使复用脚注，提示框 ID 仍须唯一。对问题、章节标题、来源标题、片段和轨迹详情进行转义。来源链接仅允许 HTTP 或 HTTPS；单纯 HTML 转义无法消除 `javascript:` URL 的风险。

## 让交付物可用

鼠标悬停或键盘聚焦引用时，展示精确来源句子；点击后跳转到编号脚注。原生 `<details>` 展开运行轨迹，无需客户端框架或 JavaScript。页面适配浅色、深色偏好及手机视口。

报告作为本地文件仍然可用。交互仅依赖 HTML 和 CSS，阅读不需要网络服务，也无须安装软件包。

## 跟踪流水线

按顺序执行并计费：`index`、`plan`、`gather`、`write`、`verify`。每条记录包含名称、耗时毫秒数与结构化详情。轨迹中保留 `run_id`、`question`、`started_at`、`counts`、`budget` 和 `terminal_state`。

预算耗尽时追加 `budget_exceeded`，状态设为 `failed`，并渲染目前已经收集的证据。要区分有用的失败交付物与渲染器崩溃。运行未能收集到受支持论断时，空报告也属于合法结果。

## 你的任务

补全流水线、Python 载荷序列化器与进程适配器，以及带类型的渲染器。`run_pipeline` 返回 `(report, trace, html)`；提供输出目录时，还需写入三个文件。

```bash
python3 scripts/project_test.py research-report-agent --stage 6 --path my-report-agent
python3 projects/research-report-agent/solution/run_report.py \
  "How does a secrets proxy protect API keys from prompt injection?" \
  --code my-report-agent --out out
node my-report-agent/viewer/render.ts out/report.json out/report.html
open out/report.html
```

## 预期结果

参考命令生成 `completed` 状态、4 个章节、10 个句子，没有删除项。目录包含 `report.json`、`report.html` 和 `trace.json`。悬停或聚焦 `[1]` 查看精确引文，再展开轨迹检查五个步骤。耗时与运行 ID 会随执行变化。

第 6 阶段有 7 项 Node 测试和 7 项 Python 集成测试，覆盖 Unicode 偏移、转义、不安全 URL、重复引用、缺失证据及极小预算下的失败。

## 检查理解

渲染器已有类型，为什么仍需对 JSON 做运行时校验？emoji 后的 Python 与 JavaScript 偏移为什么不同？报告没有章节时，工程师需要从轨迹中看到什么？

## 进一步扩展

增加打印样式表，让脚注适配分页；也可在独立审阅区显示被删除论断。没有支持的论断必须与已发布证据明显区分。

## Orchard 示例推演

编码前，先学习 [Python 数据结构](https://docs.python.org/3/tutorial/datastructures.html)和[检索增强生成](../../../../../phases/11-llm-engineering/06-rag/docs/en.md). 请先完成 [第 5 阶段](../../05-verify-every-claim/docs/en.md)。

发布一个版本化报告载荷，同时交给 TypeScript 阅读器和独立报告评审器。Orchard 前后版本演示会生成 changes.json，列出删除的论断、新增的论断，以及变化的来源区间。

```text
report.json -> viewer + judge
60-minute sentence -> removed_claims
15-minute sentence -> added_claims
```

## 构建与检查

发布时再次校验来源切片。渲染 HTML 前先转义，来源内容只能作为数据处理，不能成为可执行标记。

在学习者工作区实现本阶段。随附命令行辅助程序通过适配器导入你的函数，不会用参考解答代替未完成的实现。

```bash
python3 scripts/project_test.py research-report-agent --stage 6 --path learning-artifacts/research-report-agent
```

先预测上面的中间状态，再运行本阶段。全新起始代码应当失败；参考实现运行通过，不能证明你的学习者工作区已经完成。

## 继续探究

审阅者如何区分“论断文字变化”，与“文字未变但支持证据变化”？
