# 通过实际标准输入流式输出有界 JSON 事件

**第 4 阶段，共 4 阶段。** Rust。预计约 2 小时。

使用 BufRead 增量读取输入，在分配可能无限增长的字符串之前限制每行大小。EOF 时处理最后一行，即使它没有换行终止符；同时接受 CRLF。在 JSON 输出中转义控制字符，每个事件后立即刷新，让父智能体及时看到结果。演示会编译真实二进制，再向同一循环输入确定性脚本。交互模式持续读取用户终端，直到 quit、EOF 或动作预算耗尽。

```figure
pj-rust-agent-shell-4
```

译注：图表边界：这是单步语法与预算示意，不访问文件、不解析符号链接，也没有持久会话。它对 read 缺参或 pwd 附参的判断与真实 Rust 解析器不同；错误枚举和样本命令保留英文，实际边界以程序测试为准。

## Orchard 示例推演

编码前，阅读 [Rust 所有权与 Result](https://doc.rust-lang.org/book/ch04-00-understanding-ownership.html) 和 [数据管理](../../../../../phases/00-setup-and-tooling/09-data-management/docs/en.md)。先完成[第 3 阶段](../../03-session/docs/en.md)。

客户端每次读取一个 JSON 事件，并将其与适配器添加的请求 ID 对应。每行刷新让界面无须等待进程退出，就能显示观察结果。

```text
request evidence -> {request_id:evidence, seq:2, kind:ok}
output: 2:Restore evidence: rehearsal completed at 09:20 UTC.
```

## 构建并检查

使用 BufRead 数据块，在构造命令字符串前限制分配量。工具输出必须进行 JSON 转义，不得直接拼接原始文件文本。

在学习者工作区中实现本阶段。随附的 CLI 辅助代码是适配器，会导入你的函数，不会用参考解答替代它们。

```bash
python3 scripts/project_test.py rust-agent-shell --stage 4 --path learning-artifacts/rust-agent-shell
```

累计阶段通过后，从仓库根目录使用原创样本输入运行你的交付物：

```bash
python3 learning-artifacts/rust-agent-shell/client.py projects/rust-agent-shell/examples/workspace projects/rust-agent-shell/examples/requests.jsonl --limit 8 --out observations.jsonl
```

JSONL 请求包含调用方 ID 和明确的工具参数对象。适配器将其转换为有界 Rust 标准输入语法。--limit 控制动作次数；原生文件读取仍限制为 16 KiB。应用层路径检查不提供操作系统隔离，也不能消除恶意并发替换竞态。

随附的 Python 适配器为每个输入 ID 写出一条凭据，并保留全部原生响应。退出、预算耗尽或进程终止后没有收到响应的请求，会得到终止性的 `kind: "not-executed"` 凭据及停止原因。进程错误或超时会保存部分凭据流，并以非零状态退出。意外终止时，无响应请求没有执行证据；重试前先检查原因。空输入不会产生事件。

## 接着探究

文件包含引号、制表符或换行符时，会发生什么？
