# 安全：密钥、API 密钥轮换、审计日志与防护（Security — Secrets, API Key Rotation, Audit Logs, Guardrails）

> 使用集中式保险库（vault），如 HashiCorp Vault、AWS Secrets Manager、Azure Key Vault，消除密钥散落。绝不要把凭据存入配置文件、版本控制中的环境文件或电子表格。优先使用 IAM 角色而非静态密钥，CI/CD 使用 OIDC。AI 网关模式是 2026 年的解决方案：应用 → 网关 → 模型提供商，网关在运行时从保险库获取凭据。在保险库轮换后，所有应用几分钟内即可取得新值，无需重新部署，也无需在 Slack 问“谁有新密钥”。轮换周期 ≤90 天，每次提交使用 TruffleHog / GitGuardian / Gitleaks 扫描。零信任（zero-trust）包括 MFA、SSO、RBAC/ABAC、短期令牌和设备安全状态。PII 清洗在转发前使用实体识别遮蔽 PHI/PII；一致性令牌化（consistent tokenization，Mesh 方法）把敏感值映射为稳定占位符，让 LLM 保留代码和关系语义。网络出站方面，将 LLM 服务放入专用 VPC/VNet 子网，仅允许 `api.openai.com`、`api.anthropic.com` 等，阻断所有其他出站流量。2026 年的警示事件是 Vercel 供应链攻击：攻击者利用被攻破的 CI/CD 凭据，窃取了数千个客户部署的环境变量。

**Type:** Learn
**Languages:** Python（标准库，简化的 PII 清洗器与审计日志写入器）
**Prerequisites:** 阶段 17 · 19（AI 网关），阶段 17 · 13（可观测性）
**Time:** ~60 分钟

## 学习目标（Learning Objectives）

- 列出四种密钥管理反模式：版本控制中的配置文件、硬编码环境变量、电子表格、静态密钥，并指出替代方案。
- 解释 AI 网关从保险库获取凭据的模式，为何是 2026 年生产标准。
- 实现一致性令牌化的 PII 清洗器，同一值映射为同一占位符，以保留语义。
- 指出 2026 年 Vercel 供应链事件，以及它对 CI/CD 凭据安全管理的启示。

## 问题（The Problem）

实习生提交了含 API 密钥的 `.env`，随后迅速删除。但密钥已经进入 git 历史，GitGuardian 扫描发现了它。你的轮换流程却是“在 Slack 通知团队、更新 40 个配置文件、重新部署所有服务”。8 小时后，一半服务已上线，另一半仍在等待部署窗口。

另一边，用户提示词包含“我的社会安全号码（SSN）是 123-45-6789”，并被发往 OpenAI。你签有业务伙伴协议（BAA），但内部策略要求转发前遮蔽 PII，你却没有做到。

再另一边，EKS 集群中的 LLM Pod 可以访问任意互联网主机。有人通过查询攻击者控制域名的 DNS 来外传数据，没有任何机制阻止。

LLM 服务安全必须处理这三个方向：保险库支持的凭据、PII 清洗、网络出站过滤，以及审计日志。

## 概念（The Concept）

### 集中式保险库与 IAM 角色获取（Centralized vault + IAM-role pull）

**保险库（vault）**：HashiCorp Vault、AWS Secrets Manager、Azure Key Vault、GCP Secret Manager，作为唯一可信来源。

**IAM 角色（IAM role）**：应用或网关通过自身 IAM 身份认证，而非静态密钥。保险库在令牌有效期内返回密钥。

**AI 网关模式（AI-gateway pattern）**：网关在请求时从保险库获取 `OPENAI_API_KEY`。在保险库轮换后，下一次请求就获得新密钥，无需重新部署。

### 轮换周期 ≤90 天（Rotation policy ≤ 90 days）

适用于所有 API 密钥、保险库根令牌和 CI/CD 凭据。尽可能自动轮换；手动轮换必须记录并跟踪。

### 密钥扫描（Secret scanning）

- **TruffleHog**：对提交使用正则表达式与熵检测。
- **GitGuardian**：商业产品，准确率高。
- **Gitleaks**：开源，在 CI 中运行。

每次提交都运行。检测到新密钥时阻止 PR。

### 零信任安全安排（Zero-trust posture）

- 所有账户要求多因素认证（MFA）。
- 通过 SAML/OIDC 实现单点登录（SSO）。
- 使用基于角色的 RBAC 或基于属性的 ABAC，实现细粒度访问控制。
- 使用短期令牌，按小时而非天计。
- 检查设备安全状态，只允许启用磁盘加密的公司设备。

### PII / PHI 清洗（PII / PHI scrubbing）

提示词离开基础设施前：

