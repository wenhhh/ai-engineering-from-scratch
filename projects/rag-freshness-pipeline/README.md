# RAG 时效维护流水线（RAG Freshness Pipeline）

通过过期回答事件实验，验证策略更新或删除后，旧版本不再进入引用结果。

Orchard 策略的超时值发生变化时，文档 ID 保持不变。对正文计算哈希前，先规范化 Unicode 和换行，并单独保存更新时间。内容未变但观察时间较晚时，只刷新元数据，无须重写内容。

## 从学习者工作区开始

[数据管理](../../phases/00-setup-and-tooling/09-data-management/docs/en.md), [检索增强生成](../../phases/11-llm-engineering/06-rag/docs/en.md). 语言基础：[Python 数据结构](https://docs.python.org/3/tutorial/datastructures.html).

使用 Python 3.10+ 及其标准库。涉及文件锁或进程组监管的功能需要 POSIX 环境。

```bash
python3 scripts/project_test.py rag-freshness-pipeline --init learning-artifacts/rag-freshness-pipeline
python3 scripts/project_test.py rag-freshness-pipeline --stage 1 --path learning-artifacts/rag-freshness-pipeline
```

## 构建路线

1. [规范化文档并生成内容指纹](stages/01-fingerprint/docs/en.md)
2. [规划插入、更新、删除与刷新](stages/02-changes/docs/en.md)
3. [使用原子替换持久化索引](stages/03-snapshot/docs/en.md)
4. [查询时排除过期证据](stages/04-retrieve/docs/en.md)

## 使用自己的输入运行

完成各阶段后，使用以下命令，让你的工作区代码处理原创 Orchard 示例。将样例路径替换为自己的文件即可处理实际输入。

```bash
python3 learning-artifacts/rag-freshness-pipeline/cli.py ingest orchard-index.json projects/rag-freshness-pipeline/examples/before.json
python3 learning-artifacts/rag-freshness-pipeline/cli.py ingest orchard-index.json projects/rag-freshness-pipeline/examples/after.json
python3 learning-artifacts/rag-freshness-pipeline/cli.py query orchard-index.json tokens --now 210 --max-age 60
```

要先检查完整参考实现，请将同一命令中的 `learning-artifacts/rag-freshness-pipeline` 替换为 `projects/rag-freshness-pipeline/solution`。JSON 结果使用 `schema_version: 1`；路径与参数示例均明确列出，便于其他工具使用。

## 集成边界

导入器要求提供完整语料快照，不能只传入部分变更。POSIX flock 用于协调本地写入进程，不提供分布式数据库锁语义。检索依靠词汇匹配，来源时间戳由调用方提供。

```bash
python3 scripts/project_test.py rag-freshness-pipeline --all --solution --strict
python3 scripts/project_test.py rag-freshness-pipeline --all --path learning-artifacts/rag-freshness-pipeline --strict
```

第一条命令检查参考实现，第二条检查你的实现。公开示例与测试提供回归证据，不构成生产认证，也不属于未见过的基准测试。

译注：错误字符串、快照字段与测试语料保留原值。未来时间戳在查询时被排除，不表示导入器一定拒绝该记录；检索仍依赖词汇匹配。
