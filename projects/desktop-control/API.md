# 公开实现契约（Public implementation contract）

Backend trait 是可复用接口边界。TSV 使用 capture、click<TAB>x<TAB>y<TAB>generation 和 type<TAB>text；运行器拒绝未知动作，并将调用次数限制为 32。

CLI 使用测试后端。原生截图通过 main.rs 的独立显式选项启用；macOS 点击和输入方法需要操作系统权限，此处仍未验证。代际失效只能检测本控制器造成的变化，无法检测任意外部桌面变化。

带类型的 `main.rs` 起始代码定义了 Frame、Point、Backend、FixtureBackend、Controller 和 MacBackend，包含所有方法签名。`cli.rs` 导入你的模块，仅负责有边界的 TSV 输入和交付物输出。缩放转换前的坐标采用物理像素；帧与 PPM 的尺寸使用有上限的整数。

阶段测试规定正常结果和必须拒绝的输入。不要将学习者实现的导入替换为参考实现导入。最后一个阶段还会用提供的输入驱动验证你的累计实现。
