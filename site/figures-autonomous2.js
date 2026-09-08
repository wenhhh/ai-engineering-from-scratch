/* figures-autonomous2.js - 阶段 15 自主系统（Autonomous systems）的动画课程图表。
   在 lesson-figures.js 之后加载，通过 window.LF 注册。
   无依赖，仅使用 ES5，主题由 CSS 变量控制。每张图都是独立的动画
   SVG（SMIL：animate / animateTransform / animateMotion / stroke-dashoffset）。
   编写方式：使用一个以以下某个组件名称为内容的 ```figure 块。 */
(function () {
  'use strict';
  var LF = window.LF;
  if (!LF) { return; }
  var el = LF.el, svgEl = LF.svgEl;

  var BP = 'var(--blueprint,#3553ff)';
  var INK = 'var(--ink,#1a1a1a)';
  var SOFT = 'var(--ink-soft,#555)';
  var MUTE = 'var(--ink-mute,#777)';
  var RULE = 'var(--rule-soft,#ddd)';
  var WARN = 'var(--warn,#b8870f)';
  var SURF = 'var(--bg-surface,#eee)';
  var BG = 'var(--bg,#fafaf5)';

  function txt(x, y, s, opts) {
    opts = opts || {};
    var t = svgEl('text', {
      x: x, y: y, 'text-anchor': opts.anchor || 'middle',
      'font-family': opts.mono ? 'var(--font-mono,monospace)' : 'var(--font-body,serif)',
      'font-size': opts.size || '11', fill: opts.fill || INK
    });
    if (opts.spacing) t.setAttribute('letter-spacing', '0');
    t.appendChild(document.createTextNode(s));
    return t;
  }
  function anim(attr, opts) {
    var a = svgEl('animate', { attributeName: attr, repeatCount: 'indefinite' });
    for (var k in opts) if (opts.hasOwnProperty(k)) a.setAttribute(k, opts[k]);
    return a;
  }
  function shell(host, label, sub, svg, caption) {
    host.appendChild(el('div', { class: 'lf' }, [
      el('div', { class: 'lf-head' }, [el('span', { class: 'lf-label' }, [label]), el('span', {}, [sub])]),
      el('div', { class: 'lf-body' }, [el('div', { class: 'lf-out', style: 'border-top:none;margin-top:0;padding-top:4px' }, [svg])]),
      el('div', { class: 'lf-cap' }, [caption])
    ]));
  }
  function newSvg(h) { return svgEl('svg', { viewBox: '0 0 520 ' + h }); }

  // ── alphaevolve-loop: 提议 → 评估 → 保留，循环螺旋推进，持续扩充
  //    程序数据库（Program database）。（阶段 15 · 03）──
  function alphaevolveLoop(host) {
    var svg = newSvg(250);
    var cx = 160, cy = 125;
    var ringStops = [[300, '提案'], [60, '评估'], [180, '保留']];
    var i;
    // 淡色向外螺旋，表示代际（Generations）累积
    var sp = 'M ' + cx + ' ' + cy + ' ';
    for (i = 0; i <= 220; i++) {
      var th = i / 220 * Math.PI * 6, rr = i / 220 * 78;
      sp += 'L ' + (cx + rr * Math.cos(th)).toFixed(1) + ' ' + (cy + rr * Math.sin(th)).toFixed(1) + ' ';
    }
    var spiral = svgEl('path', { d: sp, fill: 'none', stroke: RULE, 'stroke-width': '1', 'stroke-dasharray': '420 420', 'stroke-dashoffset': '420' });
    spiral.appendChild(anim('stroke-dashoffset', { from: '420', to: '0', dur: '5s' }));
    svg.appendChild(spiral);
    // 环上的三个阶段
    var R = 78;
    for (i = 0; i < 3; i++) {
      var ang = (i / 3 * 2 - 0.5) * Math.PI;
      var x = cx + R * Math.cos(ang), y = cy + R * Math.sin(ang);
      svg.appendChild(svgEl('circle', { cx: x, cy: y, r: '24', fill: SURF, stroke: BP, 'stroke-width': '1.5' }));
      svg.appendChild(txt(x, y + 4, ringStops[i][1], { mono: true, size: '10', fill: BP }));
    }
    // 一个候选词元（Token）沿循环轨道运动
    var orbit = 'M ' + (cx + R) + ' ' + cy + ' A ' + R + ' ' + R + ' 0 1 1 ' + (cx + R) + ' ' + (cy - 0.1) + ' Z';
    svg.appendChild(svgEl('path', { id: 'ae-orbit', d: orbit, fill: 'none', stroke: 'none' }));
    var dot = svgEl('circle', { r: '6', fill: WARN });
    var m = svgEl('animateMotion', { dur: '3s', repeatCount: 'indefinite', rotate: 'auto' });
    m.appendChild(svgEl('mpath', { href: '#ae-orbit' }));
    dot.appendChild(m);
    svg.appendChild(dot);
    // 右侧不断增长的数据库列
    var bx = 380;
    for (i = 0; i < 6; i++) {
      var r = svgEl('rect', { x: bx, y: 200 - i * 28, width: 110, height: 22, rx: '3', fill: i === 0 ? BP : SURF, stroke: RULE, 'stroke-width': '1', opacity: '0' });
      r.appendChild(anim('opacity', { values: '0;1;1', dur: '6s', begin: (i * 0.7) + 's', keyTimes: '0;0.1;1' }));
      svg.appendChild(r);
      svg.appendChild(txt(bx + 55, 200 - i * 28 + 15, '得分 ' + (95 - i * 7), { mono: true, size: '9', fill: i === 0 ? BG : SOFT }));
    }
    svg.appendChild(txt(435, 36, '程序数据库', { mono: true, size: '9', fill: MUTE, spacing: '0' }));
    shell(host, 'AlphaEvolve 循环（Loop）', '提案 · 评估 · 保留',
      svg,
      '大语言模型（Large Language Model，LLM）提出有针对性的修改，可由机器验证的评估器（Evaluator）为其打分，高分变体被保留为下一代的父代。程序数据库不断积累更好的变体，图中的循环随之向外扩展。效果提升依赖评估器的严谨程度，而非循环结构有多巧妙。');
  }

  // ── dgm-archive: 自修改智能体（Self-modifying agents）的谱系不断扩展，分支
  //    向前绘出，评分上升。（阶段 15 · 04）──
  function dgmArchive(host) {
    var svg = newSvg(250);
    var nodes = [
      { x: 40, y: 125, s: 20 }, { x: 150, y: 80, s: 31 }, { x: 150, y: 175, s: 28 },
      { x: 270, y: 55, s: 42 }, { x: 270, y: 120, s: 36 }, { x: 270, y: 200, s: 33 },
      { x: 400, y: 90, s: 50 }, { x: 400, y: 175, s: 44 }
    ];
    var edges = [[0, 1], [0, 2], [1, 3], [1, 4], [2, 5], [4, 6], [5, 7]];
    var i;
    for (i = 0; i < edges.length; i++) {
      var a = nodes[edges[i][0]], b = nodes[edges[i][1]];
      var d = 'M ' + a.x + ' ' + a.y + ' C ' + ((a.x + b.x) / 2) + ' ' + a.y + ' ' + ((a.x + b.x) / 2) + ' ' + b.y + ' ' + b.x + ' ' + b.y;
      var p = svgEl('path', { d: d, fill: 'none', stroke: RULE, 'stroke-width': '1.5', 'stroke-dasharray': '160 160', 'stroke-dashoffset': '160' });
      p.appendChild(anim('stroke-dashoffset', { from: '160', to: '0', dur: '4.5s', begin: (i * 0.45) + 's', fill: 'freeze' }));
      svg.appendChild(p);
    }
    for (i = 0; i < nodes.length; i++) {
      var n = nodes[i], best = (i === 6);
      var g = svgEl('g', { opacity: '0' });
      g.appendChild(anim('opacity', { values: '0;1', dur: '0.5s', begin: (0.45 + i * 0.45) + 's', fill: 'freeze' }));
      g.appendChild(svgEl('circle', { cx: n.x, cy: n.y, r: best ? '20' : '16', fill: best ? BP : SURF, stroke: best ? BP : RULE, 'stroke-width': '1.5' }));
      g.appendChild(txt(n.x, n.y + 4, String(n.s) + '%', { mono: true, size: best ? '11' : '9', fill: best ? BG : SOFT }));
      if (best) {
        var ring = svgEl('circle', { cx: n.x, cy: n.y, r: '20', fill: 'none', stroke: BP, 'stroke-width': '1.5' });
        ring.appendChild(anim('r', { values: '20;28;20', dur: '2s', begin: '4s' }));
        ring.appendChild(anim('opacity', { values: '0.8;0;0.8', dur: '2s', begin: '4s' }));
        g.appendChild(ring);
      }
      svg.appendChild(g);
    }
    svg.appendChild(txt(40, 218, 'A0 种子', { mono: true, size: '9', fill: MUTE }));
    svg.appendChild(txt(400, 30, '最佳变体', { mono: true, size: '9', fill: BP }));
    shell(host, '达尔文哥德尔机归档（Darwin Gödel Archive）', '自修改智能体的演化谱系',
      svg,
      '达尔文哥德尔机（Darwin Gödel Machine，DGM）不再要求形式化证明，而是维护开放式归档（Open-Ended Archive）。每个智能体提议修改自己的源码，接受基准评分，达到门槛便被保留。谱系持续分叉，最高得分逐步上升；SWE-bench 得分通过这种方式从 20% 提升到 50%。同样的开放性也让它学会了钻自身评估器的空子。');
  }

  // ── aar-forum: 并行沙箱智能体（Sandboxed agents）将内容写入仅追加的
  //    论坛（Forum），论坛位于所有沙箱之外。（阶段 15 · 06）──
  function aarForum(host) {
    var svg = newSvg(250);
    var boxes = [{ x: 30, y: 30 }, { x: 30, y: 105 }, { x: 30, y: 180 }];
    var logX = 350, i;
    // 右侧的仅追加日志（Append-only log）
    svg.appendChild(svgEl('rect', { x: logX, y: 24, width: 140, height: 200, rx: '5', fill: 'none', stroke: BP, 'stroke-width': '2' }));
    svg.appendChild(txt(logX + 70, 18, '共享论坛（仅追加）', { mono: true, size: '8', fill: BP, spacing: '0' }));
    for (i = 0; i < 5; i++) {
      var lr = svgEl('rect', { x: logX + 12, y: 200 - i * 34, width: 116, height: 26, rx: '2', fill: SURF, stroke: RULE, 'stroke-width': '1', opacity: '0' });
      lr.appendChild(anim('opacity', { values: '0;1;1', dur: '6s', begin: (1 + i * 1) + 's', keyTimes: '0;0.08;1', fill: 'freeze' }));
      svg.appendChild(lr);
      svg.appendChild(txt(logX + 70, 200 - i * 34 + 17, '发现 #' + (i + 1), { mono: true, size: '9', fill: SOFT }));
    }
    // 三个沙箱，每个向日志发送一条记录
    var colors = [BP, WARN, SOFT];
    for (i = 0; i < boxes.length; i++) {
      var bx = boxes[i].x, by = boxes[i].y;
      svg.appendChild(svgEl('rect', { x: bx, y: by, width: 120, height: 56, rx: '4', fill: SURF, stroke: RULE, 'stroke-width': '1.5', 'stroke-dasharray': '5 4' }));
      svg.appendChild(txt(bx + 60, by + 24, 'AAR ' + (i + 1), { mono: true, size: '11', fill: INK }));
      svg.appendChild(txt(bx + 60, by + 42, '沙箱（Sandbox）', { mono: true, size: '8', fill: MUTE }));
      var pid = 'aar-path-' + i;
      var sy = by + 28, ey = 200 - i * 50 + 13;
      svg.appendChild(svgEl('path', { id: pid, d: 'M ' + (bx + 120) + ' ' + sy + ' C 250 ' + sy + ' 280 ' + ey + ' ' + logX + ' ' + ey, fill: 'none', stroke: RULE, 'stroke-width': '1', 'stroke-dasharray': '3 3' }));
      var rec = svgEl('rect', { x: -7, y: -5, width: 14, height: 10, rx: '2', fill: colors[i] });
      var mo = svgEl('animateMotion', { dur: '3s', begin: (i * 0.6) + 's', repeatCount: 'indefinite' });
      mo.appendChild(svgEl('mpath', { href: '#' + pid }));
      rec.appendChild(mo);
      svg.appendChild(rec);
    }
    shell(host, '自动化对齐研究（Automated Alignment Research）', '并行智能体 · 外部日志',
      svg,
      '并行运行的 Claude 自动化对齐研究智能体（AAR）各自在隔离沙箱中工作，将发现发布到共享论坛，论坛存储位于所有沙箱之外。智能体可以读取日志，但无法从沙箱内删除或编辑历史记录。仅追加（Append-Only）并直接写入外部存储（Write-Through）的特性，使研究输出可信：智能体无法悄悄掩盖失败的实验。');
  }

  // ── bounded-gates: 提议的修改逐级通过不变量门控（Invariant gates）；
  //    违反不变量的修改被弹回。（阶段 15 · 08）──
  function boundedGates(host) {
    var svg = newSvg(260);
    var gates = ['不变量', '对齐锚点', '多目标', '回归检查'];
    var gy = [210, 160, 110, 60], gx = 150, gw = 220, i;
    for (i = 0; i < 4; i++) {
      svg.appendChild(svgEl('line', { x1: gx, y1: gy[i], x2: gx + gw, y2: gy[i], stroke: RULE, 'stroke-width': '2' }));
      svg.appendChild(txt(gx + gw + 8, gy[i] + 4, gates[i], { mono: true, size: '10', fill: SOFT, anchor: 'start' }));
      svg.appendChild(svgEl('circle', { cx: gx, cy: gy[i], r: '3', fill: BP }));
      svg.appendChild(svgEl('circle', { cx: gx + gw, cy: gy[i], r: '3', fill: BP }));
    }
    // 被接受的修改：向上通过所有门控
    var accepted = svgEl('circle', { cx: gx + 50, cy: 240, r: '8', fill: BP });
    accepted.appendChild(anim('cy', { values: '240;210;160;110;60;30', dur: '5s', keyTimes: '0;0.2;0.42;0.62;0.82;1' }));
    svg.appendChild(accepted);
    svg.appendChild(txt(gx + 50, 252, '修改', { mono: true, size: '8', fill: MUTE }));
    // 被拒绝的修改：上升至某个门控，再向下弹回
    var rej = svgEl('circle', { cx: gx + 160, cy: 240, r: '8', fill: WARN });
    rej.appendChild(anim('cy', { values: '240;210;160;160;240', dur: '5s', keyTimes: '0;0.25;0.45;0.55;1', begin: '1.2s' }));
    rej.appendChild(anim('opacity', { values: '1;1;1;0.3;0', dur: '5s', keyTimes: '0;0.45;0.5;0.6;1', begin: '1.2s' }));
    svg.appendChild(rej);
    // 被拒修改撞到第二道门控时，一个小 X 闪烁
    var x1 = svgEl('text', { x: gx + 160, y: 152, 'text-anchor': 'middle', 'font-family': 'var(--font-mono,monospace)', 'font-size': '16', fill: WARN, opacity: '0' });
    x1.appendChild(document.createTextNode('×'));
    x1.appendChild(anim('opacity', { values: '0;0;1;0;0', dur: '5s', keyTimes: '0;0.45;0.55;0.75;1', begin: '1.2s' }));
    svg.appendChild(x1);
    svg.appendChild(txt(gx + 110, 22, '接受：所有不变量均成立', { mono: true, size: '9', fill: BP }));
    shell(host, '有界自我改进（Bounded Self-Improvement）', '修改必须通过每一道关卡',
      svg,
      '有界循环依据自身无法修改的外部约束，检查每项自修改提案：形式化不变量（Formal Invariant）、不可变的对齐锚点（Alignment Anchor）、各项安全目标及回归检查（Regression Check）。修改只有全部通过才会被接受，违反任意关卡就会被退回。这些措施不能证明系统安全，但能提高故障不被察觉的难度。');
  }

  // ── injection-boundary: 不可信网页内容向智能体的读取/行动边界发起注入（Injection）尝试；
  //    大部分被弹回，一次穿过。（阶段 15 · 11）──
  function injectionBoundary(host) {
    var svg = newSvg(250);
    var bx = 250;
    // 模糊的读取/行动边界（Read/act boundary）
    var bound = svgEl('line', { x1: bx, y1: 30, x2: bx, y2: 220, stroke: BP, 'stroke-width': '2', 'stroke-dasharray': '6 5' });
    svg.appendChild(bound);
    svg.appendChild(txt(bx, 22, '读取 ⇋ 行动的边界', { mono: true, size: '9', fill: BP }));
    // 左侧：不可信网页
    svg.appendChild(svgEl('rect', { x: 24, y: 60, width: 120, height: 130, rx: '4', fill: SURF, stroke: RULE, 'stroke-width': '1.5' }));
    svg.appendChild(txt(84, 52, '不可信页面', { mono: true, size: '9', fill: MUTE }));
    var ly;
    for (ly = 0; ly < 5; ly++) svg.appendChild(svgEl('line', { x1: 38, y1: 82 + ly * 22, x2: 130, y2: 82 + ly * 22, stroke: RULE, 'stroke-width': '4' }));
    // 右侧：智能体（Agent）
    svg.appendChild(svgEl('circle', { cx: 420, cy: 125, r: '34', fill: SURF, stroke: BP, 'stroke-width': '2' }));
    svg.appendChild(txt(420, 122, '智能体', { mono: true, size: '11', fill: INK }));
    svg.appendChild(txt(420, 138, '工具', { mono: true, size: '8', fill: MUTE }));
    // 注入箭头：三个被边界弹回，一个穿过
    var lanes = [80, 125, 170], i;
    for (i = 0; i < 3; i++) {
      var dart = svgEl('polygon', { points: '0,-4 12,0 0,4', fill: WARN });
      var bounce = svgEl('animateTransform', {
        attributeName: 'transform', type: 'translate', repeatCount: 'indefinite',
        dur: '2.6s', begin: (i * 0.55) + 's',
        values: '150,' + lanes[i] + '; ' + (bx - 6) + ',' + lanes[i] + '; 150,' + lanes[i],
        keyTimes: '0;0.5;1'
      });
      dart.appendChild(bounce);
      var fade = anim('opacity', { values: '0;1;1;0.4;0', dur: '2.6s', begin: (i * 0.55) + 's', keyTimes: '0;0.1;0.45;0.55;1' });
      dart.appendChild(fade);
      svg.appendChild(dart);
    }
    // 穿过边界的那一个
    var slip = svgEl('polygon', { points: '0,-4 12,0 0,4', fill: BP });
    slip.appendChild(svgEl('animateTransform', { attributeName: 'transform', type: 'translate', repeatCount: 'indefinite', dur: '3.6s', begin: '1.8s', values: '150,125; 386,125', keyTimes: '0;1' }));
    slip.appendChild(anim('opacity', { values: '0;1;1;0', dur: '3.6s', begin: '1.8s', keyTimes: '0;0.08;0.9;1' }));
    svg.appendChild(slip);
    shell(host, '浏览器智能体注入（Browser-Agent Injection）', '读取内容也可能成为指令通道',
      svg,
      '浏览器智能体读取不可信页面，并执行会产生实际后果的动作。页面输入并非用户亲自编写，因此每行内容都可能是瞄准“读取与行动”模糊边界的潜在指令。防御措施能拦截大多数尝试，但间接提示词注入（Indirect Prompt Injection）就存在于这条边界中；正如 OpenAI 所说，它“不是一种能够彻底修补的缺陷”。');
  }

  // ── cost-governor-stack: 支出上升，穿过不同时间尺度上叠放的上限；
  //    支出速率限制（Velocity limit）最先触发。（阶段 15 · 13）──
  function costGovernorStack(host) {
    var svg = newSvg(250);
    var caps = [
      { y: 190, label: '每请求', v: '0' },
      { y: 150, label: '每任务', v: '1' },
      { y: 110, label: '支出速率（10 分钟）', v: '2', trip: true },
      { y: 70, label: '每日', v: '3' },
      { y: 36, label: '每月', v: '4' }
    ];
    var gx = 70, gw = 320, i;
    for (i = 0; i < caps.length; i++) {
      var c = caps[i];
      svg.appendChild(svgEl('line', { x1: gx, y1: c.y, x2: gx + gw, y2: c.y, stroke: c.trip ? WARN : RULE, 'stroke-width': c.trip ? '2' : '1.5', 'stroke-dasharray': c.trip ? '' : '4 4' }));
      svg.appendChild(txt(gx + gw + 8, c.y + 4, c.label, { mono: true, size: '9', fill: c.trip ? WARN : SOFT, anchor: 'start' }));
    }
    // 上升的支出条
    var bar = svgEl('rect', { x: gx + 40, y: 220, width: 40, height: 0, rx: '2', fill: BP });
    bar.appendChild(anim('y', { values: '220;110;110', dur: '4s', keyTimes: '0;0.7;1', fill: 'freeze' }));
    bar.appendChild(anim('height', { values: '0;110;110', dur: '4s', keyTimes: '0;0.7;1', fill: 'freeze' }));
    bar.appendChild(anim('fill', { values: BP + ';' + BP + ';' + WARN + ';' + WARN, dur: '4s', keyTimes: '0;0.68;0.72;1', fill: 'freeze' }));
    svg.appendChild(bar);
    svg.appendChild(txt(gx + 60, 234, '支出（$）', { mono: true, size: '9', fill: MUTE }));
    // 触发速率上限时闪烁 "CUT"
    var cut = svgEl('text', { x: gx + 160, y: 100, 'text-anchor': 'middle', 'font-family': 'var(--font-mono,monospace)', 'font-size': '14', fill: WARN, opacity: '0' });
    cut.appendChild(document.createTextNode('访问已切断'));
    cut.appendChild(anim('opacity', { values: '0;0;1;1', dur: '4s', keyTimes: '0;0.7;0.78;1', fill: 'freeze' }));
    svg.appendChild(cut);
    shell(host, '分层成本控制（Cost-Governor Stack）', '各个时间尺度都设上限',
      svg,
      '仅设月度上限，往往要等预算耗尽后才能发现失控的智能体。应在不同时间尺度叠加限制：每请求、每任务、支出速率（Velocity）、每日和每月。失控循环会迅速消耗预算，因此“10 分钟内支出 50 美元”这样的速率限制，会远早于日度或月度上限触发。');
  }

  // ── circuit-breaker: 重复的相同工具调用触发熔断器（Circuit breaker），
  //    使其由闭合变为断开。（阶段 15 · 14）──
  function circuitBreaker(host) {
    var svg = newSvg(240);
    // 左侧调用日志（Call log）：五次相同调用堆叠
    var lx = 36, i;
    svg.appendChild(txt(lx + 70, 24, '工具调用', { mono: true, size: '9', fill: MUTE }));
    for (i = 0; i < 5; i++) {
      var r = svgEl('rect', { x: lx, y: 40 + i * 34, width: 150, height: 26, rx: '3', fill: SURF, stroke: i === 4 ? WARN : RULE, 'stroke-width': '1.5', opacity: '0' });
      r.appendChild(anim('opacity', { values: '0;1', dur: '0.3s', begin: (i * 0.7) + 's', fill: 'freeze' }));
      svg.appendChild(r);
      var tl = txt(lx + 75, 40 + i * 34 + 17, 'delete(record_42)', { mono: true, size: '10', fill: i === 4 ? WARN : SOFT });
      tl.setAttribute('opacity', '0');
      tl.appendChild(anim('opacity', { values: '0;1', dur: '0.3s', begin: (i * 0.7) + 's', fill: 'freeze' }));
      svg.appendChild(tl);
    }
    // 右侧的熔断器开关
    var bx = 360, by = 120;
    svg.appendChild(svgEl('circle', { cx: bx, cy: by - 50, r: '6', fill: BP }));
    svg.appendChild(svgEl('circle', { cx: bx, cy: by + 50, r: '6', fill: BP }));
    svg.appendChild(svgEl('line', { x1: bx, y1: by - 50, x2: bx, y2: by - 44, stroke: SOFT, 'stroke-width': '2' }));
    svg.appendChild(svgEl('line', { x1: bx, y1: by + 50, x2: bx, y2: by + 44, stroke: SOFT, 'stroke-width': '2' }));
    // 拨杆：初始闭合（接通），随后迅速断开
    var lever = svgEl('line', { x1: bx, y1: by - 44, x2: bx, y2: by + 44, stroke: BP, 'stroke-width': '3' });
    var lt = svgEl('animateTransform', { attributeName: 'transform', type: 'rotate', dur: '4.5s', repeatCount: 'indefinite', values: '0 ' + bx + ' ' + (by - 44) + ';0 ' + bx + ' ' + (by - 44) + ';48 ' + bx + ' ' + (by - 44) + ';48 ' + bx + ' ' + (by - 44), keyTimes: '0;0.62;0.72;1' });
    lever.appendChild(lt);
    lever.appendChild(anim('stroke', { values: BP + ';' + BP + ';' + WARN + ';' + WARN, dur: '4.5s', keyTimes: '0;0.62;0.72;1' }));
    svg.appendChild(lever);
    var st = svgEl('text', { x: bx + 4, y: by + 78, 'text-anchor': 'middle', 'font-family': 'var(--font-mono,monospace)', 'font-size': '11', fill: WARN, opacity: '0' });
    st.appendChild(document.createTextNode('断开（Open），已暂停'));
    st.appendChild(anim('opacity', { values: '0;0;1;1', dur: '4.5s', keyTimes: '0;0.7;0.78;1', fill: 'freeze' }));
    svg.appendChild(st);
    svg.appendChild(txt(bx, 30, '熔断器', { mono: true, size: '9', fill: MUTE }));
    shell(host, '熔断器（Circuit Breaker）', '动作模式触发熔断',
      svg,
      '熔断器监测特定动作模式，图中是连续五次相同的破坏性调用。模式触发后，熔断器从闭合（Closed）切换为断开（Open）：暂停异常路径，交由人工处理。它不依赖成本上限或智能体的自我报告，而是针对智能体实际执行的动作作出反应。');
  }

  // ── checkpoint-replay: 工作流（Workflow）运行，在步骤中途崩溃，新的工作器
  //    从最近的检查点（Checkpoint）重放。（阶段 15 · 16）──
  function checkpointReplay(host) {
    var svg = newSvg(240);
    var y = 110, steps = ['start', 'ckpt A', 'step', 'ckpt B', 'step', 'commit'];
    var x0 = 40, dx = 88, i;
    svg.appendChild(svgEl('line', { x1: x0, y1: y, x2: x0 + dx * 5, y2: y, stroke: RULE, 'stroke-width': '2' }));
    for (i = 0; i < steps.length; i++) {
      var x = x0 + i * dx, ck = steps[i].indexOf('ckpt') === 0;
      if (ck) {
        svg.appendChild(svgEl('rect', { x: x - 9, y: y - 9, width: 18, height: 18, fill: BP, transform: 'rotate(45 ' + x + ' ' + y + ')' }));
      } else {
        svg.appendChild(svgEl('circle', { cx: x, cy: y, r: '7', fill: SURF, stroke: SOFT, 'stroke-width': '1.5' }));
      }
      svg.appendChild(txt(x, ck ? y - 18 : y + 24, ['开始', '检查点 A', '步骤', '检查点 B', '步骤', '提交'][i], { mono: true, size: '9', fill: ck ? BP : SOFT }));
    }
    var crashX = x0 + dx * 4;
    var ckBX = x0 + dx * 3;
    // 崩溃标记（Crash marker）
    var crash = svgEl('text', { x: crashX, y: y - 26, 'text-anchor': 'middle', 'font-family': 'var(--font-mono,monospace)', 'font-size': '15', fill: WARN, opacity: '0' });
    crash.appendChild(document.createTextNode('崩溃'));
    crash.appendChild(anim('opacity', { values: '0;0;1;1;0;0', dur: '6s', keyTimes: '0;0.42;0.46;0.62;0.66;1' }));
    svg.appendChild(crash);
    // 工作器播放头（Playhead）：推进至崩溃处，跳回 ckpt B，再向前重放
    var head = svgEl('circle', { cx: x0, cy: y, r: '6', fill: WARN });
    head.appendChild(anim('cx', {
      values: x0 + ';' + crashX + ';' + ckBX + ';' + (x0 + dx * 5),
      dur: '6s', keyTimes: '0;0.45;0.55;1', calcMode: 'linear'
    }));
    head.appendChild(anim('fill', { values: WARN + ';' + WARN + ';' + BP + ';' + BP, dur: '6s', keyTimes: '0;0.5;0.55;1' }));
    svg.appendChild(head);
    // 从崩溃处返回 ckpt B 的恢复弧线
    var arc = svgEl('path', { d: 'M ' + crashX + ' ' + (y - 12) + ' Q ' + ((crashX + ckBX) / 2) + ' ' + (y - 52) + ' ' + ckBX + ' ' + (y - 12), fill: 'none', stroke: BP, 'stroke-width': '1.5', 'stroke-dasharray': '4 3', 'marker-end': '', opacity: '0' });
    arc.appendChild(anim('opacity', { values: '0;0;1;1;0;0', dur: '6s', keyTimes: '0;0.46;0.5;0.7;0.8;1' }));
    svg.appendChild(arc);
    svg.appendChild(txt((crashX + ckBX) / 2, y - 56, '从最新检查点恢复', { mono: true, size: '9', fill: BP }));
    shell(host, '检查点与重放（Checkpoint + Replay）', '崩溃后通过租约恢复',
      svg,
      '每次图状态转移都会持久化。工作进程在步骤中途崩溃后，其租约（Lease）过期，另一工作进程从最新检查点（Checkpoint）接手并向前重放（Replay）。结合幂等键（Idempotency Key）与前置条件检查（Precondition Check），可以安全恢复执行，避免重复执行已获批准的动作。');
  }

  LF.register({
    'alphaevolve-loop': alphaevolveLoop,
    'dgm-archive': dgmArchive,
    'aar-forum': aarForum,
    'bounded-gates': boundedGates,
    'injection-boundary': injectionBoundary,
    'cost-governor-stack': costGovernorStack,
    'circuit-breaker': circuitBreaker,
    'checkpoint-replay': checkpointReplay
  });
})();
