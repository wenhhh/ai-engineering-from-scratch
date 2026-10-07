# 执行前解析依赖关系

**第 3 阶段，共 4 阶段。** TypeScript。预计约 2 小时。

使用深度优先遍历，并分别维护 active 集合与 visited 集合。active 用于检测环，visited 用于避免菱形依赖中的重复执行。对依赖项和选中技能都检查权限要求。先输出依赖项，再输出使用它的技能；遇到未知依赖 ID 时拒绝计划，不要静默跳过。

本阶段的接口边界为 `plan`。保持前面阶段行为不变：最终评分器会针对同一工作区运行所有阶段。

```figure
pj-skill-router-3
```

译注：图表范围：只演示固定 deploy/ 路径和两个候选分数，不执行完整 glob、依赖图或权限遍历；图中使用 Unicode 单词，实际路由分词只识别 ASCII 字母与数字。

## Orchard 示例推演

编码前，复习 [TypeScript 对象类型](https://www.typescriptlang.org/docs/handbook/2/objects.html)和[工具结构定义设计](../../../../../phases/13-tools-and-protocols/05-tool-schema-design/docs/en.md)。先完成[第 2 阶段](../../02-score/docs/en.md)。

选中 release-review 后，需要先处理 check-tests。深度优先遍历将依赖项放在选中技能之前，并检查整个依赖图中的权限。任一依赖项被拒绝，都会阻断整个计划。

```text
release-review requires check-tests
allowed=[read]
plan=[check-tests,release-review]
```

## 构建与检查

分别维护 active 和 visited 集合：前者检测环，后者避免重复执行。在依赖项之前，不能先把父技能加入输出。

在学习者工作区实现本阶段。随附命令行辅助程序是调用你的函数的适配器，不会用参考实现替代你的代码。

```bash
python3 scripts/project_test.py skill-router --stage 3 --path learning-artifacts/skill-router
```

先预测上面的中间状态，再运行本阶段。全新的未实现代码应当失败；参考实现通过不代表你的学习者工作区已经完成。

## 继续探究

如果 check-tests 还需要网络权限，会发生什么？
