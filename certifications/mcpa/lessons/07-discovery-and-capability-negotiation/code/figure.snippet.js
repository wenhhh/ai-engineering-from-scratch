function discoverCapabilityFigure(host) {
  ensureStyles();
  var shell = document.createElement('div');
  shell.className = 'mf-shell';
  var svg = [
    '<svg viewBox="0 0 560 210" role="img" aria-label="上方：客户端可选调用一次 server/discover，获得支持版本、服务器能力、指引和缓存提示。下方：每个 tools/call 仍须声明当前请求的客户端能力；未声明 elicitation 时服务器返回 -32021，声明后调用完成。">',
    '<style>',
    '.l07x{fill:var(--bg-surface,#eee);stroke:var(--rule-soft,#ccc)}',
    '.l07t{fill:var(--ink,#111);font:11px var(--font-mono,monospace)}',
    '.l07h{fill:var(--ink,#111);font:12px var(--font-mono,monospace);font-weight:700}',
    '.l07lbl{fill:var(--ink-soft,#555);font:11px var(--font-mono,monospace)}',
    '.l07ok{stroke:var(--blueprint,#3553ff);stroke-width:1.6;fill:none}',
    '.l07no{stroke:var(--ink-mute,#888);stroke-width:1.4;fill:none;stroke-dasharray:4 3}',
    '</style>',
    '<marker id="l07arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="var(--blueprint,#3553ff)"/></marker>',
    '<marker id="l07arrowmute" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="var(--ink-mute,#888)"/></marker>',
    '<text class="l07h" x="16" y="24">发现：可选，可缓存</text>',
    '<rect class="l07x" x="16" y="34" width="84" height="24"/><text class="l07t" x="26" y="50">客户端</text>',
    '<rect class="l07x" x="460" y="34" width="84" height="24"/><text class="l07t" x="470" y="50">服务器</text>',
    '<line class="l07ok" x1="100" y1="46" x2="460" y2="46" marker-end="url(#l07arrow)"/>',
    '<text class="l07lbl" x="280" y="38" text-anchor="middle">server/discover</text>',
    '<text class="l07lbl" x="280" y="60" text-anchor="middle">supportedVersions + capabilities + ttlMs</text>',
    '<text class="l07h" x="16" y="100">每次 tools/call 都须重新声明能力</text>',
    '<rect class="l07x" x="16" y="112" width="84" height="24"/><text class="l07t" x="26" y="128">客户端</text>',
    '<rect class="l07x" x="460" y="112" width="84" height="24"/><text class="l07t" x="470" y="128">服务器</text>',
    '<line class="l07no" x1="100" y1="124" x2="460" y2="124" marker-end="url(#l07arrowmute)"/>',
    '<text class="l07lbl" x="280" y="116" text-anchor="middle">clientCapabilities: {}</text>',
    '<text class="l07lbl" x="280" y="138" text-anchor="middle">-32021：缺少 elicitation</text>',
    '<rect class="l07x" x="16" y="160" width="84" height="24"/><text class="l07t" x="26" y="176">客户端</text>',
    '<rect class="l07x" x="460" y="160" width="84" height="24"/><text class="l07t" x="470" y="176">服务器</text>',
    '<line class="l07ok" x1="100" y1="172" x2="460" y2="172" marker-end="url(#l07arrow)"/>',
    '<text class="l07lbl" x="280" y="164" text-anchor="middle">clientCapabilities: {elicitation:{form:{}}}</text>',
    '<text class="l07lbl" x="280" y="186" text-anchor="middle">result: complete</text>',
    '</svg>'
  ].join('');
  shell.innerHTML = [
    '<div class="mf-head"><strong>发现与能力协商</strong> 发现可缓存；每次调用都须声明能力</div>',
    '<div class="mf-body">',
    svg,
    '</div>',
    '<div class="mf-caption">server/discover 可选且可缓存，用于汇总服务器能力。每个 tools/call 仍在自己的 _meta 中携带 clientCapabilities，并重新接受检查：缺少 elicitation 时返回指出该缺失项的 -32021，声明后才能完成。</div>'
  ].join('');
  host.appendChild(shell);
}
// 注册标识： mcpa-07-discover
