"""角色分工：规划者、执行者、评议者与验证者。

围绕一个简单的 Python 加法函数，比较正确实现与偏离规格的实现。
评议者用源码字符串规则模拟审阅；验证者则运行代码并检查给定测试，
演示“看起来合理”和“通过实际检查”是两回事。

译注：verifier 使用 exec 在字典命名空间中执行源码，没有进程、文件系统或
权限隔离。原文的 sandbox namespace 不能理解为安全沙箱；仅运行可信教学夹具，
不可将不可信模型生成代码直接交给它。预设的三项测试也不是完整正确性证明。
"""
from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class Spec:
    task_name: str
    signature: str
    description: str
    tests: list[tuple[tuple, int]]


@dataclass
class Artifact:
    code: str


@dataclass
class CriticReport:
    approved: bool
    notes: list[str] = field(default_factory=list)


@dataclass
class VerifierReport:
    passed: bool
    failures: list[str] = field(default_factory=list)


def planner(user_wish: str) -> Spec:
    """根据高层意愿返回结构化规格；本例固定为两个整数相加。"""
    return Spec(
        task_name="add_two",
        signature="add_two(a: int, b: int) -> int",
        description=user_wish,
        tests=[((1, 2), 3), ((10, 20), 30), ((-5, 5), 0)],
    )


def executor_correct(spec: Spec) -> Artifact:
    return Artifact(code="def add_two(a, b):\n    return a + b\n")


def executor_buggy(spec: Spec) -> Artifact:
    return Artifact(code="def add_two(a, b):\n    return a * b\n")


def critic(spec: Spec, art: Artifact) -> CriticReport:
    """用字符串规则模拟审阅：检查常见的表面问题，
    但可能放过外观合理、语义错误的代码。没有真正调用 LLM。"""
    notes: list[str] = []
    if "def" not in art.code:
        # 审阅诊断：缺少 def 函数定义语句。
        notes.append("missing def statement")
    if "return" not in art.code:
        # 审阅诊断：缺少 return。
        notes.append("missing return")
    if spec.task_name not in art.code:
        # 审阅诊断：函数名与规格不符。
        notes.append(f"function name does not match spec '{spec.task_name}'")
    approved = not notes
    return CriticReport(approved=approved, notes=notes)


def verifier(spec: Spec, art: Artifact) -> VerifierReport:
    """在独立字典命名空间中执行代码及测试；不是安全沙箱，只能处理可信代码。"""
    ns: dict = {}
    try:
        exec(art.code, ns, ns)
    except Exception as e:
        # 执行源码时报错。
        return VerifierReport(passed=False, failures=[f"exec error: {e}"])
    fn = ns.get(spec.task_name)
    if not callable(fn):
        # 诊断：没有生成指定名称的可调用对象。
        return VerifierReport(passed=False, failures=[f"no callable '{spec.task_name}' produced"])
    failures: list[str] = []
    for args, expected in spec.tests:
        try:
            got = fn(*args)
        except Exception as e:
            # 调用诊断：记录参数、预期值、实际值或异常；保留英文错误契约。
            failures.append(f"call {args} raised {e}")
            continue
        if got != expected:
            # 调用诊断：记录参数、预期值、实际值或异常；保留英文错误契约。
            failures.append(f"call {args}: expected {expected}, got {got}")
    return VerifierReport(passed=not failures, failures=failures)


def run_pipeline(user_wish: str, executor, label: str) -> None:
    print(f"\n=== {label} ===")
    spec = planner(user_wish)
    print(f"  ［规划者］规格：{spec.signature}，包含 {len(spec.tests)} 项测试")
    art = executor(spec)
    print(f"  ［执行者］生成的代码：\n    {art.code.replace(chr(10), chr(10)+'    ')}")
    crep = critic(spec, art)
    print(f"  ［评议者］通过={crep.approved}，说明={crep.notes}")
    vrep = verifier(spec, art)
    print(f"  ［验证者］通过={vrep.passed}，失败项={vrep.failures}")
    if crep.approved and vrep.passed:
        print("  结果：本例的评议与测试都通过；不代表已满足生产发布条件。")
    elif not vrep.passed:
        print("  结果：验证者阻止发布（确定性测试发现问题）。")
    elif not crep.approved:
        print("  结果：评议者阻止发布（本例由源码字符串规则发现问题）。")


def main() -> None:
    print("角色分工流水线——规划者、执行者、评议者、验证者")
    print("-" * 70)

    run_pipeline(
        "编写一个返回两个整数之和的函数。",
        executor_correct,
        "执行者输出正确实现",
    )

    run_pipeline(
        "编写一个返回两个整数之和的函数。",
        executor_buggy,
        "执行者输出错误实现（看起来合理，但运行测试失败）",
    )

    print("\n要点：本例的评议者因源码表面结构正常，放过了错误实现。")
    print("只有实际执行测试的验证者发现了这个语义错误。")
    print("缺少验证环节可能使此类错误流入交付；本例不能证明所有纯 LLM 流水线都会犯同样的错。")


if __name__ == "__main__":
    main()
