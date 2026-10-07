# 本地模型评估执行框架（Local Model Evaluation Harness）

可复现的本地模型响应记录与比较工具，同时呈现覆盖率和置信度误差。

需要 Python 3.10+；先掌握 JSON、比率、排序、百分位数和基本 HTTP。在线记录器还需要一个已在回环地址运行的 OpenAI 兼容模型服务器。核心使用标准库。评分器检查你选择的工作区，绝不会从参考实现中补入缺失行为。

## 构建并运行自己的版本

从仓库根目录初始化一次。新的起始代码按设计应当失败。

```bash
python3 scripts/project_test.py local-model-eval-harness --init learning-artifacts/local-model-eval-harness
python3 scripts/project_test.py local-model-eval-harness --stage 1 --path learning-artifacts/local-model-eval-harness --strict
```

逐阶段完成实现，再运行累计评分器和随附输入驱动程序：

```bash
python3 scripts/project_test.py local-model-eval-harness --all --path learning-artifacts/local-model-eval-harness --strict
cd learning-artifacts/local-model-eval-harness
python3 cli.py samples/input.json --output scorecard.json --html reliability.html
```

驱动程序和离线样本属于随附脚手架，其导入会解析到你的实现。公开输入类型与函数签名位于起始代码及 [API 契约](API.md)中。

## 单独检查参考实现

从仓库根目录执行：

```bash
python3 scripts/project_test.py local-model-eval-harness --all --solution --strict
cd projects/local-model-eval-harness/solution
python3 cli.py samples/input.json --output scorecard.json --html reliability.html
```

## 观察变化

随附的三条预测在覆盖率为 100% 时得到 2/3 的准确率。其 p95 为 200 毫秒，来自明确标注为合成数据的响应记录。record.py 会测量实际回环请求的耗时，并保存执行环境清单。

修改样本副本并再次运行命令。将输入与输出保存在一起，便于他人复现；随附样本是人工编写的教学数据。

## 集成与限制

record.py 写出 cli.py 使用的同一份 {manifest,source,labels,records} 契约。--baseline 只允许比较标签指纹相同的记录；--min-accuracy 提供本地 CI 门禁。

除非适配器另行定义方法，报告中的置信度均由模型自行给出。ECE 会随分箱方式和样本数量变化。本项目不会下载或启动模型，随附样本也不构成硬件基准测试。

要记录已运行的本地服务器，请在完成的工作区中执行：

```bash
python3 record.py samples/cases.json --endpoint http://127.0.0.1:11434/v1/chat/completions --model YOUR_INSTALLED_MODEL --revision YOUR_MODEL_REVISION --hardware YOUR_HARDWARE --output measured.json
python3 cli.py measured.json --baseline samples/input.json --output compared.json
```

比较命令会有意拒绝数据集标签不同的记录。评估模型变更时，应与同一批用例的先前记录比较。

## 阶段

1. [校验预测记录](stages/01-validate-predictions/docs/en.md)
2. [测量规范化精确答案准确率](stages/02-measure-accuracy/docs/en.md)
3. [测量置信度校准](stages/03-measure-calibration/docs/en.md)
4. [同时发布准确率与延迟](stages/04-publish-scorecard/docs/en.md)


## 权威参考资料

[机制与 API 参考](https://docs.python.org/3/library/statistics.html)

## 读取可移植的响应记录

使用 `--predictions predictions.jsonl --labels labels.jsonl --manifest manifest.json` 代替单个输入文件。预测行包含 id、answer、confidence 和 latency_ms；标签行包含 id 和 expected；执行清单包含 model、model_revision、prompt_revision、hardware 和 confidence_method。

添加 `--dataset-audit /path/split-audit.json`，要求提供数据集划分审计器生成的可用凭据，且测试 ID 必须匹配。返回的 dataset_audit_sha256 记录实际使用了哪份审计结果。标签和预测可能独立变化，因此两项检查都很重要。

译注：标签、模型提示、置信度来源、错误和 JSON 指标字段保留原值，以维持评分与集成契约；报告固定表头和帮助已译。随附响应不代表真实本地模型性能。
