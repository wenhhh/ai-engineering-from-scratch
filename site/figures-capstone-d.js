/* 阶段 19 第 51–87 课综合项目动画：查询改写与 HyDE、经典指标、困惑度与校准、
   ZeRO 分片、流水线并行、越狱分类、提示词注入检测器和宪法规则引擎。
   在 lesson-figures.js 之后加载，通过 window.LF 注册。仅使用 SMIL 动画，
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

  // 第 67 课：查询向量偏离目标，假设文档的向量落入目标区域。
  function cdHyde(host) {
    var s = svg(250), CX = 150, CY = 130, R = 96;
    s.appendChild(svgEl('circle', { cx: CX, cy: CY, r: R, fill: 'none', stroke: 'var(--rule-soft,#ddd)', 'stroke-width': '1.2', 'stroke-dasharray': '4 4' }));
    s.appendChild(txt(CX, 26, '嵌入空间', '10', 'var(--ink-mute,#777)'));
    // 目标区域是包含答案的文档所在位置。
    var tgX = CX + 64, tgY = CY - 40;
    s.appendChild(svgEl('circle', { cx: tgX, cy: tgY, r: '26', fill: 'var(--bg-surface,#eee)', stroke: 'var(--blueprint,#3553ff)', 'stroke-width': '1.4' }));
    s.appendChild(txt(tgX, tgY + 4, '文档', '10', 'var(--blueprint,#3553ff)'));
    // 原始查询向量指向错误的方向。
    var qX = CX - 58, qY = CY + 46;
    s.appendChild(svgEl('line', { x1: CX, y1: CY, x2: qX, y2: qY, stroke: 'var(--ink-mute,#777)', 'stroke-width': '2' }));
    s.appendChild(txt(qX - 4, qY + 14, '查询向量', '9', 'var(--ink-mute,#777)', 'middle'));
    // 假设文档的向量从查询方向转向目标。
    var hyp = svgEl('line', { x1: CX, y1: CY, x2: qX, y2: qY, stroke: 'var(--blueprint,#3553ff)', 'stroke-width': '2.4' });
    hyp.appendChild(svgEl('animate', { attributeName: 'x2', values: qX + ';' + tgX + ';' + tgX + ';' + qX, keyTimes: '0;0.45;0.85;1', dur: '4.2s', repeatCount: 'indefinite' }));
    hyp.appendChild(svgEl('animate', { attributeName: 'y2', values: qY + ';' + tgY + ';' + tgY + ';' + qY, keyTimes: '0;0.45;0.85;1', dur: '4.2s', repeatCount: 'indefinite' }));
    s.appendChild(hyp);
    // 向量端点随之移动。
    var tip = svgEl('circle', { cx: qX, cy: qY, r: '5', fill: 'var(--blueprint,#3553ff)' });
    tip.appendChild(svgEl('animate', { attributeName: 'cx', values: qX + ';' + tgX + ';' + tgX + ';' + qX, keyTimes: '0;0.45;0.85;1', dur: '4.2s', repeatCount: 'indefinite' }));
    tip.appendChild(svgEl('animate', { attributeName: 'cy', values: qY + ';' + tgY + ';' + tgY + ';' + qY, keyTimes: '0;0.45;0.85;1', dur: '4.2s', repeatCount: 'indefinite' }));
    s.appendChild(tip);
    // 右侧展示大语言模型先生成的假设回答。
    var bx = 320;
    s.appendChild(txt(bx, 56, 'LLM 先生成', '10', 'var(--ink-soft,#555)', 'start'));
    s.appendChild(txt(bx, 70, '一个假设回答：', '10', 'var(--ink-soft,#555)', 'start'));
    var rows = ['"AbortMultipartOnFail', 'aborts the S3 upload', 'and decrements the', 'retry budget..."'];
    var i;
    for (i = 0; i < rows.length; i++) {
      var ln = txt(bx, 96 + i * 18, rows[i], '9', 'var(--blueprint,#3553ff)', 'start');
      ln.appendChild(svgEl('animate', { attributeName: 'opacity', values: '0;0;1;1', keyTimes: '0;' + (0.1 + i * 0.06).toFixed(2) + ';' + (0.22 + i * 0.06).toFixed(2) + ';1', dur: '4.2s', repeatCount: 'indefinite' }));
      s.appendChild(ln);
    }
    s.appendChild(txt(bx, 188, '对假设回答做嵌入，', '9', 'var(--ink-mute,#777)', 'start'));
    s.appendChild(txt(bx, 202, '不直接嵌入问题。', '9', 'var(--ink-mute,#777)', 'start'));
    shell(host, 'HyDE 查询改写（HyDE Query Rewriting）', '假设回答将向量引向目标', s,
      '原始查询向量指向错误区域，包含答案的文档因而无法进入前 N 项。假设文档嵌入（Hypothetical Document Embeddings，HyDE）让模型先生成一篇能够回答问题的假设文档，再嵌入该回答，使检索向量落到真实文档所在的区域。图中保留英文示例：AbortMultipartOnFail 中止 S3 上传，并减少重试预算。');
  }

  // 第 71 课：将候选文本的 n 元组与参考文本匹配。
  function cdBleu(host) {
    var s = svg(230), PAD = 30, ROWY = 70, refY = 150, bw = 56, gap = 10;
    var cand = ['the', 'cat', 'sat', 'on', 'mat'];
    var ref = ['the', 'cat', 'sat', 'on', 'a', 'mat'];
    // 候选中的 the、cat、sat、on、mat 都出现在参考文本中。
    var matched = [1, 1, 1, 1, 1];
    s.appendChild(txt(PAD, ROWY - 16, '候选文本', '10', 'var(--ink-soft,#555)', 'start'));
    s.appendChild(txt(PAD, refY - 14, '参考文本', '10', 'var(--ink-soft,#555)', 'start'));
    var i;
    for (i = 0; i < cand.length; i++) {
      var cx = PAD + i * (bw + gap);
      var on = matched[i];
      var box = rect(cx, ROWY, bw, 28, on ? 'var(--bg-surface,#eee)' : 'var(--bg,#fafaf5)', on ? 'var(--blueprint,#3553ff)' : 'var(--rule-soft,#ddd)');
      box.appendChild(svgEl('animate', { attributeName: 'opacity', values: '0.4;1;1', keyTimes: '0;' + (0.12 + i * 0.12).toFixed(2) + ';1', dur: '3.6s', repeatCount: 'indefinite' }));
      s.appendChild(box);
      s.appendChild(txt(cx + bw / 2, ROWY + 19, cand[i], '11', on ? 'var(--blueprint,#3553ff)' : 'var(--ink-mute,#777)'));
    }
    for (i = 0; i < ref.length; i++) {
      var rx = PAD + i * (bw * 5 / 6 + gap);
      s.appendChild(rect(rx, refY, bw - 6, 26, 'var(--bg,#fafaf5)', 'var(--rule-soft,#ddd)'));
      s.appendChild(txt(rx + (bw - 6) / 2, refY + 18, ref[i], '10', 'var(--ink-mute,#777)'));
    }
    // 匹配连线逐一显现。
    for (i = 0; i < cand.length; i++) {
      var x1 = PAD + i * (bw + gap) + bw / 2;
      var rIdx = i < 4 ? i : 5;
      var x2 = PAD + rIdx * (bw * 5 / 6 + gap) + (bw - 6) / 2;
      var mline = svgEl('line', { x1: x1, y1: ROWY + 28, x2: x2, y2: refY, stroke: 'var(--blueprint,#3553ff)', 'stroke-width': '1.4', opacity: '0.7' });
      mline.appendChild(svgEl('animate', { attributeName: 'opacity', values: '0;0;0.7;0.7', keyTimes: '0;' + (0.12 + i * 0.12).toFixed(2) + ';' + (0.2 + i * 0.12).toFixed(2) + ';1', dur: '3.6s', repeatCount: 'indefinite' }));
      s.appendChild(mline);
    }
    var score = txt(440, ROWY + 4, '5/5', '12', 'var(--blueprint,#3553ff)', 'start');
    score.appendChild(svgEl('animate', { attributeName: 'opacity', values: '0;0;1;1', keyTimes: '0;0.7;0.8;1', dur: '3.6s', repeatCount: 'indefinite' }));
    s.appendChild(score);
    s.appendChild(txt(440, ROWY + 20, '精确率', '8', 'var(--ink-mute,#777)', 'start'));
    s.appendChild(txt(440, ROWY + 40, 'BP < 1', '9', 'var(--warn,#b8870f)', 'start'));
    s.appendChild(txt(440, ROWY + 54, '（文本过短）', '8', 'var(--ink-mute,#777)', 'start'));
    shell(host, 'BLEU 的 n 元组重叠（N-gram Overlap）', '匹配计数 · 截断 · 长度惩罚', s,
      'BLEU 的基础是计数。候选文本中每个出现在参考文本里的 n 元组（N-gram）计为一次匹配；对匹配次数截断后，再按候选长度归一化，得到修正 n 元组精确率（Modified N-gram Precision）。候选比参考文本短时会受到简短惩罚（Brevity Penalty，BP），因此过短文本即使精确率很高，也会被扣分。ROUGE-L 则依据最长公共子序列（Longest Common Subsequence）评分。图中保留英文词元，以展示匹配关系。');
  }

  // 第 73 课：校准可靠性图，观测点逐渐靠近对角线。
  function cdReliability(host) {
    var s = svg(250), X0 = 60, Y0 = 30, SZ = 180, Y1 = Y0 + SZ;
    // 坐标轴。
    s.appendChild(svgEl('line', { x1: X0, y1: Y0, x2: X0, y2: Y1, stroke: 'var(--rule-soft,#ddd)', 'stroke-width': '1' }));
    s.appendChild(svgEl('line', { x1: X0, y1: Y1, x2: X0 + SZ, y2: Y1, stroke: 'var(--rule-soft,#ddd)', 'stroke-width': '1' }));
    // 对角线表示完美校准。
    s.appendChild(svgEl('line', { x1: X0, y1: Y1, x2: X0 + SZ, y2: Y0, stroke: 'var(--ink-mute,#777)', 'stroke-width': '1.2', 'stroke-dasharray': '4 4' }));
    s.appendChild(txt(X0 + SZ - 4, Y0 + 30, '完美校准', '9', 'var(--ink-mute,#777)', 'end'));
    s.appendChild(txt(X0 + SZ / 2, Y1 + 22, '预测置信度', '9', 'var(--ink-soft,#555)'));
    var lab = svgEl('text', { x: X0 - 16, y: Y0 + SZ / 2, 'text-anchor': 'middle', 'font-family': 'var(--font-mono,monospace)', 'font-size': '9', fill: 'var(--ink-soft,#555)', transform: 'rotate(-90 ' + (X0 - 16) + ' ' + (Y0 + SZ / 2) + ')' });
    lab.appendChild(document.createTextNode('观测准确率'));
    s.appendChild(lab);
    // 五个置信度分箱：过度自信的点位于对角线下方，再向上移动到对角线。
    var confs = [0.1, 0.3, 0.5, 0.7, 0.9];
    var acc = [0.08, 0.2, 0.34, 0.5, 0.62]; // 准确率低于置信度，表示过度自信。
    var i;
    for (i = 0; i < confs.length; i++) {
      var cx = X0 + confs[i] * SZ;
      var yBad = Y1 - acc[i] * SZ;
      var yGood = Y1 - confs[i] * SZ;
      // 从基准位置到观测点的距离。
      var bh = (yBad < yGood ? yBad : yGood);
      var dot = svgEl('circle', { cx: cx, cy: yBad, r: '5', fill: 'var(--blueprint,#3553ff)' });
      dot.appendChild(svgEl('animate', { attributeName: 'cy', values: yBad + ';' + yGood + ';' + yGood + ';' + yBad, keyTimes: '0;0.4;0.7;1', dur: '4.5s', begin: (i * 0.08) + 's', repeatCount: 'indefinite' }));
      s.appendChild(dot);
      // 差距线段表示该分箱对 ECE 的贡献。
      var gapl = svgEl('line', { x1: cx, y1: yBad, x2: cx, y2: yGood, stroke: 'var(--warn,#b8870f)', 'stroke-width': '2' });
      gapl.appendChild(svgEl('animate', { attributeName: 'y1', values: yBad + ';' + yGood + ';' + yGood + ';' + yBad, keyTimes: '0;0.4;0.7;1', dur: '4.5s', begin: (i * 0.08) + 's', repeatCount: 'indefinite' }));
      s.appendChild(gapl);
    }
    var tag = txt(X0 + 14, Y0 + 14, 'ECE：与对角线的差距', '9', 'var(--warn,#b8870f)', 'start');
    s.appendChild(tag);
    shell(host, '校准可靠性（Calibration Reliability）', '置信度与准确率对照', s,
      '按模型给出的置信度对预测分箱，并绘制各箱的观测准确率。校准良好的模型位于对角线上。橙色线段表示置信度高于实际准确率的差距；期望校准误差（Expected Calibration Error，ECE）是这些差距按分箱权重计算的平均值。困惑度（Perplexity）衡量留出文本在模型看来是否可能出现；校准（Calibration）衡量置信度是否与实际表现相符。');
  }

  // 第 78 课：优化器状态分配到各进程，先分散归约，再汇集参数。
  function cdZero(host) {
    var s = svg(240), n = 4, PAD = 36, bw = 88, gap = (520 - 2 * PAD - n * bw) / (n - 1);
    var topY = 44, optY = 96, optH = 70;
    s.appendChild(txt(PAD, 28, '每个进程：完整参数 + 1/N 优化器状态', '10', 'var(--ink-soft,#777)', 'start'));
    var i;
    for (i = 0; i < n; i++) {
      var x = PAD + i * (bw + gap);
      // 每个进程保留完整参数副本。
      s.appendChild(rect(x, topY, bw, 22, 'var(--bg-surface,#eee)', 'var(--rule-soft,#ddd)'));
      s.appendChild(txt(x + bw / 2, topY + 15, '参数', '9', 'var(--ink-mute,#777)'));
      // 只保存当前进程负责的优化器状态分片。
      var shard = rect(x, optY, bw, optH, 'var(--bg-surface,#eee)', 'var(--blueprint,#3553ff)');
      s.appendChild(shard);
      s.appendChild(txt(x + bw / 2, optY + 26, 'Adam', '9', 'var(--blueprint,#3553ff)'));
      s.appendChild(txt(x + bw / 2, optY + 40, '分片 ' + i, '9', 'var(--blueprint,#3553ff)'));
      s.appendChild(txt(x + bw / 2, optY + optH + 16, 'rank ' + i, '9', 'var(--ink-soft,#555)'));
      // reduce_scatter 箭头表示梯度分片到达。
      var rs = svgEl('path', { d: 'M ' + (x + bw / 2) + ' ' + (optY - 14) + ' L ' + (x + bw / 2) + ' ' + (optY - 2), stroke: 'var(--ink-mute,#777)', 'stroke-width': '2' });
      s.appendChild(rs);
      var rsm = svgEl('circle', { cx: x + bw / 2, cy: optY - 14, r: '3.5', fill: 'var(--warn,#b8870f)' });
      rsm.appendChild(svgEl('animate', { attributeName: 'cy', values: (optY - 28) + ';' + (optY - 4), keyTimes: '0;1', dur: '1.8s', begin: '0s', repeatCount: 'indefinite' }));
      rsm.appendChild(svgEl('animate', { attributeName: 'opacity', values: '0;1;1;0', keyTimes: '0;0.2;0.8;1', dur: '1.8s', repeatCount: 'indefinite' }));
      s.appendChild(rsm);
      // allgather 脉冲表示更新后的参数分片被汇集到各进程。
      var pulse = svgEl('circle', { cx: x + bw / 2, cy: optY + optH / 2, r: '4', fill: 'none', stroke: 'var(--blueprint,#3553ff)', 'stroke-width': '2' });
      pulse.appendChild(svgEl('animate', { attributeName: 'r', values: '4;26', keyTimes: '0;1', dur: '1.8s', begin: '0.9s', repeatCount: 'indefinite' }));
      pulse.appendChild(svgEl('animate', { attributeName: 'opacity', values: '0.7;0', keyTimes: '0;1', dur: '1.8s', begin: '0.9s', repeatCount: 'indefinite' }));
      s.appendChild(pulse);
    }
    s.appendChild(txt(PAD, 218, 'reduce_scatter 传入梯度', '9', 'var(--warn,#b8870f)', 'start'));
    s.appendChild(txt(520 - PAD, 218, 'allgather 汇集参数', '9', 'var(--blueprint,#3553ff)', 'end'));
    shell(host, 'ZeRO 状态分片（ZeRO State Sharding）', '每个进程保存 1/N 优化器状态', s,
      '常规分布式数据并行（Distributed Data Parallel，DDP）在每个进程（Rank）上复制优化器状态，而这部分通常占用最多内存。ZeRO 第 1 阶段让每个进程只保存 1/N 的 Adam 矩估计。reduce_scatter 将梯度分片送到相应进程，进程在本地更新后，再由 allgather 汇集更新后的参数分片，使各进程重建完整模型。内存占用线性下降，通信量相当于一次全归约（All-reduce）。');
  }

  // 第 79 课：微批次流经各流水线阶段，空闲气泡逐渐缩小。
  function cdPipeline(host) {
    var s = svg(240), N = 4, M = 4, PAD = 50, cellW = 57, cellH = 26, gap = 6;
    var rowY = 40;
    var i, j;
    // 各阶段的行标签。
    for (i = 0; i < N; i++) {
      s.appendChild(txt(PAD - 8, rowY + i * (cellH + gap) + 17, '阶段 ' + i, '9', 'var(--ink-soft,#555)', 'end'));
      // 阶段时间轴。
      s.appendChild(svgEl('line', { x1: PAD, y1: rowY + i * (cellH + gap) + cellH / 2, x2: PAD + (M + N) * cellW, y2: rowY + i * (cellH + gap) + cellH / 2, stroke: 'var(--rule-soft,#ddd)', 'stroke-width': '0.6' }));
    }
    // 对角线流动：微批次 m 在 t = m + i 时占用阶段 i。
    var period = 4.4;
    for (j = 0; j < M; j++) {
      for (i = 0; i < N; i++) {
        var slot = j + i;
        var x = PAD + slot * cellW + 4;
        var y = rowY + i * (cellH + gap);
        var c = rect(x, y, cellW - 8, cellH, 'var(--bg-surface,#eee)', 'var(--blueprint,#3553ff)');
        var begin = (slot * 0.18).toFixed(2);
        c.appendChild(svgEl('animate', { attributeName: 'opacity', values: '0.12;1;1;0.35', keyTimes: '0;0.18;0.7;1', dur: period + 's', begin: begin + 's', repeatCount: 'indefinite' }));
        s.appendChild(c);
        var lab = txt(x + (cellW - 8) / 2, y + 17, 'mb' + j, '9', 'var(--blueprint,#3553ff)');
        lab.appendChild(svgEl('animate', { attributeName: 'opacity', values: '0;1;1;0.4', keyTimes: '0;0.18;0.7;1', dur: period + 's', begin: begin + 's', repeatCount: 'indefinite' }));
        s.appendChild(lab);
      }
    }
    // 阴影表示右上与左下的三角形空闲区域。
    s.appendChild(txt(PAD + (M + N - 1) * cellW, rowY - 6, '气泡', '9', 'var(--warn,#b8870f)', 'middle'));
    var bub = svgEl('path', { d: 'M ' + (PAD + M * cellW) + ' ' + rowY + ' L ' + (PAD + (M + N - 1) * cellW) + ' ' + rowY + ' L ' + (PAD + (M + N - 1) * cellW) + ' ' + (rowY + (N - 1) * (cellH + gap)) + ' Z', fill: 'var(--warn,#b8870f)', opacity: '0.12' });
    s.appendChild(bub);
    s.appendChild(txt(PAD, 215, '气泡占比 = (N-1)/(M+N-1) = 3/7 ≈ 43%（M=4, N=4）', '10', 'var(--ink-soft,#555)', 'start'));
    shell(host, '流水线并行（Pipeline Parallelism）', '微批次填满各阶段', s,
      '每个阶段位于独立进程（Rank）上；微批次（Micro-batch）进入阶段 0，将激活值（Activation）传给阶段 1，以此类推，在时间轴上形成对角线。阴影三角形是流水线气泡（Pipeline Bubble），表示流水线填充与排空时的空闲时间。每步增加微批次数可缩小气泡：占比 (N-1)/(M+N-1) 从 M=4 时的 43% 降到 M=64 时的 5% 以下。图内 mb 表示微批次。');
  }

  // 第 82 课：围绕助手的六类信任边界。
  function cdTaxonomy(host) {
    var s = svg(260), CX = 260, CY = 130, R = 92;
    var cats = [
      ['角色扮演', '助手人设'],
      ['指令覆盖', '系统权威'],
      ['上下文夹带', '内容与指令的边界'],
      ['多轮渐进诱导', '把历史当作承诺'],
      ['编码混淆', '表层形式'],
      ['前缀注入', '下一词元']
    ];
    // 中央的助手可信核心。
    s.appendChild(svgEl('circle', { cx: CX, cy: CY, r: '34', fill: 'var(--bg-surface,#eee)', stroke: 'var(--blueprint,#3553ff)', 'stroke-width': '1.6' }));
    s.appendChild(txt(CX, CY - 2, '助手', '10', 'var(--blueprint,#3553ff)'));
    s.appendChild(txt(CX, CY + 12, '可信核心', '9', 'var(--ink-mute,#777)'));
    var i;
    for (i = 0; i < 6; i++) {
      var ang = (i / 6) * 2 * Math.PI - Math.PI / 2;
      var nx = CX + R * Math.cos(ang), ny = CY + R * Math.sin(ang);
      // 连接边界与核心的辐射线。
      s.appendChild(svgEl('line', { x1: CX + 34 * Math.cos(ang), y1: CY + 34 * Math.sin(ang), x2: nx, y2: ny, stroke: 'var(--rule-soft,#ddd)', 'stroke-width': '1' }));
      // 各类攻击脉冲错时沿辐射线向内移动。
      var pulse = svgEl('circle', { cx: nx, cy: ny, r: '3.5', fill: 'var(--warn,#b8870f)' });
      pulse.appendChild(svgEl('animate', { attributeName: 'cx', values: nx + ';' + (CX + 36 * Math.cos(ang)), keyTimes: '0;1', dur: '2.4s', begin: (i * 0.4) + 's', repeatCount: 'indefinite' }));
      pulse.appendChild(svgEl('animate', { attributeName: 'cy', values: ny + ';' + (CY + 36 * Math.sin(ang)), keyTimes: '0;1', dur: '2.4s', begin: (i * 0.4) + 's', repeatCount: 'indefinite' }));
      pulse.appendChild(svgEl('animate', { attributeName: 'opacity', values: '1;1;0', keyTimes: '0;0.7;1', dur: '2.4s', begin: (i * 0.4) + 's', repeatCount: 'indefinite' }));
      s.appendChild(pulse);
      // 边界节点及其标签。
      var anchor = Math.cos(ang) > 0.2 ? 'start' : Math.cos(ang) < -0.2 ? 'end' : 'middle';
      var lx = nx + (anchor === 'start' ? 8 : anchor === 'end' ? -8 : 0);
      s.appendChild(svgEl('circle', { cx: nx, cy: ny, r: '6', fill: 'var(--bg,#fafaf5)', stroke: 'var(--blueprint,#3553ff)', 'stroke-width': '1.4' }));
      s.appendChild(txt(lx, ny - 2, cats[i][0], '9', 'var(--ink,#1a1a1a)', anchor));
      s.appendChild(txt(lx, ny + 10, cats[i][1], '8', 'var(--ink-mute,#777)', anchor));
    }
    shell(host, '越狱攻击分类（Jailbreak Taxonomy）', '六类信任边界', s,
      '没有分类体系的安全测试框架（Safety Harness）很难系统地判断覆盖范围。六类攻击分别利用一条信任边界（Trust Boundary）：角色扮演（Role-play）、指令覆盖（Instruction Override）、上下文夹带（Context Smuggling）、多轮渐进诱导（Multi-turn Ramp）、编码混淆（Encoding Trick）和前缀注入（Prefix Injection），覆盖助手人设到下一词元决策。明确边界后，就能把攻击流统计成分布图，再转为覆盖率图，据此安排下一个迭代。');
  }

  // 第 85 课：三个输出分类器将结果交给策略路由器。
  function cdRouter(host) {
    var s = svg(250), PAD = 24, clsX = 36, clsW = 150, rtX = 244, rtW = 96;
    var cls = [
      [60, '有害内容', '辱骂 / 骚扰', 'low'],
      [125, '个人身份信息', '邮箱 · 社保号 · 卡号', 'medium'],
      [190, '信息泄漏', '复述系统提示词', 'high']
    ];
    s.appendChild(txt(clsX, 28, '模型输出 → 三个分类器并行检查', '10', 'var(--ink-soft,#555)', 'start'));
    var actions = [
      [54, '记录', 'var(--ink-mute,#777)'],
      [104, '警告', 'var(--ink-soft,#555)'],
      [154, '遮蔽', 'var(--warn,#b8870f)'],
      [204, '拦截', 'var(--warn,#b8870f)']
    ];
    // 策略路由器节点。
    s.appendChild(rect(rtX, 96, rtW, 64, 'var(--bg-surface,#eee)', 'var(--blueprint,#3553ff)'));
    s.appendChild(txt(rtX + rtW / 2, 122, '策略', '11', 'var(--blueprint,#3553ff)'));
    s.appendChild(txt(rtX + rtW / 2, 138, '路由器', '11', 'var(--blueprint,#3553ff)'));
    var i;
    for (i = 0; i < cls.length; i++) {
      var cy = cls[i][0];
      s.appendChild(rect(clsX, cy, clsW, 44, 'var(--bg,#fafaf5)', 'var(--rule-soft,#ddd)'));
      s.appendChild(txt(clsX + clsW / 2, cy + 18, cls[i][1], '11', 'var(--ink,#1a1a1a)'));
      s.appendChild(txt(clsX + clsW / 2, cy + 34, cls[i][2], '8', 'var(--ink-mute,#777)'));
      // 各项判定错时传入路由器。
      var pkt = svgEl('circle', { cx: clsX + clsW + 4, cy: cy + 22, r: '4.5', fill: 'var(--warn,#b8870f)' });
      pkt.appendChild(svgEl('animate', { attributeName: 'cx', values: (clsX + clsW + 4) + ';' + rtX, keyTimes: '0;1', dur: '1.4s', begin: (i * 0.3) + 's', repeatCount: 'indefinite' }));
      pkt.appendChild(svgEl('animate', { attributeName: 'cy', values: (cy + 22) + ';128', keyTimes: '0;1', dur: '1.4s', begin: (i * 0.3) + 's', repeatCount: 'indefinite' }));
      pkt.appendChild(svgEl('animate', { attributeName: 'opacity', values: '1;1;0', keyTimes: '0;0.7;1', dur: '1.4s', begin: (i * 0.3) + 's', repeatCount: 'indefinite' }));
      s.appendChild(pkt);
      s.appendChild(svgEl('line', { x1: clsX + clsW, y1: cy + 22, x2: rtX, y2: 128, stroke: 'var(--rule-soft,#ddd)', 'stroke-width': '0.8' }));
    }
    // 按最高严重程度选择动作，此处点亮拦截。
    for (i = 0; i < actions.length; i++) {
      var ay = actions[i][0];
      var hot = (i === 3);
      var ab = rect(rtX + rtW + 22, ay, 90, 30, 'var(--bg,#fafaf5)', hot ? 'var(--warn,#b8870f)' : 'var(--rule-soft,#ddd)');
      if (hot) ab.appendChild(svgEl('animate', { attributeName: 'opacity', values: '0.3;0.3;1;1;0.3', keyTimes: '0;0.6;0.72;0.95;1', dur: '4.2s', repeatCount: 'indefinite' }));
      s.appendChild(ab);
      s.appendChild(txt(rtX + rtW + 22 + 45, ay + 19, actions[i][1], '10', actions[i][2]));
    }
    s.appendChild(txt(rtX + rtW + 22 + 45, 26, '严重程度 → 动作', '8', 'var(--ink-mute,#777)'));
    shell(host, '输出策略路由器（Output Policy Router）', '分类器 → 严重程度 → 动作', s,
      '仅检查输入还不够；输出侧分类器需要检查实际回答，判断能否交付。三个独立分类器分别检查有害内容（Toxicity）、个人身份信息（Personally Identifiable Information，PII）和信息泄漏（Leakage），返回严重程度。路由器按最严重的问题选择记录（Log）、警告（Warn）、遮蔽（Redact）或拦截（Block）。分类器与流式输出并行运行，使检查延迟能够被最后一次输出刷写所掩盖。');
  }

  // 第 86 课：草稿、规则检查、修订器、修订稿与复查的循环。
  function cdConstitution(host) {
    var s = svg(240), CX = 260, CY = 116;
    var nodes = [
      [90, 70, '草稿'],
      [260, 50, '规则引擎'],
      [430, 70, '修订器'],
      [430, 170, '修订稿'],
      [260, 190, '第二轮规则检查'],
      [90, 170, '判定']
    ];
    var i;
    // 圆点沿节点顺序组成的六边形闭环移动。
    var pts = [];
    for (i = 0; i < nodes.length; i++) { pts.push([nodes[i][0], nodes[i][1]]); }
    var pathD = 'M ' + pts[0][0] + ' ' + pts[0][1];
    for (i = 1; i < pts.length; i++) { pathD += ' L ' + pts[i][0] + ' ' + pts[i][1]; }
    pathD += ' Z';
    s.appendChild(svgEl('path', { d: pathD, fill: 'none', stroke: 'var(--rule-soft,#ddd)', 'stroke-width': '1.4', 'stroke-dasharray': '5 5' }));
    // 规则引擎节点显示违规提示。
    for (i = 0; i < nodes.length; i++) {
      var nx = nodes[i][0], ny = nodes[i][1];
      var isRule = (i === 1 || i === 4);
      s.appendChild(svgEl('rect', { x: nx - 52, y: ny - 15, width: 104, height: 30, rx: '5', fill: 'var(--bg-surface,#eee)', stroke: isRule ? 'var(--blueprint,#3553ff)' : 'var(--rule-soft,#ddd)', 'stroke-width': '1.4' }));
      s.appendChild(txt(nx, ny + 4, nodes[i][2], '10', isRule ? 'var(--blueprint,#3553ff)' : 'var(--ink,#1a1a1a)'));
    }
    // 使用 animateMotion 让信号点沿闭环移动。
    var mover = svgEl('circle', { r: '6', fill: 'var(--warn,#b8870f)' });
    var motion = svgEl('animateMotion', { dur: '5.4s', repeatCount: 'indefinite', path: pathD });
    mover.appendChild(motion);
    s.appendChild(mover);
    // 在规则引擎处闪烁的违规提示。
    var badge = txt(CX, 30, '违规：缺少可运行代码块', '9', 'var(--warn,#b8870f)');
    badge.appendChild(svgEl('animate', { attributeName: 'opacity', values: '0;1;1;0', keyTimes: '0;0.1;0.25;0.4', dur: '5.4s', repeatCount: 'indefinite' }));
    s.appendChild(badge);
    var ok = txt(CX, 218, '接受：修订稿满足所有规则', '9', 'var(--blueprint,#3553ff)');
    ok.appendChild(svgEl('animate', { attributeName: 'opacity', values: '0;0;1;1;0', keyTimes: '0;0.6;0.72;0.92;1', dur: '5.4s', repeatCount: 'indefinite' }));
    s.appendChild(ok);
    shell(host, '宪法规则（Constitutional Rules）', '草稿 → 修订 → 复查', s,
      '一条规则必须包含名称、判定条件（Predicate）和解释，缺少任何一项都难以明确执行。宪法（Constitution）以 YAML 保存并纳入版本控制。规则引擎标出每项违规，修订器提出修改，第二轮检查确认修订稿满足所有规则后，再决定接受回答或升级处理（Escalation）。');
  }

  LF.register({
    'cd-hyde-vector': cdHyde,
    'cd-bleu-overlap': cdBleu,
    'cd-reliability-diagram': cdReliability,
    'cd-zero-shard': cdZero,
    'cd-pipeline-bubble': cdPipeline,
    'cd-attack-taxonomy': cdTaxonomy,
    'cd-output-router': cdRouter,
    'cd-constitution-loop': cdConstitution
  });
})();
