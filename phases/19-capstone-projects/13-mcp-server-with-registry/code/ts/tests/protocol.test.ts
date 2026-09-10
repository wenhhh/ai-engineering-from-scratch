/**
 * 固定协议与工具回归测试。只翻译名称和说明，所有断言、夹具、字段和错误匹配不变。
 */

import { test } from "node:test";
import { strict as assert } from "node:assert";
import {
  CLIENT_CAPABILITIES_KEY,
  CLIENT_INFO_KEY,
  dispatch,
  makeContext,
  makeRequest,
  parseRpc,
  PROTOCOL_VERSION,
  PROTOCOL_VERSION_KEY,
  SERVER_INFO_KEY,
  SERVER_NAME,
} from "../src/protocol.js";
import { TOOL_DESCRIPTORS, makeExecutors, makeIncidents } from "../src/tools.js";
import { processLine, replayFixture } from "../src/transport.js";
import type { JsonRpcRequest } from "../src/types.js";

function freshContext() {
  return makeContext(TOOL_DESCRIPTORS, makeExecutors(makeIncidents()));
}

test("server/discover 返回本例固定契约与公共缓存策略", () => {
  const resp = dispatch(freshContext(), makeRequest(1, "server/discover"));
  assert.ok(resp);
  assert.equal(resp.id, 1);
  const result = resp.result as {
    resultType: string;
    supportedVersions: string[];
    capabilities: { tools: { listChanged: boolean } };
    ttlMs: number;
    cacheScope: string;
    _meta: Record<string, { name: string }>;
  };
  assert.equal(result.resultType, "complete");
  assert.deepEqual(result.supportedVersions, [PROTOCOL_VERSION]);
  assert.equal(result.capabilities.tools.listChanged, false);
  assert.equal(result.ttlMs, 3_600_000);
  assert.equal(result.cacheScope, "public");
  assert.equal(SERVER_NAME, "com.example/internal-incidents");
  assert.equal(result._meta[SERVER_INFO_KEY]?.name, SERVER_NAME);
});

test("每个请求都需要 params._meta", () => {
  const resp = dispatch(freshContext(), {
    jsonrpc: "2.0",
    id: 2,
    method: "tools/list",
    params: {},
  });
  assert.ok(resp);
  assert.equal(resp.error?.code, -32602);
});

test("每个请求都需要客户端能力", () => {
  const resp = dispatch(freshContext(), {
    jsonrpc: "2.0",
    id: 3,
    method: "tools/list",
    params: { _meta: { [PROTOCOL_VERSION_KEY]: PROTOCOL_VERSION } },
  });
  assert.ok(resp);
  assert.equal(resp.error?.code, -32602);
});

test("不支持的版本返回准确的 -32022 协商数据", () => {
  const resp = dispatch(freshContext(), makeRequest(4, "tools/list", {}, "2027-01-01"));
  assert.ok(resp);
  assert.equal(resp.error?.code, -32022);
  assert.deepEqual(resp.error?.data, {
    supported: [PROTOCOL_VERSION],
    requested: "2027-01-01",
  });
});

test("缺少版本或版本不是字符串时返回 -32602 且不含协商数据", () => {
  const metas: Array<Record<string, unknown>> = [
    { [CLIENT_CAPABILITIES_KEY]: {} },
    { [PROTOCOL_VERSION_KEY]: 20260728, [CLIENT_CAPABILITIES_KEY]: {} },
    { [PROTOCOL_VERSION_KEY]: [PROTOCOL_VERSION], [CLIENT_CAPABILITIES_KEY]: {} },
  ];
  for (const [index, meta] of metas.entries()) {
    const resp = dispatch(freshContext(), {
      jsonrpc: "2.0",
      id: 40 + index,
      method: "tools/list",
      params: { _meta: meta },
    });
    assert.ok(resp);
    assert.equal(resp.error?.code, -32602);
    assert.equal(resp.error?.data, undefined);
  }
});

test("拒绝格式错误的可选 clientInfo", () => {
  const resp = dispatch(freshContext(), {
    jsonrpc: "2.0",
    id: 5,
    method: "tools/list",
    params: {
      _meta: {
        [PROTOCOL_VERSION_KEY]: PROTOCOL_VERSION,
        [CLIENT_CAPABILITIES_KEY]: {},
        [CLIENT_INFO_KEY]: { name: "missing-version" },
      },
    },
  });
  assert.ok(resp);
  assert.equal(resp.error?.code, -32602);
});

test("tools/list 返回完整、确定且可缓存的结果", () => {
  const resp = dispatch(freshContext(), makeRequest(6, "tools/list"));
  assert.ok(resp);
  const result = resp.result as {
    resultType: string;
    tools: Array<{ name: string; inputSchema: unknown }>;
    ttlMs: number;
    cacheScope: string;
  };
  assert.equal(result.resultType, "complete");
  assert.equal(result.tools.length, 3);
  assert.deepEqual(
    result.tools.map((tool) => tool.name),
    ["incidents_ack", "incidents_get", "incidents_list"],
  );
  assert.equal(result.ttlMs, 300_000);
  assert.equal(result.cacheScope, "public");
  for (const t of result.tools) {
    assert.equal(typeof t.name, "string");
    assert.ok(t.inputSchema);
  }
});

