# 一次性消费绑定请求的审批

**第 3 阶段，共 4 阶段。** Rust。预计约 2 小时。

审批保存完整的带类型请求：ID、角色、工具和参数。只有决策要求审批时才消费它。不匹配、已使用或被拒绝的请求会失败，且不修改审批。保留相同显示 ID 却改变参数，也属于冲突。应用只有在用户批准该精确请求后才能创建此记录。

```figure
pj-tool-call-firewall-3
```

译注：图表范围：只演示角色、词法路径和布尔审批输入，不访问文件系统。审计已满时可能仍显示可授权或 used=true 的预测；真实 CLI 在审计失败时不会执行 dispatch，不能把该显示视为实际副作用证据。

## 实现边界

```rust
pub fn authorize(c:&Call,approval:Option<&mut Approval>)->Result<(),Error>
```

权威来源：[官方参考](https://modelcontextprotocol.io/specification/2025-06-18/basic/security_best_practices)。

## Orchard 示例推演

编码前，阅读[Rust 所有权与 Result](https://doc.rust-lang.org/book/ch04-00-understanding-ownership.html)和[工具结构定义设计](../../../../../phases/13-tools-and-protocols/05-tool-schema-design/docs/en.md)。 先完成[第 2 阶段](../../02-evaluate-role-and-path-policy/docs/en.md)。

真实文件分派器把审批绑定到带类型请求及写入内容，在执行写入前消费凭据。载荷变化或重放都会失败，不能再次写入。

```text
approved content="approved after restore"
changed content -> Conflict, file unchanged
exact content -> write, used=true
replay -> Conflict
```

## 构建与检查

消费审批前先校验载荷大小和实际路径边界。一次性凭据应与 dispatch 位于同一个可信应用边界。

在自己的学习者工作区实现本阶段。CLI 辅助程序是随附适配器，导入你的函数，不会替换为参考解答。

```bash
python3 scripts/project_test.py tool-call-firewall --stage 3 --path learning-artifacts/tool-call-firewall
```

先预测上面的中间状态，再运行本阶段。全新起始代码会失败；参考实现通过，不代表你的学习者工作区已经完成。

## 继续探究

允许在进程重启后继续使用审批之前，需要怎样的持久化凭据存储？
