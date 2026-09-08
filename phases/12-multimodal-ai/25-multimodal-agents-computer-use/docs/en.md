# 多模态智能体与计算机操作：综合项目（Multimodal Agents and Computer-Use (Capstone)）

> 2026 年的前沿产品是能阅读截图、点击按钮、浏览网页界面、填写表单并端到端完成工作流的多模态智能体。SeeClick 和 CogAgent（2024）验证了图形用户界面（GUI）定位这一基本能力。Ferret-UI 加入移动端。ChartAgent 引入面向图表的视觉工具使用。VisualWebArena 和 AgentVista（2026）是前沿模型追逐的基准，而即使 Gemini 3 Pro 和 Claude Opus 4.7，在 AgentVista 困难任务上也只有约 30% 的分数。本综合项目汇集阶段 12 的全部线索：感知（高分辨率视觉语言模型（VLM））、推理（带工具使用的大语言模型（LLM））、定位（坐标输出）、长时域记忆与评估。

**Type:** Capstone
**Languages:** Python（标准库，动作模式 + 智能体循环骨架）
**Prerequisites:** 阶段 12 · 05（LLaVA），阶段 12 · 09（Qwen-VL JSON），阶段 14（智能体工程）
**Time:** ~240 分钟

## 学习目标（Learning Objectives）

- 设计多模态智能体循环：感知 → 推理 → 行动 → 观察 → 重复。
- 构建 VLM 可用 JSON 输出的 GUI 定位模式（点击坐标、输入文本、滚动、拖动）。
- 比较仅截图智能体、无障碍树智能体和混合智能体。
- 在 VisualWebArena 的小型子集上建立多模态智能体基准评估。

## 问题（The Problem）

一个预订网站工作流：“帮我找 4 月 15 日去 Tokyo 的航班，靠过道座位，价格低于 $800，并预订。”

多模态智能体需要：

1. 获取浏览器截图。
2. 将截图 + URL + 目标解析成计划。
3. 输出结构化动作：点击（x,y 处）、输入“Tokyo”（元素 E 处）、向下滚动、选择（单选按钮）。
4. 在浏览器中执行动作。
5. 观察新状态（下一张截图）。
6. 重复直到任务完成。

每一步都是一次多模态 VLM 调用。VLM 输出必须是可解析 JSON。错误会跨步骤累积，因此恢复很重要。

## 概念（The Concept）

### GUI 定位：基本能力（GUI grounding — the primitive）

GUI 定位是：给定截图和自然语言指令，输出要点击的 (x, y) 坐标（或其他动作）。

SeeClick（arXiv:2401.10935）是首个大规模开放成果：在合成与真实 GUI 数据上微调 VLM，以纯文本词元输出坐标。该方法有效。

CogAgent（arXiv:2312.08914）为密集界面加入 1120x1120 高分辨率编码。网页导航分数约为 84%。

Ferret-UI（arXiv:2404.05719）专注移动界面，与 iOS 无障碍数据集成。

输出格式通常为 JSON：

```json
{"action": "click", "x": 384, "y": 220, "element_desc": "Search button"}
```

`element_desc` 有助于恢复：如果两张截图间坐标发生漂移，语义提示可帮助系统重新定位。

### 动作模式（Action schemas）

典型动作模式有 6-10 种动作类型：

- `click`：(x, y)
- `type`：(text, x?, y?)
- `scroll`：(direction, amount)
- `drag`：(x0, y0, x1, y1)
- `select`：(option_index)
- `hover`：(x, y)
- `navigate`：(url)
- `wait`：(ms)
- `done`：(success, explanation)

智能体每步输出一个动作。浏览器封装层执行并返回新状态。

### 仅截图与无障碍树（Screenshot-only vs accessibility-tree）

两种输入模式：

- 仅截图：完整图像，没有结构信息。最通用，适用于任何应用。
- 无障碍树（Accessibility tree）：结构化 DOM / iOS 无障碍信息。定位可靠得多；适用于能获得树的环境。
- 混合：两者兼用，树为原子动作提供可靠定位，截图提供语义上下文。

生产智能体尽可能采用混合模式。浏览器自动化（Selenium + 无障碍）始终有树；桌面应用有时有。

### 长时域记忆（Long-horizon memory）

20 步工作流产生 20 张截图。VLM 上下文很快填满。三种压缩策略：

- 摘要链（Summary-chain）：每 5 步总结已发生的事情，丢弃旧截图。
- 跳帧：保留首张、末张，以及每隔 3 张的截图。
- 工具记录日志：执行动作，保留已执行内容的文本日志；不再查看旧截图。

Claude 的计算机操作 API 使用日志模式。更简单、更可靠。

### 视觉工具使用（Visual tool use）

ChartAgent（arXiv:2510.04514）引入面向图表理解的视觉工具使用：裁剪、缩放、OCR、调用外部检测。智能体可以输出“裁剪区域 (100, 200, 300, 400)，然后调用 OCR”作为工具调用。工具返回文本，VLM 继续推理。

