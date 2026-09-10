#!/usr/bin/env python3
"""将课程组装为分卷图书，并使用 pandoc 渲染。

用法：
    python3 scripts/build_book.py                 # 组装全部分卷并生成 EPUB
    python3 scripts/build_book.py --volume language
    python3 scripts/build_book.py --pdf           # 同时生成 PDF（xelatex）
    python3 scripts/build_book.py --assemble-only # 仅组装 Markdown，不调用 pandoc

图书用于配合仓库和网站学习，不替代在线内容。
交互图表、测验和可运行代码保留在线，每章末尾提供相应链接。
"""

import argparse
import functools
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
from datetime import date
from urllib.parse import urlsplit, unquote, quote
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_catalog import LESSON_DIR_RE, read_h1, slug_to_title  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
PHASES = ROOT / "phases"
BUILD = ROOT / "book" / "_build"
DIST = ROOT / "dist" / "book"

CONFIG = json.loads((ROOT / "book" / "volumes.json").read_text(encoding="utf-8"))
SITE = CONFIG["site"].rstrip("/")
REPO = CONFIG["repo"].rstrip("/")

FENCE = re.compile(r"^```")
ASSET_IMG = re.compile(r"\]\(\.\./assets/")
HEADING2 = re.compile(r"^## ")

MERMAID_OK = shutil.which("mmdc") is not None
ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"]


def lesson_dirs(phase):
    base = PHASES / phase
    if not base.is_dir():
        return []
    return [
        d
        for d in sorted(base.iterdir())
        if d.is_dir() and LESSON_DIR_RE.match(d.name) and (d / "docs" / "en.md").is_file()
    ]


def phase_title(phase):
    return read_h1(PHASES / phase / "README.md") or slug_to_title(phase.split("-", 1)[-1])


def urls_for(phase, lesson):
    rel = f"phases/{phase}/{lesson}"
    return {
        "web": f"{SITE}/lesson?path={rel}",
        "code": f"{REPO}/tree/main/{rel}/code",
        "repo": f"{REPO}/tree/main/{rel}",
    }


def fenced_div(cls, *lines):
    return ["", "::: {." + cls + "}", *lines, ":::", ""]


def continue_box(u, has_quiz):
    lines = [
        "**在线继续学习。** 本章的在线版本提供纸面之外的学习内容：",
        "",
        f"- 动画、交互图表和网页正文：<{u['web']}>",
        f"- 每个步骤的可运行代码：<{u['code']}>",
    ]
    if has_quiz:
        lines.append(f"- 本章测验，可在浏览器中自动评分：<{u['web']}>")
    lines += [
        "",
        "仓库的更新快于印刷出版。图书与仓库内容不一致时，以仓库为准。",
    ]
    return fenced_div("continue-online", *lines)


def fence_end(src, i):
    """返回 src[i] 所开围栏的结束行索引；未闭合时返回 len(src)。"""
    j = i + 1
    while j < len(src) and src[j].strip() != "```":
        j += 1
    return j


BOOK_LANG = "zh"  # 本分支保留 en.md 路径，但权威源文档已是中文。
SNAPSHOT_DATE = None  # 无 .git 的归档可显式声明中文快照日期，不虚构提交时间。


def snapshot_date_arg(value):
    """接受严格的 YYYY-MM-DD 日期；不使用当前时钟悄悄填充来源信息。"""
    try:
        parsed = date.fromisoformat(value)
    except ValueError as exc:
        raise argparse.ArgumentTypeError("快照日期必须为有效的 YYYY-MM-DD") from exc
    if parsed.isoformat() != value:
        raise argparse.ArgumentTypeError("快照日期必须为有效的 YYYY-MM-DD")
    return value


