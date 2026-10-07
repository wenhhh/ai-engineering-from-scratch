# 解析带类型的技能目录

**第 1 阶段，共 4 阶段。** TypeScript。预计约 2 小时。

技能清单声明 ID、描述、关键词、路径模式、优先级、依赖与权限。应在运行时校验数组和数值，不能仅信任对 JSON 的类型断言。分词会规范化标点和大小写，并去除重复词，因此重复提示词不会抬高分数。

本阶段的接口边界为 `parseSkill, tokens`。保持前面阶段行为不变：最终评分器会针对同一工作区运行所有阶段。

```figure
pj-skill-router-1
```

译注：图表范围：只演示固定 deploy/ 路径和两个候选分数，不执行完整 glob、依赖图或权限遍历；图中使用 Unicode 单词，实际路由分词只识别 ASCII 字母与数字。

## Orchard 示例推演

编码前，复习 [TypeScript 对象类型](https://www.typescriptlang.org/docs/handbook/2/objects.html)和[工具结构定义设计](../../../../../phases/13-tools-and-protocols/05-tool-schema-design/docs/en.md)。

从 SKILL.md 中的名称与描述发现技能，再将 routing.json 作为本地路由扩展读取。目录名必须与技能名一致。路由元数据不属于可移植技能格式。

```text
skills/release-review/SKILL.md -> name release-review
routing.json -> keywords,paths,priority,requires,permissions
```

## 构建与检查

使用 parseSkill 校验合并后的记录。解析发现文件前，拒绝符号链接和超大文件。

在学习者工作区实现本阶段。随附命令行辅助程序是调用你的函数的适配器，不会用参考实现替代你的代码。

```bash
python3 scripts/project_test.py skill-router --init learning-artifacts/skill-router
python3 scripts/project_test.py skill-router --stage 1 --path learning-artifacts/skill-router
```

先预测上面的中间状态，再运行本阶段。全新的未实现代码应当失败；参考实现通过不代表你的学习者工作区已经完成。

## 继续探究

目录 release-review 声明名称为 publish 时，应如何处理？
