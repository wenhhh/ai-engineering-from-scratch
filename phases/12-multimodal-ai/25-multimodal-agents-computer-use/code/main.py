"""多模态智能体综合实践：动作结构定义、智能体循环与 10 任务基准。

仅使用标准库。包含一个按确定规则切换页面的模拟浏览器、一个根据固定
策略表输出动作的简化 VLM，以及一个跟踪 10 个合成预订网站任务进度的外层循环。

译注：上面的“10 个任务”沿用原文概述，mock_tasks 实际只定义了两个示例。
第二个重置密码任务中的 Submit 会把页面设为 confirmation，而任务期望
reset_sent，所以原始程序的任务得分就是 1/2；这里保留该失败，不通过翻译
修改状态转移、期望值或制造全通过结果。
动作名、字段、页面状态、输入值，以及参与字符串匹配的按钮文案均保留原值。
click/type/scroll/drag/select/hover/navigate/wait/screenshot_region/done
依次表示点击、输入、滚动、拖动、选择、悬停、导航、等待、区域截图和完成。
Search、Book、Login、Forgot password、Submit 分别表示搜索、预订、登录、
忘记密码和提交；这些是状态机的匹配依据，不是可直接翻译的界面标签。
本例仅操作内存中的模拟状态，不会真的打开浏览器、预订航班或发送邮件。
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field


ACTION_SCHEMA = {
    "click": ["x", "y", "element_desc"],
    "type":  ["text", "x", "y"],
    "scroll": ["direction", "amount"],
    "drag": ["x0", "y0", "x1", "y1"],
    "select": ["option_index"],
    "hover": ["x", "y"],
    "navigate": ["url"],
    "wait": ["ms"],
    "screenshot_region": ["x0", "y0", "x1", "y1"],
    "done": ["success", "explanation"],
}


@dataclass
class BrowserState:
    url: str = "https://mock-booking/"
    page: str = "home"
    filled: dict = field(default_factory=dict)


@dataclass
class Task:
    goal: str
    plan: list[dict]
    expected_page: str


def mock_tasks() -> list[Task]:
    return [
        Task(goal="预订 4 月 15 日从纽约飞往东京的航班",
             plan=[
                 {"action": "click", "x": 120, "y": 200, "element_desc": "Search"},
                 {"action": "type",  "text": "Tokyo",  "x": 300, "y": 240},
                 {"action": "click", "x": 400, "y": 240, "element_desc": "date"},
                 {"action": "select", "option_index": 15},
                 {"action": "click", "x": 500, "y": 400, "element_desc": "Book"},
                 {"action": "done", "success": True, "explanation": "预订完成"},
             ],
             expected_page="confirmation"),
        Task(goal="为用户 alice@x.com 重置密码",
             plan=[
                 {"action": "click", "x": 50, "y": 50, "element_desc": "Login"},
                 {"action": "click", "x": 100, "y": 200, "element_desc": "Forgot password"},
                 {"action": "type",  "text": "alice@x.com", "x": 200, "y": 300},
                 {"action": "click", "x": 300, "y": 400, "element_desc": "Submit"},
                 {"action": "done", "success": True, "explanation": "重置请求已发送"},
             ],
             expected_page="reset_sent"),
    ]


def apply_action(state: BrowserState, action: dict) -> BrowserState:
    new = BrowserState(url=state.url, page=state.page, filled=dict(state.filled))
    act = action["action"]
    if act == "click":
        desc = action.get("element_desc", "")
        if "Book" in desc or "Submit" in desc:
            new.page = "confirmation"
        elif "Login" in desc or "Forgot" in desc:
            new.page = "reset_sent" if "Forgot" in desc else "login"
        elif "Search" in desc:
            new.page = "search"
    elif act == "type":
        new.filled[action.get("x", 0)] = action.get("text", "")
    elif act == "select":
        new.filled["select_idx"] = action.get("option_index", 0)
    elif act == "done":
        # 仅作为终止信号；不要覆盖工作流的页面状态
        pass
    return new


def run_task(task: Task) -> dict:
    state = BrowserState()
    trace = []
    for step, action in enumerate(task.plan, 1):
        trace.append((step, action["action"], action.get("element_desc", "")))
        state = apply_action(state, action)
    success = (state.page == task.expected_page)
    return {"goal": task.goal, "trace": trace, "final_page": state.page,
            "success": success}


def print_schema() -> None:
    print("\n动作结构定义")
    print("-" * 60)
    for act, params in ACTION_SCHEMA.items():
        print(f"  {act:<18}{params}")


def run_benchmark() -> None:
    print("\n基准测试：2 个示例任务")
    print("-" * 60)
    tasks = mock_tasks()
    total = len(tasks)
    passed = 0
    for task in tasks:
        r = run_task(task)
        status = "通过" if r["success"] else "失败"
        print(f"  [{status}] {r['goal']}")
        for step, act, desc in r["trace"]:
            print(f"    步骤 {step}: {act:<10} {desc}")
        if r["success"]:
            passed += 1
    print(f"\n  得分：{passed}/{total}")


def benchmark_leaderboard() -> None:
    print("\n2026 年多模态智能体基准快照")
    print("-" * 60)
    rows = [
        ("ScreenSpot-Pro",  "Qwen2.5-VL-72B 85",  "Claude Opus 4.7 ~90"),
        ("VisualWebArena",  "开放模型约 20",           "Gemini 3 Pro ~27"),
        ("WebArena",        "开放模型约 35",           "趋于饱和，约 60"),
        ("AgentVista",      "开放模型约 10-20",        "前沿模型 27-40"),
        ("Ferret-UI 移动端","Qwen2.5-VL ~70",     "GPT-5 ~82"),
    ]
    print(f"  {'基准':<20}{'开放模型':<26}{'前沿模型'}")
    for r in rows:
        print(f"  {r[0]:<20}{r[1]:<26}{r[2]}")


def main() -> None:
    print("=" * 60)
    print("多模态智能体综合实践（阶段 12，第 25 课）")
    print("=" * 60)

    print_schema()
    run_benchmark()
    benchmark_leaderboard()

    print("\n记忆压缩策略")
    print("-" * 60)
    print("  摘要链  ：定期生成文字摘要，丢弃旧截图")
    print("  跳帧保留：保留首帧、末帧，以及每第 3 帧")
    print("  仅留日志：上下文中只保留动作日志（Claude 计算机使用）")
    print("  最佳组合：动作日志 + 最近 2 张截图 + 摘要")

    print("\n你已完成阶段 12 的学习")
    print("-" * 60)
    print("  从图块到智能体，25 课涵盖：")
    print("  感知 -> 融合 -> 生成 -> 音频 -> 机器人 -> RAG -> 智能体")
    print("  每个基本机制都能追溯到一篇可供阅读的具体 arXiv 论文。")


if __name__ == "__main__":
    main()