def localize_lesson_metadata(line):
    """只转换书中的展示标签，不修改课程源文件或代码块中的机器字段。"""
    if BOOK_LANG not in ("zh", "zh-CN"):
        return line
    match = re.match(r"^\*\*(Type|Languages|Prerequisites|Time):\*\*\s*(.*)$", line)
    if not match:
        return line
    key, value = match.groups()
    labels = {"Type": "课程类型", "Languages": "使用语言", "Prerequisites": "先修要求", "Time": "预计用时"}
    if key == "Type":
        kinds = {"build": "动手实践", "learn": "概念学习", "use": "应用练习", "capstone": "综合项目", "lab": "实验"}
        value = re.sub(r"\b(Build|Learn|Use|Capstone|lab)\b", lambda m: kinds[m.group().lower()], value, flags=re.I)
    return f"**{labels[key]}：** {value}  "




INLINE_CODE = re.compile(r"(`+)(?:(?!\1).)*?\1")
DOCUMENT_LINK = re.compile(r'(?<!!)\[([^\]\n]*)\]\(([^)\s]+)(\s+"[^"\n]*")?\)')
SVG_IMAGE = re.compile(r'(!\[[^\]\n]*\]\()([^\s)]+\.svg)(\))')


def rewrite_document_links(line, lesson_dir):
    """把已存在的仓库相对链接改成上游链接；不改代码、图片、外链或片段锚点。"""
    protected = []
    def hold(match):
        protected.append(match.group())
        return f"\x00BOOK_CODE_{len(protected)-1}\x00"
    held = INLINE_CODE.sub(hold, line)
    def rewrite(match):
        label, destination, title = match.groups()
        parsed = urlsplit(destination)
        if parsed.scheme or parsed.netloc or not parsed.path:
            return match.group()
        target = (lesson_dir / "docs" / unquote(parsed.path)).resolve()
        try:
            relative = target.relative_to(ROOT.resolve())
        except ValueError:
            return match.group()
        if not target.exists():
            return match.group()
        kind = "tree" if target.is_dir() else "blob"
        url = f"{REPO}/{kind}/main/{quote(relative.as_posix(), safe='/')}"
        if parsed.query:
            url += "?" + parsed.query
        if parsed.fragment:
            url += "#" + parsed.fragment
        return f"[{label}]({url}{title or ''})"
    result = DOCUMENT_LINK.sub(rewrite, held)
    for index, text in enumerate(protected):
        result = result.replace(f"\x00BOOK_CODE_{index}\x00", text)
    return result


def prepare_pdf_markdown(md):
    """缺少 rsvg-convert 时，使用实际 Inkscape 导出矢量 PDF；EPUB 仍保留原 SVG。"""
    if not md.is_file():
        return md  # 让 pandoc 对缺失输入给出原有错误，便于调用方诊断。
    text = md.read_text(encoding="utf-8")
    if shutil.which("rsvg-convert") or not SVG_IMAGE.search(text):
        return md
    inkscape = shutil.which("inkscape")
    if not inkscape:
        raise RuntimeError("PDF 含 SVG 图片：请安装 rsvg-convert（librsvg2-bin）或 Inkscape 后重试。")
    cache = BUILD / "pdf-images"
    cache.mkdir(parents=True, exist_ok=True)
    version = subprocess.run([inkscape, "--version"], capture_output=True, text=True, check=True, timeout=30).stdout
    font_key = "\n".join(sorted(font_families()))
    def replace(match):
        source = (ROOT / unquote(match.group(2))).resolve()
        if not source.is_relative_to(ROOT.resolve()) or not source.is_file():
            raise RuntimeError(f"PDF 的 SVG 图片不存在或越出工程目录：{match.group(2)}")
        digest = hashlib.sha256(source.read_bytes() + version.encode() + font_key.encode()).hexdigest()
        pdf = cache / f"{digest}.pdf"
        if not pdf.is_file():
            temporary = cache / f"{digest}.{os.getpid()}.tmp.pdf"
            try:
                result = subprocess.run(
                    [inkscape, str(source), "--export-type=pdf", f"--export-filename={temporary}"],
                    capture_output=True, text=True, check=True, timeout=90,
                )
                if not temporary.is_file() or not temporary.read_bytes().startswith(b"%PDF-"):
                    raise RuntimeError(f"Inkscape 未生成有效 PDF：{source}")
                temporary.replace(pdf)
                if result.stderr.strip():
                    print(f"Inkscape 提示（{source.name}）：{result.stderr.strip()}", file=sys.stderr)
            finally:
                temporary.unlink(missing_ok=True)
        return match.group(1) + str(pdf.relative_to(ROOT)) + match.group(3)
    lines = []
    in_code = False
    for line in text.splitlines(keepends=True):
        if FENCE.match(line):
            in_code = not in_code
            lines.append(line)
        else:
            lines.append(line if in_code else SVG_IMAGE.sub(replace, line))
    pdf_md = BUILD / f"{md.stem}-pdf.md"
    pdf_md.write_text("".join(lines), encoding="utf-8")
    return pdf_md

