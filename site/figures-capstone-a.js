(function () {
  'use strict';
  var LF = window.LF;
  if (!LF) { return; }

  var el = LF.el, svgEl = LF.svgEl;
  var INK = 'var(--ink,#1a1a1a)', SOFT = 'var(--ink-soft,#555)', MUTE = 'var(--ink-mute,#777)';
  var BP = 'var(--blueprint,#3553ff)', BG = 'var(--bg,#fafaf5)', SURF = 'var(--bg-surface,#eee)';
  var RULE = 'var(--rule-soft,#ddd)', WARN = 'var(--warn,#b8870f)';

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

  // BPE 分词器（Tokenizer）：反复将相邻字节对合并为一个符号。
  function bpeMerge(host) {
    var svg = svgEl('svg', { viewBox: '0 0 520 230' });
    var cells = ['l', 'o', 'w', 'e', 's', 't'];
    var bw = 46, gap = 8, x0 = 90, y = 60;
    svg.appendChild(txt(60, y + 18, '字节', MUTE, 10, 'middle'));
    var i;
    for (i = 0; i < cells.length; i++) {
      var x = x0 + i * (bw + gap);
      svg.appendChild(svgEl('rect', { x: x, y: y, width: bw, height: 36, rx: 4, fill: BG, stroke: RULE, 'stroke-width': '1.5' }));
      svg.appendChild(txt(x + bw / 2, y + 24, cells[i], INK, 15));
    }
    // 高亮框扫过相邻字节对，示意查找出现频率最高的字节对。
    var hx0 = x0 - 3, pairW = bw * 2 + gap + 6;
    var slots = [];
    for (i = 0; i < cells.length - 1; i++) slots.push((hx0 + i * (bw + gap)) + ',' + (y - 3));
    var hl = svgEl('rect', { x: hx0, y: y - 3, width: pairW, height: 42, rx: 5, fill: 'none', stroke: BP, 'stroke-width': '2.5', opacity: '0.9' });
    hl.appendChild(animT('translate', '0 0;' + ((cells.length - 2) * (bw + gap)) + ' 0;0 0', '5s'));
    svg.appendChild(hl);
    // 下方逐渐显示合并后的符号："es" + "t" -> "est"。
    var my = 150;
    svg.appendChild(txt(60, my + 22, '合并', MUTE, 10, 'middle'));
    var down = svgEl('path', { d: 'M260 104 L260 142', stroke: BP, 'stroke-width': '1.6', fill: 'none', 'marker-end': '', 'stroke-dasharray': '5 4' });
    down.appendChild(anim('stroke-dashoffset', '18;0', '1.2s'));
    svg.appendChild(down);
    svg.appendChild(svgEl('polygon', { points: '256,142 264,142 260,150', fill: BP }));
    var merged = svgEl('g', {});
    merged.appendChild(svgEl('rect', { x: 224, y: my, width: 72, height: 38, rx: 5, fill: BP, opacity: '0.14', stroke: BP, 'stroke-width': '2' }));
    merged.appendChild(txt(260, my + 25, 'est', BP, 16));
    merged.appendChild(anim('opacity', '0.15;1;1;0.15', '5s'));
    svg.appendChild(merged);
    svg.appendChild(txt(420, my + 6, '→ 新 ID', MUTE, 10, 'middle'));
    svg.appendChild(txt(420, my + 24, '词表 + 1', SOFT, 12, 'middle'));
    card(host, '字节对编码合并循环（BPE Merge Loop）', '扫描 · 合并 · 重复',
      svg,
      '字节对编码（Byte-Pair Encoding，BPE）从原始字节出发，反复找出频率最高的相邻字节对，将其合并为一个新符号，并在词表（Vocabulary）中增加一个 ID。扫描框依次扫过每一对相邻字节，最终选中的一对合并为一个词元（Token）。');
  }

  // 滑动窗口（Sliding Window）：固定窗口沿 ID 流移动，每步取 T+1 个 ID。
  function slidingWindow(host) {
    var svg = svgEl('svg', { viewBox: '0 0 520 220' });
    var n = 16, bw = 26, x0 = 26, y = 70;
    var ids = ['12', '7', '93', '4', '58', '2', '31', '9', '77', '6', '40', '15', '8', '61', '3', '22'];
    var i;
    svg.appendChild(txt(20, 40, '词元 ID 流', MUTE, 10, 'start'));
    for (i = 0; i < n; i++) {
      var x = x0 + i * (bw + 4);
      svg.appendChild(svgEl('rect', { x: x, y: y, width: bw, height: 30, rx: 3, fill: BG, stroke: RULE, 'stroke-width': '1' }));
      svg.appendChild(txt(x + bw / 2, y + 20, ids[i], SOFT, 11));
    }
    var step = bw + 4, win = 5;
    var maxShift = (n - win - 1) * step;
    // 输入窗口包含 T 个 ID。
    var inW = win * step - 4;
    var wg = svgEl('g', {});
    wg.appendChild(svgEl('rect', { x: x0 - 3, y: y - 6, width: inW + 6, height: 42, rx: 5, fill: BP, opacity: '0.12', stroke: BP, 'stroke-width': '2' }));
    wg.appendChild(txt(x0 - 3 + (inW + 6) / 2, y - 12, '输入 (B, T)', BP, 10, 'middle'));
    // 目标窗口相对输入错开一个位置。
    wg.appendChild(svgEl('rect', { x: x0 - 3 + step, y: y + 40, width: inW + 6, height: 24, rx: 5, fill: WARN, opacity: '0.14', stroke: WARN, 'stroke-width': '1.6' }));
    wg.appendChild(txt(x0 - 3 + step + (inW + 6) / 2, y + 80, '目标：输入错开一位', WARN, 10, 'middle'));
    wg.appendChild(animT('translate', '0 0;' + maxShift + ' 0', '6s', { calcMode: 'discrete' }));
    svg.appendChild(wg);
    card(host, '滑动窗口（Sliding Window）', '窗口移动 · 步幅',
      svg,
      '分词器（Tokenizer）将语料库（Corpus）展平成一条长 ID 流。包含 T 个 ID 的定长窗口按步幅（Stride）移动；目标序列相当于将对应序列左移一位，用于下一词元预测（Next-token Prediction）。步幅越小，窗口重叠越多，生成的样本数也越大。');
  }

  // 多头注意力（Multi-head Attention）：一次投影后分成 H 个并行注意力头。
  function multiHead(host) {
    var svg = svgEl('svg', { viewBox: '0 0 520 240' });
    var inX = 40, inY = 100;
    svg.appendChild(svgEl('rect', { x: inX, y: inY, width: 60, height: 40, rx: 5, fill: BG, stroke: BP, 'stroke-width': '2' }));
    svg.appendChild(txt(inX + 30, inY + 18, '(B,T,D)', INK, 10));
    svg.appendChild(txt(inX + 30, inY + 32, '输入', MUTE, 9));
    // 线性投影模块。
    var pjX = 150;
    svg.appendChild(svgEl('rect', { x: pjX, y: inY - 6, width: 64, height: 52, rx: 5, fill: BP, opacity: '0.12', stroke: BP, 'stroke-width': '2' }));
    svg.appendChild(txt(pjX + 32, inY + 14, '线性层', BP, 11));
    svg.appendChild(txt(pjX + 32, inY + 30, 'D→3D', SOFT, 9));
    var flow = svgEl('line', { x1: inX + 60, y1: inY + 20, x2: pjX, y2: inY + 20, stroke: BP, 'stroke-width': '2', 'stroke-dasharray': '6 5' });
    flow.appendChild(anim('stroke-dashoffset', '22;0', '1s'));
    svg.appendChild(flow);
    // 展开 H 个注意力头。
    var heads = 4, hX = 300, hY = [30, 90, 150, 210];
    var j;
    for (j = 0; j < heads; j++) {
      var hy = hY[j];
      var path = svgEl('path', { d: 'M' + (pjX + 64) + ' ' + (inY + 20) + ' C ' + (hX - 40) + ' ' + (inY + 20) + ', ' + (hX - 30) + ' ' + hy + ', ' + hX + ' ' + hy, fill: 'none', stroke: BP, 'stroke-width': '1.4', opacity: '0.55', 'stroke-dasharray': '5 4' });
      path.appendChild(anim('stroke-dashoffset', '18;0', '1.2s', { begin: (j * 0.18) + 's' }));
      svg.appendChild(path);
      var hg = svgEl('g', {});
      hg.appendChild(svgEl('rect', { x: hX, y: hy - 14, width: 86, height: 28, rx: 4, fill: BG, stroke: BP, 'stroke-width': '1.4' }));
      hg.appendChild(txt(hX + 43, hy + 4, '注意力头 ' + (j + 1), SOFT, 10));
      hg.appendChild(anim('opacity', '0.4;1;0.4', '2.6s', { begin: (j * 0.4) + 's' }));
      svg.appendChild(hg);
      // 汇合后拼接各头输出。
      var c2 = svgEl('path', { d: 'M' + (hX + 86) + ' ' + hy + ' C ' + (470) + ' ' + hy + ', ' + 466 + ' ' + (inY + 20) + ', ' + 486 + ' ' + (inY + 20), fill: 'none', stroke: MUTE, 'stroke-width': '1.2', opacity: '0.5' });
      svg.appendChild(c2);
    }
    svg.appendChild(svgEl('rect', { x: 486, y: inY, width: 30, height: 40, rx: 5, fill: BP, opacity: '0.12', stroke: BP, 'stroke-width': '1.6' }));
    svg.appendChild(txt(501, inY + 24, '∥', BP, 16));
    svg.appendChild(txt(348, 12, '缩放点积 · 因果掩码 · softmax', MUTE, 9, 'middle'));
    card(host, '多头注意力（Multi-head Attention）', '一次投影 · H 个头',
      svg,
      '一个线性层（Linear Layer）将输入投影为 Q、K、V，再变形为 H 个维度为 D/H 的并行注意力头。每个头独立执行带因果掩码（Causal Mask）的缩放点积注意力（Scaled Dot-product Attention），输出再拼接回 D 维。训练过程中，各注意力头逐渐形成不同的分工。');
  }

  // 训练循环（Training Loop）：前向、反向、参数更新，以及下降的损失曲线。
  function trainingLoop(host) {
    var svg = svgEl('svg', { viewBox: '0 0 520 240' });
    // 将各训练阶段排成环形流水线。
    var cx = 150, cy = 110, r = 78;
    var stages = ['批次', '前向传播', '损失', '反向传播', 'AdamW'];
    var ring = svgEl('circle', { cx: cx, cy: cy, r: r, fill: 'none', stroke: RULE, 'stroke-width': '1.5', 'stroke-dasharray': '4 5' });
    svg.appendChild(ring);
    var k;
    for (k = 0; k < stages.length; k++) {
      var ang = -Math.PI / 2 + k * 2 * Math.PI / stages.length;
      var sx = cx + r * Math.cos(ang), sy = cy + r * Math.sin(ang);
      var g = svgEl('g', {});
      g.appendChild(svgEl('circle', { cx: sx, cy: sy, r: 7, fill: BP }));
      g.appendChild(txt(sx, sy - 12, stages[k], SOFT, 9));
      g.appendChild(anim('opacity', '0.35;1;0.35', '2.5s', { begin: (k * 0.5) + 's' }));
      svg.appendChild(g);
    }
    // 圆点沿环形路径移动。
    var dot = svgEl('circle', { r: 5, fill: WARN });
    dot.appendChild(svgEl('animateMotion', { dur: '2.5s', repeatCount: 'indefinite', path: 'M' + cx + ' ' + (cy - r) + ' A ' + r + ' ' + r + ' 0 1 1 ' + (cx - 0.01) + ' ' + (cy - r) + ' Z' }));
    svg.appendChild(dot);
    svg.appendChild(txt(cx, cy + 4, '每个', MUTE, 9));
    svg.appendChild(txt(cx, cy + 16, '训练步', MUTE, 9));
    // 右侧显示逐渐下降的损失曲线。
    var bx = 280, by = 40, bw = 210, bh = 150;
    svg.appendChild(svgEl('line', { x1: bx, y1: by, x2: bx, y2: by + bh, stroke: RULE, 'stroke-width': '1' }));
    svg.appendChild(svgEl('line', { x1: bx, y1: by + bh, x2: bx + bw, y2: by + bh, stroke: RULE, 'stroke-width': '1' }));
    svg.appendChild(txt(bx - 6, by + 6, '损失', MUTE, 9, 'end'));
    svg.appendChild(txt(bx + bw, by + bh + 14, '训练步数', MUTE, 9, 'end'));
    var d = 'M' + bx + ' ' + (by + 8), i, pts = 60;
    for (i = 1; i <= pts; i++) {
      var t = i / pts;
      var lx = bx + t * bw;
      var ly = by + 8 + (bh - 20) * (1 - Math.exp(-3.2 * t)) - 4 * Math.sin(t * 22) * Math.exp(-2 * t);
      d += ' L' + lx.toFixed(1) + ' ' + ly.toFixed(1);
    }
    var curve = svgEl('path', { d: d, fill: 'none', stroke: BP, 'stroke-width': '2', 'stroke-dasharray': '600', 'stroke-dashoffset': '600' });
    curve.appendChild(anim('stroke-dashoffset', '600;0', '4s'));
    svg.appendChild(curve);
    card(host, '训练循环（Training Loop）', '前向传播 · 反向传播 · 更新',
      svg,
      '每个训练步先取一个批次（Batch），通过前向传播（Forward Pass）得到未归一化分数（Logits），计算交叉熵损失（Cross-entropy Loss），执行反向传播（Backpropagation），再按学习率调度（Learning Rate Schedule）进行一次 AdamW 参数更新。重复数千次后，损失曲线下降并趋于平缓。定期评估和抽样检查可以发现单个损失数值未能暴露的发散问题。');
  }

  // 更换分类头（Classifier Head）：冻结主干，移除旧输出头，接入二分类头。
  function headSwap(host) {
    var svg = svgEl('svg', { viewBox: '0 0 520 230' });
    var bx = 60, by = 40, bw = 150, bh = 150;
    // 冻结的模型主干。
    svg.appendChild(svgEl('rect', { x: bx, y: by, width: bw, height: bh, rx: 6, fill: SURF, stroke: MUTE, 'stroke-width': '1.6', 'stroke-dasharray': '5 4' }));
    svg.appendChild(txt(bx + bw / 2, by + 22, 'Transformer 主干', SOFT, 11));
    svg.appendChild(txt(bx + bw / 2, by + 38, '（冻结）', MUTE, 10));
    var ly;
    for (ly = 0; ly < 4; ly++) {
      var yy = by + 58 + ly * 24;
      var lr = svgEl('rect', { x: bx + 22, y: yy, width: bw - 44, height: 16, rx: 3, fill: BG, stroke: MUTE, 'stroke-width': '1' });
      svg.appendChild(lr);
      // 用小型层标签表示冻结的模块。
      svg.appendChild(txt(bx + bw / 2, yy + 12, '模块 ' + (ly + 1), MUTE, 8));
    }
    // 从主干引出池化表示（Pooled Representation）。
    var arr = svgEl('line', { x1: bx + bw, y1: by + bh / 2, x2: bx + bw + 50, y2: by + bh / 2, stroke: BP, 'stroke-width': '2', 'stroke-dasharray': '6 5' });
    arr.appendChild(anim('stroke-dashoffset', '22;0', '1s'));
    svg.appendChild(arr);
    svg.appendChild(txt(bx + bw + 25, by + bh / 2 - 8, '池化', MUTE, 9));
    // 上方的旧输出头逐渐淡出。
    var oldH = svgEl('g', {});
    oldH.appendChild(svgEl('rect', { x: 290, y: 40, width: 130, height: 44, rx: 6, fill: 'none', stroke: MUTE, 'stroke-width': '1.6', 'stroke-dasharray': '4 4' }));
    oldH.appendChild(txt(355, 60, '旧语言模型头', MUTE, 11));
    oldH.appendChild(txt(355, 76, '投影到词表', MUTE, 9));
    oldH.appendChild(animT('translate', '0 0;36 -18', '3s', { calcMode: 'spline', keySplines: '0.4 0 0.6 1', keyTimes: '0;1', additive: 'sum' }));
    oldH.appendChild(anim('opacity', '1;0.15', '3s'));
    svg.appendChild(oldH);
    // 下方蓝色的新分类头逐渐显现。
    var newH = svgEl('g', {});
    newH.appendChild(svgEl('rect', { x: 290, y: 130, width: 130, height: 50, rx: 6, fill: BP, opacity: '0.14', stroke: BP, 'stroke-width': '2.2' }));
    newH.appendChild(txt(355, 152, '新分类头', BP, 10));
    newH.appendChild(txt(355, 168, '线性层 → 2 个分数', SOFT, 9));
    newH.appendChild(anim('opacity', '0.1;1', '1.4s', { begin: '0.8s', fill: 'freeze' }));
    svg.appendChild(newH);
    svg.appendChild(svgEl('line', { x1: 220, y1: by + bh / 2, x2: 290, y2: 155, stroke: BP, 'stroke-width': '1.6' }));
    card(host, '更换分类头（Classifier Head Swap）', '冻结主干 · 替换输出头',
      svg,
      '这里将预训练模型（Pretrained Model）分为冻结的主干和输出头。用于分类时，保留训练成本高的主干，移除词表输出头，接上一个小型线性层，输出两个未归一化分数（Logits）。只训练分类头可以节省时间；发生领域偏移（Domain Drift）时，也可以解冻主干以提高准确率。');
  }

  // DPO：以冻结的参考策略为基准，提高优选回答的对数概率，降低劣选回答的对数概率。
  function dpoPreference(host) {
    var svg = svgEl('svg', { viewBox: '0 0 520 230' });
    var bx = 70, by = 30, bw = 380, bh = 150;
    svg.appendChild(svgEl('line', { x1: bx, y1: by, x2: bx, y2: by + bh, stroke: RULE, 'stroke-width': '1' }));
    svg.appendChild(svgEl('line', { x1: bx, y1: by + bh, x2: bx + bw, y2: by + bh, stroke: RULE, 'stroke-width': '1' }));
    svg.appendChild(txt(bx - 8, by + 8, 'log p', MUTE, 9, 'end'));
    svg.appendChild(txt(bx + bw, by + bh + 14, '训练步数', MUTE, 9, 'end'));
    // 冻结参考策略的水平虚线。
    var refY = by + bh / 2;
    svg.appendChild(svgEl('line', { x1: bx, y1: refY, x2: bx + bw, y2: refY, stroke: MUTE, 'stroke-width': '1.4', 'stroke-dasharray': '6 4' }));
    svg.appendChild(txt(bx + bw - 4, refY - 6, '冻结参考策略 π_ref', MUTE, 9, 'end'));
    // 优选回答的曲线上升。
    var i, pts = 50, dc = 'M' + bx + ' ' + refY, dr = 'M' + bx + ' ' + refY;
    for (i = 1; i <= pts; i++) {
      var t = i / pts, lx = bx + t * bw;
      var up = refY - (bh / 2 - 14) * (1 - Math.exp(-2.8 * t));
      var dn = refY + (bh / 2 - 14) * (1 - Math.exp(-2.4 * t));
      dc += ' L' + lx.toFixed(1) + ' ' + up.toFixed(1);
      dr += ' L' + lx.toFixed(1) + ' ' + dn.toFixed(1);
    }
    var cv = svgEl('path', { d: dc, fill: 'none', stroke: BP, 'stroke-width': '2.4', 'stroke-dasharray': '480', 'stroke-dashoffset': '480' });
    cv.appendChild(anim('stroke-dashoffset', '480;0', '3.6s'));
    svg.appendChild(cv);
    var rv = svgEl('path', { d: dr, fill: 'none', stroke: WARN, 'stroke-width': '2.4', 'stroke-dasharray': '480', 'stroke-dashoffset': '480' });
    rv.appendChild(anim('stroke-dashoffset', '480;0', '3.6s'));
    svg.appendChild(rv);
    svg.appendChild(txt(bx + bw - 4, by + 18, '优选 y_w ↑', BP, 10, 'end'));
    svg.appendChild(txt(bx + bw - 4, by + bh - 8, '劣选 y_l ↓', WARN, 10, 'end'));
    // 标出供 sigmoid 损失使用的扩大后的概率差。
    var gap = svgEl('g', {});
    gap.appendChild(svgEl('line', { x1: bx + bw - 60, y1: refY - (bh / 2 - 16), x2: bx + bw - 60, y2: refY + (bh / 2 - 16), stroke: INK, 'stroke-width': '1', 'stroke-dasharray': '2 3' }));
    gap.appendChild(anim('opacity', '0;0;1', '3.6s', { fill: 'freeze' }));
    svg.appendChild(gap);
    card(host, '直接偏好优化（Direct Preference Optimization，DPO）', '优选概率上升 · 劣选概率下降',
      svg,
      'DPO 直接使用优选与劣选回答对（Chosen/Rejected Pairs）训练策略（Policy），无需单独的奖励模型（Reward Model）。损失通过 sigmoid 函数处理相对于冻结参考策略的对数概率差，使优选回答的概率上升、劣选回答的概率下降，同时以 KL 散度（Kullback–Leibler Divergence）约束策略偏离参考策略的程度。');
  }

  // 语料下载器：流式传输分片、断点续传、去重并生成清单（Manifest）。
  function corpusStream(host) {
    var svg = svgEl('svg', { viewBox: '0 0 520 230' });
    // 远程数据源。
    svg.appendChild(svgEl('rect', { x: 24, y: 90, width: 70, height: 44, rx: 22, fill: BG, stroke: BP, 'stroke-width': '1.8' }));
    svg.appendChild(txt(59, 110, '远程', SOFT, 10));
    svg.appendChild(txt(59, 124, '分片', SOFT, 10));
    // 字节沿管道流动。
    var pipeY = 112;
    svg.appendChild(svgEl('line', { x1: 94, y1: pipeY, x2: 250, y2: pipeY, stroke: RULE, 'stroke-width': '8' }));
    var path = 'M100 ' + pipeY + ' H244';
    var b;
    for (b = 0; b < 4; b++) {
      var dot = svgEl('circle', { r: 4, fill: BP });
      dot.appendChild(svgEl('animateMotion', { dur: '2.4s', repeatCount: 'indefinite', path: path, begin: (b * 0.6) + 's' }));
      svg.appendChild(dot);
    }
    // 闪烁的字节偏移标记示意网络中断后通过 Range 请求续传。
    var resume = svgEl('g', {});
    resume.appendChild(svgEl('line', { x1: 175, y1: pipeY - 22, x2: 175, y2: pipeY + 22, stroke: WARN, 'stroke-width': '2' }));
    resume.appendChild(txt(175, pipeY - 28, 'Range 续传', WARN, 8));
    resume.appendChild(anim('opacity', '1;0.15;1', '2.4s'));
    svg.appendChild(resume);
    // zstd 解压模块。
    svg.appendChild(svgEl('rect', { x: 250, y: 92, width: 60, height: 40, rx: 5, fill: BP, opacity: '0.12', stroke: BP, 'stroke-width': '1.8' }));
    svg.appendChild(txt(280, 110, 'zstd', BP, 10));
    svg.appendChild(txt(280, 124, '流式解压', SOFT, 8));
    // 文档落入局部敏感哈希（LSH）桶，丢弃近似重复项。
    var bx = 340, j;
    for (j = 0; j < 3; j++) {
      var bxj = bx + j * 56;
      svg.appendChild(svgEl('rect', { x: bxj, y: 150, width: 44, height: 34, rx: 4, fill: BG, stroke: RULE, 'stroke-width': '1.4' }));
      svg.appendChild(txt(bxj + 22, 196, 'LSH ' + (j + 1), MUTE, 8));
      var falling = svgEl('circle', { cx: bxj + 22, cy: 70, r: 4, fill: j === 1 ? WARN : BP });
      falling.appendChild(anim('cy', '70;167', '2.2s', { begin: (j * 0.5) + 's' }));
      falling.appendChild(anim('opacity', j === 1 ? '1;1;0.1' : '1;1;1', '2.2s', { begin: (j * 0.5) + 's' }));
      svg.appendChild(falling);
    }
    svg.appendChild(txt(bx + 56, 36, '丢弃重复文档', WARN, 9, 'middle'));
    // 通往清单的连接线。
    svg.appendChild(svgEl('line', { x1: 310, y1: 112, x2: 340, y2: 112, stroke: BP, 'stroke-width': '2' }));
    card(host, '语料下载器（Corpus Downloader）', '流式传输 · 断点续传 · 去重',
      svg,
      '分片（Shard）从远程数据源流式传入，经 Zstandard 解压，无需将整个文件缓存在内存中。连接中断后，利用已核验的字节偏移量，通过 HTTP Range 请求实现断点续传（Resumable Download）。每篇文档生成最小哈希（MinHash）签名，再按局部敏感哈希（Locality-sensitive Hashing，LSH）分桶，使近似重复文档落入同一桶，在写入清单（Manifest）前去重。');
  }

  // 余弦学习率预热：标记点沿预热斜坡进入余弦衰减阶段。
  function cosineWarmup(host) {
    var svg = svgEl('svg', { viewBox: '0 0 520 230' });
    var bx = 50, by = 30, bw = 430, bh = 150, base = by + bh;
    svg.appendChild(svgEl('line', { x1: bx, y1: by, x2: bx, y2: base, stroke: RULE, 'stroke-width': '1' }));
    svg.appendChild(svgEl('line', { x1: bx, y1: base, x2: bx + bw, y2: base, stroke: RULE, 'stroke-width': '1' }));
    svg.appendChild(txt(bx - 6, by + 6, 'lr', MUTE, 9, 'end'));
    svg.appendChild(txt(bx + bw, base + 14, '训练步', MUTE, 9, 'end'));
    var warmFrac = 0.18, peak = bh - 14, minY = bh * 0.06;
    function lrAt(t) {
      if (t < warmFrac) return peak * (t / warmFrac);
      var u = (t - warmFrac) / (1 - warmFrac);
      return minY + (peak - minY) * 0.5 * (1 + Math.cos(Math.PI * u));
    }
    function X(t) { return bx + t * bw; }
    function Y(v) { return base - v; }
    // 用底色标出预热区间。
    svg.appendChild(svgEl('rect', { x: bx, y: by, width: bw * warmFrac, height: bh, fill: WARN, opacity: '0.07' }));
    svg.appendChild(txt(bx + bw * warmFrac / 2, by + 14, '预热', WARN, 9, 'middle'));
    svg.appendChild(txt(bx + bw * (warmFrac + (1 - warmFrac) / 2), by + 14, '余弦衰减', BP, 9, 'middle'));
    var i, pts = 120, d = 'M' + X(0) + ' ' + Y(lrAt(0));
    for (i = 1; i <= pts; i++) { var t = i / pts; d += ' L' + X(t).toFixed(1) + ' ' + Y(lrAt(t)).toFixed(1); }
    var curve = svgEl('path', { d: d, fill: 'none', stroke: BP, 'stroke-width': '2.4', 'stroke-dasharray': '700', 'stroke-dashoffset': '700' });
    curve.appendChild(anim('stroke-dashoffset', '700;0', '5s', { repeatCount: '1', fill: 'freeze' }));
    svg.appendChild(curve);
    // 标记点沿学习率调度曲线移动。
    var sampleX = [], sampleY = [];
    for (i = 0; i <= 40; i++) { var tt = i / 40; sampleX.push(X(tt).toFixed(1)); sampleY.push(Y(lrAt(tt)).toFixed(1)); }
    var dot = svgEl('circle', { r: 6, fill: WARN });
    dot.appendChild(anim('cx', sampleX.join(';'), '5s'));
    dot.appendChild(anim('cy', sampleY.join(';'), '5s'));
    svg.appendChild(dot);
    // 标出峰值的辅助虚线。
    svg.appendChild(svgEl('line', { x1: bx, y1: Y(peak), x2: X(warmFrac), y2: Y(peak), stroke: RULE, 'stroke-width': '1', 'stroke-dasharray': '3 3' }));
    svg.appendChild(txt(bx + 4, Y(peak) - 4, 'lr_max', SOFT, 8, 'start'));
    card(host, '预热与余弦学习率调度（Cosine LR Warmup）', '线性升温 · 余弦衰减',
      svg,
      '学习率（Learning Rate）在预热（Warmup）阶段从零线性升至 lr_max，避免初始更新过大导致训练不稳定；随后沿余弦曲线的上半段衰减，逐渐接近 lr_min。标记点表示优化器（Optimizer）在每个训练步实际使用的学习率。');
  }

  LF.register({
    'cap-bpe-merge': bpeMerge,
    'cap-sliding-window': slidingWindow,
    'cap-multihead-attention': multiHead,
    'cap-training-loop': trainingLoop,
    'cap-classifier-head-swap': headSwap,
    'cap-dpo-preference': dpoPreference,
    'cap-corpus-downloader': corpusStream,
    'cap-cosine-warmup': cosineWarmup
  });
})();
