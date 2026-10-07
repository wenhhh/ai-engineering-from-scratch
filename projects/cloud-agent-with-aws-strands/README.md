# AWS Strands 云端智能体（Cloud Agent With AWS Strands）

在明确允许范围内读取云端事故信息，并记录每次缓存命中和重试的执行情况。

需要 Python 3.10 或更新版本，并熟悉 JSON、集合、异常、回调和环境配置。可选 SDK 对照使用 requirements-framework.txt。核心实现仅依赖标准库。评分器检查你选择的工作区，不会从参考解答补齐缺失行为。

## 构建并运行自己的版本（Build and run your version）

从仓库根目录执行一次初始化。新起始代码尚未实现，测试应当失败。

```bash
python3 scripts/project_test.py cloud-agent-with-aws-strands --init learning-artifacts/cloud-agent-with-aws-strands
python3 scripts/project_test.py cloud-agent-with-aws-strands --stage 1 --path learning-artifacts/cloud-agent-with-aws-strands --strict
```

逐阶段完成实现，然后运行累计评分器和提供的输入驱动：

```bash
python3 scripts/project_test.py cloud-agent-with-aws-strands --all --path learning-artifacts/cloud-agent-with-aws-strands --strict
cd learning-artifacts/cloud-agent-with-aws-strands
python3 cli.py samples/input.json --output incident.json
```

驱动和离线样本属于已提供的脚手架，导入会指向你的实现。公开输入类型和函数签名见起始代码及 [API 契约](API.md)。

## 单独检查参考实现（Inspect the reference separately）

从仓库根目录运行：

```bash
python3 scripts/project_test.py cloud-agent-with-aws-strands --all --solution --strict
cd projects/cloud-agent-with-aws-strands/solution
python3 cli.py samples/input.json --output incident.json
```

## 观察变化（Observe the change）

计划中的三次读取保留三条结果，但只进行两次服务提供方读取，因为重复的 metrics.read 使用请求内缓存。执行记录同时展示实际调用与结果复用。

编辑样本副本后重新运行命令。将输入与输出一起保存，便于他人复现；提供的样本是专门编写的教学数据。

## 集成与限制（Integration and limits）

导入 run(payload, provider)。provider 只接收经过校验的操作和允许范围内的资源。可选 Strands 模型负责提出计划，不能绕过确定性校验器。

默认模式读取提供的记录。--mode aws 显式启用 AWS CLI 适配器，可读取 ECS 服务、CloudWatch CPU 指标和有限日志；它需要调用方提供配置、凭据及 AWS 权限。这些示例不表示已经部署或完成真实云端验证。 译注：响应大小是在子进程输出已收集后检查，不能视为流式内存硬上限；本轮未安装 Strands SDK，也未使用任何云端凭据。

## 阶段（Stages）

1. [校验允许范围内的云端检查计划](stages/01-plan/docs/en.md)
2. [在步骤和响应额度内执行读取](stages/02-executor/docs/en.md)
3. [重试暂时失败的读取并复用已完成请求](stages/03-retry/docs/en.md)
4. [用本地模型驱动真实 Strands 循环](stages/04-strands-adapter/docs/en.md)

## 可选框架集成（Optional framework integration）

基础阶段仅使用标准库。框架适配器已提供实现，并有独立冒烟测试：通过真实安装的 SDK 使用本地模拟模型，不联系云服务。

```bash
python3 -m venv .venv
.venv/bin/python -m pip install -r projects/cloud-agent-with-aws-strands/requirements-framework.txt
.venv/bin/python scripts/project_test.py cloud-agent-with-aws-strands --solution --optional --strict
.venv/bin/python projects/cloud-agent-with-aws-strands/solution/framework_demo.py
```

上游曾针对 `strands-agents==1.57.1` 验证该集成。涉及云服务的调用路径仍需显式启用，并使用你自己环境中的凭据；不会执行云端部署。

默认评分覆盖离线核心和输入集成。`--optional` 增加五项使用真实 SDK 与确定性本地模型的测试。SDK 缺失时报告 SKIP 并给出安装提示；缺少依赖时，`--optional --strict` 会失败。仅通过默认测试，不能声称框架集成已验证。

## 一手参考资料（Primary references）

[Strands 自定义模型提供方](https://strandsagents.com/docs/user-guide/concepts/model-providers/custom_model_provider/)介绍了可选确定性模型适配器的机制。

## 配置可选 AWS 读取器（Configure the optional AWS reader）

启用 --mode aws 前，添加以允许范围内各服务为键的 aws 对象。每项都需要 region；inventory.list 和 metrics.read 还需要 cluster，logs.read 需要 log_group。metrics.read 要求 start 和 end 为含时区的 ISO 时间戳，例如 2026-01-01T00:00:00Z 与 2026-01-01T01:00:00Z。logs.read 也接受这一对可选参数，并将其转为纪元毫秒数，传给 --start-time 和 --end-time。两者都省略时保持不限定窗口的日志读取；只提供其中一个会报错。两种操作均拒绝无效、缺少时区、早于纪元或结束不晚于开始的窗口。适配器调用 ECS describe-services、读取 CPUUtilization 的 CloudWatch get-metric-statistics，以及 limit 为 20 的 Logs filter-log-events。

凭据来自 AWS CLI 环境或已配置的凭据链。范围校验不能替代 IAM，应仅授权预期读取及对应服务资源。区域和时间窗口由调用方配置，不由模型生成可执行参数。每次 CLI 调用有十秒超时，只有超时错误会重试。
