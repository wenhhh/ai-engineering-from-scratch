# 自改进技能循环（Self-Improving Skill Loop）

构建从纠错到技能的实验运行器，保留来源、防止泄漏，并支持回退。

留出集隔离必须依据内容和分组，不能只看 ID。两个 ID 不同的工单也可能重复同一条客户消息。先规范化内容并合并相关记录，再将整个连通分量分配到一个分区。

## 从学习者工作区开始

[模型评估](../../phases/02-ml-fundamentals/09-model-evaluation/docs/en.md)、[仓库记忆与状态](../../phases/14-agent-engineering/34-repo-memory-and-state/docs/en.md)、[验证门禁](../../phases/14-agent-engineering/38-verification-gates/docs/en.md)。语言基础：[Python 数据结构](https://docs.python.org/3/tutorial/datastructures.html)。

使用 Python 3.10+ 及其标准库。项目使用文件锁或进程组管理的部分需要 POSIX 环境。

```bash
python3 scripts/project_test.py self-improving-skill-loop --init learning-artifacts/self-improving-skill-loop
python3 scripts/project_test.py self-improving-skill-loop --stage 1 --path learning-artifacts/self-improving-skill-loop
```

## 构建路线

1. [划分标注用例并避免身份泄漏](stages/01-dataset/docs/en.md)
2. [执行并评估透明的路由技能](stages/02-skill/docs/en.md)
3. [仅从开发集错误中提出规则](stages/03-propose/docs/en.md)
4. [晋升前要求独立门禁](stages/04-promotion/docs/en.md)

## 使用自己的输入运行

完成各阶段后，以下命令会用你的工作区代码运行原创 Orchard 示例。将样本路径替换为你自己的文件。

```bash
python3 learning-artifacts/self-improving-skill-loop/cli.py projects/self-improving-skill-loop/examples/support-cases.json --out experiment.json
```

先查看完整参考实现时，将同一命令中的 `learning-artifacts/self-improving-skill-loop` 替换为 `projects/self-improving-skill-loop/solution`。JSON 结果使用 `schema_version: 1`；路径与参数示例明确列出，便于其他工具消费。

## 集成边界

实验从开发数据提出确定性路由规则。显式提供的开发集／留出集会接受内容与分组泄漏审计。晋升需要 --promote-to，以及通过门禁后打印的精确 --approve-digest。旧规则保留在 <destination>.previous 中，供人工回退；这是单写入方文件工作流。

```bash
python3 scripts/project_test.py self-improving-skill-loop --all --solution --strict
python3 scripts/project_test.py self-improving-skill-loop --all --path learning-artifacts/self-improving-skill-loop --strict
```

第一条命令检查参考实现，第二条检查你的实现。公开示例与测试属于回归证据，不构成生产认证，也不是未公开的基准测试。


`--dataset-audit audit.json` 选项读取数据集划分审计器的带版本 `partitions.train` 和 `partitions.test` 记录，保留标签与来源，并在本地重新检查泄漏。`--export-skill orchard-routing` 写出新的草稿 `SKILL.md` 和 `references/rules.json`，不会安装或激活候选技能。

译注：输入标签、规则、审批摘要及导出的 SKILL.md 行为指令保留原值，中文说明不改变代理消费的指令。第 1 阶段开头沿用“按 ID 哈希”的上游概述，当前实现实际先按内容／分组形成连通分量，再用分量内最小内容指纹分区。分区隔离不会删除同一分区中的重复记录；propose 仍逐记录计数，重复内容可能抬高支持数，不能把 min_support 自动理解为独立样本数。
