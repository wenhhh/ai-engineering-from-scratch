# 公开实现契约（Public implementation contract）

导入 run(payload, provider)。provider 只接收经过校验的操作和允许范围内的资源。可选 Strands 模型负责提出计划，不能绕过确定性校验器。

默认模式读取提供的记录。--mode aws 显式启用 AWS CLI 适配器，可读取 ECS 服务、CloudWatch CPU 指标和有限日志；它需要调用方提供配置、凭据及 AWS 权限。这些示例不表示已经部署或完成真实云端验证。

### executor.py

```python
def execute(plan, provider, max_steps=5, max_chars=4000)
```

### plan.py

```python
def validate_plan(raw, scope)
```

### retry.py

```python
def request_key(operation, resource)
def cached_read(operation, resource, provider, cache, retries=2)
```

### strands_adapter.py

```python
def parse_model_plan(text, scope)
def run_strands(prompt, reply)
def bedrock_agent(model_id, region)
```

阶段测试规定正常结果和必须拒绝的输入。不要将学习者实现的导入替换为参考实现导入。最后一个阶段还会用提供的输入驱动验证你的累计实现。
