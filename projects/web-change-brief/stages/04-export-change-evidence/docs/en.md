# 导出供人检查的简报

> 在来源和哈希旁展示新增及移除的精确语句。

**Type:** Build  
**Language:** Go  
**Stage:** 第 4 阶段，共 4 阶段  
**Time:** 约 2 小时

## 构建目标

报告应让读者无需查看原始 HTML 就能知道变化。列出新增和移除的精确规范化语句、出现次数，以及未变块数量。包含来源 URL 和两个哈希，便于其他工具把简报关联回保存的快照。

```figure
pj-web-change-brief-4
```

译注：实际 CLI 无条件把新快照写到输出目录的 baseline.json。若 --out 与已有 --baseline 的目录相同，即使没有 --accept，也会覆盖该基线。使用不同的新输出目录；本问题按上游原行为保留，未通过翻译修改。

## 示例推演

创客空间夹具把维修开始时间从 14:00 改为 15:00，志愿者剩余名额从三个减为一个，并增加无台阶入口说明。导航计数和页脚时间戳变化不显示。报告保留前后语句，不编造对其意图的概括。

编码前写出该示例的返回字段及一个应失败的输入。将预期结果放在实现旁，便于区分契约变化和程序缺陷。

## 实现契约

- `ExportBrief(brief Brief, directory string) error`
- `CLI flags: --before, --after, --url, --out, --fetch, --baseline, --accept, --ignore`

写入 changes.json 和 index.html。使用 html/template 转义不可信网页文本，并安全处理 URL 上下文。空变化列表明确显示没有变化。CLI 也把新快照写入输出目录；在线模式只有提供 --accept 时才覆盖已有基线。出错返回非零退出码。

保持前面阶段继续工作。在学习者工作区实现这些函数；推演示例时先不打开参考解答。

## 提示与失败情况

构造包含类似脚本文本块的 Brief，验证 HTML 含有转义文本。解码 JSON 报告，检查出现次数。对不同的已保存文件运行真实 CLI，再打开输出，不要仅靠模板源码评价页面。

## 运行本阶段

从仓库根目录初始化一次，然后运行累计测试：

```bash
python3 scripts/project_test.py web-change-brief --init my-web-change-brief
python3 scripts/project_test.py web-change-brief --stage 4 --path my-web-change-brief
```

起始代码故意抛出未实现错误。再次初始化保留已有源文件，不会将其替换。通过结果要求每项所选测试都实际运行；跳过测试不构成完成证据。

## 检查你的推理

哪些内容可由人直接从报告确认，哪些还需要原始 HTML 或渲染页面？为什么自动生成的叙述不能替代精确变化证据？

## 接入最终交付物

独立变化报告、changes.json，以及可复用的 baseline.json 快照。 提取器是有意限制能力的可读文本块扫描器，不是 HTML5 DOM 或浏览器。它不执行 JavaScript、不判断 CSS 可见性，也不获取链接资源。比较时忽略块顺序，但保留重复文本次数。过滤短语可能隐藏有用变化，因此两个快照须使用同一套明确的过滤策略。

完成项目后，尝试自己的输入：

```bash
cd my-web-change-brief
go run . --before fixtures/before.html --after fixtures/after.html --url https://example.invalid/makerspace --out ./web-change-output
```

为团队交接增加审阅备注字段或 Markdown 导出。自动对外通知作为独立配置的集成，并设置自己的测试。

## 权威参考资料

[官方 API 文档](https://pkg.go.dev/net/http)。实现、示例与夹具均为原创。参考资料解释底层 API，项目特定策略已在上文说明。
