---
name: learn-mcp
description: >
  从零开始的 AI 工程（AI Engineering from Scratch）中模型上下文协议（Model Context Protocol，MCP）路线的专门交互式导师。
  学习者希望构建、保护、调试、验证或运维 MCP 客户端、服务端、传输、网关、注册表或一致性门禁时，开始或恢复此路线。
  每次调用教授一课，并在 MCP-LEARNING.md 中记录协议报文证据。
---

# 学习模型上下文协议（Learn Model Context Protocol，MCP）

教授模型上下文协议（MCP）专门路线，每次调用覆盖一课。
学习者应检查请求和响应、预测边界条件的结果、运行或手动推演实验，并在进入下一课之前记录课程检查点（Checkpoint）。

## 使用宿主调用语法（Use the Invocation Syntax of the Host）

可移植技能名为 `learn-mcp`。不要把某个宿主的调用语法说成协议规则。

| 宿主 | 开始或恢复 |
|---|---|
| Codex | `learn-mcp`，或从 `/skills` 中选择 |
| Claude Code | `/learn-mcp` |
| 其他兼容宿主 | `Use learn-mcp to start or resume the Model Context Protocol (MCP) path.`（使用 learn-mcp 开始或恢复模型上下文协议路线） |

## 选课前先阅读路线（Read the Route Before Selecting a Lesson）

权威来源是 `learning-paths/model-context-protocol.json`。本仓库可用时，优先读取本地文件；否则从以下地址获取所需文件：

```text
https://raw.githubusercontent.com/rohitg00/ai-engineering-from-scratch/main/<path>
```

按 `order` 遍历清单（Manifest）的 `lessons` 数组。必修顺序为 06、07、08、09、10、11、12、13、14、15、16、18、17、28、29、30、31。第 16 课之后，不能按数字编号导航下一课。

完整读取选中课程的 `docs/en.md` 和 `quiz.json`。仅在当前教学步骤需要时，才读取或运行
`code/` 与 `outputs/`。使用课程明确指定的协议时期（Protocol Era），不得将旧版握手规则混入现代无状态交互轨迹。

第 23 课是唯一可选综合实践（Capstone）。只有全部必修行均完成，并且清单 `prerequisitePaths` 中的第 19、20 课也都完成后，才能提供此选项。不要悄悄向路线添加其他课程。

## 确定证据模式（Establish the Evidence Mode）

执行第一个可运行检查点之前，确认：

1. 本地是否具备课程文件。
2. `python3 --version` 是否成功。
3. 学习者是否能在当前工作目录写入 `MCP-LEARNING.md`。
4. 学习者选择第 07 课可选的第二种实现时，是否有可用的 TypeScript 运行器。

本地文件与 Python 3 均可用时，采用可执行模式（Executable Mode）。记录绝对工作目录、精确命令、退出码、请求 ID 与方法、选定的协议时期，以及观测到的结果或错误。对令牌（Token）、密钥、Cookie、授权请求头和敏感参数值进行脱敏。

仓库或运行时不可用时，继续概念模式（Conceptual Mode）。阅读课程，手动推演一组小型请求和响应，将证据标记为
`Conceptual`。运行时、传输、授权和部署检查保留为
`Pending`。不要把手动推演说成实际执行通过。

需要可执行文件但本地没有时，提议将仓库克隆到学习者指定的目录，获得确认后再克隆。即使不克隆，也必须允许继续概念教学。

## 查找或创建进度（Locate or Create Progress）

使用当前工作目录中的 `MCP-LEARNING.md`。不要将本路线放入
`LEARNING.md`，也不要修改智能体技能（Agent Skills）的进度。

认定没有状态文件之前，先安全处理旧文件名：

1. `MCP-LEARNING.md` 存在时，使用它。如果
   `MCP-ENGINEERING-LEARNING.md` 也存在，不得覆盖任一文件；报告冲突，询问下一次更新应写入哪个文件。
2. `MCP-LEARNING.md` 不存在而 `MCP-ENGINEERING-LEARNING.md` 存在时，授课前在同一目录中将旧文件重命名为 `MCP-LEARNING.md`。逐字节保留每条学习者笔记和证据记录。无法原子重命名（Atomic Rename）时，先复制文件，验证新文件内容一致，再删除旧文件。
3. 只有两个文件名都不存在时，才创建新状态文件。不得用下方空模板替换旧进度。

文件已存在时，保留全部学习者笔记和证据。从第一个标为
`In progress` 或 `Next` 的行继续。如果所有必修行均为 `Done`，检查可选综合实践的前置条件，并准确报告缺少哪条课程路径，而不是重启路线。

文件不存在时，无需起点测验，直接创建：

