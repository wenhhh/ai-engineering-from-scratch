# 公开实现契约

record.py 写出 cli.py 使用的同一份 {manifest,source,labels,records} 契约。--baseline 只允许比较标签指纹相同的记录；--min-accuracy 提供本地 CI 门禁。

除非适配器另行定义方法，报告中的置信度均由模型自行给出。ECE 会随分箱方式和样本数量变化。本项目不会下载或启动模型，随附样本也不构成硬件基准测试。

### main.py

```python
def validate(records)
def correct(record, labels)
def accuracy(records, labels)
def calibration(records, labels, bins=5)
def percentile(values, p)
def scorecard(records, labels, source)
```

阶段测试规定正常结果与应拒绝的输入。不要将学习者实现的导入替换为参考实现。最终阶段还会使用随附输入驱动程序运行你的累计实现。
