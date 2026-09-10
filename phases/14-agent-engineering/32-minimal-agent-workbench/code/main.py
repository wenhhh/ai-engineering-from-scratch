"""创建只包含三个核心文件的最小智能体工作台，并执行一个回合。

写入文件：
  workdir/AGENTS.md         简短入口，指向状态、任务看板及按需加载的详细文档
  workdir/agent_state.json  当前任务、已修改文件、阻塞项和下一步动作
  workdir/task_board.json   带状态及验收条件的任务队列

运行：python3 code/main.py
再次运行，可以看到后一个回合从前一个回合停止的位置继续。

译注：本例只更新状态和文件名列表，并未实际修改 app.py、执行 pytest 或校验验收命令。
因此，标记 done 只是状态流转演示，不能作为真实任务已经完成的证据。
状态枚举、路径、命令和 JSON 字段保留英文；目标、下一步说明及生成的入口文档中文化。
"""

from __future__ import annotations

import json
from dataclasses import asdict, dataclass, field
from pathlib import Path

ROOT = Path(__file__).parent / "workdir"


AGENTS_MD = """# AGENTS.md

本仓库使用智能体工作台。执行动作前，请阅读：

1. `agent_state.json`：上一会话停止的位置。
2. `task_board.json`：正在处理的任务，以及下一项任务。
3. `docs/agent-rules.md`：启动规则、范围约束和完成标准，按需加载。

完成标准：`agent_state.active_task_id` 指向的任务在 `task_board.json` 中满足
`status == \"done\"`，且其 `acceptance` 中列出的验证命令以退出码 0 结束。

验证命令：`python3 -m pytest -x`

教学提示：本例的回合函数只演示状态迁移，不会自动执行上述验证命令。
""".lstrip()


@dataclass
class AgentState:
    active_task_id: str | None
    touched_files: list[str] = field(default_factory=list)
    assumptions: list[str] = field(default_factory=list)
    blockers: list[str] = field(default_factory=list)
    next_action: str = ""


@dataclass
class Task:
    id: str
    goal: str
    owner: str
    acceptance: list[str]
    status: str = "todo"


def write_initial(state_path: Path, board_path: Path, agents_path: Path) -> None:
    if not agents_path.exists():
        agents_path.write_text(AGENTS_MD)
    if not state_path.exists():
        state_path.write_text(json.dumps(asdict(AgentState(active_task_id=None)), indent=2) + "\n")
    if not board_path.exists():
        board = [
            Task(
                id="T-001",
                goal="为 /signup 添加输入校验",
                owner="builder",
                acceptance=["pytest test_app.py::test_signup_rejects_short_password"],
            ),
            Task(
                id="T-002",
                goal="记录新的 /signup 接口约定",
                owner="builder",
                acceptance=["docs/api.md 说明 /signup 的约束条件"],
            ),
        ]
        board_path.write_text(json.dumps([asdict(t) for t in board], indent=2) + "\n")


def load_state(state_path: Path) -> AgentState:
    raw = json.loads(state_path.read_text())
    return AgentState(**raw)


def load_board(board_path: Path) -> list[Task]:
    return [Task(**t) for t in json.loads(board_path.read_text())]


def save_state(state_path: Path, state: AgentState) -> None:
    state_path.write_text(json.dumps(asdict(state), indent=2) + "\n")


def save_board(board_path: Path, board: list[Task]) -> None:
    board_path.write_text(json.dumps([asdict(t) for t in board], indent=2) + "\n")


def run_one_turn(state: AgentState, board: list[Task]) -> tuple[AgentState, list[Task]]:
    if state.active_task_id is None:
        nxt = next((t for t in board if t.status == "todo"), None)
        if nxt is None:
            state.next_action = "看板中没有待处理任务，保持空闲"
            return state, board
        nxt.status = "in_progress"
        state.active_task_id = nxt.id
        state.next_action = f"开始处理 {nxt.id}: {nxt.goal}"
        return state, board

    active = next((t for t in board if t.id == state.active_task_id), None)
    if active is None:
        state.active_task_id = None
        state.next_action = f"当前任务已不在看板中；清空当前任务，重新选择"
        return state, board
    if "app.py" not in state.touched_files:
        state.touched_files.append("app.py")
        state.next_action = f"为任务 {active.id} 添加验收测试"
        return state, board

    if "test_app.py" not in state.touched_files:
        state.touched_files.append("test_app.py")
        state.next_action = f"运行任务的验证命令：{active.id}"
        return state, board

    active.status = "done"
    state.active_task_id = None
    state.touched_files = []
    state.next_action = "从看板选择下一项任务"
    return state, board


def main() -> None:
    ROOT.mkdir(exist_ok=True)
    state_path = ROOT / "agent_state.json"
    board_path = ROOT / "task_board.json"
    agents_path = ROOT / "AGENTS.md"

    write_initial(state_path, board_path, agents_path)
    state = load_state(state_path)
    board = load_board(board_path)

    print("本回合开始前：")
    print(f"  当前任务：{state.active_task_id}")
    print(f"  下一步：{state.next_action!r}")
    print(f"  看板待办：{[t.id for t in board if t.status == 'todo']}")

    state, board = run_one_turn(state, board)
    save_state(state_path, state)
    save_board(board_path, board)

    print("\n本回合结束后：")
    print(f"  当前任务：{state.active_task_id}")
    print(f"  已记录修改的文件：{state.touched_files}")
    print(f"  下一步：{state.next_action!r}")
    print(f"  看板状态：{[(t.id, t.status) for t in board]}")


if __name__ == "__main__":
    main()
