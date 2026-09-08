"""Letta 式记忆块（Memory block），配合休眠期整合智能体。

主智能体在交互轮次中写入原始事实。休眠期智能体在轮次之间运行，
不占用关键路径（Critical path），负责整合记忆块。使用预设脚本，
因此可离线运行。
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass
class Block:
    label: str
    value: str = ""
    limit: int = 300
    description: str = ""
    version: int = 0
    history: list[str] = field(default_factory=list)

    def append(self, text: str) -> str:
        old = self.value
        self.value = (self.value + " " + text).strip() if self.value else text
        self.version += 1
        self.history.append(old)
        return f"{self.label} v{self.version} ({len(self.value)}/{self.limit})"

    def replace(self, old: str, new: str) -> str:
        if old not in self.value:
            return f"错误：{old!r} 不在 {self.label} 中"
        prev = self.value
        self.value = self.value.replace(old, new)
        self.version += 1
        self.history.append(prev)
        return f"{self.label} v{self.version} 已替换"

    def rewrite(self, new: str) -> str:
        prev = self.value
        self.value = new
        self.version += 1
        self.history.append(prev)
        return f"{self.label} v{self.version} 已重写 ({len(self.value)}/{self.limit})"

    def near_limit(self, threshold: float = 0.8) -> bool:
        return len(self.value) >= int(self.limit * threshold)


class BlockStore:
    def __init__(self) -> None:
        self._blocks: dict[str, Block] = {}

    def create(self, label: str, description: str, limit: int = 300) -> Block:
        block = Block(label=label, description=description, limit=limit)
        self._blocks[label] = block
        return block

    def get(self, label: str) -> Block | None:
        return self._blocks.get(label)

    def labels(self) -> list[str]:
        return sorted(self._blocks)

    def render(self) -> str:
        lines: list[str] = []
        for label in self.labels():
            block = self._blocks[label]
            lines.append(f"[{block.label} v{block.version} "
                         f"{len(block.value)}/{block.limit}]")
            lines.append(f"  {block.value}")
        return "\n".join(lines)


@dataclass
class ArchivalRecord:
    rid: str
    text: str
    valid: bool = True


class Archival:
    def __init__(self) -> None:
        self._records: list[ArchivalRecord] = []
        self._counter = 0

    def insert(self, text: str) -> str:
        self._counter += 1
        rid = f"a{self._counter:03d}"
        self._records.append(ArchivalRecord(rid=rid, text=text))
        return rid

    def invalidate(self, rid: str) -> bool:
        for record in self._records:
            if record.rid == rid:
                record.valid = False
                return True
        return False

    def valid_records(self) -> list[ArchivalRecord]:
        return [r for r in self._records if r.valid]

    def all_records(self) -> list[ArchivalRecord]:
        return list(self._records)


class PrimaryAgent:
    """处理交互轮次。快速写入原始事实，从不做摘要或整合。"""

    def __init__(self, blocks: BlockStore, archival: Archival) -> None:
        self.blocks = blocks
        self.archival = archival
        self.trace: list[str] = []

    def turn(self, user_text: str, writes: list[tuple[str, str, str]]) -> str:
        self.trace.append(f"用户：{user_text}")
        for kind, label_or_text, payload in writes:
            if kind == "block_append":
                block = self.blocks.get(label_or_text)
                if block is not None:
                    self.trace.append(f"  block_append -> {block.append(payload)}")
            elif kind == "archival_insert":
                rid = self.archival.insert(payload)
                self.trace.append(f"  archival_insert -> {rid}")
        response = f"回复：{user_text}"
        self.trace.append(f"助手：{response}")
        return response


class SleepTimeAgent:
    """在关键路径之外运行。对接近容量上限的记忆块做摘要，
    将被新事实否定的归档记录标为无效，不增加用户等待时间。
    """

    def __init__(self, blocks: BlockStore, archival: Archival) -> None:
        self.blocks = blocks
        self.archival = archival
        self.trace: list[str] = []

    def run(self, contradictions: list[tuple[str, str]]) -> None:
        self.trace.append("休眠期处理开始")
        for label in self.blocks.labels():
            block = self.blocks.get(label)
            if block is None:
                continue
            if block.near_limit():
                summary = _summarize(block.value, block.limit // 2)
                result = block.rewrite(summary)
                self.trace.append(f"  整合 {label}： {result}")
        for claim, reason in contradictions:
            for record in self.archival.all_records():
                if record.valid and claim.lower() in record.text.lower():
                    self.archival.invalidate(record.rid)
                    self.trace.append(
                        f"  标为无效 {record.rid} ({reason}): {record.text[:50]}..."
                    )
        self.trace.append("休眠期处理结束")


def _summarize(text: str, target_len: int) -> str:
    sentences = [s.strip() for s in text.split(".") if s.strip()]
    if not sentences:
        return text[:target_len]
    picked: list[str] = []
    total = 0
    for sentence in sentences:
        if total + len(sentence) + 1 > target_len:
            break
        picked.append(sentence)
        total += len(sentence) + 2
    return ". ".join(picked) + "."


def main() -> None:
    print("=" * 70)
    print("Letta 记忆块与休眠期计算（Sleep-time compute）——第 14 阶段，第 08 课")
    print("=" * 70)

    blocks = BlockStore()
    blocks.create("human", "关于用户的事实", limit=180)
    blocks.create("persona", "智能体的自我认知", limit=160)
    blocks.create("task", "当前任务范围", limit=220)
    archival = Archival()

    primary = PrimaryAgent(blocks, archival)
    sleep = SleepTimeAgent(blocks, archival)

    primary.turn(
        "我叫 ava，以交付智能体为业，住在 Berlin",
        [("block_append", "human", "name=ava role=ships_agents city=Berlin")],
    )
    primary.turn(
        "今天请帮我规划一套 30 课的智能体工程课程",
        [
            ("block_append", "task", "plan 30-lesson agent curriculum, target senior eng"),
            ("archival_insert", "",
             "ava prefers concise, citation-heavy writing over tutorial-style"),
        ],
    )
    primary.turn(
        "我上个月搬到了 Lisbon；请更新你的记录",
        [
            ("block_append", "human", "city=Lisbon (updated from Berlin)"),
            ("archival_insert", "",
             "ava lives in Berlin - old address, outdated"),
        ],
    )
    primary.turn(
        "另外，课程面向高级和 Staff 工程师，不是初级工程师",
        [("block_append", "task",
          "audience=senior+staff eng, cite arXiv and first-party framework docs")],
    )

    print("\n主智能体轮次（快速写入原始事实）")
    for line in primary.trace:
        print(f"  {line}")

    print("\n主智能体处理后的记忆块（整合前）")
    print(blocks.render())

    sleep.run(contradictions=[
        ("ava lives in Berlin",
         "human 记忆块中的城市已更新为 Lisbon；Berlin 的归档事实已过时"),
    ])

    print("\n休眠期轨迹")
    for line in sleep.trace:
        print(f"  {line}")

    print("\n休眠期处理后的记忆块（已整合）")
    print(blocks.render())

    print("\n归档状态")
    for record in archival.all_records():
        status = "有效   " if record.valid else "无效"
        print(f"  {record.rid} [{status}] {record.text}")

    print()
    print("关键性质：整合不会改变主智能体交互轮次的延迟。")
    print("休眠期可以运行更强但更慢的模型，因为它不占用关键路径。")


if __name__ == "__main__":
    main()
