import { createHash } from 'node:crypto';

export type Feedback = { id: string; text: string; source: string };
export type Theme = { id: string; title: string; phrases: string[] };
export type Evidence = { id: string; source: string; quote: string; start: number; end: number };
export type ThemeResult = Theme & { evidence: Evidence[]; distinctSources: number; records: number };
export type Board = { schemaVersion: number; inputSha256: string; records: number; themes: ThemeResult[]; unassigned: Feedback[]; duplicates: { id: string; originalId: string }[] };

export function parseFeedback(text: string): Feedback[] {
  if (typeof text !== 'string' || Buffer.byteLength(text) > 2_000_000) throw new Error('JSONL input limit is 2 MB');
  const ids = new Set<string>();
  const rows: Feedback[] = [];
  for (const [i, line] of text.split(/\r?\n/).entries()) {
    if (!line.trim()) continue;
    let row: Feedback;
    try { row = JSON.parse(line); } catch { throw new Error(`Invalid JSON on physical line ${i + 1}`); }
    if (!row || typeof row.id !== 'string' || !row.id.trim() || row.id.length > 100 || ids.has(row.id) || typeof row.text !== 'string' || !row.text.trim() || row.text.length > 10000 || typeof row.source !== 'string' || !row.source.trim() || row.source.length > 500) throw new Error(`Invalid or duplicate feedback on line ${i + 1}`);
    ids.add(row.id);
    rows.push({ id: row.id, text: row.text, source: row.source });
    if (rows.length > 10000) throw new Error('Record limit exceeded');
  }
  return rows;
}

export function validateThemes(value: unknown): Theme[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 30) throw new Error('Provide 1 to 30 themes');
  const ids = new Set<string>();
  return value.map(row => {
    if (!row || typeof row.id !== 'string' || !/^[a-z][a-z0-9-]{0,50}$/.test(row.id) || ids.has(row.id) || typeof row.title !== 'string' || !row.title.trim() || row.title.length > 100 || !Array.isArray(row.phrases) || !row.phrases.length || row.phrases.length > 20 || row.phrases.some((s: unknown) => typeof s !== 'string' || !s.trim() || s.length > 100 || !/[\p{L}\p{N}]/u.test(s))) throw new Error('Theme needs a unique id, title and bounded word phrases');
    ids.add(row.id);
    return { id: row.id, title: row.title, phrases: [...new Set<string>(row.phrases)] };
  });
}

function tokens(text: string) {
  return [...text.matchAll(/[\p{L}\p{N}]+/gu)].map(match => ({ value: match[0].normalize('NFKC').toLowerCase(), start: match.index!, end: match.index! + match[0].length }));
}

export function findEvidence(row: Feedback, phrase: string): Evidence | null {
  const haystack = tokens(row.text), needle = tokens(phrase);
  if (!needle.length) return null;
  for (let i = 0; i <= haystack.length - needle.length; i++) {
    if (needle.every((token, j) => token.value === haystack[i + j].value)) {
      const start = haystack[i].start, end = haystack[i + needle.length - 1].end;
      return { id: row.id, source: row.source, quote: row.text.slice(start, end), start, end };
    }
  }
  return null;
}

export function buildBoard(rows: Feedback[], themes: Theme[]): Board {
  validateThemes(themes);
  const canonicalRows = parseFeedback(rows.map(row => JSON.stringify(row)).join('\n'));
  const result: ThemeResult[] = themes.map(theme => ({ ...theme, evidence: [], distinctSources: 0, records: 0 }));
  const unassigned: Feedback[] = [], duplicates: Board['duplicates'] = [];
  const seen = new Map<string, string>();
  for (const row of canonicalRows) {
    const key = createHash('sha256').update(JSON.stringify([row.source, row.text.normalize('NFKC').toLowerCase().trim()])).digest('hex');
    if (seen.has(key)) { duplicates.push({ id: row.id, originalId: seen.get(key)! }); continue; }
    seen.set(key, row.id);
    let assigned = false;
    for (const theme of result) {
      const evidence = theme.phrases.map(phrase => findEvidence(row, phrase)).find(Boolean);
      if (evidence) { theme.evidence.push(evidence); assigned = true; }
    }
    if (!assigned) unassigned.push(row);
  }
  for (const theme of result) {
    theme.records = theme.evidence.length;
    theme.distinctSources = new Set(theme.evidence.map(row => row.source)).size;
  }
  result.sort((a, b) => b.distinctSources - a.distinctSources || a.id.localeCompare(b.id));
  return { schemaVersion: 1, inputSha256: createHash('sha256').update(JSON.stringify(canonicalRows)).digest('hex'), records: canonicalRows.length, themes: result, unassigned, duplicates };
}

export function draftIssue(theme: ThemeResult): string {
  const quote = (value: string) => value.replace(/[\r\n]+/g, ' ');
  return '# 调查：' + quote(theme.title) + '\n\n状态：本地草稿，未发布（local draft, not posted）。\n\n' + theme.distinctSources + ' distinct source labels（不同来源标签），对应 ' + theme.records + ' 条匹配记录。来源标签不代表已核实的客户身份。\n\n## 证据\n\n' + theme.evidence.map(e => '- [' + quote(e.id) + '] ' + quote(e.source) + ': ' + JSON.stringify(e.quote)).join('\n') + '\n\n## 下一步\n\n先复现被报告的使用障碍、审阅未匹配反馈并确认具体验收标准，再修改产品。\n';
}

export function renderBoard(board: Board): string {
  const esc = (value: unknown) => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!));
  const cards = board.themes.map(theme => `<section><h2>${esc(theme.title)}</h2><p class="count">${theme.distinctSources} 个不同来源标签 <small> / ${theme.records} 条记录</small></p><details open><summary>检查精确证据</summary>${theme.evidence.map(e => `<blockquote>${esc(e.quote)}<cite>${esc(e.id)} · ${esc(e.source)} · UTF-16 偏移量 ${e.start}..${e.end}</cite></blockquote>`).join('') || '<p>没有匹配证据。</p>'}</details></section>`).join('');
  const unmatched = board.unassigned.map(row => `<li><strong>${esc(row.id)}</strong>: ${esc(row.text)}</li>`).join('');
  return `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>反馈证据看板</title><style>body{font:16px system-ui;max-width:1100px;margin:40px auto;padding:20px;color:#18293e;background:#f6f8fa}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(330px,100%),1fr));gap:20px}section{padding:20px;background:white;border:1px solid #ced8e3}h2{font-size:22px}.count{color:#2956a0;font-weight:600}small{font-weight:400}blockquote{border-left:3px solid #9eb2d0;padding:8px 12px;margin:14px 0}cite{display:block;font-size:12px;margin-top:10px;color:#50677d;overflow-wrap:anywhere}summary{cursor:pointer}li{padding:8px}code{overflow-wrap:anywhere}</style><p>反馈主题看板</p><h1>反馈内容与来源并列展示</h1><p>${board.records} input records（输入记录）；${board.duplicates.length} 条重复记录已排除；${board.unassigned.length} 条记录待分类。主题之间计数可能重叠，不能用于衡量市场需求。</p><div class="grid">${cards}</div><h2>保留未匹配的反馈</h2><ul>${unmatched || '<li>所有去重后的记录均匹配到主题。</li>'}</ul><p>输入指纹：<code>${esc(board.inputSha256)}</code></p></html>`;
}
