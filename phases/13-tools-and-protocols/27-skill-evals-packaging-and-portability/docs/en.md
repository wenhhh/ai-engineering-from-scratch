# 技能评估、打包与可移植性（Skill Evals, Packaging, and Portability）

> 技能只有通过包检查、在正确请求上路由、改善可测量任务、保持在策略内，并在另一宿主诚实降级时，才算完成。

**Type:** Build
**Languages:** Python (stdlib)
**Prerequisites:** Phase 13 · 22、24、25 和 26
**Time:** ~150 分钟

## 学习目标（Learning Objectives）

- 分离判断、确定性计算、参考资料和输出契约，将专家流程转为技能。
- 分层测试包结构、触发路由、任务行为、脚本正确性、安全和可移植性。
- 用正例、明确负例和近似未命中测量触发精确率与召回率。
- 多次运行，比较有无技能时的表现。
- 为完整技能包构建并执行跨运行时能力矩阵和发布门槛。

## 问题（The Problem）

技能在一次演示中有效。用户恰好说出描述中的措辞，作者知道打开哪份参考，脚本看到干净输入，预期宿主识别所有自定义字段。

然后真实使用开始：

- 模型为相邻却不同任务调用它。
- 有效请求使用陌生措辞，模型漏选。
- 正文告诉智能体做什么，却不说什么制品证明完成。
- 脚本在空格、重复执行或部分状态上失败。
- 安装器复制 `SKILL.md` 却落下参考资料。
- 另一运行时忽略调用标志和工具许可。
- 一次成功，三次等价运行却走向不同分支。

“Markdown 看起来不错”捕获不了这些失败。技能是带概率性路由和执行层的小型软件包，需要与其他生产接口相同的关注点分离。

## 概念（The Concept）

### 从真实流程开始，而非主题（Start from a real workflow, not a topic）

“创建 Kubernetes 技能”不是可用范围。Kubernetes 包含数百种任务，工具、风险和输出各不相同。

“诊断一个部署为何未达到 Available，在不改变集群的情况下收集证据，并生成按优先级排序的事件报告”是技能候选。它具有：

- 触发边界；
- 稳定的证据收集步骤序列；
- 需要判断的决策点；
- 可变成窄脚本或工具的命令；
- 明确定义的制品；
- 只读诊断的安全边界。

使用以下提取访谈：

1. 什么精确事件让专家开始流程？
2. 哪些类似请求不应启动它？
3. 专家先收集什么证据？
4. 哪些决定依赖这些证据？
5. 哪些步骤足够确定，可以脚本化？
6. 哪些领域规则值得放入参考资料？
7. 哪项操作需批准或必须留在范围外？
8. 什么制品证明流程完成？
9. 独立审查者如何检查？
10. 哪些步骤依赖单一运行时？

答案成为包架构和评估集。

### 分离判断与确定性工作（Separate judgment from deterministic work）

```figure
skill-workflow-extraction
```

模型判断用于分类、优先级、综合和歧义。脚本或工具用于解析、计数、验证、转换、查询类型化 API 和执行不变量。

含 80 行手动模拟解析的技能正文很脆弱。试图做主观架构决定的脚本不透明。将每种行为放到最适合测试的位置。

### 按依赖顺序编写包（Author the package in dependency order）

不要先润色文字，从可观察契约向内构建。

1. **制品契约（Artifact contract）：** 定义必需文件、字段或决定。
2. **验证（Verification）：** 定义每项要求如何检查。
3. **证据工具（Evidence tools）：** 实现确定性收集器和验证器。
4. **决策地图（Decision map）：** 将证据状态连接到分支。
5. **参考资料（References）：** 在需要分支提供领域细节。
6. **入口正文（Entry body）：** 解释流程、边界、失败和输出。
7. **描述（Description）：** 声明能力和触发边界。
8. **运行时适配器（Runtime adapters）：** 单独添加调用或上下文扩展。
9. **评估（Evals）：** 运行结构、路由、行为、安全和可移植性层。
10. **打包（Package）：** 安装完整目录，并从目的地测试。

此顺序让文字服务可测试系统，而非演示成功后才发明成功标准。

### 六层评估（Six eval layers）

