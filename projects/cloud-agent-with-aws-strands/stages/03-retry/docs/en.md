# 重试暂时失败的读取并复用已完成请求（Retry transient reads and reuse completed requests）

第 3 阶段，共 4 阶段。开始前阅读[项目前置要求](../../../README.md)，本阶段延续前面的契约。

## 新增能力（What changes）

仅重试暂时性的超时失败，并按规范化动作标识缓存成功读取。权限失败应立即向上传播，不能按暂时故障反复重试。这里的缓存仅在单次请求内有效；真实云状态会变化，长期缓存需要明确的 TTL 或版本，不能静默复用旧数据。

## 推演一个具体案例（Work through one concrete case）

计划两次读取 checkout 指标。首次调用超时一次后成功，第二次逻辑读取复用缓存值。最终 provider 调用数为 2，已完成逻辑读取数为 2，缓存命中数为 1。

```figure
pj-cloud-agent-with-aws-strands-3
```

修改实验输入，先计算预期结果，再查看指标。图表根据这些输入计算；项目完成证据仍来自下方的实现测试。 译注：原图在资源超出范围时仍可能显示缓存命中；这是保留的上游简化模型问题，不代表实际发生了调用或复用。

## 实现契约（Implement the contract）

实现 `retry.py`: `request_key`, `cached_read`。这是 AWS Strands 云端智能体的第 3 阶段，接收明确输入，并返回可由后续阶段使用、可检查的结果。

参考[公开 API 契约](../../../API.md)和起始签名。核心函数负责返回值，文件读取、参数解析和展示交给提供的驱动。

只按规范化的 operation、resource 二元组缓存成功结果。权限错误直接离开超时重试循环，重复请求不会获得额外权限。

## 验证与检查（Verify and inspect）

从仓库根目录用 `python3 scripts/project_test.py cloud-agent-with-aws-strands --init learning-artifacts/cloud-agent-with-aws-strands` 初始化一次，然后进行累计评分：

```bash
python3 scripts/project_test.py cloud-agent-with-aws-strands --stage 3 --path learning-artifacts/cloud-agent-with-aws-strands --strict
```

在你实现契约之前，新工作区的测试应当失败。完成全部阶段后，使用提供的样本运行自己的实际交付物：

```bash
cd learning-artifacts/cloud-agent-with-aws-strands
python3 cli.py samples/input.json --output incident.json
```

## 检查失败边界（Investigate the failure boundary）

将第二个资源改为允许范围内的另一服务。即使操作相同，也必须得到不同缓存键。




## 参考资料（References）

[参考资料 1](https://strandsagents.com/docs/user-guide/concepts/model-providers/custom_model_provider/)
