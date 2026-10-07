# 规划插入、更新、删除与刷新

**第 2 阶段，共 4 阶段。** Python。预计约 2 小时。

修改索引前，先计算完整变更计划。原有 ID 在新快照中消失时删除，内容哈希变化时更新，内容未变但元数据变化时刷新。重复 ID 必须报错；静默保留其中一个会使导入结果依赖输入顺序。

```figure
pj-rag-freshness-pipeline-2
```

## 实现边界

```python
def diff(previous,incoming):
    raise NotImplementedError("Implement the stage contract")
```

权威参考：[参考资料 1](https://docs.python.org/3/library/os.html#os.replace).

## Orchard 示例推演

编码前，先学习 [Python 数据结构](https://docs.python.org/3/tutorial/datastructures.html)和[数据管理](../../../../../phases/00-setup-and-tooling/09-data-management/docs/en.md). 请先完成 [第 1 阶段](../../01-fingerprint/docs/en.md)。

导入接收完整语料快照。after 夹具替换已停用的备份说明，并修改令牌有效期。必须删除新快照中缺失的 ID，避免过时证据继续被检索到。

```text
before ids: orchard-auth, retired-backup
after ids: orchard-auth, restore-runbook
update: orchard-auth; delete: retired-backup; insert: restore-runbook
```

## 构建与检查

决定任何操作前，先构建传入数据的 ID 映射。重复 ID 应报错，不能采用后写覆盖前写的处理方式。

在学习者工作区实现本阶段。随附命令行辅助程序通过适配器导入你的函数，不会用参考解答代替未完成的实现。

```bash
python3 scripts/project_test.py rag-freshness-pipeline --stage 2 --path learning-artifacts/rag-freshness-pipeline
```

先预测上面的中间状态，再运行本阶段。全新起始代码应当失败；参考实现运行通过，不能证明你的学习者工作区已经完成。

## 继续探究

导入器若只接收部分变更流，契约需要怎样调整？