def _lesson_source(phase, lesson):
    en = ROOT / "phases" / phase / lesson / "docs" / "en.md"
    if BOOK_LANG not in ("en", "zh", "zh-CN"):
        tr = ROOT / "i18n" / BOOK_LANG / "phases" / phase / lesson / "docs" / f"{BOOK_LANG}.md"
        if tr.is_file():
            return tr
    return en


def transform_lesson(phase, lesson_dir):
    lesson = lesson_dir.name
    u = urls_for(phase, lesson)
    has_quiz = (lesson_dir / "quiz.json").is_file()
    src = _lesson_source(phase, lesson).read_text(encoding="utf-8").splitlines()

    out = []
    balanced = True
    i = 0
    while i < len(src):
        line = src[i]

        if FENCE.match(line):
            end = fence_end(src, i)
            if end >= len(src):
                balanced = False
            info = line[3:].strip()
            block = src[i + 1 : end]
            if info == "figure":
                fig_id = block[0].strip() if block else "figure"
                out += fenced_div(
                    "interactive-figure",
                    f"**交互图表（Interactive Figure）：`{fig_id}`。** 请在网页版本中观看动画并拖动控件：<{u['web']}>",
                )
            elif info == "mermaid":
                rendered = render_mermaid(block)
                if rendered:
                    out += ["", f"![图表]({rendered})", ""]
                else:
                    out += fenced_div(
                        "interactive-figure",
                        f"**图表。** 在网页版本中实时渲染：<{u['web']}>",
                    )
            else:
                out += src[i : end + 1]
            i = end + 1
            continue

        if re.match(r"^## (?:Ship It|[^\n]+（Ship It）)", line):
            out += fenced_div(
                "continue-online",
                f"**本章提供可复用的交付物（Artifact）。** 在线课程会产出提示词（Prompt）或智能体技能（Agent Skill），文件位于仓库中，可供安装使用：<{u['repo']}>",
            )
            i += 1
            while i < len(src):
                if FENCE.match(src[i]):
                    end = fence_end(src, i)
                    if end >= len(src):
                        balanced = False
                    i = end + 1
                    continue
                if HEADING2.match(src[i]):
                    break
                i += 1
            continue

        if re.match(r"^## (?:Exercises|[^\n]+（Exercises）)", line):
            out.append(line)
            out.append("")
            out.append(f"起始代码与本课的可运行实现：<{u['code']}>")
            i += 1
            continue

        out.append(localize_lesson_metadata(rewrite_document_links(ASSET_IMG.sub(f"](phases/{phase}/{lesson}/assets/", line), lesson_dir)))
        i += 1

    if not balanced:
        raise ValueError(f"代码围栏未闭合：{lesson_dir / 'docs' / 'en.md'}")

    out += continue_box(u, has_quiz)
    return out


@functools.lru_cache(maxsize=None)
def font_families():
    if not shutil.which("fc-list"):
        return frozenset()
    r = subprocess.run(["fc-list", ":", "family"], capture_output=True, text=True)
    return frozenset(
        fam.strip() for fam_line in r.stdout.splitlines() for fam in fam_line.split(",")
    )


