# 用可检查的关键词分数排列文本块

第 2 阶段，共 4 阶段。开始前先阅读[项目先修要求](../../../README.md)；本阶段沿用此前建立的契约。

## 本阶段的变化

词频通过对数抑制重复出现带来的增益，文档频率降低常见词的权重。返回分数时保留完整文本块契约，不能只返回文本，因为下一阶段需要来源偏移量。这种词汇基线会漏掉同义词；接入嵌入服务前，先测量其表现。

## 推演一个具体案例

查询 cache 时，缓存策略的排名应高于请求截止时间文档。重复 cache 会按对数提高词频分量；在多个文本块出现的词，其单次贡献低于少见词。

```figure
pj-doc-qa-with-citations-2
```

译注：图表限制：此 JavaScript 示例按 UTF-16 位置切片，并使用 ASCII 词匹配；Python 正文实现按 Unicode 字符切片和分词。emoji 或中文输入时不可将两者的位置与分数直接对等。

修改实验输入，先自行计算结果，再查看指标。图表根据输入计算；下方实现测试仍是完成证据的来源。

## 实现契约

实现 `retrieval.py` 中的 `retrieve`。这是“带引用的文档问答与 LangChain”项目的第 2 阶段：接收明确输入，返回可供下一阶段使用、能够检查的结果。

依据[公共 API 契约](../../../API.md)和起始代码的类型签名实现。核心函数负责返回值，文件输入、参数解析和展示交给随附驱动程序。

对查询与文本采用一致的分词和大小写折叠。只将正分数条目放入结果；未知查询必须返回空候选列表，让第 3 阶段能够放弃作答。

## 验证与检查

从仓库根目录执行一次 `python3 scripts/project_test.py doc-qa-with-citations --init learning-artifacts/doc-qa-with-citations` 完成初始化，然后按阶段累积评分：

```bash
python3 scripts/project_test.py doc-qa-with-citations --stage 2 --path learning-artifacts/doc-qa-with-citations --strict
```

实现契约之前，新工作区应测试失败。全部阶段完成后，使用随附样本运行自己的实际作品：

```bash
cd learning-artifacts/doc-qa-with-citations
python3 cli.py samples/docs "When does cache expire?" --output answer.json --html answer.html
```

## 探查失败边界

增加一篇大量重复无关词语的文档。确认单凭篇幅长，不会使它变得相关。




## 参考资料

[参考资料 1](https://docs.langchain.com/oss/python/integrations/splitters/recursive_text_splitter)
