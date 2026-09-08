# 智能体技能：可移植契约与运行时边界（Agent Skills: Portable Contract and Runtime Boundary）

> 技能不是换了个更好文件名的长提示词。它是可发现的指令、资源和可执行辅助程序包，通过运行时契约进入智能体上下文。

**Type:** Build
**Languages:** Python (stdlib)
**Prerequisites:** Phase 13 · 01（工具接口），Phase 13 · 05（工具模式设计）
**Time:** ~90 分钟

## 学习目标（Learning Objectives）

- 定义智能体技能，不将其与提示词、仓库指令、工具、钩子、子智能体或插件混淆。
- 阅读可移植 `SKILL.md` 契约，并与运行时专属扩展分离。
- 将发现、选择、激活、资源加载、工具使用和验证解释为不同生命周期阶段。
- 在运行时将技能放入智能体目录之前验证技能包。
- 为具体任务在技能、MCP 工具、钩子、子智能体或普通代码之间选择。

## 十分钟首次成功（Ten-Minute First Success）

先做这一步，再读长篇解释。你将创建小型技能，把完整审查器包安装到真实智能体宿主，调用它、验证结果，再移除它。通过可观察结果证明生命周期。

### 真实宿主实验的预检（Preflight for the real-host lab）

真实宿主检查点需要 Node.js、`npx`、Python 3、一个选定的支持技能的宿主，以及安装器所选项目或用户范围的写权限。先验证本地命令：

```bash
node --version
npx --version
python3 --version
```

安装前决定使用哪个宿主和范围。如果任何要求不可满足，在网站阅读本课，或继续下面手动包练习。该回退能教授契约，但不能证明宿主发现、调用、包内脚本执行或卸载行为。将这些观察保持标为待验证。

### 1. 从空工作目录开始（Start in an empty working directory）

在保存学习工作的任意父目录运行：

```bash
mkdir -p agent-skills-first-run
cd agent-skills-first-run
TARGET_ROOT="$(pwd -P)"
printf 'TARGET_ROOT=%s\n' "$TARGET_ROOT"
ls -A
```

最后一条命令应无输出。如果打印文件，选择另一个空目录，让审查具有明确边界。

为首个技能创建目录：

```bash
mkdir -p my-first-skill
```

创建 `my-first-skill/SKILL.md`，内容如下：

```markdown
---
name: my-first-skill
description: 当用户要求记录技术决策时，将粗略会议笔记转为紧凑的决策记录。
---

# 决策记录（Decision record）

提取决策、上下文、替代方案、负责人和下次复审日期。
如果笔记没有决策，提出一个澄清问题，不要编造。
```

验证文件创建在预期目录：

```bash
test -f my-first-skill/SKILL.md
```

无输出且退出码为 0，表示文件存在。

### 2. 安装完整审查器包（Install the complete reviewer bundle）

留在 `agent-skills-first-run` 并运行：

```bash
npx skills add rohitg00/ai-engineering-from-scratch --skill skill-contract-reviewer --full-depth
```

选择正在使用的智能体宿主和范围。安装器应列出 `skill-contract-reviewer` 和写入目的地。`--full-depth` 必需，因为本课技能是含参考资料、脚本和资产的嵌套包。

将 `SKILL_ROOT` 设为安装器报告的绝对目录。它必须是包含已安装 `SKILL.md` 的目录，不是课程源目录，也不是当前工作区：

```bash
# Replace the placeholder with the destination printed by the installer.
SKILL_ROOT="$(cd "/absolute/path/to/skill-contract-reviewer" && pwd -P)"
test -f "$SKILL_ROOT/SKILL.md"
printf 'SKILL_ROOT=%s\n' "$SKILL_ROOT"
```

若智能体会话已打开，启动新会话或使用宿主的技能重新扫描命令。不要假定每个宿主都会热加载目录。

### 3. 显式调用（Invoke it explicitly）

在已安装技能的智能体中，以 `agent-skills-first-run` 为工作目录，使用该宿主支持的语法：

