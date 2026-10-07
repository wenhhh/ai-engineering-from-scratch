function useCaseMatrixFigure(host) {
  ensureStyles();
  var header = ['用例', '原语', '传输', '扩展'];
  var rows = [
    ['开发工具', '工具', 'stdio', '无'],
    ['数据访问', '资源', 'http', '无'],
    ['长任务', '工具', 'http', 'tasks'],
    ['交互 UI', '工具', 'http', 'ui'],
    ['可复用流程', '提示词', 'http', 'skills'],
    ['机器间同步', '工具', 'http', 'auth-cc']
  ];
  var colX = [8, 148, 250, 352, 452];
  var colW = [140, 102, 102, 100, 100];
  var rowH = 28;
  var headerH = 28;
  var top = 20;
  var parts = [];
  var i;
  var c;
  parts.push('<rect class="l29g" x="' + colX[0] + '" y="' + top + '" width="544" height="' + (headerH + rows.length * rowH) + '" rx="4"/>');
  parts.push('<rect class="l29hh" x="' + colX[0] + '" y="' + top + '" width="544" height="' + headerH + '" rx="4"/>');
  for (c = 0; c < header.length; c++) {
    parts.push('<text class="l29ht" x="' + (colX[c] + 8) + '" y="' + (top + 18) + '">' + header[c] + '</text>');
  }
  for (i = 0; i < rows.length; i++) {
    var rowY = top + headerH + i * rowH;
    if (i % 2 === 1) {
      parts.push('<rect class="l29z" x="' + colX[0] + '" y="' + rowY + '" width="544" height="' + rowH + '"/>');
    }
    for (c = 0; c < rows[i].length; c++) {
      var cls = c === 0 ? 'l29lbl' : 'l29rt';
      parts.push('<text class="' + cls + '" x="' + (colX[c] + 8) + '" y="' + (rowY + 19) + '">' + rows[i][c] + '</text>');
    }
  }
  for (c = 1; c < colX.length; c++) {
    parts.push('<line class="l29v" x1="' + colX[c] + '" y1="' + top + '" x2="' + colX[c] + '" y2="' + (top + headerH + rows.length * rowH) + '"/>');
  }
  var shell = document.createElement('div');
  shell.className = 'mf-shell';
  shell.innerHTML = [
    '<div class="mf-head"><strong>实际用例矩阵</strong> 六个场景，各回答四个问题</div>',
    '<div class="mf-body">',
    '<svg viewBox="0 0 560 220" role="img" aria-label="六类用例按原语、传输和扩展列出推荐方案：开发工具采用 stdio 工具；数据访问采用 HTTP 资源；长任务采用 tasks；交互界面采用 MCP Apps ui；可复用流程采用提示词与 skills；机器间同步采用 OAuth 客户端凭据扩展。">',
    '<style>.l29g{fill:var(--bg-surface,#eee);stroke:var(--rule-soft,#ccc)}.l29hh{fill:var(--blueprint,#3553ff);opacity:.12}.l29ht{fill:var(--ink,#111);font:bold 11px var(--font-mono,monospace)}.l29lbl{fill:var(--ink,#111);font:11px var(--font-mono,monospace)}.l29rt{fill:var(--ink-mute,#555);font:11px var(--font-mono,monospace)}.l29z{fill:var(--ink-soft,#777);opacity:.06}.l29v{stroke:var(--rule-soft,#ccc);stroke-width:.6}.l29c{fill:var(--ink-soft,#777);font:11px var(--font-mono,monospace)}</style>',
    parts.join(''),
    '<text class="l29c" x="8" y="216">http 代表 streamable-http； auth-cc 代表 OAuth 客户端凭据扩展</text>',
    '</svg>',
    '</div>',
    '<div class="mf-caption">谁发起调用、数据多敏感、执行多久、是否需要交互界面，这四个问题共同决定原语、传输、授权路径和扩展。表中 HTTP 代表 Streamable HTTP，auth-cc 代表客户端凭据授权扩展。</div>'
  ].join('');
  host.appendChild(shell);
}
// 注册标识： mcpa-29-use-case-matrix
