# 规范化笔记并保留标识

**第 1 阶段，共 4 阶段。** Python。预计约 2 小时。

搜索索引连接你现在写下的笔记与未来输入的查询。使用大小写折叠切分 Unicode 词项，同时保留每份原始文档 ID。重复词项携带频率信息，改成集合会丢失这些信息。

使用小型显式同义词映射，将 deploy 和 release 映射到同一规范词项。这展示受控语义扩展，不是嵌入模型，也不能推断任意改述。

```figure
pj-semantic-notes-search-1
```

译注：图表边界：采用简化小写转换，且别名键没有执行完整规范化；大写别名或 Straße／STRASSE 可能与 Python 的 casefold 结果不同。图上编号排序也不同于文件 ID 排序，精度与输入词项均按各自实现保留。 指标 Query terms 表示查询词项数，保留该名称供既有消费者定位。

权威参考：[权威技术参考](https://nlp.stanford.edu/IR-book/html/htmledition/the-vector-space-model-for-scoring-1.html)。

## Orchard 示例推演

编码前，阅读 [Python 数据结构](https://docs.python.org/3/tutorial/datastructures.html) 和 [数据管理](../../../../../phases/00-setup-and-tooling/09-data-management/docs/en.md)。

Orchard 操作者输入 café 时可能使用不同 Unicode 编码。对文本和别名键都执行大小写折叠与 NFC 规范化，让等价写法得到相同词项。一个别名只执行一次明确的词汇替换。

```text
"CAFE\u0301" -> ["café"]
alias release -> deploy
"release café" -> ["deploy","café"]
```

## 构建并检查

在 Unicode 单词正则表达式之前进行规范化，否则组合附加符号可能丢失。不要递归扩展别名，以免形成循环。

在学习者工作区中实现本阶段。随附的 CLI 辅助代码是适配器，会导入你的函数，不会用参考解答替代它们。

```bash
python3 scripts/project_test.py semantic-notes-search --init learning-artifacts/semantic-notes-search
python3 scripts/project_test.py semantic-notes-search --stage 1 --path learning-artifacts/semantic-notes-search
```

先预测上面的中间状态，再运行阶段测试。全新的桩代码应当失败；参考实现通过测试不代表你的学习者工作区已完成。

## 接着探究

什么情况下，将 release 映射到 deploy 会损害检索，而不是改善它？
