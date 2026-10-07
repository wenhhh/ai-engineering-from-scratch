# 每条 MUST 都需要负责人（Every MUST Needs an Owner）

> 规范把 MUST 分配给宿主、客户端和服务器；真实部署则把它们交给具体的人。无人认领的 MUST，往往最先落空。

**Type:** Reference
**Languages:** Python
**Prerequisites:** 第 27 课
**Time:** ~45 分钟

## 学习目标（Learning Objectives）

- 将实际 MCP 部署背后的六类角色--服务器作者、宿主与客户端开发者、平台或网关运营者、安全与治理负责人、注册目录发布者及最终用户--对应到各自实际承担的规范要求
- 跟踪同一要求的负责人如何在本地 stdio、带 OAuth 的远程 Streamable HTTP，以及网关前置的企业部署三条采用路径间变化
- 解释 MCP 的治理结构：Agentic AI Foundation 的托管、Lead Maintainer、Core Maintainer 与 Maintainer 层级，以及工作组与兴趣组的差别
- 跟踪提案如何从想法经过 SEP 流程进入 Final 状态，并将该流程与功能发布后的生命周期联系起来
- 通过 SDK 分级的一致性与响应时间承诺理解选型：它是具体角色需要承担后果的采用决策，不是简单勾选一项清单

## 问题（The Problem）

通读规范，会看到三个参与方：宿主、客户端、服务器。通读真实 MCP 上线流程，则至少涉及六类人，而且组织架构图上没有谁的职位叫“宿主”。有人编写并维护服务器；有人构建或配置宿主应用及其中的客户端；第三类职责是生产运维，包括在共享机器启动 stdio 子进程，或运营终止远程连接的反向代理；第四类职责审查部署可以如何使用令牌、权限范围和日志；第五类职责发布服务器，使其他团队能发现它；第六类是最终用户，在工具即将执行时作出同意决定。

规范中的每条 MUST 和 SHOULD 都会落到其中某项职责上，但规范无法替具体团队指定人选。相同协议既支持独立开发者在本地通过 stdio 运行工具，也支持平台团队用网关接入数十台内部服务器；例如校验 Origin 请求头，在这两种场景中的正确负责人并不相同。把“规范要求服务器 MUST 做 X”当作会自行落实的团队，通常要到安全审查时才发现：没有挂上名字的 MUST，实际上无人完成。本领域用场景题考查这种判断。面对某种部署形态，必须能指出负责角色，而不只背出要求。

## 概念（The Concept）

给六项职责明确命名，角色问题就不再抽象。服务器作者依据 2026-07-28 规范编写并维护实现：有哪些工具、输入模式要求什么，以及 `server/discover` 如何回答。宿主与客户端开发者构建用户运行的应用及其报文客户端：能力声明、远程传输需要的 OAuth 客户端，以及调用发出前展示给用户的同意界面。平台或网关运营者负责运行进程：以正确环境启动 stdio 子进程，或终止 Streamable HTTP 连接、实施网络策略，并决定请求到达服务器前网关需要校验什么。安全与治理负责人承担跨越上述实现的要求，包括令牌处理、`requestState` 保护、同意策略，以及难以明确归属某个实现者的 MUST。注册目录发布者负责 `server.json`、所声明命名空间及目录条目的准确性。最终用户则对宿主代表自己进行的操作作出授权；规范要求人能够拒绝调用，保护的正是这个角色。

这些人类职责建立在架构课介绍的宿主、客户端、服务器之上，并不替换它们。小团队中，一个人可以兼任两三项职责。关键是随着部署扩大，同一要求可能转移负责人。沿本地 stdio、带 OAuth 的远程 Streamable HTTP、以及带扩展的企业网关部署这三条路径观察：Streamable HTTP 明确要求服务器 MUST 对所有入站连接校验 Origin，防御 DNS 重绑定。直接对外部署服务器时，这项 MUST 落到服务器作者，因为套接字和处理器之间只有服务器代码。前置企业网关后，要求仍然存在，但负责人发生变化：平台或网关运营者的边缘组件最先看到 Origin，必须正确实施校验；服务器作者则依赖由其他角色维护的网络边界。基于精选要求记录构建的责任矩阵必须表达这种变化：要求保持不变，部署形态和负责人随之改变。