该模式可以推广：标记集合（Set-of-mark）提示、区域标注和外部检测工具都符合相同的“输出工具调用，接收结构化响应”模式。

### 2026 年基准（The 2026 benchmarks）

- ScreenSpot-Pro。在约 1k 张网页截图上进行 GUI 定位。开放模型最佳水平 Qwen2.5-VL-72B 约 85%，前沿约 90%。
- VisualWebArena。端到端网页任务（购物、论坛、分类信息）。开放模型最佳水平约 20%，Gemini 3 Pro 约 27%。
- AgentVista（arXiv:2602.23166）。2026 年最难的基准。跨 12 个领域的真实工作流。前沿模型分数为 27-40%；开放模型为 10-20%。
- WebArena / WebShop。较旧的基准，前沿模型已趋于饱和。

### 为什么仍然困难（Why it's still hard）

智能体性能瓶颈：

1. 精细尺度视觉定位。在移动分辨率下，“点击小 X”经常失败。
2. 长时域规划。10 个动作后，智能体偏离目标。
3. 错误恢复。点击失败（按钮错误）时的检测与恢复很少出现在训练数据中。
4. 跨页上下文。在标签页或长表单之间跳转会丢失状态。

研究方向：记忆架构、显式重新规划、多模态验证（通过截图匹配验证动作成功）。

### 综合项目实践（The capstone build-it）

综合项目任务：构建一个计算机操作智能体，能够：

1. 阅读模拟预订网站页面的 HTML 与截图。
2. 规划多步序列：搜索 → 选择 → 填表 → 提交。
3. 输出符合动作模式的 JSON 动作。
4. 在固定的 10 任务子集上评估。

本课提供易于扩展到真实浏览器的骨架代码。

```figure
mm-agent-loop
```

## 动手使用（Use It）

`code/main.py` 是综合项目骨架：

- 动作模式 JSON 定义（10 种动作）。
- 以字典表示的模拟浏览器状态。
- 智能体循环骨架：接收状态、输出动作、执行、循环。
- 10 任务微型基准（合成页面），测量端到端成功率。
- 动作失败时的错误恢复钩子。

## 交付成果（Ship It）

本课产出 `outputs/skill-multimodal-agent-designer.md`。给定计算机操作产品（领域、动作集合、评估目标），设计完整智能体循环、记忆策略、定位模式和预期基准分数。

## 练习（Exercises）

1. 为动作模式增加 `screenshot_region` 工具（裁剪 + 缩放）。哪些任务受益？

2. 阅读 AgentVista（arXiv:2602.23166）。描述最难的任务类别，以及为什么前沿模型仍然失败。

3. 长时域记忆压缩：设计摘要链，保持活跃的截图 ≤4 张，日志数量不限。

4. 构建错误恢复钩子：动作失败（找不到按钮）后，智能体下一步做什么？

5. 在 10 个网页任务上，比较仅截图 Claude 4.7 与混合截图 + 无障碍树 Qwen2.5-VL。各自在什么任务上胜出？

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|------|-----------------|------------------------|
| GUI 定位（GUI grounding） | “点击坐标” | 模型为截图中指令的目标输出 (x,y) |
| 动作模式（Action schema） | “工具定义” | 合法动作（点击、输入、滚动、拖动）的 JSON 描述 |
| 无障碍树（Accessibility tree） | “结构化 DOM” | 由浏览器/iOS API 提供的机器可读界面层次结构 |
| 混合智能体（Hybrid agent） | “截图 + 树” | 同时使用图像和结构信息；比单用任一种更可靠 |
| 视觉工具使用（Visual tool use） | “缩放/裁剪/检测” | 智能体在计划执行中调用外部视觉工具（OCR、检测） |
| 摘要链（Summary-chain） | “记忆压缩” | 定期用文本摘要替换较长截图历史 |
| VisualWebArena | “端到端网页基准” | 2024 年端到端网页任务基准 |
| AgentVista | “2026 年困难基准” | 12 领域真实工作流；即使 Gemini 3 Pro 也只有约 30% |

## 延伸阅读（Further Reading）

- [Cheng 等人：SeeClick（arXiv:2401.10935）](https://arxiv.org/abs/2401.10935)
- [Hong 等人：CogAgent（arXiv:2312.08914）](https://arxiv.org/abs/2312.08914)
- [You 等人：Ferret-UI（arXiv:2404.05719）](https://arxiv.org/abs/2404.05719)
- [ChartAgent（arXiv:2510.04514）](https://arxiv.org/abs/2510.04514)
- [Koh 等人：VisualWebArena（arXiv:2401.13649）](https://arxiv.org/abs/2401.13649)
- [AgentVista（arXiv:2602.23166）](https://arxiv.org/abs/2602.23166)