1. 执行实体识别，可用 spaCy NER、Presidio 或商业产品。
2. 遮蔽匹配实体：`"My SSN is 123-45-6789"` → `"My SSN is [SSN_TOKEN_A3F]"`，即将号码替换为占位符。
3. 一致性令牌化（Mesh 方法）：同一值映射为同一占位符，让 LLM 保留关系。
4. 可选地对 LLM 响应执行反向映射。

静态正则过滤器识别基本模式，NER 能识别更多，应组合使用。

### 输入与输出防护（Input + output guardrails）

输入：阻止已知越狱和禁止主题，按用户限流。

输出：用正则清除泄露密钥，例如 API 密钥模式、拒答上下文中的电子邮件模式，再用分类器检查策略违规。

### 网络出站允许列表（Network egress whitelist）

LLM 服务位于专用子网：
- 允许列表：`api.openai.com`、`api.anthropic.com`、向量数据库端点、保险库端点。
- 其他所有目标：丢弃。
- DNS 使用仅允许列表内域名的解析器，避免 DNS 隧道外传。

### 审计日志（Audit log）

为每次 LLM 调用保留不可变日志，包含：
- 时间戳。
- 用户与租户。
- 提示词哈希，出于隐私考虑不记录原始提示词。
- 模型与版本。
- 词元数量。
- 成本。
- 响应哈希。
- 任何防护触发情况。

按监管要求保留：SOC 2 为 1 年，HIPAA 为 6 年。

### 2026 年 Vercel 事件（The 2026 Vercel incident）

供应链攻击利用被攻破的 CI/CD 凭据，窃取数千个客户部署的环境变量。教训是：CI/CD 凭据应按生产凭据对待，存入保险库，严格限制权限范围，并频繁轮换。

### 应记住的数字（Numbers you should remember）

- 轮换周期：≤90 天。
- 每次提交扫描：TruffleHog / GitGuardian / Gitleaks。
- Vercel 2026：CI/CD 凭据被攻破 → 数千客户的环境变量泄露。
- 审计日志保留：SOC 2 = 1 年，HIPAA = 6 年。

```figure
i4-vault-rotation
```

## 动手使用（Use It）

`code/main.py` 实现带一致性令牌化的简化 PII 清洗器，以及仅追加审计日志。

## 交付成果（Ship It）

本课产出 `outputs/skill-llm-security-plan.md`。它根据监管范围和当前状态，规划保险库迁移、清洗器、出站策略和审计日志。

## 练习（Exercises）

1. 运行 `code/main.py`，发送两个引用同一 SSN 的提示词，确认两者获得相同占位符。
2. 为 EKS 上的 vLLM 部署设计网络出站策略，它需要调用 OpenAI、Anthropic 和 Weaviate。
3. 你在两年前的 git 历史中发现密钥。正确响应是轮换密钥、清理历史，还是两者都做？说明理由。
4. 审计日志每天增长 10 GB。设计保留分层：热层 30 天、温层 12 个月、冷层 6 年。
5. 论证反向令牌化，即将真实值替换回 LLM 响应，相比保留可见占位符，是否值得增加复杂性。

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|------|----------------|------------------------|
| 保险库（Vault） | “密钥存储” | 集中式凭据管理服务 |
| IAM 角色（IAM role） | “基于身份认证” | 应用承担的角色，返回短期凭据 |
| CI/CD 的 OIDC（OIDC for CI/CD） | “云签发令牌” | CI 中不用静态密钥，通过 OIDC 建立身份 |
| TruffleHog / GitGuardian / Gitleaks | “密钥扫描器” | 提交时检测密钥 |
| RBAC / ABAC | “访问控制” | 基于角色与基于属性的控制 |
| PII 清洗（PII scrubbing） | “数据遮蔽” | 移除敏感实体或将其令牌化 |
| 一致性令牌化（Consistent tokenization） | “稳定占位符” | 同一值每次映射为同一令牌 |
| Mesh 方法（Mesh approach） | “Mesh 令牌化” | 保留语义的令牌化模式 |
| 出站允许列表（Egress whitelist） | “出站白名单” | 仅可访问获准域名 |
| 审计日志（Audit log） | “不可变历史” | 用于合规的仅追加记录 |

## 延伸阅读（Further Reading）

- [Doppler：高级 LLM 安全](https://www.doppler.com/blog/advanced-llm-security)
- [Portkey：通过密钥引用管理 LLM API 密钥](https://portkey.ai/blog/secret-references-ai-api-key-management/)
- [Datadog：LLM 防护最佳实践](https://www.datadoghq.com/blog/llm-guardrails-best-practices/)
- [JumpServer：2026 年密钥管理最佳实践](https://www.jumpserver.com/blog/secret-management-best-practices-2026)
- [Microsoft Presidio](https://github.com/microsoft/presidio)：PII 检测和匿名化。
- [HashiCorp Vault 文档](https://developer.hashicorp.com/vault/docs)
