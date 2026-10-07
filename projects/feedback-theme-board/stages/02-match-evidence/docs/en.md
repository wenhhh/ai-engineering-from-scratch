# 匹配短语并保留原文区间

**Type:** Build
**Language:** TypeScript
**Stage:** 2 of 4
**Time:** ~2 小时，需先完成链接中的先修内容
**Prerequisites:** 前一阶段，以及[开发环境](../../../../../phases/00-setup-and-tooling/01-dev-environment/docs/en.md)、[数据管理](../../../../../phases/00-setup-and-tooling/09-data-management/docs/en.md)。

## 构建内容

本阶段属于反馈主题看板：依据可检查的短语证据归类产品反馈，统计不同来源，并导出本地问题草稿。

公共契约为 `findEvidence(row, phrase)`。随附 CLI 和样本文件位于你的工作区；在 `main.ts` 实现领域函数。保留函数签名，让其他应用也能通过同一接口调用。

## 推演实现机制

对原始文本分词时保留每个词的起止位置。规范化词值用于匹配，但引文从原始字符串提取。连续词比较可以避免子串误匹配，例如把 slowdown 中的 slow 当作独立词。

本阶段说明规则为何匹配，不证明反馈事实正确或情感消极。否定句也可能包含目标短语。应让这种限制保持可见，便于后续使用者审阅证据，而非盲信分类标签。

| 文本 | 短语 | 结果 |
|---|---|---|
| Search results show old pages. | old pages | 精确来源引文 |
| The old homepage changed. | old pages | 未匹配 |
| No more old pages appear. | old pages | 匹配，但仍需解释含义 |

## 运行前先预测

在匹配短语前增加 emoji。确认 JavaScript slice 使用 UTF-16 偏移量仍能还原引文。

```figure
pj-feedback-theme-board-2
```

译注：图表限制：本示例只转小写，未执行实际 TypeScript 实现的 NFKC 规范化；全角等兼容字符可能得到不同匹配结果。

修改图表输入并检查计算值。将一项结果变化对应到实现中的某行代码；图表用于说明机制，不能替代真实程序。

## 构建与验证

从仓库根目录执行一次初始化，复制公共类型、函数占位实现、可运行的命令包装器和原始样本输入。领域函数尚未实现时，第一次阶段测试应失败。

```bash
python3 scripts/project_test.py feedback-theme-board --init my-feedback-theme-board
python3 scripts/project_test.py feedback-theme-board --stage 2 --path my-feedback-theme-board --strict
```

使用标准库实现契约。先手工推演示例，保持调用方输入不变，并用能够指导修正的错误拒绝畸形数据。测试导入你的工作区，不导入参考解答。

## 分步提示

1. 为每个原始词保留 match.index。
2. 比较规范化后的词值，不使用规范化整篇文本所得的偏移量。
3. 返回最小的匹配区间。

## 预期结果

本阶段完成后，评分器应报告第 1—2 阶段的真实测试通过。全部四阶段完成后，先用随附样本运行工具，再换成自己的输入：

```bash
cd my-feedback-theme-board
node cli.ts sample.jsonl themes.json output
```

最终交付物是可移植的证据看板、JSON 汇总，以及尚未发送的 Markdown 调查草稿。打开 HTML 并检查配套 JSON，不要只相信退出码。改变一项输入，准确说明哪项结果必须随之变化。

## 扩展练习

另用启发式规则标记需审阅的否定表达，并测量误报。

范围：基线匹配明确的词语短语，不判断语义情感或事实真伪。不同来源标签不等同于已核实的人员或市场规模。可选模型建议保存成独立配置提案，使用前须审阅；不会向问题追踪系统发布内容。

权威参考：[JSON 文本交换，RFC 8259](https://www.rfc-editor.org/rfc/rfc8259)。实现和练习数据均为原创教学示例。
