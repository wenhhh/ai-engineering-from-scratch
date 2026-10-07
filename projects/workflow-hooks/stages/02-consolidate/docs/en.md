# 统计独立会话

**第 2 阶段，共 4 阶段。** Typescript。预计约 2 小时。

按 scope 及保留大小写、合并空白后的规则文本分组。对事件 ID 去重，拒绝同一 ID 对应不同内容。统计唯一会话，而非事件次数，使重复 hook 投递不能推动规则晋升。每个来源 ID 都保留在候选规则上，最终输出排序，以生成可复现文件。

本阶段的接口边界为 `consolidate`。保持前面阶段的行为不变：最终评分器在同一个工作区运行所有阶段。

```figure
pj-workflow-hooks-2
```

## Orchard 示例推演

编码前阅读[TypeScript 对象类型](https://www.typescriptlang.org/docs/handbook/2/objects.html)和[仓库记忆与状态](../../../../../phases/14-agent-engineering/34-repo-memory-and-state/docs/en.md)。先完成[第 1 阶段](../../01-corrections/docs/en.md)。

重复投递不是独立证据。同一会话中的两条不同纠正，仍只贡献一个支持会话。将引文及定位信息与候选规则放在一起，使来源 ID 后续仍可解析。

```text
events a1,a2 from session A -> sessions=[A]
event b1 from session B -> sessions=[A,B]
rule remains candidate until approval
```

## 构建与检查

根据完整已校验内容对事件 ID 去重。同一 ID 的冲突复用必须失败，不能悄悄覆盖来源证据。

在学习者工作区实现本阶段。CLI 辅助程序是随附适配器，导入你的函数，不会替代为参考实现。

```bash
python3 scripts/project_test.py workflow-hooks --stage 2 --path learning-artifacts/workflow-hooks
```

先预测上述中间状态，再运行本阶段。全新起始代码会失败；参考实现通过不代表你的学习者工作区已经完成。

## 继续探究

为什么 API_KEY 与 api_key 规则应保持为不同候选？
