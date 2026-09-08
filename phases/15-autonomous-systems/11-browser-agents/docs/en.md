# 浏览器智能体与长时程网页任务（Browser Agents and Long-Horizon Web Tasks）

> ChatGPT agent（2025 年 7 月）将 Operator 与深度研究合并为浏览器/终端智能体，在 BrowseComp 创下 68.9% 的最佳成绩（SOTA）。OpenAI 于 2025 年 8 月 31 日关闭 Operator，这是产品层整合。Anthropic 收购 Vercept，使 Claude Sonnet 的 OSWorld 分数从不足 15% 升至 72.5%。WebArena-Verified（ServiceNow，ICLR 2026）修正原 WebArena 的 11.3 个百分点假阴性率，发布 258 题 Hard 子集。数字真实，攻击面也真实：OpenAI 准备度负责人公开表示，浏览器智能体中的间接提示词注入“不是可以完全修补的漏洞”。2025–2026 年已记录的攻击包括 Tainted Memories（Atlas CSRF）、HashJack（Cato Networks）、Perplexity Comet 一键劫持。

**Type:** Learn
**Languages:** Python（标准库，间接提示词注入攻击面模型）
**Prerequisites:** 阶段 15 · 10（权限模式，Permission modes），阶段 15 · 01（长时程智能体，Long-horizon agents）
**Time:** ~45 分钟

## 问题（The Problem）

浏览器智能体（Browser agent）是读取不可信内容、执行有实质后果动作的长时程智能体。访问的每个页面都是非用户编写的输入，每个页面的表单都可能是命令通道。2025–2026 年攻击资料表明，这并非假想：Tainted Memories 用特制页面将恶意指令绑定到智能体记忆；HashJack 在访问 URL 的片段中隐藏命令；Perplexity Comet 劫持只需一次点击。

防御现状令人难以安心。OpenAI 准备度负责人直言，间接提示词注入“不是可以完全修补的漏洞”。因为攻击位于智能体读取与行动之间的边界，而该边界在架构上模糊：原则上，模型读到的每个词元都可能被当作指令。

本课明确攻击面和基准版图（BrowseComp、OSWorld、WebArena-Verified），并建模最小间接提示词注入场景，让你能思考第 14、18 课的实际防御。

## 概念（The Concept）

### 2026 年版图：每个系统一段（The 2026 landscape, in one paragraph per system）

**ChatGPT agent（OpenAI）。** 2025 年 7 月推出，合并 Operator（浏览）与 Deep Research（多小时研究）。独立 Operator 于 2025 年 8 月 31 日关闭。BrowseComp 最佳成绩为 68.9%，OSWorld 和 WebArena-Verified 也表现突出。

**Claude Sonnet + Vercept（Anthropic）。** Anthropic 收购 Vercept 聚焦计算机使用能力，使 Claude Sonnet 在 OSWorld 从 <15% 升至 72.5%。Claude Computer Use 以工具 API 交付。

**Gemini 3 Pro 与 Browser Use（DeepMind）。** Browser Use 集成提供计算机使用控制；FSF v3（2026 年 4 月，第 20 课）专门跟踪机器学习研发领域的自主性。

**WebArena-Verified（ServiceNow，ICLR 2026）。** 修正一个已充分记录的问题：原 WebArena 约有 ~11.3% 假阴性率，即已解决任务被判失败。Verified 按人工筛选成功标准重新评分，并增加 258 题 Hard 子集（ICLR 2026 论文，openreview.net/forum?id=94tlGxmqkN）。

### BrowseComp、OSWorld 与 WebArena 对比（BrowseComp vs OSWorld vs WebArena）

| 基准 | 测量内容 | 时程 |
|---|---|---|
| BrowseComp | 时间压力下在开放网络寻找具体事实 | 分钟 |
| OSWorld | 智能体操作完整桌面（鼠标、键盘、shell） | 数十分钟 |
| WebArena-Verified | 模拟网站上的事务性网页任务 | 分钟 |
| Hard 子集 | 有跨页面状态转移的 WebArena-Verified 任务 | 数十分钟 |

维度不同。BrowseComp 高分表示会找事实，不表示会订机票。OSWorld 更接近“能否在我的桌面工作”，WebArena-Verified 更接近“能否完成流程”。生产决策需要与任务分布匹配的基准。

### 具体攻击面（The attack surface, named）

1. **间接提示词注入（Indirect prompt injection）。** 不可信页面含指令，智能体读取并执行。公开例子：2024 年 Kai Greshake 等、2025 年 Tainted Memories 论文、2026 年 HashJack（Cato Networks）。
2. **URL 片段 / 查询注入（URL fragment / query injection）。** 抓取页面时，URL 的 `#fragment` 或查询字符串中可能包含命令。这些命令不会显示在页面上，却仍会进入智能体的上下文。
3. **记忆绑定攻击（Memory-binding attacks）。** 页面指示智能体写入持久记忆（第 12 课介绍持久状态）。下一会话中记忆触发载荷，没有可见触发点。
4. **已认证会话上的 CSRF 类攻击。** Tainted Memories 类：智能体已登录某处，攻击者页面发出改变状态的请求，智能体用用户 Cookie 执行。
5. **一键劫持（One-click hijack）。** 看似无害的按钮携带智能体会跟随的载荷，属于 Comet 类。
6. **智能体宿主环境中的内容安全策略（Content-Security-Policy）漏洞。** 渲染层和工具层本身也可能成为攻击途径；浏览器智能体内嵌浏览器所涉及的技术栈范围很广。

