# 导出可明确指认的证据

> 渲染可移植图库，包含精确区域叠加和 JSON 结果。

**Type:** Build  
**Language:** Python  
**Stage:** 第 4 阶段，共 4 阶段  
**Time:** 约 2 小时

## 构建目标

最终报告应让人一眼检查结果。嵌入图片并在上方画出矩形。将像素坐标转成百分比，使页面窄于原图时叠加层仍保持对齐。JSON 保留原始像素框，供下游工具使用。

```figure
pj-visual-evidence-library-4
```

## 示例推演

种子标牌宽 600 像素。x=45 的框起点对应显示宽度的 7.5%，宽 510 对应 85%。调整浏览器尺寸会改变显示像素，但仍保留同一图片区域。

编码前写出该示例的返回字段及一个应失败的输入。将预期结果放在实现旁，便于区分契约变化和程序缺陷。

## 实现契约

- `image_data(asset: dict) -> str`
- `export_library(assets, query: str, out: Path) -> dict`

写入 index.html 和 evidence.json。包含 query、method、matches 及可移植资源元数据，不包含解析后的文件系统路径。转义所有文本字段。将图片数据嵌入，使 HTML 能独立携带。SVG 只允许明确列出的小型图形／文本子集，移除不支持属性；拒绝 script 或 foreignObject 等不支持元素。提取文本不能作为 HTML 渲染。

保持前面阶段继续工作。在学习者工作区实现这些函数；推演示例时先不打开参考解答。

## 提示与失败情况

为宽度 width:100% 的图片设置定位容器，再加入绝对定位叠加层。分别检查 left=x/width、top=y/height。测试应解码嵌入 SVG，验证事件处理器属性不存在。

## 运行本阶段

从仓库根目录初始化一次，然后运行累计测试：

```bash
python3 scripts/project_test.py visual-evidence-library --init my-visual-evidence-library
python3 scripts/project_test.py visual-evidence-library --stage 4 --path my-visual-evidence-library
```

起始代码故意抛出未实现错误。再次初始化保留已有源文件，不会将其替换。通过结果要求每项所选测试都实际运行；跳过测试不构成完成证据。

## 检查你的推理

读者能在报告中验证什么，哪些信息仍依赖输入清单？矩形使用屏幕坐标而非原图坐标会出什么问题？

## 接入最终交付物

带高亮矩形的独立 HTML 证据图库，以及可复用的 evidence.json。 离线核心索引给定的 OCR 元数据，不读取像素或执行 OCR。随附 SVG 标牌及元数据为本项目原创。查询覆盖率只表示词项重叠，不是图片确实表达某种含义的置信度。尺寸和给定文本仍属于人的声明。

完成项目后，尝试自己的输入：

```bash
cd my-visual-evidence-library
python3 main.py --manifest ./fixtures/manifest.json --query "return dry seeds" --out ./visual-output
```

增加读取本地内嵌索引的查询表单。把模型提取放在查看器之外，保证打开保存的报告不会触发上传。

## 权威参考资料

[官方 API 文档](https://docs.python.org/3/library/xml.etree.elementtree.html)。实现、示例与夹具均为原创。参考资料解释底层 API，项目特定策略已在上文说明。
