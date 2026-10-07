function extensionNegotiationFigure(host) {
  ensureStyles();
  var shell = document.createElement('div');
  shell.className = 'mf-shell';
  var svg = [
    '<svg viewBox="0 0 560 248" role="img" aria-label="左框为客户端当前 clientCapabilities.extensions 声明，右框为服务器发现结果的 capabilities.extensions。双方共有的标识汇入有效集合；仅一侧声明的标识不启用。可选扩展匹配则增强，不匹配则回退；必需扩展缺失则返回 -32021。">',
    '<style>',
    '.l30x{fill:none;stroke:var(--rule-soft,#ccc)}',
    '.l30c{fill:var(--bg-surface,#eee);stroke:var(--rule-soft,#ccc)}',
    '.l30active{fill:var(--bg-surface,#eee);stroke:var(--blueprint,#3553ff);stroke-width:1.4}',
    '.l30t{fill:var(--ink,#111);font:11px var(--font-mono,monospace)}',
    '.l30h{fill:var(--ink,#111);font:12px var(--font-mono,monospace);font-weight:700}',
    '.l30lbl{fill:var(--ink-soft,#555);font:11px var(--font-mono,monospace)}',
    '.l30ok{stroke:var(--blueprint,#3553ff);stroke-width:1.6;fill:none}',
    '.l30no{stroke:var(--ink-mute,#999);stroke-width:1.2;fill:none;stroke-dasharray:4 3}',
    '.l30bok{fill:var(--blueprint,#3553ff)}',
    '.l30bno{fill:var(--bg-surface,#eee);stroke:var(--ink-mute,#999);stroke-dasharray:3 2}',
    '.l30brej{fill:var(--ink,#111)}',
    '</style>',
    '<marker id="l30arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="var(--blueprint,#3553ff)"/></marker>',
    '<marker id="l30arrowmute" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="var(--ink-mute,#999)"/></marker>',
    '<text class="l30h" x="16" y="26">客户端 _meta 声明</text>',
    '<text class="l30h" x="304" y="26">服务器 capabilities 声明</text>',
    '<rect class="l30x" x="16" y="34" width="240" height="70" rx="4"/>',
    '<rect class="l30x" x="304" y="34" width="240" height="70" rx="4"/>',
    '<rect class="l30c" x="26" y="44" width="220" height="20" rx="3"/><text class="l30t" x="32" y="58">io.modelcontextprotocol/ui</text>',
    '<rect class="l30c" x="26" y="70" width="220" height="20" rx="3"/><text class="l30t" x="32" y="84">com.example/priority-routing</text>',
    '<rect class="l30c" x="314" y="44" width="220" height="20" rx="3"/><text class="l30t" x="320" y="58">com.example/priority-routing</text>',
    '<rect class="l30c" x="314" y="70" width="220" height="20" rx="3"/><text class="l30t" x="320" y="84">io.modelcontextprotocol/tasks</text>',
    '<line class="l30no" x1="136" y1="64" x2="96" y2="118"/>',
    '<line class="l30no" x1="424" y1="90" x2="464" y2="118" marker-end="url(#l30arrowmute)"/>',
    '<line class="l30ok" x1="136" y1="104" x2="270" y2="132" marker-end="url(#l30arrow)"/>',
    '<line class="l30ok" x1="424" y1="104" x2="290" y2="132" marker-end="url(#l30arrow)"/>',
    '<rect class="l30active" x="150" y="132" width="260" height="28" rx="4"/>',
    '<text class="l30t" x="160" y="150">启用：com.example/priority-routing</text>',
    '<rect class="l30bok" x="16" y="176" width="12" height="12"/>',
    '<text class="l30lbl" x="36" y="186">双方声明可选扩展：启用增强行为</text>',
    '<rect class="l30bno" x="16" y="198" width="12" height="12"/>',
    '<text class="l30lbl" x="36" y="208">仅一侧声明：回退核心行为</text>',
    '<rect class="l30brej" x="16" y="220" width="12" height="12"/>',
    '<text class="l30lbl" x="36" y="230">必需扩展未共同启用：拒绝，-32021</text>',
    '</svg>'
  ].join('');
  shell.innerHTML = [
    '<div class="mf-head"><strong>扩展框架</strong> 每请求协商，再决定启用、回退或拒绝</div>',
    '<div class="mf-body">',
    svg,
    '</div>',
    '<div class="mf-caption">客户端通过每个请求的 _meta 中 clientCapabilities.extensions 声明扩展，服务器通过 server/discover 的 capabilities.extensions 公布支持。只有双方同名支持才启用；可选项不匹配则回退核心，必需项缺失则以 -32021 指出所需能力。</div>'
  ].join('');
  host.appendChild(shell);
}
// 注册标识： mcpa-30-extension-negotiation
