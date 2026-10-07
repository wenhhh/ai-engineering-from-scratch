# 校验允许范围内的云端检查计划（Validate a scoped cloud inspection plan）

第 1 阶段，共 4 阶段。开始前阅读[项目前置要求](../../../README.md)，本阶段延续前面的契约。

## 新增能力（What changes）

模型提出意图，确定性校验器依据调用方范围决定能否放行。只接受明确列出的读取操作及范围内的资源 ID。拒绝未知键和过大的计划，防止模型附加的指令悄悄变成执行参数。

## 推演一个具体案例（Work through one concrete case）

checkout 事故检查计划包含 metrics.read checkout 和 logs.read checkout，两者都在 scope={checkout} 内。将 logs.read 换成 logs.delete 后，必须在首次调用 provider 前拒绝整个计划。

```figure
pj-cloud-agent-with-aws-strands-1
```

修改实验输入，先计算预期结果，再查看指标。图表根据这些输入计算；项目完成证据仍来自下方的实现测试。 译注：原图在资源超出范围时仍可能显示缓存命中；这是保留的上游简化模型问题，不代表实际发生了调用或复用。

## 实现契约（Implement the contract）

实现 `plan.py`: `validate_plan`。这是 AWS Strands 云端智能体的第 1 阶段，接收明确输入，并返回可由后续阶段使用、可检查的结果。

参考[公开 API 契约](../../../API.md)和起始签名。核心函数负责返回值，文件读取、参数解析和展示交给提供的驱动。

要求字段恰好为 operation 和 resource。模型即使添加了 shell 或 region，也不能因此将它们接受为执行参数。

## 验证与检查（Verify and inspect）

从仓库根目录用 `python3 scripts/project_test.py cloud-agent-with-aws-strands --init learning-artifacts/cloud-agent-with-aws-strands` 初始化一次，然后进行累计评分：

```bash
python3 scripts/project_test.py cloud-agent-with-aws-strands --stage 1 --path learning-artifacts/cloud-agent-with-aws-strands --strict
```

在你实现契约之前，新工作区的测试应当失败。完成全部阶段后，使用提供的样本运行自己的实际交付物：

```bash
cd learning-artifacts/cloud-agent-with-aws-strands
python3 cli.py samples/input.json --output incident.json
```

## 检查失败边界（Investigate the failure boundary）

加入范围之外的第二个资源 inventory-api。校验失败后，用于记录 provider 调用的列表应仍为空。




## 参考资料（References）

[参考资料 1](https://strandsagents.com/docs/user-guide/concepts/model-providers/custom_model_provider/)
