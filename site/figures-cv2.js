/* figures-cv2.js — 阶段 4（计算机视觉（Computer vision））的 SVG 动画课程图表。
   在 lesson-figures.js 之后加载，通过 window.LF 注册组件。
   每张图都是自动播放的 SMIL 动画，展示一个计算机视觉（CV）概念：不使用 JS
   定时器或计算循环。原生 ES5，无依赖，主题由 CSS 变量控制。
   编写时仍在 docs/en.md 中使用相同的围栏块：
       ```figure
       object-detection-nms
       ```  */
(function () {
  'use strict';
  var LF = window.LF;
  if (!LF) { return; }
  var el = LF.el, svgEl = LF.svgEl;

  function shell(label, hint, svg, caption) {
    return el('div', { class: 'lf' }, [
      el('div', { class: 'lf-head' }, [el('span', { class: 'lf-label' }, [label]), el('span', {}, [hint])]),
      el('div', { class: 'lf-body' }, [el('div', { class: 'lf-out' }, [svg])]),
      el('div', { class: 'lf-cap' }, [caption])
    ]);
  }
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
  function txt(x, y, s, size, anchor) {
    return svgEl('text', { x: x, y: y, fill: 'var(--ink-mute,#777)', 'font-size': size || 10, 'font-family': 'monospace', 'text-anchor': anchor || 'start' }, [document.createTextNode(s)]);
  }
  var BLUE = 'var(--blueprint,#3553ff)', INK = 'var(--ink,#1a1a1a)', SOFT = 'var(--rule-soft,#ddd)', WARN = 'var(--warn,#b8870f)', MUTE = 'var(--ink-mute,#777)';

  // ── object-detection-nms (06): 候选框出现，非极大值抑制（NMS）剔除重叠框 ──
  function objectDetectionNms(host) {
    var svg = svgEl('svg', { viewBox: '0 0 520 240' });
    svg.appendChild(svgEl('rect', { x: 14, y: 24, width: 240, height: 200, fill: 'var(--bg-surface,#eee)', stroke: SOFT }));
    svg.appendChild(txt(14, 18, '场景 · 全部候选框'));
    // “对象”的轮廓
    svg.appendChild(svgEl('ellipse', { cx: 130, cy: 130, rx: 58, ry: 70, fill: BLUE, opacity: '0.16' }));
    // 重叠的原始候选框（用虚线绘制，表示尚待筛选）
    var raw = [[80, 70, 100, 120], [92, 80, 96, 116], [70, 64, 118, 132], [104, 92, 88, 104]];
    raw.forEach(function (b, i) {
      var r = svgEl('rect', { x: b[0], y: b[1], width: b[2], height: b[3], fill: 'none', stroke: WARN, 'stroke-width': '1.4', 'stroke-dasharray': '4 3', opacity: '0' });
      r.appendChild(anim('opacity', '0;0.9;0.9;0.15;0.15', '5s', { begin: (i * 0.12) + 's', keyTimes: '0;0.18;0.5;0.62;1' }));
      svg.appendChild(r);
    });
    // 保留下来的框最后绘制，使用实线
    var win = svgEl('rect', { x: 78, y: 66, width: 104, height: 126, fill: 'none', stroke: BLUE, 'stroke-width': '2.6', opacity: '0' });
    win.appendChild(anim('opacity', '0;0;1;1', '5s', { keyTimes: '0;0.55;0.72;1' }));
    svg.appendChild(win);
    var lab = svgEl('rect', { x: 78, y: 52, width: 56, height: 13, fill: BLUE, opacity: '0' });
    lab.appendChild(anim('opacity', '0;0;1;1', '5s', { keyTimes: '0;0.6;0.78;1' }));
    svg.appendChild(lab);
    var lt = svgEl('text', { x: 82, y: 62, fill: 'var(--bg,#fafaf5)', 'font-size': '9', 'font-family': 'monospace', opacity: '0' }, [document.createTextNode('狗 0.94')]);
    lt.appendChild(anim('opacity', '0;0;1;1', '5s', { keyTimes: '0;0.6;0.78;1' }));
    svg.appendChild(lt);
    // 右侧列：NMS 步骤标签依次点亮
    var steps = ['1 · 密集网格生成候选框', '2 · 为每个框打分', '3 · 按目标存在概率排序', '4 · 删除高交并比的重叠框', '5 · 每个目标保留一个框'];
    steps.forEach(function (s, i) {
      var y = 56 + i * 34;
      var dot = svgEl('circle', { cx: 296, cy: y - 4, r: '5', fill: SOFT });
      dot.appendChild(anim('fill', SOFT + ';' + SOFT + ';' + BLUE + ';' + BLUE, '5s', { keyTimes: '0;' + (0.12 + i * 0.16).toFixed(2) + ';' + (0.2 + i * 0.16).toFixed(2) + ';1' }));
      svg.appendChild(dot);
      svg.appendChild(txt(310, y, s, 11));
    });
    host.appendChild(shell('目标检测（Object Detection）· 非极大值抑制（NMS）', '生成候选框，剔除重叠框', svg,
      'YOLO 检测头在每个网格单元预测边界框（Bounding Box），因此同一个目标会产生多个重叠的候选框，图中用虚线表示。非极大值抑制（Non-maximum Suppression，NMS）按置信度排序，保留得分最高的框，再删除与它重叠过多、交并比（Intersection over Union，IoU）较高的框。最终，每个目标留下一个贴合其轮廓的框。'));
  }

  // ── segmentation-flood (07): 编码器（Encoder）→瓶颈（Bottleneck）→解码器（Decoder），区域进行泛洪填充 ──
  function segmentationFlood(host) {
    var svg = svgEl('svg', { viewBox: '0 0 520 230' });
    svg.appendChild(txt(14, 16, '输入图像'));
    svg.appendChild(txt(330, 16, '逐像素掩码（Mask）'));
    // 6x6 区域图：为每个单元分配类别 ID，分波次进行泛洪填充（Flood-fill）
    var N = 6, cell = 26, gx = 14, gy = 26, gx2 = 330;
    var classOf = [
      [0, 0, 0, 1, 1, 1], [0, 0, 1, 1, 1, 1], [0, 2, 2, 1, 1, 1],
      [2, 2, 2, 2, 1, 1], [2, 2, 2, 2, 2, 1], [2, 2, 2, 2, 2, 2]
    ];
    var classFill = [BLUE, WARN, INK];
    var r, c;
    for (r = 0; r < N; r++) for (c = 0; c < N; c++) {
      // 左侧：灰度输入（Greyscale input）
      svg.appendChild(svgEl('rect', { x: gx + c * cell, y: gy + r * cell, width: cell - 1.5, height: cell - 1.5, fill: BLUE, opacity: (0.1 + 0.5 * ((r * 3 + c * 2) % 5) / 5).toFixed(3) }));
      // 右侧：类别掩码（Class mask）按距左上角的距离逐渐填充
      var dist = (r + c) / 10;
      var cl = classOf[r][c];
      var m = svgEl('rect', { x: gx2 + c * cell, y: gy + r * cell, width: cell - 1.5, height: cell - 1.5, fill: classFill[cl], opacity: '0' });
      var dcl = Math.min(0.85, dist);
      m.appendChild(anim('opacity', '0;0;0.8;0.8', '4s', { keyTimes: '0;' + dcl.toFixed(2) + ';' + (dcl + 0.12).toFixed(2) + ';1' }));
      svg.appendChild(m);
    }
    // 连接编码器侧与解码器侧的跳跃连接（Skip-connection）弧线
    var arc = svgEl('path', { d: 'M 175 70 C 240 30, 300 30, 330 70', fill: 'none', stroke: BLUE, 'stroke-width': '1.8', 'stroke-dasharray': '6 4', opacity: '0.7' });
    var arcLen = '170';
    arc.setAttribute('stroke-dasharray', arcLen);
    arc.setAttribute('stroke-dashoffset', arcLen);
    arc.appendChild(anim('stroke-dashoffset', arcLen + ';0;0;' + arcLen, '4s'));
    svg.appendChild(arc);
    svg.appendChild(txt(190, 28, '跳跃连接（Skip Connection）', 9));
    // 一个像素沿跳跃连接弧线移动
    var dot = svgEl('circle', { r: '4', fill: WARN });
    var mp = svgEl('animateMotion', { dur: '4s', repeatCount: 'indefinite', path: 'M 175 70 C 240 30, 300 30, 330 70', keyPoints: '0;1;1', keyTimes: '0;0.5;1' });
    dot.appendChild(mp);
    svg.appendChild(dot);
    host.appendChild(shell('语义分割（Semantic Segmentation）', '逐像素标注，分区逐渐显现', svg,
      '分割是在每个像素上做分类。编码器（Encoder）压缩图像以提取上下文，解码器（Decoder）通过上采样（Upsampling）恢复完整分辨率，跳跃连接（Skip Connection）则把精细的空间信息传递过去，保持边界清晰。随着掩码（Mask）向外展开，每个像素都被赋予对应类别。'));
  }

  // ── gan-minimax (09): G 将噪声变为图像，D 的判定不断振荡 ──
  function ganMinimax(host) {
    var svg = svgEl('svg', { viewBox: '0 0 520 230' });
    svg.appendChild(txt(14, 16, '噪声 z'));
    svg.appendChild(txt(150, 16, '生成器 G'));
    svg.appendChild(txt(300, 16, '生成图像'));
    svg.appendChild(txt(430, 16, '评价器 D'));
    // 左侧噪声点不断闪烁
    var i;
    for (i = 0; i < 9; i++) {
      var nx = 18 + (i % 3) * 18, ny = 40 + Math.floor(i / 3) * 18;
      var n = svgEl('circle', { cx: nx, cy: ny, r: '4', fill: MUTE });
      n.appendChild(anim('opacity', '0.3;1;0.3', '0.9s', { begin: (i * 0.1) + 's' }));
      svg.appendChild(n);
    }
    // 进入 G 的箭头
    svg.appendChild(svgEl('path', { d: 'M 86 70 L 138 70', stroke: SOFT, 'stroke-width': '2', 'marker-end': '' }));
    // G 方块
    svg.appendChild(svgEl('rect', { x: 138, y: 40, width: 70, height: 60, fill: BLUE, opacity: '0.16', stroke: BLUE }));
    // 伪造图像（Fake image）：4x4 网格在循环中从噪声逐渐清晰为连贯图案
    var gx = 290, gy = 40, cs = 18, r, c;
    for (r = 0; r < 4; r++) for (c = 0; c < 4; c++) {
      var target = ((r < 2) === (c < 2)) ? 0.85 : 0.18; // 2x2 的“人脸”块状图案
      var rect = svgEl('rect', { x: gx + c * cs, y: gy + r * cs, width: cs - 1.5, height: cs - 1.5, fill: BLUE });
      var noisy = (0.2 + 0.6 * ((r * 7 + c * 5) % 4) / 4).toFixed(2);
      rect.appendChild(anim('opacity', noisy + ';' + target + ';' + target, '4.5s', { keyTimes: '0;0.7;1' }));
      svg.appendChild(rect);
    }
    // 指向 D 的箭头
    svg.appendChild(svgEl('path', { d: 'M 364 70 L 414 70', stroke: SOFT, 'stroke-width': '2' }));
    // D 的 P(real) 量表条
    svg.appendChild(svgEl('rect', { x: 430, y: 50, width: 70, height: 12, fill: 'var(--bg-surface,#eee)' }));
    var gauge = svgEl('rect', { x: 430, y: 50, width: 18, height: 12, fill: WARN });
    gauge.appendChild(anim('width', '12;30;20;46;38', '4.5s', { calcMode: 'spline', keySplines: '.4 0 .6 1;.4 0 .6 1;.4 0 .6 1;.4 0 .6 1', keyTimes: '0;0.3;0.55;0.8;1' }));
    gauge.appendChild(anim('fill', WARN + ';' + WARN + ';' + BLUE, '4.5s', { keyTimes: '0;0.6;1' }));
    svg.appendChild(gauge);
    svg.appendChild(txt(430, 80, 'P(real) →', 9));
    // 底部相互拉锯的损失（Loss）条
    svg.appendChild(txt(14, 150, '极小极大博弈（Minimax）：G 提高分数，D 降低分数', 11));
    var seesaw = svgEl('line', { x1: 60, y1: 190, x2: 460, y2: 190, stroke: INK, 'stroke-width': '2.5' });
    seesaw.appendChild(animT('rotate', '-7 260 190;7 260 190;-7 260 190', '4.5s'));
    svg.appendChild(seesaw);
    svg.appendChild(svgEl('circle', { cx: 260, cy: 196, r: '4', fill: BLUE }));
    var gL = svgEl('text', { x: 70, y: 178, fill: BLUE, 'font-size': '10', 'font-family': 'monospace' }, [document.createTextNode('G')]);
    var dL = svgEl('text', { x: 446, y: 178, fill: WARN, 'font-size': '10', 'font-family': 'monospace' }, [document.createTextNode('D')]);
    svg.appendChild(gL); svg.appendChild(dL);
    host.appendChild(shell('生成对抗网络（GAN）· 极小极大博弈（Minimax Game）', '一个生成，一个评价', svg,
      '生成器（Generator）把噪声向量变成图像，评价器（Critic）为图像的真实程度打分。两者对抗训练：生成器设法提高评价器给出的真实概率 P(real)，评价器则设法降低它。随着双方逐渐达到平衡，生成图像从噪声中呈现出清晰结构。'));
  }

  // ── diffusion-denoise (10): 带噪网格逐步还原为干净图像 ──
  function diffusionDenoise(host) {
    var svg = svgEl('svg', { viewBox: '0 0 520 220' });
    svg.appendChild(txt(14, 16, 'x_T  纯噪声'));
    svg.appendChild(txt(360, 16, 'x_0  样本'));
    // 6x6 网格：每个单元的不透明度从随机噪声动画过渡到目标图像
    var N = 6, cell = 28, gx = 150, gy = 30;
    var target = [
      [0.1, 0.1, 0.7, 0.7, 0.1, 0.1], [0.1, 0.7, 0.9, 0.9, 0.7, 0.1],
      [0.7, 0.9, 0.3, 0.3, 0.9, 0.7], [0.7, 0.9, 0.3, 0.3, 0.9, 0.7],
      [0.1, 0.7, 0.9, 0.9, 0.7, 0.1], [0.1, 0.1, 0.7, 0.7, 0.1, 0.1]
    ];
    var r, c;
    for (r = 0; r < N; r++) for (c = 0; c < N; c++) {
      var rect = svgEl('rect', { x: gx + c * cell, y: gy + r * cell, width: cell - 2, height: cell - 2, fill: BLUE });
      // 五个去噪（Denoise）步骤：噪声不透明度先波动，再收敛到目标
      var v = ((r * 11 + c * 7) % 5) / 5;
      var v2 = ((r * 5 + c * 13) % 5) / 5;
      var t = target[r][c];
      rect.appendChild(anim('opacity', v.toFixed(2) + ';' + v2.toFixed(2) + ';' + ((v2 + t) / 2).toFixed(2) + ';' + t.toFixed(2) + ';' + t.toFixed(2), '5s', { keyTimes: '0;0.3;0.6;0.85;1' }));
      svg.appendChild(rect);
    }
    // 从 T → 0 递减的步骤计数器
    var counter = svgEl('text', { x: 260, y: 212, fill: BLUE, 'font-size': '13', 'font-family': 'monospace', 'text-anchor': 'middle' }, [document.createTextNode('t = 1000')]);
    var ct = svgEl('animate', { attributeName: 'opacity', values: '1;1', dur: '5s', repeatCount: 'indefinite' });
    counter.appendChild(ct);
    // 使用类似 <set> 的链式值以离散文本模拟倒计时较难；改用扫动箭头
    svg.appendChild(counter);
    // 去噪箭头向右扫动，带有移动标记
    svg.appendChild(svgEl('line', { x1: 150, y1: 200, x2: 318, y2: 200, stroke: SOFT, 'stroke-width': '2' }));
    var head = svgEl('polygon', { points: '0,-4 8,0 0,4', fill: WARN });
    var mp = svgEl('animateMotion', { dur: '5s', repeatCount: 'indefinite', path: 'M 150 200 L 318 200' });
    head.appendChild(mp);
    svg.appendChild(head);
    svg.appendChild(txt(150, 196, '反向过程：逐步预测并减去噪声', 9));
    host.appendChild(shell('扩散（Diffusion）· 去噪（Denoising）', '从纯噪声生成样本', svg,
      '扩散模型（Diffusion Model）学习每次去除少量噪声。采样从纯高斯噪声（Gaussian Noise）网格出发，沿反向过程逐步推进：每一步预测噪声并将其减去，图像结构因而逐渐显现。重复足够多次小步去噪后，噪声便会形成结构连贯的图像。'));
  }

  // ── nerf-rays (13): 相机向体积中投射射线（Rays），累积采样结果 ──
  function nerfRays(host) {
    var svg = svgEl('svg', { viewBox: '0 0 520 230' });
    svg.appendChild(txt(14, 16, '相机（Camera）'));
    svg.appendChild(txt(300, 16, '体积：密度场与颜色场'));
    // 相机原点（Camera origin）
    var ox = 40, oy = 120;
    svg.appendChild(svgEl('circle', { cx: ox, cy: oy, r: '6', fill: INK }));
    svg.appendChild(svgEl('rect', { x: ox - 4, y: oy - 12, width: 8, height: 24, fill: 'none', stroke: INK, 'stroke-width': '1.5' }));
    // 隐式对象（Implicit object）：体积内的柔和团块
    svg.appendChild(svgEl('ellipse', { cx: 380, cy: 120, rx: 64, ry: 78, fill: BLUE, opacity: '0.14' }));
    svg.appendChild(svgEl('ellipse', { cx: 380, cy: 120, rx: 34, ry: 44, fill: BLUE, opacity: '0.2' }));
    // 三条射线扇形展开，以 dashoffset 逐步绘出
    var rays = [[ox, oy, 470, 60], [ox, oy, 480, 120], [ox, oy, 470, 180]];
    rays.forEach(function (rr, i) {
      var len = 460;
      var line = svgEl('line', { x1: rr[0], y1: rr[1], x2: rr[2], y2: rr[3], stroke: SOFT, 'stroke-width': '1.4', 'stroke-dasharray': len, 'stroke-dashoffset': len });
      line.appendChild(anim('stroke-dashoffset', len + ';0;0', '4s', { begin: (i * 0.25) + 's', keyTimes: '0;0.6;1' }));
      svg.appendChild(line);
      // 采样点沿每条射线前进，在团块内部变亮
      var s;
      for (s = 0; s < 8; s++) {
        var t = s / 7;
        var sx = rr[0] + (rr[2] - rr[0]) * t;
        var sy = rr[1] + (rr[3] - rr[1]) * t;
        var inside = sx > 320 && sx < 444;
        var pt = svgEl('circle', { cx: sx, cy: sy, r: inside ? '3.2' : '2', fill: inside ? BLUE : MUTE, opacity: '0' });
        pt.appendChild(anim('opacity', '0;0;' + (inside ? '1' : '0.5') + ';' + (inside ? '1' : '0.5'), '4s', { begin: (i * 0.25 + s * 0.05) + 's', keyTimes: '0;' + (0.1 + t * 0.5).toFixed(2) + ';' + (0.2 + t * 0.5).toFixed(2) + ';1' }));
        svg.appendChild(pt);
      }
    });
    // 右边缘累积得到的像素色块
    var i2;
    for (i2 = 0; i2 < 3; i2++) {
      var px = svgEl('rect', { x: 488, y: 50 + i2 * 60, width: 18, height: 40, fill: BLUE, opacity: '0' });
      px.appendChild(anim('opacity', '0;0;0.85;0.85', '4s', { begin: (i2 * 0.25) + 's', keyTimes: '0;0.7;0.9;1' }));
      svg.appendChild(px);
    }
    svg.appendChild(txt(90, 215, '沿射线采样，查询 MLP 的密度与颜色，积分得到一个像素', 9));
    host.appendChild(shell('神经辐射场（NeRF）· 体渲染（Volume Rendering）', '沿射线采样，对颜色积分', svg,
      '神经辐射场（Neural Radiance Field，NeRF）用函数表示场景：输入三维位置和观察方向，返回密度与颜色。渲染一个像素时，从相机发出射线，沿途采样，逐点查询多层感知机（Multilayer Perceptron，MLP），再从前到后对密度加权的颜色积分。每条射线把空间中的一条线汇总成一个像素。'));
  }

  // ── clip-contrastive (18): NxN 相似度矩阵（Similarity matrix），对角线点亮 ──
  function clipContrastive(host) {
    var svg = svgEl('svg', { viewBox: '0 0 520 240' });
    svg.appendChild(txt(86, 18, '文本嵌入（Embeddings）→'));
    var N = 5, cell = 30, gx = 86, gy = 30;
    // 行 = 图像，列 = 描述（Caption）；构建矩阵
    var r, c;
    for (r = 0; r < N; r++) {
      svg.appendChild(txt(gx - 8, gy + r * cell + 20, '图像', 9, 'end'));
      for (c = 0; c < N; c++) {
        var diag = r === c;
        var rect = svgEl('rect', { x: gx + c * cell, y: gy + r * cell, width: cell - 2, height: cell - 2, fill: diag ? BLUE : MUTE, 'stroke': SOFT, 'stroke-width': '0.5' });
        if (diag) {
          rect.appendChild(anim('opacity', '0.2;0.2;1;1', '4s', { keyTimes: '0;0.3;0.6;1' }));
        } else {
          rect.appendChild(anim('opacity', '0.5;0.5;0.12;0.12', '4s', { keyTimes: '0;0.3;0.6;1' }));
        }
        svg.appendChild(rect);
      }
    }
    // 沿对角线向下移动的扫动高亮
    var hl = svgEl('rect', { x: gx, y: gy, width: cell - 2, height: cell - 2, fill: 'none', stroke: WARN, 'stroke-width': '2.5' });
    var pts = [];
    for (r = 0; r < N; r++) pts.push((gx + r * cell) + ',' + (gy + r * cell));
    var mp = svgEl('animateMotion', { dur: '4s', repeatCount: 'indefinite', path: 'M 0 0' });
    // 沿对角线单元构建路径
    var pd = 'M 0 0';
    for (r = 1; r < N; r++) pd += ' L ' + (r * cell) + ' ' + (r * cell);
    mp.setAttribute('path', pd);
    mp.setAttribute('begin', '0.4s');
    hl.appendChild(mp);
    svg.appendChild(hl);
    // 图例（Legend）
    svg.appendChild(svgEl('rect', { x: 300, y: 70, width: 14, height: 14, fill: BLUE }));
    svg.appendChild(txt(320, 81, '匹配的图文对：拉近', 11));
    svg.appendChild(svgEl('rect', { x: 300, y: 96, width: 14, height: 14, fill: MUTE, opacity: '0.5' }));
    svg.appendChild(txt(320, 107, '不匹配的图文对：推远', 11));
    svg.appendChild(txt(300, 150, '每行、每列分别计算 Softmax', 10));
    svg.appendChild(txt(300, 166, '提高对角线上的分数', 10));
    host.appendChild(shell('CLIP · 对比矩阵（Contrastive Matrix）', '匹配的图文对位于对角线', svg,
      '对比语言图像预训练（Contrastive Language-Image Pre-training，CLIP）把图像与说明文字嵌入同一个共享空间。对于含 N 对图文的批次，它构建 N×N 相似度矩阵（Similarity Matrix），通过训练提高对角线上真实配对的分数，降低所有非对角线项的分数。匹配对被拉近、不匹配对被推远时，对角线逐渐变亮。'));
  }

  // ── metric-embedding (20): 点按类别聚集，查询点寻找近邻（Neighbours） ──
  function metricEmbedding(host) {
    var svg = svgEl('svg', { viewBox: '0 0 520 240' });
    svg.appendChild(txt(14, 16, '嵌入空间（Embedding Space）：度量学习拉近同类样本'));
    // 三个簇（Clusters）：起点分散，终点紧密
    var clusters = [
      { cx: 130, cy: 150, fill: BLUE, start: [[60, 60], [200, 90], [90, 200], [180, 190], [50, 130]] },
      { cx: 300, cy: 90, fill: WARN, start: [[360, 180], [240, 200], [330, 200], [380, 60], [260, 50]] },
      { cx: 400, cy: 170, fill: INK, start: [[330, 70], [460, 70], [450, 200], [340, 210], [410, 60]] }
    ];
    clusters.forEach(function (cl) {
      cl.start.forEach(function (s, i) {
        var ang = i / cl.start.length * 6.28;
        var ex = cl.cx + Math.cos(ang) * 22;
        var ey = cl.cy + Math.sin(ang) * 22;
        var dot = svgEl('circle', { cx: s[0], cy: s[1], r: '5', fill: cl.fill, opacity: '0.85' });
        dot.appendChild(anim('cx', s[0] + ';' + ex.toFixed(0) + ';' + ex.toFixed(0) + ';' + s[0], '6s', { calcMode: 'spline', keySplines: '.4 0 .2 1;0 0 1 1;.4 0 .2 1', keyTimes: '0;0.4;0.7;1' }));
        dot.appendChild(anim('cy', s[1] + ';' + ey.toFixed(0) + ';' + ey.toFixed(0) + ';' + s[1], '6s', { calcMode: 'spline', keySplines: '.4 0 .2 1;0 0 1 1;.4 0 .2 1', keyTimes: '0;0.4;0.7;1' }));
        svg.appendChild(dot);
      });
    });
    // 簇收紧后，查询点及 top-k 环向外展开
    var q = svgEl('circle', { cx: 130, cy: 150, r: '6', fill: 'none', stroke: WARN, 'stroke-width': '2.5' });
    svg.appendChild(q);
    var ring = svgEl('circle', { cx: 130, cy: 150, r: '5', fill: 'none', stroke: WARN, 'stroke-width': '1.5', opacity: '0' });
    ring.appendChild(anim('r', '5;5;48;48', '6s', { keyTimes: '0;0.45;0.65;1' }));
    ring.appendChild(anim('opacity', '0;0;0.9;0', '6s', { keyTimes: '0;0.45;0.65;1' }));
    svg.appendChild(ring);
    svg.appendChild(txt(130, 230, '查询 → 余弦距离最近的邻居 = 同类样本', 10));
    host.appendChild(shell('度量学习（Metric Learning）· 检索（Retrieval）', '同类样本聚集，查询圈出邻居', svg,
      '检索按嵌入空间（Embedding Space）中的距离对候选项排序。度量学习（Metric Learning）塑造这个空间：三元组损失（Triplet Loss）或对比损失（Contrastive Loss）拉近同类样本、推远不同类别的样本。当簇足够紧密时，按余弦距离（Cosine Distance）找到的查询近邻，就能可靠地对应正确答案。'));
  }

  // ── depth-rays (26): RGB 网格 → 深度梯度（Depth gradient），扫描按距离着色 ──
  function depthSweep(host) {
    var svg = svgEl('svg', { viewBox: '0 0 520 230' });
    svg.appendChild(txt(14, 16, 'RGB 图像帧'));
    svg.appendChild(txt(300, 16, '预测深度（近 → 远）'));
    var N = 6, cell = 28, gx = 14, gy = 28, gx2 = 300;
    // 每个单元的深度值：场景向右上方延伸（天空远，地面近）
    var depthOf = function (r, c) { return (c * 0.6 + (5 - r) * 0.7) / 6.6; };
    var r, c;
    for (r = 0; r < N; r++) for (c = 0; c < N; c++) {
      // 左侧：较平坦的 RGB 纹理（Texture）
      svg.appendChild(svgEl('rect', { x: gx + c * cell, y: gy + r * cell, width: cell - 1.5, height: cell - 1.5, fill: BLUE, opacity: (0.2 + 0.35 * ((r * 3 + c) % 4) / 4).toFixed(3) }));
      // 右侧：竖直扫描线扫过时，深度单元显现
      var d = depthOf(r, c);
      var col = d < 0.4 ? WARN : (d < 0.7 ? BLUE : INK);
      var op = (0.25 + 0.6 * (1 - d)).toFixed(3); // 较近 = 较亮
      var dep = svgEl('rect', { x: gx2 + c * cell, y: gy + r * cell, width: cell - 1.5, height: cell - 1.5, fill: col, opacity: '0' });
      var reveal = Math.min(0.85, c / N);
      dep.appendChild(anim('opacity', '0;0;' + op + ';' + op, '4s', { keyTimes: '0;' + reveal.toFixed(2) + ';' + (reveal + 0.12).toFixed(2) + ';1' }));
      svg.appendChild(dep);
    }
    // 扫描线从左→右扫过深度图（Depth map）
    var scan = svgEl('line', { x1: gx2, y1: gy, x2: gx2, y2: gy + N * cell, stroke: WARN, 'stroke-width': '2.5' });
    scan.appendChild(anim('x1', gx2 + ';' + (gx2 + N * cell), '4s'));
    scan.appendChild(anim('x2', gx2 + ';' + (gx2 + N * cell), '4s'));
    svg.appendChild(scan);
    // 深度图例条
    svg.appendChild(svgEl('rect', { x: 14, y: 206, width: 20, height: 10, fill: WARN }));
    svg.appendChild(txt(38, 215, '近', 9));
    svg.appendChild(svgEl('rect', { x: 78, y: 206, width: 20, height: 10, fill: BLUE }));
    svg.appendChild(txt(102, 215, '中', 9));
    svg.appendChild(svgEl('rect', { x: 138, y: 206, width: 20, height: 10, fill: INK }));
    svg.appendChild(txt(162, 215, '远', 9));
    svg.appendChild(txt(230, 215, '单帧 RGB → 逐像素距离，无需双目或激光雷达', 9));
    host.appendChild(shell('单目深度（Monocular Depth）', '输入一帧，输出每个像素的距离', svg,
      '单目深度模型（Monocular Depth Model）把单帧 RGB 图像映射为每个像素的距离。冻结的视觉 Transformer（Vision Transformer，ViT）编码器读取透视、纹理及已学到的场景先验（Scene Priors），轻量解码器再通过上采样生成稠密深度图（Dense Depth Map）。近处表面较亮，远处较暗；整个过程只需一张图像，无需双目设备或深度传感器。'));
  }

  LF.register({
    'object-detection-nms': objectDetectionNms,
    'segmentation-flood': segmentationFlood,
    'cv-gan-image': ganMinimax,
    'cv-diffusion-image': diffusionDenoise,
    'nerf-rays': nerfRays,
    'clip-contrastive': clipContrastive,
    'metric-embedding': metricEmbedding,
    'depth-sweep': depthSweep
  });
})();