| 宿主 | 显式调用 |
|---|---|
| Codex | `skill-contract-reviewer`，或从 `/skills` 选择它，再提供审查请求 |
| Claude Code | `/skill-contract-reviewer` 后跟审查请求 |
| 可移植回退 | `Use skill-contract-reviewer to review the target package.` |

请求中使用打印出的 `SKILL_ROOT` 和 `TARGET_ROOT` 绝对值。要求宿主在执行前展开，并展示精确解析命令，而非依赖进程工作目录的命令：

```text
使用 skill-contract-reviewer 审查 <TARGET_ROOT>/my-first-skill。已安装包根目录为 <SKILL_ROOT>。运行 python3 <SKILL_ROOT>/scripts/check_skill.py <TARGET_ROOT>/my-first-skill。运行前展示完整解析后的 argv。返回验证报告、选定原语，以及每项选择的一句理由。将解析后的脚本路径、目标路径、cwd、argv 和退出码作为执行证据。
```

解析后的命令应具有以下结构，不再有占位符：

```bash
python3 "/absolute/install/path/skill-contract-reviewer/scripts/check_skill.py" \
  "/absolute/workspace/path/agent-skills-first-run/my-first-skill"
```

成功结果具有三个属性：

1. 宿主按名称找到 `skill-contract-reviewer`。
2. 审查器读取包契约并运行包内验证器。
3. 响应包含对示例没有结构错误的验证报告，以及有理由支持的原语选择。

执行证据还必须列出脚本路径、目标路径、cwd、精确参数向量和退出码。没有这些字段，再流畅的报告也不能证明已安装的配套脚本运行过。

若宿主报告技能不可用，核实安装目的地，重新扫描或重启一次，再重试显式请求。不要重写技能描述来掩盖安装失败。

### 4. 探测隐式选择（Probe implicit selection）

开始新的智能体轮次，输入相同任务，但不点名技能：

```text
将 <TARGET_ROOT>/my-first-skill 作为可复用智能体包审查，并告诉我其包契约是否有效。
```

若宿主公开选定技能，记录是否选择了 `skill-contract-reviewer`。若宿主不公开路由，将隐式选择标为未验证。显式调用是可移植回退。

### 5. 清理（Clean up）

仅移除已安装审查器包：

```bash
npx skills remove skill-contract-reviewer
```

选择安装时相同宿主和范围。重新扫描或新建会话后，显式请求 `skill-contract-reviewer` 应报告不可用。保留 `my-first-skill` 用于后续课程，或完成学习轨道后移除实验目录。

## 问题（The Problem）

假设团队有可靠发布流程：查找已合并变更，检查迁移说明，更新变更日志，运行打包命令，生成审查清单。

将流程放进一个提示词易于粘贴，却难以运营。提示词没有稳定身份、发现规则、资源边界、可测试包结构，也无法回答基本问题：谁能调用？模型何时选择？可运行哪些脚本？哪些文件可信？上下文压缩后保留什么？

相反的错误是把每条可复用指令都当技能。仓库约定、确定性自动化、外部工具、事件钩子和委托智能体解决不同问题。将它们全部塞进 `SKILL.md`，会产生看似可移植、实际依赖某宿主未文档化行为的目录。

首要工程任务是分类。在决定如何打包之前，先决定制品是什么。

## 概念（The Concept）

### 技能编码过程性知识（Skills encode procedural knowledge）

智能体技能是以 `SKILL.md` 为入口的目录。入口文件包含 YAML 前置元数据（frontmatter），随后是 Markdown 指令。目录还可包含参考资料、脚本和资产。

```figure
skill-package-anatomy
```

可部署单元是目录，而非单独 Markdown 文件。只复制 `SKILL.md` 却缺少参考资料，即使前置元数据可解析，也是损坏的包。

### 相邻抽象（The neighboring abstractions）

