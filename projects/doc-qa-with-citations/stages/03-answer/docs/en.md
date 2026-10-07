# 只接受检索区间能够支持的回答

第 3 阶段，共 4 阶段。开始前先阅读[项目先修要求](../../../README.md)；本阶段沿用此前建立的契约。

## 本阶段的变化

要求模型选择逐字引文和来源 id，然后分别校验。引文子串提供可核对的区间，但不能保证来源本身真实。检索为空时明确放弃作答，不调用模型。以后若加入改写回答的生成器，需要另行设计证据支持门禁。

## 推演一个具体案例

原文为 "Cache expires in sixty seconds. Bananas are yellow."，两个句子都可引用。对于缓存问题，香蕉句子虽能通过精确子串检查，但组合后的 CLI 会将其标为 needs_review，因为它与有效查询词没有重叠。

```figure
pj-doc-qa-with-citations-3
```

译注：图表限制：此 JavaScript 示例按 UTF-16 位置切片，并使用 ASCII 词匹配；Python 正文实现按 Unicode 字符切片和分词。emoji 或中文输入时不可将两者的位置与分数直接对等。

修改实验输入，先自行计算结果，再查看指标。图表根据输入计算；下方实现测试仍是完成证据的来源。

## 实现契约

实现 `answer.py` 中的 `answer`。这是“带引用的文档问答与 LangChain”项目的第 3 阶段：接收明确输入，返回可供下一阶段使用、能够检查的结果。

依据[公共 API 契约](../../../API.md)和起始代码的类型签名实现。核心函数负责返回值，文件输入、参数解析和展示交给随附驱动程序。

先校验来源 id 和逐字引文，再根据被引用文本块还原偏移量。将相关性作为独立、明确受限的策略，不要把引用存在当成回答正确的证明。

## 验证与检查

从仓库根目录执行一次 `python3 scripts/project_test.py doc-qa-with-citations --init learning-artifacts/doc-qa-with-citations` 完成初始化，然后按阶段累积评分：

```bash
python3 scripts/project_test.py doc-qa-with-citations --stage 3 --path learning-artifacts/doc-qa-with-citations --strict
```

实现契约之前，新工作区应测试失败。全部阶段完成后，使用随附样本运行自己的实际作品：

```bash
cd learning-artifacts/doc-qa-with-citations
python3 cli.py samples/docs "When does cache expire?" --output answer.json --html answer.html
```

## 探查失败边界

让响应中的来源 id 指向不包含该引文的文本块。即使引文出现在语料库的其他位置，回答门禁也必须拒绝它。




## 参考资料

[参考资料 1](https://docs.langchain.com/oss/python/integrations/splitters/recursive_text_splitter)