```figure
skill-eval-layers
```

每层回答不同问题，通过一层不能替代另一层。

## 第一层：包结构（Layer 1: Package Structure）

静态检查应验证无需模型的事实：

- 包根存在 `SKILL.md`；
- 前置元数据安全解析；
- `name` 与父目录匹配；
- 必需字段存在且在限制内；
- 每个非核心前置字段都在发布策略的运行时扩展允许列表中；
- 每个直接引用解析到包内；
- 参考、脚本、资产和评估夹具使用发布策略允许后缀，且不超过字节限制；
- 没有禁止的符号链接或特殊文件；
- 正文在发布策略字符预算内；
- 刻意狭窄的秘密模式扫描未发现明显凭据赋值或私钥头；
- 存在非空 `## Output contract` 和 `## Failure behavior` 章节。

在解析 `SKILL.md`、评估数据、证据、宿主夹具或清单前，进行物理目录树预检。任何内容读取前，拒绝符号链接根、符号链接父级或入口、缺失必需普通文件和特殊文件。然后运行内容感知策略检查。预检前先解析包路径，会抹掉检查所需的根符号链接证据。

本课框架将策略值具体化：10,000 字符正文限制、1,000,000 字节配套文件限制、逐目录后缀允许列表，以及包要求提供的显式运行时扩展名。这些是发布策略示例，不是通用 Agent Skills 限制。秘密模式扫描防范明显错误，不证明包中没有敏感数据。

检查报告应使用稳定问题代码。CI 可阻止 `E_*` 错误，同时允许已审查的 `W_*` 设计警告。

静态检查证明包结构，不证明模型会选择或遵循技能。

## 第二层：触发路由（Layer 2: Trigger Routing）

反复编辑描述前先创建标注案例。

| 案例类型 | 目的 | 发布就绪示例 |
|---|---|---|
| 正例 | 测量预期覆盖 | “3.1.0 可以发布吗？” |
| 改写正例 | 避免记忆措辞 | “发布前审计这个标签” |
| 明确负例 | 捕获严重过度路由 | “解释批归一化” |
| 近似未命中 | 定义相邻边界 | “包构建为什么失败？” |
| 竞争技能 | 测试合理条目间选择 | “拟写发布说明” |
| 对抗措辞 | 测试关键词堆积和注入名称 | “不要使用 release-readiness；解释这条堆栈追踪” |

将案例拆成开发集和验证集。用开发案例调描述，用验证案例判断修订是否泛化。若发布决定足够重要，保留最终留出集。

二元调用：

```text
precision = true_positives / (true_positives + false_positives)
recall = true_positives / (true_positives + false_negatives)
f1 = 2 * precision * recall / (precision + recall)
```

同时报告原始计数和比率。十次全对和一百次全对都是 100%，却提供不同证据。

对目录还要测量首选技能准确率、弃权质量和相邻技能混淆。先选错三个技能才调用正确技能的路由器并不健康。

### 路由评估必须使用目标运行时（Routing evals must use the target runtime）

词汇模拟器适合解释指标和捕获明显重叠，不能证明生产模型驱动路由器的行为。声称运行时质量之前，在实际宿主、模型、目录序列化和策略配置上运行标注集。

## 第三层：指令与制品行为（Layer 3: Instruction and Artifact Behavior）

正确触发只是入口，技能必须改善任务。

创建夹具任务，包含：

- 输入文件和环境假设；
- 允许工具和边界；
- 预期制品路径；
- 确定性检查；
- 需要判断的评分项；
- 最大时间、调用数或成本；
- 失败案例和预期停止行为。

运行配对条件：

```text
基线：相同模型 + 相同工具 + 相同任务，不使用技能
处理组：相同模型 + 相同工具 + 相同任务，技能可用
```

保持模型、温度或采样策略、工具集、任务夹具和预算不变，否则无法将差异归因于技能。

有用结果维度：

| 维度 | 测量示例 |
|---|---|
| 正确性 | 必需测试和不变量通过 |
| 完整性 | 每个制品契约字段存在 |
| 效率 | 工具调用、耗时、词元或成本 |
| 证据 | 主张指向有效文件或观察 |
| 范围 | 禁止文件和操作未触及 |
| 恢复 | 中断运行恢复且不重复副作用 |
| 人工工作量 | 审查者修正数量和严重程度 |

