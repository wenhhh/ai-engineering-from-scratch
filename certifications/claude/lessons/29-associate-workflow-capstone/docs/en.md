# 交付一周工作，而非完美提示词（Ship a Week of Work, Not a Perfect Prompt）

> 综合实践交付的是受治理的决策工作流：输入来源、核查主张、保留人类权限，并交接状态。

**Type:** Build
**Languages:** Python
**Prerequisites:** [选择能够承载工作的最小使用界面（Choose the Smallest Surface That Can Carry the Work）](../../01-claude-product-and-model-landscape/), [将请求转为可测试契约（Turn a Request Into a Testable Contract）](../../03-prompting-and-task-decomposition/), [把每项事实放入正确类型的上下文（Put Each Fact in the Right Kind of Context）](../../04-context-knowledge-memory-and-caching/), [验证主张，而非置信度（Validate the Claim, Not the Confidence）](../../05-output-evaluation-and-validation/), [用权限约束能力（Put Authority Around Capability）](../../06-governance-safety-and-responsible-use/), [先设计交接，再设计自动化（Design the Handoff Before the Automation）](../../07-workflow-design-and-human-handoffs/)
**Time:** ~4 小时，分布在一个模拟工作周

## 学习目标（Learning Objectives）

- 综合产品选择、提示词、知识管理、验证、治理、故障排查与交接设计。
- 构建由来源支持、具有明确检查点的周报工作流。
- 实现确定性 Python 校验器，检查来源、主张、治理和交接就绪。
- 建议发布前运行正常与失败案例。
- 提供就绪证据，而非只声称工作流安全。

## 问题（The Problem）

你是虚构公司 Northstar Field Services 的运营主管，公司有七个区域团队。每周五，领导小组需要一份简报，涵盖服务延迟、影响客户的事故、政策例外，以及下周要作出的两项决策。

当前流程脆弱。区域负责人用不同格式发送更新。分析人员把事实复制进文档，核对冲突日期，并请三人审批。最终简报有时遗漏区域，或沿用旧消息中的已更正数字。

领导要求你“用 Claude 自动生成周报”。这不是方案。简报影响人员配置和客户沟通，部分输入包含客户信息，政策例外需要获授权负责人。没有证据却充满信心的草稿，可能加速错误决策。

你的工作是设计有边界的 Claude 辅助工作流。Claude 可以提取、比较和起草，确定性检查验证精确属性。获授权的人负责发布和有实质后果的决策。

## 概念（The Concept）

### 交付物是一条证明链（The deliverable is a chain of proof）

你将交付五个相互关联的成果：

1. 用例与产品选择记录。
2. 持续维护的来源注册表和固定每周快照。
3. 分阶段提示词契约。
4. 主张证据与治理验证结果。
5. 带后备方案的人工交接包。

```mermaid
flowchart LR
    A["周一：界定与选择"] --> B["周二：治理来源"]
    B --> C["周三：提取与起草"]
    C --> D["周四：验证与质疑"]
    D --> E["周五：交接与评审"]
    E -->|"新失败"| F["添加评估案例"]
    F --> A
```

每天以门禁结束。门禁失败时，不要把不确定性推给下游。

### Python 校验器刻意保持有限（The Python validator is intentionally limited）

综合实践代码不调用 Claude。它展示关键架构边界：精确工作流属性属于确定性代码。

校验器检查：

- 必需包章节是否存在。
- 每个活跃来源是否有负责人、权威性、日期、敏感度和稳定 ID。
- 主张是否引用已知来源。
- 有实质后果的主张是否使用直接或计算支持。
- 过时与冲突证据是否可见。
- 所选使用界面是否获准处理该数据类别。
- 高后果或不可逆工作是否有获授权人类负责人。
- 交接是否明确决策、期限、后备方案和下一位负责人。

它不能判断政策是否在伦理上充分、人工评审者是否胜任，或来源陈述是否真实。这些仍是组织与人类职责。

## 动手实现（Build It）

## 交互实验（Interactive Lab）

```figure
29-associate-capstone-readiness
```

五天构建期间使用就绪看板。它关联用途、来源、提示词阶段、主张支持、权限、交接和后备方案，防止精美简报掩盖门禁失败。

## 实践实验（Practice Lab）

完成下面五天工作流，再依次故意破坏使用界面、来源、主张支持、权限和交接门禁。

## 交付物（Shipped Artifact）

交付的清单与填写完成的 [`outputs/demo-readiness-report.json`](../outputs/demo-readiness-report.json) 就是实践输出。

## 验证（Verify It）

使用下方命令复现通过的证据包和全部失败优先测试；不需要网络或凭据。课程测验是最后的个人检查。

## 综合实践衔接（Capstone Connection）

完成的证据包就是由另一人评审的入门认证（Associate）路线综合实践证据。

### 周一：界定决策与产品使用界面（Monday: scope the decision and product surface）

