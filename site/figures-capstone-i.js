/* figures-capstone-i.js：阶段 19 综合项目第 64、68、70、74、76、77、80、81、84 课动态图。
   仅使用 SMIL，无外部依赖，通过 CSS 变量适配主题。 */
(function () {
  'use strict';
  var LF = window.LF;
  if (!LF) { return; }

  var el = LF.el, svgEl = LF.svgEl;
  var INK = 'var(--ink,#1a1a1a)', SOFT = 'var(--ink-soft,#555)', MUTE = 'var(--ink-mute,#777)';
  var BP = 'var(--blueprint,#3553ff)', BG = 'var(--bg,#fafaf5)', SURF = 'var(--bg-surface,#eee)';
  var RULE = 'var(--rule-soft,#ddd)', WARN = 'var(--warn,#b8870f)';
  var EASE = '0.23 1 0.32 1';

  function anim(attr, vals, dur, extra) {
    var a = { attributeName: attr, values: vals, dur: dur, repeatCount: 'indefinite' };
    if (extra) for (var k in extra) a[k] = extra[k];
    return svgEl('animate', a);
  }
  function animT(type, vals, dur, extra) {
    var a = { attributeName: 'transform', type: type, values: vals, dur: dur, repeatCount: 'indefinite' };
    if (extra) for (var k in extra) a[k] = extra[k];
    return svgEl('animateTransform', a);
  }
  function card(host, label, hint, svg, caption) {
    host.appendChild(el('div', { class: 'lf' }, [
      el('div', { class: 'lf-head' }, [el('span', { class: 'lf-label' }, [label]), el('span', {}, [hint])]),
      el('div', { class: 'lf-body' }, [el('div', { class: 'lf-out' }, [svg])]),
      el('div', { class: 'lf-cap' }, [caption])
    ]));
  }
  function txt(x, y, s, fill, size, anchor) {
    return svgEl('text', {
      x: x, y: y, fill: fill || SOFT, 'font-size': size || 11,
      'font-family': 'var(--font-mono,monospace)', 'text-anchor': anchor || 'middle'
    }, [svgEl('tspan', {}, [document.createTextNode(s)])]);
  }
  // 入场时从透明、约 95% 大小缓出，随后保持到本轮结束。
  function popIn(g, cx, cy, dur, begin) {
    var b = begin || '0s', kt = '0;0.16;1', sp = EASE + ';0 0 1 1';
    g.setAttribute('opacity', '0');
    g.appendChild(animT('translate', (cx * 0.05).toFixed(1) + ' ' + (cy * 0.05).toFixed(1) + ';0 0;0 0', dur,
      { keyTimes: kt, calcMode: 'spline', keySplines: sp, begin: b, additive: 'sum' }));
    g.appendChild(animT('scale', '0.95;1;1', dur,
      { keyTimes: kt, calcMode: 'spline', keySplines: sp, begin: b, additive: 'sum' }));
    g.appendChild(anim('opacity', '0;1;1', dur, { keyTimes: kt, calcMode: 'spline', keySplines: sp, begin: b }));
  }

  // 64：同一文档的三种切分方案，其中一种切断了标准答案片段。
  function chunkBoundaries(host) {
    var svg = svgEl('svg', { viewBox: '0 0 520 250' });
    var x0 = 100, w = 380;
    svg.appendChild(txt(92, 50, '文档', MUTE, 10, 'end'));
    svg.appendChild(svgEl('rect', { x: x0, y: 34, width: w, height: 26, rx: 4, fill: BG, stroke: RULE, 'stroke-width': '1.5' }));
    svg.appendChild(svgEl('rect', { x: 255, y: 34, width: 80, height: 26, rx: 4, fill: BP, opacity: '0.16', stroke: BP, 'stroke-width': '1.4' }));
    svg.appendChild(txt(295, 26, '标准答案片段', BP, 9));
    var rows = [
      { y: 100, label: '固定 512', cuts: [195, 290, 385], bad: 290 },
      { y: 150, label: '按句切分', cuts: [178, 255, 335, 412], bad: -1 },
      { y: 200, label: 'Markdown', cuts: [222, 358], bad: -1 }
    ];
    var i, j;
    for (i = 0; i < rows.length; i++) {
      var r = rows[i];
      svg.appendChild(txt(92, r.y + 15, r.label, SOFT, 10, 'end'));
      svg.appendChild(svgEl('rect', { x: x0, y: r.y, width: w, height: 22, rx: 3, fill: BG, stroke: RULE, 'stroke-width': '1' }));
      svg.appendChild(svgEl('rect', { x: 255, y: r.y, width: 80, height: 22, rx: 3, fill: BP, opacity: '0.08' }));
      var cg = svgEl('g', {});
      for (j = 0; j < r.cuts.length; j++) {
        var cx = r.cuts[j], bad = cx === r.bad;
        var ln = svgEl('line', { x1: cx, y1: r.y - 4, x2: cx, y2: r.y + 26, stroke: bad ? WARN : BP, 'stroke-width': bad ? '2.4' : '1.6' });
        if (bad) ln.appendChild(anim('opacity', '1;0.35;1', '2.6s'));
        cg.appendChild(ln);
      }
      popIn(cg, 260, r.y + 10, '5s', (0.3 + i * 0.35) + 's');
      svg.appendChild(cg);
    }
    svg.appendChild(txt(290, 244, '固定窗口切断答案片段；Markdown 切分保留完整片段', MUTE, 9));
    card(host, '分块边界（Chunk Boundaries）', '同一文档 · 三种切分方案',
      svg,
      '各策略在同一文档的不同位置切分。固定 512 词元（Token）的窗口切断了标准答案片段（Gold Answer Span），两部分的嵌入（Embedding）落入不同的簇，检索器（Retriever）尚未运行，召回率（Recall）就已受损。按句切分与按 Markdown 结构切分会遵循文本本身的边界。');
  }

  // 68：依次扫描排序结果，命中标准文档时点亮指标面板。
  function ragMetricLadder(host) {
    var svg = svgEl('svg', { viewBox: '0 0 520 240' });
    var x0 = 70, y0 = 42, rh = 34, gold = { 0: 1, 3: 1 };
    var i;
    svg.appendChild(txt(x0, 28, '检索结果前 5 项', MUTE, 10, 'start'));
    for (i = 0; i < 5; i++) {
      var y = y0 + i * rh, g = gold[i];
      svg.appendChild(txt(x0 - 14, y + 17, String(i + 1), MUTE, 10, 'end'));
      svg.appendChild(svgEl('rect', { x: x0, y: y, width: 170, height: 26, rx: 4, fill: g ? BP : BG, 'fill-opacity': g ? '0.14' : '1', stroke: g ? BP : RULE, 'stroke-width': g ? '1.8' : '1' }));
      svg.appendChild(txt(x0 + 85, y + 17, g ? '标准文档' : '文档', g ? BP : MUTE, 10));
    }
    var sweep = svgEl('rect', { x: x0 - 4, y: y0 - 4, width: 178, height: 34, rx: 5, fill: 'none', stroke: BP, 'stroke-width': '2.2', opacity: '0.9' });
    sweep.appendChild(animT('translate', '0 0;0 ' + rh + ';0 ' + (2 * rh) + ';0 ' + (3 * rh) + ';0 ' + (4 * rh) + ';0 0', '5s',
      { calcMode: 'discrete', keyTimes: '0;0.18;0.36;0.54;0.72;0.9' }));
    svg.appendChild(sweep);
    var metrics = [
      ['precision@5 = 2/5', 0.2], ['recall@5    = 2/3', 0.4],
      ['MRR         = 1.0', 0.6], ['nDCG@5      = 0.86', 0.8]
    ];
    svg.appendChild(txt(310, 28, '指标面板', MUTE, 10, 'start'));
    for (i = 0; i < metrics.length; i++) {
      var m = txt(310, 58 + i * 26, metrics[i][0], i < 2 ? SOFT : BP, 11, 'start');
      m.appendChild(anim('opacity', '0;0;1;1', '5s',
        { keyTimes: '0;' + (metrics[i][1] - 0.06) + ';' + metrics[i][1] + ';1', calcMode: 'spline', keySplines: '0 0 1 1;' + EASE + ';0 0 1 1' }));
      svg.appendChild(m);
    }
    svg.appendChild(txt(310, 190, '忠实度 + 答案相关性', MUTE, 9, 'start'));
    svg.appendChild(txt(310, 204, '评价生成答案，而非检索排名', MUTE, 9, 'start'));
    card(host, '检索增强生成评估（RAG Evaluation）', '逐项扫描 · 六项指标',
      svg,
      '评估器遍历一次排序列表。每次命中标准文档，都会更新精确率（Precision）和召回率（Recall）；首次命中的位置决定平均倒数排名（MRR），按位置折损的得分决定归一化折损累计增益（nDCG）。忠实度（Faithfulness）和答案相关性（Answer Relevance）随后针对生成答案计算。因此，检索得分满分也可能产出错误答案。');
  }

  // 70：JSONL 记录依次通过校验关卡，错误记录被分流。
  function taskSpecGate(host) {
    var svg = svgEl('svg', { viewBox: '0 0 520 220' });
    svg.appendChild(txt(62, 66, 'tasks.jsonl', MUTE, 10));
    var i;
    for (i = 0; i < 3; i++) {
      svg.appendChild(svgEl('rect', { x: 34, y: 78 + i * 14, width: 56, height: 9, rx: 2, fill: SURF, stroke: RULE, 'stroke-width': '1' }));
    }
    var gate = svgEl('rect', { x: 244, y: 56, width: 14, height: 88, rx: 4, fill: BP });
    gate.appendChild(anim('opacity', '0.7;1;0.7', '2.6s'));
    svg.appendChild(gate);
    svg.appendChild(txt(251, 44, '校验器', BP, 10));
    svg.appendChild(txt(251, 160, '数据模式 · 指标词表 · 类型', MUTE, 8));
    svg.appendChild(svgEl('rect', { x: 396, y: 78, width: 92, height: 44, rx: 5, fill: BP, opacity: '0.12', stroke: BP, 'stroke-width': '1.8' }));
    svg.appendChild(txt(442, 104, '执行器', BP, 11));
    svg.appendChild(svgEl('path', { d: 'M300 176 H360', stroke: WARN, 'stroke-width': '1.4', fill: 'none' }));
    svg.appendChild(txt(330, 192, '错误行仅终止该记录，不中断整次运行', WARN, 8.5));
    var passPath = 'M100 100 H396';
    for (i = 0; i < 2; i++) {
      var ok = svgEl('rect', { x: -9, y: -6, width: 18, height: 12, rx: 2, fill: BG, stroke: BP, 'stroke-width': '1.6' });
      ok.appendChild(svgEl('animateMotion', { dur: '4.8s', repeatCount: 'indefinite', path: passPath, begin: (i * -1.6) + 's', calcMode: 'spline', keySplines: '0.4 0 0.6 1', keyTimes: '0;1', keyPoints: '0;1' }));
      svg.appendChild(ok);
    }
    var badRec = svgEl('rect', { x: -9, y: -6, width: 18, height: 12, rx: 2, fill: BG, stroke: WARN, 'stroke-width': '1.8' });
    badRec.appendChild(svgEl('animateMotion', { dur: '4.8s', repeatCount: 'indefinite', path: 'M100 100 H240 L300 172', begin: '-3.2s', calcMode: 'spline', keySplines: '0.4 0 0.6 1;' + EASE, keyTimes: '0;0.6;1', keyPoints: '0;0.66;1' }));
    badRec.appendChild(anim('opacity', '1;1;0.15', '4.8s', { keyTimes: '0;0.8;1', begin: '-3.2s' }));
    svg.appendChild(badRec);
    card(host, '任务规格校验关卡（Task Spec Gate）', '校验 · 分派 · 拒绝',
      svg,
      'tasks.jsonl 的每一行在进入执行器（Runner）前都会独立校验：必填字段是否齐全、metric_name 是否属于封闭词表、目标值类型是否正确。格式错误的记录会被分流并记入日志，其余记录继续运行。固定这一校验契约后，第 71 至 75 课便可依据单一字段分派任务。');
  }

  // 74：均值条形增长，自助法误差线出现，两个置信区间重叠。
  function leaderboardCI(host) {
    var svg = svgEl('svg', { viewBox: '0 0 520 220' });
    var x0 = 140, dur = '5s';
    svg.appendChild(svgEl('line', { x1: x0, y1: 36, x2: x0, y2: 186, stroke: RULE, 'stroke-width': '1.4' }));
    svg.appendChild(txt(480, 200, '平均得分与自助法 95% 置信区间', MUTE, 9, 'end'));
    var models = [
      { y: 56, label: '模型 A', w: 280, lo: -34, hi: 30 },
      { y: 104, label: '模型 B', w: 258, lo: -30, hi: 36 },
      { y: 152, label: '模型 C', w: 156, lo: -22, hi: 22 }
    ];
    var i;
    for (i = 0; i < models.length; i++) {
      var m = models[i], bx = x0 + m.w;
      svg.appendChild(txt(x0 - 10, m.y + 14, m.label, SOFT, 11, 'end'));
      var bar = svgEl('rect', { x: x0, y: m.y, width: (m.w * 0.4).toFixed(0), height: 20, rx: 3, fill: BP, opacity: i === 2 ? '0.35' : '0.75' });
      bar.appendChild(anim('width', (m.w * 0.4).toFixed(0) + ';' + m.w + ';' + m.w, dur,
        { keyTimes: '0;0.28;1', calcMode: 'spline', keySplines: EASE + ';0 0 1 1', begin: (i * 0.2) + 's' }));
      svg.appendChild(bar);
      var wg = svgEl('g', {});
      wg.appendChild(svgEl('line', { x1: bx + m.lo, y1: m.y + 10, x2: bx + m.hi, y2: m.y + 10, stroke: INK, 'stroke-width': '1.8' }));
      wg.appendChild(svgEl('line', { x1: bx + m.lo, y1: m.y + 3, x2: bx + m.lo, y2: m.y + 17, stroke: INK, 'stroke-width': '1.8' }));
      wg.appendChild(svgEl('line', { x1: bx + m.hi, y1: m.y + 3, x2: bx + m.hi, y2: m.y + 17, stroke: INK, 'stroke-width': '1.8' }));
      popIn(wg, bx, m.y + 10, dur, (1.5 + i * 0.25) + 's');
      svg.appendChild(wg);
    }
    var ovA = models[0], ovB = models[1];
    var oLo = x0 + ovB.w + ovB.lo, oHi = x0 + ovA.w + ovA.hi;
    var band = svgEl('g', {});
    band.appendChild(svgEl('rect', { x: oLo, y: 44, width: oHi - oLo, height: 90, fill: WARN, opacity: '0.12', stroke: WARN, 'stroke-width': '1', 'stroke-dasharray': '4 4' }));
    band.appendChild(txt((oLo + oHi) / 2, 38, '区间重叠：差距可能来自噪声', WARN, 9));
    band.appendChild(anim('opacity', '0;0;1;1', dur, { keyTimes: '0;0.55;0.68;1', calcMode: 'spline', keySplines: '0 0 1 1;' + EASE + ';0 0 1 1' }));
    svg.appendChild(band);
    card(host, '排行榜与自助法置信区间（Bootstrap CI）', '先排序 · 再检验排名是否可靠',
      svg,
      '聚合器将各任务的 EvalRun 记录汇总为每个模型的均值，再对任务进行有放回重采样，为均值计算自助法置信区间（Bootstrap Confidence Interval）。模型 A 的点估计（Point Estimate）高于模型 B，但两者区间重叠；因此，要看成对差值的置信区间，判断排名差异是否只是抽样噪声。');
  }

  // 76：四个进程构成环，数据块沿环移动，两个阶段交替进行。
  function ringAllreduce(host) {
    var svg = svgEl('svg', { viewBox: '0 0 520 250' });
    var cx = 170, cy = 128, r = 76;
    svg.appendChild(svgEl('circle', { cx: cx, cy: cy, r: r, fill: 'none', stroke: RULE, 'stroke-width': '1.5', 'stroke-dasharray': '5 5' }));
    var pos = [[cx, cy - r], [cx + r, cy], [cx, cy + r], [cx - r, cy]];
    var lbl = [[cx, cy - r - 12], [cx + r + 30, cy + 4], [cx, cy + r + 18], [cx - r - 30, cy + 4]];
    var i;
    for (i = 0; i < 4; i++) {
      svg.appendChild(svgEl('circle', { cx: pos[i][0], cy: pos[i][1], r: 13, fill: BG, stroke: BP, 'stroke-width': '2' }));
      svg.appendChild(txt(pos[i][0], pos[i][1] + 4, String(i), INK, 11));
      svg.appendChild(txt(lbl[i][0], lbl[i][1], '进程 ' + i, MUTE, 9));
    }
    var ringPath = 'M' + cx + ' ' + (cy - r) + ' A ' + r + ' ' + r + ' 0 1 1 ' + (cx - 0.01) + ' ' + (cy - r);
    for (i = 0; i < 4; i++) {
      var chunk = svgEl('rect', { x: -5, y: -5, width: 10, height: 10, rx: 2, fill: i === 0 ? WARN : BP, opacity: '0.9' });
      chunk.appendChild(svgEl('animateMotion', { dur: '4s', repeatCount: 'indefinite', path: ringPath, begin: (i * -1) + 's' }));
      svg.appendChild(chunk);
    }
    var p1 = txt(390, 84, '阶段 1 · 规约散播', BP, 11);
    p1.appendChild(anim('opacity', '1;1;0.2;0.2;1', '8s', { keyTimes: '0;0.42;0.5;0.92;1' }));
    svg.appendChild(p1);
    svg.appendChild(txt(390, 100, '经过 N-1 跳，逐步累加', MUTE, 9));
    var p2 = txt(390, 132, '阶段 2 · 全收集', BP, 11);
    p2.appendChild(anim('opacity', '0.2;0.2;1;1;0.2', '8s', { keyTimes: '0;0.42;0.5;0.92;1' }));
    svg.appendChild(p2);
    svg.appendChild(txt(390, 148, '经过 N-1 跳，分发求和结果', MUTE, 9));
    svg.appendChild(txt(390, 190, '每进程 2T(N-1)/N 字节', SOFT, 10));
    svg.appendChild(txt(390, 205, '不随集群规模线性增长', MUTE, 9));
    card(host, '环形全规约（Ring Allreduce）', '规约散播 · 全收集',
      svg,
      '每个进程（Rank）负责张量（Tensor）的一个数据块，只与环上的相邻进程通信。规约散播（Reduce-scatter）阶段，数据块经过 N-1 跳，逐步累加部分和；全收集（Allgather）阶段，最终求和结果再次沿环传播。没有根节点，也就没有集中到根节点的瓶颈；无论进程数如何变化，每个进程的通信量均为 2T(N-1)/N 字节。');
  }

  // 77：反向传播从右向左推进，梯度桶填满后，全规约与计算重叠。
  function ddpGradSync(host) {
    var svg = svgEl('svg', { viewBox: '0 0 520 240' });
    var lw = 88, gap = 18, x0 = 60, y0 = 50, dur = '5s';
    var i;
    svg.appendChild(txt(x0, 34, '反向传播', MUTE, 10, 'start'));
    svg.appendChild(txt(470, 34, '梯度由右向左流动', MUTE, 9, 'end'));
    for (i = 0; i < 4; i++) {
      var lx = x0 + i * (lw + gap);
      svg.appendChild(svgEl('rect', { x: lx, y: y0, width: lw, height: 34, rx: 4, fill: BG, stroke: RULE, 'stroke-width': '1.4' }));
      svg.appendChild(txt(lx + lw / 2, y0 + 22, '第 ' + (i + 1) + ' 层', SOFT, 11));
    }
    var hl = svgEl('rect', { x: x0 + 3 * (lw + gap) - 3, y: y0 - 3, width: lw + 6, height: 40, rx: 5, fill: BP, opacity: '0.16', stroke: BP, 'stroke-width': '2' });
    hl.appendChild(animT('translate', '0 0;' + (-(lw + gap)) + ' 0;' + (-2 * (lw + gap)) + ' 0;' + (-3 * (lw + gap)) + ' 0;0 0', dur,
      { calcMode: 'discrete', keyTimes: '0;0.22;0.44;0.66;0.92' }));
    svg.appendChild(hl);
    var buckets = [
      { x: x0 + 2 * (lw + gap) + 30, label: '梯度桶 1', fillKT: '0;0.05;0.4;1', fillV: '4;4;26;26' },
      { x: x0 + 30, label: '梯度桶 0', fillKT: '0;0.45;0.85;1', fillV: '4;4;26;26' }
    ];
    for (i = 0; i < 2; i++) {
      var b = buckets[i];
      svg.appendChild(svgEl('rect', { x: b.x, y: 118, width: lw + gap, height: 30, rx: 3, fill: 'none', stroke: MUTE, 'stroke-width': '1.4' }));
      svg.appendChild(txt(b.x + (lw + gap) / 2, 164, b.label, MUTE, 9));
      var lvl = svgEl('rect', { x: b.x + 2, y: 144, width: lw + gap - 4, height: 4, fill: BP, opacity: '0.55' });
      lvl.appendChild(anim('height', b.fillV, dur, { keyTimes: b.fillKT }));
      lvl.appendChild(anim('y', '144;144;122;122', dur, { keyTimes: b.fillKT }));
      svg.appendChild(lvl);
    }
    svg.appendChild(svgEl('line', { x1: x0, y1: 200, x2: 470, y2: 200, stroke: RULE, 'stroke-width': '5' }));
    svg.appendChild(txt(x0, 222, '全规约通信与后续反向传播并行', MUTE, 9, 'start'));
    var pulse = svgEl('circle', { r: 5, fill: WARN });
    pulse.appendChild(svgEl('animateMotion', { dur: dur, repeatCount: 'indefinite', path: 'M' + (buckets[0].x + 50) + ' 200 H' + x0, keyPoints: '0;0;1;1', keyTimes: '0;0.4;0.8;1', calcMode: 'linear' }));
    pulse.appendChild(anim('opacity', '0;0;1;1;0', dur, { keyTimes: '0;0.38;0.42;0.8;1' }));
    svg.appendChild(pulse);
    card(host, '分布式数据并行梯度同步（DDP Gradient Sync）', '钩子 · 梯度桶 · 通信计算重叠',
      svg,
      '每个参数上的反向钩子（Backward Hook）将梯度放入梯度桶（Bucket）。桶 1 一旦填满，就发起全规约（Allreduce）；此时第 2 层和第 1 层仍在反向传播，因此通信可以与计算重叠。初始化时的一次广播（Broadcast）使所有副本一致，此后每一步通过汇总梯度维持一致性。');
  }

  // 80：四个进程并行写临时分片，随后通过原子重命名完成切换。
  function shardedCheckpoint(host) {
    var svg = svgEl('svg', { viewBox: '0 0 520 250' });
    var dur = '6s', i;
    var gTmp = svgEl('g', {}), gFin = svgEl('g', {});
    for (i = 0; i < 4; i++) {
      var y = 34 + i * 42;
      svg.appendChild(svgEl('rect', { x: 40, y: y, width: 74, height: 28, rx: 4, fill: BG, stroke: BP, 'stroke-width': '1.6' }));
      svg.appendChild(txt(77, y + 18, '进程 ' + i, INK, 10));
      var dot = svgEl('circle', { cx: '120', cy: y + 14, r: 4, fill: BP });
      dot.appendChild(anim('cx', '120;240;240', dur, { keyTimes: '0;0.3;1', calcMode: 'spline', keySplines: EASE + ';0 0 1 1' }));
      svg.appendChild(dot);
      gTmp.appendChild(svgEl('rect', { x: 250, y: y, width: 128, height: 28, rx: 4, fill: 'none', stroke: WARN, 'stroke-width': '1.6', 'stroke-dasharray': '5 4' }));
      gTmp.appendChild(txt(314, y + 18, 'rank' + i + '.bin.tmp', WARN, 9.5));
      gFin.appendChild(svgEl('rect', { x: 250, y: y, width: 128, height: 28, rx: 4, fill: BP, opacity: '0.12', stroke: BP, 'stroke-width': '2' }));
      gFin.appendChild(txt(314, y + 18, 'rank' + i + '.bin', BP, 9.5));
    }
    gTmp.appendChild(anim('opacity', '1;1;0;0', dur, { keyTimes: '0;0.55;0.65;1' }));
    gFin.appendChild(anim('opacity', '0;0;1;1', dur, { keyTimes: '0;0.55;0.65;1' }));
    svg.appendChild(gTmp);
    svg.appendChild(gFin);
    var stamp = txt(314, 22, '重命名：所有分片一并切换', SOFT, 9.5);
    stamp.appendChild(anim('opacity', '0;0;1;1', dur, { keyTimes: '0;0.55;0.62;1' }));
    svg.appendChild(stamp);
    var man = svgEl('g', {});
    man.appendChild(svgEl('rect', { x: 410, y: 84, width: 86, height: 62, rx: 5, fill: BG, stroke: INK, 'stroke-width': '1.6' }));
    man.appendChild(txt(453, 108, '清单', INK, 10));
    man.appendChild(txt(453, 126, 'world=4 · sha256', MUTE, 8.5));
    man.appendChild(anim('opacity', '0;0;1;1', dur, { keyTimes: '0;0.72;0.82;1', calcMode: 'spline', keySplines: '0 0 1 1;' + EASE + ';0 0 1 1' }));
    svg.appendChild(man);
    card(host, '分片检查点（Sharded Checkpoint）', '并行写入 · 原子重命名',
      svg,
      '各进程（Rank）同时将自己的分片流式写入临时文件，让写入带宽随集群扩展，避免集中收集造成瓶颈。所有分片落盘后，才通过重命名使临时文件和清单（Manifest）正式生效。恢复时先读取清单，检查进程总数（World Size）和哈希（Hash）；任何一项不匹配，都应明确报错。');
  }

  // 81：将三个已验证组件接入同一训练循环，运行 20 步。
  function distributedAssembly(host) {
    var svg = svgEl('svg', { viewBox: '0 0 520 240' });
    var dur = '5.5s', pieces = [
      ['DDP 广播', '第 77 课'], ['ZeRO-1 更新', '第 78 课'], ['分片检查点', '第 80 课']
    ];
    var i;
    for (i = 0; i < 3; i++) {
      var y = 36 + i * 52;
      var pg = svgEl('g', {});
      pg.appendChild(svgEl('rect', { x: 36, y: y, width: 130, height: 38, rx: 5, fill: BG, stroke: BP, 'stroke-width': '1.8' }));
      pg.appendChild(txt(101, y + 17, pieces[i][0], INK, 10));
      pg.appendChild(txt(101, y + 31, pieces[i][1], MUTE, 8.5));
      popIn(pg, 101, y + 19, dur, (0.2 + i * 0.3) + 's');
      svg.appendChild(pg);
      svg.appendChild(svgEl('path', { d: 'M166 ' + (y + 19) + ' C 200 ' + (y + 19) + ', 200 106, 226 106', fill: 'none', stroke: MUTE, 'stroke-width': '1.2', opacity: '0.6' }));
    }
    svg.appendChild(svgEl('rect', { x: 226, y: 74, width: 258, height: 64, rx: 6, fill: BP, opacity: '0.1', stroke: BP, 'stroke-width': '2' }));
    svg.appendChild(txt(355, 100, 'for step in 1..20', BP, 12));
    svg.appendChild(txt(355, 118, '4 个进程 · 微型 GPT · gloo CPU', SOFT, 9));
    var tx0 = 240, tx1 = 470, ty = 182;
    svg.appendChild(svgEl('line', { x1: tx0, y1: ty, x2: tx1, y2: ty, stroke: RULE, 'stroke-width': '2' }));
    svg.appendChild(txt(tx0, ty + 16, '第 0 步', MUTE, 8.5));
    svg.appendChild(txt(tx1, ty + 16, '20 步 · 退出码 0', MUTE, 8.5));
    var mid = (tx0 + tx1) / 2;
    svg.appendChild(svgEl('line', { x1: mid, y1: ty - 14, x2: mid, y2: ty + 6, stroke: WARN, 'stroke-width': '1.8' }));
    var flag = txt(mid, ty - 20, '第 10 步保存检查点', WARN, 8.5);
    flag.appendChild(anim('opacity', '0.4;0.4;1;1;0.4', dur, { keyTimes: '0;0.45;0.52;0.7;1' }));
    svg.appendChild(flag);
    var runner = svgEl('circle', { cy: ty, r: 6, fill: BP });
    runner.appendChild(anim('cx', tx0 + ';' + tx1 + ';' + tx1, dur, { keyTimes: '0;0.9;1', calcMode: 'spline', keySplines: '0.4 0 0.6 1;0 0 1 1' }));
    svg.appendChild(runner);
    svg.appendChild(txt(260, 222, '不变量：损失下降 · 进程一致 · 优化器 12P/N 字节 · 恢复后逐字节一致', MUTE, 8.5));
    card(host, '分布式训练组装（Distributed Assembly）', '组合组件 · 运行 20 步',
      svg,
      '每个组件都已独立实现并测试，综合项目验证它们能否协同工作。分布式数据并行（DDP）通过一次广播同步初始权重；每轮使用 ZeRO-1 更新替代 optimiser.step；第 10 步保存分片检查点（Sharded Checkpoint）。只有每个进程都满足全部四项不变量（Invariant），运行才会在 20 步后正常结束。');
  }

  // 84：将提示词归入 2×2 矩阵，非对角线单元格对应错误。
  function refusalQuadrant(host) {
    var svg = svgEl('svg', { viewBox: '0 0 520 250' });
    var gx = 160, gy = 56, cw = 130, ch = 74, dur = '5s';
    svg.appendChild(txt(gx + cw / 2, 42, '回答', SOFT, 10));
    svg.appendChild(txt(gx + cw + cw / 2, 42, '拒答', SOFT, 10));
    svg.appendChild(txt(gx - 12, gy + ch / 2 + 4, '安全', SOFT, 10, 'end'));
    svg.appendChild(txt(gx - 12, gy + ch + ch / 2 + 4, '不安全', SOFT, 10, 'end'));
    var cells = [
      { x: gx, y: gy, ok: 1, label: '正确' },
      { x: gx + cw, y: gy, ok: 0, label: '过度拒答' },
      { x: gx, y: gy + ch, ok: 0, label: '拒答不足' },
      { x: gx + cw, y: gy + ch, ok: 1, label: '正确' }
    ];
    var i;
    for (i = 0; i < 4; i++) {
      var c = cells[i];
      var cr = svgEl('rect', { x: c.x, y: c.y, width: cw, height: ch, fill: c.ok ? BP : WARN, opacity: c.ok ? '0.08' : '0.14', stroke: c.ok ? BP : WARN, 'stroke-width': c.ok ? '1.2' : '2' });
      if (!c.ok) cr.appendChild(anim('opacity', '0.14;0.3;0.14', '3s', { begin: (i * 0.4) + 's' }));
      svg.appendChild(cr);
      svg.appendChild(txt(c.x + cw / 2, c.y + ch - 8, c.label, c.ok ? BP : WARN, 9));
    }
    svg.appendChild(txt(290, 20, '已标注的提示词集', MUTE, 10));
    var drops = [
      { tx: gx + 40, ty: gy + 32, safe: 1 }, { tx: gx + cw + 66, ty: gy + ch + 30, safe: 0 },
      { tx: gx + cw + 44, ty: gy + 30, safe: 1 }, { tx: gx + 62, ty: gy + ch + 34, safe: 0 }
    ];
    for (i = 0; i < 4; i++) {
      var d = drops[i];
      var dot = svgEl('circle', { cx: 290, cy: 26, r: 5, fill: d.safe ? BP : INK });
      dot.appendChild(anim('cx', '290;' + d.tx + ';' + d.tx, dur, { keyTimes: '0;0.22;1', calcMode: 'spline', keySplines: EASE + ';0 0 1 1', begin: (i * 0.45) + 's' }));
      dot.appendChild(anim('cy', '26;' + d.ty + ';' + d.ty, dur, { keyTimes: '0;0.22;1', calcMode: 'spline', keySplines: EASE + ';0 0 1 1', begin: (i * 0.45) + 's' }));
      dot.appendChild(anim('opacity', '0;1;1;0', dur, { keyTimes: '0;0.06;0.9;1', begin: (i * 0.45) + 's' }));
      svg.appendChild(dot);
    }
    svg.appendChild(txt(290, 232, '另测 ECE：每个分箱内，置信度是否与准确率相符', MUTE, 9));
    card(host, '拒答四象限（Refusal Quadrant）', '分别衡量两类错误',
      svg,
      '评估器将助手视为判断提示词安全性的二分类器（Binary Classifier）。安全提示词被拒答，属于过度拒答（Over-refusal）；不安全提示词得到回答，属于拒答不足（Under-refusal）。两个非对角线单元格都代表错误，需要按风险分类（Taxonomy）分别统计，并用期望校准误差（ECE）衡量模型置信度与实际正确程度是否一致。');
  }


  LF.register({
    'ci-chunk-boundaries': chunkBoundaries,
    'ci-rag-metric-ladder': ragMetricLadder,
    'ci-task-spec-gate': taskSpecGate,
    'ci-leaderboard-ci': leaderboardCI,
    'ci-ring-allreduce': ringAllreduce,
    'ci-ddp-grad-sync': ddpGradSync,
    'ci-sharded-checkpoint': shardedCheckpoint,
    'ci-distributed-assembly': distributedAssembly,
    'ci-refusal-quadrant': refusalQuadrant
  });
})();
