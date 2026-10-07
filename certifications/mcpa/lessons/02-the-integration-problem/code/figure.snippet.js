function nByMFigure(host) {
  ensureStyles();
  var apps = ['聊天', '编辑器', '智能体', '门户'];
  var systems = ['文件', '工单', 'CRM', '文档', '数据库', 'CI'];
  var left = [];
  var right = [];
  var i;
  var j;
  for (i = 0; i < apps.length; i++) {
    for (j = 0; j < systems.length; j++) {
      left.push('<line class="nbl" x1="92" y1="' + (46 + i * 44) + '" x2="208" y2="' + (30 + j * 30) + '"/>');
    }
  }
  for (i = 0; i < apps.length; i++) {
    left.push('<rect class="nbx" x="16" y="' + (34 + i * 44) + '" width="76" height="24"/><text class="nbt" x="24" y="' + (50 + i * 44) + '">' + apps[i] + '</text>');
    right.push('<rect class="nbx" x="300" y="' + (34 + i * 44) + '" width="76" height="24"/><text class="nbt" x="308" y="' + (50 + i * 44) + '">' + apps[i] + '</text>');
    right.push('<line class="nba" x1="376" y1="' + (46 + i * 44) + '" x2="420" y2="120"/>');
  }
  for (j = 0; j < systems.length; j++) {
    left.push('<rect class="nbx" x="208" y="' + (18 + j * 30) + '" width="60" height="22"/><text class="nbt" x="214" y="' + (33 + j * 30) + '">' + systems[j] + '</text>');
    right.push('<rect class="nbx" x="486" y="' + (18 + j * 30) + '" width="60" height="22"/><text class="nbt" x="492" y="' + (33 + j * 30) + '">' + systems[j] + '</text>');
    right.push('<line class="nba" x1="440" y1="120" x2="486" y2="' + (29 + j * 30) + '"/>');
  }
  var shell = document.createElement('div');
  shell.className = 'mf-shell';
  shell.innerHTML = [
    '<div class="mf-head"><strong>集成问题</strong> 24 套定制集成与 10 份协议实现</div>',
    '<div class="mf-body">',
    '<svg viewBox="0 0 560 230" role="img" aria-label="左：四个应用分别连接六个系统，共二十四条连接。右：每个应用和系统只连接共享协议一次，共十条连接。">',
    '<style>.nbx{fill:var(--bg-surface,#eee);stroke:var(--rule-soft,#ccc)}.nbt{fill:var(--ink,#111);font:11px var(--font-mono,monospace)}.nbl{stroke:var(--ink-mute,#999);stroke-width:.6;opacity:.7}.nba{stroke:var(--blueprint,#3553ff);stroke-width:1.4}.nbp{fill:var(--blueprint,#3553ff)}.nbc{fill:var(--ink-mute,#777);font:11px var(--font-mono,monospace)}</style>',
    left.join(''),
    right.join(''),
    '<rect class="nbp" x="420" y="100" width="20" height="40" rx="3"/>',
    '<text class="nbc" x="96" y="222">N x M = 24 套集成</text>',
    '<text class="nbc" x="358" y="222">N + M = 10 份实现</text>',
    '</svg>',
    '</div>',
    '<div class="mf-caption">定制胶水代码随应用与系统的配对数量增长。共享协议让每个应用只实现一次客户端、每个系统只实现一次服务器；任意客户端都可在运行时发现服务器。</div>'
  ].join('');
  host.appendChild(shell);
}
// 注册标识： mcpa-02-n-by-m
