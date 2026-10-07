function errorTaxonomyFigure(host) {
  ensureStyles();
  var protocolCodes = [
    { code: '-32601', name: '找不到方法' },
    { code: '-32602', name: '参数无效（未知工具）' },
    { code: '-32020', name: 'HeaderMismatch' },
    { code: '-32021', name: 'MissingRequiredClientCapability' },
    { code: '-32022', name: 'UnsupportedProtocolVersion' }
  ];
  var rowH = 32;
  var gap = 6;
  var startY = 40;
  var left = '';
  var i;
  var y;
  for (i = 0; i < protocolCodes.length; i++) {
    y = startY + i * (rowH + gap);
    left += '<rect class="l18x" x="16" y="' + y + '" width="250" height="' + rowH + '" rx="3"/>';
    left += '<text class="l18h" x="24" y="' + (y + 13) + '">' + protocolCodes[i].code + '</text>';
    left += '<text class="l18t" x="24" y="' + (y + 26) + '">' + protocolCodes[i].name + '</text>';
  }
  var shell = document.createElement('div');
  shell.className = 'mf-shell';
  shell.innerHTML = [
    '<div class="mf-head"><strong>请求失败的两个通道</strong> 协议错误采用 JSON-RPC error；工具问题通过带 isError true 的正常结果返回</div>',
    '<div class="mf-body">',
    '<svg viewBox="0 0 560 300" role="img" aria-label="左列列出五个协议错误：-32601 方法未知、-32602 参数无效、-32020 头部不一致、-32021 缺少客户端能力、-32022 版本不支持。右列展示 API 失败、输入校验、业务拒绝和过期句柄，它们通过 isError true 的内容让模型读取并修正。底部标出不得发送的旧版 -32000 至 -32019，以及已退役的 -32002、-32042。">',
    '<style>.l18x{fill:var(--bg-surface,#eee);stroke:var(--rule-soft,#ccc)}.l18h{fill:var(--ink,#111);font:bold 12px var(--font-mono,monospace)}.l18t{fill:var(--ink-mute,#777);font:11px var(--font-mono,monospace)}.l18cap{fill:var(--ink-soft,#555);font:bold 11px var(--font-mono,monospace)}.l18d{stroke:var(--rule-soft,#ccc);stroke-width:1}.l18f{fill:none;stroke:var(--ink-mute,#999);stroke-width:1.2;stroke-dasharray:4 3}.l18fh{fill:var(--ink,#111);font:bold 11px var(--font-mono,monospace)}.l18ft{fill:var(--ink-mute,#777);font:11px var(--font-mono,monospace)}</style>',
    '<text class="l18cap" x="16" y="14">两个错误通道：工具执行结果可作为内容交给模型修正</text>',
    '<text class="l18cap" x="16" y="30">协议错误 -&gt; JSON-RPC error</text>',
    '<text class="l18cap" x="296" y="30">工具问题 -&gt; isError: true</text>',
    '<line class="l18d" x1="282" y1="36" x2="282" y2="224"/>',
    left,
    '<rect class="l18x" x="296" y="40" width="248" height="184"/>',
    '<text class="l18h" x="304" y="58">isError: true</text>',
    '<text class="l18t" x="304" y="76">API 调用失败</text>',
    '<text class="l18t" x="304" y="92">输入校验错误</text>',
    '<text class="l18t" x="304" y="108">业务规则拒绝</text>',
    '<text class="l18t" x="304" y="124">服务器生成的句柄过期</text>',
    '<line class="l18d" x1="304" y1="138" x2="536" y2="138"/>',
    '<text class="l18t" x="304" y="158">模型读取问题说明，</text>',
    '<text class="l18t" x="304" y="176">修正后重新尝试</text>',
    '<rect class="l18f" x="16" y="240" width="528" height="48" rx="3"/>',
    '<text class="l18fh" x="28" y="260">禁用：旧版 -32000 至 -32019；已退役 -32002、-32042</text>',
    '<text class="l18ft" x="28" y="278">2026-07-28 服务器不得发送这些错误码</text>',
    '</svg>',
    '</div>',
    '<div class="mf-caption">协议错误由客户端处理 JSON-RPC error 对象。工具问题以 isError true 的正常结果返回，供模型读取并采取修正行动。两个通道均合法，但不能通过它们发送底部列出的禁用错误码。</div>'
  ].join('');
  host.appendChild(shell);
}
// 注册标识： mcpa-18-error-taxonomy
