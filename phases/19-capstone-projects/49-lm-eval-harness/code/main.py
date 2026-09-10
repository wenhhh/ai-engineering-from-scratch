"""从零实现语言模型评测框架。

任务规范用 JSONL 的每一行描述一个样例，包含 prompt、targets 和
metric。提供五类指标：算术完全匹配、摘要 ROUGE-L F1、代码执行检查、
选择题准确率，以及生成文本的子串包含判断。运行器按任务分批请求
可替换的模型适配器，输出含逐任务分数和总分的排行榜 JSON。

模型适配器是替换真实推理实现的接入点。默认适配器是按提示词模式
匹配的确定性玩具实现，仅为各评分路径提供固定输出；可在实际接入时
换成 HTTP 客户端、本地推理调用，或在测试中使用桩对象。

运行：python3 code/main.py

译注：这是独立的教学实现，并未调用外部 lm-evaluation-harness。
提示词前缀、语料、答案、任务名和错误字符串参与匹配与计分，保留英文。
ROUGE 分词只识别英文字母和数字，不能因界面汉化就视为支持中文评测。
总分是任务分数的等权平均；correct 字段是分数和取整，对 ROUGE 等
连续指标不等于完全答对的样例数。默认夹具只执行预置可信的简短代码。
"""

from __future__ import annotations

import argparse
import ast
import json
import operator
import re
import sys
import textwrap
import time
from collections import Counter
from dataclasses import dataclass, field, asdict
from pathlib import Path
from typing import Callable, Dict, Iterable, List, Optional, Protocol, Sequence


HERE = Path(__file__).parent
OUT_DIR = HERE.parent / "outputs"
TASKS_DIR = OUT_DIR / "tasks"
LEADERBOARD = OUT_DIR / "leaderboard.json"


@dataclass
class Example:
    id: str
    prompt: str
    targets: List[str]
    metric: str
    extras: Dict[str, object] = field(default_factory=dict)


@dataclass
class TaskResult:
    task: str
    metric: str
    score: float
    correct: int
    total: int
    per_example: List[Dict[str, object]] = field(default_factory=list)
    latency_ms: float = 0.0


@dataclass
class Leaderboard:
    schema: str
    timestamp: float
    overall_score: float
    tasks: List[TaskResult]


class ModelAdapter(Protocol):
    def generate(self, prompts: Sequence[str]) -> List[str]:
        ...

    @property
    def name(self) -> str:
        ...


class ToyAdapter:
    """对各任务进行模式匹配的确定性适配器。

    目的不是取得高分，而是给评测框架一组固定输出以检验评分逻辑。
    对真实模型执行评测时，应替换为真正的客户端；占位高分不是模型
    能力证明。
    """

    name = "toy.v1"

    def generate(self, prompts: Sequence[str]) -> List[str]:
        return [self._answer(p) for p in prompts]

    def _answer(self, prompt: str) -> str:
        text = prompt.strip()
        if text.startswith("compute:"):
            expr = text[len("compute:"):].strip()
            try:
                return str(safe_arith_eval(expr))
            except Exception:
                return ""
        if text.startswith("summarize:"):
            body = text[len("summarize:"):].strip()
            sentences = re.split(r"(?<=[.!?])\s+", body)
            return sentences[0] if sentences else body
        if text.startswith("python:"):
            body = text[len("python:"):].strip()
            if "double" in body:
                return "def f(x):\n    return x * 2\n"
            if "increment" in body:
                return "def f(x):\n    return x + 1\n"
            if "square" in body:
                return "def f(x):\n    return x * x\n"
            return "def f(x):\n    return x\n"
        if text.startswith("choose:"):
            body = text[len("choose:"):].strip()
            return body.split("|", 1)[0].strip()[:1].upper()
        if text.startswith("write:"):
            body = text[len("write:"):].strip()
            return body
        return text


_ARITH_OPS = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: operator.truediv,
    ast.FloorDiv: operator.floordiv,
    ast.Mod: operator.mod,
    ast.UAdd: operator.pos,
    ast.USub: operator.neg,
    ast.Pow: operator.pow,
}


def safe_arith_eval(expr: str) -> float:
    """通过受限 AST 节点计算小型算术表达式，不调用 Python eval。

    译注：没有单独限制幂运算规模、表达式深度或执行时间；
    节点允许列表不等于面向任意不可信输入的资源隔离。
    """
    tree = ast.parse(expr, mode="eval")
    return _safe_eval(tree.body)