用一句话写出决策：

```text
到周五 15:00，运营总监将依据已批准的区域快照，
为下周选择不超过两项人员配置或流程调整。
```

定义范围之外的事项：

- 不自动发送客户消息。
- 不对员工表现排名。
- 不修改排班。
- 不作法律或监管结论。
- 不使用受限数据。

比较候选使用界面。一次性聊天容易，但不利于维护指令和周期性来源集。如果当前条款、套餐控制和数据处理获准，Project 可能适合协作与重复工作。需要程序化摄取、验证和审计集成时，API 可能适合。Research 适合当前外部事实，不能替代内部已批准政策。

记录决策，而非只有产品名：

```text
使用界面：
适合的原因：
允许的数据类别：
当前条款核查日期：
不支持的需求：
后备界面或人工路径：
```

门禁：负责人批准用途、使用界面、数据类别和禁止操作。

### 周二：冻结并治理证据（Tuesday: freeze and govern the evidence）

为以下来源创建注册表：

- 七份区域状态文件。
- 事故系统导出。
- 已批准服务政策。
- 人员容量表。
- 上周决策记录。

每个来源需要稳定 ID、负责人、权威类别、生效日期、复审日期和敏感度。讨论笔记标为参考，不是政策。决策不需要客户姓名时，移除姓名。

在记录明确的时点冻结每周来源快照。之后变化的事实进入修订或例外流程，否则草稿、评审者和领导可能各自看到不同世界。

定义权威顺序：

```text
1. 已批准服务政策和已签署事故状态
2. 截止时间前提交的当前区域状态
3. 先前决策记录
4. 讨论笔记，仅作为线索，绝不单独支持主张
```

门禁：七个区域全部存在，或明确标为缺失；来源通过时效和权限检查；冲突有负责人。

### 周三：分解工作（Wednesday: decompose the work）

不要一步要求最终简报，使用四个有边界阶段。

**阶段 1，提取（extraction）：** 返回区域、延迟、受影响服务、事故 ID、政策例外、来源 ID 和不确定性的结构化行，不推荐操作。

**阶段 2，核对（reconciliation）：** 检查区域覆盖、总数、重复事故、日期冲突和无依据字段。仍有阻塞项就停止。

**阶段 3，分析（analysis）：** 识别模式，提出不超过三个候选操作。每个操作都需要支持发现、政策约束、可能收益、不利影响，以及有权授权的负责人。

**阶段 4，起草（drafting）：** 只根据已验证行和已批准分析生成管理层简报，包含所需决策、证据、例外和已知不确定性。

每个阶段使用提示词契约，包含来源层级、拒答行为、输出结构和验收标准。保存版本，确保失败结果可以复现。

门禁：分析前，结构化提取结果与快照核对一致。

### 周四：验证与质疑（Thursday: validate and challenge）

运行附带校验器：

```bash
cd certifications/claude/lessons/29-associate-workflow-capstone
python3 code/main.py
```

演示包应返回 `ready_for_human_review` 状态。现在故意破坏它：

- 将 `approved_surface` 设为 false。
- 移除来源负责人。
- 引用不存在的来源 ID。
- 将有实质后果的主张标为推测。
- 移除决策负责人。
- 使操作不可逆。

运行单元测试：

```bash
python3 -m unittest discover -s code/tests -v
```

再为实际草稿创建主张证据矩阵。引用必须支持确切主张。用代码或电子表格验证总数，而非模型评分器。向独立评审者提供评分标准与证据，要求报告发现，而不是静默改写草稿。

采用发布等级：

- **阻止（Block）：** 未批准数据或使用界面、未知来源、无效总数、无依据的高后果主张、缺失决策权限。
- **修订（Revise）：** 覆盖不全、冲突未解决、来源过时、不确定性不清。
- **质量改进（Quality improvement）：** 重复、标题薄弱或非关键语气问题。

门禁：所有阻塞项已解决，剩余不确定性在人工包中可见。

### 周五：交接并闭合反馈循环（Friday: hand off and close the loop）

完成 [`outputs/checklist.md`](../outputs/checklist.md)，构建评审包：

```text
决策：最多选择两项下周干预。
负责人：运营总监。
期限：周五 15:00。
快照：每周来源注册表版本与截止时间。
候选：简报版本和提示词版本。
证据：主张 ID、来源 ID、计算。
检查：通过、失败和人工评审项。
不确定性：缺失区域、冲突日期或薄弱支持。
选项：批准、修订、拒绝、升级。
后备方案：发布人工模板，或通知延期。
```

总监批准的是决策，不是“AI”。记录谁基于哪个快照批准了什么。审批后来源变化时，使发布门禁失效，并评审差异。

模拟发布后，进行简短复盘：

