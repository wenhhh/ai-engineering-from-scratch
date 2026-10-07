# 解析论断与引用标记

**第 1 阶段，共 4 阶段。** Python。预计约 2 小时。

引用解析器负责识别引用，不判断引用内容是否真实。在每个句子内部去重标记，保留论断正文，并忽略 Markdown 标题。这里刻意采用狭窄语法，每行处理一个段落，不试图解析任意 Markdown 或缩写。

```figure
pj-report-judge-1
```

## 实现边界

```python
def parse_claims(text):
    raise NotImplementedError("Implement the stage contract")
```

权威参考：[参考资料 1](https://www.rfc-editor.org/rfc/rfc8259).

## Orchard 示例推演

编码前，先学习 [Python 数据结构](https://docs.python.org/3/tutorial/datastructures.html)和[检索增强生成](../../../../../phases/11-llm-engineering/06-rag/docs/en.md).

逐句审计事实陈述。Orchard 的重试上限有来源支持，另一项部署论断与之无关；不能因为一个引用标记有效，就让整段文字通过。

```text
Worker A invokes worker B [S1]. Retry limit is 99 [S2].
claim 1 -> cites [S1]
claim 2 -> cites [S2]
```

## 构建与检查

先提取标记，再从论断正文移除。对重复标记去重时，保留句子的独立身份。

在学习者工作区实现本阶段。随附命令行辅助程序通过适配器导入你的函数，不会用参考解答代替未完成的实现。

```bash
python3 scripts/project_test.py report-judge --init learning-artifacts/report-judge
python3 scripts/project_test.py report-judge --stage 1 --path learning-artifacts/report-judge
```

先预测上面的中间状态，再运行本阶段。全新起始代码应当失败；参考实现运行通过，不能证明你的学习者工作区已经完成。

## 继续探究

证据映射中没有 [S2] 时，应如何处理？
