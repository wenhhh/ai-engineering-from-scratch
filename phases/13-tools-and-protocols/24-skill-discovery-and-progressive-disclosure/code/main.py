"""阶段 13，第 24 课：技能发现、作用域冲突与渐进式信息披露。

发现时只加载目录元数据；选定技能后才加载正文，随后按需加载浅层引用文件。
project（项目级）优先于 user（用户级），同级同名冲突直接报错。
本课测量目录、正文和引用的字符预算，因此用于计数的英文样本不改动，
其完整中文含义见相邻注释。JSON 字段、预算、错误字符串和路径校验规则也保留原样。
"""

from __future__ import annotations

import json
import re
import tempfile
from dataclasses import asdict, dataclass
from pathlib import Path, PurePosixPath
from typing import Iterable


FRONTMATTER_LIMIT = 8_192
NAME_PATTERN = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


@dataclass(frozen=True)
class Scope:
    name: str
    root: Path


@dataclass(frozen=True)
class SkillCandidate:
    name: str
    description: str
    scope: str
    directory: Path
    skill_path: Path


@dataclass(frozen=True)
class CatalogBudget:
    max_entries: int = 50
    max_description_chars: int = 240
    max_catalog_chars: int = 8_000


@dataclass(frozen=True)
class CatalogEntry:
    name: str
    description: str
    scope: str
    directory: str


@dataclass(frozen=True)
class Collision:
    name: str
    winner_scope: str
    shadowed_scopes: tuple[str, ...]


@dataclass(frozen=True)
class Catalog:
    entries: tuple[CatalogEntry, ...]
    collisions: tuple[Collision, ...]
    omitted: tuple[str, ...]
    catalog_chars: int
    report_chars: int

    def model_dict(self) -> dict[str, object]:
        return {"entries": [asdict(entry) for entry in self.entries]}

    def to_dict(self) -> dict[str, object]:
        return {
            "entries": [asdict(entry) for entry in self.entries],
            "collisions": [asdict(collision) for collision in self.collisions],
            "omitted": list(self.omitted),
            "catalog_chars": self.catalog_chars,
            "report_chars": self.report_chars,
        }


class DiscoveryError(ValueError):
    pass


class CollisionError(ValueError):
    pass


class ReferencePathError(ValueError):
    pass


def _frontmatter(path: Path) -> dict[str, str]:
    lines: list[str] = []
    consumed = 0
    with path.open("r", encoding="utf-8") as handle:
        for raw_line in handle:
            consumed += len(raw_line.encode("utf-8"))
            if consumed > FRONTMATTER_LIMIT:
                # 诊断：读取此文件时，文件头元数据超过允许的读取窗口。
                raise DiscoveryError(f"frontmatter window exceeded for {path}")
            lines.append(raw_line.rstrip("\r\n"))
            if len(lines) > 1 and lines[-1] == "---":
                break
    if not lines or lines[0] != "---" or lines[-1] != "---":
        # 诊断：此文件的文件头元数据分隔符无效。
        raise DiscoveryError(f"invalid frontmatter delimiters in {path}")
    end = len(lines) - 1
    fields: dict[str, str] = {}
    index = 1
    while index < end:
        line = lines[index]
        if not line.strip() or line.lstrip().startswith("#"):
            index += 1
            continue
        if line[:1].isspace() or ":" not in line:
            # 诊断：指定顶层行格式不正确。
            raise DiscoveryError(f"malformed top-level line {index + 1} in {path}")
        key, value = line.split(":", 1)
        key = key.strip()
        if not re.fullmatch(r"[A-Za-z][A-Za-z0-9-]*", key):
            # 诊断：文件头元数据字段名无效。
            raise DiscoveryError(f"invalid frontmatter field {key!r} in {path}")
        if key in fields:
            # 诊断：文件头元数据字段重复。
            raise DiscoveryError(f"duplicate frontmatter field {key!r} in {path}")
        value = value.strip()
        if key == "metadata" and not value:
            nested: dict[str, str] = {}
            index += 1
            while index < end and (not lines[index] or lines[index][:1].isspace()):
                nested_line = lines[index].strip()
                if nested_line:
                    if ":" not in nested_line:
                        raise DiscoveryError(
                            # 诊断：指定 metadata 行格式不正确。
                            f"malformed metadata line {index + 1} in {path}"
                        )
                    nested_key, nested_value = nested_line.split(":", 1)
                    nested_key = nested_key.strip()
                    if (
                        not re.fullmatch(r"[A-Za-z][A-Za-z0-9-]*", nested_key)
                        or nested_key in nested
                    ):
                        raise DiscoveryError(
                            # 诊断：metadata 字段无效或重复。
                            f"invalid metadata field {nested_key!r} in {path}"
                        )
                    nested[nested_key] = nested_value.strip().strip("\"'")
                index += 1
            fields[key] = json.dumps(nested, sort_keys=True)
            continue
        if value in {">", "|"}:
            block: list[str] = []
            index += 1
            while index < end and (not lines[index] or lines[index][:1].isspace()):
                block.append(lines[index].lstrip())
                index += 1
            fields[key] = (" " if value == ">" else "\n").join(block).strip()
            continue
        fields[key] = value.strip("\"'")
        index += 1
    if not fields.get("name") or not fields.get("description"):
        # 诊断：此文件必须包含 name 和 description。
        raise DiscoveryError(f"name and description are required in {path}")
    return fields


