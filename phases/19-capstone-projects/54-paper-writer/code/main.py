"""LaTeX 论文骨架生成器：插入图表引用，并用模拟生成器填充正文。

概念参考：
- ./docs/en.md（本课正文）
- 阶段 19 第 50—53 课（自动研究流程的前置阶段）

仅使用标准库。运行：python3 code/main.py

译注：只写入 .tex、.bib 和清单，不运行 LaTeX 编译，也不生成或校验图表文件。
演示中的论文、作者与引用条目都是占位夹具，不是真实研究产物。
为保留 article 模板及其测试契约，生成的英文 LaTeX 正文与占位文献保留，
并在相邻注释中提供中文释义。模板尚未配置中文排版引擎，不能宣称中文论文渲染已验收。
标题等普通字段会转义，但章节正文、路径、标签及宽度等并未作通用安全校验；
这不是可安全编译任意不可信输入的服务。"""

from __future__ import annotations

import json
import os
import re
from dataclasses import dataclass, field
from typing import Callable, Iterable


class PaperValidationError(Exception):
    """论文在渲染前未通过结构检查时抛出。"""


@dataclass
class BibEntry:
    key: str
    entry_type: str
    fields: dict

    def to_bibtex(self) -> str:
        lines = [f"@{self.entry_type}{{{self.key},"]
        for k, v in sorted(self.fields.items()):
            safe = str(v).replace("{", "").replace("}", "")
            lines.append(f"  {k} = {{{safe}}},")
        lines.append("}")
        return "\n".join(lines)


@dataclass
class Figure:
    id: str
    path: str
    caption: str
    width: str = "0.8\\textwidth"

    @property
    def label(self) -> str:
        return f"fig:{self.id}"


@dataclass
class Section:
    id: str
    title: str
    body: str = ""
    cites: list[str] = field(default_factory=list)
    figure_refs: list[str] = field(default_factory=list)

    @property
    def label(self) -> str:
        return f"sec:{self.id}"


@dataclass
class Paper:
    title: str
    authors: list[str]
    abstract: str
    sections: list[Section] = field(default_factory=list)
    figures: list[Figure] = field(default_factory=list)
    bibliography: list[BibEntry] = field(default_factory=list)


ProseGenerator = Callable[[Section, Paper], str]


def _validate(paper: Paper) -> None:
    if not paper.title.strip():
        # 标题为空。
        raise PaperValidationError("title is empty")
    if not paper.abstract.strip():
        # 摘要为空。
        raise PaperValidationError("abstract is empty")

    fig_ids: set[str] = set()
    for fig in paper.figures:
        if fig.id in fig_ids:
            # 图表 ID 重复。
            raise PaperValidationError(f"duplicate figure id: {fig.id}")
        fig_ids.add(fig.id)

    bib_keys: set[str] = set()
    for b in paper.bibliography:
        if b.key in bib_keys:
            # 参考文献键重复。
            raise PaperValidationError(f"duplicate bibliography key: {b.key}")
        bib_keys.add(b.key)
    for sec in paper.sections:
        for key in sec.cites:
            if key not in bib_keys:
                raise PaperValidationError(
                    # 章节引用了未定义的文献键或图表 ID；异常原值保留。
                    f"section {sec.id!r} cites unknown bibliography key {key!r}"
                )
        for fid in sec.figure_refs:
            if fid not in fig_ids:
                raise PaperValidationError(
                    # 章节引用了未定义的文献键或图表 ID；异常原值保留。
                    f"section {sec.id!r} references unknown figure id {fid!r}"
                )


def _escape_latex(text: str) -> str:
    repl = {
        "\\": r"\textbackslash{}",
        "&": r"\&",
        "%": r"\%",
        "$": r"\$",
        "#": r"\#",
        "_": r"\_",
        "{": r"\{",
        "}": r"\}",
        "~": r"\textasciitilde{}",
        "^": r"\textasciicircum{}",
    }
    out_chars: list[str] = []
    for ch in text:
        out_chars.append(repl.get(ch, ch))
    return "".join(out_chars)


