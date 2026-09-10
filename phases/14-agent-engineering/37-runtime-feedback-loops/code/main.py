"""封装 subprocess.run：结构化采集、敏感信息脱敏、日志轮转和命令调用链。

所有示例命令都通过 run_with_feedback 执行。记录包括 argv、脱敏后的标准输出和
标准错误片段、退出码、耗时、启动时间、智能体备注，以及 command_id/parent_command_id，
以便将重试追溯到原始命令。JSONL 日志达到阈值后轮转。

译注：每次追加前检查轮转，因此活动文件可在一次追加后暂时超过 1 MiB；load_all 会读取
活动文件和保留的历史文件，并非恒定内存读取。脱敏正则及替换标记保留原值，不能保证
覆盖所有秘密格式；先截断再脱敏也可能影响跨行秘密的完整匹配。loop_can_advance 仅确认
退出码存在，不要求退出码为 0。main 会删除本课目录已有的 feedback_record.jsonl* 文件，
运行验证时应使用隔离副本。演示中的凭证样例是原文固定测试数据，不是真实秘密。

运行：python3 code/main.py
"""

from __future__ import annotations

import json
import re
import shlex
import subprocess
import time
import uuid
from dataclasses import asdict, dataclass, field
from pathlib import Path

HERE = Path(__file__).parent
RECORD = HERE / "feedback_record.jsonl"

HEAD_LINES = 5
TAIL_LINES = 30
ROTATE_BYTES = 1 * 1024 * 1024  # 1 MiB（1,048,576 字节）
MAX_ROTATIONS = 5

# 敏感信息模式：按季度根据生产环境实际观察到的泄露格式复核。
REDACTION_PATTERNS = [
    (re.compile(r"(?i)bearer\s+[A-Za-z0-9._\-]+"), "Bearer [REDACTED]"),
    (re.compile(r"(?i)\b(password|passwd|secret|api[_-]?key|access[_-]?key|token)\s*[:=]\s*\S+"),
     r"\1=[REDACTED]"),
    (re.compile(r"\bAKIA[0-9A-Z]{16}\b"), "AKIA[REDACTED]"),
    (re.compile(r"\bxox[baprs]-[A-Za-z0-9\-]+"), "xox-[REDACTED]"),
    (re.compile(r"-----BEGIN [A-Z ]+ PRIVATE KEY-----[\s\S]*?-----END [A-Z ]+ PRIVATE KEY-----"),
     "[REDACTED PRIVATE KEY]"),
]


@dataclass
class FeedbackRecord:
    command_id: str
    parent_command_id: str | None
    command: list[str]
    stdout_tail: str
    stderr_tail: str
    exit_code: int | None
    duration_ms: int
    started_at: float
    agent_note: str
    error: str | None = None
    truncations: dict[str, int] = field(default_factory=dict)
    redactions: dict[str, int] = field(default_factory=dict)


def redact(text: str) -> tuple[str, int]:
    """在追加 JSONL 之前去除敏感信息；只在读取时脱敏会让原始秘密落盘。"""
    if not text:
        return text, 0
    hits = 0
    out = text
    for pattern, replacement in REDACTION_PATTERNS:
        out, n = pattern.subn(replacement, out)
        hits += n
    return out, hits


def deterministic_tail(text: str, head: int = HEAD_LINES, tail: int = TAIL_LINES) -> tuple[str, int]:
    lines = text.splitlines()
    if len(lines) <= head + tail:
        return text, 0
    cut = len(lines) - head - tail
    return "\n".join(lines[:head] + [f"...truncated {cut} lines..."] + lines[-tail:]), cut


def _process_capture(text: str) -> tuple[str, int, int]:
    """先截断，再脱敏；返回（文本、截去行数、脱敏命中数）。"""
    tailed, cut = deterministic_tail(text)
    redacted, hits = redact(tailed)
    return redacted, cut, hits


def maybe_rotate() -> None:
    """追加前按 ROTATE_BYTES 检查轮转；保留 .1 到 .MAX，移除最旧记录。"""
    if not RECORD.exists() or RECORD.stat().st_size < ROTATE_BYTES:
        return
    for idx in range(MAX_ROTATIONS, 0, -1):
        src = RECORD.with_suffix(RECORD.suffix + (f".{idx - 1}" if idx > 1 else ""))
        if src == RECORD:
            src = RECORD
        dst = RECORD.with_suffix(RECORD.suffix + f".{idx}")
        if src.exists():
            if idx == MAX_ROTATIONS and dst.exists():
                dst.unlink()
            try:
                src.rename(dst)
            except FileNotFoundError:
                pass


