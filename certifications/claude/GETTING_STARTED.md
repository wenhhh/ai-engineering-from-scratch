# 在 GitHub 上学习 Claude 认证（Learn Claude Certifications From GitHub）

仓库和网站都是完整的学习入口。网站额外提供交互图表和浏览器进度记录。GitHub 则向 AI 编程运行框架（Harness）提供逐步授课所需的课程原文、场景代码、测试、交付物、测验、诊断测评和路径顺序。

## 从 AI 导师开始（Start With an AI Tutor）

克隆仓库，让导师能够运行每个实验和测试：

```bash
git clone https://github.com/rohitg00/ai-engineering-from-scratch.git
cd ai-engineering-from-scratch
```

Claude Code 会自动发现仓库导师。通过以下命令开始：

```text
/claude-certification
```

对于 Codex、Cursor 或其他读取 `SKILL.md` 的本地智能体，请安装可移植课程技能：

```bash
npx skills add rohitg00/ai-engineering-from-scratch
```

然后调用 `/claude-certification`。对于 ChatGPT 或不安装本地技能、不支持斜杠命令的运行框架，请附上或打开本仓库，并粘贴以下提示词（Prompt）：

```text
完整阅读 skills/claude-certification/SKILL.md。用它为我选择 Claude 认证路径、制定学习计划，并使用本仓库中的真实实验、交付物、测验和补救学习内容，每次教我一课。
```

导师会询问你的目标、经验、学习节奏，以及是否要参加该路径的诊断测评。它将进度写入 `CLAUDE-CERTIFICATION.md`，后续会话从该文件继续。每节课都要求你：

1. 用自己的话解释决策；
2. 预测课程场景的结果，并亲自调整场景；
3. 运行仓库中的实验和测试；
4. 构建自己的交付物，或论证其合理性；
5. 通过课程测验；
6. 在继续前补强薄弱的考试领域。

你的作业应放在 `learning-artifacts/claude/` 下，与各课已经完成的参考交付物分开。

## 选择路线（Choose a Route）

| 路径（Track） | 适合人群（Best fit） | 路线（Route） | 诊断测评（Diagnostic） | 全长模拟考试（Full mock） |
|-------|----------|-------|------------|-----------|
| CCAO-F | 从事知识工作、分析、验证及负责任地使用 Claude 的人员 | [9 课路线](tracks/ccao-f.json) | [16 题](assessments/ccao-f/diagnostic.json) | [60 题](assessments/ccao-f/mock-01.json) |
| CCDV-F | 构建 Claude 应用并保障其安全的工程师 | [15 课路线](tracks/ccdv-f.json) | [16 题](assessments/ccdv-f/diagnostic.json) | [53 题](assessments/ccdv-f/mock-01.json) |
| CCAR-F | 需要论证 Claude Code、Agent SDK、API、MCP 及编排方案选择的构建者 | [21 课路线](tracks/ccar-f.json) | [15 题](assessments/ccar-f/diagnostic.json) | [60 题](assessments/ccar-f/mock-01.json) |
| CCAR-P | 负责从需求探索到运营全过程的高级工程师和架构师 | [25 课路线](tracks/ccar-p.json) | [14 题](assessments/ccar-p/diagnostic.json) | [63 题](assessments/ccar-p/mock-01.json) |

路径 JSON 是路线顺序、先修要求覆盖情况、领域权重、学习计划和评估路径的机器可读来源。导师读取该文件，而不是根据通用学习计划猜测。

## 助理路径使用引导式无代码模式（Use Guided No-Code Mode for Associate）

CCAO-F 不要求软件开发经验。课程仍附带 Python 代码，因为确定性验证器（Deterministic validator）能让策略、证据、工作流及评审量规接受测试。导师可以替你运行这些代码，你不必编写代码。

安装或打开导师后，粘贴以下内容：

```text
请以引导式无代码模式带我开始 CCAO-F。替我运行本地验证器，以交互方式教授每个场景，并根据我的决策，帮助我创建属于学习者自己的每份工作流、策略、证据或评审交付物。不要跳过实践或测验，也不要要求我编写 Python。
```

