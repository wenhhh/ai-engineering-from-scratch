"""比较 CodeAct 与 JSON 工具调用执行框架，仅使用 Python 标准库。

两种执行框架共用确定性规则模拟“模型”，比较完成的任务数、轮次数，以及
单次动作的影响范围（会触及多少文件）。核心是观察框架如何影响操作粒度，
而不是测量真实模型质量。

原文以 OpenHands（arXiv:2407.16741）的 CodeAct 设计为例，并称 JSON 工具调用常见于
由服务提供方控制执行器的托管服务；这些是固定快照的背景表述，并非本轮重新核验的结论。

译注：“仓库”只是内存字典；run_tests() 只检查字符串是否出现，并不执行测试表达式。
CodeAct 返回的 fs.write(..., ...) 只是占位描述，没有执行生成的 Python 代码。
JSON 版本也没有独立的授权或安全验证器，不能因动作是 JSON 就认为其天然安全。
产品和论文归属沿用固定原文，未在本轮作最新事实核验。
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field


# ---------- 微型环境：内存中的小型“仓库” ----------

INITIAL_REPO = {
    "app.py": "def add(a, b):\n    return a - b\n",
    "util.py": "def lower(s):\n    return s.upper()\n",
    "cli.py": "VERSION = 'v0.0'\n",
}

TESTS = [
    ("app.py", "add(2, 3) == 5"),
    ("util.py", "lower('AB') == 'ab'"),
    ("cli.py", "VERSION == 'v1.0'"),
]

# 测试失败时，桩“模型”按路径选择相应替换规则。
# 集中定义规则，避免两种框架重复实现 if/elif 分支，
# 也避免日后扩充 TESTS 时因变量未赋值而抛出 UnboundLocalError。
FIXES: dict[str, tuple[str, str]] = {
    "app.py": ("a - b", "a + b"),
    "util.py": ("s.upper()", "s.lower()"),
    "cli.py": ("v0.0", "v1.0"),
}


def run_tests(repo: dict[str, str]) -> list[bool]:
    """确定性桩：仅对仓库源码字符串做检查，模拟测试套件。"""
    results = []
    for path, _expr in TESTS:
        src = repo.get(path, "")
        passed = False
        if path == "app.py":
            passed = "return a + b" in src
        elif path == "util.py":
            passed = "return s.lower()" in src
        elif path == "cli.py":
            passed = "VERSION = 'v1.0'" in src
        results.append(passed)
    return results


def _apply_fix(repo: dict[str, str], path: str) -> bool:
    """原地应用对应路径的替换规则；找到规则并调用替换时返回 True。"""
    rule = FIXES.get(path)
    if rule is None:
        return False
    old, new = rule
    repo[path] = repo[path].replace(old, new)
    return True


# ---------- JSON 工具调用框架：每轮一个动作 ----------

@dataclass
class JsonScaffold:
    repo: dict[str, str] = field(default_factory=lambda: dict(INITIAL_REPO))
    turns: int = 0

    def step(self) -> str:
        """根据当前失败的测试，每次返回一个 JSON 动作。"""
        self.turns += 1
        results = run_tests(self.repo)
        for (path, _), ok in zip(TESTS, results, strict=True):
            if ok:
                continue
            if _apply_fix(self.repo, path):
                return json.dumps({"tool": "edit", "path": path})
        return json.dumps({"tool": "done"})

    def blast_radius(self) -> int:
        return 1  # 每个编辑动作只触及一个文件；这是设计上界

    def run(self, max_turns: int = 10) -> tuple[int, int]:
        for _ in range(max_turns):
            action = self.step()
            if json.loads(action).get("tool") == "done":
                break
        passed = sum(run_tests(self.repo))
        return passed, self.turns


# ---------- CodeAct 框架：单个代码片段可以触及多个文件 ----------

@dataclass
class CodeActScaffold:
    repo: dict[str, str] = field(default_factory=lambda: dict(INITIAL_REPO))
    turns: int = 0
    # 记录实际观察到的单个动作触及文件数的最大值。
    # 这比静态取 len(repo) 作为上界更准确，
    # 不会因新增一个未测试的辅助文件而悄悄增大。
    worst_touched: int = 0

    def step(self) -> str:
        """返回一个可能描述多文件修改的代码片段；本例返回占位文本。"""
        self.turns += 1
        # 单个“片段”动作一次修改所有检查失败的文件。
        snippet_lines = []
        results = run_tests(self.repo)
        for (path, _), ok in zip(TESTS, results, strict=True):
            if ok:
                continue
            if _apply_fix(self.repo, path):
                snippet_lines.append(f"fs.write('{path}', ...)")
        self.worst_touched = max(self.worst_touched, len(snippet_lines))
        if not snippet_lines:
            return "done()"
        return "; ".join(snippet_lines)

    def blast_radius(self) -> int:
        # 实际观察到的单次动作最大影响文件数。
        return self.worst_touched

    def run(self, max_turns: int = 10) -> tuple[int, int]:
        for _ in range(max_turns):
            action = self.step()
            if action == "done()":
                break
        passed = sum(run_tests(self.repo))
        return passed, self.turns


# ---------- 演示入口 ----------

def report(name: str, passed: int, turns: int, blast: int) -> None:
    total = len(TESTS)
    print(f"  {name:<18}  通过 {passed}/{total}  轮次 {turns:>2}  "
          f"影响文件数 {blast}")


def main() -> None:
    print("=" * 70)
    print("CodeAct 与 JSON 工具调用框架（阶段 15，第 9 课）")
    print("=" * 70)
    print()
    print("相同的桩模型、含三个缺陷的玩具仓库；仅比较执行框架。")
    print("-" * 70)

    js = JsonScaffold()
    passed, turns = js.run()
    report("JSON 工具调用", passed, turns, js.blast_radius())

    ca = CodeActScaffold()
    passed, turns = ca.run()
    report("CodeAct（桩）", passed, turns, ca.blast_radius())

    print()
    print("=" * 70)
    print("要点：执行框架不是装饰，而是系统能力的重要组成部分")
    print("-" * 70)
    print("  相同模型配上不同框架，会产生不同的交互轮次。")
    print("  CodeAct 可以把多处编辑压缩到一个动作中。")
    print("  代价是单次动作的影响范围更大，因此需要可靠的隔离与权限边界。")
    print("  JSON 工具调用更便于逐项验证，但验证器仍需真实实现；")
    print("  本例没有实现沙箱或授权检查，格式本身不提供安全保证。")
    print("  二者没有无条件的优劣，重点在于明确应审计哪些边界。")


if __name__ == "__main__":
    main()
