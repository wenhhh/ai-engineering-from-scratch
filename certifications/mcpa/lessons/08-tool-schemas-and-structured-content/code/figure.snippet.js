function schemaContractFigure(host) {
  ensureStyles();
  var shell = document.createElement('div');
  shell.className = 'mf-shell';
  shell.innerHTML = [
    '<div class="mf-head"><strong>模式契约</strong> 一个校验门禁，两条结果路径</div>',
    '<div class="mf-body">',
    '<svg viewBox="0 0 560 260" role="img" aria-label="工具定义包含 inputSchema 和 outputSchema。参数进入校验门禁：模式失败返回 isError true 的结果；通过则运行处理器，返回符合 outputSchema 的 structuredContent 及其文本镜像。服务器从未发布的工具名称走独立路径，直接返回协议错误 -32602。">',
    '<style>',
    '.l08x{fill:var(--bg-surface,#eee);stroke:var(--rule-soft,#ccc)}',
    '.l08t{fill:var(--ink,#111);font:11px var(--font-mono,monospace)}',
    '.l08m{fill:var(--ink-mute,#777);font:11px var(--font-mono,monospace)}',
    '.l08l{stroke:var(--ink-mute,#999);stroke-width:1.1;fill:none;marker-end:url(#l08arrow)}',
    '.l08g{fill:var(--bg-surface,#f4f4f4);stroke:var(--blueprint,#3553ff);stroke-width:1.4}',
    '.l08ok{fill:var(--bg-surface,#eee);stroke:var(--blueprint,#3553ff);stroke-width:1.2}',
    '.l08err{fill:var(--bg-surface,#eee);stroke:var(--ink-mute,#999);stroke-width:1.2;stroke-dasharray:3,2}',
    '</style>',
    '<defs><marker id="l08arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 z" fill="var(--ink-mute,#999)"/></marker></defs>',

    '<rect class="l08x" x="16" y="14" width="190" height="64" rx="3"/>',
    '<text class="l08t" x="24" y="30">tool: lookup_product</text>',
    '<text class="l08m" x="24" y="44">inputSchema: 必需 sku</text>',
    '<text class="l08m" x="24" y="58">outputSchema: 4 个字段</text>',
    '<text class="l08m" x="24" y="72">拒绝额外属性</text>',

    '<rect class="l08x" x="16" y="92" width="190" height="32" rx="3"/>',
    '<text class="l08t" x="24" y="113">arguments: {"sku": "X"}</text>',

    '<path class="l08l" d="M111,78 L111,90"/>',
    '<path class="l08l" d="M111,124 L111,148"/>',

    '<rect class="l08g" x="51" y="150" width="120" height="32" rx="4"/>',
    '<text class="l08t" x="71" y="171">validate()</text>',

    '<path class="l08l" d="M81,182 L81,196"/>',
    '<rect class="l08err" x="14" y="198" width="192" height="30" rx="4"/>',
    '<text class="l08t" x="22" y="218">result isError: true</text>',

    '<path class="l08l" d="M171,166 L328,166"/>',

    '<rect class="l08x" x="330" y="14" width="212" height="46" rx="3"/>',
    '<text class="l08t" x="340" y="30">name: "delete_catalog"</text>',
    '<text class="l08m" x="340" y="44">不在 tools/list 中</text>',

    '<path class="l08l" d="M436,60 L436,74"/>',
    '<rect class="l08err" x="330" y="76" width="212" height="32" rx="4"/>',
    '<text class="l08t" x="344" y="97">error -32602 Invalid params</text>',

    '<rect class="l08ok" x="330" y="150" width="212" height="32" rx="4"/>',
    '<text class="l08t" x="344" y="171">handler(arguments)</text>',

    '<path class="l08l" d="M436,182 L436,196"/>',
    '<rect class="l08ok" x="330" y="198" width="212" height="48" rx="4"/>',
    '<text class="l08t" x="344" y="216">structuredContent: {...}</text>',
    '<text class="l08m" x="344" y="230">content[0].text: 相同 JSON</text>',

    '</svg>',
    '</div>',
    '<div class="mf-caption">已知工具的模式校验失败通过 isError true 的正常结果返回，模型能够读取内容并修正。服务器从未发布的工具名称则走不进入处理器的独立路径，返回 JSON-RPC 协议错误。</div>'
  ].join('');
  host.appendChild(shell);
}
// 注册标识： mcpa-08-schema-contract
