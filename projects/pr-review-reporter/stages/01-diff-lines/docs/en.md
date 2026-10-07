# 恢复新文件行号

第 1 阶段，共 4 阶段。开始前阅读[项目先修要求](../../../README.md)；本阶段建立在此前契约之上。

## 本阶段变化

从差异块头解析旧文件与新文件的行计数。上下文行同时推进两个计数器；删除行只推进旧文件计数器；新增行推进新文件计数器，并产生可审阅的位置。拒绝截断的差异块和向父目录穿越的路径。解析器仅处理文本统一 diff；二进制补丁与合并提交的 combined diff 不在契约内。通过 execFileSync 和标准输入将 Python 接入 TypeScript，不要拼接 shell 命令。

本阶段的接口边界为 `parseDiff`。保持前面阶段的行为不变：最终评分器会在同一个工作区运行所有阶段。

## 推演一个具体用例

一个差异块从新文件第 10 行开始，含两行上下文，删除三行旧内容，再加入 eval(input)。新增内容位于新文件第 12 行，因为删除行不会推进新文件计数器。

```figure
pj-pr-review-reporter-1
```

译注：图表范围：此处只演示单条新增行的行号与 dynamic-eval 检查；完整 diff 解析、其余检测规则、候选对象校验和 SARIF 导出由实际程序执行。

修改实验输入，先自行计算结果，再阅读指标。图表根据这些输入计算；实现是否完成，仍以下方测试为证据。

## 实现契约

在工作区的 `main.ts` 中实现 `parseDiff`。先尝试完成契约，再查阅参考实现导出的类型。保留起始代码的公开名称，便于测试调用你的实现。核心函数应返回结构化值，不在内部打印；最终结果由命令行程序打印。

使用[公开 API 契约](../../../API.md)和带类型的起始签名。核心函数负责返回值；文件输入、参数解析与展示由随附驱动程序负责。

当差异块仍有待消费的行时，以 +++ 开头的行仍属于新增内容，不能当作新文件名头。检查目录穿越前先解码 Git 带引号的路径。

## 验证与检查

从仓库根目录执行一次 `python3 scripts/project_test.py pr-review-reporter --init learning-artifacts/pr-review-reporter` 完成初始化，再进行累计评分：

```bash
python3 scripts/project_test.py pr-review-reporter --stage 1 --path learning-artifacts/pr-review-reporter --strict
```

在完成契约之前，全新工作区应当失败。完成全部阶段后，使用随附样本运行你的实际交付物：

```bash
cd learning-artifacts/pr-review-reporter
node cli.ts --diff samples/change.diff --output review.json --html review.html --sarif review.sarif
```

## 探究失败边界

使用包含空格的文件名，以及源码本身以 ++ 开头的新增行。二者都必须保留精确证据，不能使解析器混淆状态。




## 参考资料

[Git diff 格式](https://git-scm.com/docs/diff-format)
[Python 子进程与 JSON](https://docs.python.org/3/library/json.html)
