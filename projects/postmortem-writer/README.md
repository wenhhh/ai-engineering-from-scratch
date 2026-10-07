# 事故复盘编写器（Incident Postmortem Writer）

将 JSONL 事故日志和审阅决策转换为 HTML 证据工作台，校验逐字引文，保留负责人明确的行动项，并生成绑定来源的审批凭据。

级别 2。共四个阶段，预计约八小时。使用 Go 实现，仅依赖标准库。

## 开始之前

使用 Go 1.22 或更新版本，以及 Python 3.12 或更新版本运行评分器。需要熟悉函数、结构体、切片、映射和返回错误。如果尚不熟悉，先完成[环境配置](../../phases/00-setup-and-tooling/01-dev-environment/docs/en.md)和[数据管理课程](../../phases/00-setup-and-tooling/09-data-management/docs/en.md)。

## 阶段

1. [解析事故事件台账](stages/01-parse-an-incident-event-ledger/docs/en.md)
2. [构建稳定且有界的时间线](stages/02-build-a-stable-bounded-timeline/docs/en.md)
3. [为每项论断要求证据](stages/03-require-evidence-for-each-claim/docs/en.md)
4. [发布确定性的事故材料包](stages/04-publish-a-deterministic-incident-packet/docs/en.md)

## 动手构建

```bash
python3 scripts/project_test.py postmortem-writer --init /tmp/postmortem-writer-work
python3 scripts/project_test.py postmortem-writer --stage 1 --path /tmp/postmortem-writer-work
python3 scripts/project_test.py postmortem-writer --all --solution --strict
```

## 运行交付物

```bash
cd projects/postmortem-writer/solution
go run .
```

`--events FILE --review FILE --out DIRECTORY` 会生成 index.html、packet.json 和 packet.txt。使用 `--events ../examples/events.jsonl --review ../examples/review.json --out /tmp/incident-packet` 运行随附文件。不传参数时，命令行程序打印一个小型原创夹具。证据检查确认来源；因果判断和审阅者身份仍需人工负责。

学习者起始代码已包含命令行程序和集成适配器。你需要实现四个阶段函数；适配器组合的正是这些函数，无法绕过尚未完成的工作。完成核心阶段后阅读 integration.go，了解文件边界、凭据和渲染。

演示使用离线夹具实际调用参考实现，并会自行结束。每个阶段至少有五项不同测试，覆盖边界和应拒绝的输入。预期行为由阶段测试规定，实现绝不读取留出测试文件。评分器初始化时保留你的代码，缺少运行时时如实报告执行未完成。

## 完成证据

```bash
python3 scripts/project_test.py postmortem-writer --all --path /tmp/postmortem-writer-work --strict --report /tmp/postmortem-writer-result.json
```

只有完整的学习者报告才能作为本地完成证据。参考运行不会授予证书。报告是未经签名的本地证据，本项目不认证生产就绪程度。

## 来源

[官方参考](https://sre.google/workbook/postmortem-culture/)。所有实现和练习均为原创。夹具中的数值是示例，不构成外部基准成绩或在线服务保证。

译注：JSON 字段、packet.txt 及其中的 SOURCE、IMPACT、DECISION 等凭据标记保留原值，HTML 固定文案与参数帮助已译。input line 的双语标注保留原定位测试契约。页面渲染通过不代表审批人身份已认证，也不保证多个导出文件在写入失败时整体原子提交。
