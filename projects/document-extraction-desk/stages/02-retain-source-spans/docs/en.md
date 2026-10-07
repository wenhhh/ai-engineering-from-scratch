# 抽取候选值并保留证据

**Type:** Build
**Language:** Python
**Stage:** 2 of 4
**Time:** ~2 小时，需先完成链接中的先修内容
**Prerequisites:** 前一阶段，以及[开发环境](../../../../../phases/00-setup-and-tooling/01-dev-environment/docs/en.md)、[数据管理](../../../../../phases/00-setup-and-tooling/09-data-management/docs/en.md)。

## 构建内容

本阶段属于文档抽取审阅台：从文本文档抽取结构化字段，检查精确来源区间，并在导出前批准存在歧义的值。

公共契约为 `extract_candidates(text, schema)`。随附 CLI 和样本文件位于你的工作区；在 `main.py` 实现领域函数。保留函数签名，让其他应用也能通过同一接口调用。

## 推演实现机制

将候选值视为待审阅的提议，不直接当作事实。重复的 Seats 标签应产生两个候选，不能静默选取最后一次出现的值。每项提议包含逐字引文及左闭右开的字符区间：text[start:end] 必须等于 quote。

偏移量对应原文中的 Python Unicode 字符位置。不要先规范化整篇文档，再将所得偏移量用于原文。修剪候选值会改变起止位置，因此计算偏移量时应计入被移除的前导空白。

| 来源 | 候选状态 |
|---|---|
| Seats: 18 | 第一项 seats 候选 |
| Seats: 24 | 第二项 seats 候选 |
| Delivery: 2026-10-14 | 一项日期候选 |

## 运行前先预测

在 Seats 前放置非 ASCII 姓名，手工计算候选区间。通过切片验证，避免用字节数代替字符位置。

```figure
pj-document-extraction-desk-2
```

修改图表输入并检查计算值。将一项结果变化对应到实现中的某行代码；图表用于说明机制，不能替代真实程序。

## 构建与验证

从仓库根目录执行一次初始化，复制公共类型、函数占位实现、可运行的命令包装器和原始样本输入。领域函数尚未实现时，第一次阶段测试应失败。

```bash
python3 scripts/project_test.py document-extraction-desk --init my-document-extraction-desk
python3 scripts/project_test.py document-extraction-desk --stage 2 --path my-document-extraction-desk --strict
```

使用标准库实现契约。先手工推演示例，保持调用方输入不变，并用能够指导修正的错误拒绝畸形数据。测试导入你的工作区，不导入参考解答。

## 分步提示

1. 对捕获的值使用 match.start。
2. 保留每一次识别到的出现位置。
3. 任何审批之前，先比较切片与引文。

## 预期结果

本阶段完成后，评分器应报告第 1—2 阶段的真实测试通过。全部四阶段完成后，先用随附样本运行工具，再换成自己的输入：

```bash
cd my-document-extraction-desk
python3 cli.py sample.txt --schema schema.json --output output/review.html
```

最终交付物是本地 HTML 审阅台，可下载与来源绑定的审批决定，以及已批准值的 JSON 映射。打开 HTML 并检查配套 JSON，不要只相信退出码。改变一项输入，准确说明哪项结果必须随之变化。

## 扩展练习

输入外部抽取器编造的引文，并要求程序明确拒绝。

范围：核心接收 UTF-8 文本和带明确标签的字段，不提供 OCR 或 PDF 解析。外部 OCR 或模型适配器可通过 --proposals 提交候选，但每个引文及偏移量都须接受检查。来源位置正确仍不足以证明字段含义正确。

权威参考：[Python 正则表达式匹配偏移量](https://docs.python.org/3/library/re.html#match-objects)。实现和练习数据均为原创教学示例。
