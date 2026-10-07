function registryGatewayFigure(host) {
  ensureStyles();
  var parts = [];
  function box(cls, x, y, w, h, title, sub, titleCls, subCls) {
    parts.push('<rect class="' + cls + '" x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="4"/>');
    parts.push('<text class="' + (titleCls || 'l32bt') + '" x="' + (x + 10) + '" y="' + (y + 18) + '">' + title + '</text>');
    if (sub) {
      parts.push('<text class="' + (subCls || 'l32bs') + '" x="' + (x + 10) + '" y="' + (y + 34) + '">' + sub + '</text>');
    }
  }
  function arrow(cls, marker, x1, y1, x2, y2) {
    parts.push('<line class="' + cls + '" x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" marker-end="url(#' + marker + ')"/>');
  }
  function label(x, y, text) {
    parts.push('<text class="l32n" x="' + x + '" y="' + y + '">' + text + '</text>');
  }

  box('l32b', 30, 20, 120, 44, '发布者', '证明所有权');
  box('l32b', 200, 20, 150, 44, '注册目录', 'server.json');
  box('l32b', 420, 20, 120, 44, '聚合器', '按小时轮询');
  arrow('l32a', 'l32arrow', 150, 42, 200, 42);
  arrow('l32a', 'l32arrow', 350, 42, 420, 42);
  label(148, 14, '已核验');
  label(358, 14, '已获取');
  label(30, 78, '固定资料：公开条目，目录处于预览阶段');

  box('l32b', 30, 104, 110, 44, '客户端', '调用方');
  box('l32b', 190, 104, 170, 44, '网关', '头部 = 正文？');
  box('l32b', 410, 104, 120, 44, '后端', 'Tier 1 SDK');
  box('l32bx', 190, 180, 170, 40, '-32020', '头部与正文不符');
  arrow('l32a', 'l32arrow', 140, 126, 190, 126);
  arrow('l32am', 'l32arrowm', 360, 126, 410, 126);
  arrow('l32a', 'l32arrow', 275, 148, 275, 180);
  label(370, 118, '匹配');
  label(283, 172, '不匹配');

  label(30, 246, 'SDK 符合性等级：持续检查');
  box('l32tb', 30, 256, 160, 46, 'Tier 1', '100% 符合性', 'l32tt', 'l32ts');
  box('l32tb', 210, 256, 160, 46, 'Tier 2', '80% 符合性', 'l32tt', 'l32ts');
  box('l32tb', 390, 256, 160, 46, 'Tier 3', '实验性', 'l32tt', 'l32ts');

  var shell = document.createElement('div');
  shell.className = 'mf-shell';
  shell.innerHTML = [
    '<div class="mf-head"><strong>发现、路由与判断服务器</strong> 目录准入、网关头部检查、SDK 等级分别判断</div>',
    '<div class="mf-body">',
    '<svg viewBox="0 0 560 320" role="img" aria-label="发布者先证明命名空间所有权，目录才接纳 server.json，再由聚合器按节奏读取。另一路径中，网关核对 Mcp-Method、Mcp-Name 与正文，一致才访问后端，不一致在进入后端前返回 -32020。下方列出持续测量的三个 SDK 符合性等级。">',
    '<defs>',
    '<marker id="l32arrow" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto"><path class="l32af" d="M0,0 L8,4 L0,8 z"/></marker>',
    '<marker id="l32arrowm" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto"><path class="l32afm" d="M0,0 L8,4 L0,8 z"/></marker>',
    '</defs>',
    '<style>',
    '.l32b{fill:var(--bg-surface,#eee);stroke:var(--blueprint,#3553ff);stroke-width:1.4}',
    '.l32bx{fill:var(--bg-surface,#eee);stroke:var(--ink-mute,#999);stroke-width:1.2;stroke-dasharray:4,3}',
    '.l32bt{fill:var(--ink,#111);font:bold 11px var(--font-mono,monospace)}',
    '.l32bs{fill:var(--ink-mute,#666);font:11px var(--font-mono,monospace)}',
    '.l32a{stroke:var(--ink-mute,#999);stroke-width:1.2}',
    '.l32am{stroke:var(--blueprint,#3553ff);stroke-width:1.6}',
    '.l32af{fill:var(--ink-mute,#999)}',
    '.l32afm{fill:var(--blueprint,#3553ff)}',
    '.l32n{fill:var(--ink-soft,#777);font:11px var(--font-mono,monospace)}',
    '.l32tb{fill:var(--bg-surface,#eee);stroke:var(--rule-soft,#ccc)}',
    '.l32tt{fill:var(--blueprint,#3553ff);font:bold 11px var(--font-mono,monospace)}',
    '.l32ts{fill:var(--ink-mute,#666);font:11px var(--font-mono,monospace)}',
    '</style>',
    parts.join(''),
    '</svg>',
    '</div>',
    '<div class="mf-caption">验证命名空间使 server.json 可以进入目录，但不保证每个请求都获准访问后端。网关独立核对请求头与正文，匹配后路由，不匹配则返回 -32020。SDK 等级又是独立的实现覆盖与维护信号，需要持续测量。</div>'
  ].join('');
  host.appendChild(shell);
}
// 注册标识： mcpa-32-registry-flow
