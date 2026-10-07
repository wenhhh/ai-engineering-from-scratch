function envelopeFigure(host) {
  ensureStyles();
  var shapes = [
    { title: '请求', l1: '必须有 id', l2: '不能为 null' },
    { title: '通知', l1: '不能有 id', l2: '不发送回复' },
    { title: '结果', l1: 'id 对应请求', l2: '包含 resultType' },
    { title: '错误', l1: '可读时回传 id', l2: 'code + message' }
  ];
  var cardW = 120;
  var gap = 12;
  var startX = 18;
  var cards = '';
  var i;
  var x;
  for (i = 0; i < shapes.length; i++) {
    x = startX + i * (cardW + gap);
    cards += '<rect class="l03x" x="' + x + '" y="22" width="' + cardW + '" height="70" rx="4"/>';
    cards += '<text class="l03h" x="' + (x + 8) + '" y="40">' + shapes[i].title + '</text>';
    cards += '<text class="l03t" x="' + (x + 8) + '" y="60">' + shapes[i].l1 + '</text>';
    cards += '<text class="l03t" x="' + (x + 8) + '" y="80">' + shapes[i].l2 + '</text>';
  }

  function seg(text, x0, cls, y) {
    var w = text.length * 7.2;
    return { markup: '<text class="' + cls + '" x="' + x0 + '" y="' + y + '">' + text + '</text>', next: x0 + w, width: w, x0: x0 };
  }

  var a1 = seg('io.', 18, 'l03p', 136);
  var a2 = seg('modelcontextprotocol', a1.next, 'l03chk', 136);
  var a3 = seg('/protocolVersion', a2.next, 'l03p', 136);
  var reservedHighlight = '<rect class="l03hl" x="' + (a2.x0 - 3) + '" y="124" width="' + (a2.width + 6) + '" height="16"/>';

  var b1 = seg('com.', 18, 'l03p', 182);
  var b2 = seg('example', b1.next, 'l03chk', 182);
  var b3 = seg('.mcp/scanId', b2.next, 'l03p', 182);
  var freeHighlight = '<rect class="l03hf" x="' + (b2.x0 - 3) + '" y="170" width="' + (b2.width + 6) + '" height="16"/>';

  var shell = document.createElement('div');
  shell.className = 'mf-shell';
  shell.innerHTML = [
    '<div class="mf-head"><strong>JSON-RPC 消息封套</strong> 四种消息结构与 _meta 键的组成</div>',
    '<div class="mf-body">',
    '<svg viewBox="0 0 560 220" role="img" aria-label="上方：请求、通知、结果和错误四种消息卡片，分别列出关键字段。下方：两个 _meta 键拆为前缀标签和名称，并高亮第二个标签。io.modelcontextprotocol 的第二标签为 modelcontextprotocol，因此保留；com.example.mcp 的第二标签为 example，因此不保留。">',
    '<style>.l03x{fill:var(--bg-surface,#eee);stroke:var(--rule-soft,#ccc)}.l03h{fill:var(--ink,#111);font:bold 11px var(--font-mono,monospace)}.l03t{fill:var(--ink-mute,#777);font:11px var(--font-mono,monospace)}.l03p{fill:var(--ink-soft,#555);font:12px var(--font-mono,monospace)}.l03chk{fill:var(--ink,#111);font:bold 12px var(--font-mono,monospace)}.l03hl{fill:var(--blueprint,#3553ff);opacity:.22}.l03hf{fill:var(--rule-soft,#ccc);opacity:.6}.l03cap{fill:var(--ink-mute,#777);font:11px var(--font-mono,monospace)}</style>',
    '<text class="l03h" x="18" y="14">四种消息结构共用消息封套</text>',
    cards,
    '<text class="l03h" x="18" y="112">_meta 键是否保留给 MCP？</text>',
    reservedHighlight,
    a1.markup, a2.markup, a3.markup,
    '<text class="l03cap" x="18" y="154">第二标签为 modelcontextprotocol：保留</text>',
    freeHighlight,
    b1.markup, b2.markup, b3.markup,
    '<text class="l03cap" x="18" y="200">第二标签为 example：不保留</text>',
    '</svg>',
    '</div>',
    '<div class="mf-caption">请求必须携带非 null 的 id，通知不能携带 id，结果或错误回传所回答请求的 id。只有 _meta 键前缀的第二个点分标签为 modelcontextprotocol 或 mcp 时，该前缀才保留给 MCP；mcp 在其他位置出现不影响判断。</div>'
  ].join('');
  host.appendChild(shell);
}
// 注册标识： mcpa-03-envelope
