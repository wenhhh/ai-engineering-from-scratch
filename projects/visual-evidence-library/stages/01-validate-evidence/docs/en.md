# 校验图片路径与文本矩形

> 索引前保留文本声明的来源位置。

**Type:** Build  
**Language:** Python  
**Stage:** 第 1 阶段，共 4 阶段  
**Time:** 约 2 小时

## 构建目标

搜索结果的可信度取决于证据记录。每个图片资源包含 ID、本地路径、宽、高和区域列表。每个区域有独立 ID、文本、矩形 [x,y,width,height] 和来源。清单中的声明由人提供，或在模型提取后经过审阅。

```figure
pj-visual-evidence-library-1
```

图表限制：矩形控件模型未检查负的左上坐标；检索图使用 JavaScript 小写转换，实际 Python 实现使用 Unicode casefold。超出控件范围或涉及 ß 等字符时，两者结果可能不同。完整路径、类型及索引校验以实际实现为准。

## 示例推演

对于 600×320 的标牌，[45,130,510,45] 的终点为 x=555、y=175，位于图片内；[590,130,30,45] 越过右边缘，必须失败。负宽度不能用来表示镜像矩形。

编码前写出该示例的返回字段及一个应失败的输入。将预期结果放在实现旁，便于区分契约变化和程序缺陷。

## 实现契约

- `validate_manifest(manifest: dict, root: Path) -> list[dict]`

资源 ID 必须唯一，每个资源内部的区域 ID 也必须唯一。尺寸是 1 至 20000 的整数。矩形含四个有限且非布尔数值，宽高为正，所有边界都在图片内。解析每条路径，包含符号链接，并确保其位于 root 下。图片必须已存在、格式受支持，且不大于 5 MB。模型建议的区域必须先设为 reviewed=True 才可索引。

保持前面阶段继续工作。在学习者工作区实现这些函数；推演示例时先不打开参考解答。

## 提示与失败情况

检查路径约束前，先解析根目录与候选路径。用 x+w、y+h 对比声明的边界。Python 将 bool 视为整数，仍须明确拒绝。解析后的路径仅用于内部字段，不写进可移植报告数据。

## 运行本阶段

从仓库根目录初始化一次，然后运行累计测试：

```bash
python3 scripts/project_test.py visual-evidence-library --init my-visual-evidence-library
python3 scripts/project_test.py visual-evidence-library --stage 1 --path my-visual-evidence-library
```

起始代码故意抛出未实现错误。再次初始化保留已有源文件，不会将其替换。通过结果要求每项所选测试都实际运行；跳过测试不构成完成证据。

## 检查你的推理

哪些检查证明结构有效，哪些声明仍需查看真实图片？为什么几何有效不代表文本正确？

## 接入最终交付物

带高亮矩形的独立 HTML 证据图库，以及可复用的 evidence.json。 离线核心索引给定的 OCR 元数据，不读取像素或执行 OCR。随附 SVG 标牌及元数据为本项目原创。查询覆盖率只表示词项重叠，不是图片确实表达某种含义的置信度。尺寸和给定文本仍属于人的声明。

完成项目后，尝试自己的输入：

```bash
cd my-visual-evidence-library
python3 main.py --manifest ./fixtures/manifest.json --query "return dry seeds" --out ./visual-output
```

为一种图片格式增加尺寸读取器，将真实尺寸与声明值比较。不要替换给定文本的来源标签。

## 权威参考资料

[官方 API 文档](https://docs.python.org/3/library/xml.etree.elementtree.html)。实现、示例与夹具均为原创。参考资料解释底层 API，项目特定策略已在上文说明。
