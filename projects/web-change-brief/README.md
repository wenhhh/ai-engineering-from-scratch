# 网页变化简报（Web Change Brief）

将带噪声的 HTML 快照转为精确可读文本变化的简报。

你将构建独立变化报告、changes.json，以及可复用的 baseline.json 快照。 输入：同一 URL 的两份已保存 HTML 快照，或一份 JSON 基线和一个明确指定的在线 HTTP(S) URL。

## 开始之前

需要 Go 1.22 或更新版本。必需核心使用标准库，可离线运行。Go 标准库无需框架即可提供 HTTP 限制、上下文取消、原子文件替换和安全 HTML 模板。

- 能够编写 Go 函数、切片、映射和错误返回。
- 理解 HTTP 响应状态、Content-Type 和响应体。
- 理解文本快照与渲染后网页暴露的信息不同。

## 动手构建

```bash
python3 scripts/project_test.py web-change-brief --init my-web-change-brief
python3 scripts/project_test.py web-change-brief --stage 1 --path my-web-change-brief
python3 scripts/project_test.py web-change-brief --all --solution --strict
```

第一条命令创建故意未完成的工作区。后续阶段扩展同一份源文件，测试中包含新的留出输入。参考实现通过仅用于验证示例，不授予学习者证书。

## 使用方法

```bash
cd projects/web-change-brief/solution
go run . --before fixtures/before.html --after fixtures/after.html --url https://example.invalid/makerspace --out ./web-change-output
```

在本地打开生成的 index.html。将 HTML 和 JSON 接入自己的工作流，或从 main 导入具名函数。随附演示使用原创夹具运行同一份实现：

```bash
python3 demo.py
```

## 阶段

1. [比较页面前先提取文本](stages/01-extract-readable-blocks/docs/en.md)
2. [比较精确文本并保留重复次数](stages/02-compare-snapshots/docs/en.md)
3. [获取单页，同时保留原基线](stages/03-fetch-and-save/docs/en.md)
4. [导出供人检查的简报](stages/04-export-change-evidence/docs/en.md)

## 结果能够说明什么

提取器是有意限制能力的可读文本块扫描器，不是 HTML5 DOM 或浏览器。它不执行 JavaScript、不判断 CSS 可见性，也不获取链接资源。比较时忽略块顺序，但保留重复文本次数。过滤短语可能隐藏有用变化，因此两个快照须使用同一套明确的过滤策略。

在线模式：go run . --fetch https://YOUR_HOST/YOUR_PAGE --baseline ./web-change-output/baseline.json --out ./next-report。只获取选定页面，并设置 HTTP 超时、2 MB 响应体上限及同主机重定向。HTTPS 获取拒绝重定向到 HTTP。原基线保持不变，除非成功生成报告后明确传入 --accept。本项目不安装后台监测或通知。

服务商测试使用受控响应或回环 HTTP，验证请求与响应契约，不验证模型质量或线上服务可用性。本项目没有配置账户连接、消息发送、周期任务或云部署。

## 接入自己的场景

用自己工作流中的少量导出替换原创夹具，运行前写下预期结果。另保留一组示例用于评估。有用的前后对比演示应展示输入、可检查的中间证据和可移植输出，不要用受欢迎程度的宣传替代测量结果。

## 权威参考资料

[官方 API 文档](https://pkg.go.dev/net/http)。项目代码、课程正文与夹具均为原创。

译注：输入网页、精确变化文本、JSON 字段、校验和及错误消息保留原值。没有新增后台监测；命令行固定展示与帮助已译。空变化及未变计数提示保留原测试需要的英文并附中文。

译注：实际 CLI 无条件把新快照写到输出目录的 baseline.json。若 --out 与已有 --baseline 的目录相同，即使没有 --accept，也会覆盖该基线。使用不同的新输出目录；本问题按上游原行为保留，未通过翻译修改。
