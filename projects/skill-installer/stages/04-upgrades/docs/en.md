# 升级时保护本地修改

**第 4 阶段，共 4 阶段。** TypeScript。预计约 2 小时。

替换安装前，校验所有受跟踪文件仍与此前摘要一致，并确认没有新增不受管理的文件。如果用户编辑了受跟踪文件或新增自己的文件，拒绝升级。用户可以主动将这些修改合入源技能包。多次成功安装后，不应留下暂存目录或备份目录。

本阶段的接口边界为 `install`。保持前面阶段行为不变：最终评分器会针对同一工作区运行所有阶段。

```figure
pj-skill-installer-4
```

译注：图表范围：哈希匹配来自勾选项，未计算摘要或写入文件；路径模型未拒绝保留的 .installed.json 和 NUL。实际完整性、文件限制与升级恢复行为以 TypeScript 实现为准。

## Orchard 示例推演

编码前，复习 [TypeScript 对象类型](https://www.typescriptlang.org/docs/handbook/2/objects.html)和[数据管理](../../../../../phases/00-setup-and-tooling/09-data-management/docs/en.md)。先完成[第 3 阶段](../../03-install/docs/en.md)。

升级必须保留本地修改。将当前文件与此前安装摘要比较，拒绝已修改或不受管理的文件。演示会编辑检查清单，再尝试安装，并保留该修改。

```text
installed checklist hash=A
local edit -> current hash=B
upgrade -> modified installation; local text remains
```

## 构建与检查

移动目标目录前，读取现有凭据并校验文件清单。如果最终重命名失败，恢复此前移走的备份。

在学习者工作区实现本阶段。随附命令行辅助程序是调用你的函数的适配器，不会用参考实现替代你的代码。

```bash
python3 scripts/project_test.py skill-installer --stage 4 --path learning-artifacts/skill-installer
```

累计阶段全部通过后，从仓库根目录使用原始示例输入运行你的交付物：

```bash
node learning-artifacts/skill-installer/cli.ts inspect projects/skill-installer/examples/orchard-release.json codex
```

inspect 只执行预演。install 需要技能包、智能体、根目录和可信的预期来源摘要。支持的目标映射为 codex=.agents/skills、claude=.claude/skills、cursor=.cursor/skills。发现路径在本地配置；安装成功不能证明另一个正在运行的智能体已经启用该技能。

## 继续探究

在替换经过本地编辑的检查清单前，可审阅的合并需要展示哪些信息？
