# 根据证据或预算停止编程循环

**第 4 阶段，共 4 阶段。** Python。预计约 2 小时。

编程智能体交替执行动作和观察结果。这里的规划器使用明确记录的工具调用列表，使循环确定且易于检查。工具会真正编辑文件并运行测试。

每个动作都计入步数预算。测试通过、工具调用无效或预算耗尽时立即停止。之后可由生产模型提供相同类型的动作，而不改变工具执行过程。

```figure
pj-tiny-coding-agent-4
```

译注：图表范围：只估算词法补丁条件与固定加法／乘法结果，不读取文件或运行测试，也不验证符号链接、文件权限或进程组超时。实际路径、替换和完成证据以 Python 运行结果为准。

权威来源：[技术参考](https://docs.python.org/3/library/subprocess.html)。

## Orchard 示例推演

编码前，阅读[Python 数据结构](https://docs.python.org/3/tutorial/datastructures.html)和[智能体循环](../../../../../phases/14-agent-engineering/01-the-agent-loop/docs/en.md)。 先完成[第 3 阶段](../../03-run-real-tests/docs/en.md)。

规划器现在接收每次观察结果。先运行测试，只在失败标记出现时选择随附精确修复，再运行测试。这个透明的规则规划器不声称通过模型创造代码。

```text
test -> AssertionError
proposal marker matches -> patch
test -> OK -> completed
```

## 构建与检查

每次工具返回结果后重新调用规划器。保留每次请求的动作及其观察；规划器放弃或步数耗尽时停止。

在自己的学习者工作区实现本阶段。CLI 辅助程序是随附适配器，导入你的函数，不会替换为参考解答。

```bash
python3 scripts/project_test.py tiny-coding-agent --stage 4 --path learning-artifacts/tiny-coding-agent
```

累计阶段通过后，从仓库根目录运行你的交付物，使用原始样本输入：

```bash
python3 learning-artifacts/tiny-coding-agent/cli.py projects/tiny-coding-agent/examples/workspace projects/tiny-coding-agent/examples/proposals.json --copy-to basket-repair --out repair-trace.json
```

CLI 将可信 Python 工作区复制到新目标，再把其中测试作为本地代码运行。随附提案规划器根据观察到的失败选择预先编写的修复，不会创造补丁。POSIX 进程组超时会停止子孙进程，但内存和输出配额需要操作系统级运行器。

## 继续探究

如何接入模型，同时保留相同的补丁前置条件和完成规则？
