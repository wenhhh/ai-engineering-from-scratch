# 解析能力需求

**第 1 阶段，共 4 阶段。** Rust。预计约 2 小时。

用四个明确布尔值表示威胁模型：不可信代码、含密钥的宿主机、要求禁用网络，以及要求内核分离。拒绝未知键和含糊的布尔值。策略评估器的有效性取决于它是否真正理解请求。

```figure
pj-sandbox-ladder-1
```

译注：图表边界：探针值来自手动开关，不会运行 Docker。控制模型不等同于实际配置，两个探针都为真也不能证明微型虚拟机或容器逃逸防护。

## 实现边界

```rust
pub fn needs(text:&str)->Result<Needs,Error>
```

权威参考：[官方参考](https://docs.docker.com/engine/security/)。

## Orchard 示例推演

编码前，阅读 [Rust 所有权与 Result](https://doc.rust-lang.org/book/ch04-00-understanding-ownership.html) 和 [面向 AI 的 Docker](../../../../../phases/00-setup-and-tooling/07-docker-for-ai/docs/en.md)。

选择运行时之前，先将威胁需求写成布尔值。这里 network=true 表示要求禁用网络，host_kernel=true 表示要求独立内核。这两个名称都不表示授予访问权限。

```text
untrusted=true,secrets=true,network=true,host_kernel=false
required: filesystem boundary + denied network
```

## 构建并检查

拒绝重复键，以及并非精确 true/false 的值。不要猜测 network=yes 的含义。

在学习者工作区中实现本阶段。随附的 CLI 辅助代码是适配器，会导入你的函数，不会用参考解答替代它们。

```bash
python3 scripts/project_test.py sandbox-ladder --init learning-artifacts/sandbox-ladder
python3 scripts/project_test.py sandbox-ladder --stage 1 --path learning-artifacts/sandbox-ladder
```

先预测上面的中间状态，再运行阶段测试。全新的桩代码应当失败；参考实现通过测试不代表你的学习者工作区已完成。

## 接着探究

增加哪项需求后，共享内核的容器将不再足够？
