# 读取明确的日历区间

**Type:** Build
**Language:** TypeScript
**Stage:** 1 / 4
**Time:** 完成链接中的先修内容后，约 2 小时
**Prerequisites:** [开发环境](../../../../../phases/00-setup-and-tooling/01-dev-environment/docs/en.md)、[数据管理](../../../../../phases/00-setup-and-tooling/09-data-management/docs/en.md)。

## 构建目标（What you build）

本阶段构建日历专注规划器的一部分：找出实际空闲时间，按优先级安排任务，并说明哪些任务无法排入。

公共契约为 `parseCalendar(text)`。CLI 和样本文件已放入工作区，在 `main.ts` 中实现业务函数。保持签名不变，让其他应用可调用同一接口边界。

## 推演机制（Work through the mechanism）

日历文本遵循明确协议。读取属性前先展开续行，将每个事件的标识、摘要、开始和结束保持关联。拒绝缺失端点、时间倒置和重复标识；已取消或设为透明的事件不应占用专注时间。

这个有范围限制的解析器接受 UTC 时间戳，以及明确包含 `DTSTART` 和 `DTEND` 的纯日期事件。全天事件 `20261014` 需要不包含结束当天的 `DTEND;VALUE=DATE:20261015`；不要推断省略的结束时间，也不要替换为 `DURATION`。解析器拒绝重复和时区规则，因为将它们静默当作单个 UTC 事件会制造虚假的空闲时间。事件使用半开区间，结束时刻是第一个不再被占用的时刻。

| 事件 | 开始 | 结束 |
|---|---|---|
| 团队同步会 | 09:30 | 10:15 |
| 答疑时间 | 10:00 | 11:00 |
| 工作坊 | 13:00 | 14:30 |

## 先预测再运行（Predict before running）

未设置缓冲时，预测恰好 11:00 开始的任务是否与 11:00 结束的事件冲突。

```figure
pj-calendar-focus-planner-1
```

改变交互图输入并检查计算值，将一个发生变化的结果对应到实现中的某一行。交互图用于解释机制，不能替代真实程序。

## 构建与验证（Build and verify）

从仓库根目录执行一次初始化，复制公共类型、函数桩、实际命令包装器和原创样本输入。由于业务函数尚未实现，新工作区的第一阶段测试应失败。

```bash
python3 scripts/project_test.py calendar-focus-planner --init my-calendar-focus-planner
python3 scripts/project_test.py calendar-focus-planner --stage 1 --path my-calendar-focus-planner --strict
```

使用标准库实现契约，先手工推演示例。保持调用方输入不变，对格式错误的数据给出可操作的错误提示。测试只导入你的工作区，不导入参考解答。

## 逐层提示（Hint ladder）

1. 分割属性前先展开续行。
2. 转换时间戳并做往返检查以验证有效性。
3. 拒绝不支持的时间语义，不猜测其含义。

## 预期观察结果（What you should see）

完成本阶段后，评分器应报告第 1 至 1 阶段的实际测试通过。完成全部四个阶段后，用提供的样本运行工具，再替换为自己的输入：

```bash
cd my-calendar-focus-planner
node cli.ts sample.ics tasks.json 2026-10-14 output 10
```

最终交付可检查的 HTML 计划、机器可读排程和供手工导入的通用 ICS 日程建议。打开 HTML 并检查配套 JSON，不能只凭退出码判断。修改一项输入，准确说明哪项结果必须随之改变。

## 扩展练习（Extend it）

导入一个全天事件，解释为何白天不再有空闲时段。

范围：解析器支持明确的 UTC 事件和全天日期。重复规则与命名时区须先由日历导出工具展开，解析器遇到它们会拒绝处理。CLI 规划 UTC 09:00–17:00 的一天，只创建本地建议，不修改账号日历。

一手资料：[iCalendar RFC 5545](https://www.rfc-editor.org/rfc/rfc5545)。实现和练习数据均为原创教学示例。
