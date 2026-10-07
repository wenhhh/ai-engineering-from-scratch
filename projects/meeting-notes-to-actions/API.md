# 公开实现契约

使用 schema_version 为 1 的 actions.json 凭据，其中包含稳定的行动项 id 和原始来源行。CSV 列为 id、owner、due 和 task，且只包含已批准的行动项。

决策必须是 JSON 对象，将当前行动项 id 映射到 `pending`、`approved` 或 `rejected`。未知或过期 id 会在导出任何交付物之前使整个输入被拒绝。来源行变化会改变 id，因此应重新生成收件箱并再次审阅。再次下载决策文件时，HTML 选择控件会保留已有选择。

ACTION 行作为明确标记的候选项；NAME will TASK by YYYY-MM-DD 是一种保守的建议提取语法。不符合这些语法的非结构化建议保持未分配状态。HTML 审阅不会发布任务或发送消息。

### main.py

```python
def parse_notes(text)
def validate_action(action)
def deduplicate(actions)
def publish(actions, today)
```

阶段测试规定正常结果与应拒绝的输入。不要将学习者实现的导入替换为参考实现。最终阶段还会使用随附输入驱动程序运行你的累计实现。
