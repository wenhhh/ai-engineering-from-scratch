# 综合实践 09：代码迁移智能体（Code Migration Agent，仓库级语言／运行时升级）

> Amazon 的 MigrationBench（Java 8 到 17）和 Google 的 App Engine Py2-to-Py3 迁移器确立了 2026 年的标准。Moderne 的 OpenRewrite 大规模执行确定性抽象语法树（Abstract Syntax Tree，AST）重写。Grit 用代码修改工具（Codemod）风格的领域专用语言（Domain-Specific Language，DSL）处理同类问题。生产模式将两者结合：确定性底层（Deterministic Substrate）负责安全重写，智能体层处理有歧义的情况，沙箱（Sandbox）支持逐分支构建，测试框架在创建拉取请求（Pull Request，PR）前全部通过。本综合实践要求迁移 50 个真实仓库，发布通过率与失败分类体系（Failure Taxonomy）。

**Type:** Capstone
**Languages:** Python（智能体）, Java / Python（目标）, TypeScript（仪表盘）
**Prerequisites:** 阶段 5（自然语言处理，NLP）、阶段 7（Transformer）、阶段 11（大语言模型工程）、阶段 13（工具）、阶段 14（智能体）、阶段 15（自主系统）、阶段 17（基础设施）
**涉及阶段（Phases exercised）:** P5 · P7 · P11 · P13 · P14 · P15 · P17
**Time:** 30 小时

## 问题（Problem）

大规模代码迁移是 2026 年编码智能体最明确的生产应用之一。真实参考标准（Ground Truth）清晰：迁移后测试套件是否通过？回报实在：Java 8 系统群迁移是需要投入专门人力的项目。基准也公开：MigrationBench 的 50 仓库子集。Moderne 的 OpenRewrite 处理确定性部分。智能体层处理 OpenRewrite 配方（Recipe）无法覆盖的情况：有歧义的重写、构建系统漂移、长尾语法、传递依赖（Transitive Dependency）破坏。

你将构建智能体，接收 Java 8 或 Python 2 仓库，生成持续集成（Continuous Integration，CI）通过的迁移分支。测量通过率、测试覆盖率保留情况、每仓库成本，并建立失败分类体系。与纯确定性基线的并排对比，会揭示智能体的价值实际在哪里。

## 概念（Concept）

流水线有两层。**确定性底层（Deterministic Substrate）**，即 Java 的 OpenRewrite 或 Python 的 libcst，安全完成大部分机械重写：导入、方法签名、空值安全修改、try-with-resources、弃用 API 替换。它速度快，并产生可审计的差异。**智能体层（Agent Layer）** 使用 OpenAI Agents SDK 或 LangGraph，调用 Claude Opus 4.7 和 GPT-5.4-Codex，处理配方无法处理的情况：构建文件升级（Maven/Gradle/pyproject）、传递依赖冲突、偶发测试失败（Test Flake）、自定义注解。

每个仓库获得一个预装目标运行时的 Daytona 沙箱。智能体迭代执行：运行构建、分类失败、应用修复、重跑。硬性限制为每仓库 30 分钟、8 美元、20 轮智能体交互。若全部测试通过且覆盖率变化非负，则为该分支创建 PR；否则将仓库归入失败类别并附证据。

失败分类体系就是交付物。50 个仓库中，什么出了问题？传递依赖、自定义注解、构建工具版本，还是与迁移无关的偶发测试失败？每类附数量与代表性差异。未来编写配方的人可以优先处理前三类。

## 架构（Architecture）

```
目标仓库
      |
      v
OpenRewrite / libcst 确定性配方
   （安全、快速、可审计，约占修复的 70–80%）
      |
      v
每分支 Daytona 沙箱
      |
      v
智能体循环（Agent Loop；Claude Opus 4.7 / GPT-5.4-Codex）：
   - 运行构建 -> 捕获失败
   - 分类失败（构建、测试、静态检查）
   - 应用修复（补丁或重试配方）
   - 重新运行
   - 预算：30 分钟、8 美元、20 轮
      |
      v
测试与覆盖率变化关卡（Coverage Delta Gate）
      |
      v（通过）
创建 PR
      |
      v（失败）
归入失败类别 + 附复现材料
```

## 技术栈（Stack）

- 确定性底层：OpenRewrite（Java）或 libcst（Python）
- 智能体：OpenAI Agents SDK 或 LangGraph，调用 Claude Opus 4.7 + GPT-5.4-Codex
- 沙箱：每分支使用 Daytona 开发容器（Devcontainer），预装目标运行时（Java 17 / Python 3.12）
- 构建系统：Maven、Gradle、uv（Python）
- 基准测试（Benchmark）：Amazon MigrationBench 的 50 仓库子集（Java 8 到 17）、Google App Engine Py2-to-Py3 仓库
- 测试框架：并行运行器，覆盖率由 Jacoco（Java）或 coverage.py（Python）测量
- 可观测性（Observability）：Langfuse + 每仓库轨迹包，包含每个差异块
- 仪表盘：失败分类仪表盘，展示逐类别数量与代表性差异

```figure
ce-migration-funnel
```

## 动手实现（Build It）

1. **配方处理（Recipe Pass）。** 先运行 OpenRewrite（Java）或 libcst（Python）配方。覆盖 70–80% 的机械迁移。保存为“recipe”提交。

2. **构建试验（Build Trial）。** 在 Daytona 沙箱安装目标运行时并运行构建。若通过则直接进入测试，否则交由智能体处理。

