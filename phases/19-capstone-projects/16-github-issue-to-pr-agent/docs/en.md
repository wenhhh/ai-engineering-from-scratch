# 综合实践 16：GitHub 问题到拉取请求自主智能体（GitHub Issue-to-PR Autonomous Agent）

> 给问题打标签，获得拉取请求（Pull Request，PR）：这就是 2026 年自主编码智能体的产品形态。在云端沙箱（Cloud Sandbox）中运行智能体，验证测试通过，然后发布带理由、可供评审的 PR。AWS Remote SWE Agents、Cursor Background Agents、OpenAI Codex cloud 和 Google Jules 都已交付该能力。难点是自动复现仓库构建环境、防止凭据泄露、实施逐仓库预算，以及确保智能体不能强制推送（Force-Push）。本综合实践构建自托管版本，并与托管替代方案比较成本和通过率。

**Type:** Capstone
**Languages:** Python（智能体）, TypeScript（GitHub App）, YAML（Actions）
**Prerequisites:** 阶段 11（大语言模型工程）、阶段 13（工具）、阶段 14（智能体）、阶段 15（自主系统）、阶段 17（基础设施）
**涉及阶段（Phases exercised）:** P11 · P13 · P14 · P15 · P17
**Time:** 30 小时

## 问题（Problem）

异步云编码智能体（Async Cloud Coding Agent）与交互式编码智能体（综合实践 01）是不同产品类别。其交互入口是 GitHub 标签。你给问题添加 `@agent fix this` 标签，工作者便在云端沙箱启动、克隆仓库、运行测试、编辑文件、验证，并创建正文包含智能体理由的 PR。没有交互循环，也没有终端。AWS Remote SWE Agents、Cursor Background Agents、OpenAI Codex cloud、Google Jules 和 Factory Droids 都趋于这一形态。

工程挑战具体明确：环境复现（智能体必须从零构建仓库，没有缓存开发镜像）、偶发测试失败（必须重跑或隔离）、凭据范围限制（采用最小细粒度权限的 GitHub App）、逐仓库逐日预算，以及禁止强制推送策略。本综合实践测量通过率、成本与安全，并与托管替代方案比较。

## 概念（Concept）

触发器是 GitHub 网络回调（Webhook），由问题标签或 PR 评论触发。分发器（Dispatcher）将任务入队到 ECS Fargate 或 Lambda。工作者将仓库拉入 Daytona 或 E2B 沙箱，使用根据仓库语言、框架推断的通用 Dockerfile。智能体以 Claude Opus 4.7 或 GPT-5.4-Codex 运行 mini-swe-agent 或 SWE-agent v2 循环：读取代码、提出修复、应用补丁、运行测试，持续迭代。

验证（Verification）是把关步骤。创建 PR 前，完整 CI 必须在沙箱中通过。计算覆盖率变化（Coverage Delta）；若负向变化超过阈值，仍创建 PR，但添加 `needs-review` 标签。智能体将理由写入 PR 描述，并提供评审者可点名追问的 `@agent` 讨论串。

安全通过两种不同 GitHub 机制限定：App 提供短期安装令牌（Installation Token），具备 `workflows: read` 和受限仓库内容／PR 权限；分支保护（而非 App 权限）强制“不得直接写入 `main`”与“不得强制推送”，App 绝不加入绕过列表（Bypass List）。针对 `.github/workflows` 的路径范围只读访问不是 GitHub App 的实际原语，因此必须在工作者中用文件编辑允许列表（Allow-List）执行。逐仓库逐日预算由分发器强制执行，例如每仓库每天最多 5 个 PR，每 PR 20 美元。

## 架构（Architecture）

```
GitHub 问题标记 `@agent fix` 或 PR 评论
            |
            v
    GitHub App 网络回调 -> AWS Lambda 分发器
            |
            v
    ECS Fargate 任务（或 GitHub Actions 自托管运行器）
       - 拉取仓库
       - 推断 Dockerfile（语言、包管理器）
       - 带目标运行时的 Daytona / E2B 沙箱
       - 克隆 -> git 工作树 -> 智能体分支
            |
            v
    mini-swe-agent / SWE-agent v2 循环
       Claude Opus 4.7 或 GPT-5.4-Codex
       工具：ripgrep、tree-sitter、读取／编辑、run_tests、git
            |
            v
    验证沙箱内 CI 通过 + 覆盖率变化检查
            |
            v（已验证）
    git push + 通过 GitHub App 创建 PR
       PR 正文 = 理由 + 差异摘要 + 轨迹 URL
       标签：needs-review
            |
            v
    操作人员评审，可 @ 点名智能体追问
```

## 技术栈（Stack）

- 触发：GitHub App 使用细粒度令牌；网络回调接收器采用 Lambda 或 Fly.io
- 工作者：ECS Fargate 任务或 GitHub Actions 自托管运行器
- 沙箱：每任务 Daytona 开发容器（Devcontainer）或 E2B 沙箱
- 智能体循环：mini-swe-agent 基线或 SWE-agent v2，调用 Claude Opus 4.7 / GPT-5.4-Codex
- 检索：tree-sitter 仓库映射（Repo-Map）+ ripgrep
- 验证：沙箱内完整 CI + 覆盖率变化关卡
- 可观测性（Observability）：Langfuse，逐 PR 轨迹归档，由 PR 正文链接
- 预算：每仓库每日美元上限；每仓库每日 PR 数量上限

```figure
cf-issue-to-pr
```

## 动手实现（Build It）

