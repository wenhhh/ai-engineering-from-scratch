# 查询时排除过期证据

**第 4 阶段，共 4 阶段。** Python。预计约 2 小时。

时效性既是导入要求，也是查询时契约。后台任务可能失败，因此每个候选必须先满足有效年龄上限，再参与排名。测试通过注入时钟确定时间，不直接依赖系统时钟；对于未来时间戳应拒绝，不能把它当作更新鲜的证据。

```figure
pj-rag-freshness-pipeline-4
```

## 实现边界

```python
def retrieve(documents,query,now,max_age=3600,k=3):
    raise NotImplementedError("Implement the stage contract")
```

权威参考：[参考资料 1](https://docs.python.org/3/library/os.html#os.replace).

## Orchard 示例推演

编码前，先学习 [Python 数据结构](https://docs.python.org/3/tutorial/datastructures.html)和[数据管理](../../../../../phases/00-setup-and-tooling/09-data-management/docs/en.md). 请先完成 [第 3 阶段](../../03-snapshot/docs/en.md)。

修改后，查询必须返回 15 分钟策略，不能再返回已停用的 60 分钟正文。即使最近一次快照后没有执行导入任务，回答时仍须检查时效性。

```text
updated=200; now=210; max_age=60 -> age 10, eligible
updated=200; now=500; max_age=60 -> age 300, excluded
```

## 构建与检查

一次查询读取一个已提交快照。为每个命中项返回快照版本与来源哈希，使调用方能够发现过期引用。

在学习者工作区实现本阶段。随附命令行辅助程序通过适配器导入你的函数，不会用参考解答代替未完成的实现。

```bash
python3 scripts/project_test.py rag-freshness-pipeline --stage 4 --path learning-artifacts/rag-freshness-pipeline
```

累计阶段全部通过后，从仓库根目录用原创样例输入运行你的交付物：

```bash
python3 learning-artifacts/rag-freshness-pipeline/cli.py ingest orchard-index.json projects/rag-freshness-pipeline/examples/before.json
python3 learning-artifacts/rag-freshness-pipeline/cli.py ingest orchard-index.json projects/rag-freshness-pipeline/examples/after.json
python3 learning-artifacts/rag-freshness-pipeline/cli.py query orchard-index.json tokens --now 210 --max-age 60
```

导入器要求提供完整语料快照，不能只传入部分变更。POSIX flock 用于协调本地写入进程，不提供分布式数据库锁语义。检索依靠词汇匹配，来源时间戳由调用方提供。

## 继续探究

时间位于未来的文档，是否应该获得负年龄并成为最佳结果？
