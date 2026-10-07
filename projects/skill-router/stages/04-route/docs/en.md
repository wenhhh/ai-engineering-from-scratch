# 遇到歧义或阻断时放弃路由

**第 4 阶段，共 4 阶段。** TypeScript。预计约 2 小时。

将排名与依赖规划结合，同时保留四种不同结果：ready、no-match、ambiguous 和 blocked。分数差小于门槛时，应判为有歧义，即使同分排序规则已经产生第一名。排名第一的技能仍可能因权限而被阻断。无论结果如何，都返回带解释的排名，便于调用方展示决策。

本阶段的接口边界为 `route`。保持前面阶段行为不变：最终评分器会针对同一工作区运行所有阶段。

```figure
pj-skill-router-4
```

译注：图表范围：只演示固定 deploy/ 路径和两个候选分数，不执行完整 glob、依赖图或权限遍历；图中使用 Unicode 单词，实际路由分词只识别 ASCII 字母与数字。

## Orchard 示例推演

编码前，复习 [TypeScript 对象类型](https://www.typescriptlang.org/docs/handbook/2/objects.html)和[工具结构定义设计](../../../../../phases/13-tools-and-protocols/05-tool-schema-design/docs/en.md)。先完成[第 3 阶段](../../03-dependencies/docs/en.md)。

两个技能分数过于接近，或选中计划需要尚未授予的权限时，应放弃路由。解释为何停止，比随意指定一个获胜技能更有用。

```text
publish request -> release-publish score 2
allowed=[read]; publish requires network
status=blocked, no execution plan
```

## 构建与检查

依赖规划之前先应用分数差门槛。排名提供选择依据，并不授予工具执行权限。

在学习者工作区实现本阶段。随附命令行辅助程序是调用你的函数的适配器，不会用参考实现替代你的代码。

```bash
python3 scripts/project_test.py skill-router --stage 4 --path learning-artifacts/skill-router
```

累计阶段全部通过后，从仓库根目录使用原始示例输入运行你的交付物：

```bash
node learning-artifacts/skill-router/cli.ts projects/skill-router/examples/skills projects/skill-router/examples/request.json
```

SKILL.md 提供标准名称和描述；routing.json 是本项目明确说明的本地扩展。路由器只生成计划和解释，从不执行选中的技能。关键词分词采用 ASCII 词法基线，多语言路由模型需要另行扩展。

## 继续探究

如何调整一个有歧义的关键词，同时避免对示例请求过拟合？