def pick_font(candidates):
    families = font_families()
    for c in candidates:
        if c in families:
            return c
    return None


def render_mermaid(block):
    if not MERMAID_OK:
        return None
    assets = BUILD / "diagrams"
    assets.mkdir(parents=True, exist_ok=True)
    stem = hashlib.sha1("\n".join(block).encode()).hexdigest()[:16]
    svg = assets / f"{stem}.svg"
    if svg.is_file():
        return str(svg.relative_to(ROOT))
    mmd = assets / f"{stem}.mmd"
    mmd.write_text("\n".join(block), encoding="utf-8")
    try:
        subprocess.run(
            ["mmdc", "-i", str(mmd), "-o", str(svg), "-b", "transparent", "--quiet"],
            check=True, capture_output=True, timeout=60,
        )
        return str(svg.relative_to(ROOT))
    except subprocess.CalledProcessError as exc:
        detail = (exc.stderr or b"").decode(errors="replace").strip()[:300]
        print(f"警告：Mermaid 图表 {mmd.name} 渲染失败：{detail}", file=sys.stderr)
        return None
    except subprocess.TimeoutExpired:
        print(f"警告：Mermaid 图表 {mmd.name} 渲染超时", file=sys.stderr)
        return None


@functools.lru_cache(maxsize=None)
def git_date():
    if SNAPSHOT_DATE is not None:
        return SNAPSHOT_DATE
    return subprocess.run(
        ["git", "log", "-1", "--format=%cs"], capture_output=True, text=True, cwd=ROOT
    ).stdout.strip()


@functools.lru_cache(maxsize=None)
def git_edition():
    value = git_date()
    return value[:7].replace("-", ".") if value else "日期未标注"


@functools.lru_cache(maxsize=None)
def titlepage_template():
    return (ROOT / "book" / "titlepage.tex").read_text(encoding="utf-8")


def clean_phase_title(raw):
    return re.sub(r"^Phase\s+\d+\s*[:—-]\s*", "", raw).strip()


def series_map(vol):
    rows = []
    for v in CONFIG["volumes"]:
        marker = "**" if v["slug"] == vol["slug"] else ""
        phases = ", ".join(p.split("-")[0] for p in v["phases"])
        rows.append(f"| {marker}{v['number']}{marker} | {marker}{v['title']}{marker} — {v['subtitle']} | {phases} |")
    return "\n".join([
        "| 卷 | 标题 | 课程阶段 |",
        "|-----|-------|---------------|",
    ] + rows)


def how_to_use(vol):
    snapshot = git_date() or "未标注（归档不含 Git 元数据，也未指定快照日期）"
    return f"""# 关于本卷 {{.unnumbered}}

本书是《{CONFIG['series']}》第 {vol['number']} 卷。这套六卷图书整理自同名开放课程，各卷可以独立阅读。交叉引用使用课程阶段编号，对应关系如下：

{series_map(vol)}

**中文版快照：{snapshot}。** 日期表示本次采用的中文版本，不表示原文中的模型、价格、论文或政策已经在该日重新核验。书内外链指向上游网站和仓库，可能显示英文或不同版本；配套中文源码请使用随本书交付的 `project/` 目录。

本卷内容来自课程阶段 {', '.join(p.split('-')[0] for p in vol['phases'])}。先修要求引用的是阶段编号，而不是卷号；请根据上表查找对应分卷。

# 如何使用本书 {{.unnumbered}}

本卷是整套学习流程的一部分，建议完成以下完整步骤：

1. **在书中阅读章节。** 本书收录课程正文、推导与代码讲解；交互图表和交付任务以在线入口补充，不是在线课程的完全离线镜像。
2. **运行仓库中的代码。** 每章的 `code/` 目录都包含可运行实现。运行它、修改它，并观察哪些改动会出错：<{REPO}>
3. **使用纸面无法提供的网页功能。** 观看和操作动态图表，完成每章自动评分的测验：<{SITE}>

仓库中的课程会随领域发展持续更新，图书则是带有版本号的快照。两者不一致时，以仓库为准。

## 使用 AI 辅助学习 {{.unnumbered}}

本课程既供人阅读，也便于智能体（Agent）使用。所有课程的机器可读索引位于 <{SITE}/llms.txt>。借助 AI 助手学习时，可以使用以下提示词：

> 我正在学习《{CONFIG["series"]}》第 {vol["number"]} 卷《{vol["title"]}》。请获取 <{SITE}/llms.txt>，找到我指定的课程，并担任我的导师：围绕关键术语（Key Terms）提问，审阅我的练习（Exercises）解答，并带我逐步理解仓库中的代码。

**图形署名。** PDF 中出现的彩色表情图形来自 [Twemoji（Twitter 及贡献者）](https://github.com/twitter/twemoji)，按 [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) 使用，经本地 `twemojis` 包缩放嵌入，图形本身未改绘；原始 Unicode 字符仍保留在 EPUB 和源码中。
"""


