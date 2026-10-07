# 排序匹配结果并保留矩形

> 用透明的词项查询覆盖率检索区域文本。

**Type:** Build  
**Language:** Python  
**Stage:** 第 2 阶段，共 4 阶段  
**Time:** 约 2 小时

## 构建目标

分别索引各区域文本。一次查询可以匹配多张图片，也可以匹配同一图片中的多个区域。保留区域标识，避免把标题命中误呈现为来自下方段落。分数统计在该区域中出现的唯一查询词项。

```figure
pj-visual-evidence-library-2
```

图表限制：矩形控件模型未检查负的左上坐标；检索图使用 JavaScript 小写转换，实际 Python 实现使用 Unicode casefold。超出控件范围或涉及 ß 等字符时，两者结果可能不同。完整路径、类型及索引校验以实际实现为准。

## 示例推演

return dry seeds 有三个唯一词项。区域 Return dry seeds in paper envelopes 命中三个，得分为 1；另一标牌 Return tools to the blue shelf 只命中 return，得分为 1/3。seed 不会自动匹配 seeds；这是能力明确的词汇基线。

编码前写出该示例的返回字段及一个应失败的输入。将预期结果放在实现旁，便于区分契约变化和程序缺陷。

## 实现契约

- `terms(text: str) -> set[str]`
- `search(assets, query: str, limit: int = 20) -> list[dict]`

对 Unicode 文本执行大小写折叠，并按单词字符分词。空查询返回空结果。limit 必须是 1 至 100 的整数。返回 asset_id、region_id、原始 text、bbox、matched_terms、score 和 origin。先按分数降序，再按资源 ID、区域 ID 排序。重复查询词不增加分母。

保持前面阶段继续工作。在学习者工作区实现这些函数；推演示例时先不打开参考解答。

## 提示与失败情况

用集合计算覆盖率，同时保留原始文本供展示。测试带重音符号的词和同分结果。JSON 中的分数保持数值，只在视图中格式化为百分比。

## 运行本阶段

从仓库根目录初始化一次，然后运行累计测试：

```bash
python3 scripts/project_test.py visual-evidence-library --init my-visual-evidence-library
python3 scripts/project_test.py visual-evidence-library --stage 2 --path my-visual-evidence-library
```

起始代码故意抛出未实现错误。再次初始化保留已有源文件，不会将其替换。通过结果要求每项所选测试都实际运行；跳过测试不构成完成证据。

## 检查你的推理

为什么查询得分 100% 不能证明某个区域回答了问题？短语匹配会怎样改变契约？

## 接入最终交付物

带高亮矩形的独立 HTML 证据图库，以及可复用的 evidence.json。 离线核心索引给定的 OCR 元数据，不读取像素或执行 OCR。随附 SVG 标牌及元数据为本项目原创。查询覆盖率只表示词项重叠，不是图片确实表达某种含义的置信度。尺寸和给定文本仍属于人的声明。

完成项目后，尝试自己的输入：

```bash
cd my-visual-evidence-library
python3 main.py --manifest ./fixtures/manifest.json --query "return dry seeds" --out ./visual-output
```

增加独立、可选的同义词表，在人工标注查询上测量精确率。展示扩展词项，让用户能解释意外匹配。

## 权威参考资料

[官方 API 文档](https://docs.python.org/3/library/xml.etree.elementtree.html)。实现、示例与夹具均为原创。参考资料解释底层 API，项目特定策略已在上文说明。
