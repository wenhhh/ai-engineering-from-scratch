# Claude 认证来源核实台账（Claude Certification Source Verification Ledger）

> 社区材料用于发现教学缺口；Anthropic 官方来源决定哪些内容可以作为课程事实。

**核实日期（Verified）：** 2026-08-09

## 权威优先顺序（Authority Order）

1. 当前公开考试指南和认证常见问题确定考试大纲、交付形式、评分、资格、有效期、定价及补考政策。
2. 当前 Anthropic 产品文档和 Academy 课程目标确定产品机制及推荐学习入口。
3. 社区视频、文章和练习材料可以启发讲解、练习或薄弱环节识别，但不能定义考试。
4. 任何来源都不得用于重建保密试题或承诺通过考试。

## 已核实的项目事实（Verified Program Facts）

- 报名目前仅限 Claude Partner Network 组织，要求使用受认可的公司域名。
- Pearson 通过在线监考或考试中心组织考试。
- 每项考试允许作答 120 分钟。考生应为完整预约预留约 135 分钟。
- 及格标准为 100 至 1,000 分量表中的 720 换算分（Scaled score），不能由原始百分比直接换算。
- 认证有效期为 12 个月。
- 考试为闭卷，不允许使用文档、笔记、AI 助手或浏览器翻译工具。
- 补考等待期依次为 14 天、30 天、90 天；在滚动 12 个月内，每项考试最多尝试四次。
- 先前的官方练习考试已经停用。当前考试指南包含示例题。
- 当前标价为助理基础级（Associate Foundations）$99、开发者基础级（Developer Foundations）$125、架构师基础级（Architect Foundations）$125、架构师专业级（Architect Professional）$175。
- 架构师基础级不是架构师专业级的先修认证，也不会自动升级为后者。

来源：[官方认证常见问题](https://anthropic-partners.skilljar.com/page/faq-certifications)、
[官方备考课程索引](https://anthropic-partners.skilljar.com/page/claude-certification-exam-prep-courses)、
[CCAO-F 指南](https://everpath-course-content.s3-accelerate.amazonaws.com/instructor%2F6nizmqk8tpzpfjvt6qmmav7rh%2Fpublic%2F1783542847%2FClaude+Certified+Associate+%E2%80%93+Foundations+Exam+Guide.pdf)、
[CCDV-F 指南](https://everpath-course-content.s3-accelerate.amazonaws.com/instructor%2F6nizmqk8tpzpfjvt6qmmav7rh%2Fpublic%2F1783542875%2FClaude+Certified+Developer+%E2%80%93+Foundations+Exam+Guide.pdf)、
[CCAR-F 指南](https://everpath-course-content.s3-accelerate.amazonaws.com/instructor%2F6nizmqk8tpzpfjvt6qmmav7rh%2Fpublic%2F1783542750%2FClaude+Certified+Architect+%E2%80%93+Foundations+Exam+Guide.pdf)和
[CCAR-P 指南](https://everpath-course-content.s3-accelerate.amazonaws.com/instructor%2F6nizmqk8tpzpfjvt6qmmav7rh%2Fpublic%2F1783542810%2FClaude+Certified+Architect+%E2%80%93+Professional+Exam+Guide.pdf)。

## 社区主张的处理（Community Claim Disposition）

### 考生文章（Candidate article）

所附考生评述有助于优先安排精确机制和场景判断的学习。文中发表的用时、分数、课程完成时间估计、考试难度排名、建议报考顺序及凭记忆描述的题型构成，仍属于个人亲历经验。

以下两项主张不得成为官方课程事实：

- 考试不只在线进行。Pearson 也提供考试中心形式。
- 公布的 CCAR-P 规范列出了单项选择和多项选择题。某位考生见到的匹配或下拉界面，不构成第三种官方题型。

### 练习 PDF（Practice PDF）

所提供的 60 题助理练习材料按七个公开领域的权重编排，答案可以得到合理论证。它仍是独立练习来源，课程不复制其中任何题目措辞。

以下三点提醒用于改进本课程自己的讲解：

- 内部笔记工作流必须明确内容不敏感，且已依据组织政策获准使用。
- 项目知识是可检索的上下文，不会自动成为事实，相关主张仍需验证。
- 75% 的练习目标是学习启发式标准，不是官方换算分数的对应值。

### 视频与播放列表（Videos and playlist）

各来源的完整处理记录维护在 [`youtube-source-review.md`](youtube-source-review.md)。在本次审计集合中，可持续使用的信号包括实践构建、精确机制查阅、场景权衡、错误诊断和反复复习。个人分数、学习时数、目录数量、产品排名、回忆试题以及保证某主题必考的说法，均不作为事实输入。

Academy 排名视频将 AI 熟练应用（AI Fluency）的第四项能力错称为“对话（Dialogue）”。Anthropic 官方框架使用的是**尽责（Diligence）**。本课程教授委派（Delegation）、描述（Description）、辨别（Discernment）和尽责（Diligence）。

## 产品机制漂移控制（Product-Mechanics Drift Controls）

- 将 stdio 和 Streamable HTTP 视为当前 MCP 传输方式。需要历史背景时，将旧版 HTTP+SSE 标记为已弃用。
- 需要机器契约时，优先采用原生结构化输出或严格工具模式，而非只靠提示词要求 JSON。
- 通过带日期的决策流程教授速度、努力程度、思考和模型选择，而不是提供永久有效的兼容性表。
- 发布前，对照当前文档核实 Claude Code 的精确标志、路径、设置优先级、钩子（Hooks）及 Agent SDK 生命周期字段。
- 将直接使用 Claude、Amazon Bedrock、Google Vertex AI 和 Microsoft Foundry 保持为部署选项；其适合程度取决于采购、身份、合规、云服务承诺、运维控制及成本。

## 发布规则（Release Rule）

课程发布前，重新检查常见问题、四份考试指南、官方课程目标，以及课程引用的每项精确产品机制。仅凭社区来源的变化，绝不能修改大纲、分数、报考资格规则或评估格式。
