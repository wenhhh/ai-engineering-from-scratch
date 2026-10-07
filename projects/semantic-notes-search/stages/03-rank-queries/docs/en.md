# 用稳定的同分规则排列查询结果

**第 3 阶段，共 4 阶段。** Python。预计约 2 小时。

余弦相似度比较向量方向，因此长笔记不能只靠重复所有词项获胜。忽略语料库中未出现的查询词，再在同一加权空间中归一化。

按分数降序排列，再按文档 ID 决定同分顺序，使回归测试和演示记录可以复现。只返回正分匹配；空列表比无关的零分结果更诚实。

```figure
pj-semantic-notes-search-3
```

译注：图表边界：采用简化小写转换，且别名键没有执行完整规范化；大写别名或 Straße／STRASSE 可能与 Python 的 casefold 结果不同。图上编号排序也不同于文件 ID 排序，精度与输入词项均按各自实现保留。 指标 Query terms 表示查询词项数，保留该名称供既有消费者定位。

权威参考：[权威技术参考](https://nlp.stanford.edu/IR-book/html/htmledition/the-vector-space-model-for-scoring-1.html)。

## Orchard 示例推演

编码前，阅读 [Python 数据结构](https://docs.python.org/3/tutorial/datastructures.html) 和 [数据管理](../../../../../phases/00-setup-and-tooling/09-data-management/docs/en.md)。先完成[第 2 阶段](../../02-weight-the-index/docs/en.md)。

CLI 为你自己的 Markdown 目录返回路径、预览和匹配词项。查询与笔记向量使用同一别名映射和 IDF 表，未知词项没有权重。

```text
query=release replicas
alias release=deploy
matching note: release.md; matched terms: deploy
```

随附笔记使用单数 `replica`，所以复数 `replicas` 不匹配。这个词汇分词器不执行词干提取。可编辑图表的初始笔记更短，包含字面短语 `deploy replicas`；因此图中的双词项匹配使用的是不同输入。

## 构建并检查

使用索引 IDF 计算查询向量，再与笔记向量求点积。分数相同时，按文档 ID 决定顺序。

在学习者工作区中实现本阶段。随附的 CLI 辅助代码是适配器，会导入你的函数，不会用参考解答替代它们。

```bash
python3 scripts/project_test.py semantic-notes-search --stage 3 --path learning-artifacts/semantic-notes-search
```

先预测上面的中间状态，再运行阶段测试。全新的桩代码应当失败；参考实现通过测试不代表你的学习者工作区已完成。

## 接着探究

笔记使用了别名映射中没有的同义词时，空结果意味着什么？
