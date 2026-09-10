/**
 * 代码分块、排名条目和查询响应的类型定义。
 * 字段名用于模块通信与 JSON 接口，保持英文；anchor 将仓库、文件路径与行号组合为引用位置。
 */

// startLine / endLine 为起止行号；symbol 为符号名；body / summary 为参与检索的正文与摘要。
export type Chunk = {
  repo: string;
  path: string;
  startLine: number;
  endLine: number;
  symbol: string;
  body: string;
  summary: string;
};

export type RankedChunk = { chunk: Chunk; score: number };

export type QueryResponse = {
  query: string;
  denseTop: string[];
  sparseTop: string[];
  fusedTop: string[];
  citations: { anchor: string; score: number }[];
};

export function anchor(c: Chunk): string {
  return `${c.repo}/${c.path}:${c.startLine}-${c.endLine}`;
}