def assemble(vol):
    BUILD.mkdir(parents=True, exist_ok=True)
    parts = [how_to_use(vol)]
    chapters = 0
    for part_idx, phase in enumerate(vol["phases"]):
        title = clean_phase_title(phase_title(phase))
        parts.append(
            f"\n# 第 {ROMAN[part_idx]} 部分：{title} {{.unnumbered .part}}\n\n"
            f"*课程阶段 {phase.split('-')[0]}。含动态图表与测验的在线版本：<{SITE}/catalog.html>*\n"
        )
        for lesson_dir in lesson_dirs(phase):
            parts.append("\n".join(transform_lesson(phase, lesson_dir)))
            chapters += 1
    text = "\n\n".join(parts)
    md = BUILD / f"{vol['slug']}.md"
    md.write_text(text, encoding="utf-8")
    return md, chapters, len(text.split())


def metadata(vol):
    meta = BUILD / f"{vol['slug']}-meta.yaml"
    meta.write_text(
        "---\n"
        f"title: \"{CONFIG['series']}\"\n"
        f"subtitle: \"第 {vol['number']} 卷：{vol['title']}：{vol['subtitle']}\"\n"
        f"author: \"{CONFIG['author']}\"\n"
        f"lang: {'zh-Hans' if BOOK_LANG == 'zh' else BOOK_LANG}\n"
        "toc-title: 目录\n"
        "---\n",
        encoding="utf-8",
    )
    return meta



def prepare_unicode_header(md):
    """按实际字符启用字体/图形回退，不改动源码或 EPUB 中的 Unicode。"""
    if not md.is_file():
        return None
    text = md.read_text(encoding="utf-8")
    emojis = [c for c in "🔥🌍🤖💪" if c in text]
    devanagari = any("\u0900" <= c <= "\u097f" for c in text)
    if not emojis and not devanagari:
        return None
    lines = [r"\usepackage{accsupp}"]
    if devanagari:
        font = pick_font(["Noto Sans Devanagari", "Noto Serif Devanagari"])
        if not font:
            raise RuntimeError("PDF 含天城文示例；请安装 Noto Sans Devanagari 后重试。")
        lines += [
            rf"\newfontfamily\bookhindifont[Script=Devanagari]{{{font}}}",
            r"\newcommand{\bookdevanagari}[2]{\BeginAccSupp{method=hex,unicode,space,ActualText=#1}\mbox{\bookhindifont #2}\EndAccSupp{}}",
        ]
    if emojis:
        # twemojis 使用矢量图，不需要也不附带 Noto Color Emoji 字体文件。
        lines += [r"\usepackage{twemojis}", r"\usepackage{newunicodechar}"]
        for char in emojis:
            actual = char.encode("utf-16-be").hex().upper()
            lines.append(r"\newunicodechar{" + char + r"}{\BeginAccSupp{method=hex,unicode,space,ActualText=" + actual + r"}\texttwemoji{" + format(ord(char), "x") + r"}\EndAccSupp{}}")
        codes = "".join(r'\catcode"' + format(ord(c), "X") + r"=13\relax" for c in emojis)
        lines += [r"\fvset{codes*={" + codes + "}}", r"\fvinlineset{codes*={" + codes + "}}"]
    BUILD.mkdir(parents=True, exist_ok=True)
    header = BUILD / (md.stem + "-unicode.tex")
    header.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return header


