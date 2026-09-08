/* 阶段 19 综合项目动画：训练安全、混合检索、重排序、端到端 RAG、
   评估框架、代码执行沙箱、注入检测与安全门禁。
   在 lesson-figures.js 之后加载，通过 window.LF 注册。仅使用 SMIL/CSS 动画，
   不使用 JS 动画循环或 rAF。兼容 ES5，无外部依赖，通过 CSS 变量适配主题。 */
(function () {
  'use strict';
  var LF = window.LF;
  if (!LF) { return; }
  var svgEl = LF.svgEl, el = LF.el;

  function svg(h) { return svgEl('svg', { viewBox: '0 0 520 ' + h }); }
  function shell(host, label, sub, node, cap) {
    host.appendChild(el('div', { class: 'lf' }, [
      el('div', { class: 'lf-head' }, [el('span', { class: 'lf-label' }, [label]), el('span', {}, [sub])]),
      el('div', { class: 'lf-body' }, [el('div', { class: 'lf-out' }, [node])]),
      el('div', { class: 'lf-cap' }, [cap])
    ]));
  }
  function anim(attr, vals, dur, extra) {
    var a = { attributeName: attr, values: vals, dur: dur, repeatCount: 'indefinite' };
    if (extra) for (var k in extra) a[k] = extra[k];
    return svgEl('animate', a);
  }
  function txt(x, y, s, size, fill, anchor) {
    var t = svgEl('text', { x: x, y: y, 'text-anchor': anchor || 'middle', 'font-family': 'var(--font-mono,monospace)', 'font-size': size || '11', fill: fill || 'var(--ink,#1a1a1a)' });
    t.appendChild(document.createTextNode(s));
    return t;
  }
  function rect(x, y, w, h, fill, stroke) {
    return svgEl('rect', { x: x, y: y, width: w, height: h, rx: '4', fill: fill || 'var(--bg-surface,#eee)', stroke: stroke || 'var(--rule-soft,#ddd)', 'stroke-width': '1.4' });
  }

  // 梯度裁剪监视器（第 45 课）：梯度范数尖峰、裁剪上限与缩放器跳步。
  function gradClip(host) {
    var s = svg(240), W = 520, BASE = 150, CEIL = 70, PAD = 30;
    s.appendChild(svgEl('line', { x1: PAD, y1: CEIL, x2: W - PAD, y2: CEIL, stroke: 'var(--warn,#b8870f)', 'stroke-width': '1.4', 'stroke-dasharray': '5 4' }));
    s.appendChild(txt(W - PAD, CEIL - 6, '裁剪上限 = 1.0', '9', 'var(--warn,#b8870f)', 'end'));
    s.appendChild(svgEl('line', { x1: PAD, y1: BASE, x2: W - PAD, y2: BASE, stroke: 'var(--rule-soft,#ddd)', 'stroke-width': '1' }));
    var heights = [110, 96, 82, 108, 30, 100, 90, 112], n = heights.length, bw = 30, gap = (W - 2 * PAD - n * bw) / (n - 1);
    var i, spike = 4;
    for (i = 0; i < n; i++) {
      var x = PAD + i * (bw + gap), raw = heights[i], clipped = Math.min(raw, BASE - CEIL);
      var bar = rect(x, BASE - clipped, bw, clipped, i === spike ? 'var(--warn,#b8870f)' : 'var(--blueprint,#3553ff)', 'none');
      bar.appendChild(anim('height', clipped + ';' + clipped, '0.1s'));
      var grow = svgEl('animate', { attributeName: 'height', values: '0;' + (i === spike ? raw : clipped) + ';' + clipped, keyTimes: '0;0.55;1', dur: '2.6s', begin: (i * 0.14) + 's', repeatCount: 'indefinite' });
      var gy = svgEl('animate', { attributeName: 'y', values: BASE + ';' + (i === spike ? BASE - raw : BASE - clipped) + ';' + (BASE - clipped), keyTimes: '0;0.55;1', dur: '2.6s', begin: (i * 0.14) + 's', repeatCount: 'indefinite' });
      bar.appendChild(grow); bar.appendChild(gy);
      s.appendChild(bar);
    }
    var ghost = rect(PAD + spike * (bw + gap), CEIL - 40, bw, 40, 'none', 'var(--warn,#b8870f)');
    ghost.setAttribute('stroke-dasharray', '3 3');
    ghost.appendChild(anim('opacity', '0;0.9;0', '2.6s', { begin: (spike * 0.14) + 's' }));
    s.appendChild(ghost);
    var skip = txt(PAD + spike * (bw + gap) + bw / 2, CEIL - 48, 'NaN → 跳过更新', '9', 'var(--warn,#b8870f)');
    skip.appendChild(anim('opacity', '0;1;0', '2.6s', { begin: (spike * 0.14) + 's' }));
    s.appendChild(skip);
    s.appendChild(txt(PAD, BASE + 18, '训练步 →', '9', 'var(--ink-mute,#777)', 'start'));
    shell(host, '梯度裁剪与自动混合精度（Gradient Clipping + AMP）', '范数出现尖峰，裁剪限制上界', s,
      '每个训练步都计算全局梯度范数（Global Gradient Norm），并将其裁剪到上限。一次溢出的批次（橙色）可能越过上限，使损失变为 NaN；梯度缩放器（GradScaler）检测到 Inf 后跳过本次优化器更新，并将缩放因子减半，使训练能够继续。');
  }

  // 倒数排名融合（第 65 课）：查询并行进入 BM25 与稠密检索通路，按排名投票。
  function rrfFusion(host) {
    var s = svg(250), defs = svgEl('defs', {});
    var grad = svgEl('marker', { id: 'cb-arr', viewBox: '0 0 8 8', refX: '7', refY: '4', markerWidth: '7', markerHeight: '7', orient: 'auto' }, [svgEl('path', { d: 'M0 0 L8 4 L0 8 z', fill: 'var(--ink-soft,#555)' })]);
    defs.appendChild(grad); s.appendChild(defs);
    s.appendChild(rect(20, 105, 80, 40, 'var(--blueprint,#3553ff)', 'none'));
    s.appendChild(txt(60, 129, '查询', '12', 'var(--bg,#fafaf5)'));
    s.appendChild(rect(200, 40, 90, 40)); s.appendChild(txt(245, 64, 'BM25', '11'));
    s.appendChild(rect(200, 170, 90, 40)); s.appendChild(txt(245, 194, '稠密检索', '11'));
    s.appendChild(rect(400, 105, 100, 40, 'var(--bg-surface,#eee)', 'var(--blueprint,#3553ff)'));
    s.appendChild(txt(450, 124, 'RRF 融合', '11'));
    s.appendChild(txt(450, 138, '1/(k+rank)', '8', 'var(--ink-mute,#777)'));
    [[100, 122, 200, 60], [100, 128, 200, 188], [290, 60, 400, 120], [290, 188, 400, 130]].forEach(function (c) {
      s.appendChild(svgEl('line', { x1: c[0], y1: c[1], x2: c[2], y2: c[3], stroke: 'var(--ink-soft,#555)', 'stroke-width': '1.3', 'marker-end': 'url(#cb-arr)' }));
    });
    function packet(path, begin, fill) {
      var d = svgEl('circle', { r: '5', fill: fill, cx: '0', cy: '0' });
      d.appendChild(svgEl('animateMotion', { path: path, dur: '2.8s', begin: begin, repeatCount: 'indefinite', keyPoints: '0;1', keyTimes: '0;1' }));
      d.appendChild(anim('opacity', '0;1;1;0', '2.8s', { begin: begin, keyTimes: '0;0.1;0.9;1' }));
      return d;
    }
    s.appendChild(packet('M100 122 L200 60', '0s', 'var(--blueprint,#3553ff)'));
    s.appendChild(packet('M100 128 L200 188', '0.3s', 'var(--blueprint,#3553ff)'));
    s.appendChild(packet('M290 60 L400 120', '1.2s', 'var(--warn,#b8870f)'));
    s.appendChild(packet('M290 188 L400 130', '1.5s', 'var(--warn,#b8870f)'));
    var win = txt(450, 168, '融合后前 k 项', '9', 'var(--blueprint,#3553ff)');
    win.appendChild(anim('opacity', '0.3;1;0.3', '2.8s', { begin: '2.4s' }));
    s.appendChild(win);
    shell(host, '倒数排名融合（Reciprocal Rank Fusion，RRF）', '两路检索 · 汇总排名投票', s,
      '查询并行进入 BM25 与稠密检索器（Dense Retriever），各自返回排序列表。RRF 对每篇文档计算各列表中的 1/(k+rank) 并求和，因此在任一路中排名靠前的文档都能提升融合得分。融合采用排名投票而非分数插值，这使它能够适应不同类型的查询。');
  }

  // 重排序漏斗（第 66 课）：交叉编码器将 N 个候选筛选为前 K 项。
  function rerankFunnel(host) {
    var s = svg(240), N = 8, x0 = 50, y0 = 30, rh = 22, gap = 4;
    s.appendChild(txt(80, 20, '检索所得 N 项', '9', 'var(--ink-mute,#777)'));
    s.appendChild(txt(440, 20, '重排后前 K 项', '9', 'var(--ink-mute,#777)'));
    s.appendChild(rect(230, 70, 60, 90, 'var(--bg-surface,#eee)', 'var(--blueprint,#3553ff)'));
    s.appendChild(txt(260, 110, '交叉', '10')); s.appendChild(txt(260, 124, '编码器', '10'));
    var keep = { 5: 1, 1: 1, 6: 1 }, i, kRank = 0;
    for (i = 0; i < N; i++) {
      var y = y0 + i * (rh + gap);
      s.appendChild(rect(x0, y, 110, rh, 'var(--bg-surface,#eee)', 'var(--rule-soft,#ddd)'));
      var dot = svgEl('circle', { cx: x0 + 12, cy: y + rh / 2, r: '4', fill: 'var(--ink-mute,#777)' });
      s.appendChild(dot);
      var kept = !!keep[i];
      var ty = kept ? (78 + kRank * 30) : (90 + (i % 3) * 4);
      var packet = svgEl('circle', { r: '4.5', fill: kept ? 'var(--blueprint,#3553ff)' : 'var(--ink-mute,#777)', cx: x0 + 12, cy: y + rh / 2 });
      var motion = svgEl('animateMotion', { path: 'M0 0 L' + (218 - x0) + ' ' + (115 - (y + rh / 2)), dur: '3.2s', begin: (i * 0.1) + 's', repeatCount: 'indefinite', keyTimes: '0;0.4;0.5;1', keyPoints: '0;1;1;1', calcMode: 'linear' });
      packet.appendChild(motion);
      if (kept) {
        var out = svgEl('circle', { r: '5', fill: 'var(--blueprint,#3553ff)', cx: 380, cy: ty });
        out.appendChild(anim('opacity', '0;0;1;1;0', '3.2s', { begin: (i * 0.1) + 's', keyTimes: '0;0.55;0.65;0.9;1' }));
        out.appendChild(anim('cx', '300;380', '3.2s', { begin: (i * 0.1) + 's', keyTimes: '0;1' }));
        s.appendChild(svgEl('g', {}, [out, txt(420, ty + 4, 'K' + (kRank + 1), '9', 'var(--blueprint,#3553ff)', 'start')]));
        kRank++;
      }
      packet.appendChild(anim('opacity', '1;1;0;0', '3.2s', { begin: (i * 0.1) + 's', keyTimes: '0;0.45;0.5;1' }));
      s.appendChild(packet);
    }
    shell(host, '交叉编码器重排序（Cross-encoder Reranking）', 'N 个候选 → 前 K 项', s,
      '低成本检索器先返回 N 个候选；交叉编码器（Cross-encoder）通过完整注意力联合读取每个查询与文档对（Query, Document），并为其打分。最终仅保留前 K 项（蓝色）。高成本模型只需运行 N 次，无需遍历整个语料库，因此能在请求延迟预算内提高检索精度。');
  }

  // RAG 流水线（第 69 课）：查询依次经过完整处理链路。
  function ragPipeline(host) {
    var s = svg(220), defs = svgEl('defs', {});
    defs.appendChild(svgEl('marker', { id: 'cb-rag', viewBox: '0 0 8 8', refX: '7', refY: '4', markerWidth: '6', markerHeight: '6', orient: 'auto' }, [svgEl('path', { d: 'M0 0 L8 4 L0 8 z', fill: 'var(--ink-soft,#555)' })]));
    s.appendChild(defs);
    var stages = ['改写', '检索', '重排序', '生成'], i;
    var bw = 96, y = 70, x = [16, 142, 268, 394];
    for (i = 0; i < 4; i++) {
      var b = rect(x[i], y, bw, 44, 'var(--bg-surface,#eee)', 'var(--rule-soft,#ddd)');
      b.appendChild(anim('fill', 'var(--bg-surface,#eee);var(--blueprint,#3553ff);var(--bg-surface,#eee)', '3.6s', { begin: (i * 0.7) + 's', keyTimes: '0;0.5;1' }));
      s.appendChild(b);
      s.appendChild(txt(x[i] + bw / 2, y + 27, stages[i], '11'));
      if (i < 3) s.appendChild(svgEl('line', { x1: x[i] + bw, y1: y + 22, x2: x[i + 1], y2: y + 22, stroke: 'var(--ink-soft,#555)', 'stroke-width': '1.3', 'marker-end': 'url(#cb-rag)' }));
    }
    s.appendChild(txt(64, 50, '语料库 + 查询', '9', 'var(--ink-mute,#777)'));
    var path = 'M0 0 L' + (x[3] + bw / 2 - 64) + ' 0';
    var pk = svgEl('circle', { r: '6', fill: 'var(--warn,#b8870f)', cx: '64', cy: '92' });
    pk.appendChild(svgEl('animateMotion', { path: path, dur: '3.6s', repeatCount: 'indefinite', keyTimes: '0;1', keyPoints: '0;1', calcMode: 'linear' }));
    s.appendChild(pk);
    var cite = txt(410, 150, '回答 + [chunk:42] 引用', '10', 'var(--blueprint,#3553ff)');
    cite.appendChild(anim('opacity', '0;0;1;1;0', '3.6s', { keyTimes: '0;0.78;0.85;0.95;1' }));
    s.appendChild(cite);
    var refuse = txt(x[3] + bw / 2, 168, '置信度低时拒答', '8', 'var(--ink-mute,#777)');
    refuse.appendChild(anim('opacity', '0;0;0.8;0', '3.6s', { keyTimes: '0;0.85;0.92;1' }));
    s.appendChild(refuse);
    shell(host, '端到端检索增强生成（End-to-end RAG）', '一次查询 · 四个阶段', s,
      '查询沿组装好的流水线（Pipeline）依次处理：改写模块扩展查询，混合索引执行检索，交叉编码器重排序，生成器输出带有文本块引用（Chunk Citation）的回答，或在置信度不足时拒答。六个原本独立的组件组合成一个系统，其整体效果优于仅单独衡量各阶段的表现。');
  }

  // 沙箱执行器（第 72 课）：代码进入子进程，显示断言结果，并限制运行时间。
  function sandboxRunner(host) {
    var s = svg(230);
    s.appendChild(rect(20, 80, 90, 60, 'var(--blueprint,#3553ff)', 'none'));
    s.appendChild(txt(65, 105, '候选', '10', 'var(--bg,#fafaf5)'));
    s.appendChild(txt(65, 120, '代码', '10', 'var(--bg,#fafaf5)'));
    s.appendChild(svgEl('rect', { x: 180, y: 40, width: 160, height: 150, rx: '6', fill: 'none', stroke: 'var(--ink-soft,#555)', 'stroke-width': '1.5', 'stroke-dasharray': '6 4' }));
    s.appendChild(txt(260, 32, '子进程沙箱', '9', 'var(--ink-mute,#777)'));
    var pk = svgEl('circle', { r: '5', fill: 'var(--warn,#b8870f)', cx: '110', cy: '110' });
    pk.appendChild(svgEl('animateMotion', { path: 'M0 0 L70 0', dur: '3.4s', repeatCount: 'indefinite', keyTimes: '0;0.2;1', keyPoints: '0;1;1', calcMode: 'linear' }));
    pk.appendChild(anim('opacity', '1;1;0;0', '3.4s', { keyTimes: '0;0.2;0.25;1' }));
    s.appendChild(pk);
    var res = ['pass', 'pass', 'fail', 'pass'], i;
    for (i = 0; i < 4; i++) {
      var ay = 60 + i * 32, ok = res[i] === 'pass';
      var box = rect(200, ay, 120, 24, 'var(--bg-surface,#eee)', 'var(--rule-soft,#ddd)');
      box.appendChild(anim('fill', 'var(--bg-surface,#eee);var(--bg-surface,#eee);' + (ok ? 'var(--blueprint,#3553ff)' : 'var(--warn,#b8870f)'), '3.4s', { begin: (0.3 + i * 0.25) + 's', keyTimes: '0;0.3;1' }));
      s.appendChild(box);
      var tk = txt(208, ay + 16, '断言 ' + (i + 1), '9', 'var(--ink-soft,#555)', 'start');
      tk.appendChild(anim('fill', 'var(--ink-soft,#555);var(--bg,#fafaf5)', '3.4s', { begin: (0.3 + i * 0.25) + 's', keyTimes: '0;1' }));
      s.appendChild(tk);
      var mark = txt(312, ay + 16, ok ? '✓' : '✗', '12', ok ? 'var(--blueprint,#3553ff)' : 'var(--warn,#b8870f)', 'end');
      mark.appendChild(anim('opacity', '0;0;1;1', '3.4s', { begin: (0.3 + i * 0.25) + 's', keyTimes: '0;0.3;0.45;1' }));
      mark.setAttribute('fill', 'var(--bg,#fafaf5)');
      s.appendChild(mark);
    }
    var clock = svgEl('circle', { cx: 400, cy: 80, r: '18', fill: 'none', stroke: 'var(--ink-mute,#777)', 'stroke-width': '1.5' });
    s.appendChild(clock);
    var hand = svgEl('line', { x1: 400, y1: 80, x2: 400, y2: 66, stroke: 'var(--warn,#b8870f)', 'stroke-width': '1.6' });
    hand.appendChild(svgEl('animateTransform', { attributeName: 'transform', type: 'rotate', from: '0 400 80', to: '360 400 80', dur: '2s', repeatCount: 'indefinite' }));
    s.appendChild(hand);
    s.appendChild(txt(400, 116, '实际经过时间', '8', 'var(--ink-mute,#777)'));
    s.appendChild(txt(400, 127, '超时限制', '8', 'var(--ink-mute,#777)'));
    var score = txt(400, 175, '3/4 通过', '12', 'var(--blueprint,#3553ff)');
    score.appendChild(anim('opacity', '0.3;1;0.3', '3.4s', { begin: '1.6s' }));
    s.appendChild(score);
    shell(host, '代码执行沙箱（Code-execution Sandbox）', '执行 · 断言 · 超时', s,
      '生成的代码通过标准输入（stdin）送入子进程中的新解释器，并受导入拒绝列表（Import Denylist）和输出大小上限约束。逐一执行给定断言（Assertion），以蓝色表示通过、橙色表示失败；实际经过时间（Wall-clock Time）超过限制时，终止失控循环。得分为断言通过比例，崩溃和超时也作为明确的失败类型记录。');
  }

  // 评估网格（第 75 课）：工作进程池执行任务，并显示通过或失败。
  function evalGrid(host) {
    var s = svg(240), cols = 8, rows = 4, cw = 38, ch = 30, gx0 = 130, gy0 = 30;
    s.appendChild(txt(60, 20, '工作进程池', '10', 'var(--ink-soft,#555)'));
    var w, c;
    for (w = 0; w < rows; w++) {
      s.appendChild(rect(20, gy0 + w * (ch + 6) + 18, 80, 22, 'var(--blueprint,#3553ff)', 'none'));
      var wl = txt(60, gy0 + w * (ch + 6) + 33, 'w' + w, '9', 'var(--bg,#fafaf5)');
      s.appendChild(wl);
    }
    var seed = [1, 0, 1, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 1];
    for (w = 0; w < rows; w++) {
      for (c = 0; c < cols; c++) {
        var idx = w * cols + c, ok = seed[idx], x = gx0 + c * cw, y = gy0 + w * (ch + 6) + 14, beg = (c * 0.18 + w * 0.06);
        var cell = rect(x, y, cw - 6, ch - 4, 'var(--bg-surface,#eee)', 'var(--rule-soft,#ddd)');
        cell.appendChild(anim('fill', 'var(--bg-surface,#eee);var(--bg-surface,#eee);' + (ok ? 'var(--blueprint,#3553ff)' : 'var(--warn,#b8870f)') + ';' + (ok ? 'var(--blueprint,#3553ff)' : 'var(--warn,#b8870f)'), '4s', { begin: beg + 's', keyTimes: '0;0.2;0.35;1' }));
        s.appendChild(cell);
      }
    }
    s.appendChild(txt(gx0, gy0 - 8, 'tasks.jsonl →', '9', 'var(--ink-mute,#777)', 'start'));
    var bar = svgEl('line', { x1: gx0, y1: gy0 + 10, x2: gx0, y2: gy0 + rows * (ch + 6) + 4, stroke: 'var(--warn,#b8870f)', 'stroke-width': '1.6', opacity: '0.7' });
    bar.appendChild(anim('x1', gx0 + ';' + (gx0 + cols * cw), '4s', { keyTimes: '0;1' }));
    bar.appendChild(anim('x2', gx0 + ';' + (gx0 + cols * cw), '4s', { keyTimes: '0;1' }));
    s.appendChild(bar);
    var sc = txt(260, 218, 'score = mean(pass) · 各模型 EvalRun → 排行榜', '9', 'var(--blueprint,#3553ff)');
    s.appendChild(sc);
    shell(host, '评估执行器（Evaluation Runner）', '并行分发任务 · 显示评分结果', s,
      '执行器读取任务规格（Task Specification），将任务分发到工作进程池（Worker Pool），结合指标层与校准报告（Calibration Report）逐项评分。扫描线经过时，单元格显示通过（蓝色）或失败（橙色）。每个模型的 EvalRun 记录直接进入排行榜聚合器；演示在正常执行结束后自行退出。');
  }

  // 注入检测门禁（第 83 课）：提示词依次经过三层检测。
  function injectionGate(host) {
    var s = svg(230), defs = svgEl('defs', {});
    defs.appendChild(svgEl('marker', { id: 'cb-inj', viewBox: '0 0 8 8', refX: '7', refY: '4', markerWidth: '6', markerHeight: '6', orient: 'auto' }, [svgEl('path', { d: 'M0 0 L8 4 L0 8 z', fill: 'var(--ink-soft,#555)' })]));
    s.appendChild(defs);
    var layers = ['规范化', '子串匹配', '正则匹配'], x = [70, 200, 330], i;
    for (i = 0; i < 3; i++) {
      s.appendChild(rect(x[i], 80, 96, 50, 'var(--bg-surface,#eee)', 'var(--rule-soft,#ddd)'));
      s.appendChild(txt(x[i] + 48, 100, layers[i], '11'));
      s.appendChild(txt(x[i] + 48, 116, '检测层', '8', 'var(--ink-mute,#777)'));
      if (i < 2) s.appendChild(svgEl('line', { x1: x[i] + 96, y1: 105, x2: x[i + 1], y2: 105, stroke: 'var(--ink-soft,#555)', 'stroke-width': '1.3', 'marker-end': 'url(#cb-inj)' }));
    }
    s.appendChild(rect(440, 80, 60, 50, 'var(--bg-surface,#eee)', 'var(--blueprint,#3553ff)'));
    s.appendChild(txt(470, 100, '判定', '9'));
    s.appendChild(svgEl('line', { x1: 426, y1: 105, x2: 440, y2: 105, stroke: 'var(--ink-soft,#555)', 'stroke-width': '1.3', 'marker-end': 'url(#cb-inj)' }));
    // 恶意提示词触发正则规则，正常提示词通过。
    function flow(begin, fired, fill) {
      var pk = svgEl('circle', { r: '5', fill: fill, cx: '20', cy: '105' });
      pk.appendChild(svgEl('animateMotion', { path: 'M0 0 L450 0', dur: '3s', begin: begin, repeatCount: 'indefinite', keyTimes: '0;1', keyPoints: '0;1', calcMode: 'linear' }));
      pk.appendChild(anim('opacity', '0;1;1;0', '3s', { begin: begin, keyTimes: '0;0.05;0.92;1' }));
      return pk;
    }
    s.appendChild(flow('0s', false, 'var(--blueprint,#3553ff)'));
    s.appendChild(flow('1.5s', true, 'var(--warn,#b8870f)'));
    var fire = svgEl('circle', { cx: 378, cy: 105, r: '6', fill: 'none', stroke: 'var(--warn,#b8870f)', 'stroke-width': '2' });
    fire.appendChild(anim('r', '6;20;6', '3s', { begin: '2.55s' }));
    fire.appendChild(anim('opacity', '0;0.9;0', '3s', { begin: '2.55s' }));
    s.appendChild(fire);
    var lab = txt(378, 60, '触发规则 → 攻击', '9', 'var(--warn,#b8870f)');
    lab.appendChild(anim('opacity', '0;1;0', '3s', { begin: '2.55s' }));
    s.appendChild(lab);
    s.appendChild(txt(470, 145, 'p, category', '8', 'var(--ink-mute,#777)'));
    shell(host, '提示词注入检测器（Prompt Injection Detector）', '三层检测 · 一个判定', s,
      '提示词经过三层可审计检测：规范化（Normalization）处理 base64、rot13 和零宽字符等混淆手法；子串规则（Substring Rules）匹配人工编写的短语；正则表达式规则（Regular Expression Rules）识别一类攻击模式。正常提示词（蓝色）通过；攻击提示词（橙色）触发规则后，聚合器输出置信度 p 和类别 category，为判定提供明确依据。');
  }

  // 安全检查点（第 87 课）：覆盖生成前、生成中和生成后的门禁。
  function safetyCheckpoints(host) {
    var s = svg(250), defs = svgEl('defs', {});
    defs.appendChild(svgEl('marker', { id: 'cb-sg', viewBox: '0 0 8 8', refX: '7', refY: '4', markerWidth: '6', markerHeight: '6', orient: 'auto' }, [svgEl('path', { d: 'M0 0 L8 4 L0 8 z', fill: 'var(--ink-soft,#555)' })]));
    s.appendChild(defs);
    var gates = [['生成前', '检测器', 60], ['模型', '模拟 LLM', 200], ['生成中', '词元过滤器', 340], ['生成后', '分类器', 470]];
    var i;
    for (i = 0; i < gates.length; i++) {
      var g = gates[i], cx = g[2], isModel = i === 1;
      s.appendChild(rect(cx - 46, 90, 92, 50, isModel ? 'var(--blueprint,#3553ff)' : 'var(--bg-surface,#eee)', isModel ? 'none' : 'var(--rule-soft,#ddd)'));
      s.appendChild(txt(cx, 110, g[0], '10', isModel ? 'var(--bg,#fafaf5)' : 'var(--ink,#1a1a1a)'));
      s.appendChild(txt(cx, 125, g[1], '8', isModel ? 'var(--bg,#fafaf5)' : 'var(--ink-mute,#777)'));
      if (i < gates.length - 1) s.appendChild(svgEl('line', { x1: cx + 46, y1: 115, x2: gates[i + 1][2] - 46, y2: 115, stroke: 'var(--ink-soft,#555)', 'stroke-width': '1.3', 'marker-end': 'url(#cb-sg)' }));
    }
    var pk = svgEl('circle', { r: '5', fill: 'var(--warn,#b8870f)', cx: '14', cy: '115' });
    pk.appendChild(svgEl('animateMotion', { path: 'M0 0 L502 0', dur: '4s', repeatCount: 'indefinite', keyTimes: '0;1', keyPoints: '0;1', calcMode: 'linear' }));
    s.appendChild(pk);
    // 每个检查点向下分出提前拦截的路径。
    [60, 340, 470].forEach(function (cx, j) {
      var br = svgEl('line', { x1: cx, y1: 140, x2: cx, y2: 175, stroke: 'var(--warn,#b8870f)', 'stroke-width': '1.4', 'stroke-dasharray': '4 3', 'marker-end': 'url(#cb-sg)' });
      s.appendChild(br);
    });
    s.appendChild(txt(60, 192, '拦截', '8', 'var(--warn,#b8870f)'));
    s.appendChild(txt(340, 192, '终止', '8', 'var(--warn,#b8870f)'));
    s.appendChild(txt(470, 192, '最终处置', '8', 'var(--warn,#b8870f)'));
    var trace = svgEl('rect', { x: 90, y: 210, width: 340, height: 26, rx: '4', fill: 'none', stroke: 'var(--blueprint,#3553ff)', 'stroke-width': '1.4', 'stroke-dasharray': '760', 'stroke-dashoffset': '760' });
    trace.appendChild(anim('stroke-dashoffset', '760;0', '4s', { keyTimes: '0;1' }));
    s.appendChild(trace);
    s.appendChild(txt(260, 227, '每个请求的审计轨迹', '9', 'var(--blueprint,#3553ff)'));
    shell(host, '安全门禁（Safety Gate）', '生成前 · 生成中 · 生成后', s,
      '一次请求经过三个检查点（Checkpoint）。生成前，检测器可以直接拦截；生成中，词元过滤器（Token Filter）检测到禁用短语时可以提前终止输出流；生成后，分类器（Classifier）和规则引擎（Rules Engine）检查完整输出。门禁汇总各项判定，执行最终处置，并生成便于审核人员阅读的审计轨迹（Audit Trace）。');
  }

  LF.register({
    'grad-clip-monitor': gradClip,
    'rrf-fusion': rrfFusion,
    'rerank-funnel': rerankFunnel,
    'rag-pipeline-flow': ragPipeline,
    'sandbox-runner': sandboxRunner,
    'eval-grid': evalGrid,
    'injection-gate': injectionGate,
    'safety-checkpoints': safetyCheckpoints
  });
})();
