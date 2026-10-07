function topologyFigure(host) {
  ensureStyles();
  var rows = [
    { id: 'files', label: '客户端：files', s1: '服务器：files', s2: '本地 · stdio · tools', s3: '自报："primary"', y: 32 },
    { id: 'notes', label: '客户端：notes', s1: '服务器：notes', s2: '本地 · stdio · tools', s3: '自报："primary"', y: 104 },
    { id: 'metrics', label: '客户端：metrics', s1: '服务器：metrics', s2: '远程 · http · resources', s3: '自报："metrics-svc"', y: 176 }
  ];
  var parts = [];
  var i;
  for (i = 0; i < rows.length; i++) {
    var r = rows[i];
    var cy = r.y + 27;
    parts.push('<rect class="l06x" x="22" y="' + r.y + '" width="160" height="54" rx="3"/>');
    parts.push('<text class="l06t" x="32" y="' + (r.y + 32) + '">' + r.label + '</text>');
    parts.push('<line class="l06a" x1="182" y1="' + cy + '" x2="350" y2="' + cy + '" marker-end="url(#l06arrow)"/>');
    parts.push('<rect class="l06x" x="350" y="' + r.y + '" width="200" height="54" rx="3"/>');
    parts.push('<text class="l06t" x="360" y="' + (r.y + 18) + '">' + r.s1 + '</text>');
    parts.push('<text class="l06s" x="360" y="' + (r.y + 32) + '">' + r.s2 + '</text>');
    parts.push('<text class="l06s" x="360" y="' + (r.y + 46) + '">' + r.s3 + '</text>');
  }
  var shell = document.createElement('div');
  shell.className = 'mf-shell';
  shell.innerHTML = [
    '<div class="mf-head"><strong>宿主、客户端与服务器</strong> 每台服务器一个客户端，由宿主统一注册</div>',
    '<div class="mf-body">',
    '<svg viewBox="0 0 560 330" role="img" aria-label="宿主嵌入三个客户端，每个绑定一台服务器。files 与 notes 在本地通过 stdio 运行，均自报名称 primary；metrics 通过远程 Streamable HTTP 运行。注册表让 files 保留 search，将 notes 的同名工具命名为 notes/search。">',
    '<style>.l06h{fill:var(--bg-surface,#eee);stroke:var(--rule-soft,#ccc)}.l06x{fill:var(--bg,#fafaf5);stroke:var(--rule-soft,#ccc)}.l06t{fill:var(--ink,#111);font:11px var(--font-mono,monospace)}.l06s{fill:var(--ink-mute,#777);font:11px var(--font-mono,monospace)}.l06a{stroke:var(--blueprint,#3553ff);stroke-width:1.4}.l06c{fill:var(--ink-soft,#555);font:11px var(--font-mono,monospace)}.l06l{fill:var(--ink-mute,#777);font:11px var(--font-mono,monospace);text-transform:uppercase;letter-spacing:.08em}</style>',
    '<rect class="l06h" x="6" y="6" width="190" height="248" rx="4"/>',
    '<text class="l06l" x="16" y="22">宿主进程</text>',
    parts.join(''),
    '<text class="l06c" x="20" y="282">注册表使用宿主分配的 id，不使用 serverInfo.name</text>',
    '<text class="l06c" x="20" y="300">search -&gt; files（先声明者保留原名）</text>',
    '<text class="l06c" x="20" y="316">notes/search -&gt; notes（冲突时加服务器 id 前缀）</text>',
    '<defs><marker id="l06arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0 0 L6 3 L0 6 z" fill="var(--blueprint,#3553ff)"/></marker></defs>',
    '</svg>',
    '</div>',
    '<div class="mf-caption">宿主为每台服务器嵌入一个客户端。files 与 notes 是本地 stdio 子进程，均自报名称“primary”，因此宿主使用自行分配的连接 id files 和 notes 索引注册表，不依赖自报名称。metrics 是未声明 tools 能力的远程 Streamable HTTP 服务器，宿主不查询它的工具列表。files 与 notes 都声明 search；聚合器让前者保留规范名称，将后者暴露为 notes/search。</div>'
  ].join('');
  host.appendChild(shell);
}
// 注册标识： mcpa-06-topology
