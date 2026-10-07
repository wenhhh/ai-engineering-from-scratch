# 浏览器智能体（Browser Agent）

生成表单运行记录，在采信成功提示之前先核对用户要求的字段值。

需要 Node 22.18+、Python 3，以及 DOM 标签、异步函数、子进程参数和字节数组基础。运行真实 Chromium 还需已安装的 gstack browse 可执行程序。核心使用标准库。评分器检查你选择的工作区，不会从参考解答补上缺失功能。

## 构建并运行自己的版本（Build and run your version）

从仓库根目录执行一次初始化。新建起始代码尚未实现功能，测试失败属于预期结果。

```bash
python3 scripts/project_test.py browser-agent --init learning-artifacts/browser-agent
python3 scripts/project_test.py browser-agent --stage 1 --path learning-artifacts/browser-agent --strict
```

逐阶段完成实现，再运行累积评分器和随项目提供的输入驱动程序：

```bash
python3 scripts/project_test.py browser-agent --all --path learning-artifacts/browser-agent --strict
cd learning-artifacts/browser-agent
node cli.ts --task samples/contact.json --output browser-run.json
```

驱动程序和离线样本属于提供的脚手架，它们导入你自己的实现。公共输入类型与函数签名见起始代码和 [API 契约](API.md)。

## 单独检查参考解答（Inspect the reference separately）

从仓库根目录开始：

```bash
python3 scripts/project_test.py browser-agent --all --solution --strict
cd projects/browser-agent/solution
node cli.ts --task samples/contact.json --output browser-run.json
```

## 观察变化（Observe the change）

联系人任务填写 Mira Chen 和 mira@example.test，提交一次后检查 DOM 状态与截图像素。第二份样本的姓名已经填写，因此少执行一次动作。

修改样本副本并重新运行命令。将输入与输出保存在一起，方便他人复现；随项目提供的样本是编写的教学数据。

## 集成方式与限制（Integration and limits）

用实现 observe、act 和 capture 的适配器替换 Driver。先启动教学测试页面的服务并设置 BROWSE_BIN，再运行 cli.ts --live。

离线模式检验测试场景的状态转移和预先记录的像素。绿色像素仅是本测试页面的特定信号，不能代表通用视觉理解。真实运行的 CLI 仅允许访问明确放行的回环地址页面。

要进行真实浏览器运行，先在一个终端为已完成的工作区启动服务：

```bash
python3 -m http.server 8877 --bind 127.0.0.1
```

在该工作区的另一个终端中，将 BROWSE_BIN 设为已安装的 gstack 可执行程序，再运行 `node cli.ts --task samples/contact.json --live`。运行器会自行打开配置中的回环 URL，并保存真实截图。

## 阶段（Stages）

1. [将 DOM 状态转为受约束的动作](stages/01-observations/docs/en.md)
2. [在完成、停滞或额度耗尽时停止](stages/02-bounded-loop/docs/en.md)
3. [用 Python 检查截图像素](stages/03-visual-proof/docs/en.md)
4. [驱动真实测试页面并为运行评分](stages/04-real-browser/docs/en.md)


## 一手参考资料（Primary references）

[Chrome 开发者工具协议](https://chromedevtools.github.io/devtools-protocol/)
[PNG 规范](https://www.w3.org/TR/png-3/)
[HTML 表单控件](https://html.spec.whatwg.org/multipage/forms.html)

译注：Full name、Email address 和 Save request 属于测试页面与策略之间的精确匹配值，仍保留原文。原始截图、样本和录屏也保持原样；离线通过不能代替真实浏览器运行或通用安全验证。
