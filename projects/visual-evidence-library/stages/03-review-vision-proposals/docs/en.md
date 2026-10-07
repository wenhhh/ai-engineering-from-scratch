# 将提取建议与分类标签分开

> 调用可选视觉端点，在索引前要求审阅。

**Type:** Build  
**Language:** Python  
**Stage:** 第 3 阶段，共 4 阶段  
**Time:** 约 2 小时

## 构建目标

模型可以建议可见文本，也可以把图片分类为标牌或图示。这是两种不同输出。分类标签没有文本矩形，绝不能当作 OCR 证据。先校验传输及结构，再要求人逐段对照图片检查候选文本。

```figure
pj-visual-evidence-library-3
```

## 示例推演

服务商返回 regions=[{text: Return tools, bbox: [40,120,200,40]}] 和 labels=[notice]，得到一个 reviewed=False 的 model-proposed 区域。notice 保留在 classification_labels 中。候选框越过图片边界时，拒绝整个建议，不要通过裁切伪装成有效结果。

编码前写出该示例的返回字段及一个应失败的输入。将预期结果放在实现旁，便于区分契约变化和程序缺陷。

## 实现契约

- `validate_proposal(proposal: dict, width: int, height: int) -> dict`
- `request_vision(path, endpoint, model, width, height, api_key="") -> dict`

返回 regions、classification_labels、status=review-required 和明确警告。区域 ID 确定性分配。拒绝格式损坏、文本为空、越界的区域及非字符串标签。HTTP 适配器把实际图片字节放入 data URL，发送到配置的 chat-completions 端点，并设置超时和响应大小检查。仅支持签名匹配的 PNG／JPEG 上传；SVG 夹具只用于离线流程。

保持前面阶段继续工作。在学习者工作区实现这些函数；推演示例时先不打开参考解答。

## 提示与失败情况

明确指定服务商 URL。在测试中检查 JSON 请求，返回 choices[0].message.content 形式的受控消息封套。模拟或本地通信测试通过，只能证明序列化及校验，不能证明真实模型读字准确。

## 运行本阶段

从仓库根目录初始化一次，然后运行累计测试：

```bash
python3 scripts/project_test.py visual-evidence-library --init my-visual-evidence-library
python3 scripts/project_test.py visual-evidence-library --stage 3 --path my-visual-evidence-library
```

起始代码故意抛出未实现错误。再次初始化保留已有源文件，不会将其替换。通过结果要求每项所选测试都实际运行；跳过测试不构成完成证据。

## 检查你的推理

收到有效 JSON 后，还有哪些内容未核实？为什么 reviewed=True 表示人工声明，而不是模型置信度门槛？

## 接入最终交付物

带高亮矩形的独立 HTML 证据图库，以及可复用的 evidence.json。 离线核心索引给定的 OCR 元数据，不读取像素或执行 OCR。随附 SVG 标牌及元数据为本项目原创。查询覆盖率只表示词项重叠，不是图片确实表达某种含义的置信度。尺寸和给定文本仍属于人的声明。

完成项目后，尝试自己的输入：

```bash
cd my-visual-evidence-library
python3 main.py --manifest ./fixtures/manifest.json --query "return dry seeds" --out ./visual-output
```

在独立本地审阅日志中记录审阅人和时间。用留出的人工标注集评估字符错误与矩形重叠。

## 权威参考资料

[官方 API 文档](https://docs.python.org/3/library/xml.etree.elementtree.html)。实现、示例与夹具均为原创。参考资料解释底层 API，项目特定策略已在上文说明。
