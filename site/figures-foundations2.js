/* figures-foundations2.js — 阶段 4（计算机视觉（Computer vision））、阶段 6（语音与音频（Speech & audio））
   及阶段 8（生成式 AI（Generative AI））的交互课程图表。在
   lesson-figures.js 之后加载，通过 window.LF 注册组件。原生 ES5，
   无依赖，主题由 CSS 变量控制。编写时仍在 docs/en.md 中使用相同的围栏块：
       ```figure
       data-augmentation
       ```  */
(function () {
  'use strict';
  var LF = window.LF;
  if (!LF) { return; }
  var el = LF.el, svgEl = LF.svgEl, slider = LF.slider, select = LF.select;
  var clamp = LF.clamp, lerp = LF.lerp, fmtInt = LF.fmtInt;

  function shell(label, hint, grid, outKids, caption) {
    return el('div', { class: 'lf' }, [
      el('div', { class: 'lf-head' }, [el('span', { class: 'lf-label' }, [label]), el('span', {}, [hint])]),
      el('div', { class: 'lf-body' }, [grid, el('div', { class: 'lf-out' }, outKids)]),
      el('div', { class: 'lf-cap' }, [caption])
    ]);
  }
  function tx(s) { return document.createTextNode(s); }

  // ── data-augmentation: 一张源图像，四个变换后的副本 ──
  function dataAugmentation(host) {
    var SRC = [
      [0, 0, 6, 6, 0, 0],
      [0, 6, 9, 9, 3, 0],
      [6, 9, 2, 2, 9, 3],
      [3, 9, 2, 2, 9, 6],
      [0, 3, 9, 9, 6, 0],
      [0, 0, 3, 6, 0, 0]
    ];
    var N = 6;
    var state = { mode: 'flip', copies: 4 };
    var svg = svgEl('svg', { viewBox: '0 0 520 200' });
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });

    function sample(r, c, variant) {
      if (state.mode === 'flip') { return SRC[r][variant % 2 ? N - 1 - c : c]; }
      if (state.mode === 'rotate') {
        var q = variant % 4, rr = r, cc = c, t;
        while (q-- > 0) { t = rr; rr = cc; cc = N - 1 - t; }
        return SRC[rr][cc];
      }
      if (state.mode === 'crop') {
        var off = variant % 3;
        var sr = clamp(r + off - 1, 0, N - 1), sc = clamp(c + off - 1, 0, N - 1);
        return SRC[sr][sc];
      }
      var shift = (variant - 1) * 2;
      return clamp(SRC[r][c] + shift, 0, 9);
    }

    state._render = function () {
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      var gap = 16, x0 = 8, y0 = 28;
      var cell = Math.min(18, (520 - 2 * x0 - 30 - (state.copies - 1) * gap) / (N * (state.copies + 1)), (200 - y0 - 8) / N);
      svg.appendChild(svgEl('text', { x: x0, y: 18, fill: 'var(--ink-mute,#777)', 'font-size': '10', 'font-family': 'monospace' }, [tx('原图（Source）')]));
      var p, r, c;
      for (r = 0; r < N; r++) for (c = 0; c < N; c++) {
        svg.appendChild(svgEl('rect', { x: x0 + c * cell, y: y0 + r * cell, width: cell - 1, height: cell - 1, fill: 'var(--blueprint,#3553ff)', opacity: (0.08 + 0.9 * SRC[r][c] / 9).toFixed(3) }));
      }
      var bx = x0 + N * cell + 30;
      for (p = 1; p <= state.copies; p++) {
        var px0 = bx + (p - 1) * (N * cell + gap);
        svg.appendChild(svgEl('text', { x: px0, y: 18, fill: 'var(--warn,#b8870f)', 'font-size': '10', 'font-family': 'monospace' }, [tx('增强 ' + p)]));
        for (r = 0; r < N; r++) for (c = 0; c < N; c++) {
          svg.appendChild(svgEl('rect', { x: px0 + c * cell, y: y0 + r * cell, width: cell - 1, height: cell - 1, fill: 'var(--blueprint,#3553ff)', opacity: (0.08 + 0.9 * sample(r, c, p) / 9).toFixed(3) }));
        }
      }
      var base = 1000;
      meta.textContent = '每次处理产生新视图 · ' + base + ' 张图像 x ' + (state.copies + 1) + ' = ' + fmtInt(base * (state.copies + 1)) + ' 个有效样本';
      formula.textContent = 'augment(x) 改变像素但保留标签 · 模型看到更多变化，泛化（Generalization）更好';
    };
    var grid = el('div', { class: 'lf-grid' }, [
      select(state, 'mode', '变换（Transform）', [['水平翻转（Horizontal Flip）', 'flip'], ['旋转 90°（Rotate）', 'rotate'], ['随机裁剪（Random Crop）', 'crop'], ['颜色抖动（Color Jitter）', 'color']]),
      slider(state, 'copies', '增强副本数（Augmented Copies）', 1, 4, 1)
    ]);
    host.appendChild(shell('数据增强（Data Augmentation）', '选择变换',
      grid, [svg, meta, formula],
      '数据增强（Data Augmentation）对每张训练图像应用保留标签的变换，包括翻转、旋转、裁剪和颜色变化，让一个标注样本变成多个。网络不会两次看到完全相同的输入，而是学习在这些变化下仍成立的特征，从而扩大有效数据集，并在不收集更多数据的情况下抑制过拟合（Overfitting）。'));
    state._render();
  }

  // ── transfer-learning: 冻结预训练骨干（Pretrained backbone），训练头部（Head） ──
  function transferLearning(host) {
    var TOTAL = 24, FULL = 24e6;
    var state = { frozen: 18 };
    var svg = svgEl('svg', { viewBox: '0 0 520 150' });
    var num = el('span', { class: 'lf-num' });
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    function human(x) { var u = ['', 'K', 'M', 'B'], i = 0; while (x >= 1000 && i < u.length - 1) { x /= 1000; i++; } return x.toFixed(x < 10 ? 1 : 0) + u[i]; }

    state._render = function () {
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      var frozen = clamp(state.frozen, 0, TOTAL), trainable = TOTAL - frozen;
      var x0 = 30, y0 = 40, bw = 460 / TOTAL, bh = 46, i;
      for (i = 0; i < TOTAL; i++) {
        var isFrozen = i < frozen;
        svg.appendChild(svgEl('rect', { x: x0 + i * bw, y: y0, width: bw - 1.5, height: bh, fill: isFrozen ? 'var(--rule-soft,#ddd)' : 'var(--blueprint,#3553ff)', opacity: isFrozen ? '0.9' : '0.85' }));
      }
      svg.appendChild(svgEl('text', { x: x0, y: y0 - 10, fill: 'var(--ink-mute,#777)', 'font-size': '11', 'font-family': 'monospace' }, [tx('输入（Input）→ ' + frozen + ' 层冻结（灰色）· ' + trainable + ' 层可训练（蓝色）→ 任务头（Head）')]));
      var fracTrain = trainable / TOTAL;
      var trainableParams = FULL * fracTrain;
      var epochs = Math.max(2, Math.round(2 + 22 * fracTrain));
      svg.appendChild(svgEl('text', { x: x0, y: y0 + bh + 22, fill: 'var(--ink-mute,#777)', 'font-size': '11', 'font-family': 'monospace' }, [tx('梯度（Gradient）仅流经蓝色层')]));
      num.innerHTML = human(trainableParams) + ' <small>可训练参数（Trainable Params）</small>';
      meta.textContent = Math.round(fracTrain * 100) + '% 的骨干网络（Backbone）参与训练 · 小数据集上约需 ' + epochs + ' 轮（Epoch）收敛';
      formula.textContent = '冻结层保留预训练权重，不贡献梯度 · 可训练参数越少 → 所需数据与计算量越少';
    };
    var grid = el('div', {}, [slider(state, 'frozen', '冻结层数（Frozen Layers）', 0, TOTAL, 1)]);
    host.appendChild(shell('迁移学习（Transfer Learning）', '调整冻结边界',
      grid, [svg, num, meta, formula],
      '预训练骨干网络（Pretrained Backbone）已经掌握边缘、纹理和形状等通用特征。迁移学习（Transfer Learning）冻结这些底层，只针对目标任务训练顶部少数层和新的任务头（Head）。可训练参数越少，需要存储的梯度越少，拟合所需数据越少，收敛也越快；数据集很小时多冻结一些，数据量大且与原任务差异较大时少冻结一些。'));
    state._render();
  }

  // ── batchnorm-inference: 训练时的批次统计（Batch stats）与运行平均值（Running averages）对比 ──
  function batchnormInference(host) {
    var POP_MEAN = 0.0, POP_STD = 1.0;
    var state = { batch: 8, seed: 3 };
    var svg = svgEl('svg', { viewBox: '0 0 520 200' });
    var num = el('span', { class: 'lf-num' });
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    function rng(s) { var x = Math.sin(s * 12.9898) * 43758.5453; return x - Math.floor(x); }
    function gauss(s) { var u = Math.max(1e-6, rng(s)), v = rng(s + 7.13); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

    state._render = function () {
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      var W = 520, H = 200, PAD = 30, n = state.batch, i, sum = 0, sumsq = 0, xs = [];
      for (i = 0; i < n; i++) { var g = POP_MEAN + POP_STD * gauss(state.seed * 31 + i * 1.7); xs.push(g); sum += g; sumsq += g * g; }
      var bMean = sum / n, bVar = sumsq / n - bMean * bMean, bStd = Math.sqrt(Math.max(1e-6, bVar));
      function px(v) { return W / 2 + v / 4 * (W - 2 * PAD) / 2; }
      svg.appendChild(svgEl('line', { x1: PAD, y1: 70, x2: W - PAD, y2: 70, stroke: 'var(--rule-soft,#eee)', 'stroke-width': '1' }));
      for (i = 0; i < n; i++) { svg.appendChild(svgEl('circle', { cx: px(xs[i]), cy: 70, r: '4', fill: 'var(--blueprint,#3553ff)', opacity: '0.8' })); }
      svg.appendChild(svgEl('line', { x1: px(bMean), y1: 50, x2: px(bMean), y2: 90, stroke: 'var(--warn,#b8870f)', 'stroke-width': '2' }));
      svg.appendChild(svgEl('text', { x: PAD, y: 44, fill: 'var(--warn,#b8870f)', 'font-size': '11', 'font-family': 'monospace' }, [tx('训练（Training）：当前批次 μ=' + bMean.toFixed(2) + '  σ=' + bStd.toFixed(2))]));
      svg.appendChild(svgEl('line', { x1: PAD, y1: 150, x2: W - PAD, y2: 150, stroke: 'var(--rule-soft,#eee)', 'stroke-width': '1' }));
      svg.appendChild(svgEl('line', { x1: px(POP_MEAN), y1: 130, x2: px(POP_MEAN), y2: 170, stroke: 'var(--blueprint,#3553ff)', 'stroke-width': '2' }));
      svg.appendChild(svgEl('text', { x: PAD, y: 124, fill: 'var(--ink-mute,#777)', 'font-size': '11', 'font-family': 'monospace' }, [tx('推理（Inference）：滑动平均 μ=' + POP_MEAN.toFixed(2) + '  σ=' + POP_STD.toFixed(2))]));
      var err = Math.abs(bMean - POP_MEAN) + Math.abs(bStd - POP_STD);
      num.innerHTML = err.toFixed(3) + ' <small>批次与总体的差距（Batch vs Population）</small>';
      meta.textContent = n + ' 个样本/批次 · ' + (n <= 4 ? '小批次：估计噪声较大，归一化不稳定' : n >= 32 ? '大批次：估计稳定，接近总体' : '中等批次：估计可用');
      formula.textContent = '训练：用当前批次的 μ、σ 归一化 · 评估：用训练时积累的滑动平均值（Running Average）归一化';
    };
    var grid = el('div', { class: 'lf-grid' }, [
      slider(state, 'batch', '批次大小（Batch Size）', 1, 64, 1),
      slider(state, 'seed', '重新采样批次（Resample）', 1, 20, 1)
    ]);
    host.appendChild(shell('批归一化：训练与评估（BatchNorm）', '调整批次大小',
      grid, [svg, num, meta, formula],
      '训练时，批归一化（BatchNorm）用当前小批次（Mini-batch）的均值和方差归一化各激活值（橙色），同时累积滑动平均值（Running Average）。推理（Inference）时改用固定的滑动平均值（蓝色），让单个输入得到确定性的处理结果。小批次会让批次统计量噪声增大，因此过小的批次不利于 BatchNorm，也推动了组归一化（Group Norm）和层归一化（Layer Norm）的使用。'));
    state._render();
  }

  // ── ctc-collapse: 逐帧字符折叠为转写文本（Transcript） ──
  function ctcCollapse(host) {
    var FRAMES = ['_', 'h', 'h', 'e', '_', 'l', 'l', '_', 'l', 'l', 'o', 'o', '_'];
    var state = { stage: 2 };
    var svg = svgEl('svg', { viewBox: '0 0 520 170' });
    var num = el('span', { class: 'lf-num' });
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });

    function collapseRepeats(seq) {
      var out = [], prev = null, i;
      for (i = 0; i < seq.length; i++) { if (seq[i] !== prev) { out.push(seq[i]); } prev = seq[i]; }
      return out;
    }
    function removeBlanks(seq) { return seq.filter(function (c) { return c !== '_'; }); }

    state._render = function () {
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      var shown;
      if (state.stage === 0) { shown = FRAMES.slice(); }
      else if (state.stage === 1) { shown = collapseRepeats(FRAMES); }
      else { shown = removeBlanks(collapseRepeats(FRAMES)); }
      var x0 = 20, y0 = 50, cw = 36, i;
      var stageLabel = state.stage === 0 ? '原始逐帧 argmax（' + FRAMES.length + ' 帧）'
        : state.stage === 1 ? '合并相邻重复符号' : '删除空白词元（Blank Token）"_"';
      svg.appendChild(svgEl('text', { x: x0, y: 30, fill: 'var(--ink-mute,#777)', 'font-size': '11', 'font-family': 'monospace' }, [tx(stageLabel)]));
      for (i = 0; i < shown.length; i++) {
        var blank = shown[i] === '_';
        svg.appendChild(svgEl('rect', { x: x0 + i * cw, y: y0, width: cw - 4, height: 36, fill: blank ? 'var(--rule-soft,#ddd)' : 'var(--blueprint,#3553ff)', opacity: blank ? '0.7' : '0.85' }));
        svg.appendChild(svgEl('text', { x: x0 + i * cw + (cw - 4) / 2, y: y0 + 24, fill: 'var(--bg,#fafaf5)', 'font-size': '16', 'font-family': 'monospace', 'text-anchor': 'middle' }, [tx(blank ? '∅' : shown[i])]));
      }
      var transcript = removeBlanks(collapseRepeats(FRAMES)).join('');
      svg.appendChild(svgEl('text', { x: x0, y: y0 + 70, fill: 'var(--warn,#b8870f)', 'font-size': '13', 'font-family': 'monospace' }, [tx('最终转写（Transcript）："' + transcript + '"')]));
      num.innerHTML = shown.length + ' <small>个当前阶段符号（Symbols）</small>';
      meta.textContent = state.stage === 0 ? '声学模型（Acoustic Model）每个音频帧输出一个符号，包含重复与空白'
        : state.stage === 1 ? '连续重复的相同符号合为一个' : '删除空白，只留下文本';
      formula.textContent = 'CTC 解码（Decode）：先合并重复，再删除空白 · 空白让模型区分真正的重复字母';
    };
    var grid = el('div', {}, [slider(state, 'stage', '解码阶段（Decode）：0 原始 → 1 合并 → 2 最终', 0, 2, 1)]);
    host.appendChild(shell('CTC 折叠（CTC Collapse）', '逐步查看解码',
      grid, [svg, num, meta, formula],
      '连接时序分类（Connectionist Temporal Classification，CTC）让声学模型在不知道对齐关系（Alignment）的情况下，为每一帧输出一个标签。解码依次执行两步：先将连续相同符号合为一个，再删除空白词元（Blank Token）。空白不可缺少：它位于两个真正的 "l" 帧之间，使 "hello" 保留两个字母，而不会将它们合成一个。'));
    state._render();
  }

  // ── mfcc-pipeline: 频谱图（Spectrogram）→ mel → log → DCT → 保留 N 个系数 ──
  function mfccPipeline(host) {
    var state = { keep: 13 };
    var MELS = 40;
    var svg = svgEl('svg', { viewBox: '0 0 520 170' });
    var num = el('span', { class: 'lf-num' });
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });

    state._render = function () {
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      var stages = ['频谱图', '梅尔滤波器组', 'log', 'DCT', 'MFCC'];
      var x0 = 16, y0 = 30, sw = 96, gap = 4, i;
      for (i = 0; i < stages.length; i++) {
        var sx = x0 + i * (sw + gap);
        svg.appendChild(svgEl('rect', { x: sx, y: y0, width: sw, height: 40, fill: i === stages.length - 1 ? 'var(--blueprint,#3553ff)' : 'var(--bg-surface,#eee)', opacity: i === stages.length - 1 ? '0.85' : '1', stroke: 'var(--rule-soft,#ddd)', 'stroke-width': '1' }));
        svg.appendChild(svgEl('text', { x: sx + sw / 2, y: y0 + 24, fill: i === stages.length - 1 ? 'var(--bg,#fafaf5)' : 'var(--ink-soft,#555)', 'font-size': '10', 'font-family': 'monospace', 'text-anchor': 'middle' }, [tx(stages[i])]));
        if (i < stages.length - 1) {
          svg.appendChild(svgEl('text', { x: sx + sw + gap / 2 - 1, y: y0 + 26, fill: 'var(--ink-mute,#777)', 'font-size': '12', 'font-family': 'monospace', 'text-anchor': 'middle' }, [tx('→')]));
        }
      }
      var bx = 16, by = 110, bw = 488 / MELS;
      for (i = 0; i < MELS; i++) {
        var kept = i < state.keep;
        var energy = Math.exp(-i * 0.12);
        svg.appendChild(svgEl('rect', { x: bx + i * bw, y: by, width: bw - 0.8, height: 36, fill: kept ? 'var(--blueprint,#3553ff)' : 'var(--rule-soft,#ddd)', opacity: kept ? (0.3 + 0.7 * energy).toFixed(3) : '0.5' }));
      }
      svg.appendChild(svgEl('text', { x: bx, y: by - 6, fill: 'var(--ink-mute,#777)', 'font-size': '10', 'font-family': 'monospace' }, [tx('倒谱系数（Cepstral Coefficient）：蓝色保留，灰色丢弃（共 ' + MELS + ' 个）')]));
      num.innerHTML = state.keep + ' <small>个保留的 MFCC 系数（Coefficients）</small>';
      meta.textContent = '保留前 ' + state.keep + ' / ' + MELS + ' 个系数 · ' + (state.keep <= 8 ? '粗略：仅保留平滑频谱包络' : state.keep >= 26 ? '精细：包含类似音高的细节与噪声' : '语音常用范围（12–13）');
      formula.textContent = 'STFT 功率 → 梅尔滤波器组 → log → DCT → 保留低阶系数 · DCT 将包络压缩到前几个系数';
    };
    var grid = el('div', {}, [slider(state, 'keep', '保留的倒谱系数（Cepstral Coefficients）', 4, 40, 1)]);
    host.appendChild(shell('梅尔频率倒谱系数流水线（MFCC Pipeline）', '调整系数数量',
      grid, [svg, num, meta, formula],
      '梅尔频率倒谱系数（Mel-frequency Cepstral Coefficients，MFCC）采用固定流水线：先取频谱图（Spectrogram），映射到按梅尔尺度（Mel Scale）排列的滤波器，再取对数来模拟响度感知，最后应用离散余弦变换（Discrete Cosine Transform，DCT）。DCT 将平滑频谱包络（Spectral Envelope）集中到前几个系数中，因此只保留最低的 12–13 个，就能捕捉区分音素（Phoneme）的声道形状，同时丢弃高阶系数中的音高与噪声。'));
    state._render();
  }

  // ── autoencoder-bottleneck: 重建质量（Reconstruction quality）与潜在维度（Latent dim）的关系 ──
  function autoencoderBottleneck(host) {
    var DIN = 16;
    var SIGNAL = [];
    (function () { var i; for (i = 0; i < DIN; i++) { SIGNAL.push(0.5 + 0.45 * Math.sin(i * 0.9) + 0.18 * Math.sin(i * 2.7)); } })();
    var state = { latent: 4 };
    var svg = svgEl('svg', { viewBox: '0 0 520 180' });
    var num = el('span', { class: 'lf-num' });
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });

    function reconstruct(z) {
      var coeffs = [], k2;
      for (k2 = 0; k2 < z; k2++) {
        var c = 0, i2;
        for (i2 = 0; i2 < DIN; i2++) { c += (SIGNAL[i2] - 0.5) * Math.cos(Math.PI * (k2 + 0.5) * i2 / DIN); }
        coeffs.push(c * 2 / DIN);
      }
      var rec = [], i3, kk;
      for (i3 = 0; i3 < DIN; i3++) {
        var s = 0.5;
        for (kk = 0; kk < z; kk++) { s += coeffs[kk] * Math.cos(Math.PI * (kk + 0.5) * i3 / DIN); }
        rec.push(s);
      }
      return rec;
    }

    state._render = function () {
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      var rec = reconstruct(state.latent);
      var x0 = 30, y0 = 16, gw = 460, gh = 110, i;
      function px(i) { return x0 + i / (DIN - 1) * gw; }
      function py(v) { return y0 + gh - clamp(v, -0.2, 1.2) / 1.4 * gh; }
      var od = '', rd = '';
      for (i = 0; i < DIN; i++) { od += (i ? 'L' : 'M') + px(i).toFixed(1) + ' ' + py(SIGNAL[i]).toFixed(1) + ' '; rd += (i ? 'L' : 'M') + px(i).toFixed(1) + ' ' + py(rec[i]).toFixed(1) + ' '; }
      svg.appendChild(svgEl('path', { d: od, fill: 'none', stroke: 'var(--ink-mute,#999)', 'stroke-width': '2' }));
      svg.appendChild(svgEl('path', { d: rd, fill: 'none', stroke: 'var(--blueprint,#3553ff)', 'stroke-width': '2', 'stroke-dasharray': '5 3' }));
      svg.appendChild(svgEl('text', { x: x0, y: y0 + gh + 22, fill: 'var(--ink-mute,#777)', 'font-size': '11', 'font-family': 'monospace' }, [tx('灰色 = 输入（' + DIN + ' 维）· 蓝色虚线 = 重建结果，来自 ' + state.latent + ' 维瓶颈（Bottleneck）')]));
      var mse = 0;
      for (i = 0; i < DIN; i++) { mse += (rec[i] - SIGNAL[i]) * (rec[i] - SIGNAL[i]); }
      mse /= DIN;
      var ratio = DIN / state.latent;
      num.innerHTML = mse.toFixed(4) + ' <small>重建均方误差（Reconstruction MSE）</small>';
      meta.textContent = ratio.toFixed(1) + ' 倍压缩（Compression，' + DIN + ' → ' + state.latent + ')  ·  ' + (state.latent <= 2 ? '瓶颈过窄：细节丢失' : state.latent >= DIN - 1 ? '瓶颈较宽：几乎完美，但没有压缩' : '压缩的同时保留主要结构');
      formula.textContent = 'x → 编码器（Encoder）→ z（' + state.latent + ' 维）→ 解码器（Decoder）→ x̂ · 瓶颈迫使网络只保留重要信息';
    };
    var grid = el('div', {}, [slider(state, 'latent', '瓶颈维度（Bottleneck Dimension）', 1, DIN, 1)]);
    host.appendChild(shell('自编码器瓶颈（Autoencoder Bottleneck）', '调整潜在维度（Latent Dimension）',
      grid, [svg, num, meta, formula],
      '自编码器（Autoencoder）将输入压入狭窄瓶颈，再在另一端重建。宽瓶颈可以复制一切，却学不到东西；极窄的瓶颈迫使网络丢弃细节，只保留主要结构，因此压缩程度越高，重建误差（Reconstruction Error）越大。合适的宽度会保留信号、丢弃噪声，学到的编码（Code）就是有用的表示（Representation）。'));
    state._render();
  }

  // ── normalizing-flow: 可逆映射（Invertible map），基础分布 → 目标分布，雅可比行列式对数（Log-det Jacobian） ──
  function normalizingFlow(host) {
    var state = { a: 1.4 };
    var W = 520, H = 210, PAD = 34;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var num = el('span', { class: 'lf-num' });
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    function base(z) { return Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI); }
    function fwd(z, a) { return z + a * Math.tanh(z); }
    function dfwd(z, a) { var th = Math.tanh(z); return 1 + a * (1 - th * th); }

    state._render = function () {
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      var a = state.a, i;
      var xs = [], baseY = [], tgtY = [];
      for (i = 0; i <= 160; i++) { var z = -3.4 + 6.8 * i / 160; xs.push(z); }
      function px(x) { return PAD + (x + 3.6) / 7.2 * (W - 2 * PAD); }
      var maxP = 0;
      var pts = [];
      for (i = 0; i < xs.length; i++) {
        var z = xs[i], x = fwd(z, a);
        var pz = base(z), jac = Math.abs(dfwd(z, a));
        var pxden = pz / jac;
        pts.push({ z: z, x: x, pz: pz, px: pxden });
        if (pz > maxP) maxP = pz; if (pxden > maxP) maxP = pxden;
      }
      function py(p) { return H - PAD - p / maxP * (H - 2 * PAD); }
      var bd = '', td = '';
      for (i = 0; i < pts.length; i++) { bd += (i ? 'L' : 'M') + px(pts[i].z).toFixed(1) + ' ' + py(pts[i].pz).toFixed(1) + ' '; td += (i ? 'L' : 'M') + px(pts[i].x).toFixed(1) + ' ' + py(pts[i].px).toFixed(1) + ' '; }
      svg.appendChild(svgEl('path', { d: bd, fill: 'none', stroke: 'var(--ink-mute,#999)', 'stroke-width': '2' }));
      svg.appendChild(svgEl('path', { d: td, fill: 'none', stroke: 'var(--blueprint,#3553ff)', 'stroke-width': '2.2' }));
      svg.appendChild(svgEl('text', { x: PAD, y: PAD - 6, fill: 'var(--ink-mute,#777)', 'font-size': '11', 'font-family': 'monospace' }, [tx('灰色 = 基础高斯分布 p(z) · 蓝色 = 推前密度（Pushforward）p(x)')]));
      var logdetAt0 = Math.log(Math.abs(dfwd(0, a)));
      num.innerHTML = logdetAt0.toFixed(3) + ' <small>z=0 处的 log|det J|</small>';
      meta.textContent = '流变换强度（Flow Strength）a = ' + a.toFixed(2) + '  ·  ' + (a < 0.3 ? '接近恒等映射：目标接近基础分布' : a > 1.8 ? '强变形：映射压缩的位置密度增大' : '中等变形，形成多峰形状（Multimodal）');
      formula.textContent = 'x = z + a·tanh(z)，可逆（Invertible）· p(x) = p(z) / |dx/dz| · log p(x) = log p(z) − log|det J|';
    };
    var grid = el('div', {}, [slider(state, 'a', '流变换强度（Flow Strength）a', 0, 2.5, 0.05)]);
    host.appendChild(shell('归一化流（Normalizing Flow）', '调整流参数',
      grid, [svg, num, meta, formula],
      '归一化流（Normalizing Flow）通过可逆函数（Invertible Function），将简单基础密度（灰色高斯分布）映射为复杂目标密度（蓝色）。由于映射可逆，变量替换公式（Change-of-variables Formula）给出精确密度：除以雅可比行列式（Jacobian Determinant）的绝对值，或在对数域减去 log|det J|。映射拉伸空间的位置，密度降低；压缩的位置，密度升高。计算完全精确，因此可用最大似然（Maximum Likelihood）训练归一化流。'));
    state._render();
  }

  // ── score-matching: 得分向量场（Score vector field）与朗之万采样（Langevin sampling）步骤 ──
  function scoreMatching(host) {
    var state = { steps: 18, step: 0.06 };
    var W = 520, H = 240, PAD = 24;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var num = el('span', { class: 'lf-num' });
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    var MODES = [{ x: -1.1, y: 0.4 }, { x: 1.2, y: -0.5 }];
    function dens(x, y) { var s = 0, m; for (m = 0; m < MODES.length; m++) { var dx = x - MODES[m].x, dy = y - MODES[m].y; s += Math.exp(-2 * (dx * dx + dy * dy)); } return s + 1e-6; }
    function score(x, y) {
      var sx = 0, sy = 0, w = 0, m;
      for (m = 0; m < MODES.length; m++) { var dx = x - MODES[m].x, dy = y - MODES[m].y; var g = Math.exp(-2 * (dx * dx + dy * dy)); w += g; sx += g * (-4 * dx); sy += g * (-4 * dy); }
      return { x: sx / w, y: sy / w };
    }
    function gx(x) { return PAD + (x + 2.4) / 4.8 * (W - 2 * PAD); }
    function gy(y) { return H - PAD - (y + 2.0) / 4.0 * (H - 2 * PAD); }

    state._render = function () {
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      var ix, iy;
      for (ix = -2; ix <= 2; ix += 0.5) for (iy = -1.6; iy <= 1.6; iy += 0.5) {
        var s = score(ix, iy);
        var mag = Math.sqrt(s.x * s.x + s.y * s.y) + 1e-6;
        var ux = s.x / mag, uy = s.y / mag, L = 11;
        var x1 = gx(ix), y1 = gy(iy), x2 = gx(ix) + ux * L, y2 = gy(iy) - uy * L;
        svg.appendChild(svgEl('line', { x1: x1, y1: y1, x2: x2, y2: y2, stroke: 'var(--ink-mute,#999)', 'stroke-width': '1', opacity: '0.7' }));
        svg.appendChild(svgEl('circle', { cx: x2, cy: y2, r: '1.6', fill: 'var(--ink-mute,#999)' }));
      }
      var m;
      for (m = 0; m < MODES.length; m++) { svg.appendChild(svgEl('circle', { cx: gx(MODES[m].x), cy: gy(MODES[m].y), r: '6', fill: 'none', stroke: 'var(--rule-soft,#ddd)', 'stroke-width': '2' })); }
      var px = -2.0, py = 1.4, path = '', i;
      for (i = 0; i <= state.steps; i++) {
        path += (i ? 'L' : 'M') + gx(px).toFixed(1) + ' ' + gy(py).toFixed(1) + ' ';
        var sc = score(px, py);
        px = px + state.step * sc.x;
        py = py + state.step * sc.y;
      }
      svg.appendChild(svgEl('path', { d: path, fill: 'none', stroke: 'var(--blueprint,#3553ff)', 'stroke-width': '1.6', 'stroke-dasharray': '4 3' }));
      svg.appendChild(svgEl('circle', { cx: gx(px), cy: gy(py), r: '5', fill: 'var(--warn,#b8870f)' }));
      var finalDens = dens(px, py);
      num.innerHTML = finalDens.toFixed(3) + ' <small>样本处密度（Density）</small>';
      meta.textContent = state.steps + ' 步朗之万迭代（Langevin）· 样本沿灰色箭头上升，进入高密度峰';
      formula.textContent = '得分（Score）s(x) = ∇ₓ log p(x) · Langevin：x ← x + ε·s(x)（+ 噪声）· 箭头指向数据密集处';
    };
    var grid = el('div', { class: 'lf-grid' }, [
      slider(state, 'steps', '朗之万步数（Langevin Steps）', 0, 40, 1),
      slider(state, 'step', '步长（Step Size）ε', 0.01, 0.2, 0.01)
    ]);
    host.appendChild(shell('得分匹配（Score Matching）', '调整步数',
      grid, [svg, num, meta, formula],
      '基于得分的模型（Score-based Model）学习得分（Score），即对数密度的梯度；图中用指向数据密集处的灰色向量场（Vector Field）表示。生成不需要显式密度：从噪声出发，反复沿得分方向迈步，即朗之万动力学（Langevin Dynamics），每步还加入少量噪声。橙色样本沿箭头离开稀疏区域，最终落入高密度峰；扩散模型（Diffusion Model）正是这样采样的。'));
    state._render();
  }

  LF.register({
    'data-augmentation': dataAugmentation,
    'transfer-learning': transferLearning,
    'batchnorm-inference': batchnormInference,
    'ctc-collapse': ctcCollapse,
    'mfcc-pipeline': mfccPipeline,
    'autoencoder-bottleneck': autoencoderBottleneck,
    'normalizing-flow': normalizingFlow,
    'score-matching': scoreMatching
  });
})();
