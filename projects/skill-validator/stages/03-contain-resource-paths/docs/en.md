# 将资源路径限制在根目录内

**第 3 阶段，共 4 阶段。** Rust。预计约 2 小时。

相对于技能根目录解析资源名称。拼接之前拒绝绝对路径、父目录路径段和 Windows 分隔符，再规范化现有路径，防止符号链接指向根目录外。规范化只检查当前文件系统状态；面对对抗环境的生产加载器需要相对于目录文件描述符执行打开操作，以消除之后的替换竞态。

```figure
pj-skill-validator-3
```

译注：图表范围：不解析真实元数据头，不检查描述非空及 1024 字符上限，也不访问资源文件；资源正文不计入图中预算。完整加载与路径校验由 Rust 实现执行。

## 实现边界

```rust
pub fn reference_path(root: &std::path::Path, resource: &str) -> Result<std::path::PathBuf, Error>
```

权威参考：[官方参考资料](https://agentskills.io/specification)。

## Orchard 示例推演

编码前，复习 [Rust 所有权与 Result](https://doc.rust-lang.org/book/ch04-00-understanding-ownership.html)和[数据管理](../../../../../phases/00-setup-and-tooling/09-data-management/docs/en.md)。先完成[第 2 阶段](../../02-validate-names-and-descriptions/docs/en.md)。

相对于技能目录查找资源。解析 references/restore.md，并校验规范化路径仍在该目录内；任何读取开始前，先拒绝父目录穿越。

```text
resource references/restore.md -> contained file
resource ../private.md -> invalid component
symlink outside root -> escapes root
```

## 构建与检查

拼接前校验路径段，再进行路径规范化。这个教学加载器不能消除对抗性的路径替换竞态。

在学习者工作区实现本阶段。随附命令行辅助程序是调用你的函数的适配器，不会用参考实现替代你的代码。

```bash
python3 scripts/project_test.py skill-validator --stage 3 --path learning-artifacts/skill-validator
```

先预测上面的中间状态，再运行本阶段。全新的未实现代码应当失败；参考实现通过不代表你的学习者工作区已经完成。

## 继续探究

为什么仅对原始路径文本使用 starts_with 不足以证明路径被限制在根目录内？