| 制品 | 主要职责 | 何时加载或运行 | 不应冒充什么 |
|---|---|---|---|
| 提示词（Prompt） | 塑造一次模型交互 | 应用或用户将其包含进来时 | 带资源的版本化包 |
| 仓库指令（Repository instructions） | 解释一个代码库的常驻规则 | 编码运行时进入该范围时 | 可复用任务流程 |
| 智能体技能（Agent skill） | 提供可复用过程性知识 | 显式或隐式激活时 | 硬授权边界 |
| MCP 工具（MCP tool） | 公开类型化远程能力 | 模型或应用调用时 | 详细操作规程 |
| 钩子（Hook） | 在事件上运行确定性逻辑 | 声明的事件发生时 | 概率性的模型路由 |
| 子智能体（Subagent） | 通过独立上下文和状态委托工作 | 编排器创建或调用时 | 静态指令包 |
| 插件（Plugin） | 分发更大的运行时扩展 | 宿主安装或启用时 | 可移植技能契约本身 |
| 学习型技能库（Learned skill library） | 存储通过经验发现的行为 | 策略检索先前程序或轨迹时 | 基于标准的 `SKILL.md` 包 |

发布技能告诉智能体如何检查发布。MCP 服务器公开发布注册表。钩子禁止直接推送。子智能体独立审计候选版本。它们保留不同责任，因此可组合。

### “技能”一词代表两种不同理念（The word "skill" names two different ideas）

研究系统有时将学得的程序、成功轨迹或环境特定策略片段称为技能。智能体可在探索中创建这些制品，按任务相似性检索、执行，并根据反馈修订技能库。Phase 14 · 10 构建这种终身学习库。

本迷你轨道的 Agent Skill 不同。它是人为编写的包，具有声明的文件系统契约、目录元数据、渐进披露、运行时调解调用和宿主控制的工具。它可由智能体生成或改进，但格式不要求学习过程。

| 维度 | Agent Skill 包 | 学习型技能库 |
|---|---|---|
| 主要单元 | `SKILL.md` 目录 | 程序、策略、轨迹或记忆记录 |
| 创建 | 编写、生成或整理 | 通常从环境经验发现 |
| 选择 | 目录描述加运行时策略 | 针对任务状态的检索或策略 |
| 执行 | 模型遵循指令并调用宿主工具 | 环境运行已存行为或代码制品 |
| 可移植性 | 包契约可跨兼容宿主 | 常绑定单一环境和动作空间 |
| 评估 | 路由、制品、安全和宿主兼容性 | 奖励、成功率、迁移和库增长 |

两种理念都打包可复用能力，但不能仅因同名就共享实现主张。

### 可移植核心（The portable core）

Agent Skills 规范要求两个前置元数据字段：

```yaml
---
name: release-readiness
description: 当用户询问某版本是否准备好发布时，检查发布候选版本。
---
```

`name` 是稳定标识符，必须满足规范命名规则并匹配父目录。`description` 既是文档也是路由元数据，应说明技能做什么、何时适用。

可移植可选字段：

| 字段 | 用途 | 可移植性说明 |
|---|---|---|
| `license` | 声明包条款 | 核心规范 |
| `compatibility` | 声明环境要求 | 核心规范 |
| `metadata` | 携带字符串值扩展数据 | 核心规范 |
| `allowed-tools` | 建议预批准工具 | 实验性；宿主支持不同 |

Markdown 正文保存操作指令，应定义流程、决策点、失败行为和支持资源的直接路径。

```markdown
# 发布就绪检查（Release readiness）

将此流程用于发布候选版本，不用于普通开发构建。

1. 阅读 `references/release-policy.md`。
2. 运行 `python3 scripts/inspect_release.py --format json`。
3. 报告包含阻塞失败时停止。
4. 根据 `assets/release-checklist.md` 生成清单。
5. 任何发布或打标签操作前请求批准。
```

### 运行时扩展是第二层（Runtime extensions are a second layer）

某些宿主接受额外前置元数据或配套配置。这些字段可能有用，但不会自动可移植。

| 行为 | 宿主扩展示例 | 属于可移植核心？ |
|---|---|:---:|
| 对模型路由隐藏技能，同时保留用户直接调用 | `disable-model-invocation` | 否 |
| 对用户命令菜单隐藏技能，同时允许模型路由 | `user-invocable` | 否 |
| 在命令菜单显示参数帮助 | `argument-hint` | 否 |
| 在委托上下文中运行技能 | `context`、`agent` | 否 |
| 固定模型或推理设置 | `model`、`effort` | 否 |
| 注册生命周期自动化 | `hooks` | 否 |
| 在 Codex 禁止隐式调用 | `agents/openai.yaml` 策略 | 否 |

