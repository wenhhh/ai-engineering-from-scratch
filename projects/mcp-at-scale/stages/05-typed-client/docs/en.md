# 使用带类型客户端验证实际通信链路

第 5 阶段，共 5 阶段。开始前阅读[项目先修要求](../../../README.md)；本阶段建立在此前契约之上。

## 本阶段变化

父进程和子进程使用不同内存。序列化请求、保留 id，再在解析响应后进行关联。初始化通知有意不含 id，也不接收响应。若客户端要求每个输入行都对应一个输出行，就会一直等待。

同时限制已用时间和累计输出。服务器可能停止响应，也可能持续打印，因此仅设置响应超时仍不够。检查退出码，将 stderr 与 JSON 输出分开。创建进程前拒绝重复的发送 id。

## 推演一个具体用例

带类型客户端启动独立 Python 进程，发送全部请求后关闭 stdin，并校验响应 id。组合后的命令行程序也可持续服务你提供的清单，供 stdio MCP 客户端访问。

```figure
pj-mcp-at-scale-5
```

译注：图表限制：控件最多可设为 50 类，但简化计算器实际只生成前六类资源的候选工具；工具数和页数按控件值估算，不能作为实际目录覆盖证据。字符预算针对本图的简化结构定义，完整 Python 目录的描述与必填约束不同。

修改实验输入，先自行计算结果，再阅读指标。图表根据这些输入计算；实现是否完成，仍以下方测试为证据。

## 实现契约

实现阶段测试与 API 契约中列出的公开接口。

使用[公开 API 契约](../../../API.md)和带类型的起始签名。核心函数负责返回值；文件输入、参数解析与展示由随附驱动程序负责。

将 stderr 与协议 stdout 分开。限制时间和累计输出；超时或收到格式错误的响应时，终止子进程。Response 类型注解无法在运行时校验外部 JSON。

## 验证与检查

从仓库根目录执行一次 `python3 scripts/project_test.py mcp-at-scale --init learning-artifacts/mcp-at-scale` 完成初始化，再进行累计评分：

```bash
python3 scripts/project_test.py mcp-at-scale --stage 5 --path learning-artifacts/mcp-at-scale --strict
```

在完成契约之前，全新工作区应当失败。完成全部阶段后，使用随附样本运行你的实际交付物：

```bash
cd learning-artifacts/mcp-at-scale
python3 cli.py samples/inventory.json --query "pods count" --max-chars 500
```

## 探究失败边界

运行完整 stdio 集成回归：initialize、通知、pods_count。随后经由同一进程边界检查 catalog_search，并保留其精确上下文字符数。

stdio 传输实现文档中说明的 2025-06-18 与 2025-11-25 初始化／工具子集，不宣称完全符合当前 MCP。清单读取使用本地响应记录；生成 250 个工具，也不代表接入了 250 个独立系统。


## 参考资料

[MCP stdio 传输](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports)

## 可选的标准 MCP 客户端验证

可选路线使用 `mcp==2.1.1` 官方 Python 客户端，与项目实际运行的 stdio 进程通信，协商声明的 2025-11-25 旧版工具契约。这不能证明支持所有更新的协议特性。

```bash
python3 -m venv .venv-mcp
.venv-mcp/bin/python -m pip install -r projects/mcp-at-scale/requirements-framework.txt
.venv-mcp/bin/python scripts/project_test.py mcp-at-scale --all --solution --optional --strict
```

使用 `--path learning-artifacts/mcp-at-scale`，让同一客户端测试你的实现。默认路线仍只使用标准库；缺少可选依赖时返回 SKIP，严格可选评分会因此失败。
