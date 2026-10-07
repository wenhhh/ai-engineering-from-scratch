# 视觉证据库（Visual Evidence Library）

通过可检查的坐标证据，在截图和图示中查找文本。

你将构建带高亮矩形的独立 HTML 证据图库，以及可复用的 evidence.json。 输入：JSON 清单，列出本地 SVG、PNG 或 JPEG 资源、声明尺寸及明确提供的文本矩形。

## 开始之前

需要 Python 3.10 或更新版本。必需核心使用标准库，可离线运行。Python 将文件校验、Unicode 词项检索、HTTP 请求体和 SVG 解析明确呈现，无需 OCR 框架。

- 能够处理嵌套 Python 字典和列表。
- 理解以图片像素表示的 x/y 坐标及宽高。
- 理解给定标签与独立观察所得证据的区别。

## 动手构建

```bash
python3 scripts/project_test.py visual-evidence-library --init my-visual-evidence-library
python3 scripts/project_test.py visual-evidence-library --stage 1 --path my-visual-evidence-library
python3 scripts/project_test.py visual-evidence-library --all --solution --strict
```

第一条命令创建故意未完成的工作区。后续阶段扩展同一份源文件，测试中包含新的留出输入。参考实现通过仅用于验证示例，不授予学习者证书。

## 使用方法

```bash
cd projects/visual-evidence-library/solution
python3 main.py --manifest ./fixtures/manifest.json --query "return dry seeds" --out ./visual-output
```

在本地打开生成的 index.html。将 HTML 和 JSON 接入自己的工作流，或从 main 导入具名函数。随附演示使用原创夹具运行同一份实现：

```bash
python3 demo.py
```

## 阶段

1. [校验图片路径与文本矩形](stages/01-validate-evidence/docs/en.md)
2. [排序匹配结果并保留矩形](stages/02-search-text-regions/docs/en.md)
3. [将提取建议与分类标签分开](stages/03-review-vision-proposals/docs/en.md)
4. [导出可明确指认的证据](stages/04-export-the-gallery/docs/en.md)

## 结果能够说明什么

离线核心索引给定的 OCR 元数据，不读取像素或执行 OCR。随附 SVG 标牌及元数据为本项目原创。查询覆盖率只表示词项重叠，不是图片确实表达某种含义的置信度。尺寸和给定文本仍属于人的声明。

可选：python3 main.py --vision-image YOUR_IMAGE.png --provider-url http://127.0.0.1:1234/v1/chat/completions --model YOUR_VISION_MODEL --width 600 --height 320 --out ./proposals。需要认证时由 VISION_API_KEY 提供凭据。适配器上传选定 PNG／JPEG，并写入未审阅区域。核对真实图片、文本及坐标，再明确设置 reviewed=true，才能将模型建议区域加入清单。

服务商测试使用受控响应或回环 HTTP，验证请求与响应契约，不验证模型质量或线上服务可用性。本项目没有配置账户连接、消息发送、周期任务或云部署。

## 接入自己的场景

用自己工作流中的少量导出替换原创夹具，运行前写下预期结果。另保留一组示例用于评估。有用的前后对比演示应展示输入、可检查的中间证据和可移植输出，不要用受欢迎程度的宣传替代测量结果。

## 权威参考资料

[官方 API 文档](https://docs.python.org/3/library/xml.etree.elementtree.html)。项目代码、课程正文与夹具均为原创。

译注：原图和给定文本区域保持不变；本次汉化没有执行 OCR 或真实视觉模型。JSON 方法、来源与错误字段保留原契约。无命中提示保留原测试所需英文，并附中文。视觉端点适配器只检查 HTTP(S) 协议，未采用语音适配器的远程 HTTPS／禁止重定向策略；不应上传敏感图片。

图表限制：矩形控件模型未检查负的左上坐标；检索图使用 JavaScript 小写转换，实际 Python 实现使用 Unicode casefold。超出控件范围或涉及 ß 等字符时，两者结果可能不同。完整路径、类型及索引校验以实际实现为准。