同样的做法也适用于 stdio。使用 STDIO 的实现 SHOULD NOT 执行 OAuth 授权流程，应从环境获取凭据。因此 stdio 部署无需让宿主与客户端开发者构建 OAuth 客户端，而需要平台或网关运营者--单台笔记本上就是启动进程的人--在子进程启动前提供正确环境凭据。忽略负责人，就可能导致第一次需要凭据的调用失败，或者有人将凭据硬编码到无人审阅的配置中。

治理回答相关但独立的问题：谁决定下一条 MUST 是什么。按本课固定版本资料，MCP 是 Agentic AI Foundation 项目，技术方向由一套维护者层级管理。Lead Maintainer 拥有最终否决权；Core Maintainer 负责规范和整体方向；Maintainer 负责某个具体领域，如 SDK、文档或工作组。任何提交 issue 或拉取请求的人都是贡献者；持续贡献者可成为 Member，至少任职六个月的 Member 可在获得推荐及 Core Maintainer 批准后成为 Maintainer。这些时间为最低门槛，不保证自动晋升。兴趣组讨论问题，产出不具约束力的建议、用例和需求，适合在尚未承诺设计前探讨“MCP 是否应该支持它”。工作组在想法获得足够支持后构建具体交付物，通常是规范增强提案 SEP 及参考实现。SEP 从 `draft` 进入 `in-review`，随后变为 `accepted` 或 `rejected`；获接纳的 Standards Track SEP 只有在参考实现落地，并为可观察协议行为补上符合性测试后，才进入 `final`。这与规范阅读一课的生命周期相连，只是聚焦要求诞生而非退出：功能先为 Active，之后可标记 Deprecated，同时给出迁移方案和最短窗口，最后才可能 Removed。

SDK 等级是本课最后一个采用决策，通常由宿主与客户端开发者或服务器作者作出。按本课资料，Tier 1 SDK 通过全部符合性测试，在规范发布前或同时支持新功能，两个工作日内分诊问题，七个工作日内修复关键缺陷。Tier 2 采用更长时间安排：符合性达到 80%，新功能支持窗口为六个月。Tier 3 明确属于实验性，没有时间承诺。生产网关选择 Tier 3 SDK，意味着接手相应维护风险；能够清楚指出这种责任，就是本领域场景题希望考查的能力。

```figure
mcpa-28-roles-map
```

## 交互实验（Interactive Lab）

图中并列三种部署：本地 stdio、没有网关的远程 HTTP，以及前置网关后的同一服务器。各面板列出若干要求的负责角色。观察被标记的一行：直接 HTTP 下，服务器作者同时负责 Origin 校验和受保护资源元数据；加上网关后，Origin 一行转移到平台或网关运营者，因为请求最先接触的是网关。底层 MUST 未改变，改变的是承担它的部署组件及其负责人。

## 实践实验（Practice Lab）

打开 `code/main.py`。`REQUIREMENTS` 是精选 `Requirement` 记录的元组，每条保存从研究简报或规范引用的 MUST 或 SHOULD，同时标注适用部署形态和默认角色。`build_responsibility_matrix(shape)` 为某种形态筛选目录，为各适用要求分配负责人，并将负责人为 `None` 的 MUST 放入 `gaps`。运行：

```bash
python3 code/main.py
```

对照三种形态打印的矩阵。确认 `stdio-env-credentials` 归平台或网关运营者；`http` 和 `gateway` 中的 `prm-implemented` 均归服务器作者；只有 `origin-validation` 在这两者之间改变负责人：`http` 下为 `server_author`，`gateway` 下为 `platform_gateway_operator`。再看 `error-code-allocation`：其 `default_role` 有意设为 `None`。研究简报第 5 节的这条 MUST NOT 难以自然归属六类角色中的某一类，因此每种形态都报告责任缺口。自行添加第十三条 `Requirement`，从已读课程选择一项要求，决定负责人和适用形态，再运行脚本查看新增记录。

