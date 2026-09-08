---
name: skill-release-gate
description: 发布前评估 Agent Skill 包的结构完整性、触发质量、制品改善、脚本正确性、安全、安装树完整性和目标宿主可移植性。
license: MIT
metadata:
  lesson: "27"
---

# 技能发布门槛（Skill release gate）

发布或分发 Agent Skill 目录包之前使用此技能。

## 工作流（Workflow）

1. 将 `SKILL_ROOT` 解析为包含这个已安装 `SKILL.md` 的绝对目录。不要假定进程 cwd 就是安装包。
2. 从原工作区工作目录解析 `TARGET_ROOT`，将用户提供候选解析为绝对 `TARGET_BUNDLE`。
3. 从 `SKILL_ROOT` 阅读 `references/eval-contract.md`。
4. 检查 `TARGET_BUNDLE` 下 `evals/cases.json` 中的正例和近似未命中触发案例。
5. 检查 `TARGET_BUNDLE` 下 `evals/artifacts.json` 中基线和使用技能的共享断言。
6. 检查 `TARGET_BUNDLE` 下 `evals/evidence.json` 中显式脚本和安全结果。
7. 检查 `TARGET_BUNDLE` 下 `assets/hosts.json` 中声明运行时能力，并对照 `assets/manifest.json` 验证目标文件哈希。
8. 生产中，将确定性预测、制品、证据和宿主能力替换为捕获结果，设置全部四个捕获模式，并将每个原始触发观察、两个制品、完整证据集和非空宿主矩阵绑定到非空来源和匹配 SHA-256 来源摘要。本地检查可设置 `localEvidenceReady`，但本地可重算哈希不证明捕获。
9. 获取外部 JSON 证明，其 `evidenceRoot` 匹配报告，并从独立可信策略或发布通道获取其精确字节的 SHA-256。证明必须是目标包之外的普通文件。
10. 执行前展示精确解析 argv。已安装评估器是 `SKILL_ROOT` 下的 `scripts/evaluate_skill.py`。对附带课程夹具，以 `python3`、该绝对评估器路径、`--fixture-demo` 和绝对 `TARGET_BUNDLE` 构造 argv。生产中使用同一已安装脚本，带 `--attestation`、`--trusted-attestation-sha256` 和绝对 `TARGET_BUNDLE`，不带 `--fixture-demo`。
11. 返回 `checksPassed`、`fixturePassed`、`localEvidenceReady`、`trustAnchorValid`、`productionReady` 和 `passed`，附证据根、评估模式、失败检查、精确率、召回率、每个原始触发观察、逐案例重复运行比率、制品比较、脚本和安全证据、安装树验证及可移植性矩阵。包含解析脚本路径、目标路径、cwd、精确 argv 和退出码。不可用观察标为未验证。

## 输出契约（Output contract）

返回完整 JSON 评估报告。保留每个分层检查和证据，防止聚合通过隐藏路由、制品、脚本、安全、安装树或可移植性失败。`fixturePassed` 报告教学夹具成功。`localEvidenceReady` 仅报告本地摘要完整性。只有 `productionReady` 也具备有效包外信任锚时，`passed` 才为 true。

## 失败行为（Failure behavior）

配置无效、来源缺失或不匹配、可信证明缺失或无效、文件哈希不同、必需能力缺失或任何生产门槛失败时，以非零结果停止并报告失败层。显式 `--fixture-demo` 路径仅在 `fixturePassed` 为 true 时可成功退出，绝不作发布主张。绝不自动发布、安装到别处、修复证据、创建信任决定或放宽阈值。

不要仅因 SKILL.md 可解析或一个正向提示词激活就发布包。目标丢弃必需配套文件或忽略必需运行时扩展时，不要称包可移植。
