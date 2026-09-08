# 技能发现与渐进披露（Skill Discovery and Progressive Disclosure）

> 技能在正文加载之前就开始发挥作用。名称和描述为它赢得目录位置，更深层文件只有在任务用到时才获得上下文空间。

**Type:** Build
**Languages:** Python (stdlib)
**Prerequisites:** Phase 13 · 22（智能体技能：可移植契约与运行时边界）
**Time:** ~105 分钟

## 学习目标（Learning Objectives）

- 构建分离范围、验证、冲突策略和目录发布的文件系统发现流水线。
- 解释三级披露：目录元数据、活动指令和任务特定资源。
- 设计参考资料，使智能体无需加载整个包就能直接到达必需细节。
- 将目录空间与活动技能上下文分别预算。
- 技能读取自身资源时，拒绝路径遍历和符号链接逃逸。

## 问题（The Problem）

智能体安装了 200 个技能。如果会话开始时加载所有 `SKILL.md`、参考文件、脚本和模板，无关规程会淹没当前任务。如果什么都不加载，用户就必须记住精确文件系统路径。

常用折中方案是目录：向模型展示每个合格技能的紧凑身份和路由描述，选择后才加载完整正文。这产生两个新工程问题。

首先，发现不只是递归查文件。技能可存在于项目、用户、管理员、插件或内置范围。两个包可能同名，符号链接可能指向可信根之外，格式错误的包可能占用目录空间或无法调用。

其次，渐进披露可能变成渐进混淆。如果 `SKILL.md` 说“阅读相关指南”，包中却有十二份指南，模型就得猜。如果每份指南再指向三个文件，加载就变成无界图遍历。

好的运行时让发现具有确定性，让披露有明确目的。

## 概念（The Concept）

### 发现是一条编译流水线（Discovery is a compiler pipeline）

将文件系统视为源输入，不要直接向模型发布原始路径。

```figure
skill-discovery-pipeline
```

每阶段都应产生结构化数据和结构化失败。发现日志应回答：

- 搜索了哪些根目录？
- 找到了哪些候选？
- 拒绝了哪些候选，为什么？
- 哪个包在冲突中胜出？
- 哪些目录条目因预算被缩短或省略？

没有这些证据，“模型没用我的技能”几乎无法诊断。

### 范围是运行时策略（Scope is runtime policy）

可移植规范定义技能包，不定义通用安装路径或优先顺序。宿主决定在哪里搜索。

通用运行时可使用以下范围：

| 范围 | 根目录示例 | 预期所有者 |
|---|---|---|
| 工作区（Workspace） | `<repo>/.agents/skills/` | 项目维护者 |
| 用户（User） | `<user-data>/skills/` | 单个开发者 |
| 管理员（Administrator） | `<system>/skills/` | 机器或组织策略 |
| 插件（Plugin） | 已签名插件包 | 插件发布者和安装器 |
| 内置（Built-in） | 运行时包 | 运行时供应商 |

