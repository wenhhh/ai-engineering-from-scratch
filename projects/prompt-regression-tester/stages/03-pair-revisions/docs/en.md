# 跨修订版比较相同用例

**第 3 阶段，共 4 阶段。** Python。预计约 2 小时。

平均值可能掩盖严重退化。按用例 ID 配对修订版，将各项标为改善、退化、持续通过或持续失败。一个新成功不能抵消一项已丢失的必需行为。

两个修订版使用相同用例列表。忽略响应记录中的额外键，缺失键则判为失败。因此，即使一份记录任务没有完成，也能在不虚构结果的前提下比较修订版。

```figure
pj-prompt-regression-tester-3
```

译注：图表范围：固定比较 JSON 与来源子串两项检查，不执行完整用例列表、响应记录哈希及模型配置校验，也不代替实际门禁的阈值和空集检查。

权威参考：[主要技术参考](https://docs.python.org/3/library/difflib.html)。

## Orchard 用例推演

编码前，复习 [Python 数据结构](https://docs.python.org/3/tutorial/datastructures.html)和[结构化输出](../../../../../phases/11-llm-engineering/03-structured-outputs/docs/en.md)。 先完成[第 2 阶段](../../02-score-recordings/docs/en.md)。

候选版本修复了来源标注，却用友好的自然语言替代机器可读的 JSON。计算平均值前先配对用例 ID：一项改善无法修复另一个损坏的接口。

```text
format-json: pass -> fail = regressed
source-link: fail -> pass = improved
aggregate pass rate: unchanged
```

## 构建与检查

在响应旁保留模型、设置和用例哈希。模型或设置改变时，命令行程序会拒绝比较，除非你明确允许这种实验。

在学习者工作区实现本阶段。命令行辅助代码属于随附适配器，会导入你的函数，不会代入参考实现。

```bash
python3 scripts/project_test.py prompt-regression-tester --stage 3 --path learning-artifacts/prompt-regression-tester
```

先预测上方的中间状态，再运行本阶段。新的占位实现应当失败；参考运行通过不代表你的学习者工作区已完成。

## 继续探究

面对通过率不变的结果，应如何向依赖 JSON 输出的程序负责人解释？
