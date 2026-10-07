function eraMatrixFigure(host) {
  ensureStyles();
  var mid = [
    ['DiscoverResult', 95],
    ['-32022（可识别）', 280],
    ['其他错误 / 超时', 465]
  ];
  var out = [
    ['现代：直接使用', 95],
    ['现代：换版本重试', 280],
    ['旧版：用 initialize', 465]
  ];
  var svg = [];
  svg.push('<defs><marker id="l05arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path class="l05p" d="M0,0 L6,3 L0,6 Z"/></marker></defs>');
  svg.push('<rect class="l05x" x="190" y="10" width="180" height="30" rx="4"/>');
  svg.push('<text class="l05t" x="207" y="29">server/discover 探测</text>');
  var i;
  for (i = 0; i < mid.length; i++) {
    var cx = mid[i][1];
    svg.push('<line class="l05a" marker-end="url(#l05arrow)" x1="280" y1="40" x2="' + cx + '" y2="78"/>');
    svg.push('<rect class="l05x" x="' + (cx - 85) + '" y="80" width="170" height="28" rx="4"/>');
    svg.push('<text class="l05t" x="' + (cx - 77) + '" y="98">' + mid[i][0] + '</text>');
    svg.push('<line class="l05a" marker-end="url(#l05arrow)" x1="' + cx + '" y1="108" x2="' + cx + '" y2="148"/>');
    svg.push('<rect class="l05o" x="' + (cx - 85) + '" y="150" width="170" height="28" rx="4"/>');
    svg.push('<text class="l05t" x="' + (cx - 77) + '" y="168">' + out[i][0] + '</text>');
  }
  svg.push('<text class="l05c" x="92" y="200">时代属于服务器属性：按进程（stdio）或源站（HTTP）缓存判断。</text>');
  var shell = document.createElement('div');
  shell.className = 'mf-shell';
  shell.innerHTML = [
    '<div class="mf-head"><strong>协议时代探测</strong> 一次 server/discover 探测，三种结果，无须预先握手</div>',
    '<div class="mf-body">',
    '<svg viewBox="0 0 560 210" role="img" aria-label="server/discover 探测产生三类结果：DiscoverResult 表示现代服务器；可识别的 -32022 UnsupportedProtocolVersion 错误表示现代服务器需要以其他版本重试；其他错误或超时则按旧版处理，回退到 initialize 握手。">',
    '<style>.l05x{fill:var(--bg-surface,#eee);stroke:var(--rule-soft,#ccc)}.l05o{fill:var(--bg-surface,#eee);stroke:var(--blueprint,#3553ff);stroke-width:1.2}.l05t{fill:var(--ink,#111);font:11px var(--font-mono,monospace)}.l05a{stroke:var(--ink-mute,#999);stroke-width:1}.l05p{fill:var(--ink-mute,#999)}.l05c{fill:var(--ink-soft,#777);font:11px var(--font-mono,monospace)}</style>',
    svg.join(''),
    '</svg>',
    '</div>',
    '<div class="mf-caption">同一探测将 stdio 服务器分为现代、不同版本的现代和旧版。可识别的现代错误不会触发回退；只有无法识别的错误或超时才会回退。</div>'
  ].join('');
  host.appendChild(shell);
}
// 注册标识： mcpa-05-era-matrix
