# 带引用的文档问答与 LangChain（Document QA With Citations and LangChain）

生成引用凭据，分别检查原文精确支持与问题相关性。

需要 Python 3.10+，并掌握 pathlib、字符串、偏移量、字典和回调函数。可选 LangChain 依赖的版本另行固定。核心使用标准库。评分器只检查你选定的工作区，绝不会从参考解答补入缺失行为。

## 构建并运行你的版本

从仓库根目录执行一次初始化。新的起始代码会按设计测试失败。

```bash
python3 scripts/project_test.py doc-qa-with-citations --init learning-artifacts/doc-qa-with-citations
python3 scripts/project_test.py doc-qa-with-citations --stage 1 --path learning-artifacts/doc-qa-with-citations --strict
```

实现各阶段后，运行累积评分器和随附的输入驱动程序：

```bash
python3 scripts/project_test.py doc-qa-with-citations --all --path learning-artifacts/doc-qa-with-citations --strict
cd learning-artifacts/doc-qa-with-citations
python3 cli.py samples/docs "When does cache expire?" --output answer.json --html answer.html
```

驱动程序和离线样本作为脚手架提供，其导入指向你的实现。公共输入类型和函数签名见起始代码及 [API 契约](API.md)。

## 单独查看参考解答

从仓库根目录运行：

```bash
python3 scripts/project_test.py doc-qa-with-citations --all --solution --strict
cd projects/doc-qa-with-citations/solution
python3 cli.py samples/docs "When does cache expire?" --output answer.json --html answer.html
```

## 观察变化

缓存问题会选中描述缓存的句子，并返回精确来源区间、行号和 SHA-256。查询 zebras 时放弃作答；对缓存问题逐字引用香蕉句子时，状态变为 needs_review。

修改样本副本后重新运行命令。将输入与输出保存在一起，便于他人复现结果；随附样本是为教学编写的数据。

## 集成与限制

导入 query(directory, question, model)。模型回调返回 JSON {source:chunk_id,quote:exact_text}。--response 接受预先记录的响应，并应用相同的校验门禁。

默认回答器在本地运行，采用抽取式回答。词汇重叠无法证明语义蕴含。有效引用仍可能与问题无关或已经过时；内容哈希让读者能够检测来源变化。

## 阶段

1. [加载本地文档并保留稳定来源](stages/01-documents/docs/en.md)
2. [用可检查的关键词分数排列文本块](stages/02-retrieval/docs/en.md)
3. [只接受检索区间能够支持的回答](stages/03-answer/docs/en.md)
4. [使用框架切分器并保留偏移量](stages/04-adapter/docs/en.md)

## 可选框架集成

基础阶段仅使用标准库。框架适配器已有实现，并配有独立冒烟测试，通过已安装的真实 SDK 与本地模拟模型运行，不联系云服务。

```bash
python3 -m venv .venv
.venv/bin/python -m pip install -r projects/doc-qa-with-citations/requirements-framework.txt
.venv/bin/python scripts/project_test.py doc-qa-with-citations --solution --optional --strict
.venv/bin/python projects/doc-qa-with-citations/solution/framework_demo.py
```

上游记录该集成已针对 `langchain-text-splitters==1.1.2` 验证。项目中如有云服务商路径，仍须主动启用并提供自己的环境凭据；不会执行云端部署。

默认评分器覆盖离线核心和输入集成。`--optional` 会增加 5 项使用真实 SDK 与确定性本地模型的测试。缺少 SDK 时报告 SKIP 并提供安装提示；`--optional --strict` 会因此失败。仅通过默认测试不能宣称框架集成已验证。

本批汉化保留上游的 SDK 验证记录；当前运行环境未安装可选 LangChain 依赖，真实 SDK 比较尚未执行。离线问答测试与可选框架测试分开记录。

## 权威参考资料
