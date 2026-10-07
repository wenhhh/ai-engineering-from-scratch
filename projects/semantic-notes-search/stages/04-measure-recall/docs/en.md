# 引入嵌入前先测量检索效果

**第 4 阶段，共 4 阶段。** Python。预计约 2 小时。

检索演示需要与任务绑定的分数。对每个已标注查询，检查预期文档是否出现在前 k 个结果中。将这些独立命中取平均，得到 recall at k。

这个小型标注夹具公开且确定。在这里满分不代表对新笔记也有效。判断同义词扩展是否足够之前，应另留一组自己的改述。

```figure
pj-semantic-notes-search-4
```

译注：图表边界：采用简化小写转换，且别名键没有执行完整规范化；大写别名或 Straße／STRASSE 可能与 Python 的 casefold 结果不同。图上编号排序也不同于文件 ID 排序，精度与输入词项均按各自实现保留。 指标 Query terms 表示查询词项数，保留该名称供既有消费者定位。

权威参考：[权威技术参考](https://nlp.stanford.edu/IR-book/html/htmledition/the-vector-space-model-for-scoring-1.html)。

## Orchard 示例推演

编码前，阅读 [Python 数据结构](https://docs.python.org/3/tutorial/datastructures.html) 和 [数据管理](../../../../../phases/00-setup-and-tooling/09-data-management/docs/en.md)。先完成[第 3 阶段](../../03-rank-queries/docs/en.md)。

加入不同检索后端前，先测量目标笔记是否靠前。随附笔记涵盖部署、恢复和访客 Wi-Fi，因此别名可能改善一个主题，却损害另一个主题。

```text
labels: restore -> backup.md; café -> café.md
hits=2,total=2,k=1 -> recall=1
add a misleading alias -> inspect changed hit ids
```

## 构建并检查

将已标注查询与调参示例分开。在评估中调用真实搜索函数，不要另外重建一个评分器。

在学习者工作区中实现本阶段。随附的 CLI 辅助代码是适配器，会导入你的函数，不会用参考解答替代它们。

```bash
python3 scripts/project_test.py semantic-notes-search --stage 4 --path learning-artifacts/semantic-notes-search
```

累计阶段通过后，从仓库根目录使用原创样本输入运行你的交付物：

```bash
python3 learning-artifacts/semantic-notes-search/cli.py projects/semantic-notes-search/examples/notes "release replicas" --aliases projects/semantic-notes-search/examples/aliases.json --out matches.json
```

这是带明确别名的可解释词汇 TF-IDF 基线，不是学习得到的嵌入模型。标题保留项目路线名称；每条匹配都展示词汇依据。目录读取器接受大小受限的 UTF-8 Markdown，并拒绝符号链接文件。

## 接着探究

声称改善新手的检索效果之前，你会再收集多少新标签？
