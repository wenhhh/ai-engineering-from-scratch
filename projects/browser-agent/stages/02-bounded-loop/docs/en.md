# 在完成、停滞或额度耗尽时停止

共四个阶段，这是第 2 阶段。开始前先阅读[项目前提条件](../../../README.md)，本阶段依赖先前契约。

## 本阶段的变化（What changes）

每次动作后重新观察。状态重复、策略阻止动作或步骤额度耗尽时停止。完成需要 DOM 成功标记与独立截图检查同时满足；每个选定动作在执行前写入轨迹。测试后端是明确的模拟器，只提供确定性观察来验证循环，不宣称覆盖真实浏览器。

本阶段的接口边界为 `runAgent, FixtureDriver`。保持之前阶段的行为不变，最终评分器会对同一工作区运行所有阶段测试。

## 推演一个具体案例（Work through one concrete case）

空的双字段表单需要四次观察，分别对应填写姓名、填写邮箱、提交和验证。额度为 3 时虽然能够提交，却无法确认完成，因此最终状态仍为 budget-exhausted。

```figure
pj-browser-agent-2
```

改变实验输入，在查看指标前先算出结果。交互图会根据这些输入计算；下方实现测试仍是判断是否完成的证据来源。

## 实现契约（Implement the contract）

在工作区 `main.ts` 中实现 `runAgent, FixtureDriver`。先尝试实现契约，再查阅参考解答的导出类型。保留起始代码的公共名称，便于测试调用你的实现。核心函数返回结构化值，不在其中打印；最终结果由 CLI 输出。

依据[公共 API 契约](../../../API.md)和起始代码中的类型签名实现。核心函数负责返回值，文件输入、参数解析和展示交给提供的驱动程序。

每次修改后重新观察。比较连续的完整观察以检测驱动停滞，在接受 done 之前核对任务要求的字段值。截图或图像检查失败时，返回 `status: "screenshot-error"`、轨迹、原因和可用的截图路径；捕获失败时路径为 `null`。未检查到图像时不返回视觉指标。直接调用 `inspectPNG` 遇到无效图像仍须抛出异常。

## 验证与检查（Verify and inspect）

从仓库根目录执行一次 `python3 scripts/project_test.py browser-agent --init learning-artifacts/browser-agent` 初始化，再按累积阶段评分：

```bash
python3 scripts/project_test.py browser-agent --stage 2 --path learning-artifacts/browser-agent --strict
```

新工作区在契约实现前应测试失败。完成所有阶段后，用提供的样本运行你实际构建的交付物：

```bash
cd learning-artifacts/browser-agent
node cli.ts --task samples/contact.json --output browser-run.json
```

## 探查失效边界（Investigate the failure boundary）

使用 samples/accessibility.json，其中姓名已经正确。解释为何无须修改策略，只需三次观察就足够。




## 参考资料（References）

[Chrome 开发者工具协议](https://chromedevtools.github.io/devtools-protocol/)
[PNG 规范](https://www.w3.org/TR/png-3/)
[HTML 表单控件](https://html.spec.whatwg.org/multipage/forms.html)

译注：maxSteps 限制循环观察次数，并不为所有异步驱动调用提供统一超时。模拟测试通过不等于真实页面加载、重定向或副作用安全已得到验证。
