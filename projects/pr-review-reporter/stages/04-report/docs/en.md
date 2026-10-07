# 发布经过转义的本地报告

第 4 阶段，共 4 阶段。开始前阅读[项目先修要求](../../../README.md)；本阶段建立在此前契约之上。

## 本阶段变化

渲染自包含报告，包含源码位置、证据引文、严重程度和消息。对源码文本与说明文字同样仔细转义，因为 diff 中可能包含可执行 HTML。工具不负责向外发布。命令行程序在本地写入 review.html，并打印机器可读摘要供自动化使用。

本阶段的接口边界为 `escapeHTML, render`。保持前面阶段的行为不变：最终评分器会在同一个工作区运行所有阶段。

## 推演一个具体用例

命令行程序读取所提供的补丁，校验候选问题、合并重复项，再向 review.json、review.html 和 review.sarif 写入一致的位置。diff 的 SHA-256 将报告绑定到补丁的精确字节。

```figure
pj-pr-review-reporter-4
```

译注：图表范围：此处只演示单条新增行的行号与 dynamic-eval 检查；完整 diff 解析、其余检测规则、候选对象校验和 SARIF 导出由实际程序执行。

修改实验输入，先自行计算结果，再阅读指标。图表根据这些输入计算；实现是否完成，仍以下方测试为证据。

## 实现契约

在工作区的 `main.ts` 中实现 `escapeHTML, render`。先尝试完成契约，再查阅参考实现导出的类型。保留起始代码的公开名称，便于测试调用你的实现。核心函数应返回结构化值，不在内部打印；最终结果由命令行程序打印。

使用[公开 API 契约](../../../API.md)和带类型的起始签名。核心函数负责返回值；文件输入、参数解析与展示由随附驱动程序负责。

将源码片段视为不可信 HTML。Git 模式使用参数数组，所有输出保持本地；评审交付物应在任何公开发布前可供检查。

## 验证与检查

从仓库根目录执行一次 `python3 scripts/project_test.py pr-review-reporter --init learning-artifacts/pr-review-reporter` 完成初始化，再进行累计评分：

```bash
python3 scripts/project_test.py pr-review-reporter --stage 4 --path learning-artifacts/pr-review-reporter --strict
```

在完成契约之前，全新工作区应当失败。完成全部阶段后，使用随附样本运行你的实际交付物：

```bash
cd learning-artifacts/pr-review-reporter
node cli.ts --diff samples/change.diff --output review.json --html review.html --sarif review.sarif
```

## 探究失败边界

构造一个独立的留出补丁，包含带引号的文件名和禁用 TLS 的代码。将其 SARIF region.startLine 与 git diff 对照；再修改补丁，观察指纹变化。

四个词法检测器只能提出范围有限的评审候选问题，不能判定漏洞是否可利用。不支持二进制补丁和合并提交的 combined diff。带引号的 Git 路径先解码，再校验目录穿越和定位信息。不会向远程 PR 发布评论。


## 参考资料

[Git diff 格式](https://git-scm.com/docs/diff-format)
[Python 子进程与 JSON](https://docs.python.org/3/library/json.html)