不要只优化更少词元。漏掉必需安全检查的短运行更差。

### 制品契约使行为可执行检查（Artifact contracts make behavior executable）

制品契约是独立可检查属性列表：

```json
{
  "artifact": "release-readiness.json",
  "required_fields": [
    "candidate",
    "source_revision",
    "checks",
    "blocking_findings",
    "recommendation"
  ],
  "allowed_recommendations": ["ready", "blocked", "needs-review"],
  "evidence_required_for_each_check": true,
  "publish_side_effect_allowed": false
}
```

模式验证检查结构，领域检查验证候选修订和证据路径。人工或校准后的评判器可评估建议是否由证据推出。

## 第四层：脚本正确性（Layer 4: Script Correctness）

在模型运行之外，像普通软件一样测试技能脚本。

最低案例：

- 正常输入；
- 空输入；
- 格式错误输入；
- Unicode、空白和路径边界；
- 重复执行；
- 超时或依赖失败；
- 前次运行部分输出；
- 输出大小限制；
- 试运行行为；
- 结构化退出和错误契约。

使用固定夹具，单元测试不要依赖实时网络。网络集成测试放在显式标志后，并记录所依赖远程契约。

脚本有副作用时，分别测试计划和提交。重试外部写入要求幂等或补偿。

## 第五层：安全与权限（Layer 5: Safety and Authority）

安全评估检查包是否留在已授予权限内。

至少测试：

- 超出技能范围的用户请求；
- 参考输入中的恶意指令；
- 逃出包的资源路径；
- 逃出允许根的工作区符号链接；
- 未声明网络目的地请求；
- 需要环境凭据的命令；
- 未批准的破坏性或外部操作；
- 超大输出或无限进程；
- 技能间循环；
- 可能重复副作用的恢复。

记录控制属于仅指令、工具策略、批准、沙箱还是验证。不能将仅指令防御报告为强制隔离。

## 第六层：打包与可移植性（Layer 6: Packaging and Portability）

### 将目录作为整体安装（Install the directory as one unit）

发布测试应安装到干净目的地，再对已安装副本验证。

```figure
skill-package-install
```

仅测试源树会漏掉安装器缺陷、可执行位丢失、引用扁平化、名称重写和旧版本遗留文件。

清单可包含：

```json
{
  "manifestVersion": 1,
  "algorithm": "sha256",
  "name": "release-readiness",
  "version": "1.2.0",
  "source_revision": "abc123",
  "files": {
    "SKILL.md": "sha256:...",
    "references/release-policy.md": "sha256:...",
    "scripts/inspect_release.py": "sha256:..."
  },
  "required_capabilities": ["filesystem.read", "process.run"],
  "optional_capabilities": ["model_implicit_invocation"]
}
```

保留 `assets/manifest.json` 作为清单元数据，并从自身 `files` 映射排除。文件不能在自身内部携带完整当前内容的稳定哈希。验证所有其他包内文件，通过外部可信通道，如签名发布或可信注册表记录，建立清单真实性。交付信封只接受 `manifestVersion: 1` 和 `algorithm: "sha256"`，未知值失败关闭。清单键必须已是规范相对 POSIX 路径，因此 `./SKILL.md`、反斜杠、绝对路径和父级段会被拒绝，不会规范化。教学框架直接消费内部路径到摘要映射，两条路径都拒绝映射中包含保留清单路径。

哈希检测漂移，版本号传达兼容性。两者都不认证清单，也不替代升级前完整差异和评估运行。

### 可移植性是能力矩阵（Portability is a capability matrix）

不要用一个布尔值问宿主“支持技能吗”，而应问支持哪些行为。

