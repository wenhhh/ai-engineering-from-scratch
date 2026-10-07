# 检索语料库

> 检索决定系统后续能够使用哪些证据。

**Type:** Build
**Languages:** Rust, Python
**Stage:** 第 1 阶段，共 7 阶段（starter）
**Time:** 约 5 小时

## 构建目标

实现 `search/main.rs`：一个仅依赖标准库的 Rust 引擎，用于加载 Markdown 文档、构建 BM25 索引，并逐行处理 JSON 请求。Python 的 `report_agent/search.py` 负责编译与调用引擎，不重复实现另一套排名算法。

```figure
pj-rra-bm25
```

Rust 适合索引工作：所有权机制使索引生命周期明确，原生循环能够高效处理词频。Python 保持为轻量的编排层。只有两侧契约清楚，且测试实际跨越进程边界时，跨语言设计才有价值。

## 解析语料库

每份文档由三行元信息、一个空行以及原创说明正文组成：

```text
title: A user-space kernel intercepts system calls
source_url: https://www.kernel.org/doc/html/latest/userspace-api/seccomp_filter.html
published: 2026-09-28

A user-space kernel implements an application kernel between a sandboxed process and the host.
```

夹具语料包含 12 篇关于隔离概念的原创笔记。来源链接指向提供支持的官方规范或文档；这些笔记属于教学夹具，没有复制产品文档。缺少头部字段应报错。将正文与元数据分开，加载前先排序文件路径，避免测试依赖目录枚举顺序。

## 构建索引

对标题和正文分词，将 ASCII 字母转为小写，保留数字，并移除提供的停用词。统计每个词在每份文档中出现的次数，以及包含该词的文档数量。文档频率统计文档数，不统计出现次数。

```text
idf(t) = log(1 + (N - df(t) + 0.5) / (df(t) + 0.5))
score(t,d) = idf(t) * tf(t,d) * (k1+1)
             / (tf(t,d) + k1 * (1-b + b*len(d)/avglen))
```

当 `k1=1.5` 时，随着词频增加，重复词带来的收益逐渐减小。`b=0.75` 会对长文档进行长度修正。`interceptor` 这样的稀有词比 `kernel` 贡献更大。累加查询各词的贡献，按分数降序排列，同分时按文档 ID 升序排列。空查询或未知词返回空结果。

## 定义进程契约

请求包含操作及带类型的字段。引擎每输出一行响应就刷新缓冲，在标准输入到达 EOF 时退出。诊断写入标准错误，使标准输出始终保持为可解析的 JSON。

```json
{"query":"daemon socket","k":3}
```

```json
{"cmd":"tokenize","text":"The kernel, VM!"}
```

第二个请求精确返回 `{"tokens":["kernel","vm"]}`。协议还支持 `idf`、`docs`、`doc` 和 `score`。无效 JSON 或错误字段类型返回 `error` 对象。随附编解码器依据 [RFC 8259](https://www.rfc-editor.org/rfc/rfc8259) 处理字符串与转义，包括 Unicode 代理对。小数形式的结果上限无效；零则是合法的空结果请求。

实现 `engine_binary()`，返回指向已编译可执行文件 `search` 的 `pathlib.Path`。每个进程只编译一次，使用新建、前缀为 `rra-private-build-`、权限为 `0700` 的私有临时目录；进程内复用该路径，并注册退出清理。不要信任路径可预测的共享可执行缓存。

每个索引将输入文档写入私有临时目录。使用参数列表调用 `subprocess.run`，设置超时并显式检查返回码。绝不将问题拼入 shell 命令。

## 你的任务

起始代码通过 `wire.rs` 提供 JSON 解析、转义与标准输入循环。实现语料解析器、分词器、`Index` 和 `handle_line`，并按现有 `engine_binary`、`BM25Index`、`search`、`score`、`idf` API 补全 Python 语料加载器与适配器。后续 Python 句子评分复用相同分词规则，文档排名仍由 Rust 完成。

```bash
python3 scripts/project_test.py research-report-agent --init my-report-agent
python3 scripts/project_test.py research-report-agent --stage 1 --path my-report-agent
rustc --edition 2021 -O my-report-agent/search/main.rs -o /tmp/rra-search
printf '%s\n' '{"query":"daemon socket","k":3}' | /tmp/rra-search projects/research-report-agent/fixtures/corpus
```

## 预期结果

全新工作区会以明确的第 1 阶段待实现消息失败。完成后，应通过 7 项 Rust 测试和 12 项 Python 集成测试。示例查询将 `03-daemon-socket-escape` 排在首位，分数为正；精确分值取决于夹具正文。原生测试覆盖损坏 JSON、Unicode 往返、稀有词权重和确定性同分排序。

## 检查理解

为什么一个词在同一文档中重复出现，文档频率仍只计一次？若标准输出在 JSON 响应前出现构建日志，会发生什么？相关笔记使用同义词时，哪些查询可能被关键词检索漏掉？

## 进一步扩展

先测量这一基线，再加入嵌入索引和排名融合。保持通信格式不变，使规划器与写作器能够使用任一后端。

## Orchard 示例推演

编码前，先学习 [Python 数据结构](https://docs.python.org/3/tutorial/datastructures.html)和[检索增强生成](../../../../../phases/11-llm-engineering/06-rag/docs/en.md).

从检索机制入手，无须先完成 JSON 解析器作业。起始代码已提供 wire.rs 和标准输入处理。你需要实现语料校验、分词、BM25 索引及 Python 进程适配器。Rust 编译输出位于各进程私有目录。

```text
N=2, df(orchard)=2 -> idf=log(1.2)=0.1823
df(expiration)=1 -> idf=log(2)=0.6931
rare expiration term receives more weight
```

## 构建与检查

分别追踪一次词频计数和一次文档频率计数。除非选择可选的编解码器扩展，否则通信代码继续留在 wire.rs。

在学习者工作区实现本阶段。随附命令行辅助程序通过适配器导入你的函数，不会用参考解答代替未完成的实现。

```bash
python3 scripts/project_test.py research-report-agent --init learning-artifacts/research-report-agent
python3 scripts/project_test.py research-report-agent --stage 1 --path learning-artifacts/research-report-agent
```

先预测上面的中间状态，再运行本阶段。全新起始代码应当失败；参考实现运行通过，不能证明你的学习者工作区已经完成。

## 继续探究

为什么重复词会增加词频，却不会增加文档频率？
