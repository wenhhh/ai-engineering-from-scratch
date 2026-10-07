# 校验无歧义的调用封套

**第 1 阶段，共 4 阶段。** Rust。预计约 2 小时。

本地练习使用竖线分隔符解析有界四字段封套。拒绝缺少身份、包含控制字符或过长的输入。该语法刻意比 JSON 更窄，不能静默将其复用为通用通信协议。

```figure
pj-tool-call-firewall-1
```

译注：图表范围：只演示角色、词法路径和布尔审批输入，不访问文件系统。审计已满时可能仍显示可授权或 used=true 的预测；真实 CLI 在审计失败时不会执行 dispatch，不能把该显示视为实际副作用证据。

## 实现边界

```rust
pub fn call(line:&str,max_bytes:usize)->Result<Call,Error>
```

权威来源：[官方参考](https://modelcontextprotocol.io/specification/2025-06-18/basic/security_best_practices)。

## Orchard 示例推演

编码前，阅读[Rust 所有权与 Result](https://doc.rust-lang.org/book/ch04-00-understanding-ownership.html)和[工具结构定义设计](../../../../../phases/13-tools-and-protocols/05-tool-schema-design/docs/en.md)。

调用方应用提供身份，模型只提出操作建议。紧凑的 Rust 消息封套携带稳定请求 ID、角色、工具和相对参数，不允许有歧义的分隔符或控制字符。

```text
r1|reader|read|notes.md -> typed request
r1|reader|read|notes.md|extra -> reject
```

## 构建与检查

评估策略前校验整个有界封套。在 CLI 中，trusted-role 是操作者参数，不是从模型文本接收的字段。

在自己的学习者工作区实现本阶段。CLI 辅助程序是随附适配器，导入你的函数，不会替换为参考解答。

```bash
python3 scripts/project_test.py tool-call-firewall --init learning-artifacts/tool-call-firewall
python3 scripts/project_test.py tool-call-firewall --stage 1 --path learning-artifacts/tool-call-firewall
```

先预测上面的中间状态，再运行本阶段。全新起始代码会失败；参考实现通过，不代表你的学习者工作区已经完成。

## 继续探究

如果模型能把 reader 换成 editor，会破坏什么？