def _safe_eval(node: ast.AST) -> float:
    if isinstance(node, ast.Constant) and isinstance(node.value, (int, float)):
        return node.value
    if isinstance(node, ast.BinOp) and type(node.op) in _ARITH_OPS:
        return _ARITH_OPS[type(node.op)](_safe_eval(node.left), _safe_eval(node.right))
    if isinstance(node, ast.UnaryOp) and type(node.op) in _ARITH_OPS:
        return _ARITH_OPS[type(node.op)](_safe_eval(node.operand))
    # 表达式含不受支持的 AST 节点。
    raise ValueError(f"unsafe node: {ast.dump(node)}")


def normalize(s: str) -> str:
    return re.sub(r"\s+", " ", s.strip().lower())


def metric_exact_match(prediction: str, targets: List[str]) -> float:
    norm_pred = normalize(prediction)
    return 1.0 if any(normalize(t) == norm_pred for t in targets) else 0.0


def metric_substring_contains(prediction: str, targets: List[str]) -> float:
    norm_pred = normalize(prediction)
    return 1.0 if any(normalize(t) in norm_pred for t in targets) else 0.0


def metric_multiple_choice(prediction: str, targets: List[str]) -> float:
    pred = prediction.strip()[:1].upper()
    return 1.0 if pred in {t.strip()[:1].upper() for t in targets} else 0.0


def _tokens(s: str) -> List[str]:
    return re.findall(r"[a-z0-9]+", s.lower())


def _lcs_length(a: List[str], b: List[str]) -> int:
    if not a or not b:
        return 0
    prev = [0] * (len(b) + 1)
    for ai in a:
        cur = [0] * (len(b) + 1)
        for j, bj in enumerate(b):
            if ai == bj:
                cur[j + 1] = prev[j] + 1
            else:
                cur[j + 1] = max(prev[j + 1], cur[j])
        prev = cur
    return prev[-1]


def metric_rouge_l(prediction: str, targets: List[str]) -> float:
    pred = _tokens(prediction)
    if not pred:
        return 0.0
    best = 0.0
    for ref in targets:
        ref_toks = _tokens(ref)
        if not ref_toks:
            continue
        lcs = _lcs_length(pred, ref_toks)
        if lcs == 0:
            continue
        prec = lcs / len(pred)
        rec = lcs / len(ref_toks)
        if prec + rec == 0:
            continue
        f1 = 2 * prec * rec / (prec + rec)
        if f1 > best:
            best = f1
    return best


def metric_code_exec(prediction: str, targets: List[str], extras: Dict[str, object]) -> float:
    """在精简命名空间中执行预测代码，并与预期输出比较。

    extras 中的 io_pairs 提供 (输入, 输出) 对；targets 参数虽然
    保留在接口中，实际没有参与本函数评分。最终分数为匹配对数除以
    原始 pairs 的长度，格式不正确的条目也留在分母中。

    原文声称裁剪 builtins 后代码无法访问文件或网络；这不是可靠的
    沙箱保证。代码直接在当前进程 exec，没有超时或内存上限，只应
    运行可信教学夹具，不能据此执行任意模型生成代码。
    """
    pairs = extras.get("io_pairs") or []
    if not isinstance(pairs, list) or not pairs:
        return 0.0
    safe_globals = {"__builtins__": {"range": range, "len": len, "min": min, "max": max, "abs": abs, "int": int, "float": float}}
    local: Dict[str, object] = {}
    try:
        exec(prediction, safe_globals, local)
    except Exception:
        return 0.0
    fn = local.get("f")
    if not callable(fn):
        return 0.0
    correct = 0
    for pair in pairs:
        if not (isinstance(pair, list) and len(pair) == 2):
            continue
        x, expected = pair
        try:
            actual = fn(x)
        except Exception:
            continue
        if actual == expected:
            correct += 1
    if not pairs:
        return 0.0
    return correct / len(pairs)


METRIC_FNS: Dict[str, Callable[..., float]] = {
    "exact_match": lambda p, t, e: metric_exact_match(p, t),
    "substring_contains": lambda p, t, e: metric_substring_contains(p, t),
    "multiple_choice": lambda p, t, e: metric_multiple_choice(p, t),
    "rouge_l": lambda p, t, e: metric_rouge_l(p, t),
    "code_exec": lambda p, t, e: metric_code_exec(p, t, e),
}


