# 生成带来源引文的未发送草稿

> 生成可审阅的邮件草稿，不虚构承诺。

**Type:** Build  
**Language:** Python  
**Stage:** 第 3 阶段，共 4 阶段  
**Time:** 约 2 小时

## 构建目标

分类结果并不能决定回复应承诺什么。离线草稿引用来源的第一行，再留下明确标注的回复位置。使用 EmailMessage 序列化邮件头和行结束符，不要用字符串拼接原始邮件头。

```figure
pj-inbox-triage-desk-3
```

## 示例推演

发件人询问 Could you lend two chairs? 时，草稿引用该句，并包含 [Write and check your response here.] 占位提示。它不会声称有椅子可借。X-Unsent: 1 标记预期的草稿工作流；项目中没有 SMTP 调用。

编码前，写下该示例应返回的字段，以及一个应当失败的输入。将预期结果放在实现旁边，便于区分契约变化和程序缺陷。

## 实现契约

- `build_draft(message: dict, decision: dict) -> dict`
- `provider_proposal(message, endpoint, model, api_key="") -> dict`

检查决策属于当前邮件，且每段提供的证据区间均匹配。返回 message_id、to、subject、body、eml、status=draft-only 和 source_quote。加入 In-Reply-To 及去重后的 References。可选 HTTP 分类器必须拒绝不支持的类别、空引文，以及正文中不存在的引文；返回 review_required=True。远程端点必须使用 HTTPS。HTTP 仅允许 localhost 或明确的回环 IP 地址（IPv4 或 IPv6），且主机名和端口必须有效。拒绝 URL 内嵌凭据、片段和空白。使用专用 urllib opener，使 HTTPRedirectHandler.redirect_request 返回 None，让所有重定向在第二个请求可能转发凭据之前失败。

保持前面阶段继续正常工作。在学习者工作区实现这些函数；推演示例时，先不打开参考解答。

## 提示与失败情况

再次用 BytesParser 解析生成的 .eml，检查收件人及线程相关邮件头。对于适配器，通过本地服务器或模拟传输测试序列化请求；离线测试不能证明在线模型质量。

## 运行本阶段

从仓库根目录初始化一次，然后运行累计测试：

```bash
python3 scripts/project_test.py inbox-triage-desk --init my-inbox-triage-desk
python3 scripts/project_test.py inbox-triage-desk --stage 3 --path my-inbox-triage-desk
```

起始代码故意抛出未实现错误。再次初始化会保留已有源码，不会将其替换。要通过评分，所选测试必须全部实际执行；跳过测试不构成完成证据。

## 检查你的推理

为什么有来源支持的引文仍不足以验证模型选择的类别？在保留人工审阅的前提下，要生成更实用的回复，应修改哪个组件？

## 接入最终交付物

HTML 审阅台、triage.json，以及可下载但尚未发送的 .eml 草稿。默认分类器使用明确的短语规则，不依赖大语言模型。它处理一个导出邮件文件夹，绝不连接邮箱或发送回复，也不会推断日期、紧急程度或承诺执行的操作。

完成项目后，尝试自己的输入：

```bash
cd my-inbox-triage-desk
python3 main.py --input ./fixtures --out ./inbox-output
```

在自己标注的留出集上，对比模型建议与短语基线。报告分歧，不要把每条模型输出都称为改进。

## 权威参考资料

[官方 API 文档](https://docs.python.org/3/library/email.parser.html)。实现、示例与夹具均为原创。参考资料解释底层 API，项目特定策略已在上文说明。
