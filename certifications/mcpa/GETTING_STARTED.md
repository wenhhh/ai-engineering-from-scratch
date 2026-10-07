# 在 GitHub 上学习 MCPA 认证课程（Learn the MCPA Certification From GitHub）

仓库与网站都能承载完整学习过程。网站提供交互图表和浏览器进度；GitHub 则向你的 AI 编程框架提供课程原文、场景代码、测试、交付物、测验、诊断题库和路线顺序，使它能够逐步授课。中文分支应优先读取本地已译内容；下面的克隆及安装示例仍指向上游，执行后获取的内容可能是英文，不能将其视为本中文分支的发布地址。

## 从 AI 导师开始（Start With an AI Tutor）

克隆仓库，让导师能够运行全部实验和测试：

```bash
git clone https://github.com/rohitg00/ai-engineering-from-scratch.git
cd ai-engineering-from-scratch
```

Claude Code 会自动发现仓库中的导师技能。使用以下命令开始：

```text
/mcpa-certification
```

对于 Codex、Cursor 或其他能够阅读 `SKILL.md` 的本地智能体，安装可跨框架使用的课程技能：

```bash
npx skills add rohitg00/ai-engineering-from-scratch
```

然后调用 `/mcpa-certification`。对于 ChatGPT 或其他不安装本地技能、也不支持斜杠命令的框架，附加或打开这个仓库，再粘贴下面的提示词：

```text
完整阅读 skills/mcpa-certification/SKILL.md。按其中的流程帮助我准备
MCPA 认证，创建学习计划，每次教授一课，并使用本仓库的真实实验、
交付物、测验和补强学习流程。
```

导师会询问你的 MCP 经验、学习节奏，以及是否立即参加诊断测评，然后创建 `MCPA-CERTIFICATION.md`，并在之后的会话中从该文件恢复。每一课都要求你：

1. 用自己的话解释决策；
2. 预测并调整课程场景；
3. 运行仓库保存的实验和测试；
4. 构建自己的交付物，或为自己的作品说明理由；
5. 通过课内测验；
6. 在前进之前补强薄弱考试领域。

你的作品应放在 `learning-artifacts/mcpa/` 下，与每课已完成的参考交付物分开保存。

## 学习路线（The Track）

MCPA 只有一条路线，无须从多种认证路线中选择。

| 字段（Field） | 值（Value） |
|-------|-------|
| 考试代码 | MCPA |
| 认证名称 | 模型上下文协议助理认证（Model Context Protocol Associate） |
| 提供方 | Agentic AI Foundation，由 Linux Foundation Training and Certification 提供考试 |
| 级别 | 入门，厂商中立 |
| 协议版本 | 2026-07-28，无状态核心；带来源的概要见[协议简报](research/mcp-2026-07-28-brief.md) |
| 路线 | [34 课学习路线](tracks/mcpa-f.json) |
| 诊断测评 | `assessments/mcpa-f/diagnostic.json` 中的 30 道诊断题 |
| 完整模拟卷 | `assessments/mcpa-f/` 下的 `mock-01.json`、`mock-02.json` 和 `mock-03.json`，三套各 60 题的原创模拟卷 |

路线 JSON 是课程顺序、领域权重及评估路径的机器可读来源。导师应读取它，不能凭通用学习计划猜测路线。

## 使用 MCPA 引导式无代码模式（Use Guided No-Code Mode for MCPA）

MCPA 属于知识考试，不要求软件开发经验。课程仍提供 Python 代码，因为确定性的模拟实现和校验器能够检验协议行为、模式、生命周期及同意授权规则。导师可以代你运行代码，你无须亲自编写。

安装或打开导师后，粘贴以下内容：

```text
以引导式无代码模式带我学习 MCPA。请代我运行本地模拟程序和校验器，
交互式讲解每个场景，并依据我作出的判断，帮助我创建属于自己的交付物。
不要跳过实践或测验，也不要要求我编写 Python。
```

你仍需预测结果、调整场景、说明选择理由、修改未通过的交付物，并参加原创测评。操作方式发生变化，证据标准保持不变。

## 手动学习一课（Learn One Lesson Manually）

每节认证课都遵循相同的 GitHub 文件约定：

```text
certifications/mcpa/lessons/NN-lesson/
├── docs/en.md          完整讲解与交互实验分析
├── code/main.py        场景运行器、模拟器、评分器或校验器
├── code/tests/         确定性验证
├── outputs/            已完成的参考交付物
└── quiz.json           六道有依据且带解析的题目
```

