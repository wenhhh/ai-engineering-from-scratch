function rolesMapFigure(host) {
  ensureStyles();
  var panels = [
    {
      title: 'stdio',
      x: 8,
      rows: [
        { t: '作者：发现', f: false },
        { t: '运营：环境凭据', f: true },
        { t: '用户：可拒绝调用', f: false }
      ]
    },
    {
      title: 'HTTP，无网关',
      x: 196,
      rows: [
        { t: '作者：PRM、Origin', f: true },
        { t: '客户端：RFC 8707', f: false },
        { t: '治理：令牌', f: false }
      ]
    },
    {
      title: '网关前置',
      x: 384,
      rows: [
        { t: '运营：Origin', f: true },
        { t: '作者：保留 PRM', f: false },
        { t: '治理：令牌', f: false }
      ]
    }
  ];
  var panelWidth = 168;
  var headerHeight = 26;
  var rowHeight = 34;
  var bodyTop = 30;
  var parts = [];
  var i;
  var j;
  for (i = 0; i < panels.length; i++) {
    var panel = panels[i];
    var bodyHeight = headerHeight + panel.rows.length * rowHeight + 10;
    parts.push('<rect class="l28p" x="' + panel.x + '" y="' + bodyTop + '" width="' + panelWidth + '" height="' + bodyHeight + '" rx="4"/>');
    parts.push('<rect class="l28h" x="' + panel.x + '" y="' + bodyTop + '" width="' + panelWidth + '" height="' + headerHeight + '" rx="4"/>');
    parts.push('<text class="l28ht" x="' + (panel.x + 9) + '" y="' + (bodyTop + 17) + '">' + panel.title + '</text>');
    for (j = 0; j < panel.rows.length; j++) {
      var row = panel.rows[j];
      var rowY = bodyTop + headerHeight + 14 + j * rowHeight;
      var markerClass = row.f ? 'l28f' : 'l28k';
      parts.push('<circle class="' + markerClass + '" cx="' + (panel.x + 13) + '" cy="' + rowY + '" r="6"/>');
      if (row.f) {
        parts.push('<text class="l28m" x="' + (panel.x + 13) + '" y="' + (rowY + 4) + '">!</text>');
      }
      parts.push('<text class="l28t" x="' + (panel.x + 26) + '" y="' + (rowY + 4) + '">' + row.t + '</text>');
    }
  }
  var shell = document.createElement('div');
  shell.className = 'mf-shell';
  shell.innerHTML = [
    '<div class="mf-head"><strong>角色责任图</strong> 同一 MUST，三种部署，不同负责人</div>',
    '<div class="mf-body">',
    '<svg viewBox="0 0 560 200" role="img" aria-label="三个面板分别为 stdio、无网关的直接 HTTP 和网关前置部署。各面板展示相应要求的负责角色。Origin 校验在直接 HTTP 下由服务器作者承担，前置网关后转给首先终止连接的平台或网关运营者。">',
    '<style>.l28p{fill:var(--bg-surface,#eee);stroke:var(--rule-soft,#ccc)}.l28h{fill:none;stroke:var(--rule-soft,#ccc)}.l28ht{fill:var(--ink,#111);font:bold 11px var(--font-mono,monospace)}.l28t{fill:var(--ink-mute,#555);font:11px var(--font-mono,monospace)}.l28k{fill:var(--blueprint,#3553ff)}.l28f{fill:#c94a34}.l28m{fill:#fff;font:bold 9px var(--font-mono,monospace);text-anchor:middle}.l28c{fill:var(--ink-soft,#777);font:11px var(--font-mono,monospace)}</style>',
    parts.join(''),
    '<text class="l28c" x="8" y="188">圆点标示负责角色；感叹号所在行的负责人随部署改变</text>',
    '</svg>',
    '</div>',
    '<div class="mf-caption">部署方式改变由谁承担 MUST，要求本身仍然适用。每个 HTTP 可访问部署都需要 Origin 校验：直接 HTTP 由服务器作者负责，网关前置时由首先终止连接的平台或网关运营者负责。</div>'
  ].join('');
  host.appendChild(shell);
}
// 注册标识： mcpa-28-roles-map
