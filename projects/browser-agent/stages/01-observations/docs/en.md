# 将 DOM 状态转为受约束的动作

共四个阶段，这是第 1 阶段。开始前先阅读[项目前提条件](../../../README.md)，本阶段依赖先前契约。

## 本阶段的变化（What changes）

读取小型表单中的标签、字段值、禁用状态与稳定 id，校验 id 唯一性和字段类型。每次只选择一个动作：填写姓名、填写邮箱，再点击唯一匹配的 Save request 按钮。页面文字不被解释为执行指令。字段缺失、标签歧义、危险按钮或意外来源都会产生明确的 blocked 结果。

本阶段的接口边界为 `parseObservation, choose`。保持之前阶段的行为不变，最终评分器会对同一工作区运行所有阶段测试。

## 推演一个具体案例（Work through one concrete case）

页面上有 Full name 和 Full name confirmation 两个字段，只允许匹配任务指定的完整标签；选择第一个模糊匹配项可能填错控件。两个字段具有同一目标标签时，应在修改页面前阻止操作。

```figure
pj-browser-agent-1
```

改变实验输入，在查看指标前先算出结果。交互图会根据这些输入计算；下方实现测试仍是判断是否完成的证据来源。

## 实现契约（Implement the contract）

在工作区 `main.ts` 中实现 `parseObservation, choose`。先尝试实现契约，再查阅参考解答的导出类型。保留起始代码的公共名称，便于测试调用你的实现。核心函数返回结构化值，不在其中打印；最终结果由 CLI 输出。

依据[公共 API 契约](../../../API.md)和起始代码中的类型签名实现。核心函数负责返回值，文件输入、参数解析和展示交给提供的驱动程序。

以 Task 表达调用方授权，将 Observation 视为不可信页面状态。根据已观察到的 id 构造一个 fill 或 click 动作；页面文字不能提供代码或命令。

## 验证与检查（Verify and inspect）

从仓库根目录执行一次 `python3 scripts/project_test.py browser-agent --init learning-artifacts/browser-agent` 初始化，再按累积阶段评分：

```bash
python3 scripts/project_test.py browser-agent --stage 1 --path learning-artifacts/browser-agent --strict
```

新工作区在契约实现前应测试失败。完成所有阶段后，用提供的样本运行你实际构建的交付物：

```bash
cd learning-artifacts/browser-agent
node cli.ts --task samples/contact.json --output browser-run.json
```

## 探查失效边界（Investigate the failure boundary）

将 done=true，但让邮箱与任务要求不同。即使页面出现绿色提示，也不能判定完成。




## 参考资料（References）

[Chrome 开发者工具协议](https://chromedevtools.github.io/devtools-protocol/)
[PNG 规范](https://www.w3.org/TR/png-3/)
[HTML 表单控件](https://html.spec.whatwg.org/multipage/forms.html)
