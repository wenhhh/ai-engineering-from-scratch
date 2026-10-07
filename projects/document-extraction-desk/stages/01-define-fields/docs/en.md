# 抽取前先定义字段

**Type:** Build
**Language:** Python
**Stage:** 1 of 4
**Time:** ~2 小时，需先完成链接中的先修内容
**Prerequisites:** [开发环境](../../../../../phases/00-setup-and-tooling/01-dev-environment/docs/en.md)、[数据管理](../../../../../phases/00-setup-and-tooling/09-data-management/docs/en.md)。

## 构建内容

本阶段属于文档抽取审阅台：从文本文档抽取结构化字段，检查精确来源区间，并在导出前批准存在歧义的值。

公共契约为 `validate_schema(schema)`。随附 CLI 和样本文件位于你的工作区；在 `main.py` 实现领域函数。保留函数签名，让其他应用也能通过同一接口调用。

## 推演实现机制

模式规定文档读取器与下游应用之间的约定。每个字段都有稳定的机器名称、接受的行标签、类型及必需标记。一个标签只能属于一个字段，否则尚未涉及模型，同一来源行便已经有两个互不相容的目标。

模式校验与抽取分开执行。必需值缺失属于文档问题，字段类型无效属于模式编写问题。区分两者，才能给出有用错误，避免返回貌似成功的空答案。

| 字段 | 标签 | 类型 | 必需 |
|---|---|---|---|
| requester | Requester, Requested by | text | 是 |
| seats | Seats, Attendees | integer | 是 |
| delivery | Delivery, Delivery date | date | 是 |

## 运行前先预测

将 Seats 标签同时加入两个字段，预测程序应在哪里停止。不必读取来源文档，就能发现这项冲突。

```figure
pj-document-extraction-desk-1
```

修改图表输入并检查计算值。将一项结果变化对应到实现中的某行代码；图表用于说明机制，不能替代真实程序。

## 构建与验证

从仓库根目录执行一次初始化，复制公共类型、函数占位实现、可运行的命令包装器和原始样本输入。领域函数尚未实现时，第一次阶段测试应失败。

```bash
python3 scripts/project_test.py document-extraction-desk --init my-document-extraction-desk
python3 scripts/project_test.py document-extraction-desk --stage 1 --path my-document-extraction-desk --strict
```

使用标准库实现契约。先手工推演示例，保持调用方输入不变，并用能够指导修正的错误拒绝畸形数据。测试导入你的工作区，不导入参考解答。

## 分步提示

1. 遍历标签前先校验字段结构。
2. 分别跟踪字段名称与规范化后的标签标识。
3. 保留展示标签原文，以大小写折叠后的形式比较。

## 预期结果

本阶段完成后，评分器应报告第 1 阶段的真实测试通过。全部四阶段完成后，先用随附样本运行工具，再换成自己的输入：

```bash
cd my-document-extraction-desk
python3 cli.py sample.txt --schema schema.json --output output/review.html
```

最终交付物是本地 HTML 审阅台，可下载与来源绑定的审批决定，以及已批准值的 JSON 映射。打开 HTML 并检查配套 JSON，不要只相信退出码。改变一项输入，准确说明哪项结果必须随之变化。

## 扩展练习

增加可选的联系人字段，说明缺少它为何不应阻止必需字段的完成。

范围：核心接收 UTF-8 文本和带明确标签的字段，不提供 OCR 或 PDF 解析。外部 OCR 或模型适配器可通过 --proposals 提交候选，但每个引文及偏移量都须接受检查。来源位置正确仍不足以证明字段含义正确。

权威参考：[Python 正则表达式匹配偏移量](https://docs.python.org/3/library/re.html#match-objects)。实现和练习数据均为原创教学示例。