你仍需预测结果、调整场景、论证选择、修改未通过验证的交付物，并参加原创评估。改变的是交互方式，证据标准不变。

## 手动学习一课（Learn One Lesson Manually）

每节认证课程均遵循相同的 GitHub 契约（Contract）：

```text
certifications/claude/lessons/NN-lesson/
├── docs/en.md          完整课程与交互实验推理说明
├── code/main.py        场景运行器、模拟器、评分器或验证器
├── code/tests/         确定性验证
├── outputs/            已完成的参考交付物
└── quiz.json           六道有课程依据的题目及解析
```

从所选路径打开下一课。阅读 `docs/en.md`，预测场景结果，然后运行：

```bash
LESSON=certifications/claude/lessons/27-enterprise-governance-compliance-and-hitl
python3 "$LESSON/code/main.py"
python3 -m unittest discover -s "$LESSON/code/tests" -v
```

第 27 课是治理示例：其中的可运行程序验证策略和人工审核材料包，不会为概念主题生硬添加服务商调用代码。其他课程交付威胁模型、架构决策记录（ADR）、审批流程、证据包、工具循环模拟器、检索增强生成（RAG）报告、API 生命周期实验和综合实践验证器。

将 `outputs/` 用作完成后的示例。在 `learning-artifacts/claude/<exam-code>/<lesson-slug>/` 中创建自己的版本；如果验证器支持，就针对副本运行，并将证据记录到 `CLAUDE-CERTIFICATION.md`。

## 运行完整本地验证套件（Run the Whole Local Verification Suite）

在仓库根目录运行：

```bash
python3 scripts/audit_certifications.py

find certifications/claude/lessons -path '*/code/main.py' -print0 \
  | xargs -0 -n1 env -u ANTHROPIC_API_KEY -u ANTHROPIC_MODEL python3

find certifications/claude/lessons -path '*/code/tests/test_*.py' -print0 \
  | xargs -0 -n1 env -u ANTHROPIC_API_KEY -u ANTHROPIC_MODEL python3
```

除非显式提供凭据，否则第 30 课的真实 Messages API 测试会跳过。默认课程在本地运行，不需要凭据。进行可选的真实网络通信检查时，只通过环境变量提供凭据，并遵循该课说明。绝不要将 API 密钥放进源码、提示词或学习状态文件。

## 在 GitHub 上参加评估（Take Assessments From GitHub）

每条路径声明一份诊断测评和一份原创全长模拟考试。AI 导师可以读取 JSON，逐题组织测评：

- 用一个字母回答 `single` 题；
- 用完整字母集合回答 `multiple` 题；
- 按答案集合完全一致的标准评分，不给部分分；
- 提交前隐藏答案与解析；
- 报告原始百分比及各领域结果；
- 每道错题都沿内部课程引用进行补习。

练习百分比是课程分数，不是 Anthropic 换算分数（Scaled score）、认证凭证或通过保证。

## 同时使用网站（Use the Website Too）

同一套课程也可在 [aiengineeringfromscratch.com/certifications.html](https://aiengineeringfromscratch.com/certifications.html) 学习。网站提供可直接操作的图表、本地浏览器进度、计时器和可视化评估补习。当你希望 AI 导师运行代码、检查交付物并保存详细学习计划时，GitHub 仍是更合适的入口。

本地预览网站时运行：

```bash
node site/build.js
python3 -m http.server 4173 --bind 127.0.0.1
```

打开 `http://127.0.0.1:4173/site/certifications.html`。

## 独立性与发布边界（Independence and Publishing Boundary）

这是独立的社区备考材料，与 Anthropic 无隶属关系，也未获得其背书、赞助或授权。它采用公开目标和原创场景，不包含真实考试试题，不颁发认证，也不保证通过。报名前请核实当前官方指南和资格规则。

认证内容通过 GitHub 和网站发布。实验、评估、路径状态和交互机制本身就是课程，因此有意不将其纳入仓库的 EPUB/PDF 电子书流程。
