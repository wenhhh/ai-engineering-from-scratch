# 日历专注规划器（Calendar Focus Planner）

找出日历中的实际空闲时间，按优先级安排任务，并说明哪些任务无法排入。

最终交付可检查的 HTML 计划、机器可读的排程，以及供手工导入的通用 ICS 日程建议。

## 运行完整工具（Run the finished tool）

从仓库根目录开始：

```bash
cd projects/calendar-focus-planner/solution
node cli.ts sample.ics tasks.json 2026-10-14 output 10
```

样本为本项目专门编写。通过同一 CLI 替换为自己的输入；基础版本不需要模型密钥。启用可选外部适配器前，先查阅命令帮助。

## 亲手构建（Build it yourself）

先学习[开发环境配置](../../phases/00-setup-and-tooling/01-dev-environment/docs/en.md)与[数据管理](../../phases/00-setup-and-tooling/09-data-management/docs/en.md)。开始前，应能够读取 JSON 对象、调用函数、执行终端命令并理解测试失败信息。

```bash
python3 scripts/project_test.py calendar-focus-planner --init my-calendar-focus-planner
python3 scripts/project_test.py calendar-focus-planner --stage 1 --path my-calendar-focus-planner --strict
python3 scripts/project_test.py calendar-focus-planner --all --path my-calendar-focus-planner --strict --report completion.json
```

新工作区在函数实现之前会有意测试失败。项目已提供 CLI、输入文件和公共类型，无须复制参考入口来补齐功能。按顺序完成各阶段：

1. [读取明确的日历区间](stages/01-read-calendar/docs/en.md)
2. [合并重叠区间后寻找空闲时段](stages/02-compute-free-time/docs/en.md)
3. [按优先级安排任务并如实报告未排入项](stages/03-place-tasks/docs/en.md)
4. [导出可审阅的日历建议](stages/04-export-proposals/docs/en.md)

## 复用交付物（Reuse the artifact）

CLI 与可导入函数读取普通本地文件并返回结构化输出。与其他程序集成时，保留输入标识和明确的失败元数据。HTML 不包含第三方脚本；检查其中包含的源数据后再决定是否分享。

## 验证与范围（Verification and scope）

```bash
python3 scripts/project_test.py calendar-focus-planner --all --solution --strict
```

UTC 事件和全天事件都必须明确提供 `DTSTART` 与 `DTEND`。全天事件的 `DTEND;VALUE=DATE` 不包含结束当天：10 月 14 日的事件从 `20261014` 开始，到 `20261015` 结束。推断省略的一天结束时间，或用 `DURATION` 替代 `DTEND`，都超出本教学子集。重复规则和命名时区须先由日历导出工具展开，解析器遇到它们会拒绝处理。CLI 规划 UTC 09:00–17:00 的一天，只生成本地建议，不修改账号中的日历。

评分验证项目提供的确定性契约。学习者证书是自行声明的完成记录，不代表真实服务商验证或职业认证。把工具当作已完成集成之前，先读取 JSON 记录，并至少测试一份新输入。

一手资料：[iCalendar RFC 5545](https://www.rfc-editor.org/rfc/rfc5545)。

译注：本项目随附 CLI 的实际选项以源码为准，目前没有可直接启用的外部服务适配器。演示时间始终使用 UTC，不会按电脑所在地自动转换；导出的文件需人工审阅，不应直接视为账号日历修改。
