function toolCallFigure(host) {
  ensureStyles();
  var chipLabels = ['text', 'image', 'audio', 'resource_link', 'resource'];
  var chipX = [8, 120, 232, 344, 456];
  var chipW = [104, 104, 104, 104, 96];
  var chips = [];
  var i;
  for (i = 0; i < chipLabels.length; i++) {
    chips.push('<rect class="l11x" x="' + chipX[i] + '" y="122" width="' + chipW[i] + '" height="26" rx="3"/>');
    chips.push('<text class="l11t" x="' + (chipX[i] + chipW[i] / 2) + '" y="139" text-anchor="middle">' + chipLabels[i] + '</text>');
  }
  var shell = document.createElement('div');
  shell.className = 'mf-shell';
  shell.innerHTML = [
    '<div class="mf-head"><strong>工具原语</strong> 一次调用、五种内容、两个错误通道</div>',
    '<div class="mf-body">',
    '<svg viewBox="0 0 560 230" role="img" aria-label="客户端发送 tools/call，服务器返回 CallToolResult。content 列表可包含 text、image、audio、resource_link 或 resource。结果还通过 isError 表示执行状态：省略或 false 为成功，true 表示工具遇到问题。">',
    '<defs><marker id="l11arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path class="l11m" d="M0,0 L6,3 L0,6 Z"/></marker></defs>',
    '<style>.l11x{fill:var(--bg-surface,#eee);stroke:var(--rule-soft,#ccc)}.l11t{fill:var(--ink,#111);font:11px var(--font-mono,monospace)}.l11a{stroke:var(--blueprint,#3553ff);stroke-width:1.4;fill:none}.l11m{fill:var(--blueprint,#3553ff)}.l11n{fill:var(--ink-mute,#777);font:11px var(--font-mono,monospace)}</style>',
    '<rect class="l11x" x="16" y="36" width="110" height="40" rx="4"/><text class="l11t" x="71" y="60" text-anchor="middle">客户端</text>',
    '<rect class="l11x" x="434" y="36" width="110" height="40" rx="4"/><text class="l11t" x="489" y="60" text-anchor="middle">服务器</text>',
    '<line class="l11a" x1="126" y1="48" x2="434" y2="48" marker-end="url(#l11arrow)"/><text class="l11n" x="280" y="40" text-anchor="middle">tools/call</text>',
    '<line class="l11a" x1="434" y1="70" x2="126" y2="70" marker-end="url(#l11arrow)"/><text class="l11n" x="280" y="86" text-anchor="middle">CallToolResult</text>',
    '<text class="l11n" x="8" y="112" text-anchor="start">content 可包含：</text>',
    chips.join(''),
    '<text class="l11n" x="8" y="172" text-anchor="start">同时报告：</text>',
    '<rect class="l11x" x="8" y="182" width="140" height="26" rx="3"/><text class="l11t" x="78" y="199" text-anchor="middle">省略 isError</text>',
    '<rect class="l11x" x="170" y="182" width="140" height="26" rx="3"/><text class="l11t" x="240" y="199" text-anchor="middle">isError: true</text>',
    '</svg>',
    '</div>',
    '<div class="mf-caption">tools/call 指定工具名称和参数；返回的 CallToolResult 包含五种内容块任意组合的 content、可选 structuredContent，以及 isError。isError 省略或 false 表示成功，true 表示工具遇到模型能够读取并修正的问题。</div>'
  ].join('');
  host.appendChild(shell);
}
// 注册标识： mcpa-11-tool-call