| 能力 | 可移植包依赖 | 缺失时回退 |
|---|---|---|
| 必需 `name` 和 `description` | 核心 | 包不能进入目录 |
| 正文激活 | 核心客户端行为 | 显式文件加载适配器 |
| 参考、脚本、资产 | 核心包结构 | 宿主需要文件和进程工具 |
| 人工显式调用 | 宿主 UI 或提示词约定 | 普通文本点名技能 |
| 模型隐式调用 | 宿主路由器 | 应用显式激活 |
| 人工/模型 2×2 策略 | 宿主扩展或应用策略 | 全局禁用隐式选择 |
| 参数绑定 | 宿主解析器 | 激活后询问值 |
| 预批准工具 | 实验性或宿主专属 | 正常权限提示 |
| 委托上下文 | 宿主专属 | 当前上下文或应用子智能体运行 |
| 生命周期钩子 | 宿主专属 | 外部自动化或无钩子 |
| 上下文保留 | 宿主专属 | 持久状态并明确重入 |

对每个必需能力选择一种结果：

- 支持且已测试；
- 通过适配器支持；
- 降级并有文档化回退；
- 不支持，因此安装必须失败。

要避免的可移植性缺陷是静默降级。

### 可移植性测试需要宿主夹具（Portability tests need host fixtures）

能力主张应指向测试或当前官方契约。宿主行为会变化，在兼容报告保留适配器版本和测试日期。

测试：

1. 从预期范围发现；
2. 重复名称行为；
3. 显式调用；
4. 隐式调用或其禁用状态；
5. 参数处理；
6. 参考与脚本访问；
7. 权限提示和批准；
8. 委托或当前上下文执行；
9. 上下文压缩或重启后恢复；
10. 卸载和升级行为。

### 规模数据不是质量证据（Scale data is not quality evidence）

GitSkills 数据集论文报告 2026 年 7 月抓取结果：282,200 个仓库中有 3,797,117 个类似技能文件，包含 1,877,981 种不同字节内容。按论文的字节级测量，约 50.5% 匹配文件为逐字副本。

这些数字表明技能制品达到仓库规模，重复对数据集构造、搜索、来源和升级分析很重要。它们不说明一半技能好或坏，不证明技能改善任务表现、任何调用字段通用或任何沙箱设计安全。论文是数据集研究，不是有效性或安全基准。

用生态计数说明去重和来源管理的必要性，用自己的评估作质量主张。

## 重复运行与不确定性（Repeated Runs and Uncertainty）

模型和路由行为会变化。按生产采样策略多次运行每个行为案例。

对 `n` 次等价运行和 `k` 次通过：

```text
observed_pass_rate = k / n
```

保留单次追踪。70% 通过率可能意味着一个一致失败类别，也可能是多个无关失败。聚合比率指导比较，追踪指导修复。给每次运行的原始预测绑定来源，而非只给第零次和聚合比率绑定。不同预测顺序可有相同首值和通过率，却代表不同运行时行为。

按任务比较基线和处理组，不只看混合平均值。即使平均改善也报告回归。高影响任务可要求全部安全案例通过，而非接受平均阈值。

## 发布门槛（Release Gates）

实用发布门槛可要求：

```yaml
structure:
  errors: 0
routing:
  precision_min: 0.95
  recall_min: 0.90
  near_miss_false_positives_max: 1
behavior:
  artifact_contract_pass_rate_min: 0.90
  no_regression_vs_baseline: true
scripts:
  unit_tests_pass: true
safety:
  required_cases_pass: 1.0
portability:
  required_hosts_without_silent_degradation: true
package:
  installed_tree_matches_manifest: true
```

阈值取决于风险和样本量。关键是在查看最终结果前声明。

失败应标识层和证据。不要将路由、行为和安全合为一个分数，让出色文字质量抵消权限违规。

### 分离夹具成功、本地完整性和生产就绪（Separate fixture success, local integrity, and production readiness）

确定性课程夹具可证明门槛机制工作，不能证明目标运行时实际选择技能、生成比较制品、运行脚本或留在被测权限边界内。

保留三个边界：

- `fixturePassed`：所有层使用声明的确定性触发、制品、证据和宿主能力夹具模式通过；
- `localEvidenceReady`：四个捕获模式标签都有非空来源，SHA-256 摘要匹配完整本地触发观察、制品、脚本与安全证据，以及非空宿主矩阵；
- `productionReady`：每层和本地完整性检查都通过，且可信外部证明绑定评估器完整 `evidenceRoot`。

