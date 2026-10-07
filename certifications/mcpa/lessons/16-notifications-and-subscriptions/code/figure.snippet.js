function subscriptionStreamFigure(host) {
  ensureStyles();
  var beats = [
    {dir: 'right', cls: 'ok', label: '监听 id=1: toolsListChanged, config.json'},
    {dir: 'left', cls: 'ok', label: '确认: _meta.subscriptionId=1'},
    {dir: 'right', cls: 'ok', label: '监听 id=2: resourcesListChanged'},
    {dir: 'left', cls: 'ok', label: '确认: _meta.subscriptionId=2'},
    {dir: 'left', cls: 'ok', label: 'resources/updated, subscriptionId=1'},
    {dir: 'left', cls: 'ok', label: 'resources/list_changed, subscriptionId=2'},
    {dir: 'right', cls: 'ok', label: 'tools/call id=3, _meta.progressToken=job-42'},
    {dir: 'left', cls: 'prog', label: 'progress 0.2, 0.6, 1.0：无 subscriptionId'},
    {dir: 'left', cls: 'ok', label: '结果 id=3: resultType complete'},
    {dir: 'right', cls: 'no', label: 'notifications/cancelled requestId=2'},
    {dir: 'left', cls: 'drop', label: '订阅 2 的迟到更新：本地丢弃'}
  ];
  var clientX = 61;
  var serverX = 499;
  var top = 46;
  var step = 26;
  var rows = [];
  var i;
  var y;
  var x1;
  var x2;
  var marker;
  for (i = 0; i < beats.length; i++) {
    y = top + i * step;
    x1 = beats[i].dir === 'right' ? clientX : serverX;
    x2 = beats[i].dir === 'right' ? serverX : clientX;
    marker = (beats[i].cls === 'no' || beats[i].cls === 'drop') ? 'l16arrowmute' : 'l16arrow';
    rows.push('<line class="l16' + beats[i].cls + '" x1="' + x1 + '" y1="' + y + '" x2="' + x2 + '" y2="' + y + '" marker-end="url(#' + marker + ')"/>');
    rows.push('<text class="l16lbl" x="280" y="' + (y - 6) + '" text-anchor="middle">' + beats[i].label + '</text>');
  }
  var lastY = top + (beats.length - 1) * step;
  var lifelineBottom = lastY + 14;
  var shell = document.createElement('div');
  shell.className = 'mf-shell';
  shell.innerHTML = [
    '<div class="mf-head"><strong>通知流、进度与取消</strong> 监听流的每条消息携带 subscriptionId；请求自己的进度不携带该标记</div>',
    '<div class="mf-body">',
    '<svg viewBox="0 0 560 330" role="img" aria-label="客户端先打开 id 为 1 和 2 的两个 subscriptions/listen，服务器分别确认，并在 _meta 中携带匹配的 subscriptionId。后续 resources/updated 和 list_changed 沿用各自标记。独立 tools/call 的进度只有 progressToken，没有 subscriptionId，最终结果也经同一请求返回。客户端随后取消订阅 2，迟到的更新被丢弃，不再交付。">',
    '<style>',
    '.l16x{fill:var(--bg-surface,#eee);stroke:var(--rule-soft,#ccc)}',
    '.l16t{fill:var(--ink,#111);font:11px var(--font-mono,monospace)}',
    '.l16lbl{fill:var(--ink-soft,#555);font:11px var(--font-mono,monospace)}',
    '.l16life{stroke:var(--rule-soft,#ccc);stroke-width:1;stroke-dasharray:2 3}',
    '.l16ok{stroke:var(--blueprint,#3553ff);stroke-width:1.6;fill:none}',
    '.l16prog{stroke:var(--ink,#111);stroke-width:1.4;fill:none;stroke-dasharray:1 3;stroke-linecap:round}',
    '.l16no{stroke:var(--ink-mute,#888);stroke-width:1.4;fill:none;stroke-dasharray:5 3}',
    '.l16drop{stroke:var(--ink-mute,#888);stroke-width:1.2;fill:none;stroke-dasharray:2 4;opacity:.7}',
    '</style>',
    '<marker id="l16arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="var(--blueprint,#3553ff)"/></marker>',
    '<marker id="l16arrowmute" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="var(--ink-mute,#888)"/></marker>',
    '<rect class="l16x" x="16" y="6" width="90" height="22"/><text class="l16t" x="26" y="21">客户端</text>',
    '<rect class="l16x" x="454" y="6" width="90" height="22"/><text class="l16t" x="464" y="21">服务器</text>',
    '<line class="l16life" x1="' + clientX + '" y1="28" x2="' + clientX + '" y2="' + lifelineBottom + '"/>',
    '<line class="l16life" x1="' + serverX + '" y1="28" x2="' + serverX + '" y2="' + lifelineBottom + '"/>',
    rows.join(''),
    '</svg>',
    '</div>',
    '<div class="mf-caption">两个订阅共用通道，通过每条确认和通知在 _meta 中携带的 subscriptionId 区分，其值等于打开订阅的请求 id。普通调用的进度与最终结果走该调用自己的响应通道，不携带 subscriptionId。取消后不再生成新订阅消息，但已在途的消息仍可能到达，接收方须丢弃。</div>'
  ].join('');
  host.appendChild(shell);
}
// 注册标识： mcpa-16-subscription-stream
