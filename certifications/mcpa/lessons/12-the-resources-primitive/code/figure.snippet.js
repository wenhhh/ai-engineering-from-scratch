function resourceReadFigure(host) {
  ensureStyles();
  var shell = document.createElement('div');
  shell.className = 'mf-shell';
  shell.innerHTML = [
    '<div class="mf-head"><strong>读取资源</strong> 一个 URI，两种合法结果</div>',
    '<div class="mf-body">',
    '<svg viewBox="0 0 560 232" role="img" aria-label="URI 模板 file:///project/{+path} 展开为具体 URI，再由 resources/read 按项目根目录校验。资源存在时返回含 contents、ttlMs 和 cacheScope 的完整结果；资源不存在或路径试图越界时，返回 JSON-RPC 错误 -32602，并在 data.uri 指出请求目标，不能返回空 contents 数组代替错误。">',
    '<style>.l12x{fill:var(--bg-surface,#eee);stroke:var(--rule-soft,#ccc)}.l12h{fill:var(--ink,#111);font:bold 11px var(--font-mono,monospace)}.l12t{fill:var(--ink-mute,#555);font:11px var(--font-mono,monospace)}.l12l{fill:var(--ink-mute,#777);font:11px var(--font-mono,monospace)}.l12a{stroke:var(--blueprint,#3553ff);fill:none;stroke-width:1.5}.l12err{stroke:#c94a34;fill:none;stroke-width:1.5}.l12errt{fill:#c94a34;font:bold 11px var(--font-mono,monospace)}.l12c{fill:var(--ink-soft,#777);font:11px var(--font-mono,monospace)}</style>',
    '<rect class="l12x" x="8" y="76" width="148" height="64" rx="4"/>',
    '<text class="l12h" x="18" y="96">模板</text>',
    '<text class="l12t" x="18" y="112">file:///project/{+path}</text>',
    '<text class="l12l" x="18" y="128">path = src/app.py</text>',
    '<path class="l12a" d="M156 108 L204 108" marker-end="url(#l12arrow)"/>',
    '<text class="l12l" x="160" y="100">展开</text>',
    '<rect class="l12x" x="204" y="76" width="140" height="64" rx="4"/>',
    '<text class="l12h" x="214" y="96">resources/read</text>',
    '<text class="l12t" x="214" y="112">按根目录校验路径</text>',
    '<text class="l12l" x="214" y="128">再查询 URI</text>',
    '<path class="l12a" d="M344 92 L410 40" marker-end="url(#l12arrow)"/>',
    '<text class="l12l" x="350" y="72">已找到</text>',
    '<path class="l12err" d="M344 124 L410 176" marker-end="url(#l12errarrow)"/>',
    '<text class="l12l" x="350" y="150">不存在</text>',
    '<rect class="l12x" x="410" y="10" width="142" height="66" rx="4"/>',
    '<text class="l12h" x="420" y="30">complete</text>',
    '<text class="l12t" x="420" y="46">contents[]</text>',
    '<text class="l12t" x="420" y="62">ttlMs + cacheScope</text>',
    '<rect class="l12x" x="410" y="146" width="142" height="66" rx="4"/>',
    '<text class="l12errt" x="420" y="166">-32602</text>',
    '<text class="l12t" x="420" y="182">data.uri</text>',
    '<text class="l12l" x="420" y="198">不能用空 contents[]</text>',
    '<text class="l12c" x="8" y="222">查询前先校验路径，不能解析到项目根目录之外</text>',
    '<defs>',
    '<marker id="l12arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0 0 L6 3 L0 6 z" fill="var(--blueprint,#3553ff)"/></marker>',
    '<marker id="l12errarrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0 0 L6 3 L0 6 z" fill="#c94a34"/></marker>',
    '</defs>',
    '</svg>',
    '</div>',
    '<div class="mf-caption">URI 模板展开后，resources/read 先按服务器根目录校验，再执行查询。资源存在时返回含 contents、ttlMs 和 cacheScope 的完整结果；不存在或路径越界时返回 -32602，并用 data.uri 指明目标，不能以成功结果和空 contents 数组表示缺失。</div>'
  ].join('');
  host.appendChild(shell);
}
// 注册标识： mcpa-12-resource-read
