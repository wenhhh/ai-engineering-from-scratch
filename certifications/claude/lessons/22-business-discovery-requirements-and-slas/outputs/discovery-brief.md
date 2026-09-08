# 调研简报：账单回复试点（Discovery Brief: Billing Reply Pilot）

## 结果（Outcome） <!-- ## Outcome -->

负责人（owner）：客服运营。符合政策的首次响应中位时间基线（baseline）为 11 分钟。目标（target）是在六周试点期间降到 3 分钟以下，同时让无依据退款执行保持为零。

## 需求（Requirements） <!-- ## Requirements -->

根据有效政策和分配账户事实起草响应。质量要求有有效政策支持，性能要求 P95 低于 8 秒。安全约束：退款执行仍在工作流之外。

## 数据与权限（Data and Authority） <!-- ## Data and Authority -->

最小化内部工单和政策数据。客服可读取分配案例；只有获得财务授权的人才能批准退款。密钥和无关客户记录不进入上下文。

## 衡量指标（Measures） <!-- ## Measures -->

SLI：受有效政策支持的受评草稿比例。SLO：七天内至少 98%。同时测量 P95、每条获接受草稿成本、评审分钟数、过时来源率和不安全操作数。

## 假设（Assumptions） <!-- ## Assumptions -->

估计（estimate）：评审时间从四分钟降到两分钟；负责人是客服质量团队，证据是试点计时，决策日期为第二周。约束（constraint）：不自动发送任何客户消息。偏好：简洁的响应格式。

## 非目标（Non-Goals） <!-- ## Non-Goals -->

首版非目标包括自主发送（autonomous sending）、退款、账户关闭、员工排名以及英语之外的语言。
