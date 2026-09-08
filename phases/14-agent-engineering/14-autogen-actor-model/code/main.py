"""以 AutoGen v0.4 Core 为模型、使用标准库实现的参与者（Actor）运行时。

各参与者拥有私有状态与收件箱，仅通过消息交互。
某个参与者发生故障时，运行时捕获故障并将消息转入死信队列（Dead-letter queue）；
其他参与者继续运行。
"""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field
from typing import Any, Callable


@dataclass
class Message:
    sender: str
    recipient: str
    topic: str
    body: Any
    mid: int = 0


class Actor:
    def __init__(self, name: str) -> None:
        self.name = name

    def receive(self, message: Message, runtime: "Runtime") -> None:
        raise NotImplementedError


@dataclass
class Runtime:
    actors: dict[str, Actor] = field(default_factory=dict)
    queue: deque[Message] = field(default_factory=deque)
    dead_letters: list[tuple[Message, str]] = field(default_factory=list)
    counter: int = 0
    trace: list[str] = field(default_factory=list)
    max_messages: int = 100

    def register(self, actor: Actor) -> None:
        self.actors[actor.name] = actor

    def send(self, sender: str, recipient: str, topic: str, body: Any) -> None:
        self.counter += 1
        msg = Message(sender=sender, recipient=recipient,
                      topic=topic, body=body, mid=self.counter)
        self.queue.append(msg)
        self.trace.append(
            f"[发送 m{msg.mid:03d}] {sender} -> {recipient} 主题={topic} 正文={body}"
        )

    def run_until_idle(self) -> None:
        processed = 0
        while self.queue and processed < self.max_messages:
            msg = self.queue.popleft()
            actor = self.actors.get(msg.recipient)
            if actor is None:
                self.dead_letters.append((msg, f"没有参与者 {msg.recipient!r}"))
                self.trace.append(f"[DLQ m{msg.mid:03d}] 没有参与者 {msg.recipient!r}")
                continue
            try:
                actor.receive(msg, self)
                self.trace.append(
                    f"[接收 m{msg.mid:03d}] {actor.name} 已处理主题={msg.topic}"
                )
            except Exception as e:
                self.dead_letters.append((msg, f"{type(e).__name__}: {e}"))
                self.trace.append(
                    f"[失败 m{msg.mid:03d}] {actor.name} 抛出 "
                    f"{type(e).__name__}: {e}  （其他参与者继续运行）"
                )
            processed += 1


class ReviewerAgent(Actor):
    def __init__(self, name: str) -> None:
        super().__init__(name)
        self.verdicts: list[tuple[str, bool]] = []

    def receive(self, message: Message, runtime: Runtime) -> None:
        if message.topic == "review":
            code = str(message.body)
            issues = []
            if "eval(" in code:
                issues.append("使用了 eval")
            if "except:" in code:
                issues.append("使用了裸 except（Bare except）")
            ok = len(issues) == 0
            self.verdicts.append((code, ok))
            runtime.send(
                sender=self.name,
                recipient=message.sender,
                topic="review_result",
                body={"ok": ok, "issues": issues},
            )
        elif message.topic == "crash_me":
            raise RuntimeError("模拟处理函数故障")


class ChecklistAgent(Actor):
    def __init__(self, name: str, partner: str) -> None:
        super().__init__(name)
        self.partner = partner
        self.results: list[dict[str, Any]] = []
        self.consensus: bool | None = None

    def receive(self, message: Message, runtime: Runtime) -> None:
        if message.topic == "start":
            for snippet in message.body:
                runtime.send(
                    sender=self.name, recipient=self.partner,
                    topic="review", body=snippet,
                )
        elif message.topic == "review_result":
            self.results.append(dict(message.body))
            if all(r["ok"] for r in self.results):
                self.consensus = True
            if len(self.results) == 3:
                self.consensus = all(r["ok"] for r in self.results)


def main() -> None:
    print("=" * 70)
    print("AutoGen v0.4 参与者运行时（Actor runtime，标准库）——第 14 阶段，第 14 课")
    print("=" * 70)

    runtime = Runtime()
    reviewer = ReviewerAgent("reviewer")
    checklist = ChecklistAgent("checklist", partner="reviewer")
    runtime.register(reviewer)
    runtime.register(checklist)

    runtime.send(
        sender="__user__",
        recipient="checklist",
        topic="start",
        body=[
            "def add(a, b): return a + b",
            "def hazard(): eval('1+1')",
            "def silent(): \n    try:\n        f()\n    except:\n        pass",
        ],
    )

    runtime.send(
        sender="__user__",
        recipient="reviewer",
        topic="crash_me",
        body={},
    )

    runtime.run_until_idle()

    print("\n消息轨迹")
    for line in runtime.trace:
        print(f"  {line}")

    print(f"\n检查清单的共识（Consensus）： {checklist.consensus}")
    print(f"死信队列（Dead-letter queue）：{len(runtime.dead_letters)} 条消息")
    for msg, reason in runtime.dead_letters:
        print(f"  DLQ m{msg.mid:03d} ({reason}) "
              f"{msg.sender} -> {msg.recipient} 主题={msg.topic}")

    print()
    print("性质：reviewer 在处理 'crash_me' 时崩溃，")
    print("并未阻止 'review' 消息被处理。这就是故障隔离（Fault isolation）。")


if __name__ == "__main__":
    main()
