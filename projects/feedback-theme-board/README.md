# 反馈主题看板（Feedback Theme Board）

依据可检查的短语证据归类产品反馈，统计不同来源，并导出本地问题草稿。

最终得到可移植的证据看板、JSON 汇总，以及尚未发送的 Markdown 调查草稿。

## 运行完整工具

从仓库根目录运行：

```bash
cd projects/feedback-theme-board/solution
node cli.ts sample.jsonl themes.json output
```

样本专为本项目编写。通过同一个 CLI 替换为自己的输入。基础版本不需要模型密钥；启用可选外部适配器前，先查看命令帮助。

## 自己动手构建

先完成[开发环境配置](../../phases/00-setup-and-tooling/01-dev-environment/docs/en.md)和[数据管理](../../phases/00-setup-and-tooling/09-data-management/docs/en.md)。开始前应能读取 JSON 对象、调用函数、执行终端命令并理解失败的测试。

```bash
python3 scripts/project_test.py feedback-theme-board --init my-feedback-theme-board
python3 scripts/project_test.py feedback-theme-board --stage 1 --path my-feedback-theme-board --strict
python3 scripts/project_test.py feedback-theme-board --all --path my-feedback-theme-board --strict --report completion.json
```

函数实现之前，新工作区会按设计测试失败。CLI、输入文件和公共类型均已提供，完成项目无须复制参考解答入口。按顺序完成各阶段：

1. [导入具有稳定标识的反馈](stages/01-import-feedback/docs/en.md)
2. [匹配短语并保留原文区间](stages/02-match-evidence/docs/en.md)
3. [统计证据并避免夸大来源支持](stages/03-count-without-inflation/docs/en.md)
4. [发布证据与可审阅的调查草稿](stages/04-publish-and-integrate/docs/en.md)

## 复用交付物

CLI 和可导入函数接收普通本地文件，返回结构化输出。与其他程序集成时，保留输入标识和明确的失败元数据。HTML 输出不含第三方脚本；检查其中携带的来源数据后再分享。

## 验证与适用范围

```bash
python3 scripts/project_test.py feedback-theme-board --all --solution --strict
```

基线匹配明确的词语短语，不判断语义情感或事实真伪。不同来源标签不等同于已核实的人员或市场规模。可选模型建议保存成独立的配置提案，使用前须审阅；不会向问题追踪系统发布内容。

评分验证随附的确定性契约。学习者证书仅为本人声明的完成记录，不表示真实服务商验证或职业认证。将工具视为已集成前，先阅读 JSON 凭据，并至少测试一组新输入。

权威参考：[JSON 文本交换，RFC 8259](https://www.rfc-editor.org/rfc/rfc8259)。