def render_latex(paper: Paper) -> str:
    """将 Paper 对象渲染为完整的 LaTeX 文档字符串，不执行编译。"""
    _validate(paper)

    lines: list[str] = []
    lines.append("\\documentclass{article}")
    lines.append("\\usepackage{graphicx}")
    lines.append("\\usepackage{hyperref}")
    lines.append("\\title{" + _escape_latex(paper.title) + "}")
    lines.append("\\author{" + " \\and ".join(_escape_latex(a) for a in paper.authors) + "}")
    lines.append("\\begin{document}")
    lines.append("\\maketitle")
    lines.append("\\begin{abstract}")
    lines.append(_escape_latex(paper.abstract))
    lines.append("\\end{abstract}")

    for sec in paper.sections:
        lines.append("\\section{" + _escape_latex(sec.title) + "}")
        lines.append("\\label{" + sec.label + "}")
        # LaTeX 注释：正文待填写。
        lines.append(sec.body if sec.body else "% body pending")
        for fid in sec.figure_refs:
            # 排版文本：参见图；后接图表引用标签。
            lines.append("See Figure~\\ref{fig:" + fid + "}.")
        for cite in sec.cites:
            # 排版文本：参见所引文献。
            lines.append("See~\\cite{" + cite + "}.")

    for fig in paper.figures:
        lines.append("\\begin{figure}")
        lines.append("\\centering")
        lines.append("\\includegraphics[width=" + fig.width + "]{" + fig.path + "}")
        lines.append("\\caption{" + _escape_latex(fig.caption) + "}")
        lines.append("\\label{" + fig.label + "}")
        lines.append("\\end{figure}")

    if paper.bibliography:
        lines.append("\\bibliographystyle{plain}")
        lines.append("\\bibliography{references}")

    lines.append("\\end{document}")
    return "\n".join(lines) + "\n"


def render_bibtex(paper: Paper) -> str:
    return "\n\n".join(b.to_bibtex() for b in paper.bibliography) + ("\n" if paper.bibliography else "")


class MockProseGenerator:
    """确定性的正文生成器，在测试与演示中代替模型。"""

    def __init__(self, outlines: dict[str, str]) -> None:
        self.outlines = outlines

    def __call__(self, section: Section, paper: Paper) -> str:
        seed = self.outlines.get(section.id, section.title)
        # 固定正文模板：本节讨论给定章节主题与提纲。
        first = f"In this section we discuss {section.title.lower()}: {seed}."
        bits: list[str] = []
        for fid in section.figure_refs:
            # 固定正文模板：相应图表展示相关产物。
            bits.append(f"Figure~\\ref{{fig:{fid}}} shows the relevant artifact.")
        for c in section.cites:
            # 固定正文模板：本节建立在所引先前工作的基础上。
            bits.append(f"This builds on prior work~\\cite{{{c}}}.")
        # 固定正文模板：下文讨论其含义。
        second = " ".join(bits) if bits else "We discuss implications below."
        return first + "\n\n" + second


def read_experiment_manifest(manifests: Iterable[dict], paper_dir: str) -> list[Figure]:
    """将实验产物清单转换为 Figure 记录。

    每份清单应是如下结构的字典：
        {\"name\": str, \"artifacts\": [{\"path\": str, \"caption\": str}, ...]}
    产物路径会通过 os.path.relpath 转为相对于 paper_dir 的路径。
    相对输入路径实际以当前进程工作目录解释；清单没有独立的 cwd 字段。
    不检查图片是否存在，也不限制路径必须留在论文目录内。"""
    figs: list[Figure] = []
    counter = 0
    for m in manifests:
        name = m.get("name", "exp")
        artifacts = m.get("artifacts", [])
        for art in artifacts:
            path = art.get("path", "")
            caption = art.get("caption", "")
            if not path:
                continue
            counter += 1
            try:
                rel = os.path.relpath(path, paper_dir)
            except ValueError:
                rel = path
            fid = re.sub(r"[^a-zA-Z0-9]+", "-", f"{name}-{counter}").strip("-").lower()
            figs.append(Figure(id=fid, path=rel, caption=caption or name))
    return figs


