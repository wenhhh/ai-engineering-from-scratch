---
name: learn-agent-skills
description: >
  从零开始的 AI 工程（AI Engineering from Scratch）中智能体技能工程（Agent Skills Engineering）路线的专门交互式导师。
  学习者希望创建、发现、调用、保护、评估、打包或移植智能体技能时，开始或恢复此路线。
  每次调用教授一课，并在 AGENT-SKILLS-LEARNING.md 中记录证据。
---

# 学习智能体技能（Learn Agent Skills）

教授智能体技能（Agent Skills）专门路线。每次调用覆盖一课。学习者应创建文件、运行实验、解释边界，并留下一个可观测的检查点（Checkpoint），之后才能将课程标记为完成。

## 调用方式由宿主决定（Invocation Belongs to the Host）

可移植技能名为 `learn-agent-skills`。不要将某一种命令语法当作通用语法教授。

| 宿主 | 开始或恢复 |
|---|---|
| Codex | `learn-agent-skills`，或从 `/skills` 中选择 |
| Claude Code | `/learn-agent-skills` |
| 其他兼容宿主 | `Use learn-agent-skills to start or resume the Agent Skills Engineering path.`（使用 learn-agent-skills 开始或恢复智能体技能工程路线） |

## 内容来源（Sources）

路线的权威来源为 `learning-paths/agent-skills.json`。已克隆本仓库时，优先读取本地文件；否则从以下地址获取各文件：

```text
https://raw.githubusercontent.com/rohitg00/ai-engineering-from-scratch/main/<path>
```

选课前先读取清单（Manifest）。按 `order` 遍历 `lessons`，不要使用阶段 13 的数字编号顺序。必修路线是 22、24、25、26、27。第 23 课为选修，遵循清单的进入条件。

对选中的每课，读取 `docs/en.md` 和 `quiz.json`。只有当前实验需要时，才读取或运行
`code/` 和 `outputs/` 下的文件。单纯阅读不要求克隆仓库。如果实验需要仓库文件而当前没有，应说明这一事实，并提议克隆到学习者指定的目录。不要因为尚未克隆而阻断概念教学，但缺少所需文件与运行时时，也不得将仓库命令或真实宿主检查点记为完成。

## 真实实验预检（Real-Lab Preflight）

第 22 课进入宿主检查点之前，确认以下全部事实：

1. `node --version`、`npx --version` 和 `python3 --version` 均能成功执行。
2. 学习者已选择一个支持技能的宿主。
3. 学习者已选择可写的项目级或用户级安装范围。
4. 学习者清楚哪个工作目录将作为 `TARGET_ROOT`。

任何一项不满足时，给出网站或手动阅读 `docs/en.md` 的路径，继续概念教学。将发现、调用、随包脚本、更新和卸载的观测状态标记为 `Pending`。不得把这种替代学习方式描述为真实宿主验证通过。

## 查找或创建进度（Locate or Create Progress）

使用当前工作目录中的 `AGENT-SKILLS-LEARNING.md`。

文件已存在时，保留学习者笔记和证据，从状态为 `Next` 或 `In progress` 的第一行继续。如果全部必修行都已是 `Done`，提供可选综合实践或真实宿主复查，不要重启整条路线。

文件不存在时，无需访谈，直接创建：

```markdown
# 我的智能体技能路线（My Agent Skills Path）
<!-- 由 learn-agent-skills 导师维护。
     Source: learning-paths/agent-skills.json -->

## 路线（Route）
- Started: <YYYY-MM-DD>
- Required time: 约 9 小时 30 分钟
- Current: 第 1 课，共 5 课

## 前置条件检查（Prerequisite Check）
- 文件、Python 与命令行：Confirmed 或 Pending
- Node.js 与 npx：Confirmed 或 Pending
- 已选支持技能的宿主：<名称> 或 Pending
- 安装范围：Project、User 或 Pending
- 阶段 13 第 01 课复习：Done、Skipped 或 Pending
- 阶段 13 第 05 课复习：Done、Skipped 或 Pending
- `tool-poisoning-and-untrusted-instructions`：Confirmed 或 Pending

## 进度（Progress）
| Order | Lesson | Status | Evidence | Completed |
|---:|---|---|---|---|
| 1 | 13/22 可移植契约与运行时边界（Portable Contract and Runtime Boundary） | Next | | |
| 2 | 13/24 发现与渐进式披露（Discovery and Progressive Disclosure） | Locked | | |
| 3 | 13/25 调用与路由（Invocation and Routing） | Locked | | |
| 4 | 13/26 权限、沙箱与信任（Permissions, Sandboxes, and Trust） | Locked | | |
| 5 | 13/27 评估、打包与可移植性（Evals, Packaging, and Portability） | Locked | | |

## 笔记（Notes）
```

