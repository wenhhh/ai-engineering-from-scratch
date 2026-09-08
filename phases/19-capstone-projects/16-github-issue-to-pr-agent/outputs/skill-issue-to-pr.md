---
name: issue-to-pr
description: 构建异步 GitHub 问题到 PR 智能体，在云端沙箱中复现构建、验证测试，并在严格逐仓库预算内创建可评审 PR。
version: 1.0.0
phase: 19
lesson: 16
tags: [capstone, async-agent, github, fargate, daytona, swe-bench, budget, safety]
---

给定问题已标记 `@agent fix this` 的 GitHub 仓库，交付自托管云智能体，以范围受限凭据和有界成本，将每个标记问题转为可评审 PR。

构建计划（Build Plan）：

1. GitHub App 使用细粒度令牌：issues 读写、PR 写、contents 读写、workflows 读。禁止强制推送。main 分支保护阻止直接写入。
2. 网络回调接收器（Webhook Receiver，Lambda 或 Fly.io）过滤标签／PR 评论事件，入队到 SQS。
3. 分发器（Dispatcher）强制逐仓库逐日美元与 PR 数上限；每个获准作业启动一个 ECS Fargate 任务。
4. 环境推断（Environment Inference）：根据仓库内容检测语言、包管理器与运行时。没有 Dockerfile 时即时合成。
5. 每任务使用 Daytona 或 E2B 沙箱，将仓库克隆到全新 `git worktree` 与智能体分支。
6. 智能体循环：mini-swe-agent 或 SWE-agent v2，调用 Claude Opus 4.7 或 GPT-5.4-Codex。工具：ripgrep、tree-sitter repo-map、read_file、edit_file、run_tests、git。上限：20 美元、30 轮、30 分钟。
7. 验证：沙箱内完整 CI；jacoco / coverage.py 测量覆盖率变化；变化 < -2% 时标记 `needs-review`；CI 失败则停止。
8. 通过 GitHub API 创建 PR，附理由、差异摘要、轨迹 URL、成本、轮次。
9. 可观测性（Observability）：每 PR 的 Langfuse 轨迹；日志密钥清理；逐仓库预算仪表盘。
10. 在 30 个带固定随机种子的内部问题上评估；在三个相同问题的子集上与 Cursor Background Agents、AWS Remote SWE Agents 比较。

评估标准（Assessment Rubric）：

| 权重 | 标准 | 衡量方式 |
|:-:|---|---|
| 25 | 30 问题通过率 | 端到端成功，CI 通过且覆盖率合格 |
| 20 | PR 质量 | 差异大小、覆盖率变化、风格一致性 |
| 20 | 每个已解决问题的成本与延迟 | 每 PR 美元成本与实际运行时间 |
| 20 | 安全 | 受限令牌、逐仓库预算、禁止强制推送、凭据卫生（Credential Hygiene） |
| 15 | 操作人员体验（Operator UX） | 理由评论、重试入口、@ 点名追问 |

直接判定不合格的情况（Hard Rejects）：

- 任何能强制推送的智能体。严格排除。
- 分发器跳过预算检查。失控循环是典型失败。
- 完整 CI 尚未在沙箱通过就创建 PR。
- 轨迹归档含未脱敏令牌或个人身份信息（PII）。

拒绝规则（Refusal Rules）：

- main 没有分支保护时拒绝安装。
- 没有逐仓库每日预算（美元和 PR 数量）时拒绝运行。
- 拒绝自动重试失败运行；所有重试都需人工重新添加标签。

输出：一个仓库，包含 GitHub App、网络回调接收器、分发器与预算台账、Fargate 任务定义、沙箱生命周期管理器、mini-swe-agent 循环、30 问题评估运行、与 Cursor Background Agents 和 AWS Remote SWE Agents 的并排比较，以及说明三种主要构建推断失败及分别减少这些失败的 Dockerfile 合成改动的报告。
