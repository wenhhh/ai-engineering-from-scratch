# 公开实现契约（Public implementation contract）

导入 execute_jobs，并提供 invoke(job) -> (value, actual_cost) 回调。只有费率和用量凭据都已换算为相应单位时，才能使用 unit=nano_dollars。execute_jobs 位于配套 cli.py 中；它调用你的预算预留与结算实现。

费用来自调用方提供的整数用量凭据。基于单调时钟的截止时间控制是否派发下一任务，无法中断正在执行的同步回调。账本仅存在于单个进程的内存中。

回放（`schedule`）和执行（`execute_jobs`）都通过 `events[].status` 输出状态。回放结果为 `completed` 或 `rejected`；拒绝事件的 `reason` 为 `deadline` 或 `budget exceeded`。实际用量未知或超过预留额度时，执行模式还可能返回 `needs_reconciliation`。两种模式各自的成本与计时字段应按各自含义解读。

### main.py

```python
def nonnegative(value)
def estimate(input_tokens, output_limit, input_rate, output_rate)
def ledger(limit)
def reserve(state, request_id, amount)
def settle(state, request_id, actual)
def schedule(jobs, limit, deadline_ms)
```

阶段测试规定了正常结果和应拒绝的输入。不得将学习者实现的导入替换为参考实现。最后一个阶段还会用配套输入驱动程序检查你逐步完成的累计实现。
