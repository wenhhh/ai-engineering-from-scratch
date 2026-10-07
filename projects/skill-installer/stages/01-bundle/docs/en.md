# 校验可移植技能包

**第 1 阶段，共 4 阶段。** TypeScript。预计约 2 小时。

接收具名技能包，其中包含 SKILL.md 和可选参考文件。访问磁盘前先校验所有相对路径。拒绝点路径段、绝对路径、盘符前缀、反斜杠和保留的安装元数据。每个文本文件限制为 100 KB。安装器读取内存中的技能包；网络获取与签名信任由其他组件负责。

本阶段的接口边界为 `safePath, validate`。保持前面阶段行为不变：最终评分器会针对同一工作区运行所有阶段。

```figure
pj-skill-installer-1
```

译注：图表范围：哈希匹配来自勾选项，未计算摘要或写入文件；路径模型未拒绝保留的 .installed.json 和 NUL。实际完整性、文件限制与升级恢复行为以 TypeScript 实现为准。

## Orchard 示例推演

编码前，复习 [TypeScript 对象类型](https://www.typescriptlang.org/docs/handbook/2/objects.html)和[数据管理](../../../../../phases/00-setup-and-tooling/09-data-management/docs/en.md)。

可移植技能包包含元数据和相对路径下的 UTF-8 文件。将 SKILL.md 作为入口文档，拒绝任何可能越出所选安装根目录的资源名称。Orchard 原创技能包附带恢复检查清单。

```text
name=orchard-release
files: SKILL.md, references/checklist.md
../settings.json -> rejected
```

## 构建与检查

创建目录前校验每个文件路径。将 .installed.json 保留给安装器凭据使用。

在学习者工作区实现本阶段。随附命令行辅助程序是调用你的函数的适配器，不会用参考实现替代你的代码。

```bash
python3 scripts/project_test.py skill-installer --init learning-artifacts/skill-installer
python3 scripts/project_test.py skill-installer --stage 1 --path learning-artifacts/skill-installer
```

先预测上面的中间状态，再运行本阶段。全新的未实现代码应当失败；参考实现通过不代表你的学习者工作区已经完成。

## 继续探究

即使当前机器使用斜杠路径，为什么仍须拒绝 Windows 反斜杠？
