# 在步骤和响应额度内执行读取（Execute reads within step and response budgets）

第 2 阶段，共 4 阶段。开始前阅读[项目前置要求](../../../README.md)，本阶段延续前面的契约。

## 新增能力（What changes）

操作开始前检查步骤额度，保留结果前计算序列化输出的占用。输出限制无法撤销调用成本，但能防止大结果挤满后续上下文。保留部分结果和明确终态，便于诊断因额度而停止的情况。

## 推演一个具体案例（Work through one concrete case）

max_steps=2 时，三动作计划最多保留两条结果。max_chars=1 时，可能先执行首次 provider 调用，再发现结果过大，最终不保留输出。

```figure
pj-cloud-agent-with-aws-strands-2
```

修改实验输入，先计算预期结果，再查看指标。图表根据这些输入计算；项目完成证据仍来自下方的实现测试。 译注：原图在资源超出范围时仍可能显示缓存命中；这是保留的上游简化模型问题，不代表实际发生了调用或复用。

## 实现契约（Implement the contract）

实现 `executor.py`: `execute`。这是 AWS Strands 云端智能体的第 2 阶段，接收明确输入，并返回可由后续阶段使用、可检查的结果。

参考[公开 API 契约](../../../API.md)和起始签名。核心函数负责返回值，文件读取、参数解析和展示交给提供的驱动。

步骤额度限制派发次数，序列化输出额度限制保留的上下文。在结果中区分这两种保证，额度耗尽时保留已完成的记录。

## 验证与检查（Verify and inspect）

从仓库根目录用 `python3 scripts/project_test.py cloud-agent-with-aws-strands --init learning-artifacts/cloud-agent-with-aws-strands` 初始化一次，然后进行累计评分：

```bash
python3 scripts/project_test.py cloud-agent-with-aws-strands --stage 2 --path learning-artifacts/cloud-agent-with-aws-strands --strict
```

在你实现契约之前，新工作区的测试应当失败。完成全部阶段后，使用提供的样本运行自己的实际交付物：

```bash
cd learning-artifacts/cloud-agent-with-aws-strands
python3 cli.py samples/input.json --output incident.json
```

## 检查失败边界（Investigate the failure boundary）

让首次读取返回长度为 1000 的字符串，说明为什么限制 provider 响应的字节量，仍是适配器需要单独承担的责任。




## 参考资料（References）

[参考资料 1](https://strandsagents.com/docs/user-guide/concepts/model-providers/custom_model_provider/)
