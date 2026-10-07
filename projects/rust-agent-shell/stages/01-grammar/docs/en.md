# 解析刻意限定的动作语言

**第 1 阶段，共 4 阶段。** Rust。预计约 2 小时。

为 help、pwd、list、read、字面搜索和 quit 定义动作枚举。拒绝未知命令，包括类似 shell 的指令。搜索的模式与路径通过制表符分隔，让两个参数内部仍可包含空格。解析不会启动子进程，输入上限为 4096 字节。这是与模型无关的工具循环，不是自然语言模型，也不是操作系统 shell。

```figure
pj-rust-agent-shell-1
```

译注：图表边界：这是单步语法与预算示意，不访问文件、不解析符号链接，也没有持久会话。它对 read 缺参或 pwd 附参的判断与真实 Rust 解析器不同；错误枚举和样本命令保留英文，实际边界以程序测试为准。

## Orchard 示例推演

编码前，阅读 [Rust 所有权与 Result](https://doc.rust-lang.org/book/ch04-00-understanding-ownership.html) 和 [数据管理](../../../../../phases/00-setup-and-tooling/09-data-management/docs/en.md)。

Rust 进程只接受刻意限定的工具语言。Python 适配器接收含调用方 ID 与工具参数的 JSONL，再仅转换已知命令。任何参数都不会变成操作系统 shell 命令。

```text
{"id":"evidence","tool":"search","arguments":{"pattern":"Restore","path":"release.md"}}
wire: search Restore<TAB>release.md
```

## 构建并检查

拒绝适配器参数中的控制字符，避免路径注入第二条命令。区分解析拒绝和执行失败。

在学习者工作区中实现本阶段。随附的 CLI 辅助代码是适配器，会导入你的函数，不会用参考解答替代它们。

```bash
python3 scripts/project_test.py rust-agent-shell --init learning-artifacts/rust-agent-shell
python3 scripts/project_test.py rust-agent-shell --stage 1 --path learning-artifacts/rust-agent-shell
```

先预测上面的中间状态，再运行阶段测试。全新的桩代码应当失败；参考实现通过测试不代表你的学习者工作区已完成。

## 接着探究

为什么必须在标准输入序列化之前拒绝调用方路径中的字面换行符？
