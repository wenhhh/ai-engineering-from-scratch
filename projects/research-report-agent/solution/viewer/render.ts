// 第 6 阶段的带类型报告渲染器，使用 Node 内置类型剥离功能执行。
// 配套课程：projects/research-report-agent/stages/06-publish-the-report/docs/en.md
// 输入遵循 Python report.json 数据契约，不作为可执行标记处理。
// 原生 HTML details 与 CSS 聚焦／悬停实现无需额外依赖的交互。
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export interface Sentence { text: string; cites: string[] }
export interface Section { facet_id: string; heading: string; sentences: Sentence[] }
export interface Snippet { id: string; doc_id: string; start: number; end: number; text: string; score: number }
export interface Source { id: string; title: string; source_url: string; published: string; text: string }
export interface Trace { run_id: string; terminal_state: string; steps: { name: string; ms: number; detail: Record<string, unknown> }[]; counts: Record<string, number>; budget: Record<string, number> }
export interface ReportPayload { schema_version: 1; question: string; sections: Section[]; snippets: Record<string, Snippet>; documents: Source[]; trace: Trace | null }

export function escapeHtml(value: unknown): string {
  return String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}
export function safeUrl(value: string): string {
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) ? escapeHtml(url.href) : '#'; }
  catch { return '#'; }
}
export function validatePayload(data: unknown): asserts data is ReportPayload {
  if (!data || typeof data !== 'object') throw new Error('report must be an object');
  const p = data as ReportPayload;
  if (p.schema_version !== 1 || typeof p.question !== 'string' || !Array.isArray(p.sections) || !Array.isArray(p.documents) || !p.snippets || typeof p.snippets !== 'object') throw new Error('unsupported report schema');
  const sources = new Map(p.documents.map(doc => [doc.id, doc]));
  for (const section of p.sections) {
    if (typeof section.heading !== 'string' || !Array.isArray(section.sentences)) throw new Error('invalid report section');
    for (const sentence of section.sentences) {
      if (typeof sentence.text !== 'string' || !Array.isArray(sentence.cites) || !sentence.cites.length) throw new Error('sentence needs citations');
      for (const id of sentence.cites) {
        const snippet = p.snippets[id];
        const source = snippet && sources.get(snippet.doc_id);
        if (!snippet || !source) throw new Error(`unresolved citation: ${id}`);
        // Python 偏移量按 Unicode 码点计数；JavaScript 字符串按 UTF-16 单元计数。
        if (!Number.isInteger(snippet.start) || !Number.isInteger(snippet.end) || snippet.start < 0 || snippet.end < snippet.start || [...source.text].slice(snippet.start, snippet.end).join('') !== snippet.text) throw new Error(`source span mismatch: ${id}`);
      }
    }
  }
}

const style = `
:root{color-scheme:light dark;--bg:#fbfaf7;--ink:#242722;--muted:#666c63;--line:#d8ddd2;--panel:#f0f3eb;--accent:#286948}
@media(prefers-color-scheme:dark){:root{--bg:#151b17;--ink:#e7ede5;--muted:#a7b5a6;--line:#364839;--panel:#223127;--accent:#a4d7ae}}
*{box-sizing:border-box}body{font:17px/1.65 Georgia,serif;background:var(--bg);color:var(--ink);margin:0;padding:42px 22px}article{max-width:850px;margin:auto}h1{font-size:clamp(1.8rem,4vw,2.7rem);line-height:1.18;margin:.5rem 0 1.25rem;max-width:760px}h2{font-size:1.2rem;margin-top:1.9rem}a{color:var(--accent);overflow-wrap:anywhere}p{max-width:740px}.eyebrow,.meta,.status,summary,th,td{font-family:ui-monospace,monospace}.eyebrow{font-size:11px;letter-spacing:.14em;color:var(--accent)}.meta{font-size:12px;color:var(--muted)}.status{display:inline-block;border:1px solid var(--line);border-radius:4px;padding:3px 9px;font-size:11px}.summary{display:flex;flex-wrap:wrap;gap:10px 18px;align-items:center;border-bottom:1px solid var(--line);padding:0 0 20px;margin-bottom:22px}.citation{display:inline}sup{font-size:.65em;margin-left:3px}sup a{padding:3px;border-radius:3px;text-decoration:none}sup a:focus-visible{outline:2px solid var(--accent)}.popover{display:none;position:fixed;bottom:22px;left:50%;transform:translateX(-50%);width:min(600px,calc(100vw - 40px));max-height:42vh;overflow:auto;background:var(--panel);border:1px solid var(--accent);padding:18px 22px;font:15px/1.5 Georgia,serif;box-shadow:0 8px 50px #0003;z-index:2}.citation:hover .popover,.citation:focus-within .popover{display:block}.popover strong{display:block;font:11px/1.4 ui-monospace,monospace;color:var(--accent);margin-bottom:8px}.footnotes{padding-left:24px}.footnotes li{padding:10px 0;border-bottom:1px solid var(--line);font-size:14px}.footnotes li:target{background:var(--panel)}blockquote{margin:0 0 5px}.sources{font-size:14px;padding-left:22px}details{border:1px solid var(--line);padding:14px 18px;margin:20px 0;background:var(--panel)}summary{cursor:pointer;font-size:12px}table{width:100%;border-collapse:collapse;margin-top:12px;text-align:left}td,th{font-size:12px;padding:7px;border-bottom:1px solid var(--line)}.trace-detail{overflow-wrap:anywhere;font-size:11px}footer{margin-top:32px;border-top:1px solid var(--line);padding-top:16px;font-size:12px;color:var(--muted)}@media print{.popover{display:none!important}details{display:block}body{padding:0}.footnotes li{break-inside:avoid}}
`;

