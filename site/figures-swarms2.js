/* figures-swarms2.js - 阶段 16（多智能体与群体（Multi-agent and swarms））
   的动画图表，支持主题切换。在 lesson-figures.js 之后加载，通过
   window.LF 注册。无依赖，仅使用 ES5，采用 SMIL 动画，主题由 CSS 变量控制。
   编写方式：使用一个以以下某个组件名称为内容的 ```figure 块。 */
(function () {
  'use strict';
  var LF = window.LF;
  if (!LF) { return; }
  var el = LF.el, svgEl = LF.svgEl;

  function shell(host, label, hint, svg, cap) {
    host.appendChild(el('div', { class: 'lf' }, [
      el('div', { class: 'lf-head' }, [el('span', { class: 'lf-label' }, [label]), el('span', {}, [hint])]),
      el('div', { class: 'lf-body' }, [el('div', { class: 'lf-out' }, [svg])]),
      el('div', { class: 'lf-cap' }, [cap])
    ]));
  }
  function txt(x, y, s, size, fill, anchor) {
    var t = svgEl('text', { x: x, y: y, 'text-anchor': anchor || 'middle', 'font-family': 'var(--font-mono,monospace)', 'font-size': size || '10', fill: fill || 'var(--ink-mute,#777)' });
    t.appendChild(document.createTextNode(s));
    return t;
  }
  function anim(attr, vals, dur, opts) {
    var a = { attributeName: attr, values: vals, dur: dur + 's', repeatCount: 'indefinite' };
    if (opts) for (var k in opts) a[k] = opts[k];
    return svgEl('animate', a);
  }

  var BP = 'var(--blueprint,#3553ff)';
  var WARN = 'var(--warn,#b8870f)';
  var SOFT = 'var(--rule-soft,#ddd)';
  var SURF = 'var(--bg-surface,#eee)';
  var BG = 'var(--bg,#fafaf5)';
  var MUTE = 'var(--ink-mute,#777)';

  // ── swarm-consensus-wave: 环状排列的智能体以波浪次序变为同一种颜色；
  //    一个拜占庭节点（Byzantine node）保持异色，始终不收敛 ──
  function consensusWave(host) {
    var W = 520, H = 250, CX = 260, CY = 120, R = 90, N = 8;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var byz = 5, period = 8, i;
    var px = [], py = [];
    for (i = 0; i < N; i++) {
      var ang = -Math.PI / 2 + i * 2 * Math.PI / N;
      px.push(CX + R * Math.cos(ang)); py.push(CY + R * Math.sin(ang));
    }
    for (i = 0; i < N; i++) {
      svg.appendChild(svgEl('line', { x1: px[i], y1: py[i], x2: px[(i + 1) % N], y2: py[(i + 1) % N], stroke: SOFT, 'stroke-width': '1.2' }));
    }
    for (i = 0; i < N; i++) {
      var isByz = (i === byz);
      var g = svgEl('g', {});
      var c = svgEl('circle', { cx: px[i], cy: py[i], r: '15', stroke: isByz ? WARN : BP, 'stroke-width': '2', fill: SURF });
      if (isByz) {
        c.setAttribute('fill', WARN);
      } else {
        // 以错开的波浪次序切换为共识（Consensus）颜色，再保持
        var begin = (i * (period / N)).toFixed(2);
        c.appendChild(svgEl('animate', { attributeName: 'fill', values: SURF + ';' + SURF + ';' + BP + ';' + BP, keyTimes: '0;0.12;0.2;1', dur: period + 's', begin: begin + 's', repeatCount: 'indefinite' }));
      }
      g.appendChild(c);
      g.appendChild(txt(px[i], py[i] + 4, isByz ? 'X' : String(i), '11', isByz ? BG : BP));
      svg.appendChild(g);
    }
    svg.appendChild(txt(CX, CY + 4, '达成一致？', '11', MUTE));
    svg.appendChild(txt(CX, H - 16, '一致意见沿环传播；拜占庭节点 X 始终不参与', '10', MUTE));
    shell(host, '共识传播（Consensus Wave）', '同一个值逐步扩散', svg,
      '随着决策沿环传播，诚实智能体逐步收敛到同一个值。单个拜占庭节点（Byzantine Node，X）拒绝改变，因此朴素多数表决仍可能被操控。经典拜占庭容错（Byzantine Fault Tolerance，BFT）可容忍 f < n/3 个此类节点；对大语言模型智能体而言，尚待解决的是相关故障（Correlated Fault），而不只是任意故障。');
  }

  // ── swarm-auction: 竞标者（Bidders）的条形随时间升高；胜出者高亮，
  //    支付第二高价格（Vickrey） ──
  function auction(host) {
    var W = 520, H = 250, N = 5, base = 60, bw = 54, gap = 36, x0 = 70, period = 7;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var bids = [42, 88, 61, 30, 73];
    var winner = 1, second = 4; // 最高与次高出价的索引
    var floorY = H - 50, maxH = 130, maxBid = 100, i;
    svg.appendChild(svgEl('line', { x1: 40, y1: floorY, x2: W - 30, y2: floorY, stroke: SOFT, 'stroke-width': '1.4' }));
    for (i = 0; i < N; i++) {
      var x = x0 + i * (bw + gap);
      var h = bids[i] / maxBid * maxH;
      var isWin = (i === winner);
      var bar = svgEl('rect', { x: x, y: floorY, width: bw, height: 0, fill: isWin ? BP : SURF, stroke: isWin ? BP : SOFT, 'stroke-width': '1.5' });
      var beg = (i * 0.5).toFixed(2);
      // 从底部增长至最终高度，再保持
      bar.appendChild(svgEl('animate', { attributeName: 'height', values: '0;' + h.toFixed(0) + ';' + h.toFixed(0), keyTimes: '0;0.45;1', dur: period + 's', begin: beg + 's', repeatCount: 'indefinite' }));
      bar.appendChild(svgEl('animate', { attributeName: 'y', values: floorY + ';' + (floorY - h).toFixed(0) + ';' + (floorY - h).toFixed(0), keyTimes: '0;0.45;1', dur: period + 's', begin: beg + 's', repeatCount: 'indefinite' }));
      svg.appendChild(bar);
      svg.appendChild(txt(x + bw / 2, floorY + 18, 'a' + i, '10', isWin ? BP : MUTE));
      svg.appendChild(txt(x + bw / 2, floorY - h - 8, '$' + bids[i], '11', isWin ? BP : MUTE));
      if (i === second) {
        // 结算线（Settlement line）：胜出者支付第二高出价
        var sy = floorY - bids[second] / maxBid * maxH;
        var pay = svgEl('line', { x1: 40, y1: sy, x2: W - 30, y2: sy, stroke: WARN, 'stroke-width': '1.4', 'stroke-dasharray': '5 4', opacity: '0' });
        pay.appendChild(svgEl('animate', { attributeName: 'opacity', values: '0;0;0.9;0.9', keyTimes: '0;0.55;0.7;1', dur: period + 's', repeatCount: 'indefinite' }));
        svg.appendChild(pay);
        svg.appendChild(txt(W - 36, sy - 6, '支付次高价', '10', WARN, 'end'));
      }
    }
    svg.appendChild(txt(W / 2, 28, '次价拍卖（Vickrey Auction）', '11', MUTE));
    shell(host, '词元拍卖（Token Auction）', '出价最高者胜出', svg,
      '智能体为任务竞价，图中出价随本轮进行逐步升高。最高出价者 a1 胜出，但支付虚线所示的次高价格。在次价拍卖（Second-Price Auction）中，如实出价是占优策略（Dominant Strategy），因此机制设计（Mechanism Design）常用它在智能体间分配工作与词元。');
  }

  // ── swarm-stigmergy: 蚂蚁在巢穴与食物之间的边上留下信息素（Pheromone）；
  //    流量集中时，最短边变亮，其他边淡出 ──
  function stigmergy(host) {
    var W = 520, H = 250, svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var nest = { x: 60, y: 125 }, food = { x: 460, y: 125 };
    // 三条路线：一条较短直达路线与两条较长绕行路线
    var paths = [
      'M60 125 L260 125 L460 125',          // 短、强
      'M60 125 Q260 40 460 125',            // 中等
      'M60 125 Q260 215 460 125'            // 长、弱
    ];
    var strength = [1, 0.45, 0.2], dur = [2.0, 2.9, 3.6];
    var i;
    for (i = 0; i < paths.length; i++) {
      // 基础踪迹（Trail）：不透明度振荡，展示沉积与蒸发
      var base = svgEl('path', { id: 'lf-st-p' + i, d: paths[i], fill: 'none', stroke: BP, 'stroke-width': (1 + strength[i] * 3).toFixed(1), 'stroke-linecap': 'round' });
      base.appendChild(anim('opacity', (0.15 * strength[i]).toFixed(2) + ';' + (0.9 * strength[i] + 0.1).toFixed(2) + ';' + (0.15 * strength[i]).toFixed(2), 3 + i, {}));
      svg.appendChild(base);
      // 蚂蚁通过 animateMotion 沿踪迹移动
      var nAnts = i === 0 ? 4 : 2, j;
      for (j = 0; j < nAnts; j++) {
        var ant = svgEl('circle', { r: '4', fill: i === 0 ? BP : MUTE });
        var mp = svgEl('animateMotion', { dur: dur[i] + 's', repeatCount: 'indefinite', begin: (j * dur[i] / nAnts).toFixed(2) + 's', rotate: 'auto' });
        mp.appendChild(svgEl('mpath', { href: '#lf-st-p' + i }));
        ant.appendChild(mp);
        svg.appendChild(ant);
      }
    }
    [[nest, 'nest'], [food, 'food']].forEach(function (n) {
      svg.appendChild(svgEl('circle', { cx: n[0].x, cy: n[0].y, r: '16', fill: SURF, stroke: BP, 'stroke-width': '2' }));
      svg.appendChild(txt(n[0].x, n[0].y + 4, n[1] === 'nest' ? 'N' : 'F', '11', BP));
      svg.appendChild(txt(n[0].x, n[0].y + 30, n[1] === 'nest' ? '巢穴（Nest）' : '食物（Food）', '10', MUTE));
    });
    svg.appendChild(txt(W / 2, H - 14, '信息素集中在短路径上，较弱路径上的痕迹逐渐消退', '10', MUTE));
    shell(host, '痕迹协同（Stigmergy）', '蚂蚁强化路径', svg,
      '没有智能体负责规划路线。每个个体行进时留下信息素（Pheromone），并优先选择痕迹较强的路径，因此最短路径上的流量逐步增加，绕路痕迹则逐渐消退。蚁群优化（Ant Colony Optimization，ACO）将此转化为智能体路由：路径痕迹记录哪种任务由哪个智能体处理，衰减机制则让系统能重新发现更优路线。');
  }

  // ── swarm-hierarchy-token: 委派（Delegation）词元沿管理者树向下传递
  //    到工作器（Workers），结果再沿相同边向上返回 ──
  function hierarchyToken(host) {
    var W = 520, H = 260, svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var mgr = { x: 260, y: 36, l: '管理者' };
    var sub = [{ x: 150, y: 120, l: 'A' }, { x: 370, y: 120, l: 'B' }];
    var wrk = [{ x: 90, y: 210 }, { x: 210, y: 210 }, { x: 330, y: 210 }, { x: 430, y: 210 }];
    var edges = [
      'M260 50 L150 106', 'M260 50 L370 106',
      'M150 134 L90 196', 'M150 134 L210 196',
      'M370 134 L330 196', 'M370 134 L430 196'
    ];
    var i, period = 6;
    for (i = 0; i < edges.length; i++) {
      svg.appendChild(svgEl('path', { id: 'lf-hi-e' + i, d: edges[i], fill: 'none', stroke: SOFT, 'stroke-width': '1.4' }));
    }
    // 委派词元：前半段向下移动，后半段结果向上返回
    for (i = 0; i < edges.length; i++) {
      var down = svgEl('circle', { r: '5', fill: BP });
      var dm = svgEl('animateMotion', { dur: period + 's', repeatCount: 'indefinite', begin: (i < 2 ? 0 : 0.9) + 's', keyPoints: '0;1;1;1', keyTimes: '0;0.3;0.5;1', calcMode: 'linear' });
      dm.appendChild(svgEl('mpath', { href: '#lf-hi-e' + i }));
      down.appendChild(dm);
      down.appendChild(svgEl('animate', { attributeName: 'opacity', values: '1;1;0;0', keyTimes: '0;0.3;0.31;1', dur: period + 's', begin: (i < 2 ? 0 : 0.9) + 's', repeatCount: 'indefinite' }));
      svg.appendChild(down);
      var up = svgEl('circle', { r: '5', fill: WARN });
      var um = svgEl('animateMotion', { dur: period + 's', repeatCount: 'indefinite', begin: (i < 2 ? 2.4 : 1.5) + 's', keyPoints: '1;0;0;0', keyTimes: '0;0.3;0.5;1', calcMode: 'linear' });
      um.appendChild(svgEl('mpath', { href: '#lf-hi-e' + i }));
      up.appendChild(um);
      up.appendChild(svgEl('animate', { attributeName: 'opacity', values: '1;1;0;0', keyTimes: '0;0.3;0.31;1', dur: period + 's', begin: (i < 2 ? 2.4 : 1.5) + 's', repeatCount: 'indefinite' }));
      svg.appendChild(up);
    }
    function node(n, on) {
      svg.appendChild(svgEl('rect', { x: n.x - 28, y: n.y, width: 56, height: 28, rx: '4', fill: on ? BP : SURF, stroke: on ? BP : SOFT, 'stroke-width': '1.5' }));
      svg.appendChild(txt(n.x, n.y + 18, n.l, '11', on ? BG : BP));
    }
    node(mgr, true);
    sub.forEach(function (s) { node(s, false); });
    wrk.forEach(function (w, k) { node({ x: w.x, y: w.y, l: 'w' + k }, false); });
    svg.appendChild(txt(W / 2, H - 6, '蓝色：向下委派；金色：向上返回结果', '10', MUTE));
    shell(host, '层次结构（Hierarchy）', '向下委派，向上返回', svg,
      '管理者拆分目标，经由下级管理者向执行者（Worker，w0–w3）逐层委派，结果沿相同的边返回。风险在于：大语言模型管理者每轮都重新推理整棵树，少量上下文漂移（Context Drift）就可能造成任务分配错误，使结构陷入循环。扁平的顺序执行往往表现更好。');
  }

  // ── swarm-message-bus: 带类型的数据包（Typed packets）沿共享主干传送；MCP 与
  //    A2A 泳道通过 animateMotion 承载不同消息类型 ──
  function messageBus(host) {
    var W = 520, H = 250, svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var lanes = [
      { y: 80, l: 'MCP · 工具调用', d: 'M70 80 L450 80', col: BP },
      { y: 130, l: 'A2A · 任务', d: 'M70 130 L450 130', col: WARN },
      { y: 180, l: 'ANP · 身份', d: 'M70 180 L450 180', col: MUTE }
    ];
    var i, j;
    // 端点（Endpoints）
    [70, 450].forEach(function (x, e) {
      svg.appendChild(svgEl('rect', { x: x - 26, y: 60, width: 52, height: 140, rx: '5', fill: SURF, stroke: SOFT, 'stroke-width': '1.5' }));
      svg.appendChild(txt(x, 52, e === 0 ? '智能体 A' : '智能体 B', '10', MUTE));
    });
    for (i = 0; i < lanes.length; i++) {
      var ln = lanes[i];
      svg.appendChild(svgEl('path', { id: 'lf-bus-l' + i, d: ln.d, fill: 'none', stroke: SOFT, 'stroke-width': '1.2', 'stroke-dasharray': '4 4' }));
      svg.appendChild(txt(W - 60, ln.y - 8, ln.l, '9', ln.col, 'end'));
      var nP = 3, dur = 3 + i * 0.6;
      for (j = 0; j < nP; j++) {
        var dir = (i === 1) ? 1 : 0; // A2A 偶尔沿 B->A 返回
        var pkt = svgEl('rect', { x: -5, y: -5, width: 10, height: 10, rx: '2', fill: ln.col });
        var mm = svgEl('animateMotion', { dur: dur + 's', repeatCount: 'indefinite', begin: (j * dur / nP).toFixed(2) + 's', rotate: '0' });
        if (dir) { mm.setAttribute('keyPoints', '1;0'); mm.setAttribute('keyTimes', '0;1'); }
        mm.appendChild(svgEl('mpath', { href: '#lf-bus-l' + i }));
        pkt.appendChild(mm);
        svg.appendChild(pkt);
      }
    }
    svg.appendChild(txt(W / 2, H - 14, '共享总线，按类型分通道；每种协议承载对应消息', '10', MUTE));
    shell(host, '消息总线（Message Bus）', '数据包沿共享总线传输', svg,
      '智能体不再传递原始字符串，而是在共享总线上使用带类型的协议通信。模型上下文协议（Model Context Protocol，MCP）承载工具调用，智能体间协议（Agent2Agent，A2A）承载委派任务及回复，智能体网络协议（Agent Network Protocol，ANP）承载身份信息。通道分离使多智能体系统可审计，也让不同团队构建的智能体能够互操作。');
  }

  // ── swarm-roles: 智能体采用不同形状/角色（Roles），一个交付物（Artifact）
  //    依次经过 规划 → 执行 → 批评 → 验证，被拒绝时循环返回 ──
  function roles(host) {
    var W = 520, H = 250, svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var R = [
      { x: 70, l: '规划', shape: 'rect' },
      { x: 200, l: '执行', shape: 'circle' },
      { x: 330, l: '评议', shape: 'diamond' },
      { x: 450, l: '验证', shape: 'hex' }
    ];
    var y = 110, i;
    // 连接主干
    var spine = 'M' + R[0].x + ' ' + y;
    for (i = 1; i < R.length; i++) spine += ' L' + R[i].x + ' ' + y;
    svg.appendChild(svgEl('path', { id: 'lf-rl-spine', d: spine, fill: 'none', stroke: SOFT, 'stroke-width': '1.4' }));
    // 拒绝回路：批评者（Critic）-> 规划
    svg.appendChild(svgEl('path', { d: 'M330 ' + (y + 24) + ' Q200 ' + (y + 90) + ' 70 ' + (y + 24), fill: 'none', stroke: WARN, 'stroke-width': '1.3', 'stroke-dasharray': '5 4' }));
    svg.appendChild(txt(200, y + 86, '拒绝 → 重新规划', '10', WARN));
    function drawRole(r, idx) {
      var on = (idx === 1);
      if (r.shape === 'rect') svg.appendChild(svgEl('rect', { x: r.x - 26, y: y - 20, width: 52, height: 40, rx: '4', fill: SURF, stroke: BP, 'stroke-width': '1.8' }));
      else if (r.shape === 'circle') svg.appendChild(svgEl('circle', { cx: r.x, cy: y, r: '23', fill: SURF, stroke: BP, 'stroke-width': '1.8' }));
      else if (r.shape === 'diamond') svg.appendChild(svgEl('polygon', { points: r.x + ',' + (y - 26) + ' ' + (r.x + 26) + ',' + y + ' ' + r.x + ',' + (y + 26) + ' ' + (r.x - 26) + ',' + y, fill: SURF, stroke: WARN, 'stroke-width': '1.8' }));
      else svg.appendChild(svgEl('polygon', { points: (r.x - 14) + ',' + (y - 22) + ' ' + (r.x + 14) + ',' + (y - 22) + ' ' + (r.x + 26) + ',' + y + ' ' + (r.x + 14) + ',' + (y + 22) + ' ' + (r.x - 14) + ',' + (y + 22) + ' ' + (r.x - 26) + ',' + y, fill: SURF, stroke: BP, 'stroke-width': '1.8' }));
      svg.appendChild(txt(r.x, y + 4, r.l, '9', BP));
    }
    R.forEach(drawRole);
    // 交付物词元沿主干移动，到达各角色时脉动
    var art = svgEl('circle', { r: '6', fill: BP });
    var am = svgEl('animateMotion', { dur: '6s', repeatCount: 'indefinite', keyPoints: '0;0.33;0.66;1;1', keyTimes: '0;0.3;0.6;0.85;1', calcMode: 'linear' });
    am.appendChild(svgEl('mpath', { href: '#lf-rl-spine' }));
    art.appendChild(am);
    art.appendChild(anim('r', '6;9;6', 1.2, {}));
    svg.appendChild(art);
    svg.appendChild(txt(W / 2, 40, '交付物依次流经不同角色', '11', MUTE));
    svg.appendChild(txt(W / 2, H - 14, '规划者（□）· 执行者（○）· 评议者（◇，主观）· 验证者（⬡，确定性）', '9', MUTE));
    shell(host, '角色专业化（Role Specialization）', '一份交付物，四种角色', svg,
      '关键是让智能体承担不同职责，而非单纯增加数量。规划者（Planner）制定计划，执行者（Executor）产出交付物，评议者（Critic）进行主观评议，验证者（Verifier）执行确定性检查，各自使用不同工具。验证者至关重要：MAST 将几乎所有多智能体故障追溯到验证缺失或失效。拒绝结果会让交付物返回重新规划。');
  }

  // ── swarm-blackboard: 写入者（Writers）向中央黑板发布，读取者（Readers）订阅；
  //    一条被投毒的事实向读取者扩散，形成流言传播（Gossip）涟漪 ──
  function blackboard(host) {
    var W = 520, H = 260, CX = 260, CY = 130, svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    // 中央黑板（Central board）
    svg.appendChild(svgEl('rect', { x: CX - 70, y: CY - 38, width: 140, height: 76, rx: '6', fill: SURF, stroke: BP, 'stroke-width': '2' }));
    svg.appendChild(txt(CX, CY - 14, '黑板（Blackboard）', '10', BP));
    // 事实条目从蓝色（已验证）变为金色（被投毒），再变回
    var fact = svgEl('rect', { x: CX - 54, y: CY, width: 108, height: 16, rx: '3', fill: BP });
    fact.appendChild(anim('fill', BP + ';' + BP + ';' + WARN + ';' + WARN + ';' + BP, 8, { keyTimes: '0;0.25;0.35;0.8;1' }));
    svg.appendChild(fact);
    var agents = [
      { x: 70, y: 50, w: 1 }, { x: 70, y: 210, w: 1 },
      { x: 160, y: 30, w: 0 }, { x: 360, y: 30, w: 0 },
      { x: 450, y: 50, w: 0 }, { x: 450, y: 210, w: 0 }, { x: 160, y: 230, w: 0 }
    ];
    var i, poisonReader = 4;
    for (i = 0; i < agents.length; i++) {
      var a = agents[i];
      var isW = a.w === 1;
      // 智能体与黑板之间的边
      var ex = CX + (a.x < CX ? -70 : 70), ey = CY;
      svg.appendChild(svgEl('path', { id: 'lf-bb-e' + i, d: 'M' + a.x + ' ' + a.y + ' L' + ex + ' ' + ey, fill: 'none', stroke: SOFT, 'stroke-width': '1.2' }));
      svg.appendChild(svgEl('circle', { cx: a.x, cy: a.y, r: '14', fill: SURF, stroke: isW ? WARN : BP, 'stroke-width': '1.8' }));
      svg.appendChild(txt(a.x, a.y + 4, isW ? 'W' : 'R', '10', isW ? WARN : BP));
      // 数据包：写入者推送到黑板；读取者从黑板拉取
      var pkt = svgEl('circle', { r: '4', fill: isW ? WARN : BP });
      var rev = !isW; // 读取者的数据沿 黑板 -> 智能体 移动
      var mm = svgEl('animateMotion', { dur: (isW ? 4 : 4.5) + 's', repeatCount: 'indefinite', begin: (i * 0.4).toFixed(2) + 's' });
      if (rev) { mm.setAttribute('keyPoints', '1;0'); mm.setAttribute('keyTimes', '0;1'); }
      mm.appendChild(svgEl('mpath', { href: '#lf-bb-e' + i }));
      pkt.appendChild(mm);
      // 受投毒影响的读取者数据包闪烁金色，表示已采纳
      if (i === poisonReader) pkt.appendChild(anim('fill', BP + ';' + WARN + ';' + WARN + ';' + BP, 4.5, { keyTimes: '0;0.4;0.7;1' }));
      svg.appendChild(pkt);
    }
    svg.appendChild(txt(W / 2, H - 12, 'W 写入，R 读取；被投毒的事实（金色）传播给每个读取者', '10', MUTE));
    shell(host, '黑板（Blackboard）', '共享状态，也共享风险', svg,
      '智能体通过中央黑板共享事实，无需复制消息。风险是记忆投毒（Memory Poisoning）：一个智能体写入幻觉（Hallucination），下游所有读取者将其当成已验证事实，准确率便在不知不觉中下降。有效缓解措施包括来源追踪（Provenance）、不可被改写的验证器以及各智能体独立的视图。');
  }

  // ── swarm-speaker: 选择器（Selector）词元在共享池周围的对话智能体之间跳动，
  //    最后停在下一发言者处，类似领导者选举（Leader-election） ──
  function speaker(host) {
    var W = 520, H = 260, CX = 260, CY = 135, R = 88, N = 5, svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var px = [], py = [], i;
    for (i = 0; i < N; i++) {
      var ang = -Math.PI / 2 + i * 2 * Math.PI / N;
      px.push(CX + R * Math.cos(ang)); py.push(CY + R * Math.sin(ang));
    }
    // 中央共享池（Shared pool）
    svg.appendChild(svgEl('circle', { cx: CX, cy: CY, r: '30', fill: SURF, stroke: SOFT, 'stroke-width': '1.4' }));
    svg.appendChild(txt(CX, CY - 2, '共享', '9', MUTE));
    svg.appendChild(txt(CX, CY + 10, '消息池', '9', MUTE));
    // 从共享池通向各智能体的辐条
    for (i = 0; i < N; i++) {
      svg.appendChild(svgEl('line', { x1: CX, y1: CY, x2: px[i], y2: py[i], stroke: SOFT, 'stroke-width': '1' }));
    }
    var period = 7.5, settle = N; // 依次跳过所有智能体，再停在一个上
    for (i = 0; i < N; i++) {
      var on = svgEl('circle', { cx: px[i], cy: py[i], r: '17', fill: SURF, stroke: BP, 'stroke-width': '2' });
      // 词元访问时各智能体依次点亮，最后一个（索引 2）保持点亮
      var lit = (i === 2);
      var k0 = (i / N).toFixed(3), k1 = ((i + 0.5) / N).toFixed(3);
      var vals = lit
        ? SURF + ';' + SURF + ';' + BP + ';' + BP
        : SURF + ';' + SURF + ';' + BP + ';' + SURF + ';' + SURF;
      var kt = lit ? ('0;' + k0 + ';' + k1 + ';1') : ('0;' + k0 + ';' + k1 + ';' + ((i + 1) / N).toFixed(3) + ';1');
      on.appendChild(svgEl('animate', { attributeName: 'fill', values: vals, keyTimes: kt, dur: period + 's', repeatCount: 'indefinite' }));
      svg.appendChild(on);
      svg.appendChild(txt(px[i], py[i] + 4, String.fromCharCode(65 + i), '11', BP));
    }
    // 选择器词元在智能体间跳动，最后停在选中的智能体（索引 2）上
    var order = [0, 1, 2, 3, 4, 2], motVals = '', j;
    for (j = 0; j < order.length; j++) {
      motVals += px[order[j]] + ',' + (py[order[j]] - 26) + (j < order.length - 1 ? ';' : '');
    }
    var crownG = svgEl('g', {}, [svgEl('polygon', { points: '-8,4 -8,-4 -3,0 0,-7 3,0 8,-4 8,4', fill: WARN })]);
    crownG.appendChild(svgEl('animateTransform', { attributeName: 'transform', type: 'translate', values: motVals, dur: period + 's', repeatCount: 'indefinite', calcMode: 'discrete' }));
    svg.appendChild(crownG);
    svg.appendChild(txt(W / 2, 16, '选择器决定下一位发言者', '11', MUTE));
    svg.appendChild(txt(W / 2, H - 12, '令牌沿 A→B→C→D→E 跳转，最后停在选中的发言者处', '10', MUTE));
    shell(host, '发言者选择（Speaker Selection）', '下一位由谁发言', svg,
      '智能体响应同一个共享消息池，不必遵循固定图结构。选择器（Selector）通过轮询（Round-Robin）、大语言模型或自定义规则决定下一位发言者，图中的令牌因此在候选者间跳转，最后选定一位。这样无需硬编码 N 个智能体间所有可能的交接关系，避免连接边数量急剧膨胀。');
  }

  LF.register({
    'swarm-consensus-wave': consensusWave,
    'swarm-auction': auction,
    'swarm-stigmergy': stigmergy,
    'swarm-hierarchy-token': hierarchyToken,
    'swarm-message-bus': messageBus,
    'swarm-roles': roles,
    'swarm-blackboard': blackboard,
    'swarm-speaker': speaker
  });
})();
