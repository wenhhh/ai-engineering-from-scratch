# 实践项目板块建设计划

实践项目板块把课程中的单项机制组合成实用交付物。它采用独立的分阶段目录，并沿用课程其他部分的视觉语言、交互式 SVG 图表、智能体导师流程和明确验证方式。本文件说明上游的设计与交付契约，不代表本次汉化已重新执行所有集成和发布验证。

## 交付契约

每个可构建项目包含四至八个有序阶段、真实参考实现、故意未完成的起始代码、针对学习者工作区的确定性测试、原创讲解、每阶段一张机制图，以及实际运行和输出录屏。就绪检查核对文件路径、阶段标识、图表注册和媒体。评分器独立调用实际语言工具链；空测试套件绝不能算作通过。

Python 负责解析、面向模型的协调和评估。Rust 负责有界解析器、检索循环、策略工具和终端接口。TypeScript 负责类型契约、浏览器交付物和工作流接口。Go 负责并发工作进程、网关、队列及网络工具。混合语言项目通过明确的进程接口或 JSON 契约通信。

## 五级学习阶梯

1. 入门：一个实用的输入输出工具及其基本契约。
2. 构建：组合多项机制的流水线。
3. 工程：状态、预算、重试和实测结果。
4. 系统：协议边界、并发、工具策略和进程控制。
5. 前沿：可复现的比较、分布式评估、浏览器控制和轨迹诊断。

项目是范围明确的学习交付物，不宣称生产功能完整。时间估算仅对应提供的阶段；生产加固和在线集成是独立工作。

## 可构建项目目录

| 项目 | 级别 | 语言 | 阶段数 | 预计时间（h 为小时） |
|---|---|---|---|---|
| [数据集划分审计器（Dataset Split Auditor）](dataset-split-auditor/) | 1 | Python | 4 | ~8h |
| [JSON 结构输出守卫（JSON Schema Output Guard）](json-schema-output-guard/) | 1 | TypeScript | 4 | ~8h |
| [提示词回归测试器（Prompt Regression Tester）](prompt-regression-tester/) | 1 | Python | 4 | ~8h |
| [语义笔记检索（Semantic Notes Search）](semantic-notes-search/) | 1 | Python | 4 | ~8h |
| [SKILL.md 校验器与加载器（SKILL.md Validator and Loader）](skill-validator/) | 1 | Rust | 4 | ~8h |
| [微型编程智能体（Tiny Coding Agent）](tiny-coding-agent/) | 1 | Python | 4 | ~8h |
| [词元计数与成本计量器（Token Counter and Cost Meter）](token-counter-and-cost-meter/) | 1 | Rust | 4 | ~8h |
| [日历专注规划器（Calendar Focus Planner）](calendar-focus-planner/) | 2 | TypeScript | 4 | ~8h |
| [Git 更新日志生成器（Changelog Writer From Git）](changelog-writer-from-git/) | 2 | Go | 4 | ~8h |
| [CSV 问答工作台（CSV Question Workbench）](csv-sql-question-workbench/) | 2 | Python | 4 | ~8h |
| [文档抽取审阅台（Document Extraction Review Desk）](document-extraction-desk/) | 2 | Python | 4 | ~8h |
| [带引用的文档问答与 LangChain（Document QA With Citations and LangChain）](doc-qa-with-citations/) | 2 | Python | 4 | ~8h |
| [反馈主题看板（Feedback Theme Board）](feedback-theme-board/) | 2 | TypeScript | 4 | ~8h |
| [邮件分流审阅台（Inbox Triage Desk）](inbox-triage-desk/) | 2 | Python | 4 | ~8h |
| [事故复盘编写器（Incident Postmortem Writer）](postmortem-writer/) | 2 | Go | 4 | ~8h |
| [本地模型评估执行框架（Local Model Evaluation Harness）](local-model-eval-harness/) | 2 | Python | 4 | ~8h |
| [从会议记录生成行动项（Meeting Notes to Actions）](meeting-notes-to-actions/) | 2 | Python | 4 | ~8h |
| [PR 评审报告器（PR Review Reporter）](pr-review-reporter/) | 2 | Python, TypeScript | 4 | ~8h |
| [研究报告智能体（Research Report Agent）](research-report-agent/) | 2 | Rust, Python, TypeScript | 7 | ~20h |
| [检索评估实验室（Retrieval Evaluation Lab）](retrieval-evaluation-lab/) | 2 | Python | 4 | ~8h |
| [技能路由器（Skill Router）](skill-router/) | 2 | TypeScript | 4 | ~8h |
| [基于来源证据的学习教练（Source-Grounded Study Coach）](source-grounded-study-coach/) | 2 | TypeScript | 4 | ~8h |
| [智能体预算规划器（Agent Budget Planner）](agent-budget-planner/) | 3 | Python | 4 | ~8h |
| [智能体追踪调试器（Agent Trace Debugger）](agent-trace-debugger/) | 3 | TypeScript | 4 | ~8h |
| [跨智能体技能安装器（Cross-Agent Skill Installer）](skill-installer/) | 3 | TypeScript | 4 | ~8h |
| [执行框架评测台（Harness Bench）](harness-bench/) | 3 | Go | 4 | ~8h |
| [支持故障切换的 LLM 网关（LLM Gateway With Fallbacks）](llm-gateway-with-fallbacks/) | 3 | Go | 4 | ~8h |
| [多智能体代码评审组（Multi-Agent Code Review Panel）](multi-agent-code-review-panel/) | 3 | TypeScript | 4 | ~8h |
| [持久化记忆服务器（Persistent Memory Server）](memory-server/) | 3 | TypeScript, Rust | 4 | ~8h |
| [RAG 时效维护流水线（RAG Freshness Pipeline）](rag-freshness-pipeline/) | 3 | Python | 4 | ~8h |
| [报告证据评审器（Report Judge）](report-judge/) | 3 | Python | 4 | ~8h |
| [自纠正工作流钩子（Self-Correcting Workflow Hooks）](workflow-hooks/) | 3 | TypeScript | 4 | ~8h |
| [技能供应链扫描器（Skill Supply-Chain Scanner）](skill-scanner/) | 3 | Rust | 4 | ~8h |
| [使用 Google ADK 的支持智能体（Support Agent With Google ADK）](support-agent-with-google-adk/) | 3 | Python | 4 | ~8h |
| [使用 Mastra 的类型化工作流智能体（Typed Workflow Agent with Mastra）](typed-workflow-agent-with-mastra/) | 3 | TypeScript | 4 | ~8h |
| [视觉证据库（Visual Evidence Library）](visual-evidence-library/) | 3 | Python | 4 | ~8h |
| [语音备忘录转录流水线（Voice Note Transcriber Pipeline）](voice-note-transcriber-pipeline/) | 3 | Python | 4 | ~8h |
| [网页变化简报（Web Change Brief）](web-change-brief/) | 3 | Go | 4 | ~8h |
| [AWS Strands 云端智能体（Cloud Agent With AWS Strands）](cloud-agent-with-aws-strands/) | 4 | Python | 4 | ~8h |
| [桌面控制后端（Desktop Control Backend）](desktop-control/) | 4 | Rust | 4 | ~8h |
| [持久化智能体任务（Durable Agent Jobs）](durable-agent-jobs/) | 4 | Go | 4 | ~8h |
| [MCP 工具发现工作台（MCP Tool Discovery Workbench）](mcp-at-scale/) | 4 | Python, TypeScript | 5 | ~10h |
| [沙箱策略规划器（Sandbox Policy Planner）](sandbox-ladder/) | 4 | Rust | 4 | ~8h |
| [Rust 流式智能体执行器（Streaming Agent Shell in Rust）](rust-agent-shell/) | 4 | Rust | 4 | ~8h |
| [工具调用防火墙（Tool Call Firewall）](tool-call-firewall/) | 4 | Rust | 4 | ~8h |
| [浏览器智能体（Browser Agent）](browser-agent/) | 5 | TypeScript, Python | 4 | ~8h |
| [分布式评估集群协调器（Distributed Eval Farm Coordinator）](distributed-eval-farm/) | 5 | Go | 4 | ~8h |
| [自改进技能循环（Self-Improving Skill Loop）](self-improving-skill-loop/) | 5 | Python | 4 | ~8h |

