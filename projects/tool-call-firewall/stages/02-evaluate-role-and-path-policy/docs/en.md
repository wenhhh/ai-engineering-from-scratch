# 评估角色与路径策略

**第 2 阶段，共 4 阶段。** Rust。预计约 2 小时。

只存在 reader 和 editor 两种角色。读取使用相对路径；写入要求 editor 角色及审批。拒绝父目录组件、绝对路径、顶层隐藏路径和未知工具。这里只检查词法策略，实际文件适配器仍必须防止符号链接越界。

```figure
pj-tool-call-firewall-2
```

译注：图表范围：只演示角色、词法路径和布尔审批输入，不访问文件系统。审计已满时可能仍显示可授权或 used=true 的预测；真实 CLI 在审计失败时不会执行 dispatch，不能把该显示视为实际副作用证据。

## 实现边界

```rust
pub fn decide(c:&Call)->Decision
```

权威来源：[官方参考](https://modelcontextprotocol.io/specification/2025-06-18/basic/security_best_practices)。

## Orchard 示例推演

编码前，阅读[Rust 所有权与 Result](https://doc.rust-lang.org/book/ch04-00-understanding-ownership.html)和[工具结构定义设计](../../../../../phases/13-tools-and-protocols/05-tool-schema-design/docs/en.md)。 先完成[第 1 阶段](../../01-validate-an-unambiguous-call-envelope/docs/en.md)。

策略拒绝未知角色、不支持的工具和不安全路径组件。reader 可读取根目录内的便笺；editor 写入需要审批。词法判断允许后，dispatch 仍要检查实际文件系统路径是否位于根目录内。

```text
reader + read notes.md -> Allow
reader + write notes.md -> Deny
editor + write notes.md -> ApprovalRequired
```

## 构建与检查

默认分支为 Deny。真实访问文件前检查规范路径，不要把策略判断当作操作系统隔离。

在自己的学习者工作区实现本阶段。CLI 辅助程序是随附适配器，导入你的函数，不会替换为参考解答。

```bash
python3 scripts/project_test.py tool-call-firewall --stage 2 --path learning-artifacts/tool-call-firewall
```

先预测上面的中间状态，再运行本阶段。全新起始代码会失败；参考实现通过，不代表你的学习者工作区已经完成。

## 继续探究

相对名称不含父目录组件时，符号链接为何仍可能越界？
