# 将文件工具限制在有界根目录内

**第 2 阶段，共 4 阶段。** Rust。预计约 2 小时。

对工作区根目录与请求目标求规范路径，拒绝绝对路径和包含父目录跳转的路径，并确认符号链接仍指向根目录内。文本读取上限为 16 KiB，目录结果最多 100 项，搜索最多返回 50 个匹配行。这些是面向可信本地工作区的应用层约束；恶意并发替换符号链接需要更强的操作系统原语或隔离。

```figure
pj-rust-agent-shell-2
```

译注：图表边界：这是单步语法与预算示意，不访问文件、不解析符号链接，也没有持久会话。它对 read 缺参或 pwd 附参的判断与真实 Rust 解析器不同；错误枚举和样本命令保留英文，实际边界以程序测试为准。

## Orchard 示例推演

编码前，阅读 [Rust 所有权与 Result](https://doc.rust-lang.org/book/ch04-00-understanding-ownership.html) 和 [数据管理](../../../../../phases/00-setup-and-tooling/09-data-management/docs/en.md)。先完成[第 1 阶段](../../01-grammar/docs/en.md)。

读取 release.md 前，先在工作区根目录下解析它。路径字符串可能看似无害，但符号链接可能指向工作区外的文件。这提供应用层范围约束，不构成进程沙箱。

```text
workspace=/work/orchard
release.md -> /work/orchard/release.md -> allowed
link.md -> /outside/credentials -> rejected
```

## 构建并检查

规范化根目录和目标后，比较路径组成部分。除最初元数据记录的长度外，也要限制实际读取字节数。

在学习者工作区中实现本阶段。随附的 CLI 辅助代码是适配器，会导入你的函数，不会用参考解答替代它们。

```bash
python3 scripts/project_test.py rust-agent-shell --stage 2 --path learning-artifacts/rust-agent-shell
```

先预测上面的中间状态，再运行阶段测试。全新的桩代码应当失败；参考实现通过测试不代表你的学习者工作区已完成。

## 接着探究

若另一个进程在路径规范化之后替换该路径，还会存在什么竞态？