将每个扩展视为适配器。核心流程在没有它时仍应有效，记录回退，并测试消费它的宿主。运行时可能忽略未知字段、拒绝它，或保留字段却不实现行为。

### 前置元数据是可执行元数据（Frontmatter is executable metadata）

技能正文被阅读之前，元数据就改变系统行为。

- 格式错误的 `name` 可使发现失败。
- 含糊的 `description` 可路由错误请求。
- 仅限人工标志可将技能从模型目录移除。
- 工具许可可改变宿主是否请求权限。
- 上下文设置可将执行移入独立智能体会话。

像配置代码一样审查前置元数据：验证、版本化，并将其行为纳入评估。

### 技能生命周期（The skill lifecycle）

```figure
skill-runtime-lifecycle
```

每条箭头都是有自身失败模式的边界。

1. **发现（Discovery）**在配置位置找到可能的包。
2. **验证（Validation）**在发布目录前拒绝格式错误或不安全包。
3. **编目（Cataloging）**公开紧凑的 `name` 和 `description`，而非完整包。
4. **选择（Selection）**决定技能是否相关。
5. **激活（Activation）**将正文加载到模型可见上下文。
6. **披露（Disclosure）**仅在分支需要时读取参考资料或资产。
7. **执行（Execution）**在宿主权限和隔离规则下使用宿主工具。
8. **验证结果（Verification）**独立于模型主张检查产出制品。

合并这些阶段会导致错误心智模型。被发现的技能不等于已激活。已激活不等于获准做描述的一切。获准工具调用不证明结果正确。

### 技能与工具正交（Skills and tools are orthogonal）

MCP 回答“应用能调用哪些能力，它们的模式是什么？”技能回答“智能体应如何处理这类任务？”

```figure
skill-tool-orthogonality
```

技能可以点名工具，但真实能力注册表归宿主所有。如果工具缺失，技能应声明回退或明确失败，绝不能暗示点名能力就创建了能力。

### 技能与仓库指令范围不同（Skills and repository instructions are different scopes）

仓库指令描述当前所在环境：命令、约定、生成文件和边界。技能为可能跨许多仓库发生的任务提供可复用规程。

两者都适用时，当前用户请求和仓库规则约束技能。通用重构技能不得覆盖禁止编辑生成文件的仓库规则。

### 技能不会互相导入（Skills do not import one another）

一个技能可以指导智能体调用另一个，但这不是语言级导入。第二个技能仍经过运行时发现、资格检查、激活、权限和上下文处理。

将跨技能依赖写成可观察的工作流边：

```markdown
生成候选变更日志后，调用 `release-risk-review` 技能。
传递候选路径，并要求给出阻塞或非阻塞判定。
如果该技能不可用，停止并报告缺失依赖。
```

这让依赖可测试，也给宿主机会执行策略。

## 动手实现（Build It）

`code/main.py` 实现面向标准的小型验证器和制品选择器。仅使用标准库，让每条规则可见。

验证器公开：

- `parse_frontmatter(text)`：分离元数据与正文。
- `validate_skill_text(text, directory_name, allowed_runtime_extensions=())`：检查必需字段、命名、未知扩展、正文存在性和可移植限制。
- `ValidationIssue` 和 `SkillReport`：返回结构化证据，而非不透明布尔值。
- `FrontmatterSyntaxError`：处理无法安全解释的输入。

选择器公开 `TaskShape` 和 `select_primitives(task)`，将任务需求映射到普通代码、仓库指令、技能、钩子、子智能体或 MCP 工具。

运行实验：

```bash
cd "$(git rev-parse --show-toplevel)"
cd phases/13-tools-and-protocols/22-skills-and-agent-sdks
python3 code/main.py
python3 -m unittest discover -s code/tests -v
```

此命令块要求本地克隆，必须从克隆内任意位置开始，使 `git rev-parse --show-toplevel` 能解析仓库根目录。

