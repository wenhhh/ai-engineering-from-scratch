# 用本地模型驱动真实 Strands 循环（Drive the actual Strands loop with a local model）

第 4 阶段，共 4 阶段。开始前阅读[项目前置要求](../../../README.md)，本阶段延续前面的契约。

## 新增能力（What changes）

真实 Strands Agent 消费注入的 Model 子类产生的流式事件，以便在不使用凭据、不调用云服务的情况下检验框架循环。模型仍只提出计划，其结果需要交给前面的校验器解析并检查范围。独立的 Bedrock 构造函数必须显式调用，离线演示和测试不会调用它。

## 推演一个具体案例（Work through one concrete case）

可选 Strands Agent 通过真实的流式 Model 接口输出 JSON 计划。该候选计划随后进入与 cli.py 相同的范围校验器、重试包装器和有额度限制的执行器。

```figure
pj-cloud-agent-with-aws-strands-4
```

修改实验输入，先计算预期结果，再查看指标。图表根据这些输入计算；项目完成证据仍来自下方的实现测试。 译注：原图在资源超出范围时仍可能显示缓存命中；这是保留的上游简化模型问题，不代表实际发生了调用或复用。

## 实现契约（Implement the contract）

实现 `strands_adapter.py`: `parse_model_plan`, `run_strands`, `bedrock_agent`。这是 AWS Strands 云端智能体的第 4 阶段，接收明确输入，并返回可由后续阶段使用、可检查的结果。

参考[公开 API 契约](../../../API.md)和起始签名。核心函数负责返回值，文件读取、参数解析和展示交给提供的驱动。

明确区分三种模式：纯离线核心、已安装 SDK 配合本地模型的对照，以及显式启用的 AWS 读取。真实 SDK 通过模拟模型测试，是有用的集成证据，但不能证明 IAM 配置或 Bedrock 可用。

## 验证与检查（Verify and inspect）

从仓库根目录用 `python3 scripts/project_test.py cloud-agent-with-aws-strands --init learning-artifacts/cloud-agent-with-aws-strands` 初始化一次，然后进行累计评分：

```bash
python3 scripts/project_test.py cloud-agent-with-aws-strands --stage 4 --path learning-artifacts/cloud-agent-with-aws-strands --strict
```

在你实现契约之前，新工作区的测试应当失败。完成全部阶段后，使用提供的样本运行自己的实际交付物：

```bash
cd learning-artifacts/cloud-agent-with-aws-strands
python3 cli.py samples/input.json --output incident.json
```

## 检查失败边界（Investigate the failure boundary）

通过 cli.py 运行样本，检查重复指标读取的 cached=true。随后在安装固定 SDK 的环境中运行 --optional --strict，验证框架事件，不发送云请求。

默认模式读取提供的记录。--mode aws 显式启用 AWS CLI 适配器，可读取 ECS 服务、CloudWatch CPU 指标和有限日志；它需要调用方提供配置、凭据及 AWS 权限。这些示例不表示已经部署或完成真实云端验证。

## 验证真实框架（Verify the actual framework）

本阶段最初的五项适配器测试不导入 SDK，仅检查适配器契约。安装固定的可选依赖后，再显式加入五项真实 SDK 测试：

```bash
python3 -m venv .venv
.venv/bin/python -m pip install -r projects/cloud-agent-with-aws-strands/requirements-framework.txt
.venv/bin/python scripts/project_test.py cloud-agent-with-aws-strands --solution --optional --strict
.venv/bin/python projects/cloud-agent-with-aws-strands/solution/framework_demo.py
```

对自己的实现评分时，将 `--solution` 换为 `--path my-cloud-agent-with-aws-strands`。可选模式遇到依赖缺失会跳过，严格可选模式则失败。上游验证的 SDK 版本为 `strands-agents==1.57.1`；所有模型回复均来自本地样本。

## 参考资料（References）

[参考资料 1](https://strandsagents.com/docs/user-guide/concepts/model-providers/custom_model_provider/)
