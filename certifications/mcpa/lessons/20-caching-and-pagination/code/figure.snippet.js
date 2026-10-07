function cacheFreshnessFigure(host) {
  ensureStyles();
  var parts = [];
  parts.push('<style>');
  parts.push('.l20f{fill:var(--blueprint,#3553ff);opacity:.20}');
  parts.push('.l20s{fill:var(--ink-mute,#8a8a8a);opacity:.16}');
  parts.push('.l20a{stroke:var(--rule-soft,#ccc);stroke-width:1}');
  parts.push('.l20t{fill:var(--ink,#111);font:12px var(--font-mono,monospace)}');
  parts.push('.l20m{fill:var(--ink-mute,#767676);font:11px var(--font-mono,monospace)}');
  parts.push('.l20d{stroke:var(--ink-soft,#bbb);stroke-width:1;stroke-dasharray:4,3}');
  parts.push('.l20n{stroke:var(--blueprint,#3553ff);stroke-width:1.6}');
  parts.push('.l20p{fill:var(--blueprint,#3553ff)}');
  parts.push('</style>');
  parts.push('<text class="l20t" x="70" y="16">A. 仅 TTL：新鲜至 t_received + ttlMs</text>');
  parts.push('<rect class="l20f" x="70" y="30" width="240" height="24"/>');
  parts.push('<rect class="l20s" x="310" y="30" width="190" height="24"/>');
  parts.push('<line class="l20a" x1="70" y1="54" x2="500" y2="54"/>');
  parts.push('<text class="l20t" x="190" y="46" text-anchor="middle">新鲜</text>');
  parts.push('<text class="l20t" x="405" y="46" text-anchor="middle">过期</text>');
  parts.push('<line class="l20a" x1="70" y1="54" x2="70" y2="60"/>');
  parts.push('<line class="l20a" x1="310" y1="54" x2="310" y2="60"/>');
  parts.push('<text class="l20m" x="70" y="72">t_received</text>');
  parts.push('<text class="l20m" x="310" y="72" text-anchor="middle">t_received + ttlMs</text>');
  parts.push('<text class="l20t" x="70" y="100">B. 有效期内收到通知：立即过期</text>');
  parts.push('<text class="l20m" x="230" y="124" text-anchor="middle">list_changed 通知</text>');
  parts.push('<line class="l20n" x1="230" y1="130" x2="230" y2="148"/>');
  parts.push('<polygon id="l20arrow" class="l20p" points="230,152 224,144 236,144"/>');
  parts.push('<rect class="l20f" x="70" y="154" width="160" height="24"/>');
  parts.push('<rect class="l20s" x="230" y="154" width="270" height="24"/>');
  parts.push('<line class="l20a" x1="70" y1="178" x2="500" y2="178"/>');
  parts.push('<text class="l20t" x="150" y="170" text-anchor="middle">新鲜</text>');
  parts.push('<text class="l20t" x="365" y="170" text-anchor="middle">过期</text>');
  parts.push('<line class="l20d" x1="310" y1="150" x2="310" y2="178"/>');
  parts.push('<line class="l20a" x1="70" y1="178" x2="70" y2="184"/>');
  parts.push('<line class="l20a" x1="310" y1="178" x2="310" y2="184"/>');
  parts.push('<text class="l20m" x="70" y="196">t_received</text>');
  parts.push('<text class="l20m" x="310" y="196" text-anchor="middle">原 TTL 到期位置</text>');
  var shell = document.createElement('div');
  shell.className = 'mf-shell';
  shell.innerHTML = [
    '<div class="mf-head"><strong>缓存新鲜度</strong> TTL 到期时失效，相关通知可以使它提前失效</div>',
    '<div class="mf-body">',
    '<svg viewBox="0 0 560 208" role="img" aria-label="两条时间线从相同 t_received 开始。场景 A 在 t_received 加 ttlMs 之前保持新鲜，随后过期；场景 B 提前收到 list_changed 通知，缓存立即过期，不再使用剩余 TTL。">',
    parts.join(''),
    '</svg>',
    '</div>',
    '<div class="mf-caption">缓存通常在 ttlMs 到期前保持新鲜，但相关 list_changed 通知一到达就立即使它失效，即使尚有剩余时间。TTL 和变更通知互为补充。</div>'
  ].join('');
  host.appendChild(shell);
}
// 注册标识： mcpa-20-cache-freshness