def discover_scope(scope: Scope) -> tuple[SkillCandidate, ...]:
    """只读取直接子目录中的文件头元数据，暂不加载指令正文。"""
    if not scope.root.exists():
        return ()
    candidates: list[SkillCandidate] = []
    for directory in sorted(scope.root.iterdir(), key=lambda item: item.name):
        skill_path = directory / "SKILL.md"
        if not directory.is_dir() or directory.is_symlink():
            continue
        if skill_path.is_symlink():
            # 诊断：不允许 SKILL.md 是符号链接。
            raise DiscoveryError(f"symlinked SKILL.md is not allowed: {skill_path}")
        if not skill_path.is_file():
            continue
        fields = _frontmatter(skill_path)
        if len(fields["name"]) > 64 or not NAME_PATTERN.fullmatch(fields["name"]):
            raise DiscoveryError(
                # 诊断：name 不是符合可移植要求的小写连字符命名。
                f"frontmatter name {fields['name']!r} is not valid portable kebab-case"
            )
        if len(fields["description"]) > 1024:
            # 诊断：此文件的 description 超过 1024 个字符。
            raise DiscoveryError(f"description exceeds 1024 characters in {skill_path}")
        if fields["name"] != directory.name:
            raise DiscoveryError(
                # 诊断：文件头中的 name 与目录名不一致。
                f"frontmatter name {fields['name']!r} does not match directory {directory.name!r}"
            )
        candidates.append(
            SkillCandidate(
                name=fields["name"],
                description=fields["description"],
                scope=scope.name,
                directory=directory.resolve(),
                skill_path=skill_path.resolve(),
            )
        )
    return tuple(candidates)


def resolve_collisions(
    candidates: Iterable[SkillCandidate], precedence: tuple[str, ...]
) -> tuple[tuple[SkillCandidate, ...], tuple[Collision, ...]]:
    """按调用方提供的作用域顺序处理，优先级从高到低。"""
    rank = {scope: index for index, scope in enumerate(precedence)}
    grouped: dict[str, list[SkillCandidate]] = {}
    for candidate in candidates:
        if candidate.scope not in rank:
            # 诊断：宿主策略未定义此作用域。
            raise CollisionError(f"scope {candidate.scope!r} is missing from host policy")
        grouped.setdefault(candidate.name, []).append(candidate)

    winners: list[SkillCandidate] = []
    collisions: list[Collision] = []
    for name in sorted(grouped):
        options = sorted(
            grouped[name], key=lambda item: (rank[item.scope], str(item.directory))
        )
        top_rank = rank[options[0].scope]
        tied = [option for option in options if rank[option.scope] == top_rank]
        if len(tied) > 1:
            paths = ", ".join(str(option.directory) for option in tied)
            # 诊断：同名技能的最高优先级出现并列，无法唯一选择。
            raise CollisionError(f"ambiguous {name!r} at equal precedence: {paths}")
        winners.append(options[0])
        if len(options) > 1:
            collisions.append(
                Collision(
                    name=name,
                    winner_scope=options[0].scope,
                    shadowed_scopes=tuple(option.scope for option in options[1:]),
                )
            )
    return tuple(winners), tuple(collisions)


