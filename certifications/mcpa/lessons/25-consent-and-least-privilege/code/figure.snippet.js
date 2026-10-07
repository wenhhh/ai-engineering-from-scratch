function consentGatesFigure(host) {
  ensureStyles();
  var shell = document.createElement('div');
  shell.className = 'mf-shell';
  shell.innerHTML = [
    '<div class="mf-head"><strong>同意授权与最小权限</strong> 一次 tools/call 在执行前经过两道独立门禁</div>',
    '<div class="mf-body">',
    '<svg viewBox="0 0 560 210" role="img" aria-label="tools/call 首先接受权限范围检查。不足时返回 HTTP 403，客户端取已有与新要求范围的并集后重试。权限满足后再检查同意；需要批准时返回 input_required，收集用户答案后重试，最终才执行工具。">',
    '<style>',
    '.l25box{fill:var(--bg-surface,#eee);stroke:var(--rule-soft,#ccc)}',
    '.l25t{fill:var(--ink,#111);font:11px var(--font-mono,monospace)}',
    '.l25tm{fill:var(--ink-mute,#777);font:11px var(--font-mono,monospace)}',
    '.l25tl{fill:var(--ink-soft,#666);font:11px var(--font-mono,monospace)}',
    '.l25arrow{stroke:var(--blueprint,#3553ff);stroke-width:1.6;fill:none}',
    '.l25loop{stroke:var(--ink-soft,#999);stroke-width:1.2;fill:none;stroke-dasharray:3 2}',
    '.l25m{fill:var(--blueprint,#3553ff)}',
    '</style>',
    '<defs>',
    '<marker id="l25arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path class="l25m" d="M0 0 L6 3 L0 6 Z"/></marker>',
    '<marker id="l25loopend" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path class="l25m" d="M0 0 L6 3 L0 6 Z"/></marker>',
    '</defs>',
    '<rect class="l25box" x="8" y="40" width="88" height="40"/>',
    '<text class="l25t" x="14" y="56">tools/call</text>',
    '<text class="l25tm" x="14" y="70">客户端发送</text>',
    '<rect class="l25box" x="140" y="40" width="112" height="40"/>',
    '<text class="l25t" x="146" y="56">权限检查</text>',
    '<text class="l25tm" x="146" y="70">不足返回 403</text>',
    '<rect class="l25box" x="304" y="40" width="112" height="40"/>',
    '<text class="l25t" x="310" y="56">同意检查</text>',
    '<text class="l25tm" x="310" y="70">input_required</text>',
    '<rect class="l25box" x="468" y="40" width="84" height="40"/>',
    '<text class="l25t" x="474" y="56">执行工具</text>',
    '<text class="l25tm" x="474" y="70">isError: false</text>',
    '<line class="l25arrow" x1="96" y1="60" x2="138" y2="60" marker-end="url(#l25arrow)"/>',
    '<line class="l25arrow" x1="252" y1="60" x2="302" y2="60" marker-end="url(#l25arrow)"/>',
    '<text class="l25tl" x="256" y="52">权限满足</text>',
    '<line class="l25arrow" x1="416" y1="60" x2="466" y2="60" marker-end="url(#l25arrow)"/>',
    '<text class="l25tl" x="420" y="52">已同意</text>',
    '<path class="l25loop" d="M172 80 C 150 132, 245 132, 222 80" marker-end="url(#l25loopend)"/>',
    '<text class="l25tl" x="137" y="150">403：取并集后重试</text>',
    '<path class="l25loop" d="M334 80 C 310 132, 410 132, 386 80" marker-end="url(#l25loopend)"/>',
    '<text class="l25tl" x="273" y="150">未同意：征询后重试</text>',
    '</svg>',
    '</div>',
    '<div class="mf-caption">先检查权限范围：不足时返回 HTTP 403，客户端对已有及新增要求取并集，并在有界次数内重新授权。通过后再检查用户同意，需要批准的调用通过 input_required 与信息征询往返完成。两道门禁都能独立阻止操作。</div>'
  ].join('');
  host.appendChild(shell);
}
// 注册标识： mcpa-25-consent-gates
