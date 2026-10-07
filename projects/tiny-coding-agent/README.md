# 微型编程智能体（Tiny Coding Agent）

展示补丁与测试证据轨迹，并拒绝无依据成功声明的修复智能体。

Orchard 购物篮修复在可信 Python 工作区的可丢弃副本中运行。打开文件前，将每个请求路径解析到该根目录之下。路径看起来位于本地，符号链接却可能将其重定向到工作区之外。

## 从学习者工作区开始

[智能体循环](../../phases/14-agent-engineering/01-the-agent-loop/docs/en.md)、[数据管理](../../phases/00-setup-and-tooling/09-data-management/docs/en.md)。语言基础：[Python 数据结构](https://docs.python.org/3/tutorial/datastructures.html)。

使用 Python 3.10+ 和标准库。项目使用文件锁或进程组监督时，需要 POSIX。

```bash
python3 scripts/project_test.py tiny-coding-agent --init learning-artifacts/tiny-coding-agent
python3 scripts/project_test.py tiny-coding-agent --stage 1 --path learning-artifacts/tiny-coding-agent
```

## 构建路线

1. [将文件工具限制在工作区内](stages/01-confine-paths/docs/en.md)
2. [按前置条件应用精确补丁](stages/02-apply-exact-patches/docs/en.md)
3. [通过唯一允许的命令运行真实测试](stages/03-run-real-tests/docs/en.md)
4. [根据证据或预算停止编程循环](stages/04-bound-the-loop/docs/en.md)

## 使用自己的输入

完成各阶段后，以下命令在原创 Orchard 示例上运行你的工作区代码。请将样本路径替换为自己的文件。

```bash
python3 learning-artifacts/tiny-coding-agent/cli.py projects/tiny-coding-agent/examples/workspace projects/tiny-coding-agent/examples/proposals.json --copy-to basket-repair --out repair-trace.json
```

若想先检查完整参考实现，在同一命令中将 `learning-artifacts/tiny-coding-agent` 替换为 `projects/tiny-coding-agent/solution`。JSON 结果使用 `schema_version: 1`；路径和参数示例均已明确，便于其他工具读取。

## 集成边界

CLI 将可信 Python 工作区复制到新目标，再把其中测试作为本地代码运行。随附提案规划器根据观察到的失败选择预先编写的修复，不会创造补丁。POSIX 进程组超时会停止子孙进程，但内存和输出配额需要操作系统级运行器。

```bash
python3 scripts/project_test.py tiny-coding-agent --all --solution --strict
python3 scripts/project_test.py tiny-coding-agent --all --path learning-artifacts/tiny-coding-agent --strict
```

第一条命令检查参考实现，第二条检查你的实现。公开示例与测试属于回归证据，不是生产认证或未见过的基准。

## 权威参考资料

- [机制与 API 参考](https://docs.python.org/3/library/subprocess.html)

译注：展示范围：错误标记、补丁内容和测试输出参与规划器匹配，保留原值。运行测试会执行目标仓库中的 Python；子进程超时控制不是恶意代码隔离，输出与内存也没有硬配额。
