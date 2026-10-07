# 读取 MIME 并保留邮件标识

> 解析导出的邮件，保留精确的纯文本证据。

**Type:** Build  
**Language:** Python  
**Stage:** 第 1 阶段，共 4 阶段  
**Time:** 约 2 小时

## 构建目标

邮件具有结构，不能只在第一个空行处分割来提取正文。MIME 可能包含多个内容版本、附件和传输编码。使用带明确 policy 的 BytesParser，再选择纯文本正文。在文本旁保留发件人、主题、邮件 ID、引用 ID 和正文状态。

```figure
pj-inbox-triage-desk-1
```

## 示例推演

一封邮件的邮件头为 From: Ada <ada@example.invalid>、Message-ID: <a@example.invalid>，正文为 Please reserve a chair；解析结果应包含发件人 ada@example.invalid 和精确正文。第二个 HTML 版本不能覆盖这份文本。若缺少 Message-ID，则用原始字节的摘要生成稳定的本地标识。

编码前，写下该示例应返回的字段，以及一个应当失败的输入。将预期结果放在实现旁边，便于区分契约变化和程序缺陷。

## 实现契约

- `parse_message(raw: bytes) -> dict`

返回 id、sender、subject、text、references 和 body_status 键。拒绝空输入、超过 1,000,000 字节的输入，以及缺少发件地址的邮件。合并主题中的空白，同时保留正文换行。引用 ID 去重。仅含 HTML 的正文返回空文本，状态为 no-plain-body。

保持前面阶段继续正常工作。在学习者工作区实现这些函数；推演示例时，先不打开参考解答。

## 提示与失败情况

先从一封纯文本邮件开始，再构造 multipart/alternative。优先使用解析器的 get_body，不要遍历所有文本部分后直接拼接：文本附件并不属于邮件正文。对相同字节解析两次，测试后备 ID 是否稳定。

## 运行本阶段

从仓库根目录初始化一次，然后运行累计测试：

```bash
python3 scripts/project_test.py inbox-triage-desk --init my-inbox-triage-desk
python3 scripts/project_test.py inbox-triage-desk --stage 1 --path my-inbox-triage-desk
```

起始代码故意抛出未实现错误。再次初始化会保留已有源码，不会将其替换。要通过评分，所选测试必须全部实际执行；跳过测试不构成完成证据。

## 检查你的推理

为什么相同主题的两封邮件仍必须保留不同标识？若静默将 HTML 转成纯文本，会丢失哪些信息？

## 接入最终交付物

HTML 审阅台、triage.json，以及可下载但尚未发送的 .eml 草稿。默认分类器使用明确的短语规则，不依赖大语言模型。它处理一个导出邮件文件夹，绝不连接邮箱或发送回复，也不会推断日期、紧急程度或承诺执行的操作。

完成项目后，尝试自己的输入：

```bash
cd my-inbox-triage-desk
python3 main.py --input ./fixtures --out ./inbox-output
```

增加包含名称与大小的本地附件清单。将附件与用于分流的正文文本分开。

## 权威参考资料

[官方 API 文档](https://docs.python.org/3/library/email.parser.html)。实现、示例与夹具均为原创。参考资料解释底层 API，项目特定策略已在上文说明。
