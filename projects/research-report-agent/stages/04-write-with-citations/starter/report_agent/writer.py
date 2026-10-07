"""带引用写作器：仅使用检索片段组织报告章节。
采用抽取式写作，每句为来源片段加引用；后续可换用模型写作器，同时保持契约。
配套课程：projects/research-report-agent/stages/04-write-with-citations/docs/en.md"""

from dataclasses import dataclass, field

from report_agent.snippets import extract_snippets


@dataclass(frozen=True)
class CitedSentence:
    text: str
    cites: tuple

    def render(self):
        """依次返回去掉末尾标点的正文、一个空格、引用标记和句点。"""
        raise NotImplementedError(
            "Stage 4: implement CitedSentence.render in report_agent/writer.py"
        )


@dataclass
class Section:
    facet_id: str
    heading: str
    sentences: list


@dataclass
class Report:
    question: str
    sections: list
    snippets: dict = field(default_factory=dict)

    def sentence_count(self):
        return sum(len(section.sentences) for section in self.sections)


def gather_snippets(plan, index, k_docs=4, per_doc=4, per_facet=3, relative_floor=0.4):
    """为每个研究方面收集片段。
    先用完整问题检索最佳文档，再在这些文档中按方面抽取片段。跳过已被此前方面使用的区间，
    低于最高分的 relative_floor 倍时停止，每方面最多保留 per_facet 个，
    并在整份报告中重新编号为 S1、S2 等。"""
    raise NotImplementedError(
        "Stage 4: implement gather_snippets in report_agent/writer.py"
    )


def write_report(plan, snippets_by_facet, max_sentences=3):
    """构建 Report：每个有片段的方面对应一个 Section，以方面标签为标题。
    最多复制 max_sentences 个片段形成 CitedSentence，并合并连续空白。
    在 Report.snippets 中登记每个使用过的片段。"""
    raise NotImplementedError(
        "Stage 4: implement write_report in report_agent/writer.py"
    )


def to_markdown(report):
    """渲染 '# question'，随后为每个章节渲染 '## heading' 和一个段落。"""
    raise NotImplementedError(
        "Stage 4: implement to_markdown in report_agent/writer.py"
    )
