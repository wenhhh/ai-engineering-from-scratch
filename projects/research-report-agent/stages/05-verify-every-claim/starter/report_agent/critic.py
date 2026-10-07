"""评审器在预算内逐句检查所引用片段。
支持检查基于词汇重叠及名称、数字、否定规则。执行框架决定终止状态。
配套课程：projects/research-report-agent/stages/05-verify-every-claim/docs/en.md"""

import re
from dataclasses import dataclass, replace

from report_agent.citations import cites_of, report_sentences, strip_cites
from report_agent.search import tokenize

NEGATIONS = frozenset({"not", "no", "never", "cannot", "without", "nothing"})
WORD_RE = re.compile(r"[A-Za-z0-9][A-Za-z0-9./-]*")
TERMINAL_STATES = ("completed", "needs_review", "failed")


class BudgetExceeded(RuntimeError):
    pass


@dataclass(frozen=True)
class Verdict:
    sentence: str
    cites: tuple
    score: float
    supported: bool
    reason: str


class Budget:
    def __init__(self, max_steps=50, max_tokens=20000):
        """保存各项上限，将已用计数器初始化为零。"""
        raise NotImplementedError(
            "Stage 5: implement Budget.__init__ in report_agent/critic.py"
        )

    def charge(self, step, tokens=0):
        """计入一个步骤和 `tokens` 个词元；若将超过任一上限，则先抛出 BudgetExceeded。"""
        raise NotImplementedError(
            "Stage 5: implement Budget.charge in report_agent/critic.py"
        )

    def to_dict(self):
        return {
            "max_steps": self.max_steps,
            "used_steps": self.used_steps,
            "max_tokens": self.max_tokens,
            "used_tokens": self.used_tokens,
        }


def estimate_tokens(text):
    return max(1, len(text) // 4)


def strict_terms(sentence):
    """返回来源必须包含的小写词项：带数字的词、首字母之后仍含大写字母的词，
    以及位于非首位的大写开头词。"""
    raise NotImplementedError(
        "Stage 5: implement strict_terms in report_agent/critic.py"
    )


def support_score(sentence, snippet_text):
    """返回 `snippet_text` 对 `sentence` 的支持程度 (score, reason)。
    来源缺少严格词项或否定不同时，返回 0.0；否则返回论断内容词元在来源中出现的比例，
    reason 为 overlap。"""
    raise NotImplementedError(
        "Stage 5: implement support_score in report_agent/critic.py"
    )


def snippet_text(snippet):
    return snippet if isinstance(snippet, str) else snippet.text


def review(markdown, snippets, threshold=0.6):
    """每个句子返回一个 Verdict。
    无引用或引用悬空均不受支持；否则取各引用片段的最佳 support_score，达到 threshold 即为受支持。
    原因包括 supported、uncited、dangling:...、low overlap 0.42，或 support_score 的原因。"""
    raise NotImplementedError("Stage 5: implement review in report_agent/critic.py")


def decide_state(verdicts, budget_exceeded=False):
    """预算耗尽或没有任何句子受支持时返回 failed；全部受支持时返回 completed，
    其余情况返回 needs_review。"""
    raise NotImplementedError(
        "Stage 5: implement decide_state in report_agent/critic.py"
    )


def apply_verdicts(report, verdicts):
    """返回报告副本，移除不受支持的句子、空章节，以及不再被任何保留句子引用的片段。"""
    raise NotImplementedError(
        "Stage 5: implement apply_verdicts in report_agent/critic.py"
    )