3. **智能体循环（Agent Loop）。** LangGraph 使用工具 `run_build`、`read_file`、`edit_file`、`run_test`、`git_diff`。智能体分类失败（依赖、语法、测试、构建工具），应用针对性修复并重跑。

4. **预算上限（Budget Caps）。** 每仓库实际运行时间 30 分钟、成本 8 美元、智能体 20 轮。任意超限即停止，归入“budget_exhausted”并附当前差异。

5. **测试与覆盖率关卡（Test + Coverage Gate）。** 构建通过后运行测试套件。与基础仓库比较覆盖率。若下降超过 2%，归入“coverage_regression”。

6. **创建拉取请求（PR Open）。** 成功时推送分支并创建 PR，附差异，以及应用了哪些配方、哪些提交由智能体编写的摘要。

7. **失败分类体系（Failure Taxonomy）。** 每个失败仓库标记一个类别：`dep_upgrade_required`、`build_tool_drift`、`custom_annotation`、`test_flake`、`syntax_edge_case`、`budget_exhausted`。构建仪表盘。

8. **50 仓库运行（50-Repo Run）。** 在 MigrationBench 子集上执行。报告逐类别通过率、每仓库成本、覆盖率保留情况，并与纯确定性基线比较。

## 实际应用（Use It）

```
$ migrate legacy-java-service --target java17
[recipe]   27 rewrites applied (JUnit 4->5, HashMap initializer, try-with-resources)
[build]    FAIL: cannot find symbol sun.misc.BASE64Encoder
[agent]    turn 1 classify: removed_jdk_api
[agent]    turn 2 apply: sun.misc.BASE64Encoder -> java.util.Base64
[build]    OK
[tests]    412/412 passing; coverage 84.1% -> 84.3%
[pr]       opened #1841  cost=$3.20  turns=4
```

## 交付成果（Ship It）

`outputs/skill-migration-agent.md` 是交付物。给定仓库，先执行确定性配方，再运行智能体循环，产生测试通过的迁移分支，或将仓库归入失败类别。

| 权重 | 标准 | 衡量方式 |
|:-:|---|---|
| 25 | MigrationBench 通过率 | 50 仓库子集的 pass@1 |
| 20 | 测试覆盖率保留 | 相比基础版本的平均覆盖率变化 |
| 20 | 每个已迁移仓库的成本 | 成功运行的每仓库美元成本 |
| 20 | 智能体／确定性工具集成 | OpenRewrite 处理与智能体编写的修复比例 |
| 15 | 失败分析报告 | 分类体系完整度，附代表性示例 |
| **100** | | |

## 练习（Exercises）

1. 只用 OpenRewrite（不使用智能体）运行迁移流水线。比较与完整流水线的通过率，识别仅因加入智能体而成功的案例。

2. 实现“静态检查无新增问题（Lint-Clean）”检查：迁移后运行风格检查器（Java 用 spotless，Python 用 ruff）。若出现新的静态检查错误，则令 PR 失败。测量覆盖率保留但风格退化的比例。

3. 增加“最小差异（Minimal-Diff）”优化器：智能体分支测试通过后，第二轮清除不必要改动。报告差异大小减少多少。

4. 扩展第三种迁移：Node 18 到 Node 22。复用沙箱封装，以自定义 codemod 替换配方层。

5. 将首次构建通过耗时（Time-to-First-Green-Build，TTFGB）作为用户体验指标测量。目标：p50 小于 10 分钟。

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|------|-----------------|------------------------|
| 确定性底层（Deterministic Substrate） | “配方引擎” | OpenRewrite / libcst：具有安全保障的声明式 AST 重写 |
| 代码修改工具（Codemod） | “修改代码的程序” | 机械改变源代码的重写规则 |
| 构建漂移（Build Drift） | “工具版本偏差” | Maven / Gradle / uv 大版本间细微的行为变化 |
| 失败类别（Failure Class） | “分类桶” | 仓库未迁移成功的已标记原因：依赖、语法、测试、构建工具、预算 |
| 覆盖率变化（Coverage Delta） | “覆盖率保留” | 从基础版本到迁移分支的测试覆盖率百分比变化 |
| 智能体轮次（Agent Turn） | “工具调用轮” | 智能体循环中一次计划 -> 行动 -> 观察循环 |
| 预算耗尽（Budget Exhaustion） | “触及上限” | 仓库用尽 30 分钟／8 美元／20 轮限制，仍未通过 |

## 延伸阅读（Further Reading）

- [Amazon MigrationBench](https://aws.amazon.com/blogs/devops/amazon-introduces-two-benchmark-datasets-for-evaluating-ai-agents-ability-on-code-migration/)：2026 年典型基准
- [Moderne.io OpenRewrite 平台](https://www.moderne.io)：确定性底层参考
- [OpenRewrite 文档](https://docs.openrewrite.org)：配方编写
- [Grit.io](https://www.grit.io)：另一种 codemod DSL
- [OpenAI 沙箱代码迁移实践指南](https://developers.openai.com/cookbook/examples/agents_sdk/sandboxed-code-migration/sandboxed_code_migration_agent)：Agents SDK 参考
- [Google App Engine Py2 到 Py3 迁移器](https://cloud.google.com/appengine)：另一种迁移基准
- [libcst](https://github.com/Instagram/LibCST)：Python 确定性底层
- [Daytona 沙箱](https://daytona.io)：每分支沙箱参考
