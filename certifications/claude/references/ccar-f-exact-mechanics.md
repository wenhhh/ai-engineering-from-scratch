# CCAR-F 精确机制复核（CCAR-F Exact Mechanics Review）

> 理解架构后，将本文用作带核实日期的查阅练习。它不能替代亲自构建工作流。

**指南（Guide）：** Claude Certified Architect - Foundations，版本 1.0
**指南生效（Guide effective）：** 2026 年 7 月
**核实日期（Verified）：** 2026-08-09

公开的 CCAR-F 指南考查持久适用的判断能力和精确的操作机制。本复核汇集指南点名的接口，帮助你区分正确设计与看似合理的命令、路径或字段。发布前，请逐项对照当前官方指南和文档再次核实。

## 智能体循环与会话状态（Agent Loop and Session State）

| 机制（Mechanic） | 需要掌握的内容（What to recall） | 决策边界（Decision boundary） |
|---|---|---|
| `stop_reason: "tool_use"` | 执行所请求的工具，追加匹配的结果，然后继续 | 不要根据自然语言措辞推断循环状态 |
| `stop_reason: "end_turn"` | 模型已到达正常结束轮次 | 生产环境中还须处理错误、限制、取消和其他终止状态 |
| 工具结果身份（Tool result identity） | 用发起调用的工具使用标识符关联每项返回结果 | 绝不按数组位置拼接并发结果 |
| 对话状态（Conversation state） | 保留下一次请求所需的内容块 | 在有损摘要之外提取需长期保留的事实 |
| `--resume <session-name>` | 继续一个具名的历史会话 | 旧工具观察结果过时时，以明确的摘要开启新会话 |
| `fork_session` | 从共享基线分出独立探索分支 | 不同方案不应相互干扰时，使用独立分支 |

## 工具选择与结构化输出（Tool Selection and Structured Output）

| 机制（Mechanic） | 含义（Meaning） |
|---|---|
| `tool_choice: "auto"` | 模型可以调用工具，也可以返回文本 |
| `tool_choice: "any"` | 模型必须调用所提供工具中的一个 |
| `tool_choice: {"type":"tool","name":"..."}` | 必须选择指定名称的工具 |
| 严格 JSON Schema（Strict JSON Schema） | 减少语法和结构错误；仍需进行语义验证 |
| Pydantic 验证（Pydantic validation） | 用 Python 实现结构与领域检查的一种选择，不能证明提取的事实真实 |

只有工作流确实要求首先执行该类型化操作时，才使用强制选择。它不能普遍替代编排、授权或语义验证。

## MCP 配置（MCP Configuration）

| 作用域或行为（Scope or behavior） | 公开指南规定的机制（Public-guide mechanic） |
|---|---|
| 项目共享服务器（Shared project server） | 纳入版本控制的 `.mcp.json` |
| 个人或实验服务器（Personal or experimental server） | `~/.claude.json` |
| 机密（Secrets） | 使用 `${GITHUB_TOKEN}` 之类的环境变量展开；绝不提交实际值 |
| 发现（Discovery） | 连接时发现已配置服务器提供的工具 |
| 资源（Resources） | 如果通过反复调用工具浏览内容目录和模式会造成浪费，就将其作为资源公开 |

当前 MCP 传输与部署细节见第 11 课。应将 stdio 和 Streamable HTTP 视为现行传输方式，将旧版 HTTP+SSE 视为已弃用。

## Claude Code 团队配置入口（Claude Code Team Surfaces）

| 入口（Surface） | 精确复核要点（Exact review point） |
|---|---|
| 项目命令（Project command） | `.claude/commands/` |
| 个人命令（Personal command） | `~/.claude/commands/` |
| 技能（Skill） | `.claude/skills/<skill-name>/SKILL.md` |
| 技能元数据头（Skill frontmatter） | 指南点名了 `context: fork`、`allowed-tools` 和 `argument-hint` |
| 条件规则（Conditional rule） | `.claude/rules/` 下的 Markdown，在 YAML 元数据头中提供 `paths` 通配模式 |
| 非交互运行（Non-interactive run） | `-p` 或 `--print` |
| 机器可读持续集成（Machine-readable CI） | 同时使用 `--output-format json` 和 `--json-schema` |

作用域也是答案的一部分。即使指令有用，放错用户、项目或特定路径位置，仍然属于配置失败。

## 消息批处理（Message Batches）

2026 年 7 月指南列出了以下考试参考事实：

- 相比标准处理可节省 50% 成本。
- 处理窗口最长为 24 小时，不保证延迟服务级别协议（SLA）。
- 使用 `custom_id` 对齐请求与结果。
- 单个批请求内不执行多轮工具调用。
- 对失败分类后，只重新提交可以安全重试的失败项。

这些是带日期的产品事实。在据此做出实际成本或 SLA 决策前，请查阅当前 Message Batches 文档。

## 内置工具选择（Built-In Tool Choice）

指南明确提到 Read、Write、Edit、Bash、Grep 和 Glob。应复习各自边界，而不是背诵受欢迎程度排名：

- 修改尚未检查的内容前，先使用 Read。
- Edit 要求可靠匹配；只有受控替换更安全时，才写入整个文件。
- Grep 搜索内容；Glob 根据模式查找路径。
- Bash 跨越了能力强大的执行边界，需要更严格的权限、验证和沙箱控制。

## 闭卷练习（Closed-Book Drill）

对上面的每一行：

1. 凭记忆写出准确的路径、标志、字段或状态。
2. 给出一个应当选择它的场景。
3. 给出一个看似合理的替代方案，并说明它违反的约束。
4. 通过官方来源核实精确机制。
5. 构建或运行关联课程中用于练习该决策的交付物。

只有能解释其作用域、失败模式及更安全的替代方案，才算掌握；仅背出字符串不算。

## 官方来源（Official Sources）

- [CCAR-F 考试指南](https://everpath-course-content.s3-accelerate.amazonaws.com/instructor%2F6nizmqk8tpzpfjvt6qmmav7rh%2Fpublic%2F1783542750%2FClaude+Certified+Architect+%E2%80%93+Foundations+Exam+Guide.pdf)
- [Claude Code 文档](https://code.claude.com/docs/en/overview)
- [Claude Agent SDK 文档](https://code.claude.com/docs/en/agent-sdk/overview)
- [工具调用（Tool use）文档](https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview)
- [结构化输出（Structured output）文档](https://platform.claude.com/docs/en/build-with-claude/structured-outputs)
- [消息批处理（Message Batches）文档](https://platform.claude.com/docs/en/build-with-claude/batch-processing)
- [MCP 文档](https://modelcontextprotocol.io/docs/getting-started/intro)
