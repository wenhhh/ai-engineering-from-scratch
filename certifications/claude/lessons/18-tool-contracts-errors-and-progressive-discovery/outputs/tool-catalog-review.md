# 工具目录评审：客服证据（Tool Catalog Review: Support Evidence）

## 目录边界（Catalog Boundary） <!-- ## Catalog Boundary -->

政策角色只获得有效政策搜索和来源查询，不获得账户工具或写入能力。每个工具都有感知租户的执行作用域（execution scope）。

## 工具契约（Tool Contracts） <!-- ## Tool Contracts -->

`search_active_policy`：适用条件（use when）是答案受客服政策约束；不适用于（do not use）账户事实或公开研究。`read_assigned_account`：在经过身份验证的案例需要账户事实时使用；不用于政策或其他租户。

## 错误矩阵（Error Matrix） <!-- ## Error Matrix -->

验证（validation）失败仅在修改输入后才可重试。授权（authorization）失败在权限或审批改变之前不可重试（non-retryable）。依赖超时可重试一次，并保留所有部分结果（partial result）与追踪 ID。

## 渐进式发现（Progressive Discovery） <!-- ## Progressive Discovery -->

初始接口提供搜索能力，且只搜索该角色获准访问的能力名称。专用定义仅在限定作用域的发现之后加载；不暴露受限名称。

## 授权（Authorization） <!-- ## Authorization -->

发现绝不授予执行权限。每次调用，服务都检查主体、租户、当前权限范围、对象归属和绑定审批。

## 选择测试夹具（Selection Fixtures） <!-- ## Selection Fixtures -->

十二个测试夹具覆盖政策与账户问题的区分、公开研究、无需工具的答案，以及验证、授权、冲突、超时和部分结果。
