"""确定性的智能体初始化检查脚本。

检查运行时、依赖、测试命令、环境变量、状态新鲜度、相对于最近已知良好版本的差异，
以及单项检查耗时；写入 init_report.json，支持使用 prereqs.lock 的有效期跳过检查，
当有检查返回 fail 时以非零退出码结束。

译注：测试命令检查只确认 python3 可从 PATH 找到，不会运行测试。
缓存命中时会跳过全部探针；指纹未覆盖状态文件、Git 差异或所有运行环境变化，
因此“缓存新鲜”不等于这些条件已经重新验证。LKG 为 last-known-good，即最近已知良好版本。
探针名称、pass/warn/fail 状态及诊断字符串保留英文；missing 表示缺失，
skipped 表示跳过，state is ... old 表示状态文件距今的时间，files changed 表示变化文件数。

运行：python3 code/main.py
"""

from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
import os
import re
import shutil
import subprocess
import sys
import time
from dataclasses import asdict, dataclass
from pathlib import Path

HERE = Path(__file__).parent
WORK = HERE / "workdir"
STATE_PATH = WORK / "agent_state.json"
REPORT_PATH = WORK / "init_report.json"
LOCK_PATH = WORK / "prereqs.lock"
LKG_PATH = WORK / "last_known_good.json"

REQUIRED_PYTHON = (3, 10)
REQUIRED_DEPS = ["json", "dataclasses"]
REQUIRED_TEST_COMMAND = "python3"
REQUIRED_ENV_VARS: list[str] = []
STATE_FRESHNESS_SECONDS = 24 * 60 * 60
LOCK_TTL_SECONDS = 24 * 60 * 60
PROBE_BUDGET_SECONDS = 3.0
LKG_FILE_DIFF_BUDGET = 50


SHA_PATTERN = re.compile(r"^[0-9a-fA-F]{7,40}$")


@dataclass
class Probe:
    name: str
    status: str
    detail: str
    duration_ms: int = 0


def _timed(probe_fn):
    def _wrap(*a, **kw) -> Probe:
        started = time.time()
        result = probe_fn(*a, **kw)
        result.duration_ms = int((time.time() - started) * 1000)
        if result.duration_ms > PROBE_BUDGET_SECONDS * 1000 and result.status == "pass":
            result.status = "warn"
            result.detail = f"{result.detail} (slow: {result.duration_ms}ms > {int(PROBE_BUDGET_SECONDS * 1000)}ms)"
        return result
    return _wrap


@_timed
def probe_runtime() -> Probe:
    major, minor = sys.version_info[:2]
    if (major, minor) >= REQUIRED_PYTHON:
        return Probe("runtime", "pass", f"python {major}.{minor}")
    return Probe("runtime", "fail", f"need >= {REQUIRED_PYTHON}, have {major}.{minor}")


@_timed
def probe_dependencies() -> Probe:
    missing = [dep for dep in REQUIRED_DEPS if importlib.util.find_spec(dep) is None]
    if missing:
        return Probe("dependencies", "fail", f"missing: {missing}")
    return Probe("dependencies", "pass", f"all of {REQUIRED_DEPS} importable")


@_timed
def probe_test_command() -> Probe:
    if shutil.which(REQUIRED_TEST_COMMAND):
        return Probe("test_command", "pass", f"{REQUIRED_TEST_COMMAND} resolvable on PATH")
    return Probe("test_command", "fail", f"{REQUIRED_TEST_COMMAND} not on PATH")


@_timed
def probe_env() -> Probe:
    missing = [k for k in REQUIRED_ENV_VARS if not os.environ.get(k)]
    if missing:
        return Probe("env", "fail", f"missing env vars: {missing}")
    return Probe("env", "pass", f"all of {REQUIRED_ENV_VARS or '[]'} present")


