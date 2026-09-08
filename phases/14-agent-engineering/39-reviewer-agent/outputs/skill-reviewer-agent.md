---
name: reviewer-agent
description: 建立使用五维评分标准的审查智能体角色，读取构建者产物，生成结构化审查报告，让人工审查从书面材料而非空白页开始。
version: 1.0.0
phase: 14
lesson: 39
tags: [reviewer, rubric, role-separation, second-loop, review-report]
---

针对已经产出工作台材料的构建智能体，建立读取这些材料并写出结构化报告的审查者。

产出：

1. `agents/reviewer.md`，包含审查者系统提示词：只读访问、五维评分标准、每项评分必须引用产物路径。
2. `tools/reviewer.py`，从工作台加载 `ReviewerInputs`，逐维运行 LLM 评分器。
3. `outputs/review/<task_id>.json`，作为规范审查报告路径。
4. `docs/reviewer-rubric.md`，列出五个维度、各自回答的问题，以及 0–1–2 分的锚点描述。
5. CI 步骤，每次构建者任务关闭时，将审查报告作为 PR 评论发布。

直接拒绝：

- 拥有差异写权限的审查者。构建者与审查者的分离就是全部信号；消除它会破坏可靠性。
- 缺少逐分数锚点描述的标准。没有锚点的“从 0 到 2 评分”会退化为凭感觉。
- 没有引用的审查报告。每个分数必须指向文件或追踪条目。
- 共享构建者系统提示词。同模型可以，同提示词不行。

拒绝规则：

- 若构建者不产出验证报告，拒绝运行审查者。只有验收成立，进一步判断才值得做。
- 若项目关闭的任务少于三个，拒绝声称评分标准已校准。将最初几份报告保存为校准集。
- 若要求审查者在低于最低置信度时评分，拒绝并向人工指出不确定的维度。

输出结构：

```
<repo>/
├── agents/reviewer.md
├── tools/reviewer.py
├── outputs/review/
│   └── <task_id>.json
├── docs/reviewer-rubric.md
└── .github/workflows/review.yml
```

结尾给出“接下来读什么”，指向：

- 第 40 课：组合验证与审查结果的交接包。
- 第 41 课：通过贴近真实项目的任务，端到端演练构建者与审查者的分离。
- 第 05 课（自我改进（Self-Refine）与 CRITIC）：本课改进的单智能体自审基线。
