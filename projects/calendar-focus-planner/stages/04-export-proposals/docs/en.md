# 导出可审阅的日历建议

**Type:** Build
**Language:** TypeScript
**Stage:** 4 / 4
**Time:** 完成链接中的先修内容后，约 2 小时
**Prerequisites:** 上一阶段，以及[开发环境](../../../../../phases/00-setup-and-tooling/01-dev-environment/docs/en.md)、[数据管理](../../../../../phases/00-setup-and-tooling/09-data-management/docs/en.md)。

## 构建目标（What you build）

本阶段构建日历专注规划器的一部分：找出实际空闲时间，按优先级安排任务，并说明哪些任务无法排入。

公共契约为 `exportCalendar(plan, createdAt); renderPlan(plan)`。CLI 和样本文件已放入工作区，在 `main.ts` 中实现业务函数。保持签名不变，让其他应用可调用同一接口边界。

## 推演机制（Work through the mechanism）

导出的专注时段只是一项建议。根据任务标识和排定起点生成稳定标识，提供明确的 UTC 起止时间及调用方指定的创建时间戳。对文本属性转义，并在不拆开 UTF-8 字符的前提下折叠长行。

HTML 用自然语言解释同一排程，包括未排入的工作；JSON 供其他程序检查决策。通过手工导入 ICS，最终日历修改仍由学习者控制，本项目也无须处理账号凭据。

| 输出 | 用途 |
|---|---|
| focus.ics | 可移植的事件建议 |
| plan.json | 可检查的排程结果 |
| plan.html | 人工审阅及未排入任务 |

## 先预测再运行（Predict before running）

使用含逗号和换行的任务标题。导出后重新解析，检查标题和时间区间是否完整保留。

```figure
pj-calendar-focus-planner-4
```

改变交互图输入并检查计算值，将一个发生变化的结果对应到实现中的某一行。交互图用于解释机制，不能替代真实程序。

## 构建与验证（Build and verify）

从仓库根目录执行一次初始化，复制公共类型、函数桩、实际命令包装器和原创样本输入。由于业务函数尚未实现，新工作区的第一阶段测试应失败。

```bash
python3 scripts/project_test.py calendar-focus-planner --init my-calendar-focus-planner
python3 scripts/project_test.py calendar-focus-planner --stage 4 --path my-calendar-focus-planner --strict
```

使用标准库实现契约，先手工推演示例。保持调用方输入不变，对格式错误的数据给出可操作的错误提示。测试只导入你的工作区，不导入参考解答。

## 逐层提示（Hint ladder）

1. 折叠行之前先转义属性值。
2. 按 UTF-8 字节数决定折行位置，不按 JavaScript 字符串长度。
3. 测试中使用固定创建时间戳。

## 预期观察结果（What you should see）

完成本阶段后，评分器应报告第 1 至 4 阶段的实际测试通过。完成全部四个阶段后，用提供的样本运行工具，再替换为自己的输入：

```bash
cd my-calendar-focus-planner
node cli.ts sample.ics tasks.json 2026-10-14 output 10
```

最终交付可检查的 HTML 计划、机器可读排程和供手工导入的通用 ICS 日程建议。打开 HTML 并检查配套 JSON，不能只凭退出码判断。修改一项输入，准确说明哪项结果必须随之改变。

## 扩展练习（Extend it）

单独构建适配器，将外部规划器的建议转为通过校验的 Task 记录，保留本调度器作为确定性边界。

范围：解析器支持明确的 UTC 事件和全天日期。重复规则与命名时区须先由日历导出工具展开，解析器遇到它们会拒绝处理。CLI 规划 UTC 09:00–17:00 的一天，只创建本地建议，不修改账号日历。

一手资料：[iCalendar RFC 5545](https://www.rfc-editor.org/rfc/rfc5545)。实现和练习数据均为原创教学示例。