def load_task_jsonl(path: Path) -> List[Example]:
    examples: List[Example] = []
    with path.open("r", encoding="utf-8") as f:
        for line_num, raw in enumerate(f, start=1):
            raw = raw.strip()
            if not raw or raw.startswith("#"):
                continue
            try:
                obj = json.loads(raw)
            except json.JSONDecodeError as exc:
                # 任务文件中的 JSON 无法解析，后面保留路径与行号。
                raise ValueError(f"bad json at {path}:{line_num}: {exc}") from exc
            examples.append(Example(
                id=str(obj.get("id", f"ex-{line_num}")),
                prompt=obj["prompt"],
                targets=list(obj["targets"]),
                metric=obj["metric"],
                extras=dict(obj.get("extras", {})),
            ))
    return examples


def write_task_jsonl(examples: Iterable[Example], path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        for ex in examples:
            f.write(json.dumps({
                "id": ex.id,
                "prompt": ex.prompt,
                "targets": ex.targets,
                "metric": ex.metric,
                **({"extras": ex.extras} if ex.extras else {}),
            }) + "\n")


def run_task(
    task_name: str,
    examples: List[Example],
    adapter: ModelAdapter,
    *,
    batch_size: int = 8,
) -> TaskResult:
    if batch_size <= 0:
        # 批大小必须大于 0。
        raise ValueError(f"batch_size must be > 0, got {batch_size}")
    if not examples:
        return TaskResult(task=task_name, metric="none", score=0.0, correct=0, total=0)
    metric = examples[0].metric
    # 同一任务中的样例必须使用相同指标。
    assert all(ex.metric == metric for ex in examples), f"task {task_name} mixes metrics"
    metric_fn = METRIC_FNS[metric]
    per_example: List[Dict[str, object]] = []
    correct_sum = 0.0
    total = 0
    start = time.perf_counter()
    for i in range(0, len(examples), batch_size):
        chunk = examples[i:i + batch_size]
        prompts = [ex.prompt for ex in chunk]
        outputs = adapter.generate(prompts)
        if len(outputs) != len(chunk):
            raise ValueError(
                # 适配器返回结果数量必须与请求提示词数量一致。
                f"adapter returned {len(outputs)} outputs for {len(chunk)} prompts in task {task_name}"
            )
        for ex, out in zip(chunk, outputs, strict=True):
            score = metric_fn(out, ex.targets, ex.extras)
            correct_sum += score
            total += 1
            per_example.append({
                "id": ex.id,
                "prompt": ex.prompt,
                "prediction": out,
                "targets": ex.targets,
                "score": score,
            })
    latency_ms = (time.perf_counter() - start) * 1000.0
    score = correct_sum / total if total else 0.0
    correct_int = int(round(correct_sum))
    return TaskResult(
        task=task_name,
        metric=metric,
        score=score,
        correct=correct_int,
        total=total,
        per_example=per_example,
        latency_ms=latency_ms,
    )


def run_leaderboard(
    tasks: Dict[str, List[Example]],
    adapter: ModelAdapter,
    *,
    batch_size: int = 8,
) -> Leaderboard:
    results: List[TaskResult] = []
    for name in sorted(tasks):
        result = run_task(name, tasks[name], adapter, batch_size=batch_size)
        results.append(result)
    if results:
        overall = sum(r.score for r in results) / len(results)
    else:
        overall = 0.0
    return Leaderboard(
        schema="leaderboard.v1",
        timestamp=time.time(),
        overall_score=overall,
        tasks=results,
    )


def write_leaderboard(
    board: Leaderboard,
    path: Path,
    *,
    adapter_name: str,
    include_per_example: bool = False,
) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "schema": board.schema,
        "timestamp": board.timestamp,
        "overall_score": board.overall_score,
        "adapter": adapter_name,
        "tasks": [
            {
                "task": r.task,
                "metric": r.metric,
                "score": r.score,
                "correct": r.correct,
                "total": r.total,
                "latency_ms": r.latency_ms,
                **({"per_example": r.per_example} if include_per_example else {}),
            }
            for r in board.tasks
        ],
    }
    path.write_text(json.dumps(payload, indent=2) + "\n")


def build_arithmetic_task() -> List[Example]:
    items = [("2 + 2", "4"), ("7 - 3", "4"), ("6 * 4", "24"), ("100 / 4", "25.0"), ("12 + 9", "21")]
    return [Example(id=f"arith-{i:02d}", prompt=f"compute: {q}", targets=[a], metric="exact_match") for i, (q, a) in enumerate(items)]


