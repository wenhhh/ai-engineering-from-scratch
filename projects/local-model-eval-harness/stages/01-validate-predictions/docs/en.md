# 校验预测记录

第 1 阶段，共 4 阶段。开始前阅读[项目先修要求](../../../README.md)；本阶段建立在此前契约之上。

## 本阶段变化

预测记录是一份证据：包含 id、answer、confidence 和实测延迟。要求 id 唯一，数值有限，否则 NaN 可能绕过比较，让失败看起来像有效报告。

执行框架读取响应记录，因此每项指标测试都能在没有模型的情况下运行。评估真实本地模型时，应按同一契约记录响应，并将执行环境与生成的 JSON 保存在一起。

## 推演一个具体用例

两条记录都使用 id case-a 时，即使答案相同，也会使标签关联产生歧义，因此校验会拒绝它们。置信度必须为有限值且处于 0..1 范围内；进行任何比较或求平均之前，必须拒绝 NaN。

```figure
pj-local-model-eval-harness-1
```

修改实验输入，先自行计算结果，再阅读指标。图表根据这些输入计算；实现是否完成，仍以下方测试为证据。

## 实现契约

按已声明契约实现 `validate`。

使用[公开 API 契约](../../../API.md)和带类型的起始签名。核心函数负责返回值；文件输入、参数解析与展示由随附驱动程序负责。

在 Python 中，布尔值虽然属于整数子类，却不代表延迟测量。将 answer、confidence、latency 与 id 保存在一起，避免后续指标误按数组位置对齐。

## 验证与检查

从仓库根目录执行一次 `python3 scripts/project_test.py local-model-eval-harness --init learning-artifacts/local-model-eval-harness` 完成初始化，再进行累计评分：

```bash
python3 scripts/project_test.py local-model-eval-harness --stage 1 --path learning-artifacts/local-model-eval-harness --strict
```

在完成契约之前，全新工作区应当失败。完成全部阶段后，使用随附样本运行你的实际交付物：

```bash
cd learning-artifacts/local-model-eval-harness
python3 cli.py samples/input.json --output scorecard.json --html reliability.html
```

## 探究失败边界

重新排列预测行，证明分数保持不变。然后重复一个 id，确认运行失败，不会重复计分。




## 参考资料

[权威技术参考](https://docs.python.org/3/library/statistics.html)
