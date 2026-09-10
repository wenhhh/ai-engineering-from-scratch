/**
 * SSE 聊天示例的数据契约。Turn 是一条用户或助手消息；Session 保存会话与消息列表。
 * Citation 记录文档 ID、页码、片段和检索分数；KbEntry 是带策略标签的知识库条目。
 * SseEvent 的 event 与 data 为协议字段；类型和状态值保持原样。
 */

export type Turn = {
  role: "user" | "assistant";
  content: string;
  ts: number;
};

export type Session = {
  id: string;
  role: string;
  jurisdiction: string;
  turns: Turn[];
  createdAt: number;
};

export type Citation = {
  docId: string;
  page: number;
  snippet: string;
  score: number;
};

export type KbEntry = {
  docId: string;
  page: number;
  text: string;
  tag: string;
};

export type SseEvent = {
  event: string;
  data: unknown;
};
