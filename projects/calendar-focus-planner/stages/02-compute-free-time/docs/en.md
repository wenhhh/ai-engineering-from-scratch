# 合并重叠区间后寻找空闲时段

**Type:** Build
**Language:** TypeScript
**Stage:** 2 / 4
**Time:** 完成链接中的先修内容后，约 2 小时
**Prerequisites:** 上一阶段，以及[开发环境](../../../../../phases/00-setup-and-tooling/01-dev-environment/docs/en.md)、[数据管理](../../../../../phases/00-setup-and-tooling/09-data-management/docs/en.md)。

## 构建目标（What you build）

本阶段构建日历专注规划器的一部分：找出实际空闲时间，按优先级安排任务，并说明哪些任务无法排入。

公共契约为 `availableSlots(events, window, bufferMinutes=0)`。CLI 和样本文件已放入工作区，在 `main.ts` 中实现业务函数。保持签名不变，让其他应用可调用同一接口边界。

## 推演机制（Work through the mechanism）

重叠会议的占用时间不能直接按时长相加。为每个事件向两端扩展指定缓冲，裁剪到工作窗口，再按开始时间排序并合并重叠或相邻区间。其并集在工作窗口内的补集就是实际空闲时段。

游标从工作窗口起点出发。遍历忙碌区间时，只有区间起点晚于游标才输出空档，然后将游标移到该区间终点。最后一个事件后，输出剩余尾段。该方法容易解释，也能处理嵌套会议而不重复计时。

| 加入 10 分钟缓冲后的输入 | 合并后的占用区间 |
|---|---|
| 09:20–10:25 and 09:50–11:10 | 09:20–11:10 |
| 12:50–14:40 | 12:50–14:40 |
| 工作窗口 | 09:00–17:00 |

## 先预测再运行（Predict before running）

手工计算每个空档，核对忙碌总时长与空闲总时长之和等于工作窗口长度。

```figure
pj-calendar-focus-planner-2
```

改变交互图输入并检查计算值，将一个发生变化的结果对应到实现中的某一行。交互图用于解释机制，不能替代真实程序。

## 构建与验证（Build and verify）

从仓库根目录执行一次初始化，复制公共类型、函数桩、实际命令包装器和原创样本输入。由于业务函数尚未实现，新工作区的第一阶段测试应失败。

```bash
python3 scripts/project_test.py calendar-focus-planner --init my-calendar-focus-planner
python3 scripts/project_test.py calendar-focus-planner --stage 2 --path my-calendar-focus-planner --strict
```

使用标准库实现契约，先手工推演示例。保持调用方输入不变，对格式错误的数据给出可操作的错误提示。测试只导入你的工作区，不导入参考解答。

## 逐层提示（Hint ladder）

1. 先裁剪，再丢弃窗口外的区间。
2. 将每个起点与上一个合并区间的终点比较。
3. 返回新对象，保持调用方事件不变。

## 预期观察结果（What you should see）

完成本阶段后，评分器应报告第 1 至 2 阶段的实际测试通过。完成全部四个阶段后，用提供的样本运行工具，再替换为自己的输入：

```bash
cd my-calendar-focus-planner
node cli.ts sample.ics tasks.json 2026-10-14 output 10
```

最终交付可检查的 HTML 计划、机器可读排程和供手工导入的通用 ICS 日程建议。打开 HTML 并检查配套 JSON，不能只凭退出码判断。修改一项输入，准确说明哪项结果必须随之改变。

## 扩展练习（Extend it）

改变缓冲长度，找出一个 75 分钟任务刚好无法排入的临界点。

范围：解析器支持明确的 UTC 事件和全天日期。重复规则与命名时区须先由日历导出工具展开，解析器遇到它们会拒绝处理。CLI 规划 UTC 09:00–17:00 的一天，只创建本地建议，不修改账号日历。

一手资料：[iCalendar RFC 5545](https://www.rfc-editor.org/rfc/rfc5545)。实现和练习数据均为原创教学示例。
