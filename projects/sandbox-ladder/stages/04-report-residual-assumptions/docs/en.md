# 报告剩余假设

**第 4 阶段，共 4 阶段。** Rust。预计约 2 小时。

返回选中的模拟配置，并明确说明尚未执行操作系统层强制隔离。依据所选能力列出共享内核和网络未禁用等剩余风险，拒绝不满足原始需求的配置。报告用于后续部署审阅。

```figure
pj-sandbox-ladder-4
```

译注：图表边界：探针值来自手动开关，不会运行 Docker。控制模型不等同于实际配置，两个探针都为真也不能证明微型虚拟机或容器逃逸防护。

## 实现边界

```rust
pub fn plan(n:&Needs,p:&Profile)->Result<String,Error>
```

权威参考：[官方参考](https://docs.docker.com/engine/security/)。

## Orchard 示例推演

编码前，阅读 [Rust 所有权与 Result](https://doc.rust-lang.org/book/ch04-00-understanding-ownership.html) 和 [面向 AI 的 Docker](../../../../../phases/00-setup-and-tooling/07-docker-for-ai/docs/en.md)。先完成[第 3 阶段](../../03-select-the-least-costly-sufficient-profile/docs/en.md)。

可选 Docker 适配器生成可检查的参数列表，只运行调用方选择且本地已存在的镜像。其无害探针检查根目录写入被拒绝，以及不存在默认路由。项目没有包含微型虚拟机实现。

```text
--docker-image alpine:local -> command preview
--execute -> docker_probe with observed stdout
shared host kernel remains a residual
```

## 构建并检查

区分 policy_simulation 和 docker_probe 结果。探针成功仅为这些检查提供证据，不能证明可以抵御容器逃逸。

在学习者工作区中实现本阶段。随附的 CLI 辅助代码是适配器，会导入你的函数，不会用参考解答替代它们。

```bash
python3 scripts/project_test.py sandbox-ladder --stage 4 --path learning-artifacts/sandbox-ladder
```

累计阶段通过后，从仓库根目录使用原创样本输入运行你的交付物：

```bash
python3 learning-artifacts/sandbox-ladder/cli.py untrusted=true,secrets=true,network=true,host_kernel=false --budget 3
```

默认输出是策略模拟。--docker-image 预览调用命令；--execute 需要 Docker 和本地已经存在的镜像。只检查根目录写入与默认路由两个探针。适配器从未实现或验证微型虚拟机边界。

## 接着探究

如果 root_write 变为 allowed，你会先检查哪个运行时设置？
