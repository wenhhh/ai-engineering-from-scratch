# 执行并评估透明的路由技能

**第 2 阶段，共 4 阶段。** Python。预计约 2 小时。

路由技能是一组有序的合取规则。要求每个词项都匹配，使多词规则比独立关键词集合更具体；首个匹配优先的顺序也是契约的一部分。评估为每个用例保存预测标签和预期标签，避免汇总掩盖具体退化。

```figure
pj-self-improving-skill-loop-2
```

译注：图表边界：只演示两条消息与手填正确性数组，不执行真实候选生成和文件晋升。JavaScript 小写转换不等同于 Python casefold；如 Straße 与 STRASSE，图中可能漏报实现能识别的内容重复。

## 实现边界

```python
def route(text,rules,default='unknown'):
    raise NotImplementedError("Implement the stage contract")
```

权威参考：[参考 1](https://docs.python.org/3/library/hashlib.html)。

## Orchard 示例推演

编码前，阅读 [Python 数据结构](https://docs.python.org/3/tutorial/datastructures.html) 和 [模型评估](../../../../../phases/02-ml-fundamentals/09-model-evaluation/docs/en.md)。先完成[第 1 阶段](../../01-dataset/docs/en.md)。

路由技能是透明的有序列表。一条规则要求所有词项均出现，首个匹配规则获胜。计算准确率前，先记录每个预期／预测对，使错误能够驱动候选提案。

```text
rule terms=[password,reset], label=access
"password reset expired" -> access
"password rejected" -> unknown
```

## 构建并检查

对输入词项执行一次规范化。空词项集绝不能成为匹配一切的规则。

在学习者工作区中实现本阶段。随附的 CLI 辅助代码是适配器，会导入你的函数，不会用参考解答替代它们。

```bash
python3 scripts/project_test.py self-improving-skill-loop --stage 2 --path learning-artifacts/self-improving-skill-loop
```

先预测上面的中间状态，再运行阶段测试。全新的桩代码应当失败；参考实现通过测试不代表你的学习者工作区已完成。

## 接着探究

宽泛的前置规则遮蔽更精确的后置规则时，会发生什么？
