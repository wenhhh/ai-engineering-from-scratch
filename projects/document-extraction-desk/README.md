# 文档抽取审阅台（Document Extraction Review Desk）

从文本文档抽取结构化字段，检查精确来源区间，并在导出前批准存在歧义的值。

最终得到一个本地 HTML 审阅台，可下载与来源绑定的审批决定，以及已批准值的 JSON 映射。

## 运行完整工具

从仓库根目录运行：

```bash
cd projects/document-extraction-desk/solution
python3 cli.py sample.txt --schema schema.json --output output/review.html
```

样本专为本项目编写。通过同一个 CLI 替换为自己的输入。基础版本不需要模型密钥；启用可选外部适配器前，先查看命令帮助。

## 自己动手构建

先完成[开发环境配置](../../phases/00-setup-and-tooling/01-dev-environment/docs/en.md)和[数据管理](../../phases/00-setup-and-tooling/09-data-management/docs/en.md)。开始前应能读取 JSON 对象、调用函数、执行终端命令并理解失败的测试。

```bash
python3 scripts/project_test.py document-extraction-desk --init my-document-extraction-desk
python3 scripts/project_test.py document-extraction-desk --stage 1 --path my-document-extraction-desk --strict
python3 scripts/project_test.py document-extraction-desk --all --path my-document-extraction-desk --strict --report completion.json
```

函数实现之前，新工作区会按设计测试失败。CLI、输入文件和公共类型均已提供，完成项目无须复制参考解答入口。按顺序完成各阶段：

1. [抽取前先定义字段](stages/01-define-fields/docs/en.md)
2. [抽取候选值并保留证据](stages/02-retain-source-spans/docs/en.md)
3. [将审批绑定到单个文档版本](stages/03-review-and-approve/docs/en.md)
4. [展示证据并导出已审阅值](stages/04-export-review-desk/docs/en.md)

## 复用交付物

CLI 和可导入函数接收普通本地文件，返回结构化输出。与其他程序集成时，保留输入标识和明确的失败元数据。HTML 输出不含第三方脚本；检查其中携带的来源数据后再分享。

译注：--proposals 接收外部准备的候选文件；随附 CLI 不直接调用 OCR、PDF 或模型服务。审批指纹绑定的是读入后的文本版本，不提供审批人身份认证。

## 验证与适用范围

```bash
python3 scripts/project_test.py document-extraction-desk --all --solution --strict
```

核心接收 UTF-8 文本和带明确标签的字段，不提供 OCR 或 PDF 解析。外部 OCR 或模型适配器可通过 --proposals 提交候选，但每个引文及偏移量都须接受检查。来源位置正确仍不足以证明字段含义正确。

评分验证随附的确定性契约。学习者证书仅为本人声明的完成记录，不表示真实服务商验证或职业认证。将工具视为已集成前，先阅读 JSON 凭据，并至少测试一组新输入。

权威参考：[Python 正则表达式匹配偏移量](https://docs.python.org/3/library/re.html#match-objects)。
