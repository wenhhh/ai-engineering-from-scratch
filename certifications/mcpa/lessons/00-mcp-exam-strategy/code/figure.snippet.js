function blueprintWeightsFigure(host) {
  ensureStyles();

  var domains = [
    { label: 'MCP 基础', weight: 16 },
    { label: '架构', weight: 14 },
    { label: '交互', weight: 26 },
    { label: '安全', weight: 24 },
    { label: '用例', weight: 20 }
  ];

  var baseline = 210;
  var barWidth = 70;
  var step = 100;
  var startX = 45;
  var pxPerPercent = 5;

  var bars = '';
  var i, d, x, barHeight, barY, valueY, labelY, centerX;
  for (i = 0; i < domains.length; i += 1) {
    d = domains[i];
    x = startX + i * step;
    centerX = x + barWidth / 2;
    barHeight = d.weight * pxPerPercent;
    barY = baseline - barHeight;
    valueY = barY - 8;
    labelY = baseline + 18;
    bars += '<rect class="mfbar" x="' + x + '" y="' + barY + '" width="' + barWidth + '" height="' + barHeight + '"/>';
    bars += '<text class="mfval" x="' + centerX + '" y="' + valueY + '">' + d.weight + '%</text>';
    bars += '<text class="mflabel" x="' + centerX + '" y="' + labelY + '">' + d.label + '</text>';
  }

  var shell = document.createElement('div');
  shell.className = 'mf-shell';
  shell.innerHTML = [
    '<div class="mf-head"><strong>MCPA 考试大纲</strong> 按考试内容比例分配五个领域的权重</div>',
    '<div class="mf-body">',
    '<svg viewBox="0 0 560 250" role="img" aria-label="五个领域的权重柱状图：MCP 基础 16%，架构与组件 14%，交互与执行 26%，安全与治理 24%，用例与生态 20%。">',
    '<style>.mfbar{fill:var(--blueprint,#3553ff);opacity:.85}.mfval{fill:var(--ink,#111);font:11px var(--font-mono,monospace);text-anchor:middle}.mflabel{fill:var(--ink-mute,#777);font:11px var(--font-mono,monospace);text-anchor:middle}.mfaxis{stroke:var(--rule-soft,#ccc);stroke-width:1}</style>',
    '<line class="mfaxis" x1="30" y1="210" x2="530" y2="210"/>',
    bars,
    '</svg>',
    '</div>',
    '<div class="mf-caption">交互与执行、安全与治理合计占据一半大纲。平均分配五个领域的学习时间，会使这两个最高权重领域投入不足。</div>'
  ].join('');
  host.appendChild(shell);
}

// 注册标识： mcpa-00-blueprint-weights