@_timed
def probe_state_freshness() -> Probe:
    if not STATE_PATH.exists():
        return Probe("state_freshness", "warn", "no state file yet; first run")
    age = time.time() - STATE_PATH.stat().st_mtime
    if age > STATE_FRESHNESS_SECONDS:
        hours = int(age // 3600)
        return Probe("state_freshness", "warn", f"state is {hours}h old; confirm before continuing")
    return Probe("state_freshness", "pass", f"state is {int(age)}s old")


@_timed
def probe_lkg_diff() -> Probe:
    """相对于最近已知良好版本的差异超出文件数预算时，拒绝启动。

    每个会话都对照同一基线，避免通过不断移动基线掩盖累计偏移。
    """
    if not LKG_PATH.exists():
        return Probe("lkg_diff", "warn", "no last_known_good.json; pin one after first successful merge")
    try:
        lkg = json.loads(LKG_PATH.read_text())
        baseline = lkg.get("commit")
        if not baseline:
            return Probe("lkg_diff", "warn", "lkg file present but commit field empty")
    except json.JSONDecodeError as exc:
        return Probe("lkg_diff", "fail", f"lkg file unreadable: {exc}")
    if not isinstance(baseline, str) or not SHA_PATTERN.match(baseline):
        return Probe("lkg_diff", "warn", "lkg commit invalid; skipped")
    try:
        out = subprocess.run(
            ["git", "diff", "--name-only", baseline, "HEAD"],
            capture_output=True, text=True, timeout=2.0, cwd=HERE,
        )
    except (FileNotFoundError, subprocess.TimeoutExpired):
        return Probe("lkg_diff", "warn", "git unavailable or slow; skipped")
    if out.returncode != 0:
        return Probe("lkg_diff", "warn", f"git diff failed: {out.stderr.strip()[:60]}")
    changed = [ln for ln in out.stdout.splitlines() if ln.strip()]
    if len(changed) > LKG_FILE_DIFF_BUDGET:
        return Probe("lkg_diff", "fail", f"{len(changed)} files changed since {baseline[:7]} (budget {LKG_FILE_DIFF_BUDGET})")
    return Probe("lkg_diff", "pass", f"{len(changed)} files changed since {baseline[:7]}")


def _deps_fingerprint() -> str:
    h = hashlib.sha256()
    h.update(str(sorted(REQUIRED_DEPS)).encode())
    h.update(REQUIRED_TEST_COMMAND.encode())
    h.update(str(sorted(REQUIRED_ENV_VARS)).encode())
    h.update(str(REQUIRED_PYTHON).encode())
    return h.hexdigest()[:16]


def lock_is_fresh() -> bool:
    """缓存模式：在指纹未变且有效期未过时复用先前检查结果。

    类似 Docker 层缓存：幂等检查与内容哈希共同决定是否跳过。
    此处指纹只覆盖代码列出的依赖与配置，不覆盖所有会影响探针结果的状态。
    """
    if not LOCK_PATH.exists():
        return False
    try:
        lock = json.loads(LOCK_PATH.read_text())
    except json.JSONDecodeError:
        return False
    if not isinstance(lock, dict) or lock.get("fingerprint") != _deps_fingerprint():
        return False
    written_at = lock.get("written_at", 0)
    if not isinstance(written_at, (int, float)):
        try:
            written_at = float(written_at)
        except (TypeError, ValueError):
            return False
    age = time.time() - written_at
    return age < LOCK_TTL_SECONDS


def write_lock() -> None:
    LOCK_PATH.write_text(
        json.dumps({"fingerprint": _deps_fingerprint(), "written_at": time.time()}, indent=2) + "\n"
    )


def run_probes() -> list[Probe]:
    return [
        probe_runtime(),
        probe_dependencies(),
        probe_test_command(),
        probe_env(),
        probe_state_freshness(),
        probe_lkg_diff(),
    ]


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--no-cache", action="store_true", help="忽略 prereqs.lock，运行全部检查")
    ap.add_argument("--write-lkg", action="store_true", help="将当前 HEAD 固定为最近已知良好版本")
    args = ap.parse_args(argv)

    WORK.mkdir(exist_ok=True)

    if args.write_lkg:
        try:
            head = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=HERE, text=True, timeout=2.0).strip()
            LKG_PATH.write_text(json.dumps({"commit": head, "written_at": time.time()}, indent=2) + "\n")
            print(f"已固定 LKG -> {head[:7]}")
            return 0
        except (FileNotFoundError, subprocess.CalledProcessError) as exc:
            print(f"固定 LKG 失败：{exc}", file=sys.stderr)
            return 1

    if not args.no_cache and lock_is_fresh():
        print(f"prereqs.lock 仍在有效期内（TTL {LOCK_TTL_SECONDS} 秒）；跳过检查")
        return 0

    probes = run_probes()
    report = {
        "timestamp": time.time(),
        "probes": [asdict(p) for p in probes],
        "ok": all(p.status != "fail" for p in probes),
    }
    REPORT_PATH.write_text(json.dumps(report, indent=2) + "\n")

    width = max(len(p.name) for p in probes)
    for p in probes:
        print(f"  {p.name:<{width}}  {p.status:>4}  {p.duration_ms:>4}ms  {p.detail}")

    if not report["ok"]:
        print("\n初始化失败；拒绝启动智能体", file=sys.stderr)
        return 1
    write_lock()
    print("\n初始化检查通过（已更新缓存锁文件）")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
