function tracePropagationFigure(host) {
  ensureStyles();
  var shell = document.createElement('div');
  shell.className = 'mf-shell';
  shell.innerHTML = [
    '<div class="mf-head"><strong>追踪传播与审计链</strong> 同一追踪 ID，三个程序，两份独立日志</div>',
    '<div class="mf-body">',
    '<svg viewBox="0 0 560 170" role="img" aria-label="客户端调用 ops-desk，再由其调用 credential-vault。两跳共享追踪 ID，跨度 ID 分别生成。两台服务器下方的三条目哈希链表示各自独立维护审计日志。">',
    '<style>.tpfbox{fill:var(--bg-surface,#eee);stroke:var(--rule-soft,#ccc)}.tpft{fill:var(--ink,#111);font:11px var(--font-mono,monospace);text-anchor:middle}.tpfl{fill:var(--ink-mute,#767676);font:11px var(--font-mono,monospace);text-anchor:middle}.tpfarrow{stroke:var(--blueprint,#3553ff);stroke-width:1.5;fill:none}.tpfchain{fill:var(--bg-surface,#eee);stroke:var(--blueprint,#3553ff)}.tpfchainline{stroke:var(--blueprint,#3553ff);stroke-width:1.3}</style>',
    '<rect class="tpfbox" x="8" y="20" width="92" height="34"/><text class="tpft" x="54" y="41">客户端</text>',
    '<rect class="tpfbox" x="234" y="20" width="92" height="34"/><text class="tpft" x="280" y="41">ops-desk</text>',
    '<rect class="tpfbox" x="460" y="20" width="92" height="34"/><text class="tpft" x="506" y="41">cred-vault</text>',
    '<path class="tpfarrow" d="M100 37 L228 37" marker-end="url(#tpfarrow)"/>',
    '<path class="tpfarrow" d="M326 37 L454 37" marker-end="url(#tpfarrow)"/>',
    '<text class="tpfl" x="167" y="64">追踪 a1e4c9d0</text><text class="tpfl" x="167" y="78">跨度 5f2b8e13</text>',
    '<text class="tpfl" x="393" y="64">追踪 a1e4c9d0</text><text class="tpfl" x="393" y="78">跨度 d40a7c66</text>',
    '<text class="tpfl" x="280" y="104">独立审计日志</text>',
    '<text class="tpfl" x="506" y="104">独立审计日志</text>',
    '<rect class="tpfchain" x="245" y="112" width="14" height="14" rx="2"/><rect class="tpfchain" x="273" y="112" width="14" height="14" rx="2"/><rect class="tpfchain" x="301" y="112" width="14" height="14" rx="2"/>',
    '<line class="tpfchainline" x1="259" y1="119" x2="273" y2="119"/><line class="tpfchainline" x1="287" y1="119" x2="301" y2="119"/>',
    '<rect class="tpfchain" x="471" y="112" width="14" height="14" rx="2"/><rect class="tpfchain" x="499" y="112" width="14" height="14" rx="2"/><rect class="tpfchain" x="527" y="112" width="14" height="14" rx="2"/>',
    '<line class="tpfchainline" x1="485" y1="119" x2="499" y2="119"/><line class="tpfchainline" x1="513" y1="119" x2="527" y2="119"/>',
    '<text class="tpfl" x="280" y="148">共享追踪 ID，各自维护哈希链</text>',
    '<text class="tpfl" x="506" y="148">共享追踪 ID，各自维护哈希链</text>',
    '<defs><marker id="tpfarrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0 0 L6 3 L0 6 z" fill="var(--blueprint,#3553ff)"/></marker></defs>',
    '</svg>',
    '</div>',
    '<div class="mf-caption">追踪 ID 贯穿两跳，每跳使用新的跨度 ID。ops-desk 与 credential-vault 各自保存独立哈希链，不读写对方条目；共享追踪 ID 将两份日志关联，请求 ID 无须相同。整链防重写仍需外部可信检查点。</div>'
  ].join('');
  host.appendChild(shell);
}
// 注册标识： mcpa-27-trace-propagation
