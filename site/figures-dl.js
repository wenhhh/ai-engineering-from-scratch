/* figures-dl.js — 阶段 3（深度学习核心（Deep learning core））的交互课程图表。
   在 lesson-figures.js 之后加载，通过 LF.register 注册九个组件。
   无依赖，仅使用 ES5，主题由 CSS 变量控制。 */
(function () {
  'use strict';
  var LF = window.LF;
  if (!LF) { return; }
  var el = LF.el, svgEl = LF.svgEl, slider = LF.slider, select = LF.select, clamp = LF.clamp;

  // ── perceptron-boundary: 拖动权重（Weights），移动决策线（Decision line） ──
  function perceptronBoundary(host) {
    // 两个线性可分簇（Linearly separable clusters），确定性生成，数据空间 x,y 位于 [-3,3]。
    var pos = [[1.4, 1.2], [2.0, 0.6], [1.0, 2.1], [2.4, 1.7], [0.7, 1.0], [1.8, 2.4]];
    var neg = [[-1.3, -1.0], [-2.0, -0.5], [-0.8, -1.8], [-2.3, -1.6], [-0.6, -0.7], [-1.7, -2.2]];
    var state = { w1: 1, w2: 1, b: 0 };
    var W = 520, H = 230, PAD = 28, RNG = 3;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var status = el('span', { class: 'lf-num' });
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    function px(x) { return PAD + (x + RNG) / (2 * RNG) * (W - 2 * PAD); }
    function py(y) { return H - PAD - (y + RNG) / (2 * RNG) * (H - 2 * PAD); }
    function score(p) { return state.w1 * p[0] + state.w2 * p[1] + state.b; }
    state._render = function () {
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      // 坐标轴（Axes）
      svg.appendChild(svgEl('line', { x1: px(-RNG), y1: py(0), x2: px(RNG), y2: py(0), stroke: 'var(--rule-soft,#eee)', 'stroke-width': '1' }));
      svg.appendChild(svgEl('line', { x1: px(0), y1: py(-RNG), x2: px(0), y2: py(RNG), stroke: 'var(--rule-soft,#eee)', 'stroke-width': '1' }));
      // 决策线 w1 x + w2 y + b = 0 → y = -(w1 x + b)/w2（或竖直线）
      if (Math.abs(state.w2) > 1e-6) {
        var xa = -RNG, xb = RNG;
        var ya = -(state.w1 * xa + state.b) / state.w2;
        var yb = -(state.w1 * xb + state.b) / state.w2;
        svg.appendChild(svgEl('line', { x1: px(xa), y1: py(ya), x2: px(xb), y2: py(yb), stroke: 'var(--warn,#b8870f)', 'stroke-width': '2' }));
      } else if (Math.abs(state.w1) > 1e-6) {
        var xv = -state.b / state.w1;
        svg.appendChild(svgEl('line', { x1: px(xv), y1: py(-RNG), x2: px(xv), y2: py(RNG), stroke: 'var(--warn,#b8870f)', 'stroke-width': '2' }));
      }
      var miss = 0;
      pos.forEach(function (p) {
        var ok = score(p) > 0;
        if (!ok) miss++;
        svg.appendChild(svgEl('circle', { cx: px(p[0]), cy: py(p[1]), r: '5', fill: ok ? 'var(--blueprint,#3553ff)' : 'none', stroke: 'var(--blueprint,#3553ff)', 'stroke-width': '2' }));
      });
      neg.forEach(function (p) {
        var ok = score(p) < 0;
        if (!ok) miss++;
        svg.appendChild(svgEl('rect', { x: px(p[0]) - 4, y: py(p[1]) - 4, width: '8', height: '8', fill: ok ? 'var(--ink-mute,#999)' : 'none', stroke: 'var(--ink-mute,#999)', 'stroke-width': '2' }));
      });
      var total = pos.length + neg.length;
      status.innerHTML = miss + ' <small>/ ' + total + ' 个样本被误分类（Misclassified）</small>';
      meta.textContent = miss === 0 ? '所有点分类正确：这条直线分开了两个类别' : '实心 = 分类正确；空心 = 位于直线的错误一侧';
      formula.textContent = '预测为 + 的条件：' + state.w1.toFixed(1) + '·x + ' + state.w2.toFixed(1) + '·y + (' + state.b.toFixed(1) + ') > 0';
    };
    var grid = el('div', { class: 'lf-grid' }, [
      slider(state, 'w1', '权重（Weight）w1', -3, 3, 0.1),
      slider(state, 'w2', '权重（Weight）w2', -3, 3, 0.1),
      slider(state, 'b', '偏置（Bias）b', -3, 3, 0.1)
    ]);
    host.appendChild(el('div', { class: 'lf' }, [
      el('div', { class: 'lf-head' }, [el('span', { class: 'lf-label' }, ['感知机边界（Perceptron Boundary）']), el('span', {}, ['调整权重'])]),
      el('div', { class: 'lf-body' }, [grid, el('div', { class: 'lf-out' }, [svg, el('div', { style: 'margin-top:10px' }, [status]), meta, formula])]),
      el('div', { class: 'lf-cap' }, ['感知机（Perceptron）根据 w·x + b 的符号预测，因此它的决策面（Decision Surface）是一条直线。调整权重（Weight）和偏置（Bias）来旋转、平移这条线，直到所有蓝色圆点位于正侧，所有灰色方块位于负侧。'])
    ]));
    state._render();
  }

  // ── mlp-forward: 拖动输入，观察 2-3-1 网络激活 ──
  function mlpForward(host) {
    // 固定权重：W1 为 3x2，b1 长度为 3；w2 长度为 3，b2 为标量。隐藏层与输出层均使用 tanh。
    var W1 = [[1.2, -0.8], [-0.5, 1.4], [0.9, 0.7]], b1 = [0.1, -0.2, 0.0];
    var w2 = [1.1, -1.3, 0.8], b2 = 0.2;
    var state = { x1: 0.6, x2: -0.4 };
    var W = 520, H = 230;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var num = el('span', { class: 'lf-num' });
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    function tanh(z) { var e = Math.exp(2 * z); return (e - 1) / (e + 1); }
    function actFill(a) { // a 位于 [-1,1] → +1 时为 blueprint，-1 时为 bg
      var t = (a + 1) / 2;
      return 'rgba(53,83,255,' + (0.12 + 0.78 * t).toFixed(3) + ')';
    }
    var inX = 90, hidX = 260, outX = 430;
    var inY = [80, 150], hidY = [55, 115, 175], outY = 115;
    state._render = function () {
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      var x = [state.x1, state.x2];
      var h = [0, 0, 0], j, i;
      for (j = 0; j < 3; j++) { var z = b1[j]; for (i = 0; i < 2; i++) z += W1[j][i] * x[i]; h[j] = tanh(z); }
      var zo = b2; for (j = 0; j < 3; j++) zo += w2[j] * h[j];
      var out = tanh(zo);
      // 输入层→隐藏层的边
      for (j = 0; j < 3; j++) for (i = 0; i < 2; i++) {
        var wgt = W1[j][i];
        svg.appendChild(svgEl('line', { x1: inX, y1: inY[i], x2: hidX, y2: hidY[j], stroke: wgt >= 0 ? 'var(--blueprint,#3553ff)' : 'var(--warn,#b8870f)', 'stroke-width': (0.4 + Math.abs(wgt)).toFixed(2), opacity: '0.45' }));
      }
      // 隐藏层→输出层的边
      for (j = 0; j < 3; j++) {
        svg.appendChild(svgEl('line', { x1: hidX, y1: hidY[j], x2: outX, y2: outY, stroke: w2[j] >= 0 ? 'var(--blueprint,#3553ff)' : 'var(--warn,#b8870f)', 'stroke-width': (0.4 + Math.abs(w2[j])).toFixed(2), opacity: '0.45' }));
      }
      // 节点：输入（原始值，为填充提示缩放至 [-1,1]）、隐藏层、输出层
      [0, 1].forEach(function (i2) {
        svg.appendChild(svgEl('circle', { cx: inX, cy: inY[i2], r: '15', fill: actFill(clamp(x[i2], -1, 1)), stroke: 'var(--ink-soft,#555)', 'stroke-width': '1.2' }));
      });
      h.forEach(function (hv, j2) {
        svg.appendChild(svgEl('circle', { cx: hidX, cy: hidY[j2], r: '15', fill: actFill(hv), stroke: 'var(--ink-soft,#555)', 'stroke-width': '1.2' }));
      });
      svg.appendChild(svgEl('circle', { cx: outX, cy: outY, r: '18', fill: actFill(out), stroke: 'var(--blueprint,#3553ff)', 'stroke-width': '2' }));
      num.innerHTML = out.toFixed(3) + ' <small>输出（Output）</small>';
      meta.textContent = '隐藏层（Hidden Layer）= [' + h.map(function (v) { return v.toFixed(2); }).join(', ') + ']  ·  节点颜色越深，激活（Activation）越强';
      formula.textContent = 'h = tanh(W₁x + b₁),  y = tanh(w₂·h + b₂)';
    };
    var grid = el('div', { class: 'lf-grid' }, [
      slider(state, 'x1', '输入（Input）x1', -2, 2, 0.05),
      slider(state, 'x2', '输入（Input）x2', -2, 2, 0.05)
    ]);
    host.appendChild(el('div', { class: 'lf' }, [
      el('div', { class: 'lf-head' }, [el('span', { class: 'lf-label' }, ['多层感知机前向传播（MLP Forward Pass）']), el('span', {}, ['调整两个输入'])]),
      el('div', { class: 'lf-body' }, [grid, el('div', { class: 'lf-out' }, [svg, el('div', { style: 'margin-top:10px' }, [num]), meta, formula])]),
      el('div', { class: 'lf-cap' }, ['两个输入经固定权重传入三个隐藏单元（Hidden Unit），各自经过 tanh 压缩，再合成为一个输出。蓝色边表示正权重，金色边表示负权重；节点颜色深浅表示在当前输入下，各单元激活（Activation）的强弱。'])
    ]));
    state._render();
  }

  // ── backprop-vanishing: 跨深度累乘激活函数导数（Activation derivatives） ──
  function backpropVanishing(host) {
    var state = { act: 'sigmoid', depth: 10 };
    var W = 520, H = 220, PAD = 34;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var status = el('span', { class: 'lf-num' });
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    // 各层导数幅值的代表值（典型中间激活区间）
    function dPerLayer() {
      if (state.act === 'sigmoid') return 0.25;   // max sigmoid'(x) = 0.25
      if (state.act === 'tanh') return 0.42;       // 远离 0 时典型的 |tanh'|
      return 1.0;                                  // 对激活单元，relu 导数 = 1
    }
    function px(layer) { return PAD + (state.depth <= 1 ? 0 : (layer / (state.depth)) * (W - 2 * PAD)); }
    function py(logmag) { // logmag 位于 [-9, 0] → 底部..顶部
      var t = clamp((logmag + 9) / 9, 0, 1);
      return H - PAD - t * (H - 2 * PAD);
    }
    state._render = function () {
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      svg.appendChild(svgEl('line', { x1: PAD, y1: py(0), x2: W - PAD, y2: py(0), stroke: 'var(--rule-soft,#eee)', 'stroke-width': '1', 'stroke-dasharray': '3 3' }));
      var per = dPerLayer(), mag = 1, d = '', l;
      var lastLog = 0;
      for (l = 0; l <= state.depth; l++) {
        var lg = l * Math.log(per) / Math.LN10; // 经过 l 层后 mag 的 log10
        lastLog = lg;
        d += (l ? 'L' : 'M') + px(l).toFixed(1) + ' ' + py(lg).toFixed(1) + ' ';
      }
      svg.appendChild(svgEl('path', { d: d, fill: 'none', stroke: 'var(--blueprint,#3553ff)', 'stroke-width': '2' }));
      for (l = 0; l <= state.depth; l += Math.max(1, Math.round(state.depth / 10))) {
        svg.appendChild(svgEl('circle', { cx: px(l), cy: py(l * Math.log(per) / Math.LN10), r: '2.5', fill: 'var(--blueprint,#3553ff)' }));
      }
      mag = Math.pow(per, state.depth);
      status.innerHTML = mag < 1e-4 ? '≈ ' + mag.toExponential(1) + ' <small>梯度（Gradient）</small>' : mag.toFixed(4) + ' <small>梯度（Gradient）</small>';
      var verdict = state.act === 'relu' ? '稳定：导数保持为 1，深度增加时梯度仍能传递'
        : (mag < 1e-3 ? '梯度消失（Vanishing）：过小，无法训练靠前的层' : '随深度增加而缩小');
      meta.textContent = '每层因子（Factor）' + per.toFixed(2) + '  ·  经过 ' + state.depth + ' 层后 · ' + verdict;
      formula.textContent = '∂L/∂early ∝ Π σ′(zₗ) ≈ (' + per.toFixed(2) + ')^depth   （对数刻度，Log Scale）';
    };
    var grid = el('div', { class: 'lf-grid' }, [
      select(state, 'act', '激活函数（Activation）', [['sigmoid', 'sigmoid'], ['tanh', 'tanh'], ['relu', 'relu']]),
      slider(state, 'depth', '深度（Depth，层数）', 2, 20, 1)
    ]);
    host.appendChild(el('div', { class: 'lf' }, [
      el('div', { class: 'lf-head' }, [el('span', { class: 'lf-label' }, ['梯度消失（Vanishing Gradients）']), el('span', {}, ['选择激活函数，调整深度'])]),
      el('div', { class: 'lf-body' }, [grid, el('div', { class: 'lf-out' }, [svg, el('div', { style: 'margin-top:10px' }, [status]), meta, formula])]),
      el('div', { class: 'lf-cap' }, ['反向传播（Backpropagation）每经过一层，就乘上该层激活函数的导数。Sigmoid 的导数最大为 0.25，tanh 的导数保持在 1 以下，因此深层网络中的乘积会趋近于零，注意图中的对数坐标轴（Log Axis）。ReLU 对已激活的单元保持导数为 1，因此让深层网络训练变得可行。'])
    ]));
    state._render();
  }

  // ── optimizer-trajectory: 在病态碗状曲面（Ill-conditioned bowl）上比较 SGD、Momentum 与 Adam
  function optimizerTrajectory(host) {
    var state = { opt: 'momentum', lr: 0.08 };
    var W = 520, H = 230, PAD = 26, STEPS = 30;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var status = el('span', { class: 'lf-num' });
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    // f(x,y) = 0.5*(a x^2 + b y^2)，狭谷（Ravine）：a 小、b 大 → 病态（Ill-conditioned）
    var A = 1.0, B = 20.0, X0 = -2.6, Y0 = 0.9;
    var RX = 3, RY = 1.2;
    function px(x) { return PAD + (x + RX) / (2 * RX) * (W - 2 * PAD); }
    function py(y) { return H / 2 - (y / RY) * (H / 2 - PAD); }
    function run() {
      var x = X0, y = Y0, pts = [[x, y]];
      var beta = 0.9, vx = 0, vy = 0;          // Momentum / Adam 一阶矩（First moment）
      var b2 = 0.999, sx = 0, sy = 0, t = 0;   // Adam 二阶矩（Second moment）
      var eps = 1e-8;
      for (var s = 0; s < STEPS; s++) {
        var gx = A * x, gy = B * y;
        if (state.opt === 'sgd') {
          x -= state.lr * gx; y -= state.lr * gy;
        } else if (state.opt === 'momentum') {
          vx = beta * vx + gx; vy = beta * vy + gy;
          x -= state.lr * vx; y -= state.lr * vy;
        } else { // adam
          t++;
          vx = beta * vx + (1 - beta) * gx; vy = beta * vy + (1 - beta) * gy;
          sx = b2 * sx + (1 - b2) * gx * gx; sy = b2 * sy + (1 - b2) * gy * gy;
          var mhx = vx / (1 - Math.pow(beta, t)), mhy = vy / (1 - Math.pow(beta, t));
          var shx = sx / (1 - Math.pow(b2, t)), shy = sy / (1 - Math.pow(b2, t));
          x -= state.lr * 8 * mhx / (Math.sqrt(shx) + eps);
          y -= state.lr * 8 * mhy / (Math.sqrt(shy) + eps);
        }
        if (!isFinite(x) || !isFinite(y) || Math.abs(x) > RX || Math.abs(y) > RY) { pts.push([clamp(x, -RX, RX), clamp(y, -RY, RY)]); break; }
        pts.push([x, y]);
      }
      return pts;
    }
    state._render = function () {
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      // 狭谷等高线（Contours），呈椭圆形
      [0.3, 0.7, 1.2].forEach(function (lvl) {
        svg.appendChild(svgEl('ellipse', { cx: px(0), cy: py(0), rx: (px(Math.sqrt(2 * lvl / A)) - px(0)).toFixed(1), ry: (py(0) - py(Math.sqrt(2 * lvl / B))).toFixed(1), fill: 'none', stroke: 'var(--rule-soft,#ddd)', 'stroke-width': '1' }));
      });
      svg.appendChild(svgEl('line', { x1: PAD, y1: py(0), x2: W - PAD, y2: py(0), stroke: 'var(--rule-soft,#eee)', 'stroke-width': '1', 'stroke-dasharray': '3 3' }));
      var pts = run(), d = '';
      pts.forEach(function (p, i) { d += (i ? 'L' : 'M') + px(p[0]).toFixed(1) + ' ' + py(p[1]).toFixed(1) + ' '; });
      svg.appendChild(svgEl('path', { d: d, fill: 'none', stroke: 'var(--blueprint,#3553ff)', 'stroke-width': '1.6' }));
      pts.forEach(function (p, i) { if (i % 2 === 0 || i === pts.length - 1) svg.appendChild(svgEl('circle', { cx: px(p[0]), cy: py(p[1]), r: i === pts.length - 1 ? '5' : '2.4', fill: 'var(--blueprint,#3553ff)' })); });
      svg.appendChild(svgEl('circle', { cx: px(0), cy: py(0), r: '3', fill: 'var(--warn,#b8870f)' }));
      var last = pts[pts.length - 1];
      var dist = Math.sqrt(last[0] * last[0] + last[1] * last[1]);
      status.innerHTML = '‖θ − θ*‖ = ' + dist.toFixed(3);
      meta.textContent = '金色点是最小值 · ' + (state.opt === 'sgd' ? '普通随机梯度下降（SGD）在陡峭谷壁之间来回振荡' : state.opt === 'momentum' ? '动量（Momentum）平滑来回振荡，沿谷地下降' : 'Adam 对各坐标轴重新缩放，让陡峭和平缓方向同步前进');
      formula.textContent = 'f(x,y) = ½(x² + 20y²)   条件数（Condition Number）20 · ' + STEPS + ' 步';
    };
    var grid = el('div', { class: 'lf-grid' }, [
      select(state, 'opt', '优化器（Optimizer）', [['SGD', 'sgd'], ['动量（Momentum）', 'momentum'], ['Adam', 'adam']]),
      slider(state, 'lr', '学习率（Learning Rate）', 0.01, 0.18, 0.005)
    ]);
    host.appendChild(el('div', { class: 'lf' }, [
      el('div', { class: 'lf-head' }, [el('span', { class: 'lf-label' }, ['优化器轨迹（Optimizer Trajectory）']), el('span', {}, ['选择优化器，调整学习率'])]),
      el('div', { class: 'lf-body' }, [grid, el('div', { class: 'lf-out' }, [svg, el('div', { style: 'margin-top:10px' }, [status]), meta, formula])]),
      el('div', { class: 'lf-cap' }, ['损失曲面（Loss Landscape）像一条狭窄峡谷：沿 x 方向平缓，沿 y 方向陡峭 20 倍。普通随机梯度下降（SGD）在陡峭谷壁之间反弹，沿谷地缓慢前进。动量（Momentum）平滑这种反弹；Adam 对每个方向归一化，使两个坐标轴以相近速度收敛（Converge）。'])
    ]));
    state._render();
  }

  // ── weight-init-variance: 三种方案中激活标准差（Activation std）随深度的变化 ──
  function weightInitVariance(host) {
    var state = { scheme: 'xavier', fanin: 256 };
    var L = 10;
    var W = 520, H = 220, PAD = 34;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var status = el('span', { class: 'lf-num' });
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    // 线性/tanh 层堆栈的方差递推（Variance recursion）：var_out = n * w_var * var_in.
    // 增益（Gain）g = n * w_var。朴素方案（Naive）：w_var = 1（g = n，发生爆炸）。Xavier：w_var=1/n（g≈1）。
    // He：w_var=2/n，relu 使方差减半 → 有效 g≈1。
    function gain() {
      var n = state.fanin;
      if (state.scheme === 'naive') return n * 1.0 / 50;        // 进行缩放，使增长在图中可见
      if (state.scheme === 'xavier') return n * (1.0 / n);      // = 1
      return 0.5 * n * (2.0 / n);                               // He 配合 relu 减半 = 1
    }
    function px(l) { return PAD + l / L * (W - 2 * PAD); }
    function py(logstd) { // log10(std) 位于 [-4,4]
      var t = clamp((logstd + 4) / 8, 0, 1);
      return H - PAD - t * (H - 2 * PAD);
    }
    state._render = function () {
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      svg.appendChild(svgEl('line', { x1: PAD, y1: py(0), x2: W - PAD, y2: py(0), stroke: 'var(--rule-soft,#ddd)', 'stroke-width': '1', 'stroke-dasharray': '3 3' }));
      var g = gain(), varc = 1, d = '', l, lastStd = 1;
      for (l = 0; l <= L; l++) {
        var std = Math.sqrt(varc);
        lastStd = std;
        d += (l ? 'L' : 'M') + px(l).toFixed(1) + ' ' + py(Math.log(std) / Math.LN10).toFixed(1) + ' ';
        varc *= g;
      }
      svg.appendChild(svgEl('path', { d: d, fill: 'none', stroke: 'var(--blueprint,#3553ff)', 'stroke-width': '2' }));
      for (l = 0; l <= L; l++) { var v = Math.pow(g, l); svg.appendChild(svgEl('circle', { cx: px(l), cy: py(Math.log(Math.sqrt(v)) / Math.LN10), r: '2.6', fill: 'var(--blueprint,#3553ff)' })); }
      status.innerHTML = lastStd < 1e-3 ? '≈ ' + lastStd.toExponential(1) + ' <small>第 10 层标准差（Std）</small>' : lastStd.toFixed(lastStd < 10 ? 2 : 0) + ' <small>第 10 层标准差（Std）</small>';
      var verdict = state.scheme === 'naive' ? '激活爆炸（Exploding）：激活值逐层增大'
        : '稳定：全部十层的方差都保持在 1 附近';
      meta.textContent = '每层增益（Gain）' + g.toFixed(2) + '  ·  ' + verdict;
      formula.textContent = state.scheme === 'naive' ? 'Var = 1（过大）→ 增益（Gain）= n·Var，随宽度增长'
        : state.scheme === 'xavier' ? 'Var(w) = 1/n → 增益（Gain）≈ 1' : 'Var(w) = 2/n → 经过 ReLU 后增益（Gain）≈ 1';
    };
    var grid = el('div', { class: 'lf-grid' }, [
      select(state, 'scheme', '初始化方案（Initialization）', [['朴素方案（Naive，权重较大）', 'naive'], ['Xavier / Glorot', 'xavier'], ['He / Kaiming', 'he']]),
      slider(state, 'fanin', '输入连接数（Fan-in）n', 64, 1024, 64)
    ]);
    host.appendChild(el('div', { class: 'lf' }, [
      el('div', { class: 'lf-head' }, [el('span', { class: 'lf-label' }, ['权重初始化方差（Weight Init Variance）']), el('span', {}, ['选择方案'])]),
      el('div', { class: 'lf-body' }, [grid, el('div', { class: 'lf-out' }, [svg, el('div', { style: 'margin-top:10px' }, [status]), meta, formula])]),
      el('div', { class: 'lf-cap' }, ['每层都将激活方差（Activation Variance）乘以增益（Gain）n·Var(w)。朴素的大权重方案使增益随宽度增长，导致激活爆炸，图中使用对数坐标轴（Log Axis）。Xavier 设定 Var(w)=1/n，He 针对 ReLU 设定为 2/n；两者都将增益保持在 1 附近，让信号幅值随深度保持稳定。'])
    ]));
    state._render();
  }

  // ── dropout-mask: 拖动 p，丢弃确定性比例的单元 ──
  function dropoutMask(host) {
    var state = { p: 0.3 };
    var N = 24;
    var W = 520, H = 200, COLS = 8, PAD = 24;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var status = el('span', { class: 'lf-num' });
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    state._render = function () {
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      var rows = Math.ceil(N / COLS);
      var cw = (W - 2 * PAD) / COLS, ch = (H - 2 * PAD) / rows;
      var r = Math.min(cw, ch) / 2 - 5;
      var dropped = 0, i;
      var nDrop = Math.round(state.p * N);
      var dropSet = {};
      for (i = 0; i < nDrop; i++) { dropSet[Math.floor((i + 0.5) * N / Math.max(1, nDrop))] = true; }
      for (i = 0; i < N; i++) {
        var col = i % COLS, row = Math.floor(i / COLS);
        var cx = PAD + col * cw + cw / 2, cy = PAD + row * ch + ch / 2;
        var off = !!dropSet[i];
        if (off) dropped++;
        svg.appendChild(svgEl('circle', { cx: cx.toFixed(1), cy: cy.toFixed(1), r: r.toFixed(1), fill: off ? 'var(--rule-soft,#ddd)' : 'var(--blueprint,#3553ff)', stroke: off ? 'var(--rule-soft,#ccc)' : 'var(--blueprint,#3553ff)', 'stroke-width': '1', opacity: off ? '0.45' : '1' }));
      }
      var scale = 1 / (1 - Math.min(0.95, state.p));
      status.innerHTML = dropped + ' <small>/ ' + N + ' 个单元被丢弃（Dropped）</small>';
      meta.textContent = '保留的单元按 1/(1−p) = ' + scale.toFixed(2) + ' 缩放，使总和的期望（Expectation）保持不变';
      formula.textContent = '以概率 p = ' + state.p.toFixed(2) + ' 丢弃每个单元，再将保留单元除以 (1 − p)';
    };
    var grid = el('div', {}, [slider(state, 'p', '随机失活率（Dropout Rate）p', 0, 0.9, 0.05)]);
    host.appendChild(el('div', { class: 'lf' }, [
      el('div', { class: 'lf-head' }, [el('span', { class: 'lf-label' }, ['随机失活掩码（Dropout Mask）']), el('span', {}, ['调整失活率'])]),
      el('div', { class: 'lf-body' }, [grid, el('div', { class: 'lf-out' }, [svg, el('div', { style: 'margin-top:10px' }, [status]), meta, formula])]),
      el('div', { class: 'lf-cap' }, ['随机失活（Dropout）每步将比例为 p 的单元置零，防止网络依赖某一个单元。由于只有保留的单元传递信号，要将其放大 1/(1−p) 倍以保持激活期望（Expected Activation）不变；测试时则运行完整层，不再缩放。'])
    ]));
    state._render();
  }

  // ── batchnorm-effect: 平移输入，观察批量归一化（BN）将其重新居中 ──
  function batchnormEffect(host) {
    var state = { shift: 1.4, scaleIn: 1.8 };
    var W = 520, H = 220, PAD = 30;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var status = el('span', { class: 'lf-num' });
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    var RNG = 6;
    function px(x) { return PAD + (x + RNG) / (2 * RNG) * (W - 2 * PAD); }
    function py(v, peak) { return H - PAD - (v / peak) * (H - 2 * PAD); }
    function gauss(x, mu, sd) { return Math.exp(-0.5 * Math.pow((x - mu) / sd, 2)); }
    state._render = function () {
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      svg.appendChild(svgEl('line', { x1: px(0), y1: PAD, x2: px(0), y2: H - PAD, stroke: 'var(--rule-soft,#ddd)', 'stroke-width': '1', 'stroke-dasharray': '3 3' }));
      var muIn = state.shift, sdIn = Math.max(0.2, state.scaleIn);
      var i, d1 = '', d2 = '';
      // 激活前分布（Pre-activation distribution），已经平移并缩放
      for (i = 0; i <= 140; i++) { var x = -RNG + 2 * RNG * i / 140; d1 += (i ? 'L' : 'M') + px(x).toFixed(1) + ' ' + py(gauss(x, muIn, sdIn), 1).toFixed(1) + ' '; }
      svg.appendChild(svgEl('path', { d: d1, fill: 'none', stroke: 'var(--ink-mute,#999)', 'stroke-width': '2' }));
      // 经过 BN 后：均值为零、方差为一
      for (i = 0; i <= 140; i++) { var x2 = -RNG + 2 * RNG * i / 140; d2 += (i ? 'L' : 'M') + px(x2).toFixed(1) + ' ' + py(gauss(x2, 0, 1), 1).toFixed(1) + ' '; }
      svg.appendChild(svgEl('path', { d: d2, fill: 'none', stroke: 'var(--blueprint,#3553ff)', 'stroke-width': '2' }));
      status.innerHTML = 'μ ' + muIn.toFixed(2) + ' → 0 <small>· σ ' + sdIn.toFixed(2) + ' → 1</small>';
      meta.textContent = '灰色表示原始预激活值（Pre-activation），蓝色表示批归一化后的结果 · 每个批次都重新居中和缩放';
      formula.textContent = 'x̂ = (x − μ_B) / √(σ²_B + ε)，然后 y = γ·x̂ + β';
    };
    var grid = el('div', { class: 'lf-grid' }, [
      slider(state, 'shift', '输入均值偏移（Mean Shift）', -3, 3, 0.1),
      slider(state, 'scaleIn', '输入标准差（Std）σ', 0.3, 3, 0.1)
    ]);
    host.appendChild(el('div', { class: 'lf' }, [
      el('div', { class: 'lf-head' }, [el('span', { class: 'lf-label' }, ['批归一化（Batch Norm）']), el('span', {}, ['调整输入偏移'])]),
      el('div', { class: 'lf-body' }, [grid, el('div', { class: 'lf-out' }, [svg, el('div', { style: 'margin-top:10px' }, [status]), meta, formula])]),
      el('div', { class: 'lf-cap' }, ['无论下层传来的数据具有什么均值和离散程度（灰色），批归一化（Batch Normalization）都会减去批次均值并除以批次标准差，将分布变为零均值、单位方差（蓝色）。如果其他尺度更有用，可学习参数（Learnable Parameter）γ 和 β 允许网络再次伸缩该分布。'])
    ]));
    state._render();
  }

  // ── learning-curves: 容量（Capacity）与训练/验证损失的关系，标出早停（Early stopping） ──
  function learningCurves(host) {
    var state = { cap: 6 };
    var W = 520, H = 230, PAD = 34, CMAX = 14;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var status = el('span', { class: 'lf-num' });
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    // 训练损失单调下降；验证损失呈 U 形（偏差项下降，方差项上升）
    function train(c) { return 0.3 + 4.5 / (c + 0.5); }
    function val(c) { return 4.5 / (c + 0.5) + 0.11 * c + 0.45; }
    var best = 1, bv = 1e9, c;
    for (c = 1; c <= CMAX; c++) { if (val(c) < bv) { bv = val(c); best = c; } }
    var YMAX = Math.max(val(1), train(1), val(CMAX)) + 0.4;
    function px(c2) { return PAD + (c2 - 1) / (CMAX - 1) * (W - 2 * PAD); }
    function py(y) { return H - PAD - (y / YMAX) * (H - 2 * PAD); }
    function curve(fn, stroke) { var d = '', i; for (i = 0; i <= 80; i++) { var x = 1 + (CMAX - 1) * i / 80; d += (i ? 'L' : 'M') + px(x).toFixed(1) + ' ' + py(fn(x)).toFixed(1) + ' '; } return svgEl('path', { d: d, fill: 'none', stroke: stroke, 'stroke-width': '2' }); }
    state._render = function () {
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      svg.appendChild(svgEl('line', { x1: px(best), y1: PAD, x2: px(best), y2: H - PAD, stroke: 'var(--warn,#b8870f)', 'stroke-width': '1.5', 'stroke-dasharray': '4 3' }));
      svg.appendChild(curve(train, 'var(--ink-mute,#999)'));
      svg.appendChild(curve(val, 'var(--blueprint,#3553ff)'));
      svg.appendChild(svgEl('circle', { cx: px(state.cap), cy: py(val(state.cap)), r: '5', fill: 'var(--blueprint,#3553ff)' }));
      svg.appendChild(svgEl('circle', { cx: px(state.cap), cy: py(train(state.cap)), r: '4', fill: 'var(--ink-mute,#999)' }));
      var gap = val(state.cap) - train(state.cap);
      status.innerHTML = '差距（Gap）' + gap.toFixed(2) + ' <small>· ' + (state.cap < best ? '欠拟合（Underfit）' : state.cap > best ? '过拟合（Overfit）' : '最佳') + '</small>';
      meta.textContent = '训练损失（Train）' + train(state.cap).toFixed(2) + '  ·  验证损失（Val）' + val(state.cap).toFixed(2) + '  ·  容量达到 ' + best + ' 时早停（Early Stop，金线）';
      formula.textContent = '训练损失随容量增大而下降；验证损失呈 U 形；在验证损失最低处停止';
    };
    var grid = el('div', {}, [slider(state, 'cap', '模型容量（Capacity）/ 轮次（Epochs）', 1, CMAX, 1)]);
    host.appendChild(el('div', { class: 'lf' }, [
      el('div', { class: 'lf-head' }, [el('span', { class: 'lf-label' }, ['学习曲线（Learning Curves）']), el('span', {}, ['调整容量'])]),
      el('div', { class: 'lf-body' }, [grid, el('div', { class: 'lf-out' }, [svg, el('div', { style: 'margin-top:10px' }, [status]), meta, formula])]),
      el('div', { class: 'lf-cap' }, ['灰色表示训练损失（Training Loss），蓝色表示验证损失（Validation Loss）。容量增大始终使训练损失下降，但当模型开始记忆噪声时，验证损失会先降至谷底再上升。差距扩大是过拟合（Overfitting）的信号；金线标记早停（Early Stopping）应当固定模型的位置。'])
    ]));
    state._render();
  }

  // ── gradient-clipping: 限制范数（Norm），控制爆炸的更新 ──
  function gradientClipping(host) {
    var state = { thresh: 1.0, norm: 4.0 };
    var W = 520, H = 200, PAD = 32, GMAX = 8;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var status = el('span', { class: 'lf-num' });
    var bar = el('i');
    var barWrap = el('div', { class: 'lf-bar' }, [bar]);
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    function px(g) { return PAD + g / GMAX * (W - 2 * PAD); }
    function py(g) { return H - PAD - g / GMAX * (H - 2 * PAD); }
    state._render = function () {
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      // 恒等线（Identity line）y = x，即阈值之前的裁剪输出
      svg.appendChild(svgEl('line', { x1: px(0), y1: py(0), x2: px(GMAX), y2: py(GMAX), stroke: 'var(--rule-soft,#ddd)', 'stroke-width': '1', 'stroke-dasharray': '3 3' }));
      // 裁剪响应（Clip response）：out = min(g, thresh)
      var t = state.thresh;
      var d = 'M' + px(0) + ' ' + py(0) + ' L' + px(t) + ' ' + py(t) + ' L' + px(GMAX) + ' ' + py(t);
      svg.appendChild(svgEl('path', { d: d, fill: 'none', stroke: 'var(--blueprint,#3553ff)', 'stroke-width': '2' }));
      // 阈值标记（Threshold marker）
      svg.appendChild(svgEl('line', { x1: px(t), y1: PAD, x2: px(t), y2: H - PAD, stroke: 'var(--warn,#b8870f)', 'stroke-width': '1', 'stroke-dasharray': '2 3' }));
      var clipped = Math.min(state.norm, t);
      var raw = state.norm;
      // 当前点
      svg.appendChild(svgEl('circle', { cx: px(raw), cy: py(clipped), r: '5', fill: 'var(--blueprint,#3553ff)' }));
      var scale = raw > t ? t / raw : 1;
      status.innerHTML = clipped.toFixed(2) + ' <small>裁剪后范数（Clipped Norm）</small>';
      bar.style.width = Math.min(100, clipped / GMAX * 100) + '%';
      barWrap.classList.toggle('over', raw > t);
      meta.textContent = raw > t ? '梯度爆炸（Exploding）：原始范数 ' + raw.toFixed(2) + ' 缩放 ' + scale.toFixed(2) + ' 倍，降至上限'
        : '未超上限：梯度保持不变';
      formula.textContent = '若 ‖g‖ > τ：g ← g · τ / ‖g‖ → 裁剪后 = min(‖g‖, τ) = min(' + raw.toFixed(1) + ', ' + t.toFixed(1) + ')';
    };
    var grid = el('div', { class: 'lf-grid' }, [
      slider(state, 'thresh', '裁剪阈值（Clip Threshold）τ', 0.2, 6, 0.1),
      slider(state, 'norm', '原始梯度范数（Gradient Norm）', 0.2, 8, 0.1)
    ]);
    host.appendChild(el('div', { class: 'lf' }, [
      el('div', { class: 'lf-head' }, [el('span', { class: 'lf-label' }, ['梯度裁剪（Gradient Clipping）']), el('span', {}, ['调整阈值与范数'])]),
      el('div', { class: 'lf-body' }, [grid, el('div', { class: 'lf-out' }, [svg, el('div', { style: 'margin-top:10px' }, [status]), barWrap, meta, formula])]),
      el('div', { class: 'lf-cap' }, ['梯度范数（Gradient Norm）突然增大时，一次更新就可能使权重偏离正常范围。梯度裁剪（Gradient Clipping）会把范数超过阈值 τ 的梯度缩放到 τ，保留方向并限制幅值。低于 τ 时梯度不变；高于 τ 时，更新幅值被限制为 min(‖g‖, τ)。'])
    ]));
    state._render();
  }

  LF.register({
    'perceptron-boundary': perceptronBoundary,
    'mlp-forward': mlpForward,
    'backprop-vanishing': backpropVanishing,
    'optimizer-trajectory': optimizerTrajectory,
    'weight-init-variance': weightInitVariance,
    'dropout-mask': dropoutMask,
    'batchnorm-effect': batchnormEffect,
    'learning-curves': learningCurves,
    'gradient-clipping': gradientClipping
  });
})();
