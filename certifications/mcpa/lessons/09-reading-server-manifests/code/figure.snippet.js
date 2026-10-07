function manifestAnatomyFigure(host) {
  ensureStyles();
  var panels = [
    {
      title: 'server/discover',
      x: 8,
      rows: [
        { t: 'capabilities', f: false },
        { t: 'instructions', f: true },
        { t: 'cacheScope, ttlMs', f: false }
      ]
    },
    {
      title: 'tools/list',
      x: 196,
      rows: [
        { t: 'annotations: 未声明', f: true },
        { t: 'x-mcp-header', f: true },
        { t: 'cacheScope: public', f: true }
      ]
    },
    {
      title: 'server.json',
      x: 384,
      rows: [
        { t: 'name: acme-tools', f: true },
        { t: 'packages: npm', f: false },
        { t: 'remotes: http', f: false }
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
    parts.push('<rect class="l09p" x="' + panel.x + '" y="' + bodyTop + '" width="' + panelWidth + '" height="' + bodyHeight + '" rx="4"/>');
    parts.push('<rect class="l09h" x="' + panel.x + '" y="' + bodyTop + '" width="' + panelWidth + '" height="' + headerHeight + '" rx="4"/>');
    parts.push('<text class="l09ht" x="' + (panel.x + 9) + '" y="' + (bodyTop + 17) + '">' + panel.title + '</text>');
    for (j = 0; j < panel.rows.length; j++) {
      var row = panel.rows[j];
      var rowY = bodyTop + headerHeight + 14 + j * rowHeight;
      var markerClass = row.f ? 'l09f' : 'l09k';
      parts.push('<circle class="' + markerClass + '" cx="' + (panel.x + 13) + '" cy="' + rowY + '" r="6"/>');
      if (row.f) {
        parts.push('<text class="l09m" x="' + (panel.x + 13) + '" y="' + (rowY + 4) + '">!</text>');
      }
      parts.push('<text class="l09t" x="' + (panel.x + 26) + '" y="' + (rowY + 4) + '">' + row.t + '</text>');
    }
  }
  var shell = document.createElement('div');
  shell.className = 'mf-shell';
  shell.innerHTML = [
    '<div class="mf-head"><strong>服务器清单结构</strong> 首次调用前审阅三份材料</div>',
    '<div class="mf-body">',
    '<svg viewBox="0 0 560 200" role="img" aria-label="三个面板分别展示发现结果的能力与指引、工具列表中的注解和 x-mcp-header，以及注册表 server.json 的命名空间。标记指出优先审阅的内容：操纵模型的指引、缺少注解的工具、暴露疑似秘密参数的请求头，以及缺少命名空间的名称。">',
    '<style>.l09p{fill:var(--bg-surface,#eee);stroke:var(--rule-soft,#ccc)}.l09h{fill:none;stroke:var(--rule-soft,#ccc)}.l09ht{fill:var(--ink,#111);font:bold 11px var(--font-mono,monospace)}.l09t{fill:var(--ink-mute,#555);font:11px var(--font-mono,monospace)}.l09k{fill:var(--blueprint,#3553ff)}.l09f{fill:#c94a34}.l09m{fill:#fff;font:bold 9px var(--font-mono,monospace);text-anchor:middle}.l09c{fill:var(--ink-soft,#777);font:11px var(--font-mono,monospace)}</style>',
    parts.join(''),
    '<text class="l09c" x="8" y="188">圆点标记字段；带感叹号的内容需要重点审查</text>',
    '</svg>',
    '</div>',
    '<div class="mf-caption">清单包含三份材料：服务器声称支持什么、当前提供什么，以及注册表如何命名它。首次实际调用前，应重点检查操纵模型的指引、未声明注解的工具、暴露疑似秘密参数的请求头，以及没有命名空间的名称。</div>'
  ].join('');
  host.appendChild(shell);
}
// 注册标识： mcpa-09-manifest-anatomy
