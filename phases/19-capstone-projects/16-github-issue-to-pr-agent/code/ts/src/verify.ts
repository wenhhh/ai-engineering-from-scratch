/**
 * GitHub 风格的 HMAC-SHA256 请求体验证。
 * 对原始字节计算摘要，长度相同才调用 timingSafeEqual；缺少头或长度不同直接拒绝。
 * 它验证字节与共享密钥是否匹配，不验证事件头，也不处理时间窗口和重放。
 */

import { createHmac, timingSafeEqual } from "node:crypto";

export function expectedSig(body: Buffer | string, secret: string): string {
  const mac = createHmac("sha256", secret);
  mac.update(body);
  return "sha256=" + mac.digest("hex");
}

export function verifySignature(
  rawBody: Buffer,
  header: string | undefined,
  secret: string,
): boolean {
  if (!header) return false;
  const expected = expectedSig(rawBody, secret);
  const a = Buffer.from(header, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
