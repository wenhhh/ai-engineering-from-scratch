# 会话恢复包：客户端迁移（Session Recovery Packet: Client Migration）

## 目标与范围（Goal and Scope） <!-- ## Goal and Scope -->

迁移 HTTP 客户端，不改变公开行为。范围为 `src/client.py` 和 `tests/test_client.py`；禁止部署和外部写入。

## 持久化状态（Durable State） <!-- ## Durable State -->

清单（manifest）`migration-v2` 记录当前分支、依赖版本、任务状态、文件哈希（hash）`4cc0-demo`、12 项通过的测试、一个被阻塞的超时用例以及交付物 ID。对话历史不是权威依据。

## 重新验证（Revalidation） <!-- ## Revalidation -->

下次编辑前，重新验证（revalidate）分支、依赖行为、文件哈希、针对性测试和当前审批。依赖变化会使旧计划失效。

## 副作用对账（Side Effect Reconciliation） <!-- ## Side Effect Reconciliation -->

工具调用 `write-018` 的结果不明（unknown outcome）。重试前比较持久化的哈希。复用幂等键（idempotency key）`migration-client-v2-write-018`；在对账完成之前，绝不使用新的写入标识。

## 上下文预算（Context Budget） <!-- ## Context Budget -->

20% 用于目标与约束，20% 用于当前清单状态，45% 用于与决策相关的证据，15% 用于输出契约。原始日志通过交付物引用按需访问。

## 独立评审（Independent Review） <!-- ## Independent Review -->

隔离的（isolated）评审者收到差异、需求、测试和评分标准。它返回 complete、partial 或 blocked 状态及其证据，不接收实施过程的对话记录。
