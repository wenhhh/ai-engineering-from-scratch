# 将文件工具限制在工作区内

**第 1 阶段，共 4 阶段。** Python。预计约 2 小时。

智能体文件工具必须把路径解释为相对工作区的路径，再解析符号链接后检查是否位于工作区内。字符串前缀不够：/tmp/work-other 虽以 /tmp/work 开头，却属于另一个目录。

这只保护可信本地教学工作区的文件工具路径，不会隔离 Python 测试、阻止并发符号链接竞态或隔离恶意代码。本项目只运行可信夹具。

```figure
pj-tiny-coding-agent-1
```

译注：图表范围：只估算词法补丁条件与固定加法／乘法结果，不读取文件或运行测试，也不验证符号链接、文件权限或进程组超时。实际路径、替换和完成证据以 Python 运行结果为准。

权威来源：[技术参考](https://docs.python.org/3/library/subprocess.html)。

## Orchard 示例推演

编码前，阅读[Python 数据结构](https://docs.python.org/3/tutorial/datastructures.html)和[智能体循环](../../../../../phases/14-agent-engineering/01-the-agent-loop/docs/en.md)。

Orchard 购物篮修复在可信 Python 工作区的可丢弃副本中运行。打开文件前，将每个请求路径解析到该根目录之下。路径看起来位于本地，符号链接却可能将其重定向到工作区之外。

```text
basket.py -> contained existing file
../basket.py -> reject
symlink to external file -> reject
```

## 构建与检查

比较解析后的路径组件，不要比较字符串前缀。工作区由调用方选择，模型响应不能选择新根目录。

在自己的学习者工作区实现本阶段。CLI 辅助程序是随附适配器，导入你的函数，不会替换为参考解答。

```bash
python3 scripts/project_test.py tiny-coding-agent --init learning-artifacts/tiny-coding-agent
python3 scripts/project_test.py tiny-coding-agent --stage 1 --path learning-artifacts/tiny-coding-agent
```

先预测上面的中间状态，再运行本阶段。全新起始代码会失败；参考实现通过，不代表你的学习者工作区已经完成。

## 继续探究

复制可信仓库为什么不能让其中测试自动成为沙箱内代码？
