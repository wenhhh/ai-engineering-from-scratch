# 构建显式启用的原生操作边界（Build an opt-in native boundary）

第 4 阶段，共 4 阶段。开始前阅读[项目前置要求](../../../README.md)，本阶段延续前面的契约。

## 新增能力（What changes）

使用参数数组构造 macOS screencapture 和 AppleScript 调用，不经过 shell。把待输入文本作为参数传递，绝不能把它作为可执行脚本内容。读取原生截图头部中的 PNG 尺寸，并保留实际图像载荷。默认演示仍使用夹具。原生捕获必须显式提供 --native-capture、获得操作系统权限；显示缩放启用时，还需由调用方提供 DESKTOP_SCALE。原生点击和输入仅作为库方法提供，不是演示会自动执行的动作。

## 推演一个具体案例（Work through one concrete case）

文本载荷 `Mira "quoted"` 应放进 osascript 的一个 argv 元素，绝不能粘贴进 AppleScript 程序字符串。这样可以独立于引号内容保持参数边界。

```figure
pj-desktop-control-4
```

修改实验输入，先计算预期结果，再查看指标。图表根据这些输入计算；项目完成证据仍来自下方的实现测试。

## 实现契约（Implement the contract）

在工作区的 `main.rs` 中实现 `click_argv, text_argv, png_dimensions, MacBackend`，保持此前阶段仍可运行。先读函数签名和测试，再逐个实现边界。该夹具是确定性测试后端，其结果不能证明原生操作系统行为。

参考[公开 API 契约](../../../API.md)和起始签名。核心函数负责返回值，文件读取、参数解析和展示交给提供的驱动。

将原生捕获、点击和输入都封装在 Backend 之后。TSV CLI 使用测试夹具；可选原生适配器需要独立权限和一个可丢弃的目标测试应用。

## 验证与检查（Verify and inspect）

从仓库根目录用 `python3 scripts/project_test.py desktop-control --init learning-artifacts/desktop-control` 初始化一次，然后进行累计评分：

```bash
python3 scripts/project_test.py desktop-control --stage 4 --path learning-artifacts/desktop-control --strict
```

在你实现契约之前，新工作区的测试应当失败。完成全部阶段后，使用提供的样本运行自己的实际交付物：

```bash
cd learning-artifacts/desktop-control
rustc --edition 2021 cli.rs -o desktop-cli
./desktop-cli samples/actions.tsv desktop-frames
```

## 检查失败边界（Investigate the failure boundary）

检查 cli.rs 生成的 frame-1.ppm、frame-4.ppm 和 frame-6.ppm。解释像素变化能够证明什么，以及为何无法据此证明原生 macOS 行为。

CLI 使用测试后端。原生截图通过 main.rs 的独立显式选项启用；macOS 点击和输入方法需要操作系统权限，此处仍未验证。代际失效只能检测本控制器造成的变化，无法检测任意外部桌面变化。


## 参考资料（References）

[Rust 进程命令](https://doc.rust-lang.org/std/process/struct.Command.html)
[AppleScript 语言指南](https://developer.apple.com/library/archive/documentation/AppleScript/Conceptual/AppleScriptLangGuide/)
[PNG 规范](https://www.w3.org/TR/png-3/)
