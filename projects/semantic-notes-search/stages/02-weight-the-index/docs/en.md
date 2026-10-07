# 按文档稀有程度为词项加权

**第 2 阶段，共 4 阶段。** Python。预计约 2 小时。

每份笔记都出现的词缺少区分力。计算平滑 IDF：log((1+N)/(1+df))+1，乘以词频，再将每个向量归一化到单位长度。

将向量与 IDF 一起保存。查询必须使用索引中的同一词表和权重；为查询重新拟合 IDF 会改变坐标系，使余弦比较失效。

```figure
pj-semantic-notes-search-2
```

译注：图表边界：采用简化小写转换，且别名键没有执行完整规范化；大写别名或 Straße／STRASSE 可能与 Python 的 casefold 结果不同。图上编号排序也不同于文件 ID 排序，精度与输入词项均按各自实现保留。 指标 Query terms 表示查询词项数，保留该名称供既有消费者定位。

权威参考：[权威技术参考](https://nlp.stanford.edu/IR-book/html/htmledition/the-vector-space-model-for-scoring-1.html)。

## Orchard 示例推演

编码前，阅读 [Python 数据结构](https://docs.python.org/3/tutorial/datastructures.html) 和 [数据管理](../../../../../phases/00-setup-and-tooling/09-data-management/docs/en.md)。先完成[第 1 阶段](../../01-normalize-notes/docs/en.md)。

罕见运维词项比常见项目名称更能区分笔记。每份笔记对文档频率只计一次，用词频乘以平滑稀有度，再归一化各稀疏向量。

```text
N=3; df(orchard)=3 -> idf=1
df(restore)=1 -> idf=log(4/2)+1=1.6931
```

## 构建并检查

为每份文档构建词项集合来统计文档频率。同一笔记重复 orchard 十次，不等于它出现在十份文档中。

在学习者工作区中实现本阶段。随附的 CLI 辅助代码是适配器，会导入你的函数，不会用参考解答替代它们。

```bash
python3 scripts/project_test.py semantic-notes-search --stage 2 --path learning-artifacts/semantic-notes-search
```

先预测上面的中间状态，再运行阶段测试。全新的桩代码应当失败；参考实现通过测试不代表你的学习者工作区已完成。

## 接着探究

比较短笔记和长操作手册之前，为什么要归一化向量长度？
