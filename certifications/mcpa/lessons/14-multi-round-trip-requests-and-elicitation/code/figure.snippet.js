function mrtrFigure(host) {
  ensureStyles();
  var clientX = 100;
  var serverX = 460;
  var rows = [
    {y: 70, dir: 'right', label: 'tools/call (id 1): deploy_release'},
    {y: 118, dir: 'left', label: 'input_required: 确认 + requestState'},
    {y: 160, dir: 'note', label: '客户端向用户收集确认'},
    {y: 206, dir: 'right', label: 'tools/call (id 2): 新 id，inputResponses'},
    {y: 254, dir: 'left', label: 'complete: deployed = true'}
  ];
  var parts = [];
  parts.push('<line class="l14lane" x1="' + clientX + '" y1="40" x2="' + clientX + '" y2="272"/>');
  parts.push('<line class="l14lane" x1="' + serverX + '" y1="40" x2="' + serverX + '" y2="272"/>');
  parts.push('<rect class="l14box" x="' + (clientX - 36) + '" y="16" width="72" height="22"/><text class="l14role" x="' + clientX + '" y="31" text-anchor="middle">客户端</text>');
  parts.push('<rect class="l14box" x="' + (serverX - 36) + '" y="16" width="72" height="22"/><text class="l14role" x="' + serverX + '" y="31" text-anchor="middle">服务器</text>');
  var mid = (clientX + serverX) / 2;
  var i;
  for (i = 0; i < rows.length; i++) {
    var row = rows[i];
    if (row.dir === 'note') {
      parts.push('<text class="l14note" x="' + mid + '" y="' + row.y + '" text-anchor="middle">' + row.label + '</text>');
      continue;
    }
    var x1 = row.dir === 'right' ? clientX : serverX;
    var x2 = row.dir === 'right' ? serverX : clientX;
    parts.push('<text class="l14lbl" x="' + mid + '" y="' + (row.y - 10) + '" text-anchor="middle">' + row.label + '</text>');
    parts.push('<line class="l14arrow" x1="' + x1 + '" y1="' + row.y + '" x2="' + x2 + '" y2="' + row.y + '" marker-end="url(#l14arrowhead)"/>');
  }
  var shell = document.createElement('div');
  shell.className = 'mf-shell';
  shell.innerHTML = [
    '<div class="mf-head"><strong>多轮往返请求</strong> input_required 结束本轮，再用原样 requestState 发起新请求</div>',
    '<div class="mf-body">',
    '<svg viewBox="0 0 560 290" role="img" aria-label="客户端发送 id 1 的 tools/call。服务器用包含 inputRequests 和 requestState 的 input_required 结束该请求，不维持原流等待。客户端收集用户确认，再发起 id 2 的独立 tools/call，携带 inputResponses 并准确回传 requestState，服务器随后返回 complete。">',
    '<defs><marker id="l14arrowhead" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path class="l14arrowfill" d="M0,0 L10,5 L0,10 z"/></marker></defs>',
    '<style>.l14lane{stroke:var(--rule-soft,#ccc);stroke-width:1;stroke-dasharray:3,3}.l14box{fill:var(--bg-surface,#eee);stroke:var(--rule-soft,#ccc)}.l14role{fill:var(--ink,#111);font:bold 12px var(--font-mono,monospace)}.l14arrow{stroke:var(--blueprint,#3553ff);stroke-width:1.6}.l14arrowfill{fill:var(--blueprint,#3553ff)}.l14lbl{fill:var(--ink,#111);font:11px var(--font-mono,monospace)}.l14note{fill:var(--ink-mute,#777);font:italic 11px var(--font-mono,monospace)}</style>',
    parts.join(''),
    '</svg>',
    '</div>',
    '<div class="mf-caption">服务器不主动向客户端推送请求，而是以 input_required 结束第一轮。客户端使用新 JSON-RPC id 发起独立的第二轮调用，逐字节回传 requestState，并提供 inputResponses。</div>'
  ].join('');
  host.appendChild(shell);
}
// 注册标识： mcpa-14-mrtr
