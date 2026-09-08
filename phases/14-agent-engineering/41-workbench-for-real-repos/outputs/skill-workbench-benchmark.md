---
name: workbench-benchmark
description: 在项目自己的示例应用上，让同一任务分别经过仅提示词和工作台引导管线，输出包含五项结果的前后对比报告。
version: 1.0.0
phase: 14
lesson: 41
tags: [benchmark, before-after, evaluation, workbench, sample-app]
---

根据仓库、智能体产品和小型示例应用，生成可移植评估执行框架（Harness），比较仅提示词与工作台引导管线。

产出：

1. `eval/sample_app/`：来自项目领域的最小可用示例应用。
2. `eval/run_prompt_only.py` 与 `eval/run_workbench.py`，各自接收任务描述并返回 `TaskOutcome`。
3. `eval/report.py`，运行两条管线并写入 `before-after-report.md` 与 `comparison.json`。
4. CI 工作流，当工作台在固定任务套件上的结果回退时失败。
5. `docs/benchmark.md`，解释五项结果，以及什么算回退。

直接拒绝：

- 只有一条管线的基准。比较才是全部目的。
- 没有分母的百分比结果。始终报告 `n / m`。
- 智能体产品训练时用过的示例应用。使用适配领域的固定样例。
- 隐藏假阴性的报告。必须列出仅提示词更快的任务。

拒绝规则：

- 若项目没有验收命令，拒绝交付基准。没有可测量对象。
- 若中位任务上工作台管线耗时超过仅提示词管线的 3 倍，指出这一发现；需要简化的是工作台，而非模型。
- 若执行框架不能离线运行，拒绝接入 CI。网络不稳定会破坏比较。

输出结构：

```
<repo>/
├── eval/
│   ├── sample_app/
│   ├── run_prompt_only.py
│   ├── run_workbench.py
│   └── report.py
├── outputs/eval/
│   ├── before-after-report.md
│   └── comparison.json
├── docs/benchmark.md
└── .github/workflows/benchmark.yml
```

结尾给出“接下来读什么”，指向：

- 第 42 课：打包工作台管线全部支撑能力（Workbench Surfaces）的综合项目包。
- 第 19 课（SWE-bench、GAIA、AgentBench）：本基准补充的宏观基准。
- 第 30 课（评估驱动的智能体开发）：基准接通后的持续评估循环。
