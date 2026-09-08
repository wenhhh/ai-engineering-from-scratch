/* figures-vision-speech.js — 阶段 4（计算机视觉（Computer vision））
   与阶段 6（语音与音频（Speech & audio））的交互课程图表。在 lesson-figures.js 之后加载，
   通过 window.LF 注册组件。原生 ES5，无依赖，主题由 CSS
   变量控制。编写时仍在 docs/en.md 中使用相同的围栏块：
       ```figure
       convolution-kernel
       ```  */
(function () {
  'use strict';
  var LF = window.LF;
  if (!LF) { return; }
  var el = LF.el, svgEl = LF.svgEl, slider = LF.slider, select = LF.select;
  var clamp = LF.clamp;

  function shell(label, hint, grid, outKids, caption) {
    return el('div', { class: 'lf' }, [
      el('div', { class: 'lf-head' }, [el('span', { class: 'lf-label' }, [label]), el('span', {}, [hint])]),
      el('div', { class: 'lf-body' }, [grid, el('div', { class: 'lf-out' }, outKids)]),
      el('div', { class: 'lf-cap' }, [caption])
    ]);
  }

  // ── convolution-kernel: 在固定 8x8 图像上滑动 3x3 卷积核（Kernel） ──
  function convolutionKernel(host) {
    var IMG = [
      [10, 12, 14, 80, 82, 16, 14, 12],
      [11, 13, 15, 81, 83, 17, 15, 13],
      [12, 14, 16, 82, 84, 18, 16, 14],
      [13, 15, 17, 83, 85, 19, 17, 15],
      [12, 14, 90, 90, 90, 90, 16, 14],
      [11, 13, 15, 17, 19, 17, 15, 13],
      [10, 12, 14, 16, 18, 16, 14, 12],
      [9, 11, 13, 15, 17, 15, 13, 11]
    ];
    var KERNELS = {
      identity: [[0, 0, 0], [0, 1, 0], [0, 0, 0]],
      edge: [[-1, -1, -1], [-1, 8, -1], [-1, -1, -1]],
      blur: [[1, 1, 1], [1, 1, 1], [1, 1, 1]],
      sharpen: [[0, -1, 0], [-1, 5, -1], [0, -1, 0]]
    };
    var DIV = { identity: 1, edge: 1, blur: 9, sharpen: 1 };
    var N = 8, OUT = N - 2;
    var state = { kernel: 'edge', wx: 0, wy: 0 };
    var svg = svgEl('svg', { viewBox: '0 0 520 240' });
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });

    function conv(ox, oy) {
      var k = KERNELS[state.kernel], s = 0, a, b;
      for (a = 0; a < 3; a++) for (b = 0; b < 3; b++) s += k[a][b] * IMG[oy + a][ox + b];
      return s / DIV[state.kernel];
    }
    function gray(v) { return clamp(v, 0, 255) / 255; }

    state._render = function () {
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      var cell = 22, gx = 8, gy = 18, gx2 = 300, r, c;
      svg.appendChild(svgEl('text', { x: gx, y: 12, fill: 'var(--ink-mute,#777)', 'font-size': '10', 'font-family': 'monospace' }, [tnode('输入 8×8')]));
      svg.appendChild(svgEl('text', { x: gx2, y: 12, fill: 'var(--ink-mute,#777)', 'font-size': '10', 'font-family': 'monospace' }, [tnode('输出 6×6')]));
      for (r = 0; r < N; r++) for (c = 0; c < N; c++) {
        svg.appendChild(svgEl('rect', { x: gx + c * cell, y: gy + r * cell, width: cell - 1, height: cell - 1, fill: 'var(--blueprint,#3553ff)', opacity: gray(IMG[r][c]).toFixed(3) }));
      }
      var wx = state.wx, wy = state.wy;
      svg.appendChild(svgEl('rect', { x: gx + wx * cell - 1, y: gy + wy * cell - 1, width: 3 * cell, height: 3 * cell, fill: 'none', stroke: 'var(--warn,#b8870f)', 'stroke-width': '2' }));
      var ocell = 24;
      for (r = 0; r < OUT; r++) for (c = 0; c < OUT; c++) {
        var ov = conv(c, r);
        var hot = (c === wx && r === wy);
        svg.appendChild(svgEl('rect', { x: gx2 + c * ocell, y: gy + r * ocell, width: ocell - 1, height: ocell - 1, fill: 'var(--blueprint,#3553ff)', opacity: gray(ov).toFixed(3), stroke: hot ? 'var(--warn,#b8870f)' : 'none', 'stroke-width': '2' }));
      }
      var out = conv(wx, wy);
      meta.textContent = '窗口位于（' + wx + ',' + wy + '）  ·  输出 = ' + out.toFixed(1) + (DIV[state.kernel] > 1 ? '（求和后除以 ' + DIV[state.kernel] + '）' : '');
      var k = KERNELS[state.kernel];
      formula.textContent = 'output = Σ kernel · patch   ·   卷积核各行 [' + k[0].join(' ') + '] [' + k[1].join(' ') + '] [' + k[2].join(' ') + ']';
    };
    function tnode(t) { return document.createTextNode(t); }

    var grid = el('div', { class: 'lf-grid' }, [
      select(state, 'kernel', '卷积核（Kernel）', [['边缘检测（Edge Detection）', 'edge'], ['方框模糊（Box Blur）', 'blur'], ['锐化（Sharpening）', 'sharpen'], ['恒等（Identity）', 'identity']]),
      slider(state, 'wx', '窗口 x 坐标', 0, OUT - 1, 1),
      slider(state, 'wy', '窗口 y 坐标', 0, OUT - 1, 1)
    ]);
    host.appendChild(shell('卷积核（Convolution Kernel）', '选择卷积核，移动窗口',
      grid, [svg, meta, formula],
      '卷积（Convolution）将小卷积核覆盖到图像的每个 3×3 局部区域，逐元素相乘后求和。边缘检测核抵消平坦区域、突出竖直条带；模糊核对邻域取平均；锐化核则强化中心相对于周边的差异。由于窗口不能以边界像素为中心，输出的宽和高都比输入少两个像素。'));
    state._render();
  }

  // ── pooling: 在 4x4 网格上执行 2x2 最大或平均池化（Max/average pooling），步幅（Stride）为 2 ──
  function pooling(host) {
    var GRID = [
      [3, 8, 2, 1],
      [5, 1, 9, 4],
      [7, 2, 6, 3],
      [1, 4, 0, 8]
    ];
    var MAXV = 9;
    var state = { mode: 'max' };
    var svg = svgEl('svg', { viewBox: '0 0 520 220' });
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });

    function poolWindow(br, bc) {
      var vals = [GRID[br][bc], GRID[br][bc + 1], GRID[br + 1][bc], GRID[br + 1][bc + 1]];
      if (state.mode === 'max') {
        var m = vals[0], mi = 0, i;
        for (i = 1; i < 4; i++) if (vals[i] > m) { m = vals[i]; mi = i; }
        return { val: m, contrib: mi };
      }
      var sum = vals[0] + vals[1] + vals[2] + vals[3];
      return { val: sum / 4, contrib: -1 };
    }

    state._render = function () {
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      var cell = 40, gx = 14, gy = 30, gx2 = 320, r, c;
      svg.appendChild(svgEl('text', { x: gx, y: 20, fill: 'var(--ink-mute,#777)', 'font-size': '11', 'font-family': 'monospace' }, [tx('输入 4×4')]));
      svg.appendChild(svgEl('text', { x: gx2, y: 20, fill: 'var(--ink-mute,#777)', 'font-size': '11', 'font-family': 'monospace' }, [tx('输出 2×2')]));
      for (r = 0; r < 4; r++) for (c = 0; c < 4; c++) {
        var win = poolWindow(Math.floor(r / 2) * 2, Math.floor(c / 2) * 2);
        var local = (r % 2) * 2 + (c % 2);
        var picked = state.mode === 'max' && win.contrib === local;
        svg.appendChild(svgEl('rect', { x: gx + c * cell, y: gy + r * cell, width: cell - 2, height: cell - 2, fill: 'var(--blueprint,#3553ff)', opacity: (0.18 + 0.72 * GRID[r][c] / MAXV).toFixed(3), stroke: picked ? 'var(--warn,#b8870f)' : 'none', 'stroke-width': '2.5' }));
        svg.appendChild(svgEl('text', { x: gx + c * cell + (cell - 2) / 2, y: gy + r * cell + (cell - 2) / 2 + 4, fill: 'var(--bg,#fafaf5)', 'font-size': '13', 'font-family': 'monospace', 'text-anchor': 'middle' }, [tx(String(GRID[r][c]))]));
      }
      for (r = 0; r < 2; r++) for (c = 0; c < 2; c++) {
        var p = poolWindow(r * 2, c * 2);
        svg.appendChild(svgEl('rect', { x: gx2 + c * cell, y: gy + r * cell, width: cell - 2, height: cell - 2, fill: 'var(--blueprint,#3553ff)', opacity: (0.18 + 0.72 * p.val / MAXV).toFixed(3) }));
        svg.appendChild(svgEl('text', { x: gx2 + c * cell + (cell - 2) / 2, y: gy + r * cell + (cell - 2) / 2 + 4, fill: 'var(--bg,#fafaf5)', 'font-size': '13', 'font-family': 'monospace', 'text-anchor': 'middle' }, [tx(state.mode === 'max' ? String(p.val) : p.val.toFixed(1))]));
      }
      meta.textContent = state.mode === 'max'
        ? '每个 2×2 窗口保留最大值，输入中已描边标出'
        : '每个 2×2 窗口保留四个值的平均值';
      formula.textContent = '2×2 窗口，步幅为 2  ·  4×4 → 2×2  ·  ' + (state.mode === 'max' ? 'out = max(window)' : 'out = mean(window)');
    };
    function tx(t) { return document.createTextNode(t); }

    var grid = el('div', { class: 'lf-grid' }, [
      select(state, 'mode', '池化（Pooling）', [['最大池化（Max Pooling）', 'max'], ['平均池化（Average Pooling）', 'average']])
    ]);
    host.appendChild(shell('池化（Pooling）', '取最大值或平均值',
      grid, [svg, meta, formula],
      '池化（Pooling）把每个窗口汇总为一个值，对特征图（Feature Map）进行下采样（Downsampling）。2×2 窗口配合步幅 2，使两个维度都减半，将 4×4 网格变为 2×2。最大池化（Max Pooling）传递窗口中最强的激活值，图中已高亮；平均池化（Average Pooling）传递均值。结果尺寸更小，对平移更稳健，也减少了下一层的计算开销。'));
    state._render();
  }

  // ── receptive-field: 一个深层神经元（Deep neuron）能够看到多少输入像素 ──
  function receptiveField(host) {
    var state = { layers: 4, k: 3, stride: 1 };
    var num = el('span', { class: 'lf-num' });
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });

    state._render = function () {
      var rf = 1, jump = 1, L;
      for (L = 0; L < state.layers; L++) {
        rf = rf + (state.k - 1) * jump;
        jump = jump * state.stride;
      }
      num.innerHTML = rf + ' <small>× ' + rf + ' 像素</small>';
      meta.textContent = state.layers + ' 个卷积层  ·  卷积核大小 ' + state.k + '  ·  步幅 ' + state.stride + '  ·  一个输出神经元能看到宽 ' + rf + ' 像素的区域';
      formula.textContent = '每层感受野增加 (k − 1) · Π(strides)   ·   RF = 1 + Σ (k − 1) · s^(layer−1)';
    };
    var grid = el('div', { class: 'lf-grid' }, [
      slider(state, 'layers', '卷积层数（Convolutional Layers）', 1, 12, 1),
      slider(state, 'k', '卷积核大小（Kernel Size）', 1, 7, 2),
      slider(state, 'stride', '步幅（Stride）', 1, 3, 1)
    ]);
    host.appendChild(shell('感受野（Receptive Field）', '逐层堆叠',
      grid, [num, meta, formula],
      '卷积神经网络（CNN）深层的神经元无法看到整张图像，只能看到经下方各层传入的局部区域。每个卷积核将覆盖宽度增加 kernel − 1，步幅则按倍数扩大后续各层的覆盖范围。堆叠小卷积核可以用较低成本构建大感受野（Receptive Field），无需一个巨大的滤波器。'));
    state._render();
  }

  // ── conv-output-size: 用条带图（Strip diagram）展示 floor((W - K + 2P)/S) + 1 ──
  function convOutputSize(host) {
    var state = { W: 32, K: 3, S: 1, P: 1 };
    var svg = svgEl('svg', { viewBox: '0 0 520 200' });
    var num = el('span', { class: 'lf-num' });
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });

    function outSize() {
      return Math.floor((state.W - state.K + 2 * state.P) / state.S) + 1;
    }
    state._render = function () {
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      var out = outSize();
      var valid = out >= 1 && (state.W - state.K + 2 * state.P) >= 0;
      var x0 = 30, y0 = 70, full = 460;
      var unit = full / (state.W + 2 * state.P);
      if (state.P > 0) {
        svg.appendChild(svgEl('rect', { x: x0, y: y0, width: (state.P * unit).toFixed(1), height: 40, fill: 'var(--rule-soft,#ddd)' }));
        svg.appendChild(svgEl('rect', { x: (x0 + (state.P + state.W) * unit).toFixed(1), y: y0, width: (state.P * unit).toFixed(1), height: 40, fill: 'var(--rule-soft,#ddd)' }));
      }
      svg.appendChild(svgEl('rect', { x: (x0 + state.P * unit).toFixed(1), y: y0, width: (state.W * unit).toFixed(1), height: 40, fill: 'var(--blueprint,#3553ff)', opacity: '0.22' }));
      svg.appendChild(svgEl('rect', { x: x0, y: y0, width: (state.K * unit).toFixed(1), height: 40, fill: 'none', stroke: 'var(--warn,#b8870f)', 'stroke-width': '2' }));
      var i, maxBars = Math.min(out, 64);
      for (i = 0; i < maxBars && valid; i++) {
        var cx = x0 + (i * state.S + state.K / 2) * unit;
        svg.appendChild(svgEl('circle', { cx: cx.toFixed(1), cy: y0 + 60, r: '2.4', fill: 'var(--blueprint,#3553ff)' }));
      }
      svg.appendChild(svgEl('text', { x: x0, y: y0 - 12, fill: 'var(--ink-mute,#777)', 'font-size': '11', 'font-family': 'monospace' }, [t('填充后输入 = ' + (state.W + 2 * state.P) + '（灰色为填充，方框为卷积核）')]));
      svg.appendChild(svgEl('text', { x: x0, y: y0 + 90, fill: 'var(--ink-mute,#777)', 'font-size': '11', 'font-family': 'monospace' }, [t('输出位置数 = ' + (valid ? out : 0))]));
      num.innerHTML = (valid ? out : 0) + ' <small>x ' + (valid ? out : 0) + '</small>';
      meta.textContent = valid ? 'W ' + state.W + '  K ' + state.K + '  S ' + state.S + '  P ' + state.P + '  →  每边 ' + out
        : '卷积核大于填充后的输入，没有有效输出';
      formula.textContent = 'out = floor((W − K + 2P) / S) + 1 = floor((' + state.W + ' − ' + state.K + ' + ' + (2 * state.P) + ') / ' + state.S + ') + 1';
    };
    function t(s) { return document.createTextNode(s); }
    var grid = el('div', { class: 'lf-grid' }, [
      slider(state, 'W', '输入宽度（Input Width）W', 4, 64, 1),
      slider(state, 'K', '卷积核大小（Kernel Size）K', 1, 11, 1),
      slider(state, 'S', '步幅（Stride）S', 1, 4, 1),
      slider(state, 'P', '填充（Padding）P', 0, 5, 1)
    ]);
    host.appendChild(shell('卷积输出尺寸（Convolution Output Size）', '调整 W、K、S、P',
      grid, [svg, num, meta, formula],
      '卷积的空间输出尺寸由公式 floor((W − K + 2P) / S) + 1 确定。填充（Padding）P 增加边界，使卷积核能覆盖边缘并保持尺寸；步幅（Stride）S 跳过位置，缩小输出。同尺寸填充（Same Padding）选择合适的 P，使输出与输入尺寸一致；有效填充（Valid Padding）取 P = 0，尺寸减少 K − 1。'));
    state._render();
  }

  // ── cnn-param-count: 卷积权重共享（Conv weight sharing）与稠密层（Dense layer）对比 ──
  function cnnParamCount(host) {
    var state = { cin: 64, cout: 128, k: 3, hw: 32 };
    var num = el('span', { class: 'lf-num' });
    var bar = el('i');
    var barWrap = el('div', { class: 'lf-bar' }, [bar]);
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    function human(x) { var u = ['', 'K', 'M', 'B'], i = 0; while (x >= 1000 && i < u.length - 1) { x /= 1000; i++; } return x.toFixed(x < 10 ? 2 : 1) + u[i]; }

    state._render = function () {
      var conv = (state.k * state.k * state.cin + 1) * state.cout;
      var inFeat = state.cin * state.hw * state.hw;
      var outFeat = state.cout * state.hw * state.hw;
      var dense = (inFeat + 1) * outFeat;
      var ratio = dense / conv;
      num.innerHTML = human(conv) + ' <small>个卷积参数</small>';
      bar.style.width = clamp(state.k * state.k * state.cin * state.cout / 1e6 * 4, 2, 100) + '%';
      meta.textContent = '连接同样的 ' + state.hw + '×' + state.hw + ' 特征图，全连接层需要 ' + human(dense) + ' 个参数  ·  是卷积层的 ' + human(ratio) + ' 倍';
      formula.textContent = 'conv = (K·K·Cin + 1)·Cout = (' + state.k + '·' + state.k + '·' + state.cin + ' + 1)·' + state.cout + '   ·   与空间尺寸无关';
    };
    var grid = el('div', { class: 'lf-grid' }, [
      slider(state, 'cin', '输入通道数（Input Channels）', 1, 512, 1),
      slider(state, 'cout', '输出通道数（Output Channels）', 1, 512, 1),
      slider(state, 'k', '卷积核大小（Kernel Size）', 1, 7, 1),
      slider(state, 'hw', '特征图边长（Feature Map Side）', 8, 64, 1)
    ]);
    host.appendChild(shell('卷积神经网络参数量（CNN Parameter Count）', '卷积层与全连接层对比',
      grid, [num, barWrap, meta, formula],
      '卷积层需要 (K·K·Cin + 1)·Cout 个参数，并在所有空间位置复用同一组卷积核。连接同样特征图的全连接层（Dense Layer），需要为每对输入与输出像素设置独立权重，参数量随图像尺寸急剧增长。权重共享（Weight Sharing）使卷积神经网络（Convolutional Neural Network，CNN）保持足够小的规模，能够在图像上训练。'));
    state._render();
  }

  // ── spectrogram-window: STFT 窗口大小与时频权衡（Time-frequency tradeoff） ──
  function spectrogramWindow(host) {
    var state = { win: 256 };
    var SR = 16000;
    var svg = svgEl('svg', { viewBox: '0 0 520 220' });
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });

    state._render = function () {
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      var W = 520, H = 220, x0 = 40, y0 = 16, gw = 440, gh = 168;
      var cols = 8, rows = 8;
      var winSec = state.win / SR;
      var freqRes = SR / state.win;
      var tFrac = clamp(state.win / 2048, 0.04, 1);
      var cw = gw / cols, ch = gh / rows;
      var r, c;
      for (r = 0; r < rows; r++) for (c = 0; c < cols; c++) {
        var timeSpread = tFrac;
        var freqSpread = 1 - tFrac;
        var op = 0.12 + 0.55 * (0.5 * timeSpread * (1 - Math.abs((c + 0.5) / cols - 0.5) * 2) + 0.5 * freqSpread * (1 - Math.abs((r + 0.5) / rows - 0.5) * 2));
        svg.appendChild(svgEl('rect', { x: x0 + c * cw, y: y0 + r * ch, width: cw - 1.5, height: ch - 1.5, fill: 'var(--blueprint,#3553ff)', opacity: clamp(op, 0.05, 0.95).toFixed(3) }));
      }
      svg.appendChild(svgEl('text', { x: x0, y: y0 + gh + 16, fill: 'var(--ink-mute,#777)', 'font-size': '11', 'font-family': 'monospace' }, [t('时间 →')]));
      svg.appendChild(svgEl('text', { x: 8, y: y0 + 8, fill: 'var(--ink-mute,#777)', 'font-size': '11', 'font-family': 'monospace' }, [t('频率')]));
      meta.textContent = '窗口 ' + state.win + ' 个采样点 = ' + (winSec * 1000).toFixed(1) + ' 毫秒  ·  频点间隔 ' + freqRes.toFixed(1) + ' Hz  ·  '
        + (state.win <= 256 ? '时间清晰，频率模糊' : state.win >= 1024 ? '频率清晰，时间模糊' : '均衡');
      formula.textContent = '时间分辨率 = window / SR，频率分辨率 = SR / window   ·   乘积固定，体现不确定性';
    };
    function t(s) { return document.createTextNode(s); }
    var grid = el('div', {}, [slider(state, 'win', '短时傅里叶变换（STFT）窗口采样点数', 64, 2048, 64)]);
    host.appendChild(shell('频谱图窗口（Spectrogram Window）', '调整窗口大小',
      grid, [svg, meta, formula],
      '频谱图（Spectrogram）将信号分成多个窗口，对每个窗口执行傅里叶变换（Fourier Transform）。短窗口能准确定位事件发生时间，但能量在频率上较分散；长窗口能精细分辨音高，却使时间定位变模糊。两种分辨率的乘积固定，因此选择窗口大小时必须在两者之间权衡。'));
    state._render();
  }

  // ── mel-scale: 线性 Hz 与 mel 曲线对比 ──
  function melScale(host) {
    var state = { f: 4000 };
    var FMAX = 16000;
    var W = 520, H = 220, PAD = 40;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var num = el('span', { class: 'lf-num' });
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    function mel(f) { return 2595 * Math.log(1 + f / 700) / Math.LN10; }
    var MELMAX = mel(FMAX);
    function px(f) { return PAD + f / FMAX * (W - 2 * PAD); }
    function pyMel(m) { return H - PAD - m / MELMAX * (H - 2 * PAD); }

    state._render = function () {
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      svg.appendChild(svgEl('line', { x1: PAD, y1: H - PAD, x2: W - PAD, y2: PAD, stroke: 'var(--rule-soft,#ddd)', 'stroke-width': '1.5', 'stroke-dasharray': '4 4' }));
      var d = '', i;
      for (i = 0; i <= 120; i++) { var f = FMAX * i / 120; d += (i ? 'L' : 'M') + px(f).toFixed(1) + ' ' + pyMel(mel(f)).toFixed(1) + ' '; }
      svg.appendChild(svgEl('path', { d: d, fill: 'none', stroke: 'var(--blueprint,#3553ff)', 'stroke-width': '2.2' }));
      var m = mel(state.f);
      svg.appendChild(svgEl('line', { x1: px(state.f), y1: pyMel(m), x2: px(state.f), y2: H - PAD, stroke: 'var(--warn,#b8870f)', 'stroke-width': '1', 'stroke-dasharray': '3 3' }));
      svg.appendChild(svgEl('line', { x1: PAD, y1: pyMel(m), x2: px(state.f), y2: pyMel(m), stroke: 'var(--warn,#b8870f)', 'stroke-width': '1', 'stroke-dasharray': '3 3' }));
      svg.appendChild(svgEl('circle', { cx: px(state.f), cy: pyMel(m), r: '5', fill: 'var(--blueprint,#3553ff)' }));
      svg.appendChild(svgEl('text', { x: W - PAD - 4, y: H - PAD - 6, fill: 'var(--ink-mute,#777)', 'font-size': '11', 'font-family': 'monospace', 'text-anchor': 'end' }, [tx('Hz →')]));
      svg.appendChild(svgEl('text', { x: PAD - 6, y: PAD + 10, fill: 'var(--ink-mute,#777)', 'font-size': '11', 'font-family': 'monospace', 'text-anchor': 'end' }, [tx('mel')]));
      num.innerHTML = Math.round(m) + ' <small>mel</small>';
      var fracHz = state.f / FMAX, fracMel = m / MELMAX;
      meta.textContent = state.f + ' Hz 位于 Hz 轴的 ' + Math.round(fracHz * 100) + '% 处，对应梅尔轴的 ' + Math.round(fracMel * 100) + '% 处  ·  高频部分被压缩';
      formula.textContent = 'mel = 2595 · log10(1 + f / 700)   ·   虚线为线性恒等映射，用于对照';
    };
    function tx(s) { return document.createTextNode(s); }
    var grid = el('div', {}, [slider(state, 'f', '频率（Frequency，Hz）', 100, FMAX, 100)]);
    host.appendChild(shell('梅尔尺度（Mel Scale）', '调整频率',
      grid, [svg, num, meta, formula],
      '人耳对低频的分辨较精细，对高频较粗略。梅尔尺度（Mel Scale）通过弯曲线性 Hz 轴来匹配这种感知：1 kHz 以下近似线性，更高频段则明显压缩，因此从 8 到 9 kHz 的梅尔跨度远小于从 200 到 300 Hz 的跨度。梅尔滤波器组（Mel Filterbank）把分辨能力分配在人耳更敏感的位置。'));
    state._render();
  }

  // ── nyquist-aliasing: 对高于 fs/2 的频率采样，会折叠为虚假的低频 ──
  function nyquistAliasing(host) {
    var state = { f: 7, fs: 20 };
    var W = 520, H = 220, PAD = 28, DUR = 1;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var status = el('span', { class: 'lf-num lf-status' });
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    function px(t) { return PAD + t / DUR * (W - 2 * PAD); }
    function py(v) { return H / 2 - v * (H / 2 - PAD); }
    function aliasFreq(f, fs) {
      var fn = fs / 2;
      var m = f % fs;
      if (m > fn) m = fs - m;
      return m;
    }
    state._render = function () {
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      svg.appendChild(svgEl('line', { x1: PAD, y1: py(0), x2: W - PAD, y2: py(0), stroke: 'var(--rule-soft,#eee)', 'stroke-width': '1' }));
      var d = '', i;
      for (i = 0; i <= 400; i++) { var t = DUR * i / 400; d += (i ? 'L' : 'M') + px(t).toFixed(1) + ' ' + py(Math.sin(2 * Math.PI * state.f * t)).toFixed(1) + ' '; }
      svg.appendChild(svgEl('path', { d: d, fill: 'none', stroke: 'var(--rule-soft,#bbb)', 'stroke-width': '1.5' }));
      var fa = aliasFreq(state.f, state.fs);
      var over = state.f > state.fs / 2;
      var n = Math.floor(state.fs * DUR), k, sx = [], sy = [];
      for (k = 0; k <= n; k++) { var ts = k / state.fs; sx.push(ts); sy.push(Math.sin(2 * Math.PI * state.f * ts)); }
      var ad = '';
      for (k = 0; k < sx.length; k++) { ad += (k ? 'L' : 'M') + px(sx[k]).toFixed(1) + ' ' + py(sy[k]).toFixed(1) + ' '; }
      svg.appendChild(svgEl('path', { d: ad, fill: 'none', stroke: 'var(--warn,#b8870f)', 'stroke-width': '1.5', 'stroke-dasharray': '5 3' }));
      for (k = 0; k < sx.length; k++) { svg.appendChild(svgEl('circle', { cx: px(sx[k]), cy: py(sy[k]), r: '3', fill: 'var(--blueprint,#3553ff)' })); }
      status.innerHTML = over ? '发生混叠 → ' + fa.toFixed(1) + ' Hz' : '采样未发生混叠';
      meta.textContent = '信号 ' + state.f + ' Hz  ·  采样率 ' + state.fs + ' Hz  ·  奈奎斯特频率 = ' + (state.fs / 2) + ' Hz  ·  ' + (over ? '超过奈奎斯特频率：采样点呈现伪低频 ' + fa.toFixed(1) + ' Hz 波形' : '低于奈奎斯特频率：能够忠实采样');
      formula.textContent = 'f > fs/2 时出现混叠   ·   f_alias = |f − round(f/fs)·fs|';
    };
    var grid = el('div', { class: 'lf-grid' }, [
      slider(state, 'f', '信号频率（Signal Frequency，Hz）', 1, 30, 1),
      slider(state, 'fs', '采样率（Sample Rate，Hz）', 4, 40, 1)
    ]);
    host.appendChild(shell('奈奎斯特频率（Nyquist Frequency）与混叠（Aliasing）', '调整信号频率和采样率',
      grid, [svg, status, meta, formula],
      '灰色是真实信号，蓝点是采样值，虚线连接这些采样点。只要采样率大于信号频率的两倍，就能通过采样重建原始信号。当信号频率超过奈奎斯特频率（Nyquist Frequency，fs/2）时，相同采样点会呈现错误的低频信号，这就是混叠（Aliasing）。因此，音频在采样前需要经过低通滤波（Low-pass Filtering）。'));
    state._render();
  }

  LF.register({
    'convolution-kernel': convolutionKernel,
    'pooling': pooling,
    'receptive-field': receptiveField,
    'conv-output-size': convOutputSize,
    'cnn-param-count': cnnParamCount,
    'spectrogram-window': spectrogramWindow,
    'mel-scale': melScale,
    'nyquist-aliasing': nyquistAliasing
  });
})();
