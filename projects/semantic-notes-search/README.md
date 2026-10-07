# 语义笔记检索（Semantic Notes Search）

在本地检索笔记，解释每次匹配，并展示别名何时有益、何时有害。

Orchard 操作者输入 café 时可能使用不同 Unicode 编码。对文本和别名键都执行大小写折叠与 NFC 规范化，让等价写法得到相同词项。一个别名只执行一次明确的词汇替换。

## 从学习者工作区开始

[数据管理](../../phases/00-setup-and-tooling/09-data-management/docs/en.md)、[检索增强生成](../../phases/11-llm-engineering/06-rag/docs/en.md)。语言基础：[Python 数据结构](https://docs.python.org/3/tutorial/datastructures.html)。

使用 Python 3.10+ 及其标准库。项目使用文件锁或进程组管理的部分需要 POSIX 环境。

```bash
python3 scripts/project_test.py semantic-notes-search --init learning-artifacts/semantic-notes-search
python3 scripts/project_test.py semantic-notes-search --stage 1 --path learning-artifacts/semantic-notes-search
```

## 构建路线

1. [规范化笔记并保留标识](stages/01-normalize-notes/docs/en.md)
2. [按文档稀有程度为词项加权](stages/02-weight-the-index/docs/en.md)
3. [用稳定的同分规则排列查询结果](stages/03-rank-queries/docs/en.md)
4. [引入嵌入前先测量检索效果](stages/04-measure-recall/docs/en.md)

## 使用自己的输入运行

完成各阶段后，以下命令会用你的工作区代码运行原创 Orchard 示例。将样本路径替换为你自己的文件。

```bash
python3 learning-artifacts/semantic-notes-search/cli.py projects/semantic-notes-search/examples/notes "release replicas" --aliases projects/semantic-notes-search/examples/aliases.json --out matches.json
```

先查看完整参考实现时，将同一命令中的 `learning-artifacts/semantic-notes-search` 替换为 `projects/semantic-notes-search/solution`。JSON 结果使用 `schema_version: 1`；路径与参数示例明确列出，便于其他工具消费。

## 集成边界

这是带明确别名的可解释词汇 TF-IDF 基线，不是学习得到的嵌入模型。标题保留项目路线名称；每条匹配都展示词汇依据。目录读取器接受大小受限的 UTF-8 Markdown，并拒绝符号链接文件。

```bash
python3 scripts/project_test.py semantic-notes-search --all --solution --strict
python3 scripts/project_test.py semantic-notes-search --all --path learning-artifacts/semantic-notes-search --strict
```

第一条命令检查参考实现，第二条检查你的实现。公开示例与测试属于回归证据，不构成生产认证，也不是未公开的基准测试。

## 权威参考资料

- [机制与 API 参考](https://nlp.stanford.edu/IR-book/html/htmledition/the-vector-space-model-for-scoring-1.html)

译注：示例 Markdown 是检索输入，正文与文件名保留原值。Unicode 词项匹配不包含中文分词：无空格的连续中文可能作为一个词项，局部词语查询不一定命中。它也不做词干提取；别名是单次显式替换，不是学习得到的语义关系。
