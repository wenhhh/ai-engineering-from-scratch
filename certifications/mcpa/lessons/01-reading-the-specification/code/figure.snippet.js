function specMapFigure(host) {
  ensureStyles();
  var must = ['基础协议', '版本管理', '消息模式'];
  var may = ['授权', '服务器功能', '客户端功能', '实用功能'];
  var mustW = 150, mustGap = 10, mustStartX = 45, mustY = 66, mustH = 26;
  var mayW = 125, mayGap = 8, mayStartX = 18, mayY = 138, mayH = 26;
  var rootX = 200, rootY = 12, rootW = 160, rootH = 32;
  var rootCx = rootX + rootW / 2;
  var nodes = [];
  var lines = [];
  var i;
  var x;
  for (i = 0; i < must.length; i++) {
    x = mustStartX + i * (mustW + mustGap);
    nodes.push('<rect class="l01m" x="' + x + '" y="' + mustY + '" width="' + mustW + '" height="' + mustH + '" rx="3"/>');
    nodes.push('<text class="l01mt" x="' + (x + mustW / 2) + '" y="' + (mustY + 17) + '" text-anchor="middle">' + must[i] + '</text>');
    lines.push('<line class="l01l" x1="' + rootCx + '" y1="' + (rootY + rootH) + '" x2="' + (x + mustW / 2) + '" y2="' + mustY + '"/>');
  }
  for (i = 0; i < may.length; i++) {
    x = mayStartX + i * (mayW + mayGap);
    nodes.push('<rect class="l01y" x="' + x + '" y="' + mayY + '" width="' + mayW + '" height="' + mayH + '" rx="3"/>');
    nodes.push('<text class="l01yt" x="' + (x + mayW / 2) + '" y="' + (mayY + 17) + '" text-anchor="middle">' + may[i] + '</text>');
    lines.push('<line class="l01l" x1="' + rootCx + '" y1="' + (rootY + rootH) + '" x2="' + (x + mayW / 2) + '" y2="' + mayY + '"/>');
  }
  var chips = ['Active', 'Deprecated', 'Removed'];
  var chipW = 110, chipGap = 40, chipStartX = 75, chipY = 210, chipH = 26;
  var chipNodes = [];
  var arrowLines = [];
  for (i = 0; i < chips.length; i++) {
    x = chipStartX + i * (chipW + chipGap);
    chipNodes.push('<rect class="l01c" x="' + x + '" y="' + chipY + '" width="' + chipW + '" height="' + chipH + '" rx="13"/>');
    chipNodes.push('<text class="l01ct" x="' + (x + chipW / 2) + '" y="' + (chipY + 17) + '" text-anchor="middle">' + chips[i] + '</text>');
    if (i > 0) {
      arrowLines.push('<line class="l01a" marker-end="url(#l01arrow)" x1="' + (chipStartX + (i - 1) * (chipW + chipGap) + chipW) + '" y1="' + (chipY + chipH / 2) + '" x2="' + (x - 4) + '" y2="' + (chipY + chipH / 2) + '"/>');
    }
  }
  var shell = document.createElement('div');
  shell.className = 'mf-shell';
  shell.innerHTML = [
    '<div class="mf-head"><strong>阅读规范</strong> 必需支持项、可选项与功能生命周期</div>',
    '<div class="mf-body">',
    '<svg viewBox="0 0 560 300" role="img" aria-label="MCP 规范结构：2026-07-28 现行版连接三个必需部分——基础协议、版本管理、消息模式——以及授权、服务器功能、客户端功能、实用功能四个可选部分。下方展示 Active、Deprecated、Removed 功能生命周期，独立于修订版状态。">',
    '<style>.l01r{fill:var(--bg-surface,#eee);stroke:var(--blueprint,#3553ff);stroke-width:1.4}.l01rt{fill:var(--ink,#111);font:11px var(--font-mono,monospace)}.l01m{fill:var(--blueprint,#3553ff);fill-opacity:.14;stroke:var(--blueprint,#3553ff);stroke-width:1.2}.l01mt{fill:var(--ink,#111);font:11px var(--font-mono,monospace)}.l01y{fill:var(--bg-surface,#eee);stroke:var(--rule-soft,#ccc);stroke-width:1}.l01yt{fill:var(--ink-mute,#666);font:11px var(--font-mono,monospace)}.l01l{stroke:var(--ink-mute,#999);stroke-width:.7;opacity:.65}.l01c{fill:var(--bg-surface,#eee);stroke:var(--ink-soft,#888);stroke-width:1}.l01ct{fill:var(--ink,#111);font:11px var(--font-mono,monospace)}.l01a{stroke:var(--blueprint,#3553ff);stroke-width:1.4}.l01cap{fill:var(--ink-mute,#777);font:11px var(--font-mono,monospace)}</style>',
    '<marker id="l01arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="var(--blueprint,#3553ff)"/></marker>',
    '<rect class="l01r" x="' + rootX + '" y="' + rootY + '" width="' + rootW + '" height="' + rootH + '" rx="4"/>',
    '<text class="l01rt" x="' + rootCx + '" y="' + (rootY + 14) + '" text-anchor="middle">规范</text>',
    '<text class="l01rt" x="' + rootCx + '" y="' + (rootY + 27) + '" text-anchor="middle">2026-07-28，现行</text>',
    lines.join(''),
    nodes.join(''),
    '<text class="l01cap" x="' + mustStartX + '" y="' + (mustY - 6) + '">MUST 支持</text>',
    '<text class="l01cap" x="' + mayStartX + '" y="' + (mayY - 6) + '">MAY 支持</text>',
    chipNodes.join(''),
    arrowLines.join(''),
    '<text class="l01cap" x="75" y="' + (chipY + chipH + 18) + '">功能生命周期独立于修订版状态</text>',
    '</svg>',
    '</div>',
    '<div class="mf-caption">每个实现 MUST 支持基础协议、版本管理和消息模式，其余部分按需添加。功能自身的 Active、Deprecated、Removed 状态，与文档的 Draft、Current、Final 状态分开追踪。</div>'
  ].join('');
  host.appendChild(shell);
}
// 注册标识： mcpa-01-spec-map
