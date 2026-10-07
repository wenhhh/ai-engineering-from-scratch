# 渲染并操作测试场景（Render and manipulate a fixture scene）

第 2 阶段，共 4 阶段。开始前阅读[项目前置要求](../../../README.md)，本阶段延续前面的契约。

## 新增能力（What changes）

用一个 Backend trait 统一定义 capture、click 和 type_text。测试后端根据自身状态绘制实际 PPM 图像，包含文本框、提交区域和绿色完成场景。点击文本框改变焦点，输入要求先获得焦点，提交也只有在存在文本后才会完成。这样的夹具无需控制用户桌面，就能复现状态转换错误。

## 推演一个具体案例（Work through one concrete case）

测试场景最初没有焦点。点击 (50,70) 使输入框获得焦点，输入 Mira 保存文本，再点击 (230,160) 完成场景。前后捕获结果包含不同的实际 RGB 字节。

```figure
pj-desktop-control-2
```

修改实验输入，先计算预期结果，再查看指标。图表根据这些输入计算；项目完成证据仍来自下方的实现测试。

## 实现契约（Implement the contract）

在工作区的 `main.rs` 中实现 `Backend, FixtureBackend`，保持此前阶段仍可运行。先读函数签名和测试，再逐个实现边界。该夹具是确定性测试后端，其结果不能证明原生操作系统行为。

参考[公开 API 契约](../../../API.md)和起始签名。核心函数负责返回值，文件读取、参数解析和展示交给提供的驱动。

PPM P6 以 ASCII 头部 P6、宽高和 255 开始，随后是 width*height*3 个字节。按行优先顺序遍历像素，根据后端状态推导每个像素的颜色。

## 验证与检查（Verify and inspect）

从仓库根目录用 `python3 scripts/project_test.py desktop-control --init learning-artifacts/desktop-control` 初始化一次，然后进行累计评分：

```bash
python3 scripts/project_test.py desktop-control --stage 2 --path learning-artifacts/desktop-control --strict
```

在你实现契约之前，新工作区的测试应当失败。完成全部阶段后，使用提供的样本运行自己的实际交付物：

```bash
cd learning-artifacts/desktop-control
rustc --edition 2021 cli.rs -o desktop-cli
./desktop-cli samples/actions.tsv desktop-frames
```

## 检查失败边界（Investigate the failure boundary）

在输入前提交，并检查 complete=false。贴近实际行为的夹具应模拟失败转换，不能在任意点击后都简单涂成绿色。




## 参考资料（References）

[Rust 进程命令](https://doc.rust-lang.org/std/process/struct.Command.html)
[AppleScript 语言指南](https://developer.apple.com/library/archive/documentation/AppleScript/Conceptual/AppleScriptLangGuide/)
[PNG 规范](https://www.w3.org/TR/png-3/)
