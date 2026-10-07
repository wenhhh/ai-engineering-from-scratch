/* figures-mcpa-certifications.js: mechanism figures for the MCPA certification
   curriculum. Loads after lesson-figures.js and registers through window.LF.
   Vanilla ES5, no dependencies. */
(function () {
  'use strict';

  var LF = window.LF;
  if (!LF) return;

  var el = LF.el;
  var svgEl = LF.svgEl;
  var INK = 'var(--ink,#1a1a1a)';
  var SOFT = 'var(--ink-soft,#555)';
  var MUTE = 'var(--ink-mute,#777)';
  var BP = 'var(--blueprint,#3553ff)';
  var BG = 'var(--bg,#fafaf5)';
  var SURF = 'var(--bg-surface,#eee)';
  var RULE = 'var(--rule-soft,#ddd)';
  var ERR = '#c94a34';
  var EASE = '0.23 1 0.32 1';
  var WIN = '0 0 1 1;' + EASE + ';0 0 1 1;0.4 0 1 1';
  var MID = { 'text-anchor': 'middle' };
  var BOLD = { 'font-weight': 700 };
  var DASH = { 'stroke-dasharray': '4 3' };

  function num(v) { return String(Math.round(v * 1000) / 1000); }
  function extend(target, extra) {
    for (var key in extra) target[key] = extra[key];
    return target;
  }
  function times(a, b, c) { return '0;' + num(a) + ';' + num(b) + ';' + num(c) + ';1'; }

  function anim(attr, values, D, extra) {
    return svgEl('animate', extend({ attributeName: attr, values: values, dur: D + 's', repeatCount: 'indefinite' }, extra));
  }
  function stage(w, h) {
    return svgEl('svg', { viewBox: '0 0 ' + w + ' ' + h, 'font-family': 'var(--font-mono,monospace)', 'font-size': 11 });
  }
  function grp(kids, attrs) { return svgEl('g', attrs || {}, kids); }
  function txt(x, y, s, fill, attrs) {
    return svgEl('text', extend({ x: x, y: y, fill: fill || INK }, attrs), [document.createTextNode(s)]);
  }
  function rct(x, y, w, h, stroke, fill, attrs) {
    return svgEl('rect', extend({ x: x, y: y, width: w, height: h, rx: 4, fill: fill || SURF, stroke: stroke || RULE }, attrs));
  }
  function box(x, y, w, h, title, sub, stroke, fill) {
    var g = grp([rct(x, y, w, h, stroke, fill)]);
    if (sub) {
      g.appendChild(txt(x + 10, y + h / 2 - 3, title));
      g.appendChild(txt(x + 10, y + h / 2 + 12, sub, MUTE));
    } else {
      g.appendChild(txt(x + 10, y + h / 2 + 4, title));
    }
    return g;
  }
  function ln(x1, y1, x2, y2, stroke, attrs) {
    return svgEl('line', extend({ x1: x1, y1: y1, x2: x2, y2: y2, stroke: stroke || MUTE, 'stroke-width': 1.4 }, attrs));
  }
  function pth(d, stroke, attrs) {
    return svgEl('path', extend({ d: d, fill: 'none', stroke: stroke || MUTE, 'stroke-width': 1.4 }, attrs));
  }
  function head(x, y, deg, fill) {
    return svgEl('path', { d: 'M0 0L-8 -4L-8 4Z', fill: fill || BP, transform: 'translate(' + num(x) + ' ' + num(y) + ') rotate(' + num(deg) + ')' });
  }
  function arrow(points, color, attrs) {
    var last = points[points.length - 1];
    var prev = points[points.length - 2];
    var dx = last[0] - prev[0];
    var dy = last[1] - prev[1];
    var len = Math.sqrt(dx * dx + dy * dy);
    var d = '';
    var total = 0;
    for (var i = 0; i < points.length; i++) {
      var p = i === points.length - 1 ? [last[0] - dx / len * 6, last[1] - dy / len * 6] : points[i];
      d += (i ? 'L' : 'M') + num(p[0]) + ' ' + num(p[1]);
      if (i) total += Math.sqrt(Math.pow(p[0] - points[i - 1][0], 2) + Math.pow(p[1] - points[i - 1][1], 2));
    }
    var g = grp([]);
    g.line = g.appendChild(pth(d, color || BP, attrs));
    g.tip = g.appendChild(head(last[0], last[1], Math.atan2(dy, dx) * 180 / Math.PI, color || BP));
    g.len = total;
    return g;
  }

  function show(node, D, a, b, c) {
    node.setAttribute('opacity', '0');
    node.appendChild(anim('opacity', '0;0;1;1;0', D, { calcMode: 'spline', keyTimes: times(a, b || a + 0.06, c || 0.94), keySplines: WIN }));
    return node;
  }
  function pop(kids, x, y, D, a, b, c) {
    b = b || a + 0.07;
    c = c || 0.94;
    var mid = grp([grp(kids, { transform: 'translate(' + -x + ' ' + -y + ')' })]);
    mid.appendChild(svgEl('animateTransform', { attributeName: 'transform', type: 'scale', values: '0.95;0.95;1;1;0.95', dur: D + 's', repeatCount: 'indefinite', calcMode: 'spline', keyTimes: times(a, b, c), keySplines: WIN }));
    return show(grp([mid], { transform: 'translate(' + x + ' ' + y + ')' }), D, a, b, c);
  }
  function grow(kids, x, y, D, a, b, c, sideways) {
    b = b || a + 0.08;
    c = c || 0.94;
    var from = sideways ? '0.001 1' : '1 0.001';
    var mid = grp([grp(kids, { transform: 'translate(' + -x + ' ' + -y + ')' })]);
    mid.appendChild(svgEl('animateTransform', { attributeName: 'transform', type: 'scale', values: from + ';' + from + ';1 1;1 1;' + from, dur: D + 's', repeatCount: 'indefinite', calcMode: 'spline', keyTimes: times(a, b, c), keySplines: WIN }));
    return grp([mid], { transform: 'translate(' + x + ' ' + y + ')' });
  }
  function slide(node, dx, dy, D, a, b) {
    node.appendChild(svgEl('animateTransform', { attributeName: 'transform', type: 'translate', values: '0 0;0 0;' + dx + ' ' + dy + ';' + dx + ' ' + dy, dur: D + 's', repeatCount: 'indefinite', keyTimes: '0;' + num(a) + ';' + num(b) + ';1' }));
    return node;
  }
  function draw(node, len, D, a, b, c) {
    node.setAttribute('stroke-dasharray', num(len));
    node.appendChild(anim('stroke-dashoffset', num(len) + ';' + num(len) + ';0;0;' + num(len), D, { calcMode: 'spline', keyTimes: times(a, b, c || 0.94), keySplines: '0 0 1 1;0 0 1 1;0 0 1 1;0.4 0 1 1' }));
    return node;
  }
  function route(points) {
    var d = '';
    for (var i = 0; i < points.length; i++) d += (i ? 'L' : 'M') + num(points[i][0]) + ' ' + num(points[i][1]);
    return d;
  }
  function packet(d, D, a, b, color, label) {
    var kids;
    if (label) {
      var w = label.length * 6.6 + 14;
      kids = [rct(-w / 2, -8, w, 16, color || BP, BG, { rx: 8 }), txt(0, 4, label, color || BP, MID)];
    } else {
      kids = [svgEl('circle', { r: 4.5, fill: color || BP, stroke: BG, 'stroke-width': 1.5 })];
    }
    var t = '0;' + num(a) + ';' + num(b) + ';1';
    var g = grp(kids, { opacity: '0' });
    g.appendChild(anim('opacity', '0;1;0;0', D, { calcMode: 'discrete', keyTimes: t }));
    g.appendChild(svgEl('animateMotion', { path: d, dur: D + 's', repeatCount: 'indefinite', calcMode: 'linear', keyPoints: '0;0;1;1', keyTimes: t }));
    return g;
  }
  function send(points, D, a, b, color, attrs, cargo) {
    var g = arrow(points, color, attrs);
    if (attrs && attrs['stroke-dasharray']) show(g.line, D, a, a + 0.04);
    else draw(g.line, g.len, D, a, b);
    show(g.tip, D, b - 0.02, b);
    if (cargo !== null) g.appendChild(packet(route(points), D, a, b, color, cargo));
    return g;
  }
  function spot(x, y, w, h, D, a, b, color, attrs) {
    var r = rct(x, y, w, h, color || BP, color || BP, extend({ 'fill-opacity': 0.1, 'stroke-width': 2, opacity: '0' }, attrs));
    r.appendChild(anim('opacity', '0;0;1;1;0;0', D, { keyTimes: '0;' + num(a) + ';' + num(a + 0.03) + ';' + num(b) + ';' + num(b + 0.05) + ';1' }));
    return r;
  }
  function card(host, D, svg, label, hint, desc, caption) {
    if (!document.getElementById('mf-styles')) {
      document.head.appendChild(el('style', { id: 'mf-styles' }, ['@media(max-width:640px){.mf .lf-head{flex-direction:column;align-items:flex-start;gap:4px}.mf .lf-body{overflow-x:auto;padding:12px 8px;background:linear-gradient(90deg,var(--bg,#fafaf5) 40%,transparent) 0 0/28px 100% no-repeat local,linear-gradient(270deg,var(--bg,#fafaf5) 40%,transparent) 100% 0/28px 100% no-repeat local,linear-gradient(90deg,rgba(127,127,127,.28),transparent) 0 0/12px 100% no-repeat scroll,linear-gradient(270deg,rgba(127,127,127,.28),transparent) 100% 0/12px 100% no-repeat scroll}.mf .lf-body svg{min-width:500px}}']));
    }
    host.setAttribute('data-static-time', num(D * 0.9));
    svg.insertBefore(svgEl('desc', {}, [document.createTextNode(desc)]), svg.firstChild);
    host.appendChild(el('div', { class: 'lf mf' }, [
      el('div', { class: 'lf-head' }, [el('span', { class: 'lf-label' }, [label]), el('span', {}, [hint])]),
      el('div', { class: 'lf-body' }, [svg]),
      el('div', { class: 'lf-cap' }, [caption])
    ]));
  }

  function blueprintWeightsFigure(host) {
    var D = 7;
    var domains = [
      ['MCP 基础', 16],
      ['架构', 14],
      ['交互', 26],
      ['安全', 24],
      ['用例', 20]
    ];
    var baseline = 210;
    var barWidth = 70;
    var step = 100;
    var startX = 45;
    var pxPerPercent = 5;
    var svg = stage(560, 250);
    svg.appendChild(ln(30, baseline, 530, baseline, RULE, { 'stroke-width': 1 }));
    var i, x, centerX, barHeight, barY, valueY, a;
    var spots = [];
    for (i = 0; i < domains.length; i++) {
      x = startX + i * step;
      centerX = x + barWidth / 2;
      barHeight = domains[i][1] * pxPerPercent;
      barY = baseline - barHeight;
      valueY = barY - 8;
      a = 0.05 + i * 0.09;
      svg.appendChild(grow([rct(x, barY, barWidth, barHeight, 'none', BP, { opacity: 0.85 })], centerX, baseline, D, a));
      svg.appendChild(pop([txt(centerX, valueY, domains[i][1] + '%', INK, MID)], centerX, valueY, D, a + 0.08));
      svg.appendChild(txt(centerX, baseline + 18, domains[i][0], MUTE, MID));
      if (i === 2 || i === 3) spots.push([x, barY, barWidth, barHeight]);
    }
    for (i = 0; i < spots.length; i++) {
      svg.appendChild(spot(spots[i][0], spots[i][1], spots[i][2], spots[i][3], D, 0.6, 0.78, BP));
    }
    card(host, D, svg, 'MCPA 考试大纲', '按考试内容比例分配五个领域的权重',
      '五个领域的权重柱状图：MCP 基础 16%，架构与组件 14%，交互与执行 26%，安全与治理 24%，用例与生态 20%。',
      '交互与执行、安全与治理合计占据一半大纲。平均分配五个领域的学习时间，会使这两个最高权重领域投入不足。');
  }

  function specMapFigure(host) {
    var D = 9;
    var must = ['基础协议', '版本管理', '消息模式'];
    var may = ['授权', '服务器功能', '客户端功能', '实用功能'];
    var mustW = 150, mustGap = 10, mustStartX = 45, mustY = 66, mustH = 26;
    var mayW = 125, mayGap = 8, mayStartX = 18, mayY = 138, mayH = 26;
    var rootX = 200, rootY = 12, rootW = 160, rootH = 32;
    var rootCx = rootX + rootW / 2;
    var rootBy = rootY + rootH;
    var svg = stage(560, 300);
    svg.appendChild(pop([
      rct(rootX, rootY, rootW, rootH, BP, SURF, { 'stroke-width': 1.4 }),
      txt(rootCx, rootY + 14, '规范', INK, MID),
      txt(rootCx, rootY + 27, '2026-07-28，现行', INK, MID)
    ], rootCx, rootY + rootH / 2, D, 0.03, 0.09));
    svg.appendChild(show(txt(mustStartX, mustY - 6, 'MUST 支持', MUTE), D, 0.11));
    var i, x, cx, a;
    for (i = 0; i < must.length; i++) {
      x = mustStartX + i * (mustW + mustGap);
      cx = x + mustW / 2;
      a = 0.14 + i * 0.06;
      svg.appendChild(draw(ln(rootCx, rootBy, cx, mustY, MUTE, { 'stroke-width': 0.7, opacity: 0.65 }), Math.sqrt(Math.pow(cx - rootCx, 2) + Math.pow(mustY - rootBy, 2)), D, a, a + 0.05));
      svg.appendChild(pop([rct(x, mustY, mustW, mustH, BP, BP, { 'fill-opacity': 0.14, 'stroke-width': 1.2 }), txt(cx, mustY + 17, must[i], INK, MID)], cx, mustY + mustH / 2, D, a, a + 0.06));
    }
    svg.appendChild(show(txt(mayStartX, mayY - 6, 'MAY 支持', MUTE), D, 0.35));
    for (i = 0; i < may.length; i++) {
      x = mayStartX + i * (mayW + mayGap);
      cx = x + mayW / 2;
      a = 0.38 + i * 0.045;
      svg.appendChild(draw(ln(rootCx, rootBy, cx, mayY, MUTE, { 'stroke-width': 0.7, opacity: 0.65 }), Math.sqrt(Math.pow(cx - rootCx, 2) + Math.pow(mayY - rootBy, 2)), D, a, a + 0.04));
      svg.appendChild(pop([rct(x, mayY, mayW, mayH, RULE, SURF), txt(cx, mayY + 17, may[i], MUTE, MID)], cx, mayY + mayH / 2, D, a, a + 0.05));
    }
    var chips = ['Active', 'Deprecated', 'Removed'];
    var chipW = 110, chipGap = 40, chipStartX = 75, chipY = 210, chipH = 26, chipCy = chipY + chipH / 2;
    var chipT = [[0.6, 0.655], [0.695, 0.745], [0.78, 0.83]];
    for (i = 0; i < chips.length; i++) {
      x = chipStartX + i * (chipW + chipGap);
      cx = x + chipW / 2;
      svg.appendChild(pop([rct(x, chipY, chipW, chipH, SOFT, SURF, { rx: 13 }), txt(cx, chipY + 17, chips[i], INK, MID)], cx, chipCy, D, chipT[i][0], chipT[i][1]));
      if (i > 0) svg.appendChild(send([[x - chipGap, chipCy], [x - 4, chipCy]], D, chipT[i - 1][1], chipT[i][0], BP));
    }
    svg.appendChild(show(txt(chipStartX, chipY + chipH + 18, '功能生命周期独立于修订版状态', MUTE), D, 0.835, 0.875));
    card(host, D, svg, '阅读规范', '必需支持项、可选项与功能生命周期',
      'MCP 规范结构：2026-07-28 现行版连接三个必需部分——基础协议、版本管理、消息模式——以及授权、服务器功能、客户端功能、实用功能四个可选部分。下方展示 Active、Deprecated、Removed 功能生命周期，独立于修订版状态。',
      '每个实现 MUST 支持基础协议、版本管理和消息模式，其余部分按需添加。功能自身的 Active、Deprecated、Removed 状态，与文档的 Draft、Current、Final 状态分开追踪。');
  }

  function nByMFigure(host) {
    var D = 8;
    var apps = ['聊天', '编辑器', '智能体', '门户'];
    var systems = ['文件', '工单', 'CRM', '文档', '数据库', 'CI'];
    var svg = stage(560, 230);
    var i, j, mesh, a;
    for (i = 0; i < apps.length; i++) {
      svg.appendChild(rct(16, 34 + i * 44, 76, 24));
      svg.appendChild(txt(24, 50 + i * 44, apps[i]));
      svg.appendChild(rct(300, 34 + i * 44, 76, 24));
      svg.appendChild(txt(308, 50 + i * 44, apps[i]));
    }
    for (j = 0; j < systems.length; j++) {
      svg.appendChild(rct(208, 18 + j * 30, 60, 22));
      svg.appendChild(txt(214, 33 + j * 30, systems[j]));
      svg.appendChild(rct(486, 18 + j * 30, 60, 22));
      svg.appendChild(txt(492, 33 + j * 30, systems[j]));
    }
    for (i = 0; i < apps.length; i++) {
      mesh = [];
      for (j = 0; j < systems.length; j++) {
        mesh.push(ln(92, 46 + i * 44, 208, 30 + j * 30, MUTE, { 'stroke-width': 0.6, opacity: 0.7 }));
      }
      svg.appendChild(show(grp(mesh), D, 0.05 + i * 0.06));
    }
    svg.appendChild(show(txt(96, 222, 'N x M = 24 套集成', MUTE), D, 0.31));
    svg.appendChild(pop([rct(420, 100, 20, 40, 'none', BP, { rx: 3 })], 430, 120, D, 0.4));
    for (i = 0; i < apps.length; i++) {
      svg.appendChild(draw(ln(376, 46 + i * 44, 420, 120, BP), Math.sqrt(Math.pow(376 - 420, 2) + Math.pow(46 + i * 44 - 120, 2)), D, 0.49, 0.55));
    }
    for (j = 0; j < systems.length; j++) {
      svg.appendChild(draw(ln(440, 120, 486, 29 + j * 30, BP), Math.sqrt(Math.pow(440 - 486, 2) + Math.pow(120 - (29 + j * 30), 2)), D, 0.57, 0.63));
    }
    var routes = [
      [[376, 46], [420, 120], [440, 120], [486, 29]],
      [[376, 90], [420, 120], [440, 120], [486, 89]],
      [[376, 134], [420, 120], [440, 120], [486, 179]]
    ];
    for (i = 0; i < routes.length; i++) {
      a = 0.65 + i * 0.04;
      svg.appendChild(packet(route(routes[i]), D, a, a + 0.08, BP));
    }
    svg.appendChild(show(txt(358, 222, 'N + M = 10 份实现', MUTE), D, 0.82, 0.86));
    card(host, D, svg, '集成问题', '24 套定制集成与 10 份协议实现',
      '左：四个应用分别连接六个系统，共二十四条连接。右：每个应用和系统只连接共享协议一次，共十条连接。',
      '定制胶水代码随应用与系统的配对数量增长。共享协议让每个应用只实现一次客户端、每个系统只实现一次服务器；任意客户端都可在运行时发现服务器。');
  }

  function envelopeFigure(host) {
    var D = 8;
    var shapes = [
      ['请求', '必须有 id', '不能为 null'],
      ['通知', '不能有 id', '不发送回复'],
      ['结果', 'id 对应请求', '包含 resultType'],
      ['错误', '可读时回传 id', 'code + message']
    ];
    var cardW = 120, gap = 12, startX = 18;
    var svg = stage(560, 220);
    svg.appendChild(txt(18, 14, '四种消息结构共用消息封套', INK, BOLD));
    var i, x, a;
    for (i = 0; i < shapes.length; i++) {
      x = startX + i * (cardW + gap);
      a = 0.04 + i * 0.08;
      svg.appendChild(pop([
        rct(x, 22, cardW, 70),
        txt(x + 8, 40, shapes[i][0], INK, BOLD),
        txt(x + 8, 60, shapes[i][1], MUTE),
        txt(x + 8, 80, shapes[i][2], MUTE)
      ], x + cardW / 2, 57, D, a));
    }
    svg.appendChild(txt(18, 112, '_meta 键是否保留给 MCP？', INK, BOLD));
    svg.appendChild(pop([rct(36.6, 124, 157.2, 16, 'none', BP, { 'fill-opacity': 0.22 })], 115.2, 132, D, 0.47, 0.54));
    svg.appendChild(show(grp([
      txt(18, 136, 'io.', SOFT, { 'font-size': 12 }),
      txt(39.6, 136, 'modelcontextprotocol', INK, { 'font-size': 12, 'font-weight': 700 }),
      txt(190.8, 136, '/protocolVersion', SOFT, { 'font-size': 12 })
    ]), D, 0.4, 0.46));
    svg.appendChild(show(txt(18, 154, '第二标签为 modelcontextprotocol：保留', MUTE), D, 0.55, 0.61));
    svg.appendChild(pop([rct(43.8, 170, 56.4, 16, 'none', RULE, { 'fill-opacity': 0.6 })], 72, 178, D, 0.72, 0.79));
    svg.appendChild(show(grp([
      txt(18, 182, 'com.', SOFT, { 'font-size': 12 }),
      txt(46.8, 182, 'example', INK, { 'font-size': 12, 'font-weight': 700 }),
      txt(97.2, 182, '.mcp/scanId', SOFT, { 'font-size': 12 })
    ]), D, 0.65, 0.71));
    svg.appendChild(show(txt(18, 200, '第二标签为 example：不保留', MUTE), D, 0.8, 0.86));
    card(host, D, svg, 'JSON-RPC 消息封套', '四种消息结构与 _meta 键的组成',
      '上方：请求、通知、结果和错误四种消息卡片，分别列出关键字段。下方：两个 _meta 键拆为前缀标签和名称，并高亮第二个标签。io.modelcontextprotocol 的第二标签为 modelcontextprotocol，因此保留；com.example.mcp 的第二标签为 example，因此不保留。',
      '请求必须携带非 null 的 id，通知不能携带 id，结果或错误回传所回答请求的 id。只有 _meta 键前缀的第二个点分标签为 modelcontextprotocol 或 mcp 时，该前缀才保留给 MCP；mcp 在其他位置出现不影响判断。');
  }

  function statelessRequestsFigure(host) {
    var D = 9;
    var svg = stage(560, 230);
    svg.appendChild(rct(14, 26, 76, 26));
    svg.appendChild(txt(22, 43, 'alice'));
    svg.appendChild(rct(14, 140, 76, 26));
    svg.appendChild(txt(22, 157, 'bob'));
    svg.appendChild(rct(150, 80, 100, 40));
    svg.appendChild(txt(158, 97, '路由器'));
    svg.appendChild(txt(158, 112, '轮询'));
    svg.appendChild(rct(300, 14, 100, 30));
    svg.appendChild(txt(308, 33, '副本 A'));
    svg.appendChild(rct(300, 156, 100, 30));
    svg.appendChild(txt(308, 175, '副本 B'));
    svg.appendChild(rct(452, 60, 96, 80, BP, BG, DASH));
    svg.appendChild(txt(460, 95, '共享'));
    svg.appendChild(txt(460, 113, '存储'));
    var links = [
      [[90, 39], [148, 90]],
      [[90, 153], [148, 110]],
      [[250, 90], [298, 29]],
      [[250, 110], [298, 171]],
      [[400, 29], [450, 80]],
      [[400, 171], [450, 120]]
    ];
    var i;
    for (i = 0; i < links.length; i++) svg.appendChild(arrow(links[i], i < 2 ? SOFT : BP, i < 2 ? { 'stroke-width': 1 } : undefined));
    var flows = [
      [links[0], links[2], links[4]],
      [links[1], links[3], links[5]],
      [links[0], links[3], links[5]]
    ];
    var t;
    for (i = 0; i < flows.length; i++) {
      t = 0.05 + i * 0.22;
      svg.appendChild(packet(route(flows[i][0]), D, t, t + 0.05, BP));
      svg.appendChild(spot(150, 80, 100, 40, D, t + 0.04, t + 0.09, BP));
      svg.appendChild(packet(route(flows[i][1]), D, t + 0.07, t + 0.12, BP));
      svg.appendChild(packet(route(flows[i][2]), D, t + 0.13, t + 0.18, BP));
      svg.appendChild(spot(452, 60, 96, 80, D, t + 0.16, t + 0.2, BP));
    }
    svg.appendChild(show(grp([
      txt(14, 222, '同一句柄，任意副本', MUTE),
      txt(300, 222, '状态保存在共享存储中', MUTE)
    ]), D, 0.74, 0.8));
    card(host, D, svg, '无状态核心', '状态独立于副本，任意副本均可作答',
      'alice 和 bob 经轮询路由器向可互换的 A、B 两个服务器副本发送请求。两个副本读写同一个共享句柄存储，因此无论下一个请求到达哪个副本，都能正确回答。',
      'alice 和 bob 的请求按轮询分派，不固定到某个副本。购物篮状态不属于任一副本私有内存；两者都以工具返回的不透明句柄为键，读写同一共享存储，所以任意副本都可正确回答后续请求。');
  }

  function eraMatrixFigure(host) {
    var D = 8;
    var mid = [['DiscoverResult', 95], ['-32022（可识别）', 280], ['其他错误 / 超时', 465]];
    var out = [['现代：直接使用', 95], ['现代：换版本重试', 280], ['旧版：用 initialize', 465]];
    var svg = stage(560, 210);
    svg.appendChild(pop([rct(190, 10, 180, 30), txt(207, 29, 'server/discover 探测')], 280, 25, D, 0.03, 0.1));
    var i, cx, t;
    for (i = 0; i < mid.length; i++) {
      cx = mid[i][1];
      t = 0.12 + i * 0.21;
      svg.appendChild(send([[280, 40], [cx, 78]], D, t, t + 0.05, MUTE, { 'stroke-width': 1 }));
      svg.appendChild(pop([rct(cx - 85, 80, 170, 28), txt(cx - 77, 98, mid[i][0])], cx, 94, D, t + 0.04, t + 0.09));
      svg.appendChild(send([[cx, 108], [cx, 148]], D, t + 0.1, t + 0.14, MUTE, { 'stroke-width': 1 }, null));
      svg.appendChild(pop([rct(cx - 85, 150, 170, 28, BP, SURF, { 'stroke-width': 1.2 }), txt(cx - 77, 168, out[i][0])], cx, 164, D, t + 0.14, t + 0.19));
    }
    svg.appendChild(show(grp([
      txt(18, 193, '时代属于服务器属性，按以下范围缓存判断：', SOFT),
      txt(18, 206, '进程（stdio）或源站（HTTP）。', SOFT)
    ]), D, 0.76, 0.82));
    card(host, D, svg, '协议时代探测', '一次 server/discover 探测，三种结果，无须预先握手',
      'server/discover 探测产生三类结果：DiscoverResult 表示现代服务器；可识别的 -32022 UnsupportedProtocolVersion 错误表示现代服务器需要以其他版本重试；其他错误或超时则按旧版处理，回退到 initialize 握手。',
      '同一探测将 stdio 服务器分为现代、不同版本的现代和旧版。可识别的现代错误不会触发回退；只有无法识别的错误或超时才会回退。');
  }

  function topologyFigure(host) {
    var D = 9;
    var rows = [
      ['客户端：files', '服务器：files', '本地 · stdio · tools', '自报："primary"', 32],
      ['客户端：notes', '服务器：notes', '本地 · stdio · tools', '自报："primary"', 104],
      ['客户端：metrics', '服务器：metrics', '远程 · http · resources', '自报："metrics-svc"', 176]
    ];
    var svg = stage(560, 330);
    svg.appendChild(rct(6, 6, 190, 248));
    svg.appendChild(txt(16, 22, '宿主进程', MUTE, { style: 'text-transform:uppercase;letter-spacing:.06em' }));
    var i, r, y, cy, t;
    for (i = 0; i < rows.length; i++) {
      r = rows[i];
      y = r[4];
      cy = y + 27;
      t = 0.04 + i * 0.21;
      svg.appendChild(pop([rct(22, y, 160, 54, RULE, BG), txt(32, y + 32, r[0])], 102, cy, D, t, t + 0.07));
      svg.appendChild(send([[182, cy], [350, cy]], D, t + 0.06, t + 0.12, BP));
      svg.appendChild(pop([
        rct(350, y, 200, 54, RULE, BG),
        txt(360, y + 18, r[1]),
        txt(360, y + 32, r[2], MUTE),
        txt(360, y + 46, r[3], MUTE)
      ], 450, cy, D, t + 0.12, t + 0.19));
    }
    var regs = [
      '注册表使用宿主分配的 id，不使用 serverInfo.name',
      'search -> files（先声明者保留原名）',
      'notes/search -> notes（冲突时加服务器 id 前缀）'
    ];
    for (i = 0; i < regs.length; i++) {
      svg.appendChild(show(txt(20, 282 + i * 18, regs[i], SOFT), D, 0.68 + i * 0.06, 0.74 + i * 0.06));
    }
    svg.appendChild(spot(14, 304, 414, 18, D, 0.83, 0.89, BP));
    card(host, D, svg, '宿主、客户端与服务器', '每台服务器一个客户端，由宿主统一注册',
      '宿主嵌入三个客户端，每个绑定一台服务器。files 与 notes 在本地通过 stdio 运行，均自报名称 primary；metrics 通过远程 Streamable HTTP 运行。注册表让 files 保留 search，将 notes 的同名工具命名为 notes/search。',
      '宿主为每台服务器嵌入一个客户端。files 与 notes 是本地 stdio 子进程，均自报名称“primary”，因此宿主使用自行分配的连接 id files 和 notes 索引注册表，不依赖自报名称。metrics 是未声明 tools 能力的远程 Streamable HTTP 服务器，宿主不查询它的工具列表。files 与 notes 都声明 search；聚合器让前者保留规范名称，将后者暴露为 notes/search。');
  }

  function discoverCapabilityFigure(host) {
    var D = 8;
    var svg = stage(560, 210);
    svg.appendChild(txt(16, 24, '发现：可选，可缓存', INK, { 'font-size': 12, 'font-weight': 700 }));
    svg.appendChild(txt(16, 100, '每次 tools/call 都须重新声明能力', INK, { 'font-size': 12, 'font-weight': 700 }));
    [
      [46, 'server/discover', 'supportedVersions + capabilities + ttlMs', BP, null, SOFT, 0.03],
      [124, 'clientCapabilities: {}', '-32021：缺少 elicitation', MUTE, DASH, ERR, 0.28],
      [172, 'clientCapabilities: {elicitation:{form:{}}}', 'result: complete', BP, null, BP, 0.53]
    ].forEach(function (lane) {
      var y = lane[0];
      var a = lane[6];
      svg.appendChild(box(16, y - 12, 84, 24, '客户端'));
      svg.appendChild(box(460, y - 12, 84, 24, '服务器'));
      if (lane[5] !== SOFT) svg.appendChild(spot(458, y - 14, 88, 28, D, a + 0.09, a + 0.19, lane[5]));
      svg.appendChild(show(txt(280, y - 8, lane[1], SOFT, MID), D, a));
      svg.appendChild(send([[100, y], [460, y]], D, a, a + 0.09, lane[3], lane[4]));
      svg.appendChild(show(txt(280, y + 14, lane[2], lane[5], MID), D, a + 0.1));
      svg.appendChild(packet(route([[460, y], [100, y]]), D, a + 0.1, a + 0.19, lane[5] === SOFT ? BP : lane[5]));
    });
    card(host, D, svg, '发现与能力协商', '发现可缓存；每次调用都须声明能力',
      '上方：客户端可选调用一次 server/discover，获得支持版本、服务器能力、指引和缓存提示。下方：每个 tools/call 仍须声明当前请求的客户端能力；未声明 elicitation 时服务器返回 -32021，声明后调用完成。',
      'server/discover 可选且可缓存，用于汇总服务器能力。每个 tools/call 仍在自己的 _meta 中携带 clientCapabilities，并重新接受检查：缺少 elicitation 时返回指出该缺失项的 -32021，声明后才能完成。');
  }

  function schemaContractFigure(host) {
    var D = 8;
    var svg = stage(560, 260);
    svg.appendChild(rct(16, 14, 190, 64));
    svg.appendChild(txt(24, 30, 'tool: lookup_product'));
    svg.appendChild(txt(24, 44, 'inputSchema: 必需 sku', MUTE));
    svg.appendChild(txt(24, 58, 'outputSchema: 4 个字段', MUTE));
    svg.appendChild(txt(24, 72, '拒绝额外属性', MUTE));
    svg.appendChild(arrow([[111, 78], [111, 90]], MUTE));
    svg.appendChild(arrow([[111, 124], [111, 148]], MUTE));
    svg.appendChild(box(51, 150, 120, 32, 'validate()', undefined, BP));
    svg.appendChild(arrow([[436, 60], [436, 74]], MUTE));
    svg.appendChild(pop([box(16, 92, 190, 32, 'arguments: {"sku": "X"}')], 111, 108, D, 0.03));
    svg.appendChild(packet(route([[111, 124], [111, 148]]), D, 0.1, 0.17, BP));
    svg.appendChild(spot(51, 150, 120, 32, D, 0.16, 0.25, BP));
    svg.appendChild(send([[81, 182], [81, 196]], D, 0.23, 0.29, MUTE, DASH));
    svg.appendChild(pop([rct(14, 198, 192, 30, MUTE, SURF, DASH), txt(22, 218, 'result isError: true')], 110, 213, D, 0.29));
    svg.appendChild(send([[171, 166], [328, 166]], D, 0.36, 0.42, BP));
    svg.appendChild(pop([box(330, 150, 212, 32, 'handler(arguments)', undefined, BP)], 436, 166, D, 0.42));
    svg.appendChild(send([[436, 182], [436, 196]], D, 0.49, 0.55, BP));
    svg.appendChild(pop([box(330, 198, 212, 48, 'structuredContent: {...}', 'content[0].text: 相同 JSON', BP)], 436, 222, D, 0.55));
    svg.appendChild(pop([box(330, 14, 212, 46, 'name: "delete_catalog"', '不在 tools/list 中')], 436, 37, D, 0.62));
    svg.appendChild(packet(route([[436, 60], [436, 74]]), D, 0.69, 0.75, MUTE));
    svg.appendChild(pop([rct(330, 76, 212, 32, MUTE, SURF, DASH), txt(344, 97, 'error -32602 Invalid params')], 436, 92, D, 0.75));
    card(host, D, svg, '模式契约', '一个校验门禁，两条结果路径',
      '工具定义包含 inputSchema 和 outputSchema。参数进入校验门禁：模式失败返回 isError true 的结果；通过则运行处理器，返回符合 outputSchema 的 structuredContent 及其文本镜像。服务器从未发布的工具名称走独立路径，直接返回协议错误 -32602。',
      '已知工具的模式校验失败通过 isError true 的正常结果返回，模型能够读取内容并修正。服务器从未发布的工具名称则走不进入处理器的独立路径，返回 JSON-RPC 协议错误。');
  }

  function manifestAnatomyFigure(host) {
    var D = 8;
    var svg = stage(560, 200);
    var panels = [
      { t: 'server/discover', x: 8, rows: [['capabilities', 0], ['instructions', 1], ['cacheScope, ttlMs', 0]] },
      { t: 'tools/list', x: 196, rows: [['annotations: 未声明', 1], ['x-mcp-header', 1], ['cacheScope: public', 1]] },
      { t: 'server.json', x: 384, rows: [['name: acme-tools', 1], ['packages: npm', 0], ['remotes: http', 0]] }
    ];
    var bodyHeight = 138;
    var i, j, panel, row, rowY, kids, flags, a;
    flags = [];
    for (i = 0; i < panels.length; i++) {
      panel = panels[i];
      kids = [rct(panel.x, 30, 168, bodyHeight), rct(panel.x, 30, 168, 26, RULE, 'none'), txt(panel.x + 9, 47, panel.t, INK, BOLD)];
      for (j = 0; j < panel.rows.length; j++) {
        row = panel.rows[j];
        rowY = 70 + j * 34;
        kids.push(svgEl('circle', { cx: panel.x + 13, cy: rowY, r: 6, fill: row[1] ? ERR : BP }));
        if (row[1]) {
          kids.push(txt(panel.x + 13, rowY + 4, '!', '#fff', { 'text-anchor': 'middle', 'font-weight': 700, 'font-size': 9 }));
          flags.push([panel.x + 13, rowY]);
        }
        kids.push(txt(panel.x + 26, rowY + 4, row[0], MUTE));
      }
      svg.appendChild(pop(kids, panel.x + 84, 99, D, 0.04 + i * 0.1));
    }
    for (i = 0; i < flags.length; i++) {
      a = 0.33 + i * 0.08;
      svg.appendChild(spot(flags[i][0] - 10, flags[i][1] - 10, 20, 20, D, a, a + 0.08, ERR));
    }
    svg.appendChild(show(txt(8, 188, '圆点标记字段；带感叹号的内容需要重点审查', SOFT), D, 0.78));
    card(host, D, svg, '服务器清单结构', '首次调用前审阅三份材料',
      '三个面板分别展示发现结果的能力与指引、工具列表中的注解和 x-mcp-header，以及注册表 server.json 的命名空间。标记指出优先审阅的内容：操纵模型的指引、缺少注解的工具、暴露疑似秘密参数的请求头，以及缺少命名空间的名称。',
      '清单包含三份材料：服务器声称支持什么、当前提供什么，以及注册表如何命名它。首次实际调用前，应重点检查操纵模型的指引、未声明注解的工具、暴露疑似秘密参数的请求头，以及没有命名空间的名称。');
  }

  function modelInteractionFlowFigure(host) {
    var D = 9;
    var svg = stage(560, 296);
    svg.appendChild(box(6, 26, 90, 44, '用户提问'));
    svg.appendChild(box(104, 26, 116, 44, '宿主：上下文'));
    svg.appendChild(box(228, 26, 112, 44, '模型选择'));
    svg.appendChild(box(348, 26, 104, 44, '确认门禁', undefined, BP));
    svg.appendChild(box(460, 26, 94, 44, '服务器'));
    svg.appendChild(arrow([[96, 48], [104, 48]], BP));
    svg.appendChild(arrow([[220, 48], [228, 48]], BP));
    svg.appendChild(arrow([[340, 48], [348, 48]], BP));
    svg.appendChild(arrow([[452, 48], [460, 48]], BP));
    svg.appendChild(txt(410, 18, '已批准', MUTE));
    svg.appendChild(rct(20, 110, 140, 40, MUTE, 'none', DASH));
    svg.appendChild(txt(28, 134, '留在本地（拒绝）'));
    svg.appendChild(arrow([[507, 70], [75, 180]], BP));
    svg.appendChild(arrow([[507, 70], [230, 180]], BP));
    svg.appendChild(arrow([[507, 70], [415, 180]], BP));
    svg.appendChild(arrow([[75, 224], [85, 250]], BP));
    svg.appendChild(packet(route([[96, 48], [460, 48]]), D, 0.03, 0.17, BP));
    svg.appendChild(spot(348, 26, 104, 44, D, 0.13, 0.17, BP));
    svg.appendChild(send([[402, 70], [90, 110]], D, 0.19, 0.24, MUTE));
    svg.appendChild(show(txt(20, 160, '已拒绝，未发送', MUTE), D, 0.2));
    svg.appendChild(packet(route([[507, 70], [75, 180]]), D, 0.26, 0.31, BP));
    svg.appendChild(pop([box(20, 180, 110, 44, 'complete')], 75, 202, D, 0.31, 0.37));
    svg.appendChild(packet(route([[507, 70], [230, 180]]), D, 0.37, 0.42, BP));
    svg.appendChild(pop([box(160, 180, 140, 44, 'isError: true')], 230, 202, D, 0.42, 0.48));
    svg.appendChild(packet(route([[507, 70], [415, 180]]), D, 0.48, 0.53, BP));
    svg.appendChild(pop([box(330, 180, 170, 44, 'input_required')], 415, 202, D, 0.53, 0.59));
    svg.appendChild(send([[230, 180], [230, 80], [284, 80], [284, 70]], D, 0.59, 0.64, MUTE, DASH));
    svg.appendChild(show(txt(236, 112, '修正参数后重试', MUTE), D, 0.6));
    svg.appendChild(send([[415, 180], [415, 86], [300, 86], [300, 70]], D, 0.63, 0.68, MUTE, DASH));
    svg.appendChild(show(txt(330, 240, '新 id 重试，原样回传 requestState', MUTE), D, 0.64));
    svg.appendChild(packet(route([[75, 224], [85, 250]]), D, 0.68, 0.73, BP));
    svg.appendChild(pop([box(10, 250, 150, 36, '回答用户')], 85, 268, D, 0.73, 0.79));
    card(host, D, svg, '模型交互流程', '上下文、选择、确认、调用与结果反馈',
      '用户请求经宿主构建上下文、模型选择工具并拟定参数，再进入确认门禁。批准后调用到达服务器，拒绝则留在本地不发送。服务器可以返回形成答案的完整结果、让模型修正参数的工具执行错误，或要求宿主收集输入、用新 id 和原样 requestState 重试的 input_required。',
      '被拒确认在客户端发送前终止，不会成为调用报文。已到达服务器的分支中，工具执行错误和 input_required 都会把控制权交回模型；MRTR 分支除使用新 id 外，还需原样回传 requestState。协议错误也交回控制权，但不能靠原样重复修复，因此循环不重发同一请求。');
  }

  function toolCallFigure(host) {
    var D = 7;
    var svg = stage(560, 230);
    svg.appendChild(rct(16, 36, 110, 40));
    svg.appendChild(txt(71, 60, '客户端', INK, MID));
    svg.appendChild(rct(434, 36, 110, 40));
    svg.appendChild(txt(489, 60, '服务器', INK, MID));
    svg.appendChild(send([[126, 48], [434, 48]], D, 0.04, 0.11, BP));
    svg.appendChild(show(txt(280, 40, 'tools/call', MUTE, MID), D, 0.04));
    svg.appendChild(send([[434, 70], [126, 70]], D, 0.14, 0.21, BP));
    svg.appendChild(show(txt(280, 86, 'CallToolResult', MUTE, MID), D, 0.14));
    svg.appendChild(show(txt(8, 112, 'content 可包含：', MUTE), D, 0.26));
    var chipLabels = ['text', 'image', 'audio', 'resource_link', 'resource'];
    var chipX = [8, 120, 232, 344, 456];
    var chipW = [104, 104, 104, 104, 96];
    var i;
    for (i = 0; i < chipLabels.length; i++) {
      svg.appendChild(pop([rct(chipX[i], 122, chipW[i], 26), txt(chipX[i] + chipW[i] / 2, 139, chipLabels[i], INK, MID)], chipX[i] + chipW[i] / 2, 135, D, 0.3 + i * 0.06));
    }
    svg.appendChild(show(txt(8, 172, '同时报告：', MUTE), D, 0.62));
    svg.appendChild(pop([rct(8, 182, 140, 26), txt(78, 199, '省略 isError', INK, MID)], 78, 195, D, 0.66));
    svg.appendChild(pop([rct(170, 182, 140, 26), txt(240, 199, 'isError: true', INK, MID)], 240, 195, D, 0.72));
    card(host, D, svg, '工具原语', '一次调用、五种内容、两个错误通道',
      '客户端发送 tools/call，服务器返回 CallToolResult。content 列表可包含 text、image、audio、resource_link 或 resource。结果还通过 isError 表示执行状态：省略或 false 为成功，true 表示工具遇到问题。',
      'tools/call 指定工具名称和参数；返回的 CallToolResult 包含五种内容块任意组合的 content、可选 structuredContent，以及 isError。isError 省略或 false 表示成功，true 表示工具遇到模型能够读取并修正的问题。');
  }

  function resourceReadFigure(host) {
    var D = 7;
    var svg = stage(560, 232);
    svg.appendChild(rct(224, 76, 150, 64));
    svg.appendChild(txt(234, 96, 'resources/read', INK, BOLD));
    svg.appendChild(txt(234, 112, '按根目录校验路径', MUTE));
    svg.appendChild(txt(234, 128, '再查询 URI', MUTE));
    svg.appendChild(arrow([[180, 108], [224, 108]], BP));
    svg.appendChild(txt(182, 100, '展开', MUTE));
    svg.appendChild(pop([rct(8, 76, 172, 64), txt(18, 96, '模板', INK, BOLD), txt(18, 112, 'file:///project/{+path}', MUTE), txt(18, 128, 'path = src/app.py', MUTE)], 94, 108, D, 0.04));
    svg.appendChild(packet(route([[180, 108], [224, 108]]), D, 0.14, 0.2, BP));
    svg.appendChild(spot(224, 76, 150, 64, D, 0.19, 0.27, BP));
    svg.appendChild(send([[374, 92], [400, 40]], D, 0.3, 0.37, BP));
    svg.appendChild(show(txt(330, 60, '已找到', MUTE), D, 0.3));
    svg.appendChild(pop([rct(400, 10, 156, 66), txt(408, 30, 'complete', INK, BOLD), txt(408, 46, 'contents[]', MUTE), txt(408, 62, 'ttlMs + cacheScope', MUTE)], 478, 43, D, 0.37));
    svg.appendChild(send([[374, 124], [400, 176]], D, 0.47, 0.54, ERR));
    svg.appendChild(show(txt(320, 164, '不存在', MUTE), D, 0.47));
    svg.appendChild(pop([rct(400, 146, 156, 66), txt(408, 166, '-32602', ERR, BOLD), txt(408, 182, 'data.uri', MUTE), txt(408, 198, '不能用空 contents[]', MUTE)], 478, 179, D, 0.54));
    svg.appendChild(show(txt(8, 222, '查询前先校验路径，不能解析到项目根目录之外', SOFT), D, 0.63));
    card(host, D, svg, '读取资源', '一个 URI，两种合法结果',
      'URI 模板 file:///project/{+path} 展开为具体 URI，再由 resources/read 按项目根目录校验。资源存在时返回含 contents、ttlMs 和 cacheScope 的完整结果；资源不存在或路径试图越界时，返回 JSON-RPC 错误 -32602，并在 data.uri 指出请求目标，不能返回空 contents 数组代替错误。',
      'URI 模板展开后，resources/read 先按服务器根目录校验，再执行查询。资源存在时返回含 contents、ttlMs 和 cacheScope 的完整结果；不存在或路径越界时返回 -32602，并用 data.uri 指明目标，不能以成功结果和空 contents 数组表示缺失。');
  }

  function promptTemplateFigure(host) {
    var D = 7;
    var svg = stage(560, 204);
    svg.appendChild(txt(14, 18, 'prompts/get 渲染模板', MUTE));
    svg.appendChild(arrow([[131, 70], [131, 84]], BP));
    svg.appendChild(arrow([[131, 130], [131, 144]], BP));
    svg.appendChild(txt(312, 18, '上下文缩小补全范围', MUTE));
    svg.appendChild(pop([rct(14, 26, 234, 44), txt(22, 42, 'text: {language} 代码片段，'), txt(22, 58, '遵循 {framework} 风格')], 131, 48, D, 0.04));
    svg.appendChild(packet(route([[131, 70], [131, 84]]), D, 0.13, 0.19, BP));
    svg.appendChild(pop([rct(14, 86, 234, 44), txt(22, 102, 'language: python'), txt(22, 118, 'framework: flask')], 131, 108, D, 0.19));
    svg.appendChild(packet(route([[131, 130], [131, 144]]), D, 0.28, 0.34, BP));
    svg.appendChild(pop([rct(14, 146, 234, 44, BP), txt(22, 162, '渲染：python 代码片段，'), txt(22, 178, '遵循 flask 风格')], 131, 168, D, 0.34));
    svg.appendChild(pop([rct(312, 26, 234, 44), txt(320, 42, 'framework 为 "fa"，无上下文：'), txt(320, 58, 'falcon, fastapi, fastify')], 429, 48, D, 0.44));
    svg.appendChild(send([[429, 70], [429, 84]], D, 0.54, 0.6, BP));
    svg.appendChild(show(txt(366, 80, '+ 上下文', MUTE), D, 0.54));
    svg.appendChild(pop([rct(312, 86, 234, 44, BP), txt(320, 102, 'language: python'), txt(320, 118, '缩小为：falcon, fastapi')], 429, 108, D, 0.6));
    svg.appendChild(show(txt(312, 146, '匹配从 3 项减少为 2 项', MUTE), D, 0.72));
    card(host, D, svg, '提示词模板与补全', '参数填入模板，上下文缩小候选范围',
      '左侧：code_review 模板填入 language 和 framework 占位符，生成文本。右侧：framework 参数无上下文时有三个补全匹配，context.arguments 提供已选语言后缩小为两个。',
      '提示词参数代入占位符，渲染 PromptMessage。completion/complete 对某个参数的建议排序；context.arguments 携带用户已有答案，例如已选语言后，可进一步缩小候选范围。');
  }

  function mrtrFigure(host) {
    var D = 8;
    var svg = stage(560, 290);
    [100, 460].forEach(function (x, i) {
      svg.appendChild(ln(x, 40, x, 272, RULE, { 'stroke-width': 1, 'stroke-dasharray': '3 3' }));
      svg.appendChild(rct(x - 36, 16, 72, 22));
      svg.appendChild(txt(x, 31, i ? '服务器' : '客户端', INK, { 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 700 }));
    });
    svg.appendChild(pop([rct(188, 229, 184, 18, BP, BP, { 'fill-opacity': 0.1, rx: 9 })], 280, 238, D, 0.78));
    [
      [70, 100, 460, 'tools/call (id 1): deploy_release', 0.04, undefined],
      [118, 460, 100, 'input_required: 确认 + requestState', 0.2, null],
      [206, 100, 460, 'tools/call (id 2): 新 id，inputResponses', 0.5, null],
      [254, 460, 100, 'complete: deployed = true', 0.66, undefined]
    ].forEach(function (row) {
      svg.appendChild(show(txt(280, row[0] - 13, row[3], INK, MID), D, row[4]));
      svg.appendChild(send([[row[1], row[0]], [row[2], row[0]]], D, row[4], row[4] + 0.12, BP, null, row[5]));
    });
    svg.appendChild(show(txt(296, 160, '客户端向用户收集确认', MUTE, { 'text-anchor': 'middle', 'font-style': 'italic' }), D, 0.34));
    var token = grp([rct(-47, -9, 94, 18, BP, BG, { rx: 9 }), txt(0, 4, 'requestState', BP, MID)], { opacity: '0' });
    token.appendChild(anim('opacity', '0;1;0;0', D, { calcMode: 'discrete', keyTimes: '0;0.2;0.62;1' }));
    token.appendChild(svgEl('animateMotion', { path: 'M460 118L100 118L100 206L460 206', dur: D + 's', repeatCount: 'indefinite', calcMode: 'linear', keyPoints: '0;0;0.446;0.554;1;1', keyTimes: '0;0.2;0.32;0.48;0.62;1' }));
    svg.appendChild(token);
    card(host, D, svg, '多轮往返请求', 'input_required 结束本轮，再用原样 requestState 发起新请求',
      '客户端发送 id 1 的 tools/call。服务器用包含 inputRequests 和 requestState 的 input_required 结束该请求，不维持原流等待。客户端收集用户确认，再发起 id 2 的独立 tools/call，携带 inputResponses 并准确回传 requestState，服务器随后返回 complete。',
      '服务器不主动向客户端推送请求，而是以 input_required 结束第一轮。客户端使用新 JSON-RPC id 发起独立的第二轮调用，逐字节回传 requestState，并提供 inputResponses。');
  }

  function deprecationTimelineFigure(host) {
    var D = 8;
    var svg = stage(560, 256);
    var depX = 150;
    var remX = 360;
    var endX = 524;
    var lns = [
      { label: 'Roots', y: 84 },
      { label: 'Sampling', y: 112 },
      { label: 'Logging', y: 140 }
    ];
    var svalid = [
      'roots/list（MRTR 输入请求）',
      'sampling/createMessage (MRTR)',
      'logLevel + notifications/message'
    ];
    var rmv = [
      'logging/setLevel',
      'notifications/roots/list_changed'
    ];
    var i;
    var y;
    svg.appendChild(ln(depX, 40, endX, 40, MUTE));
    svg.appendChild(ln(18, 160, 542, 160, RULE));
    for (i = 0; i < lns.length; i++) svg.appendChild(txt(18, lns[i].y + 4, lns[i].label));
    svg.appendChild(txt(18, 176, '已弃用，报文仍可使用', INK, BOLD));
    svg.appendChild(txt(300, 176, '已完全移除', INK, BOLD));
    svg.appendChild(pop([
      svgEl('circle', { cx: depX, cy: 40, r: 4, fill: BP }),
      txt(depX, 24, '已弃用', INK, MID),
      txt(depX, 56, '2026-07-28', MUTE, MID)
    ], depX, 40, D, 0.03));
    svg.appendChild(pop([
      svgEl('circle', { cx: remX, cy: 40, r: 4, fill: BP }),
      txt(remX, 24, '具备移除资格', INK, MID),
      txt(remX, 56, '2027-07-28+', MUTE, MID)
    ], remX, 40, D, 0.35));
    for (i = 0; i < lns.length; i++) svg.appendChild(svgEl('circle', { cx: depX, cy: lns[i].y, r: 3, fill: BP }));
    var skids = [];
    for (i = 0; i < lns.length; i++) skids.push(ln(depX, lns[i].y, remX, lns[i].y, BP, { 'stroke-width': 5 }));
    svg.appendChild(grow(skids, depX, 0, D, 0.12, 0.35, undefined, true));
    var cursor = spot(depX, 30, 1, 122, D, 0.12, 0.52, BP);
    svg.appendChild(slide(cursor, endX - depX, 0, D, 0.12, 0.52));
    var dkids = [];
    for (i = 0; i < lns.length; i++) dkids.push(ln(remX, lns[i].y, endX, lns[i].y, SOFT, { 'stroke-width': 5, 'stroke-dasharray': '6 4' }));
    svg.appendChild(show(grp(dkids), D, 0.39));
    for (i = 0; i < svalid.length; i++) {
      y = 196 + i * 20;
      svg.appendChild(show(box(18, y - 8, 6, 6, svalid[i], 0, 'none', BP), D, 0.56 + i * 0.055));
    }
    for (i = 0; i < rmv.length; i++) {
      y = 196 + i * 20;
      svg.appendChild(show(box(300, y - 8, 6, 6, rmv[i], 0, 'none', MUTE), D, 0.56 + (svalid.length + i) * 0.055));
    }
    card(host, D, svg, '已弃用但仍可用', 'roots、sampling 和 logging 在等待期内仍可正常响应',
      '时间线从 roots、sampling 和 logging 在 2026-07-28 弃用，延伸到 2027-07-28 当天或之后最早可移除的版本。实线转为虚线，表示越过标记后功能仍可能继续存在。下方一列列出仍合法的 roots/list、sampling/createMessage、每请求 logLevel 与 notifications/message；另一列列出已经移除的 logging/setLevel 和 notifications/roots/list_changed。',
      '2026-07-28 的弃用标记启动至少十二个月等待期，不会立即删除功能。roots、sampling 和 logging 继续保留相应报文结构；logging/setLevel 与 notifications/roots/list_changed 则已经移除，相关交互迁移到 MRTR 输入请求和每请求 logLevel。');
  }

  function subscriptionStreamFigure(host) {
    var D = 9;
    var svg = stage(560, 330);
    var cX = 61;
    var sX = 499;
    var beats = [
      [cX, sX, 'ok', '监听 id=1: toolsListChanged, config.json'],
      [sX, cX, 'ok', '确认: _meta.subscriptionId=1'],
      [cX, sX, 'ok', '监听 id=2: resourcesListChanged'],
      [sX, cX, 'ok', '确认: _meta.subscriptionId=2'],
      [sX, cX, 'ok', 'resources/updated, subscriptionId=1'],
      [sX, cX, 'ok', 'resources/list_changed, subscriptionId=2'],
      [cX, sX, 'ok', 'tools/call id=3, _meta.progressToken=job-42'],
      [sX, cX, 'prog', 'progress 0.2, 0.6, 1.0：无 subscriptionId'],
      [sX, cX, 'ok', '结果 id=3: resultType complete'],
      [cX, sX, 'no', 'notifications/cancelled requestId=2'],
      [sX, cX, 'drop', '订阅 2 的迟到更新：本地丢弃']
    ];
    var top = 46;
    var step = 26;
    var lfB = top + (beats.length - 1) * step + 14;
    var i;
    var cls;
    var label;
    var y;
    var x1;
    var x2;
    var a;
    var midX;
    svg.appendChild(box(16, 6, 90, 22, '客户端'));
    svg.appendChild(box(454, 6, 90, 22, '服务器'));
    svg.appendChild(ln(cX, 28, cX, lfB, RULE, { 'stroke-dasharray': '2 3' }));
    svg.appendChild(ln(sX, 28, sX, lfB, RULE, { 'stroke-dasharray': '2 3' }));
    for (i = 0; i < beats.length; i++) {
      x1 = beats[i][0];
      x2 = beats[i][1];
      cls = beats[i][2];
      label = beats[i][3];
      y = top + i * step;
      a = 0.03 + i * 0.07;
      svg.appendChild(show(txt(280, y - 6, label, SOFT, MID), D, a));
      if (cls === 'prog') {
        svg.appendChild(send([[x1, y], [x2, y]], D, a, a + 0.07, INK, { 'stroke-dasharray': '1 3', 'stroke-linecap': 'round' }, null));
        svg.appendChild(packet(route([[x1, y], [x2, y]]), D, a, a + 0.025, INK));
        svg.appendChild(packet(route([[x1, y], [x2, y]]), D, a + 0.035, a + 0.06, INK));
        svg.appendChild(packet(route([[x1, y], [x2, y]]), D, a + 0.07, a + 0.095, INK));
      } else if (cls === 'drop') {
        midX = (x1 + x2) / 2;
        svg.appendChild(show(ln(x1, y, midX, y, MUTE, DASH), D, a, a + 0.03));
        svg.appendChild(packet(route([[x1, y], [midX, y]]), D, a + 0.01, a + 0.07, MUTE));
      } else {
        svg.appendChild(send([[x1, y], [x2, y]], D, a, a + 0.09, cls === 'no' ? MUTE : BP, cls === 'no' ? DASH : null));
      }
    }
    card(host, D, svg, '通知流、进度与取消', '监听流的每条消息携带 subscriptionId；请求自己的进度不携带该标记',
      '客户端先打开 id 为 1 和 2 的两个 subscriptions/listen，服务器分别确认，并在 _meta 中携带匹配的 subscriptionId。后续 resources/updated 和 list_changed 沿用各自标记。独立 tools/call 的进度只有 progressToken，没有 subscriptionId，最终结果也经同一请求返回。客户端随后取消订阅 2，迟到的更新被丢弃，不再交付。',
      '两个订阅共用通道，通过每条确认和通知在 _meta 中携带的 subscriptionId 区分，其值等于打开订阅的请求 id。普通调用的进度与最终结果走该调用自己的响应通道，不携带 subscriptionId。取消后不再生成新订阅消息，但已在途的消息仍可能到达，接收方须丢弃。');
  }

  function toolLifecycleFigure(host) {
    var D = 9;
    var svg = stage(560, 384);
    var stg = [
      '发现：server/discover',
      '列举：tools/list，可缓存',
      '选择：模型选择工具',
      '确认：宿主批准门禁',
      '调用：发送 tools/call',
      '校验：工具是否存在',
      '执行：校验参数并运行',
      '结果：resultType'
    ];
    var barX = 16;
    var barW = 234;
    var barH = 26;
    var step = 40;
    var midX = barX + barW / 2;
    var i;
    var y;
    var t;
    var ys = [];
    for (i = 0; i < stg.length; i++) {
      y = 14 + i * step;
      ys.push(y);
      t = 0.04 + i * 0.075;
      svg.appendChild(box(barX, y, barW, barH, stg[i], 0, INK));
      svg.appendChild(spot(barX, y, barW, barH, D, t, t + 0.05));
      if (i) svg.appendChild(send([[midX, ys[i - 1] + barH], [midX, y]], D, t - 0.075, t, BP, null, null));
    }
    var yCall = ys[4];
    var rX = 340;
    var rW = 204;
    var rE = barX + barW;
    svg.appendChild(show(grp([ln(rE, ys[5] + 13, rX, ys[5] + 13, MUTE, DASH), box(rX, ys[5], rW, barH, '未知工具：-32602', 0, MUTE)]), D, 0.465));
    svg.appendChild(show(grp([ln(rE, ys[6] + 13, rX, ys[6] + 13, MUTE, DASH), box(rX, ys[6], rW, barH, 'isError（可修正）', 0, MUTE)]), D, 0.54));
    svg.appendChild(show(grp([
      ln(rE, ys[7] + 13, rX, ys[7] + 13, BP, DASH),
      rct(rX, ys[7], rW, barH, BP, SURF, { 'stroke-width': 1.6 }),
      txt(rX + 10, ys[7] + 17, 'complete：最终结束')
    ]), D, 0.615));
    var yRetry = ys[7] + step;
    var eX = rE + 30;
    var cY = yRetry + 8;
    svg.appendChild(show(grp([pth(route([[rE, ys[7] + 13], [eX, ys[7] + 13], [eX, cY], [rX, cY]]), MUTE, DASH), box(rX, yRetry, rW, barH, 'input_required：重试', 0, MUTE)]), D, 0.675));
    var lX = rE + 18;
    var lY = yRetry + 18;
    svg.appendChild(send([[rX, lY], [lX, lY], [lX, yCall + 13], [rE + 2, yCall + 13]], D, 0.75, 0.82));
    card(host, D, svg, '工具调用生命周期', '八个检查点、两个错误通道，以及 input_required 重试循环',
      '八个检查点纵向排列：发现、列举、选择、确认、调用、校验、执行、结果。校验遇到未知工具时分向 -32602 协议错误；执行遇到工具问题时分向 isError 结果。结果又分成 complete 最终结束，以及以新请求 id 回到调用的 input_required 路径。',
      '本课校验阶段只检查工具是否存在，未知时返回 -32602，不进入执行或正常结果阶段。执行中的无效参数和业务问题以 complete 中的 isError 返回，让模型读取原因并修正。input_required 尚未结束逻辑调用：客户端回答后使用新 id，再次经过校验、执行与结果。');
  }

  function errorTaxonomyFigure(host) {
    var D = 7;
    var svg = stage(560, 300);
    var pCodes = [
      ['-32601', '找不到方法'],
      ['-32602', '参数无效（未知工具）'],
      ['-32020', 'HeaderMismatch'],
      ['-32021', 'MissingRequiredClientCapability'],
      ['-32022', 'UnsupportedProtocolVersion']
    ];
    var rh = 32;
    var gap = 6;
    var sY = 40;
    var i;
    var y;
    svg.appendChild(txt(16, 14, '两个错误通道：工具执行结果可作为内容交给模型修正', SOFT, BOLD));
    svg.appendChild(txt(16, 30, '协议错误 -> JSON-RPC error', SOFT, BOLD));
    svg.appendChild(txt(296, 30, '工具问题 -> isError: true', SOFT, BOLD));
    svg.appendChild(ln(282, 36, 282, 224, RULE));
    for (i = 0; i < pCodes.length; i++) {
      y = sY + i * (rh + gap);
      svg.appendChild(pop([
        rct(16, y, 250, rh),
        txt(24, y + 13, pCodes[i][0], INK, { 'font-size': 12, 'font-weight': 700 }),
        txt(24, y + 26, pCodes[i][1], MUTE)
      ], 141, y + 16, D, 0.04 + i * 0.07));
    }
    svg.appendChild(pop([
      rct(296, 40, 248, 184),
      txt(304, 58, 'isError: true', INK, { 'font-size': 12, 'font-weight': 700 })
    ], 420, 132, D, 0.40));
    svg.appendChild(show(grp([
      txt(304, 76, 'API 调用失败', MUTE),
      txt(304, 92, '输入校验错误', MUTE),
      txt(304, 108, '业务规则拒绝', MUTE),
      txt(304, 124, '服务器生成的句柄过期', MUTE)
    ]), D, 0.48));
    svg.appendChild(show(grp([
      ln(304, 138, 536, 138, RULE),
      txt(304, 158, '模型读取问题说明，', MUTE),
      txt(304, 176, '修正后重新尝试', MUTE)
    ]), D, 0.60));
    svg.appendChild(pop([
      rct(16, 240, 528, 48, MUTE, 'none', { 'stroke-dasharray': '4 3' }),
      txt(28, 260, '禁用：旧版 -32000 至 -32019；已退役 -32002、-32042', INK, BOLD),
      txt(28, 278, '2026-07-28 服务器不得发送这些错误码', MUTE)
    ], 280, 264, D, 0.73));
    svg.appendChild(spot(16, 240, 528, 48, D, 0.75, 0.80, ERR));
    card(host, D, svg, '请求失败的两个通道', '协议错误采用 JSON-RPC error；工具问题通过带 isError true 的正常结果返回',
      '左列列出五个协议错误：-32601 方法未知、-32602 参数无效、-32020 头部不一致、-32021 缺少客户端能力、-32022 版本不支持。右列展示 API 失败、输入校验、业务拒绝和过期句柄，它们通过 isError true 的内容让模型读取并修正。底部标出不得发送的旧版 -32000 至 -32019，以及已退役的 -32002、-32042。',
      '协议错误由客户端处理 JSON-RPC error 对象。工具问题以 isError true 的正常结果返回，供模型读取并采取修正行动。两个通道均合法，但不能通过它们发送底部列出的禁用错误码。');
  }

  function transportsFigure(host) {
    var D = 7;
    var svg = stage(560, 232);
    var i;
    svg.appendChild(txt(8, 16, 'STDIO（子进程）', MUTE));
    svg.appendChild(box(8, 24, 254, 28, '客户端进程'));
    svg.appendChild(box(8, 118, 254, 28, '服务器（子进程）'));
    svg.appendChild(txt(296, 16, 'STREAMABLE HTTP (POST /mcp)', MUTE));
    svg.appendChild(box(296, 24, 256, 28, '客户端（HTTP 对端）'));
    svg.appendChild(box(296, 118, 256, 28, '服务器（校验并分派）'));
    svg.appendChild(show(txt(68, 80, 'stdin', MUTE), D, 0.05));
    svg.appendChild(send([[60, 52], [60, 116]], D, 0.05, 0.16));
    svg.appendChild(show(txt(358, 80, 'POST /mcp', MUTE), D, 0.05));
    svg.appendChild(send([[350, 52], [350, 116]], D, 0.05, 0.16));
    svg.appendChild(show(txt(158, 80, 'stdout', MUTE), D, 0.22));
    svg.appendChild(send([[150, 116], [150, 52]], D, 0.22, 0.33));
    svg.appendChild(show(txt(478, 80, '响应', MUTE), D, 0.40));
    svg.appendChild(send([[470, 116], [470, 52]], D, 0.40, 0.51));
    svg.appendChild(show(txt(226, 100, 'stderr', MUTE), D, 0.40));
    svg.appendChild(send([[220, 116], [220, 52]], D, 0.40, 0.51, MUTE, DASH));
    svg.appendChild(pop([
      svgEl('circle', { cx: 372, cy: 100, r: 7, fill: ERR }),
      txt(372, 104, '!', '#fff', { 'font-size': 9, 'font-weight': 700, 'text-anchor': 'middle' }),
      txt(384, 104, '不一致：400 + -32020', MUTE)
    ], 450, 100, D, 0.22));
    svg.appendChild(spot(343, 90, 14, 20, D, 0.22, 0.30, ERR));
    var fnotes = [
      '不同传输保持相同协议语义，仅绑定方式不同',
      'stdio 无请求头层，版本和能力在 _meta 中传递',
      'HTTP 镜像 method、name 与 x-mcp-header 参数；不一致返回 400 + -32020'
    ];
    for (i = 0; i < fnotes.length; i++) {
      svg.appendChild(show(txt(8, 178 + i * 16, fnotes[i], SOFT), D, 0.58 + i * 0.08));
    }
    card(host, D, svg, '传输与请求头', '同一消息，两种传输绑定',
      '左侧：客户端经 stdin、stdout 与服务器子进程通信，虚线 stderr 承载日志，没有请求头层。右侧：客户端向 Streamable HTTP 服务器发送 POST，服务器返回响应；请求箭头上的校验点将不一致的请求头拒绝为 HTTP 400 与 -32020。',
      'stdio 通过 stdin 与 stdout 直接交付消息，stderr 单独记录日志，没有额外请求头层。Streamable HTTP 将方法、工具或资源名及 x-mcp-header 参数镜像到请求头，便于网关路由；正文仍是事实来源，镜像不一致会在工具运行前以 HTTP 400 和 HeaderMismatch（-32020）拒绝。');
  }

  function cacheFreshnessFigure(host) {
    var D = 7;
    var svg = stage(560, 208);
    svg.appendChild(txt(70, 16, 'A. 仅 TTL：新鲜至 t_received + ttlMs', INK, { 'font-size': 12 }));
    svg.appendChild(ln(70, 54, 500, 54, RULE));
    svg.appendChild(ln(70, 54, 70, 60, RULE));
    svg.appendChild(ln(310, 54, 310, 60, RULE));
    svg.appendChild(txt(70, 72, 't_received', MUTE));
    svg.appendChild(txt(70, 100, 'B. 有效期内收到通知：立即过期', INK, { 'font-size': 12 }));
    svg.appendChild(ln(70, 178, 500, 178, RULE));
    svg.appendChild(ln(70, 178, 70, 184, RULE));
    svg.appendChild(ln(310, 178, 310, 184, RULE));
    svg.appendChild(txt(70, 196, 't_received', MUTE));
    svg.appendChild(grow([rct(70, 30, 240, 24, 'none', BP, { 'fill-opacity': 0.2 })], 70, 30, D, 0.05, 0.38, undefined, true));
    svg.appendChild(show(txt(190, 46, '新鲜', INK, { 'font-size': 12, 'text-anchor': 'middle' }), D, 0.38));
    svg.appendChild(show(grp([
      rct(310, 30, 190, 24, 'none', MUTE, { 'fill-opacity': 0.16 }),
      txt(405, 46, '过期', INK, { 'font-size': 12, 'text-anchor': 'middle' }),
      txt(310, 72, 't_received + ttlMs', MUTE, MID)
    ]), D, 0.44));
    svg.appendChild(grow([rct(70, 154, 160, 24, 'none', BP, { 'fill-opacity': 0.2 })], 70, 154, D, 0.05, 0.28, undefined, true));
    svg.appendChild(show(txt(230, 124, 'list_changed 通知', MUTE, MID), D, 0.20));
    svg.appendChild(send([[230, 130], [230, 148]], D, 0.22, 0.28));
    svg.appendChild(show(txt(150, 170, '新鲜', INK, { 'font-size': 12, 'text-anchor': 'middle' }), D, 0.28));
    svg.appendChild(show(grp([rct(230, 154, 270, 24, 'none', MUTE, { 'fill-opacity': 0.16 }), txt(365, 170, '过期', INK, { 'font-size': 12, 'text-anchor': 'middle' })]), D, 0.28));
    svg.appendChild(show(grp([ln(310, 150, 310, 178, SOFT, DASH), txt(310, 196, '原 TTL 到期位置', MUTE, MID)]), D, 0.34));
    card(host, D, svg, '缓存新鲜度', 'TTL 到期时失效，相关通知可以使它提前失效',
      '两条时间线从相同 t_received 开始。场景 A 在 t_received 加 ttlMs 之前保持新鲜，随后过期；场景 B 提前收到 list_changed 通知，缓存立即过期，不再使用剩余 TTL。',
      '缓存通常在 ttlMs 到期前保持新鲜，但相关 list_changed 通知一到达就立即使它失效，即使尚有剩余时间。TTL 和变更通知互为补充。');
  }

  function taskStateLifecycleFigure(host) {
    var D = 8;
    var svg = stage(560, 260);
    var boxes = [
      [30, 24, 150, 44, 'input_required', false],
      [30, 188, 150, 44, 'working', false],
      [380, 20, 150, 40, 'completed', true],
      [380, 110, 150, 40, 'cancelled', true],
      [380, 200, 150, 40, 'failed', true]
    ];
    var i;
    var b;
    var cx;
    var cy;
    var e;
    for (i = 0; i < boxes.length; i++) {
      b = boxes[i];
      cx = b[0] + b[2] / 2;
      cy = b[1] + b[3] / 2;
      svg.appendChild(rct(b[0], b[1], b[2], b[3], SOFT, SURF, b[5] ? { 'stroke-dasharray': '4 2' } : null));
      svg.appendChild(txt(cx, cy + 4, b[4], INK, { 'font-size': 12, 'text-anchor': 'middle' }));
    }
    svg.appendChild(spot(boxes[1][0], boxes[1][1], boxes[1][2], boxes[1][3], D, 0.04, 0.10));
    var edges = [
      [6, 105, '需要输入', [[95, 185], [95, 71]], BP, 0.10, 0.20, 0],
      [132, 155, 'tasks/update', [[118, 71], [118, 185]], BP, 0.26, 0.36, 1],
      [250, 128, '工作完成', [[183, 193], [377, 42]], BP, 0.42, 0.54, 2],
      [250, 169, 'tasks/cancel', [[183, 210], [377, 130]], MUTE, 0.64, 0.72, -1],
      [250, 208, '协议错误', [[183, 227], [377, 218]], MUTE, 0.70, 0.78, -1]
    ];
    for (i = 0; i < edges.length; i++) {
      e = edges[i];
      svg.appendChild(show(txt(e[0], e[1], e[2], MUTE), D, e[5]));
      svg.appendChild(send(e[3], D, e[5], e[6], e[4]));
      if (e[7] >= 0) svg.appendChild(spot(boxes[e[7]][0], boxes[e[7]][1], boxes[e[7]][2], boxes[e[7]][3], D, e[6], e[6] + 0.06));
    }
    card(host, D, svg, '任务状态生命周期', 'working 可暂停为 input_required，经 tasks/update 恢复，最终进入终态',
      'MCP 任务状态图：服务器需要输入时，working 变为 input_required；tasks/update 提交答案后恢复 working。工作完成进入 completed，取消进入 cancelled，协议错误进入 failed；三个终态使用虚线边框。',
      'tasks/get 在终态前持续返回任务快照，图中省略重复轮询的自环。任务也可从 input_required 直接取消或失败。SEP-2663 将最终结果与错误内嵌到同一个 tasks/get 响应，不再单独调用 tasks/result。');
  }

  function trustZonesFigure(host) {
    var D = 7;
    var svg = stage(560, 230);
    svg.appendChild(txt(91, 18, '可信区域', MUTE, MID));
    svg.appendChild(txt(380, 18, '不可信区域', MUTE, MID));
    svg.appendChild(pth('M8 26L174 26L174 206L8 206Z', RULE, DASH));
    svg.appendChild(ln(190, 26, 190, 206, RULE, DASH));
    svg.appendChild(txt(196, 34, '信任边界', MUTE));
    svg.appendChild(box(20, 40, 140, 36, '宿主', '用户的应用'));
    svg.appendChild(box(20, 88, 140, 36, '客户端', '每台服务器一个'));
    svg.appendChild(box(230, 94, 110, 36, '服务器', '第三方'));
    svg.appendChild(box(390, 94, 140, 36, '上游系统', '间接访问'));
    svg.appendChild(box(20, 156, 140, 40, '模型', '读取带来源标记的数据'));
    svg.appendChild(pth('M190 90L206 108L190 126L174 108Z', BP, { fill: SURF, 'stroke-width': 2 }));
    svg.appendChild(txt(195, 142, '信任过滤', MUTE, MID));
    svg.appendChild(send([[90, 76], [90, 88]], D, 0.03, 0.13, BP));
    svg.appendChild(send([[160, 98], [230, 98]], D, 0.15, 0.25, BP));
    svg.appendChild(send([[340, 112], [390, 112]], D, 0.31, 0.41, MUTE, DASH));
    svg.appendChild(send([[230, 118], [160, 118]], D, 0.47, 0.75, MUTE, DASH, null));
    svg.appendChild(packet(route([[230, 118], [190, 118]]), D, 0.47, 0.59, MUTE));
    svg.appendChild(spot(174, 90, 32, 36, D, 0.59, 0.65, BP));
    svg.appendChild(packet(route([[190, 118], [160, 118]]), D, 0.63, 0.75, BP));
    svg.appendChild(send([[90, 124], [90, 156]], D, 0.77, 0.85, BP));
    svg.appendChild(spot(20, 156, 140, 40, D, 0.85, 0.89, BP));
    card(host, D, svg, 'MCP 交互中的信任区域', '宿主与客户端可信，服务器及上游默认不可信，模型读取带来源标记的内容',
      '左侧可信区域包含宿主、客户端和模型，以短箭头连接。虚线边界将它们与右侧服务器隔开。请求跨边界发送，响应返回时经过信任过滤并标注不可信，再进入模型。服务器可进一步调用客户端无法直接观察的上游。',
      '宿主及其客户端与模型位于同一信任域。请求跨虚线到达服务器；返回内容通过信任过滤器，在模型读取前标为不可信。服务器还可能访问客户端无法直接观察的上游系统。');
  }

  function oauthFlowFigure(host) {
    var D = 8;
    var svg = stage(560, 228);
    [
      [46, '1. tools/call 未带令牌', 'MCP 服务器', 'tools/call，未带 Authorization', MUTE, DASH, '401 + WWW-Authenticate: resource_metadata=...', ERR, false, 0.04],
      [122, '2. 发现、PKCE 与授权', '授权服务器', '资源与授权元数据 + S256 + resource + state', BP, null, '核对 code 与 iss，匹配已记录签发者', BP, false, 0.32],
      [198, '3. 携 bearer 令牌重试', 'MCP 服务器', 'tools/call, Authorization: Bearer <token>', BP, null, '200，resultType complete（受众已验证）', BP, true, 0.58]
    ].forEach(function (lane) {
      var y = lane[0];
      var a = lane[9];
      svg.appendChild(txt(16, y - 22, lane[1], INK, { 'font-size': 12, 'font-weight': 700 }));
      svg.appendChild(box(16, y - 12, 84, 24, '客户端'));
      svg.appendChild(box(460, y - 12, 84, 24, lane[2]));
      svg.appendChild(show(txt(280, y - 8, lane[3], SOFT, MID), D, a));
      svg.appendChild(send([[100, y], [460, y]], D, a, a + 0.09, lane[4], lane[5]));
      svg.appendChild(show(txt(280, y + 14, lane[6], lane[7], MID), D, a + 0.11));
      svg.appendChild(packet(route([[460, y], [100, y]]), D, a + 0.11, a + 0.2, lane[7]));
      if (lane[8]) svg.appendChild(spot(458, y - 14, 88, 28, D, a + 0.2, a + 0.26, BP));
    });
    card(host, D, svg, 'MCP 请求授权', '收到 401 后访问授权服务器，再携 bearer 令牌重试',
      '三条通道：上方无令牌 tools/call 被 HTTP 401 拒绝，WWW-Authenticate 指出资源元数据地址，无 JSON-RPC 正文。中间发现资源和授权服务器元数据，生成 PKCE S256，并核对返回的授权码与 iss。下方携带 bearer 令牌重试，受众验证通过后返回 complete。',
      '拒绝发生在 HTTP 层，没有 JSON-RPC 正文。中间的资源元数据、授权服务器发现、PKCE 与 iss 检查都在 MCP 报文之外完成。只有携带面向本服务器有效令牌的重试，才会到达工具处理器。');
  }

  function registrationPathsFigure(host) {
    var D = 8;
    var svg = stage(560, 300);
    var steps = [
      ['1', '预注册凭据', '已有保存的 client id', false],
      ['2', '客户端 ID 元数据文档', '授权服务器声明支持 CIMD', false],
      ['3', '动态客户端注册', '已弃用的 DCR 回退', true],
      ['4', '询问用户', '没有可用自动注册路径', false]
    ];
    var rowH = 54, gapY = 16, top = 18, colX = 8, colW = 300, midX = colX + colW / 2;
    var seq = [0.04, 0.2, 0.36, 0.52];
    steps.forEach(function (step, i) {
      var y = top + i * (rowH + gapY);
      svg.appendChild(rct(colX, y, colW, rowH, step[3] ? MUTE : BP, SURF, step[3] ? DASH : { 'stroke-width': 1.4 }));
      svg.appendChild(txt(colX + 12, y + 22, step[0], BP, { 'font-size': 13, 'font-weight': 700 }));
      svg.appendChild(txt(colX + 30, y + 22, step[1], INK, BOLD));
      svg.appendChild(txt(colX + 30, y + 39, step[2], MUTE));
      svg.appendChild(spot(colX, y, colW, rowH, D, seq[i], seq[i] + 0.07, step[3] ? MUTE : BP));
      if (i < 3) {
        var y1 = y + rowH;
        var y2 = y1 + gapY - 4;
        var a = seq[i] + 0.08;
        svg.appendChild(send([[midX, y1], [midX, y2]], D, a, seq[i + 1] - 0.02, MUTE));
        svg.appendChild(show(txt(midX + 10, y1 + gapY / 2 + 4, '不可用时', SOFT), D, a));
      }
    });
    var panelX = colX + colW + 18;
    var panelW = 560 - panelX - 8;
    var panelH = steps.length * (rowH + gapY) - gapY;
    svg.appendChild(rct(panelX, top, panelW, panelH, RULE, SURF));
    svg.appendChild(txt(panelX + 12, top + 22, 'CIMD 检查项', INK, BOLD));
    var checklist = ['client_id 与 URL 相同', 'HTTPS 且包含路径', '校验 redirect_uris', '按 issuer 保存'];
    checklist.forEach(function (item, i) {
      var cy = top + 46 + i * 46;
      var a = 0.6 + i * 0.06;
      svg.appendChild(pop([svgEl('circle', { cx: panelX + 18, cy: cy, r: 5, fill: BP }), txt(panelX + 32, cy + 4, item, MUTE)], panelX + 18, cy, D, a));
    });
    card(host, D, svg, '客户端注册路径', '客户端与授权服务器尚无既有关系时，按优先级选择',
      '四层优先级：预注册凭据、客户端 ID 元数据文档、标为已弃用的动态客户端注册，以及询问用户。只有上层不可用时才尝试下一层。右侧列出 CIMD 校验内容，以及凭据按签发者保存的原则。',
      '客户端依次尝试并采用首个可用路径：预注册信息、授权服务器声明支持的 CIMD、已弃用 DCR 回退，最后询问用户。凭据按签发它们的授权服务器保存，不能向其他签发者复用。');
  }

  function consentGatesFigure(host) {
    var D = 7;
    var svg = stage(560, 210);
    var loop1 = 'M172 80 C150 132 245 132 222 80';
    var loop2 = 'M334 80 C310 132 410 132 386 80';
    svg.appendChild(grp([rct(8, 40, 96, 40), txt(14, 57, 'tools/call'), txt(14, 72, '客户端发送', MUTE)]));
    svg.appendChild(box(140, 40, 112, 40, '权限检查', '不足返回 403'));
    svg.appendChild(box(304, 40, 112, 40, '同意检查', 'input_required'));
    svg.appendChild(pth(loop1, MUTE, DASH));
    svg.appendChild(pth(loop2, MUTE, DASH));
    svg.appendChild(send([[104, 60], [138, 60]], D, 0.03, 0.11, BP));
    svg.appendChild(spot(140, 40, 112, 40, D, 0.13, 0.2, BP));
    svg.appendChild(show(txt(137, 150, '403：取并集后重试', SOFT), D, 0.22));
    svg.appendChild(packet(loop1, D, 0.22, 0.34, MUTE));
    svg.appendChild(send([[252, 60], [302, 60]], D, 0.37, 0.45, BP));
    svg.appendChild(show(txt(278, 32, '权限满足', SOFT, { 'text-anchor': 'middle' }), D, 0.37));
    svg.appendChild(spot(304, 40, 112, 40, D, 0.47, 0.54, BP));
    svg.appendChild(show(txt(273, 150, '未同意：征询后重试', SOFT), D, 0.57));
    svg.appendChild(packet(loop2, D, 0.57, 0.69, MUTE));
    svg.appendChild(send([[416, 60], [438, 60]], D, 0.71, 0.79, BP));
    svg.appendChild(show(txt(428, 32, '已同意', SOFT, { 'text-anchor': 'middle' }), D, 0.71));
    svg.appendChild(pop([box(440, 40, 104, 40, '执行工具', 'isError: false')], 492, 60, D, 0.8));
    card(host, D, svg, '同意授权与最小权限', '一次 tools/call 在执行前经过两道独立门禁',
      'tools/call 首先接受权限范围检查。不足时返回 HTTP 403，客户端取已有与新要求范围的并集后重试。权限满足后再检查同意；需要批准时返回 input_required，收集用户答案后重试，最终才执行工具。',
      '先检查权限范围：不足时返回 HTTP 403，客户端对已有及新增要求取并集，并在有界次数内重新授权。通过后再检查用户同意，需要批准的调用通过 input_required 与信息征询往返完成。两道门禁都能独立阻止操作。');
  }

  function attackSurfaceFigure(host) {
    var D = 8;
    var svg = stage(560, 300);
    var threats = ['描述投毒', '获批后篡改', '工具遮蔽', '令牌透传', 'requestState 篡改', '网络 $ref（SSRF）', 'DNS 重绑定', '供应链漂移'];
    var cx = 280, cy = 150, r = 128;
    var spokes = threats.map(function (label, i) {
      var angle = (Math.PI * 2 * i) / threats.length - Math.PI / 2;
      var p = [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
      svg.appendChild(ln(cx, cy, p[0], p[1], MUTE, { 'stroke-width': 1 }));
      return p;
    });
    var ring = svgEl('circle', { cx: cx, cy: cy, r: 62, fill: 'none', stroke: BP, 'stroke-width': 2 });
    ring.appendChild(anim('opacity', '0.15;0.45;0.15', D));
    svg.appendChild(ring);
    svg.appendChild(svgEl('circle', { cx: cx, cy: cy, r: 56, fill: BG, stroke: BP, 'stroke-width': 1.6 }));
    svg.appendChild(txt(cx, cy - 4, '网关', INK, { 'text-anchor': 'middle', 'font-weight': 600 }));
    svg.appendChild(txt(cx, cy + 12, '固定 · 扫描 · 限制', SOFT, { 'text-anchor': 'middle', 'font-size': 10 }));
    threats.forEach(function (label, i) {
      var p = spokes[i];
      var a = 0.04 + i * 0.075;
      svg.appendChild(packet(route([p, [cx + 56 * (p[0] - cx) / r, cy + 56 * (p[1] - cy) / r]]), D, a + 0.05, a + 0.13, MUTE));
      svg.appendChild(pop([rct(p[0] - 70, p[1] - 12, 140, 24, RULE, SURF, { rx: 3 }), txt(p[0] - 60, p[1] + 4, label, INK, { 'font-size': 10 })], p[0], p[1], D, a));
    });
    svg.appendChild(spot(cx - 64, cy - 64, 128, 128, D, 0.68, 0.78, BP, { rx: 64 }));
    card(host, D, svg, '工具调用周围的攻击面', '即使同意门禁与 OAuth 正确，网关仍需应对八类威胁',
      '网关位于中心，周围八个节点分别表示投毒描述、获批后篡改、工具遮蔽、令牌透传、requestState 篡改、网络引用 SSRF、DNS 重绑定和供应链漂移，各自以连线连接中心。',
      '各连线代表一种威胁。对应控制包括定义固定与隔离、注入扫描、服务器限定名称、令牌受众与独立上游凭据、状态完整性保护、受限网络引用获取和供应链准入固定。需要叠加控制，不能要求单一机制识别所有问题。');
  }

  function tracePropagationFigure(host) {
    var D = 7;
    var svg = stage(560, 170);
    [[8, '客户端'], [234, 'ops-desk'], [460, 'cred-vault']].forEach(function (b) {
      svg.appendChild(grp([rct(b[0], 20, 92, 34), txt(b[0] + 46, 41, b[1], INK, MID)]));
    });
    svg.appendChild(txt(280, 104, '独立审计日志', MUTE, MID));
    svg.appendChild(txt(506, 104, '独立审计日志', MUTE, MID));
    svg.appendChild(send([[100, 37], [234, 37]], D, 0.03, 0.12, BP));
    svg.appendChild(show(txt(167, 64, '追踪 a1e4c9d0', MUTE, MID), D, 0.14));
    svg.appendChild(show(txt(167, 78, '跨度 5f2b8e13', MUTE, MID), D, 0.14));
    svg.appendChild(send([[326, 37], [460, 37]], D, 0.24, 0.33, BP));
    svg.appendChild(show(txt(393, 64, '追踪 a1e4c9d0', MUTE, MID), D, 0.35));
    svg.appendChild(show(txt(393, 78, '跨度 d40a7c66', MUTE, MID), D, 0.35));
    var chainX = [[245, 471], [273, 499], [301, 527]];
    chainX.forEach(function (pair, k) {
      var a = 0.48 + k * 0.08;
      svg.appendChild(pop([rct(pair[0], 112, 14, 14, BP, SURF, { rx: 2 })], pair[0] + 7, 119, D, a));
      svg.appendChild(pop([rct(pair[1], 112, 14, 14, BP, SURF, { rx: 2 })], pair[1] + 7, 119, D, a));
      if (k > 0) {
        svg.appendChild(show(ln(chainX[k - 1][0] + 14, 119, pair[0], 119, BP), D, a));
        svg.appendChild(show(ln(chainX[k - 1][1] + 14, 119, pair[1], 119, BP), D, a));
      }
    });
    svg.appendChild(show(txt(393, 152, '共享追踪 ID，各自维护哈希链', MUTE, MID), D, 0.74));
    card(host, D, svg, '追踪传播与审计链', '同一追踪 ID，三个程序，两份独立日志',
      '客户端调用 ops-desk，再由其调用 credential-vault。两跳共享追踪 ID，跨度 ID 分别生成。两台服务器下方的三条目哈希链表示各自独立维护审计日志。',
      '追踪 ID 贯穿两跳，每跳使用新的跨度 ID。ops-desk 与 credential-vault 各自保存独立哈希链，不读写对方条目；共享追踪 ID 将两份日志关联，请求 ID 无须相同。整链防重写仍需外部可信检查点。');
  }

  function rolesMapFigure(host) {
    var D = 7;
    var svg = stage(560, 200);
    var panels = [
      ['stdio', 8, [['作者：发现', false], ['运营：环境凭据', true], ['用户：可拒绝调用', false]]],
      ['HTTP，无网关', 196, [['作者：PRM、Origin', true], ['客户端：RFC 8707', false], ['治理：令牌', false]]],
      ['网关前置', 384, [['运营：Origin', true], ['作者：保留 PRM', false], ['治理：令牌', false]]]
    ];
    var pw = 168, hh = 26, rh = 34, top = 30, bh = hh + 3 * rh + 10;
    var pulses = [];
    panels.forEach(function (panel, i) {
      var x = panel[1];
      var kids = [rct(x, top, pw, bh), rct(x, top, pw, hh, RULE, 'none'), txt(x + 9, top + 17, panel[0], INK, BOLD)];
      panel[2].forEach(function (row, j) {
        var ry = top + hh + 14 + j * rh;
        var col = row[1] ? ERR : BP;
        kids.push(svgEl('circle', { cx: x + 13, cy: ry, r: 6, fill: col }));
        if (row[1]) kids.push(txt(x + 13, ry + 4, '!', '#fff', { 'font-size': 9, 'font-weight': 700, 'text-anchor': 'middle' }));
        kids.push(txt(x + 26, ry + 4, row[0], MUTE));
        if (row[1] && i > 0) pulses.push([x + 4, ry - 14, pw - 8, 28]);
      });
      svg.appendChild(pop(kids, x + pw / 2, top + bh / 2, D, 0.04 + i * 0.12));
    });
    pulses.forEach(function (p, i) {
      svg.appendChild(spot(p[0], p[1], p[2], p[3], D, 0.4 + i * 0.14, 0.5 + i * 0.14, ERR));
    });
    svg.appendChild(show(txt(8, 188, '圆点标示负责角色；感叹号所在行的负责人随部署改变', SOFT), D, 0.76));
    card(host, D, svg, '角色责任图', '同一 MUST，三种部署，不同负责人',
      '三个面板分别为 stdio、无网关的直接 HTTP 和网关前置部署。各面板展示相应要求的负责角色。Origin 校验在直接 HTTP 下由服务器作者承担，前置网关后转给首先终止连接的平台或网关运营者。',
      '部署方式改变由谁承担 MUST，要求本身仍然适用。每个 HTTP 可访问部署都需要 Origin 校验：直接 HTTP 由服务器作者负责，网关前置时由首先终止连接的平台或网关运营者负责。');
  }

  function useCaseMatrixFigure(host) {
    var D = 7;
    var svg = stage(560, 254);
    var header = ['用例', '原语', '传输', '扩展'];
    var rows = [
      ['开发工具', '工具', 'stdio', '无'],
      ['数据访问', '资源', 'http', '无'],
      ['长任务', '工具', 'http', 'tasks'],
      ['交互 UI', '工具', 'http', 'ui'],
      ['可复用流程', '提示词', 'http', 'skills'],
      ['机器间同步', '工具', 'http', 'auth-cc']
    ];
    var colX = [8, 168, 296, 424];
    var rowH = 28, headerH = 28, top = 20;
    var gridH = headerH + rows.length * rowH;
    svg.appendChild(rct(8, top, 544, gridH));
    svg.appendChild(rct(8, top, 544, headerH, 'none', BP, { 'fill-opacity': 0.12 }));
    header.forEach(function (h, c) { svg.appendChild(txt(colX[c] + 8, top + 18, h, INK, BOLD)); });
    colX.forEach(function (x, c) { if (c) svg.appendChild(ln(x, top, x, top + gridH, RULE)); });
    rows.forEach(function (row, i) {
      var rowY = top + headerH + i * rowH;
      var a = 0.06 + i * 0.12;
      svg.appendChild(spot(8, rowY, 544, rowH, D, a, a + 0.1));
      var kids = [];
      if (i % 2 === 1) kids.push(rct(8, rowY, 544, rowH, 'none', SOFT, { 'fill-opacity': 0.06 }));
      row.forEach(function (cell, c) { kids.push(txt(colX[c] + 8, rowY + 19, cell, c === 0 ? INK : MUTE)); });
      svg.appendChild(show(grp(kids), D, a));
    });
    svg.appendChild(show(grp([txt(8, 234, 'http 代表 streamable-http；', SOFT), txt(8, 248, 'auth-cc 代表 OAuth 客户端凭据扩展', SOFT)]), D, 0.82));
    card(host, D, svg, '实际用例矩阵', '六个场景，各回答四个问题',
      '六类用例按原语、传输和扩展列出推荐方案：开发工具采用 stdio 工具；数据访问采用 HTTP 资源；长任务采用 tasks；交互界面采用 MCP Apps ui；可复用流程采用提示词与 skills；机器间同步采用 OAuth 客户端凭据扩展。',
      '谁发起调用、数据多敏感、执行多久、是否需要交互界面，这四个问题共同决定原语、传输、授权路径和扩展。表中 HTTP 代表 Streamable HTTP，auth-cc 代表客户端凭据授权扩展。');
  }

  function extensionNegotiationFigure(host) {
    var D = 8;
    var svg = stage(560, 248);
    svg.appendChild(txt(16, 26, '客户端 _meta 声明', INK, { 'font-size': 12, 'font-weight': 700 }));
    svg.appendChild(txt(304, 26, '服务器 capabilities 声明', INK, { 'font-size': 12, 'font-weight': 700 }));
    svg.appendChild(rct(16, 34, 240, 70, RULE, 'none'));
    svg.appendChild(rct(304, 34, 240, 70, RULE, 'none'));
    var chips = [
      [26, 44, 'io.modelcontextprotocol/ui'],
      [26, 70, 'com.example/priority-routing'],
      [314, 44, 'com.example/priority-routing'],
      [314, 70, 'io.modelcontextprotocol/tasks']
    ];
    chips.forEach(function (ch, i) {
      var kids = [rct(ch[0], ch[1], 220, 20, RULE, SURF, { rx: 3 }), txt(ch[0] + 6, ch[1] + 14, ch[2])];
      svg.appendChild(pop(kids, ch[0] + 110, ch[1] + 10, D, 0.03 + i * 0.045));
    });
    svg.appendChild(spot(24, 68, 224, 24, D, 0.24, 0.34));
    svg.appendChild(spot(312, 42, 224, 24, D, 0.27, 0.37));
    svg.appendChild(send([[136, 104], [270, 132]], D, 0.4, 0.5));
    svg.appendChild(send([[424, 104], [290, 132]], D, 0.44, 0.54));
    svg.appendChild(pop([rct(150, 132, 260, 28, BP, SURF, { 'stroke-width': 1.4 }), txt(160, 150, '启用：com.example/priority-routing')], 280, 146, D, 0.56));
    svg.appendChild(send([[136, 64], [96, 118]], D, 0.65, 0.69, MUTE, DASH, null));
    svg.appendChild(send([[424, 90], [464, 118]], D, 0.68, 0.72, MUTE, DASH, null));
    var legend = [
      [BP, 'none', null, 176, '双方声明可选扩展：启用增强行为'],
      [SURF, MUTE, DASH, 198, '仅一侧声明：回退核心行为'],
      [INK, 'none', null, 220, '必需扩展未共同启用：拒绝，-32021']
    ];
    legend.forEach(function (le, i) {
      var sw = rct(16, le[3], 12, 12, le[1], le[0], le[2]);
      svg.appendChild(show(grp([sw, txt(36, le[3] + 10, le[4], SOFT)]), D, 0.73 + i * 0.03));
    });
    card(host, D, svg, '扩展框架', '每请求协商，再决定启用、回退或拒绝',
      '左框为客户端当前 clientCapabilities.extensions 声明，右框为服务器发现结果的 capabilities.extensions。双方共有的标识汇入有效集合；仅一侧声明的标识不启用。可选扩展匹配则增强，不匹配则回退；必需扩展缺失则返回 -32021。',
      '客户端通过每个请求的 _meta 中 clientCapabilities.extensions 声明扩展，服务器通过 server/discover 的 capabilities.extensions 公布支持。只有双方同名支持才启用；可选项不匹配则回退核心，必需项缺失则以 -32021 指出所需能力。');
  }

  function appSandboxFigure(host) {
    var D = 9;
    var svg = stage(560, 260);
    svg.appendChild(txt(10, 16, '逐请求协商 UI 扩展，渲染前审阅资源', MUTE));
    svg.appendChild(box(8, 92, 84, 56, '服务器', '工具 + UI'));
    svg.appendChild(box(126, 92, 104, 56, '审阅', 'MIME + CSP'));
    svg.appendChild(box(426, 92, 110, 56, '同意', '工具调用'));
    svg.appendChild(send([[92, 120], [126, 120]], D, 0.03, 0.11));
    svg.appendChild(show(txt(40, 84, 'resources/read', MUTE), D, 0.03));
    svg.appendChild(spot(124, 90, 108, 60, D, 0.11, 0.18));
    svg.appendChild(send([[230, 120], [270, 120]], D, 0.2, 0.28));
    svg.appendChild(show(txt(200, 84, '审阅通过', MUTE), D, 0.2));
    svg.appendChild(pop([box(270, 92, 120, 56, '应用视图', '沙箱内')], 330, 120, D, 0.28));
    svg.appendChild(send([[390, 120], [426, 120]], D, 0.37, 0.45));
    svg.appendChild(show(txt(355, 84, '应用请求调用', MUTE), D, 0.37));
    svg.appendChild(spot(424, 90, 114, 60, D, 0.45, 0.52));
    svg.appendChild(send([[481, 148], [481, 240], [50, 240], [50, 148]], D, 0.55, 0.66));
    svg.appendChild(show(txt(250, 232, 'tools/call，新 ID', MUTE), D, 0.55));
    svg.appendChild(send([[178, 148], [178, 190]], D, 0.69, 0.76, MUTE));
    svg.appendChild(show(txt(186, 172, '拒绝', MUTE), D, 0.69));
    svg.appendChild(pop([rct(128, 190, 100, 38, BP, SURF, DASH), txt(136, 206, '文本回退'), txt(136, 220, '无 UI 扩展', MUTE)], 178, 209, D, 0.76));
    card(host, D, svg, '渲染交互界面', '先协商和审阅，再渲染或回退',
      '工具的 UI 资源从服务器进入宿主的 MIME 和 CSP 域审阅。通过后在沙箱 iframe 渲染，应用继续请求工具调用时经过同意门禁；未声明扩展或审阅失败则回退文本。',
      '宿主核对 MIME，并将 CSP 域与自身允许列表比较，之后才把 ui:// 资源作为沙箱应用加载。检查失败或未声明扩展时回退普通文本。应用发起的工具调用还须满足可见性与同意要求，再作为普通 tools/call 送达服务器。');
  }

  function registryGatewayFigure(host) {
    var D = 8;
    var svg = stage(560, 320);
    function stat(b) { svg.appendChild(box(b[0], b[1], b[2], b[3], b[4], b[5], BP, SURF)); }
    [[30, 20, 120, 44, '发布者', '证明所有权'], [200, 20, 150, 44, '注册目录', 'server.json'], [420, 20, 120, 44, '聚合器', '按小时轮询'],
      [30, 104, 110, 44, '客户端', '调用方'], [190, 104, 170, 44, '网关', '头部 = 正文？'], [410, 104, 120, 44, '后端', 'Tier 1 SDK']].forEach(stat);
    svg.appendChild(txt(30, 78, '固定资料：公开条目，目录处于预览阶段', SOFT));
    svg.appendChild(txt(30, 246, 'SDK 符合性等级：持续检查', SOFT));
    svg.appendChild(send([[150, 42], [200, 42]], D, 0.03, 0.09, MUTE));
    svg.appendChild(show(txt(148, 14, '已核验', SOFT), D, 0.03));
    svg.appendChild(send([[350, 42], [420, 42]], D, 0.11, 0.17, MUTE));
    svg.appendChild(show(txt(358, 14, '已获取', SOFT), D, 0.11));
    svg.appendChild(send([[140, 126], [190, 126]], D, 0.22, 0.28, MUTE));
    svg.appendChild(spot(188, 102, 174, 48, D, 0.28, 0.34));
    svg.appendChild(send([[360, 126], [410, 126]], D, 0.36, 0.42));
    svg.appendChild(show(txt(370, 118, '匹配', SOFT), D, 0.36));
    svg.appendChild(send([[140, 126], [190, 126]], D, 0.47, 0.53, MUTE));
    svg.appendChild(send([[275, 148], [275, 180]], D, 0.55, 0.61, ERR));
    svg.appendChild(show(txt(283, 172, '不匹配', SOFT), D, 0.55));
    svg.appendChild(pop([rct(190, 180, 170, 40, MUTE, SURF, DASH), txt(200, 198, '-32020', INK, BOLD), txt(200, 214, '头部与正文不符', MUTE)], 275, 200, D, 0.61));
    [[30, 'Tier 1', '100% 符合性'], [210, 'Tier 2', '80% 符合性'], [390, 'Tier 3', '实验性']].forEach(function (t, i) {
      svg.appendChild(pop([rct(t[0], 256, 160, 46), txt(t[0] + 10, 274, t[1], BP, BOLD), txt(t[0] + 10, 290, t[2], MUTE)], t[0] + 80, 279, D, 0.68 + i * 0.05));
    });
    card(host, D, svg, '发现、路由与判断服务器', '目录准入、网关头部检查、SDK 等级分别判断',
      '发布者先证明命名空间所有权，目录才接纳 server.json，再由聚合器按节奏读取。另一路径中，网关核对 Mcp-Method、Mcp-Name 与正文，一致才访问后端，不一致在进入后端前返回 -32020。下方列出持续测量的三个 SDK 符合性等级。',
      '验证命名空间使 server.json 可以进入目录，但不保证每个请求都获准访问后端。网关独立核对请求头与正文，匹配后路由，不匹配则返回 -32020。SDK 等级又是独立的实现覆盖与维护信号，需要持续测量。');
  }

  function capstoneFlowFigure(host) {
    var D = 8;
    var svg = stage(560, 176);
    var stages = [[4, 84, '发现'], [96, 108, '模式检查'], [212, 116, 'MRTR 同意'], [336, 92, '任务轮询'], [436, 120, '可审查结果']];
    svg.appendChild(txt(4, 84, 'traceparent：同一追踪 ID 贯穿全程', MUTE));
    svg.appendChild(pth('M4 90L556 90', MUTE, DASH));
    svg.appendChild(packet(route([[4, 50], [556, 50]]), D, 0.03, 0.4));
    var arrivals = [0.058, 0.128, 0.208, 0.283, 0.36];
    stages.forEach(function (s, i) {
      svg.appendChild(rct(s[0], 28, s[1], 44));
      svg.appendChild(txt(s[0] + 8, 54, s[2]));
      if (i) svg.appendChild(arrow([[stages[i - 1][0] + stages[i - 1][1], 50], [s[0], 50]]));
      var cx = s[0] + s[1] / 2;
      svg.appendChild(spot(s[0] - 2, 26, s[1] + 4, 48, D, arrivals[i], arrivals[i] + 0.06));
      svg.appendChild(pop([svgEl('circle', { cx: cx, cy: 90, r: 3, fill: BP })], cx, 90, D, arrivals[i]));
    });
    svg.appendChild(txt(4, 153, '审计日志：', MUTE));
    var entries = [76, 118, 160, 202];
    entries.forEach(function (e, i) {
      if (i) svg.appendChild(show(arrow([[entries[i - 1] + 30, 149], [e, 149]]), D, 0.44 + i * 0.07));
      svg.appendChild(pop([rct(e, 134, 30, 30, BP, SURF, { rx: 3 }), txt(e + 8, 153, 'e' + (i + 1))], e + 15, 149, D, 0.44 + i * 0.07, 0.44 + i * 0.07 + 0.06));
    });
    svg.appendChild(show(txt(240, 153, '校验：通过', MUTE), D, 0.72));
    svg.appendChild(pop([rct(330, 134, 226, 30, MUTE, 'none', DASH), txt(338, 153, 'OAuth：受众已检查')], 443, 149, D, 0.78));
    card(host, D, svg, '综合实训交互', '从发现、同意和任务，到可审查的结果',
      '一次综合交互经服务器发现、模式检查、MRTR 同意往返和任务轮询得到结果。下方虚线表示追踪 ID 跨阶段传播，四条目审计哈希链进行内部验证，独立 OAuth 受众检查约束其中一次 HTTP 调用。',
      '一次模拟事故响应汇入多个领域：带缓存提示的发现，先返回 isError 的模式检查，HMAC 保护 requestState 的 MRTR 同意，以及任务轮询结果。共享追踪 ID 串联各跳，HTTP 调用检查 OAuth 受众，审计链记录部分决策并接受内部完整性检查；这些都不代替真实部署验收。');
  }

  LF.register({
    'mcpa-00-blueprint-weights': blueprintWeightsFigure,
    'mcpa-01-spec-map': specMapFigure,
    'mcpa-02-n-by-m': nByMFigure,
    'mcpa-03-envelope': envelopeFigure,
    'mcpa-04-stateless-requests': statelessRequestsFigure,
    'mcpa-05-era-matrix': eraMatrixFigure,
    'mcpa-06-topology': topologyFigure,
    'mcpa-07-discover': discoverCapabilityFigure,
    'mcpa-08-schema-contract': schemaContractFigure,
    'mcpa-09-manifest-anatomy': manifestAnatomyFigure,
    'mcpa-10-interaction-flow': modelInteractionFlowFigure,
    'mcpa-11-tool-call': toolCallFigure,
    'mcpa-12-resource-read': resourceReadFigure,
    'mcpa-13-prompt-template': promptTemplateFigure,
    'mcpa-14-mrtr': mrtrFigure,
    'mcpa-15-deprecation-timeline': deprecationTimelineFigure,
    'mcpa-16-subscription-stream': subscriptionStreamFigure,
    'mcpa-17-lifecycle': toolLifecycleFigure,
    'mcpa-18-error-taxonomy': errorTaxonomyFigure,
    'mcpa-19-transports': transportsFigure,
    'mcpa-20-cache-freshness': cacheFreshnessFigure,
    'mcpa-21-task-states': taskStateLifecycleFigure,
    'mcpa-22-trust-zones': trustZonesFigure,
    'mcpa-23-oauth-flow': oauthFlowFigure,
    'mcpa-24-registration-paths': registrationPathsFigure,
    'mcpa-25-consent-gates': consentGatesFigure,
    'mcpa-26-attack-surface': attackSurfaceFigure,
    'mcpa-27-trace-propagation': tracePropagationFigure,
    'mcpa-28-roles-map': rolesMapFigure,
    'mcpa-29-use-case-matrix': useCaseMatrixFigure,
    'mcpa-30-extension-negotiation': extensionNegotiationFigure,
    'mcpa-31-app-sandbox': appSandboxFigure,
    'mcpa-32-registry-flow': registryGatewayFigure,
    'mcpa-33-capstone-flow': capstoneFlowFigure
  });
})();
