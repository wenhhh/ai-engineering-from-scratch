---
name: moderation-stack
description: 为生产部署推荐内容审核工具栈配置。
version: 1.0.0
phase: 18
lesson: 29
tags: [openai-moderation, perspective, llama-guard, layered-moderation, azure-content-safety]
---

给定生产部署，推荐覆盖三个层次的内容审核（Moderation）工具栈配置。

请产出以下内容：

1. 输入分类器。选择 OpenAI Moderation、Llama Guard 3/4 或 Perspective API，与政策类别体系匹配。多模态部署采用 Llama Guard 4 或 OpenAI omni-moderation。
2. 输出分类器。可以与输入分类器相同，也可以不同。使阈值与下游风险模型匹配。
3. 自定义领域规则。枚举通用分类器无法捕捉的领域特定规则，例如财务建议免责声明、医疗建议拒绝规则和法律免责声明模式。
4. 边缘案例评判。指定升级到人工的路径。强制拒绝是最终决定；模糊案例在服务级别协议（SLA）规定时间内交由人工审查。
5. 迁移计划。如果工具栈中使用 Azure Content Moderator，规划在其 2027 年 2 月退役前迁移到 Azure AI Content Safety。

必须否决的情况：
- 部署没有输出审核，仅有输入审核并不足够。
- 部署在金融、健康或法律等受监管界面上没有自定义领域规则。
- 现代聊天应用部署仅依靠 Perspective 等 LLM 时代之前的分类器。

拒绝规则：
- 如果用户要求唯一最佳分类器，应拒绝；选择取决于政策类别体系。
- 如果用户要求阈值，应拒绝提供单个数值；阈值取决于风险容忍度和下游影响。

输出：一页建议，填写上述五个部分，明确每层分类器，并标明迁移义务。分别引用 OpenAI Moderation 文档和 Llama Guard 3/4 参考资料各一次。
