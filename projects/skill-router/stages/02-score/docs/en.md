# 为关键词与仓库路径评分

**第 2 阶段，共 4 阶段。** TypeScript。预计约 2 小时。

每个匹配关键词计两分，每条匹配文件路径计三分。与分数一起返回计分原因。单星号匹配一个路径段，双星号可跨路径段；转义正则表达式标点，并拒绝绝对路径及父目录穿越路径。`**/` 匹配零个或多个完整目录：`**/*.ts` 能匹配 `main.ts`，`src/**/*.ts` 能同时匹配 `src/main.ts` 和 `src/lib/main.ts`。规范化反斜杠，并拒绝 Windows 盘符绝对路径及以斜杠开头的路径。同分时先按优先级、再按 ID 排序，使排名可复现。

本阶段的接口边界为 `matchPath, rank`。保持前面阶段行为不变：最终评分器会针对同一工作区运行所有阶段。

```figure
pj-skill-router-2
```

译注：图表范围：只演示固定 deploy/ 路径和两个候选分数，不执行完整 glob、依赖图或权限遍历；图中使用 Unicode 单词，实际路由分词只识别 ASCII 字母与数字。

## Orchard 示例推演

编码前，复习 [TypeScript 对象类型](https://www.typescriptlang.org/docs/handbook/2/objects.html)和[工具结构定义设计](../../../../../phases/13-tools-and-protocols/05-tool-schema-design/docs/en.md)。先完成[第 1 阶段](../../01-catalog/docs/en.md)。

重复证据不能抬高匹配分数。Orchard 请求重复列出同一条变更路径，但路径分只能计一次。关键词每项计两分，不同的匹配路径每条计三分。

```text
keywords release,replicas -> 4 points
files deploy/orchard.yaml repeated twice -> 3 points
score=7, not 10
```

## 构建与检查

评分前先规范化路径分隔符并去重。每条计分原因都必须对应实际计入的证据。

在学习者工作区实现本阶段。随附命令行辅助程序是调用你的函数的适配器，不会用参考实现替代你的代码。

```bash
python3 scripts/project_test.py skill-router --stage 2 --path learning-artifacts/skill-router
```

先预测上面的中间状态，再运行本阶段。全新的未实现代码应当失败；参考实现通过不代表你的学习者工作区已经完成。

## 继续探究

两条不同的路径规则命中同一个文件，应算作两次独立观察吗？
