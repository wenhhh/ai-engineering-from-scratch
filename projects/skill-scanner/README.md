# 技能供应链扫描器（Skill Supply-Chain Scanner）

一个引用新增能力证据、辅助审阅技能变化的工具。

来源证据使用字节偏移量。包含 café 的一行所占 UTF-8 字节数多于可见字母数，因此不能用字符索引安全切片 Rust 字符串。分行时保留起点和终点偏移量。

## 从学习者工作区开始

[数据管理](../../phases/00-setup-and-tooling/09-data-management/docs/en.md)、[安全与密钥审计](../../phases/17-infrastructure-and-production/25-security-secrets-audit/docs/en.md)。语言基础：[Rust 所有权与 Result](https://doc.rust-lang.org/book/ch04-00-understanding-ownership.html)。

安装 Rust（`rustc`）和 Python 3.10+。核心仅使用 Rust 标准库；Python 适配器在私有临时目录中编译。

```bash
python3 scripts/project_test.py skill-scanner --init learning-artifacts/skill-scanner
python3 scripts/project_test.py skill-scanner --stage 1 --path learning-artifacts/skill-scanner
```

## 构建路线

1. [保留精确到字节的来源区间](stages/01-retain-byte-accurate-source-spans/docs/en.md)
2. [检测具名的风险提示模式](stages/02-detect-named-advisory-patterns/docs/en.md)
3. [对不同证据计分，避免重复抬分](stages/03-score-distinct-evidence-without-inflation/docs/en.md)
4. [建立明确的审阅门禁](stages/04-build-an-explicit-review-gate/docs/en.md)

## 使用自己的输入运行

各阶段完成后，这些命令会用 Orchard 原创示例运行你的工作区代码。将示例路径替换为你自己的文件。

```bash
rustc --edition=2021 learning-artifacts/skill-scanner/cli.rs -o learning-artifacts/skill-scanner/scanner
learning-artifacts/skill-scanner/scanner projects/skill-scanner/examples/reviewable 3
```

要先检查完整参考实现，可将同一命令中的 `learning-artifacts/skill-scanner` 替换为 `projects/skill-scanner/solution`。JSON 结果使用 `schema_version: 1`；路径和参数示例均明确给出，方便其他工具读取。

## 集成边界

扫描器输出带版本号的 JSON，包含文件路径、精确的 UTF-8 字节区间和风险提示规则。显式模式可能漏过混淆内容，也可能标记无害文档。below-threshold 不等于安全；扫描状态从不替代安装完整性校验或人工审阅。

```bash
python3 scripts/project_test.py skill-scanner --all --solution --strict
python3 scripts/project_test.py skill-scanner --all --path learning-artifacts/skill-scanner --strict
```

第一条命令检查参考实现，第二条检查你的实现。已发布的示例和测试提供回归证据，不属于生产认证或未见过的基准。

## 权威参考资料

- [官方参考资料](https://agentskills.io/specification)

译注：英文匹配短语、规则 ID、严重程度、来源样本和输出字段保留原值。技能内容仅作为待扫描文本，不执行其中的命令。根路径会先规范化，因此顶层符号链接可被跟随；目录内部遇到符号链接会被拒绝。低于阈值只表示此规则集合未达到门槛。