def render(vol, md, chapters, pdf=False):
    DIST.mkdir(parents=True, exist_ok=True)
    meta = metadata(vol)
    suffix = "" if BOOK_LANG == "en" else f"-{BOOK_LANG}"
    epub = DIST / f"aiefs-vol{vol['number']}-{vol['slug']}{suffix}.epub"
    cmd = [
        "pandoc", str(meta), str(md),
        "-o", str(epub),
        "--from", "markdown+fenced_divs",
        "--lua-filter", str(ROOT / "book" / "literal-tokens.lua"),
        "--toc", "--toc-depth=1",
        "--top-level-division=chapter",
        "--css", str(ROOT / "book" / "epub.css"),
        "--resource-path", str(ROOT),
        "--metadata", f"date={git_date()}",
    ]
    subprocess.run(cmd, check=True, cwd=ROOT)
    results = [epub]
    if pdf and BOOK_LANG in ("ar", "fa", "ur", "he"):
        # 从右向左书写需要双向排版引擎和阿拉伯文/希伯来文字体，当前 xelatex 主题未提供。
        # 上方 EPUB 原生支持 RTL；跳过不受支持的 PDF，避免输出方向错误的页面。
        print(f"说明：{vol['slug']} 尚不支持 {BOOK_LANG} 的从右向左（RTL）PDF 排版，已跳过 PDF；EPUB 已生成", file=sys.stderr)
        pdf = False
    if pdf:
        titlepage = BUILD / f"{vol['slug']}-titlepage.tex"
        titlepage.write_text(
            titlepage_template()
            .replace("@VOLNUM3@", f"{vol['number']:03d}")
            .replace("@EDITION@", git_edition())
            .replace("@ROMAN@", ROMAN[vol["number"] - 1])
            .replace("@TOTALVOL@", ROMAN[len(CONFIG["volumes"]) - 1])
            .replace("@CHAPTERS@", str(chapters))
            .replace("@PHASES@", "\\ \\textperiodcentered\\ ".join(p.split("-")[0] for p in vol["phases"]))
            .replace("@TITLE@", vol["title"])
            .replace("@SUBTITLE@", vol["subtitle"]),
            encoding="utf-8",
        )
        pdf_out = DIST / f"aiefs-vol{vol['number']}-{vol['slug']}{suffix}.pdf"
        pdf_md = prepare_pdf_markdown(md)
        cmd_pdf = [
            "pandoc", str(pdf_md),
            "-o", str(pdf_out),
            "--from", "markdown+fenced_divs+autolink_bare_uris",
            "--lua-filter", str(ROOT / "book" / "literal-tokens.lua"),
            "--lua-filter", str(ROOT / "book" / "pdf-layout.lua"),
            "--toc", "--toc-depth=1",
            "--top-level-division=chapter",
            "--pdf-engine=xelatex",
            "--columns=40",
            "--resource-path", str(ROOT),
            "--include-in-header", str(ROOT / "book" / "theme.tex"),
            "--include-before-body", str(titlepage),
            "-M", f"title-meta={CONFIG['series']} 第 {vol['number']} 卷：{vol['title']}",
            "-M", "author-meta=aiengineeringfromscratch.com",
            "-M", f"lang={'zh-Hans' if BOOK_LANG == 'zh' else BOOK_LANG}",
            "-V", "toc-title=目录",
            "-V", "documentclass=book",
            "-V", "classoption=oneside,openany",
            "-V", "geometry=margin=1in",
            "-V", "fontsize=10pt",
        ]
        serif = pick_font(["DejaVu Serif", "STIX Two Text", "Georgia"])
        mono = pick_font(["DejaVu Sans Mono", "Menlo", "Consolas"])
        if serif:
            cmd_pdf += ["-V", f"mainfont={serif}"]
        if mono:
            cmd_pdf += ["-V", f"monofont={mono}"]
        # 中日韩文字（CJK）需要对应字体；拉丁、西里尔、希腊文字使用主字体；天城文字另用按需字体回退。
        cjk_candidates = {
            "zh": ["Noto Serif CJK SC", "Source Han Serif SC", "Noto Sans CJK SC", "Songti SC", "PingFang SC"],
            "zh-TW": ["Noto Sans CJK TC", "Noto Serif CJK TC", "Source Han Serif TC"],
            "ja": ["Noto Sans CJK JP", "Noto Serif CJK JP", "Source Han Serif JP"],
            "ko": ["Noto Sans CJK KR", "Noto Serif CJK KR", "Source Han Serif KR"],
        }
        if BOOK_LANG in cjk_candidates:
            cjk = pick_font(cjk_candidates[BOOK_LANG])
            if not cjk:
                raise RuntimeError(f"无法生成 {BOOK_LANG} PDF：未找到对应的中日韩（CJK）字体；请安装 Noto CJK 字体后重试。")
            cmd_pdf += ["-V", f"CJKmainfont={cjk}", "-V", f"CJKmonofont={cjk}"]
        unicode_header = prepare_unicode_header(pdf_md)
        if unicode_header:
            cmd_pdf += ["--include-in-header", str(unicode_header)]
        subprocess.run(cmd_pdf, check=True, cwd=ROOT)
        results.append(pdf_out)
    return results