## 规划扩展

目录现有 100 个条目，分布在同样的五个级别中，包括 48 个可构建项目和 52 个规划项目。[项目规划](ROADMAP.md)列出每个规划项目的实用成果、先修路径、原创首个演示构想和四个拟议里程碑。`roadmap.json` 为网站提供规划卡片。只有满足实现、课程、测试、图表和录屏契约，规划项目才能转为可构建状态。

## 研究报告智能体试点

试点采用七个阶段和三种语言。Rust 通过换行分隔 JSON 接口实现 BM25 检索。Python 提取精确的 Unicode 来源区间、规划研究方面、编写带引用的主张、核验证据、执行预算限制并计算评估指标。TypeScript 校验报告契约，生成交互式 HTML 报告，支持悬停或聚焦时查看引用，以及展开运行轨迹。

其核心评分器包含原生 Rust 和 TypeScript 测试，以及提示注入与缓存边界回归套件。评估凭据包含提供的数据集和明确的评分组成；分数描述该夹具的结果，不能证明未见生产数据上的准确率。上游演示录屏展示起始工作区初始化及失败、参考测试通过，以及在真实浏览器中检查报告证据。

## 完成证据与社区投稿

进度复选框是保存在本地浏览器中的自报笔记。完成证明需要一份完整、严格评分且与项目清单匹配的学习者报告，并明确标为本地社区证据。完成核心阶段不表示可选 SDK 检查通过。贡献者保留作者署名；社区项目使用同样的就绪检查和评分契约。

## 验证与发布

共享构建将文档和媒体打包到网站产物中。持续集成检查项目清单、评分器契约、完成证明和每个参考阶段。浏览器验证范围包括桌面与移动端、浅色与深色主题、阶段导航、图表挂载、录屏和证明报告导入。功能拉取请求是审阅边界；部署和合并仍是独立操作。

## 原创性与参考资料

实现和练习均须原创。解释机制时引用原始论文、官方 API 文档和标准，不以其他课程仓库为范本。只有所需集成已实际实现并测试，才将框架名称列为已实现能力。
