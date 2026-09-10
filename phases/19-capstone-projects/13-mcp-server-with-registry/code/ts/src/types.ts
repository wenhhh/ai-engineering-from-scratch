/**
 * JSON-RPC、工具描述、内容块和故障数据类型。
 * 请求 id 为字符串或数字，响应错误可使用 null；方法名和字段保持协议原值。
 * JsonSchema 是本例支持的有限子集；工具注解不是访问控制。
 * 故障 severity 为 p0/p1/p2，acked 表示是否已经确认；数据仅驻留进程内存。
 */

export type JsonRpcRequestId = number | string;
export type JsonRpcResponseId = JsonRpcRequestId | null;

export type JsonRpcRequest = {
  jsonrpc: "2.0";
  id?: JsonRpcRequestId;
  method: string;
  params?: Record<string, unknown>;
};

export type JsonRpcError = {
  code: number;
  message: string;
  data?: unknown;
};

export type JsonRpcResponse = {
  jsonrpc: "2.0";
  id: JsonRpcResponseId;
  result?: unknown;
  error?: JsonRpcError;
};

export type JsonSchema = {
  type?: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  enum?: string[];
  additionalProperties?: boolean;
};

export type ToolAnnotations = {
  readOnlyHint?: boolean;
  destructiveHint?: boolean;
};

export type ToolDescriptor = {
  name: string;
  description: string;
  inputSchema: JsonSchema;
  annotations?: ToolAnnotations;
};

export type ContentBlock = { type: "text"; text: string };

export type ToolArgs = Record<string, unknown>;

export type ToolExecutor = (args: ToolArgs) => ContentBlock[];

export type Incident = {
  id: string;
  severity: "p0" | "p1" | "p2";
  title: string;
  acked: boolean;
};
