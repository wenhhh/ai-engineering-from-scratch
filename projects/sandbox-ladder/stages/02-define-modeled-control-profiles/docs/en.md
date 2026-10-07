# 定义控制能力的模拟配置

**第 2 阶段，共 4 阶段。** Rust。预计约 2 小时。

把进程、文件系统、容器网络和微型虚拟机边界建模为数据。仅有配置名称不能证明任何事；逐项比较所需控制与对应布尔能力。这些配置刻意假设操作者正确配置，部署验证留给真实运行时。

```figure
pj-sandbox-ladder-2
```

译注：图表边界：探针值来自手动开关，不会运行 Docker。控制模型不等同于实际配置，两个探针都为真也不能证明微型虚拟机或容器逃逸防护。

## 实现边界

```rust
pub fn profiles()->Vec<Profile>
pub fn satisfies(n:&Needs,p:&Profile)->bool
```

权威参考：[官方参考](https://docs.docker.com/engine/security/)。

## Orchard 示例推演

编码前，阅读 [Rust 所有权与 Result](https://doc.rust-lang.org/book/ch04-00-understanding-ownership.html) 和 [面向 AI 的 Docker](../../../../../phases/00-setup-and-tooling/07-docker-for-ai/docs/en.md)。先完成[第 1 阶段](../../01-parse-the-capability-request/docs/en.md)。

配置描述模拟能力，并使用示意成本。在这个模型中，进程边界没有文件系统或网络隔离；容器配置模拟这两种能力，但仍共享宿主机内核。

```text
process: filesystem=false, network=false, kernel=false
container: filesystem=true, network=true, kernel=false
```

## 构建并检查

独立测试各项需求。只要缺少一项必需能力，低成本就没有意义。

在学习者工作区中实现本阶段。随附的 CLI 辅助代码是适配器，会导入你的函数，不会用参考解答替代它们。

```bash
python3 scripts/project_test.py sandbox-ladder --stage 2 --path learning-artifacts/sandbox-ladder
```

先预测上面的中间状态，再运行阶段测试。全新的桩代码应当失败；参考实现通过测试不代表你的学习者工作区已完成。

## 接着探究

为什么这个模型不能证明实际运行的容器具有这些设置？