def build_summary_task() -> List[Example]:
    items = [
        ("Cats are mammals. Mammals are warm blooded.", "cats are mammals"),
        ("Python uses indentation. Indentation defines blocks.", "python uses indentation"),
        ("The river flows east. Boats pass slowly.", "the river flows east"),
        ("Storms approach the coast. Waves rise quickly.", "storms approach the coast"),
        ("Bread bakes at high heat. Crust forms last.", "bread bakes at high heat"),
    ]
    return [Example(id=f"sum-{i:02d}", prompt=f"summarize: {p}", targets=[t], metric="rouge_l") for i, (p, t) in enumerate(items)]


def build_code_task() -> List[Example]:
    items = [
        ("write a function f that doubles its input", "double", [[1, 2], [3, 6], [5, 10]]),
        ("write a function f that increments its input", "increment", [[1, 2], [5, 6], [10, 11]]),
        ("write a function f that squares its input", "square", [[2, 4], [3, 9], [4, 16]]),
        ("write a function f that doubles its input again", "double", [[7, 14], [9, 18]]),
        ("write a function f that increments its input again", "increment", [[0, 1], [2, 3]]),
    ]
    return [
        Example(
            id=f"code-{i:02d}",
            prompt=f"python: {prompt}",
            targets=["ok"],
            metric="code_exec",
            extras={"io_pairs": pairs, "tag": tag},
        )
        for i, (prompt, tag, pairs) in enumerate(items)
    ]


def build_choice_task() -> List[Example]:
    items = [
        ("A | mammal, B | reptile, C | bird", ["A"]),
        ("A | apple, B | car, C | tree", ["A"]),
        ("A | water, B | iron, C | wood", ["A"]),
        ("A | square, B | triangle, C | circle", ["A"]),
        ("A | bread, B | rock, C | leaf", ["A"]),
    ]
    return [Example(id=f"mc-{i:02d}", prompt=f"choose: {q}", targets=t, metric="multiple_choice") for i, (q, t) in enumerate(items)]


def build_generation_task() -> List[Example]:
    items = [
        ("hello world", ["hello"]),
        ("training language models", ["language"]),
        ("evaluation harness", ["evaluation"]),
        ("gradient accumulation step", ["gradient"]),
        ("distributed parameter sharding", ["distributed"]),
    ]
    return [Example(id=f"gen-{i:02d}", prompt=f"write: {p}", targets=t, metric="substring_contains") for i, (p, t) in enumerate(items)]


def seed_fixture_tasks(target_dir: Path) -> Dict[str, Path]:
    target_dir.mkdir(parents=True, exist_ok=True)
    tasks = {
        "arithmetic": build_arithmetic_task(),
        "summary": build_summary_task(),
        "code-exec": build_code_task(),
        "multiple-choice": build_choice_task(),
        "generation": build_generation_task(),
    }
    paths: Dict[str, Path] = {}
    for name, examples in tasks.items():
        path = target_dir / f"{name}.jsonl"
        write_task_jsonl(examples, path)
        paths[name] = path
    return paths


def load_all_tasks(task_dir: Path) -> Dict[str, List[Example]]:
    tasks: Dict[str, List[Example]] = {}
    for path in sorted(task_dir.glob("*.jsonl")):
        tasks[path.stem] = load_task_jsonl(path)
    return tasks


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser()
    p.add_argument("--task-dir", type=Path, default=TASKS_DIR)
    p.add_argument("--out", type=Path, default=LEADERBOARD)
    p.add_argument("--batch-size", type=int, default=4)
    p.add_argument("--include-per-example", action="store_true")
    p.add_argument("--seed-fixtures", action="store_true")
    return p.parse_args()


def main() -> int:
    args = parse_args()
    if args.seed_fixtures or not args.task_dir.exists() or not list(args.task_dir.glob("*.jsonl")):
        print(f"向以下目录写入任务夹具：{args.task_dir}")
        seed_fixture_tasks(args.task_dir)
    tasks = load_all_tasks(args.task_dir)
    print(f"已加载 {len(tasks)} 个任务：{sorted(tasks)}")
    adapter = ToyAdapter()
    board = run_leaderboard(tasks, adapter, batch_size=args.batch_size)
    write_leaderboard(
        board,
        args.out,
        adapter_name=adapter.name,
        include_per_example=args.include_per_example,
    )
    print(f"总分 = {board.overall_score:.3f}")
    for r in board.tasks:
        print(f"  {r.task:>16}  指标={r.metric:>18}  得分={r.score:0.3f}  ({r.correct}/{r.total})  耗时毫秒={r.latency_ms:.1f}")
    print(f"已写入 {args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
