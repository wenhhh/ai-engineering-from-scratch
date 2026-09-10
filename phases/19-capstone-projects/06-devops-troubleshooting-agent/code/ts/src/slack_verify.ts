/**
 * Slack 风格的 v0 请求签名验证与测试签名生成器。
 * 按原始时间戳及原始请求体计算 HMAC-SHA256，再比较签名；这些输入不可翻译或重新编码。
 * 五分钟检查只是时间偏差窗口，没有记录已经用过的签名，因此窗口内重复请求仍可能通过。
 * 签名验证也不等于审批者授权验证。
 */

import { createHmac, timingSafeEqual } from "node:crypto";
import type { SignatureVerdict } from "./types.js";

export const SIGNATURE_VERSION = "v0";
export const REPLAY_WINDOW_SECONDS = 60 * 5;

export type VerifyArgs = {
  signingSecret: string;
  timestamp: string;
  signature: string;
  rawBody: string;
  nowSeconds: number;
};

export function verifySlackSignature(args: VerifyArgs): SignatureVerdict {
  const ts = Number(args.timestamp);
  // 拒绝无法转成有限数值的时间戳；保留 bad-timestamp 枚举。
  if (!Number.isFinite(ts)) return { ok: false, reason: "bad-timestamp" };
  if (Math.abs(args.nowSeconds - ts) > REPLAY_WINDOW_SECONDS) {
    // 时间偏差超过窗口，返回 stale。
    return { ok: false, reason: "stale" };
  }
  const base = `${SIGNATURE_VERSION}:${args.timestamp}:${args.rawBody}`;
  const computed =
    `${SIGNATURE_VERSION}=` +
    createHmac("sha256", args.signingSecret).update(base).digest("hex");
  const got = Buffer.from(args.signature);
  const want = Buffer.from(computed);
  // 签名长度不符时提前拒绝；只有同长度内容才进入 timingSafeEqual。
  if (got.length !== want.length) return { ok: false, reason: "length-mismatch" };
  // 同长度签名内容不符时返回 mismatch。
  if (!timingSafeEqual(got, want)) return { ok: false, reason: "mismatch" };
  return { ok: true };
}

// 为测试构造签名，不能当作来源可信或审批授权的证明。
export function signForTesting(
  signingSecret: string,
  timestamp: string,
  rawBody: string,
): string {
  const base = `${SIGNATURE_VERSION}:${timestamp}:${rawBody}`;
  return (
    `${SIGNATURE_VERSION}=` +
    createHmac("sha256", signingSecret).update(base).digest("hex")
  );
}
