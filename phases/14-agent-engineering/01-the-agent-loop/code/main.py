"""教学用 ReAct 智能体循环（Agent loop）——仅使用标准库。

实现 docs/en.md 中的五个组成部分：
  1. 消息缓冲区（Message buffer）
  2. 工具注册表（Tool registry）
  3. 停止条件（Stop condition）
  4. 轮次预算（Turn budget）
  5. 观察结果格式化器（Observation formatter）

ToyLLM 使用预设脚本策略，因此循环可离线运行且结果确定。
将 ToyLLM 替换为真实服务商客户端，控制流仍完全相同。
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Callable


@dataclass
class ToolCall:
    name: str
    args: dict[str, Any]


@dataclass
class Turn:
    kind: str
    content: str
    tool_call: ToolCall | None = None
    observation: str | None = None


class ToolRegistry:
    def __init__(self) -> None:
        self._tools: dict[str, Callable[..., str]] = {}

    def register(self, name: str, fn: Callable[..., str]) -> None:
        self._tools[name] = fn

    def names(self) -> list[str]:
        return sorted(self._tools)

    def dispatch(self, call: ToolCall) -> str:
        fn = self._tools.get(call.name)
        if fn is None:
            return f"错误：未知工具 {call.name!r}"
        try:
            return fn(**call.args)
        except TypeError as e:
            return f"错误：{call.name} 的参数无效：{e}"
        except Exception as e:
            return f"错误：{type(e).__name__}：{e}"


def calculator(expr: str) -> str:
    allowed = set("0123456789+-*/(). ")
    if not set(expr).issubset(allowed):
        return "错误：expr 中存在非法字符"
    try:
        return str(eval(expr, {"__builtins__": {}}, {}))
    except Exception as e:
        return f"错误：{type(e).__name__}：{e}"


class KVStore:
    def __init__(self) -> None:
        self._store: dict[str, str] = {}

    def get(self, key: str) -> str:
        return self._store.get(key, f"missing:{key}")

    def set(self, key: str, value: str) -> str:
        self._store[key] = value
        return f"已存储 {key}"


class ToyLLM:
    """预设脚本式 ReAct 策略。每次调用返回一轮助手响应。

    每条脚本记录为 ('thought', text) 加 ('action', name, args)，
    或 ('finish', text)。循环按顺序执行脚本。
    """

    def __init__(self, script: list[dict[str, Any]]) -> None:
        self.script = script
        self.cursor = 0

    def respond(self, history: list[Turn]) -> dict[str, Any]:
        if self.cursor >= len(self.script):
            return {"kind": "finish", "content": "没有更多动作"}
        entry = self.script[self.cursor]
        self.cursor += 1
        return entry


@dataclass
class AgentLoop:
    llm: ToyLLM
    tools: ToolRegistry
    max_turns: int = 12
    history: list[Turn] = field(default_factory=list)

    def run(self, user_message: str) -> str:
        self.history.append(Turn(kind="user", content=user_message))
        for step in range(self.max_turns):
            reply = self.llm.respond(self.history)
            if reply["kind"] == "finish":
                self.history.append(Turn(kind="final", content=reply["content"]))
                return reply["content"]
            thought = reply.get("thought", "")
            self.history.append(Turn(kind="thought", content=thought))
            call = ToolCall(name=reply["action"], args=reply.get("args", {}))
            observation = self.tools.dispatch(call)
            self.history.append(
                Turn(kind="action", content=call.name,
                     tool_call=call, observation=observation)
            )
        self.history.append(Turn(kind="final",
                                 content="预算已耗尽"))
        return "预算已耗尽"


def pretty_trace(history: list[Turn]) -> None:
    for i, turn in enumerate(history):
        tag = f"[{i:02d} {turn.kind:>7}]"
        if turn.kind == "user":
            print(f"{tag} {turn.content}")
        elif turn.kind == "thought":
            print(f"{tag} {turn.content}")
        elif turn.kind == "action":
            call = turn.tool_call
            assert call is not None
            print(f"{tag} {call.name}({call.args}) -> {turn.observation}")
        elif turn.kind == "final":
            print(f"{tag} {turn.content}")


def build_demo_agent() -> AgentLoop:
    tools = ToolRegistry()
    tools.register("calculator", calculator)
    kv = KVStore()
    tools.register("kv_get", kv.get)
    tools.register("kv_set", kv.set)

    script: list[dict[str, Any]] = [
        {"kind": "action", "thought": "存储基础价格",
         "action": "kv_set", "args": {"key": "base", "value": "120"}},
        {"kind": "action", "thought": "计算 15% 的税额",
         "action": "calculator", "args": {"expr": "120 * 0.15"}},
        {"kind": "action", "thought": "存储税额",
         "action": "kv_set", "args": {"key": "tax", "value": "18.0"}},
        {"kind": "action", "thought": "计算总额",
         "action": "calculator", "args": {"expr": "120 + 18.0"}},
        {"kind": "action", "thought": "确认已存储的值",
         "action": "kv_get", "args": {"key": "base"}},
        {"kind": "finish", "content": "含 15% 税额的总额为 138.0"},
    ]
    return AgentLoop(llm=ToyLLM(script), tools=tools, max_turns=10)


def main() -> None:
    print("=" * 70)
    print("教学用 ReAct 循环——第 14 阶段，第 01 课")
    print("=" * 70)
    agent = build_demo_agent()
    final = agent.run("120 加上 15% 的税额是多少？请存入 kv。")
    print()
    pretty_trace(agent.history)
    print()
    print(f"最终答案：{final}")
    print(f"已用轮次：{len([t for t in agent.history if t.kind == 'action'])}")
    print(f"使用的工具：{agent.tools.names()}")


if __name__ == "__main__":
    main()
