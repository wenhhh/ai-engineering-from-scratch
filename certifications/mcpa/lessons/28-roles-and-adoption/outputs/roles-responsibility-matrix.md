# 角色与责任矩阵（Roles and Responsibility Matrix）

面向 MCPA“用例与生态”领域的一页参考，对齐 MCP 2026-07-28。

## 六类角色

| 角色 | 负责内容 |
|------|------|
| 服务器作者 | 工具、模式、server/discover 和无状态实现 |
| 宿主与客户端开发者 | 应用、能力声明、OAuth 客户端及同意界面 |
| 平台或网关运营者 | stdio 环境、连接终止、网络策略及边缘头部检查 |
| 安全与治理负责人 | 令牌、requestState 保护、同意策略等跨实现要求 |
| 注册目录发布者 | server.json、命名空间验证和目录信息准确性 |
| 最终用户 | 作出同意决定，对宿主代表自己的操作承担授权责任 |

## 三条采用路径

| 路径 | 责任变化 |
|------|---------------|
| 本地 stdio | 不构建 OAuth 客户端，由运营者在启动前提供环境凭据 |
| 带 OAuth 的远程 Streamable HTTP | 服务器作者实施受保护资源元数据和 Origin 校验；宿主与客户端开发者实现 OAuth 客户端及资源指示参数 |
| 带扩展的企业网关部署 | Origin 与头部检查转由平台或网关运营者承担；安全治理制定策略；扩展支持转为组织允许列表 |

## 示例：Origin 校验

Streamable HTTP 要求服务器 MUST 在所有入站连接上校验 Origin，防御 DNS 重绑定。直接 HTTP 下，服务器作者负责，因为请求先到服务器代码；前置网关时，平台或网关运营者负责，因为连接先由网关终止。规范要求未变，负责人随部署形态变化。

## 治理速查

- 托管：按本课固定资料，为 Agentic AI Foundation 项目。
- 层级：Lead Maintainer 拥有最终否决权；Core Maintainer 负责规范和项目方向；Maintainer 负责具体领域；持续贡献者先成为 Member。
- 工作组：构建具体交付物，通常是 SEP 和参考实现。
- 兴趣组：讨论问题，提出不具约束力的建议。
- SEP 状态：draft、in-review、accepted 或 rejected；参考实现和必需符合性测试落地后才为 final。
- 功能生命周期：Active，可选进入 Deprecated（须有迁移方案和至少十二个月窗口），最终才可能 Removed。

## SDK 等级与采用决策

| 等级 | 符合性 | 新功能 | 关键缺陷 |
|------|-------------|---------------|-----------------|
| Tier 1 | 100% | 规范发布前或同时支持 | 7 天内修复 |
| Tier 2 | 80% | 6 个月内支持 | 2 周内修复 |
| Tier 3 | 无最低要求 | 无时间承诺 | 无要求 |

## 考试要点

- 宿主、客户端、服务器描述通信拓扑；上述六类角色描述真实部署中谁对要求负责。
- 同一 MUST 可随部署改变负责人，网关也因此接手新责任。
- 团队矩阵中无人认领的 MUST 是需要补齐的缺口，不能跳过。

来源：certifications/mcpa/research/mcp-2026-07-28-brief.md；MCP 社区文档 governance、working-interest-groups、sep-guidelines、sdk-tiers。
