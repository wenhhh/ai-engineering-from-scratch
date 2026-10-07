function modelInteractionFlowFigure(host) {
  ensureStyles();
  var parts = [];
  parts.push('<rect class="l10x" x="6" y="26" width="90" height="44" rx="4"/><text class="l10t" x="14" y="53">用户提问</text>');
  parts.push('<rect class="l10x" x="104" y="26" width="116" height="44" rx="4"/><text class="l10t" x="112" y="53">宿主：上下文</text>');
  parts.push('<rect class="l10x" x="228" y="26" width="112" height="44" rx="4"/><text class="l10t" x="236" y="53">模型选择</text>');
  parts.push('<rect class="l10g" x="348" y="26" width="104" height="44" rx="4"/><text class="l10t" x="356" y="53">确认门禁</text>');
  parts.push('<rect class="l10x" x="460" y="26" width="94" height="44" rx="4"/><text class="l10t" x="468" y="53">服务器</text>');
  parts.push('<path class="l10a" d="M96 48 L104 48" marker-end="url(#l10arrow)"/>');
  parts.push('<path class="l10a" d="M220 48 L228 48" marker-end="url(#l10arrow)"/>');
  parts.push('<path class="l10a" d="M340 48 L348 48" marker-end="url(#l10arrow)"/>');
  parts.push('<path class="l10a" d="M452 48 L460 48" marker-end="url(#l10arrow)"/>');
  parts.push('<text class="l10c" x="410" y="18">已批准</text>');
  parts.push('<rect class="l10h" x="20" y="110" width="140" height="40" rx="4"/><text class="l10t" x="28" y="134">留在本地（拒绝）</text>');
  parts.push('<path class="l10a" d="M402 70 L90 110" marker-end="url(#l10arrow)"/>');
  parts.push('<text class="l10c" x="330" y="92">已拒绝，未发送</text>');
  parts.push('<rect class="l10x" x="20" y="180" width="110" height="44" rx="4"/><text class="l10t" x="28" y="207">complete</text>');
  parts.push('<rect class="l10x" x="160" y="180" width="140" height="44" rx="4"/><text class="l10t" x="168" y="207">isError: true</text>');
  parts.push('<rect class="l10x" x="330" y="180" width="170" height="44" rx="4"/><text class="l10t" x="338" y="207">input_required</text>');
  parts.push('<path class="l10a" d="M507 70 L75 180" marker-end="url(#l10arrow)"/>');
  parts.push('<path class="l10a" d="M507 70 L230 180" marker-end="url(#l10arrow)"/>');
  parts.push('<path class="l10a" d="M507 70 L415 180" marker-end="url(#l10arrow)"/>');
  parts.push('<path class="l10fb" d="M230 180 L230 80 L284 80 L284 70" marker-end="url(#l10arrow)"/>');
  parts.push('<path class="l10fb" d="M415 180 L415 86 L300 86 L300 70" marker-end="url(#l10arrow)"/>');
  parts.push('<text class="l10c" x="196" y="76">修正参数后重试</text>');
  parts.push('<text class="l10c" x="330" y="170">新 id 重试，原样回传 requestState</text>');
  parts.push('<rect class="l10x" x="10" y="250" width="150" height="36" rx="4"/><text class="l10t" x="18" y="272">回答用户</text>');
  parts.push('<path class="l10a" d="M75 224 L85 250" marker-end="url(#l10arrow)"/>');
  var shell = document.createElement('div');
  shell.className = 'mf-shell';
  shell.innerHTML = [
    '<div class="mf-head"><strong>模型交互流程</strong> 上下文、选择、确认、调用与结果反馈</div>',
    '<div class="mf-body">',
    '<svg viewBox="0 0 560 296" role="img" aria-label="用户请求经宿主构建上下文、模型选择工具并拟定参数，再进入确认门禁。批准后调用到达服务器，拒绝则留在本地不发送。服务器可以返回形成答案的完整结果、让模型修正参数的工具执行错误，或要求宿主收集输入、用新 id 和原样 requestState 重试的 input_required。">',
    '<defs><marker id="l10arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0 0 L6 3 L0 6 z" fill="var(--blueprint,#3553ff)"/></marker></defs>',
    '<style>.l10x{fill:var(--bg-surface,#eee);stroke:var(--rule-soft,#ccc)}.l10g{fill:var(--bg-surface,#eee);stroke:var(--blueprint,#3553ff);stroke-width:1.5}.l10h{fill:none;stroke:var(--ink-mute,#999);stroke-width:1.2;stroke-dasharray:3 2}.l10t{fill:var(--ink,#111);font:11px var(--font-mono,monospace)}.l10c{fill:var(--ink-mute,#777);font:11px var(--font-mono,monospace)}.l10a{stroke:var(--blueprint,#3553ff);fill:none;stroke-width:1.5}.l10fb{stroke:var(--ink-mute,#999);fill:none;stroke-width:1.4;stroke-dasharray:4 3}</style>',
    parts.join(''),
    '</svg>',
    '</div>',
    '<div class="mf-caption">被拒确认在客户端发送前终止，不会成为调用报文。已到达服务器的分支中，工具执行错误和 input_required 都会把控制权交回模型；MRTR 分支除使用新 id 外，还需原样回传 requestState。协议错误也交回控制权，但不能靠原样重复修复，因此循环不重发同一请求。</div>'
  ].join('');
  host.appendChild(shell);
}
// 注册标识： mcpa-10-interaction-flow
