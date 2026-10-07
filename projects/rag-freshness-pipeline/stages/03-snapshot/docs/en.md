# 使用原子替换持久化索引

**第 3 阶段，共 4 阶段。** Python。预计约 2 小时。

先在目标文件旁写入完整的新快照并刷新到存储，再原子替换目标。版本前置条件用于拒绝基于旧版本写入的进程。同目录的持久锁文件通过 POSIX flock，将版本检查和替换操作串行化。原子替换可避免读到半写文件，但不能防止所有分布式竞态。

```figure
pj-rag-freshness-pipeline-3
```

译注：图表范围：控件只模拟单文档变化、版本条件与年龄判断，不执行文件锁、fsync、原子替换或真实进程竞争。

## 实现边界

```python
def read_snapshot(path):
    raise NotImplementedError("Implement the stage contract")
```

权威参考：[参考资料 1](https://docs.python.org/3/library/os.html#os.replace).

## Orchard 示例推演

编码前，先学习 [Python 数据结构](https://docs.python.org/3/tutorial/datastructures.html)和[数据管理](../../../../../phases/00-setup-and-tooling/09-data-management/docs/en.md). 请先完成 [第 2 阶段](../../02-changes/docs/en.md)。

两个导入进程可能同时读到版本 1。同目录的持久锁文件将版本检查与替换写入串行化。对于 expected_version=1，只有一个进程能够提交；下一个写入者必须重新读取。

```text
writer A expects 1 -> commits version 2
writer B expects 1 -> stale index version
index.json.lock remains as the stable lock inode
```

## 构建与检查

在 POSIX 中，读取、比较、fsync 和重命名期间始终持有 flock。释放锁后也不要删除锁文件，否则等待中的进程可能锁定不同文件。

在学习者工作区实现本阶段。随附命令行辅助程序通过适配器导入你的函数，不会用参考解答代替未完成的实现。

```bash
python3 scripts/project_test.py rag-freshness-pipeline --stage 3 --path learning-artifacts/rag-freshness-pipeline
```

先预测上面的中间状态，再运行本阶段。全新起始代码应当失败；参考实现运行通过，不能证明你的学习者工作区已经完成。

## 继续探究

进程写完临时文件后、重命名之前退出，会发生什么？
