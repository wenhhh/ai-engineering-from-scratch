/**
 * 运维排障示例的回归测试。
 * 只翻译名称与说明；签名载荷、密钥夹具、断言、错误值和匹配正则不变。
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  REPLAY_WINDOW_SECONDS,
  signForTesting,
  verifySlackSignature,
} from "../src/slack_verify.js";

const SECRET = "shh";

describe("verifySlackSignature", () => {
  it("接受刚签名的请求体", () => {
    const ts = String(Math.floor(Date.now() / 1000));
    const body = "command=%2Foncall&text=test";
    const sig = signForTesting(SECRET, ts, body);
    const verdict = verifySlackSignature({
      signingSecret: SECRET,
      timestamp: ts,
      signature: sig,
      rawBody: body,
      nowSeconds: Number(ts),
    });
    assert.equal(verdict.ok, true);
  });

  it("拒绝被篡改的签名", () => {
    const ts = String(Math.floor(Date.now() / 1000));
    const body = "command=%2Foncall&text=test";
    const sig = signForTesting(SECRET, ts, body);
    const tampered = sig.slice(0, -1) + (sig.endsWith("0") ? "1" : "0");
    const verdict = verifySlackSignature({
      signingSecret: SECRET,
      timestamp: ts,
      signature: tampered,
      rawBody: body,
      nowSeconds: Number(ts),
    });
    assert.equal(verdict.ok, false);
    if (!verdict.ok) assert.equal(verdict.reason, "mismatch");
  });

  it("拒绝超出五分钟时间窗口的时间戳", () => {
    const ts = String(Math.floor(Date.now() / 1000));
    const body = "command=%2Foncall&text=test";
    const sig = signForTesting(SECRET, ts, body);
    const verdict = verifySlackSignature({
      signingSecret: SECRET,
      timestamp: ts,
      signature: sig,
      rawBody: body,
      nowSeconds: Number(ts) + REPLAY_WINDOW_SECONDS + 1,
    });
    assert.equal(verdict.ok, false);
    if (!verdict.ok) assert.equal(verdict.reason, "stale");
  });

  it("拒绝非数值时间戳", () => {
    const verdict = verifySlackSignature({
      signingSecret: SECRET,
      timestamp: "not-a-number",
      signature: "v0=deadbeef",
      rawBody: "",
      nowSeconds: 0,
    });
    assert.equal(verdict.ok, false);
    if (!verdict.ok) assert.equal(verdict.reason, "bad-timestamp");
  });

  it("签名长度不符时拒绝；此测试不测量计时侧信道", () => {
    const ts = String(Math.floor(Date.now() / 1000));
    const verdict = verifySlackSignature({
      signingSecret: SECRET,
      timestamp: ts,
      signature: "v0=short",
      rawBody: "body",
      nowSeconds: Number(ts),
    });
    assert.equal(verdict.ok, false);
    if (!verdict.ok) assert.equal(verdict.reason, "length-mismatch");
  });
});