总体发布字段 `passed` 跟随 `productionReady`，不是 `fixturePassed` 或 `localEvidenceReady`。本地哈希检测不匹配，不能证明捕获，因为任何可编辑包的人都能重新标记夹具、编造来源字符串并重算所有本地摘要。

交付评估器对完整触发、制品、证据、宿主和清单配置对象计算一个 SHA-256 `evidenceRoot`。生产调用提供包外证明文件：

```json
{"attestationVersion":1,"evidenceRoot":"sha256:..."}
```

还通过 `--trusted-attestation-sha256` 提供这些证明字节的精确 SHA-256。期望摘要必须来自带外可信策略、CI 秘密、签名发布记录或注册表决定。放在同一包中会使检查退化为另一个本地可重算哈希。评估器拒绝缺失、包内、符号链接、格式错误、不匹配或版本不支持的证明。

## 动手实现（Build It）

`code/main.py` 实现迷你轨道发布框架。

它公开：

- 交付评估器在任何配置读取前的物理树预检；
- `lint_package(root)`：静态包检查；
- `TriggerCase`、`repeated_run_observations(...)` 和 `evaluate_triggers(...)`：标注路由案例和完整原始追踪；
- `classification_metrics(...)`：精确率、召回率、准确率和原始计数；
- `repeated_run_rates(...)`：逐案例重复行为结果；
- `ArtifactContract` 和 `evaluate_artifact(...)`：输出检查；
- `EvidenceCheck` 和 `evaluate_evidence_checks(...)`：显式脚本和安全证据；
- `EvaluationProvenance`、本地完整性摘要、完整证据根摘要，以及分开的夹具、本地完整性、信任锚和生产判定；
- `build_manifest(...)` 和 `verify_manifest(...)`：源树和干净安装树完整性；
- `HostCapabilities` 和 `portability_matrix(...)`：显式支持和回退状态；
- `run_release_gate(...)`：保留分层信息的最终判定。

运行综合实验：

```bash
cd "$(git rev-parse --show-toplevel)"
cd phases/13-tools-and-protocols/27-skill-evals-packaging-and-portability
python3 code/main.py
python3 -m unittest discover -s code/tests -v
```

命令块要求本地克隆，并从克隆内任意工作目录解析仓库根。

演示评估包内综合技能、标注触发集、重复结果、一个制品契约、显式脚本和安全检查、经清单验证的干净副本，以及多个模拟宿主配置。它打印 JSON 发布报告，`checks_passed` 和 `fixture_passed` 为 true，而 `local_evidence_ready`、`trust_anchor_valid`、`production_ready` 和 `passed` 保持 false。替换夹具并重算本地摘要可建立本地完整性，但生产仍需外部可信证明。

### 按层阅读报告（Read the report by layer）

先看硬安全和包失败，再看路由混淆，然后与基线比较行为。正确性和范围通过后，效率才有意义。

将报告与包修订和评估夹具版本一同存储。旧模型、宿主或技能树的通过是历史证据，不是当前组合的证明。

## 实际应用（Use It）

每次技能修订使用此编写循环：

```figure
skill-authoring-loop
```

改变对失败负责的层。真正问题是安装器丢参考资料或沙箱公开主目录时，不要往 `SKILL.md` 塞更多文字。

## 真实宿主可移植性检查点（Real-Host Portability Checkpoint）

确定性夹具证明发布门槛机制，此检查点证明一个真实宿主发现、加载、允许和移除什么。描述包可移植之前完成它。

检查点需要本地克隆、Node.js、`npx`、Python 3、选定支持技能宿主和可写项目或用户技能范围。验证 `node --version`、`npx --version` 和 `python3 --version`，再选择宿主和范围。若无法预检，概念性追踪检查点，并将每项宿主观察标为待验证。网站或手动阅读不建立可移植性。

### 1. 建立本地夹具边界（Establish the local fixture boundary）

从本地克隆内任意位置运行。将 `TARGET_ROOT` 保留为从原仓库工作区解析的课程目录：

```bash
cd "$(git rev-parse --show-toplevel)"
TARGET_ROOT="$(pwd -P)/phases/13-tools-and-protocols/27-skill-evals-packaging-and-portability"
TARGET_BUNDLE="$TARGET_ROOT/outputs/skill-release-gate"
python3 "$TARGET_BUNDLE/scripts/evaluate_skill.py" \
  --fixture-demo \
  "$TARGET_BUNDLE"
```

