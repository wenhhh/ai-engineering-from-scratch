# 工具调用防火墙（Tool Call Firewall）

用审批凭据明确记录获准执行及实际执行的操作。

调用方应用提供身份，模型只提出操作建议。紧凑的 Rust 消息封套携带稳定请求 ID、角色、工具和相对参数，不允许有歧义的分隔符或控制字符。

## 从学习者工作区开始

[工具结构定义设计](../../phases/13-tools-and-protocols/05-tool-schema-design/docs/en.md)、[安全与密钥审计](../../phases/17-infrastructure-and-production/25-security-secrets-audit/docs/en.md)。语言基础：[Rust 所有权与 Result](https://doc.rust-lang.org/book/ch04-00-understanding-ownership.html)。

需要安装 Rust（`rustc`）及 Python 3.10+。核心使用 Rust 标准库；Python 适配器在私有临时目录中编译。

```bash
python3 scripts/project_test.py tool-call-firewall --init learning-artifacts/tool-call-firewall
python3 scripts/project_test.py tool-call-firewall --stage 1 --path learning-artifacts/tool-call-firewall
```

## 构建路线

1. [校验无歧义的调用封套](stages/01-validate-an-unambiguous-call-envelope/docs/en.md)
2. [评估角色与路径策略](stages/02-evaluate-role-and-path-policy/docs/en.md)
3. [一次性消费绑定请求的审批](stages/03-consume-a-request-bound-approval-once/docs/en.md)
4. [记录有界审计证据](stages/04-record-bounded-audit-evidence/docs/en.md)

## 使用自己的输入

完成各阶段后，以下命令在原创 Orchard 示例上运行你的工作区代码。请将样本路径替换为自己的文件。

```bash
rustc --edition=2021 learning-artifacts/tool-call-firewall/cli.rs -o learning-artifacts/tool-call-firewall/firewall
learning-artifacts/tool-call-firewall/firewall projects/tool-call-firewall/examples/workspace reader r1 read notes.md
```

若想先检查完整参考实现，在同一命令中将 `learning-artifacts/tool-call-firewall` 替换为 `projects/tool-call-firewall/solution`。JSON 结果使用 `schema_version: 1`；路径和参数示例均已明确，便于其他工具读取。

## 集成边界

原生命令行程序要求调用它的应用提供可信角色。读写都经过 dispatch，校验规范路径是否在根目录内，并将写操作绑定到精确内容。审批只在单次调用的内存中一次性使用。本例演示文件工具的执行控制，不是跨进程持久化授权机构，也不是操作系统沙箱。

```bash
python3 scripts/project_test.py tool-call-firewall --all --solution --strict
python3 scripts/project_test.py tool-call-firewall --all --path learning-artifacts/tool-call-firewall --strict
```

第一条命令检查参考实现，第二条检查你的实现。公开示例与测试属于回归证据，不是生产认证或未见过的基准。

## 权威参考资料

- [官方参考](https://modelcontextprotocol.io/specification/2025-06-18/basic/security_best_practices)

译注：展示范围：批准在文件写入前标为已消费；写入失败不会自动恢复审批。文件写入不是原子替换，也没有关闭规范化后路径被并发替换的竞态。CLI 的 --approve 仅演示可信调用方创建内存凭据，不证明已完成真实用户认证或跨进程审批。