### 为何“无法完全修补”（Why "not fully patchable"）

这种攻击利用的，正是智能体完成任务所必需的能力：它必须读取不可信内容才能工作，而这些内容可能包含指令；如果它遵循这些指令，就可能偏离用户的真实请求。信任边界、分类器、工具允许列表，以及对有实质后果的操作进行人工介入（Human-in-the-loop，HITL），能够提高攻击成本、缩小影响范围，但不能彻底消除此类攻击。

这与 Lob 定理（第 8 课）的推理模式相同：智能体无法证明下一词元安全，只能建立更容易发现不安全词元的系统。

### 可落地的防御措施（Defense posture that actually ships）

- **读写边界（Read / write boundary）。** 读取从不产生实质后果。若发起内容来自信任边界外，写入（提交表单、发帖、调用有副作用工具）需要新一次人工批准。
- **逐任务工具允许列表（Tool allowlist per task）。** 智能体可以浏览，却不能发起电汇，除非该任务明确启用相应工具。第 13 课介绍预算。
- **会话隔离（Session isolation）。** 浏览器智能体会话只用限定范围凭据，无生产认证、无个人邮件。保留每个 HTTP 请求的日志供审计。
- **内容清洗器（Content sanitizer）。** 获取的 HTML 拼入模型上下文前，移除已知恶意模式。（减少简单攻击，挡不住复杂载荷。）
- **有实质后果动作上的 HITL。** 先提案后提交模式（第 15 课）。
- **记忆中的金丝雀词元（Canary tokens）。** 若记忆条目触发，用户能看到（第 14 课）。

```figure
injection-boundary
```

## 实际应用（Use It）

`code/main.py` 建模一次面向三个合成页面的微型浏览器智能体运行：一个良性页面，一个可见文本包含直接提示词注入块，一个含 URL 片段注入（不可见但进入上下文）。脚本展示（a）朴素智能体会做什么、（b）读写边界捕获什么、（c）清洗器捕获什么、（d）两者都遗漏什么。

## 交付成果（Ship It）

`outputs/skill-browser-agent-trust-boundary.md` 界定拟议部署：触及哪些信任区、获准写什么、首次运行前必须配置哪些防御。

## 练习（Exercises）

1. 运行 `code/main.py`。指出清洗器能捕获但读写边界不能的攻击，以及只有读写边界能捕获的攻击。

2. 扩展清洗器，检测一类 HashJack 式 URL 片段注入。用含合法片段的良性 URL 测量误报率。

3. 选择熟悉的真实浏览器智能体工作流，例如“订机票”，列出每次读写，标记哪些写入需要 HITL 及原因。

4. 阅读 WebArena-Verified 的 ICLR 2026 论文。指出原 WebArena 评分不可靠的一类任务，解释 Verified 子集如何解决。

5. 为浏览器智能体设计记忆金丝雀。存什么、存哪里、什么触发告警？

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|---|---|---|
| 间接提示词注入（Indirect prompt injection） | “恶意页面文字” | 智能体读取的不可信页面内容含有它会执行的指令 |
| Tainted Memories | “记忆攻击” | 智能体将攻击者指令写入持久记忆，下次会话触发 |
| HashJack | “URL 片段攻击” | URL 片段 / 查询字符串隐藏载荷，进入上下文但不可见渲染 |
| 一键劫持（One-click hijack） | “恶意按钮” | 可见交互元素携带智能体执行的后续载荷 |
| BrowseComp | “网络搜索基准” | 在开放网络寻找具体事实，分钟级时程 |
| OSWorld | “桌面基准” | 完整操作系统控制，多步图形界面任务 |
| WebArena-Verified | “修正后的网页任务基准” | ServiceNow 重新评分的 WebArena，含 Hard 子集 |
| 读写边界（Read/write boundary） | “副作用门禁” | 读取从不产生实质后果，源于信任区外内容的写入需新批准 |

## 延伸阅读（Further Reading）

- [OpenAI：介绍 ChatGPT agent](https://openai.com/index/introducing-chatgpt-agent/)：合并 Operator 与深度研究；BrowseComp 最佳成绩。
- [OpenAI：计算机使用智能体](https://openai.com/index/computer-using-agent/)：Operator 谱系及后来成为 ChatGPT agent 的架构。
- [Zhou 等：WebArena](https://webarena.dev/)：原始基准。
- [WebArena-Verified（OpenReview）](https://openreview.net/forum?id=94tlGxmqkN)：ICLR 2026 修正子集论文。
- [Anthropic：在实践中衡量智能体自主性](https://www.anthropic.com/research/measuring-agent-autonomy)：包含计算机使用智能体攻击面的讨论。
