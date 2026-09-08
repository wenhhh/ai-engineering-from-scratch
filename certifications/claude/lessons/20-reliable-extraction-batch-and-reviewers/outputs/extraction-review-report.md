# 提取评审报告：客服政策变更（Extraction Review Report: Support Policy Changes）

## 提取契约（Extraction Contract） <!-- ## Extraction Contract -->

每条记录包含政策 ID、生效日期或 `null`、地区、操作类型、阈值或 `null`、证据片段、来源版本和评审状态。未知状态可以表示，额外字段会被拒绝。

## 批处理清单（Batch Manifest） <!-- ## Batch Manifest -->

作业 `policy-w32-review` 包含 40 个输入，通过稳定的 `custom_id`、来源版本、模式 `policy-change-2` 和预期输出关联。夹具返回乱序（shuffled）结果，其中有两项依赖失败，并保留 38 条成功记录。注明日期的规划假设为 Message Batches 成本降低 50%，服务窗口最长 24 小时（24-hour），且没有保证延迟的 SLA（no guaranteed latency）；部署时必须重新检查当前 API 文档。

## 验证层（Validation Layers） <!-- ## Validation Layers -->

语法（syntax）层解析了 40 条中的 40 条。模式（schema）层接受 40 条。语义（semantic）验证拒绝一个早于来源生效日期的截止日期。来源（provenance）验证拒绝一个证据片段中不存在的编造阈值。

## 评审发现（Reviewer Findings） <!-- ## Reviewer Findings -->

独立（independent）评审者返回稳定发现 `REV-017` 和 `REV-018`，附有字段、来源片段、原因和处置意见。它没有静默重写输出。

## 裁决（Adjudication） <!-- ## Adjudication -->

具备资格的政策负责人将无依据阈值设为 `null`，确认截止日期例外，并记录原因码。反复出现的歧义会升级处理，而不是进入下一次重试。

## 指标（Metrics） <!-- ## Metrics -->

字段精确率：0.98。裁决后证据支持率：1.00。高风险假阳性：0。评审者分歧：40 条中 2 条。每条获接受记录成本：0.014 单位。
