# 图书构建流程（Book Pipeline）

本课程可编译成六卷系列图书。图书用于配合课程学习，而不是替代课程：交互图表、评分测验与可运行代码仍保留在网站和本仓库中，每章末尾都附有相应链接。

## 分卷安排（Volumes）

分卷配置位于 `volumes.json`，每卷对应一组课程阶段：

| 卷 | 标题 | 阶段 |
|-----|-------|--------|
| 1 | 基础（Foundations） | 00-02 |
| 2 | 深度学习（Deep Learning） | 03, 04, 06 |
| 3 | 语言（Language） | 05, 07 |
| 4 | 大语言模型（Large Language Models） | 08-11 |
| 5 | 智能体（Agents） | 12-16 |
| 6 | 生产实践（Production） | 17-19 |

## 构建（Build）

```bash
python3 scripts/build_book.py                  # 生成全部分卷的 EPUB
python3 scripts/build_book.py --volume language
python3 scripts/build_book.py --pdf            # 同时生成 PDF，需要 xelatex 和中文字体
```

构建需要 pandoc。可选安装 `@mermaid-js/mermaid-cli`（mmdc），将 Mermaid 图表渲染为图片；未安装时，图表会替换为网页版本的跳转提示。输出目录为 `dist/book/`。

本分支默认将 `docs/en.md` 中的中文正文编译为中文图书。PDF 需要可用的中日韩字体（CJK Font），例如 Noto Serif CJK SC、思源宋体（Source Han Serif SC）；macOS 也可使用宋体（Songti SC）或苹方（PingFang SC）。正文和代码块中的中文使用同一套 CJK 字体。Ubuntu CI 会安装 `fonts-noto-cjk`；本地缺少字体时构建会明确报错。

持续集成（Continuous Integration，CI）工作流 `.github/workflows/build-book.yml` 会在推送涉及 `phases/` 的变更时构建 EPUB；发布版本时同时构建 EPUB 和 PDF，并将文件附加到发布版本。

## 每课的组装处理（What the Assembler Does per Lesson）

- 课程的 `# title` 转换为章节标题；阶段转换为不编号的分部页。
- `figure` 块中的 JavaScript 交互组件转换为带边框的提示，引导读者访问该课的网页版本。
- 如果 mmdc 可用，Mermaid 块会渲染为 SVG；否则替换为网页跳转提示。
- `## Ship It` 小节替换为指向仓库交付物的链接。
- `## Exercises` 小节补充链接，指向该课 `code/` 目录中的起始代码。
- 每章末尾增加“在线继续学习”信息框，包含网页版本、代码和测验入口。
- 重写图片资源路径，让 pandoc 能嵌入课程的 SVG 文件。

供智能体导航课程的机器可读索引位于 `site/llms.txt`，部署时由 `site/build.js` 生成，其中链接到每课的原始 Markdown。图书卷首的“使用 AI 学习（Learning with an AI）”页面会介绍如何让 AI 助手使用该索引。
