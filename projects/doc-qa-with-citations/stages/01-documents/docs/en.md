# 加载本地文档并保留稳定来源

第 1 阶段，共 4 阶段。开始前先阅读[项目先修要求](../../../README.md)；本阶段沿用此前建立的契约。

## 本阶段的变化

检索前先保留来源标识、内容哈希和精确偏移量。字符窗口是刻意保持简单的基线：重叠可保留边界附近的上下文，但不会创造新证据。加载器拒绝指向根目录之外的符号链接，防止文档扫描在不知情的情况下读取其他目录。

## 推演一个具体案例

对于文本 abcdef，窗口大小 4、重叠量 1 得到 [0,4)="abcd" 和 [3,6)="def"。偏移量按 Unicode 字符计数，不按 UTF-8 字节计数；文件内容的 SHA-256 用于标识来源版本。译注：本实现对 read_text 读入的文本重新进行 UTF-8 编码后计算哈希，读取过程可能规范化换行，不能将它直接等同于磁盘原始字节哈希。

```figure
pj-doc-qa-with-citations-1
```

译注：图表限制：此 JavaScript 示例按 UTF-16 位置切片，并使用 ASCII 词匹配；Python 正文实现按 Unicode 字符切片和分词。emoji 或中文输入时不可将两者的位置与分数直接对等。

修改实验输入，先自行计算结果，再查看指标。图表根据输入计算；下方实现测试仍是完成证据的来源。

## 实现契约

实现 `documents.py` 中的 `load_documents`、`chunk_document`。这是“带引用的文档问答与 LangChain”项目的第 1 阶段：接收明确输入，返回可供下一阶段使用、能够检查的结果。

依据[公共 API 契约](../../../API.md)和起始代码的类型签名实现。核心函数负责返回值，文件输入、参数解析和展示交给随附驱动程序。

文本块到达来源末尾时立即停止，否则较短的尾块可能继续生成冗余窗口。解析每条路径，拒绝越出根目录的符号链接。

## 验证与检查

从仓库根目录执行一次 `python3 scripts/project_test.py doc-qa-with-citations --init learning-artifacts/doc-qa-with-citations` 完成初始化，然后按阶段累积评分：

```bash
python3 scripts/project_test.py doc-qa-with-citations --stage 1 --path learning-artifacts/doc-qa-with-citations --strict
```

实现契约之前，新工作区应测试失败。全部阶段完成后，使用随附样本运行自己的实际作品：

```bash
cd learning-artifacts/doc-qa-with-citations
python3 cli.py samples/docs "When does cache expire?" --output answer.json --html answer.html
```

## 探查失败边界

在引用区间之前放置一个多字节字符。确认 Python 字符串切片、返回的偏移量和渲染器使用同一计数单位。




## 参考资料

[参考资料 1](https://docs.langchain.com/oss/python/integrations/splitters/recursive_text_splitter)