def check_phases():
    claimed = set()
    for vol in CONFIG["volumes"]:
        for phase in vol["phases"]:
            claimed.add(phase)
            if not (PHASES / phase).is_dir() or not lesson_dirs(phase):
                sys.exit(f"分卷 {vol['slug']}：阶段 {phase} 不存在或没有课程")
    for d in sorted(PHASES.iterdir()):
        if d.is_dir() and d.name not in claimed:
            print(f"警告：阶段目录 {d.name} 未归入任何分卷", file=sys.stderr)


def main():
    global BOOK_LANG, SNAPSHOT_DATE
    ap = argparse.ArgumentParser()
    ap.add_argument("--volume", help="根据分卷短标识（Slug）构建单卷")
    ap.add_argument("--pdf", action="store_true", help="同时通过 xelatex 生成 PDF")
    ap.add_argument("--snapshot-date", type=snapshot_date_arg, help="无 Git 归档使用的中文快照日期，格式 YYYY-MM-DD；不是上游内容的事实更新日期")
    ap.add_argument("--assemble-only", action="store_true", help="仅组装，不调用 pandoc")
    ap.add_argument("--lang", default="zh",
                    help="默认构建本分支中文版本；其他语言从 i18n/<lang>/ 读取，缺失时使用本分支源文件")
    args = ap.parse_args()
    BOOK_LANG = "zh" if args.lang == "zh-CN" else args.lang
    SNAPSHOT_DATE = args.snapshot_date
    git_date.cache_clear()
    git_edition.cache_clear()

    check_phases()

    vols = CONFIG["volumes"]
    if args.volume:
        vols = [v for v in vols if v["slug"] == args.volume]
        if not vols:
            sys.exit(f"未知分卷：{args.volume}")

    for vol in vols:
        md, chapters, words = assemble(vol)
        print(f"第 {vol['number']} 卷 {vol['slug']}：{chapters} 章，{words:,} 个空白分隔文本单元 -> {md}")
        if not args.assemble_only:
            for artifact in render(vol, md, chapters, pdf=args.pdf):
                size = artifact.stat().st_size // 1024
                print(f"  {artifact} ({size} KB)")


if __name__ == "__main__":
    main()
