/**
 * span 与汇总测试。仅翻译测试名称和说明，所有断言与数值夹具保持原样。
 */

import { strict as assert } from "node:assert";
import { test } from "node:test";
import { ObservabilityStore, RingBuffer, normaliseSpan } from "../src/spans.js";

test("未满的环形缓冲区保留全部条目", () => {
  const rb = new RingBuffer<number>(3);
  rb.push(1);
  rb.push(2);
  assert.deepEqual(rb.snapshot(), [1, 2]);
  assert.equal(rb.size(), 2);
  assert.equal(rb.isFull(), false);
});

test("环形缓冲区满后淘汰最早条目", () => {
  const rb = new RingBuffer<number>(3);
  rb.push(1);
  rb.push(2);
  rb.push(3);
  rb.push(4);
  assert.deepEqual(rb.snapshot(), [2, 3, 4]);
  assert.equal(rb.isFull(), true);
});

test("多次写入后仍保持正确淘汰顺序", () => {
  const rb = new RingBuffer<number>(4);
  for (let i = 0; i < 100; i++) rb.push(i);
  assert.deepEqual(rb.snapshot(), [96, 97, 98, 99]);
});

test("环形缓冲区拒绝非正容量", () => {
  assert.throws(() => new RingBuffer<number>(0));
  assert.throws(() => new RingBuffer<number>(-1));
});

test("normaliseSpan 拒绝测试给定的不完整输入", () => {
  assert.equal(normaliseSpan(null), null);
  assert.equal(normaliseSpan({}), null);
  assert.equal(
    normaliseSpan({ attributes: { "gen_ai.system": "openai" } }),
    null,
  );
});

test("normaliseSpan 接受测试给定的 GenAI 字段结构", () => {
  const span = normaliseSpan({
    trace_id: "t-1",
    span_id: "s-1",
    name: "chat.completion",
    start_time_unix_nano: 1_000,
    end_time_unix_nano: 2_000,
    status: "OK",
    attributes: {
      "gen_ai.system": "openai",
      "gen_ai.request.model": "gpt-4o-mini",
      "gen_ai.operation.name": "chat",
      "gen_ai.usage.input_tokens": 100,
      "gen_ai.usage.output_tokens": 50,
    },
  });
  assert.ok(span);
  assert.equal(span?.attributes["gen_ai.request.model"], "gpt-4o-mini");
});

test("ObservabilityStore 统计接收、拒绝与保留数量", () => {
  const store = new ObservabilityStore(4);
  store.ingest({
    attributes: {
      "gen_ai.system": "openai",
      "gen_ai.request.model": "gpt-4o-mini",
      "gen_ai.operation.name": "chat",
    },
  });
  store.ingest({ bad: true });
  const c = store.counters();
  assert.equal(c.accepted, 1);
  assert.equal(c.rejected, 1);
  assert.equal(c.held, 1);
});
