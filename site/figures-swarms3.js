/* figures-swarms3.js - 阶段 16（多智能体与群体（Multi-agent and swarms））
   的第三个动画图表模块，支持主题切换。在 lesson-figures.js 之后加载，
   通过 window.LF 注册。无依赖，仅使用 ES5，采用 SMIL 动画，主题由
   CSS 变量控制。编写方式：使用一个以以下某个组件名称为内容的 ```figure 块。 */
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
  function anim(attr, vals, kt, dur, opts) {
    var a = { attributeName: attr, values: vals, keyTimes: kt, dur: dur + 's', repeatCount: 'indefinite' };
    if (opts) for (var k in opts) a[k] = opts[k];
    return svgEl('animate', a);
  }
  function motion(path, kt, kp, dur, begin) {
    return svgEl('animateMotion', { path: path, keyTimes: kt, keyPoints: kp, dur: dur + 's', begin: (begin || 0) + 's', repeatCount: 'indefinite', calcMode: 'linear' });
  }

  var BP = 'var(--blueprint,#3553ff)';
  var WARN = 'var(--warn,#b8870f)';
  var SOFT = 'var(--rule-soft,#ddd)';
  var SURF = 'var(--bg-surface,#eee)';
  var BG = 'var(--bg,#fafaf5)';
  var MUTE = 'var(--ink-mute,#777)';

  // ── sw-contract-net: 管理者（Manager）发布任务，三个竞标者快速传回出价，
  //    最低出价中标（FIPA contract-net） ──
  function contractNet(host) {
    var W = 520, H = 250, mx = 70, my = 125, period = 8;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var bx = 410, bys = [60, 125, 190], win = 2; // 胜出竞标者（最低价）的索引
    var i;
    for (i = 0; i < 3; i++) {
      svg.appendChild(svgEl('line', { x1: mx, y1: my, x2: bx, y2: bys[i], stroke: SOFT, 'stroke-width': '1.2' }));
    }
    // 公告脉冲向外传送，随后各出价错开返回
    for (i = 0; i < 3; i++) {
      var fwd = 'M' + mx + ',' + my + ' L' + bx + ',' + bys[i];
      var pkt = svgEl('circle', { r: '4', fill: BP });
      pkt.appendChild(anim('opacity', '0;1;1;0;0', '0;0.02;0.2;0.24;1', period));
      pkt.appendChild(motion(fwd, '0;0.2;1', '0;1;1', period));
      svg.appendChild(pkt);
      var back = 'M' + bx + ',' + bys[i] + ' L' + mx + ',' + my;
      var bid = svgEl('circle', { r: '4', fill: (i === win ? WARN : MUTE) });
      bid.appendChild(anim('opacity', '0;0;1;1;0;0', '0;0.3;0.34;0.55;0.6;1', period));
      bid.appendChild(motion(back, '0;0.34;0.6;1', '0;0;1;1', period));
      svg.appendChild(bid);
    }
    var mgr = svgEl('circle', { cx: mx, cy: my, r: '20', stroke: BP, 'stroke-width': '2', fill: SURF });
    svg.appendChild(mgr);
    svg.appendChild(txt(mx, my + 4, '管理者', '10', BP));
    var labels = ['$9', '$7', '$4'];
    for (i = 0; i < 3; i++) {
      var c = svgEl('circle', { cx: bx, cy: bys[i], r: '16', stroke: (i === win ? WARN : MUTE), 'stroke-width': '2', fill: SURF });
      if (i === win) c.appendChild(anim('fill', SURF + ';' + SURF + ';' + WARN + ';' + WARN + ';' + SURF, '0;0.6;0.66;0.9;1', period));
      svg.appendChild(c);
      svg.appendChild(txt(bx, bys[i] + 4, labels[i], '10', (i === win ? WARN : MUTE)));
    }
    svg.appendChild(txt(W / 2, H - 14, '发布任务 → 收回报价 → 最低报价获得契约', '10', MUTE));
    shell(host, '契约网（Contract Net）', '发布任务、竞标、授标', svg,
      'FIPA 契约网协议（Contract-Net Protocol）将任务分配转化为密封竞价（Sealed Auction）。管理者广播征求提案（Call for Proposals），空闲智能体返回报价，再由管理者将契约授予最优报价者。MCP 的 tools/call 和现代任务市场，是这一 1980 年机制采用原生 JSON 形式的重新表达。');
  }

  // ── sw-work-stealing: 任务落入共享队列（Shared queue）；三个工作器异步
  //    拉取任务，不设中央分发器（Central dispatcher） ──
  function workStealing(host) {
    var W = 520, H = 250, qx = 60, qy = 50, qw = 400, period = 6;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    svg.appendChild(svgEl('rect', { x: qx, y: qy, width: qw, height: 30, fill: SURF, stroke: SOFT, 'stroke-width': '1.2', rx: '3' }));
    svg.appendChild(txt(qx + qw + 6, qy + 20, '队列', '9', MUTE, 'start'));
    var wx = [120, 260, 400], wy = 190, i, j;
    for (i = 0; i < 3; i++) {
      svg.appendChild(svgEl('rect', { x: wx[i] - 26, y: wy - 22, width: 52, height: 44, fill: SURF, stroke: BP, 'stroke-width': '2', rx: '3' }));
      svg.appendChild(txt(wx[i], wy + 4, 'w' + i, '11', BP));
    }
    // 六个任务词元落入队列，再被向下拉取至工作器
    var slots = [90, 150, 210, 270, 330, 390];
    for (j = 0; j < 6; j++) {
      var tgt = j % 3;
      var begin = (j * (period / 6)).toFixed(2);
      var path = 'M' + slots[j] + ',' + (qy + 15) + ' L' + slots[j] + ',' + (qy + 15) + ' L' + wx[tgt] + ',' + (wy - 30);
      var g = svgEl('g', {});
      var sq = svgEl('rect', { x: -5, y: -5, width: 10, height: 10, fill: BP, rx: '2' });
      g.appendChild(sq);
      g.appendChild(anim('opacity', '0;1;1;1;0;0', '0;0.05;0.4;0.7;0.78;1', period, { begin: begin + 's' }));
      g.appendChild(motion(path, '0;0.35;1', '0;0;1', period, begin));
      svg.appendChild(g);
    }
    svg.appendChild(txt(W / 2, H - 14, '执行者从共享队列拉取任务，无需编排器逐一分配', '10', MUTE));
    shell(host, '任务窃取（Work Stealing）', '执行者主动拉取任务', svg,
      '群体中没有中央调度器（Central Dispatcher）。任务进入共享队列，空闲执行者（Worker，w0–w2）自行拉取下一项工作。协调由队列语义承担，因此系统可以持续扩展，直到队列成为瓶颈。代价是确定性：用单一连贯的计划换取更高吞吐量（Throughput）。');
  }

  // ── sw-handoff-routing: 对话词元在智能体之间移交（Handoff），每次
  //    移交都是返回下一个智能体的工具调用（Tool call），采用 OpenAI Swarm ──
  function handoffRouting(host) {
    var W = 520, H = 240, period = 9;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var ax = [90, 260, 430], ay = [120, 70, 160], names = ['分流', '计费', '退款'];
    // 链：triage -> billing -> refund -> triage
    var order = [0, 1, 2, 0];
    var i;
    for (i = 0; i < 3; i++) {
      var nxt = order[i + 1];
      svg.appendChild(svgEl('line', { x1: ax[order[i]], y1: ay[order[i]], x2: ax[nxt], y2: ay[nxt], stroke: SOFT, 'stroke-width': '1.2', 'stroke-dasharray': '4 3' }));
    }
    // 移动的对话词元沿链前进
    var tok = svgEl('circle', { r: '7', fill: WARN });
    var mpath = 'M' + ax[0] + ',' + ay[0] + ' L' + ax[1] + ',' + ay[1] + ' L' + ax[2] + ',' + ay[2] + ' L' + ax[0] + ',' + ay[0];
    tok.appendChild(motion(mpath, '0;0.33;0.66;1', '0;0.249;0.519;1', period));
    for (i = 0; i < 3; i++) {
      var lit = i === 0 ? '0;0.05;0.28;0.33' : (i === 1 ? '0.33;0.38;0.61;0.66' : '0.66;0.71;0.94;1');
      var kt = i === 0 ? '0;0.05;0.28;0.33;1' : (i === 1 ? '0;0.33;0.38;0.61;0.66;1' : '0;0.66;0.71;0.94;1');
      var vals = i === 0 ? (SURF + ';' + BP + ';' + BP + ';' + SURF + ';' + SURF)
        : i === 1 ? (SURF + ';' + SURF + ';' + BP + ';' + BP + ';' + SURF + ';' + SURF)
          : (SURF + ';' + SURF + ';' + BP + ';' + BP + ';' + SURF);
      var c = svgEl('circle', { cx: ax[i], cy: ay[i], r: '24', stroke: BP, 'stroke-width': '2', fill: SURF });
      c.appendChild(anim('fill', vals, kt, period));
      svg.appendChild(c);
      svg.appendChild(txt(ax[i], ay[i] + 4, names[i], '9', BP));
    }
    svg.appendChild(tok);
    svg.appendChild(txt(W / 2, H - 14, '交接工具返回下一个智能体；持有令牌者负责当前编排', '10', MUTE));
    shell(host, '交接路由（Handoff Routing）', '将对话交给下一个智能体', svg,
      'OpenAI Swarm 将编排（Orchestration）简化为两个原语：例程（Routine，即提示词加工具）和交接（Handoff，即返回下一个智能体的工具）。它不使用状态机。模型通过调用合适的交接工具完成路由，当前持有对话的智能体就是负责人。');
  }

  // ── sw-agent-card-discovery: 客户端读取智能体卡片（Agent Card），再推动任务
  //    经过各生命周期状态（Lifecycle states），采用 A2A ──
  function agentCard(host) {
    var W = 520, H = 250, period = 8;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var cx = 80, cy = 120;
    svg.appendChild(svgEl('rect', { x: cx - 36, y: cy - 26, width: 72, height: 52, fill: SURF, stroke: BP, 'stroke-width': '2', rx: '4' }));
    svg.appendChild(txt(cx, cy - 4, '客户端', '10', BP));
    svg.appendChild(txt(cx, cy + 12, '读取能力卡', '7', MUTE));
    // 带卡片的远程智能体
    var rx = 250, ry = 60;
    svg.appendChild(svgEl('rect', { x: rx - 40, y: ry - 22, width: 80, height: 44, fill: SURF, stroke: MUTE, 'stroke-width': '2', rx: '4' }));
    svg.appendChild(txt(rx, ry - 2, '智能体能力卡', '9', MUTE));
    svg.appendChild(txt(rx, ry + 12, '/.well-known', '7', MUTE));
    // 发现数据包（Discovery packet）：客户端 -> 卡片
    var disc = svgEl('circle', { r: '4', fill: BP });
    disc.appendChild(anim('opacity', '0;1;1;0;0', '0;0.04;0.16;0.2;1', period));
    disc.appendChild(motion('M' + cx + ',' + (cy - 20) + ' L' + rx + ',' + (ry + 14), '0;0.18;1', '0;1;1', period));
    svg.appendChild(disc);
    // 任务生命周期：submitted -> working -> completed
    var states = ['submitted', 'working', 'completed'];
    var sx = [330, 410, 480], sy = 175;
    for (var i = 0; i < 3; i++) {
      var on = i === 0 ? '0;0.2;0.45;0.5' : i === 1 ? '0.5;0.55;0.78;0.8' : '0.8;0.85;0.98;1';
      var kt = i === 0 ? '0;0.2;0.45;0.5;1' : i === 1 ? '0;0.5;0.55;0.78;0.8;1' : '0;0.8;0.85;0.98;1';
      var vals = i === 0 ? (SURF + ';' + WARN + ';' + WARN + ';' + SURF + ';' + SURF)
        : i === 1 ? (SURF + ';' + SURF + ';' + WARN + ';' + WARN + ';' + SURF + ';' + SURF)
          : (SURF + ';' + SURF + ';' + WARN + ';' + WARN + ';' + WARN);
      if (i < 2) svg.appendChild(svgEl('line', { x1: sx[i] + 14, y1: sy, x2: sx[i + 1] - 14, y2: sy, stroke: SOFT, 'stroke-width': '1.2' }));
      var c = svgEl('circle', { cx: sx[i], cy: sy, r: '13', stroke: WARN, 'stroke-width': '1.8', fill: SURF });
      c.appendChild(anim('fill', vals, kt, period));
      svg.appendChild(c);
      svg.appendChild(txt(sx[i], sy + 27, states[i], '7', MUTE));
    }
    svg.appendChild(txt(W / 2, H - 12, '通过能力卡发现 → 提交任务 → 经不透明生命周期返回交付物', '9', MUTE));
    shell(host, 'A2A 发现（Discovery）', '先读取能力卡，再提交任务', svg,
      '智能体间协议（Agent2Agent，A2A）是智能体之间横向通信的线协议（Wire Protocol）。客户端先从约定的 URL 获取智能体能力卡（Agent Card），了解远程智能体能做什么，再提交任务。任务经过内部不透明的生命周期，状态依次为已提交（submitted）、执行中（working）、已完成（completed），最终返回交付物（Artifact）。它以 HTTP 加 REST 为基础，将智能体重新定义为一等对等实体。');
  }

  // ── sw-debate-topology: 同样五个智能体重新连接，依次形成星形（Star）、链形（Chain）、
  //    树形（Tree）与图（Graph）；边在各阶段淡入淡出 ──
  function debateTopology(host) {
    var W = 520, H = 250, period = 12;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var nx = [260, 130, 390, 175, 345], ny = [70, 140, 140, 210, 210];
    // 四种拓扑（Topologies），各自为 5 个节点之间的 [a,b] 边列表
    var topos = [
      [[0, 1], [0, 2], [0, 3], [0, 4]],            // 星形（Star）
      [[0, 1], [1, 3], [3, 4], [4, 2]],            // 链形（Chain）
      [[0, 1], [0, 2], [1, 3], [1, 4]],            // 树形（Tree）
      [[0, 1], [0, 2], [1, 2], [1, 3], [2, 4], [3, 4], [0, 4]] // 图（Graph）
    ];
    var labels = ['星形（Star）', '链式（Chain）', '树形（Tree）', '图式（Graph）'];
    // 每个阶段占周期的四分之一；为各阶段构建边组
    var p, e;
    for (p = 0; p < 4; p++) {
      var lo = (p / 4), hi = ((p + 1) / 4);
      var edges = topos[p];
      for (e = 0; e < edges.length; e++) {
        var a = edges[e][0], b = edges[e][1];
        var ln = svgEl('line', { x1: nx[a], y1: ny[a], x2: nx[b], y2: ny[b], stroke: BP, 'stroke-width': '1.6', opacity: '0' });
        var kt = '0;' + lo.toFixed(3) + ';' + (lo + 0.03).toFixed(3) + ';' + (hi - 0.03).toFixed(3) + ';' + hi.toFixed(3) + ';1';
        ln.appendChild(anim('opacity', '0;0;1;1;0;0', kt, period));
        svg.appendChild(ln);
      }
      // 阶段标签
      var lt = txt(W / 2, H - 30, labels[p], '11', BP);
      lt.setAttribute('opacity', '0');
      var ktl = '0;' + lo.toFixed(3) + ';' + (lo + 0.02).toFixed(3) + ';' + (hi - 0.02).toFixed(3) + ';' + hi.toFixed(3) + ';1';
      lt.appendChild(anim('opacity', '0;0;1;1;0;0', ktl, period));
      svg.appendChild(lt);
    }
    var i;
    for (i = 0; i < 5; i++) {
      svg.appendChild(svgEl('circle', { cx: nx[i], cy: ny[i], r: '15', stroke: BP, 'stroke-width': '2', fill: SURF }));
      svg.appendChild(txt(nx[i], ny[i] + 4, String(i), '11', BP));
    }
    svg.appendChild(txt(W / 2, H - 12, '同样的智能体，不同连线；研究任务中图式更优，超过约 4 个后协调成本上升', '8', MUTE));
    shell(host, '辩论拓扑（Debate Topology）', '谁与谁交流', svg,
      '聚合 N 个智能体不只是多数投票，连接方式同样重要。星形结构让所有消息经过中心，链式依次传递，树形逐级分叉，图式允许各方辩论。MultiAgentBench 发现图式在研究任务中表现最佳，但智能体超过约四个后，协调开销（Coordination Tax）开始上升。');
  }

  // ── sw-theory-of-mind: 嵌套信念气泡（Belief bubbles），智能体 A 对 B 关于 C 的信念
  //    进行建模，通过脉动展示递归深度（Recursive depth） ──
  function theoryOfMind(host) {
    var W = 520, H = 250, period = 9;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var ax = 130, ay = 130;
    // 智能体 A
    svg.appendChild(svgEl('circle', { cx: ax, cy: ay, r: '26', stroke: BP, 'stroke-width': '2.5', fill: SURF }));
    svg.appendChild(txt(ax, ay + 4, 'A', '13', BP));
    // 右侧嵌套思考气泡：A 对 B 的模型、B 对 C 的模型
    var b1x = 300, b1y = 95, b2x = 430, b2y = 130, b3x = 380, b3y = 195;
    // 从 A 头部引出的小气泡
    svg.appendChild(svgEl('circle', { cx: ax + 30, cy: ay - 22, r: '3', fill: SOFT }));
    svg.appendChild(svgEl('circle', { cx: ax + 46, cy: ay - 36, r: '4', fill: SOFT }));
    // 第 1 层：A 认为 B 认为……
    var l1 = svgEl('ellipse', { cx: b1x, cy: b1y, rx: '56', ry: '34', stroke: BP, 'stroke-width': '1.8', fill: 'none' });
    l1.appendChild(anim('opacity', '0.25;1;1;0.25;0.25', '0;0.15;0.55;0.7;1', period));
    svg.appendChild(l1);
    svg.appendChild(txt(b1x, b1y - 14, 'A 认为', '8', MUTE));
    svg.appendChild(txt(b1x, b1y + 4, 'B', '12', BP));
    // 嵌套第 2 层：B 认为 C
    var l2 = svgEl('ellipse', { cx: b2x, cy: b2y, rx: '40', ry: '26', stroke: WARN, 'stroke-width': '1.8', fill: 'none' });
    l2.appendChild(anim('opacity', '0.15;0.15;1;1;0.15;0.15', '0;0.3;0.45;0.62;0.72;1', period));
    svg.appendChild(l2);
    svg.appendChild(txt(b2x, b2y - 10, 'B 认为', '8', MUTE));
    svg.appendChild(txt(b2x, b2y + 8, 'C', '12', WARN));
    // 最深第 3 层：C 的目标
    var l3 = svgEl('circle', { cx: b3x, cy: b3y, r: '18', stroke: MUTE, 'stroke-width': '1.6', fill: 'none' });
    l3.appendChild(anim('opacity', '0.1;0.1;0.1;1;1;0.1', '0;0.45;0.55;0.62;0.78;1', period));
    svg.appendChild(l3);
    svg.appendChild(txt(b3x, b3y + 4, '目标', '8', MUTE));
    svg.appendChild(txt(W / 2, H - 12, 'A 推理 B 如何看待 C；高阶心智理论依赖提示词条件', '9', MUTE));
    shell(host, '心智理论（Theory of Mind）', '推理他人如何理解他人', svg,
      '有效协调需要智能体相互建模。高阶心智理论（Higher-Order Theory of Mind，ToM）推理的是某个智能体对第三个智能体抱有什么信念。Riedl 在 2025 年发现，只有使用心智理论提示词时，才会出现真实且以目标为导向的行为差异；移除提示词后，表面上的协调效果无法通过统计控制检验。');
  }

  // ── sw-ctde: 集中式评论家（Centralized critic）在训练时看到所有智能体，随后
  //    连接断开，去中心化行动者（Decentralized actors）仅凭局部视图运行，采用 MARL CTDE ──
  function ctde(host) {
    var W = 520, H = 250, period = 10;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var ax = [110, 260, 410], ay = 175;
    var crx = 260, cry = 60;
    // 评论家方框，仅在训练的半个周期内出现/点亮
    var critic = svgEl('rect', { x: crx - 50, y: cry - 22, width: 100, height: 44, fill: SURF, stroke: WARN, 'stroke-width': '2', rx: '4' });
    critic.appendChild(anim('opacity', '1;1;0.15;0.15;1', '0;0.45;0.52;0.95;1', period));
    svg.appendChild(critic);
    var ctxt = txt(crx, cry - 2, '集中式评价器', '9', WARN);
    ctxt.appendChild(anim('opacity', '1;1;0.2;0.2;1', '0;0.45;0.52;0.95;1', period));
    svg.appendChild(ctxt);
    var ptxt = txt(crx, cry + 13, '可见全局信息', '7', MUTE);
    ptxt.appendChild(anim('opacity', '1;1;0;0;1', '0;0.45;0.52;0.95;1', period));
    svg.appendChild(ptxt);
    var i;
    for (i = 0; i < 3; i++) {
      // 评论家到行动者的连接，仅在训练的半个周期内可见
      var ln = svgEl('line', { x1: crx, y1: cry + 22, x2: ax[i], y2: ay - 22, stroke: WARN, 'stroke-width': '1.4', 'stroke-dasharray': '4 3' });
      ln.appendChild(anim('opacity', '1;1;0;0;1', '0;0.45;0.52;0.95;1', period));
      svg.appendChild(ln);
      // 行动者（Actor）
      svg.appendChild(svgEl('rect', { x: ax[i] - 28, y: ay - 22, width: 56, height: 44, fill: SURF, stroke: BP, 'stroke-width': '2', rx: '3' }));
      svg.appendChild(txt(ax[i], ay + 2, '策略 ' + i, '8', BP));
      svg.appendChild(txt(ax[i], ay + 15, '局部观测', '7', MUTE));
    }
    // 阶段标签在训练/执行之间切换
    var tl = txt(W / 2, H - 30, '训练：评价器可见全局信息', '10', WARN);
    tl.appendChild(anim('opacity', '1;1;0;0;1', '0;0.45;0.5;0.95;1', period));
    svg.appendChild(tl);
    var el2 = txt(W / 2, H - 30, '执行：各策略独立运行', '10', BP);
    el2.setAttribute('opacity', '0');
    el2.appendChild(anim('opacity', '0;0;1;1;0', '0;0.5;0.55;0.92;1', period));
    svg.appendChild(el2);
    svg.appendChild(txt(W / 2, H - 12, '集中训练、分散执行；训练时使用全局信息，测试时使用局部策略', '9', MUTE));
    shell(host, '集中训练、分散执行（CTDE）', '训练看全局，执行用局部观测', svg,
      '集中训练、分散执行（Centralized Training, Decentralized Execution，CTDE）是合作式多智能体强化学习（Multi-Agent Reinforcement Learning，MARL）的基础。训练时，评价器（Critic）可见所有智能体的状态与动作，解决独立学习者面临的非平稳性（Non-Stationarity）。测试时不再使用评价器，每个策略执行器（Actor）仅依据自身局部观测运行。MADDPG、QMIX 和 MAPPO 是这种训练与执行分离思路的三种实现。');
  }

  // ── sw-checkpoint-replay: 工作器推进任务后崩溃，租约（Lease）
  //    被释放，新工作器从最近检查点（Checkpoint）恢复 ──
  function checkpointReplay(host) {
    var W = 520, H = 250, period = 10;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    // 检查点日志：一条线上有四个步骤
    var stx = [110, 210, 310, 410], sty = 80;
    var i;
    svg.appendChild(svgEl('line', { x1: 80, y1: sty, x2: 440, y2: sty, stroke: SOFT, 'stroke-width': '1.4' }));
    for (i = 0; i < 4; i++) {
      var lit = i === 0 ? '0;0.05;1' : i === 1 ? '0;0.2;0.25;1' : i === 2 ? '0;0.35;0.4;1' : '0;0.78;0.83;1';
      var vals = i === 0 ? (SURF + ';' + BP + ';' + BP) : i === 1 ? (SURF + ';' + SURF + ';' + BP + ';' + BP) : i === 2 ? (SURF + ';' + SURF + ';' + BP + ';' + BP) : (SURF + ';' + SURF + ';' + BP + ';' + BP);
      var c = svgEl('rect', { x: stx[i] - 11, y: sty - 11, width: 22, height: 22, rx: '3', stroke: BP, 'stroke-width': '1.8', fill: SURF });
      c.appendChild(anim('fill', vals, lit, period));
      svg.appendChild(c);
      svg.appendChild(txt(stx[i], sty + 26, '检查点 ' + i, '7', MUTE));
    }
    // 工作器 A：运行到 ckpt2 后崩溃，变为 warn 色并淡出
    var wa = svgEl('g', {});
    wa.appendChild(svgEl('rect', { x: -26, y: -20, width: 52, height: 40, rx: '3', stroke: BP, 'stroke-width': '2', fill: SURF }));
    wa.appendChild(txt(0, 5, '进程 A', '8', BP));
    var waPath = 'M' + stx[0] + ',150 L' + stx[2] + ',150 L' + stx[2] + ',150';
    wa.appendChild(svgEl('animateMotion', { path: waPath, keyTimes: '0;0.4;1', keyPoints: '0;1;1', dur: period + 's', repeatCount: 'indefinite', calcMode: 'linear' }));
    wa.appendChild(anim('opacity', '1;1;1;0.15;0.15', '0;0.4;0.45;0.5;1', period));
    svg.appendChild(wa);
    // ckpt2 处的崩溃标记
    var crash = txt(stx[2], 120, '崩溃', '9', WARN);
    crash.appendChild(anim('opacity', '0;0;1;1;0;0', '0;0.42;0.46;0.55;0.6;1', period));
    svg.appendChild(crash);
    // 工作器 B：出现，从 ckpt2 恢复并推进到 ckpt3
    var wb = svgEl('g', {});
    wb.appendChild(svgEl('rect', { x: -26, y: -20, width: 52, height: 40, rx: '3', stroke: WARN, 'stroke-width': '2', fill: SURF }));
    wb.appendChild(txt(0, 5, '进程 B', '8', WARN));
    var wbPath = 'M' + stx[2] + ',200 L' + stx[2] + ',200 L' + stx[3] + ',200';
    wb.appendChild(svgEl('animateMotion', { path: wbPath, keyTimes: '0;0.55;1', keyPoints: '0;0;1', dur: period + 's', repeatCount: 'indefinite', calcMode: 'linear' }));
    wb.appendChild(anim('opacity', '0;0;1;1;1', '0;0.5;0.55;0.95;1', period));
    svg.appendChild(wb);
    svg.appendChild(txt(W / 2, H - 12, '崩溃后释放租约，进程 B 从最新持久化检查点恢复', '9', MUTE));
    shell(host, '检查点重放（Checkpoint Replay）', '崩溃后恢复执行', svg,
      '持久执行（Durable Execution）使多智能体系统能从单台笔记本扩展出去。运行时在每一步结束后写入检查点（Checkpoint），以线程标识（Thread ID）作为键。工作进程在执行中崩溃后，其租约（Lease）被释放，另一进程接手任务，从最后提交的检查点恢复，无需从头开始。');
  }

  LF.register({
    'sw-contract-net': contractNet,
    'sw-work-stealing': workStealing,
    'sw-handoff-routing': handoffRouting,
    'sw-agent-card-discovery': agentCard,
    'sw-debate-topology': debateTopology,
    'sw-theory-of-mind': theoryOfMind,
    'sw-ctde': ctde,
    'sw-checkpoint-replay': checkpointReplay
  });
})();
