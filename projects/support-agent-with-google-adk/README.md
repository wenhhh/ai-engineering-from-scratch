# 使用 Google ADK 的支持智能体（Support Agent With Google ADK）

准备脱敏后的支持回复或转人工结果，再让真实 ADK 智能体执行同一套路由与能力规则。交付物为 HTML 审阅页面和 JSON，保留来源指引、回复正文及交接历史。

需要 Python 3.10 或更新版本。从字典、异常和模块入手；可选阶段增加异步模型事件。必需核心使用标准库及人工编写的支持指引。

```bash
python3 scripts/project_test.py support-agent-with-google-adk --init my-support
python3 scripts/project_test.py support-agent-with-google-adk --stage 1 --path my-support --strict
python3 scripts/project_test.py support-agent-with-google-adk --all --solution --strict
cd projects/support-agent-with-google-adk/solution
python3 main.py --ticket fixtures/ticket.json --out support-output
```

打开 support-output/index.html。工单文件包含 id 和 text 字段。未知主题或同分结果转人工；选中的专员只能读取获准的本地指引。没有连接账单系统、账户服务或发件邮箱。

1. [创建会话前先校验](stages/01-intake/docs/en.md)：限制输入，并移除文档规定的邮箱与 API 密钥模式。
2. [路由与授权](stages/02-routing/docs/en.md)：区分领域评分和只读能力允许列表。
3. [保留实际回复](stages/03-handoff/docs/en.md)：约束 received、routed、answered 和 escalated 状态转换。
4. [在 ADK 中复用策略](stages/04-adk-adapter/docs/en.md)：构建真实智能体前先组合前面阶段的契约。

脱敏模式有意限制在较小范围，不能保证移除每个敏感值。默认回复取自人工编写的本地指引记录，不由语言模型生成。

## 实际 SDK 对照

从仓库根目录执行：

```bash
python3 -m venv .venv
.venv/bin/python -m pip install -r projects/support-agent-with-google-adk/requirements-framework.txt
.venv/bin/python scripts/project_test.py support-agent-with-google-adk --all --solution --optional --strict
.venv/bin/python projects/support-agent-with-google-adk/solution/framework_demo.py
```

适配器固定使用 google-adk 2.10.0。它运行真实 Workflow 和 LlmAgent 组合，并注入确定性的本地 BaseLlm 夹具。测试检查事件作者、最终状态、脱敏模型请求、被阻止的能力及转人工行为。不依赖框架的组合逻辑无需该包也可运行。缺少依赖时标为 SKIP；严格可选评分遇到跳过即失败。

使用 SDK 处理自己的脱敏工单：

```bash
.venv/bin/python projects/support-agent-with-google-adk/solution/main.py --ticket YOUR_TICKET.json --adk --out support-adk-output
```

追加 --model YOUR_ADK_MODEL 会显式选择在线模型，需要该服务商文档规定的凭据。模型收到清理后的工单和所选来源指引。回复仍是待审阅草稿；只靠提示词无法证明其基于证据。确定性路由与能力门禁不能被模型提出的路由覆盖。

可扩展为提供来源 ID 的真实只读支持知识适配器。先完成工单接收与授权，再调用适配器；对无依据回答另做评估，不要与 SDK 控制流测试混为一谈。

[官方 ADK 文档](https://google.github.io/adk-docs/)。项目实现、示例及夹具指引均为原创。

译注：展示范围：领域词、状态、知识指引、模型提示与 JSON 回复正文保留原值，以保护路由及证据契约。支持页面固定文案和帮助已译。离线路由通过不代表已验证真实 Google ADK；必须单独安装声明依赖并执行可选测试。
