# PR 评审报告器（PR Review Reporter）

保留 Git 行级证据的本地补丁评审工具，可通过 SARIF 接入持续集成。

需要 Node 22.18+ 和 Python 3，仅 --repo 模式额外需要 Git；先掌握统一 diff 的计数器、JSON、逐字源码引文和 HTML 转义。核心使用标准库。评分器检查你选择的工作区，绝不会从参考实现中补入缺失行为。

## 构建并运行自己的版本

从仓库根目录初始化一次。新的起始代码按设计应当失败。

```bash
python3 scripts/project_test.py pr-review-reporter --init learning-artifacts/pr-review-reporter
python3 scripts/project_test.py pr-review-reporter --stage 1 --path learning-artifacts/pr-review-reporter --strict
```

逐阶段完成实现，再运行累计评分器和随附输入驱动程序：

```bash
python3 scripts/project_test.py pr-review-reporter --all --path learning-artifacts/pr-review-reporter --strict
cd learning-artifacts/pr-review-reporter
node cli.ts --diff samples/change.diff --output review.json --html review.html --sarif review.sarif
```

驱动程序和离线样本属于随附脚手架，其导入会解析到你的实现。公开输入类型与函数签名位于起始代码及 [API 契约](API.md)中。

## 单独检查参考实现

从仓库根目录执行：

```bash
python3 scripts/project_test.py pr-review-reporter --all --solution --strict
cd projects/pr-review-reporter/solution
node cli.ts --diff samples/change.diff --output review.json --html review.html --sarif review.sarif
```

## 观察变化

示例补丁在新文件第 2 行加入 eval(input)，第 3 行加入一条注释。报告保留一个已定位的候选问题，过滤注释，并向 JSON、HTML 和 SARIF 写入一致的位置。

修改样本副本并再次运行命令。将输入与输出保存在一起，便于他人复现；随附样本是人工编写的教学数据。

## 集成与限制

使用 --diff - 从标准输入读取；使用 --repo /path --base REF --head REF 只读获取 Git diff；或使用 --candidates recorded-findings.json，将其他评审者的问题记录与所提供的补丁对照校验。

四个词法检测器只能提出范围有限的评审候选问题，不能判定漏洞是否可利用。不支持二进制补丁和合并提交的 combined diff。带引号的 Git 路径先解码，再校验目录穿越和定位信息。不会向远程 PR 发布评论。

## 阶段

1. [恢复新文件行号](stages/01-diff-lines/docs/en.md)
2. [生成范围明确的评审候选问题](stages/02-inspect/docs/en.md)
3. [校验并合并问题](stages/03-anchors/docs/en.md)
4. [发布经过转义的本地报告](stages/04-report/docs/en.md)


## 权威参考资料

[Git diff 格式](https://git-scm.com/docs/diff-format)
[Python 子进程与 JSON](https://docs.python.org/3/library/json.html)

## 将报告传给评审组

多智能体代码评审组通过 --pr-report 接收本报告。其适配器保留 file、line 和 rule，将严重程度映射为数值投票，并保留 diff_sha256。应向评审组提供匹配的新文件源码快照；快照过期时，应拒绝导入的引文。

译注：规则消息同时进入 JSON、SARIF 和下游评审组，故保留英文原值；页面标题与说明已译。findings 和 rejected 的双语计数保留现有测试契约。这里只核对本地补丁证据，不发布 PR 评论或认证漏洞。
