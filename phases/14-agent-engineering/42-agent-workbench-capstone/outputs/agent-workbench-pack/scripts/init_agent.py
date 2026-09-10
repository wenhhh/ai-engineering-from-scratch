#!/usr/bin/env python3
"""工作台初始化脚本。从零实现的过程见阶段 14 第 35 课。

此打包版仅保留运行时、依赖、命令、环境和状态检查，不含课程完整示例的缓存与 LKG 差异检查。
探针名称和 pass/warn/fail 判定保留英文；missing 表示缺失，all importable 表示全部可导入，
no state file yet 表示尚无状态文件。测试命令探针只检查 PATH，不运行真实测试。
"""

from __future__ import annotations

import importlib.util
import json
import os
import shutil
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
REPORT_PATH = ROOT / "init_report.json"
STATE_PATH = ROOT / "agent_state.json"
REQUIRED_PYTHON = (3, 10)
REQUIRED_DEPS: list[str] = []
TEST_COMMAND = os.environ.get("WORKBENCH_TEST_COMMAND", "python3")
REQUIRED_ENV: list[str] = []
FRESH_SECONDS = 24 * 60 * 60


def _probe_runtime() -> tuple[str, str, str]:
    major, minor = sys.version_info[:2]
    ok = (major, minor) >= REQUIRED_PYTHON
    return ("runtime", "pass" if ok else "fail", f"python {major}.{minor}")


def _probe_deps() -> tuple[str, str, str]:
    missing = [d for d in REQUIRED_DEPS if importlib.util.find_spec(d) is None]
    return ("dependencies", "fail" if missing else "pass", f"missing: {missing}" if missing else "all importable")


def _probe_test_command() -> tuple[str, str, str]:
    return ("test_command", "pass" if shutil.which(TEST_COMMAND) else "fail", f"{TEST_COMMAND} on PATH")


def _probe_env() -> tuple[str, str, str]:
    missing = [k for k in REQUIRED_ENV if not os.environ.get(k)]
    return ("env", "fail" if missing else "pass", f"missing: {missing}" if missing else "all present")


def _probe_state() -> tuple[str, str, str]:
    if not STATE_PATH.exists():
        return ("state_freshness", "warn", "no state file yet")
    age = time.time() - STATE_PATH.stat().st_mtime
    if age > FRESH_SECONDS:
        return ("state_freshness", "warn", f"state is {int(age // 3600)}h old")
    return ("state_freshness", "pass", f"state is {int(age)}s old")


def main() -> int:
    probes = [_probe_runtime(), _probe_deps(), _probe_test_command(), _probe_env(), _probe_state()]
    REPORT_PATH.write_text(
        json.dumps(
            {"timestamp": time.time(), "probes": [{"name": n, "status": s, "detail": d} for n, s, d in probes]},
            indent=2,
        )
        + "\n"
    )
    width = max(len(n) for n, _, _ in probes)
    for name, status, detail in probes:
        print(f"  {name:<{width}}  {status:>4}  {detail}")
    failed = [n for n, s, _ in probes if s == "fail"]
    if failed:
        print(f"\n初始化失败：{failed}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
