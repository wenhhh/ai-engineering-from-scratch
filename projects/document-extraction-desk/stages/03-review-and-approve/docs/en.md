# 将审批绑定到单个文档版本

**Type:** Build
**Language:** Python
**Stage:** 3 of 4
**Time:** ~2 小时，需先完成链接中的先修内容
**Prerequisites:** 前一阶段，以及[开发环境](../../../../../phases/00-setup-and-tooling/01-dev-environment/docs/en.md)、[数据管理](../../../../../phases/00-setup-and-tooling/09-data-management/docs/en.md)。

## 构建内容

本阶段属于文档抽取审阅台：从文本文档抽取结构化字段，检查精确来源区间，并在导出前批准存在歧义的值。

公共契约为 `typed_value(quote, kind); review_document(text, schema, candidates, decisions=None)`。随附 CLI 和样本文件位于你的工作区；在 `main.py` 实现领域函数。保留函数签名，让其他应用也能通过同一接口调用。

## 推演实现机制

类型校验检查引文能否转换成要求的值：ISO 日期须对应真实日历日期，数字须为有限值。证据校验检查引文是否确实位于声明的位置。人工仍需判断该值是否属于目标字段。这是三项独立判断。

`number` 接受 Python `float` 的文本语法，包括符号、小数、指数及数字间下划线：`-2.5`、`.5`、`1e3` 和 `1_000` 均有效。带逗号或单位后缀的 `1,000`、`3.5 kg` 无效。拒绝非有限结果，包括 `inf`、`NaN` 和 `1e309` 这样的溢出。`integer` 类型更严格，只接受可选符号后跟数字。

审批包含来源指纹和每个字段选中的 start/end 对。文档变化后，旧决定不能静默批准相同位置的新值。通过 missing、invalid、ambiguous、proposed 和 approved 状态，让工作流保持可检查。

| 情况 | 状态 | 对导出的影响 |
|---|---|---|
| 一个有效引文，尚无决定 | proposed | 未获批准 |
| 两个 Seats 引文 | ambiguous | 由审阅者选择 |
| 已选区间且指纹匹配 | approved | 可以导出该值 |

## 运行前先预测

批准 18 个席位，再在文档顶部插入一行，预测旧审批为何必须被拒绝。

```figure
pj-document-extraction-desk-3
```

修改图表输入并检查计算值。将一项结果变化对应到实现中的某行代码；图表用于说明机制，不能替代真实程序。

## 构建与验证

从仓库根目录执行一次初始化，复制公共类型、函数占位实现、可运行的命令包装器和原始样本输入。领域函数尚未实现时，第一次阶段测试应失败。

```bash
python3 scripts/project_test.py document-extraction-desk --init my-document-extraction-desk
python3 scripts/project_test.py document-extraction-desk --stage 3 --path my-document-extraction-desk --strict
```

使用标准库实现契约。先手工推演示例，保持调用方输入不变，并用能够指导修正的错误拒绝畸形数据。测试导入你的工作区，不导入参考解答。

## 分步提示

1. 读取选择之前先检查指纹。
2. 每项选择须标识一个有效且已存在的候选。
3. 根据全部必需字段判断就绪状态，不能只数审批条目。

## 预期结果

本阶段完成后，评分器应报告第 1—3 阶段的真实测试通过。全部四阶段完成后，先用随附样本运行工具，再换成自己的输入：

```bash
cd my-document-extraction-desk
python3 cli.py sample.txt --schema schema.json --output output/review.html
```

最终交付物是本地 HTML 审阅台，可下载与来源绑定的审批决定，以及已批准值的 JSON 映射。打开 HTML 并检查配套 JSON，不要只相信退出码。改变一项输入，准确说明哪项结果必须随之变化。

## 扩展练习

另行添加审阅者标识和决定时间戳，但不要将这两个字段当作密码学身份认证。

范围：核心接收 UTF-8 文本和带明确标签的字段，不提供 OCR 或 PDF 解析。外部 OCR 或模型适配器可通过 --proposals 提交候选，但每个引文及偏移量都须接受检查。来源位置正确仍不足以证明字段含义正确。

权威参考：[Python 正则表达式匹配偏移量](https://docs.python.org/3/library/re.html#match-objects)。实现和练习数据均为原创教学示例。
