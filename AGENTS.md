# AGENTS.md

本仓库贡献者与 AI 智能体（Agent）的操作手册。提交拉取请求（PR）前，请先阅读。

本仓库是一套课程，不是软件即服务（SaaS）应用。课程内容就是产品。以下规则用于让 523 课在持续维护中保持一致。

> 中文分支说明：以下规范翻译自上游。原文中的认证课程仅提供英文、排除机器翻译等限制描述上游流程；本次用户明确要求的全量中文翻译包含认证内容，以 TRANSLATION.md 为准。本文的命令示例不是执行授权，处理冲突时仍须保护现有改动。

---

## 理念（Philosophy）

523 课，20 个阶段。每种算法都先从原始数学原理实现，再引入框架。你会使用 Python、TypeScript、Rust 或 Julia，手写反向传播（Backpropagation）、分词器（Tokenizer）、注意力机制（Attention mechanism）和智能体循环（Agent loop）。随后通过生产级库运行相同操作，让框架不再是黑箱。“动手实现 / 实际应用（Build It / Use It）”是贯穿课程的主线。每节课都交付一个可复用的交付物（Artifact），可接入日常工作流。

---

## 仓库结构（Repo layout）

```text
phases/
  NN-phase-slug/
    NN-lesson-slug/
      docs/en.md              # 课程讲解
      code/                   # 实现与测试
      quiz.json               # 6 道题
      outputs/                # 可复用交付物：技能 / 提示词 / 智能体 / MCP 服务器
README.md                     # 项目入口，课程数量自动同步
ROADMAP.md                    # 阶段与课程状态
glossary/terms.md             # 权威术语定义
site/
  build.js                    # 解析 README、ROADMAP 与术语表，生成 data.js
  data.js                     # 生成文件，推送 main 时由 CI 重建
certifications/claude/
  program.json                # 项目元数据、来源政策与官方链接
  tracks/*.json               # 考试大纲、按顺序排列的路线与学习计划
  lessons/NN-slug/            # 共用认证课程契约
  assessments/<exam-code>/    # 原创诊断测评与完整模拟考试
scripts/                      # 自动化
.github/workflows/
  curriculum.yml              # 不变条件检查与自动同步工作流
```

---

## 硬性规则（Hard rules）

1. **每个课程目录单独提交。** 不得将多节课合并为一次提交。包含 10 节课的 PR 应有 10 次提交。
2. **约定式提交（Conventional Commits）的标题**不超过 72 个字符，格式为 `feat(phase-NN/MM): <slug>`。提交正文解释原因，而不是重复描述改动。
3. 图表**只使用 Mermaid 或 SVG**，不使用 ASCII / Unicode 线框字符绘图。
4. **每个围栏代码块都必须带语言标签。** 按内容选用 `text`、`json`、`python`、`typescript`、`rust`、`julia`、`bash`、`console`、`mermaid`、`yaml`。
5. **只接受原创实现。** 不在文档、代码注释或提交文字中引用外部课程仓库。RFC、官方规范和学术论文作为权威来源时，应予引用。
6. **遵守依赖白名单（Dependency allowlist）**，详见下方 `Dependencies`。优先使用标准库（Standard library）。
7. **绝不提交生成文件**：`catalog.json` 已由 gitignore 排除；`site/data.js` 由 CI 重建；`package-lock.json` 不纳入版本跟踪。

---

## 依赖（Dependencies）

| 语言 | 允许使用 |
|------------|--------------------------------------------------------------------------|
| Python | `numpy`、`torch`、`h5py`、`zstandard`、`safetensors`、标准库 |
| TypeScript | `hono`、`zod`、`ws`（仅在需要 WebSocket 时）、`@hono/node-server`、Node 20+ 标准库 |
| Rust | 仅标准库，单文件使用 `rustc --edition 2021` |
| Julia | `Random`、`Statistics`、`LinearAlgebra`、`Printf`，均为 Julia 标准库 |

如果某项建议要求使用禁止的依赖，跳过该建议并说明：“为保证教学清晰，继续优先使用标准库。”

---

## 课程契约（Lesson contract）

### docs/en.md 元数据头（Frontmatter）

```markdown
# <标题>

> <一句话引入>

**Type:** <Learn | Build | Reference>
**Languages:** <与 code/ 中 main.* 文件对应的语言，以逗号分隔>
**Prerequisites:** <先修课程，以逗号分隔；没有则填 "None">
**Time:** ~<预计分钟数>

## 学习目标（Learning Objectives）
- <4 至 6 条以动词开头的要点>
```

`**Languages:**` 字段必须与 `code/` 中实际存在 `main.*` 文件的语言一致。

### quiz.json 模式（Schema）

