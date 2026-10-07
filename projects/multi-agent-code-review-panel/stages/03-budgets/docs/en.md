# 预留成本并执行期限约束

第 3 阶段，共 4 阶段。开始前阅读[项目先修要求](../../../README.md)；本阶段建立在此前契约之上。

## 本阶段变化

启动每位评审者之前先预留其成本。剩余预算不足时跳过该工作并记录决策。为每位评审者设置期限，超时后中止其信号。失败记录保留在轨迹中，已完成的评审仍可聚合。适配器必须遵守 AbortSignal 才能停止外部工作；运行器无法强制远程服务取消。

本阶段的接口边界为 `runPanel`。保持前面阶段的行为不变：最终评分器会在同一个工作区运行所有阶段。

## 推演一个具体用例

三位评审者各耗费一个单位，预算为 2 时只允许前两位运行。两者并发开始；1000 毫秒期限会将过慢的评审者标为 timeout，并中止其信号。

```figure
pj-multi-agent-code-review-panel-3
```

译注：图表范围：仅按每位评审者成本为 1 简化计算支持人数和指标；不执行源码引文校验、不同成本调度或超时取消。零成本评审者等实际行为以 runPanel 测试为准。

修改实验输入，先自行计算结果，再阅读指标。图表根据这些输入计算；实现是否完成，仍以下方测试为证据。

## 实现契约

在工作区的 `main.ts` 中实现 `runPanel`。先尝试完成契约，再查阅参考实现导出的类型。保留起始代码的公开名称，便于测试调用你的实现。核心函数应返回结构化值，不在内部打印；最终结果由命令行程序打印。

使用[公开 API 契约](../../../API.md)和带类型的起始签名。核心函数负责返回值；文件输入、参数解析与展示由随附驱动程序负责。

开始执行 Promise 前预留每项成本。聚合已完成评审时仍保留超时及失败事件，否则看似便宜的部分评审组会掩盖被跳过的工作。

## 验证与检查

从仓库根目录执行一次 `python3 scripts/project_test.py multi-agent-code-review-panel --init learning-artifacts/multi-agent-code-review-panel` 完成初始化，再进行累计评分：

```bash
python3 scripts/project_test.py multi-agent-code-review-panel --stage 3 --path learning-artifacts/multi-agent-code-review-panel --strict
```

在完成契约之前，全新工作区应当失败。完成全部阶段后，使用随附样本运行你的实际交付物：

```bash
cd learning-artifacts/multi-agent-code-review-panel
node cli.ts --input samples/review.json --output panel.json --html panel.html
```

## 探究失败边界

实现一个忽略 AbortSignal 的评审者。展示运行器可以停止等待，却不能保证外部工作已经停止。




## 参考资料

[Node 中的 AbortController](https://nodejs.org/api/globals.html#class-abortcontroller)
[Node 测试运行器](https://nodejs.org/api/test.html)
