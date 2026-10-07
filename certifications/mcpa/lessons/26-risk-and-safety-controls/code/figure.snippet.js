function attackSurfaceFigure(host) {
  ensureStyles();
  var threats = [
    '描述投毒',
    '获批后篡改',
    '工具遮蔽',
    '令牌透传',
    'requestState 篡改',
    '网络 $ref（SSRF）',
    'DNS 重绑定',
    '供应链漂移'
  ];
  var cx = 280;
  var cy = 150;
  var r = 108;
  var boxW = 122;
  var boxH = 24;
  var n = threats.length;
  var spokes = [];
  var nodes = [];
  var labels = [];
  var i;
  for (i = 0; i < n; i++) {
    var angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    var x = cx + r * Math.cos(angle);
    var y = cy + r * Math.sin(angle);
    var bx = x - boxW / 2;
    var by = y - boxH / 2;
    spokes.push('<line class="l26l" x1="' + cx + '" y1="' + cy + '" x2="' + x.toFixed(1) + '" y2="' + y.toFixed(1) + '"/>');
    nodes.push('<rect class="l26x" x="' + bx.toFixed(1) + '" y="' + by.toFixed(1) + '" width="' + boxW + '" height="' + boxH + '" rx="3"/>');
    labels.push('<text class="l26t" x="' + (bx + 6).toFixed(1) + '" y="' + (by + 15).toFixed(1) + '">' + threats[i] + '</text>');
  }
  var shell = document.createElement('div');
  shell.className = 'mf-shell';
  shell.innerHTML = [
    '<div class="mf-head"><strong>工具调用周围的攻击面</strong> 即使同意门禁与 OAuth 正确，网关仍需应对八类威胁</div>',
    '<div class="mf-body">',
    '<svg viewBox="0 0 560 300" role="img" aria-label="网关位于中心，周围八个节点分别表示投毒描述、获批后篡改、工具遮蔽、令牌透传、requestState 篡改、网络引用 SSRF、DNS 重绑定和供应链漂移，各自以连线连接中心。">',
    '<style>.l26x{fill:var(--bg-surface,#eee);stroke:var(--rule-soft,#ccc)}.l26t{fill:var(--ink,#111);font:11px var(--font-mono,monospace)}.l26l{stroke:var(--ink-mute,#999);stroke-width:1;opacity:.8}.l26g{fill:var(--bg,#fff);stroke:var(--blueprint,#3553ff);stroke-width:1.6}.l26gt{fill:var(--ink,#111);font:11px var(--font-mono,monospace);font-weight:600}.l26gc{fill:var(--ink-soft,#555);font:11px var(--font-mono,monospace)}</style>',
    spokes.join(''),
    '<circle class="l26g" cx="' + cx + '" cy="' + cy + '" r="46"/>',
    '<text class="l26gt" x="' + (cx - 28) + '" y="' + (cy - 4) + '">网关</text>',
    '<text class="l26gc" x="' + (cx - 38) + '" y="' + (cy + 13) + '">固定 · 扫描 · 限制</text>',
    nodes.join(''),
    labels.join(''),
    '</svg>',
    '</div>',
    '<div class="mf-caption">各连线代表一种威胁。对应控制包括定义固定与隔离、注入扫描、服务器限定名称、令牌受众与独立上游凭据、状态完整性保护、受限网络引用获取和供应链准入固定。需要叠加控制，不能要求单一机制识别所有问题。</div>'
  ].join('');
  host.appendChild(shell);
}
// 注册标识： mcpa-26-attack-surface
