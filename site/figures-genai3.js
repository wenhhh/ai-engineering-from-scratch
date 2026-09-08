/* figures-genai3.js：阶段 8（生成式 AI（Generative AI））与
   阶段 5（自然语言处理（NLP））的动画课程图表。在 lesson-figures.js 之后加载，通过 window.LF 注册。
   无依赖，仅使用 ES5，主题由 CSS 变量控制。动画仅使用 SMIL（声明式（Declarative）），
   不使用 JS 循环，不进行真实计算。每张图都是单个静态 SVG 场景，
   浏览器将其呈现为动画，无头环境（Headless）/减少动态效果模式（Reduced-motion）将其渲染为静止帧。 */
(function () {
  'use strict';
  var LF = window.LF;
  if (!LF) { return; }
  var el = LF.el, svgEl = LF.svgEl;

  var BP = 'var(--blueprint,#3553ff)';
  var MUTE = 'var(--ink-mute,#999)';
  var SOFT = 'var(--rule-soft,#ddd)';
  var WARN = 'var(--warn,#b8870f)';
  var INK = 'var(--ink,#1a1a1a)';

  function frame(host, label, hint, svg, caption) {
    host.appendChild(el('div', { class: 'lf' }, [
      el('div', { class: 'lf-head' }, [el('span', { class: 'lf-label' }, [label]), el('span', {}, [hint])]),
      el('div', { class: 'lf-body' }, [el('div', { class: 'lf-out' }, [svg])]),
      el('div', { class: 'lf-cap' }, [caption])
    ]));
  }
  function anim(attr, vals, dur, extra) {
    var a = { attributeName: attr, values: vals, dur: dur, repeatCount: 'indefinite' };
    if (extra) for (var k in extra) a[k] = extra[k];
    if (a.keySplines && !a.calcMode) a.calcMode = 'spline';
    return svgEl('animate', a);
  }
  function txt(x, y, s, size, fill, anchor) {
    return svgEl('text', { x: x, y: y, 'text-anchor': anchor || 'middle', 'font-size': size || 11, fill: fill || MUTE, 'font-family': 'monospace' }, [document.createTextNode(s)]);
  }

  // ── gx-var-next-scale: 下一尺度预测（Next-scale prediction），网格依次增长 1→2→4→8 ──
  function varNextScale(host) {
    var W = 520, H = 250, svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var scales = [1, 2, 4, 8];
    var bx = [28, 150, 272, 394], by = 70, size = 96;
    scales.forEach(function (n, si) {
      var x0 = bx[si], cell = size / n;
      // 按尺度顺序出现：阶段 si 在比例 si/4 时点亮
      var t0 = si / 4, t1 = (si + 0.5) / 4;
      var g = svgEl('g', {});
      // 边框（Frame）
      g.appendChild(svgEl('rect', { x: x0, y: by, width: size, height: size, fill: 'none', stroke: SOFT, 'stroke-width': '1' }));
      var r, c;
      for (r = 0; r < n; r++) for (c = 0; c < n; c++) {
        var rect = svgEl('rect', { x: (x0 + c * cell).toFixed(1), y: (by + r * cell).toFixed(1), width: (cell - 1.2).toFixed(1), height: (cell - 1.2).toFixed(1), fill: BP, opacity: '0' });
        rect.appendChild(anim('opacity', '0;0;0.85;0.85', '8s', { keyTimes: '0;' + t0.toFixed(3) + ';' + t1.toFixed(3) + ';1', keySplines: '0 0 1 1;.4 0 .2 1;0 0 1 1' }));
        g.appendChild(rect);
      }
      g.appendChild(txt(x0 + size / 2, by + size + 16, n + 'x' + n, 11, MUTE));
      svg.appendChild(g);
      // 指向下一尺度的条件传递（Conditioning）箭头
      if (si < scales.length - 1) {
        var ax = x0 + size + 4, axe = bx[si + 1] - 4;
        var ar = svgEl('line', { x1: ax, y1: by + size / 2, x2: axe, y2: by + size / 2, stroke: MUTE, 'stroke-width': '1.6', 'marker-end': 'none', opacity: '0.25' });
        ar.appendChild(anim('opacity', '0.25;0.25;1;0.25', '8s', { keyTimes: '0;' + t1.toFixed(3) + ';' + ((si + 1) / 4).toFixed(3) + ';1', keySplines: '0 0 1 1;.4 0 .2 1;0 0 1 1' }));
        svg.appendChild(ar);
        svg.appendChild(svgEl('polygon', { points: (axe - 6) + ',' + (by + size / 2 - 4) + ' ' + axe + ',' + (by + size / 2) + ' ' + (axe - 6) + ',' + (by + size / 2 + 4), fill: MUTE }));
      }
    });
    svg.appendChild(txt(W / 2, 30, '以已有的全部粗尺度为条件，一次预测一个新尺度', 11, MUTE));
    frame(host, '下一尺度预测（Next-scale Prediction）', '由粗到细', svg,
      '视觉自回归模型（Visual Autoregressive Model，VAR）按分辨率序列生成图像，而不是按光栅顺序逐像素生成。它先预测 1×1 的词元概要，再生成 2×2、4×4、8×8 网格。每个尺度都在一次并行计算中生成，并以之前所有更粗的尺度为条件，从而消除逐像素模型的生成顺序问题。');
  }

  // ── gx-fid-distributions: FID 表示两个特征点云（Feature clouds）之间的距离 ──
  function fidDistributions(host) {
    var W = 520, H = 240, svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    svg.appendChild(svgEl('rect', { x: 30, y: 40, width: W - 60, height: H - 80, fill: 'none', stroke: SOFT, 'stroke-width': '1' }));
    svg.appendChild(txt(40, 30, 'Inception 特征空间：2048 维中的 2 维', 11, MUTE, 'start'));
    // 真实点云：固定、近似高斯的团块，中心位于左下；生成点云以动画从远处移至与之重叠
    var realC = [180, 150], genStart = [400, 90], genEnd = [205, 138];
    function blob(cx, cy, st, pts) {
      var g = svgEl('g', {}), i;
      var off = [[0, 0], [22, -14], [-18, 16], [30, 18], [-26, -20], [12, 28], [-34, 4], [8, -30]];
      for (i = 0; i < pts; i++) {
        g.appendChild(svgEl('circle', { cx: (cx + off[i][0]).toFixed(1), cy: (cy + off[i][1]).toFixed(1), r: '4', fill: st, opacity: '0.8' }));
      }
      return g;
    }
    svg.appendChild(blob(realC[0], realC[1], BP, 8));
    // 生成团块通过 animateTransform 从初始偏移处平移至重叠位置
    var genG = blob(genEnd[0], genEnd[1], WARN, 8);
    var dx0 = genStart[0] - genEnd[0], dy0 = genStart[1] - genEnd[1];
    genG.appendChild(svgEl('animateTransform', { attributeName: 'transform', type: 'translate', values: dx0 + ' ' + dy0 + ';0 0;0 0;' + dx0 + ' ' + dy0, keyTimes: '0;0.45;0.7;1', dur: '9s', repeatCount: 'indefinite', calcMode: 'spline', keySplines: '.4 0 .2 1;0 0 1 1;.4 0 .2 1' }));
    svg.appendChild(genG);
    // 连接两个均值的距离线
    var line = svgEl('line', { x1: realC[0], y1: realC[1], x2: genStart[0], y2: genStart[1], stroke: INK, 'stroke-width': '1.4', 'stroke-dasharray': '5 4' });
    line.appendChild(anim('x2', genStart[0] + ';' + genEnd[0] + ';' + genEnd[0] + ';' + genStart[0], '9s', { keyTimes: '0;0.45;0.7;1', keySplines: '.4 0 .2 1;0 0 1 1;.4 0 .2 1' }));
    line.appendChild(anim('y2', genStart[1] + ';' + genEnd[1] + ';' + genEnd[1] + ';' + genStart[1], '9s', { keyTimes: '0;0.45;0.7;1', keySplines: '.4 0 .2 1;0 0 1 1;.4 0 .2 1' }));
    svg.appendChild(line);
    svg.appendChild(svgEl('circle', { cx: realC[0], cy: realC[1], r: '3', fill: INK }));
    svg.appendChild(txt(110, 215, '真实样本：蓝色   生成样本：琥珀色', 11, MUTE, 'start'));
    var fidLabel = txt(W - 40, 215, 'FID 较高', 12, WARN, 'end');
    fidLabel.appendChild(svgEl('animate', { attributeName: 'fill', values: WARN + ';' + BP + ';' + BP + ';' + WARN, keyTimes: '0;0.45;0.7;1', dur: '9s', repeatCount: 'indefinite' }));
    svg.appendChild(fidLabel);
    frame(host, '弗雷歇 Inception 距离（FID）', '比较两个分布', svg,
      '弗雷歇 Inception 距离（Fréchet Inception Distance，FID）不逐张图像打分，而是在 Inception 特征空间中，分别为真实图像与生成图像拟合高斯分布，再用均值和协方差衡量两个分布的距离。当生成样本点云逐渐与真实点云重合时，分布距离和 FID 都趋近于零。');
  }

  // ── gx-patchgan: 判别器（Discriminator）为重叠图块（Patches）网格评分 ──
  function patchgan(host) {
    var W = 520, H = 240, svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var ix = 60, iy = 50, isz = 150, n = 4;
    svg.appendChild(txt(ix + isz / 2, 36, '生成图像 y：以输入 x 为条件', 10, MUTE));
    svg.appendChild(svgEl('rect', { x: ix, y: iy, width: isz, height: isz, fill: BP, opacity: '0.06', stroke: SOFT, 'stroke-width': '1' }));
    var cell = isz / n, r, c, k = 0;
    // 右侧判定网格；感受野（Receptive-field）框扫过时，对应图块点亮
    var gx = 330, gy = 50, gcell = 30;
    var rf = svgEl('rect', { x: ix, y: iy, width: cell + 8, height: cell + 8, fill: 'none', stroke: WARN, 'stroke-width': '1.8' });
    for (r = 0; r < n; r++) for (c = 0; c < n; c++) {
      var t = k / (n * n);
      var verdict = svgEl('rect', { x: gx + c * gcell, y: gy + r * gcell, width: gcell - 2, height: gcell - 2, fill: BP, opacity: '0.1', stroke: SOFT, 'stroke-width': '0.8' });
      verdict.appendChild(anim('opacity', '0.1;0.1;0.85;0.85', '8s', { keyTimes: '0;' + t.toFixed(3) + ';' + Math.min(1, t + 0.05).toFixed(3) + ';1', keySplines: '0 0 1 1;.3 0 .2 1;0 0 1 1' }));
      svg.appendChild(verdict);
      k++;
    }
    // 感受野标记逐单元扫过图像
    var rx = [], ry = [], kt = [];
    for (r = 0; r < n; r++) for (c = 0; c < n; c++) { rx.push((ix + c * cell - 4).toFixed(1)); ry.push((iy + r * cell - 4).toFixed(1)); kt.push((rx.length - 1) / (n * n)); }
    kt.push(1); rx.push(rx[rx.length - 1]); ry.push(ry[ry.length - 1]);
    rf.appendChild(svgEl('animate', { attributeName: 'x', values: rx.join(';'), keyTimes: kt.join(';'), dur: '8s', repeatCount: 'indefinite', calcMode: 'discrete' }));
    rf.appendChild(svgEl('animate', { attributeName: 'y', values: ry.join(';'), keyTimes: kt.join(';'), dur: '8s', repeatCount: 'indefinite', calcMode: 'discrete' }));
    svg.appendChild(rf);
    svg.appendChild(txt(gx + (n * gcell) / 2 - 1, gy + n * gcell + 18, 'N×N 真伪判定网格', 11, MUTE));
    svg.appendChild(txt(ix + isz / 2, iy + isz + 18, '70×70 感受野（Receptive Field）', 9, WARN));
    frame(host, 'PatchGAN 判别器（Discriminator）', '判断局部真实感', svg,
      'PatchGAN 不为整张图像输出一个真伪分数，而是用固定感受野（Receptive Field）扫描输出，独立判断每个局部图块（Patch），形成 N×N 判定网格，再取平均值。将真实感视为局部属性，可以让判别器更小、更快，并更敏锐地识别高频纹理。');
  }

  // ── gx-stylegan-mapping: z 纠缠（Entangled），w 解纠缠（Disentangled），按尺度注入 ──
  function styleganMapping(host) {
    var W = 520, H = 250, svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    // 左侧：纠缠的 z（缠绕的游走路径）；MLP；解纠缠的 w（轴对齐）；注入刻度
    svg.appendChild(txt(70, 30, 'Z：因素纠缠', 11, MUTE));
    svg.appendChild(txt(250, 30, 'f（8 层 MLP）', 11, BP));
    svg.appendChild(txt(440, 30, 'W：因素解耦', 11, MUTE));
    // 纠缠团块：打结的路径
    svg.appendChild(svgEl('rect', { x: 30, y: 50, width: 110, height: 110, fill: 'none', stroke: SOFT, 'stroke-width': '1' }));
    var knot = svgEl('path', { d: 'M50 70 C 120 60, 60 130, 110 120 S 50 150, 120 90 S 70 70, 100 140', fill: 'none', stroke: BP, 'stroke-width': '1.8', 'stroke-dasharray': '260', 'stroke-dashoffset': '260' });
    knot.appendChild(anim('stroke-dashoffset', '260;0;0;260', '8s', { keyTimes: '0;0.35;0.7;1', keySplines: '.4 0 .2 1;0 0 1 1;.4 0 .2 1' }));
    svg.appendChild(knot);
    // 映射（Mapping）箭头
    svg.appendChild(svgEl('line', { x1: 145, y1: 105, x2: 200, y2: 105, stroke: MUTE, 'stroke-width': '1.4' }));
    svg.appendChild(svgEl('rect', { x: 200, y: 78, width: 90, height: 54, fill: BP, opacity: '0.08', stroke: SOFT, 'stroke-width': '1' }));
    var li;
    for (li = 0; li < 4; li++) svg.appendChild(svgEl('line', { x1: 210, y1: 88 + li * 11, x2: 280, y2: 88 + li * 11, stroke: BP, 'stroke-width': '1', opacity: '0.5' }));
    svg.appendChild(svgEl('line', { x1: 290, y1: 105, x2: 345, y2: 105, stroke: MUTE, 'stroke-width': '1.4' }));
    // 解纠缠的 W：两条清晰的正交轴（姿态/光照）
    svg.appendChild(svgEl('rect', { x: 350, y: 50, width: 110, height: 110, fill: 'none', stroke: SOFT, 'stroke-width': '1' }));
    var axH = svgEl('line', { x1: 360, y1: 105, x2: 360, y2: 105, stroke: BP, 'stroke-width': '2' });
    axH.appendChild(anim('x2', '360;450;450;360', '8s', { keyTimes: '0;0.5;0.7;1', keySplines: '.4 0 .2 1;0 0 1 1;.4 0 .2 1' }));
    var axV = svgEl('line', { x1: 405, y1: 155, x2: 405, y2: 155, stroke: WARN, 'stroke-width': '2' });
    axV.appendChild(anim('y2', '155;60;60;155', '8s', { keyTimes: '0;0.5;0.7;1', keySplines: '.4 0 .2 1;0 0 1 1;.4 0 .2 1' }));
    svg.appendChild(axH); svg.appendChild(axV);
    svg.appendChild(txt(405, 178, '姿态轴（Pose Axis）', 9, BP));
    // 沿合成堆栈（Synthesis stack）向下排列的注入刻度
    var sy;
    for (sy = 0; sy < 4; sy++) {
      var ty = 200 + 0; // 单行分辨率（Resolution）方块
      var rect = svgEl('rect', { x: 60 + sy * 100, y: 195, width: 70, height: 32, fill: BP, opacity: '0.08', stroke: SOFT, 'stroke-width': '1' });
      svg.appendChild(rect);
      svg.appendChild(txt(95 + sy * 100, 215, ['4x4', '16x16', '64x64', '1024'][sy], 10, MUTE));
      var inj = svgEl('circle', { cx: 95 + sy * 100, cy: 195, r: '3', fill: WARN, opacity: '0.2' });
      inj.appendChild(anim('opacity', '0.2;0.2;1;0.2', '8s', { keyTimes: '0;' + (0.55 + sy * 0.08).toFixed(2) + ';' + (0.6 + sy * 0.08).toFixed(2) + ';1', keySplines: '0 0 1 1;.3 0 .2 1;0 0 1 1' }));
      svg.appendChild(inj);
    }
    svg.appendChild(txt(W / 2, 245, '在每个分辨率层通过 AdaIN 注入 w', 10, WARN));
    frame(host, 'StyleGAN 映射（Mapping）', '先解耦，再注入', svg,
      '普通生成器直接将噪声向量 z 输入网络，各种变化因素因而纠缠在一起。StyleGAN 先通过 8 层多层感知机（MLP）将 z 映射到中间空间 W，使坐标轴对应姿态、光照等有意义的因素，再通过自适应实例归一化（Adaptive Instance Normalization，AdaIN）在各个分辨率层注入 w。先进行解耦（Disentanglement），才使风格混合（Style Mixing）与编辑成为可能。');
  }

  // ── gx-hybrid-retrieval: 稀疏（Sparse）与稠密（Dense）列表通过 RRF 融合，再重排（Rerank） ──
  function hybridRetrieval(host) {
    var W = 520, H = 250, svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    function col(x, title, items, color) {
      svg.appendChild(txt(x + 30, 38, title, 11, color));
      items.forEach(function (lab, i) {
        svg.appendChild(svgEl('rect', { x: x, y: 50 + i * 26, width: 60, height: 20, fill: color, opacity: (0.5 - i * 0.08).toFixed(2), stroke: SOFT, 'stroke-width': '0.6' }));
        svg.appendChild(txt(x + 30, 64 + i * 26, lab, 9, INK));
      });
    }
    col(30, 'BM25（稀疏）', ['D7', 'D2', 'D9', 'D4'], BP);
    col(130, '稠密检索', ['D2', 'D5', 'D7', 'D1'], MUTE);
    // RRF 融合列（居中）淡入
    var fg = svgEl('g', { opacity: '0' });
    fg.appendChild(anim('opacity', '0;0;1;1', '8s', { keyTimes: '0;0.35;0.5;1', keySplines: '0 0 1 1;.3 0 .2 1;0 0 1 1' }));
    fg.appendChild(txt(290, 38, 'RRF 融合', 11, WARN));
    ['D2', 'D7', 'D5', 'D9'].forEach(function (lab, i) {
      fg.appendChild(svgEl('rect', { x: 260, y: 50 + i * 26, width: 60, height: 20, fill: WARN, opacity: (0.5 - i * 0.08).toFixed(2), stroke: SOFT, 'stroke-width': '0.6' }));
      fg.appendChild(txt(290, 64 + i * 26, lab, 9, INK));
    });
    svg.appendChild(fg);
    // 从两个列表指向融合列的合并箭头
    [70, 170].forEach(function (sx) {
      var ar = svgEl('line', { x1: sx + 20, y1: 100, x2: 255, y2: 90, stroke: SOFT, 'stroke-width': '1' });
      ar.appendChild(anim('opacity', '0;0;1;1', '8s', { keyTimes: '0;0.3;0.45;1' }));
      svg.appendChild(ar);
    });
    // 交叉编码器（Cross-encoder）重排列最后淡入，重排后的首条结果高亮
    var rg = svgEl('g', { opacity: '0' });
    rg.appendChild(anim('opacity', '0;0;0;1;1', '8s', { keyTimes: '0;0.55;0.65;0.78;1', keySplines: '0 0 1 1;0 0 1 1;.3 0 .2 1;0 0 1 1' }));
    rg.appendChild(txt(430, 38, '重排前 5 项', 11, BP));
    ['D5', 'D2', 'D7'].forEach(function (lab, i) {
      rg.appendChild(svgEl('rect', { x: 400, y: 50 + i * 26, width: 60, height: 20, fill: i === 0 ? BP : SOFT, opacity: i === 0 ? '0.7' : '0.3', stroke: SOFT, 'stroke-width': '0.6' }));
      rg.appendChild(txt(430, 64 + i * 26, lab, 9, i === 0 ? 'var(--bg,#fff)' : INK));
    });
    svg.appendChild(rg);
    var ar2 = svgEl('line', { x1: 322, y1: 90, x2: 395, y2: 75, stroke: SOFT, 'stroke-width': '1' });
    ar2.appendChild(anim('opacity', '0;0;0;1', '8s', { keyTimes: '0;0.55;0.65;1' }));
    svg.appendChild(ar2);
    svg.appendChild(txt(W / 2, 232, '每一层弥补前一层的不足', 11, MUTE));
    frame(host, '混合检索（Hybrid Retrieval）', '稀疏检索 + 稠密检索 + 重排', svg,
      '生产检索由多个环节串联而成。稀疏检索（Sparse Retrieval）的 BM25 擅长精确关键词匹配，稠密向量检索（Dense Retrieval）捕捉同义改写；倒数排名融合（Reciprocal Rank Fusion，RRF）仅依据排名位置合并两个列表，因此不受两种分数尺度不兼容的影响。交叉编码器（Cross-encoder）再将查询与文档一起读取，对保留项重排（Reranking）。最终排名第一的结果，可能与两个原始列表都不同。');
  }

  // ── gx-matryoshka: 截断嵌入维度（Embedding dimensions），向量缩短 ──
  function matryoshka(host) {
    var W = 520, H = 230, svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var x0 = 40, y0 = 70, full = 440, h = 34, dims = 64;
    // 全宽单元向量；截断线向左扫动，线外的单元变暗
    svg.appendChild(txt(W / 2, 40, '一个套娃向量（Matryoshka Vector），截取更短的前缀', 11, MUTE));
    var i, cw = full / dims;
    for (i = 0; i < dims; i++) {
      var cell = svgEl('rect', { x: (x0 + i * cw).toFixed(1), y: y0, width: (cw - 0.6).toFixed(1), height: h, fill: BP });
      // 各单元的“保留”比例：维度从完整的 (1.0) 扫至 1/8 (0.125)，再返回
      var keep = (i + 1) / dims; // 包含此单元所需的向量比例
      // 在 t 属于 [0,0.4] 时截断位置从 1 -> .125，随后保持，再在 [0.6,1] 时返回；
      // 截断线经过时各单元变暗，返回时重新点亮
      var lo = '0.1', hiOp = '0.85';
      if (keep <= 0.125) {
        cell.setAttribute('opacity', hiOp);
      } else {
        var fk = (keep - 0.125) / 0.875;
        var tDim = 0.4 * (1 - fk);
        var tRise = Math.min(0.6 + 0.4 * fk, 0.96);
        var op = hiOp + ';' + hiOp + ';' + lo + ';' + lo + ';' + hiOp + ';' + hiOp;
        var kt = '0;' + tDim.toFixed(3) + ';' + (tDim + 0.03).toFixed(3) + ';' + tRise.toFixed(3) + ';' + (tRise + 0.03).toFixed(3) + ';1';
        cell.appendChild(anim('opacity', op, '7s', { keyTimes: kt }));
      }
      svg.appendChild(cell);
    }
    svg.appendChild(svgEl('rect', { x: x0, y: y0, width: full, height: h, fill: 'none', stroke: SOFT, 'stroke-width': '1' }));
    // 扫动的截断线
    var cut = svgEl('line', { x1: x0 + full, y1: y0 - 8, x2: x0 + full, y2: y0 + h + 8, stroke: WARN, 'stroke-width': '2' });
    cut.appendChild(anim('x1', (x0 + full) + ';' + (x0 + full / 8) + ';' + (x0 + full / 8) + ';' + (x0 + full), '7s', { keyTimes: '0;0.4;0.6;1', keySplines: '.4 0 .2 1;0 0 1 1;.4 0 .2 1' }));
    cut.appendChild(anim('x2', (x0 + full) + ';' + (x0 + full / 8) + ';' + (x0 + full / 8) + ';' + (x0 + full), '7s', { keyTimes: '0;0.4;0.6;1', keySplines: '.4 0 .2 1;0 0 1 1;.4 0 .2 1' }));
    svg.appendChild(cut);
    var lbl = txt(x0 + full + 4, y0 + h + 28, '3072 维', 11, WARN, 'middle');
    lbl.appendChild(anim('x', (x0 + full) + ';' + (x0 + full / 8) + ';' + (x0 + full / 8) + ';' + (x0 + full), '7s', { keyTimes: '0;0.4;0.6;1', keySplines: '.4 0 .2 1;0 0 1 1;.4 0 .2 1' }));
    svg.appendChild(lbl);
    svg.appendChild(txt(x0, y0 + h + 56, '保留前缀', 11, MUTE, 'start'));
    svg.appendChild(txt(W / 2, 200, '存储量随保留维数变化，质量逐渐下降', 11, MUTE));
    frame(host, '套娃嵌入截断（Matryoshka Truncation）', '减少维度', svg,
      '经过套娃表示学习（Matryoshka Representation Learning）训练的嵌入，会把最重要的信息放在最前面的维度。只保留向量前缀，将 3072 个浮点数缩减到几百个，仍能保持良好的检索效果。截断（Truncation）可以让索引存储量缩小数倍，而质量逐步降低、不至于骤然崩塌，因此可以按成本目标调整维度预算。');
  }

  // ── gx-entity-linking: 实体提及（Mention）→ 候选知识库（KB）条目 → 上下文消歧（Disambiguation）
  function entityLinking(host) {
    var W = 520, H = 250, svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    svg.appendChild(txt(70, 36, '提及（Mention）', 11, MUTE));
    svg.appendChild(svgEl('rect', { x: 30, y: 48, width: 90, height: 40, fill: BP, opacity: '0.12', stroke: SOFT, 'stroke-width': '1' }));
    svg.appendChild(txt(75, 73, '"Jordan"', 12, INK));
    svg.appendChild(txt(90, 120, '上下文：突破紧逼防守', 9, MUTE));
    var cands = ['Q41421  M. Jordan (NBA)', 'Q44437  M.B. Jordan（演员）', 'Q810  Jordan（国家）', 'Q3308285  M.I. Jordan (ML)'];
    var cy = [40, 90, 140, 190], cx = 250, correct = 0;
    cands.forEach(function (lab, i) {
      // 候选生成（Candidate generation）：全部出现；随后消歧保留 #0，其余变暗
      var box = svgEl('rect', { x: cx, y: cy[i], width: 230, height: 34, fill: BP, opacity: '0.1', stroke: SOFT, 'stroke-width': '1' });
      var t0 = 0.2 + i * 0.06;
      box.appendChild(anim('opacity', '0;0;0.18;0.18;' + (i === correct ? '0.7' : '0.06') + ';' + (i === correct ? '0.7' : '0.06'),
        '8s', { keyTimes: '0;' + t0.toFixed(2) + ';' + (t0 + 0.05).toFixed(2) + ';0.6;0.72;1', keySplines: '0 0 1 1;.3 0 .2 1;0 0 1 1;.3 0 .2 1;0 0 1 1' }));
      svg.appendChild(box);
      var t = txt(cx + 12, cy[i] + 22, lab, 10, INK, 'start');
      svg.appendChild(t);
      // 从实体提及到候选项的边
      var e = svgEl('line', { x1: 122, y1: 68, x2: cx, y2: cy[i] + 17, stroke: SOFT, 'stroke-width': '1', opacity: '0' });
      e.appendChild(anim('opacity', '0;0;0.6;0.6', '8s', { keyTimes: '0;' + t0.toFixed(2) + ';' + (t0 + 0.05).toFixed(2) + ';1' }));
      svg.appendChild(e);
    });
    // 胜出项上的勾号
    var ok = svgEl('circle', { cx: cx + 245, cy: cy[correct] + 17, r: '7', fill: BP, opacity: '0' });
    ok.appendChild(anim('opacity', '0;0;0;1;1', '8s', { keyTimes: '0;0.6;0.7;0.78;1' }));
    svg.appendChild(ok);
    var okt = txt(cx + 245, cy[correct] + 21, '✓', 11, 'var(--bg,#fff)', 'middle');
    okt.appendChild(anim('opacity', '0;0;0;1;1', '8s', { keyTimes: '0;0.6;0.7;0.78;1' }));
    svg.appendChild(okt);
    svg.appendChild(txt(135, 235, '先生成候选，再依据上下文消歧', 11, MUTE, 'start'));
    frame(host, '实体链接（Entity Linking）', '先召回候选，再选定实体', svg,
      '实体链接（Entity Linking）分为两个阶段。候选生成（Candidate Generation）召回 "Jordan" 这类表述可能指向的所有知识库（Knowledge Base）条目；消歧（Disambiguation）再结合周围上下文为候选打分，只保留一个。图中的体育语境将这一提及解析为篮球运动员条目，演员、国家和机器学习教授等候选逐渐淡出。');
  }

  // ── gx-niah-decay: 大海捞针（Needle）准确率随深度和上下文长度增加而下降 ──
  function niahDecay(host) {
    var W = 520, H = 240, svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var hx = 40, hy = 50, hw = 300, hh = 150;
    svg.appendChild(txt(hx + hw / 2, 36, '“草堆”：上下文从左向右增长', 11, MUTE));
    // 大海捞针中的背景文本主体（Haystack body）
    svg.appendChild(svgEl('rect', { x: hx, y: hy, width: hw, height: hh, fill: BP, opacity: '0.06', stroke: SOFT, 'stroke-width': '1' }));
    // 淡色文本行
    var ln;
    for (ln = 0; ln < 9; ln++) svg.appendChild(svgEl('line', { x1: hx + 10, y1: hy + 14 + ln * 16, x2: hx + hw - 10, y2: hy + 14 + ln * 16, stroke: MUTE, 'stroke-width': '1', opacity: '0.22' }));
    // 针（Needle）：标记随时间深入，向右下方移动
    var needle = svgEl('rect', { x: hx + 30, y: hy + 20, width: 46, height: 14, fill: WARN });
    needle.appendChild(anim('x', (hx + 20) + ';' + (hx + hw - 70) + ';' + (hx + 20), '10s', { keyTimes: '0;0.5;1', keySplines: '.4 0 .2 1;.4 0 .2 1' }));
    needle.appendChild(anim('y', (hy + 18) + ';' + (hy + hh - 34) + ';' + (hy + 18), '10s', { keyTimes: '0;0.5;1', keySplines: '.4 0 .2 1;.4 0 .2 1' }));
    svg.appendChild(needle);
    svg.appendChild(txt(hx + 53, hy + 30, '目标事实', 8, 'var(--bg,#fff)'));
    // 右侧准确率量表：针越深，条形越矮
    var gx = 400, gtop = 50, gh = 150, gw = 50;
    svg.appendChild(svgEl('rect', { x: gx, y: gtop, width: gw, height: gh, fill: 'none', stroke: SOFT, 'stroke-width': '1' }));
    var fill = svgEl('rect', { x: gx, y: gtop, width: gw, height: gh, fill: BP, opacity: '0.7' });
    // y 与 height 同步动画：高准确率（满高）-> 低准确率（较短）-> 高准确率
    fill.appendChild(anim('y', gtop + ';' + (gtop + gh * 0.72) + ';' + gtop, '10s', { keyTimes: '0;0.5;1', keySplines: '.4 0 .2 1;.4 0 .2 1' }));
    fill.appendChild(anim('height', gh + ';' + (gh * 0.28) + ';' + gh, '10s', { keyTimes: '0;0.5;1', keySplines: '.4 0 .2 1;.4 0 .2 1' }));
    fill.appendChild(svgEl('animate', { attributeName: 'fill', values: BP + ';' + WARN + ';' + BP, keyTimes: '0;0.5;1', dur: '10s', repeatCount: 'indefinite' }));
    svg.appendChild(fill);
    svg.appendChild(txt(gx + gw / 2, gtop + gh + 18, '召回准确率', 10, MUTE));
    svg.appendChild(txt(hx + hw / 2, hy + hh + 24, '标称上下文长度未必全部可用', 11, MUTE));
    frame(host, '大海捞针测试（Needle in a Haystack）', '插入深度与召回效果', svg,
      '大海捞针测试（Needle in a Haystack，NIAH）在长上下文的指定深度插入一个事实，再要求模型检索它。上下文较短、事实位置较浅时，召回接近完美；当上下文变长、事实藏得更深时，准确率指示条下降。标称上下文窗口通常不等于实际可用范围，因此需要同时遍历插入深度与上下文长度进行测试。');
  }

  LF.register({
    'gx-var-next-scale': varNextScale,
    'gx-fid-distributions': fidDistributions,
    'gx-patchgan': patchgan,
    'gx-stylegan-mapping': styleganMapping,
    'gx-hybrid-retrieval': hybridRetrieval,
    'gx-matryoshka': matryoshka,
    'gx-entity-linking': entityLinking,
    'gx-niah-decay': niahDecay
  });
})();
