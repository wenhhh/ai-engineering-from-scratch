# 使用框架切分器并保留偏移量

第 4 阶段，共 4 阶段。开始前先阅读[项目先修要求](../../../README.md)；本阶段沿用此前建立的契约。

## 本阶段的变化

适配器保留从零实现的检索器与回答校验器。可选 LangChain 路径提供递归切分和模拟模型接口，再将每个文本块映射回精确来源偏移量。切分器若改写文本，应拒绝结果，不能编造来源。处理重复且重叠的子串时，搜索游标只向前移动一个位置，不能跳过整个文本块长度。

## 推演一个具体案例

框架切分器从 "ababa" 返回两个重叠的 "aba"，它们位于 0 和 2。按整个文本块长度推进搜索游标，会漏掉第二个合法位置。

```figure
pj-doc-qa-with-citations-4
```

译注：图表限制：此 JavaScript 示例按 UTF-16 位置切片，并使用 ASCII 词匹配；Python 正文实现按 Unicode 字符切片和分词。emoji 或中文输入时不可将两者的位置与分数直接对等。

修改实验输入，先自行计算结果，再查看指标。图表根据输入计算；下方实现测试仍是完成证据的来源。

## 实现契约

实现 `adapter.py` 中的 `adapt_splits`、`framework_qa`。这是“带引用的文档问答与 LangChain”项目的第 4 阶段：接收明确输入，返回可供后续使用、能够检查的结果。

依据[公共 API 契约](../../../API.md)和起始代码的类型签名实现。核心函数负责返回值，文件输入、参数解析和展示交给随附驱动程序。

将游标移至上一次匹配起点之后一个字符，并针对原文核查返回的每个片段。在可选 SDK 路径两侧继续保留从零实现的检索器和引用校验器。

## 验证与检查

从仓库根目录执行一次 `python3 scripts/project_test.py doc-qa-with-citations --init learning-artifacts/doc-qa-with-citations` 完成初始化，然后按阶段累积评分：

```bash
python3 scripts/project_test.py doc-qa-with-citations --stage 4 --path learning-artifacts/doc-qa-with-citations --strict
```

实现契约之前，新工作区应测试失败。全部阶段完成后，使用随附样本运行自己的实际作品：

```bash
cd learning-artifacts/doc-qa-with-citations
python3 cli.py samples/docs "When does cache expire?" --output answer.json --html answer.html
```

## 探查失败边界

使用自己的两个文本文件运行目录 CLI。随后安装固定版本的可选依赖，对比文本块偏移量，不要仅比较块数。

默认回答器在本地运行，采用抽取式回答。词汇重叠无法证明语义蕴含。有效引用仍可能与问题无关或已经过时；内容哈希让读者能够检测来源变化。

## 验证真实框架

默认阶段测试中有五项不导入 SDK 的适配器契约检查。安装固定版本的可选依赖后，显式加入五项真实 SDK 测试：

```bash
python3 -m venv .venv
.venv/bin/python -m pip install -r projects/doc-qa-with-citations/requirements-framework.txt
.venv/bin/python scripts/project_test.py doc-qa-with-citations --solution --optional --strict
.venv/bin/python projects/doc-qa-with-citations/solution/framework_demo.py
```

使用 `--path my-doc-qa-with-citations` 替代 `--solution` 来评分自己的实现。缺依赖时，可选模式报告跳过，严格可选模式报告失败。上游记录的验证版本为 `langchain-text-splitters==1.1.2`；模型回复全部来自本地夹具。

## 参考资料

[参考资料 1](https://docs.langchain.com/oss/python/integrations/splitters/recursive_text_splitter)
