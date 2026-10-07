# 测量置信度校准

第 3 阶段，共 4 阶段。开始前阅读[项目先修要求](../../../README.md)；本阶段建立在此前契约之上。

## 本阶段变化

对自动路由器而言，置信度 99% 却给出错误答案的模型，比承认不确定的模型风险更高。期望校准误差（Expected Calibration Error，ECE）按置信度对预测分组，再比较平均置信度与实际正确率。

ECE 依赖分箱选择和样本数量。报告每个非空分箱、其样本数及差值。样本很少或 ECE 看起来很低，都不能证明新任务上的概率已经校准。

## 推演一个具体用例

四条置信度为 0.9 的预测中有三条正确，则观察到的准确率为 0.75，单个分箱的差值为 0.15。第二个分箱若只有一条高置信度错误答案，应按一个样本加权，不能与前面四样本的分箱等权。

```figure
pj-local-model-eval-harness-3
```

修改实验输入，先自行计算结果，再阅读指标。图表根据这些输入计算；实现是否完成，仍以下方测试为证据。

## 实现契约

按已声明契约实现 `calibration`。

使用[公开 API 契约](../../../API.md)和带类型的起始签名。核心函数负责返回值；文件输入、参数解析与展示由随附驱动程序负责。

使用 min(index,bins-1) 将置信度 1.0 放入最后一个分箱。在 ECE 旁报告各非空分箱的数量，避免平均值掩盖证据太少的问题。

## 验证与检查

从仓库根目录执行一次 `python3 scripts/project_test.py local-model-eval-harness --init learning-artifacts/local-model-eval-harness` 完成初始化，再进行累计评分：

```bash
python3 scripts/project_test.py local-model-eval-harness --stage 3 --path learning-artifacts/local-model-eval-harness --strict
```

在完成契约之前，全新工作区应当失败。完成全部阶段后，使用随附样本运行你的实际交付物：

```bash
cd learning-artifacts/local-model-eval-harness
python3 cli.py samples/input.json --output scorecard.json --html reliability.html
```

## 探究失败边界

将相同记录分别分成五个和十个分箱。解释为什么模型答案不变，ECE 却会变化。




## 参考资料

[权威技术参考](https://docs.python.org/3/library/statistics.html)