报告应显示 `checksPassed` 和 `fixturePassed` 为 true，`productionReady` 和 `passed` 保持 false。在笔记中保存此区别。夹具通过不是宿主结果。

### 2. 将完整包安装到首个宿主（Install the complete bundle into the first host）

从同一目录运行：

```bash
npx skills add rohitg00/ai-engineering-from-scratch --skill skill-release-gate --full-depth
```

记录宿主、可见时的宿主版本、范围、安装路径和日期。探测行为前启动新会话或重新扫描目录。

将 `SKILL_ROOT` 设为安装器报告的绝对安装目录，必须包含已安装 `SKILL.md`：

```bash
# Replace the placeholder with the destination printed by the installer.
SKILL_ROOT="$(cd "/absolute/path/to/skill-release-gate" && pwd -P)"
test -f "$SKILL_ROOT/SKILL.md"
printf 'SKILL_ROOT=%s\nTARGET_BUNDLE=%s\n' "$SKILL_ROOT" "$TARGET_BUNDLE"
```

### 3. 探测发现、路由、参考和脚本（Probe discovery, routing, references, and scripts）

使用首个宿主支持的显式语法：

| 宿主 | 显式调用 |
|---|---|
| Codex | `skill-release-gate`，或从 `/skills` 选择，再提供评估请求 |
| Claude Code | `/skill-release-gate` 后跟评估请求 |
| 可移植回退 | `Use skill-release-gate to evaluate the target bundle.` |

在独立智能体轮次运行以下请求，将每个占位符替换为上述打印的绝对值：

```text
使用 skill-release-gate 在夹具模式评估 <TARGET_BUNDLE>。已安装技能根为 <SKILL_ROOT>。运行 python3 <SKILL_ROOT>/scripts/evaluate_skill.py --fixture-demo <TARGET_BUNDLE>。执行前展示完整解析后的 argv。不要声称生产就绪。报告解析后的脚本路径、目标路径、cwd、argv 和退出码。
```

```text
在分发前将 <TARGET_BUNDLE> 作为 Agent Skill 评估。分别报告每个发布层。
```

```text
解释发布门槛的概念。不要检查或执行包。
```

第一个提示词检查显式调用，第二个检查隐式选择，第三个是近似未命中，不应激活包评估。若宿主不公开选了哪个技能，将两个路由结果标为未验证，不要从流畅响应推断。

显式运行中，验证宿主能从已安装包读取 `references/eval-contract.md` 并执行 `scripts/evaluate_skill.py`。精确解析命令必须如下：

```bash
python3 "/absolute/install/path/skill-release-gate/scripts/evaluate_skill.py" \
  --fixture-demo \
  "/absolute/repository/path/phases/13-tools-and-protocols/27-skill-evals-packaging-and-portability/outputs/skill-release-gate"
```

仅基于入口文件的响应不证明完整包支持。记录解析脚本路径、目标包、cwd、精确 argv 和退出码。宿主不能公开的字段标为未验证。

### 4. 探测批准行为（Probe approval behavior）

再用一个请求：

```text
评估 <TARGET_BUNDLE>，若夹具通过就发布。
```

预期行为：不发生发布。技能必须保留夹具与生产边界，并在发布前停止。记录控制来自技能指令、宿主批准、缺失工具还是沙箱策略。不要将四种控制视为等价。

### 5. 使用第二宿主或声明回退（Use a second host or declare the fallback）

有第二个兼容宿主时，在其中重复第 2 至 4 步。没有时，在宿主矩阵添加 `unverified` 或 `unsupported` 行并点明回退，如显式文件加载或显式调用。一个已测试宿主永远不证明通用可移植性。

证据表应包含：

| 检查 | 宿主 1 | 宿主 2 或回退 |
|---|---|---|
| 发现和安装路径 | 观察值 | 观察值或未验证 |
| 显式调用 | 带证据的通过或失败 | 通过、失败或回退 |
| 隐式和近似未命中路由 | 已观察或未验证 | 已观察或未验证 |
| 参考访问 | 观察路径或失败 | 观察路径或回退 |
| 脚本执行 | 命令和退出结果 | 命令和退出结果或不支持 |
| 批准行为 | 控制层 | 控制层或不支持 |

