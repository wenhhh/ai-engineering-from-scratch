# 用 Python 检查截图像素

共四个阶段，这是第 3 阶段。开始前先阅读[项目前提条件](../../../README.md)，本阶段依赖先前契约。

## 本阶段的变化（What changes）

读取 PNG 签名、数据块长度与 CRC，再在大小限制内解压图像数据。逆向恢复 PNG 行滤波，统计绿色成功像素。将该视觉信号与 DOM 标记结合，任何单项都不足以证明完成。此处只检测教学测试页面的特定像素状态，不进行 OCR 或通用视觉推断。损坏、超大、交错扫描或不支持的颜色格式均明确失败。

本阶段的接口边界为 `inspectPNG`。保持之前阶段的行为不变，最终评分器会对同一工作区运行所有阶段测试。

## 推演一个具体案例（Work through one concrete case）

一张 4×4 RGB 截图含 16 个像素。四个绿色像素的占比为 0.25，没有绿色像素则为 0.0。有效 PNG 签名只是第一步：修改 IHDR 字节却不更新 CRC 时，检查必须失败。

```figure
pj-browser-agent-3
```

改变实验输入，在查看指标前先算出结果。交互图会根据这些输入计算；下方实现测试仍是判断是否完成的证据来源。

## 实现契约（Implement the contract）

在工作区 `main.ts` 中实现 `inspectPNG`。先尝试实现契约，再查阅参考解答的导出类型。保留起始代码的公共名称，便于测试调用你的实现。核心函数返回结构化值，不在其中打印；最终结果由 CLI 输出。

依据[公共 API 契约](../../../API.md)和起始代码中的类型签名实现。核心函数负责返回值，文件输入、参数解析和展示交给提供的驱动程序。

滤波类型 1 的恢复公式为：恢复字节 =（存储字节 + 已恢复的左侧字节）模 256。类型 2 使用上一行。RGB 每像素占三字节，因此左侧指 index-3，不能使用 index-1。

## 验证与检查（Verify and inspect）

从仓库根目录执行一次 `python3 scripts/project_test.py browser-agent --init learning-artifacts/browser-agent` 初始化，再按累积阶段评分：

```bash
python3 scripts/project_test.py browser-agent --stage 3 --path learning-artifacts/browser-agent --strict
```

新工作区在契约实现前应测试失败。完成所有阶段后，用提供的样本运行你实际构建的交付物：

```bash
cd learning-artifacts/browser-agent
node cli.ts --task samples/contact.json --output browser-run.json
```

## 探查失效边界（Investigate the failure boundary）

构造包含 (20,140,80) 和 (30,150,90) 两个像素的一行。红色通道经滤波类型 1 存为 20、10，恢复后必须为 20、30。通用颜色检测仍不属于本测试契约。




## 参考资料（References）

[Chrome 开发者工具协议](https://chromedevtools.github.io/devtools-protocol/)
[PNG 规范](https://www.w3.org/TR/png-3/)
[HTML 表单控件](https://html.spec.whatwg.org/multipage/forms.html)
