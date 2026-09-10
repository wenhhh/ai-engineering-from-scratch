"""
智能体评测框架：任务夹具、多次采样评分与 pass@k。

参见：../docs/en.md（本课中文说明，沿用原文件名）；英文原文在包内 english-source/ 的对应路径。
概念参考：
  - 本例使用 pass@k = 1 - (1 - p)^k，p 为样本中的经验通过率。
  - 确定性验证器：file_equals、regex_match、shell_exit_zero。
文件末尾用参考候选方案运行随附夹具，再检查空操作候选方案的失败结果。

译注：pass@k 的上述代入公式假设独立同分布采样，不是基于有限样本的无偏
组合估计。参考候选直接复制已知答案，不证明智能体能自主修复代码；文件相等
或正则命中也不等于功能测试通过。shell_exit_zero 确实启动子进程，但未接入
第 26 课运行器。只使用可信的本地夹具；本模块未实现完整路径隔离。
"""

from __future__ import annotations

import json
import os
import re
import shutil
import statistics
import subprocess
import sys
import tempfile
import time
from dataclasses import dataclass, field
from typing import Any, Callable


# ---------------------------------------------------------------------------
# 数据类
# ---------------------------------------------------------------------------


@dataclass
class FixtureTask:
    """单个评测任务。"""

    id: str
    goal: str
    setup_dir: str
    expected_dir: str
    verifier_name: str
    verifier_args: dict[str, Any]
    root: str = ""

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "goal": self.goal,
            "verifier": self.verifier_name,
        }


@dataclass
class SampleResult:
    """候选方案在某个任务上的一次执行。"""

    task_id: str
    sample_index: int
    latency_ms: float
    cost_units: float = 0.0
    notes: str = ""

    def to_dict(self) -> dict:
        return {
            "task_id": self.task_id,
            "sample_index": self.sample_index,
            "latency_ms": round(self.latency_ms, 3),
            "cost_units": self.cost_units,
            "notes": self.notes,
        }


@dataclass
class VerificationOutcome:
    """验证器对单个样本的判定。"""

    passed: bool
    detail: str


@dataclass
class TaskReport:
    task_id: str
    k: int
    passes: int
    pass_rate: float
    pass_at_k: float
    mean_latency_ms: float
    p95_latency_ms: float
    mean_cost: float
    samples: list[dict] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "task_id": self.task_id,
            "k": self.k,
            "passes": self.passes,
            "pass_rate": round(self.pass_rate, 4),
            "pass_at_k": round(self.pass_at_k, 4),
            "mean_latency_ms": round(self.mean_latency_ms, 3),
            "p95_latency_ms": round(self.p95_latency_ms, 3),
            "mean_cost": round(self.mean_cost, 4),
            "samples": self.samples,
        }


@dataclass
class EvalReport:
    task_reports: list[TaskReport]
    pass_at_1: float
    pass_at_k: float
    k: int
    mean_latency_ms: float
    p95_latency_ms: float
    total_cost: float

    def to_dict(self) -> dict:
        return {
            "k": self.k,
            "pass_at_1": round(self.pass_at_1, 4),
            "pass_at_k": round(self.pass_at_k, 4),
            "mean_latency_ms": round(self.mean_latency_ms, 3),
            "p95_latency_ms": round(self.p95_latency_ms, 3),
            "total_cost": round(self.total_cost, 4),
            "tasks": [t.to_dict() for t in self.task_reports],
        }


# ---------------------------------------------------------------------------
# pass@k 计算
# ---------------------------------------------------------------------------


def pass_at_k(empirical_pass_rate: float, k: int) -> float:
    """假设单次通过概率为给定经验值，计算 k 次独立采样中至少成功一次的概率。"""

    if k <= 0:
        return 0.0
    p = max(0.0, min(1.0, empirical_pass_rate))
    return 1.0 - (1.0 - p) ** k


def p95(values: list[float]) -> float:
    """估计样本的第 95 百分位；实际使用 round(0.95*n)-1 索引，而非一律向上取整。"""

    if not values:
        return 0.0
    sorted_values = sorted(values)
    idx = max(0, int(round(0.95 * len(sorted_values))) - 1)
    return sorted_values[min(idx, len(sorted_values) - 1)]


