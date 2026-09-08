/* figures-workbench.js：智能体工作台（Agent Workbench）短路线与阶段 14 后期课程的动画图解。
   在 lesson-figures.js 之后加载，通过 window.LF 注册。
   无依赖，使用 ES5，以 CSS 变量设置主题。动画仅使用 SMIL，没有 JS 渲染循环。
   编写课程时，在 ```figure 块中填入下方某个组件的名称。 */
(function () {
  'use strict';
  var LF = window.LF;
  if (!LF) { return; }
  var el = LF.el, svgEl = LF.svgEl;

  function shell(host, label, sub, svg, cap) {
    host.appendChild(el('div', { class: 'lf' }, [
      el('div', { class: 'lf-head' }, [el('span', { class: 'lf-label' }, [label]), el('span', {}, [sub])]),
      el('div', { class: 'lf-body' }, [el('div', { class: 'lf-out' }, [svg])]),
      el('div', { class: 'lf-cap' }, [cap])
    ]));
  }
  function txt(x, y, s, size, fill, anchor) {
    var t = svgEl('text', { x: x, y: y, 'text-anchor': anchor || 'middle', 'font-family': 'var(--font-mono,monospace)', 'font-size': size || '10', fill: fill || 'var(--ink,#1a1a1a)' });
    t.appendChild(document.createTextNode(s));
    return t;
  }
  function box(x, y, w, h, stroke, fill) {
    return svgEl('rect', { x: x, y: y, width: w, height: h, rx: '4', fill: fill || 'var(--bg-surface,#eee)', stroke: stroke || 'var(--rule-soft,#ddd)', 'stroke-width': '1.5' });
  }
  function sp(n) { var s = [], i; for (i = 0; i < n; i++) { s.push('0.23 1 0.32 1'); } return s.join(';'); }
  function seq(attr, vals, times, dur, splines) {
    var a = { attributeName: attr, values: vals, keyTimes: times, dur: dur, repeatCount: 'indefinite' };
    if (splines) { a.calcMode = 'spline'; a.keySplines = splines; }
    return svgEl('animate', a);
  }
  /* 入场动画：从透明、约 95% 大小淡入，停留后以快于入场的速度退出。
     kids 中的图元必须以 (0,0) 为中心绘制。 */
  function popG(x, y, kids, times, dur) {
    var g = svgEl('g', { transform: 'translate(' + x + ' ' + y + ')' }, kids);
    g.appendChild(seq('opacity', '0;0;1;1;0;0', times, dur, sp(5)));
    g.appendChild(svgEl('animateTransform', { attributeName: 'transform', type: 'scale', additive: 'sum', values: '0.95;0.95;1;1;0.98;0.98', keyTimes: times, dur: dur, repeatCount: 'indefinite' }));
    return g;
  }
  function fly(node, path, dur, kp, kt) {
    node.appendChild(svgEl('animateMotion', { path: path, dur: dur, repeatCount: 'indefinite', keyPoints: kp, keyTimes: kt, calcMode: 'linear' }));
    return node;
  }
  function dot(r, fill) { return svgEl('circle', { cx: '0', cy: '0', r: r || '5', fill: fill || 'var(--blueprint,#3553ff)' }); }

  // wb-runtime-spawn：每个请求实例化全新智能体，处理完即销毁。
  function runtimeSpawn(host) {
    var W = 520, H = 230, D = '3.6s';
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    svg.appendChild(svgEl('line', { x1: 30, y1: 90, x2: 205, y2: 90, stroke: 'var(--rule-soft,#ddd)', 'stroke-width': '1', 'stroke-dasharray': '3 3' }));
    svg.appendChild(svgEl('line', { x1: 315, y1: 90, x2: 490, y2: 90, stroke: 'var(--rule-soft,#ddd)', 'stroke-width': '1', 'stroke-dasharray': '3 3' }));
    svg.appendChild(txt(70, 74, '请求', '9', 'var(--ink-mute,#777)'));
    svg.appendChild(txt(450, 74, '响应', '9', 'var(--ink-mute,#777)'));
    var req = dot('5');
    req.appendChild(seq('opacity', '0;1;1;0;0', '0;0.05;0.26;0.3;1', D));
    svg.appendChild(fly(req, 'M35 90 H205', D, '0;1;1', '0;0.3;1'));
    var agent = popG(260, 90, [
      box(-46, -25, 92, 50, 'var(--blueprint,#3553ff)'),
      txt(0, -3, '智能体（Agent）', '11'),
      txt(0, 13, '全新实例，约微秒级创建', '7.5', 'var(--ink-mute,#777)')
    ], '0;0.3;0.4;0.78;0.84;1', D);
    svg.appendChild(agent);
    var link = svgEl('line', { x1: 260, y1: 115, x2: 260, y2: 152, stroke: 'var(--warn,#b8870f)', 'stroke-width': '1.5', 'stroke-dasharray': '4 3' });
    link.appendChild(seq('opacity', '0;0;1;1;0;0', '0;0.42;0.47;0.6;0.64;1', D));
    svg.appendChild(link);
    svg.appendChild(box(200, 152, 120, 34, 'var(--rule-soft,#ddd)'));
    svg.appendChild(txt(260, 173, '会话存储', '9.5', 'var(--ink-soft,#555)'));
    var res = dot('5');
    res.appendChild(seq('opacity', '0;0;1;1;0;0', '0;0.64;0.68;0.86;0.9;1', D));
    svg.appendChild(fly(res, 'M315 90 H485', D, '0;0;1;1', '0;0.64;0.88;1'));
    svg.appendChild(txt(260, 214, '无状态循环：智能体用完即销毁，会话状态则保留', '9.5', 'var(--ink-mute,#777)'));
    shell(host, '生产运行时（Production Runtime）', '每个请求创建一个全新智能体',
      svg,
      'Agno 推荐的生产形态是按会话划分的无状态后端：每个请求在微秒级时间内实例化一个全新智能体，会话状态保存在存储中，响应返回后销毁智能体。Mastra 在 TypeScript 中采用相同思路，通过标准服务器适配器提供有类型约束的智能体（Agents）、工具（Tools）和工作流（Workflows）。');
  }

  // wb-trace-ingest：跨度堆叠成瀑布图，评判器为其中一个评分。
  function traceIngest(host) {
    var W = 520, H = 250, D = '4.8s';
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    svg.appendChild(box(38, 96, 104, 46, 'var(--blueprint,#3553ff)'));
    svg.appendChild(txt(90, 123, '智能体运行', '10.5'));
    var feed = svgEl('line', { x1: 142, y1: 119, x2: 228, y2: 119, stroke: 'var(--ink-soft,#555)', 'stroke-width': '1.4', 'stroke-dasharray': '5 4' });
    feed.appendChild(seq('stroke-dashoffset', '18;0;18', '0;0.5;1', D));
    svg.appendChild(feed);
    svg.appendChild(svgEl('rect', { x: 228, y: 30, width: 262, height: 192, rx: '5', fill: 'none', stroke: 'var(--rule-soft,#ddd)', 'stroke-width': '1.5', 'stroke-dasharray': '5 4' }));
    svg.appendChild(txt(359, 48, '可观测性平台（Observability Platform）', '9', 'var(--ink-mute,#777)'));
    var spans = [
      { x: 244, y: 66, w: 196, lb: '运行' },
      { x: 258, y: 92, w: 124, lb: '规划' },
      { x: 276, y: 118, w: 152, lb: '工具调用' },
      { x: 296, y: 144, w: 96, lb: '模型调用' }
    ];
    var i;
    for (i = 0; i < spans.length; i++) {
      var s = spans[i], t0 = (0.1 + i * 0.11).toFixed(2), t1 = (0.18 + i * 0.11).toFixed(2);
      var g = popG(s.x + s.w / 2, s.y + 7, [
        svgEl('rect', { x: -s.w / 2, y: -7, width: s.w, height: 14, rx: '2', fill: 'var(--blueprint,#3553ff)', opacity: (1 - i * 0.18).toFixed(2) }),
        txt(-s.w / 2 + 4, 3, s.lb, '7.5', 'var(--bg,#fafaf5)', 'start')
      ], '0;' + t0 + ';' + t1 + ';0.86;0.9;1', D);
      svg.appendChild(g);
    }
    var judge = popG(430, 151, [
      svgEl('circle', { cx: 0, cy: 0, r: 13, fill: 'var(--bg,#fafaf5)', stroke: 'var(--warn,#b8870f)', 'stroke-width': '1.5' }),
      txt(0, 3, '评估', '7', 'var(--warn,#b8870f)')
    ], '0;0.6;0.68;0.86;0.9;1', D);
    svg.appendChild(judge);
    var verdict = popG(359, 196, [txt(0, 3, 'LLM 评判器：有据可依，无幻觉', '8.5', 'var(--warn,#b8870f)')],
      '0;0.68;0.75;0.86;0.9;1', D);
    svg.appendChild(verdict);
    svg.appendChild(txt(260, 240, '跨度逐个到达并组成瀑布图，评判器对其中一个跨度评分', '9.5', 'var(--ink-mute,#777)'));
    shell(host, '智能体可观测性（Agent Observability）', '将跨度汇成带评分的瀑布图',
      svg,
      '这是位于 OTel GenAI 之上的平台层：接收跨度（Span），渲染追踪瀑布图，并评估单个步骤。Langfuse 将其与提示词管理和会话重放结合，Phoenix 配合侧重检索增强生成（RAG）的评估与自动插桩，Opik 则结合提示词优化和 LLM 评判器的幻觉检查。');
  }

  // wb-runtime-shapes：队列、事件和 cron 入口向同一个工作进程派发任务。
  function runtimeShapes(host) {
    var W = 520, H = 250, D = '4.2s';
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var i;
    for (i = 0; i < 3; i++) {
      svg.appendChild(svgEl('rect', { x: 34 + i * 20, y: 42, width: 16, height: 16, rx: '2', fill: 'none', stroke: 'var(--blueprint,#3553ff)', 'stroke-width': '1.3' }));
    }
    svg.appendChild(txt(64, 78, '队列', '9', 'var(--ink-mute,#777)'));
    svg.appendChild(svgEl('path', { d: 'M58 104 L50 120 L58 120 L50 136', fill: 'none', stroke: 'var(--warn,#b8870f)', 'stroke-width': '2' }));
    svg.appendChild(txt(64, 152, '事件', '9', 'var(--ink-mute,#777)'));
    svg.appendChild(svgEl('circle', { cx: 56, cy: 192, r: 13, fill: 'none', stroke: 'var(--ink-soft,#555)', 'stroke-width': '1.5' }));
    var hand = svgEl('line', { x1: 56, y1: 192, x2: 56, y2: 182, stroke: 'var(--ink-soft,#555)', 'stroke-width': '1.5' });
    hand.appendChild(svgEl('animateTransform', { attributeName: 'transform', type: 'rotate', from: '0 56 192', to: '360 56 192', dur: D, repeatCount: 'indefinite' }));
    svg.appendChild(hand);
    svg.appendChild(txt(90, 196, '定时任务（cron）', '9', 'var(--ink-mute,#777)', 'start'));
    svg.appendChild(box(360, 90, 116, 62, 'var(--rule-soft,#ddd)'));
    var flash = svgEl('rect', { x: 362, y: 92, width: 112, height: 58, rx: '3', fill: 'var(--blueprint,#3553ff)', opacity: '0' });
    flash.appendChild(seq('opacity', '0;0.35;0;0.35;0;0.35;0', '0;0.28;0.4;0.6;0.72;0.92;1', D));
    svg.appendChild(flash);
    svg.appendChild(txt(418, 117, '智能体工作进程', '10.5'));
    svg.appendChild(txt(418, 133, '内部循环相同', '7.5', 'var(--ink-mute,#777)'));
    var paths = ['M96 50 L360 108', 'M96 120 L360 121', 'M96 192 L360 136'];
    var fills = ['var(--blueprint,#3553ff)', 'var(--warn,#b8870f)', 'var(--ink-soft,#555)'];
    var wins = [['0;0.04;0.26;0.3;1', '0;1;1', '0;0.28;1'],
      ['0;0.36;0.58;0.62;1', '0;0;1;1', '0;0.32;0.6;1'],
      ['0;0.68;0.9;0.94;1', '0;0;1;1', '0;0.64;0.92;1']];
    for (i = 0; i < 3; i++) {
      var d = dot('5', fills[i]);
      d.appendChild(seq('opacity', i === 0 ? '0;1;1;0;0' : '0;0;1;0;0', wins[i][0], D));
      svg.appendChild(fly(d, paths[i], D, wins[i][1], wins[i][2]));
    }
    svg.appendChild(txt(300, 226, '先选择任务接入形态，内部循环几乎不变', '9.5', 'var(--ink-mute,#777)'));
    shell(host, '运行时形态（Runtime Shapes）', '三种入口，一个工作进程',
      svg,
      '基于队列的后台工作、事件驱动触发和 cron 定时任务，是六种生产运行时形态中的三种。每种入口都将工作交给同一个智能体循环，但形态决定系统能够应对哪些故障：队列可以重试，事件可以重放，而定时任务必须假设上一次运行可能已经中断。');
  }

  // wb-seven-surfaces：围绕独立模型逐一接入工作台支撑能力。
  function sevenSurfaces(host) {
    var W = 520, H = 270, D = '6s', CX = 260, CY = 122, R = 92;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var ring = svgEl('circle', { cx: CX, cy: CY, r: R, fill: 'none', stroke: 'var(--blueprint,#3553ff)', 'stroke-width': '1', 'stroke-dasharray': '4 4' });
    ring.appendChild(seq('opacity', '0;0;0.55;0.55;0;0', '0;0.66;0.72;0.9;0.94;1', D));
    svg.appendChild(ring);
    svg.appendChild(box(CX - 42, CY - 19, 84, 38, 'var(--rule-soft,#ddd)'));
    var wob = svgEl('rect', { x: CX - 42, y: CY - 19, width: 84, height: 38, rx: '4', fill: 'none', stroke: 'var(--warn,#b8870f)', 'stroke-width': '1.5' });
    wob.appendChild(seq('opacity', '1;1;0.15;1;0;0', '0;0.05;0.1;0.15;0.24;1', D));
    svg.appendChild(wob);
    var steady = svgEl('rect', { x: CX - 42, y: CY - 19, width: 84, height: 38, rx: '4', fill: 'none', stroke: 'var(--blueprint,#3553ff)', 'stroke-width': '1.5' });
    steady.appendChild(seq('opacity', '0;0;1;1;0;0', '0;0.66;0.72;0.9;0.94;1', D));
    svg.appendChild(steady);
    svg.appendChild(txt(CX, CY + 4, '能力强的模型', '10'));
    var names = ['指令', '状态', '范围', '反馈', '验证', '审查', '交接'];
    var i;
    for (i = 0; i < 7; i++) {
      var a = -Math.PI / 2 + i * 2 * Math.PI / 7;
      var x = CX + R * Math.cos(a), y = CY + R * Math.sin(a);
      var t0 = (0.08 + i * 0.08).toFixed(2), t1 = (0.14 + i * 0.08).toFixed(2);
      svg.appendChild(popG(x, y, [
        box(-35, -11, 70, 22, 'var(--blueprint,#3553ff)', 'var(--bg,#fafaf5)'),
        txt(0, 3, names[i], '8', 'var(--blueprint,#3553ff)')
      ], '0;' + t0 + ';' + t1 + ';0.9;0.94;1', D));
    }
    svg.appendChild(txt(CX, 258, '模型保持不变，改变的是工作台提供的支撑能力', '9.5', 'var(--ink-mute,#777)'));
    shell(host, '工作台（The Workbench）', '围绕模型逐一接入七项支撑能力',
      svg,
      '单独使用前沿模型时，表现并不稳定：代码看似合理，却没有完成标准，也没有记录它作出的假设。随着指令、状态、范围、反馈、验证、审查和交接这七项工作台支撑能力（Workbench Surfaces）逐一接入，可靠性才随之建立。移除任何一项，相应的故障模式就会再次出现。');
  }

  // wb-three-files：围绕三个工作台文件进行读取、工作、写入的循环。
  function threeFiles(host) {
    var W = 520, H = 250, D = '5s';
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    svg.appendChild(box(50, 98, 110, 54, 'var(--blueprint,#3553ff)'));
    svg.appendChild(txt(105, 122, '智能体循环', '10.5'));
    var work = txt(105, 138, '工作中……', '7.5', 'var(--ink-mute,#777)');
    work.appendChild(seq('opacity', '0;0;1;1;0;0', '0;0.34;0.4;0.56;0.6;1', D));
    svg.appendChild(work);
    var files = [
      { y: 40, lb: 'AGENTS.md', sub: '根目录路由入口' },
      { y: 108, lb: 'agent_state.json', sub: '持久状态' },
      { y: 176, lb: 'task_board.json', sub: '进行中 / 受阻 / 下一项' }
    ];
    var i;
    for (i = 0; i < files.length; i++) {
      svg.appendChild(box(320, files[i].y, 160, 42, 'var(--rule-soft,#ddd)'));
      svg.appendChild(txt(400, files[i].y + 18, files[i].lb, '9'));
      svg.appendChild(txt(400, files[i].y + 32, files[i].sub, '7.5', 'var(--ink-mute,#777)'));
    }
    var reads = [
      ['M160 110 L320 58', '0;0.03;0.15;0.18;1', '0;1;1', '0;0.16;1'],
      ['M160 118 L320 126', '0;0.2;0.3;0.33;1', '0;0;1;1', '0;0.19;0.31;1']
    ];
    for (i = 0; i < reads.length; i++) {
      var rd = dot('4.5');
      rd.appendChild(seq('opacity', i === 0 ? '0;1;1;0;0' : '0;0;1;0;0', reads[i][1], D));
      svg.appendChild(fly(rd, reads[i][0], D, reads[i][2], reads[i][3]));
    }
    var writes = [
      ['M160 128 L320 132', '0;0.62;0.72;0.75;1', '0;0;1;1', '0;0.61;0.73;1', 152],
      ['M160 140 L320 194', '0;0.78;0.88;0.91;1', '0;0;1;1', '0;0.77;0.89;1', 220]
    ];
    for (i = 0; i < writes.length; i++) {
      var wr = dot('4.5', 'var(--warn,#b8870f)');
      wr.appendChild(seq('opacity', '0;0;1;0;0', writes[i][1], D));
      svg.appendChild(fly(wr, writes[i][0], D, writes[i][2], writes[i][3]));
      var mark = svgEl('rect', { x: 466, y: writes[i][4] - 40, width: 8, height: 8, rx: '1', fill: 'var(--warn,#b8870f)' });
      mark.appendChild(seq('opacity', '0;0;1;1;0;0', '0;' + (0.72 + i * 0.16).toFixed(2) + ';' + (0.76 + i * 0.16).toFixed(2) + ';0.94;0.97;1', D));
      svg.appendChild(mark);
    }
    svg.appendChild(txt(260, 236, '轮次开始时读取（蓝色），结束时写入（琥珀色）', '9.5', 'var(--ink-mute,#777)'));
    shell(host, '最小工作台（Minimal Workbench）', '三个文件，一个循环',
      svg,
      '最小可用工作台包含：智能体首先读取的简短根目录路由入口，行动前读取、行动后写入的状态文件，以及标明进行中、受阻和下一项工作的任务看板。每轮以读取开始、以写入结束，整个循环都不依赖聊天历史能够保留下来。');
  }

  // wb-rule-checkoff：对照一次真实运行，逐条检查规则集并评分。
  function ruleCheckoff(host) {
    var W = 520, H = 250, D = '4.4s';
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    svg.appendChild(svgEl('rect', { x: 40, y: 36, width: 280, height: 176, rx: '5', fill: 'none', stroke: 'var(--rule-soft,#ddd)', 'stroke-width': '1.5' }));
    svg.appendChild(txt(180, 28, 'docs/agent-rules.md', '9', 'var(--ink-mute,#777)'));
    var scan = svgEl('rect', { x: 46, y: 48, width: 268, height: 30, rx: '3', fill: 'var(--bg-surface,#eee)' });
    scan.appendChild(seq('y', '48;48;88;128;168;168', '0;0.08;0.26;0.46;0.66;1', D));
    scan.appendChild(seq('opacity', '0;0.9;0.9;0.9;0.9;0', '0;0.08;0.26;0.46;0.7;1', D));
    svg.appendChild(scan);
    var rules = ['启动：任何编辑前都已运行初始化', '禁止：不得写入范围外文件', '完成：测试确实已运行', '不确定：作出假设前先询问'];
    var pass = [true, false, true, true];
    var i;
    for (i = 0; i < 4; i++) {
      var y = 63 + i * 40;
      svg.appendChild(txt(54, y + 4, rules[i], '8.5', 'var(--ink-soft,#555)', 'start'));
      var t0 = (0.14 + i * 0.2).toFixed(2), t1 = (0.2 + i * 0.2).toFixed(2);
      var mark = pass[i]
        ? svgEl('path', { d: 'M-6 0 L-2 5 L7 -6', fill: 'none', stroke: 'var(--blueprint,#3553ff)', 'stroke-width': '2.5' })
        : svgEl('path', { d: 'M-5 -5 L5 5 M5 -5 L-5 5', fill: 'none', stroke: 'var(--warn,#b8870f)', 'stroke-width': '2.5' });
      svg.appendChild(popG(300, y, [mark], '0;' + t0 + ';' + t1 + ';0.92;0.96;1', D));
    }
    svg.appendChild(box(360, 60, 130, 56, 'var(--rule-soft,#ddd)'));
    svg.appendChild(txt(425, 84, '运行交付物', '9'));
    svg.appendChild(txt(425, 99, '差异 + 反馈日志', '7.5', 'var(--ink-mute,#777)'));
    svg.appendChild(popG(425, 160, [
      txt(0, -4, '得分 3 / 4', '11', 'var(--warn,#b8870f)'),
      txt(0, 12, '一项违规，明确指出', '7.5', 'var(--ink-mute,#777)')
    ], '0;0.78;0.85;0.92;0.96;1', D));
    svg.appendChild(txt(260, 238, '每条规则都是检查项，而非愿望', '9.5', 'var(--ink-mute,#777)'));
    shell(host, '用规则约束行为（Rules as Constraints）', '根据规则集为一次运行评分',
      svg,
      '文字指令只说“要小心”，约束则指出哪个检查失败。规则检查器对照运行交付物逐条检查规则集，将每条规则标为通过或失败，使违规成为报告中明确列出的一行，而非模糊感受。便于差异比较的规则，让审查者准确看到哪项约束发生了变化。');
  }

  // wb-state-persist：聊天消失，仓库文件跨会话边界保留。
  function statePersist(host) {
    var W = 520, H = 260, D = '5s';
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    svg.appendChild(txt(50, 32, '聊天（易失）', '9', 'var(--ink-mute,#777)', 'start'));
    var bx = [60, 190, 320], i;
    for (i = 0; i < 3; i++) {
      var t0 = (0.04 + i * 0.06).toFixed(2), t1 = (0.09 + i * 0.06).toFixed(2);
      svg.appendChild(popG(bx[i] + 55, 56, [
        svgEl('rect', { x: -55, y: -12, width: 110, height: 24, rx: '11', fill: 'var(--bg-surface,#eee)', stroke: 'var(--rule-soft,#ddd)', 'stroke-width': '1.2' }),
        txt(0, 3, i === 0 ? '让我检查一下……' : i === 1 ? '正在编辑 utils.py' : '我想，已经完成了', '8', 'var(--ink-soft,#555)')
      ], '0;' + t0 + ';' + t1 + ';0.42;0.47;1', D));
    }
    var ends = txt(260, 96, '会话结束', '9', 'var(--warn,#b8870f)');
    ends.appendChild(seq('opacity', '0;0;1;1;0;0', '0;0.42;0.47;0.58;0.62;1', D));
    svg.appendChild(ends);
    svg.appendChild(svgEl('line', { x1: 40, y1: 108, x2: 480, y2: 108, stroke: 'var(--rule-soft,#ddd)', 'stroke-width': '1', 'stroke-dasharray': '4 4' }));
    svg.appendChild(txt(50, 126, '仓库（持久）', '9', 'var(--ink-mute,#777)', 'start'));
    var wd = dot('4.5', 'var(--warn,#b8870f)');
    wd.appendChild(seq('opacity', '0;0;1;1;0;0', '0;0.16;0.19;0.3;0.33;1', D));
    svg.appendChild(fly(wd, 'M115 68 L150 178 L196 178', D, '0;0;0.7;1;1', '0;0.16;0.26;0.33;1'));
    var dia = svgEl('path', { d: 'M150 164 L164 178 L150 192 L136 178 Z', fill: 'var(--bg,#fafaf5)', stroke: 'var(--rule-soft,#ddd)', 'stroke-width': '1.3' });
    dia.appendChild(seq('stroke', 'var(--rule-soft,#ddd);var(--rule-soft,#ddd);var(--blueprint,#3553ff);var(--rule-soft,#ddd);var(--rule-soft,#ddd)', '0;0.24;0.28;0.34;1', D));
    svg.appendChild(dia);
    svg.appendChild(txt(150, 206, '结构定义（Schema）', '7.5', 'var(--ink-mute,#777)'));
    svg.appendChild(box(196, 150, 160, 58, 'var(--blueprint,#3553ff)', 'var(--bg,#fafaf5)'));
    svg.appendChild(txt(276, 172, 'agent_state.json', '9.5', 'var(--blueprint,#3553ff)'));
    var r6 = txt(276, 190, '版本 6', '8', 'var(--ink-mute,#777)');
    r6.appendChild(seq('opacity', '1;1;0;0;1', '0;0.3;0.36;0.97;1', D));
    svg.appendChild(r6);
    var r7 = txt(276, 190, '版本 7 · 原子写入', '8', 'var(--ink-mute,#777)');
    r7.appendChild(seq('opacity', '0;0;1;1;0', '0;0.3;0.36;0.97;1', D));
    svg.appendChild(r7);
    var next = popG(430, 178, [
      txt(0, -4, '下一次会话', '8.5', 'var(--blueprint,#3553ff)'),
      txt(0, 10, '读取同一个文件', '7.5', 'var(--ink-mute,#777)')
    ], '0;0.66;0.74;0.92;0.96;1', D);
    svg.appendChild(next);
    svg.appendChild(txt(260, 244, '聊天消失，仓库仍保留记录', '9.5', 'var(--ink-mute,#777)'));
    shell(host, '仓库记忆（Repo Memory）', '状态跨会话边界保留',
      svg,
      '会话结束时聊天气泡消失，状态文件却会保留下来。数据写入磁盘前必须通过结构校验（Schema Validation），版本号以原子方式递增。下一次会话、下一个智能体和审查者都读取同一个受版本管理的文件，无需重新推断上次工作停在何处。');
  }

  // wb-init-probes：健康检查指示灯全部亮起后，门禁才会打开。
  function initProbes(host) {
    var W = 520, H = 260, D = '4.6s';
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var probes = ['运行时', '依赖', '路径', '测试'];
    var i;
    for (i = 0; i < 4; i++) {
      var y = 52 + i * 44;
      var t0 = (0.08 + i * 0.13).toFixed(2), t1 = (0.14 + i * 0.13).toFixed(2);
      var lamp = svgEl('circle', { cx: 70, cy: y, r: 9, fill: 'var(--bg-surface,#eee)', stroke: 'var(--rule-soft,#ddd)', 'stroke-width': '1.5' });
      lamp.appendChild(seq('fill', 'var(--bg-surface,#eee);var(--bg-surface,#eee);var(--blueprint,#3553ff);var(--blueprint,#3553ff);var(--bg-surface,#eee)', '0;' + t0 + ';' + t1 + ';0.92;1', D));
      svg.appendChild(lamp);
      svg.appendChild(txt(90, y + 4, probes[i], '9', 'var(--ink-soft,#555)', 'start'));
      var row = svgEl('rect', { x: 196, y: y - 5, width: 96, height: 10, rx: '2', fill: 'var(--blueprint,#3553ff)', opacity: '0' });
      row.appendChild(seq('opacity', '0;0;0.75;0.75;0;0', '0;' + t1 + ';' + (0.2 + i * 0.13).toFixed(2) + ';0.88;0.92;1', D));
      svg.appendChild(row);
    }
    svg.appendChild(svgEl('rect', { x: 186, y: 30, width: 116, height: 186, rx: '5', fill: 'none', stroke: 'var(--rule-soft,#ddd)', 'stroke-width': '1.5' }));
    svg.appendChild(txt(244, 232, 'init_report.json', '8.5', 'var(--ink-mute,#777)'));
    var gate = svgEl('rect', { x: 366, y: 82, width: 8, height: 84, rx: '2', fill: 'var(--ink-soft,#555)' });
    gate.appendChild(svgEl('animateTransform', { attributeName: 'transform', type: 'translate', values: '0 0;0 0;0 -84;0 -84;0 0', keyTimes: '0;0.62;0.72;0.94;1', dur: D, repeatCount: 'indefinite', calcMode: 'spline', keySplines: sp(4) }));
    svg.appendChild(gate);
    svg.appendChild(txt(370, 66, '门禁', '8', 'var(--ink-mute,#777)'));
    var run = dot('6');
    run.appendChild(seq('opacity', '0;1;1;1;0;0', '0;0.04;0.72;0.88;0.92;1', D));
    svg.appendChild(fly(run, 'M340 124 H478', D, '0;0;1;1', '0;0.72;0.86;1'));
    svg.appendChild(txt(452, 150, '工作', '8.5', 'var(--ink-mute,#777)'));
    svg.appendChild(txt(260, 254, '探测一次，持久保存结果，然后开始', '9.5', 'var(--ink-mute,#777)'));
    shell(host, '初始化脚本（Init Script）', '首次编辑前进行健康检查',
      svg,
      '在智能体开展其他操作前，一个确定性脚本探测运行时、依赖、路径和测试命令，并将每项结果写入初始化报告。只有所有指示灯亮起，门禁才会打开，实际工作才能开始；全新会话直接读取报告，无需再次付出探查成本。');
  }

  // wb-scope-bounce：一个差异落在范围内，另一个被通配路径模式挡回。
  function scopeBounce(host) {
    var W = 520, H = 250, D = '4.2s';
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    svg.appendChild(svgEl('rect', { x: 300, y: 36, width: 184, height: 72, rx: '5', fill: 'none', stroke: 'var(--blueprint,#3553ff)', 'stroke-width': '1.5', 'stroke-dasharray': '6 4' }));
    svg.appendChild(txt(392, 58, '允许', '9', 'var(--blueprint,#3553ff)'));
    svg.appendChild(txt(392, 74, 'src/auth/**', '8.5', 'var(--ink-mute,#777)'));
    svg.appendChild(svgEl('rect', { x: 300, y: 140, width: 184, height: 72, rx: '5', fill: 'none', stroke: 'var(--warn,#b8870f)', 'stroke-width': '1.5' }));
    svg.appendChild(txt(392, 162, '禁止', '9', 'var(--warn,#b8870f)'));
    svg.appendChild(txt(392, 178, 'db/** · release/**', '8.5', 'var(--ink-mute,#777)'));
    var edge = svgEl('line', { x1: 300, y1: 140, x2: 300, y2: 212, stroke: 'var(--warn,#b8870f)', 'stroke-width': '2' });
    edge.appendChild(seq('stroke-width', '2;2;6;2;2', '0;0.58;0.62;0.68;1', D));
    svg.appendChild(edge);
    var chipA = svgEl('g', {}, [
      box(-30, -12, 60, 24, 'var(--blueprint,#3553ff)', 'var(--bg,#fafaf5)'),
      txt(0, 3, '差异 A', '8.5', 'var(--blueprint,#3553ff)')
    ]);
    chipA.appendChild(seq('opacity', '0;1;1;0;0', '0;0.05;0.88;0.93;1', D));
    svg.appendChild(fly(chipA, 'M64 84 H388', D, '0;1;1', '0;0.3;1'));
    var chipB = svgEl('g', {}, [
      box(-30, -12, 60, 24, 'var(--warn,#b8870f)', 'var(--bg,#fafaf5)'),
      txt(0, 3, '差异 B', '8.5', 'var(--warn,#b8870f)')
    ]);
    chipB.appendChild(seq('opacity', '0;0;1;1;0;0', '0;0.3;0.34;0.85;0.9;1', D));
    svg.appendChild(fly(chipB, 'M64 176 L264 176 L204 196', D, '0;0;0.77;1;1', '0;0.32;0.58;0.7;1'));
    svg.appendChild(popG(150, 232, [txt(0, 3, '违规：修改了 db/**，已回滚', '8.5', 'var(--warn,#b8870f)')],
      '0;0.66;0.73;0.85;0.9;1', D));
    svg.appendChild(txt(150, 40, 'scope_contract.json', '9', 'var(--ink-mute,#777)'));
    svg.appendChild(txt(150, 56, '允许范围 + 禁止范围 + 回滚', '8', 'var(--ink-mute,#777)'));
    shell(host, '范围契约（Scope Contract）', '差异被禁止路径模式挡回',
      svg,
      '契约列出任务允许和禁止写入的位置。位于允许的通配路径模式（Glob）内的差异能够通过；偏向禁止路径的差异则撞上契约边界，被挡回并记录为带回滚计划的明确违规，由检查器当场捕获，而不是两天后才被审查者发现。');
  }

  // wb-feedback-loop：捕获的退出码反馈到下一轮。
  function feedbackLoop(host) {
    var W = 520, H = 260, D = '5s';
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    svg.appendChild(box(48, 56, 110, 50, 'var(--blueprint,#3553ff)'));
    svg.appendChild(txt(103, 85, '智能体轮次', '10'));
    svg.appendChild(box(218, 56, 100, 50, 'var(--rule-soft,#ddd)'));
    svg.appendChild(txt(268, 79, '运行器（Runner）', '10'));
    svg.appendChild(txt(268, 94, '封装命令', '7.5', 'var(--ink-mute,#777)'));
    svg.appendChild(box(382, 56, 90, 50, 'var(--rule-soft,#ddd)'));
    svg.appendChild(txt(427, 85, '命令行（shell）', '10'));
    svg.appendChild(box(190, 168, 168, 52, 'var(--rule-soft,#ddd)', 'var(--bg,#fafaf5)'));
    svg.appendChild(txt(274, 186, 'feedback_record.jsonl', '8.5', 'var(--ink-soft,#555)'));
    var rec1 = txt(274, 204, '退出码 1 · 已捕获 stderr', '8.5', 'var(--warn,#b8870f)');
    rec1.appendChild(seq('opacity', '0;0;1;1;0;0', '0;0.24;0.29;0.6;0.64;1', D));
    svg.appendChild(rec1);
    var rec2 = txt(274, 204, '退出码 0 · 412ms', '8.5', 'var(--blueprint,#3553ff)');
    rec2.appendChild(seq('opacity', '0;0;1;1;0;0', '0;0.76;0.81;0.95;0.98;1', D));
    svg.appendChild(rec2);
    svg.appendChild(svgEl('path', { d: 'M427 106 L427 194 L358 194', fill: 'none', stroke: 'var(--rule-soft,#ddd)', 'stroke-width': '1', 'stroke-dasharray': '3 3' }));
    svg.appendChild(svgEl('path', { d: 'M190 194 L103 194 L103 106', fill: 'none', stroke: 'var(--rule-soft,#ddd)', 'stroke-width': '1', 'stroke-dasharray': '3 3' }));
    var runs = [
      ['M158 74 L382 74', '0;0.03;0.17;0.2;1', '0;1;1', '0;0.18;1', 'var(--blueprint,#3553ff)', '0;1;1;0;0'],
      ['M427 106 L427 194 L358 194', '0;0.2;0.28;0.31;1', '0;0;1;1', '0;0.2;0.29;1', 'var(--warn,#b8870f)', '0;0;1;0;0'],
      ['M190 194 L103 194 L103 106', '0;0.34;0.46;0.49;1', '0;0;1;1', '0;0.34;0.47;1', 'var(--warn,#b8870f)', '0;0;1;0;0'],
      ['M158 88 L382 88', '0;0.55;0.69;0.72;1', '0;0;1;1', '0;0.55;0.7;1', 'var(--blueprint,#3553ff)', '0;0;1;0;0'],
      ['M427 106 L427 194 L358 194', '0;0.72;0.8;0.83;1', '0;0;1;1', '0;0.72;0.81;1', 'var(--blueprint,#3553ff)', '0;0;1;0;0']
    ];
    var i;
    for (i = 0; i < runs.length; i++) {
      var m = dot('4.5', runs[i][4]);
      m.appendChild(seq('opacity', runs[i][5], runs[i][1], D));
      svg.appendChild(fly(m, runs[i][0], D, runs[i][2], runs[i][3]));
    }
    svg.appendChild(txt(260, 246, '错误被反馈回来，重试依据事实作出调整', '9.5', 'var(--ink-mute,#777)'));
    shell(host, '反馈循环（Feedback Loop）', '退出码反馈到下一轮',
      svg,
      '每条命令都经过运行器，将 stdout、stderr、退出码和耗时保存为结构化记录。第一次运行以退出码 1 失败，反馈到下一轮的是这份记录，而非智能体想象的输出；随后重试获得退出码 0，留下的证据轨迹也正是门禁将要读取的内容。');
  }

  // wb-gate-sequence：差异通过前三道门禁，被第四道挡住。
  function gateSequence(host) {
    var W = 520, H = 240, D = '4.6s';
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    svg.appendChild(svgEl('line', { x1: 40, y1: 120, x2: 480, y2: 120, stroke: 'var(--rule-soft,#ddd)', 'stroke-width': '1', 'stroke-dasharray': '3 3' }));
    var gx = [150, 240, 330, 420];
    var names = ['规则', '范围', '反馈', '验收'];
    var i;
    for (i = 0; i < 4; i++) {
      var bar = svgEl('rect', { x: gx[i] - 4, y: 84, width: 8, height: 72, rx: '2', fill: i < 3 ? 'var(--ink-soft,#555)' : 'var(--warn,#b8870f)' });
      if (i < 3) {
        var tp = (0.12 + i * 0.18).toFixed(2), tq = (0.2 + i * 0.18).toFixed(2), tr = (0.3 + i * 0.18).toFixed(2);
        bar.appendChild(svgEl('animateTransform', { attributeName: 'transform', type: 'translate', values: '0 0;0 0;0 -46;0 -46;0 0;0 0', keyTimes: '0;' + tp + ';' + tq + ';' + tr + ';' + (0.38 + i * 0.18).toFixed(2) + ';1', dur: D, repeatCount: 'indefinite', calcMode: 'spline', keySplines: sp(5) }));
      } else {
        bar.appendChild(svgEl('animateTransform', { attributeName: 'transform', type: 'translate', values: '0 0;0 0;3 0;-3 0;0 0;0 0', keyTimes: '0;0.68;0.7;0.72;0.74;1', dur: D, repeatCount: 'indefinite' }));
      }
      svg.appendChild(bar);
      svg.appendChild(txt(gx[i], 174, names[i], '8.5', i < 3 ? 'var(--ink-mute,#777)' : 'var(--warn,#b8870f)'));
    }
    var chip = svgEl('g', {}, [
      box(-26, -12, 52, 24, 'var(--blueprint,#3553ff)', 'var(--bg,#fafaf5)'),
      txt(0, 3, '差异', '9', 'var(--blueprint,#3553ff)')
    ]);
    chip.appendChild(seq('opacity', '0;1;1;0;0', '0;0.05;0.9;0.95;1', D));
    svg.appendChild(fly(chip, 'M62 120 H388', D, '0;1;1', '0;0.66;1'));
    svg.appendChild(popG(300, 52, [txt(0, 3, '受阻：验收从未运行', '9', 'var(--warn,#b8870f)')],
      '0;0.72;0.78;0.9;0.94;1', D));
    svg.appendChild(popG(260, 210, [txt(0, 3, 'verification_report.json · passed: false', '8.5', 'var(--ink-mute,#777)')],
      '0;0.78;0.84;0.92;0.96;1', D));
    shell(host, '验证门禁（Verification Gate）', '按序通过门禁，得到一个判定',
      svg,
      '门禁是一个确定性函数，以智能体已经产出的交付物为输入：规则报告、范围报告、反馈记录和差异。改动通过了规则、范围和反馈检查，但没有任何验收运行记录，所以最终门禁保持关闭，done 仍为 false，不论聊天中声称了什么。');
  }

  // wb-builder-marker：交付物穿过隔墙，交给独立评分者。
  function builderMarker(host) {
    var W = 520, H = 250, D = '4.4s';
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    svg.appendChild(svgEl('line', { x1: 260, y1: 30, x2: 260, y2: 96, stroke: 'var(--ink-soft,#555)', 'stroke-width': '2' }));
    svg.appendChild(svgEl('line', { x1: 260, y1: 128, x2: 260, y2: 200, stroke: 'var(--ink-soft,#555)', 'stroke-width': '2' }));
    svg.appendChild(box(50, 82, 120, 54, 'var(--blueprint,#3553ff)'));
    svg.appendChild(txt(110, 106, '构建者（Builder）', '10.5'));
    svg.appendChild(txt(110, 122, '编写了改动', '7.5', 'var(--ink-mute,#777)'));
    svg.appendChild(box(350, 82, 130, 54, 'var(--rule-soft,#ddd)'));
    var rev = svgEl('rect', { x: 352, y: 84, width: 126, height: 50, rx: '3', fill: 'var(--blueprint,#3553ff)', opacity: '0' });
    rev.appendChild(seq('opacity', '0;0;0.3;0;0', '0;0.4;0.47;0.54;1', D));
    svg.appendChild(rev);
    svg.appendChild(txt(415, 106, '审查者（Reviewer）', '10.5'));
    svg.appendChild(txt(415, 122, '只读，使用独立提示词', '7.5', 'var(--ink-mute,#777)'));
    var bundle = svgEl('g', {}, [
      svgEl('rect', { x: -24, y: -16, width: 44, height: 24, rx: '3', fill: 'var(--bg,#fafaf5)', stroke: 'var(--rule-soft,#ddd)', 'stroke-width': '1.2' }),
      svgEl('rect', { x: -18, y: -8, width: 44, height: 24, rx: '3', fill: 'var(--bg,#fafaf5)', stroke: 'var(--blueprint,#3553ff)', 'stroke-width': '1.2' }),
      txt(4, 8, '交付物', '7', 'var(--blueprint,#3553ff)')
    ]);
    bundle.appendChild(seq('opacity', '0;0;1;1;0;0', '0;0.08;0.14;0.36;0.4;1', D));
    svg.appendChild(fly(bundle, 'M196 110 L330 110', D, '0;0;1;1', '0;0.14;0.34;1'));
    svg.appendChild(popG(415, 190, [
      box(-62, -20, 124, 40, 'var(--rule-soft,#ddd)', 'var(--bg,#fafaf5)'),
      txt(0, -3, 'review_report.json', '8.5', 'var(--ink-soft,#555)'),
      txt(0, 12, '按评分标准逐条打分', '7.5', 'var(--ink-mute,#777)'),
      svgEl('circle', { cx: 48, cy: -12, r: 10, fill: 'none', stroke: 'var(--warn,#b8870f)', 'stroke-width': '1.5' })
    ], '0;0.56;0.66;0.9;0.94;1', D));
    svg.appendChild(txt(260, 236, '交付物穿过隔墙，编辑操作不会反向穿回', '9.5', 'var(--ink-mute,#777)'));
    shell(host, '审查智能体（Reviewer Agent）', '构建者输出交给独立评分者',
      svg,
      '构建者不能为自己的工作评分，因此交付物穿过隔墙上的槽口，交给另一个循环：它使用不同的系统提示词、不同的目标，并且只有只读权限。审查者按照评分标准（Rubric）逐条评分并输出报告；它的任何操作都不能修改构建者的产出。');
  }

  // wb-handoff-packet：状态沿弧线跨越会话间隔。
  function handoffPacket(host) {
    var W = 520, H = 260, D = '5.2s';
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var left = svgEl('g', {}, [
      svgEl('rect', { x: 40, y: 50, width: 172, height: 124, rx: '5', fill: 'none', stroke: 'var(--rule-soft,#ddd)', 'stroke-width': '1.5' }),
      txt(126, 68, '会话 n', '9', 'var(--ink-mute,#777)')
    ]);
    left.appendChild(seq('opacity', '1;1;0.3;0.3;1', '0;0.5;0.58;0.96;1', D));
    svg.appendChild(left);
    var chips = [['状态', 70, 96], ['判定', 70, 128], ['审查', 70, 160]];
    var i;
    for (i = 0; i < 3; i++) {
      var c = svgEl('g', {}, [
        svgEl('rect', { x: -26, y: -10, width: 52, height: 20, rx: '3', fill: 'var(--bg-surface,#eee)', stroke: 'var(--rule-soft,#ddd)', 'stroke-width': '1.2' }),
        txt(0, 3, chips[i][0], '7.5', 'var(--ink-soft,#555)')
      ]);
      c.appendChild(seq('opacity', '0;1;1;0;0', '0;' + (0.04 + i * 0.03).toFixed(2) + ';0.3;0.36;1', D));
      svg.appendChild(fly(c, 'M' + (chips[i][1] + 26) + ' ' + chips[i][2] + ' L172 150', D, '0;0;1;1', '0;0.22;0.34;1'));
    }
    var packet = svgEl('g', {}, [
      box(-34, -15, 68, 30, 'var(--blueprint,#3553ff)', 'var(--bg,#fafaf5)'),
      txt(0, 4, '交接', '8.5', 'var(--blueprint,#3553ff)')
    ]);
    packet.appendChild(seq('opacity', '0;0;1;1;0;0', '0;0.34;0.4;0.62;0.66;1', D));
    packet.appendChild(svgEl('animateMotion', { path: 'M172 150 Q260 76 348 150', dur: D, repeatCount: 'indefinite', keyPoints: '0;0;1;1', keyTimes: '0;0.44;0.6;1', calcMode: 'spline', keySplines: '0.23 1 0.32 1;0.23 1 0.32 1;0.23 1 0.32 1' }));
    svg.appendChild(packet);
    var gap = txt(260, 44, '会话边界', '8.5', 'var(--warn,#b8870f)');
    gap.appendChild(seq('opacity', '0;0;1;1;0;0', '0;0.44;0.5;0.62;0.66;1', D));
    svg.appendChild(gap);
    var right = svgEl('g', {}, [
      svgEl('rect', { x: 308, y: 50, width: 172, height: 124, rx: '5', fill: 'none', stroke: 'var(--blueprint,#3553ff)', 'stroke-width': '1.5' }),
      txt(394, 68, '会话 n+1', '9', 'var(--blueprint,#3553ff)')
    ]);
    right.appendChild(seq('opacity', '0.3;0.3;1;1;0.3', '0;0.58;0.66;0.96;1', D));
    svg.appendChild(right);
    svg.appendChild(popG(394, 132, [
      txt(0, -4, '第一步操作：', '8', 'var(--ink-mute,#777)'),
      txt(0, 10, '重跑失败的测试', '8.5', 'var(--ink,#1a1a1a)')
    ], '0;0.68;0.76;0.92;0.96;1', D));
    svg.appendChild(txt(260, 244, '改了什么、哪里失败、接下来做什么、首先执行什么', '9.5', 'var(--ink-mute,#777)'));
    shell(host, '跨会话交接（Multi-session Handoff）', '交接包携带状态跨越会话间隔',
      svg,
      '会话结束时，工作台将状态、判定和审查结果汇成一个交接包，传递到边界另一侧。旧会话淡出，新会话接入时已经知道第一步要做什么。下一个智能体在第一分钟就能开始有效工作，而不必花三十分钟重新查明上次最后三十秒做了什么。');
  }

  // wb-ab-runs：同一任务经过两条流水线，分别比较五项结果。
  function abRuns(host) {
    var W = 520, H = 260, D = '4.8s';
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    svg.appendChild(box(170, 24, 180, 26, 'var(--blueprint,#3553ff)', 'var(--bg,#fafaf5)'));
    svg.appendChild(txt(260, 41, '任务：校验 /signup', '9', 'var(--blueprint,#3553ff)'));
    svg.appendChild(svgEl('path', { d: 'M200 50 L130 74', fill: 'none', stroke: 'var(--rule-soft,#ddd)', 'stroke-width': '1.4' }));
    svg.appendChild(svgEl('path', { d: 'M320 50 L390 74', fill: 'none', stroke: 'var(--rule-soft,#ddd)', 'stroke-width': '1.4' }));
    svg.appendChild(txt(130, 90, '仅用提示词', '9.5', 'var(--warn,#b8870f)'));
    svg.appendChild(txt(390, 90, '工作台', '9.5', 'var(--blueprint,#3553ff)'));
    var metrics = ['测试通过', '未超出范围', '反馈真实', '交接可用', '没有回滚'];
    var passA = [false, false, true, false, false];
    var i;
    for (i = 0; i < 5; i++) {
      var y = 112 + i * 24;
      svg.appendChild(txt(260, y + 4, metrics[i], '8.5', 'var(--ink-mute,#777)'));
      var tA = (0.14 + i * 0.1).toFixed(2), tA1 = (0.2 + i * 0.1).toFixed(2);
      var tB = (0.19 + i * 0.1).toFixed(2), tB1 = (0.25 + i * 0.1).toFixed(2);
      var mA = passA[i]
        ? svgEl('path', { d: 'M-5 0 L-1 4 L6 -5', fill: 'none', stroke: 'var(--blueprint,#3553ff)', 'stroke-width': '2.2' })
        : svgEl('path', { d: 'M-4 -4 L4 4 M4 -4 L-4 4', fill: 'none', stroke: 'var(--warn,#b8870f)', 'stroke-width': '2.2' });
      svg.appendChild(popG(130, y, [mA], '0;' + tA + ';' + tA1 + ';0.9;0.94;1', D));
      var mB = svgEl('path', { d: 'M-5 0 L-1 4 L6 -5', fill: 'none', stroke: 'var(--blueprint,#3553ff)', 'stroke-width': '2.2' });
      svg.appendChild(popG(390, y, [mB], '0;' + tB + ';' + tB1 + ';0.9;0.94;1', D));
    }
    svg.appendChild(popG(130, 244, [txt(0, 3, '1 / 5', '11', 'var(--warn,#b8870f)')], '0;0.74;0.8;0.9;0.94;1', D));
    svg.appendChild(popG(390, 244, [txt(0, 3, '5 / 5', '11', 'var(--blueprint,#3553ff)')], '0;0.78;0.84;0.9;0.94;1', D));
    shell(host, '前后对照（Before / After）', '一个任务，两条流水线，五项结果',
      svg,
      '在同一仓库上运行同一个任务两次：一次仅使用提示词，一次使用完整工作台。用五项测量结果说明效果：测试、范围、反馈记录、交接质量和回滚情况。两条流程使用完全相同的模型，唯一变量是工作台提供的支撑能力；统计结果就是提交给质疑者的证据。');
  }

  // wb-pack-install：将工作台包复制到目标仓库。
  function packInstall(host) {
    var W = 520, H = 250, D = '4.8s';
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    svg.appendChild(svgEl('rect', { x: 36, y: 44, width: 158, height: 158, rx: '5', fill: 'none', stroke: 'var(--blueprint,#3553ff)', 'stroke-width': '1.5' }));
    svg.appendChild(txt(115, 36, 'agent-workbench-pack/', '8.5', 'var(--blueprint,#3553ff)'));
    svg.appendChild(svgEl('rect', { x: 326, y: 44, width: 158, height: 158, rx: '5', fill: 'none', stroke: 'var(--rule-soft,#ddd)', 'stroke-width': '1.5' }));
    svg.appendChild(txt(405, 36, '目标仓库', '8.5', 'var(--ink-mute,#777)'));
    var rows = ['AGENTS.md', 'schemas/', 'scripts/', 'docs/templates/'];
    var i;
    for (i = 0; i < 4; i++) {
      var y = 66 + i * 34;
      svg.appendChild(svgEl('rect', { x: 48, y: y - 9, width: 134, height: 20, rx: '2', fill: 'var(--bg-surface,#eee)' }));
      svg.appendChild(txt(54, y + 4, rows[i], '8', 'var(--ink-soft,#555)', 'start'));
      var slot = svgEl('rect', { x: 338, y: y - 9, width: 134, height: 20, rx: '2', fill: 'var(--bg,#fafaf5)', stroke: 'var(--rule-soft,#ddd)', 'stroke-width': '1.2', 'stroke-dasharray': '4 3' });
      var ta = (0.22 + i * 0.11).toFixed(2);
      slot.appendChild(seq('fill', 'var(--bg,#fafaf5);var(--bg,#fafaf5);var(--bg-surface,#eee);var(--bg-surface,#eee);var(--bg,#fafaf5)', '0;' + ta + ';' + (0.26 + i * 0.11).toFixed(2) + ';0.94;1', D));
      slot.appendChild(seq('stroke-dasharray', '4 3;4 3;1 0;1 0;4 3', '0;' + ta + ';' + (0.26 + i * 0.11).toFixed(2) + ';0.94;1', D));
      svg.appendChild(slot);
      var chip = svgEl('rect', { x: -14, y: -6, width: 28, height: 12, rx: '2', fill: 'var(--blueprint,#3553ff)' });
      var g = svgEl('g', {}, [chip]);
      g.appendChild(seq('opacity', '0;0;1;0;0', '0;' + (0.1 + i * 0.11).toFixed(2) + ';' + (0.16 + i * 0.11).toFixed(2) + ';' + ta + ';1', D));
      svg.appendChild(fly(g, 'M182 ' + y + ' L338 ' + y, D, '0;0;1;1', '0;' + (0.1 + i * 0.11).toFixed(2) + ';' + ta + ';1'));
    }
    svg.appendChild(txt(260, 110, 'bin/install.sh', '8.5', 'var(--ink-mute,#777)'));
    var rerun = svgEl('line', { x1: 194, y1: 170, x2: 326, y2: 170, stroke: 'var(--warn,#b8870f)', 'stroke-width': '1.5', 'stroke-dasharray': '5 4' });
    rerun.appendChild(seq('opacity', '0;0;1;1;0;0', '0;0.72;0.76;0.86;0.9;1', D));
    svg.appendChild(rerun);
    svg.appendChild(popG(260, 190, [txt(0, 3, '第二次运行：已存在，跳过', '8', 'var(--warn,#b8870f)')],
      '0;0.78;0.84;0.9;0.94;1', D));
    svg.appendChild(txt(260, 234, '一条命令以幂等方式部署工作台', '9.5', 'var(--ink-mute,#777)'));
    shell(host, '工作台包（Workbench Pack）', '用 cp -r 复制，智能体明天即可接着工作',
      svg,
      '综合实践（Capstone）将十一课介绍的支撑能力汇集到一个受版本管理的目录：路由入口、结构定义（Schema）、脚本、模板和一个安装器。每个文件都落到目标仓库的对应位置；第二次运行检测到已有内容后会跳过，因此可以持续安全地重复应用该包。');
  }

  LF.register({
    'wb-runtime-spawn': runtimeSpawn,
    'wb-trace-ingest': traceIngest,
    'wb-runtime-shapes': runtimeShapes,
    'wb-seven-surfaces': sevenSurfaces,
    'wb-three-files': threeFiles,
    'wb-rule-checkoff': ruleCheckoff,
    'wb-state-persist': statePersist,
    'wb-init-probes': initProbes,
    'wb-scope-bounce': scopeBounce,
    'wb-feedback-loop': feedbackLoop,
    'wb-gate-sequence': gateSequence,
    'wb-builder-marker': builderMarker,
    'wb-handoff-packet': handoffPacket,
    'wb-ab-runs': abRuns,
    'wb-pack-install': packInstall
  });
})();