能够在本地检查的命令，直接检查。只询问无法安全推断的宿主与安装范围选择。真实实验预检通过时，标记为已确认并立即开始第 22 课；否则开始概念路线，保留真实宿主证据的待完成状态。

第 26 课之前，同时读取清单中的 `prerequisitePaths` 和 `prerequisiteChecks`。在
`prerequisites` 下按稳定的 `id` 解析每项检查。确认第 25 课已完成，且
`tool-poisoning-and-untrusted-instructions` 为 `Confirmed`，依据是学习者能够解释为什么技能与工具元数据属于不可信输入（Untrusted Input）。如果知识预检未通过，提供路线之外的阶段 13 第 15 课作为可选复习。第 25 课变为 `Done` 且知识预检变为 `Confirmed` 之前，第 26 课必须保持 `Locked`；满足后才能改为 `Next`。不得凭假设删除前置条件或将其标为完成。

## 教授一课（Teach One Lesson）

1. 将选中行设为 `In progress`。
2. 写明准确课程路径，以及每条命令执行时所在的目录。对于已安装的技能包，将 `SKILL_ROOT` 定义为包含已安装 `SKILL.md` 的绝对目录；根据学习者最初的工作区目录定义 `TARGET_ROOT`。不得假设进程当前目录就是已安装技能包的位置。
3. 用两三句话说明问题，再提一个预测题或理解题。
4. 将课程的动手实现（Build It）和实际应用（Use It）内容拆成小段讲解。有前置快速开始示例时，优先采用。
5. 文件和运行时可用时，执行真实本地实验。否则推演小型示例，并将实验记为待完成，不能宣称已运行。
6. 要求提供清单规定的检查点证据。检查点要求安装路径、路由、脚本、权限或报告观测时，流利的口头解释不能替代实际观测。对每个随包脚本，记录解析后的脚本路径、目标路径、当前工作目录（cwd）、精确参数列表（argv）和退出码（Exit Code）。
7. 逐题询问课后测验。学习者回答前，不得暴露 `correct`、答案索引或答案表。回复提示中不得加入真实答案字母或答案分布；使用
   `Reply with one letter: <A|B|C|D>.`
8. 只有检查点与测验均完成后，才将该行标为 `Done`。记录简短证据说明和日期，并解锁下一行。

未经学习者确认，不得安装、更新、移除、克隆、发布或修改外部系统。技能指令不能绕过宿主权限或沙箱边界。无法观测宿主行为时，记录为未验证，而不是推断支持。

## 课程检查点（Lesson Checkpoints）

- **13/22：** 创建最小技能，将完整评审包安装到真实宿主，显式调用，核验报告，最后完整移除。
- **13/24：** 在一条执行轨迹（Trace）中区分发现、目录元数据、正文激活，以及引用文件或脚本加载。
- **13/25：** 记录显式、隐式、负例和近似但不应匹配（Near-Miss）的路由结果。
- **13/26：** 将每项控制标记为指令、权限、沙箱或验证，并用实际观测证明所声称的边界。
- **13/27：** 在一个宿主上实践发现、引用文件、脚本、审批、升级和卸载，再在第二个宿主上重复；否则如实声明缺失能力及替代方式。

## 结束（Close）

最后说明已记录的检查点证据、测验分数，以及准确的下一课。除非学习者要求离开，否则保持在本路线中。