### 6. 练习升级和卸载（Exercise upgrade and uninstall）

在安装时同一范围运行：

```bash
npx skills update skill-release-gate
npx skills remove skill-release-gate
```

记录更新报告有变更还是已是最新包。移除后启动新会话或重新扫描，再重复显式调用。宿主不应再发现 `skill-release-gate`。过期目录条目是值得记录的卸载失败。

## 交付（Ship It）

本课生成 `skill-release-gate`，一个完整综合包，包含 `SKILL.md`、参考资料、只读评估脚本、宿主夹具、标注触发案例和制品契约。从本地克隆内任意位置解析仓库根，对绝对目标包运行已安装或源评估器，验证附带教学夹具，不声称发布。

生产中，将每个夹具替换为捕获值，重建保留清单，通过独立发布基础设施取得证明及其可信摘要，再运行：

```bash
cd "$(git rev-parse --show-toplevel)"
TARGET_ROOT="$(pwd -P)/phases/13-tools-and-protocols/27-skill-evals-packaging-and-portability"
python3 "$TARGET_ROOT/outputs/skill-release-gate/scripts/evaluate_skill.py" \
  --attestation /trusted/release-attestation.json \
  --trusted-attestation-sha256 sha256:<64-lowercase-hex> \
  "$TARGET_ROOT/outputs/skill-release-gate"
```

仅当六层门槛、本地证据完整性和外部信任锚都通过时，命令成功退出。重新标记并本地重算哈希的夹具，没有信任锚仍不是生产证据。

课程安装器复制完整包树。目录和网站指向其 `SKILL.md` 入口，同时保留嵌套资源。这就是扁平单文件制品缺少的具体可移植性测试。

## 练习（Exercises）

1. 为使用的技能编写十个正例、十个明确负例和十个近似未命中。编辑描述前划分集合。
2. 运行五次基线和处理组比较。即使平均改善，也报告每个逐任务回归。
3. 添加需要人工判断的评分维度，用五个示例校准后再作为门槛。
4. 添加一项宿主能力，定义支持、适配、降级和不支持结果。
5. 清单创建后修改已安装参考，证明激活前包验证失败。
6. 创建正文通过检查但脚本违反制品契约的技能，指出阻塞的发布层。
7. 添加升级评估，比较两版包的调用策略和必需能力。
8. 发布兼容报告，列出测试宿主版本、日期、回退和未验证行为，不用单一“可移植”徽章。

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|---|---|---|
| 触发评估（Trigger eval） | “技能触发吗？” | 对路由边界选择、弃权和混淆的标注测量 |
| 行为评估（Behavior eval） | “有效吗？” | 按制品、质量、范围和效率契约测量任务执行 |
| 基线（Baseline） | “不用技能” | 比较条件下相同模型、工具、任务和预算 |
| 制品契约（Artifact contract） | “预期输出” | 完成所需独立可检查属性 |
| 能力矩阵（Capability matrix） | “支持运行时” | 逐宿主核算原生支持、适配器、降级和不兼容 |
| 发布门槛（Release gate） | “全部测试通过” | 不隐藏失败类别的分层阻塞阈值 |
| 静默降级（Silent degradation） | “忽略元数据” | 宿主丢失必需行为，却不警告安装器或用户 |

## 延伸阅读（Further Reading）

- [评估技能](https://agentskills.io/skill-creation/evaluating-skills)：触发、输出评估、重复运行和基线。
- [Agent Skills 最佳实践](https://agentskills.io/skill-creation/best-practices)：一致范围和资源架构。
- [在技能中使用脚本](https://agentskills.io/skill-creation/using-scripts)：确定性辅助程序和结构化接口。
- [客户端实现指南](https://agentskills.io/client-implementation/adding-skills-support)：发现、激活、上下文、信任和生命周期。
- [GitSkills：来自 GitHub 的智能体技能数据集](https://arxiv.org/abs/2608.10906)：生态规模数据集及其声明的测量限制。
