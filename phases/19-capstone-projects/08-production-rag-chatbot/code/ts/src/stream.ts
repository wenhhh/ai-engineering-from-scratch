/**
 * SSE 帧编解码、英文关键词检索与固定回答拼接。
 * 知识库是固定原文的简化条目，没有外部法规更新或证据核验。政策标签只增加分数，
 * 不排除其他标签的结果；retrieve 没有角色参数，不能当作权限隔离。
 * 英文语料、回答前缀和分词规则被排名、事件计数及测试使用，因此保留并加中文解释。
 */

import type { Citation, KbEntry, SseEvent } from "./types.js";

export const KB: KbEntry[] = [
  {
    docId: "GDPR-Art-15",
    page: 1,
    // 原文条目释义：数据主体有权获知其个人数据是否正在被处理；不是完整法律解释。
    text: "The data subject has the right to obtain confirmation as to whether personal data are being processed.",
    tag: "GDPR",
  },
  {
    docId: "GDPR-Art-17",
    page: 1,
    // 原文条目释义：数据主体享有要求不无故拖延删除个人数据的权利；实际条件与例外未建模。
    text: "The data subject shall have the right to obtain erasure of personal data without undue delay.",
    tag: "GDPR",
  },
  {
    docId: "HIPAA-164.502",
    page: 14,
    // 原文条目释义：受规管实体不得在许可范围之外使用或披露受保护健康信息。
    text: "Covered entity may not use or disclose protected health information except as permitted.",
    tag: "HIPAA",
  },
  {
    docId: "SOC2-CC6.1",
    page: 7,
    // 原文条目释义：逻辑访问控制将信息资产的访问限制在获授权用户范围。
    text: "Logical access controls restrict access to information assets to authorized users.",
    tag: "SOC2",
  },
];

export function retrieve(query: string, jurisdiction: string, k: number): Citation[] {
  const tokens = new Set(query.toLowerCase().split(/\W+/).filter(Boolean));
  let scored = KB.map((doc) => {
    const docTokens = doc.text.toLowerCase().split(/\W+/);
    let overlap = 0;
    for (const t of docTokens) if (tokens.has(t)) overlap += 1;
    // 标签相符仅加 2 分，不是访问过滤；跨标签内容仍可能返回。
    const boost = doc.tag === jurisdiction ? 2 : 0;
    const score = overlap + boost;
    return {
      citation: {
        docId: doc.docId,
        page: doc.page,
        snippet: doc.text,
        score,
      },
      overlap,
      score,
    };
  });
  scored = scored.filter((s) => s.overlap > 0);
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, k).map((s) => s.citation);
}

// 固定回答拼接后按空白拆片；不是模型 tokenizer，totalTokens 也不是模型计费词元数。
export function tokenizeAnswer(query: string, citations: Citation[]): string[] {
  const first = citations[0];
  const lead =
    first === undefined
      // 无结果回复原文：未找到与该查询匹配的政策。测试精确匹配此句，因此保留。
      ? `No matching policy found for "${query}".`
      // 有结果回复原文：依据指定文档，复述其片段。保留原文以保持事件片段数量和测试。
      : `Per ${first.docId}, ${first.snippet}`;
  const rest = citations.slice(1);
  const tail =
    rest.length > 0
      // 附加提示 See also 的含义是“另参见”；文档 ID 原样保留。
      ? ` See also ${rest.map((c) => c.docId).join(", ")}.`
      : "";
  return (lead + tail).split(/(\s+)/).filter((t) => t.length > 0);
}

export function encodeSseFrame(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

// 解析完整响应文本中的简化 SSE 帧，不是任意网络分块的增量解码器。
export function parseSseStream(text: string): SseEvent[] {
  const out: SseEvent[] = [];
  for (const block of text.split("\n\n")) {
    if (!block.trim()) continue;
    let eventName = "message";
    const dataLines: string[] = [];
    for (const line of block.split("\n")) {
      if (line.startsWith("event: ")) eventName = line.slice("event: ".length);
      else if (line.startsWith("data: ")) dataLines.push(line.slice("data: ".length));
    }
    if (dataLines.length === 0) continue;
    let data: unknown;
    try {
      data = JSON.parse(dataLines.join("\n"));
    } catch {
      data = dataLines.join("\n");
    }
    out.push({ event: eventName, data });
  }
  return out;
}
