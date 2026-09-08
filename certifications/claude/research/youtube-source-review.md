# YouTube 来源评审（YouTube Source Review）

> 视频教授操作过程，官方文档定义接口。

**评审日期（Reviewed）：** 2026-08-09

视频用于参考教学顺序、实验构想及讲解方式，不作为考试权重、费用、政策、资格或当前 API 字段的权威依据。公开的 2026 年 7 月考试指南及当前 Anthropic 文档优先于所有视频。

## 课程参考支点（Curriculum Anchors）

| 来源（Source） | 价值（Why it matters） | 有用章节（Useful sections） |
|--------|----------------|-----------------|
| [提示词入门（Prompting 101）](https://www.youtube.com/watch?v=ysPbXH0LpIE)，Anthropic | 从失败出发设计提示词，并采用最小干预 | [10:10 分隔符](https://www.youtube.com/watch?v=ysPbXH0LpIE&t=610s)、[13:11 少样本（Few-shot）](https://www.youtube.com/watch?v=ysPbXH0LpIE&t=791s)、[15:47 提示词位置](https://www.youtube.com/watch?v=ysPbXH0LpIE&t=947s) |
| [智能体提示词设计（Prompting for Agents）](https://www.youtube.com/watch?v=XSZP9GhhuAc)，Anthropic | 智能体边界、工具设计、预算及最终状态评估 | [9:47 预算](https://www.youtube.com/watch?v=XSZP9GhhuAc&t=587s)、[15:42 裸基线](https://www.youtube.com/watch?v=XSZP9GhhuAc&t=942s)、[21:38 小规模评估](https://www.youtube.com/watch?v=XSZP9GhhuAc&t=1298s) |
| [CLAUDE.md 文件（The CLAUDE.md file）](https://www.youtube.com/watch?v=O0FGCxkHM-U)，Claude | 将简洁的项目指令用作入门引导 | [0:40 入门引导](https://www.youtube.com/watch?v=O0FGCxkHM-U&t=40s)、[1:57 辅助文档](https://www.youtube.com/watch?v=O0FGCxkHM-U&t=117s) |
| [Claude Code 中的钩子（Hooks in Claude Code）](https://www.youtube.com/watch?v=IkaPHiMDazM)，Claude | 在概率性行为周围设置确定性控制 | [0:13 确定性](https://www.youtube.com/watch?v=IkaPHiMDazM&t=13s)、[1:50 工具执行前阻断](https://www.youtube.com/watch?v=IkaPHiMDazM&t=110s) |
| [工具、技能还是子智能体？（Tool, skill, or subagent?）](https://www.youtube.com/watch?v=mWvtOHlZM-I)，Claude | 拆分积累了过多职责的提示词 | [1:18 提示词膨胀](https://www.youtube.com/watch?v=mWvtOHlZM-I&t=78s)、[3:54 上下文隔离](https://www.youtube.com/watch?v=mWvtOHlZM-I&t=234s)、[35:19 子智能体](https://www.youtube.com/watch?v=mWvtOHlZM-I&t=2119s) |
| [Claude Agent SDK 完整工作坊（Claude Agent SDK full workshop）](https://www.youtube.com/watch?v=TqC1qOfiVcQ)，AI Engineer 与 Anthropic | 运行框架（Harness）、工具、文件、会话、钩子、沙箱及子智能体 | [4:47 文件系统](https://www.youtube.com/watch?v=TqC1qOfiVcQ&t=287s)、[5:46 压缩与钩子](https://www.youtube.com/watch?v=TqC1qOfiVcQ&t=346s)、[14:17 沙箱](https://www.youtube.com/watch?v=TqC1qOfiVcQ&t=857s) |
| [使用 MCP 构建智能体（Building Agents with MCP）](https://www.youtube.com/watch?v=kQmXtrmQ5Zg)，AI Engineer 与 Anthropic | 客户端、服务器、工具、资源、提示词及发现 | [4:24 客户端角色](https://www.youtube.com/watch?v=kQmXtrmQ5Zg&t=264s)、[52:14 工具发现](https://www.youtube.com/watch?v=kQmXtrmQ5Zg&t=3134s) |
| [使用 MCP 和 Claude API 构建应用（Building with MCP and the Claude API）](https://www.youtube.com/watch?v=aZLr962R6Ag)，Anthropic | Claude API 集成形态 | 完整的 25 分钟构建过程，已对照当前 MCP 文档核实 |
| [构建能运行数小时的智能体（Build Agents That Run for Hours）](https://www.youtube.com/watch?v=mR-WAvEPRwE)，AI Engineer 与 Anthropic | 检查点（Checkpoint）、评估器、工作契约及长时程一致性 | [10:14 检查点](https://www.youtube.com/watch?v=mR-WAvEPRwE&t=614s)、[19:02 评估器](https://www.youtube.com/watch?v=mR-WAvEPRwE&t=1142s) |

## 实践实验来源（Practical Lab Sources）

- [基于原始 Messages API 的第一个智能体（Your First Agent on the Raw Messages API）](https://www.youtube.com/watch?v=RheXq2HKJmY) 为原始状态机实验提供参考：检查 `stop_reason`、保留完整消息历史、匹配工具使用标识符、返回工具结果，并在明确终止条件下停止。
- [钩子、防护机制与安全（Hooks, Guardrails and Security）](https://www.youtube.com/watch?v=GGO4tn4RTvY) 为破坏性命令阻断、输出规范化、证据检查及间接提示词注入测试样例提供参考。
- [AI 评估零基础完整课程（Complete Beginner's Course on AI Evaluations）](https://www.youtube.com/watch?v=TL527yTpxlk) 提供了有用的黄金集（Golden set）与人工标签教学顺序。
- [如何系统设置大语言模型评估（How to Systematically Set Up LLM Evals）](https://www.youtube.com/watch?v=a3SMraZWNNs) 强化单元检查、人工审核、模型裁判、A/B 比较，以及分析、测量、改进的循环。

## 认证配套材料（Certification Companions）

- [Claude 认证架构师基础级完整课程（Claude Certified Architect Foundations full course）](https://www.youtube.com/watch?v=reDRM0tqhNs)，由 freeCodeCamp 与 ExamPro 提供，是覆盖面广的主题清单，但不是本课程的编辑范本，也不定义考试事实。
- [Claude 认证架构师基础级考试复盘（Claude Certified Architect Foundations exam review）](https://www.youtube.com/watch?v=n-Jse3TE3MI)，由 Tim Warner 提供，强调针对每个公开场景构建项目，而非背诵答案。
- 独立的助理级和专业级课程表明，保持场景连续性、从事故出发教学是有效的。本课程采用这些模式，但使用新的场景和措辞。

## 用户提供的审计集合（User-Supplied Audit Set）

以下来源按社区材料评审，并对照当前官方考试指南、认证常见问题、Academy 课程目标及产品文档核实。

| 来源（Source） | 保留的信号（Signal kept） | 不作为事实的主张（Claim not treated as fact） |
|--------|-------------|---------------------------|
| [freeCodeCamp 与 ExamPro CCAR-F 课程](https://www.youtube.com/watch?v=reDRM0tqhNs) | 在公开 CCAR-F 场景中按构建优先的顺序教学 | 演示行为、个人建议，以及没有当前文档依据的产品细节 |
| [Chance Xie 考试经验](https://www.youtube.com/watch?v=kY9z4hiH4nk) | 动手使用和场景推理比记忆术语更重要 | 分数、备考时间、难度和回忆的题目模式 |
| [Preporato 学习指南](https://www.youtube.com/watch?v=akzKBQVyFEI) | 可操作的学习节奏和错因分类 | 从原始分数换算及格结果、保证完成时间和预测考试分布 |
| [Ivan Fediaev 考试解析](https://www.youtube.com/watch?v=PUnB9b6VIWk) | 检查精确机制及被排除的替代方案 | 个人经历中的考试构成、难度排名和回忆试题 |
| [freeCodeCamp Claude Code 基础（Claude Code Essentials）](https://www.youtube.com/watch?v=brLhhkUqcn4) | 可作为候选的长篇实践配套材料 | 未引入事实主张：本次审计期间无法获取公开字幕 |
| [Peace Of Code 22 视频播放列表](https://www.youtube.com/playlist?list=PLviC8AFqAj5A9MHkRIn2fU5Ac2lEdJxNf) | 智能体循环、子智能体契约、工具、恢复、上下文及评审演示 | 旧版 MCP 传输指导、用仅靠提示词的 JSON 替代原生结构化输出，以及考试安排 |
| [Tech With Deepanshu Academy 排名](https://www.youtube.com/watch?v=OYyYlH6Un0Y) | 优先学习 API 生命周期、Claude Code 操作、技能、MCP、子智能体和能力局限 | 固定课程数量、课程排名、学习时数估计、证书价值，以及声称高级主题曾出现在考试中 |

排名视频将目录描述为由 18 门课程、五条路径组成，并估计完整学习需 50 至 60 小时。Academy 变化太快，这些数字无法作为课程不变条件。本仓库改为将官方课程目标映射到持久适用的课程，并记录核实日期。

有一项直接纠正关系到教学：视频将 AI 熟练应用（AI Fluency）的第四项能力称为“对话（Dialogue）”。官方框架是**委派（Delegation）、描述（Description）、辨别（Discernment）和尽责（Diligence）**。本课程采用官方术语。视频旁白在描述 18 门课程目录时，又说讲述者完成了 17 门课程，这也是不将目录数量固化为要求的另一个原因。

## 标准教学模式（Standard Teaching Pattern）

1. 展示一种可能发生的失败。
2. 获取可测量的基线。
3. 加入一项设计干预。
4. 同时测试最终状态和执行轨迹。
5. 记录被排除的替代方案。
6. 将结果打包为可供他人检查的交付物。

安全实验始终包含红队（Red team）测试样例。架构实验始终包含独立评审者。专业级实验始终以面向利益相关者的说明和明确具名的运维负责人收尾。

## 漂移警告（Drift Warnings）

- 2025 年 3 月的 MCP 工作坊早于后续传输、身份验证、注册表及 SDK 变化。
- 较早的 Claude Code 视频可能仍有良好的工作流建议，但展示的设置键、权限行为或功能名称已过时。
- 独立认证课程可能落后于大纲修订。
- 个人考试报告是学习者经历，不是规范。
- 关于课程数量、时长、排名和认证价值的主张是目录快照或观点，不是持久适用的认证要求。
- 任何来源都不能为答案模式技巧、重建试题、泄露题库或保证通过的主张提供正当依据。
