# 拒绝过期观察和耗尽的额度（Reject stale observations and exhausted budgets）

第 3 阶段，共 4 阶段。开始前阅读[项目前置要求](../../../README.md)，本阶段延续前面的契约。

## 新增能力（What changes）

在后端外包一层 Controller。每次后端调用前先预留动作额度，点击前必须已有捕获帧，修改状态后令该帧失效。过期 generation 必须在点击前被拒绝。记录成功动作的轨迹，即使后端返回错误，也应计入已经尝试的调用次数。

## 推演一个具体案例（Work through one concrete case）

捕获 generation 0，点击一次，再尝试用 generation 0 进行第二次点击。控制器在首次修改后就使保存的帧失效，因此第二次点击要求重新捕获。

```figure
pj-desktop-control-3
```

修改实验输入，先计算预期结果，再查看指标。图表根据这些输入计算；项目完成证据仍来自下方的实现测试。

## 实现契约（Implement the contract）

在工作区的 `main.rs` 中实现 `Controller.capture, Controller.click, Controller.type_text`，保持此前阶段仍可运行。先读函数签名和测试，再逐个实现边界。该夹具是确定性测试后端，其结果不能证明原生操作系统行为。

参考[公开 API 契约](../../../API.md)和起始签名。核心函数负责返回值，文件读取、参数解析和展示交给提供的驱动。

调用可能失败的后端方法之前先预留调用额度。后端失败仍消耗一次已尝试的调用。修改之前清空缓存帧，避免错误留下可被不安全复用的旧观察。

## 验证与检查（Verify and inspect）

从仓库根目录用 `python3 scripts/project_test.py desktop-control --init learning-artifacts/desktop-control` 初始化一次，然后进行累计评分：

```bash
python3 scripts/project_test.py desktop-control --stage 3 --path learning-artifacts/desktop-control --strict
```

在你实现契约之前，新工作区的测试应当失败。完成全部阶段后，使用提供的样本运行自己的实际交付物：

```bash
cd learning-artifacts/desktop-control
rustc --edition 2021 cli.rs -o desktop-cli
./desktop-cli samples/actions.tsv desktop-frames
```

## 检查失败边界（Investigate the failure boundary）

让随附 TSV 包含 33 次捕获。32 次调用额度必须阻止继续执行，并报告动作文件中的实际行号。




## 参考资料（References）

[Rust 进程命令](https://doc.rust-lang.org/std/process/struct.Command.html)
[AppleScript 语言指南](https://developer.apple.com/library/archive/documentation/AppleScript/Conceptual/AppleScriptLangGuide/)
[PNG 规范](https://www.w3.org/TR/png-3/)
