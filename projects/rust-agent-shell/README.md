# Rust 流式智能体执行器（Streaming Agent Shell in Rust）

构建可检查的仓库观察进程，供不同编程智能体使用。

Rust 进程只接受刻意限定的工具语言。Python 适配器接收含调用方 ID 与工具参数的 JSONL，再仅转换已知命令。任何参数都不会变成操作系统 shell 命令。

## 从学习者工作区开始

[数据管理](../../phases/00-setup-and-tooling/09-data-management/docs/en.md)、[工具结构定义设计](../../phases/13-tools-and-protocols/05-tool-schema-design/docs/en.md)。语言基础：[Rust 所有权与 Result](https://doc.rust-lang.org/book/ch04-00-understanding-ownership.html)。

安装 Rust（`rustc`）和 Python 3.10+。核心使用 Rust 标准库，Python 适配器在私有临时目录中编译。

```bash
python3 scripts/project_test.py rust-agent-shell --init learning-artifacts/rust-agent-shell
python3 scripts/project_test.py rust-agent-shell --stage 1 --path learning-artifacts/rust-agent-shell
```

## 构建路线

1. [解析刻意限定的动作语言](stages/01-grammar/docs/en.md)
2. [将文件工具限制在有界根目录内](stages/02-filesystem/docs/en.md)
3. [跟踪预算与终止状态](stages/03-session/docs/en.md)
4. [通过实际标准输入流式输出有界 JSON 事件](stages/04-streaming/docs/en.md)

## 使用自己的输入运行

完成各阶段后，以下命令会用你的工作区代码运行原创 Orchard 示例。将样本路径替换为你自己的文件。

```bash
python3 learning-artifacts/rust-agent-shell/client.py projects/rust-agent-shell/examples/workspace projects/rust-agent-shell/examples/requests.jsonl --limit 8 --out observations.jsonl
```

先查看完整参考实现时，将同一命令中的 `learning-artifacts/rust-agent-shell` 替换为 `projects/rust-agent-shell/solution`。JSON 结果使用 `schema_version: 1`；路径与参数示例明确列出，便于其他工具消费。

## 集成边界

JSONL 请求包含调用方 ID 和明确的工具参数对象。适配器将其转换为有界 Rust 标准输入语法。--limit 控制动作次数；原生文件读取仍限制为 16 KiB。应用层路径检查不提供操作系统隔离，也不能消除恶意并发替换竞态。

```bash
python3 scripts/project_test.py rust-agent-shell --all --solution --strict
python3 scripts/project_test.py rust-agent-shell --all --path learning-artifacts/rust-agent-shell --strict
```

第一条命令检查参考实现，第二条检查你的实现。公开示例与测试属于回归证据，不构成生产认证，也不是未公开的基准测试。

## 权威参考资料

- [Rust BufRead](https://doc.rust-lang.org/std/io/trait.BufRead.html)
- [Rust 文件系统路径](https://doc.rust-lang.org/std/path/struct.Path.html)
- [JSON 数据交换](https://www.rfc-editor.org/rfc/rfc8259)

译注：命令语法、事件字段、错误及测试用文件正文保留原值。Rust 原生循环逐行刷新，但随附 Python client.py 使用 capture_output，完成后才组装并输出凭据，不提供同样的逐行界面流式体验。not-executed 表示没有收到对应响应，不能据此证明动作未发生。应用层路径检查不抵御检查与使用之间的恶意替换。