def _shorten(text: str, limit: int) -> str:
    if limit < 1:
        return ""
    if len(text) <= limit:
        return text
    if limit == 1:
        return "…"
    return text[: limit - 1].rstrip() + "…"


def build_catalog(
    candidates: Iterable[SkillCandidate],
    precedence: tuple[str, ...],
    budget: CatalogBudget,
) -> Catalog:
    if min(budget.max_entries, budget.max_description_chars, budget.max_catalog_chars) < 1:
        # 诊断：所有目录预算都必须大于零。
        raise ValueError("catalog budgets must be positive")
    winners, collisions = resolve_collisions(candidates, precedence)
    rank = {scope: index for index, scope in enumerate(precedence)}
    ordered = sorted(winners, key=lambda item: (rank[item.scope], item.name))
    entries = [
        CatalogEntry(
            name=candidate.name,
            description=_shorten(candidate.description, budget.max_description_chars),
            scope=candidate.scope,
            directory=str(candidate.directory),
        )
        for candidate in ordered[: budget.max_entries]
    ]
    omitted = [candidate.name for candidate in ordered[budget.max_entries :]]

    def model_size(current_entries: list[CatalogEntry]) -> int:
        payload = {"entries": [asdict(entry) for entry in current_entries]}
        return len(json.dumps(payload, sort_keys=True, separators=(",", ":")))

    used = model_size(entries)
    while used > budget.max_catalog_chars and entries:
        removed = entries.pop()
        omitted.insert(0, removed.name)
        used = model_size(entries)
    if used > budget.max_catalog_chars:
        # 诊断：提供给模型的目录超过 max_catalog_chars 上限。
        raise ValueError("model-facing catalog exceeds max_catalog_chars")

    report_chars = 0
    while True:
        report = Catalog(
            tuple(entries), collisions, tuple(omitted), used, report_chars
        )
        measured = len(
            json.dumps(report.to_dict(), sort_keys=True, separators=(",", ":"))
        )
        if measured == report_chars:
            return report
        report_chars = measured


def _candidate_for(entry: CatalogEntry, candidates: Iterable[SkillCandidate]) -> SkillCandidate:
    for candidate in candidates:
        if candidate.name == entry.name and str(candidate.directory) == entry.directory:
            return candidate
    # 诊断：目录条目找不到匹配的候选技能。
    raise KeyError(f"catalog entry {entry.name!r} has no matching candidate")


def load_skill_body(
    entry: CatalogEntry,
    candidates: Iterable[SkillCandidate],
    max_chars: int = 12_000,
) -> str:
    candidate = _candidate_for(entry, candidates)
    text = candidate.skill_path.read_text(encoding="utf-8")
    lines = text.splitlines()
    end = lines.index("---", 1)
    body = "\n".join(lines[end + 1 :]).strip()
    if len(body) > max_chars:
        # 诊断：技能正文超过给定字符数上限。
        raise DiscoveryError(f"skill body exceeds {max_chars} characters")
    return body