export function renderReport(input: unknown): string {
  validatePayload(input);
  const p = input;
  const docs = new Map(p.documents.map(doc => [doc.id, doc]));
  const numbers = new Map<string, number>();
  for (const section of p.sections) for (const sentence of section.sentences) for (const id of sentence.cites) if (!numbers.has(id)) numbers.set(id, numbers.size + 1);
  let occurrence = 0;
  const sections = p.sections.map(section => `<section><h2>${escapeHtml(section.heading)}</h2><p>${section.sentences.map(sentence => {
    const refs = sentence.cites.map(id => {
      const n = numbers.get(id)!;
      const sn = p.snippets[id];
      const doc = docs.get(sn.doc_id)!;
      const marker = `evidence-${++occurrence}`;
      return `<span class="citation"><sup><a href="#fn-${n}" aria-describedby="${marker}">[${n}]</a></sup><span id="${marker}" role="tooltip" class="popover"><strong>来源 ${n}：${escapeHtml(doc.title)}</strong>${escapeHtml(sn.text)}<span class="meta"> · 字符 ${sn.start}-${sn.end}</span></span></span>`;
    }).join('');
    return escapeHtml(sentence.text.replace(/[.!?]+$/, '')) + refs + '.';
  }).join(' ')}</p></section>`).join('\n');
  const notes = [...numbers].map(([id, n]) => {
    const sn = p.snippets[id]; const doc = docs.get(sn.doc_id)!;
    return `<li id="fn-${n}"><blockquote>${escapeHtml(sn.text)}</blockquote><a href="${safeUrl(doc.source_url)}">${escapeHtml(doc.title)}</a> <span class="meta">${escapeHtml(sn.doc_id)} 字符 ${sn.start}-${sn.end}</span></li>`;
  }).join('\n');
  const used = [...new Set([...numbers.keys()].map(id => p.snippets[id].doc_id))];
  const sources = used.map(id => { const d = docs.get(id)!; return `<li><a href="${safeUrl(d.source_url)}">${escapeHtml(d.title)}</a> <span class="meta">${escapeHtml(d.published)}</span></li>`; }).join('\n');
  const trace = p.trace;
  const traceHtml = trace ? `<details><summary>运行轨迹：${trace.steps.length} 个步骤 · ${escapeHtml(trace.run_id)}</summary><table><thead><tr><th>步骤</th><th>耗时</th><th>详情</th></tr></thead><tbody>${trace.steps.map(s => `<tr><td>${escapeHtml(s.name)}</td><td>${s.ms.toFixed(2)} ms</td><td class="trace-detail">${escapeHtml(JSON.stringify(s.detail))}</td></tr>`).join('')}</tbody></table><p class="meta">预算：${escapeHtml(JSON.stringify(trace.budget))}</p></details>` : '';
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(p.question)}</title><style>${style}</style></head><body><article><div class="eyebrow">研究报告 / 证据账本</div><h1>${escapeHtml(p.question)}</h1><div class="summary"><span class="status">${escapeHtml(trace?.terminal_state ?? 'untraced')}</span><span class="meta">${numbers.size} 条引用 · ${used.length} 个来源</span><span class="meta">悬停或聚焦引用以检查证据</span></div>${sections}${traceHtml}<h2>脚注</h2><ol class="footnotes">${notes}</ol><h2>来源</h2><ul class="sources">${sources}</ul><footer>抽取的论断已对照精确来源区间检查。词汇支持不能证明现实世界中的真实性。</footer></article></body></html>`;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const data = JSON.parse(readFileSync(process.argv[2] ?? 0, 'utf8'));
    const html = renderReport(data);
    if (process.argv[3]) writeFileSync(process.argv[3], html); else process.stdout.write(html);
  } catch (error) { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; }
}