test("tools/call 分派到 incidents_get", () => {
  const resp = dispatch(
    freshContext(),
    makeRequest(7, "tools/call", {
      name: "incidents_get",
      arguments: { id: "INC-101" },
    }),
  );
  assert.ok(resp);
  const result = resp.result as {
    resultType: string;
    isError: boolean;
    content: Array<{ text: string }>;
    _meta: Record<string, { version: string }>;
  };
  assert.equal(result.resultType, "complete");
  assert.equal(result.isError, false);
  assert.equal(result._meta[SERVER_INFO_KEY]?.version, "1.0.0");
  const text = result.content[0]?.text ?? "";
  assert.ok(text.includes("INC-101"));
});

test("未知工具调用返回协议错误 -32602", () => {
  const resp = dispatch(
    freshContext(),
    makeRequest(8, "tools/call", { name: "nope", arguments: {} }),
  );
  assert.ok(resp);
  assert.equal(resp.error?.code, -32602);
  assert.match(resp.error?.message ?? "", /Unknown tool/);
});

test("tools/call 拒绝格式错误的工具名", () => {
  const resp = dispatch(
    freshContext(),
    makeRequest(9, "tools/call", { name: "", arguments: {} }),
  );
  assert.ok(resp);
  assert.equal(resp.error?.code, -32602);
});

test("已知工具按本例声明的 schema 子集返回完整工具错误", () => {
  const cases = [
    { name: "incidents_list", arguments: { severity: "p3" } },
    { name: "incidents_get", arguments: {} },
    { name: "incidents_ack", arguments: { id: 101 } },
    { name: "incidents_list", arguments: { extra: true } },
    { name: "incidents_get", arguments: [] },
  ];
  for (const [index, params] of cases.entries()) {
    const resp = dispatch(
      freshContext(),
      makeRequest(50 + index, "tools/call", params),
    );
    assert.ok(resp);
    assert.equal(resp.error, undefined);
    const result = resp.result as {
      resultType: string;
      isError: boolean;
      content: Array<{ text: string }>;
    };
    assert.equal(result.resultType, "complete");
    assert.equal(result.isError, true);
    assert.match(result.content[0]?.text ?? "", /Invalid arguments/);
  }
});

test("incidents_ack 将 acked 状态设为 true", () => {
  const context = freshContext();
  dispatch(
    context,
    makeRequest(10, "tools/call", {
      name: "incidents_ack",
      arguments: { id: "INC-103" },
    }),
  );
  const resp = dispatch(
    context,
    makeRequest(11, "tools/call", {
      name: "incidents_get",
      arguments: { id: "INC-103" },
    }),
  );
  assert.ok(resp);
  const text = (resp.result as { content: Array<{ text: string }> }).content[0]?.text ?? "";
  assert.ok(text.includes('"acked":true'));
});

test("请求不继承前一次调用的元数据", () => {
  const context = freshContext();
  assert.ok(dispatch(context, makeRequest(12, "tools/list"))?.result);
  const missingMeta = dispatch(context, {
    jsonrpc: "2.0",
    id: 13,
    method: "tools/list",
    params: {},
  });
  assert.equal(missingMeta?.error?.code, -32602);
});

test("JSON-RPC 通知不返回响应", () => {
  const resp = dispatch(freshContext(), {
    jsonrpc: "2.0",
    method: "notifications/tools/list_changed",
  });
  assert.equal(resp, null);
});

test("本例未实现 initialize 和 shutdown 生命周期方法", () => {
  const initialize = dispatch(freshContext(), makeRequest(14, "initialize"));
  const shutdown = dispatch(freshContext(), makeRequest(15, "shutdown"));
  assert.equal(initialize?.error?.code, -32601);
  assert.equal(shutdown?.error?.code, -32601);
});

test("未知方法返回 -32601", () => {
  const resp = dispatch(freshContext(), makeRequest(16, "no/such"));
  assert.ok(resp);
  assert.equal(resp.error?.code, -32601);
});

test("parseRpc 拒绝格式错误的 JSON", () => {
  const r = parseRpc("not json");
  assert.equal(r.ok, false);
});

test("processLine 在解析失败时输出 -32700 错误信封", () => {
  const lines: string[] = [];
  processLine(freshContext(), "not json", (line) => lines.push(line));
  assert.equal(lines.length, 1);
  const parsed = JSON.parse(lines[0]!) as { error?: { code: number } };
  assert.equal(parsed.error?.code, -32700);
});

test("parseRpc 拒绝 id 为 null 的 MCP 请求", () => {
  const result = parseRpc('{"jsonrpc":"2.0","id":null,"method":"tools/list"}');
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.code, -32600);
});

test("replayFixture 重放本例的发现、列表与工具调用请求", () => {
  const msgs: JsonRpcRequest[] = [
    makeRequest(17, "server/discover"),
    makeRequest(18, "tools/list"),
    makeRequest(19, "tools/call", {
      name: "incidents_list",
      arguments: { severity: "p1" },
    }),
  ];
  const replies = replayFixture(freshContext(), msgs);
  assert.equal(replies.length, 3);
  for (const reply of replies) {
    assert.equal((reply.result as { resultType: string }).resultType, "complete");
  }
});