```json
{
  "lesson": "<dir-slug>",
  "title": "<课程标题>",
  "questions": [
    {"stage": "pre",   "question": "...", "options": ["a","b","c","d"], "correct": 0, "explanation": ""},
    {"stage": "check", "question": "...", "options": ["a","b","c","d"], "correct": 1, "explanation": ""},
    {"stage": "check", "question": "...", "options": ["a","b","c","d"], "correct": 2, "explanation": ""},
    {"stage": "check", "question": "...", "options": ["a","b","c","d"], "correct": 1, "explanation": ""},
    {"stage": "post",  "question": "...", "options": ["a","b","c","d"], "correct": 3, "explanation": ""},
    {"stage": "post",  "question": "...", "options": ["a","b","c","d"], "correct": 0, "explanation": ""}
  ]
}
```

必须恰好 6 题：1 道课前题（pre）、3 道检查题（check）和 2 道课后题（post）。`correct` 从 0 开始索引。站点渲染器只识别这一结构；旧版 `q/choices/answer` 模式会静默失败。

干扰选项的长度应与正确选项相近。正确答案明显最长时，读者可能无需掌握知识就猜中答案。`scripts/check_quiz_bias.py --check` 对此设门禁，`scripts/debias_quizzes.py` 用于分散正确选项的位置。

### Claude 认证课程契约（Claude certification contract）

`certifications/claude/lessons/` 下的认证课程遵循与阶段课程相同的文档、测验、图表、依赖及每课独立提交规则。每节认证课程都需要可运行的主文件和至少五个确定性测试（Deterministic test）。学习路线引用稳定的课程路径，使同一节课能够服务多种认证而不重复内容。概念课程也必须包含实践：使用场景运行器、策略评分器、交付物校验器、审批模拟器、威胁模型检查器或证据评分器，而不是生硬拼凑服务商 API 代码。路线也可引用已有 `phases/` 课程作为选修深入内容。

完整对齐标准的认证课程，应采用与优质阶段课程相同的讲解、操作、构建、交付和验证循环。每节认证课程必须包含对应 `Interactive Lab`、`Practice Lab`、`Shipped Artifact`、`Verify It` 和 `Capstone Connection` 的章节；嵌入已注册的 `figure` 交互机制；在 `outputs/` 下交付至少一个文件；并提供带测试的可运行场景、模拟器、评分器或交付物校验器。概念课的代码必须实际检验本课所教的判断能力。不得为了满足“可运行”这一表面要求，添加虚假的 API 集成。治理课程可以采用模拟事故、策略评分器、威胁模型检查、架构决策记录（ADR）校验、审批工作流或证据包评分器。

`program.json` 管理独立课程免责声明、核实日期及官方链接。`prerequisites.json` 管理机器可读的认证课程依赖图。每条必修路线都必须将内部先修课程排在依赖它的课程之前。`tracks/` 中的每个文件管理一份公开考试大纲、精确的领域权重、按顺序排列的课程路线、评估声明及学习计划。考试信息必须来自当前官方指南。产品和模型细节必须注明日期，并对照当前官方文档核实。

诊断测评与模拟考试支持多选题，因此使用独立的评估模式：

```json
{
  "id": "claude-ccar-f-diagnostic",
  "version": 1,
  "track": "claude-ccar-f",
  "kind": "diagnostic",
  "title": "架构师基础诊断测评（Architect Foundations Diagnostic）",
  "timeLimitMinutes": 30,
  "questions": [
    {
      "id": "ccar-f-agent-001",
      "domain": "agentic-architecture-orchestration",
      "objective": "choose-an-orchestration-pattern",
      "type": "single",
      "prompt": "一个信息自足的原创场景……",
      "options": ["a", "b", "c", "d"],
      "correct": [1],
      "explanation": "说明为什么该决策合适，以及其他选项为什么不合适。",
      "references": ["certifications/claude/lessons/16-multi-agent-orchestration-and-delegation"]
    }
  ]
}
```

`correct` 始终为数组。`single` 题恰好包含一个索引，`multiple` 题至少包含两个。题目必须原创，映射到公开考试目标，并提供有实质内容的解析；绝不能复制或尝试重建保密考试内容。练习百分比是原始得分（Raw score），不是 Anthropic 的换算分数（Scaled score），本课程也从不保证通过考试。公开认证页面及课程背景说明还必须声明：这是独立的社区课程，与 Anthropic 无隶属关系，也未获得其背书、赞助或授权。

### AI 原生认证学习模式（AI-native certification learner mode）

用户要求选择、开始、恢复、学习、练习或评估 Claude 认证时，授课前必须阅读并遵守 `skills/claude-certification/SKILL.md`。这适用于 Codex 和其他读取 `AGENTS.md` 的运行框架（Harness）；Claude Code 还会发现 `.claude/skills/` 下对应的包装入口。

在学习模式下，将仓库作为交互式导师使用。阅读所选路线清单，每次讲授路线中的一课，运行其真实场景与测试，要求学习者在 `learning-artifacts/` 下创建自己的交付物，使用仓库保存的测验或评估评分，并将进度保存在 `CLAUDE-CERTIFICATION.md` 中。不得把已签入版本库的参考交付物改作学习者作业。认证课程通过 GitHub 和网站提供，有意排除在电子书生成流水线之外。上游规定它仍仅提供英文，也不进入机器翻译流水线；本次中文分支的例外见页首说明。

