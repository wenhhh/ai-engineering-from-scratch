# 驱动真实测试页面并为运行评分

共四个阶段，这是第 4 阶段。开始前先阅读[项目前提条件](../../../README.md)，本阶段依赖先前契约。

## 本阶段的变化（What changes）

通过回环地址提供 fixture.html，用 gstack browse 打开。GstackDriver 读取 DOM 观察，填写对应标签的字段，点击观察到的按钮并捕获真实截图。命令通过参数数组执行，不经 shell 解释。用 --live 运行同一套有界策略，对比它与模拟后端的轨迹；模拟和真实浏览器的完成得分分开记录。

本阶段的接口边界为 `GstackDriver, scoreRuns`。保持之前阶段的行为不变，最终评分器会对同一工作区运行所有阶段测试。

## 推演一个具体案例（Work through one concrete case）

真实适配器打开配置中的回环 URL，通过 JavaScript 读取标签，填写观察到的 id 对应字段，并保存 browser-result.png。该模式的截图来自 Chromium；模拟模式则有意复用教学像素。

```figure
pj-browser-agent-4
```

改变实验输入，在查看指标前先算出结果。交互图会根据这些输入计算；下方实现测试仍是判断是否完成的证据来源。

## 实现契约（Implement the contract）

在工作区 `main.ts` 中实现 `GstackDriver, scoreRuns`。先尝试实现契约，再查阅参考解答的导出类型。保留起始代码的公共名称，便于测试调用你的实现。核心函数返回结构化值，不在其中打印；最终结果由 CLI 输出。

依据[公共 API 契约](../../../API.md)和起始代码中的类型签名实现。核心函数负责返回值，文件输入、参数解析和展示交给提供的驱动程序。

在 execFileSync 中分开传递可执行程序与参数。任务值即使含引号，也保持为一个 fill 参数。导航前给出允许的来源，并在每次观察时重新检查。

## 验证与检查（Verify and inspect）

从仓库根目录执行一次 `python3 scripts/project_test.py browser-agent --init learning-artifacts/browser-agent` 初始化，再按累积阶段评分：

```bash
python3 scripts/project_test.py browser-agent --stage 4 --path learning-artifacts/browser-agent --strict
```

新工作区在契约实现前应测试失败。完成所有阶段后，用提供的样本运行你实际构建的交付物：

```bash
cd learning-artifacts/browser-agent
node cli.ts --task samples/contact.json --output browser-run.json
```

## 探查失效边界（Investigate the failure boundary）

在 127.0.0.1:8877 提供 fixture.html，设置 BROWSE_BIN，再运行 cli.ts --task samples/contact.json --live。将运行模式、动作数量与截图一起记录。

离线模式检验测试场景的状态转移和预先记录的像素。绿色像素仅是本测试页面的特定信号，不能代表通用视觉理解。真实运行的 CLI 仅允许访问明确放行的回环地址页面。


## 参考资料（References）

[Chrome 开发者工具协议](https://chromedevtools.github.io/devtools-protocol/)
[PNG 规范](https://www.w3.org/TR/png-3/)
[HTML 表单控件](https://html.spec.whatwg.org/multipage/forms.html)

译注：本阶段部分测试注入伪驱动以检查参数数组和动作限制，不会启动 Chromium。只有明确执行真实浏览器命令并保留截图，才可记为真实运行证据；回环地址限制也不能替代完整浏览器隔离。