# ---------------------------------------------------------------------------
# 验证器
# ---------------------------------------------------------------------------


Verifier = Callable[[FixtureTask, str, dict[str, Any]], VerificationOutcome]


def verify_file_equals(
    task: FixtureTask, scratch_dir: str, args: dict[str, Any]
) -> VerificationOutcome:
    """比较 scratch_dir 中的文件与 expected_dir 中的对应文件。"""

    rel = args.get("path")
    if not isinstance(rel, str):
        return VerificationOutcome(False, "verifier args missing 'path'")
    actual = os.path.join(scratch_dir, rel)
    expected = os.path.join(task.expected_dir, rel)
    if not os.path.isfile(actual):
        return VerificationOutcome(False, f"scratch file missing: {rel}")
    if not os.path.isfile(expected):
        return VerificationOutcome(False, f"expected file missing: {rel}")
    with open(actual, "r", encoding="utf-8") as fh:
        actual_text = fh.read()
    with open(expected, "r", encoding="utf-8") as fh:
        expected_text = fh.read()
    normalize = bool(args.get("normalize_trailing_newline", True))
    if normalize:
        actual_text = actual_text.rstrip("\n") + "\n"
        expected_text = expected_text.rstrip("\n") + "\n"
    if actual_text == expected_text:
        return VerificationOutcome(True, f"file {rel!r} matches expected")
    return VerificationOutcome(False, f"file {rel!r} differs from expected")


def verify_regex_match(
    task: FixtureTask, scratch_dir: str, args: dict[str, Any]
) -> VerificationOutcome:
    """在 scratch_dir 的文件内容中匹配正则表达式。"""

    rel = args.get("path")
    pattern = args.get("pattern")
    if not isinstance(rel, str) or not isinstance(pattern, str):
        return VerificationOutcome(False, "verifier args need 'path' and 'pattern'")
    actual = os.path.join(scratch_dir, rel)
    if not os.path.isfile(actual):
        return VerificationOutcome(False, f"scratch file missing: {rel}")
    with open(actual, "r", encoding="utf-8") as fh:
        text = fh.read()
    if re.search(pattern, text, re.MULTILINE):
        return VerificationOutcome(True, f"file {rel!r} matched {pattern!r}")
    return VerificationOutcome(False, f"file {rel!r} did not match {pattern!r}")


def verify_shell_exit_zero(
    task: FixtureTask, scratch_dir: str, args: dict[str, Any]
) -> VerificationOutcome:
    """在 scratch_dir 中运行命令，退出码为零则通过。

    当前直接调用 subprocess，并未启用 shell=True，也未接入第 26 课
    的拒绝列表运行器。命令来自验证器配置；这里仅用于可信的自测夹具。
    实际使用时需要另行设计足够的执行隔离，不能把工作目录视为安全边界。
    """

    argv = args.get("argv")
    if not isinstance(argv, list) or not argv:
        return VerificationOutcome(False, "verifier args need 'argv' list")
    timeout = float(args.get("timeout_seconds", 10.0))
    try:
        proc = subprocess.run(
            list(argv),
            cwd=scratch_dir,
            capture_output=True,
            timeout=timeout,
            check=False,
        )
    except subprocess.TimeoutExpired:
        # 验证失败：命令超时。
        return VerificationOutcome(False, "shell command timed out")
    except FileNotFoundError as exc:
        return VerificationOutcome(False, f"shell command not found: {exc}")
    if proc.returncode == 0:
        # 验证结果：命令退出码为零。
        return VerificationOutcome(True, "command exited zero")
    return VerificationOutcome(False, f"command exited {proc.returncode}")


VERIFIER_REGISTRY: dict[str, Verifier] = {
    "file_equals": verify_file_equals,
    "regex_match": verify_regex_match,
    "shell_exit_zero": verify_shell_exit_zero,
}


# ---------------------------------------------------------------------------
# 加载任务夹具
# ---------------------------------------------------------------------------


