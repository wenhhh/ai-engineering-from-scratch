# 测量规范化精确答案准确率

第 2 阶段，共 4 阶段。开始前阅读[项目先修要求](../../../README.md)；本阶段建立在此前契约之上。

## 本阶段变化

精确答案匹配适用于标签、简短参考答案等受约束输出。只规范化大小写和空白；不要删除事实或标点来抬高分数。

每个带标签条目最多对应一条预测，拒绝未知 id。缺失预测在分母中按错误计入。覆盖率指标说明数据集中实际尝试了多少条目。

## 推演一个具体用例

十个标签中，六条预测正确、两条错误、两条缺失，则准确率为 6/10，覆盖率为 8/10。若除以八，就会奖励系统回避困难用例。

```figure
pj-local-model-eval-harness-2
```

修改实验输入，先自行计算结果，再阅读指标。图表根据这些输入计算；实现是否完成，仍以下方测试为证据。

## 实现契约

按已声明契约实现 `accuracy`。

使用[公开 API 契约](../../../API.md)和带类型的起始签名。核心函数负责返回值；文件输入、参数解析与展示由随附驱动程序负责。

本任务只规范化大小写和重复空白，保留标点与事实。拒绝预期标签映射中不存在的预测 id。

## 验证与检查

从仓库根目录执行一次 `python3 scripts/project_test.py local-model-eval-harness --init learning-artifacts/local-model-eval-harness` 完成初始化，再进行累计评分：

```bash
python3 scripts/project_test.py local-model-eval-harness --stage 2 --path learning-artifacts/local-model-eval-harness --strict
```

在完成契约之前，全新工作区应当失败。完成全部阶段后，使用随附样本运行你的实际交付物：

```bash
cd learning-artifacts/local-model-eval-harness
python3 cli.py samples/input.json --output scorecard.json --html reliability.html
```

## 探究失败边界

对十用例数据集，只记录一个简单且正确的答案。运行评分器前，先预测准确率为 0.1、覆盖率也为 0.1。




## 参考资料

[权威技术参考](https://docs.python.org/3/library/statistics.html)
