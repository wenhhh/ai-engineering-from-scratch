# 同时发布准确率与延迟

第 4 阶段，共 4 阶段。开始前阅读[项目先修要求](../../../README.md)；本阶段建立在此前契约之上。

## 本阶段变化

质量与延迟反映不同权衡。使用最近秩法计算百分位数，便于在小样本上复现其定义。将 p50、p95 与准确率、覆盖率、校准误差及实际测量的预测数量一起报告。

随附演示使用明确标注为合成数据的延迟记录，不对任何本地模型作实际耗时声明。进行性能决策前，应替换为真实测量。

## 推演一个具体用例

对于延迟 [80,100,120,300,900]，最近秩法的 p95 位置为 ceil(.95*5)=5，因此 p95=900。响应记录的执行清单在该数值旁保留模型修订版、提示词修订版、硬件和置信度计算方法。

```figure
pj-local-model-eval-harness-4
```

修改实验输入，先自行计算结果，再阅读指标。图表根据这些输入计算；实现是否完成，仍以下方测试为证据。

## 实现契约

按已声明契约实现 `scorecard`。

使用[公开 API 契约](../../../API.md)和带类型的起始签名。核心函数负责返回值；文件输入、参数解析与展示由随附驱动程序负责。

record.py 只将提示词发送到模型端点；预期标签始终留在本地。用单调时钟测量实际请求前后的耗时，再将生成的响应记录交给 cli.py。

## 验证与检查

从仓库根目录执行一次 `python3 scripts/project_test.py local-model-eval-harness --init learning-artifacts/local-model-eval-harness` 完成初始化，再进行累计评分：

```bash
python3 scripts/project_test.py local-model-eval-harness --stage 4 --path learning-artifacts/local-model-eval-harness --strict
```

在完成契约之前，全新工作区应当失败。完成全部阶段后，使用随附样本运行你的实际交付物：

```bash
cd learning-artifacts/local-model-eval-harness
python3 cli.py samples/input.json --output scorecard.json --html reliability.html
```

## 探究失败边界

比较两份标签不同的响应记录。即使数据集的用例数量相同，命令行程序也必须拒绝比较。

除非适配器另行定义方法，报告中的置信度均由模型自行给出。ECE 会随分箱方式和样本数量变化。本项目不会下载或启动模型，随附样本也不构成硬件基准测试。


## 参考资料

[权威技术参考](https://docs.python.org/3/library/statistics.html)