def validate_reference(skill_directory: Path, reference: str) -> Path:
    """只允许当前目录下的文件或一层子目录中的文件，禁止路径穿越和更深的引用链。"""
    if not isinstance(reference, str):
        # 诊断：引用必须是字符串。
        raise ReferencePathError("reference must be a string")
    if "\\" in reference:
        # 诊断：引用路径必须使用可移植的正斜杠。
        raise ReferencePathError("references must use portable forward slashes")
    relative = PurePosixPath(reference)
    if relative.is_absolute() or any(part in {"", ".", ".."} for part in relative.parts):
        # 诊断：引用必须是不含路径穿越成分的规范相对路径。
        raise ReferencePathError("reference must be a clean relative path")
    if len(relative.parts) > 2:
        # 诊断：引用路径最多只能包含一层子目录。
        raise ReferencePathError("reference may be at most one directory deep")
    root = skill_directory.resolve()
    unresolved = root
    for part in relative.parts:
        unresolved = unresolved / part
        if unresolved.is_symlink():
            # 诊断：引用路径不能包含符号链接。
            raise ReferencePathError("reference path cannot contain symlinks")
    target = unresolved.resolve()
    if target == root or root not in target.parents:
        # 诊断：引用越出了技能目录。
        raise ReferencePathError("reference escapes the skill directory")
    if not target.is_file():
        # 诊断：引用必须解析为普通文件。
        raise ReferencePathError("reference must resolve to a regular file")
    return target


def load_reference(
    entry: CatalogEntry,
    reference: str,
    max_chars: int = 12_000,
) -> str:
    target = validate_reference(Path(entry.directory), reference)
    content = target.read_text(encoding="utf-8")
    if len(content) > max_chars:
        # 诊断：引用文件内容超过给定字符数上限。
        raise ReferencePathError(f"reference exceeds {max_chars} characters")
    return content


def _write_skill(root: Path, name: str, description: str, body: str) -> None:
    directory = root / name
    (directory / "references").mkdir(parents=True)
    (directory / "SKILL.md").write_text(
        f"---\nname: {name}\ndescription: {description}\n---\n\n{body}\n",
        encoding="utf-8",
    )
    (directory / "references" / "format.md").write_text(
        # 被计数的引用夹具：标题为“格式”；返回包含 evidence 数组的 JSON。
        "# Format\n\nReturn JSON with an evidence array.\n", encoding="utf-8"
    )


def demo() -> None:
    with tempfile.TemporaryDirectory(prefix="lesson-24-") as temp_dir:
        base = Path(temp_dir)
        user_root = base / "user"
        project_root = base / "project"
        _write_skill(
            user_root,
            "evidence-report",
            # 被计数的技能描述：当发现需要引用支持时，生成通用证据报告。
            "Create a general evidence report when findings need citations.",
            # 被计数的正文：标题为“证据报告”；组织输出格式时读取 references/format.md。
            "# Evidence report\n\nRead `references/format.md` when formatting the result.",
        )
        _write_skill(
            project_root,
            "evidence-report",
            # 被计数的项目级描述：审计完成时生成本项目的证据报告。
            "Create this project's evidence report when an audit completes.",
            # 被计数的项目级正文：标题为“项目证据报告”；读取 references/format.md 了解结构定义。
            "# Project evidence report\n\nRead `references/format.md` for the schema.",
        )
        _write_skill(
            user_root,
            "meeting-brief",
            # 被计数的技能描述：根据提供的记录准备会议简报。
            "Prepare a meeting brief from supplied notes.",
            # 被计数的正文：标题为“会议简报”；将已作出的决策与待解决问题分开。
            "# Meeting brief\n\nSeparate decisions from open questions.",
        )
        candidates = (
            *discover_scope(Scope("project", project_root)),
            *discover_scope(Scope("user", user_root)),
        )
        catalog = build_catalog(
            candidates,
            precedence=("project", "user"),
            budget=CatalogBudget(max_entries=10, max_catalog_chars=2_000),
        )
        selected = next(entry for entry in catalog.entries if entry.name == "evidence-report")
        body = load_skill_body(selected, candidates)
        reference = load_reference(selected, "references/format.md")
        result = {
            "catalog": catalog.to_dict(),
            "disclosure": {
                "level_1_catalog_chars": catalog.catalog_chars,
                "level_2_body_chars": len(body),
                "level_3_reference_chars": len(reference),
            },
        }
    print(json.dumps(result, indent=2, sort_keys=True))


if __name__ == "__main__":
    demo()