def run_with_feedback(
    command: list[str],
    agent_note: str = "",
    timeout_s: float = 30.0,
    parent_command_id: str | None = None,
) -> FeedbackRecord:
    started = time.time()
    command_id = uuid.uuid4().hex[:12]
    base_kwargs = dict(
        command_id=command_id,
        parent_command_id=parent_command_id,
        command=command,
        started_at=started,
        agent_note=agent_note,
    )
    try:
        completed = subprocess.run(command, capture_output=True, text=True, timeout=timeout_s)
        out, cut_out, red_out = _process_capture(completed.stdout)
        err, cut_err, red_err = _process_capture(completed.stderr)
        record = FeedbackRecord(
            stdout_tail=out, stderr_tail=err,
            exit_code=completed.returncode,
            duration_ms=int((time.time() - started) * 1000),
            truncations={"stdout": cut_out, "stderr": cut_err},
            redactions={"stdout": red_out, "stderr": red_err},
            **base_kwargs,
        )
    except subprocess.TimeoutExpired as exc:
        partial_out = exc.stdout.decode(errors="replace") if isinstance(exc.stdout, bytes) else (exc.stdout or "")
        partial_err = exc.stderr.decode(errors="replace") if isinstance(exc.stderr, bytes) else (exc.stderr or "")
        out, cut_out, red_out = _process_capture(partial_out)
        err, cut_err, red_err = _process_capture(partial_err)
        record = FeedbackRecord(
            stdout_tail=out, stderr_tail=err,
            exit_code=None,
            duration_ms=int((time.time() - started) * 1000),
            error=f"timeout after {timeout_s}s",
            truncations={"stdout": cut_out, "stderr": cut_err},
            redactions={"stdout": red_out, "stderr": red_err},
            **base_kwargs,
        )
    except FileNotFoundError as exc:
        record = FeedbackRecord(
            stdout_tail="", stderr_tail="",
            exit_code=None,
            duration_ms=int((time.time() - started) * 1000),
            error=str(exc),
            **base_kwargs,
        )

    maybe_rotate()
    with RECORD.open("a") as fh:
        fh.write(json.dumps(asdict(record)) + "\n")
    return record


def loop_can_advance(record: FeedbackRecord) -> bool:
    """退出码缺失时，拒绝推进循环；非零但存在的退出码不在此处拦截。"""
    return record.exit_code is not None


def load_all() -> list[FeedbackRecord]:
    """读取活动日志与轮转日志，在保留范围内恢复父子命令关系。"""
    def _rotation_key(p: Path) -> int:
        suffix = p.name[len(RECORD.name):]
        if not suffix:
            return 0  # 活动文件
        try:
            return int(suffix.lstrip("."))
        except ValueError:
            return 99
    paths = sorted(HERE.glob(RECORD.name + "*"), key=_rotation_key, reverse=True)
    by_id: dict[str, FeedbackRecord] = {}
    for path in paths:
        try:
            text = path.read_text()
        except FileNotFoundError:
            continue
        for line in text.splitlines():
            if not line.strip():
                continue
            try:
                record = FeedbackRecord(**json.loads(line))
            except (json.JSONDecodeError, TypeError):
                continue
            by_id[record.command_id] = record  # 活动文件最后加载，同 ID 时以它为准
    return list(by_id.values())


def retry_chain(command_id: str) -> list[FeedbackRecord]:
    """沿 parent_command_id 指针还原重试链。"""
    records = {r.command_id: r for r in load_all()}
    chain: list[FeedbackRecord] = []
    cursor: str | None = command_id
    while cursor and cursor in records:
        chain.append(records[cursor])
        cursor = records[cursor].parent_command_id
    return list(reversed(chain))


def main() -> None:
    for path in HERE.glob("feedback_record.jsonl*"):
        path.unlink()

    ok = run_with_feedback(["python3", "-c", "print('hello')"], agent_note="预期输出 hello")
    leak = run_with_feedback(
        ["python3", "-c",
         "print('Authorization: Bearer ya29.AbCdEf'); print('password=hunter2'); print('AKIAIOSFODNN7EXAMPLE')"],
        agent_note="预期敏感信息被脱敏"
    )
    fail = run_with_feedback(["python3", "-c", "import sys; sys.exit(2)"], agent_note="首次尝试；失败后重试")
    retry = run_with_feedback(
        ["python3", "-c", "print('recovered'); import sys; sys.exit(0)"],
        agent_note="非零退出码后重试",
        parent_command_id=fail.command_id,
    )
    missing = run_with_feedback([shlex.split("does-not-exist")[0]], agent_note="检查缺失的可执行文件")

    for label, rec in (("ok", ok), ("leak", leak), ("fail", fail), ("retry", retry), ("missing", missing)):
        print(f"{label}: cid={rec.command_id} parent={rec.parent_command_id or '-'} exit={rec.exit_code} "
              f"duration_ms={rec.duration_ms} redactions={rec.redactions or '-'}")
        if rec.error:
            print(f"  错误：{rec.error}")
        if rec.stdout_tail and "REDACTED" in rec.stdout_tail:
            print(f"  脱敏后的标准输出：{rec.stdout_tail!r}")

    chain = retry_chain(retry.command_id)
    print(f"\n命令的重试链：{retry.command_id}: {[r.command_id for r in chain]} （从最早到最新）")
    print(f"{len(load_all())} 条记录已保存至 {RECORD.name}")


if __name__ == "__main__":
    main()
