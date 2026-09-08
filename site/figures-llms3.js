/* figures-llms3.js：阶段 07（深入理解 Transformer（Transformers deep dive））
   与阶段 10（从零构建大语言模型（LLMs from scratch））的 SMIL 动画课程图表。在 lesson-figures.js 之后加载，
   通过 window.LF.register 注册。原生 ES5，无依赖，主题由
   CSS 变量控制。每张图都是自动播放的 SVG 动画（仅使用 SMIL，不使用 JS
   循环，不会挂起）。编写时仍使用相同的围栏块：
       ```figure
       bert-mlm
       ```  */
(function () {
  'use strict';
  var LF = window.LF;
  if (!LF) { return; }
  var el = LF.el, svgEl = LF.svgEl;

  var BP = 'var(--blueprint,#3553ff)';
  var INK = 'var(--ink,#1a1a1a)';
  var MUTE = 'var(--ink-mute,#999)';
  var SOFT = 'var(--rule-soft,#ddd)';
  var WARN = 'var(--warn,#b8870f)';

  function anim(attr, vals, dur, extra) {
    var a = { attributeName: attr, values: vals, dur: dur, repeatCount: 'indefinite' };
    if (extra) for (var k in extra) a[k] = extra[k];
    return svgEl('animate', a);
  }
  function card(host, label, sub, svg, cap) {
    host.appendChild(el('div', { class: 'lf' }, [
      el('div', { class: 'lf-head' }, [el('span', { class: 'lf-label' }, [label]), el('span', {}, [sub])]),
      el('div', { class: 'lf-body' }, [el('div', { class: 'lf-out' }, [svg])]),
      el('div', { class: 'lf-cap' }, [cap])
    ]));
  }

  // ── expert-routing: 每个词元路由到 E 个专家（Experts）中的 top-k 个，其余空闲 ──
  function expertRouting(host) {
    var W = 520, H = 240;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var toks = ['the', 'cat', 'sat', 'down'];
    var tx0 = 30, tw = 56, tg = 10, ty = 30;
    var E = 4, ex0 = 320, ew = 150, eh = 34, eg = 16, eyTop = 24;
    // 中间的路由器（Router）
    var routerX = 180;
    svg.appendChild(svgEl('rect', { x: routerX, y: 90, width: 70, height: 56, rx: 5, fill: 'none', stroke: BP, 'stroke-width': 1.6 }));
    svg.appendChild(svgEl('text', { x: routerX + 35, y: 122, 'text-anchor': 'middle', 'font-family': 'var(--font-mono,monospace)', 'font-size': 11, fill: BP }, [document.createTextNode('路由器')]));
    // 右侧的专家
    for (var e = 0; e < E; e++) {
      var ey = eyTop + e * (eh + eg);
      svg.appendChild(svgEl('rect', { x: ex0, y: ey, width: ew, height: eh, rx: 4, fill: SOFT, stroke: MUTE, 'stroke-width': 1 }));
      svg.appendChild(svgEl('text', { x: ex0 + 10, y: ey + 22, 'font-family': 'var(--font-mono,monospace)', 'font-size': 11, fill: INK }, [document.createTextNode('专家 ' + (e + 1))]));
      // 专家被选中时脉动（每个词元从 4 个中选 2 个，循环进行）
      var lit = svgEl('rect', { x: ex0, y: ey, width: ew, height: eh, rx: 4, fill: BP, opacity: 0 });
      var phase = (e * 0.22).toFixed(2);
      lit.appendChild(anim('opacity', '0;0.7;0;0', '4.4s', { keyTimes: '0;' + phase + ';' + (Number(phase) + 0.2).toFixed(2) + ';1' }));
      svg.appendChild(lit);
    }
    // 左侧词元各自向所选的 2 个专家发射路由光束
    var pick = [[0, 2], [1, 3], [0, 3], [1, 2]];
    toks.forEach(function (t, i) {
      var x = tx0 + i * (tw + tg);
      svg.appendChild(svgEl('rect', { x: x, y: ty, width: tw, height: 28, rx: 4, fill: SOFT, stroke: MUTE, 'stroke-width': 1 }));
      svg.appendChild(svgEl('text', { x: x + tw / 2, y: ty + 19, 'text-anchor': 'middle', 'font-family': 'var(--font-mono,monospace)', 'font-size': 11, fill: INK }, [document.createTextNode(t)]));
      // 一个路由词元沿 词元 → 路由器 → 专家 移动
      pick[i].forEach(function (e, j) {
        var ey = eyTop + e * (eh + eg) + eh / 2;
        var d = 'M ' + (x + tw / 2) + ' ' + (ty + 28) + ' Q ' + routerX + ' 118 ' + ex0 + ' ' + ey;
        var beam = svgEl('path', { d: d, fill: 'none', stroke: BP, 'stroke-width': 1.4, 'stroke-dasharray': '5 5', opacity: 0.18 });
        beam.appendChild(anim('opacity', '0.12;0.8;0.12', '4.4s', { begin: (i * 0.22 + j * 0.05) + 's' }));
        beam.appendChild(anim('stroke-dashoffset', '20;0', '0.9s'));
        svg.appendChild(beam);
      });
    });
    svg.appendChild(svgEl('text', { x: W / 2, y: 224, 'text-anchor': 'middle', 'font-family': 'var(--font-mono,monospace)', 'font-size': 10, fill: MUTE }, [document.createTextNode('每个词元激活 E 个专家中的前 k 个，其余保持空闲')]));
    card(host, '混合专家（Mixture of Experts，MoE）', '将每个词元路由到少数专家',
      svg, '稠密模块（Dense Block）为每个词元运行同一个前馈网络（FFN）。MoE 模块将它替换为多个专家前馈网络和一个路由器（Router），只把每个词元发送给得分最高的 k 个专家（Top-k）。总参数量随专家数量增长，但单个词元的计算量只随 k 增长，因此模型可以增大而不变慢。');
  }

  // ── encoder-decoder: 源序列编码一次，解码器（Decoder）逐步执行交叉注意力（Cross-attention） ──
  function encoderDecoder(host) {
    var W = 520, H = 240;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var encX = 70, decX = 360, n = 4, by = 40, bh = 34, bg = 10;
    // 左侧编码器堆栈（Encoder stack），一次填满后保持点亮
    for (var i = 0; i < n; i++) {
      var ey = by + i * (bh + bg);
      var er = svgEl('rect', { x: encX, y: ey, width: 90, height: bh, rx: 4, fill: SOFT, stroke: MUTE, 'stroke-width': 1 });
      er.appendChild(anim('fill', 'var(--bg,#fafaf5);' + SOFT + ';' + SOFT, '4s', { keyTimes: '0;0.2;1', fill: 'freeze', repeatCount: '1' }));
      svg.appendChild(er);
    }
    svg.appendChild(svgEl('text', { x: encX + 45, y: 28, 'text-anchor': 'middle', 'font-family': 'var(--font-mono,monospace)',
      'font-size': 11, fill: MUTE }, [document.createTextNode('编码器')]));
    svg.appendChild(svgEl('text', { x: decX + 45, y: 28, 'text-anchor': 'middle', 'font-family': 'var(--font-mono,monospace)',
      'font-size': 11, fill: BP }, [document.createTextNode('解码器')]));
    // 右侧解码器堆栈
    for (i = 0; i < n; i++) {
      var dy = by + i * (bh + bg);
      svg.appendChild(svgEl('rect', { x: decX, y: dy, width: 90, height: bh, rx: 4, fill: 'none', stroke: BP, 'stroke-width': 1.4 }));
      // 从编码器到此解码器层的交叉注意力连接，依次点亮
      var link = svgEl('line', { x1: encX + 90, y1: dy + bh / 2, x2: decX, y2: dy + bh / 2,
        stroke: BP, 'stroke-width': 1.6, 'stroke-dasharray': '5 4', opacity: 0.2 });
      link.appendChild(anim('opacity', '0.15;0.9;0.15', '4s', { begin: (1.4 + i * 0.3) + 's' }));
      link.appendChild(anim('stroke-dashoffset', '18;0', '0.9s'));
      svg.appendChild(link);
    }
    // 生成的词元在解码器下方逐个出现
    var outs = ['le', 'chat', 'dort'];
    outs.forEach(function (t, j) {
      var ox = decX + j * 34;
      var oc = svgEl('rect', { x: ox, y: 200, width: 30, height: 24, rx: 3, fill: BP, opacity: 0 });
      oc.appendChild(anim('opacity', '0;0;1;1', '4s', { keyTimes: '0;' + (0.55 + j * 0.12).toFixed(2) + ';' + (0.62 + j * 0.12).toFixed(2) + ';1' }));
      svg.appendChild(oc);
    });
    svg.appendChild(svgEl('text', { x: encX + 45, y: 218, 'text-anchor': 'middle', 'font-family': 'var(--font-mono,monospace)',
      'font-size': 11, fill: MUTE }, [document.createTextNode('the cat sleeps')]));
    card(host, '编码器—解码器（Encoder–Decoder）', '交叉注意力逐层亮起',
      svg, '编码器（Encoder）一次读取完整源输入，并固定其稠密表示（Dense Representation）。随后，解码器（Decoder）逐词元生成输出，在每一层通过交叉注意力（Cross-attention）读取该表示。翻译、摘要和转录都采用相同的输入到输出结构。');
  }

  // ── rnn-vs-parallel: 串行隐藏状态（Hidden state）缓慢前进，与同时执行注意力对比 ──
  function rnnVsParallel(host) {
    var W = 520, H = 230;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var n = 6, bw = 54, gap = 10, x0 = 40;
    function row(y, label, color) {
      svg.appendChild(svgEl('text', { x: 8, y: y - 14, 'font-family': 'var(--font-mono,monospace)', 'font-size': 10, fill: color }, [document.createTextNode(label)]));
      for (var i = 0; i < n; i++) {
        var x = x0 + i * (bw + gap);
        svg.appendChild(svgEl('rect', { x: x, y: y, width: bw, height: 28, rx: 3, fill: SOFT, stroke: MUTE, 'stroke-width': 1 }));
      }
    }
    row(50, 'RNN：串行', MUTE);
    row(160, 'Transformer：并行', BP);
    // RNN：一个隐藏状态词元缓慢地从左向右移动
    var hs = svgEl('circle', { cx: x0 + bw / 2, cy: 64, r: 9, fill: WARN });
    var path = 'M ' + (x0 + bw / 2) + ' 64 L ' + (x0 + (n - 1) * (bw + gap) + bw / 2) + ' 64';
    var mo = svgEl('animateMotion', { dur: '4s', repeatCount: 'indefinite', path: 'M 0 0 L ' + ((n - 1) * (bw + gap)) + ' 0', keyPoints: '0;1', keyTimes: '0;1', calcMode: 'linear' });
    hs.appendChild(mo);
    svg.appendChild(hs);
    // 并行（Parallel）：所有方块同时点亮，反复进行
    for (var i = 0; i < n; i++) {
      var x = x0 + i * (bw + gap);
      var fl = svgEl('rect', { x: x, y: 160, width: bw, height: 28, rx: 3, fill: BP, opacity: 0 });
      fl.appendChild(anim('opacity', '0;0.85;0;0', '4s', { keyTimes: '0;0.1;0.4;1' }));
      svg.appendChild(fl);
    }
    // 并行行中的交叉注意力连接网，绘制为淡色并显示流动
    for (i = 0; i < n; i++) {
      for (var j = i + 1; j < n; j++) {
        var ax = x0 + i * (bw + gap) + bw / 2, bx = x0 + j * (bw + gap) + bw / 2;
        if (j - i > 2) continue;
        var web = svgEl('path', { d: 'M ' + ax + ' 160 Q ' + (ax + bx) / 2 + ' 130 ' + bx + ' 160',
          fill: 'none', stroke: BP, 'stroke-width': 1, opacity: 0.18 });
        web.appendChild(anim('opacity', '0;0.5;0;0', '4s', { keyTimes: '0;0.12;0.45;1' }));
        svg.appendChild(web);
      }
    }
    svg.appendChild(svgEl('text', { x: W / 2, y: 214, 'text-anchor': 'middle', 'font-family': 'var(--font-mono,monospace)',
      'font-size': 11, fill: MUTE }, [document.createTextNode('串行：t+1 等待 t；并行：一次矩阵乘法')]));
    card(host, '为什么采用 Transformer', '串行隐藏状态与并行注意力',
      svg, '循环神经网络（Recurrent Neural Network，RNN）沿序列逐步传递一个隐藏状态（Hidden State），因此 1,000 个词元的输入需要 1,000 个串行步骤。Transformer 通过一次并行矩阵乘法，让每个位置关注其他所有位置。舍弃循环（Recurrence）这一选择，使模型在 2017 年后仍能持续扩展。');
  }

  // ── draft-verify-tokens: 便宜的草稿器（Drafter）提出候选，验证器（Verifier）接受或拒绝 ──
  function draftVerifyTokens(host) {
    var W = 520, H = 220;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var n = 5, bw = 64, gap = 12, x0 = 60, dy = 50, vy = 140;
    svg.appendChild(svgEl('text', { x: 8, y: dy + 17, 'font-family': 'var(--font-mono,monospace)', 'font-size': 9, fill: MUTE }, [document.createTextNode('起草')]));
    svg.appendChild(svgEl('text', { x: 8, y: vy + 17, 'font-family': 'var(--font-mono,monospace)', 'font-size': 9, fill: BP }, [document.createTextNode('验证')]));
    var accepted = [1, 1, 1, 0, 0]; // 最后两个被拒绝
    for (var i = 0; i < n; i++) {
      var x = x0 + i * (bw + gap);
      // 草稿词元从左向右快速出现
      var d = svgEl('rect', { x: x, y: dy, width: bw, height: 30, rx: 4, fill: SOFT, stroke: MUTE, 'stroke-width': 1, opacity: 0 });
      d.appendChild(anim('opacity', '0;1;1;1', '5s', { keyTimes: '0;' + (0.05 + i * 0.04).toFixed(2) + ';0.95;1' }));
      svg.appendChild(d);
      // 验证过程：一次扫过检查全部词元，再标记接受（蓝色）/拒绝（warn）
      var ok = accepted[i];
      var v = svgEl('rect', { x: x, y: vy, width: bw, height: 30, rx: 4,
        fill: 'none', stroke: ok ? BP : WARN, 'stroke-width': 1.6, opacity: 0 });
      v.appendChild(anim('opacity', '0;0;1;1', '5s', { keyTimes: '0;0.55;0.62;1' }));
      svg.appendChild(v);
      var vfill = svgEl('rect', { x: x, y: vy, width: bw, height: 30, rx: 4, fill: ok ? BP : WARN, opacity: 0 });
      vfill.appendChild(anim('opacity', '0;0;' + (ok ? '0.8' : '0.25') + ';' + (ok ? '0.8' : '0.25'), '5s', { keyTimes: '0;0.62;0.7;1' }));
      svg.appendChild(vfill);
      svg.appendChild(svgEl('text', { x: x + bw / 2, y: vy + 47, 'text-anchor': 'middle', 'font-family': 'var(--font-mono,monospace)',
        'font-size': 10, fill: ok ? BP : WARN }, [document.createTextNode(ok ? '接受' : '拒绝')]));
    }
    // 单根验证扫动条横向移动，展示“一次前向传播（Forward pass）”
    var sweep = svgEl('rect', { x: x0 - 6, y: vy - 6, width: 6, height: 42, fill: BP, opacity: 0.6 });
    sweep.appendChild(svgEl('animateTransform', { attributeName: 'transform', type: 'translate',
      values: '0 0;' + ((n - 1) * (bw + gap) + bw) + ' 0', dur: '5s', repeatCount: 'indefinite', keyTimes: '0;1' }));
    sweep.appendChild(anim('opacity', '0;0.6;0.6;0;0', '5s', { keyTimes: '0;0.5;0.6;0.65;1' }));
    svg.appendChild(sweep);
    card(host, '推测解码（Speculative Decoding）', '起草 → 验证 → 保留前缀',
      svg, '低成本的草稿模型（Drafter）通过几次快速的小规模计算提出多个词元。大模型随后用一次前向传播（Forward Pass）验证全部词元，接受与自身分布匹配的最长前缀（Prefix），拒绝其余部分。草稿质量足够好时，一次大模型计算就能得到多个词元，而输出分布保持不变。');
  }

  // ── multi-token-predict: 对一个隐藏状态施加多个未来词元的监督 ──
  function multiTokenPredict(host) {
    var W = 520, H = 230;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var hx = 90, hy = 150, hw = 80, hh = 40;
    // 共享隐藏状态
    var h = svgEl('rect', { x: hx, y: hy, width: hw, height: hh, rx: 5, fill: BP, opacity: 0.85 });
    svg.appendChild(h);
    svg.appendChild(svgEl('text', { x: hx + hw / 2, y: hy + 25, 'text-anchor': 'middle', 'font-family': 'var(--font-mono,monospace)',
      'font-size': 11, fill: 'var(--bg,#fafaf5)' }, [document.createTextNode('h_t')]));
    // 三个深度预测头（Depth heads）串联：t+1、t+2、t+3，各自细化并输出
    var depths = ['t+1', 't+2', 't+3'];
    var px = hx + hw + 60;
    depths.forEach(function (lab, k) {
      var y = 40 + k * 56;
      var box = svgEl('rect', { x: px, y: y, width: 70, height: 36, rx: 4, fill: 'none', stroke: BP, 'stroke-width': 1.4 });
      svg.appendChild(box);
      svg.appendChild(svgEl('text', { x: px + 35, y: y + 23, 'text-anchor': 'middle', 'font-family': 'var(--font-mono,monospace)',
        'font-size': 11, fill: BP }, [document.createTextNode('MTP ' + lab)]));
      // 从隐藏状态流向此预测头，错开时间以表示顺序细化（Sequential refinement）
      var ln = svgEl('path', { d: 'M ' + (hx + hw) + ' ' + (hy + hh / 2) + ' C ' + (px - 30) + ' ' + (hy + hh / 2) + ' ' + (px - 30) + ' ' + (y + 18) + ' ' + px + ' ' + (y + 18),
        fill: 'none', stroke: BP, 'stroke-width': 1.5, 'stroke-dasharray': '5 4', opacity: 0.25 });
      ln.appendChild(anim('opacity', '0.2;0.9;0.2', '3.6s', { begin: (k * 0.5) + 's' }));
      ln.appendChild(anim('stroke-dashoffset', '18;0', '0.8s'));
      svg.appendChild(ln);
      // 预测词元向右弹出
      var tok = svgEl('rect', { x: px + 100, y: y + 4, width: 30, height: 28, rx: 3, fill: BP, opacity: 0 });
      tok.appendChild(anim('opacity', '0;1;1;0.3', '3.6s', { keyTimes: '0;' + (0.15 + k * 0.15).toFixed(2) + ';0.85;1', begin: (k * 0.5) + 's' }));
      svg.appendChild(tok);
    });
    svg.appendChild(svgEl('text', { x: hx + hw / 2, y: hy + hh + 22, 'text-anchor': 'middle', 'font-family': 'var(--font-mono,monospace)',
      'font-size': 10, fill: MUTE }, [document.createTextNode('同一个隐藏状态')]));
    card(host, '多词元预测（Multi-token Prediction，MTP）', '一个状态，多个未来位置',
      svg, '标准训练只监督每个隐藏状态预测紧接着的一个词元，监督信号较弱。MTP 增加不同深度的预测头（Prediction Head），分别预测更远位置的词元，并通过串联保留因果顺序。更丰富的监督信号改善主干网络（Backbone），训练后的预测头还可以在推理时充当推测解码的草稿模型。');
  }

  // ── self-critique-loop: 草稿回答循环经过批评（Critique）与修订（Revision） ──
  function selfCritiqueLoop(host) {
    var W = 520, H = 230;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var cx = 260, cy = 120, r = 78;
    var stages = [
      { a: -90, t: '起草' },
      { a: 30, t: '批评' },
      { a: 150, t: '修订' }
    ];
    // 循环环
    svg.appendChild(svgEl('circle', { cx: cx, cy: cy, r: r, fill: 'none', stroke: SOFT, 'stroke-width': 2 }));
    // 表示活动的词元沿环移动
    var dot = svgEl('circle', { cx: cx + r, cy: cy, r: 7, fill: BP });
    dot.appendChild(svgEl('animateTransform', { attributeName: 'transform', type: 'rotate',
      values: '0 ' + cx + ' ' + cy + ';360 ' + cx + ' ' + cy, dur: '6s', repeatCount: 'indefinite' }));
    svg.appendChild(dot);
    stages.forEach(function (s, i) {
      var rad = s.a * Math.PI / 180;
      var nx = cx + r * Math.cos(rad), ny = cy + r * Math.sin(rad);
      var node = svgEl('circle', { cx: nx, cy: ny, r: 11, fill: 'var(--bg,#fafaf5)', stroke: BP, 'stroke-width': 1.6 });
      node.appendChild(anim('fill', 'var(--bg,#fafaf5);' + BP + ';var(--bg,#fafaf5);var(--bg,#fafaf5)', '6s', { keyTimes: '0;' + (0.04 + i * 0.333).toFixed(3) + ';' + (0.2 + i * 0.333).toFixed(3) + ';1' }));
      svg.appendChild(node);
      var lx = nx + (s.a === 30 ? 18 : s.a === 150 ? -18 : 0);
      svg.appendChild(svgEl('text', { x: lx, y: ny + (s.a === -90 ? -18 : 30), 'text-anchor': 'middle',
        'font-family': 'var(--font-mono,monospace)', 'font-size': 11, fill: BP }, [document.createTextNode(s.t)]));
    });
    // 书面宪法（Constitution）向批评节点提供依据
    svg.appendChild(svgEl('rect', { x: 30, y: 80, width: 96, height: 70, rx: 4, fill: 'none', stroke: MUTE, 'stroke-width': 1 }));
    svg.appendChild(svgEl('text', { x: 78, y: 72, 'text-anchor': 'middle', 'font-family': 'var(--font-mono,monospace)', 'font-size': 10, fill: MUTE }, [document.createTextNode('原则章程')]));
    [0, 1, 2].forEach(function (k) {
      svg.appendChild(svgEl('line', { x1: 42, y1: 100 + k * 16, x2: 114, y2: 100 + k * 16, stroke: MUTE, 'stroke-width': 1, opacity: 0.6 }));
    });
    var feed = svgEl('line', { x1: 126, y1: 115, x2: cx + r * Math.cos(30 * Math.PI / 180) - 12, y2: cy + r * Math.sin(30 * Math.PI / 180),
      stroke: WARN, 'stroke-width': 1.4, 'stroke-dasharray': '4 4', opacity: 0.4 });
    feed.appendChild(anim('stroke-dashoffset', '16;0', '1s'));
    feed.appendChild(anim('opacity', '0.2;0.8;0.2', '6s', { begin: '2s' }));
    svg.appendChild(feed);
    card(host, '宪法式 AI（Constitutional AI）', '无需人工介入的批评与修订',
      svg, '模型自行评分，替代付费获取人工偏好标签。它先起草回答，再依据书面原则章程（Constitution）批评草稿并修订。修订前后的样本对成为训练信号，因此大部分对齐（Alignment）工作都在模型自身的循环中完成。');
  }

  // ── loss-masking: 助手词元贡献损失（Loss），提示词词元被掩码（Masked） ──
  function lossMasking(host) {
    var W = 520, H = 200;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var seq = [
      { t: 'system', m: 0 }, { t: 'You', m: 0 }, { t: 'are', m: 0 }, { t: 'helpful', m: 0 },
      { t: 'user', m: 0 }, { t: 'capital?', m: 0 },
      { t: 'assistant', m: 1 }, { t: 'Paris', m: 1 }, { t: '.', m: 1 }
    ];
    var x0 = 14, bw = 49, gap = 6, ty = 70;
    seq.forEach(function (s, i) {
      var x = x0 + i * (bw + gap);
      var on = s.m === 1;
      svg.appendChild(svgEl('rect', { x: x, y: ty, width: bw, height: 34, rx: 4,
        fill: on ? 'var(--bg,#fafaf5)' : SOFT, stroke: on ? BP : MUTE, 'stroke-width': on ? 1.6 : 1 }));
      svg.appendChild(svgEl('text', { x: x + bw / 2, y: ty + 22, 'text-anchor': 'middle', 'font-family': 'var(--font-mono,monospace)',
        'font-size': 9, fill: on ? BP : MUTE }, [document.createTextNode(s.t)]));
      // 各词元上方的损失贡献柱
      var lossH = on ? 30 : 0;
      var bar = svgEl('rect', { x: x + 14, y: ty - 6, width: bw - 28, height: 4, rx: 2, fill: on ? BP : SOFT });
      if (on) {
        bar.setAttribute('y', String(ty - lossH));
        bar.setAttribute('height', '0');
        bar.appendChild(anim('height', '0;' + lossH + ';' + lossH + ';0', '3.5s', { keyTimes: '0;0.25;0.85;1', begin: (0.6 + (i - 6) * 0.18) + 's' }));
        bar.appendChild(anim('y', (ty) + ';' + (ty - lossH) + ';' + (ty - lossH) + ';' + ty, '3.5s', { keyTimes: '0;0.25;0.85;1', begin: (0.6 + (i - 6) * 0.18) + 's' }));
      }
      svg.appendChild(bar);
    });
    svg.appendChild(svgEl('text', { x: 14, y: 30, 'font-family': 'var(--font-mono,monospace)', 'font-size': 10, fill: BP }, [document.createTextNode('损失 ↑ 仅计入助手词元')]));
    svg.appendChild(svgEl('text', { x: 14, y: ty + 56, 'font-family': 'var(--font-mono,monospace)', 'font-size': 10, fill: MUTE }, [document.createTextNode('提示词词元被屏蔽，梯度 = 0')]));
    card(host, '监督微调（SFT）· 损失掩码（Loss Masking）', '学习回答，而非复述提示词',
      svg, '对话样本包含 system、user 和 assistant 轮次，但模型只应接受生成助手轮次的训练。损失掩码将每个提示词词元上的梯度置零，使模型学会回答，而非记忆和复述问题。');
  }

  // ── activation-recompute: 存储少量检查点（Checkpoints），其余重新计算 ──
  function activationRecompute(host) {
    var W = 520, H = 220;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var n = 8, bw = 46, gap = 10, x0 = 50, fy = 60, by = 140;
    svg.appendChild(svgEl('text', { x: 8, y: fy + 18, 'font-family': 'var(--font-mono,monospace)', 'font-size': 9, fill: MUTE }, [document.createTextNode('前向')]));
    svg.appendChild(svgEl('text', { x: 8, y: by + 18, 'font-family': 'var(--font-mono,monospace)', 'font-size': 9, fill: BP }, [document.createTextNode('反向')]));
    var ckpt = { 0: 1, 3: 1, 6: 1 }; // 保留激活值（Activations）的层
    for (var i = 0; i < n; i++) {
      var x = x0 + i * (bw + gap);
      var kept = ckpt[i];
      // 前向传播：每层都计算，只有检查点保持实色
      var f = svgEl('rect', { x: x, y: fy, width: bw, height: 30, rx: 3,
        fill: kept ? BP : SOFT, stroke: kept ? BP : MUTE, 'stroke-width': 1, opacity: kept ? 0.85 : 1 });
      if (!kept) {
        // 非检查点激活值淡出，表示为节省内存而丢弃
        f.appendChild(anim('opacity', '1;1;0.12;0.12', '5s', { keyTimes: '0;0.28;0.36;1' }));
      }
      svg.appendChild(f);
      if (kept) svg.appendChild(svgEl('text', { x: x + bw / 2, y: fy - 6, 'text-anchor': 'middle', 'font-family': 'var(--font-mono,monospace)', 'font-size': 8, fill: BP }, [document.createTextNode('保存')]));
      // 反向传播（Backward pass）时段
      svg.appendChild(svgEl('rect', { x: x, y: by, width: bw, height: 30, rx: 3, fill: 'none', stroke: SOFT, 'stroke-width': 1 }));
    }
    // 反向扫动：从最近检查点重新计算已丢弃层，自右向左进行
    var rc = svgEl('rect', { x: 0, y: by, width: bw, height: 30, rx: 3, fill: WARN, opacity: 0.5 });
    rc.appendChild(anim('x', (x0 + (n - 1) * (bw + gap)) + ';' + x0, '5s', { keyTimes: '0;1', begin: '0s', calcMode: 'linear' }));
    rc.appendChild(anim('opacity', '0;0;0.55;0.55;0', '5s', { keyTimes: '0;0.45;0.5;0.95;1' }));
    svg.appendChild(rc);
    svg.appendChild(svgEl('text', { x: W / 2, y: by + 52, 'text-anchor': 'middle', 'font-family': 'var(--font-mono,monospace)',
      'font-size': 10, fill: MUTE }, [document.createTextNode('反向传播时重新计算被丢弃的激活值')]));
    card(host, '梯度检查点（Gradient Checkpointing）', '用浮点运算量（FLOPs）换内存',
      svg, '反向传播（Backpropagation）需要前向传播的激活值（Activation），但全部保留会超出内存预算。检查点方法只保存少数层（实心），丢弃其余激活值。反向传播时，从最近的检查点重新计算每个被丢弃的片段，用少量额外计算换取峰值内存的大幅下降。');
  }

  LF.register({
    'expert-routing': expertRouting,
    'encoder-decoder': encoderDecoder,
    'rnn-vs-parallel': rnnVsParallel,
    'draft-verify-tokens': draftVerifyTokens,
    'multi-token-predict': multiTokenPredict,
    'self-critique-loop': selfCritiqueLoop,
    'loss-masking': lossMasking,
    'activation-recompute': activationRecompute
  });
})();
