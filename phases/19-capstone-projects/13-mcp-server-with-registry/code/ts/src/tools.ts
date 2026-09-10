/**
 * 三个故障事件工具及内存执行器。
 * 工具描述与故障标题属于协议数据，保留原值；下方提供中文释义。
 * readOnlyHint/destructiveHint 只是提示。本 TS 示例没有强制授权，确认操作直接修改内存 acked 标记；
 * 描述中的“仅授权调用者”是期望，不是已经实现的检查。
 */

import type { ContentBlock, Incident, ToolArgs, ToolDescriptor, ToolExecutor } from "./types.js";

export function makeIncidents(): Record<string, Incident> {
  // 故障夹具：checkout 500s＝结账服务返回 500；slow dashboard＝仪表盘缓慢；rate-limit storm＝大量限流。
  return {
    "INC-101": { id: "INC-101", severity: "p0", title: "checkout 500s", acked: false },
    "INC-102": { id: "INC-102", severity: "p2", title: "slow dashboard", acked: true },
    "INC-103": { id: "INC-103", severity: "p1", title: "rate-limit storm", acked: false },
  };
}

export const TOOL_DESCRIPTORS: ToolDescriptor[] = [
  {
    name: "incidents_list",
    description:
      // 工具说明：列举近期故障或按严重级别过滤；不用于按单个 ID 查询。
      "Use when listing recent incidents or filtering by severity. Do not use to look up a single id.",
    inputSchema: {
      type: "object",
      properties: { severity: { type: "string", enum: ["p0", "p1", "p2"] } },
      required: [],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: "incidents_get",
    // 工具说明：按 ID 获取一个故障，不用于列举。
    description: "Use to fetch one incident by id. Do not use for listing.",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: "incidents_ack",
    // 工具说明：确认故障，是写操作，期望仅允许授权调用者；当前未实现权限验证。
    description: "Use to acknowledge an incident. Write op; only authorized callers.",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
      additionalProperties: false,
    },
    annotations: { destructiveHint: true, readOnlyHint: false },
  },
];

export function makeExecutors(store: Record<string, Incident>): Record<string, ToolExecutor> {
  const execList = (args: ToolArgs): ContentBlock[] => {
    const sev = typeof args.severity === "string" ? args.severity : undefined;
    const items = Object.values(store).filter((i) => !sev || i.severity === sev);
    return [{ type: "text", text: JSON.stringify(items) }];
  };

  // 查询执行器的 not found 表示未找到故障；错误文本保留。
  const execGet = (args: ToolArgs): ContentBlock[] => {
    const id = String(args.id ?? "");
    const inc = store[id];
    if (!inc) throw new Error(`not found: ${id}`);
    return [{ type: "text", text: JSON.stringify(inc) }];
  };

  // 确认执行器同样保留 not found 错误；只修改内存数据。
  const execAck = (args: ToolArgs): ContentBlock[] => {
    const id = String(args.id ?? "");
    const inc = store[id];
    if (!inc) throw new Error(`not found: ${id}`);
    inc.acked = true;
    return [{ type: "text", text: JSON.stringify({ id, acked: true }) }];
  };

  return {
    incidents_list: execList,
    incidents_get: execGet,
    incidents_ack: execAck,
  };
}