def load_fixture(task_dir: str) -> FixtureTask:
    """从目录加载任务夹具。

    预期目录结构：
        <task_dir>/task.json
        <task_dir>/buggy/...
        <task_dir>/expected/...（file_equals 验证器需要此目录）
    """

    spec_path = os.path.join(task_dir, "task.json")
    with open(spec_path, "r", encoding="utf-8") as fh:
        spec = json.load(fh)
    setup = os.path.join(task_dir, "buggy")
    expected = os.path.join(task_dir, "expected")
    return FixtureTask(
        id=spec["id"],
        goal=spec["goal"],
        setup_dir=setup,
        expected_dir=expected,
        verifier_name=spec["verifier"]["name"],
        verifier_args=spec["verifier"].get("args", {}),
        root=task_dir,
    )


def load_all_fixtures(tasks_root: str) -> list[FixtureTask]:
    tasks: list[FixtureTask] = []
    for name in sorted(os.listdir(tasks_root)):
        full = os.path.join(tasks_root, name)
        if os.path.isdir(full) and os.path.isfile(os.path.join(full, "task.json")):
            tasks.append(load_fixture(full))
    return tasks


# ---------------------------------------------------------------------------
# 候选方案协议
# ---------------------------------------------------------------------------


Candidate = Callable[[FixtureTask, str], SampleResult]


def apply_known_fixes(task: FixtureTask, scratch_dir: str) -> SampleResult:
    """参考候选方案：用预期文件覆盖有缺陷的文件。

    用于评测框架自身的测试；真正的候选方案应接入大语言模型智能体。
    """

    start = time.perf_counter()
    if os.path.isdir(task.expected_dir):
        for dirpath, _dirs, files in os.walk(task.expected_dir):
            rel = os.path.relpath(dirpath, task.expected_dir)
            dst_root = scratch_dir if rel == "." else os.path.join(scratch_dir, rel)
            os.makedirs(dst_root, exist_ok=True)
            for filename in files:
                shutil.copy2(
                    os.path.join(dirpath, filename),
                    os.path.join(dst_root, filename),
                )
    elapsed = (time.perf_counter() - start) * 1000.0
    return SampleResult(
        task_id=task.id,
        sample_index=0,
        latency_ms=elapsed,
        cost_units=1.0,
        # 结果备注：参考候选方案。
        notes="reference candidate",
    )


def noop_candidate(task: FixtureTask, scratch_dir: str) -> SampleResult:
    """不做任何修改的候选方案，用于确认评测框架会记录失败。"""

    start = time.perf_counter()
    elapsed = (time.perf_counter() - start) * 1000.0
    return SampleResult(
        task_id=task.id,
        sample_index=0,
        latency_ms=elapsed,
        cost_units=0.0,
        # 结果备注：空操作候选方案。
        notes="noop",
    )


# ---------------------------------------------------------------------------
# 评测框架
# ---------------------------------------------------------------------------


