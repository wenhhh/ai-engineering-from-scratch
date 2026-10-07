# 校验图像帧与坐标空间（Validate frames and coordinate spaces）

第 1 阶段，共 4 阶段。开始前阅读[项目前置要求](../../../README.md)，本阶段延续前面的契约。

## 新增能力（What changes）

截图尺寸使用物理像素，原生桌面点击则可能使用逻辑坐标。先校验尺寸为有上限的正数、显示缩放为有限值，再拒绝帧外坐标，最后进行除法并向下取整。帧的 generation 标明该动作依据的是哪一次观察。

## 推演一个具体案例（Work through one concrete case）

截图为 640×400 个物理像素，缩放倍率为 2。像素坐标 (200,100) 映射到逻辑坐标 (100,50)。像素坐标 (640,100) 已经位于图像之外，不能通过除法变成一个看似合理的逻辑坐标而绕过检查。

```figure
pj-desktop-control-1
```

修改实验输入，先计算预期结果，再查看指标。图表根据这些输入计算；项目完成证据仍来自下方的实现测试。

## 实现契约（Implement the contract）

在工作区的 `main.rs` 中实现 `Frame.validate, Frame.logical_point`，保持此前阶段仍可运行。先读函数签名和测试，再逐个实现边界。该夹具是确定性测试后端，其结果不能证明原生操作系统行为。

参考[公开 API 契约](../../../API.md)和起始签名。核心函数负责返回值，文件读取、参数解析和展示交给提供的驱动。

先在物理坐标空间校验边界，再将每个坐标除以缩放倍率并向下取整。将浮点数转为无符号整数前，先检查其是否为有限值。

## 验证与检查（Verify and inspect）

从仓库根目录用 `python3 scripts/project_test.py desktop-control --init learning-artifacts/desktop-control` 初始化一次，然后进行累计评分：

```bash
python3 scripts/project_test.py desktop-control --stage 1 --path learning-artifacts/desktop-control --strict
```

在你实现契约之前，新工作区的测试应当失败。完成全部阶段后，使用提供的样本运行自己的实际交付物：

```bash
cd learning-artifacts/desktop-control
rustc --edition 2021 cli.rs -o desktop-cli
./desktop-cli samples/actions.tsv desktop-frames
```

## 检查失败边界（Investigate the failure boundary）

尝试 NaN、负坐标和缩放倍率 0。每种错误都必须在调用 Backend.click 之前被发现。




## 参考资料（References）

[Rust 进程命令](https://doc.rust-lang.org/std/process/struct.Command.html)
[AppleScript 语言指南](https://developer.apple.com/library/archive/documentation/AppleScript/Conceptual/AppleScriptLangGuide/)
[PNG 规范](https://www.w3.org/TR/png-3/)
