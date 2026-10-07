# 按工作需求选择 MCP 方案（Choosing MCP's Shape for the Job）

> 谁发起调用、数据多敏感、工作持续多久、是否需要交互界面--这些问题能将模糊需求转化为原语、传输、授权路径与扩展的具体选择。

**Type:** Reference
**Languages:** Python
**Prerequisites:** 第 28 课
**Time:** ~45 分钟

## 学习目标（Learning Objectives）

- 将开发者工具、数据访问、企业业务记录系统、长时间工作流自动化、交互界面、可复用工作流和机器间集成七类实际用例，对应到适合的 MCP 原语、传输及扩展
- 按模型、应用或用户由谁控制操作，在工具、资源和提示词之间作出选择
- 识别不适合采用 MCP 的工作，并指出更合适的替代方案
- 分析任何用例设计都要回答的四类运维问题：授权路径、缓存范围、同意授权和可观测性
- 阅读 server/discover 结果及 tools/call 交互，将其缓存提示、扩展声明与产生它们的实际用例联系起来

## 问题（The Problem）

团队学会 MCP 消息结构后，真实项目一来，仍会遇到更难的问题：这项工作究竟适合哪一种协议方案？五秒查询和二十分钟流水线遵守相同报文规则，JSON-RPC 封套本身不会强迫你选对模式。凭直觉很容易犯两类错误。有些团队为所有功能都暴露工具，甚至把宿主本可自行读入上下文的数据也交给模型决定获取，于是每次检索都要由模型按名称发起往返。另一些团队把 MCP 当作任何集成的默认方式，为永不离开单个进程的货币格式化或字符串模板创建无人复用的服务器，支付协议开销却没有互操作收益。实际工作还叠加了消息结构不能自行决定的要求：无人值守时谁授权，上周的缓存列表能否供当前用户复用，审计人员如何从结果追溯原始请求。本领域考查从任务描述出发回答这些问题的能力，而非阅读已经标好答案的图。

## 概念（The Concept）

先从本课程已经建立的规则出发：工具由模型控制，资源由应用驱动，提示词由用户控制。这回答了最重要的问题--预期由谁决定运行该能力。模型在对话中主动使用的代码搜索是工具；宿主在模型回答前悄悄加入上下文的工单状态是资源；用户从菜单显式选择的代码审查清单是提示词。如果清单实际包含多步流程和配套文件，超出单个模板，Skills over MCP 扩展（`io.modelcontextprotocol/skills`）可通过本路线介绍过的 `resources/read` 提供指令，先用 `skills/list` 和 `skills/get` 发现。

再用四个问题补全设计。被封装的系统与宿主在同一机器，还是远程服务？本地文件系统或数据库适合 stdio。stdio 实现应从环境读取凭据，无须运行 OAuth 流程。远程系统适合 Streamable HTTP，此时必须考虑授权路径：有用户完成浏览器同意时，用核心框架的交互式 OAuth 2.1；无人值守的后台工作，用 OAuth 客户端凭据扩展（`io.modelcontextprotocol/oauth-client-credentials`）；具有中央身份提供方的组织，用企业托管授权扩展（`io.modelcontextprotocol/enterprise-managed-authorization`），避免每位员工逐一批准每台服务器。

工作持续多久？能在一次请求响应内完成的工作直接返回普通结果。可能运行数分钟的部署流水线或批量导入，可通过任务扩展（`io.modelcontextprotocol/tasks`）返回 `CreateTaskResult`，让客户端轮询持久 `taskId`，避免一直保持连接直至超时：

```json
{
  "jsonrpc": "2.0",
  "id": 9,
  "result": {
    "resultType": "task",
    "taskId": "task_4471",
    "status": "working",
    "ttlMs": 3600000,
    "pollIntervalMs": 2000
  }
}
```

结果是否需要交互界面？数字或短段落保持普通内容即可。用户需要点击浏览的仪表盘适合 MCP Apps（`io.modelcontextprotocol/ui`）：工具定义引用一个 `ui://` 资源，宿主在沙箱 iframe 内渲染它，但前提是调用方声明了扩展：

```json
{
  "_meta": {
    "io.modelcontextprotocol/clientCapabilities": {
      "extensions": { "io.modelcontextprotocol/ui": {} }
    }
  }
}
```

设计良好的服务器也会为没有声明上述能力的调用方返回普通文本，不直接报错。这是扩展框架要求双方考虑的平稳回退。

数据多敏感，是否有人能够现场判断？六种可缓存操作返回敏感内容时使用 `cacheScope: "private"`。它本身不执行访问控制，只说明不能把某位用户的缓存交给其他人。有人参与敏感或缓慢操作时，可以用 MRTR 信息征询，在提交前确认具体事项，沿用其他课程构建的重试模式。完全无人值守时，工作必须限制在预先授予的权限范围内，不能期待有人回答信息征询。所有路径对审计人员都应提供相同基础：`_meta` 中的追踪上下文跨跳传递，审计记录依据令牌映射到的已认证主体，而非调用方可以随意填写的 `clientInfo`。

并非所有工作都值得建立协议边界。格式化字符串、数字舍入、用本地变量组装提示词等永不离开单个进程的能力，没有第二个消费者来享受互操作收益，也没有独立系统需要客户端与服务器隔离。为其建立服务器，只是在已可工作的函数调用上额外增加 JSON-RPC 封套、发现往返和授权决策。前述七类用例适用的前提，是确有第二个消费者、另一个宿主，或值得保护的系统边界。都不存在时，应使用库函数，无须勉强包一层 MCP。

```figure
mcpa-29-use-case-matrix
```

