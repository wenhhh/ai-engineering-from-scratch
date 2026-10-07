// 在自己的工作区实现阶段接口；未实现错误和公开标识保持原值。
export type AddedLine = { file: string; line: number; text: string };
export type Finding = {
  file: string;
  line: number;
  quote: string;
  rule: string;
  severity: "high" | "medium" | "low";
  message: string;
};

import { pathToFileURL } from "node:url";
import path from "node:path";

export function parseDiff(raw: string): any[] {
  throw new Error("Not implemented: parseDiff");
}
export function inspect(lines: AddedLine[]): any[] {
  throw new Error("Not implemented: inspect");
}
export function verify(findings: unknown[], lines: AddedLine[]): any {
  throw new Error("Not implemented: verify");
}
export function merge(findings: Finding[]): any[] {
  throw new Error("Not implemented: merge");
}
export function render(findings: Finding[], rejected = 0): string {
  throw new Error("Not implemented: render");
}
export function escapeHTML(value: string): string {
  throw new Error("Not implemented: escapeHTML");
}
export const fixture = "";
