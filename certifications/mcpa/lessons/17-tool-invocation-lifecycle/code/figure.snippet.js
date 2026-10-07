function toolLifecycleFigure(host) {
  ensureStyles();
  var stages = [
    '发现：server/discover',
    '列举：tools/list，可缓存',
    '选择：模型选择工具',
    '确认：宿主批准门禁',
    '调用：发送 tools/call',
    '校验：工具是否存在',
    '执行：校验参数并运行',
    '结果：resultType'
  ];
  var barX = 16;
  var barW = 234;
  var barH = 26;
  var gap = 14;
  var step = barH + gap;
  var parts = [];
  var i;
  for (i = 0; i < stages.length; i++) {
    var y = 14 + i * step;
    parts.push('<rect class="l17bar" x="' + barX + '" y="' + y + '" width="' + barW + '" height="' + barH + '"/>');
    parts.push('<text class="l17lbl" x="' + (barX + 10) + '" y="' + (y + 17) + '">' + stages[i] + '</text>');
    if (i < stages.length - 1) {
      var midX = barX + barW / 2;
      parts.push('<line class="l17chain" x1="' + midX + '" y1="' + (y + barH) + '" x2="' + midX + '" y2="' + (y + barH + gap) + '" marker-end="url(#l17arrow)"/>');
    }
  }
  var yCall = 14 + 4 * step;
  var yValidate = 14 + 5 * step;
  var yExecute = 14 + 6 * step;
  var yResult = 14 + 7 * step;
  var yRetry = yResult + step;
  var rightX = 340;
  var rightW = 204;
  var rightEdge = barX + barW;

  parts.push('<line class="l17dash" x1="' + rightEdge + '" y1="' + (yValidate + 13) + '" x2="' + rightX + '" y2="' + (yValidate + 13) + '"/>');
  parts.push('<rect class="l17err" x="' + rightX + '" y="' + yValidate + '" width="' + rightW + '" height="' + barH + '"/>');
  parts.push('<text class="l17lbl" x="' + (rightX + 10) + '" y="' + (yValidate + 17) + '">未知工具：-32602</text>');

  parts.push('<line class="l17dash" x1="' + rightEdge + '" y1="' + (yExecute + 13) + '" x2="' + rightX + '" y2="' + (yExecute + 13) + '"/>');
  parts.push('<rect class="l17soft" x="' + rightX + '" y="' + yExecute + '" width="' + rightW + '" height="' + barH + '"/>');
  parts.push('<text class="l17lbl" x="' + (rightX + 10) + '" y="' + (yExecute + 17) + '">isError（可修正）</text>');

  parts.push('<line class="l17dash" x1="' + rightEdge + '" y1="' + (yResult + 13) + '" x2="' + rightX + '" y2="' + (yResult + 13) + '"/>');
  parts.push('<rect class="l17ok" x="' + rightX + '" y="' + yResult + '" width="' + rightW + '" height="' + barH + '"/>');
  parts.push('<text class="l17lbl" x="' + (rightX + 10) + '" y="' + (yResult + 17) + '">complete：最终结束</text>');

  var elbowX = rightEdge + 30;
  var connectY = yRetry + 8;
  parts.push('<line class="l17dash" x1="' + rightEdge + '" y1="' + (yResult + 13) + '" x2="' + elbowX + '" y2="' + (yResult + 13) + '"/>');
  parts.push('<line class="l17dash" x1="' + elbowX + '" y1="' + (yResult + 13) + '" x2="' + elbowX + '" y2="' + connectY + '"/>');
  parts.push('<line class="l17dash" x1="' + elbowX + '" y1="' + connectY + '" x2="' + rightX + '" y2="' + connectY + '"/>');
  parts.push('<rect class="l17soft" x="' + rightX + '" y="' + yRetry + '" width="' + rightW + '" height="' + barH + '"/>');
  parts.push('<text class="l17lbl" x="' + (rightX + 10) + '" y="' + (yRetry + 17) + '">input_required：重试</text>');

  var loopX = rightEdge + 18;
  var loopY = yRetry + 18;
  parts.push('<path class="l17loop" d="M ' + rightX + ' ' + loopY + ' L ' + loopX + ' ' + loopY + ' L ' + loopX + ' ' + (yCall + 13) + ' L ' + (rightEdge + 2) + ' ' + (yCall + 13) + '" marker-end="url(#l17arrow)"/>');

  var height = yRetry + barH + 24;
  var shell = document.createElement('div');
  shell.className = 'mf-shell';
  shell.innerHTML = [
    '<div class="mf-head"><strong>工具调用生命周期</strong> 八个检查点、两个错误通道，以及 input_required 重试循环</div>',
    '<div class="mf-body">',
    '<svg viewBox="0 0 560 ' + height + '" role="img" aria-label="八个检查点纵向排列：发现、列举、选择、确认、调用、校验、执行、结果。校验遇到未知工具时分向 -32602 协议错误；执行遇到工具问题时分向 isError 结果。结果又分成 complete 最终结束，以及以新请求 id 回到调用的 input_required 路径。">',
    '<defs><marker id="l17arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path class="l17arrowfill" d="M0,0 L10,5 L0,10 z"/></marker></defs>',
    '<style>.l17bar{fill:var(--bg-surface,#eee);stroke:var(--ink,#111)}.l17lbl{fill:var(--ink,#111);font:11px var(--font-mono,monospace)}.l17chain{stroke:var(--blueprint,#3553ff);stroke-width:1.4}.l17arrowfill{fill:var(--blueprint,#3553ff)}.l17dash{stroke:var(--ink-mute,#888);stroke-width:1;stroke-dasharray:3,3}.l17err{fill:var(--bg-surface,#eee);stroke:var(--blueprint,#3553ff);stroke-width:1.6}.l17soft{fill:var(--bg-surface,#eee);stroke:var(--ink-mute,#888)}.l17ok{fill:var(--bg-surface,#eee);stroke:var(--ink,#111);stroke-width:1.6}.l17loop{fill:none;stroke:var(--ink,#111);stroke-width:1.4}</style>',
    parts.join(''),
    '</svg>',
    '</div>',
    '<div class="mf-caption">本课校验阶段只检查工具是否存在，未知时返回 -32602，不进入执行或正常结果阶段。执行中的无效参数和业务问题以 complete 中的 isError 返回，让模型读取原因并修正。input_required 尚未结束逻辑调用：客户端回答后使用新 id，再次经过校验、执行与结果。</div>'
  ].join('');
  host.appendChild(shell);
}
// 注册标识： mcpa-17-lifecycle
