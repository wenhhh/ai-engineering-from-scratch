function oauthFlowFigure(host) {
  ensureStyles();
  var shell = document.createElement('div');
  shell.className = 'mf-shell';
  var svg = [
    '<svg viewBox="0 0 560 228" role="img" aria-label="三条通道：上方无令牌 tools/call 被 HTTP 401 拒绝，WWW-Authenticate 指出资源元数据地址，无 JSON-RPC 正文。中间发现资源和授权服务器元数据，生成 PKCE S256，并核对返回的授权码与 iss。下方携带 bearer 令牌重试，受众验证通过后返回 complete。">',
    '<style>',
    '.l23x{fill:var(--bg-surface,#eee);stroke:var(--rule-soft,#ccc)}',
    '.l23t{fill:var(--ink,#111);font:11px var(--font-mono,monospace)}',
    '.l23h{fill:var(--ink,#111);font:12px var(--font-mono,monospace);font-weight:700}',
    '.l23lbl{fill:var(--ink-soft,#555);font:11px var(--font-mono,monospace)}',
    '.l23ok{stroke:var(--blueprint,#3553ff);stroke-width:1.6;fill:none}',
    '.l23no{stroke:var(--ink-mute,#888);stroke-width:1.4;fill:none;stroke-dasharray:4 3}',
    '</style>',
    '<marker id="l23arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="var(--blueprint,#3553ff)"/></marker>',
    '<marker id="l23arrowmute" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="var(--ink-mute,#888)"/></marker>',
    '<text class="l23h" x="16" y="24">1. tools/call 未带令牌</text>',
    '<rect class="l23x" x="16" y="34" width="84" height="24"/><text class="l23t" x="26" y="50">客户端</text>',
    '<rect class="l23x" x="460" y="34" width="84" height="24"/><text class="l23t" x="466" y="50">MCP 服务器</text>',
    '<line class="l23no" x1="100" y1="46" x2="460" y2="46" marker-end="url(#l23arrowmute)"/>',
    '<text class="l23lbl" x="280" y="38" text-anchor="middle">tools/call，未带 Authorization</text>',
    '<text class="l23lbl" x="280" y="60" text-anchor="middle">401 + WWW-Authenticate: resource_metadata=...</text>',
    '<text class="l23h" x="16" y="100">2. 发现、PKCE 与授权</text>',
    '<rect class="l23x" x="16" y="110" width="84" height="24"/><text class="l23t" x="26" y="126">客户端</text>',
    '<rect class="l23x" x="460" y="110" width="84" height="24"/><text class="l23t" x="466" y="126">授权服务器</text>',
    '<line class="l23ok" x1="100" y1="122" x2="460" y2="122" marker-end="url(#l23arrow)"/>',
    '<text class="l23lbl" x="280" y="114" text-anchor="middle">资源与授权元数据 + S256 + resource + state</text>',
    '<text class="l23lbl" x="280" y="136" text-anchor="middle">核对 code 与 iss，匹配已记录签发者</text>',
    '<text class="l23h" x="16" y="176">3. 携 bearer 令牌重试</text>',
    '<rect class="l23x" x="16" y="186" width="84" height="24"/><text class="l23t" x="26" y="202">客户端</text>',
    '<rect class="l23x" x="460" y="186" width="84" height="24"/><text class="l23t" x="466" y="202">MCP 服务器</text>',
    '<line class="l23ok" x1="100" y1="198" x2="460" y2="198" marker-end="url(#l23arrow)"/>',
    '<text class="l23lbl" x="280" y="190" text-anchor="middle">tools/call, Authorization: Bearer &lt;token&gt;</text>',
    '<text class="l23lbl" x="280" y="212" text-anchor="middle">200，resultType complete（受众已验证）</text>',
    '</svg>'
  ].join('');
  shell.innerHTML = [
    '<div class="mf-head"><strong>MCP 请求授权</strong> 收到 401 后访问授权服务器，再携 bearer 令牌重试</div>',
    '<div class="mf-body">',
    svg,
    '</div>',
    '<div class="mf-caption">拒绝发生在 HTTP 层，没有 JSON-RPC 正文。中间的资源元数据、授权服务器发现、PKCE 与 iss 检查都在 MCP 报文之外完成。只有携带面向本服务器有效令牌的重试，才会到达工具处理器。</div>'
  ].join('');
  host.appendChild(shell);
}
// 注册标识： mcpa-23-oauth-flow
