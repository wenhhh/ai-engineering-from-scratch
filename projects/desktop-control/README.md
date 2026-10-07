# 桌面控制后端（Desktop Control Backend）

构建可审计的坐标与图像帧动作运行器，生成可复现的操作前后像素交付物。 译注：本轮汉化环境没有 Rust 编译器，本项目编译、阶段测试和命令行运行尚未完成；以下演示描述沿用上游，历史录屏不作为本轮实跑证据。

需要 Rust 2021 工具链，以及结构体、trait、泛型、Result、可变借用和字节向量知识。Python 3 用于运行评分器和演示包装程序。核心使用标准库。评分器检查你选择的工作区，绝不会从参考实现中补齐尚未实现的行为。

## 构建并运行自己的版本（Build and run your version）

从仓库根目录执行一次初始化。新起始代码尚未实现，测试应当失败。

```bash
python3 scripts/project_test.py desktop-control --init learning-artifacts/desktop-control
python3 scripts/project_test.py desktop-control --stage 1 --path learning-artifacts/desktop-control --strict
```

逐阶段完成实现，然后运行累计评分器和提供的输入驱动：

```bash
python3 scripts/project_test.py desktop-control --all --path learning-artifacts/desktop-control --strict
cd learning-artifacts/desktop-control
rustc --edition 2021 cli.rs -o desktop-cli
./desktop-cli samples/actions.tsv desktop-frames
```

驱动和离线样本属于已提供的脚手架，导入会指向你的实现。公开输入类型和函数签名见起始代码及 [API 契约](API.md)。

## 单独检查参考实现（Inspect the reference separately）

从仓库根目录运行：

```bash
python3 scripts/project_test.py desktop-control --all --solution --strict
cd projects/desktop-control/solution
rustc --edition 2021 cli.rs -o desktop-cli
./desktop-cli samples/actions.tsv desktop-frames
```

## 观察变化（Observe the change）

六条 TSV 动作生成三份实际 PPM 图像和 trace.txt，最后一行报告 complete=true calls=6。将首次点击的 generation 从 0 改成 9，会在第 2 行点击之前失败。

编辑样本副本后重新运行命令。将输入与输出一起保存，便于他人复现；提供的样本是专门编写的教学数据。

## 集成与限制（Integration and limits）

Backend trait 是可复用接口边界。TSV 使用 capture、click<TAB>x<TAB>y<TAB>generation 和 type<TAB>text；运行器拒绝未知动作，并将调用次数限制为 32。

CLI 使用测试后端。原生截图通过 main.rs 的独立显式选项启用；macOS 点击和输入方法需要操作系统权限，此处仍未验证。代际失效只能检测本控制器造成的变化，无法检测任意外部桌面变化。

## 阶段（Stages）

1. [校验图像帧与坐标空间](stages/01-frame-contract/docs/en.md)
2. [渲染并操作测试场景](stages/02-backend-trait/docs/en.md)
3. [拒绝过期观察和耗尽的额度](stages/03-controller/docs/en.md)
4. [构建显式启用的原生操作边界](stages/04-native-adapter/docs/en.md)


## 一手参考资料（Primary references）

[Rust 进程命令](https://doc.rust-lang.org/std/process/struct.Command.html)
[AppleScript 语言指南](https://developer.apple.com/library/archive/documentation/AppleScript/Conceptual/AppleScriptLangGuide/)
[PNG 规范](https://www.w3.org/TR/png-3/)
