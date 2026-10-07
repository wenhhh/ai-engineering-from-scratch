# 评分前校验用例

**第 1 阶段，共 4 阶段。** Python。预计约 2 小时。

评估用例需要稳定的 ID、提示词和一小组断言。结果转换为字典时，重复 ID 会静默覆盖证据。回放任何响应前，先校验 ID 和断言类型。

这里的断言只检查字面文本及 JSON 语法，可用于发现契约变化，但不能证明事实正确或语气合适。应把这些限制与门禁实际执行的检查区分开。

```figure
pj-prompt-regression-tester-1
```

译注：图表范围：固定比较 JSON 与来源子串两项检查，不执行完整用例列表、响应记录哈希及模型配置校验，也不代替实际门禁的阈值和空集检查。

权威参考：[主要技术参考](https://docs.python.org/3/library/difflib.html)。

## Orchard 用例推演

编码前，复习 [Python 数据结构](https://docs.python.org/3/tutorial/datastructures.html)和[结构化输出](../../../../../phases/11-llm-engineering/03-structured-outputs/docs/en.md)。

Orchard 必须返回 JSON 并保留来源定位信息。将 `format-json` 和 `source-link` 保持为不同的用例 ID，因为它们分别对应向调用方承诺的两项行为。比较运行结果前，响应记录先对包括提示词与检查项在内的完整用例列表计算哈希。

```text
case ids: [format-json, source-link]
checks: json; contains("source:")
repeat format-json -> reject before replay
```

## 构建与检查

在校验时构建 ID 集合。查找已记录响应前，先校验每项检查的类型。

在学习者工作区实现本阶段。命令行辅助代码属于随附适配器，会导入你的函数，不会代入参考实现。

```bash
python3 scripts/project_test.py prompt-regression-tester --init learning-artifacts/prompt-regression-tester
python3 scripts/project_test.py prompt-regression-tester --stage 1 --path learning-artifacts/prompt-regression-tester
```

先预测上方的中间状态，再运行本阶段。新的占位实现应当失败；参考运行通过不代表你的学习者工作区已完成。

## 继续探究

只改变提示词措辞。为什么之前的用例哈希必须不再匹配？