### code/

- 使用该语言的标准运行命令，能够端到端执行并以退出码 0 结束。
- 演示必须自行结束，不得无限循环读取标准输入（stdin），也不得因缺少 API 密钥而挂起。
- 文件头部提供 4 至 6 行注释，引用本课 `docs/en.md` 路径，以及使用到的规范或 RFC 来源。

### code/tests/

- 至少 5 个单元测试（Unit test）。
- 使用语言的标准测试运行器执行，例如 `python3 -m unittest discover`、`npx tsx --test`，或 Rust / Julia 内联测试。

---

## 每次 PR 的验证（Per-PR validation）

推送前在本地运行：

```bash
python3 scripts/audit_lessons.py
python3 scripts/audit_certifications.py
python3 scripts/check_readme_counts.py        # 提示性检查，合并时由 CI 修复

# 对每节改动过的课程执行：
cd phases/NN-phase/MM-lesson/code
python3 main.py && python3 -m unittest discover tests -v   # 或其他语言的对应命令
```

CI 门禁（`.github/workflows/curriculum.yml`）：

| 任务 | 触发条件 | 行为 |
|----------------------------------|--------------|-------------------------------------------------------|
| `audit` | 推送及 PR | 运行 `audit_lessons.py`，失败会阻止继续。 |
| `readme-counts-sync`，仅 main | 推送到 main | 重建课程目录并自动修复 README 数量。 |
| `site-rebuild`，仅 main | 推送到 main | 重新运行 `node site/build.js`，提交 `site/data.js`。 |
| `readme-counts-drift` | PR | 仅作提示，合并后 main 自动修正。 |

---

## 自动化契约（Automation contract）

**由 CI 自动处理，不要在 PR 中手动修改：**

| 内容 | 机器人或处理方式 | 时机 |
|----------------------|--------------------------------|---------------------|
| `catalog.json` | 按需重建，已由 gitignore 排除 | 每次 CI 任务 |
| `README.md` 数量 | `readme-counts-sync` | 推送到 main 时 |
| `site/data.js` | `site-rebuild` | 推送到 main 时 |

**由你负责：**

| 内容 | 时机 |
|-------------------------------|------------------------------------------------------------------|
| `README.md` 课程链接行 | 添加新课时，使用链接 `[Title](phases/NN-phase/MM-lesson/)` |
| `ROADMAP.md` 状态 | 将课程标记为完成或进行中（WIP）时 |
| `glossary/terms.md` | 引入被多节课程使用的术语时 |

**常见问题**：合并后，如果 `grep -c 'tree/main/phases/NN-' site/data.js` 返回 0，说明阶段 NN 的 README 条目使用了纯文本，缺少 `[Title](phases/NN-...)` 形式的 Markdown 链接。`site/build.js` 从该链接推导 URL。

---

## 冲突处理（Conflict resolution）

```bash
git fetch origin main
git merge --no-edit origin/main

# 课程目录冲突，仅旧分支可能出现，catalog.json 现已由 gitignore 排除：
git rm catalog.json
git commit --no-edit

# README 数量冲突：
git checkout --theirs README.md
python3 scripts/build_catalog.py
python3 scripts/check_readme_counts.py --fix
git add README.md && git commit --no-edit

# site/data.js 冲突：
git checkout --theirs site/data.js
node site/build.js
git add site/data.js && git commit --no-edit

git push origin <your-branch>
```

分支存在尚未解决的评审评论时，避免执行 `git push --force`。强制推送（Force-push）会使评论脱离原来的代码位置。

---

## 新课程接入（New-lesson onboarding）

```bash
mkdir -p phases/NN-phase-slug/MM-new-lesson/{docs,code/tests,outputs}

# 1. 按上方元数据头格式编写 docs/en.md。
# 2. 编写 code/main.<lang>，添加 4 至 6 行头部注释。
# 3. 编写 code/tests/test_main.*，至少包含 5 个测试。
# 4. 按上方模式编写 quiz.json。
# 5. 可选：若本课交付技能，添加 outputs/skill-<slug>.md。

# 6. 在 README.md 中添加：
#    | MM | [Lesson Title](phases/NN-phase-slug/MM-new-lesson/) | Type | Lang |

# 7. 更新 ROADMAP.md 状态行。

# 8. 在本地验证。

# 9. 原子提交（Atomic commit）：
git add phases/NN-phase-slug/MM-new-lesson README.md ROADMAP.md
git commit -m "feat(phase-NN/MM): add <slug>"
git push -u origin <your-branch>
gh pr create --title "feat(phase-NN/MM): add <slug>" --body "<5-line summary>"
```

`site/data.js` 在合并时重新生成，交给 CI 处理。

---

最近审阅日期：2026-05-27。
