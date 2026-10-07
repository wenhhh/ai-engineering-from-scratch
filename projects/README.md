# 实践项目

从零构建实用的 AI 工程工具，每完成一个阶段就进行测试。目录涵盖 Python、Rust、TypeScript 和 Go，共 100 个项目：48 个可开始构建，另有 52 个列入[规划](ROADMAP.md)。

每个可构建项目都包含可运行的参考实现、学习者起始代码、累计阶段测试、机制图、讲解，以及实际运行和输出的 GIF 录屏。核心测试使用本地夹具，不需要模型凭据。可选框架对照使用真实 SDK 和确定性的模拟模型。规划项目目前只有预期成果与学习里程碑，尚无对应实现和完成测试。

## 开始

```bash
python3 scripts/project_test.py semantic-notes-search --list
python3 scripts/project_test.py semantic-notes-search --init my-semantic-notes-search
python3 scripts/project_test.py semantic-notes-search --stage 1 --path my-semantic-notes-search
```

使用 Python 3.12+；TypeScript 使用 Node 22.18+；Rust 使用支持 edition 2021 的 rustc；Go 使用 1.23+。只安装项目语言标记要求的工具链。参考解答属于教师提供的教学材料：

```bash
python3 scripts/project_test.py research-report-agent --all --solution --strict
python3 scripts/project_test.py --all --solution --strict --report project-results.json
```

使用 `node site/build-projects.js --strict` 构建网站。构建会将项目课程和录屏一起打包用于静态托管，预览分支不依赖 GitHub main 上尚未发布的文件。

## 跟随智能体学习

在 Claude Code 中使用 `/build-project <id>`。在 Codex 或其他兼容宿主中，要求它为所选项目使用 `build-project` 技能。导师每次讲授一个阶段：预测、构建、测试、复盘。学习笔记保存在你自己的 `PROJECTS-LEARNING.md` 中。

## 完成证据

```bash
python3 scripts/project_test.py semantic-notes-search --all --strict --path my-semantic-notes-search --report completion.json
```

在项目页面导入 `completion.json`，填写姓名后下载可打印的 HTML 完成证明。每个阶段都必须实际执行至少一项测试，全部通过且无跳过。参考解答、部分阶段运行和过期项目清单均不能用于取得完成资格。该证明是基于学习者自报的本地社区课程记录，未经监考，也不属于厂商认证。可选 SDK 验证与核心内容完成资格分开处理。

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

## 项目规划

[52 个规划项目](ROADMAP.md)覆盖全部五个级别，进一步扩展实用应用、数据与多模态工作流、开发者工具、开发运维和智能体系统。每份简介列明交付物、先修项目、首个演示和四个拟议里程碑。网站将这些卡片标为规划中，不计入已完成阶段或完成证明。

## 构建可实际使用的应用

应用路线新增八个项目：CSV 问答工作台、文档抽取审阅台、日历专注规划器、反馈主题看板、邮件分流审阅台、基于来源证据的学习教练、视觉证据库和网页变化简报。每个项目都接受你自己的输入，并导出可审阅的交付物，例如 HTML、JSON、iCalendar 或未发送的邮件草稿。

先掌握列明的先修知识，运行一个夹具，改变一项输入并预测结果，再在自己的工作区逐阶段实现。可编辑的机制图展示中间值；通过测试并明确限制，有助于其他开发者集成交付物。受欢迎程度需要在发布后测量，课程本身不保证这一结果。

## 框架对照

文档问答使用 LangChain 的分割器和模型接口。支持请求路由使用 Google ADK 实现真实的专门智能体交接。云端检查项目使用 AWS Strands 和本地模型，只有明确选择后才执行云调用。类型化工作流将手写执行器与 Mastra 对照。框架仅用于这些具体任务，标准库实现仍可直接查看。

这四个框架项目均说明依赖安装方式，并使用 `--optional --strict`。缺少模块时会跳过并给出安装提示；严格模式将该情况视为失败。使用模拟模型的测试验证 SDK 集成，不验证在线服务商行为。

## 范围与证据

公开夹具可供审阅，并非保密数据。评估分数只描述这些夹具的结果，不能证明生产性能。沙箱项目只规划策略，不提供操作系统隔离。桌面控制验证夹具后端，原生访问仍需明确选择。浏览器项目除确定性夹具外，还包含真实浏览器适配器。语音处理包含实际 PCM 分段和 multipart HTTP 识别适配器；离线语音夹具使用明确提供的参考转录文本。

## 贡献项目

阅读[编写规范](AUTHORING.md)和[投稿说明](SUBMITTING.md)。复制[_template/](_template/)，实现原创且实用的交付物，并为各阶段添加实际测试学习者代码的检查。
