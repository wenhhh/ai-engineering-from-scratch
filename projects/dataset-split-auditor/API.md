# 公开实现契约（Public implementation contract）

向 CLI 传入 {train,test} 记录，或传入 {records} 并使用 --split 0.25 --seed experiment-1。在 CI 中添加 --check，可在划分不可用时返回退出码 2。

规范化能够识别规范化后完全相同的副本，不能识别改写。稳定的组哈希不保证类别平衡，也不保证评估符合时间顺序。导出的分区仍保留来源文本。

### main.py

```python
def fingerprint(text)
def validate(records)
def audit(train, test)
def split_groups(records, test_fraction=0.2, seed='course')
def summarize(train, test)
```

阶段测试规定正常结果和必须拒绝的输入。不要将学习者实现的导入替换为参考实现导入。最后一个阶段还会用提供的输入驱动验证你的累计实现。
