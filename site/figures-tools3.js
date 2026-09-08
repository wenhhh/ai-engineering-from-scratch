/* figures-tools3.js - 阶段 13 工具与协议（Tools and protocols）
   的第三批动画课程图表。在 lesson-figures.js 之后加载，
   通过 window.LF 注册。无依赖，仅使用 ES5，主题由 CSS 变量控制，仅使用 SMIL。
   编写方式：使用一个以以下某个 t3- 组件名称为内容的 ```figure 块。 */
(function () {
  'use strict';
  var LF = window.LF;
  if (!LF) { return; }
  var el = LF.el, svgEl = LF.svgEl;
  var EASE = '0.23 1 0.32 1';

  function out(svg) { return el('div', { class: 'lf-out' }, [svg]); }
  function cap(text) { return el('div', { class: 'lf-cap' }, [text]); }
  function head(label, hint) {
    return el('div', { class: 'lf-head' }, [
      el('span', { class: 'lf-label' }, [label]),
      el('span', {}, [hint])
    ]);
  }
  function txt(x, y, s, size, fill, anchor) {
    var t = svgEl('text', {
      x: x, y: y, 'text-anchor': anchor || 'middle',
      'font-family': 'var(--font-mono,monospace)', 'font-size': size || '11',
      fill: fill || 'var(--ink-soft,#555)'
    });
    t.appendChild(document.createTextNode(s));
    return t;
  }
  function box(x, y, w, h, stroke) {
    return svgEl('rect', {
      x: x, y: y, width: w, height: h, rx: '4',
      fill: 'var(--bg-surface,#eee)',
      stroke: stroke || 'var(--rule-soft,#ddd)', 'stroke-width': '1.4'
    });
  }
  function anim(attr, vals, keyTimes, dur, extra) {
    var a = { attributeName: attr, values: vals, keyTimes: keyTimes, dur: dur, repeatCount: 'indefinite' };
    if (extra) { for (var k in extra) { a[k] = extra[k]; } }
    return svgEl('animate', a);
  }
  // 数据包（Packet）：元素组沿路径移动，通过 keyPoints 停在两端，
  // 仅在其 keyTimes 窗口期间可见，使循环保持同步
  function packet(kids, path, dur, moveTimes, opVals, opTimes) {
    var g = svgEl('g', { opacity: '0' }, kids);
    g.appendChild(svgEl('animateMotion', {
      path: path, dur: dur, repeatCount: 'indefinite', calcMode: 'linear',
      keyPoints: '0;0;1;1', keyTimes: moveTimes
    }));
    g.appendChild(anim('opacity', opVals, opTimes, dur));
    return g;
  }
  // 入场（Entry）：从不透明度 0、尺寸 95% 开始缓动淡入，完成后冻结
  function enter(x, y, begin, kids) {
    var inner = svgEl('g', { opacity: '0' }, kids);
    inner.appendChild(svgEl('animate', {
      attributeName: 'opacity', values: '0;1', keyTimes: '0;1', dur: '0.55s',
      begin: begin, fill: 'freeze', calcMode: 'spline', keySplines: EASE
    }));
    inner.appendChild(svgEl('animateTransform', {
      attributeName: 'transform', type: 'scale', values: '0.95;1', keyTimes: '0;1',
      dur: '0.55s', begin: begin, fill: 'freeze', calcMode: 'spline', keySplines: EASE
    }));
    return svgEl('g', { transform: 'translate(' + x + ' ' + y + ')' }, [inner]);
  }
  function chip(w, label) {
    return [
      svgEl('rect', { x: -w / 2, y: -10, width: w, height: 20, rx: '3', fill: 'var(--blueprint,#3553ff)' }),
      txt(0, 4, label, '9', 'var(--bg,#fafaf5)')
    ];
  }

  // t3-dispatch-loop: JSON-RPC 行从 stdin 输入，匹配的响应从 stdout 输出
  function dispatchLoop(host) {
    var svg = svgEl('svg', { viewBox: '0 0 520 240' });
    svg.appendChild(svgEl('line', { x1: 20, y1: 80, x2: 188, y2: 80, stroke: 'var(--rule-soft,#ccc)', 'stroke-width': '1.4' }));
    svg.appendChild(svgEl('line', { x1: 332, y1: 80, x2: 500, y2: 80, stroke: 'var(--rule-soft,#ccc)', 'stroke-width': '1.4' }));
    svg.appendChild(svgEl('line', { x1: 20, y1: 180, x2: 188, y2: 180, stroke: 'var(--rule-soft,#ccc)', 'stroke-width': '1.4' }));
    svg.appendChild(svgEl('line', { x1: 332, y1: 180, x2: 500, y2: 180, stroke: 'var(--rule-soft,#ccc)', 'stroke-width': '1.4', 'stroke-dasharray': '3 5' }));
    svg.appendChild(txt(20, 66, 'stdin', '9', 'var(--ink-mute,#777)', 'start'));
    svg.appendChild(txt(500, 66, 'stdout', '9', 'var(--ink-mute,#777)', 'end'));
    svg.appendChild(txt(500, 168, '不写入任何内容', '8', 'var(--ink-mute,#777)', 'end'));
    svg.appendChild(enter(260, 130, '0.1s', [
      box(-72, -60, 144, 120),
      txt(0, -34, '分发（Dispatch）', '11', 'var(--ink,#1a1a1a)'),
      txt(0, -16, '有 id：返回响应', '8', 'var(--ink-mute,#777)'),
      txt(0, 0, '无 id：仅处理消息', '8', 'var(--ink-mute,#777)'),
      txt(0, 42, '日志写入 stderr', '8', 'var(--warn,#b8870f)')
    ]));
    svg.appendChild(packet(chip(66, '请求 id:7'), 'M46 80 L186 80', '6s',
      '0;0.04;0.3;1', '0;1;1;0;0', '0;0.05;0.28;0.33;1'));
    svg.appendChild(packet(chip(70, '响应 id:7'), 'M336 80 L474 80', '6s',
      '0;0.42;0.62;1', '0;0;1;1;0;0', '0;0.42;0.44;0.6;0.64;1'));
    svg.appendChild(packet(chip(84, '通知'), 'M48 180 L230 180', '6s',
      '0;0.55;0.8;1', '0;0;1;1;0;0', '0;0.55;0.57;0.8;0.88;1'));
    host.appendChild(el('div', { class: 'lf' }, [
      head('分发循环（Dispatch Loop）', '输入一行 JSON，输出对应响应'),
      el('div', { class: 'lf-body' }, [out(svg)]),
      cap('服务器逐行从 stdin 读取 JSON 对象。带 id 的消息是请求，必须向 stdout 写入且仅写入一条具有相同 id 的响应。通知（Notification）没有 id，也不产生响应。向 stdout 打印其他内容会破坏传输协议，因此调试输出要写入 stderr。')
    ]));
  }

  // t3-primitive-sort: 能力（Capability）路由到工具（Tool）、资源（Resource）或提示词（Prompt）
  function primitiveSort(host) {
    var svg = svgEl('svg', { viewBox: '0 0 520 250' });
    svg.appendChild(txt(260, 20, '能力（Capability）', '9', 'var(--ink-mute,#777)'));
    svg.appendChild(enter(260, 110, '0.1s', [
      svgEl('polygon', { points: '0,-28 46,0 0,28 -46,0', fill: 'var(--bg-surface,#eee)', stroke: 'var(--rule-soft,#ddd)', 'stroke-width': '1.4' }),
      txt(0, 4, '哪类单元？', '10', 'var(--ink,#1a1a1a)')
    ]));
    var bins = [
      { x: 90, t: '工具（Tool）', s: '修改或搜索', d: '0.2s' },
      { x: 260, t: '资源（Resource）', s: '附加为上下文', d: '0.32s' },
      { x: 430, t: '提示词（Prompt）', s: '再次运行工作流', d: '0.44s' }
    ];
    var i;
    for (i = 0; i < 3; i++) {
      svg.appendChild(enter(bins[i].x, 208, bins[i].d, [
        box(-62, -24, 124, 48),
        txt(0, -3, bins[i].t, '11', 'var(--blueprint,#3553ff)'),
        txt(0, 13, bins[i].s, '8', 'var(--ink-mute,#777)')
      ]));
    }
    svg.appendChild(packet(chip(94, 'notes_search'), 'M260 34 L260 100 C260 152 90 140 90 178', '6s',
      '0;0.03;0.29;1', '0;1;1;0;0', '0;0.04;0.28;0.32;1'));
    svg.appendChild(packet(chip(78, 'notes://42'), 'M260 34 L260 178', '6s',
      '0;0.36;0.62;1', '0;0;1;1;0;0', '0;0.36;0.38;0.61;0.65;1'));
    svg.appendChild(packet(chip(94, '/review_note'), 'M260 34 L260 100 C260 152 430 140 430 178', '6s',
      '0;0.69;0.95;1', '0;0;1;1;0;0', '0;0.69;0.71;0.94;0.98;1'));
    host.appendChild(el('div', { class: 'lf' }, [
      head('原语分类（Primitive Sort）', '工具、资源或提示词'),
      el('div', { class: 'lf-body' }, [out(svg)]),
      cap('不是所有能力都应建模为工具。需要模型按查询决定是否调用的，属于工具；由用户附加为上下文的，属于资源；复用单元是完整工作流的，属于提示词。按此方式划分笔记服务器，可以让普通读取省去模型往返调用，并让各项能力使用宿主已有的相应交互界面。')
    ]));
  }

  // t3-sampling-flip: 通过当前 MRTR 表达已弃用的 Sampling
  function samplingFlip(host) {
    var svg = svgEl('svg', { viewBox: '0 0 520 230' });
    svg.appendChild(enter(105, 115, '0.1s', [
      box(-80, -55, 160, 110),
      txt(0, -32, '客户端', '11', 'var(--ink,#1a1a1a)'),
      txt(0, -16, '大语言模型（LLM）与计费', '8', 'var(--ink-mute,#777)'),
      txt(12, 38, 'API 密钥', '8', 'var(--warn,#b8870f)', 'start')
    ]));
    svg.appendChild(enter(415, 115, '0.25s', [
      box(-80, -55, 160, 110),
      txt(0, -32, '服务器', '11', 'var(--ink,#1a1a1a)'),
      txt(0, -16, '掌控循环', '8', 'var(--ink-mute,#777)'),
      txt(0, 38, '不持有凭据', '8', 'var(--ink-mute,#777)')
    ]));
    var key = svgEl('circle', { cx: 98, cy: 150, r: 5, fill: 'var(--warn,#b8870f)' });
    key.appendChild(anim('opacity', '0.45;1;0.45', '0;0.5;1', '3s'));
    svg.appendChild(key);
    svg.appendChild(txt(260, 74, 'tools/call + 请求元数据', '8', 'var(--ink-mute,#777)'));
    svg.appendChild(txt(260, 106, 'input_required +', '8', 'var(--ink-mute,#777)'));
    svg.appendChild(txt(260, 118, 'sampling inputRequest', '8', 'var(--ink-mute,#777)'));
    svg.appendChild(txt(260, 158, '重试 + inputResponses', '8', 'var(--ink-mute,#777)'));
    svg.appendChild(packet(chip(46, '调用'), 'M187 86 L333 86', '5.5s',
      '0;0.02;0.24;1', '0;1;1;0;0', '0;0.03;0.23;0.27;1'));
    svg.appendChild(packet(chip(46, '询问'), 'M333 128 L187 128', '5.5s',
      '0;0.34;0.56;1', '0;0;1;1;0;0', '0;0.34;0.36;0.55;0.59;1'));
    svg.appendChild(packet(chip(56, '回答'), 'M187 170 L333 170', '5.5s',
      '0;0.66;0.88;1', '0;0;1;1;0;0', '0;0.66;0.68;0.87;0.92;1'));
    host.appendChild(el('div', { class: 'lf' }, [
      head('通过 MRTR 兼容已弃用的采样（Sampling）', '不主动发起反向请求'),
      el('div', { class: 'lf-body' }, [out(svg)]),
      cap('采样（Sampling）已弃用，新设计的 MCP 系统应直接调用模型提供方。在当前协议中，兼容服务器不会发送反向请求，而是返回 resultType 为 input_required 的结果，其中包含 sampling 类型的 inputRequest。客户端根据自身策略获得补全结果，然后携带 inputResponses 及原封不动的 requestState 重试原方法。')
    ]));
  }

  // t3-roots-boundary: 新设计用显式资源范围（Resource scope）替代 Roots
  function rootsBoundary(host) {
    var svg = svgEl('svg', { viewBox: '0 0 520 240' });
    svg.appendChild(enter(80, 108, '0.1s', [
      box(-58, -30, 116, 60),
      txt(0, -4, '笔记服务器', '10', 'var(--ink,#1a1a1a)'),
      txt(0, 13, '校验访问范围', '8', 'var(--ink-mute,#777)')
    ]));
    svg.appendChild(enter(375, 92, '0.25s', [
      svgEl('rect', { x: -125, y: -66, width: 250, height: 132, rx: '5', fill: 'none', stroke: 'var(--blueprint,#3553ff)', 'stroke-width': '1.6', 'stroke-dasharray': '6 5' }),
      txt(0, -50, '工具参数：scope=file:///project/Notes', '9', 'var(--blueprint,#3553ff)'),
      box(-52, -16, 104, 34),
      txt(0, 5, 'meeting.md', '9', 'var(--ink,#1a1a1a)')
    ]));
    svg.appendChild(enter(375, 210, '0.4s', [
      txt(0, 0, '~/.ssh/id_rsa', '9', 'var(--ink-mute,#777)')
    ]));
    svg.appendChild(packet(chip(46, '读取'), 'M140 96 C220 96 240 93 318 93', '5s',
      '0;0.04;0.3;1', '0;1;1;0;0', '0;0.05;0.29;0.34;1'));
    var ok = svgEl('circle', { cx: 322, cy: 93, r: 6, fill: 'none', stroke: 'var(--blueprint,#3553ff)', 'stroke-width': '1.6', opacity: '0' });
    ok.appendChild(anim('r', '6;16;6', '0;0.5;1', '5s'));
    ok.appendChild(anim('opacity', '0;0;0.9;0;0', '0;0.3;0.36;0.44;1', '5s'));
    svg.appendChild(ok);
    svg.appendChild(packet(chip(46, '读取'), 'M140 124 C220 160 240 200 302 207', '5s',
      '0;0.52;0.78;1', '0;0;1;1;0;0', '0;0.52;0.54;0.78;0.86;1'));
    var rej = txt(375, 232, '超出根目录：拒绝访问', '9', 'var(--warn,#b8870f)');
    rej.setAttribute('opacity', '0');
    rej.appendChild(anim('opacity', '0;0;1;1;0', '0;0.78;0.82;0.94;1', '5s'));
    svg.appendChild(rej);
    host.appendChild(el('div', { class: 'lf' }, [
      head('显式资源范围（Explicit Resource Scope）', '新设计不再使用已弃用的 Roots'),
      el('div', { class: 'lf-body' }, [out(svg)]),
      cap('通过显式工具参数、资源引用或服务器配置传入获准访问的目录或资源 URI。服务器在访问前解析每条路径，并检查它是否位于允许范围内：范围内的读取成功，范围外的路径被拒绝。MCP 根目录（Roots）仅在弃用过渡期内继续可用，不能替代授权或操作系统沙箱（OS Sandbox）。')
    ]));
  }

  // t3-ui-sandbox: ui:// 载荷（Payload）在 iframe 内渲染，postMessage 跳出
  function uiSandbox(host) {
    var svg = svgEl('svg', { viewBox: '0 0 520 250' });
    svg.appendChild(enter(85, 125, '0.1s', [
      box(-60, -34, 120, 68),
      txt(0, -8, 'MCP 服务器', '10', 'var(--ink,#1a1a1a)'),
      txt(0, 10, 'ui://notes/timeline', '8', 'var(--blueprint,#3553ff)')
    ]));
    svg.appendChild(enter(370, 125, '0.25s', [
      box(-125, -95, 250, 190),
      txt(0, -78, '宿主窗口', '9', 'var(--ink-mute,#777)'),
      txt(0, 82, '未获授权则禁止联网', '8', 'var(--ink-mute,#777)')
    ]));
    svg.appendChild(enter(370, 115, '0.9s', [
      svgEl('rect', { x: -100, y: -55, width: 200, height: 110, rx: '4', fill: 'var(--bg,#fafaf5)', stroke: 'var(--blueprint,#3553ff)', 'stroke-width': '1.6' }),
      txt(0, -38, '沙箱化内联框架（iframe）', '9', 'var(--blueprint,#3553ff)'),
      svgEl('rect', { x: -80, y: -22, width: 160, height: 12, rx: '2', fill: 'var(--bg-surface,#eee)' }),
      svgEl('rect', { x: -80, y: -2, width: 118, height: 12, rx: '2', fill: 'var(--bg-surface,#eee)' }),
      svgEl('rect', { x: -80, y: 18, width: 140, height: 12, rx: '2', fill: 'var(--bg-surface,#eee)' }),
      txt(0, 47, 'CSP 严格限制', '8', 'var(--warn,#b8870f)')
    ]));
    svg.appendChild(packet(chip(46, 'html'), 'M147 125 L266 125', '5s',
      '0;0.03;0.27;1', '0;1;1;0;0', '0;0.04;0.26;0.31;1'));
    var hop1 = svgEl('circle', { r: 4, fill: 'var(--blueprint,#3553ff)', opacity: '0' }, []);
    hop1.appendChild(svgEl('animateMotion', { path: 'M340 170 C340 196 340 196 340 212', dur: '5s', repeatCount: 'indefinite', calcMode: 'linear', keyPoints: '0;0;1;1', keyTimes: '0;0.45;0.6;1' }));
    hop1.appendChild(anim('opacity', '0;0;1;1;0;0', '0;0.45;0.47;0.58;0.62;1', '5s'));
    svg.appendChild(hop1);
    var hop2 = svgEl('circle', { r: 4, fill: 'var(--ink-soft,#555)', opacity: '0' }, []);
    hop2.appendChild(svgEl('animateMotion', { path: 'M400 212 C400 196 400 196 400 170', dur: '5s', repeatCount: 'indefinite', calcMode: 'linear', keyPoints: '0;0;1;1', keyTimes: '0;0.68;0.83;1' }));
    hop2.appendChild(anim('opacity', '0;0;1;1;0;0', '0;0.68;0.7;0.81;0.85;1', '5s'));
    svg.appendChild(hop2);
    svg.appendChild(txt(485, 196, 'postMessage', '8', 'var(--ink-mute,#777)', 'end'));
    host.appendChild(el('div', { class: 'lf' }, [
      head('MCP 应用沙箱（MCP Apps Sandbox）', 'iframe 渲染 ui://，通过消息跨越边界'),
      el('div', { class: 'lf-body' }, [out(svg)]),
      cap('工具结果指定一个 ui:// 资源，宿主在沙箱化 iframe 中渲染其 HTML。框架受到严格的内容安全策略（Content Security Policy，CSP）约束，除非元数据明确授权，否则不能联网；因此输入和输出只能通过基于 postMessage 的精简 JSON-RPC 协议跨越沙箱边界。同一个 HTML 包可在所有兼容客户端中一致渲染。')
    ]));
  }

  // t3-scope-stepup: 收到带 WWW-Authenticate 的 403，征得同意后，以更大权限范围（Scope）重试
  function scopeStepup(host) {
    var svg = svgEl('svg', { viewBox: '0 0 520 250' });
    svg.appendChild(enter(70, 90, '0.1s', [
      box(-50, -30, 100, 60),
      txt(0, 5, '客户端', '11', 'var(--ink,#1a1a1a)')
    ]));
    svg.appendChild(enter(450, 90, '0.25s', [
      box(-50, -30, 100, 60),
      txt(0, -3, '服务器', '11', 'var(--ink,#1a1a1a)'),
      txt(0, 14, '需要写权限', '8', 'var(--ink-mute,#777)')
    ]));
    svg.appendChild(enter(260, 208, '0.4s', [
      box(-70, -24, 140, 48),
      txt(0, -2, '用户授权', '10', 'var(--ink,#1a1a1a)'),
      txt(0, 14, '授予 notes:write？', '8', 'var(--ink-mute,#777)')
    ]));
    svg.appendChild(packet(chip(84, 'notes:read'), 'M122 72 L398 72', '6s',
      '0;0.02;0.2;1', '0;1;1;0;0', '0;0.03;0.19;0.23;1'));
    var deny = svgEl('g', { opacity: '0' }, chip(102, '403 追加权限'));
    deny.appendChild(svgEl('animateMotion', { path: 'M398 108 L122 108', dur: '6s', repeatCount: 'indefinite', calcMode: 'linear', keyPoints: '0;0;1;1', keyTimes: '0;0.24;0.42;1' }));
    deny.appendChild(anim('opacity', '0;0;1;1;0;0', '0;0.24;0.26;0.41;0.45;1', '6s'));
    deny.firstChild.setAttribute('fill', 'var(--warn,#b8870f)');
    svg.appendChild(deny);
    svg.appendChild(txt(260, 128, 'WWW-Authenticate: scope=notes:write', '8', 'var(--warn,#b8870f)'));
    svg.appendChild(packet(chip(46, '询问'), 'M84 120 C84 184 130 202 186 206', '6s',
      '0;0.46;0.6;1', '0;0;1;1;0;0', '0;0.46;0.48;0.59;0.63;1'));
    svg.appendChild(packet(chip(52, '授权'), 'M334 206 C390 202 436 184 436 120', '6s',
      '0;0.62;0.76;1', '0;0;1;1;0;0', '0;0.62;0.64;0.75;0.79;1'));
    var retry = svgEl('g', { opacity: '0' }, chip(140, 'notes:read+write'));
    retry.appendChild(svgEl('animateMotion', { path: 'M122 40 L398 40', dur: '6s', repeatCount: 'indefinite', calcMode: 'linear', keyPoints: '0;0;1;1', keyTimes: '0;0.8;0.96;1' }));
    retry.appendChild(anim('opacity', '0;0;1;1;0', '0;0.8;0.82;0.97;1', '6s'));
    svg.appendChild(retry);
    host.appendChild(el('div', { class: 'lf' }, [
      head('追加权限范围（Scope Step-up）', '只补充所需权限，无需重走整个流程'),
      el('div', { class: 'lf-body' }, [out(svg)]),
      cap('仅有 notes:read 权限的令牌遇到了需要 notes:write 的操作。服务器返回 403，并在 WWW-Authenticate 标头中指出缺少的权限范围（Scope），无需直接失败或重走整个 OAuth 流程。客户端只请求用户授予新增权限，然后用权限已更新的令牌重试。追加权限的成本足够低，就能始终以最小权限（Least Privilege）为默认配置。')
    ]));
  }

  // t3-gateway-funnel: 多个开发者，一个策略执行点（Policy point），多个后端
  function gatewayFunnel(host) {
    var svg = svgEl('svg', { viewBox: '0 0 520 250' });
    var dy = [45, 125, 205], i;
    for (i = 0; i < 3; i++) {
      svg.appendChild(enter(58, dy[i], (0.1 + i * 0.12) + 's', [
        box(-38, -18, 76, 36),
        txt(0, 4, '开发者 ' + (i + 1), '10', 'var(--ink,#1a1a1a)')
      ]));
      svg.appendChild(enter(462, dy[i], (0.5 + i * 0.12) + 's', [
        box(-38, -18, 76, 36),
        txt(0, 4, ['笔记', 'GitHub', 'Postgres'][i], '9', 'var(--ink,#1a1a1a)')
      ]));
      svg.appendChild(svgEl('path', { d: 'M96 ' + dy[i] + ' C160 ' + dy[i] + ' 160 125 200 125', fill: 'none', stroke: 'var(--rule-soft,#ccc)', 'stroke-width': '1.3' }));
      svg.appendChild(svgEl('path', { d: 'M320 125 C360 125 360 ' + dy[i] + ' 424 ' + dy[i], fill: 'none', stroke: 'var(--rule-soft,#ccc)', 'stroke-width': '1.3' }));
    }
    svg.appendChild(enter(260, 125, '0.35s', [
      box(-60, -62, 120, 124, 'var(--blueprint,#3553ff)'),
      txt(0, -42, '网关（Gateway）', '11', 'var(--blueprint,#3553ff)'),
      txt(0, -22, '身份认证', '8', 'var(--ink-soft,#555)'),
      txt(0, -7, '角色权限（RBAC）', '8', 'var(--ink-soft,#555)'),
      txt(0, 8, '速率限制', '8', 'var(--ink-soft,#555)'),
      txt(0, 23, '固定哈希值', '8', 'var(--ink-soft,#555)'),
      txt(0, 38, '审计日志', '8', 'var(--ink-soft,#555)')
    ]));
    var starts = [0.02, 0.35, 0.68];
    for (i = 0; i < 3; i++) {
      var s = starts[i];
      var d1 = svgEl('circle', { r: 5, fill: 'var(--blueprint,#3553ff)', opacity: '0' }, []);
      d1.appendChild(svgEl('animateMotion', { path: 'M96 ' + dy[i] + ' C160 ' + dy[i] + ' 160 125 200 125', dur: '6s', repeatCount: 'indefinite', calcMode: 'linear', keyPoints: '0;0;1;1', keyTimes: '0;' + s + ';' + (s + 0.12) + ';1' }));
      d1.appendChild(anim('opacity', '0;0;1;1;0;0', '0;' + s + ';' + (s + 0.01) + ';' + (s + 0.11) + ';' + (s + 0.13) + ';1', '6s'));
      svg.appendChild(d1);
      var d2 = svgEl('circle', { r: 5, fill: 'var(--blueprint,#3553ff)', opacity: '0' }, []);
      d2.appendChild(svgEl('animateMotion', { path: 'M320 125 C360 125 360 ' + dy[i] + ' 424 ' + dy[i], dur: '6s', repeatCount: 'indefinite', calcMode: 'linear', keyPoints: '0;0;1;1', keyTimes: '0;' + (s + 0.16) + ';' + (s + 0.28) + ';1' }));
      d2.appendChild(anim('opacity', '0;0;1;1;0;0', '0;' + (s + 0.16) + ';' + (s + 0.17) + ';' + (s + 0.27) + ';' + (s + 0.29) + ';1', '6s'));
      svg.appendChild(d2);
    }
    host.appendChild(el('div', { class: 'lf' }, [
      head('网关汇聚（Gateway Funnel）', '一个端点，五项职责'),
      el('div', { class: 'lf-body' }, [out(svg)]),
      cap('在开发者看来，网关就是单个 MCP 服务器。网关内部对每次调用完成身份认证、按用户执行基于角色的访问控制（Role-Based Access Control，RBAC）、实施速率限制、比对固定的工具哈希清单并写入审计日志，然后才路由到工具所属的后端。策略集中维护在一个位置，无需散落在五千份集成开发环境（Integrated Development Environment，IDE）配置中。')
    ]));
  }

  // t3-jwks-rotate: 认证服务器（Auth server）轮换密钥，缓存先刷新
  function jwksRotate(host) {
    var svg = svgEl('svg', { viewBox: '0 0 520 240' });
    svg.appendChild(enter(105, 70, '0.1s', [
      box(-80, -42, 160, 84),
      txt(0, -22, '授权服务器', '9', 'var(--ink,#1a1a1a)'),
      txt(0, 26, '/.well-known/jwks.json', '8', 'var(--ink-mute,#777)')
    ]));
    var kidA = txt(105, 72, '签名密钥 kid:A', '10', 'var(--blueprint,#3553ff)');
    kidA.appendChild(anim('opacity', '1;1;0;0;1', '0;0.42;0.5;0.92;1', '6s'));
    svg.appendChild(kidA);
    var kidB = txt(105, 72, '签名密钥 kid:B', '10', 'var(--warn,#b8870f)');
    kidB.setAttribute('opacity', '0');
    kidB.appendChild(anim('opacity', '0;0;1;1;0', '0;0.42;0.5;0.92;1', '6s'));
    svg.appendChild(kidB);
    svg.appendChild(enter(415, 70, '0.25s', [
      box(-80, -42, 160, 84),
      txt(0, -22, 'MCP 资源服务器', '9', 'var(--ink,#1a1a1a)'),
      txt(0, 26, '过期前刷新', '8', 'var(--ink-mute,#777)')
    ]));
    var cacheA = txt(415, 72, 'JWKS 缓存：A', '10', 'var(--blueprint,#3553ff)');
    cacheA.appendChild(anim('opacity', '1;1;0;0;1', '0;0.6;0.68;0.92;1', '6s'));
    svg.appendChild(cacheA);
    var cacheB = txt(415, 72, 'JWKS 缓存：A+B', '10', 'var(--warn,#b8870f)');
    cacheB.setAttribute('opacity', '0');
    cacheB.appendChild(anim('opacity', '0;0;1;1;0', '0;0.6;0.68;0.92;1', '6s'));
    svg.appendChild(cacheB);
    svg.appendChild(packet(chip(62, '获取'), 'M187 90 L333 90', '6s',
      '0;0.5;0.62;1', '0;0;1;1;0;0', '0;0.5;0.52;0.6;0.64;1'));
    svg.appendChild(packet(chip(84, '令牌 kid:A'), 'M260 210 C300 210 340 180 400 120', '6s',
      '0;0.06;0.26;1', '0;1;1;0;0', '0;0.07;0.25;0.3;1'));
    svg.appendChild(packet(chip(84, '令牌 kid:B'), 'M260 210 C300 210 340 180 400 120', '6s',
      '0;0.72;0.9;1', '0;0;1;1;0;0', '0;0.72;0.74;0.89;0.94;1'));
    svg.appendChild(txt(180, 214, '客户端请求', '8', 'var(--ink-mute,#777)', 'end'));
    var ok = txt(475, 122, '验证通过', '9', 'var(--blueprint,#3553ff)');
    ok.setAttribute('opacity', '0');
    ok.appendChild(anim('opacity', '0;0;1;0;0;1;0', '0;0.26;0.31;0.4;0.9;0.95;1', '6s'));
    svg.appendChild(ok);
    host.appendChild(el('div', { class: 'lf' }, [
      head('JSON Web 密钥集轮换（JWKS Rotation）', '在密钥过期前完成刷新'),
      el('div', { class: 'lf-body' }, [out(svg)]),
      cap('授权服务器按计划将签名密钥从 kid A 轮换为 kid B。若资源服务器仅在启动时获取一次 JSON Web 密钥集（JSON Web Key Set，JWKS），此时就会开始拒绝所有令牌。生产实现应缓存密钥集，由刷新任务在旧密钥过期前更新缓存，并在缓存未命中时兜底获取。这样，即使凌晨三点收到新密钥签名的令牌，也能完成验证，无需重启。')
    ]));
  }

  // t3-span-waterfall: 一条追踪（Trace），嵌套跨度（Spans）以瀑布形式逐渐出现
  function spanWaterfall(host) {
    var svg = svgEl('svg', { viewBox: '0 0 520 260' });
    svg.appendChild(txt(20, 26, '同一个追踪标识（Trace ID）', '9', 'var(--blueprint,#3553ff)', 'start'));
    svg.appendChild(txt(500, 26, '时间', '9', 'var(--ink-mute,#777)', 'end'));
    svg.appendChild(svgEl('line', { x1: 20, y1: 34, x2: 500, y2: 34, stroke: 'var(--rule-soft,#ccc)', 'stroke-width': '1' }));
    var rows = [
      { label: 'invoke_agent', ind: 0, x0: 40, w: 440, t0: 0.04, t1: 0.86 },
      { label: 'llm.chat', ind: 1, x0: 60, w: 120, t0: 0.1, t1: 0.3 },
      { label: 'tool.execute', ind: 1, x0: 195, w: 150, t0: 0.34, t1: 0.58 },
      { label: 'mcp.call', ind: 2, x0: 215, w: 110, t0: 0.38, t1: 0.54 },
      { label: 'llm.chat', ind: 1, x0: 360, w: 110, t0: 0.62, t1: 0.8 }
    ];
    var i;
    for (i = 0; i < rows.length; i++) {
      var r = rows[i], y = 52 + i * 40;
      var fill = r.ind === 2 ? 'var(--warn,#b8870f)' : (r.ind === 0 ? 'var(--blueprint,#3553ff)' : 'var(--bg-surface,#eee)');
      var bar = svgEl('rect', { x: r.x0, y: y, width: 0, height: 16, rx: '2', fill: fill, stroke: 'var(--rule-soft,#ddd)', 'stroke-width': r.ind === 1 ? '1.2' : '0' });
      bar.appendChild(svgEl('animate', {
        attributeName: 'width', values: '0;0;' + r.w + ';' + r.w + ';0',
        keyTimes: '0;' + r.t0 + ';' + r.t1 + ';0.92;1', dur: '6s',
        repeatCount: 'indefinite', calcMode: 'spline',
        keySplines: EASE + ';' + EASE + ';' + EASE + ';' + EASE
      }));
      svg.appendChild(bar);
      var lbl = txt(r.x0 + 6, y + 12, r.label, '9', r.ind === 0 ? 'var(--bg,#fafaf5)' : 'var(--ink-soft,#555)', 'start');
      lbl.setAttribute('opacity', '0');
      lbl.appendChild(anim('opacity', '0;0;1;1;0', '0;' + (r.t0 + 0.03) + ';' + (r.t0 + 0.08) + ';0.92;1', '6s'));
      svg.appendChild(lbl);
    }
    svg.appendChild(txt(20, 252, '每个跨度的 gen_ai.operation.name 串联各个层级', '8', 'var(--ink-mute,#777)', 'start'));
    host.appendChild(el('div', { class: 'lf' }, [
      head('跨度瀑布图（Span Waterfall）', '同一追踪中的智能体、LLM、工具与 MCP'),
      el('div', { class: 'lf-body' }, [out(svg)]),
      cap('一个追踪标识（Trace ID）覆盖整轮对话。智能体跨度（Span）最先开始、最后结束；内部的大语言模型（LLM）调用、工具执行及工具封装的 MCP 分发各有自己的跨度，并带有 gen_ai 属性。图中保留原始操作名。后端冷启动时，变长的是 mcp.call 条形；仅靠日志无法回答耗时究竟落在哪一层。')
    ]));
  }

  // t3-skill-layers: 三层上下文（Context layers），一个包（Bundle），适用任意智能体
  function skillLayers(host) {
    var svg = svgEl('svg', { viewBox: '0 0 520 250' });
    var layers = [
      { y: 60, t: 'AGENTS.md', s: '项目约定，启动时读取', d: '0.1s' },
      { y: 125, t: 'SKILL.md', s: '任务方法，按需加载', d: '0.28s' },
      { y: 190, t: 'MCP', s: '技能调用的工具', d: '0.46s' }
    ];
    var i;
    for (i = 0; i < 3; i++) {
      svg.appendChild(enter(140, layers[i].y, layers[i].d, [
        box(-115, -26, 230, 52, i === 1 ? 'var(--blueprint,#3553ff)' : 'var(--rule-soft,#ddd)'),
        txt(0, -4, layers[i].t, '11', i === 1 ? 'var(--blueprint,#3553ff)' : 'var(--ink,#1a1a1a)'),
        txt(0, 13, layers[i].s, '8', 'var(--ink-mute,#777)')
      ]));
    }
    var agents = [
      { y: 55, t: 'Claude Code' },
      { y: 125, t: 'Cursor' },
      { y: 195, t: 'Codex' }
    ];
    for (i = 0; i < 3; i++) {
      svg.appendChild(enter(445, agents[i].y, (0.64 + i * 0.12) + 's', [
        box(-55, -20, 110, 40),
        txt(0, 5, agents[i].t, '10', 'var(--ink,#1a1a1a)')
      ]));
      svg.appendChild(svgEl('path', { d: 'M258 125 C330 125 330 ' + agents[i].y + ' 388 ' + agents[i].y, fill: 'none', stroke: 'var(--rule-soft,#ccc)', 'stroke-width': '1.3' }));
      var s = 0.08 + i * 0.3;
      var dot = svgEl('g', { opacity: '0' }, chip(66, '技能包'));
      dot.appendChild(svgEl('animateMotion', { path: 'M258 125 C330 125 330 ' + agents[i].y + ' 388 ' + agents[i].y, dur: '5.5s', repeatCount: 'indefinite', calcMode: 'linear', keyPoints: '0;0;1;1', keyTimes: '0;' + s + ';' + (s + 0.2) + ';1' }));
      dot.appendChild(anim('opacity', '0;0;1;1;0;0', '0;' + s + ';' + (s + 0.02) + ';' + (s + 0.18) + ';' + (s + 0.22) + ';1', '5.5s'));
      svg.appendChild(dot);
    }
    host.appendChild(el('div', { class: 'lf' }, [
      head('三层结构（Three Layers）', '上下文、任务方法、工具'),
      el('div', { class: 'lf-body' }, [out(svg)]),
      cap('AGENTS.md 告诉各类智能体项目如何运作。SKILL.md 将一个工作流封装为前置元数据（Frontmatter）和正文，由运行时逐步披露（Progressive Disclosure）。MCP 提供技能所调用的工具。各层都采用开放格式的普通文件，因此同一份技能包可直接用于 Claude Code、Cursor 和 Codex，无需复制三份并承担内容逐渐分叉的问题。')
    ]));
  }

  // t3-capstone-chain: 一个请求穿过阶段 13 的所有组成部分
  function capstoneChain(host) {
    var svg = svgEl('svg', { viewBox: '0 0 520 270' });
    var stops = [
      { x: 55, y: 60, w: 80, t: '用户', s: '发起请求', d: '0.1s' },
      { x: 195, y: 60, w: 96, t: '网关', s: 'OAuth + RBAC', d: '0.22s' },
      { x: 350, y: 60, w: 120, t: 'MCP 服务器', s: '发现、工具与任务扩展', d: '0.34s' },
      { x: 350, y: 165, w: 120, t: '写作智能体', s: 'A2A，内部不透明', d: '0.46s' }
    ];
    var i;
    for (i = 0; i < 4; i++) {
      var st = stops[i];
      svg.appendChild(enter(st.x, st.y, st.d, [
        box(-st.w / 2, -28, st.w, 56),
        txt(0, -6, st.t, '10', 'var(--ink,#1a1a1a)'),
        txt(0, 11, st.s, '8', 'var(--ink-mute,#777)')
      ]));
    }
    svg.appendChild(enter(120, 165, '0.58s', [
      box(-70, -24, 140, 48),
      txt(0, -2, 'ui:// 报告', '10', 'var(--blueprint,#3553ff)'),
      txt(0, 14, '内联渲染', '8', 'var(--ink-mute,#777)')
    ]));
    svg.appendChild(svgEl('line', { x1: 30, y1: 236, x2: 490, y2: 236, stroke: 'var(--rule-soft,#ccc)', 'stroke-width': '1' }));
    svg.appendChild(txt(30, 226, 'OTel 追踪', '8', 'var(--ink-mute,#777)', 'start'));
    var hops = [
      { p: 'M95 52 L147 52', s: 0.02, tick: 120 },
      { p: 'M243 52 L290 52', s: 0.18, tick: 265 },
      { p: 'M350 88 L350 137', s: 0.34, tick: 350 },
      { p: 'M290 175 C230 180 210 180 190 172', s: 0.52, tick: 420 },
      { p: 'M60 88 C60 120 80 132 100 140', s: 0.72, tick: 470 }
    ];
    for (i = 0; i < hops.length; i++) {
      var h = hops[i];
      var dot = svgEl('circle', { r: 5, fill: 'var(--blueprint,#3553ff)', opacity: '0' }, []);
      dot.appendChild(svgEl('animateMotion', { path: h.p, dur: '6s', repeatCount: 'indefinite', calcMode: 'linear', keyPoints: '0;0;1;1', keyTimes: '0;' + h.s + ';' + (h.s + 0.14) + ';1' }));
      dot.appendChild(anim('opacity', '0;0;1;1;0;0', '0;' + h.s + ';' + (h.s + 0.01) + ';' + (h.s + 0.13) + ';' + (h.s + 0.15) + ';1', '6s'));
      svg.appendChild(dot);
      var tick = svgEl('rect', { x: h.tick, y: 231, width: 3, height: 10, fill: 'var(--warn,#b8870f)', opacity: '0' });
      tick.appendChild(anim('opacity', '0;0;1;1;0', '0;' + (h.s + 0.12) + ';' + (h.s + 0.16) + ';0.94;1', '6s'));
      svg.appendChild(tick);
    }
    svg.appendChild(txt(255, 152, 'A2A SendMessage', '8', 'var(--ink-mute,#777)'));
    host.appendChild(el('div', { class: 'lf' }, [
      head('综合项目调用链（Capstone Chain）', '一个请求串联阶段 13 的全部组件'),
      el('div', { class: 'lf-body' }, [out(svg)]),
      cap('每个无状态 MCP 请求都携带版本与能力信息。网关负责身份认证并执行策略；服务器可以返回官方任务扩展的句柄，由客户端通过 tasks/get 轮询；独立工作则通过智能体间协议（Agent2Agent，A2A）的 SendMessage 委派。最终的 ui:// 报告与各个边界跨度始终保持关联，无需依赖协议会话。')
    ]));
  }

  LF.register({
    't3-dispatch-loop': dispatchLoop,
    't3-primitive-sort': primitiveSort,
    't3-sampling-flip': samplingFlip,
    't3-roots-boundary': rootsBoundary,
    't3-ui-sandbox': uiSandbox,
    't3-scope-stepup': scopeStepup,
    't3-gateway-funnel': gatewayFunnel,
    't3-jwks-rotate': jwksRotate,
    't3-span-waterfall': spanWaterfall,
    't3-skill-layers': skillLayers,
    't3-capstone-chain': capstoneChain
  });
})();
