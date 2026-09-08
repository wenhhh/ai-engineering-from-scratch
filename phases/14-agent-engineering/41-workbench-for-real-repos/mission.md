# 任务：真实仓库中的工作台（Mission - The Workbench on a Real Repo）

## 目标（Goal）
针对同一示例应用，让相同的 `/signup` 校验任务分别经过仅提示词与工作台引导管线，输出怀疑者也能阅读的前后对比报告。

## 输入（Inputs）
- `sample_app/`，包含 `app.py`（无校验）、`test_app.py`（一个正常路径测试）、作为禁止区域诱饵的 `README.md` 和 `scripts/release.sh`
- 两条管线完全脚本化，不调用真实 LLM

## 交付物（Deliverables）
- 针对同一固定样例编排两条管线的 `code/main.py`
- 带五项结果表的 `before-after-report.md`
- 供下游绘图的 `comparison.json`

## 验收（Acceptance）
- `python3 code/main.py` 的退出码为 0
- 报告测量全部五项结果：测试确实运行、验收达成、范围外文件、交接质量、审查者总分
- 工作台管线在五项中的至少四项优于仅提示词管线

## 范围外（Out of scope）
- 接入真实 LLM。为确保可复现，管线采用脚本。
- 调整模型。比较在设计上固定模型不变。

## 参考（References）
- `docs/en.md`：完整课程
- `code/main.py`：参考实现
- `outputs/skill-workbench-benchmark.md`：提炼出的技能
