/* 阶段 19 综合项目动画：论文写作、评审循环、迭代调度器、研究演示、视觉图像块、
   ViT 编码器、投影对齐、交叉注意力、视觉语言预训练与多模态评估。
   在 lesson-figures.js 之后加载，通过 window.LF 注册。仅使用 SMIL 动画，
   不使用 JS 动画循环或 rAF。兼容 ES5，无外部依赖，通过 CSS 变量适配主题。 */
(function () {
  'use strict';
  var LF = window.LF;
  if (!LF) { return; }
  var svgEl = LF.svgEl, el = LF.el;

  var EASE = '0.23 1 0.32 1';
  var SPL4 = '0 0 1 1;' + EASE + ';0 0 1 1;0.4 0 1 1';

  function svg(h) { return svgEl('svg', { viewBox: '0 0 520 ' + h }); }
  function shell(host, label, sub, node, cap) {
    host.appendChild(el('div', { class: 'lf' }, [
      el('div', { class: 'lf-head' }, [el('span', { class: 'lf-label' }, [label]), el('span', {}, [sub])]),
      el('div', { class: 'lf-body' }, [el('div', { class: 'lf-out' }, [node])]),
      el('div', { class: 'lf-cap' }, [cap])
    ]));
  }
  function txt(x, y, s, size, fill, anchor) {
    var t = svgEl('text', { x: x, y: y, 'text-anchor': anchor || 'middle', 'font-family': 'var(--font-mono,monospace)', 'font-size': size || '11', fill: fill || 'var(--ink,#1a1a1a)' });
    t.appendChild(document.createTextNode(s));
    return t;
  }
  function rect(x, y, w, h, fill, stroke) {
    return svgEl('rect', { x: x, y: y, width: w, height: h, rx: '4', fill: fill || 'var(--bg-surface,#eee)', stroke: stroke || 'var(--rule-soft,#ddd)', 'stroke-width': '1.4' });
  }
  // 从透明、95% 缩放的状态淡入；a..b 为入场区间，0.94..1 为更短的退场区间。
  function entry(cx, cy, dur, begin, a, b) {
    a = a || 0.02; b = b || 0.12;
    var kt = '0;' + a + ';' + b + ';0.94;1';
    var g = svgEl('g', { transform: 'translate(' + cx + ' ' + cy + ')', opacity: '0' });
    g.appendChild(svgEl('animateTransform', { attributeName: 'transform', type: 'scale', additive: 'sum', values: '0.95;0.95;1;1;0.97', keyTimes: kt, calcMode: 'spline', keySplines: SPL4, dur: dur, begin: begin || '0s', repeatCount: 'indefinite' }));
    g.appendChild(svgEl('animate', { attributeName: 'opacity', values: '0;0;1;1;0', keyTimes: kt, calcMode: 'spline', keySplines: SPL4, dur: dur, begin: begin || '0s', repeatCount: 'indefinite' }));
    return g;
  }

  // 第 54 课：先用数据声明占位区域，再填入正文。
  function chPaper(host) {
    var s = svg(250), px = 40, py = 24, pw = 170;
    s.appendChild(svgEl('rect', { x: px, y: py, width: pw, height: 208, rx: '3', fill: 'var(--bg,#fafaf5)', stroke: 'var(--ink-soft,#555)', 'stroke-width': '1.4' }));
    var slots = [
      [py + 12, 22, '摘要'],
      [py + 42, 26, '章节：引言'],
      [py + 76, 26, '章节：方法'],
      [py + 110, 38, '图占位：results.png'],
      [py + 156, 24, '参考文献：3 个键']
    ];
    var i;
    for (i = 0; i < slots.length; i++) {
      var sy = slots[i][0], sh = slots[i][1];
      s.appendChild(svgEl('rect', { x: px + 10, y: sy, width: pw - 20, height: sh, fill: 'none', stroke: 'var(--rule-soft,#ddd)', 'stroke-width': '1', 'stroke-dasharray': '3 3' }));
      s.appendChild(txt(px + 16, sy + 12, slots[i][2], '8', 'var(--ink-mute,#777)', 'start'));
      var g = entry(px + pw / 2, sy + sh - 7, '5s', (1.6 + i * 0.25).toFixed(2) + 's');
      g.appendChild(svgEl('rect', { x: -(pw / 2 - 14), y: -3.5, width: pw - 28, height: 7, rx: '2', fill: 'var(--blueprint,#3553ff)', opacity: '0.55' }));
      s.appendChild(g);
    }
    var vx = 262;
    s.appendChild(txt(vx, 44, '撰写正文前先校验：', '10', 'var(--ink-soft,#555)', 'start'));
    var checks = ['每张图都有占位区域', '每条引用都有文献条目', '每个章节都在目录中'];
    for (i = 0; i < checks.length; i++) {
      var cg = entry(vx + 110, 66 + i * 24, '5s', (0.2 + i * 0.2).toFixed(2) + 's');
      cg.appendChild(txt(-110, 3, '✓', '9', 'var(--blueprint,#3553ff)', 'start'));
      cg.appendChild(txt(-86, 3, checks[i], '9', 'var(--ink,#1a1a1a)', 'start'));
      s.appendChild(cg);
    }
    s.appendChild(txt(vx, 168, '校验通过后，', '9', 'var(--ink-mute,#777)', 'start'));
    s.appendChild(txt(vx, 182, '逐个章节填入正文。', '9', 'var(--ink-mute,#777)', 'start'));
    shell(host, '论文骨架（Paper Skeleton）', '先确定结构 · 再撰写正文', s,
      '在撰写正文前，论文骨架先以数据声明章节、插图占位（Figure Slot）和参考文献键（Bibliography Key）。运行框架（Harness）先校验这一契约：每张引用的图都有占位，每条引用都有文献条目，每个章节都进入目录（Table of Contents）。之后生成器才逐个区域填入正文，避免结构问题积累到写作后期。');
  }

  // 第 55 课：五个评分维度的轨迹逐渐进入目标区间。
  function chCritic(host) {
    var s = svg(250), Y0 = 200, X = [110, 210, 310, 410];
    s.appendChild(svgEl('line', { x1: 70, y1: 40, x2: 70, y2: Y0, stroke: 'var(--rule-soft,#ddd)', 'stroke-width': '1' }));
    s.appendChild(svgEl('line', { x1: 70, y1: Y0, x2: 452, y2: Y0, stroke: 'var(--rule-soft,#ddd)', 'stroke-width': '1' }));
    s.appendChild(svgEl('rect', { x: 70, y: 65, width: 382, height: 16, fill: 'var(--blueprint,#3553ff)', opacity: '0.08' }));
    s.appendChild(txt(448, 61, '目标 8 分以上', '8', 'var(--blueprint,#3553ff)', 'end'));
    var i;
    for (i = 0; i < 4; i++) {
      s.appendChild(svgEl('line', { x1: X[i], y1: 48, x2: X[i], y2: Y0, stroke: 'var(--rule-soft,#ddd)', 'stroke-width': '0.6' }));
      s.appendChild(txt(X[i], Y0 + 16, '第 ' + (i + 1) + ' 轮', '8', 'var(--ink-mute,#777)'));
    }
    var dims = [
      ['清晰度', [4, 6, 8, 8.4]],
      ['新颖性', [3, 5, 7, 8.2]],
      ['证据', [5, 6.5, 7.8, 8.3]],
      ['方法论', [4.5, 7, 8.1, 8.3]],
      ['相关工作', [2.5, 5, 7.4, 8.1]]
    ];
    for (i = 0; i < dims.length; i++) {
      var sc = dims[i][1], ys = [];
      for (var j = 0; j < 4; j++) { ys.push(Y0 - sc[j] * 15); }
      var dot = svgEl('circle', { cx: X[0], cy: ys[0], r: '4.5', fill: 'var(--blueprint,#3553ff)', opacity: '0' });
      dot.appendChild(svgEl('animate', { attributeName: 'cx', values: X[0] + ';' + X[1] + ';' + X[2] + ';' + X[3] + ';' + X[3], keyTimes: '0;0.26;0.52;0.78;1', calcMode: 'spline', keySplines: EASE + ';' + EASE + ';' + EASE + ';0 0 1 1', dur: '5.2s', begin: (i * 0.1).toFixed(1) + 's', repeatCount: 'indefinite' }));
      dot.appendChild(svgEl('animate', { attributeName: 'cy', values: ys[0] + ';' + ys[1] + ';' + ys[2] + ';' + ys[3] + ';' + ys[3], keyTimes: '0;0.26;0.52;0.78;1', calcMode: 'spline', keySplines: EASE + ';' + EASE + ';' + EASE + ';0 0 1 1', dur: '5.2s', begin: (i * 0.1).toFixed(1) + 's', repeatCount: 'indefinite' }));
      dot.appendChild(svgEl('animate', { attributeName: 'opacity', values: '0;1;1;0', keyTimes: '0;0.07;0.96;1', dur: '5.2s', begin: (i * 0.1).toFixed(1) + 's', repeatCount: 'indefinite' }));
      s.appendChild(dot);
      s.appendChild(txt(60, 112 + i * 16, dims[i][0], '8', 'var(--ink-mute,#777)', 'end'));
    }
    var badge = txt(260, 34, '检测到平台期：停止', '9', 'var(--warn,#b8870f)');
    badge.appendChild(svgEl('animate', { attributeName: 'opacity', values: '0;0;1;1;0', keyTimes: '0;0.78;0.84;0.96;1', dur: '5.2s', repeatCount: 'indefinite' }));
    s.appendChild(badge);
    shell(host, '评审循环（Critic Loop）', '五维评分 · 收敛或停止', s,
      '每轮评审者（Critic）返回包含清晰度（Clarity）、新颖性（Novelty）、证据（Evidence）、方法论（Methodology）和相关工作（Related Work）的五维评分向量；修订以结构化差异（Structured Diff）应用，评分轨迹逐渐接近目标区间。循环设有明确停止条件：进入平台期（Plateau）、达到目标或耗尽预算。评分以向量表示，因此能识别任一维度的退步。');
  }

  // 第 56 课：从假设队列向槽位分发任务，结果回流，低 UCB 分支被剪枝。
  function chScheduler(host) {
    var s = svg(250), qx = 36, qw = 110, sx = 220, sw = 100, ys = [58, 104, 150];
    s.appendChild(txt(qx, 44, '假设队列', '9', 'var(--ink-soft,#555)', 'start'));
    s.appendChild(txt(sx, 44, '并行槽位', '9', 'var(--ink-soft,#555)', 'start'));
    var chips = [['h0', 'ucb 1.9'], ['h1', 'ucb 1.4'], ['h2', 'ucb 0.6']];
    var i;
    for (i = 0; i < 3; i++) {
      var cg = svgEl('g', {});
      cg.appendChild(rect(qx, ys[i], qw, 32, 'var(--bg-surface,#eee)', i === 2 ? 'var(--rule-soft,#ddd)' : 'var(--blueprint,#3553ff)'));
      cg.appendChild(txt(qx + 12, ys[i] + 20, chips[i][0], '10', 'var(--ink,#1a1a1a)', 'start'));
      cg.appendChild(txt(qx + qw - 10, ys[i] + 20, chips[i][1], '8', i === 2 ? 'var(--warn,#b8870f)' : 'var(--blueprint,#3553ff)', 'end'));
      if (i === 2) {
        cg.appendChild(svgEl('animate', { attributeName: 'opacity', values: '1;1;0.15;0.15', keyTimes: '0;0.55;0.61;1', calcMode: 'spline', keySplines: '0 0 1 1;0.4 0 1 1;0 0 1 1', dur: '4.8s', repeatCount: 'indefinite' }));
      }
      s.appendChild(cg);
      s.appendChild(rect(sx, ys[i], sw, 32, 'var(--bg,#fafaf5)', 'var(--rule-soft,#ddd)'));
      s.appendChild(txt(sx + sw / 2, ys[i] + 20, '槽位 ' + i, '9', 'var(--ink-mute,#777)'));
    }
    var pr = txt(qx + qw + 8, ys[2] + 20, '已剪枝', '8', 'var(--warn,#b8870f)', 'start');
    pr.appendChild(svgEl('animate', { attributeName: 'opacity', values: '0;0;1;1', keyTimes: '0;0.58;0.64;1', dur: '4.8s', repeatCount: 'indefinite' }));
    s.appendChild(pr);
    s.appendChild(svgEl('line', { x1: 392, y1: 58, x2: 392, y2: 182, stroke: 'var(--rule-soft,#ddd)', 'stroke-width': '1.4' }));
    s.appendChild(txt(392, 200, '结果总线', '9', 'var(--ink-soft,#555)'));
    var arc = 'M 392 58 C 392 16, 90 16, 90 54';
    s.appendChild(svgEl('path', { d: arc, fill: 'none', stroke: 'var(--rule-soft,#ddd)', 'stroke-width': '1.2', 'stroke-dasharray': '4 4' }));
    for (i = 0; i < 2; i++) {
      var d = svgEl('circle', { cx: qx + qw, cy: ys[i] + 16, r: '4', fill: 'var(--blueprint,#3553ff)', opacity: '0' });
      d.appendChild(svgEl('animate', { attributeName: 'cx', values: (qx + qw) + ';' + (qx + qw) + ';' + sx + ';' + sx, keyTimes: '0;0.04;0.24;1', calcMode: 'spline', keySplines: '0 0 1 1;' + EASE + ';0 0 1 1', dur: '4.8s', begin: (i * 0.3).toFixed(1) + 's', repeatCount: 'indefinite' }));
      d.appendChild(svgEl('animate', { attributeName: 'opacity', values: '0;1;1;0;0', keyTimes: '0;0.06;0.24;0.3;1', dur: '4.8s', begin: (i * 0.3).toFixed(1) + 's', repeatCount: 'indefinite' }));
      s.appendChild(d);
    }
    var res = svgEl('circle', { r: '4', fill: 'var(--warn,#b8870f)', opacity: '0' });
    res.appendChild(svgEl('animateMotion', { path: 'M 320 74 L 392 74 L 392 58 C 392 16, 90 16, 90 54', keyPoints: '0;0;1;1', keyTimes: '0;0.4;0.8;1', calcMode: 'linear', dur: '4.8s', repeatCount: 'indefinite' }));
    res.appendChild(svgEl('animate', { attributeName: 'opacity', values: '0;0;1;1;0;0', keyTimes: '0;0.4;0.46;0.78;0.82;1', dur: '4.8s', repeatCount: 'indefinite' }));
    s.appendChild(res);
    s.appendChild(txt(240, 232, '结果更新 UCB，重新排列队列', '9', 'var(--ink-mute,#777)'));
    shell(host, '置信上界调度器（UCB Scheduler）', '探索 · 利用 · 剪枝', s,
      '队列按置信上界（Upper Confidence Bound，UCB）为假设评分。槽位空闲时，调度器分发 UCB 最高的分支；完成的实验将结果送入结果总线（Result Bus），再回流更新统计量，因此一次实验的发现就可能改变后续整个队列的顺序。上界明显降低的分支会被剪枝（Pruning），避免继续占用槽位。');
  }

  // 第 57 课：一次运行依次通过五个阶段及其间的契约门禁。
  function chPipeline(host) {
    var s = svg(220), names = ['初始假设', '调度器', '执行器', '评审者', '写作者'];
    var i, bx = [20, 124, 228, 332, 436], cy = 108;
    for (i = 0; i < 5; i++) {
      s.appendChild(rect(bx[i], 86, 76, 44, 'var(--bg-surface,#eee)', 'var(--rule-soft,#ddd)'));
      s.appendChild(txt(bx[i] + 38, 112, names[i], '10', 'var(--ink,#1a1a1a)'));
    }
    s.appendChild(svgEl('line', { x1: 58, y1: cy, x2: 474, y2: cy, stroke: 'var(--rule-soft,#ddd)', 'stroke-width': '0.6' }));
    for (i = 0; i < 4; i++) {
      var gx = 110 + i * 104;
      var gate = svgEl('rect', { x: gx - 5, y: cy - 5, width: 10, height: 10, fill: 'var(--bg,#fafaf5)', stroke: 'var(--blueprint,#3553ff)', 'stroke-width': '1.4', transform: 'rotate(45 ' + gx + ' ' + cy + ')', opacity: '0.3' });
      var p = (0.14 + i * 0.22).toFixed(2), p2 = (0.18 + i * 0.22).toFixed(2);
      gate.appendChild(svgEl('animate', { attributeName: 'opacity', values: '0.3;0.3;1;1', keyTimes: '0;' + p + ';' + p2 + ';1', dur: '5.2s', repeatCount: 'indefinite' }));
      s.appendChild(gate);
    }
    s.appendChild(txt(110, 148, '契约门禁：输入不合规即停止运行', '8', 'var(--ink-mute,#777)', 'start'));
    var baton = svgEl('circle', { cx: 58, cy: cy, r: '5', fill: 'var(--warn,#b8870f)', opacity: '0' });
    baton.appendChild(svgEl('animate', { attributeName: 'cx', values: '58;162;266;370;474;474', keyTimes: '0;0.22;0.44;0.66;0.88;1', calcMode: 'spline', keySplines: EASE + ';' + EASE + ';' + EASE + ';' + EASE + ';0 0 1 1', dur: '5.2s', repeatCount: 'indefinite' }));
    baton.appendChild(svgEl('animate', { attributeName: 'opacity', values: '0;1;1;0', keyTimes: '0;0.04;0.95;1', dur: '5.2s', repeatCount: 'indefinite' }));
    s.appendChild(baton);
    var rep = entry(474, 52, '5.2s', '0s', 0.86, 0.92);
    rep.appendChild(svgEl('rect', { x: -34, y: -16, width: 68, height: 30, rx: '3', fill: 'var(--bg,#fafaf5)', stroke: 'var(--blueprint,#3553ff)', 'stroke-width': '1.4' }));
    rep.appendChild(txt(0, 3, '报告', '9', 'var(--blueprint,#3553ff)'));
    s.appendChild(rep);
    s.appendChild(txt(20, 40, '直接导入 Python 模块，无需框架', '9', 'var(--ink-soft,#555)', 'start'));
    shell(host, '研究流程演示（Research Demo）', '五项契约必须衔接', s,
      '演示把 D 路线（Track D）前几课构建的阶段串成一次运行：初始假设、UCB 调度器、实验执行器、评审循环和论文写作器。每次交接都经过契约门禁（Contract Gate），校验数据结构后才运行下一阶段；流程最终自动结束并生成一份演示报告。任何契约衔接缺陷都会在这一课暴露。');
  }

  // 第 58 课：将像素网格切分并展平为词元序列。
  function chPatches(host) {
    var s = svg(250), gx = 40, gy = 54, c = 24, p = 26;
    s.appendChild(txt(gx, 40, '224×224 图像，16×16 图像块', '9', 'var(--ink-soft,#555)', 'start'));
    var i, j;
    for (i = 0; i < 4; i++) {
      for (j = 0; j < 4; j++) {
        var hot = (i === 1 && j === 2);
        s.appendChild(svgEl('rect', { x: gx + j * p, y: gy + i * p, width: c, height: c, fill: hot ? 'var(--bg-surface,#eee)' : 'var(--bg,#fafaf5)', stroke: hot ? 'var(--blueprint,#3553ff)' : 'var(--rule-soft,#ddd)', 'stroke-width': hot ? '1.6' : '1' }));
      }
    }
    var fx = gx + 2 * p, fy = gy + p, tx = 250 + 2 * 24, ty = 186;
    var fly = svgEl('rect', { x: fx, y: fy, width: c, height: c, fill: 'var(--bg-surface,#eee)', stroke: 'var(--blueprint,#3553ff)', 'stroke-width': '1.6', opacity: '0' });
    fly.appendChild(svgEl('animate', { attributeName: 'x', values: fx + ';' + fx + ';' + tx + ';' + tx, keyTimes: '0;0.1;0.5;1', calcMode: 'spline', keySplines: '0 0 1 1;' + EASE + ';0 0 1 1', dur: '4s', repeatCount: 'indefinite' }));
    fly.appendChild(svgEl('animate', { attributeName: 'y', values: fy + ';' + fy + ';' + (ty - 2) + ';' + (ty - 2), keyTimes: '0;0.1;0.5;1', calcMode: 'spline', keySplines: '0 0 1 1;' + EASE + ';0 0 1 1', dur: '4s', repeatCount: 'indefinite' }));
    fly.appendChild(svgEl('animate', { attributeName: 'opacity', values: '0;1;1;0;0', keyTimes: '0;0.1;0.52;0.58;1', dur: '4s', repeatCount: 'indefinite' }));
    s.appendChild(fly);
    s.appendChild(txt(232, 130, '展平为 768 维 + 一个线性层', '9', 'var(--ink-soft,#555)', 'start'));
    s.appendChild(txt(228, 178, '+CLS', '8', 'var(--ink-mute,#777)', 'end'));
    for (i = 0; i < 8; i++) {
      var sq = svgEl('rect', { x: 250 + i * 24, y: ty, width: 20, height: 20, fill: 'var(--bg-surface,#eee)', stroke: i === 2 ? 'var(--blueprint,#3553ff)' : 'var(--rule-soft,#ddd)', 'stroke-width': '1.2', opacity: '0.3' });
      var q = (0.5 + i * 0.05).toFixed(2), q2 = (0.55 + i * 0.05).toFixed(2);
      sq.appendChild(svgEl('animate', { attributeName: 'opacity', values: '0.3;0.3;1;1', keyTimes: '0;' + q + ';' + q2 + ';1', dur: '4s', repeatCount: 'indefinite' }));
      s.appendChild(sq);
    }
    s.appendChild(txt(345, 168, '196 个 768 维词元', '9', 'var(--ink,#1a1a1a)'));
    s.appendChild(svgEl('path', { d: 'M 250 226 q 12 -10 24 0 t 24 0 t 24 0 t 24 0 t 24 0 t 24 0 t 24 0 t 24 0', fill: 'none', stroke: 'var(--blueprint,#3553ff)', 'stroke-width': '1.2', opacity: '0.6' }));
    s.appendChild(txt(345, 244, '+ 二维正弦位置编码', '8', 'var(--ink-mute,#777)'));
    shell(host, '图像块嵌入（Patch Embedding）', '将像素转为词元', s,
      '逐像素读取会产生长达 150,528 个词元的序列，十二层 Transformer 难以承担这一开销。将图像切成 16×16 方块后得到 196 个图像块（Patch），各自展平为 768 个值，经一个线性层投影到隐藏维度，再用二维正弦位置编码（2D Sinusoidal Positional Encoding）补充原始位置。Transformer 因而只需处理较短的序列。');
  }

  // 第 59 课：图像块信息穿过模块堆叠，汇入 CLS。
  function chVit(host) {
    var s = svg(260), cx = 260, cy = 62;
    var bands = [[160, '模块 1'], [124, '...'], [88, '模块 12']];
    var i;
    for (i = 0; i < 3; i++) {
      s.appendChild(svgEl('rect', { x: 110, y: bands[i][0], width: 300, height: 26, rx: '3', fill: 'var(--bg-surface,#eee)', stroke: 'var(--rule-soft,#ddd)', 'stroke-width': '1', opacity: '0.55' }));
      s.appendChild(txt(420, bands[i][0] + 17, bands[i][1], '8', 'var(--ink-mute,#777)', 'start'));
    }
    var toks = [136, 180, 224, 268, 312, 356];
    for (i = 0; i < 6; i++) {
      s.appendChild(svgEl('rect', { x: toks[i], y: 212, width: 18, height: 18, rx: '2', fill: 'var(--bg,#fafaf5)', stroke: 'var(--rule-soft,#ddd)', 'stroke-width': '1.2' }));
      s.appendChild(svgEl('line', { x1: toks[i] + 9, y1: 212, x2: cx, y2: cy + 12, stroke: 'var(--rule-soft,#ddd)', 'stroke-width': '0.6' }));
    }
    var send = [0, 2, 3, 5];
    for (i = 0; i < 4; i++) {
      var sx = toks[send[i]] + 9;
      var d = svgEl('circle', { cx: sx, cy: 212, r: '3.5', fill: 'var(--blueprint,#3553ff)', opacity: '0' });
      d.appendChild(svgEl('animate', { attributeName: 'cx', values: sx + ';' + cx, keyTimes: '0;1', calcMode: 'spline', keySplines: EASE, dur: '3.4s', begin: (i * 0.15).toFixed(2) + 's', repeatCount: 'indefinite' }));
      d.appendChild(svgEl('animate', { attributeName: 'cy', values: '212;' + (cy + 14), keyTimes: '0;1', calcMode: 'spline', keySplines: EASE, dur: '3.4s', begin: (i * 0.15).toFixed(2) + 's', repeatCount: 'indefinite' }));
      d.appendChild(svgEl('animate', { attributeName: 'opacity', values: '0;1;1;0', keyTimes: '0;0.12;0.9;1', dur: '3.4s', begin: (i * 0.15).toFixed(2) + 's', repeatCount: 'indefinite' }));
      s.appendChild(d);
    }
    s.appendChild(svgEl('circle', { cx: cx, cy: cy, r: '13', fill: 'var(--bg-surface,#eee)', stroke: 'var(--blueprint,#3553ff)', 'stroke-width': '1.6' }));
    s.appendChild(txt(cx, cy + 3, 'CLS', '9', 'var(--blueprint,#3553ff)'));
    var ring = svgEl('circle', { cx: cx, cy: cy, r: '13', fill: 'none', stroke: 'var(--blueprint,#3553ff)', 'stroke-width': '1.6' });
    ring.appendChild(svgEl('animate', { attributeName: 'r', values: '13;26', keyTimes: '0;1', calcMode: 'spline', keySplines: EASE, dur: '3.4s', begin: '0.7s', repeatCount: 'indefinite' }));
    ring.appendChild(svgEl('animate', { attributeName: 'opacity', values: '0.6;0', keyTimes: '0;1', dur: '3.4s', begin: '0.7s', repeatCount: 'indefinite' }));
    s.appendChild(ring);
    s.appendChild(txt(cx, 32, 'CLS 汇总整幅图像', '9', 'var(--ink-soft,#555)'));
    s.appendChild(txt(cx, 250, '12 个 Pre-LN 模块 × 12 个头，GELU，4 倍 FFN', '9', 'var(--ink-mute,#777)'));
    shell(host, '视觉 Transformer 编码器（ViT Encoder）', '通过注意力交换图像块信息', s,
      '图像块词元在输入时尚未交换彼此的信息。十二个前置层归一化（Pre-LN）的多头自注意力模块让各图像块互相交流，分类词元（CLS Token）逐层累积整图特征；其最终隐藏状态（Hidden State）形成后续模块读取的池化摘要（Pooled Summary）。这类模块构成 CLIP、SigLIP 和 DINOv2 的主干。');
  }

  // 第 60 课：图像向量经 MLP 投影进入文本空间。
  function chProjection(host) {
    var s = svg(250);
    s.appendChild(svgEl('ellipse', { cx: 110, cy: 122, rx: 80, ry: 66, fill: 'none', stroke: 'var(--rule-soft,#ddd)', 'stroke-width': '1.2', 'stroke-dasharray': '4 4' }));
    s.appendChild(svgEl('ellipse', { cx: 410, cy: 122, rx: 80, ry: 66, fill: 'none', stroke: 'var(--rule-soft,#ddd)', 'stroke-width': '1.2', 'stroke-dasharray': '4 4' }));
    s.appendChild(txt(110, 40, '视觉空间（768 维）', '9', 'var(--ink-soft,#555)'));
    s.appendChild(txt(410, 40, '文本空间（512 维）', '9', 'var(--ink-soft,#555)'));
    s.appendChild(txt(110, 202, '冻结', '8', 'var(--ink-mute,#777)'));
    s.appendChild(txt(410, 202, '冻结', '8', 'var(--ink-mute,#777)'));
    var pts = [[78, 96], [132, 88], [120, 152], [388, 150], [442, 140], [396, 96]];
    var i;
    for (i = 0; i < 6; i++) {
      s.appendChild(svgEl('circle', { cx: pts[i][0], cy: pts[i][1], r: '3', fill: 'var(--ink-mute,#777)', opacity: '0.5' }));
    }
    s.appendChild(svgEl('circle', { cx: 86, cy: 128, r: '5', fill: 'var(--blueprint,#3553ff)' }));
    s.appendChild(txt(86, 146, '图像 CLS', '8', 'var(--ink,#1a1a1a)'));
    s.appendChild(svgEl('circle', { cx: 434, cy: 102, r: '5', fill: 'none', stroke: 'var(--blueprint,#3553ff)', 'stroke-width': '1.6' }));
    s.appendChild(txt(434, 84, '图像描述', '8', 'var(--ink,#1a1a1a)'));
    s.appendChild(rect(226, 92, 68, 60, 'var(--bg-surface,#eee)', 'var(--blueprint,#3553ff)'));
    s.appendChild(txt(260, 108, '线性层', '8', 'var(--ink,#1a1a1a)'));
    s.appendChild(txt(260, 122, 'GELU', '8', 'var(--ink,#1a1a1a)'));
    s.appendChild(txt(260, 136, '线性层', '8', 'var(--ink,#1a1a1a)'));
    s.appendChild(txt(260, 170, '参与训练（1.3M 参数）', '8', 'var(--blueprint,#3553ff)'));
    var mv = svgEl('circle', { cx: 86, cy: 128, r: '5', fill: 'var(--blueprint,#3553ff)', opacity: '0' });
    mv.appendChild(svgEl('animate', { attributeName: 'cx', values: '86;86;260;424;424', keyTimes: '0;0.08;0.42;0.72;1', calcMode: 'spline', keySplines: '0 0 1 1;' + EASE + ';' + EASE + ';0 0 1 1', dur: '4.6s', repeatCount: 'indefinite' }));
    mv.appendChild(svgEl('animate', { attributeName: 'cy', values: '128;128;122;106;106', keyTimes: '0;0.08;0.42;0.72;1', calcMode: 'spline', keySplines: '0 0 1 1;' + EASE + ';' + EASE + ';0 0 1 1', dur: '4.6s', repeatCount: 'indefinite' }));
    mv.appendChild(svgEl('animate', { attributeName: 'opacity', values: '0;1;1;1;0', keyTimes: '0;0.08;0.72;0.95;1', dur: '4.6s', repeatCount: 'indefinite' }));
    s.appendChild(mv);
    var hit = svgEl('circle', { cx: 434, cy: 102, r: '5', fill: 'none', stroke: 'var(--blueprint,#3553ff)', 'stroke-width': '1.4' });
    hit.appendChild(svgEl('animate', { attributeName: 'r', values: '5;5;16', keyTimes: '0;0.72;1', calcMode: 'spline', keySplines: '0 0 1 1;' + EASE, dur: '4.6s', repeatCount: 'indefinite' }));
    hit.appendChild(svgEl('animate', { attributeName: 'opacity', values: '0;0.5;0', keyTimes: '0;0.72;1', dur: '4.6s', repeatCount: 'indefinite' }));
    s.appendChild(hit);
    var cl = txt(380, 232, '余弦损失拉近配对向量', '9', 'var(--warn,#b8870f)');
    cl.appendChild(svgEl('animate', { attributeName: 'opacity', values: '0;0;1;1;0', keyTimes: '0;0.72;0.8;0.95;1', dur: '4.6s', repeatCount: 'indefinite' }));
    s.appendChild(cl);
    shell(host, '模态投影（Modality Projection）', '连接视觉与文本空间', s,
      '视觉编码器与文本嵌入表使用不同的表示基底。约 1.3M 参数的两层多层感知机（Multilayer Perceptron，MLP）将池化图像向量映射到文本嵌入空间；与配对图像描述计算余弦对齐损失（Cosine Alignment Loss），使投影点靠近对应文本向量。编码器和文本表保持冻结，只有投影层参与学习。');
  }

  // 第 61 课：一个文本词元向所有图像记忆词元发起查询。
  function chCross(host) {
    var s = svg(260), mts = [130, 176, 222, 268, 314, 360], my = 48;
    s.appendChild(txt(260, 34, '图像记忆词元（每张图像只计算一次）', '9', 'var(--ink-soft,#555)'));
    var i;
    for (i = 0; i < 6; i++) {
      s.appendChild(svgEl('rect', { x: mts[i], y: my, width: 26, height: 26, rx: '3', fill: 'var(--bg-surface,#eee)', stroke: 'var(--rule-soft,#ddd)', 'stroke-width': '1.2' }));
    }
    var words = ['a', 'cat', 'on', 'the', 'mat'], txs = [120, 176, 232, 288, 344], ty = 196;
    for (i = 0; i < 5; i++) {
      s.appendChild(rect(txs[i], ty, 44, 26, 'var(--bg,#fafaf5)', i === 2 ? 'var(--blueprint,#3553ff)' : 'var(--rule-soft,#ddd)'));
      s.appendChild(txt(txs[i] + 22, ty + 17, words[i], '10', i === 2 ? 'var(--blueprint,#3553ff)' : 'var(--ink,#1a1a1a)'));
      if (i < 4) {
        s.appendChild(svgEl('line', { x1: txs[i] + 44, y1: ty + 13, x2: txs[i + 1], y2: ty + 13, stroke: 'var(--ink-mute,#777)', 'stroke-width': '1.2' }));
      }
    }
    s.appendChild(txt(260, 244, '因果自注意力：仅从左向右', '9', 'var(--ink-mute,#777)'));
    var ax = txs[2] + 22;
    for (i = 0; i < 6; i++) {
      var fan = svgEl('line', { x1: ax, y1: ty, x2: mts[i] + 13, y2: my + 26, stroke: 'var(--blueprint,#3553ff)', 'stroke-width': '1.2', opacity: '0' });
      var f0 = (0.08 + i * 0.06).toFixed(2), f1 = (0.16 + i * 0.06).toFixed(2);
      fan.appendChild(svgEl('animate', { attributeName: 'opacity', values: '0;0;0.75;0.75;0;0', keyTimes: '0;' + f0 + ';' + f1 + ';0.56;0.6;1', calcMode: 'spline', keySplines: '0 0 1 1;' + EASE + ';0 0 1 1;0.4 0 1 1;0 0 1 1', dur: '3.8s', repeatCount: 'indefinite' }));
      s.appendChild(fan);
    }
    s.appendChild(txt(392, 130, '图像查询不加掩码', '8', 'var(--blueprint,#3553ff)', 'start'));
    var ans = svgEl('circle', { cx: mts[3] + 13, cy: my + 26, r: '4', fill: 'var(--warn,#b8870f)', opacity: '0' });
    ans.appendChild(svgEl('animate', { attributeName: 'cx', values: (mts[3] + 13) + ';' + (mts[3] + 13) + ';' + ax + ';' + ax, keyTimes: '0;0.62;0.84;1', calcMode: 'spline', keySplines: '0 0 1 1;' + EASE + ';0 0 1 1', dur: '3.8s', repeatCount: 'indefinite' }));
    ans.appendChild(svgEl('animate', { attributeName: 'cy', values: (my + 26) + ';' + (my + 26) + ';' + (ty - 4) + ';' + (ty - 4), keyTimes: '0;0.62;0.84;1', calcMode: 'spline', keySplines: '0 0 1 1;' + EASE + ';0 0 1 1', dur: '3.8s', repeatCount: 'indefinite' }));
    ans.appendChild(svgEl('animate', { attributeName: 'opacity', values: '0;0;1;1;0', keyTimes: '0;0.6;0.66;0.86;1', dur: '3.8s', repeatCount: 'indefinite' }));
    s.appendChild(ans);
    shell(host, '交叉注意力（Cross-attention）', '文本查询 · 图像提供信息', s,
      '后期融合（Late Fusion）中，解码器处理文本词元，并在每层访问图像流：高亮词元向所有图像记忆词元（Memory Token）发起无掩码查询，加权结果回流到其残差流（Residual Stream）。底部文本序列的自注意力仍保持因果性。图像仅编码一次，在每个解码步骤复用，因此生成较长图像描述的成本仍然可控。英文词元示例保留，用于展示生成顺序。');
  }

  // 第 62 课：匹配对点亮相似度矩阵对角线，两项损失同时下降。
  function chInfoNCE(host) {
    var s = svg(250), mx = 70, my = 60, pitch = 36;
    s.appendChild(txt(mx + 2 * pitch, 46, '图像描述', '9', 'var(--ink-soft,#555)'));
    var lab = svgEl('text', { x: mx - 16, y: my + 2 * pitch, 'text-anchor': 'middle', 'font-family': 'var(--font-mono,monospace)', 'font-size': '9', fill: 'var(--ink-soft,#555)', transform: 'rotate(-90 ' + (mx - 16) + ' ' + (my + 2 * pitch) + ')' });
    lab.appendChild(document.createTextNode('图像'));
    s.appendChild(lab);
    var off = svgEl('g', {});
    var i, j;
    for (i = 0; i < 4; i++) {
      for (j = 0; j < 4; j++) {
        if (i !== j) {
          off.appendChild(svgEl('rect', { x: mx + j * pitch, y: my + i * pitch, width: 34, height: 34, rx: '2', fill: 'var(--bg-surface,#eee)', stroke: 'var(--rule-soft,#ddd)', 'stroke-width': '1' }));
        }
      }
    }
    off.appendChild(svgEl('animate', { attributeName: 'opacity', values: '0.9;0.9;0.3;0.3', keyTimes: '0;0.2;0.6;1', calcMode: 'spline', keySplines: '0 0 1 1;' + EASE + ';0 0 1 1', dur: '4.4s', repeatCount: 'indefinite' }));
    s.appendChild(off);
    for (i = 0; i < 4; i++) {
      var g = entry(mx + i * pitch + 17, my + i * pitch + 17, '4.4s', (0.2 + i * 0.18).toFixed(2) + 's', 0.02, 0.14);
      g.appendChild(svgEl('rect', { x: -17, y: -17, width: 34, height: 34, rx: '2', fill: 'var(--blueprint,#3553ff)', opacity: '0.85' }));
      s.appendChild(g);
    }
    s.appendChild(txt(mx + 2 * pitch, my + 4 * pitch + 18, 'N 个正例，N*N - N 个负例', '8', 'var(--ink-mute,#777)'));
    var x0 = 290, y1 = 190;
    s.appendChild(svgEl('line', { x1: x0, y1: 70, x2: x0, y2: y1, stroke: 'var(--rule-soft,#ddd)', 'stroke-width': '1' }));
    s.appendChild(svgEl('line', { x1: x0, y1: y1, x2: 470, y2: y1, stroke: 'var(--rule-soft,#ddd)', 'stroke-width': '1' }));
    var c1 = svgEl('path', { d: 'M 292 88 Q 340 150 468 166', fill: 'none', stroke: 'var(--blueprint,#3553ff)', 'stroke-width': '1.8', 'stroke-dasharray': '260', 'stroke-dashoffset': '260' });
    c1.appendChild(svgEl('animate', { attributeName: 'stroke-dashoffset', values: '260;0;0', keyTimes: '0;0.7;1', calcMode: 'spline', keySplines: EASE + ';0 0 1 1', dur: '4.4s', repeatCount: 'indefinite' }));
    s.appendChild(c1);
    var c2 = svgEl('path', { d: 'M 292 108 Q 350 158 468 178', fill: 'none', stroke: 'var(--warn,#b8870f)', 'stroke-width': '1.8', 'stroke-dasharray': '260', 'stroke-dashoffset': '260' });
    c2.appendChild(svgEl('animate', { attributeName: 'stroke-dashoffset', values: '260;260;0;0', keyTimes: '0;0.1;0.75;1', calcMode: 'spline', keySplines: '0 0 1 1;' + EASE + ';0 0 1 1', dur: '4.4s', repeatCount: 'indefinite' }));
    s.appendChild(c2);
    s.appendChild(txt(322, 82, 'InfoNCE', '9', 'var(--blueprint,#3553ff)', 'start'));
    s.appendChild(txt(340, 116, '语言模型损失', '9', 'var(--warn,#b8870f)', 'start'));
    s.appendChild(txt(380, 208, '演示训练 50 步，共享权重', '8', 'var(--ink-mute,#777)'));
    shell(host, '双目标预训练（Dual-objective Pretraining）', '同时学习排序与生成', s,
      '一批 N 个图像与描述对（Image-caption Pair）形成相似度矩阵：对角线上有 N 个匹配单元，非对角线上有 N*N - N 个不匹配单元。信息噪声对比估计（InfoNCE）对每行和每列计算交叉熵，使对角线变亮，其余单元变暗。语言模型损失（LM Loss）使用同一组权重学习为图像生成描述，在 50 步演示训练中，两条损失曲线同时下降。');
  }

  // 第 63 课：匹配图像的排名上升，进入 R@K 窗口。
  function chEval(host) {
    var s = svg(260), rx = 56, rw = 150;
    s.appendChild(txt(rx, 34, '检索：对所有图像排序', '9', 'var(--ink-soft,#555)', 'start'));
    var i;
    for (i = 0; i < 6; i++) {
      s.appendChild(rect(rx, 48 + i * 30, rw, 24, 'var(--bg,#fafaf5)', 'var(--rule-soft,#ddd)'));
      s.appendChild(txt(rx - 10, 65 + i * 30, String(i + 1), '9', 'var(--ink-mute,#777)', 'end'));
    }
    s.appendChild(svgEl('rect', { x: rx - 4, y: 44, width: rw + 8, height: 152, rx: '4', fill: 'none', stroke: 'var(--blueprint,#3553ff)', 'stroke-width': '1.2', 'stroke-dasharray': '5 4', opacity: '0.5' }));
    s.appendChild(txt(rx + rw + 12, 56, 'R@5 窗口', '8', 'var(--blueprint,#3553ff)', 'start'));
    s.appendChild(txt(rx + rw + 12, 70, 'R@1：仅第 1 行', '8', 'var(--ink-mute,#777)', 'start'));
    var tg = svgEl('g', { transform: 'translate(' + rx + ' 198)' });
    tg.appendChild(svgEl('animateTransform', { attributeName: 'transform', type: 'translate', values: rx + ' 198;' + rx + ' 198;' + rx + ' 78;' + rx + ' 78', keyTimes: '0;0.16;0.52;1', calcMode: 'spline', keySplines: '0 0 1 1;' + EASE + ';0 0 1 1', dur: '4.8s', repeatCount: 'indefinite' }));
    tg.appendChild(svgEl('rect', { x: 0, y: 0, width: rw, height: 24, rx: '4', fill: 'var(--bg-surface,#eee)', stroke: 'var(--blueprint,#3553ff)', 'stroke-width': '1.6' }));
    tg.appendChild(txt(rw / 2, 16, '匹配图像', '9', 'var(--blueprint,#3553ff)'));
    s.appendChild(tg);
    var hit = txt(rx + rw + 12, 104, 'R@1 未命中，R@5 命中', '8', 'var(--warn,#b8870f)', 'start');
    hit.appendChild(svgEl('animate', { attributeName: 'opacity', values: '0;0;1;1;0', keyTimes: '0;0.52;0.6;0.95;1', dur: '4.8s', repeatCount: 'indefinite' }));
    s.appendChild(hit);
    s.appendChild(txt(330, 34, '另两项评估', '9', 'var(--ink-soft,#555)', 'start'));
    s.appendChild(rect(330, 48, 168, 44, 'var(--bg,#fafaf5)', 'var(--rule-soft,#ddd)'));
    s.appendChild(txt(340, 66, 'VQA 精确匹配', '9', 'var(--ink,#1a1a1a)', 'start'));
    var em = entry(414, 80, '4.8s', '0s', 0.3, 0.4);
    em.appendChild(txt(-74, 3, 'pred == ref：每例 1 位', '8', 'var(--blueprint,#3553ff)', 'start'));
    s.appendChild(em);
    s.appendChild(rect(330, 112, 168, 44, 'var(--bg,#fafaf5)', 'var(--rule-soft,#ddd)'));
    s.appendChild(txt(340, 130, '图像描述 BLEU-4', '9', 'var(--ink,#1a1a1a)', 'start'));
    s.appendChild(svgEl('rect', { x: 340, y: 138, width: 120, height: 8, rx: '2', fill: 'var(--bg-surface,#eee)', stroke: 'var(--rule-soft,#ddd)', 'stroke-width': '1' }));
    var bar = svgEl('rect', { x: 340, y: 138, width: 0, height: 8, rx: '2', fill: 'var(--blueprint,#3553ff)' });
    bar.appendChild(svgEl('animate', { attributeName: 'width', values: '0;0;86;86', keyTimes: '0;0.35;0.65;1', calcMode: 'spline', keySplines: '0 0 1 1;' + EASE + ';0 0 1 1', dur: '4.8s', repeatCount: 'indefinite' }));
    s.appendChild(bar);
    s.appendChild(txt(330, 186, '1–4 元组精确率，', '8', 'var(--ink-mute,#777)', 'start'));
    s.appendChild(txt(330, 200, '几何平均 + 简短惩罚', '8', 'var(--ink-mute,#777)', 'start'));
    s.appendChild(txt(rx, 240, '训练损失进入平台期，不能替代这三项评估', '9', 'var(--ink-mute,#777)', 'start'));
    shell(host, '多模态评估（Multimodal Evaluation）', 'R@K · 精确匹配 · BLEU-4', s,
      '三项评估衡量训练损失无法说明的能力。检索按图像与查询描述的余弦相似度排序，检查匹配图像是否进入前 1、5 或 10 项，即前 K 项召回率（Recall@K，R@K）；图中升至第 2 名，R@1 未命中，R@5 命中。视觉问答（Visual Question Answering，VQA）按答案精确匹配为每个样本记一位结果；图像描述生成（Image Captioning）则对生成词元计算带简短惩罚（Brevity Penalty）的 BLEU-4。');
  }

  LF.register({
    'ch-paper-skeleton': chPaper,
    'ch-critic-converge': chCritic,
    'ch-ucb-scheduler': chScheduler,
    'ch-research-pipeline': chPipeline,
    'ch-patch-tokenizer': chPatches,
    'ch-cls-funnel': chVit,
    'ch-projection-bridge': chProjection,
    'ch-crossattn-fan': chCross,
    'ch-infonce-diagonal': chInfoNCE,
    'ch-recall-window': chEval
  });
})();
