# 统计证据并避免夸大来源支持

**Type:** Build
**Language:** TypeScript
**Stage:** 3 of 4
**Time:** ~2 小时，需先完成链接中的先修内容
**Prerequisites:** 前一阶段，以及[开发环境](../../../../../phases/00-setup-and-tooling/01-dev-environment/docs/en.md)、[数据管理](../../../../../phases/00-setup-and-tooling/09-data-management/docs/en.md)。

## 构建内容

本阶段属于反馈主题看板：依据可检查的短语证据归类产品反馈，统计不同来源，并导出本地问题草稿。

公共契约为 `buildBoard(rows, themes)`。随附 CLI 和样本文件位于你的工作区；在 `main.ts` 实现领域函数。保留函数签名，让其他应用也能通过同一接口调用。

## 推演实现机制

重复记录和重复来源会造成不同计数错误。对同一来源、规范化后相同的文本去重，并保留重复关系供检查。随后在每个主题内统计唯一来源标签。interview-a 的两条不同记录仍只对应一个来源标签。

一条记录可以匹配多个主题，因此各主题总数不必相加等于输入记录数。将未匹配反馈留在可见队列中；丢弃它们会让看板偏向原本就预期存在的类别。

| 样本主题 | 匹配记录 | 不同来源标签 |
|---|---|---|
| 首次有效运行（First useful run） | 2 | 1 |
| 搜索内容过期（Stale search） | 2 | 2 |
| 搜索延迟（Search latency） | 1 | 1 |

## 运行前先预测

先使用新 ID、相同来源复制 f-1，再使用不同来源复制，解释两个计数应如何变化。

```figure
pj-feedback-theme-board-3
```

译注：图表限制：本示例只转小写，未执行实际 TypeScript 实现的 NFKC 规范化；全角等兼容字符可能得到不同匹配结果。

修改图表输入并检查计算值。将一项结果变化对应到实现中的某行代码；图表用于说明机制，不能替代真实程序。

## 构建与验证

从仓库根目录执行一次初始化，复制公共类型、函数占位实现、可运行的命令包装器和原始样本输入。领域函数尚未实现时，第一次阶段测试应失败。

```bash
python3 scripts/project_test.py feedback-theme-board --init my-feedback-theme-board
python3 scripts/project_test.py feedback-theme-board --stage 3 --path my-feedback-theme-board --strict
```

使用标准库实现契约。先手工推演示例，保持调用方输入不变，并用能够指导修正的错误拒绝畸形数据。测试导入你的工作区，不导入参考解答。

## 分步提示

1. 使用来源与规范化文本的指纹检测重复。
2. 为每个主题建立来源标签集合。
3. 在结果中保留未匹配记录与重复记录。

## 预期结果

本阶段完成后，评分器应报告第 1—3 阶段的真实测试通过。全部四阶段完成后，先用随附样本运行工具，再换成自己的输入：

```bash
cd my-feedback-theme-board
node cli.ts sample.jsonl themes.json output
```

最终交付物是可移植的证据看板、JSON 汇总，以及尚未发送的 Markdown 调查草稿。打开 HTML 并检查配套 JSON，不要只相信退出码。改变一项输入，准确说明哪项结果必须随之变化。

## 扩展练习

比较两份主题配置，报告哪些记录的主题归属发生变化。

范围：基线匹配明确的词语短语，不判断语义情感或事实真伪。不同来源标签不等同于已核实的人员或市场规模。可选模型建议保存成独立配置提案，使用前须审阅；不会向问题追踪系统发布内容。

权威参考：[JSON 文本交换，RFC 8259](https://www.rfc-editor.org/rfc/rfc8259)。实现和练习数据均为原创教学示例。
