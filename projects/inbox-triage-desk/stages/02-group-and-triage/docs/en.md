# 按引用关系分组并解释队列

> 利用邮件引用组织线程，利用明确短语执行分流。

**Type:** Build  
**Language:** Python  
**Stage:** 第 2 阶段，共 4 阶段  
**Time:** 约 2 小时

## 构建目标

主题不足以作为可靠的邮件线程键：互不相关的发件人可能使用相同主题，同一线程也可能更换主题。仅当 References 或 In-Reply-To 中的 ID 存在于已导入集合时建立连接。即使输入顺序改变，互相连接的邮件仍组成同一线程。

```figure
pj-inbox-triage-desk-2
```

译注：图表限制：此 JavaScript 短语实验使用 ASCII 单词边界及 UTF-16 偏移量；Python 实现使用 Unicode 单词边界和字符偏移量。中文邻接或 emoji 前缀可能导致匹配或位置不同。

## 示例推演

三封邮件 a、引用 a 的 b、引用 b 的 c 属于同一线程。第四封邮件即使主题相同，只要没有引用关系，就应独立保留。分流时，Please confirm 匹配 action；For your information 匹配 information。两类短语同时出现时，结果为 uncertain，因为强行选择单一获胜规则会掩盖冲突。

编码前，写下该示例应返回的字段，以及一个应当失败的输入。将预期结果放在实现旁边，便于区分契约变化和程序缺陷。

## 实现契约

- `group_threads(messages: list[dict]) -> list[dict]`
- `triage(message: dict, rules: dict | None = None) -> dict`

返回稳定的线程 ID，以及按 ID 排序的邮件。完全相同的重复记录合并；相同 ID 对应冲突记录时抛出 ValueError。规则类别为 action 和 information；没有匹配或类别冲突时归为 uncertain。每个命中项包含 category、quote、start 和 end，并要求 text[start:end] 等于 quote。优先级为 action=0、uncertain=1、information=2。

保持前面阶段继续正常工作。在学习者工作区实现这些函数；推演示例时，先不打开参考解答。

## 提示与失败情况

独立表示线程连接关系，不要让它依赖显示顺序。检查短语边界，使 please 不会匹配 displeased。对原始正文进行不区分大小写的匹配来确定区间，不要在经过大小写折叠、偏移量可能变化的字符串中定位。

## 运行本阶段

从仓库根目录初始化一次，然后运行累计测试：

```bash
python3 scripts/project_test.py inbox-triage-desk --init my-inbox-triage-desk
python3 scripts/project_test.py inbox-triage-desk --stage 2 --path my-inbox-triage-desk
```

起始代码故意抛出未实现错误。再次初始化会保留已有源码，不会将其替换。要通过评分，所选测试必须全部实际执行；跳过测试不构成完成证据。

## 检查你的推理

命中短语能否证明请求紧急或正当？为什么 uncertain 项应排在信息类项目之前？

## 接入最终交付物

HTML 审阅台、triage.json，以及可下载但尚未发送的 .eml 草稿。默认分类器使用明确的短语规则，不依赖大语言模型。它处理一个导出邮件文件夹，绝不连接邮箱或发送回复，也不会推断日期、紧急程度或承诺执行的操作。

完成项目后，尝试自己的输入：

```bash
cd my-inbox-triage-desk
python3 main.py --input ./fixtures --out ./inbox-output
```

将用户维护的发件人偏好作为独立、明确的排序信号。保持匹配短语和规则方法可见。

## 权威参考资料

[官方 API 文档](https://docs.python.org/3/library/email.parser.html)。实现、示例与夹具均为原创。参考资料解释底层 API，项目特定策略已在上文说明。