从路线中打开下一课的路径。阅读 `docs/en.md`，先预测场景结果，再运行：

```bash
LESSON=certifications/mcpa/lessons/14-multi-round-trip-requests-and-elicitation
python3 "$LESSON/code/main.py"
python3 -m unittest discover -s "$LESSON/code/tests" -v
```

第 14 课演示多轮往返请求：部署工具返回 `input_required`，通过信息征询请求人工确认，只有重试使用新的请求 id、并原样回传服务器给出的 `requestState` 时，才继续部署。运行器也会展示遭到篡改、过期、重放或被改作其他目标的 `requestState` 如何分别被拒绝。这个概念实验没有为显得技术化而生硬加入服务商 API 代码。其他课程提供模式校验器、发现与缓存运行器、错误通道和生命周期模拟程序、OAuth 流程模型、审计链检查器，以及完整的综合交互校验器。

将 `outputs/` 作为完成示例参考。在 `learning-artifacts/mcpa/<lesson-slug>/` 中创建自己的版本；校验器支持指定副本时，对你的副本运行校验，并把证据记录在 `MCPA-CERTIFICATION.md`。

## 运行完整本地验证套件（Run the Whole Local Verification Suite）

从仓库根目录运行：

```bash
python3 scripts/audit_certifications.py

find certifications/mcpa/lessons -path '*/code/main.py' -print0 \
  | xargs -0 -n1 python3

find certifications/mcpa/lessons -path '*/code/tests/test_*.py' -print0 \
  | xargs -0 -n1 python3

python3 scripts/check_mcpa_wire.py
```

报文检查器导入各课的交互记录，标记不符合 2026-07-28 结构的消息，例如请求的 `_meta` 缺少协议版本或客户端能力、结果缺少 `resultType`、把 `initialize` 等旧版方法当作当前方法，或使用规范未定义的错误码。

每个 MCPA 实验都是仅使用标准库的离线模拟实现，不调用网络 API、不需要密钥，也不包含真实网络报文模式。整套验证按设计在本地完成，无须凭据。运行通过只证明被测试的教学行为，不等于已经实现生产持久化、真实令牌验证或浏览器隔离。

## 在 GitHub 上参加测评（Take Assessments From GitHub）

`mcpa-f` 路线声明一套诊断测评和三套原创完整模拟卷。各模拟卷分别侧重运行场景、报文分析，以及设计与安全取舍。每次重测选用尚未做过的卷子。AI 导师可以读取 JSON，每次呈现一题：

- `single` 单选题回答一个字母；
- `multiple` 多选题回答完整的字母集合；
- 按集合完全一致计分，不给部分分；
- 提交前隐藏答案和解析；
- 报告原始百分比及各领域表现；
- 每道错题都沿内部课程参考链接复习。

练习百分比只反映本课程得分，不能代替官方 MCPA 分数、认证或通过保证。按所保存的官方核验记录，考试题数与及格分数未公布，因此不能由练习结果预测官方结果。中文分支另在同步清单中登记已知勘误：导师应核对相关可见提示，不能把保留的上游错误答案键当作知识依据。

## 也可以使用网站（Use the Website Too）

同一课程的上游网站位于 [aiengineeringfromscratch.com/certification?id=mcpa-f](https://aiengineeringfromscratch.com/certification?id=mcpa-f)。可以在那里操作图表、保存本地浏览器进度、使用计时器和查看可视化错题补强。需要 AI 导师运行代码、检查交付物并保存详细学习计划时，GitHub 更合适；本地中文改动不会自动发布到上游网站。

本地预览网站：

```bash
node site/build.js
python3 -m http.server 4173 --bind 127.0.0.1
```

打开 `http://127.0.0.1:4173/site/certification.html?id=mcpa-f`。

## 独立性与发布边界（Independence and Publishing Boundary）

本课程由独立社区编写，与 Agentic AI Foundation 或 Linux Foundation 无隶属关系，未获其背书、赞助或授权。学习目标依据公开领域、子能力名称和 MCP 规范编写；场景均为原创，不包含真实考试试题，也不颁发认证或保证通过。报名之前，请核对当前官方页面与报考资格规则；汉化不会刷新来源的原核验日期。

认证内容通过 GitHub 和网站发布，有意不纳入仓库的 EPUB/PDF 电子书流程，因为实验、测评、路线状态和交互机制共同构成这套课程。