## 交互实验（Interactive Lab）

图中从目录选择六个用例，列出最直观的设计维度：原语由谁控制、采用什么传输、是否声明扩展。先看开发者工具：工具、stdio、无扩展，因为模型在本机触发的代码搜索只需已审阅的子进程及环境凭据。再看长时间任务、交互仪表盘和机器间同步：分别需要 tasks、ui 和 OAuth 客户端凭据扩展，解决时长、交互性及谁在场授权三个不同问题。数据访问和可复用流程则展示另一个划分：应用自行读取工单上下文成为资源，用户显式选取清单成为提示词，即使两者使用同一种远程传输。

## 实践实验（Practice Lab）

打开 `code/main.py`。`CATALOG` 保存八个 `UseCaseProfile`：七类用例各一个，加上不需要 MCP 的进程内场景。`recommend()` 将每个场景转换为带有 `reasoning` 记录的 `Recommendation`。运行：

```bash
python3 code/main.py
```

对照概念部分阅读输出，然后找到 `run_scenario()`。它让一个 `opsdesk` 服务器依次处理 `server/discover`、`tools/list`、成功的 `search_internal_docs`，以及两次 `usage_dashboard` 调用--一次未声明 ui 扩展，一次声明--最后调用不存在的工具。确认 `tools/list` 结果使用 `cacheScope: "private"`，而 `server/discover` 使用 `"public"`，本例的服务器能力说明可共享，即使背后的工具访问敏感数据。然后为 `CATALOG` 添加自己的第九个场景，例如静默十分钟后通知值班人员的监控告警。填好字段，先预测 `recommend()` 输出，再重跑并对照理由。

## 交付物（Shipped Artifact）

`outputs/use-case-decision-matrix.md` 用一张表列出七类用例各自的原语、传输、授权路径、扩展和缓存范围，同时提供“不必采用 MCP”的判断条件与四类运维注意事项。配合角色责任资料使用：角色资料说明谁负责，当前矩阵说明针对手头任务应构建什么。

## 验证结果（Verify It）

在本课目录运行测试：

```bash
python3 -m unittest discover code/tests
```

测试验证：本地系统推荐 stdio 工具与环境凭据；应用发起场景推荐资源；用户选择的模板推荐提示词和 skills 扩展；长时间工作推荐 tasks；机器间场景推荐客户端凭据扩展；交互仪表盘推荐 MCP Apps 并提供文本回退；私有和公开数据分别推荐相应缓存范围；企业管理场景推荐企业托管授权；没有外部系统的场景不推荐 MCP；演示中发现与列表结果携带正确缓存提示；未声明 ui 时仪表盘回退文本；未知工具返回协议错误；缺少元数据的请求被拒绝；版本不支持时列出可用版本。仓库报文检查器也会按 2026-07-28 规则验证本课记录：

```bash
python3 scripts/check_mcpa_wire.py certifications/mcpa/lessons/29-operational-use-cases
```

## 与综合实践的联系（Capstone Connection）

综合准备评审要求从头到尾论证一个方案，而非孤立背诵五个领域。本课是论证起点：面对场景，在写任何消息前先明确原语、传输、授权、扩展及缓存范围，就像代码中的推荐器。场景中途增加长时间步骤或交互结果时，按目录示例选择 tasks 或 MCP Apps；某部分实际无需 MCP 时，应明确指出，避免勉强引入服务器。

## 关键术语（Key Terms）

| 术语（Term） | 含义（Meaning） |
|------|---------|
| 实际用例（Operational use case） | 开发工具、数据访问、企业记录、长时间自动化、交互界面、可复用流程或机器间集成等具体工作 |
| 控制方划分（Control split） | 工具由模型控制、资源由应用驱动、提示词由用户控制 |
| 任务扩展（Tasks extension） | `io.modelcontextprotocol/tasks`，为超出单次阻塞请求的工作返回持久 `taskId` |
| MCP Apps | `io.modelcontextprotocol/ui`，在沙箱 iframe 内提供工具交互界面，并支持文本回退 |
| Skills over MCP | `io.modelcontextprotocol/skills`，经 `resources/read` 提供目录化多步流程的指令 |
| 授权扩展（Authorization extension） | 核心交互流程之外的可选路径：无人值守客户端凭据授权，或中央身份提供方管理的企业授权 |
| cacheScope | 可缓存结果上的 `public` 或 `private` 标记，控制跨授权上下文共享，不独立执行访问控制 |
| 平稳回退（Graceful degradation） | 调用方未声明扩展时，回退核心行为，或在无法回退时给出清楚错误 |

## 延伸阅读（Further Reading）

- [MCP 服务器概念](https://modelcontextprotocol.io/docs/2026-07-28/learn/server-concepts)，了解工具、资源与提示词的控制方划分
- [MCP 客户端概念](https://modelcontextprotocol.io/docs/2026-07-28/learn/client-concepts)，了解信息征询及客户端功能
- [扩展概览](https://modelcontextprotocol.io/extensions/overview)，了解扩展标识、协商与平稳回退
- [MCP Tasks](https://modelcontextprotocol.io/extensions/tasks/overview)、[MCP Apps](https://modelcontextprotocol.io/extensions/apps/overview)、[Skills over MCP](https://modelcontextprotocol.io/extensions/skills/overview)及[授权扩展](https://modelcontextprotocol.io/extensions/auth/overview)
- `certifications/mcpa/research/mcp-2026-07-28-brief.md`，第 10、14 节
- `phases/13-tools-and-protocols/23-capstone-tool-ecosystem`，了解完整端到端生态场景
