# 测量评审组的精确率与召回率

第 4 阶段，共 4 阶段。开始前阅读[项目先修要求](../../../README.md)；本阶段建立在此前契约之上。

## 本阶段变化

将唯一的问题 ID 与预期集合对照。精确率衡量预测问题中有多少属于预期；召回率衡量预期集合中有多少被发现。两个集合都要去重，避免重复评审者抬高指标。没有预测时精确率记为零，避免出现误导性的满分。调整最低支持人数前，先尝试留出输入。

本阶段的接口边界为 `evaluate`。保持前面阶段的行为不变：最终评分器会在同一个工作区运行所有阶段。

## 推演一个具体用例

本地宽泛规则评审者预测三个问题，其中两个为真阳性，精确率为 2/3。最低支持人数门槛保留两个预期问题，在这个样本上得到精确率 1、召回率 1。预算为 1 时无法形成共识，召回率为 0。

```figure
pj-multi-agent-code-review-panel-4
```

译注：图表范围：仅按每位评审者成本为 1 简化计算支持人数和指标；不执行源码引文校验、不同成本调度或超时取消。零成本评审者等实际行为以 runPanel 测试为准。

修改实验输入，先自行计算结果，再阅读指标。图表根据这些输入计算；实现是否完成，仍以下方测试为证据。

## 实现契约

在工作区的 `main.ts` 中实现 `evaluate`。先尝试完成契约，再查阅参考实现导出的类型。保留起始代码的公开名称，便于测试调用你的实现。核心函数应返回结构化值，不在内部打印；最终结果由命令行程序打印。

使用[公开 API 契约](../../../API.md)和带类型的起始签名。核心函数负责返回值；文件输入、参数解析与展示由随附驱动程序负责。

将单独预测与组合预测对照同一预期集合。两个集合均去重，并保留源码指纹；不同快照上的指标不能作为可比较证据。

## 验证与检查

从仓库根目录执行一次 `python3 scripts/project_test.py multi-agent-code-review-panel --init learning-artifacts/multi-agent-code-review-panel` 完成初始化，再进行累计评分：

```bash
python3 scripts/project_test.py multi-agent-code-review-panel --stage 4 --path learning-artifacts/multi-agent-code-review-panel --strict
```

在完成契约之前，全新工作区应当失败。完成全部阶段后，使用随附样本运行你的实际交付物：

```bash
cd learning-artifacts/multi-agent-code-review-panel
node cli.ts --input samples/review.json --output panel.json --html panel.html
```

## 探究失败边界

保留一个仅被一位评审者发现的用例作为留出输入。将共识宣传为改进之前，先测量最低支持人数门槛是否丢掉了这个真阳性。

本地评审者采用不同的静态启发式规则，并不代表独立的大语言模型。共识衡量支持程度，不能判定事实真伪。外部回调必须遵守 AbortSignal；超时无法撤销远程副作用。


## 参考资料

[Node 中的 AbortController](https://nodejs.org/api/globals.html#class-abortcontroller)
[Node 测试运行器](https://nodejs.org/api/test.html)
