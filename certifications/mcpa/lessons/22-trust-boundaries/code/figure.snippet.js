function trustZonesFigure(host) {
  ensureStyles();
  var shell = document.createElement('div');
  shell.className = 'mf-shell';
  shell.innerHTML = [
    '<div class="mf-head"><strong>MCP 交互中的信任区域</strong> 宿主与客户端可信，服务器及上游默认不可信，模型读取带来源标记的内容</div>',
    '<div class="mf-body">',
    '<svg viewBox="0 0 560 230" role="img" aria-label="左侧可信区域包含宿主、客户端和模型，以短箭头连接。虚线边界将它们与右侧服务器隔开。请求跨边界发送，响应返回时经过信任过滤并标注不可信，再进入模型。服务器可进一步调用客户端无法直接观察的上游。">',
    '<style>.tz22x{fill:var(--bg-surface,#eee);stroke:var(--rule-soft,#ccc)}.tz22t{fill:var(--ink,#111);font:11px var(--font-mono,monospace)}.tz22l{fill:var(--ink-mute,#777);font:11px var(--font-mono,monospace)}.tz22z{fill:none;stroke:var(--rule-soft,#ccc);stroke-dasharray:3,3}.tz22a{stroke:var(--blueprint,#3553ff);fill:none;stroke-width:1.5}.tz22r{stroke:var(--ink-mute,#999);fill:none;stroke-width:1.4;stroke-dasharray:4,3}.tz22u{stroke:var(--ink-mute,#999);fill:none;stroke-width:1.2;stroke-dasharray:2,3}.tz22g{fill:var(--bg-surface,#eee);stroke:var(--blueprint,#3553ff);stroke-width:2}</style>',
    '<text class="tz22l" x="91" y="18" text-anchor="middle">可信区域</text>',
    '<text class="tz22l" x="380" y="18" text-anchor="middle">不可信区域</text>',
    '<rect class="tz22z" x="8" y="26" width="166" height="180"/>',
    '<line class="tz22z" x1="190" y1="26" x2="190" y2="206"/>',
    '<text class="tz22l" x="196" y="34">信任边界</text>',
    '<rect class="tz22x" x="20" y="40" width="140" height="36"/>',
    '<text class="tz22t" x="32" y="56">宿主</text>',
    '<text class="tz22l" x="32" y="70">用户的应用</text>',
    '<rect class="tz22x" x="20" y="88" width="140" height="36"/>',
    '<text class="tz22t" x="32" y="104">客户端</text>',
    '<text class="tz22l" x="32" y="118">每台服务器一个</text>',
    '<rect class="tz22x" x="20" y="156" width="140" height="40"/>',
    '<text class="tz22t" x="32" y="174">模型</text>',
    '<text class="tz22l" x="32" y="188">读取带来源标记的数据</text>',
    '<rect class="tz22x" x="230" y="94" width="110" height="36"/>',
    '<text class="tz22t" x="242" y="110">服务器</text>',
    '<text class="tz22l" x="242" y="124">第三方</text>',
    '<rect class="tz22x" x="390" y="94" width="140" height="36"/>',
    '<text class="tz22t" x="402" y="110">上游系统</text>',
    '<text class="tz22l" x="402" y="124">间接访问</text>',
    '<path class="tz22a" d="M90 76 L90 88" marker-end="url(#tz22arrow)"/>',
    '<path class="tz22a" d="M90 124 L90 156" marker-end="url(#tz22arrow)"/>',
    '<path class="tz22a" d="M160 98 L230 98" marker-end="url(#tz22arrow)"/>',
    '<path class="tz22r" d="M230 118 L160 118" marker-end="url(#tz22arrowm)"/>',
    '<path class="tz22u" d="M340 112 L390 112" marker-end="url(#tz22arrowm)"/>',
    '<polygon class="tz22g" points="190,90 206,108 190,126 174,108"/>',
    '<text class="tz22l" x="195" y="142" text-anchor="middle">信任过滤</text>',
    '<defs>',
    '<marker id="tz22arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0 0 L6 3 L0 6 z" fill="var(--blueprint,#3553ff)"/></marker>',
    '<marker id="tz22arrowm" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0 0 L6 3 L0 6 z" fill="var(--ink-mute,#999)"/></marker>',
    '</defs>',
    '</svg>',
    '</div>',
    '<div class="mf-caption">宿主及其客户端与模型位于同一信任域。请求跨虚线到达服务器；返回内容通过信任过滤器，在模型读取前标为不可信。服务器还可能访问客户端无法直接观察的上游系统。</div>'
  ].join('');
  host.appendChild(shell);
}
// 注册标识： mcpa-22-trust-zones
