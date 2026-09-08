/* figures-cv3.js — 阶段 4（计算机视觉（Computer vision））第二批 SVG 动画课程图表。
   在 lesson-figures.js 之后加载，通过
   window.LF 注册组件。每张图都是自动播放的 SMIL 动画，展示一个计算机视觉（CV）概念：
   不使用 JS 定时器或计算循环。原生 ES5，无依赖，主题由 CSS 变量控制。
   编写时仍在 docs/en.md 中使用相同的围栏块：
       ```figure
       cv3-roialign-sampling
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
  function txt(x, y, s, size, anchor) {
    return svgEl('text', { x: x, y: y, fill: 'var(--ink-mute,#777)', 'font-size': size || 10, 'font-family': 'monospace', 'text-anchor': anchor || 'start' }, [document.createTextNode(s)]);
  }
  var BLUE = 'var(--blueprint,#3553ff)', INK = 'var(--ink,#1a1a1a)', SOFT = 'var(--rule-soft,#ddd)', WARN = 'var(--warn,#b8870f)', MUTE = 'var(--ink-mute,#777)';

  // ── cv3-roialign-sampling (08): 候选框（Proposal box）的采样点不落在网格上 ──
  function roialignSampling(host) {
    var svg = svgEl('svg', { viewBox: '0 0 520 240' });
    svg.appendChild(txt(14, 16, '特征图（Feature Map）· 整数像素网格'));
    var gx = 18, gy = 26, cell = 30, N = 6, r, c;
    for (r = 0; r < N; r++) for (c = 0; c < N; c++) {
      svg.appendChild(svgEl('rect', { x: gx + c * cell, y: gy + r * cell, width: cell, height: cell, fill: BLUE, opacity: (0.06 + 0.12 * ((r * 2 + c) % 4)).toFixed(3), stroke: SOFT, 'stroke-width': '0.6' }));
    }
    // 角点坐标带小数的候选框，略微滑动以展示错位（Misalignment）
    var box = svgEl('rect', { x: 70, y: 64, width: 118, height: 110, fill: 'none', stroke: WARN, 'stroke-width': '2', 'stroke-dasharray': '5 3' });
    box.appendChild(anim('x', '70;78;70', '5s', { keyTimes: '0;0.5;1' }));
    svg.appendChild(box);
    svg.appendChild(txt(70, 60, '候选区域（RoI）：非整数坐标', 9));
    // 四个双线性采样点（Bilinear sample points），各自与读取的四个相邻单元同步脉动
    var pts = [[100, 94], [150, 94], [100, 144], [150, 144]];
    pts.forEach(function (p, i) {
      var d = svgEl('circle', { cx: p[0], cy: p[1], r: '4', fill: WARN, opacity: '0' });
      d.appendChild(anim('opacity', '0;0;1;1', '5s', { begin: (i * 0.2) + 's', keyTimes: '0;0.25;0.4;1' }));
      svg.appendChild(d);
      // 连向周围四个整数坐标单元中心的十字线（双线性权重（Bilinear weights））
      var ring = svgEl('circle', { cx: p[0], cy: p[1], r: '14', fill: 'none', stroke: WARN, 'stroke-width': '1', opacity: '0' });
      ring.appendChild(anim('opacity', '0;0;0.6;0;0', '5s', { begin: (i * 0.2) + 's', keyTimes: '0;0.4;0.55;0.8;1' }));
      svg.appendChild(ring);
    });
    // 输出：右侧清晰、固定大小的 2x2 池化网格（Pooled grid）
    svg.appendChild(txt(320, 60, '对齐后的 2×2 输出', 9));
    var ox = 330, oy = 70, oc = 44, rr, cc;
    for (rr = 0; rr < 2; rr++) for (cc = 0; cc < 2; cc++) {
      var o = svgEl('rect', { x: ox + cc * oc, y: oy + rr * oc, width: oc - 3, height: oc - 3, fill: BLUE, stroke: BLUE, opacity: '0' });
      o.appendChild(anim('opacity', '0;0;0.7;0.7', '5s', { keyTimes: '0;0.55;0.75;1' }));
      svg.appendChild(o);
    }
    // 从 RoI 指向输出的箭头
    var arr = svgEl('line', { x1: 196, y1: 120, x2: 322, y2: 120, stroke: MUTE, 'stroke-width': '1.5', 'stroke-dasharray': '130', 'stroke-dashoffset': '130' });
    arr.appendChild(anim('stroke-dashoffset', '130;130;0;0', '5s', { keyTimes: '0;0.45;0.7;1' }));
    svg.appendChild(arr);
    svg.appendChild(txt(320, 176, '双线性插值', 10));
    svg.appendChild(txt(320, 191, '边界框坐标不取整', 10));
    host.appendChild(shell('Mask R-CNN · 感兴趣区域对齐（RoIAlign）', '采样点可以落在像素之间', svg,
      '感兴趣区域池化（RoIPool）两次将候选框对齐到整数特征网格，取整会给掩码带来亚像素级偏移。感兴趣区域对齐（RoIAlign）保留非整数坐标：在每个输出分箱（Bin）中放置固定的采样点，通过四个相邻单元的双线性插值（Bilinear Interpolation）读取每个点的值。无需取整，掩码便能准确落在目标所在位置。'));
  }

  // ── cv3-latent-compression (11): 图像网格压缩为小型潜表示（Latent），再还原 ──
  function latentCompression(host) {
    var svg = svgEl('svg', { viewBox: '0 0 520 230' });
    svg.appendChild(txt(14, 16, '3 x 512 x 512 图像'));
    svg.appendChild(txt(220, 16, '4 x 64 x 64 潜变量'));
    svg.appendChild(txt(380, 16, '解码后的图像'));
    // 左侧大网格（以 8x8 示意），编码器读取各单元时使其淡出
    var i;
    function grid(ox, oy, n, c, fillTarget, begin, kt) {
      var r, cc;
      for (r = 0; r < n; r++) for (cc = 0; cc < n; cc++) {
        var rect = svgEl('rect', { x: ox + cc * c, y: oy + r * c, width: c - 1.5, height: c - 1.5, fill: BLUE, opacity: '0' });
        var base = (0.18 + 0.45 * ((r * 3 + cc * 2) % 5) / 5).toFixed(2);
        rect.appendChild(anim('opacity', '0;' + base + ';' + base + ';' + base, '5s', { begin: begin, keyTimes: kt }));
        svg.appendChild(rect);
      }
    }
    grid(14, 30, 8, 21, BLUE, '0s', '0;0.12;0.9;1');
    // VAE 编码器（Encoder）楔形向小网格收缩
    var enc = svgEl('polygon', { points: '186,40 210,90 210,150 186,200', fill: BLUE, opacity: '0.16', stroke: BLUE });
    svg.appendChild(enc);
    svg.appendChild(txt(186, 210, 'VAE 编码器', 9));
    // 小型潜表示网格 (4x4)，楔形传递时变亮
    var lx = 224, ly = 70, lc = 22, r, cc;
    for (r = 0; r < 4; r++) for (cc = 0; cc < 4; cc++) {
      var lr = svgEl('rect', { x: lx + cc * lc, y: ly + r * lc, width: lc - 2, height: lc - 2, fill: WARN, opacity: '0' });
      var v = (0.3 + 0.5 * ((r * 5 + cc * 3) % 4) / 4).toFixed(2);
      lr.appendChild(anim('opacity', '0;0;' + v + ';' + v, '5s', { keyTimes: '0;0.3;0.45;1' }));
      svg.appendChild(lr);
    }
    // 解码器（Decoder）楔形重新向外展开
    var dec = svgEl('polygon', { points: '326,90 350,40 350,200 326,150', fill: BLUE, opacity: '0.16', stroke: BLUE });
    svg.appendChild(dec);
    svg.appendChild(txt(322, 210, 'VAE 解码器', 9));
    grid(360, 30, 8, 20, BLUE, '0s', '0;0.55;0.78;1');
    svg.appendChild(txt(100, 226, '(3*512*512)/(4*64*64) = 48，去噪计算量降至 1/48', 9));
    host.appendChild(shell('Stable Diffusion · 潜空间（Latent Space）', '在 64×64 潜空间中执行扩散', svg,
      '像素空间扩散每一步都要对 786,432 个数值执行反向传播（Backpropagation）。Stable Diffusion 训练变分自编码器（Variational Autoencoder，VAE），将 3×512×512 图像压缩为 4×64×64 潜变量（Latent），即中间的小橙色网格。在其中完成整个去噪循环后，再解码回像素空间。潜变量上的注意力计算成本降至原来的 1/48，使开放权重的文生图（Text-to-image）模型具备实用性。'));
  }

  // ── cv3-ctc-collapse (19): 逐帧字符预测折叠（Collapse）为字符串 ──
  function ctcCollapse(host) {
    var svg = svgEl('svg', { viewBox: '0 0 520 230' });
    svg.appendChild(txt(14, 16, 'CRNN 逐帧预测：每列对应一个时间步'));
    var labels = ['h', 'h', '_', 'e', 'l', 'l', '_', 'l', 'o', 'o'];
    var x0 = 22, cw = 44, top = 40;
    var i;
    for (i = 0; i < labels.length; i++) {
      var cx = x0 + i * cw;
      var box = svgEl('rect', { x: cx, y: top, width: cw - 6, height: 34, fill: labels[i] === '_' ? MUTE : BLUE, opacity: '0' });
      box.appendChild(anim('opacity', '0;0.8;0.8', '5s', { begin: (i * 0.08) + 's', keyTimes: '0;0.18;1' }));
      svg.appendChild(box);
      var t = svgEl('text', { x: cx + (cw - 6) / 2, y: top + 23, fill: 'var(--bg,#fafaf5)', 'font-size': '14', 'font-family': 'monospace', 'text-anchor': 'middle', opacity: '0' }, [document.createTextNode(labels[i] === '_' ? 'ε' : labels[i])]);
      t.appendChild(anim('opacity', '0;1;1', '5s', { begin: (i * 0.08) + 's', keyTimes: '0;0.2;1' }));
      svg.appendChild(t);
    }
    // 步骤 1 标签：合并重复；步骤 2：删除空白。动画括号从下方扫过
    svg.appendChild(txt(14, 100, '规则 1 · 合并相邻的重复标签', 10));
    svg.appendChild(txt(14, 116, '规则 2 · 删除空白符 ε', 10));
    var sweep = svgEl('rect', { x: x0, y: top, width: cw - 6, height: 34, fill: 'none', stroke: WARN, 'stroke-width': '2.5' });
    var path = 'M 0 0';
    for (i = 1; i < labels.length; i++) path += ' L ' + (i * cw) + ' 0';
    var mp = svgEl('animateMotion', { dur: '5s', repeatCount: 'indefinite', path: path, keyTimes: '0;0.2;0.95;1', keyPoints: '0;0;1;1', calcMode: 'linear' });
    sweep.appendChild(mp);
    svg.appendChild(sweep);
    // 折叠后的结果，字符逐个落入
    var out = 'hello';
    var ox = 180, oy = 175;
    for (i = 0; i < out.length; i++) {
      var oc = svgEl('text', { x: ox + i * 30, y: oy, fill: BLUE, 'font-size': '28', 'font-family': 'monospace', opacity: '0' }, [document.createTextNode(out[i])]);
      oc.appendChild(anim('opacity', '0;0;1;1', '5s', { keyTimes: '0;0.6;' + (0.7 + i * 0.04).toFixed(2) + ';1' }));
      svg.appendChild(oc);
    }
    svg.appendChild(txt(180, 200, 'h h ε e l l ε l o o  ->  "hello"', 10));
    host.appendChild(shell('光学字符识别（OCR）· CTC 折叠', '将逐帧标签合并成字符串', svg,
      '卷积循环神经网络（Convolutional Recurrent Neural Network，CRNN）在每个时间步输出一个字符或空白符 ε，与输入之间没有固定对齐。连接时序分类（Connectionist Temporal Classification，CTC）定义了折叠规则：先合并连续相同的标签，再删除空白符。两段 l 之间的空白符，使 "hello" 不会被折叠成 "helo"。训练时，对所有能折叠为目标序列的对齐方式求和。'));
  }

  // ── cv3-pose-heatmap (21): 高斯峰（Gaussian peak）变清晰，骨架逐渐绘出 ──
  function poseHeatmap(host) {
    var svg = svgEl('svg', { viewBox: '0 0 520 250' });
    svg.appendChild(txt(14, 16, '逐关键点热力图（argmax = 关节）'));
    svg.appendChild(txt(300, 16, '连接成骨架（Skeleton）'));
    // 左侧：模糊的热力图（Heatmap）团块收紧为峰
    var hx = 90, hy = 110;
    var blob = svgEl('circle', { cx: hx, cy: hy, r: '46', fill: WARN, opacity: '0.18' });
    blob.appendChild(anim('r', '46;46;20;20', '5s', { keyTimes: '0;0.3;0.55;1' }));
    blob.appendChild(anim('opacity', '0.16;0.16;0.4;0.4', '5s', { keyTimes: '0;0.3;0.55;1' }));
    svg.appendChild(blob);
    var peak = svgEl('circle', { cx: hx, cy: hy, r: '5', fill: WARN, opacity: '0' });
    peak.appendChild(anim('opacity', '0;0;1;1', '5s', { keyTimes: '0;0.5;0.6;1' }));
    svg.appendChild(peak);
    svg.appendChild(txt(60, 180, 'K 张热力图中的一张', 9));
    // 右侧：约 17 个关节；使用由关节与骨骼组成的紧凑骨架
    var J = {
      head: [400, 50], neck: [400, 78], sho_l: [372, 86], sho_r: [428, 86],
      elb_l: [360, 122], elb_r: [440, 122], hip_l: [384, 140], hip_r: [416, 140],
      kne_l: [380, 184], kne_r: [420, 184], ank_l: [378, 222], ank_r: [422, 222]
    };
    var bones = [['head', 'neck'], ['neck', 'sho_l'], ['neck', 'sho_r'], ['sho_l', 'elb_l'], ['sho_r', 'elb_r'],
      ['neck', 'hip_l'], ['neck', 'hip_r'], ['hip_l', 'kne_l'], ['hip_r', 'kne_r'], ['kne_l', 'ank_l'], ['kne_r', 'ank_r']];
    bones.forEach(function (b, i) {
      var a = J[b[0]], z = J[b[1]];
      var len = Math.round(Math.hypot(z[0] - a[0], z[1] - a[1])) + 2;
      var ln = svgEl('line', { x1: a[0], y1: a[1], x2: z[0], y2: z[1], stroke: BLUE, 'stroke-width': '2.4', 'stroke-dasharray': len, 'stroke-dashoffset': len });
      ln.appendChild(anim('stroke-dashoffset', len + ';' + len + ';0;0', '5s', { begin: (i * 0.06) + 's', keyTimes: '0;0.4;0.75;1' }));
      svg.appendChild(ln);
    });
    var k;
    for (k in J) {
      var d = svgEl('circle', { cx: J[k][0], cy: J[k][1], r: '3.4', fill: WARN, opacity: '0' });
      d.appendChild(anim('opacity', '0;0;1;1', '5s', { keyTimes: '0;0.45;0.6;1' }));
      svg.appendChild(d);
    }
    svg.appendChild(txt(60, 236, '每个关节回归一个高斯峰，取 argmax 所在像素', 9));
    host.appendChild(shell('姿态估计（Pose Estimation）· 热力图回归（Heatmap Regression）', '定位峰值，连接骨架', svg,
      '姿态模型不直接回归坐标，而是为每个关键点输出一张热力图（Heatmap），训练时使高斯峰位于真实关节处；最大值对应的像素，也就是 argmax，给出坐标。确定全部 K 个峰值后，通过固定的人体连接图以自顶向下（Top-down）方式连接关节，或通过关联场（Association Fields）以自底向上（Bottom-up）方式组装骨架。'));
  }

  // ── cv3-gaussian-splat (22): 重叠团块通过透明度合成（Alpha-composite）构成场景 ──
  function gaussianSplat(host) {
    var svg = svgEl('svg', { viewBox: '0 0 520 240' });
    svg.appendChild(txt(14, 16, '带方向的三维高斯集合：排序后进行透明度合成'));
    // 一组椭圆泼溅（Splats）从前向后依次淡入，构成形状
    var splats = [
      [150, 150, 70, 40, 18, BLUE, 0.22], [210, 110, 55, 34, -22, BLUE, 0.26],
      [280, 150, 64, 38, 8, WARN, 0.24], [330, 110, 46, 30, 30, BLUE, 0.28],
      [200, 175, 50, 26, -10, INK, 0.2], [300, 95, 40, 24, 14, WARN, 0.3],
      [250, 140, 78, 44, 0, BLUE, 0.18], [360, 160, 44, 30, -18, INK, 0.22]
    ];
    splats.forEach(function (s, i) {
      var g = svgEl('ellipse', { cx: s[0], cy: s[1], rx: s[2], ry: s[3], fill: s[5], opacity: '0', transform: 'rotate(' + s[4] + ' ' + s[0] + ' ' + s[1] + ')' });
      g.appendChild(anim('opacity', '0;0;' + s[6] + ';' + s[6], '5s', { begin: (i * 0.18) + 's', keyTimes: '0;0.1;0.4;1' }));
      svg.appendChild(g);
    });
    // 一条从前向后扫动的“深度排序（Depth sort）”线
    var sort = svgEl('line', { x1: 130, y1: 60, x2: 130, y2: 210, stroke: WARN, 'stroke-width': '1.5', opacity: '0.7' });
    sort.appendChild(anim('x1', '130;390;390', '5s', { keyTimes: '0;0.55;1' }));
    sort.appendChild(anim('x2', '130;390;390', '5s', { keyTimes: '0;0.55;1' }));
    svg.appendChild(sort);
    svg.appendChild(txt(420, 70, '每个高斯：', 9));
    svg.appendChild(txt(420, 86, 'mu, R, s,', 9));
    svg.appendChild(txt(420, 100, 'alpha, SH', 9));
    svg.appendChild(txt(420, 124, '执行光栅化', 9));
    svg.appendChild(txt(420, 138, '无需射线步进', 9));
    svg.appendChild(txt(14, 228, '无需逐射线查询 MLP；投影到二维并混合，速度超过 100 帧/秒', 9));
    host.appendChild(shell('三维高斯泼溅（3D Gaussian Splatting）', '投影并混合高斯，无需射线步进', svg,
      '场景由数百万个三维高斯组成，每个高斯包含中心、由旋转与尺度确定的协方差、不透明度，以及随视角变化的颜色。渲染时，将每个高斯投影为二维椭圆，按深度排序，再从前到后进行透明度合成（Alpha Compositing）。同样的混合效果，NeRF 需要数百次 MLP 查询才能近似。因此，高斯泼溅可以达到每秒 100 帧以上，并在几分钟内完成训练。'));
  }

  // ── cv3-rectified-flow (23): 直线与弯曲扩散路径对比，noise->data ──
  function rectifiedFlow(host) {
    var svg = svgEl('svg', { viewBox: '0 0 520 240' });
    var nx = 70, ny = 180, dx = 440, dy = 70;
    svg.appendChild(svgEl('circle', { cx: nx, cy: ny, r: '7', fill: MUTE }));
    svg.appendChild(txt(40, 205, 'x_T 噪声'));
    svg.appendChild(svgEl('circle', { cx: dx, cy: dy, r: '7', fill: BLUE }));
    svg.appendChild(txt(412, 60, 'x_0 数据'));
    // 弯曲的 DDPM 轨迹（Trajectory），包含许多小步
    var curve = 'M 70 180 C 120 60, 220 230, 300 90 S 400 140, 440 70';
    var cv = svgEl('path', { d: curve, fill: 'none', stroke: MUTE, 'stroke-width': '1.6', 'stroke-dasharray': '5 4', opacity: '0.7' });
    svg.appendChild(cv);
    svg.appendChild(txt(120, 130, 'DDPM：弯曲路径，约 1000 步', 10));
    // 圆点以许多小跳跃沿曲线前进
    var slow = svgEl('circle', { r: '4', fill: MUTE });
    var sm = svgEl('animateMotion', { dur: '5s', repeatCount: 'indefinite', path: curve, keyTimes: '0;0.1;0.2;0.3;0.4;0.5;0.6;0.7;0.8;0.9;1', keyPoints: '0;0.1;0.2;0.3;0.4;0.5;0.6;0.7;0.8;0.9;1', calcMode: 'discrete' });
    slow.appendChild(sm);
    svg.appendChild(slow);
    // 整流流（Rectified-flow）的直线路径
    var line = 'M 70 180 L 440 70';
    var st = svgEl('path', { d: line, fill: 'none', stroke: BLUE, 'stroke-width': '2.4', 'stroke-dasharray': '388', 'stroke-dashoffset': '388' });
    st.appendChild(anim('stroke-dashoffset', '388;0;0', '5s', { keyTimes: '0;0.5;1' }));
    svg.appendChild(st);
    svg.appendChild(txt(250, 165, '整流流（Rectified Flow）：直线，约 20 步', 10));
    // 沿直线进行几次大跳跃
    var fast = svgEl('circle', { r: '5', fill: BLUE });
    var fm = svgEl('animateMotion', { dur: '5s', repeatCount: 'indefinite', path: line, keyTimes: '0;0.25;0.5;0.75;1', keyPoints: '0;0.25;0.5;0.75;1', calcMode: 'discrete' });
    fast.appendChild(fm);
    svg.appendChild(fast);
    host.appendChild(shell('整流流（Rectified Flow）', '拉直路径，用 20 步完成采样', svg,
      '去噪扩散概率模型（Denoising Diffusion Probabilistic Model，DDPM）学习从噪声到数据的弯曲轨迹，要准确积分，需要数百个小步。整流流（Rectified Flow）则训练模型沿噪声样本与数据点之间的直线运动。直线路径所需的积分步数少得多，因此 SD3 和 FLUX 能以 20 步完成采样，蒸馏后仅需 1–4 步，而非 1000 步。'));
  }

  // ── cv3-open-vocab (24): 文本提示词（Prompt）点亮场景中匹配的对象 ──
  function openVocab(host) {
    var svg = svgEl('svg', { viewBox: '0 0 520 230' });
    // 提示词胶囊标签
    svg.appendChild(svgEl('rect', { x: 14, y: 18, width: 150, height: 26, rx: '13', fill: BLUE, opacity: '0.16', stroke: BLUE }));
    svg.appendChild(svgEl('text', { x: 26, y: 36, fill: BLUE, 'font-size': '13', 'font-family': 'monospace' }, [document.createTextNode('提示词："orange"')]));
    // 场景（Scene）
    svg.appendChild(svgEl('rect', { x: 14, y: 56, width: 360, height: 160, fill: 'var(--bg-surface,#eee)', stroke: SOFT }));
    // 对象：三个橙子（匹配）与两个干扰物（苹果、箱子）
    var objs = [
      [70, 110, 'orange', true], [150, 160, 'orange', true], [250, 100, 'orange', true],
      [320, 170, 'apple', false], [110, 190, 'box', false]
    ];
    objs.forEach(function (o, i) {
      var match = o[3];
      if (o[2] === 'box') {
        svg.appendChild(svgEl('rect', { x: o[0] - 16, y: o[1] - 16, width: 32, height: 32, fill: INK, opacity: '0.35' }));
      } else {
        svg.appendChild(svgEl('circle', { cx: o[0], cy: o[1], r: '18', fill: match ? WARN : MUTE, opacity: '0.4' }));
      }
      // 仅在匹配对象上出现的掩码（Mask）轮廓，带实例 ID
      if (match) {
        var ring = svgEl('circle', { cx: o[0], cy: o[1], r: '22', fill: 'none', stroke: WARN, 'stroke-width': '2.4', 'stroke-dasharray': '138', 'stroke-dashoffset': '138' });
        ring.appendChild(anim('stroke-dashoffset', '138;138;0;0', '5s', { begin: (i * 0.25) + 's', keyTimes: '0;0.3;0.6;1' }));
        svg.appendChild(ring);
        var id = svgEl('text', { x: o[0], y: o[1] - 28, fill: WARN, 'font-size': '10', 'font-family': 'monospace', 'text-anchor': 'middle', opacity: '0' }, [document.createTextNode('#' + (i + 1))]);
        id.appendChild(anim('opacity', '0;0;1;1', '5s', { begin: (i * 0.25) + 's', keyTimes: '0;0.55;0.7;1' }));
        svg.appendChild(id);
      }
    });
    // 单次前向传播（Forward pass）箭头
    svg.appendChild(txt(390, 80, '一次前向', 10));
    svg.appendChild(txt(390, 95, '传播输出：', 10));
    svg.appendChild(txt(390, 120, '全部匹配目标的', 10));
    svg.appendChild(txt(390, 135, '掩码 +', 10));
    svg.appendChild(txt(390, 150, '实例标识', 10));
    svg.appendChild(txt(14, 227, '无需级联检测器：输入文本，输出全部匹配掩码', 9));
    host.appendChild(shell('SAM 3 · 开放词汇分割（Open-vocabulary Segmentation）', '用名词短语选出全部匹配对象', svg,
      '可提示概念分割（Promptable Concept Segmentation）接收一个简短的名词短语，一次前向传播就返回所有匹配目标的掩码与实例标识（Instance IDs）。这里的 "orange" 表示橙子：灰色苹果和盒子未被选中，三个橙子则被描边并编号。早期系统把文本定位检测器与独立分割器串联，误差会在衔接处累积；SAM 3 将这套级联流程合并为一个模型。'));
  }

  // ── cv3-track-assoc (27): 通过交并比（IoU）将第 t 帧检测与 t-1 的轨迹匹配 ──
  function trackAssoc(host) {
    var svg = svgEl('svg', { viewBox: '0 0 520 240' });
    svg.appendChild(txt(14, 16, 't-1 时刻轨迹（实线）与 t 时刻检测框（虚线），按 IoU 匹配'));
    // 三个带 ID 的预测轨迹框（实线），附近有三个检测框（虚线）
    var tracks = [[60, 60, 70, 60, '#1', BLUE], [220, 90, 64, 64, '#2', BLUE], [360, 70, 72, 58, '#3', BLUE]];
    var dets = [[70, 68, 70, 60], [230, 100, 64, 64], [372, 80, 72, 58]];
    tracks.forEach(function (t, i) {
      svg.appendChild(svgEl('rect', { x: t[0], y: t[1], width: t[2], height: t[3], fill: 'none', stroke: t[5], 'stroke-width': '2' }));
      svg.appendChild(svgEl('text', { x: t[0] + 4, y: t[1] - 4, fill: t[5], 'font-size': '11', 'font-family': 'monospace' }, [document.createTextNode(t[4])]));
      // 检测框从偏移处滑动到与轨迹重叠的位置，完成匹配
      var d = dets[i];
      var box = svgEl('rect', { x: d[0] + 26, y: d[1] + 22, width: d[2], height: d[3], fill: 'none', stroke: WARN, 'stroke-width': '1.6', 'stroke-dasharray': '5 3' });
      box.appendChild(anim('x', (d[0] + 26) + ';' + d[0] + ';' + d[0], '5s', { begin: (i * 0.15) + 's', keyTimes: '0;0.55;1' }));
      box.appendChild(anim('y', (d[1] + 22) + ';' + d[1] + ';' + d[1], '5s', { begin: (i * 0.15) + 's', keyTimes: '0;0.55;1' }));
      svg.appendChild(box);
      // 对齐后出现“已匹配”勾号，并沿用原 ID
      var id = svgEl('text', { x: d[0] + d[2] / 2, y: d[1] + d[3] + 18, fill: WARN, 'font-size': '10', 'font-family': 'monospace', 'text-anchor': 'middle', opacity: '0' }, [document.createTextNode('保留 ' + t[4])]);
      id.appendChild(anim('opacity', '0;0;1;1', '5s', { begin: (i * 0.15) + 's', keyTimes: '0;0.6;0.75;1' }));
      svg.appendChild(id);
    });
    // 底部的代价矩阵（Cost matrix）/匈牙利算法（Hungarian）提示
    svg.appendChild(txt(14, 196, 'IoU 代价矩阵 → 匈牙利算法分配 → 跨帧保持标识', 10));
    var bx = 14, by = 206;
    var rr, cc;
    for (rr = 0; rr < 3; rr++) for (cc = 0; cc < 3; cc++) {
      var on = rr === cc;
      var cellr = svgEl('rect', { x: bx + cc * 18, y: by + rr * 9, width: 16, height: 7, fill: on ? BLUE : MUTE, opacity: '0' });
      cellr.appendChild(anim('opacity', '0;0;' + (on ? '0.9' : '0.2') + ';' + (on ? '0.9' : '0.2'), '5s', { keyTimes: '0;0.6;0.75;1' }));
      svg.appendChild(cellr);
    }
    host.appendChild(shell('多目标跟踪（Multi-object Tracking）· 关联（Association）', '检测框匹配轨迹，标识跨帧延续', svg,
      '基于检测的跟踪（Tracking-by-detection）逐帧运行检测器，再判断新框对应哪条已有轨迹。它用交并比（Intersection over Union，IoU），通常再结合运动和外观信息，为每个轨迹与检测框的组合打分，通过匈牙利算法（Hungarian Algorithm）求解分配，并沿用匹配轨迹的标识。未匹配的检测框建立新轨迹，持续未匹配的轨迹则过期移除。最终要得到的是持续一致的身份，而不只是边界框。'));
  }

  LF.register({
    'cv3-roialign-sampling': roialignSampling,
    'cv3-latent-compression': latentCompression,
    'cv3-ctc-collapse': ctcCollapse,
    'cv3-pose-heatmap': poseHeatmap,
    'cv3-gaussian-splat': gaussianSplat,
    'cv3-rectified-flow': rectifiedFlow,
    'cv3-open-vocab': openVocab,
    'cv3-track-assoc': trackAssoc
  });
})();