截至 2026 年 8 月，Codex 文档说明项目发现从 `$CWD/.agents/skills` 沿祖先目录向上直到仓库根，另有用户、管理员和内置位置。它支持符号链接技能目录。重复名称可能同时出现，而非合并。这些是 Codex 行为，不是 `SKILL.md` 要求；编写适配器时核实当前 [Codex 技能文档](https://learn.chatgpt.com/docs/build-skills)。

绝不从目录名臆造优先级。将其声明为策略并测试。本课实验为每个 `Scope` 使用显式整数等级，使相同候选集总得到相同结果。

### 冲突需要 `name` 之外的身份（Collisions need identity beyond name）

两个名为 `release-readiness` 的包可能都合法：一个是工作区覆盖，一个是用户默认。因此目录条目至少需要：

```json
{
  "name": "release-readiness",
  "description": "Inspect a release candidate for this repository.",
  "scope": "workspace",
  "source": "/repo/.agents/skills/release-readiness",
  "selected": true
}
```

常见冲突策略：

| 策略 | 收益 | 风险 |
|---|---|---|
| 保留所有候选 | 不隐藏任何内容 | 模型看到含糊名称 |
| 最高优先级范围胜出 | 调用简单 | 本地包可能遮蔽可信包 |
| 拒绝重复 | 没有静默遮蔽 | 合法覆盖停止工作 |
| 按来源限定名称 | 身份明确 | 用户可见名称变长 |

为宿主选择一种策略。即使被拒绝或遮蔽候选不在模型目录，也要在诊断中保留。

### 三级披露（Three disclosure levels）

Agent Skills 规范描述分阶段加载。关键是各级目的不同。

```figure
skill-disclosure-levels
```

#### 第一级：目录元数据（Level 1: catalog metadata）

模型需要足够信息来区分相邻技能。规范估计每条约 100 词元，但实际序列化和分词由宿主负责。

有用描述包含两个分句：

```yaml
description: 验证发布候选版本并生成就绪报告。当用户询问某版本、标签或包是否准备好发布时使用。
```

第一句说明能力，第二句说明触发边界。第 25 课用正例和近似未命中提示词评估此边界。

#### 第二级：活动指令（Level 2: active instructions）

激活后，正文应同时充当地图和规程。规范建议 `SKILL.md` 少于 500 行，这是设计信号，不是要填满的目标。

正文应包含：

- 任务边界；
- 默认流程；
- 分支条件；
- 深层文件的直接引用；
- 工具和脚本契约；
- 失败和停止行为；
- 预期输出及其验证。

不要仅为缩短入口文件就把核心流程移入参考资料。激活必须给模型足够上下文以正确开始。

#### 第三级：支持资源（Level 3: supporting resources）

参考资料提供文字或数据。脚本提供确定性计算。资产用于复制、填写或转换为交付物，不应视为指令。

| 目录 | 模型读取？ | 模型执行？ | 典型内容 |
|---|:---:|:---:|---|
| `references/` | 需要时读取 | 否 | 模式、策略、领域指南 |
| `scripts/` | 可能检查 | 通过获准工具 | 验证器、转换器、收集器 |
| `assets/` | 仅有用时 | 否 | 模板、夹具、图片、起始文件 |

这些名称是约定，不是神奇能力。宿主仍需文件访问和执行工具。

### 分支专属参考优于主题堆积（Branch-specific references beat topic dumps）

将入口写成决策地图：

```markdown
## 选择路径（Choose the path）

- Python 包：阅读 `references/python-release.md`。
- 容器镜像：阅读 `references/container-release.md`。
- 纯文档发布：阅读 `references/docs-release.md`。
- 若发布组合多种制品，只读对应制品的指南。
```

这为每份参考资料提供可观察加载条件。“更多内容阅读 `references/`”则没有。

保持引用图浅层。官方指导建议从 `SKILL.md` 直接链接，避免深链。一跳使可达性可测试，降低必需约束从未进入上下文的概率。

```figure
skill-reference-map
```

### 目录预算与活动上下文是不同预算（Catalog budget and active context are different budgets）

令 `c_i` 为技能 `i` 的序列化目录成本，`B_c` 为目录预算，`b_j` 为活动正文成本，`r_k` 为实际加载资源。

```text
catalog_cost = sum(c_i for every published skill)
active_cost = sum(b_j for every activated skill) + sum(r_k for every disclosed resource)
```

降低一种预算不会自动降低另一种。短描述可节省目录空间，但激活的 900 行正文仍会淹没任务。只有运行时和指令真正避免加载无关分支，拆分正文到参考资料才会降低活动成本。

当上下文窗口大小已知时，Codex 当前将初始技能列表预算设为窗口的 2%。8,000 字符仅在窗口大小未知时作为回退，不是与 2% 规则同时应用的第二个上限。目录超过适用预算时，描述可能缩短或省略。将这些数值视为当前 Codex 策略，不是 Agent Skills 标准属性。

### 资源路径是信任边界（Resource paths are a trust boundary）

技能应只读包内文件。字面字符串前缀检查不够：

```text
references/../../../../.ssh/config
references/external-link -> /private/company-secrets
```

按文件系统语义解析包根和候选，拒绝绝对输入，并验证解析后候选仍在解析后根目录内。在发现前决定是否允许符号链接；允许时每次都检查解析目标。

```figure
skill-resource-containment
```

路径包含关系不建立内容信任。合法包内参考资料仍可能含恶意指令。第 26 课处理此威胁。

### 加载必须可观察（Loading must be observable）

记录披露事件，不记录秘密：

```json
{
  "event": "skill.resource.loaded",
  "skill": "release-readiness",
  "resource": "references/python-release.md",
  "reason": "candidate contains pyproject.toml",
  "bytes": 2840
}
```

原因让上下文选择成为可审查证据，也帮助识别导致智能体“以防万一”加载所有文件的指令。

## 动手实现（Build It）

`code/main.py` 构建确定性发现和披露引擎。

发现接口包含：

- `Scope`：来源和优先级元数据；
- `SkillCandidate`：尚未验证的文件系统候选；
- `discover_scope(scope)`：枚举直接技能子目录；
- `resolve_collisions(candidates, precedence)`：应用一种声明策略；
- `CatalogEntry` 和 `build_catalog(...)`：发布有界元数据；
- `CatalogBudget`：核算序列化条目，不假装字符是通用词元。

披露接口包含：

- `load_skill_body(entry, ...)`：第二级激活；
- `validate_reference(skill_dir, reference)`：路径包含检查；
- `load_reference(...)`：有界第三级读取。

运行实验：

```bash
cd "$(git rev-parse --show-toplevel)"
cd phases/13-tools-and-protocols/24-skill-discovery-and-progressive-disclosure
python3 code/main.py
python3 -m unittest discover -s code/tests -v
```

此命令块要求本地克隆，并从克隆内任意工作目录解析仓库根。

演示创建临时项目和用户范围，插入冲突，在刻意缩小预算下构建目录，激活一个技能，并尝试合法参考读取和遍历逃逸。不安装永久文件。

### 为什么浅层发现（Why discovery is shallow）

`discover_scope` 检查直接子目录中的 `SKILL.md`，不会递归将每个嵌套 `SKILL.md` 当独立包。这保留包边界，避免意外发布已安装技能内的示例或夹具。

### 为什么实验不解析任意 YAML（Why the lab does not parse arbitrary YAML）

实验支持目录所需标量前置元数据。生产运行时应使用安全 YAML 解析器，具有显式模式、大小限制，并禁用自定义对象构造。“仅标准库”是教学约束，不是静默发明部分 YAML 方言的许可。

## 实际应用（Use It）

对任何发现适配器应用此清单：

1. 列出每个配置根及其写权限持有者。
2. 说明是否允许符号链接包。
3. 验证包名、目录名、必需元数据和入口正文大小。
4. 在内部身份保留来源和范围。
5. 声明并测试重复名称行为。
6. 测量发给模型的精确序列化目录。
7. 记录正文或资源为何加载。
8. 资源读取保持在解析后包根内。
9. 引用文件缺失时明确失败。
10. 安装或策略变化时重建目录。

## 交付（Ship It）

本课生成 `skill-catalog-builder` 包。它扫描显式排序根，拒绝符号链接入口文件和名称目录不匹配，解决跨范围冲突，拒绝同优先级重复，并将选定元数据纳入声明的条目数、描述和序列化字符预算。

JSON 报告包含选定条目、被遮蔽候选、省略条目、验证错误、优先级和预算使用。正文及参考加载仍是独立运行时操作，因此目录构建器不执行脚本，也不把整个包纳入上下文。

## 练习（Exercises）

1. 添加插件范围，将优先级放在用户与内置之间，用测试证明冲突结果。
2. 将冲突策略从最高优先级改为限定名称，在目录中保留两个条目。
3. 为 `load_reference` 添加字节大小限制，测试恰好等于限制和超出一字节的文件。
4. 创建两个听起来几乎相同的描述，重写使触发边界不重叠。
5. 添加包含每个参考和脚本哈希的清单，在加载前检测资源修改。
6. 为演示插桩，分别报告第一级、第二级和第三级字节数。

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|---|---|---|
| 技能发现（Skill discovery） | “找到每个 SKILL.md” | 搜索配置范围、验证包、附上来源并应用策略 |
| 技能目录（Skill catalog） | “已安装技能列表” | 合格包的紧凑模型可见路由元数据 |
| 冲突策略（Collision policy） | “哪个重复项胜出” | 对不同来源同名候选的声明规则 |
| 渐进披露（Progressive disclosure） | “惰性加载” | 从目录到正文再到分支专属资源的分阶段上下文准入 |
| 引用图（Reference graph） | “技能链接的文件” | 可达资源结构及其加载条件 |
| 路径包含（Path containment） | “留在文件夹” | 验证解析后的资源目标仍在解析后的包根内 |

## 延伸阅读（Further Reading）

- [Agent Skills 规范](https://agentskills.io/specification)：包结构和渐进披露层级。
- [优化技能描述](https://agentskills.io/skill-creation/optimizing-descriptions)：目录路由元数据。
- [Agent Skills 最佳实践](https://agentskills.io/skill-creation/best-practices)：直接引用和入口文件大小。
- [OpenAI：构建技能](https://learn.chatgpt.com/docs/build-skills)：当前 Codex 发现范围和目录限制。
