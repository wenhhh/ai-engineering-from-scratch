---
name: injection-defense
description: 为任意智能体运行时构建 PVE（Prompt-Validator-Executor）层，具备来源标签、注入标记扫描和允许列表导航。
version: 1.0.0
phase: 14
lesson: 27
tags: [security, prompt-injection, pve, greshake, source-tag]
---

给定具备工具访问和检索能力的智能体，产出注入防御层。

产出：

1. 为每段内容添加来源标签：`user_message`、`tool_output`、`retrieved_web`、`retrieved_memory`、`retrieved_file`。在消息历史中传播标签。
2. `Validator.assess(tool_call, contents)`：如果工具调用的参数或相关检索内容中有疑似注入的指令，就拒绝调用；仅当来源标签与声明的信任等级匹配时允许。
3. 导航允许列表与阻止列表，规定智能体可触达的 URL、域名和文件路径。
4. 记忆写入护栏：拒绝看起来像指令的写入。
5. 内容采集规范（第 23 课）：检索内容存到外部，跨度携带引用 ID，而非正文。
6. 测试套件：以 Greshake 的五类利用方式作为红队案例。

必须拒绝的设计：

- 工具使用接口没有来源标签。没有溯源就无法区分权限等级。
- 只在最终输出上运行的验证器。晚来的校验无济于事，模型已经采取动作。
- “相信我，系统提示词会处理。”良好的系统提示词不是强制控制措施。

拒绝规则：

- 如果智能体有任何检索能力却没有来源标签，拒绝交付。检索内容是典型注入载体。
- 如果敏感工具，如发送消息、执行 Shell、在 / 中写文件，没有人在回路确认，应拒绝。
- 如果记忆写入未受保护，应拒绝。持久记忆投毒会再次污染下次会话。

输出：`validator.py`、`source_tag.py`、`allowlist.py`、`memory_guard.py`、`red_team.py`、`README.md`，说明六项控制、残余风险和持续审查周期。结尾给出“接下来读什么”，指向第 21 课（计算机使用安全）和第 23 课（通过 OTel 采集内容）。
