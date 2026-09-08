# 基准测试：WebArena 与 OSWorld（Benchmarks: WebArena and OSWorld）

> WebArena 通过四个自托管应用测试网页智能体能力。OSWorld 跨 Ubuntu、Windows 和 macOS 测试桌面智能体能力。发布时（2023–2024 年），两者都显示出最佳智能体与人类之间的明显差距。差距正在缩小，失效模式却没有改变。

**Type:** Learn
**Languages:** Python（标准库）
**Prerequisites:** 第 14 阶段 · 19（SWE-bench、GAIA）
**Time:** 约 60 分钟

## 学习目标（Learning Objectives）

- 描述 WebArena 的四个自托管应用，以及基于执行的评估为何重要。
- 解释 OSWorld 为什么使用真实操作系统截图，而非无障碍 API。
- 列出 OSWorld 的两种主要失效模式：图形界面定位（GUI grounding）和操作知识（Operational knowledge）。
- 概述 OSWorld-G 和 OSWorld-Human 在基础基准之上增加了什么。

## 问题（The Problem）

通用智能体会调用工具。但它们能否驱动浏览器点击 20 次，完成购物结账？能否只使用键盘和鼠标配置一台 Linux 计算机？WebArena 和 OSWorld 回答的就是这些问题。

## 概念（The Concept）

### WebArena（Zhou 等，ICLR 2024）（WebArena）

- 812 个长周期任务，覆盖四个自托管网页应用：购物网站、论坛、类似 GitLab 的开发工具和企业内容管理系统（CMS）。
- 另有地图、计算器和草稿板等辅助工具。
- 通过 gym API 进行基于执行的评估：订单是否下达、问题是否关闭、CMS 页面是否更新？
- 发布时：最佳 GPT-4 智能体成功率为 14.41%，人类为 78.24%。

自托管设置很重要：目标应用版本固定且可复现，因此基准不会因外部应用变化而不稳定。

### 扩展（Extensions）

- **VisualWebArena**：需要视觉定位的任务，成功依赖于图像理解，截图被作为一等观测。
- **TheAgentCompany**（2024 年 12 月）：增加终端与编码，更接近真实远程工作环境。

### OSWorld（Xie 等，NeurIPS 2024）（OSWorld）

- 369 个真实计算机任务，跨 Ubuntu、Windows 和 macOS。
- 自由使用键盘和鼠标控制真实应用。
- 以 1920×1080 截图作为观测。
- 发布时：最佳模型为 12.24%，人类为 72.36%。

### 主要失效模式（Primary failure modes）

1. **图形界面定位（GUI grounding）。** 像素到元素的映射。模型难以在 1920×1080 画面中可靠定位 UI 元素。
2. **操作知识（Operational knowledge）。** 设置在哪个菜单、该用哪个快捷键、哪个偏好设置面板。人类通过多年积累获得这类长尾知识。

### 后续工作（Follow-ups）

- **OSWorld-G**：包含 564 个样本的定位套件与 Jedi 训练集。将定位与规划拆开，分别衡量。
- **OSWorld-Human**：人工整理的黄金动作轨迹（Gold action trajectories）。它显示，顶尖智能体使用的步骤是必要步骤的 1.4–2.7 倍，即轨迹效率差距。

### 为什么重要（Why this matters）

Claude computer use、OpenAI CUA、Gemini 2.5 Computer Use（第 21 课）都使用受 WebArena 和 OSWorld 塑造的工作负载训练。基准是目标，生产模型则是交付的答案。

### 基准测试的误区（Where benchmarking goes wrong）

- **仅截图评估（Screenshot-only evals）。** OSWorld 由截图驱动；用它评估使用 DOM 或无障碍 API 的智能体，会漏掉定位挑战。
- **忽略轨迹长度（Ignoring trajectory length）。** 只计算成功率，会漏掉 OSWorld-Human 揭示的 1.4–2.7 倍步骤低效问题。
- **陈旧的自托管应用（Stale self-hosted apps）。** WebArena 的应用固定在特定版本；升级后不重新整理任务，会破坏可比性。

```figure
ae-agent-human-gap
```

## 动手实现（Build It）

`code/main.py` 实现了一个用于实验的网页智能体执行框架（Harness）：

- 最小“购物应用”状态机：list_items、add_to_cart、checkout。
- 3 个任务的黄金轨迹。
- 尝试每个任务的脚本化智能体。
- 基于执行的评估器（状态检查）和轨迹效率指标（步骤数对比黄金轨迹）。

运行：

```
python3 code/main.py
```

输出：每个任务的成功率和轨迹效率，对应 OSWorld-Human 的方法。

## 实际应用（Use It）

- **WebArena Verified**：在内部集群自托管，持续评估。
- **OSWorld**：在虚拟机集群中评估桌面智能体。
- **计算机使用智能体（Computer-use agents）**（第 21 课）：Claude、OpenAI CUA、Gemini 都在类似工作负载上训练。
- **自己的产品流程**：为最常用的 20 个任务记录黄金轨迹，每周让智能体执行并对照。

## 交付成果（Ship It）

`outputs/skill-web-desktop-harness.md` 构建网页或桌面智能体执行框架（Harness），提供基于执行的评估和轨迹效率指标。

## 练习（Exercises）

1. 为实验执行框架（Harness）增加第二个应用：论坛。编写 3 个任务及黄金轨迹。
2. 添加逐任务轨迹效率报告。在你的实验中，智能体步骤数是黄金轨迹的 1 倍、2 倍还是 3 倍？
3. 实现一个“干扰”工具，即黄金轨迹从未使用的工具。脚本化智能体会受到诱惑吗？
4. 阅读 OSWorld-G。你会如何在自己的评估中区分定位失败与规划失败？
5. 阅读 WebArena 的应用 README。升级某个固定版本的应用时，什么会被破坏？

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|------|----------------|------------------------|
| WebArena | “网页智能体基准” | 跨 4 个自托管应用的 812 个任务，采用 gym 式评估 |
| VisualWebArena | “视觉版 WebArena” | 需要视觉定位的 WebArena，以截图作为观测 |
| OSWorld | “桌面智能体基准” | 在真实 Ubuntu/Windows/macOS 上执行 369 个任务 |
| 图形界面定位（GUI grounding） | “像素到元素的映射” | 模型在 1920x1080 画面中定位 UI 元素 |
| 操作知识（Operational knowledge） | “操作系统使用知识” | 使用哪个菜单、快捷键和偏好设置面板 |
| OSWorld-G | “定位套件” | 564 个仅测定位的样本，加上训练集 |
| OSWorld-Human | “黄金轨迹” | 人工专家动作序列，用于衡量效率 |
| 轨迹效率（Trajectory efficiency） | “相对黄金轨迹的步骤数” | 智能体步骤数除以人类最少步骤数 |

## 延伸阅读（Further Reading）

- [Zhou 等，WebArena（arXiv:2307.13854）](https://arxiv.org/abs/2307.13854)：四应用网页基准
- [Xie 等，OSWorld（arXiv:2404.07972）](https://arxiv.org/abs/2404.07972)：跨操作系统桌面基准
- [Anthropic《引入计算机使用能力》（Introducing computer use）](https://www.anthropic.com/news/3-5-models-and-computer-use)：受基准塑造的 Claude 能力
- [OpenAI，Computer-Using Agent](https://openai.com/index/computer-using-agent/)：OSWorld 和 WebArena 数字
