# 根据明确容限设置发布门禁

**第 4 阶段，共 4 阶段。** Python。预计约 2 小时。

发布规则将测量结果转换为决策。要求最低通过比例，并限制最多可接受的回归数量。先检查阈值取值范围，防止 NaN 或越界值使门禁失效。

空测试集拒绝放行。没有证据与没有失败代表不同情况，不能给出相同的发布结论。输出将测量值与决策放在一起，供人审阅。

```figure
pj-prompt-regression-tester-4
```

译注：图表范围：固定比较 JSON 与来源子串两项检查，不执行完整用例列表、响应记录哈希及模型配置校验，也不代替实际门禁的阈值和空集检查。

权威参考：[主要技术参考](https://docs.python.org/3/library/difflib.html)。

## Orchard 用例推演

编码前，复习 [Python 数据结构](https://docs.python.org/3/tutorial/datastructures.html)和[结构化输出](../../../../../phases/11-llm-engineering/03-structured-outputs/docs/en.md)。 先完成[第 3 阶段](../../03-pair-revisions/docs/en.md)。

发布门禁是可执行策略。三个用例中有一项回归时，即使其他响应有所改善，候选版本也会被阻止。将 JSON 和 Markdown 差异报告保存为持续集成产物。

```text
cases=3; candidate passes=2; regressions=1
minimum pass fraction=1; regression budget=0
decision=block; CLI exit=1
```

## 构建与检查

比较数值前，检查阈值是否有限、测试集是否非空。退出状态必须与报告决策一致。

在学习者工作区实现本阶段。命令行辅助代码属于随附适配器，会导入你的函数，不会代入参考实现。

```bash
python3 scripts/project_test.py prompt-regression-tester --stage 4 --path learning-artifacts/prompt-regression-tester
```

累计阶段通过后，从仓库根目录使用原创样本输入运行你的交付物：

```bash
python3 learning-artifacts/prompt-regression-tester/cli.py projects/prompt-regression-tester/examples/cases.json projects/prompt-regression-tester/examples/baseline.json projects/prompt-regression-tester/examples/candidate.json --out prompt-diff.json --markdown prompt-diff.md
```

随附响应记录是人工编写的测试夹具。工具比较已记录的响应，不会调用模型，也不证明语义正确。JSON 用例文件与响应文件是公开接口。发布门禁阻止放行时，退出码为 1。

## 继续探究

经历一次真实支持事故后，你会添加哪条断言，又如何保留其响应记录的来源？