1. **GitHub 应用（GitHub App）。** 细粒度安装令牌：issues 读写、pull_requests 写、contents 读写、workflows 读。分支保护是唯一能强制“不得直接推送 `main`”与“不得强制推送”的机制；App 不加入绕过列表。由于 GitHub App 权限不按路径限定，工作者通过检查待应用差异的允许列表，强制“不得写入 `.github/workflows`”。

2. **网络回调接收器（Webhook Receiver）。** Lambda 函数接收问题标签或 PR 评论回调，按 `@agent fix this` 标签过滤，入队到 SQS。

3. **分发器（Dispatcher）。** 从 SQS 取任务，强制执行逐仓库逐日预算。启动 ECS Fargate 任务，传入仓库 URL、问题正文和全新 Daytona 沙箱。

4. **环境推断（Environment Inference）。** 检测语言（Python、Node、Go、Rust）与包管理器（uv、pnpm、go mod、cargo）。没有 Dockerfile 时即时生成。

5. **智能体循环（Agent Loop）。** mini-swe-agent 或 SWE-agent v2 调用 Claude Opus 4.7。工具：ripgrep、tree-sitter repo-map、read_file、edit_file、run_tests、git。硬性限制：20 美元、实际运行 30 分钟、智能体 30 轮。

6. **验证（Verification）。** 循环结束后，在沙箱中运行完整测试套件。通过 jacoco / coverage.py 计算覆盖率变化。CI 失败则停止，不创建 PR；覆盖率下降超过 2% 时，创建带 `needs-review` 标签的 PR。

7. **发布拉取请求（PR Posting）。** 推送智能体分支，通过 GitHub API 创建 PR，附标题、理由、差异摘要、轨迹 URL、成本与轮次。

8. **凭据卫生（Credential Hygiene）。** 工作者使用短期 GitHub App 安装令牌运行。日志归档前清理密钥。

9. **评估（Eval）。** 选取 30 个带固定随机种子、难度不同的内部问题。测量通过率、PR 质量（差异大小、风格、覆盖率）、成本和延迟。在相同问题上与 Cursor Background Agents 和 AWS Remote SWE Agents 比较。

## 实际应用（Use It）

```
# on github.com
  - user labels issue #842 with `@agent fix this`
  - PR #1903 appears 14 minutes later
  - body:
    > Fixed NPE in widget.dedupe() caused by null comparator entry.
    > Added regression test widget_test.go::TestDedupeNullComparator.
    > Coverage delta: +0.12%
    > Turns: 7  Cost: $1.80  Trace: langfuse:...
    > Label: needs-review
```

## 交付成果（Ship It）

`outputs/skill-issue-to-pr.md` 是交付物：GitHub App + 异步云工作者，在成本受限、凭据范围明确的条件下，将标记问题转为可评审 PR。

| 权重 | 标准 | 衡量方式 |
|:-:|---|---|
| 25 | 30 问题通过率 | 端到端成功，CI 通过且覆盖率合格 |
| 20 | PR 质量 | 差异大小、覆盖率变化、风格一致性 |
| 20 | 每个已解决问题的成本与延迟 | 每 PR 美元成本和实际运行时间 |
| 20 | 安全 | 受限令牌、逐仓库预算、禁止强制推送、凭据卫生 |
| 15 | 操作人员体验（Operator UX） | 理由评论、重试入口、@ 点名追问 |
| **100** | | |

## 练习（Exercises）

1. 增加“修复偶发测试”模式：标签 `@agent stabilize-flake TestX` 让测试在沙箱中运行 50 次，并提出使其稳定的最小改动。

2. 在三个相同问题上与 Cursor Background Agents 比较成本。报告各工具在哪些方面胜出。

3. 实现预算仪表盘：逐仓库逐日成本、逐用户成本。对异常告警。

4. 构建“试运行（Dry-Run）”模式，不运行 CI 就创建草稿 PR，让评审者低成本查看计划。

5. 增加保留策略（Retention Policy）：超过 7 天未合并的 PR 分支自动删除。

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|------|-----------------|------------------------|
| GitHub App | “权限受限的机器人身份” | 细粒度权限 + 短期安装令牌的应用 |
| 异步云智能体（Async Cloud Agent） | “后台智能体” | 在云端沙箱而非终端中运行的非交互工作者 |
| 环境推断（Environment Inference） | “Dockerfile 合成” | 检测语言与包管理器，缺少 Dockerfile 时生成 |
| 验证（Verification） | “沙箱内 CI” | 创建 PR 前在工作者内运行完整测试套件 |
| 覆盖率变化（Coverage Delta） | “覆盖率保留” | 从基础分支到智能体分支的测试覆盖率百分比变化 |
| 逐仓库预算（Per-Repo Budget） | “每日上限” | 分发器强制执行的美元与 PR 数量上限 |
| 理由（Rationale） | “PR 正文解释” | 智能体对改动与原因的摘要；PR 正文必需 |

## 延伸阅读（Further Reading）

- [AWS Remote SWE Agents](https://github.com/aws-samples/remote-swe-agents)：典型异步云智能体参考
- [SWE-agent](https://github.com/SWE-agent/SWE-agent)：命令行界面（CLI）参考
- [Cursor Background Agents](https://docs.cursor.com/background-agent)：商业替代方案
- [OpenAI Codex（云端）](https://openai.com/codex)：托管竞品
- [Google Jules](https://jules.google)：Google 托管版本
- [Factory Droids](https://www.factory.ai)：另一商业参考
- [GitHub App 文档](https://docs.github.com/en/apps)：权限受限的机器人身份
- [Daytona 云端沙箱](https://daytona.io)：沙箱参考