- 哪个阶段消耗最多人工时间？
- 哪项检查发现最严重缺陷？
- 是否有重要判断变得更难？
- 哪个来源需要更明确归属？
- 哪项失败应进入评估集？
- 工作流应继续辅助、转为有限自动化，还是回到人工？

## 实际应用（Use It）

### 完整证据包（A complete evidence package）

提交内容应包含：

- 带核查日期的使用界面选择记录。
- 十个来源的注册表，或覆盖全部必需来源类别的更小等价集合。
- 四份提示词阶段契约。
- 至少十个评估案例：四个正常、三个边界、三个治理或对抗。
- 每项高后果主张的主张证据矩阵。
- 一个通过和三个失败包的校验器输出。
- 通过的单元测试输出。
- 完成的人工交接清单。
- 一页复盘，包含一项具体工作流改变。

### 综合实践决策模式（Capstone decision patterns）

评审工作或回答考试场景时使用：

1. **用途未获批准就停止（No approved purpose, stop）。** 能力不创造权限。
2. **没有权威证据就拒答或升级（No authoritative evidence, abstain or escalate）。** 更多提示不能创造来源。
3. **精确属性使用确定性检查（Exact property, deterministic check）。** 总数和模式不需要主观评分。
4. **高后果需要人类权限（High consequence, human authority）。** 给人证据和拒绝权。
5. **反复失败就修系统（Repeated failure, repair the system）。** 添加案例、控制或来源规则。
6. **易变产品事实实时核实（Changeable product fact, verify live）。** 记录使用界面、日期和来源。

### 常见陷阱（Common traps）

- **从最终提示词开始（Starting with the final prompt）：** 范围和来源失败变成文字问题。
- **上传全部档案（Uploading the archive）：** 已被替代证据与有效政策竞争。
- **信任引用语法（Trusting citation syntax）：** 被引来源未必蕴含主张。
- **让评审者重新发现状态（Letting the reviewer rediscover state）：** 交接时间耗掉承诺的节省。
- **先自动化发布（Automating publication first）：** 忽略可逆性与权限。
- **把测试当安全证明（Treating tests as proof of safety）：** 单元测试覆盖已实现规则，不代表组织事实。
- **在设计中冻结当前产品细节（Freezing current product details in the design）：** 条款、功能、模型、成本和限制会变化。

### 练习（Exercises）

1. 用真实周期任务替换虚构场景，保留五天门禁。
2. 为工作流特有政策添加校验规则。
3. 实现规则前先写失败测试。
4. 在相同十个案例上比较单个庞大提示词与四阶段流程。
5. 请评审者仅凭你的包完成交接，记录他们额外询问的每项事实。
6. 计算每份获接受简报的成本，包含评审和返工时间。

## 关键术语（Key Terms）

- **决策工作流（Decision workflow）：** 将受治理证据转化为经评审操作或建议的序列。
- **来源快照（Source snapshot）：** 单次运行使用的固定版本化证据集。
- **高后果主张（Consequential claim）：** 实质影响决策或操作的主张。
- **验证包（Validation packet）：** 发布前检查的结构化来源、主张、治理和交接状态。
- **发布等级（Release level）：** 根据后果划分的阻止、修订或质量状态。
- **决策负责人（Decision owner）：** 对最终选择有权限并承担责任的人。
- **差异评审（Delta review）：** 重新验证先前审批后引入的变化。
- **就绪证据（Evidence of readiness）：** 测试结果、失败案例、审批和后备方案证明，而非一般保证。

## 延伸阅读（Further Reading）

- [Claude 认证入门基础考试指南（Claude Certified Associate Foundations Exam Guide）](https://everpath-course-content.s3-accelerate.amazonaws.com/instructor%2F6nizmqk8tpzpfjvt6qmmav7rh%2Fpublic%2F1783542847%2FClaude+Certified+Associate+%E2%80%93+Foundations+Exam+Guide.pdf)
- [Anthropic: 构建有效智能体（Building effective agents）](https://www.anthropic.com/research/building-effective-agents)
- [Anthropic: 定义成功标准并构建评估（Define success criteria and build evaluations）](https://platform.claude.com/docs/en/test-and-evaluate/develop-tests)
- [Anthropic: API 与数据保留（API and data retention）](https://platform.claude.com/docs/en/manage-claude/api-and-data-retention)
- [AI Engineering from Scratch: 范围契约（Scope Contracts）](../../../../../phases/14-agent-engineering/36-scope-contracts/)
- [AI Engineering from Scratch: 验证门禁（Verification Gates）](../../../../../phases/14-agent-engineering/38-verification-gates/)
- [AI Engineering from Scratch: 多会话交接（Multi-Session Handoff）](../../../../../phases/14-agent-engineering/40-multi-session-handoff/)

官方考试大纲和 Claude 产品行为可能变化。本综合实践对齐 2026 年 7 月生效指南，以及 2026-08-08 核查的来源。依赖具体版本事实前，确认当前指南、产品条款、模型、限制和控制。
