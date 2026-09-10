"""阶段 13，第 19 课：A2A 智能体间通信协议。

研究智能体通过 A2A 调用写作智能体：
  1. 研究智能体获取写作智能体的 Agent Card（智能体名片）
  2. 提交包含文本、文件和数据部分的 Task（任务）
  3. 写作智能体的状态依次变为 working -> input_required -> working -> completed
     即“处理中 -> 等待补充输入 -> 处理中 -> 已完成”
  4. 研究智能体收到 Artifact（产物）

仅依赖标准库；用进程内传递代替经 HTTP 发送的 JSON-RPC 请求。
译注：字段名、状态值、技能 ID、MIME 类型和模拟 PDF 字节保持原样。
任务所需的长度字段实际为 targetLength；原提示中的 target_length 已按代码纠正。
short 表示简短。演示仅生成固定文本，不会读取或总结真实论文。

运行：python code/main.py
"""

from __future__ import annotations

import base64
import json
import uuid
from dataclasses import dataclass, field


WRITER_AGENT_CARD = {
    "schemaVersion": "1.0",
    "name": "writer-agent",
    "description": "根据源材料撰写技术摘要和报告。",
    "url": "https://writer.example.com/a2a",
    "version": "1.0.0",
    "skills": [
        {
            "id": "draft_report",
            "name": "撰写报告",
            "description": "根据提供的源材料和目标长度生成报告。",
            "inputModes": ["text", "file", "data"],
            "outputModes": ["text", "artifact"],
        }
    ],
    "capabilities": {"streaming": True, "pushNotifications": False},
}


@dataclass
class Part:
    kind: str
    payload: dict


@dataclass
class Message:
    role: str
    parts: list[Part] = field(default_factory=list)


@dataclass
class Artifact:
    name: str
    mimeType: str
    parts: list[Part]


@dataclass
class Task:
    id: str
    state: str = "submitted"
    messages: list[Message] = field(default_factory=list)
    artifact: Artifact | None = None

    def append(self, m: Message) -> None:
        self.messages.append(m)


TASK_STORE: dict[str, Task] = {}


def writer_tasks_send(skill_id: str, message: Message) -> Task:
    task = Task(id=f"task_{uuid.uuid4().hex[:10]}")
    TASK_STORE[task.id] = task
    task.state = "working"
    task.append(message)
    print(f"    写作智能体：开始任务 {task.id}，技能={skill_id}")
    # 需要提供 targetLength（目标长度）
    data_parts = [p for p in message.parts if p.kind == "data"]
    if not data_parts or "targetLength" not in data_parts[0].payload:
        task.state = "input_required"
        task.append(Message(role="agent", parts=[
            Part("text", {"text": "请在数据部分中提供 targetLength（目标长度）。"})
        ]))
        print(f"    写作智能体：已暂停，等待补充输入（input_required）")
    else:
        finish(task, data_parts[0].payload["targetLength"])
    return task


def writer_tasks_reply(task_id: str, message: Message) -> Task:
    task = TASK_STORE[task_id]
    task.append(message)
    data_parts = [p for p in message.parts if p.kind == "data"]
    if task.state == "input_required" and data_parts:
        task.state = "working"
        finish(task, data_parts[0].payload.get("targetLength", "short"))
    return task


def finish(task: Task, length: str) -> None:
    text = f"[写作智能体] {length}的源材料摘要："\
           f"已识别主题、提取要点并撰写结论。"
    task.artifact = Artifact(
        name="summary",
        mimeType="text/markdown",
        parts=[Part("text", {"text": text})],
    )
    task.state = "completed"
    print(f"    写作智能体：已完成任务 {task.id}")


def research_agent_flow() -> None:
    print("=" * 72)
    print("阶段 13，第 19 课——研究智能体通过 A2A 调用写作智能体")
    print("=" * 72)

    print("\n--- 研究智能体获取写作智能体名片 ---")
    print(json.dumps({k: WRITER_AGENT_CARD[k] for k in ("name", "url", "skills")}, indent=2, ensure_ascii=False))

    skill = WRITER_AGENT_CARD["skills"][0]
    skill_id = skill["id"]
    print(f"\n  研究智能体将调用技能：{skill_id}")

    msg = Message(role="user", parts=[
        Part("text", {"text": "请总结所附论文。"}),
        Part("file", {"file": {"name": "paper.pdf", "mimeType": "application/pdf",
                                "bytes": base64.b64encode(b"fake-pdf").decode()}}),
    ])
    task = writer_tasks_send(skill_id, msg)
    print(f"  研究智能体：任务状态 = {task.state}")

    if task.state == "input_required":
        print("\n--- 研究智能体补齐缺失数据 ---")
        followup = Message(role="user", parts=[
            Part("data", {"targetLength": "3 段"}),
        ])
        task = writer_tasks_reply(task.id, followup)
        print(f"  研究智能体：任务状态 = {task.state}")

    print("\n--- 研究智能体读取产物 ---")
    if task.artifact:
        print(f"  名称     ：{task.artifact.name}")
        print(f"  MIME 类型：{task.artifact.mimeType}")
        print(f"  内容     ：{task.artifact.parts[0].payload['text']}")

    print("\n--- 观察任务生命周期 ---")
    print(f"  最终状态：{task.state}")
    print(f"  消息数量：{len(task.messages)}")


if __name__ == "__main__":
    research_agent_flow()
