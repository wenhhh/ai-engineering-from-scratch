# 生成范围明确的评审候选问题

第 2 阶段，共 4 阶段。开始前阅读[项目先修要求](../../../README.md)；本阶段建立在此前契约之上。

## 本阶段变化

为动态 eval、shell exec、禁用 TLS 校验和空 catch 处理器构建明确的静态检测规则，只检查新增行。这些模式产生评审候选问题，不能证明存在可利用行为。保持规则 ID 稳定，便于后续模型评审者提出相同疑点时去重。

本阶段的接口边界为 `inspect`。保持前面阶段的行为不变：最终评分器会在同一个工作区运行所有阶段。

## 推演一个具体用例

补丁加入 eval(input)，以及注释 // eval(input) is dangerous。看起来可执行的那行产生 dynamic-eval 候选问题；以注释标记开头的行被过滤。

```figure
pj-pr-review-reporter-2
```

译注：图表范围：此处只演示单条新增行的行号与 dynamic-eval 检查；完整 diff 解析、其余检测规则、候选对象校验和 SARIF 导出由实际程序执行。

修改实验输入，先自行计算结果，再阅读指标。图表根据这些输入计算；实现是否完成，仍以下方测试为证据。

## 实现契约

在工作区的 `main.ts` 中实现 `inspect`。先尝试完成契约，再查阅参考实现导出的类型。保留起始代码的公开名称，便于测试调用你的实现。核心函数应返回结构化值，不在内部打印；最终结果由命令行程序打印。

使用[公开 API 契约](../../../API.md)和带类型的起始签名。核心函数负责返回值；文件输入、参数解析与展示由随附驱动程序负责。

稳定的规则 ID 允许其他评审者报告同一疑点而不产生重复问题。这些正则表达式没有 AST，仍可能误读字符串或跨行结构；每份报告都应说明这一限制。

## 验证与检查

从仓库根目录执行一次 `python3 scripts/project_test.py pr-review-reporter --init learning-artifacts/pr-review-reporter` 完成初始化，再进行累计评分：

```bash
python3 scripts/project_test.py pr-review-reporter --stage 2 --path learning-artifacts/pr-review-reporter --strict
```

在完成契约之前，全新工作区应当失败。完成全部阶段后，使用随附样本运行你的实际交付物：

```bash
cd learning-artifacts/pr-review-reporter
node cli.ts --diff samples/change.diff --output review.json --html review.html --sarif review.sarif
```

## 探究失败边界

尝试包含 eval( 的字符串字面量。决定是加入词法状态解析，还是将其保留为已说明局限、需要审阅的候选问题。




## 参考资料

[Git diff 格式](https://git-scm.com/docs/diff-format)
[Python 子进程与 JSON](https://docs.python.org/3/library/json.html)
