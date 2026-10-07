# 汇总独立评审者的支持

第 2 阶段，共 4 阶段。开始前阅读[项目先修要求](../../../README.md)；本阶段建立在此前契约之上。

## 本阶段变化

按文件、行号和规则对有效问题分组。每位评审者在每组只计一票，拒绝重复的评审者标识，并保留所有严重程度投票。达到最低支持人数后形成共识；只有一位评审者支持的问题仍以 needs-review 显示。形成共识后也保留分歧标记，便于用户检查严重程度判断的冲突。

本阶段的接口边界为 `aggregate`。保持前面阶段的行为不变：最终评分器会在同一个工作区运行所有阶段。

## 推演一个具体用例

一位评审者重复报告同一问题五次，另一位报告一次。支持人数是两个不同的评审者 ID，不能按六份报告计数。严重程度 [3,2] 会形成共识，同时保留 disagreement=true。

```figure
pj-multi-agent-code-review-panel-2
```

译注：图表范围：仅按每位评审者成本为 1 简化计算支持人数和指标；不执行源码引文校验、不同成本调度或超时取消。零成本评审者等实际行为以 runPanel 测试为准。

修改实验输入，先自行计算结果，再阅读指标。图表根据这些输入计算；实现是否完成，仍以下方测试为证据。

## 实现契约

在工作区的 `main.ts` 中实现 `aggregate`。先尝试完成契约，再查阅参考实现导出的类型。保留起始代码的公开名称，便于测试调用你的实现。核心函数应返回结构化值，不在内部打印；最终结果由命令行程序打印。

使用[公开 API 契约](../../../API.md)和带类型的起始签名。核心函数负责返回值；文件输入、参数解析与展示由随附驱动程序负责。

以稳定元组 (file,line,rule) 分组。输出保留严重程度投票和支持者 ID，不要将决策压缩成单个布尔值。

## 验证与检查

从仓库根目录执行一次 `python3 scripts/project_test.py multi-agent-code-review-panel --init learning-artifacts/multi-agent-code-review-panel` 完成初始化，再进行累计评分：

```bash
python3 scripts/project_test.py multi-agent-code-review-panel --stage 2 --path learning-artifacts/multi-agent-code-review-panel --strict
```

在完成契约之前，全新工作区应当失败。完成全部阶段后，使用随附样本运行你的实际交付物：

```bash
cd learning-artifacts/multi-agent-code-review-panel
node cli.ts --input samples/review.json --output panel.json --html panel.html
```

## 探究失败边界

将样本的最低支持人数从 2 提高到 3。找出哪个真实问题变成 needs-review，哪个误报此前就只有单一支持者。




## 参考资料

[Node 中的 AbortController](https://nodejs.org/api/globals.html#class-abortcontroller)
[Node 测试运行器](https://nodejs.org/api/test.html)
