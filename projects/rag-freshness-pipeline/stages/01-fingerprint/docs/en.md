# 规范化文档并生成内容指纹

**第 1 阶段，共 4 阶段。** Python。预计约 2 小时。

标识与内容采用不同的键。保留调用方的 ID，对规范化后的 Unicode 内容计算哈希，避免等价编码触发不必要的索引更新。时间戳属于元数据；时间变化不能被当作文档正文变化。

```figure
pj-rag-freshness-pipeline-1
```

## 实现边界

```python
def normalize(doc):
    raise NotImplementedError("Implement the stage contract")
```

权威参考：[参考资料 1](https://docs.python.org/3/library/os.html#os.replace).

## Orchard 示例推演

编码前，先学习 [Python 数据结构](https://docs.python.org/3/tutorial/datastructures.html)和[数据管理](../../../../../phases/00-setup-and-tooling/09-data-management/docs/en.md).

Orchard 策略的超时值发生变化时，文档 ID 保持不变。对正文计算哈希前，先规范化 Unicode 和换行，并单独保存更新时间。内容未变但观察时间较晚时，只刷新元数据，无须重写内容。

```text
id=orchard-auth
text: tokens expire after 60 minutes
updated: 100 -> 200
content hash: unchanged
```

## 构建与检查

对规范化后的 UTF-8 字节计算哈希，不将时间戳混入内容标识。

在学习者工作区实现本阶段。随附命令行辅助程序通过适配器导入你的函数，不会用参考解答代替未完成的实现。

```bash
python3 scripts/project_test.py rag-freshness-pipeline --init learning-artifacts/rag-freshness-pipeline
python3 scripts/project_test.py rag-freshness-pipeline --stage 1 --path learning-artifacts/rag-freshness-pipeline
```

先预测上面的中间状态，再运行本阶段。全新起始代码应当失败；参考实现运行通过，不能证明你的学习者工作区已经完成。

## 继续探究

为什么采用两种不同编码形式的 café 应得到相同内容指纹？
