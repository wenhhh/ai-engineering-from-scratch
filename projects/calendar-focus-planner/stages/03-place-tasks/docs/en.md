# 按优先级安排任务并如实报告未排入项

**Type:** Build
**Language:** TypeScript
**Stage:** 3 / 4
**Time:** 完成链接中的先修内容后，约 2 小时
**Prerequisites:** 上一阶段，以及[开发环境](../../../../../phases/00-setup-and-tooling/01-dev-environment/docs/en.md)、[数据管理](../../../../../phases/00-setup-and-tooling/09-data-management/docs/en.md)。

## 构建目标（What you build）

本阶段构建日历专注规划器的一部分：找出实际空闲时间，按优先级安排任务，并说明哪些任务无法排入。

公共契约为 `schedule(tasks, events, window, bufferMinutes=0)`。CLI 和样本文件已放入工作区，在 `main.ts` 中实现业务函数。保持签名不变，让其他应用可调用同一接口边界。

## 推演机制（Work through the mechanism）

按优先级降序排列任务，同优先级使用稳定 ID 决定顺序。将每个任务放入最早且足够长的空档，再将该空档起点向后移动。任务保持连续，拆分任务属于另一种策略，需要另行明确契约。

这是确定性启发式策略，不保证最优排程。即使多个碎片空档的总和足够，一个低优先级长任务也可能无法安排。应带原因报告该结果，不虚构空闲时间，也不擅自缩短任务。

| 任务 | 分钟 | 样本中的结果 |
|---|---|---|
| 编写课程示例 | 75 | 11:10–12:25 |
| 审阅作业 | 45 | 14:40–15:25 |
| 录制讲解 | 90 | 15:25–16:55 |
| 设计评估 | 120 | 无足够长的连续空档 |

## 先预测再运行（Predict before running）

将 120 分钟任务的优先级升到五，预测哪些其他任务将无法安排。

```figure
pj-calendar-focus-planner-3
```

改变交互图输入并检查计算值，将一个发生变化的结果对应到实现中的某一行。交互图用于解释机制，不能替代真实程序。

## 构建与验证（Build and verify）

从仓库根目录执行一次初始化，复制公共类型、函数桩、实际命令包装器和原创样本输入。由于业务函数尚未实现，新工作区的第一阶段测试应失败。

```bash
python3 scripts/project_test.py calendar-focus-planner --init my-calendar-focus-planner
python3 scripts/project_test.py calendar-focus-planner --stage 3 --path my-calendar-focus-planner --strict
```

使用标准库实现契约，先手工推演示例。保持调用方输入不变，对格式错误的数据给出可操作的错误提示。测试只导入你的工作区，不导入参考解答。

## 逐层提示（Hint ladder）

1. 排序前先复制任务。
2. 要求单个空档容纳任务完整时长。
3. 保留每个未排入任务及其原始请求时长。

## 预期观察结果（What you should see）

完成本阶段后，评分器应报告第 1 至 3 阶段的实际测试通过。完成全部四个阶段后，用提供的样本运行工具，再替换为自己的输入：

```bash
cd my-calendar-focus-planner
node cli.ts sample.ics tasks.json 2026-10-14 output 10
```

最终交付可检查的 HTML 计划、机器可读排程和供手工导入的通用 ICS 日程建议。打开 HTML 并检查配套 JSON，不能只凭退出码判断。修改一项输入，准确说明哪项结果必须随之改变。

## 扩展练习（Extend it）

构造一组自己的任务，对比最早可容纳策略与最短任务优先策略，并解释取舍。

范围：解析器支持明确的 UTC 事件和全天日期。重复规则与命名时区须先由日历导出工具展开，解析器遇到它们会拒绝处理。CLI 规划 UTC 09:00–17:00 的一天，只创建本地建议，不修改账号日历。

一手资料：[iCalendar RFC 5545](https://www.rfc-editor.org/rfc/rfc5545)。实现和练习数据均为原创教学示例。
