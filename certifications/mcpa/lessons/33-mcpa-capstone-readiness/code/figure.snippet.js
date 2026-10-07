function capstoneFlowFigure(host) {
  ensureStyles();
  var parts = [];
  parts.push('<rect class="l33x" x="4" y="28" width="84" height="44" rx="4"/><text class="l33t" x="12" y="54">发现</text>');
  parts.push('<rect class="l33x" x="96" y="28" width="108" height="44" rx="4"/><text class="l33t" x="104" y="54">模式检查</text>');
  parts.push('<rect class="l33x" x="212" y="28" width="116" height="44" rx="4"/><text class="l33t" x="220" y="54">MRTR 同意</text>');
  parts.push('<rect class="l33x" x="336" y="28" width="92" height="44" rx="4"/><text class="l33t" x="344" y="54">任务轮询</text>');
  parts.push('<rect class="l33x" x="436" y="28" width="120" height="44" rx="4"/><text class="l33t" x="444" y="54">可审查结果</text>');
  parts.push('<path class="l33a" d="M88 50 L96 50" marker-end="url(#l33arrow)"/>');
  parts.push('<path class="l33a" d="M204 50 L212 50" marker-end="url(#l33arrow)"/>');
  parts.push('<path class="l33a" d="M328 50 L336 50" marker-end="url(#l33arrow)"/>');
  parts.push('<path class="l33a" d="M428 50 L436 50" marker-end="url(#l33arrow)"/>');
  parts.push('<text class="l33c" x="4" y="84">traceparent：同一追踪 ID 贯穿全程</text>');
  parts.push('<path class="l33d" d="M4 90 L556 90"/>');
  parts.push('<circle class="l33p" cx="46" cy="90" r="3"/>');
  parts.push('<circle class="l33p" cx="150" cy="90" r="3"/>');
  parts.push('<circle class="l33p" cx="270" cy="90" r="3"/>');
  parts.push('<circle class="l33p" cx="382" cy="90" r="3"/>');
  parts.push('<circle class="l33p" cx="496" cy="90" r="3"/>');
  parts.push('<text class="l33c" x="4" y="153">审计日志：</text>');
  parts.push('<rect class="l33e" x="76" y="134" width="30" height="30" rx="3"/><text class="l33t" x="84" y="153">e1</text>');
  parts.push('<rect class="l33e" x="118" y="134" width="30" height="30" rx="3"/><text class="l33t" x="126" y="153">e2</text>');
  parts.push('<rect class="l33e" x="160" y="134" width="30" height="30" rx="3"/><text class="l33t" x="168" y="153">e3</text>');
  parts.push('<rect class="l33e" x="202" y="134" width="30" height="30" rx="3"/><text class="l33t" x="210" y="153">e4</text>');
  parts.push('<path class="l33a" d="M106 149 L118 149" marker-end="url(#l33arrow)"/>');
  parts.push('<path class="l33a" d="M148 149 L160 149" marker-end="url(#l33arrow)"/>');
  parts.push('<path class="l33a" d="M190 149 L202 149" marker-end="url(#l33arrow)"/>');
  parts.push('<text class="l33c" x="240" y="153">校验：通过</text>');
  parts.push('<rect class="l33o" x="330" y="134" width="226" height="30" rx="4"/><text class="l33t" x="338" y="153">OAuth：受众已检查</text>');
  var shell = document.createElement('div');
  shell.className = 'mf-shell';
  shell.innerHTML = [
    '<div class="mf-head"><strong>综合实训交互</strong> 从发现、同意和任务，到可审查的结果</div>',
    '<div class="mf-body">',
    '<svg viewBox="0 0 560 176" role="img" aria-label="一次综合交互经服务器发现、模式检查、MRTR 同意往返和任务轮询得到结果。下方虚线表示追踪 ID 跨阶段传播，四条目审计哈希链进行内部验证，独立 OAuth 受众检查约束其中一次 HTTP 调用。">',
    '<defs><marker id="l33arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0 0 L6 3 L0 6 z" fill="var(--blueprint,#3553ff)"/></marker></defs>',
    '<style>.l33x{fill:var(--bg-surface,#eee);stroke:var(--rule-soft,#ccc)}.l33e{fill:var(--bg-surface,#eee);stroke:var(--blueprint,#3553ff);stroke-width:1.2}.l33o{fill:none;stroke:var(--ink-mute,#999);stroke-width:1.2;stroke-dasharray:3 2}.l33t{fill:var(--ink,#111);font:11px var(--font-mono,monospace)}.l33c{fill:var(--ink-mute,#777);font:11px var(--font-mono,monospace)}.l33a{stroke:var(--blueprint,#3553ff);fill:none;stroke-width:1.5}.l33d{stroke:var(--ink-mute,#999);stroke-width:1;stroke-dasharray:2 3}.l33p{fill:var(--blueprint,#3553ff)}</style>',
    parts.join(''),
    '</svg>',
    '</div>',
    '<div class="mf-caption">一次模拟事故响应汇入多个领域：带缓存提示的发现，先返回 isError 的模式检查，HMAC 保护 requestState 的 MRTR 同意，以及任务轮询结果。共享追踪 ID 串联各跳，HTTP 调用检查 OAuth 受众，审计链记录部分决策并接受内部完整性检查；这些都不代替真实部署验收。</div>'
  ].join('');
  host.appendChild(shell);
}
// 注册标识： mcpa-33-capstone-flow
