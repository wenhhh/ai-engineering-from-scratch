# 无需模型即可为记录输出评分

**第 2 阶段，共 4 阶段。** Python。预计约 2 小时。

记录与回放让评估器不依赖模型是否可用，也不受采样方差影响。每条响应接受全部检查；只有所有检查都通过，用例才通过。缺失响应视为失败。

字面子串检查按设计区分大小写。规范化大小写或标点会改变断言；确有需要时，应通过独立的检查类型明确执行这些转换。

```figure
pj-prompt-regression-tester-2
```

译注：图表范围：固定比较 JSON 与来源子串两项检查，不执行完整用例列表、响应记录哈希及模型配置校验，也不代替实际门禁的阈值和空集检查。

权威参考：[主要技术参考](https://docs.python.org/3/library/difflib.html)。

## Orchard 用例推演

编码前，复习 [Python 数据结构](https://docs.python.org/3/tutorial/datastructures.html)和[结构化输出](../../../../../phases/11-llm-engineering/03-structured-outputs/docs/en.md)。 先完成[第 1 阶段](../../01-validate-cases/docs/en.md)。

有效 JSON 响应仍可能遗漏来源。逐项为断言评分并保留各项结果，让维护者知道哪项承诺未被满足。

```text
response: {"answer":"ready"}
json -> true
contains("source:") -> false
case passed -> false
```

## 构建与检查

先计算检查列表，再应用 all()。缺失响应不能变成默认通过的空检查列表。

在学习者工作区实现本阶段。命令行辅助代码属于随附适配器，会导入你的函数，不会代入参考实现。

```bash
python3 scripts/project_test.py prompt-regression-tester --stage 2 --path learning-artifacts/prompt-regression-tester
```

先预测上方的中间状态，再运行本阶段。新的占位实现应当失败；参考运行通过不代表你的学习者工作区已完成。

## 继续探究

执行 excludes 检查前先把响应转成小写，会改变针对 API_KEY 的契约吗？
