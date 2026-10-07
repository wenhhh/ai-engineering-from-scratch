function transportsFigure(host) {
  ensureStyles();
  var parts = [];
  parts.push('<text class="l19h" x="8" y="16">STDIO（子进程）</text>');
  parts.push('<rect class="l19x" x="8" y="24" width="254" height="28" rx="3"/><text class="l19t" x="18" y="43">客户端进程</text>');
  parts.push('<rect class="l19x" x="8" y="118" width="254" height="28" rx="3"/><text class="l19t" x="18" y="137">服务器（子进程）</text>');
  parts.push('<line class="l19a" x1="60" y1="52" x2="60" y2="116" marker-end="url(#l19arrow)"/><text class="l19s" x="68" y="80">stdin</text>');
  parts.push('<line class="l19a" x1="150" y1="116" x2="150" y2="52" marker-end="url(#l19arrow)"/><text class="l19s" x="158" y="80">stdout</text>');
  parts.push('<line class="l19a" x1="220" y1="116" x2="220" y2="52" stroke-dasharray="3,3" marker-end="url(#l19arrow)"/><text class="l19s" x="196" y="100">stderr</text>');
  parts.push('<text class="l19h" x="296" y="16">STREAMABLE HTTP (POST /mcp)</text>');
  parts.push('<rect class="l19x" x="296" y="24" width="256" height="28" rx="3"/><text class="l19t" x="306" y="43">客户端（HTTP 对端）</text>');
  parts.push('<rect class="l19x" x="296" y="118" width="256" height="28" rx="3"/><text class="l19t" x="306" y="137">服务器（校验并分派）</text>');
  parts.push('<line class="l19a" x1="350" y1="52" x2="350" y2="116" marker-end="url(#l19arrow)"/><text class="l19s" x="358" y="80">POST /mcp</text>');
  parts.push('<line class="l19a" x1="470" y1="116" x2="470" y2="52" marker-end="url(#l19arrow)"/><text class="l19s" x="422" y="80">响应</text>');
  parts.push('<circle class="l19f" cx="372" cy="100" r="7"/><text class="l19m" x="372" y="104">!</text>');
  parts.push('<text class="l19s" x="384" y="104">不一致：400 + -32020</text>');
  parts.push('<text class="l19c" x="8" y="178">不同传输保持相同协议语义，仅绑定方式不同</text>');
  parts.push('<text class="l19c" x="8" y="194">stdio 无请求头层，版本和能力在 _meta 中传递</text>');
  parts.push('<text class="l19c" x="8" y="210">HTTP 镜像 method、name 与 x-mcp-header 参数；不一致返回 400 + -32020</text>');
  var shell = document.createElement('div');
  shell.className = 'mf-shell';
  shell.innerHTML = [
    '<div class="mf-head"><strong>传输与请求头</strong> 同一消息，两种传输绑定</div>',
    '<div class="mf-body">',
    '<svg viewBox="0 0 560 232" role="img" aria-label="左侧：客户端经 stdin、stdout 与服务器子进程通信，虚线 stderr 承载日志，没有请求头层。右侧：客户端向 Streamable HTTP 服务器发送 POST，服务器返回响应；请求箭头上的校验点将不一致的请求头拒绝为 HTTP 400 与 -32020。">',
    '<style>.l19h{fill:var(--ink-mute,#777);font:11px var(--font-mono,monospace);text-transform:uppercase;letter-spacing:.06em}.l19x{fill:var(--bg-surface,#eee);stroke:var(--rule-soft,#ccc)}.l19t{fill:var(--ink,#111);font:11px var(--font-mono,monospace)}.l19a{stroke:var(--blueprint,#3553ff);stroke-width:1.4;fill:none}.l19s{fill:var(--ink-mute,#777);font:11px var(--font-mono,monospace)}.l19f{fill:#c94a34}.l19m{fill:#fff;font:bold 9px var(--font-mono,monospace);text-anchor:middle}.l19c{fill:var(--ink-soft,#555);font:11px var(--font-mono,monospace)}</style>',
    parts.join(''),
    '<defs><marker id="l19arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0 0 L6 3 L0 6 z" fill="var(--blueprint,#3553ff)"/></marker></defs>',
    '</svg>',
    '</div>',
    '<div class="mf-caption">stdio 通过 stdin 与 stdout 直接交付消息，stderr 单独记录日志，没有额外请求头层。Streamable HTTP 将方法、工具或资源名及 x-mcp-header 参数镜像到请求头，便于网关路由；正文仍是事实来源，镜像不一致会在工具运行前以 HTTP 400 和 HeaderMismatch（-32020）拒绝。</div>'
  ].join('');
  host.appendChild(shell);
}
// 注册标识： mcpa-19-transports
