# 导入具有稳定标识的反馈

**Type:** Build
**Language:** TypeScript
**Stage:** 1 of 4
**Time:** ~2 小时，需先完成链接中的先修内容
**Prerequisites:** [开发环境](../../../../../phases/00-setup-and-tooling/01-dev-environment/docs/en.md)、[数据管理](../../../../../phases/00-setup-and-tooling/09-data-management/docs/en.md)。

## 构建内容

本阶段属于反馈主题看板：依据可检查的短语证据归类产品反馈，统计不同来源，并导出本地问题草稿。

公共契约为 `parseFeedback(text); validateThemes(value)`。随附 CLI 和样本文件位于你的工作区；在 `main.ts` 实现领域函数。保留函数签名，让其他应用也能通过同一接口调用。

## 推演实现机制

每条反馈记录都需要 ID、原始文本和来源标签。ID 标识记录，来源标签标识计数时使用的自报出处；二者不能互换，同一来源可以提交多条记录。

按物理行逐行读取 JSONL，即使跳过空行，也要保留错误行号。单独校验主题配置。每个主题有稳定 ID、展示标题和少量词语短语。限制输入规模，让教学工作流保持可预测。

| 记录 | 来源 | 含义 |
|---|---|---|
| f-1 | interview-a | 一条反馈记录 |
| f-3 | interview-a | 另一条记录，来源标签相同 |
| f-4 | interview-c | 不同来源标签 |

## 运行前先预测

在畸形 JSON 之前插入空行，预测报告的物理行号。随后复制一个 ID，说明为何必须失败。

```figure
pj-feedback-theme-board-1
```

译注：图表限制：本示例只转小写，未执行实际 TypeScript 实现的 NFKC 规范化；全角等兼容字符可能得到不同匹配结果。

修改图表输入并检查计算值。将一项结果变化对应到实现中的某行代码；图表用于说明机制，不能替代真实程序。

## 构建与验证

从仓库根目录执行一次初始化，复制公共类型、函数占位实现、可运行的命令包装器和原始样本输入。领域函数尚未实现时，第一次阶段测试应失败。

```bash
python3 scripts/project_test.py feedback-theme-board --init my-feedback-theme-board
python3 scripts/project_test.py feedback-theme-board --stage 1 --path my-feedback-theme-board --strict
```

使用标准库实现契约。先手工推演示例，保持调用方输入不变，并用能够指导修正的错误拒绝畸形数据。测试导入你的工作区，不导入参考解答。

## 分步提示

1. 过滤空行之前先计数行号。
2. 拒绝重复的记录 ID。
3. 匹配任何反馈前，先校验短语及其规模限制。

## 预期结果

本阶段完成后，评分器应报告第 1 阶段的真实测试通过。全部四阶段完成后，先用随附样本运行工具，再换成自己的输入：

```bash
cd my-feedback-theme-board
node cli.ts sample.jsonl themes.json output
```

最终交付物是可移植的证据看板、JSON 汇总，以及尚未发送的 Markdown 调查草稿。打开 HTML 并检查配套 JSON，不要只相信退出码。改变一项输入，准确说明哪项结果必须随之变化。

## 扩展练习

为导出的支持反馈 CSV 编写加载器，输出完全符合此 JSONL 契约的数据。

范围：基线匹配明确的词语短语，不判断语义情感或事实真伪。不同来源标签不等同于已核实的人员或市场规模。可选模型建议保存成独立配置提案，使用前须审阅；不会向问题追踪系统发布内容。

权威参考：[JSON 文本交换，RFC 8259](https://www.rfc-editor.org/rfc/rfc8259)。实现和练习数据均为原创教学示例。
