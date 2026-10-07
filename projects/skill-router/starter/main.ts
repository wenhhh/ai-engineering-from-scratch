// 在学习者工作区补全函数；未实现错误保持原值。
// 路由结果只表示选择建议，不会执行技能。目录中的技能指令、名称、描述、关键词、权限、请求夹具和错误值均保留原值，避免改变评分及返回 JSON。分词只识别 ASCII 字母与数字；纯中文请求不代表具备中文词法或语义路由能力。
import { pathToFileURL } from "node:url";
import path from "node:path";

export function tokens(...args: unknown[]): string[] {
  throw new Error("Not implemented: tokens");
}
export function parseSkill(...args: unknown[]): unknown {
  throw new Error("Not implemented: parseSkill");
}
export function matchPath(...args: unknown[]): boolean {
  throw new Error("Not implemented: matchPath");
}
export function rank(...args: unknown[]): any[] {
  throw new Error("Not implemented: rank");
}
export function plan(...args: unknown[]): string[] {
  throw new Error("Not implemented: plan");
}
export function route(...args: unknown[]): any {
  throw new Error("Not implemented: route");
}
export const catalog: any[] = [];
