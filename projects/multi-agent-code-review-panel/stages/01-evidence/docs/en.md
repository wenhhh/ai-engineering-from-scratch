# 校验评审证据

第 1 阶段，共 4 阶段。开始前阅读[项目先修要求](../../../README.md)；本阶段建立在此前契约之上。

## 本阶段变化

要求文件存在于所提供的快照中，行号为从 1 开始的正整数，引文逐字匹配且非空，规则 ID 稳定，严重程度为 1 至 3。所有评审者共用证据校验，阻止虚构位置进入聚合流程；即使多方同意且文本有出处，也不足以证明问题判断正确。

本阶段的接口边界为 `validateFinding`。保持前面阶段的行为不变：最终评分器会在同一个工作区运行所有阶段。

## 推演一个具体用例

评审者声称 run.ts 的第 99 行包含 eval(input)，但所提供的快照只有三行。即使另一位评审者也重复这个虚构位置，也必须在统计支持人数前拒绝。

```figure
pj-multi-agent-code-review-panel-1
```

译注：图表范围：仅按每位评审者成本为 1 简化计算支持人数和指标；不执行源码引文校验、不同成本调度或超时取消。零成本评审者等实际行为以 runPanel 测试为准。

修改实验输入，先自行计算结果，再阅读指标。图表根据这些输入计算；实现是否完成，仍以下方测试为证据。

## 实现契约

在工作区的 `main.ts` 中实现 `validateFinding`。先尝试完成契约，再查阅参考实现导出的类型。保留起始代码的公开名称，便于测试调用你的实现。核心函数应返回结构化值，不在内部打印；最终结果由命令行程序打印。

使用[公开 API 契约](../../../API.md)和带类型的起始签名。核心函数负责返回值；文件输入、参数解析与展示由随附驱动程序负责。

查找文件时检查自有属性，并将从 1 开始的行号转换为数组索引。非空的逐字引文只能支持位置，不能证明严重程度或因果判断。

## 验证与检查

从仓库根目录执行一次 `python3 scripts/project_test.py multi-agent-code-review-panel --init learning-artifacts/multi-agent-code-review-panel` 完成初始化，再进行累计评分：

```bash
python3 scripts/project_test.py multi-agent-code-review-panel --stage 1 --path learning-artifacts/multi-agent-code-review-panel --strict
```

在完成契约之前，全新工作区应当失败。完成全部阶段后，使用随附样本运行你的实际交付物：

```bash
cd learning-artifacts/multi-agent-code-review-panel
node cli.ts --input samples/review.json --output panel.json --html panel.html
```

## 探究失败边界

通过命令行把外部记录的问题提交到已变化的源码快照上。它必须与本地评审者一样，接受相同的引文校验。




## 参考资料

[Node 中的 AbortController](https://nodejs.org/api/globals.html#class-abortcontroller)
[Node 测试运行器](https://nodejs.org/api/test.html)
