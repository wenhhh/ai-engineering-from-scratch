function taskStateLifecycleFigure(host) {
  ensureStyles();
  var boxes = [
    { cls: 'l21x', x: 30, y: 24, w: 150, h: 44, tx: 105, ty: 51, label: 'input_required' },
    { cls: 'l21x', x: 30, y: 188, w: 150, h: 44, tx: 105, ty: 215, label: 'working' },
    { cls: 'l21x l21f', x: 380, y: 20, w: 150, h: 40, tx: 455, ty: 44, label: 'completed' },
    { cls: 'l21x l21f', x: 380, y: 110, w: 150, h: 40, tx: 455, ty: 134, label: 'cancelled' },
    { cls: 'l21x l21f', x: 380, y: 200, w: 150, h: 40, tx: 455, ty: 224, label: 'failed' }
  ];
  var parts = [];
  var i;
  for (i = 0; i < boxes.length; i++) {
    var b = boxes[i];
    parts.push('<rect class="' + b.cls + '" x="' + b.x + '" y="' + b.y + '" width="' + b.w + '" height="' + b.h + '" rx="4"/>');
    parts.push('<text class="l21t" x="' + b.tx + '" y="' + b.ty + '">' + b.label + '</text>');
  }
  var edges = [
    ['95', '185', '95', '71', '6', '105', '需要输入'],
    ['118', '71', '118', '185', '132', '155', 'tasks/update'],
    ['183', '193', '377', '42', '250', '128', '工作完成'],
    ['183', '210', '377', '130', '250', '169', 'tasks/cancel'],
    ['183', '227', '377', '218', '250', '208', '协议错误']
  ];
  for (i = 0; i < edges.length; i++) {
    var e = edges[i];
    parts.push('<line class="l21a" x1="' + e[0] + '" y1="' + e[1] + '" x2="' + e[2] + '" y2="' + e[3] + '" marker-end="url(#l21arrow)"/>');
    parts.push('<text class="l21e" x="' + e[4] + '" y="' + e[5] + '">' + e[6] + '</text>');
  }
  var shell = document.createElement('div');
  shell.className = 'mf-shell';
  shell.innerHTML = [
    '<div class="mf-head"><strong>任务状态生命周期</strong> working 可暂停为 input_required，经 tasks/update 恢复，最终进入终态</div>',
    '<div class="mf-body">',
    '<svg viewBox="0 0 560 260" role="img" aria-label="MCP 任务状态图：服务器需要输入时，working 变为 input_required；tasks/update 提交答案后恢复 working。工作完成进入 completed，取消进入 cancelled，协议错误进入 failed；三个终态使用虚线边框。">',
    '<defs><marker id="l21arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path class="l21p" d="M0,0 L10,5 L0,10 Z"/></marker></defs>',
    '<style>.l21x{fill:var(--bg-surface,#eee);stroke:var(--ink-soft,#999);stroke-width:1.2}.l21f{stroke-dasharray:4,2}.l21t{fill:var(--ink,#111);font:12px var(--font-mono,monospace);text-anchor:middle}.l21a{stroke:var(--blueprint,#3553ff);stroke-width:1.6;fill:none}.l21p{fill:var(--blueprint,#3553ff)}.l21e{fill:var(--ink-mute,#666);font:11px var(--font-mono,monospace)}</style>',
    parts.join(''),
    '</svg>',
    '</div>',
    '<div class="mf-caption">tasks/get 在终态前持续返回任务快照，图中省略重复轮询的自环。任务也可从 input_required 直接取消或失败。SEP-2663 将最终结果与错误内嵌到同一个 tasks/get 响应，不再单独调用 tasks/result。</div>'
  ].join('');
  host.appendChild(shell);
}
// 注册标识： mcpa-21-task-states
