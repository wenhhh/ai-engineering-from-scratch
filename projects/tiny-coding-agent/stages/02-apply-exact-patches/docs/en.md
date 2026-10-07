# 按前置条件应用精确补丁

**第 2 阶段，共 4 阶段。** Python。预计约 2 小时。

补丁是对当前文件的断言，不是盲目覆盖指令。要求旧文本恰好出现一次。模型猜中了过期代码或含糊片段时，应拒绝补丁并保留文件。

在同一目录的临时文件写入替换内容，保留目标权限位，然后原子替换目标。这样既避免写入中途失败留下半个源文件，也让可执行脚本继续可执行。

```figure
pj-tiny-coding-agent-2
```

译注：图表范围：只估算词法补丁条件与固定加法／乘法结果，不读取文件或运行测试，也不验证符号链接、文件权限或进程组超时。实际路径、替换和完成证据以 Python 运行结果为准。

权威来源：[技术参考](https://docs.python.org/3/library/subprocess.html)。

## Orchard 示例推演

编码前，阅读[Python 数据结构](https://docs.python.org/3/tutorial/datastructures.html)和[智能体循环](../../../../../phases/14-agent-engineering/01-the-agent-loop/docs/en.md)。 先完成[第 1 阶段](../../01-confine-paths/docs/en.md)。

补丁明确声明要替换的内容。出错的购物篮函数没有将单价乘以数量，而是返回 price + quantity。仅当该表达式出现一次时才替换。

```text
old: price + quantity
new: price * quantity
occurrences=1 -> write; occurrences=0 or 2 -> reject
```

## 构建与检查

打开临时输出文件前先统计精确匹配次数。替换原文件时保留权限。写入前保存临时路径，并在 `finally` 中移除临时文件，包括写入、关闭或替换失败时。在替换成功前，原文件保持不变。

在自己的学习者工作区实现本阶段。CLI 辅助程序是随附适配器，导入你的函数，不会替换为参考解答。

```bash
python3 scripts/project_test.py tiny-coding-agent --stage 2 --path learning-artifacts/tiny-coding-agent
```

先预测上面的中间状态，再运行本阶段。全新起始代码会失败；参考实现通过，不代表你的学习者工作区已经完成。

## 继续探究

规划器提出补丁后，另一位编辑者先修好了文件，此时应该怎样处理？
