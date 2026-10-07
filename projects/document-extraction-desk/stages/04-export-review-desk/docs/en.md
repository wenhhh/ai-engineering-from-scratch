# 展示证据并导出已审阅值

**Type:** Build
**Language:** Python
**Stage:** 4 of 4
**Time:** ~2 小时，需先完成链接中的先修内容
**Prerequisites:** 前一阶段，以及[开发环境](../../../../../phases/00-setup-and-tooling/01-dev-environment/docs/en.md)、[数据管理](../../../../../phases/00-setup-and-tooling/09-data-management/docs/en.md)。

## 构建内容

本阶段属于文档抽取审阅台：从文本文档抽取结构化字段，检查精确来源区间，并在导出前批准存在歧义的值。

公共契约为 `render_review(report)`。随附 CLI 和样本文件位于你的工作区；在 `main.py` 实现领域函数。保留函数签名，让其他应用也能通过同一接口调用。

## 推演实现机制

围绕尚未解决的选择设计界面。选中候选时高亮其精确来源区间，字段旁始终显示原文。下载决定只创建本地 JSON 文件，不向其他地方提交值。再次以 --approve 运行 CLI，重新校验并导出已批准值。

在每个字段中以 `selected` 的 start/end 对保留已批准候选。重新打开已批准报告时，对应候选的单选控件应保持选中。未修改内容直接再次下载，决定必须保持不变。

使用安全的 DOM 文本操作和经过转义的 HTML。文档可能含有标记语法，必须按普通文本处理。在决定文件中保留来源指纹，即使审阅页一直开着，CLI 也能拒绝过期选择。

| 交付物 | 使用方 |
|---|---|
| review.html | 人工阅读来源并选择 |
| approvals.json | CLI 校验所选区间 |
| review.json approvedValues | 其他应用导入已审阅字段 |

## 运行前先预测

在浏览器选中一个 Seats 候选，确认高亮文本与其完全一致。应用决定前，先下载并检查决定 JSON。

```figure
pj-document-extraction-desk-4
```

修改图表输入并检查计算值。将一项结果变化对应到实现中的某行代码；图表用于说明机制，不能替代真实程序。

## 构建与验证

从仓库根目录执行一次初始化，复制公共类型、函数占位实现、可运行的命令包装器和原始样本输入。领域函数尚未实现时，第一次阶段测试应失败。

```bash
python3 scripts/project_test.py document-extraction-desk --init my-document-extraction-desk
python3 scripts/project_test.py document-extraction-desk --stage 4 --path my-document-extraction-desk --strict
```

使用标准库实现契约。先手工推演示例，保持调用方输入不变，并用能够指导修正的错误拒绝畸形数据。测试导入你的工作区，不导入参考解答。

## 分步提示

1. 将控件绑定到偏移量，不绑定复制的标签。
2. 同时转义文档内容和序列化的脚本数据。
3. 缺失字段仍须可见，不能将其隐藏。

## 预期结果

本阶段完成后，评分器应报告第 1—4 阶段的真实测试通过。全部四阶段完成后，先用随附样本运行工具，再换成自己的输入：

```bash
cd my-document-extraction-desk
python3 cli.py sample.txt --schema schema.json --output output/review.html
```

最终交付物是本地 HTML 审阅台，可下载与来源绑定的审批决定，以及已批准值的 JSON 映射。打开 HTML 并检查配套 JSON，不要只相信退出码。改变一项输入，准确说明哪项结果必须随之变化。

## 扩展练习

编写一个小型消费程序，拒绝状态为 needs_review 的报告。

范围：核心接收 UTF-8 文本和带明确标签的字段，不提供 OCR 或 PDF 解析。外部 OCR 或模型适配器可通过 --proposals 提交候选，但每个引文及偏移量都须接受检查。来源位置正确仍不足以证明字段含义正确。

权威参考：[Python 正则表达式匹配偏移量](https://docs.python.org/3/library/re.html#match-objects)。实现和练习数据均为原创教学示例。
