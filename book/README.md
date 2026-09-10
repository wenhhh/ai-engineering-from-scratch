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
python3 scripts/build_book.py --pdf --snapshot-date 2026-09-09
# 日期应填写实际采用的中文快照日期，不代表上游事实已在该日更新。
```

构建需要 pandoc。可选安装 `@mermaid-js/mermaid-cli`（mmdc），将 Mermaid 图表渲染为图片；未安装时，图表会替换为网页版本的跳转提示。输出目录为 `dist/book/`。无 `.git` 的归档应显式传入 `--snapshot-date YYYY-MM-DD`；不传时标为“日期未标注”，不再显示无效的 `0000.00` 版本。

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

## 中文 PDF 的依赖与验收边界

PDF 使用 Pandoc、XeLaTeX、`fvextra`、`titlesec`、`accsupp` 等 TeX 包。原文的天城文示例按片段使用 Noto Sans Devanagari；只有含这类文字的代码块暂不做语法着色，内容与行序不改。中文、英文代码仍使用各自原字体。四种实际用到的彩色表情由 `twemojis` 嵌入矢量图，配有 Unicode ActualText；PDF 阅读器的复制顺序与连字提取仍可能不同，复制完整代码优先使用配套源码或 EPUB。

静态 SVG 图片优先使用 Pandoc 的 `rsvg-convert`。缺少它时，构建器调用真实 Inkscape 导出矢量 PDF，并按图片内容、转换器版本和字体族清单缓存；不会伪装转换工具，也不会把原 SVG 或 EPUB 替换成占位图片。两种转换器都缺少时明确失败。EPUB 内部资源与链接应另做检查，生成成功本身不是视觉验收。

Ubuntu/Debian 的依赖安装示例（实际发行版可能有不同拆包）：

```bash
sudo apt-get install texlive-xetex texlive-latex-extra texlive-pictures \
  texlive-fonts-recommended fonts-dejavu fonts-noto-cjk fonts-noto-core \
  librsvg2-bin poppler-utils
kpsewhich twemojis.sty
python3 scripts/test_book_rendering.py
```

仓库中的 CI 已补充这些依赖声明及 `kpsewhich` 检查，但本次没有运行远端 GitHub Actions。EPUB 不附带字体文件，中文与其他文字的最终呈现还取决于阅读器字体支持；PDF 中只嵌入实际排版所需的字体子集，不分发字体源文件。

图书覆盖 `volumes.json` 中的六卷、523 课；独立 Claude 认证轨道仍在配套工程内，没有被悄悄加入这六卷。JavaScript 交互图表不转成静态图；未安装 mmdc 时 Mermaid 也保留在线提示，不能称作完全离线课程镜像。书中外链仍指向上游网站/仓库，可能是英文或不同版本，未逐一验证线上可达性。

图形署名：彩色表情图形来自 [Twemoji，Twitter 及贡献者](https://github.com/twitter/twemoji)，图形许可为 [CC BY 4.0](https://github.com/twitter/twemoji/blob/master/LICENSE-GRAPHICS)，经 `twemojis` 包缩放嵌入，没有改绘原图。`twemojis` 宏包本身采用其独立的软件许可；本包不附带整个宏包或图形集合。
