# 获取单页，同时保留原基线

> 限制在线 HTTP 操作，并校验保存快照的完整性。

**Type:** Build  
**Language:** Go  
**Stage:** 第 3 阶段，共 4 阶段  
**Time:** 约 2 小时

## 构建目标

失败的获取不能变成下一份基线。先获取并校验，再计算及写入报告；只有明确操作才能替换原基线。CLI 每次调用执行一次流程，不会创建周期监测。

```figure
pj-web-change-brief-3
```

译注：实际 CLI 无条件把新快照写到输出目录的 baseline.json。若 --out 与已有 --baseline 的目录相同，即使没有 --accept，也会覆盖该基线。使用不同的新输出目录；本问题按上游原行为保留，未通过翻译修改。

## 示例推演

HTTP 503 在解析前失败。成功的 HTML 响应超过 2 MB 也应失败。重定向到其他主机需要重新明确指定 URL。有效基线可往返 JSON 保存和读取；修改块文本但不更新摘要时，LoadSnapshot 应失败。

编码前写出该示例的返回字段及一个应失败的输入。将预期结果放在实现旁，便于区分契约变化和程序缺陷。

## 实现契约

- `FetchHTML(ctx context.Context, rawURL string, client *http.Client) (string, error)`
- `SaveSnapshot(path string, snapshot Snapshot) error`
- `LoadSnapshot(path string) (Snapshot, error)`

仅接受不含凭据的 HTTP(S) URL、状态 200，以及 text/html 或 application/xhtml+xml。读取上限设为 MaxHTMLBytes+1，用于检测超限。支持取消和默认 15 秒客户端超时，最多三次请求，重定向必须保持同一主机，包括不改变明确端口。选定 URL 使用 HTTPS 时，每次重定向都必须继续 HTTPS；明确指定的 HTTP URL 仍受支持。通过同目录临时文件加重命名保存。读取时校验规范化 URL 和内容校验和。

保持前面阶段继续工作。在学习者工作区实现这些函数；推演示例时先不打开参考解答。

## 提示与失败情况

使用 httptest.NewServer，无需互联网即可测试真实响应。将超时／取消与状态码处理分开测试。同目录临时文件使重命名发生在同一文件系统中；错误时也必须删除临时文件。

## 运行本阶段

从仓库根目录初始化一次，然后运行累计测试：

```bash
python3 scripts/project_test.py web-change-brief --init my-web-change-brief
python3 scripts/project_test.py web-change-brief --stage 3 --path my-web-change-brief
```

起始代码故意抛出未实现错误。再次初始化保留已有源文件，不会将其替换。通过结果要求每项所选测试都实际运行；跳过测试不构成完成证据。

## 检查你的推理

获取成功是否意味着读取了客户端 JavaScript 生成的内容？哪些服务器或限流行为应明确显示给运行工具的人？

## 接入最终交付物

独立变化报告、changes.json，以及可复用的 baseline.json 快照。 提取器是有意限制能力的可读文本块扫描器，不是 HTML5 DOM 或浏览器。它不执行 JavaScript、不判断 CSS 可见性，也不获取链接资源。比较时忽略块顺序，但保留重复文本次数。过滤短语可能隐藏有用变化，因此两个快照须使用同一套明确的过滤策略。

完成项目后，尝试自己的输入：

```bash
cd my-web-change-brief
go run . --before fixtures/before.html --after fixtures/after.html --url https://example.invalid/makerspace --out ./web-change-output
```

增加 ETag 或 Last-Modified 条件请求支持，保持“内容未变”“请求失败”和“空页面”之间的区别。调度逻辑放在获取函数之外。

## 权威参考资料

[官方 API 文档](https://pkg.go.dev/net/http)。实现、示例与夹具均为原创。参考资料解释底层 API，项目特定策略已在上文说明。
