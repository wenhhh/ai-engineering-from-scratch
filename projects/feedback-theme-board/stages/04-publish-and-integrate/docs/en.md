# 发布证据与可审阅的调查草稿

**Type:** Build
**Language:** TypeScript
**Stage:** 4 of 4
**Time:** ~2 小时，需先完成链接中的先修内容
**Prerequisites:** 前一阶段，以及[开发环境](../../../../../phases/00-setup-and-tooling/01-dev-environment/docs/en.md)、[数据管理](../../../../../phases/00-setup-and-tooling/09-data-management/docs/en.md)。

## 构建内容

本阶段属于反馈主题看板：依据可检查的短语证据归类产品反馈，统计不同来源，并导出本地问题草稿。

公共契约为 `draftIssue(theme); renderBoard(board)`。随附 CLI 和样本文件位于你的工作区；在 `main.ts` 实现领域函数。保留函数签名，让其他应用也能通过同一接口调用。

## 推演实现机制

看板应让来源引文比醒目的汇总数字更便于检查。每个主题旁展示证据、来源标签和偏移量，并包含未匹配记录和重复数量。转义全部用户文本，包括来源标签。

每个主题导出一份本地 Markdown 调查草稿。草稿建议复现被报告的使用障碍，不能把关键词匹配写成已确认缺陷。可选模型可通过 --suggest 建议主题规则，但输出单独保存，并在人工采用之前通过同一模式校验。

| 交付物 | 下一步操作 |
|---|---|
| board.html | 审阅精确引文 |
| board.json | 在其他工具中比较运行结果 |
| first-run.md | 在本地编辑调查草稿 |
| themes.proposed.json | 审阅可选模型建议 |

## 运行前先预测

查看 first-run 的计数和旁边两条引文。解释草稿为何写一个来源标签，不能写两个客户。

```figure
pj-feedback-theme-board-4
```

译注：图表限制：本示例只转小写，未执行实际 TypeScript 实现的 NFKC 规范化；全角等兼容字符可能得到不同匹配结果。

修改图表输入并检查计算值。将一项结果变化对应到实现中的某行代码；图表用于说明机制，不能替代真实程序。

## 构建与验证

从仓库根目录执行一次初始化，复制公共类型、函数占位实现、可运行的命令包装器和原始样本输入。领域函数尚未实现时，第一次阶段测试应失败。

```bash
python3 scripts/project_test.py feedback-theme-board --init my-feedback-theme-board
python3 scripts/project_test.py feedback-theme-board --stage 4 --path my-feedback-theme-board --strict
```

使用标准库实现契约。先手工推演示例，保持调用方输入不变，并用能够指导修正的错误拒绝畸形数据。测试导入你的工作区，不导入参考解答。

## 分步提示

1. 从导出为 JSON 的同一个 board 对象渲染。
2. 问题草稿只在本地显式写入。
3. 将模型建议配置与已接受配置分开保存。

## 预期结果

本阶段完成后，评分器应报告第 1—4 阶段的真实测试通过。全部四阶段完成后，先用随附样本运行工具，再换成自己的输入：

```bash
cd my-feedback-theme-board
node cli.ts sample.jsonl themes.json output
```

最终交付物是可移植的证据看板、JSON 汇总，以及尚未发送的 Markdown 调查草稿。打开 HTML 并检查配套 JSON，不要只相信退出码。改变一项输入，准确说明哪项结果必须随之变化。

## 扩展练习

将 board.json 输入优先级规划工具，要求它保留原始证据链接。

范围：基线匹配明确的词语短语，不判断语义情感或事实真伪。不同来源标签不等同于已核实的人员或市场规模。可选模型建议保存成独立配置提案，使用前须审阅；不会向问题追踪系统发布内容。

权威参考：[JSON 文本交换，RFC 8259](https://www.rfc-editor.org/rfc/rfc8259)。实现和练习数据均为原创教学示例。
