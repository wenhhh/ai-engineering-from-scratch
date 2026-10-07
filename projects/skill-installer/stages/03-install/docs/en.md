# 在指定根目录内原子安装

**第 3 阶段，共 4 阶段。** TypeScript。预计约 2 小时。

创建目录前检查预期摘要。使用 lstat 检查每一级智能体目录并拒绝符号链接。将完整转换后的技能包暂存于目标目录旁，再通过重命名完成安装。已有受管理安装会先移到临时备份，因此最终重命名失败时可以恢复。这种教学事务假定只有一个可信的本地写入方；对抗恶意并发文件替换需要操作系统级隔离。

本阶段的接口边界为 `install`。保持前面阶段行为不变：最终评分器会针对同一工作区运行所有阶段。

```figure
pj-skill-installer-3
```

译注：图表范围：哈希匹配来自勾选项，未计算摘要或写入文件；路径模型未拒绝保留的 .installed.json 和 NUL。实际完整性、文件限制与升级恢复行为以 TypeScript 实现为准。

## Orchard 示例推演

编码前，复习 [TypeScript 对象类型](https://www.typescriptlang.org/docs/handbook/2/objects.html)和[数据管理](../../../../../phases/00-setup-and-tooling/09-data-management/docs/en.md)。先完成[第 2 阶段](../../02-translate/docs/en.md)。

安装到调用方拥有、可丢弃的根目录。安装器先将每个文件写入私有的同级目录，技能包完整后才重命名至智能体的发现路径。

```text
root/.agents/skills/orchard-release/
SKILL.md + references/checklist.md + .installed.json
```

## 构建与检查

暂存前检查父目录是否为符号链接。将智能体目录映射与可移植技能内容分开。

在学习者工作区实现本阶段。随附命令行辅助程序是调用你的函数的适配器，不会用参考实现替代你的代码。

```bash
python3 scripts/project_test.py skill-installer --stage 3 --path learning-artifacts/skill-installer
```

先预测上面的中间状态，再运行本阶段。全新的未实现代码应当失败；参考实现通过不代表你的学习者工作区已经完成。

## 继续探究

重命名之前发生写入失败时，读取方应观察到什么？
