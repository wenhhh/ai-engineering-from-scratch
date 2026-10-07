# 记录有界审计证据

**第 4 阶段，共 4 阶段。** Rust。预计约 2 小时。

策略决策后生成稳定的制表符分隔审计行。拒绝重复调用 ID，并限制保留条数。省略参数，避免把秘密内容写入日志；保留 ID、角色、工具和决策，足以统计授权结果。

```figure
pj-tool-call-firewall-4
```

译注：图表范围：只演示角色、词法路径和布尔审批输入，不访问文件系统。审计已满时可能仍显示可授权或 used=true 的预测；真实 CLI 在审计失败时不会执行 dispatch，不能把该显示视为实际副作用证据。

## 实现边界

```rust
pub fn audit(log:&mut Vec<String>,c:&Call,d:&Decision,max_entries:usize)->Result<(),Error>
```

权威来源：[官方参考](https://modelcontextprotocol.io/specification/2025-06-18/basic/security_best_practices)。

## Orchard 示例推演

编码前，阅读[Rust 所有权与 Result](https://doc.rust-lang.org/book/ch04-00-understanding-ownership.html)和[工具结构定义设计](../../../../../phases/13-tools-and-protocols/05-tool-schema-design/docs/en.md)。 先完成[第 3 阶段](../../03-consume-a-request-bound-approval-once/docs/en.md)。

紧凑审计记录结果，不复制文件内容。可执行程序返回请求 ID、相对参数、决策、输出、审批是否已消费以及重放是否被拒绝。集成时应把请求身份与应用结果一起记录。

```text
request r1 -> one policy row
file write succeeds -> approval_consumed=true
second dispatch -> replay_denied=true
```

## 构建与检查

追加前拒绝重复审计 ID 和已满日志。有界内存审计不等于持久化防篡改日志。

在自己的学习者工作区实现本阶段。CLI 辅助程序是随附适配器，导入你的函数，不会替换为参考解答。

```bash
python3 scripts/project_test.py tool-call-firewall --stage 4 --path learning-artifacts/tool-call-firewall
```

累计阶段通过后，从仓库根目录运行你的交付物，使用原始样本输入：

```bash
rustc --edition=2021 learning-artifacts/tool-call-firewall/cli.rs -o learning-artifacts/tool-call-firewall/firewall
learning-artifacts/tool-call-firewall/firewall projects/tool-call-firewall/examples/workspace reader r1 read notes.md
```

原生命令行程序要求调用它的应用提供可信角色。读写都经过 dispatch，校验规范路径是否在根目录内，并将写操作绑定到精确内容。审批只在单次调用的内存中一次性使用。本例演示文件工具的执行控制，不是跨进程持久化授权机构，也不是操作系统沙箱。

## 继续探究

应对哪些非秘密字段计算哈希，才能关联持久审批凭据与执行结果？
