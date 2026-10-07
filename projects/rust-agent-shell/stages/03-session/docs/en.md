# 跟踪预算与终止状态

**第 3 阶段，共 4 阶段。** Rust。预计约 2 小时。

将工具包装在会话中，由会话持有根目录、请求计数和关闭状态。每个送入解析的请求，包括被拒绝的命令，都消耗一个动作名额。Quit 会进入终止状态。超出预算的请求发出终止错误。区分解析拒绝和执行错误，便于调用方修正命令，而不将其与缺失文件混淆。

```figure
pj-rust-agent-shell-3
```

译注：图表边界：这是单步语法与预算示意，不访问文件、不解析符号链接，也没有持久会话。它对 read 缺参或 pwd 附参的判断与真实 Rust 解析器不同；错误枚举和样本命令保留英文，实际边界以程序测试为准。

## Orchard 示例推演

编码前，阅读 [Rust 所有权与 Result](https://doc.rust-lang.org/book/ch04-00-understanding-ownership.html) 和 [数据管理](../../../../../phases/00-setup-and-tooling/09-data-management/docs/en.md)。先完成[第 2 阶段](../../02-filesystem/docs/en.md)。

会话持有请求预算和终止状态。无效请求也消耗一次尝试。通过可执行程序参数和适配器 --limit 暴露预算，让调用方能够判断工作的上限。

```text
limit=2
request 1: list -> step 1
request 2: rejected grammar -> step 2
request 3 -> terminal budget_exhausted
```

## 构建并检查

每收到一个请求，在分派前增加一次计数。会话关闭后，不得继续读取文件。

在学习者工作区中实现本阶段。随附的 CLI 辅助代码是适配器，会导入你的函数，不会用参考解答替代它们。

```bash
python3 scripts/project_test.py rust-agent-shell --stage 3 --path learning-artifacts/rust-agent-shell
```

先预测上面的中间状态，再运行阶段测试。全新的桩代码应当失败；参考实现通过测试不代表你的学习者工作区已完成。

## 接着探究

若输出在某个请求 ID 收到事件前就结束，客户端应怎样处理？