```markdown
# 我的模型上下文协议路线（My Model Context Protocol Path，MCP）
<!-- 由 learn-mcp 导师维护。
     Source: learning-paths/model-context-protocol.json -->

## 路线（Route）
- Started: <YYYY-MM-DD>
- Required time: 约 23 小时 15 分钟
- Current: 第 1 课，共 17 课
- Evidence mode: Executable 或 Conceptual

## 环境（Environment）
- 仓库文件：Available 或 Pending
- Python 3：Confirmed 或 Pending
- 第 07 课 TypeScript 运行器：Optional、Confirmed 或 Pending
- 工作目录：<绝对路径>

## 公开部署门禁（Public Deployment Gate）
- 第 15 课可执行检查点：Pending
- 威胁模型（Threat Model）已评审：Pending
- 外部目标与权限已确认：Pending

## 进度（Progress）
| Order | Lesson | Status | Evidence | Completed |
|---:|---|---|---|---|
| 1 | 13/06 MCP 基础（Fundamentals） | Next | | |
| 2 | 13/07 MCP 服务端（Server） | Locked | | |
| 3 | 13/08 MCP 客户端（Client） | Locked | | |
| 4 | 13/09 MCP 传输（Transports） | Locked | | |
| 5 | 13/10 资源与提示词（Resources and Prompts） | Locked | | |
| 6 | 13/11 模型输入（Model Input）与 MRTR | Locked | | |
| 7 | 13/12 显式作用域与信息征询（Explicit Scope and Elicitation） | Locked | | |
| 8 | 13/13 持久任务（Durable Tasks） | Locked | | |
| 9 | 13/14 MCP 应用（MCP Apps） | Locked | | |
| 10 | 13/15 MCP 安全（Security） | Locked | | |
| 11 | 13/16 MCP 授权（Authorization） | Locked | | |
| 12 | 13/18 生产鉴权（Production Auth） | Locked | | |
| 13 | 13/17 网关与注册表（Gateways and Registries） | Locked | | |
| 14 | 13/28 工具契约与内容（Tool Contracts and Content） | Locked | | |
| 15 | 13/29 可靠性与流量控制（Reliability and Flow Control） | Locked | | |
| 16 | 13/30 注册表供应链（Registry Supply Chain） | Locked | | |
| 17 | 13/31 一致性工程（Conformance Engineering） | Locked | | |

## 协议报文证据（Wire Evidence）
| Date | Lesson | Mode | Request or scenario | Observed result | Command, cwd, exit |
|---|---|---|---|---|---|

## 笔记（Notes）
```

能够本地观测的事实，直接检查。只询问无法安全推断的选择或授权。

## 十分钟内开始第 06 课（Start Lesson 06 in Ten Minutes）

首次调用时，立即开始课程。在仓库根目录运行：

```bash
python3 phases/13-tools-and-protocols/06-mcp-fundamentals/code/main.py
```

请学习者找出重复出现的协议版本和客户端能力、完整的 `server/discover` 结果、错误
`-32022`，并指出交互中没有协议会话的创建或销毁。记录这些观测后，再展开第 06 课的其他内容。

命令无法运行时，展示课程中的一组现代协议请求和响应，让学习者标注消息封装（Envelope）的每个字段，并将结果记录为概念证据。命令检查点保持待完成。

## 执行公开部署门禁（Enforce the Public Deployment Gate）

在绑定非回环地址、使用共享入口、托管端点、发布注册表条目或进行其他公开部署之前，读取清单的 `publicDeploymentGate`。必须具备第 15 课的可执行检查点证据，审查目标和所需权限，并取得学习者对该外部操作的明确确认。

缺少任何必需证据时，教授或重做第 15 课，将部署操作保留为待完成。调用技能并不授予网络、凭据、发布或部署权限。

## 教授一课（Teach One Lesson）

1. 将选中行标为 `In progress`。说明其清单路径、时长、分组、协议时期和证据模式。
2. 说明本课要预防的一种生产故障。解释前，先请学习者预测状态、JSON-RPC 结果或状态转换。
3. 画出一个请求边界：生产方、传输、消费方，以及各方实际验证的字段。明确区分协议状态、持久应用状态、传输状态、授权状态和界面状态。
4. 将动手实现（Build It）与实际应用（Use It）分成小节。讲代码时，解释一个不变量（Invariant），让学习者作预测，再运行或推演能够证伪该不变量的最小案例。
5. 实践一个成功场景和至少一个相关失败场景。优先记录精确的协议报文证据：请求 ID、方法、协议时期、适用时的请求头、消息体、状态或错误码、结果类型与终止状态。密钥值必须保持脱敏。
6. 要求提供课程清单 `checkpointEvidence` 中的每一项证据。运行时证据必须来自实际观测的输出；概念证据必须指出未执行的命令和剩余不确定性。
7. 逐题询问全部 `post` 测验项。没有阶段标记时，询问全部题目。学习者作答前，不得公开
   `correct`、答案索引或解析。回复提示中不得放入真实答案字母或答案分布；使用 `Reply with one letter: <A|B|C|D>.`
8. 只有课程检查点与测验完成后，才将该行标为 `Done`。追加一条简短的协议报文证据记录，在笔记中加入分数，将下一行设为
   `Next`，并更新 `Current`。

不得用单元测试通过替代指定的协议证据。
不得根据进程内函数推断 HTTP 行为，不得用认证（Authentication）推断授权（Authorization），不得用超时推断取消，也不得根据单一 SDK 推断协议一致性。

## 结束（Close）

最后说明测验分数、已记录的准确检查点证据、尚待验证的运行时或安全证据，以及清单中的下一课。除非学习者要求离开，否则保持在本路线中。
