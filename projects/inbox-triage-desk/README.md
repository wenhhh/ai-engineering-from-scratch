# 邮件分流审阅台（Inbox Triage Desk）

将导出的邮件整理成有证据支持的审阅队列，并生成尚未发送的回复草稿。

你将构建 HTML 审阅台、triage.json，以及可下载但尚未发送的 .eml 草稿。输入为一个导出的 .eml 邮件目录。只对纯文本正文分类；仅含 HTML 的邮件仍会显示，供人工审阅。

## 开始之前

需要 Python 3.10 或更新版本。必需的核心功能仅使用标准库，支持离线运行。Python 标准库提供 MIME 解析、结构化邮件生成以及可移植文档导出功能。

- 能够在 Python 中读写字典和列表。
- 理解函数返回值及抛出 ValueError 的行为。
- 知道邮件头与 MIME 正文采用不同的数据结构。

## 动手构建

```bash
python3 scripts/project_test.py inbox-triage-desk --init my-inbox-triage-desk
python3 scripts/project_test.py inbox-triage-desk --stage 1 --path my-inbox-triage-desk
python3 scripts/project_test.py inbox-triage-desk --all --solution --strict
```

第一条命令创建一个故意未完成的工作区。后续阶段继续扩展同一个源文件，测试中加入新的留出输入。参考实现通过测试仅用于验证示例，不会授予学习者证书。

## 使用方法

```bash
cd projects/inbox-triage-desk/solution
python3 main.py --input ./fixtures --out ./inbox-output
```

在本地打开生成的 index.html。将 HTML 和 JSON 接入自己的工作流，或从 main 导入具名函数。随附演示以原创夹具运行同一份实现：

```bash
python3 demo.py
```

## 阶段

1. [读取 MIME 并保留邮件标识](stages/01-parse-messages/docs/en.md)
2. [按引用关系分组并解释队列](stages/02-group-and-triage/docs/en.md)
3. [生成带来源引文的未发送草稿](stages/03-draft-for-review/docs/en.md)
4. [导出可审计的邮件审阅台](stages/04-export-the-desk/docs/en.md)

## 结果能够说明什么

默认分类器使用明确的短语规则，不依赖大语言模型。它处理一个导出邮件文件夹，绝不连接邮箱或发送回复，也不会推断日期、紧急程度或承诺执行的操作。

可选：追加 --provider-url http://127.0.0.1:1234/v1/chat/completions --model YOUR_MODEL。只有明确选用后，邮件正文才会发送到 OpenAI 兼容的聊天端点。需要认证时，从 INBOX_MODEL_API_KEY 读取密钥。远程服务商必须使用 HTTPS；HTTP 仅允许 localhost 和明确的回环 IP 地址。程序拒绝 URL 内嵌凭据及重定向。模型建议必须包含逐字来源引文，并保存在 model-proposals.json 中供审阅，不会覆盖规则决策。

服务商测试使用受控响应或回环 HTTP，验证请求与响应契约，不能验证模型质量或线上服务可用性。本项目不会配置账户连接、发送邮件、周期任务或云部署。

## 接入自己的场景

用工作流中的少量真实导出替换原创夹具，并在运行之前写下预期结果。另保留一组样例用于评估。有用的前后对比演示应展示输入、可检查的中间证据和可移植输出，不能以受欢迎程度的宣传替代实际测量。

## 权威参考资料

[官方 API 文档](https://docs.python.org/3/library/email.parser.html)。项目代码、课程正文及测试夹具均为原创。

译注：邮件类别、理由、模型提示、示例短语以及 .eml 草稿序列化模板保留英文原值，以维持规则匹配、线格式和集成契约；网页固定文案与帮助已译。草稿占位提示要求人工填写并检查回复。引文偏移量对应解析后统一换行并去掉两端空白的正文，不对应原始 MIME 字节。
