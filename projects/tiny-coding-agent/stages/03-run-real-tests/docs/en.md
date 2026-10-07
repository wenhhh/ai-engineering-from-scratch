# 通过唯一允许的命令运行真实测试

**第 3 阶段，共 4 阶段。** Python。预计约 2 小时。

测试工具控制自己的 argv，模型文本绝不转成 shell 命令。使用当前 Python 解释器执行 unittest 发现，关闭交互标准输入，捕获输出并限制超时。

即使 unittest 退出零，零测试或含跳过测试的测试集仍算失败。从 stderr 读取最终 unittest 摘要；夹具向 stdout 打印的文字不构成运行器证据。工具运行可信 Python，因此路径限制本身不是操作系统安全边界。

```figure
pj-tiny-coding-agent-3
```

译注：图表范围：只估算词法补丁条件与固定加法／乘法结果，不读取文件或运行测试，也不验证符号链接、文件权限或进程组超时。实际路径、替换和完成证据以 Python 运行结果为准。

权威来源：[技术参考](https://docs.python.org/3/library/subprocess.html)。

## Orchard 示例推演

编码前，阅读[Python 数据结构](https://docs.python.org/3/tutorial/datastructures.html)和[智能体循环](../../../../../phases/14-agent-engineering/01-the-agent-loop/docs/en.md)。 先完成[第 2 阶段](../../02-apply-exact-patches/docs/en.md)。

声明修复成功前，运行真实 unittest 测试。原始购物篮示例的 total(7,3) 返回 10 而非 21，total(7,0) 返回 7 而非 0。应用补丁后，这两个失败都应消失。

```text
before: 2 failed assertions
after: 2 executed tests, OK
zero tests or skipped tests -> not success
```

## 构建与检查

从 stderr 读取最终 unittest 摘要，要求实际测试数量大于零。在 POSIX 上，测试期限到达时停止整个进程组。

在自己的学习者工作区实现本阶段。CLI 辅助程序是随附适配器，导入你的函数，不会替换为参考解答。

```bash
python3 scripts/project_test.py tiny-coding-agent --stage 3 --path learning-artifacts/tiny-coding-agent
```

先预测上面的中间状态，再运行本阶段。全新起始代码会失败；参考实现通过，不代表你的学习者工作区已经完成。

## 继续探究

为什么打印的“Ran 999 tests”不能被当作测试证据？
