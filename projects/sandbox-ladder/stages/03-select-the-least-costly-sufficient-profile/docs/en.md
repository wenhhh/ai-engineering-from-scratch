# 选择成本最低且足够的配置

**第 3 阶段，共 4 阶段。** Rust。预计约 2 小时。

比较成本前，先过滤能力不足的配置。遵守成本上限，同成本时按名称决定顺序，并返回明确的无适用配置错误。不能仅因预算不足，就降低必需的隔离控制。

```figure
pj-sandbox-ladder-3
```

译注：图表边界：探针值来自手动开关，不会运行 Docker。控制模型不等同于实际配置，两个探针都为真也不能证明微型虚拟机或容器逃逸防护。

## 实现边界

```rust
pub fn select(n:&Needs,candidates:&[Profile],budget:u32)->Result<Profile,Error>
```

权威参考：[官方参考](https://docs.docker.com/engine/security/)。

## Orchard 示例推演

编码前，阅读 [Rust 所有权与 Result](https://doc.rust-lang.org/book/ch04-00-understanding-ownership.html) 和 [面向 AI 的 Docker](../../../../../phases/00-setup-and-tooling/07-docker-for-ai/docs/en.md)。先完成[第 2 阶段](../../02-define-modeled-control-profiles/docs/en.md)。

足够的最低成本配置仍可能超出预算。要求内核分离时，预算 4 不能静默降级为成本 3 的容器。

```text
kernel separation required; candidates costs 1,2,3,5
budget 4 -> no sufficient profile
budget 5 -> microvm-fixture
```

## 构建并检查

先按能力过滤，再检查成本，最后采用稳定名称排序。如果剩余集合为空，返回限额错误。

在学习者工作区中实现本阶段。随附的 CLI 辅助代码是适配器，会导入你的函数，不会用参考解答替代它们。

```bash
python3 scripts/project_test.py sandbox-ladder --stage 3 --path learning-artifacts/sandbox-ladder
```

先预测上面的中间状态，再运行阶段测试。全新的桩代码应当失败；参考实现通过测试不代表你的学习者工作区已完成。

## 接着探究

两个足够的配置具有相同模拟成本时，应如何处理？