@dataclass
class EvalHarness:
    """让候选方案处理各个夹具，并汇总评测结果。"""

    tasks: list[FixtureTask]
    k: int = 1
    verifier_registry: dict[str, Verifier] = field(
        default_factory=lambda: dict(VERIFIER_REGISTRY)
    )

    def _verify(
        self, task: FixtureTask, scratch_dir: str
    ) -> VerificationOutcome:
        verifier = self.verifier_registry.get(task.verifier_name)
        if verifier is None:
            return VerificationOutcome(
                False, f"unknown verifier {task.verifier_name!r}"
            )
        return verifier(task, scratch_dir, task.verifier_args)

    def _prepare_scratch(self, task: FixtureTask) -> str:
        scratch = tempfile.mkdtemp(prefix=f"eval-{task.id}-")
        if os.path.isdir(task.setup_dir):
            for dirpath, _dirs, files in os.walk(task.setup_dir):
                rel = os.path.relpath(dirpath, task.setup_dir)
                dst_root = scratch if rel == "." else os.path.join(scratch, rel)
                os.makedirs(dst_root, exist_ok=True)
                for filename in files:
                    shutil.copy2(
                        os.path.join(dirpath, filename),
                        os.path.join(dst_root, filename),
                    )
        return scratch

    def run(self, candidate: Candidate) -> EvalReport:
        task_reports: list[TaskReport] = []
        for task in self.tasks:
            samples: list[dict] = []
            latencies: list[float] = []
            costs: list[float] = []
            passes = 0
            for sample_index in range(self.k):
                scratch = self._prepare_scratch(task)
                try:
                    sample = candidate(task, scratch)
                    outcome = self._verify(task, scratch)
                    latencies.append(sample.latency_ms)
                    costs.append(sample.cost_units)
                    if outcome.passed:
                        passes += 1
                    samples.append(
                        {
                            "sample_index": sample_index,
                            "latency_ms": round(sample.latency_ms, 3),
                            "cost_units": sample.cost_units,
                            "passed": outcome.passed,
                            "detail": outcome.detail,
                            "notes": sample.notes,
                        }
                    )
                finally:
                    shutil.rmtree(scratch, ignore_errors=True)
            pass_rate = passes / self.k if self.k else 0.0
            task_reports.append(
                TaskReport(
                    task_id=task.id,
                    k=self.k,
                    passes=passes,
                    pass_rate=pass_rate,
                    pass_at_k=pass_at_k(pass_rate, self.k),
                    mean_latency_ms=statistics.mean(latencies) if latencies else 0.0,
                    p95_latency_ms=p95(latencies),
                    mean_cost=statistics.mean(costs) if costs else 0.0,
                    samples=samples,
                )
            )

        per_sample_pass_at_1 = [
            (1.0 if r.passes > 0 else 0.0)
            if r.k == 1
            else min(1.0, r.pass_rate)
            for r in task_reports
        ]
        pass_at_1_value = (
            statistics.mean(per_sample_pass_at_1) if per_sample_pass_at_1 else 0.0
        )
        pass_at_k_value = (
            statistics.mean([r.pass_at_k for r in task_reports])
            if task_reports
            else 0.0
        )
        all_latencies = [
            float(s["latency_ms"])
            for r in task_reports
            for s in r.samples
        ]
        total_cost = sum(
            float(s["cost_units"]) for r in task_reports for s in r.samples
        )
        return EvalReport(
            task_reports=task_reports,
            pass_at_1=pass_at_1_value,
            pass_at_k=pass_at_k_value,
            k=self.k,
            mean_latency_ms=(
                statistics.mean(all_latencies) if all_latencies else 0.0
            ),
            p95_latency_ms=p95(all_latencies),
            total_cost=total_cost,
        )


# ---------------------------------------------------------------------------
# 演示
# ---------------------------------------------------------------------------


def _tasks_dir() -> str:
    return os.path.join(os.path.dirname(os.path.abspath(__file__)), "tasks")


def run_demo() -> int:
    tasks = load_all_fixtures(_tasks_dir())
    if not tasks:
        print("错误：未找到任务夹具", file=sys.stderr)
        return 1

    print("评测框架演示")
    print(f"已加载 {len(tasks)} 个任务夹具")
    print("")
    for t in tasks:
        print(f"  - {t.id:32s} verifier={t.verifier_name}")
    print("")

    print("运行参考候选方案（apply_known_fixes），k=1……")
    harness = EvalHarness(tasks=tasks, k=1)
    report = harness.run(apply_known_fixes)
    print(json.dumps(report.to_dict(), indent=2))

    if report.pass_at_1 < 1.0:
        print(
            f"错误：参考候选方案应通过全部夹具，实际结果为 "
            f"pass@1={report.pass_at_1}",
            file=sys.stderr,
        )
        return 1

    print("")
    print("运行空操作候选方案（应在全部夹具上失败），k=3……")
    harness_noop = EvalHarness(tasks=tasks, k=3)
    noop_report = harness_noop.run(noop_candidate)
    print(
        json.dumps(
            {
                "noop_pass_at_1": round(noop_report.pass_at_1, 4),
                "noop_pass_at_k": round(noop_report.pass_at_k, 4),
                "noop_k": noop_report.k,
            },
            indent=2,
        )
    )

    if noop_report.pass_at_1 > 0.0:
        print(
            f"错误：空操作候选方案应失败，实际 pass@1={noop_report.pass_at_1}",
            file=sys.stderr,
        )
        return 1

    return 0


if __name__ == "__main__":
    sys.exit(run_demo())