## 交付物（Shipped Artifact）

`outputs/roles-responsibility-matrix.md` 提供一页参考：六类角色的职责、三条采用路径及逐步新增的责任、手工推导的 Origin 负责人示例，以及维护者层级、工作组与兴趣组、SEP 状态及三个 SDK 等级速查。配合宿主、客户端与服务器一课的架构角色图使用：架构图描绘通信拓扑，本表列出谁对它负责。

## 验证结果（Verify It）

在本课目录运行测试：

```bash
python3 -m unittest discover code/tests
```

测试验证：每种部署形态都生成非空矩阵；stdio 环境凭据归平台或网关运营者；直接 HTTP 的受保护资源元数据归服务器作者；网关部署把 Origin 校验转交平台或网关运营者，而直接 HTTP 保持服务器作者负责；故意无人负责的 MUST 被列为缺口，无人负责的 SHOULD 不触发相同规则；每种形态的适用要求均恰好分配一次，没有遗漏或重复；六类角色都在目录中出现；未知部署形态被拒绝；演示报文不包含凭据。仓库报文检查器也会按 2026-07-28 规则验证本课记录：

```bash
python3 scripts/check_mcpa_wire.py certifications/mcpa/lessons/28-roles-and-adoption
```

## 与综合实践的联系（Capstone Connection）

综合实训要求论证完整部署，不能只描述消息结构。本课提供了论证所需词汇：评审者问谁负责设计中的 Origin 校验时，答案必须同时指出角色与部署形态，而非重复服务器 MUST 校验。带上责任矩阵，并对场景中的每条 MUST 追问：这个具体团队里，谁已经承诺承担它？

## 关键术语（Key Terms）

| 术语（Term） | 含义（Meaning） |
|------|---------|
| 服务器作者（Server author） | 依据规范编写并维护一个 MCP 服务器实现 |
| 宿主与客户端开发者（Host and client developer） | 构建应用及其中负责能力声明与报文通信的客户端 |
| 平台或网关运营者（Platform or gateway operator） | 提供环境并启动 stdio 进程，或终止及管理远程连接 |
| 安全与治理负责人（Security and governance owner） | 负责令牌处理、同意策略等跨实现要求 |
| 注册目录发布者（Registry publisher） | 负责 server.json、命名空间及目录中相关信息的准确性 |
| 最终用户（End user） | 作出同意决定，对宿主代表自己的操作承担授权责任 |
| 工作组（Working Group） | 构建具体交付物，通常包括 SEP 和参考实现的协作组 |
| 兴趣组（Interest Group） | 讨论问题并产出非约束建议，不负责交付具体设计的协作组 |
| SEP | Specification Enhancement Proposal，通过拉取请求推进新功能或破坏性变更的流程 |
| SDK 等级（SDK tier） | SDK 维护者承诺的一致性和响应时间水平，分 Tier 1 至 Tier 3 |

## 延伸阅读（Further Reading）

- [MCP 治理与托管](https://modelcontextprotocol.io/community/governance)
- [工作组与兴趣组](https://modelcontextprotocol.io/community/working-interest-groups)
- [SEP 指引](https://modelcontextprotocol.io/community/sep-guidelines)
- [SDK 分级体系](https://modelcontextprotocol.io/community/sdk-tiers)
- [设计原则](https://modelcontextprotocol.io/community/design-principles)
- [贡献者晋升路径](https://modelcontextprotocol.io/community/contributor-ladder)
- [MCP 规范 2026-07-28](https://modelcontextprotocol.io/specification/2026-07-28)，重点阅读授权和 Streamable HTTP，核对本课目录引用的 MUST 原文
- `certifications/mcpa/research/mcp-2026-07-28-brief.md`，第 4、5、6、9、10、12、15 节