演示打印一个有效可移植技能、一个宿主扩展技能、一个无效包和多个任务形态决定的 JSON。检查问题代码。包验证器应说明如何修复制品，而非替作者猜测。

### 验证顺序很重要（Validation order matters）

先验证廉价结构事实，再检查更深内容规则：

```figure
skill-validation-order
```

此顺序防止次级错误掩盖第一个破坏的不变量。

## 实际应用（Use It）

编写技能前填写此决策卡：

| 问题 | 如果是 | 可能原语 |
|---|---|---|
| 是否需要跨多个步骤的可复用模型判断？ | 规程稳定但决定变化 | 技能 |
| 是否必须在每次事件触发时发生？ | 漏一次执行都不可接受 | 钩子或应用代码 |
| 模型是否需要带类型化输入的外部能力？ | 操作位于模型上下文之外 | 工具或 MCP 服务器 |
| 工作是否需要隔离的上下文、状态或所有权？ | 独立工作者返回有界结果 | 子智能体 |
| 指导是否专属于一个仓库？ | 描述本地命令和约束 | 仓库指令 |
| 一次交互是否足够？ | 不需要包生命周期 | 提示词 |

许多生产流程使用不止一行。此卡防止单一制品假装提供全部属性。

## 交付（Ship It）

本课在 `outputs/` 下生成 `skill-contract-reviewer` 包，包含：

- 审查拟议技能包的可移植 `SKILL.md`；
- 可移植契约和原语选择的参考清单；
- 确定性验证脚本；
- 覆盖提示词、技能、工具、钩子、普通代码和子智能体的任务形态夹具。

安装完整包，不只是入口文件：

```bash
cd "$(git rev-parse --show-toplevel)"
python3 scripts/install_skills.py /tmp/aiefs-skills --phase 13 --type skill
```

课程安装器报告每个复制的 Phase 13 技能，并写入 `/tmp/aiefs-skills/manifest.json`。这个干净目的地检查包结构；上面的首次成功循环检查真实宿主中的发现和调用。

后续课程深化各生命周期阶段。第 24 课构建发现与渐进披露，第 25 课构建调用策略和路由，第 26 课分离权限与沙箱，第 27 课把整个包变成经过评估的发布制品。

## 练习（Exercises）

1. 使用 `TaskShape` 分类自己团队的五个流程。为每个选择多个原语的案例辩护。
2. 添加边界测试，证明 500 字符 `compatibility` 值通过，501 字符值以规范错误失败。
3. 向允许列表添加一个运行时扩展。编写测试，证明同一文件仍可与仅可移植技能区分。
4. 将 400 行提示词拆成 `SKILL.md`、一个参考资料、一个脚本契约和一个输出模板。每个文件只负责一种信息。
5. 为引用不可用 MCP 工具的技能设计失败响应。不要静默替换成权限更宽的工具。
6. 审查现有技能，将每句话标为路由、规程、策略、参考指针或输出契约。移走不属于该处的内容。

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|---|---|---|
| 智能体技能（Agent skill） | “保存的提示词” | 可发现的过程指令与可选资源目录 |
| 可移植核心（Portable core） | “所有运行时共享字段” | Agent Skills 规范定义的契约 |
| 运行时扩展（Runtime extension） | “额外前置元数据” | 行为需要兼容适配器的宿主专属配置 |
| 激活（Activation） | “技能运行了” | 技能正文进入模型可见上下文，执行可能稍后发生 |
| 技能依赖（Skill dependency） | “导入另一个技能” | 带可用性和策略检查、由运行时调解的调用边 |
| 工具契约（Tool contract） | “函数模式” | 能力的输入、输出、权限、副作用、错误和证据 |

## 延伸阅读（Further Reading）

- [Agent Skills 规范](https://agentskills.io/specification)：可移植目录和前置元数据契约。
- [Agent Skills 最佳实践](https://agentskills.io/skill-creation/best-practices)：范围、指令与资源组织。
- [OpenAI：构建技能](https://learn.chatgpt.com/docs/build-skills)：当前 Codex 发现和调用行为。
- [Claude Code 技能](https://code.claude.com/docs/en/skills)：一种运行时的调用、参数、工具和委托上下文扩展。
