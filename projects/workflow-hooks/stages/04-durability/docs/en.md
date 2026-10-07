# 跨会话持久化规则

**第 4 阶段，共 4 阶段。** Typescript。预计约 2 小时。

将带版本的 JSON 快照写入唯一的同目录临时文件，权限仅限文件所有者，再重命名到目标位置。读者看到旧文件或新完整文件。存储不存在表示空集合；格式损坏则是错误。此快照存储只支持一个写进程，跨进程合并和加锁属于独立扩展。

本阶段的接口边界为 `save, load`。保持前面阶段的行为不变：最终评分器在同一个工作区运行所有阶段。

```figure
pj-workflow-hooks-4
```

## Orchard 示例推演

编码前阅读[TypeScript 对象类型](https://www.typescriptlang.org/docs/handbook/2/objects.html)和[仓库记忆与状态](../../../../../phases/14-agent-engineering/34-repo-memory-and-state/docs/en.md)。先完成[第 3 阶段](../../03-policy/docs/en.md)。

CLI 收集 JSONL 纠正并保存带版本的存储，再由另一个进程重新加载，输出中立的 JSON hook 载荷。它保留证据、支持退役，并在重启后精确保留 API_KEY。

```text
capture -> store.json
approve -> stored state approved
emit -> additional_context plus evidence locators
malformed store -> error, not empty success
```

## 构建与检查

写入唯一的同目录临时文件后重命名。此存储契约只允许单写者；支持同时写入前先增加锁。

在学习者工作区实现本阶段。CLI 辅助程序是随附适配器，导入你的函数，不会替代为参考实现。

```bash
python3 scripts/project_test.py workflow-hooks --stage 4 --path learning-artifacts/workflow-hooks
```

累计阶段通过后，从仓库根目录用原创输入样例运行你的交付物：

```bash
node learning-artifacts/workflow-hooks/cli.ts capture orchard-rules.json projects/workflow-hooks/examples/corrections.jsonl
node learning-artifacts/workflow-hooks/cli.ts inspect orchard-rules.json
```

capture、inspect、approve、retire 和 emit 都是基于文件的命令。emit 返回中立 JSON，包含 additional_context 和可解析的证据；智能体集成必须把该字段映射到其文档规定的 hook 接口。审批必须使用当前摘要。存储带版本、采用原子替换，只支持单写者。

## 继续探究

你的智能体集成如何将 additional_context 映射到文档规定的 hook 消息格式？
