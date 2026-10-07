# 校验并合并问题

第 3 阶段，共 4 阶段。开始前阅读[项目先修要求](../../../README.md)；本阶段建立在此前契约之上。

## 本阶段变化

每个候选问题都必须对应确实存在的新增行位置，并提供非空、逐字匹配的源码子串。拒绝虚构文件、已删除行的位置、空引文和无效严重程度。按文件、行号和规则合并问题；评审者意见不同时保留更高严重程度。引文校验只能确认位置有证据支持，安全判断是否成立仍需审阅。

本阶段的接口边界为 `verify, merge`。保持前面阶段的行为不变：最终评分器会在同一个工作区运行所有阶段。

## 推演一个具体用例

模型建议引用了正确文件，却把已删除行当作引文。新增行证据中没有该文本，必须拒绝。两个有证据支持、对应相同 (file,line,rule) 的报告合并后，采用更高的严重程度。

```figure
pj-pr-review-reporter-3
```

译注：图表范围：此处只演示单条新增行的行号与 dynamic-eval 检查；完整 diff 解析、其余检测规则、候选对象校验和 SARIF 导出由实际程序执行。

修改实验输入，先自行计算结果，再阅读指标。图表根据这些输入计算；实现是否完成，仍以下方测试为证据。

## 实现契约

在工作区的 `main.ts` 中实现 `verify, merge`。先尝试完成契约，再查阅参考实现导出的类型。保留起始代码的公开名称，便于测试调用你的实现。核心函数应返回结构化值，不在内部打印；最终结果由命令行程序打印。

使用[公开 API 契约](../../../API.md)和带类型的起始签名。核心函数负责返回值；文件输入、参数解析与展示由随附驱动程序负责。

分别保存接受与拒绝的集合，使调试评审过程不必先相信每条建议。将输入 JSON 视为未知数据：外层必须为数组；访问字段前先拒绝 null、数组和非对象条目。file、quote、rule、message 必须为字符串，line 必须为正整数，severity 必须受支持；quote、rule、message 去除两端空白后必须非空。将格式损坏的条目保存在 `rejected` 中，同一输入中有效的其他条目仍应进入渲染和 SARIF 导出。

## 验证与检查

从仓库根目录执行一次 `python3 scripts/project_test.py pr-review-reporter --init learning-artifacts/pr-review-reporter` 完成初始化，再进行累计评分：

```bash
python3 scripts/project_test.py pr-review-reporter --stage 3 --path learning-artifacts/pr-review-reporter --strict
```

在完成契约之前，全新工作区应当失败。完成全部阶段后，使用随附样本运行你的实际交付物：

```bash
cd learning-artifacts/pr-review-reporter
node cli.ts --diff samples/change.diff --output review.json --html review.html --sarif review.sarif
```

## 探究失败边界

只修改有效候选问题的行号。确认即使同一引文在别处出现，也不会静默移动问题的位置。




## 参考资料

[Git diff 格式](https://git-scm.com/docs/diff-format)
[Python 子进程与 JSON](https://docs.python.org/3/library/json.html)
