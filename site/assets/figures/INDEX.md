# 图表索引（Figure Index）

下表列出了 `site/assets/figures/` 下交付的所有图表。FIG 编号全局唯一，单调递增，且永不重复使用。

视觉风格记录在 `blueprint-diagram` Claude Code 技能（Skill）中。按照项目“仓库不包含供应商或工具交付物”的规则，该技能独立于本仓库分发。安装后，技能源码位于 `~/.claude/skills/blueprint-diagram/`；安装路径可向维护者询问，也可按照下方[添加方法](#how-to-add)手动操作，无需安装技能。

| 图号（FIG） | 短标识（slug） | 阶段（phase） | 课程（lesson） | 添加日期（added） | 备注（notes） |
|---|---|---|---|---|---|
| 000 | （课程技术栈，嵌入 README 横幅） | — | — | 2026-05-09 | 首屏主图，位于 `assets/banner.svg`，不在本目录 |
| 001 | exploded-view-floppy | — | — | 2026-05-09 | 技能的参考示例，位于 `~/.claude/skills/blueprint-diagram/references/examples/` |
| 001.A | prompts | — | — | 2026-05-13 | README“每课都有交付物”卡片中的提示词（Prompt）交付物图标 |
| 001.B | skills | — | — | 2026-05-13 | README 卡片中的即插即用 SKILL.md 图标 |
| 001.C | agents | — | — | 2026-05-13 | README 卡片中的 ReAct 风格智能体循环（Agent loop）图标 |
| 001.D | mcp-servers | — | — | 2026-05-13 | README 卡片中的模型上下文协议（Model Context Protocol，MCP）服务器机架图标，包含工具（Tools）、资源（Resources）和提示词（Prompts） |
| 002 | kernel-surface-gaussian | — | — | 2026-05-09 | 技能的参考示例 |
| 003 | pixel-vector-bezier | — | — | 2026-05-09 | 技能的参考示例 |
| 004 | gaussian-kernel-blur | 1 | 8 | 2026-05-09 | “优化：梯度下降家族（Optimization: Gradient Descent Family）”课程的高斯模糊（Gaussian blur）可视化 |
| 005 | transformer-attention-heads | 7 | 1 | 2026-05-09 | 多头注意力（Multi-head attention）模块的分解视图 |
| 006 | ai-engineering-learning-paths | 全部 | 核心学习路径 | 2026-08-23 | 四条相互连接的领域路径，用于导航课程体系 |
| 006.M | ai-engineering-learning-paths-mobile | 全部 | 核心学习路径 | 2026-08-23 | 四条相互连接的领域路径的纵向窄屏视图 |

## 编号规则（Numbering）

- `001`–`099`：预留给课程前期的图表（阶段 0–7）。
- `100`+：按创作顺序分配。
- 子图使用字母后缀：`004.A`、`004.B`。子图与主图共用一行。

<a id="how-to-add"></a>
## 添加方法（How to add）

如果已安装 `blueprint-diagram` 技能：

1. 向技能描述需要表达的概念并运行技能。
2. 技能将 SVG 写入 `site/assets/figures/NNN-slug.svg`，使用下一个可用编号在本表追加一行；如有要求，还会通过 `![FIG_NNN](path)` 将图表接入相应课程的 Markdown 文档。

如果未安装技能，请手动操作：

1. 制作奶油白底色与蓝图风格的 SVG：纸张底色为奶油白 `#fafaf5`，线条为蓝图蓝 `#3553ff`，标签使用 JetBrains Mono 大写字母并配引导线，不使用其他彩色点缀。
2. 使用上表下一个可用的 FIG 编号，保存为 `site/assets/figures/<NNN>-<slug>.svg`。
3. 在本表添加一行，填写 FIG 编号、短标识、目标阶段和课程、当天日期以及一句话备注。
4. 在课程 Markdown 中通过 `![FIG_NNN](../../site/assets/figures/<NNN>-<slug>.svg)` 引用图表。
5. 在 480 / 720 / 1200 px 视口宽度下检查：标签不得与图形重叠，引导线必须指向对应目标。

## 许可证（License）

图表按本仓库的 MIT 许可证发布。MIT 许可证要求在分发 SVG 源文件时保留版权声明；复用渲染后的图像（例如嵌入博客文章或演示文稿）则无需额外署名。
