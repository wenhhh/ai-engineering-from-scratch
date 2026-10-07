# 沙箱策略规划器（Sandbox Policy Planner）

构建沙箱证据规划器，将所需能力映射到运行时探针的观察结果。

选择运行时之前，先将威胁需求写成布尔值。这里 network=true 表示要求禁用网络，host_kernel=true 表示要求独立内核。这两个名称都不表示授予访问权限。

## 从学习者工作区开始

[面向 AI 的 Docker](../../phases/00-setup-and-tooling/07-docker-for-ai/docs/en.md)、[安全与密钥审计](../../phases/17-infrastructure-and-production/25-security-secrets-audit/docs/en.md)。语言基础：[Rust 所有权与 Result](https://doc.rust-lang.org/book/ch04-00-understanding-ownership.html)。

安装 Rust（`rustc`）和 Python 3.10+。核心使用 Rust 标准库，Python 适配器在私有临时目录中编译。

```bash
python3 scripts/project_test.py sandbox-ladder --init learning-artifacts/sandbox-ladder
python3 scripts/project_test.py sandbox-ladder --stage 1 --path learning-artifacts/sandbox-ladder
```

## 构建路线

1. [解析能力需求](stages/01-parse-the-capability-request/docs/en.md)
2. [定义控制能力的模拟配置](stages/02-define-modeled-control-profiles/docs/en.md)
3. [选择成本最低且足够的配置](stages/03-select-the-least-costly-sufficient-profile/docs/en.md)
4. [报告剩余假设](stages/04-report-residual-assumptions/docs/en.md)

## 使用自己的输入运行

完成各阶段后，以下命令会用你的工作区代码运行原创 Orchard 示例。将样本路径替换为你自己的文件。

```bash
python3 learning-artifacts/sandbox-ladder/cli.py untrusted=true,secrets=true,network=true,host_kernel=false --budget 3
```

先查看完整参考实现时，将同一命令中的 `learning-artifacts/sandbox-ladder` 替换为 `projects/sandbox-ladder/solution`。JSON 结果使用 `schema_version: 1`；路径与参数示例明确列出，便于其他工具消费。

## 集成边界

默认输出是策略模拟。--docker-image 预览调用命令；--execute 需要 Docker 和本地已经存在的镜像。只检查根目录写入与默认路由两个探针。适配器从未实现或验证微型虚拟机边界。

```bash
python3 scripts/project_test.py sandbox-ladder --all --solution --strict
python3 scripts/project_test.py sandbox-ladder --all --path learning-artifacts/sandbox-ladder --strict
```

第一条命令检查参考实现，第二条检查你的实现。公开示例与测试属于回归证据，不构成生产认证，也不是未公开的基准测试。

## 权威参考资料

- [官方参考](https://docs.docker.com/engine/security/)

译注：配置名、Docker 参数和探针脚本保留原值。图中的探针开关为手动输入，不是实测结果；本项目的微型虚拟机配置只有策略数据。只有明确执行 Docker 才可能得到实际探针输出，且两项通过也不能证明完整隔离安全。
