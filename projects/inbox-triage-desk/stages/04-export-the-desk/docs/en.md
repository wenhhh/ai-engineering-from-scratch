# 导出可审计的邮件审阅台

> 基于同一批审阅记录导出可移植的 HTML、JSON 和草稿文件。

**Type:** Build  
**Language:** Python  
**Stage:** 第 4 阶段，共 4 阶段  
**Time:** 约 2 小时

## 构建目标

导出文件是最终有用的交付物。使用者不运行 Python，也应能检查输入、类别、理由及精确匹配短语。先按优先级、再按邮件 ID 排序，便于比较重复导出。保留 JSON 报告，作为与其他应用集成的接口边界。

```figure
pj-inbox-triage-desk-4
```

## 示例推演

原创维修活动夹具包含一封行动请求、一封信息类回复和一封含义不明的便笺。处理后形成两个线程及三条队列记录。打开 index.html 可查看每封完整正文，并下载未发送草稿；triage.json 保留线程成员关系与证据偏移量。

编码前，写下该示例应返回的字段，以及一个应当失败的输入。将预期结果放在实现旁边，便于区分契约变化和程序缺陷。

## 实现契约

- `export_desk(messages, out: Path, rules=None) -> dict`

写入 index.html 和 triage.json，并为每封唯一邮件生成一份以摘要命名的 .eml。绝不直接用主题或发件人作为文件名。在 HTML 中转义所有邮件文本及主题。包含结构版本、规则方法和需要审阅的状态。即使输入为空，也应导出有效的空审阅台。

保持前面阶段继续正常工作。在学习者工作区实现这些函数；推演示例时，先不打开参考解答。

## 提示与失败情况

让 JSON 和 HTML 渲染共用同一报告结构，避免总数出现分歧。在测试主题中加入类似 HTML 的字符串，确认已转义。验证草稿文件确实存在，不要只测试显示出来的链接。

## 运行本阶段

从仓库根目录初始化一次，然后运行累计测试：

```bash
python3 scripts/project_test.py inbox-triage-desk --init my-inbox-triage-desk
python3 scripts/project_test.py inbox-triage-desk --stage 4 --path my-inbox-triage-desk
```

起始代码故意抛出未实现错误。再次初始化会保留已有源码，不会将其替换。要通过评分，所选测试必须全部实际执行；跳过测试不构成完成证据。

## 检查你的推理

将输出目录移动到另一台电脑后，哪些内容仍可用？其他程序要依赖你的 JSON 格式，还需要达成哪些约定？

## 接入最终交付物

HTML 审阅台、triage.json，以及可下载但尚未发送的 .eml 草稿。默认分类器使用明确的短语规则，不依赖大语言模型。它处理一个导出邮件文件夹，绝不连接邮箱或发送回复，也不会推断日期、紧急程度或承诺执行的操作。

完成项目后，尝试自己的输入：

```bash
cd my-inbox-triage-desk
python3 main.py --input ./fixtures --out ./inbox-output
```

将 triage.json 导入本地仪表盘，或新增以邮件 ID 为键的已审阅决策文件。将修改与原始证据清楚分开。

## 权威参考资料

[官方 API 文档](https://docs.python.org/3/library/email.parser.html)。实现、示例与夹具均为原创。参考资料解释底层 API，项目特定策略已在上文说明。
