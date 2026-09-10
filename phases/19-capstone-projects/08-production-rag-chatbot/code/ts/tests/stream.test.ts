/**
 * SSE 聊天示例回归测试：只翻译测试名称与说明。
 * 原始断言、输入夹具、英文回答契约、事件和消息数量保持原样。
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  encodeSseFrame,
  parseSseStream,
  retrieve,
  tokenizeAnswer,
} from "../src/stream.js";

describe("encodeSseFrame", () => {
  it("编码事件和 JSON 数据，以 SSE 双换行结束", () => {
    const frame = encodeSseFrame("token", { text: "hi" });
    assert.equal(frame, 'event: token\ndata: {"text":"hi"}\n\n');
  });

  it("经 parseSseStream 解析后可恢复事件", () => {
    const concat =
      encodeSseFrame("session", { sessionId: "s-1" }) +
      encodeSseFrame("token", { text: "a" }) +
      encodeSseFrame("token", { text: "b" }) +
      encodeSseFrame("done", { totalTokens: 2 });
    const events = parseSseStream(concat);
    assert.equal(events.length, 4);
    assert.equal(events[0]?.event, "session");
    assert.equal(events[3]?.event, "done");
  });
});

describe("retrieve", () => {
  it("提高与策略标签相符的条目得分", () => {
    const results = retrieve("erasure", "GDPR", 3);
    assert.ok(results.length > 0);
    const top = results[0];
    assert.ok(top);
    assert.equal(top.docId, "GDPR-Art-17");
  });

  it("最多返回 k 条引用", () => {
    const results = retrieve("data", "GDPR", 2);
    assert.ok(results.length <= 2);
  });
});

describe("tokenizeAnswer", () => {
  it("没有引用时返回无匹配结果的原文消息", () => {
    const tokens = tokenizeAnswer("anything", []);
    const joined = tokens.join("");
    assert.match(joined, /No matching policy found for "anything"\./);
  });

  it("有引用时以第一条引用构造回答开头", () => {
    const tokens = tokenizeAnswer("q", [
      { docId: "GDPR-Art-17", page: 1, snippet: "snippet text", score: 5 },
    ]);
    const joined = tokens.join("");
    assert.match(joined, /^Per GDPR-Art-17, snippet text$/);
  });

  it("有更多引用时添加 See also（另参见）尾句", () => {
    const tokens = tokenizeAnswer("q", [
      { docId: "A", page: 1, snippet: "x", score: 1 },
      { docId: "B", page: 2, snippet: "y", score: 1 },
      { docId: "C", page: 3, snippet: "z", score: 1 },
    ]);
    const joined = tokens.join("");
    assert.match(joined, /See also B, C\./);
  });
});
