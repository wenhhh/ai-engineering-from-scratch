function appSandboxFigure(host) {
  ensureStyles();
  var shell = document.createElement('div');
  shell.className = 'mf-shell';
  shell.innerHTML = [
    '<div class="mf-head"><strong>渲染交互界面</strong> 先协商和审阅，再渲染或回退</div>',
    '<div class="mf-body">',
    '<svg viewBox="0 0 560 260" role="img" aria-label="工具的 UI 资源从服务器进入宿主的 MIME 和 CSP 域审阅。通过后在沙箱 iframe 渲染，应用继续请求工具调用时经过同意门禁；未声明扩展或审阅失败则回退文本。">',
    '<style>.l31x{fill:var(--bg-surface,#eee);stroke:var(--rule-soft,#ccc)}.l31d{fill:var(--bg-surface,#eee);stroke:var(--blueprint,#3553ff);stroke-dasharray:4,3}.l31t{fill:var(--ink,#111);font:11px var(--font-mono,monospace);font-weight:600}.l31l{fill:var(--ink-mute,#777);font:11px var(--font-mono,monospace)}.l31a{stroke:var(--blueprint,#3553ff);fill:none;stroke-width:1.5}</style>',
    '<text class="l31l" x="10" y="16">逐请求协商 UI 扩展，渲染前审阅资源</text>',
    '<rect class="l31x" x="8" y="92" width="84" height="56"/>',
    '<text class="l31t" x="16" y="114">服务器</text>',
    '<text class="l31l" x="16" y="132">工具 + UI</text>',
    '<rect class="l31x" x="126" y="92" width="104" height="56"/>',
    '<text class="l31t" x="134" y="114">审阅</text>',
    '<text class="l31l" x="134" y="132">MIME + CSP</text>',
    '<rect class="l31x" x="270" y="92" width="120" height="56"/>',
    '<text class="l31t" x="278" y="114">应用视图</text>',
    '<text class="l31l" x="278" y="132">沙箱内</text>',
    '<rect class="l31x" x="426" y="92" width="110" height="56"/>',
    '<text class="l31t" x="434" y="114">同意</text>',
    '<text class="l31l" x="434" y="132">工具调用</text>',
    '<rect class="l31d" x="128" y="190" width="100" height="38"/>',
    '<text class="l31t" x="136" y="206">文本回退</text>',
    '<text class="l31l" x="136" y="220">无 UI 扩展</text>',
    '<path class="l31a" d="M92 120 L126 120" marker-end="url(#l31arrow)"/>',
    '<text class="l31l" x="40" y="84">resources/read</text>',
    '<path class="l31a" d="M230 120 L270 120" marker-end="url(#l31arrow)"/>',
    '<text class="l31l" x="200" y="84">审阅通过</text>',
    '<path class="l31a" d="M390 120 L426 120" marker-end="url(#l31arrow)"/>',
    '<text class="l31l" x="355" y="84">应用请求调用</text>',
    '<path class="l31a" d="M178 148 L178 190" marker-end="url(#l31arrow)"/>',
    '<text class="l31l" x="186" y="172">拒绝</text>',
    '<path class="l31a" d="M481 148 L481 240 L50 240 L50 148" marker-end="url(#l31arrow)"/>',
    '<text class="l31l" x="250" y="232">tools/call，新 ID</text>',
    '<defs><marker id="l31arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0 0 L6 3 L0 6 z" fill="var(--blueprint,#3553ff)"/></marker></defs>',
    '</svg>',
    '</div>',
    '<div class="mf-caption">宿主核对 MIME，并将 CSP 域与自身允许列表比较，之后才把 ui:// 资源作为沙箱应用加载。检查失败或未声明扩展时回退普通文本。应用发起的工具调用还须满足可见性与同意要求，再作为普通 tools/call 送达服务器。</div>'
  ].join('');
  host.appendChild(shell);
}
// 注册标识： mcpa-31-app-sandbox
