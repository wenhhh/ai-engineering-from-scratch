// 阶段 13，第 19 课——A2A 智能体间通信协议，TypeScript 版本。
//
// 研究智能体通过 A2A 调用写作智能体：
//   1. 研究智能体获取写作智能体的 Agent Card（智能体名片）
//   2. 提交包含文本、文件和数据部分的 Task（任务）
//   3. 写作智能体依次进入处理中、等待补充输入、处理中、已完成状态
//   4. 研究智能体收到 Artifact（产物）
//
// 仅依赖标准库；用进程内传递代替经 HTTP 发送的 JSON-RPC 请求。
// 协议字段、状态枚举、技能 ID 和模拟 PDF 字节保持原样；short 表示简短。
// 演示只生成固定文本，不会读取或总结真实论文。
//
// 规范参考：
//   A2A 协议            https://a2aproject.github.io/A2A/specification
//   智能体名片结构       https://a2aproject.github.io/A2A/specification/#agent-card
//
// 运行：npx tsx code/main.ts

import { randomUUID } from "node:crypto";

type Capabilities = { streaming: boolean; pushNotifications: boolean };

type Skill = {
  id: string;
  name: string;
  description: string;
  inputModes: string[];
  outputModes: string[];
};

type AgentCard = {
  schemaVersion: string;
  name: string;
  description: string;
  url: string;
  version: string;
  skills: Skill[];
  capabilities: Capabilities;
};

const WRITER_AGENT_CARD: AgentCard = {
  schemaVersion: "1.0",
  name: "writer-agent",
  description: "根据源材料撰写技术摘要和报告。",
  url: "https://writer.example.com/a2a",
  version: "1.0.0",
  skills: [
    {
      id: "draft_report",
      name: "撰写报告",
      description: "根据提供的源材料和目标长度生成报告。",
      inputModes: ["text", "file", "data"],
      outputModes: ["text", "artifact"],
    },
  ],
  capabilities: { streaming: true, pushNotifications: false },
};

type TextPart = { kind: "text"; payload: { text: string } };
type FilePart = {
  kind: "file";
  payload: { file: { name: string; mimeType: string; bytes: string } };
};
type DataPart = { kind: "data"; payload: Record<string, unknown> };
type Part = TextPart | FilePart | DataPart;

type Message = { role: "user" | "agent"; parts: Part[] };

type Artifact = { name: string; mimeType: string; parts: Part[] };

type TaskState =
  | "submitted"
  | "working"
  | "input_required"
  | "completed"
  | "failed"
  | "canceled";

type Task = {
  id: string;
  state: TaskState;
  messages: Message[];
  artifact: Artifact | null;
};

const TASK_STORE = new Map<string, Task>();

function newTask(): Task {
  const id = `task_${randomUUID().replace(/-/g, "").slice(0, 10)}`;
  const task: Task = { id, state: "submitted", messages: [], artifact: null };
  TASK_STORE.set(id, task);
  return task;
}

function findDataPart(message: Message): DataPart | undefined {
  return message.parts.find((p): p is DataPart => p.kind === "data");
}

function finish(task: Task, length: string): void {
  const text =
    `[写作智能体] ${length}的源材料摘要：` +
    `已识别主题、提取要点并撰写结论。`;
  task.artifact = {
    name: "summary",
    mimeType: "text/markdown",
    parts: [{ kind: "text", payload: { text } }],
  };
  task.state = "completed";
  console.log(`    写作智能体：已完成任务 ${task.id}`);
}

function writerTasksSend(skillId: string, message: Message): Task {
  const task = newTask();
  task.state = "working";
  task.messages.push(message);
  console.log(`    写作智能体：开始任务 ${task.id}，技能=${skillId}`);

  const data = findDataPart(message);
  if (!data || !("targetLength" in data.payload)) {
    task.state = "input_required";
    task.messages.push({
      role: "agent",
      parts: [
        {
          kind: "text",
          payload: { text: "请在数据部分中提供 targetLength（目标长度）。" },
        },
      ],
    });
    console.log(`    写作智能体：已暂停，等待补充输入（input_required）`);
  } else {
    finish(task, String(data.payload.targetLength));
  }
  return task;
}

function writerTasksReply(taskId: string, message: Message): Task {
  const task = TASK_STORE.get(taskId);
  if (!task) throw new Error(`unknown task ${taskId}`);
  task.messages.push(message);
  const data = findDataPart(message);
  if (task.state === "input_required" && data) {
    task.state = "working";
    finish(task, String(data.payload.targetLength ?? "short"));
  }
  return task;
}

function researchAgentFlow(): void {
  console.log("=".repeat(72));
  console.log("阶段 13，第 19 课——研究智能体通过 A2A 调用写作智能体（TypeScript 版）");
  console.log("=".repeat(72));

  console.log("\n--- 研究智能体获取写作智能体名片 ---");
  console.log(
    JSON.stringify(
      {
        name: WRITER_AGENT_CARD.name,
        url: WRITER_AGENT_CARD.url,
        skills: WRITER_AGENT_CARD.skills,
      },
      null,
      2,
    ),
  );

  const skill = WRITER_AGENT_CARD.skills[0];
  const skillId = skill.id;
  console.log(`\n  研究智能体将调用技能：${skillId}`);

  const fakePdfBytes = Buffer.from("fake-pdf").toString("base64");
  const initialMessage: Message = {
    role: "user",
    parts: [
      { kind: "text", payload: { text: "请总结所附论文。" } },
      {
        kind: "file",
        payload: {
          file: { name: "paper.pdf", mimeType: "application/pdf", bytes: fakePdfBytes },
        },
      },
    ],
  };
  let task = writerTasksSend(skillId, initialMessage);
  console.log(`  研究智能体：任务状态 = ${task.state}`);

  if (task.state === "input_required") {
    console.log("\n--- 研究智能体补齐缺失数据 ---");
    const followup: Message = {
      role: "user",
      parts: [{ kind: "data", payload: { targetLength: "3 段" } }],
    };
    task = writerTasksReply(task.id, followup);
    console.log(`  研究智能体：任务状态 = ${task.state}`);
  }

  console.log("\n--- 研究智能体读取产物 ---");
  if (task.artifact) {
    const firstPart = task.artifact.parts[0];
    console.log(`  名称     ：${task.artifact.name}`);
    console.log(`  MIME 类型：${task.artifact.mimeType}`);
    if (firstPart.kind === "text") {
      console.log(`  内容     ：${firstPart.payload.text}`);
    }
  }

  console.log("\n--- 观察任务生命周期 ---");
  console.log(`  最终状态：${task.state}`);
  console.log(`  消息数量：${task.messages.length}`);
}

researchAgentFlow();
