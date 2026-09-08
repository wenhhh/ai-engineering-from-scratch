/* figures-foundations3.js - 阶段 1（数学基础（Math foundations））、阶段 2（机器学习基础（ML fundamentals））
   及阶段 9（强化学习（Reinforcement learning））的动画课程图表。
   在 lesson-figures.js 之后加载，通过 window.LF 注册。
   无依赖，仅使用 ES5，主题由 CSS 变量控制。动画仅使用 SMIL，不使用 JS 渲染
   循环。编写方式：使用一个以以下某个组件名称为内容的 ```figure 块。 */
(function () {
  'use strict';
  var LF = window.LF;
  if (!LF) { return; }
  var el = LF.el, svgEl = LF.svgEl;
  var SPL = '0.23 1 0.32 1';
  var INK = 'var(--ink,#1a1a1a)', SOFT = 'var(--ink-soft,#555)', MUTE = 'var(--ink-mute,#777)';
  var BP = 'var(--blueprint,#3553ff)', BG = 'var(--bg,#fafaf5)', SURF = 'var(--bg-surface,#eee)';
  var RULE = 'var(--rule-soft,#ddd)', WARN = 'var(--warn,#b8870f)';

  function shell(host, label, sub, svg, cap) {
    host.appendChild(el('div', { class: 'lf' }, [
      el('div', { class: 'lf-head' }, [el('span', { class: 'lf-label' }, [label]), el('span', {}, [sub])]),
      el('div', { class: 'lf-body' }, [el('div', { class: 'lf-out' }, [svg])]),
      el('div', { class: 'lf-cap' }, [cap])
    ]));
  }
  function anim(attr, vals, dur, extra) {
    var a = { attributeName: attr, values: vals, dur: dur, repeatCount: 'indefinite' };
    if (extra) for (var k in extra) a[k] = extra[k];
    return svgEl('animate', a);
  }
  function txt(x, y, s, size, fill, anchor) {
    var t = svgEl('text', { x: x, y: y, 'text-anchor': anchor || 'middle', 'font-family': 'var(--font-mono,monospace)', 'font-size': size || '11', fill: fill || INK });
    t.appendChild(document.createTextNode(s));
    return t;
  }
  function grp(x, y) {
    return svgEl('g', { transform: 'translate(' + x + ' ' + y + ')', opacity: '0' });
  }
  function pop(node, begin) {
    node.appendChild(svgEl('animate', { attributeName: 'opacity', values: '0;1', dur: '0.5s', begin: begin, fill: 'freeze', calcMode: 'spline', keySplines: SPL, keyTimes: '0;1' }));
    node.appendChild(svgEl('animateTransform', { attributeName: 'transform', type: 'scale', additive: 'sum', values: '0.95;1', dur: '0.5s', begin: begin, fill: 'freeze', calcMode: 'spline', keySplines: SPL, keyTimes: '0;1' }));
  }
  function enter(node, begin) {
    node.appendChild(svgEl('animate', { attributeName: 'opacity', values: '0;1', dur: '0.6s', begin: begin, fill: 'freeze', calcMode: 'spline', keySplines: SPL, keyTimes: '0;1' }));
  }
  function drawIn(node, len, dur, begin) {
    node.setAttribute('stroke-dasharray', len);
    node.setAttribute('stroke-dashoffset', len);
    node.appendChild(svgEl('animate', { attributeName: 'stroke-dashoffset', values: len + ';0', dur: dur, begin: begin, fill: 'freeze', calcMode: 'spline', keySplines: SPL, keyTimes: '0;1' }));
  }

  // -- f3-bootstrap-resample: 对一行数据重采样（Resample），得到均值直方图（Histogram） --
  function bootstrapResample(host) {
    var svg = svgEl('svg', { viewBox: '0 0 520 240' });
    svg.appendChild(txt(60, 20, '观测数据（n = 10）', '9', MUTE, 'start'));
    var i, d;
    for (i = 0; i < 10; i++) {
      d = svgEl('circle', { cx: 70 + i * 42, cy: 42, r: '4.5', fill: SOFT, opacity: '0' });
      enter(d, (0.1 + i * 0.06) + 's');
      svg.appendChild(d);
    }
    var ring = svgEl('circle', { r: '8.5', fill: 'none', stroke: BP, 'stroke-width': '2', opacity: '0' });
    ring.appendChild(svgEl('animateMotion', { path: 'M70 42 L448 42 L196 42 L364 42 L70 42', dur: '4s', begin: '0.9s', repeatCount: 'indefinite', calcMode: 'linear', keyPoints: '0;0.25;0.5;0.75;1', keyTimes: '0;0.25;0.5;0.75;1' }));
    ring.appendChild(anim('opacity', '0;0.9;0.9;0', '4s', { begin: '0.9s', keyTimes: '0;0.06;0.94;1' }));
    svg.appendChild(ring);
    svg.appendChild(txt(460, 21, '有放回重采样', '9', BP, 'end'));
    var heights = [12, 30, 54, 70, 54, 30, 12], base = 196;
    for (i = 0; i < 7; i++) {
      var h = heights[i], x = 152 + i * 32;
      var bar = svgEl('rect', { x: x, y: base - h, width: '24', height: h, fill: BP, opacity: '0' });
      bar.appendChild(svgEl('animate', { attributeName: 'opacity', values: '0;0.85', dur: '0.5s', begin: (1.2 + i * 0.12) + 's', fill: 'freeze', calcMode: 'spline', keySplines: SPL, keyTimes: '0;1' }));
      bar.appendChild(svgEl('animate', { attributeName: 'height', values: (h * 0.95).toFixed(1) + ';' + h, dur: '0.5s', begin: (1.2 + i * 0.12) + 's', fill: 'freeze', calcMode: 'spline', keySplines: SPL, keyTimes: '0;1' }));
      bar.appendChild(svgEl('animate', { attributeName: 'y', values: (base - h * 0.95).toFixed(1) + ';' + (base - h), dur: '0.5s', begin: (1.2 + i * 0.12) + 's', fill: 'freeze', calcMode: 'spline', keySplines: SPL, keyTimes: '0;1' }));
      svg.appendChild(bar);
    }
    svg.appendChild(txt(260, 216, '自助样本均值的分布', '9', MUTE));
    var ci = svgEl('path', { d: 'M184 92 L184 84 L336 84 L336 92', fill: 'none', stroke: WARN, 'stroke-width': '1.8' });
    drawIn(ci, 170, 0.8, '2.6s');
    svg.appendChild(ci);
    var ciLabel = svgEl('g', { opacity: '0' }, [txt(260, 74, '95% 置信区间（Confidence Interval）', '9', WARN)]);
    enter(ciLabel, '3s');
    svg.appendChild(ciLabel);
    shell(host, '自助重采样（Bootstrap Resampling）', '重复采样、计算统计量',
      svg,
      '自助法（Bootstrap）用已有样本近似总体。有放回地抽取 n 个点，计算统计量，重复数千次：所得自助样本均值的分布，反映了仅由抽样噪声引起的统计量波动。取分布中间的 95%，即可得到不依赖正态性假设的置信区间（Confidence Interval）。');
  }

  // -- f3-learning-boundary: 质心（Centroids）从数据中显现，边界随之移动 --
  function learningBoundary(host) {
    var svg = svgEl('svg', { viewBox: '0 0 520 240' });
    var A = [[118, 66], [156, 92], [130, 118], [176, 70]];
    var B = [[318, 150], [356, 178], [382, 140], [336, 118]];
    var i, c;
    for (i = 0; i < 4; i++) {
      c = svgEl('circle', { cx: A[i][0], cy: A[i][1], r: '5', fill: MUTE, opacity: '0' });
      enter(c, (0.1 + i * 0.08) + 's');
      c.appendChild(svgEl('animate', { attributeName: 'fill', values: MUTE + ';' + BP, dur: '0.01s', begin: (2.1 + i * 0.08) + 's', fill: 'freeze', calcMode: 'discrete' }));
      svg.appendChild(c);
      c = svgEl('circle', { cx: B[i][0], cy: B[i][1], r: '5', fill: MUTE, opacity: '0' });
      enter(c, (0.14 + i * 0.08) + 's');
      c.appendChild(svgEl('animate', { attributeName: 'fill', values: MUTE + ';' + WARN, dur: '0.01s', begin: (2.14 + i * 0.08) + 's', fill: 'freeze', calcMode: 'discrete' }));
      svg.appendChild(c);
    }
    var cenA = grp(145, 86);
    cenA.appendChild(svgEl('circle', { r: '9', fill: 'none', stroke: BP, 'stroke-width': '2' }));
    cenA.appendChild(svgEl('circle', { r: '2.5', fill: BP }));
    pop(cenA, '0.9s');
    svg.appendChild(cenA);
    var cenB = grp(348, 146);
    cenB.appendChild(svgEl('circle', { r: '9', fill: 'none', stroke: WARN, 'stroke-width': '2' }));
    cenB.appendChild(svgEl('circle', { r: '2.5', fill: WARN }));
    pop(cenB, '1.05s');
    svg.appendChild(cenB);
    var bound = svgEl('line', { x1: 212, y1: 216, x2: 282, y2: 20, stroke: INK, 'stroke-width': '1.6' });
    drawIn(bound, 210, 0.9, '1.5s');
    svg.appendChild(bound);
    var lbl = svgEl('g', { opacity: '0' }, [
      txt(120, 30, 'A 类质心（Centroid）', '9', BP),
      txt(390, 202, 'B 类质心（Centroid）', '9', WARN),
      txt(300, 224, '学到的边界：归入最近的质心', '9', MUTE, 'start')
    ]);
    enter(lbl, '2.3s');
    svg.appendChild(lbl);
    shell(host, '从数据中学习（Learning from Data）', '无需手写规则',
      svg,
      '这里没有人手写 if 判断。分类器（Classifier）用质心（Centroid）概括每个带标签的簇，决策边界（Decision Boundary）由几何关系直接确定，即两个质心连线的垂直平分线。换一组数据，就会得到另一条边界。规则由样本推导出来，而不是由人逐条编写，这正是机器学习（Machine Learning）的核心。');
  }

  // -- f3-ensemble-average: 波动的弱学习器（Weak learners）平均为平滑的学习器 --
  function ensembleAverage(host) {
    var svg = svgEl('svg', { viewBox: '0 0 520 220' });
    var weak = [
      'M40 158 Q 100 148 150 112 T 260 74 T 370 88 T 480 124',
      'M40 146 Q 100 128 150 120 T 260 66 T 370 96 T 480 108',
      'M40 162 Q 100 136 150 104 T 260 84 T 370 74 T 480 128',
      'M40 140 Q 100 152 150 126 T 260 60 T 370 100 T 480 112',
      'M40 154 Q 100 122 150 110 T 260 92 T 370 80 T 480 132'
    ];
    var i, p;
    for (i = 0; i < 5; i++) {
      p = svgEl('path', { d: weak[i], fill: 'none', stroke: MUTE, 'stroke-width': '1.2', opacity: '0' });
      p.appendChild(svgEl('animate', { attributeName: 'opacity', values: '0;0.4', dur: '0.5s', begin: (0.15 + i * 0.22) + 's', fill: 'freeze', calcMode: 'spline', keySplines: SPL, keyTimes: '0;1' }));
      svg.appendChild(p);
    }
    var avg = svgEl('path', { d: 'M40 152 Q 100 138 150 114 T 260 75 T 370 88 T 480 121', fill: 'none', stroke: BP, 'stroke-width': '2.6' });
    drawIn(avg, 480, 1.4, '1.6s');
    svg.appendChild(avg);
    var lbl = svgEl('g', { opacity: '0' }, [
      txt(60, 34, '5 个弱学习器（Weak Learners），各有不同误差', '9', MUTE, 'start'),
      txt(60, 50, '取它们的平均值', '9', BP, 'start')
    ]);
    enter(lbl, '2.2s');
    svg.appendChild(lbl);
    var votes = svgEl('circle', { r: '4', fill: BP, opacity: '0' });
    votes.appendChild(svgEl('animateMotion', { path: 'M40 152 Q 100 138 150 114 T 260 75 T 370 88 T 480 121', dur: '3.5s', begin: '3s', repeatCount: 'indefinite', calcMode: 'spline', keyPoints: '0;1', keyTimes: '0;1', keySplines: '0.4 0 0.6 1' }));
    votes.appendChild(anim('opacity', '0;1;1;0', '3.5s', { begin: '3s', keyTimes: '0;0.08;0.92;1' }));
    svg.appendChild(votes);
    shell(host, '集成平均（Ensemble Averaging）', '让不同误差相互抵消',
      svg,
      '每条灰色曲线代表一个弱学习器（Weak Learner）：方差较高，出错方式各不相同。由于它们的误差具有一定独立性，取平均值可以抵消噪声、保留共同信号；蓝色的集成结果因此比任何单个成员都更接近真实规律。装袋法（Bagging）采用的正是这一思路；多数投票（Majority Voting）则把相同的误差抵消机制应用于类别标签。');
  }

  // -- f3-pipeline-flow: 一个样本经过仅拟合一次、按序排列的各阶段 --
  function pipelineFlow(host) {
    var svg = svgEl('svg', { viewBox: '0 0 520 200' });
    var stages = [
      { x: 76, name: '缺失值填补', sub: '中位数' },
      { x: 196, name: '缩放', sub: '均值、标准差' },
      { x: 316, name: '编码', sub: '独热编码（One-hot）' },
      { x: 436, name: '模型', sub: '预测' }
    ];
    var i, g;
    for (i = 0; i < 4; i++) {
      g = grp(stages[i].x, 92);
      g.appendChild(svgEl('rect', { x: '-46', y: '-27', width: '92', height: '54', rx: '6', fill: SURF, stroke: BP, 'stroke-width': '1.5' }));
      g.appendChild(txt(0, -4, stages[i].name, '11', BP));
      g.appendChild(txt(0, 13, stages[i].sub, '8', MUTE));
      pop(g, (0.1 + i * 0.18) + 's');
      svg.appendChild(g);
    }
    for (i = 0; i < 3; i++) {
      var ar = svgEl('line', { x1: 122 + i * 120, y1: 92, x2: 150 + i * 120, y2: 92, stroke: SOFT, 'stroke-width': '1.4', opacity: '0' });
      enter(ar, (0.8 + i * 0.1) + 's');
      svg.appendChild(ar);
    }
    var dot = svgEl('circle', { r: '5', fill: BP, opacity: '0' });
    dot.appendChild(svgEl('animateMotion', { path: 'M30 92 L76 92 L196 92 L316 92 L436 92 L496 92', dur: '5s', begin: '1.4s', repeatCount: 'indefinite', calcMode: 'linear', keyPoints: '0;0.1;0.1;0.35;0.35;0.61;0.61;0.87;0.87;1', keyTimes: '0;0.08;0.2;0.28;0.4;0.48;0.6;0.68;0.8;1' }));
    dot.appendChild(anim('opacity', '0;1;1;0', '5s', { begin: '1.4s', keyTimes: '0;0.04;0.94;1' }));
    dot.appendChild(anim('r', '5;5;3.6;3.6;5;5;3.6;3.6;5', '5s', { begin: '1.4s', keyTimes: '0;0.2;0.28;0.4;0.48;0.6;0.68;0.8;1', calcMode: 'discrete' }));
    svg.appendChild(dot);
    var lock = svgEl('g', { opacity: '0' }, [
      txt(260, 152, '统计量仅使用训练数据拟合', '9', WARN),
      txt(260, 168, '推理复用已固定的拟合结果，保持训练与服务一致', '9', MUTE)
    ]);
    enter(lock, '2s');
    svg.appendChild(lock);
    shell(host, '机器学习流水线（ML Pipeline）', '一个对象，按序执行各步骤',
      svg,
      '流水线（Pipeline）把各项变换和模型串成一个对象：原始样本进入后，依次由各阶段处理并传给下一步。所有统计量，包括中位数、均值和类别映射，都只在训练数据上拟合一次，随后固定。线上服务执行同一条处理链，从而避免数据泄漏（Data Leakage）和训练与服务偏差（Train-serve Skew）。');
  }

  // -- f3-series-decompose: observed = trend + seasonality + residual，即观测值 = 趋势 + 季节性 + 残差 --
  function seriesDecompose(host) {
    var svg = svgEl('svg', { viewBox: '0 0 520 280' });
    var obs = svgEl('path', { d: 'M60 88 C 90 58, 110 58, 140 76 C 170 94, 190 50, 220 46 C 250 42, 270 78, 300 70 C 330 62, 350 34, 380 36 C 410 38, 430 60, 480 48', fill: 'none', stroke: INK, 'stroke-width': '1.8' });
    drawIn(obs, 470, 1.2, '0.2s');
    svg.appendChild(obs);
    svg.appendChild(txt(60, 26, '观测序列（Observed Series）', '9', INK, 'start'));
    var rows = [
      { d: 'M60 138 C 200 132, 340 122, 480 112', label: '趋势（Trend）', color: BP, b: '1.5s' },
      { d: 'M60 192 Q 90 172 120 192 T 180 192 T 240 192 T 300 192 T 360 192 T 420 192 T 480 192', label: '季节性（Seasonality）', color: WARN, b: '1.8s' },
      { d: 'M60 246 L90 241 L120 249 L150 244 L180 248 L210 242 L240 247 L270 245 L300 250 L330 243 L360 247 L390 244 L420 248 L450 245 L480 247', label: '残差（Residual）', color: MUTE, b: '2.1s' }
    ];
    var i;
    for (i = 0; i < 3; i++) {
      var g = svgEl('g', { opacity: '0' });
      g.appendChild(svgEl('path', { d: rows[i].d, fill: 'none', stroke: rows[i].color, 'stroke-width': '1.6' }));
      g.appendChild(txt(60, 118 + i * 54, rows[i].label, '9', rows[i].color, 'start'));
      g.appendChild(txt(40, 142 + i * 54, i === 0 ? '=' : '+', '13', SOFT));
      g.appendChild(svgEl('animate', { attributeName: 'opacity', values: '0;1', dur: '0.55s', begin: rows[i].b, fill: 'freeze', calcMode: 'spline', keySplines: SPL, keyTimes: '0;1' }));
      g.appendChild(svgEl('animateTransform', { attributeName: 'transform', type: 'translate', values: '0 -6;0 0', dur: '0.55s', begin: rows[i].b, fill: 'freeze', calcMode: 'spline', keySplines: SPL, keyTimes: '0;1' }));
      svg.appendChild(g);
    }
    var scan = svgEl('line', { x1: 60, y1: 34, x2: 60, y2: 258, stroke: RULE, 'stroke-width': '1', opacity: '0' });
    scan.appendChild(svgEl('animate', { attributeName: 'x1', values: '60;480', dur: '4.5s', begin: '3s', repeatCount: 'indefinite', calcMode: 'spline', keySplines: '0.4 0 0.6 1', keyTimes: '0;1' }));
    scan.appendChild(svgEl('animate', { attributeName: 'x2', values: '60;480', dur: '4.5s', begin: '3s', repeatCount: 'indefinite', calcMode: 'spline', keySplines: '0.4 0 0.6 1', keyTimes: '0;1' }));
    scan.appendChild(anim('opacity', '0;0.8;0.8;0', '4.5s', { begin: '3s', keyTimes: '0;0.08;0.9;1' }));
    svg.appendChild(scan);
    shell(host, '时间序列分解（Time Series Decomposition）', '逐项拆开各个分量',
      svg,
      '观测序列由三种较简单的信号相加而成：缓慢变化的趋势（Trend）、重复出现的季节性（Seasonality）周期，以及剩下的残差（Residual）。分解后可以分别处理：去除趋势和季节性，使序列满足平稳性（Stationarity），再对残差建模。移动的扫描线表明，各分量在时间轴上逐点对应。');
  }

  // -- f3-anomaly-fence: 对正常区域建模，标记落在区域外的点 --
  function anomalyFence(host) {
    var svg = svgEl('svg', { viewBox: '0 0 520 240' });
    var pts = [[180, 100], [230, 132], [270, 96], [212, 78], [300, 128], [252, 148], [188, 138], [286, 76], [240, 110], [316, 104]];
    var i, c;
    for (i = 0; i < 10; i++) {
      c = svgEl('circle', { cx: pts[i][0], cy: pts[i][1], r: '4.5', fill: SOFT, opacity: '0' });
      enter(c, (0.1 + i * 0.07) + 's');
      svg.appendChild(c);
    }
    var fence = svgEl('ellipse', { cx: 248, cy: 112, rx: 118, ry: 62, fill: 'none', stroke: BP, 'stroke-width': '1.8', pathLength: '100', 'stroke-dasharray': '100', 'stroke-dashoffset': '100' });
    fence.appendChild(svgEl('animate', { attributeName: 'stroke-dashoffset', values: '100;0', dur: '1.3s', begin: '1s', fill: 'freeze', calcMode: 'spline', keySplines: SPL, keyTimes: '0;1' }));
    svg.appendChild(fence);
    svg.appendChild(txt(248, 200, '模型学到的区域：正常', '9', BP));
    var out = grp(444, 52);
    out.appendChild(svgEl('circle', { r: '5', fill: WARN }));
    pop(out, '2.2s');
    svg.appendChild(out);
    var ringA = svgEl('circle', { cx: 444, cy: 52, r: '6', fill: 'none', stroke: WARN, 'stroke-width': '1.6', opacity: '0' });
    ringA.appendChild(anim('r', '6;20', '2s', { begin: '2.6s', calcMode: 'spline', keySplines: '0.4 0 0.6 1', keyTimes: '0;1' }));
    ringA.appendChild(anim('opacity', '0.8;0', '2s', { begin: '2.6s', keyTimes: '0;1' }));
    svg.appendChild(ringA);
    var lbl = svgEl('g', { opacity: '0' }, [txt(444, 90, '异常（Anomaly）：', '9', WARN), txt(444, 104, '落在正常区域之外', '9', WARN)]);
    enter(lbl, '2.8s');
    svg.appendChild(lbl);
    shell(host, '异常检测（Anomaly Detection）', '学习正常模式，标记区域外的点',
      svg,
      '带标签的异常样本太少，不足以学习异常的形态，因此检测器转而学习正常数据的分布形状，也就是普通样本聚集的密集区域。凡是落在这条边界之外的点，无论属于哪种异常，都会被标记。这样，即使没有异常标签，也能发现从未见过的故障模式。');
  }

  // -- f3-feature-prune: 噪声特征（Noise features）被剔除，信号特征（Signal features）保留 --
  function featurePrune(host) {
    var svg = svgEl('svg', { viewBox: '0 0 520 220' });
    var hs = [96, 14, 72, 10, 20, 84, 12, 58, 16, 9], base = 170;
    var keep = [true, false, true, false, false, true, false, true, false, false];
    var i;
    for (i = 0; i < 10; i++) {
      var h = hs[i], x = 62 + i * 42;
      var bar = svgEl('rect', { x: x, y: base - h, width: '26', height: h, fill: keep[i] ? BP : MUTE, opacity: '0' });
      bar.appendChild(svgEl('animate', { attributeName: 'opacity', values: '0;0.85', dur: '0.5s', begin: (0.1 + i * 0.09) + 's', fill: 'freeze', calcMode: 'spline', keySplines: SPL, keyTimes: '0;1' }));
      bar.appendChild(svgEl('animate', { attributeName: 'height', values: (h * 0.95).toFixed(1) + ';' + h, dur: '0.5s', begin: (0.1 + i * 0.09) + 's', fill: 'freeze', calcMode: 'spline', keySplines: SPL, keyTimes: '0;1' }));
      bar.appendChild(svgEl('animate', { attributeName: 'y', values: (base - h * 0.95).toFixed(1) + ';' + (base - h), dur: '0.5s', begin: (0.1 + i * 0.09) + 's', fill: 'freeze', calcMode: 'spline', keySplines: SPL, keyTimes: '0;1' }));
      if (!keep[i]) {
        bar.appendChild(svgEl('animate', { attributeName: 'opacity', values: '0.85;0.12', dur: '0.3s', begin: (2 + i * 0.05) + 's', fill: 'freeze', calcMode: 'spline', keySplines: SPL, keyTimes: '0;1' }));
      } else {
        bar.appendChild(anim('opacity', '0.85;1;0.85', '3s', { begin: '2.8s', keyTimes: '0;0.5;1', calcMode: 'spline', keySplines: SPL + ';' + SPL }));
      }
      svg.appendChild(bar);
    }
    var cut = svgEl('line', { x1: 50, y1: base - 34, x2: 490, y2: base - 34, stroke: WARN, 'stroke-width': '1.4', 'stroke-dasharray': '5 4', opacity: '0' });
    enter(cut, '1.4s');
    svg.appendChild(cut);
    svg.appendChild(txt(486, base - 40, '筛选阈值（Threshold）', '9', WARN, 'end'));
    svg.appendChild(txt(270, 192, '特征重要性：例如与目标之间的互信息（Mutual Information）', '9', MUTE));
    var lbl = svgEl('g', { opacity: '0' }, [txt(270, 32, '输入 10 个特征，4 个包含有效信号，其余为噪声', '9', SOFT)]);
    enter(lbl, '2.6s');
    svg.appendChild(lbl);
    shell(host, '特征选择（Feature Selection）', '保留信号，去掉噪声',
      svg,
      '根据每个特征能提供多少目标信息为其打分，这里使用互信息（Mutual Information），再用阈值区分信号与噪声。低分的柱子逐渐淡出：删除这些特征可以缩小特征空间，让距离仍有意义，减少模型所需的数据量，并消除对噪声列的过拟合（Overfitting）。过滤法（Filter）、包装法（Wrapper）和嵌入法（Embedded）的区别，在于如何计算这些分数。');
  }

  // -- f3-dqn-stability: 经验回放（Replay）消除相关性，目标网络（Target net）跳跃式更新 --
  function dqnStability(host) {
    var svg = svgEl('svg', { viewBox: '0 0 520 240' });
    var boxes = [
      { x: 74, y: 66, name: '环境（Env）', sub: 's, a, r, s\'', b: '0.1s' },
      { x: 226, y: 66, name: '经验回放缓冲区', sub: '打乱历史经验', b: '0.28s' },
      { x: 400, y: 66, name: '在线网络', sub: '每一步都训练', b: '0.46s' },
      { x: 400, y: 176, name: '目标网络', sub: '冻结的副本', b: '0.64s' }
    ];
    var i, g;
    for (i = 0; i < 4; i++) {
      g = grp(boxes[i].x, boxes[i].y);
      g.appendChild(svgEl('rect', { x: '-58', y: '-26', width: '116', height: '52', rx: '6', fill: SURF, stroke: i === 3 ? WARN : BP, 'stroke-width': '1.5' }));
      g.appendChild(txt(0, -4, boxes[i].name, '10', i === 3 ? WARN : BP));
      g.appendChild(txt(0, 12, boxes[i].sub, '8', MUTE));
      pop(g, boxes[i].b);
      svg.appendChild(g);
    }
    for (i = 0; i < 3; i++) {
      var d = svgEl('circle', { r: '3.5', fill: SOFT, opacity: '0' });
      d.appendChild(svgEl('animateMotion', { path: 'M132 ' + (58 + i * 8) + ' L168 ' + (58 + i * 8), dur: '2.5s', begin: (1 + i * 0.35) + 's', repeatCount: 'indefinite', calcMode: 'linear', keyPoints: '0;1', keyTimes: '0;1' }));
      d.appendChild(anim('opacity', '0;0.8;0.8;0', '2.5s', { begin: (1 + i * 0.35) + 's', keyTimes: '0;0.15;0.85;1' }));
      svg.appendChild(d);
    }
    for (i = 0; i < 3; i++) {
      var s = svgEl('circle', { r: '4', fill: BP, opacity: '0' });
      s.appendChild(svgEl('animateMotion', { path: 'M284 ' + (52 + i * 14) + ' L342 66', dur: '2.5s', begin: (1.4 + i * 0.3) + 's', repeatCount: 'indefinite', calcMode: 'linear', keyPoints: '0;1', keyTimes: '0;1' }));
      s.appendChild(anim('opacity', '0;1;1;0', '2.5s', { begin: (1.4 + i * 0.3) + 's', keyTimes: '0;0.15;0.85;1' }));
      svg.appendChild(s);
    }
    svg.appendChild(txt(226, 130, '随机小批量：降低相关性', '8', BP));
    var sync = svgEl('g', { opacity: '0' });
    sync.appendChild(svgEl('line', { x1: 400, y1: 92, x2: 400, y2: 150, stroke: WARN, 'stroke-width': '2' }));
    sync.appendChild(svgEl('polygon', { points: '396,148 404,148 400,156', fill: WARN }));
    sync.appendChild(txt(346, 126, '复制', '8', WARN, 'end'));
    sync.appendChild(anim('opacity', '0;0;1;1;0', '5s', { begin: '1.8s', keyTimes: '0;0.76;0.8;0.92;1', calcMode: 'discrete' }));
    svg.appendChild(sync);
    var hold = svgEl('g', { opacity: '0' }, [txt(260, 214, '目标网络约每 1 万步同步一次，让自举目标保持稳定', '9', MUTE)]);
    enter(hold, '2.2s');
    svg.appendChild(hold);
    shell(host, '深度 Q 网络（DQN）的稳定训练技巧', '经验回放 + 冻结目标网络',
      svg,
      '图中展示了使深度 Q 学习（Deep Q-learning）收敛的三项技巧中的两项。状态转移不断进入经验回放缓冲区（Replay Buffer），训练时随机抽样，打破连续更新之间的相关性。同时，在线网络（Online Network）持续训练，琥珀色的目标网络（Target Network）保持冻结，约每一万步才复制一次最新参数，避免贝尔曼目标（Bellman Target）不断追逐自身的变化。');
  }

  // -- f3-marl-orbit: 独立学习器循环游走，联合训练（Joint training）实现收敛 --
  function marlOrbit(host) {
    var svg = svgEl('svg', { viewBox: '0 0 520 240' });
    var orbit = svgEl('circle', { cx: 130, cy: 122, r: 55, fill: 'none', stroke: RULE, 'stroke-width': '1', 'stroke-dasharray': '4 4', opacity: '0' });
    enter(orbit, '0.2s');
    svg.appendChild(orbit);
    var a1 = svgEl('circle', { r: '6', fill: BP, opacity: '0' });
    a1.appendChild(svgEl('animateMotion', { path: 'M130 67 A55 55 0 1 1 129.9 67.001 Z', dur: '4s', begin: '0.6s', repeatCount: 'indefinite', calcMode: 'linear', keyPoints: '0;1', keyTimes: '0;1' }));
    a1.appendChild(svgEl('animate', { attributeName: 'opacity', values: '0;1', dur: '0.5s', begin: '0.6s', fill: 'freeze', calcMode: 'spline', keySplines: SPL, keyTimes: '0;1' }));
    svg.appendChild(a1);
    var a2 = svgEl('circle', { r: '6', fill: WARN, opacity: '0' });
    a2.appendChild(svgEl('animateMotion', { path: 'M130 177 A55 55 0 1 1 129.9 176.999 Z', dur: '4s', begin: '0.6s', repeatCount: 'indefinite', calcMode: 'linear', keyPoints: '0;1', keyTimes: '0;1' }));
    a2.appendChild(svgEl('animate', { attributeName: 'opacity', values: '0;1', dur: '0.5s', begin: '0.7s', fill: 'freeze', calcMode: 'spline', keySplines: SPL, keyTimes: '0;1' }));
    svg.appendChild(a2);
    svg.appendChild(txt(130, 214, '独立学习（Independent Learning）：', '9', MUTE));
    svg.appendChild(txt(130, 228, '双方相互追逐，策略无法稳定', '9', MUTE));
    var spiralD = 'M390 42 C 462 42, 462 198, 390 198 C 326 198, 326 70, 390 70 C 434 70, 434 170, 390 170 C 352 170, 352 96, 390 96 C 418 96, 418 146, 390 146 C 368 146, 368 118, 390 118';
    var spiral = svgEl('path', { d: spiralD, fill: 'none', stroke: RULE, 'stroke-width': '1', 'stroke-dasharray': '4 4', opacity: '0' });
    enter(spiral, '0.4s');
    svg.appendChild(spiral);
    var eq = svgEl('circle', { cx: 390, cy: 122, r: '4', fill: BP, opacity: '0' });
    eq.appendChild(anim('r', '4;6;4', '3s', { begin: '1.4s', keyTimes: '0;0.5;1', calcMode: 'spline', keySplines: SPL + ';' + SPL }));
    enter(eq, '1.2s');
    svg.appendChild(eq);
    var walker = svgEl('circle', { r: '5.5', fill: WARN, opacity: '0' });
    walker.appendChild(svgEl('animateMotion', { path: spiralD, dur: '5.5s', begin: '1s', repeatCount: 'indefinite', calcMode: 'spline', keyPoints: '0;1', keyTimes: '0;1', keySplines: '0.4 0 0.6 1' }));
    walker.appendChild(anim('opacity', '0;1;1;0', '5.5s', { begin: '1s', keyTimes: '0;0.06;0.9;1' }));
    svg.appendChild(walker);
    svg.appendChild(txt(390, 214, '集中式评价器：观察联合状态', '9', MUTE));
    svg.appendChild(txt(390, 228, '抑制相互追逐，逐渐达到均衡', '9', MUTE));
    shell(host, '多智能体动力学（Multi-agent Dynamics）', '循环震荡与收敛',
      svg,
      '左图中，两个独立学习器处于同一个环境，各自把对方视为环境的一部分。因此，一方每次更新都会使另一方的价值估计失效，双方不断循环追逐，陷入非平稳性（Non-stationarity）困境。右图中，训练时引入能观察联合状态和动作的集中式评价器（Centralized Critic），相同的交互过程便沿螺旋向内收敛，形成稳定的联合策略（Joint Policy）。');
  }

  // -- f3-reality-gap: 随机化模拟（Randomized sim）的包络扩展，覆盖真实世界 --
  function realityGap(host) {
    var svg = svgEl('svg', { viewBox: '0 0 520 220' });
    var axis = svgEl('line', { x1: 50, y1: 150, x2: 470, y2: 150, stroke: SOFT, 'stroke-width': '1.2', opacity: '0' });
    enter(axis, '0.1s');
    svg.appendChild(axis);
    svg.appendChild(txt(260, 174, '物理参数：摩擦、质量、延迟、光照等', '9', MUTE));
    var band = svgEl('rect', { x: 130, y: 82, width: 70, height: 60, rx: '6', fill: BP, opacity: '0' });
    band.appendChild(svgEl('animate', { attributeName: 'opacity', values: '0;0.18;0.18', dur: '6s', begin: '0.5s', repeatCount: 'indefinite', keyTimes: '0;0.08;1', calcMode: 'spline', keySplines: SPL + ';0 0 1 1' }));
    band.appendChild(svgEl('animate', { attributeName: 'x', values: '130;130;84;84', dur: '6s', begin: '0.5s', repeatCount: 'indefinite', keyTimes: '0;0.3;0.55;1', calcMode: 'spline', keySplines: '0 0 1 1;' + SPL + ';0 0 1 1' }));
    band.appendChild(svgEl('animate', { attributeName: 'width', values: '70;70;330;330', dur: '6s', begin: '0.5s', repeatCount: 'indefinite', keyTimes: '0;0.3;0.55;1', calcMode: 'spline', keySplines: '0 0 1 1;' + SPL + ';0 0 1 1' }));
    svg.appendChild(band);
    var bandLbl = svgEl('g', { opacity: '0' }, [txt(165, 68, '仿真训练覆盖范围', '9', BP, 'start')]);
    enter(bandLbl, '0.7s');
    svg.appendChild(bandLbl);
    var real = svgEl('g', { opacity: '0' });
    real.appendChild(svgEl('line', { x1: 350, y1: 76, x2: 350, y2: 150, stroke: INK, 'stroke-width': '2' }));
    real.appendChild(svgEl('circle', { cx: 350, cy: 150, r: '4.5', fill: INK }));
    real.appendChild(txt(350, 64, '真实机器人', '9', INK));
    enter(real, '1s');
    svg.appendChild(real);
    var gap = svgEl('g', { opacity: '0' }, [txt(276, 118, '差距', '10', WARN)]);
    gap.appendChild(anim('opacity', '0;1;1;0;0', '6s', { begin: '0.5s', keyTimes: '0;0.18;0.34;0.44;1', calcMode: 'spline', keySplines: SPL + ';0 0 1 1;0.4 0 1 1;0 0 1 1' }));
    svg.appendChild(gap);
    var cover = svgEl('g', { opacity: '0' }, [txt(260, 200, '随机化仿真参数，让真实环境也落在训练覆盖范围内', '9', BP)]);
    cover.appendChild(anim('opacity', '0;0;1;1;0', '6s', { begin: '0.5s', keyTimes: '0;0.55;0.66;0.92;1', calcMode: 'spline', keySplines: '0 0 1 1;' + SPL + ';0 0 1 1;0.4 0 1 1' }));
    svg.appendChild(cover);
    shell(host, '域随机化（Domain Randomization）', '扩大训练覆盖范围',
      svg,
      '只在参数固定的仿真器中训练的策略，在各个物理参数维度上都与真实系统存在偏差，这就是仿真与现实差距（Reality Gap）。域随机化（Domain Randomization）扩大训练覆盖范围：每个回合都采样不同的质量、摩擦、延迟和光照参数。当这一范围涵盖真实机器人的参数时，真实环境就成了策略已经能够应对的另一种样本。');
  }

  // -- f3-selfplay-ladder: 自博弈（Self-play）循环将迭代转为技能提升 --
  function selfplayLadder(host) {
    var svg = svgEl('svg', { viewBox: '0 0 520 240' });
    var nodes = [
      { x: 120, y: 52, name: '自我对弈', b: '0.1s' },
      { x: 196, y: 150, name: '搜索', b: '0.28s' },
      { x: 44, y: 150, name: '更新', b: '0.46s' }
    ];
    var i, g;
    for (i = 0; i < 3; i++) {
      g = grp(nodes[i].x, nodes[i].y);
      g.appendChild(svgEl('rect', { x: '-40', y: '-18', width: '80', height: '36', rx: '6', fill: SURF, stroke: BP, 'stroke-width': '1.5' }));
      g.appendChild(txt(0, 4, nodes[i].name, '10', BP));
      pop(g, nodes[i].b);
      svg.appendChild(g);
    }
    var loopD = 'M120 52 L196 150 L44 150 Z';
    var tri = svgEl('path', { d: loopD, fill: 'none', stroke: RULE, 'stroke-width': '1', 'stroke-dasharray': '4 4', opacity: '0' });
    enter(tri, '0.7s');
    svg.appendChild(tri);
    var runner = svgEl('circle', { r: '5', fill: BP, opacity: '0' });
    runner.appendChild(svgEl('animateMotion', { path: loopD, dur: '5s', begin: '1s', repeatCount: 'indefinite', calcMode: 'linear', keyPoints: '0;1', keyTimes: '0;1' }));
    runner.appendChild(svgEl('animate', { attributeName: 'opacity', values: '0;1', dur: '0.5s', begin: '1s', fill: 'freeze', calcMode: 'spline', keySplines: SPL, keyTimes: '0;1' }));
    svg.appendChild(runner);
    svg.appendChild(txt(120, 206, '与自己对弈，用搜索改进行动', '9', MUTE));
    svg.appendChild(txt(120, 220, '再用搜索结果训练网络', '9', MUTE));
    var stairs = svgEl('path', { d: 'M280 190 L316 190 L316 166 L352 166 L352 142 L388 142 L388 116 L424 116 L424 90 L460 90 L460 64 L484 64', fill: 'none', stroke: BP, 'stroke-width': '2.2' });
    stairs.setAttribute('stroke-dasharray', '460');
    stairs.setAttribute('stroke-dashoffset', '460');
    stairs.appendChild(svgEl('animate', { attributeName: 'stroke-dashoffset', values: '460;0;0', dur: '5s', begin: '1s', repeatCount: 'indefinite', keyTimes: '0;0.85;1', calcMode: 'linear' }));
    svg.appendChild(stairs);
    var axisY = svgEl('line', { x1: 280, y1: 44, x2: 280, y2: 190, stroke: RULE, 'stroke-width': '1', opacity: '0' });
    enter(axisY, '0.8s');
    svg.appendChild(axisY);
    svg.appendChild(txt(382, 210, '每轮循环，对弈能力提高一级', '9', SOFT));
    svg.appendChild(txt(292, 40, '等级分（Elo）', '9', MUTE, 'start'));
    shell(host, '自我对弈阶梯（Self-play Ladder）', 'AlphaZero 的训练循环',
      svg,
      'AlphaZero、MuZero 和组相对策略优化（Group Relative Policy Optimization，GRPO）都由这样一个循环驱动：当前策略与自身对弈，搜索或验证把这些对局转化为更好的行动分布，再让网络向搜索得到的结果学习。每绕三角形一圈，都会为下一轮产生一个更强的对手，因此不依赖人类数据，对弈能力也能逐级提升。');
  }

  LF.register({
    'f3-bootstrap-resample': bootstrapResample,
    'f3-learning-boundary': learningBoundary,
    'f3-ensemble-average': ensembleAverage,
    'f3-pipeline-flow': pipelineFlow,
    'f3-series-decompose': seriesDecompose,
    'f3-anomaly-fence': anomalyFence,
    'f3-feature-prune': featurePrune,
    'f3-dqn-stability': dqnStability,
    'f3-marl-orbit': marlOrbit,
    'f3-reality-gap': realityGap,
    'f3-selfplay-ladder': selfplayLadder
  });
})();