@dataclass
class PaperWriter:
    prose: ProseGenerator

    def fill_prose(self, paper: Paper) -> Paper:
        for sec in paper.sections:
            if not sec.body:
                sec.body = self.prose(sec, paper)
        return paper

    def write(self, paper: Paper, out_dir: str) -> dict:
        """先创建输出目录并填充正文，再校验、渲染并写入三个文件，返回清单字典。

        文件依次写入，不是原子事务；校验失败前也可能已创建目录或改动内存正文。"""
        os.makedirs(out_dir, exist_ok=True)
        self.fill_prose(paper)
        tex = render_latex(paper)
        bib = render_bibtex(paper)

        tex_path = os.path.join(out_dir, "paper.tex")
        bib_path = os.path.join(out_dir, "references.bib")
        man_path = os.path.join(out_dir, "manifest.json")

        with open(tex_path, "w", encoding="utf-8") as f:
            f.write(tex)
        with open(bib_path, "w", encoding="utf-8") as f:
            f.write(bib)

        manifest = {
            "title": paper.title,
            "authors": list(paper.authors),
            "sections": [
                {"id": s.id, "title": s.title, "cites": list(s.cites),
                 "figure_refs": list(s.figure_refs), "body_chars": len(s.body)}
                for s in paper.sections
            ],
            "figures": [
                {"id": f.id, "path": f.path, "caption": f.caption, "label": f.label}
                for f in paper.figures
            ],
            "bibliography": [b.key for b in paper.bibliography],
            "tex_path": tex_path,
            "bib_path": bib_path,
        }
        with open(man_path, "w", encoding="utf-8") as f:
            json.dump(manifest, f, indent=2, sort_keys=True)
        return manifest


def demo(out_dir: str | None = None) -> dict:
    """独立演示：用两个模拟实验的产物描述构造一篇小论文。

    默认写入临时目录，避免污染工作树。临时目录由 mkdtemp 创建，
    函数不会自动删除；演示未创建所引用的 PDF 图表。"""
    import tempfile as _tempfile
    if out_dir is None:
        out_dir = _tempfile.mkdtemp(prefix="paper-writer-demo-")
    experiments = [
        {"name": "loss-curve", "artifacts": [
            # 图注：各训练轮次的损失。
            {"path": "figs/loss.pdf", "caption": "Training loss across epochs"},
        ]},
        {"name": "ablation", "artifacts": [
            # 图注：针对解码器宽度的消融。
            {"path": "figs/ablation.pdf", "caption": "Ablation over decoder width"},
        ]},
    ]
    figs = read_experiment_manifest(experiments, out_dir)
    paper = Paper(
        # 示例标题：自动研究循环——实验笔记。
        title="Auto-Research Loop: Empirical Notes",
        # 占位作者：实验室机器人。
        authors=["Lab Bot"],
        # 摘要：介绍一个将结构化输出转换为 LaTeX 的小型实验框架。
        abstract="We describe a small experiment harness that emits LaTeX from structured outputs.",
        sections=[
            # 章节：引言。
            Section(id="intro", title="Introduction", cites=["smith2020"],
                    figure_refs=[]),
            # 章节：方法。
            Section(id="method", title="Method", cites=["jones2021"],
                    figure_refs=[figs[0].id]),
            # 章节：结果。
            Section(id="results", title="Results", cites=[],
                    figure_refs=[figs[1].id]),
        ],
        figures=figs,
        bibliography=[
            BibEntry(key="smith2020", entry_type="article",
                     # 虚构文献题名：论运行框架。
                     fields={"title": "On harnesses", "author": "Smith", "year": "2020"}),
            BibEntry(key="jones2021", entry_type="article",
                     # 虚构文献题名：论循环。
                     fields={"title": "On loops", "author": "Jones", "year": "2021"}),
        ],
    )
    prose = MockProseGenerator(outlines={
        # 引言提纲：说明自动研究循环的动机。
        "intro": "we motivate the auto-research loop",
        # 方法提纲：介绍先搭骨架的写作器。
        "method": "we describe the skeleton-first writer",
        # 结果提纲：展示两项消融。
        "results": "we present two ablations",
    })
    writer = PaperWriter(prose=prose)
    return writer.write(paper, out_dir)


if __name__ == "__main__":
    manifest = demo()
    print(json.dumps({
        "sections": len(manifest["sections"]),
        "figures": len(manifest["figures"]),
        "bib_keys": manifest["bibliography"],
        "tex_path": manifest["tex_path"],
    }, indent=2))
