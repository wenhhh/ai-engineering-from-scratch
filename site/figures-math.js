/* figures-math.js：阶段 1 数学基础（Math Foundations）的交互图表。
   在 lesson-figures.js 之后加载，仅使用共享 LF 工具，通过 CSS 变量适配蓝图主题。
   使用同样的围栏语法：
       ```figure
       vector-projection
       ``` */
(function () {
  'use strict';
  var LF = window.LF;
  if (!LF) { return; }
  var el = LF.el, svgEl = LF.svgEl, slider = LF.slider, select = LF.select;

  // vector-projection：将 a 投影到 b，观察垂足移动。
  function vectorProjection(host) {
    var state = { degB: 25, lenA: 2.4, degA: 70 };
    var W = 520, H = 230, OX = 60, OY = H - 40, U = 52;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var num = el('span', { class: 'lf-num' });
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    function arrow(x2, y2, st, w) { return svgEl('line', { x1: OX, y1: OY, x2: OX + x2 * U, y2: OY - y2 * U, stroke: st, 'stroke-width': w || '2.5' }); }
    state._render = function () {
      var ra = state.degA * Math.PI / 180, rb = state.degB * Math.PI / 180;
      var ax = state.lenA * Math.cos(ra), ay = state.lenA * Math.sin(ra);
      var bx = Math.cos(rb), by = Math.sin(rb);                 // b is a unit direction
      var dot = ax * bx + ay * by;                              // a·b, |b|=1
      var projLen = dot;                                        // scalar projection = |a|cos(theta)
      var px = projLen * bx, py = projLen * by;                 // projection vector (a·b/|b|^2) b
      var lenA = Math.sqrt(ax * ax + ay * ay);
      var theta = Math.acos(LF.clamp(dot / (lenA || 1), -1, 1)) * 180 / Math.PI;
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      svg.appendChild(arrow(3.4 * bx, 3.4 * by, 'var(--ink-mute,#999)', '2'));     // direction of b
      svg.appendChild(arrow(ax, ay, 'var(--blueprint,#3553ff)'));                  // a
      svg.appendChild(arrow(px, py, 'var(--warn,#b8870f)', '3'));                  // projection onto b
      svg.appendChild(svgEl('line', { x1: OX + ax * U, y1: OY - ay * U, x2: OX + px * U, y2: OY - py * U, stroke: 'var(--rule-soft,#ccc)', 'stroke-width': '1', 'stroke-dasharray': '4 3' }));
      num.innerHTML = projLen.toFixed(2) + ' <small>投影长度（Projection Length）</small>';
      meta.textContent = '夹角（Angle）θ = ' + theta.toFixed(0) + '°  ·  proj = |a|cos θ = ' + projLen.toFixed(2) + (projLen < 0 ? '  （指向 b 的反方向）' : '');
      formula.textContent = 'proj_b a = (a·b / |b|²) b   ·   标量（Scalar）= |a|cos θ   ·   b 以灰色单位向量（Unit Vector）表示';
    };
    var grid = el('div', { class: 'lf-grid' }, [
      slider(state, 'degB', 'b 的角度（Angle）', 0, 180, 1),
      slider(state, 'degA', 'a 的角度（Angle）', 0, 180, 1),
      slider(state, 'lenA', 'a 的长度（Length）', 0.4, 3.4, 0.1)
    ]);
    host.appendChild(el('div', { class: 'lf' }, [
      el('div', { class: 'lf-head' }, [el('span', { class: 'lf-label' }, ['向量投影（Vector Projection）']), el('span', {}, ['调整两个角度'])]),
      el('div', { class: 'lf-body' }, [grid, el('div', { class: 'lf-out' }, [svg, el('div', { style: 'margin-top:10px' }, [num]), meta, formula])]),
      el('div', { class: 'lf-cap' }, ['蓝色表示 a，灰色表示 b 的方向，橙色表示 a 在 b 上的投影（Projection）。两向量垂直时，标量投影（Scalar Projection）|a|cos θ 缩小为零；夹角超过 90° 后，投影变为负数。虚线从 a 的端点垂直连到它在 b 上的垂足。'])
    ]));
    state._render();
  }

  // matrix-transform：2x2 矩阵使单位正方形发生变换。
  function matrixTransform(host) {
    var state = { a: 1, b: 0.5, c: 0, d: 1 };
    var W = 520, H = 230, CX = 260, CY = 120, U = 42;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var num = el('span', { class: 'lf-num' });
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    function P(x, y) { return (CX + x * U) + ' ' + (CY - y * U); }
    function quad(p, st, fill) { return svgEl('path', { d: 'M ' + P(p[0][0], p[0][1]) + ' L ' + P(p[1][0], p[1][1]) + ' L ' + P(p[2][0], p[2][1]) + ' L ' + P(p[3][0], p[3][1]) + ' Z', fill: fill, stroke: st, 'stroke-width': '2' }); }
    state._render = function () {
      var a = state.a, b = state.b, c = state.c, d = state.d;
      var det = a * d - b * c;
      var unit = [[0, 0], [1, 0], [1, 1], [0, 1]];
      var tf = unit.map(function (v) { return [a * v[0] + b * v[1], c * v[0] + d * v[1]]; });
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      svg.appendChild(svgEl('line', { x1: 20, y1: CY, x2: W - 20, y2: CY, stroke: 'var(--rule-soft,#eee)', 'stroke-width': '1' }));
      svg.appendChild(svgEl('line', { x1: CX, y1: 12, x2: CX, y2: H - 12, stroke: 'var(--rule-soft,#eee)', 'stroke-width': '1' }));
      svg.appendChild(quad(unit, 'var(--ink-mute,#999)', 'none'));
      svg.appendChild(quad(tf, 'var(--blueprint,#3553ff)', det < 0 ? 'var(--warn,#b8870f)' : 'var(--blueprint,#3553ff)'));
      var img = svg.lastChild; img.setAttribute('fill-opacity', '0.12');
      num.innerHTML = det.toFixed(2) + ' <small>行列式（Determinant）</small>';
      meta.textContent = (det < 0 ? '方向已翻转 · ' : det === 0 ? '已塌缩成直线 · ' : '') + '面积缩放倍数：' + Math.abs(det).toFixed(2) + 'x';
      formula.textContent = 'M = [[' + a.toFixed(1) + ', ' + b.toFixed(1) + '], [' + c.toFixed(1) + ', ' + d.toFixed(1) + ']]   ·   det = ad − bc = ' + det.toFixed(2);
    };
    var grid = el('div', { class: 'lf-grid' }, [
      slider(state, 'a', 'a  (M₁₁)', -2, 2, 0.1),
      slider(state, 'b', 'b  (M₁₂)', -2, 2, 0.1),
      slider(state, 'c', 'c  (M₂₁)', -2, 2, 0.1),
      slider(state, 'd', 'd  (M₂₂)', -2, 2, 0.1)
    ]);
    host.appendChild(el('div', { class: 'lf' }, [
      el('div', { class: 'lf-head' }, [el('span', { class: 'lf-label' }, ['矩阵变换（Matrix Transform）']), el('span', {}, ['调整四个矩阵元素'])]),
      el('div', { class: 'lf-body' }, [grid, el('div', { class: 'lf-out' }, [svg, el('div', { style: 'margin-top:10px' }, [num]), meta, formula])]),
      el('div', { class: 'lf-cap' }, ['灰色是单位正方形，蓝色是它经过 M 变换后的像（Image）。M 的各列给出基向量（Basis Vector）变换后的落点。行列式（Determinant）ad − bc 是该平行四边形的有向面积（Signed Area），表示矩阵对面积的缩放倍数；变换翻转方向时，它变为负数。'])
    ]));
    state._render();
  }

  // eigen-directions：2x2 对称矩阵沿特征向量缩放，其他方向还会旋转。
  function eigenDirections(host) {
    var state = { a: 2, c: 0.8, d: 1, deg: 30 };
    var W = 520, H = 230, CX = 200, CY = 120, U = 34;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var num = el('span', { class: 'lf-num' });
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    function arrow(vx, vy, st, w) { return svgEl('line', { x1: CX, y1: CY, x2: CX + vx * U, y2: CY - vy * U, stroke: st, 'stroke-width': w || '2' }); }
    state._render = function () {
      var a = state.a, b = state.c, d = state.d;                 // symmetric: M = [[a,b],[b,d]]
      var tr = a + d, det = a * d - b * b;
      var disc = Math.sqrt(Math.max(0, tr * tr / 4 - det));
      var l1 = tr / 2 + disc, l2 = tr / 2 - disc;                // real eigenvalues (symmetric)
      function eigvec(l) {
        var ex = b, ey = l - a;
        if (Math.abs(ex) < 1e-6 && Math.abs(ey) < 1e-6) { ex = 1; ey = 0; }
        var n = Math.sqrt(ex * ex + ey * ey); return [ex / n, ey / n];
      }
      var v1 = eigvec(l1), v2 = eigvec(l2);
      var r = state.deg * Math.PI / 180, gx = Math.cos(r), gy = Math.sin(r);
      var tx = a * gx + b * gy, ty = b * gx + d * gy;            // M applied to the generic vector
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      svg.appendChild(svgEl('line', { x1: 20, y1: CY, x2: 380, y2: CY, stroke: 'var(--rule-soft,#eee)', 'stroke-width': '1' }));
      svg.appendChild(svgEl('line', { x1: CX, y1: 12, x2: CX, y2: H - 12, stroke: 'var(--rule-soft,#eee)', 'stroke-width': '1' }));
      [v1, v2].forEach(function (v) {                            // eigenvectors both directions: invariant axes
        svg.appendChild(svgEl('line', { x1: CX - v[0] * 80, y1: CY + v[1] * 80, x2: CX + v[0] * 80, y2: CY - v[1] * 80, stroke: 'var(--ink-mute,#999)', 'stroke-width': '1', 'stroke-dasharray': '4 3' }));
      });
      svg.appendChild(arrow(v1[0] * l1 / 2, v1[1] * l1 / 2, 'var(--warn,#b8870f)', '3'));   // scaled eigenvector 1
      svg.appendChild(arrow(v2[0] * l2 / 2, v2[1] * l2 / 2, 'var(--warn,#b8870f)', '3'));   // scaled eigenvector 2
      svg.appendChild(arrow(gx, gy, 'var(--rule-soft,#bbb)', '1.5'));                       // generic input
      svg.appendChild(arrow(tx, ty, 'var(--blueprint,#3553ff)', '2.5'));                    // its image (rotated)
      num.innerHTML = 'λ = ' + l1.toFixed(2) + ', ' + l2.toFixed(2);
      meta.textContent = '特征值（Eigenvalue）决定沿虚线轴的伸缩 · 不在轴上的灰色输入向量旋转为蓝色向量';
      formula.textContent = 'M = [[' + a.toFixed(1) + ', ' + b.toFixed(1) + '], [' + b.toFixed(1) + ', ' + d.toFixed(1) + ']]   ·   只有沿特征轴（Eigen-axis）才满足 Mv = λv';
    };
    var grid = el('div', { class: 'lf-grid' }, [
      slider(state, 'a', 'a  (M₁₁)', -2, 3, 0.1),
      slider(state, 'd', 'd  (M₂₂)', -2, 3, 0.1),
      slider(state, 'c', '非对角元素（Off-diagonal）b', -2, 2, 0.1),
      slider(state, 'deg', '一般向量的角度（Angle）', 0, 360, 1)
    ]);
    host.appendChild(el('div', { class: 'lf' }, [
      el('div', { class: 'lf-head' }, [el('span', { class: 'lf-label' }, ['特征方向（Eigen-directions）']), el('span', {}, ['调整矩阵元素'])]),
      el('div', { class: 'lf-body' }, [grid, el('div', { class: 'lf-out' }, [svg, el('div', { style: 'margin-top:10px' }, [num]), meta, formula])]),
      el('div', { class: 'lf-cap' }, ['对于对称矩阵（Symmetric Matrix），虚线轴表示特征向量（Eigenvector）的方向；矩阵只会按特征值（Eigenvalue）对沿这些轴的向量进行伸缩，橙色向量展示了这一结果。不在这些轴上的一般灰色向量则既伸缩又旋转，得到蓝色的像（Image）。调整角度可以看到：只有位于特征轴上，输出才与输入保持平行。'])
    ]));
    state._render();
  }

  // derivative-tangent：f(x)=x^3-3x 在 x0 处的切线。
  function derivativeTangent(host) {
    var state = { x0: -1.6 };
    var W = 520, H = 230, PAD = 30, XR = 2.4, YR = 4.2;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var num = el('span', { class: 'lf-num' });
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    function f(x) { return x * x * x - 3 * x; }
    function df(x) { return 3 * x * x - 3; }
    function px(x) { return PAD + (x + XR) / (2 * XR) * (W - 2 * PAD); }
    function py(y) { return H / 2 - (y / YR) * (H / 2 - PAD); }
    state._render = function () {
      var x0 = state.x0, slope = df(x0), y0 = f(x0);
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      svg.appendChild(svgEl('line', { x1: PAD, y1: py(0), x2: W - PAD, y2: py(0), stroke: 'var(--rule-soft,#eee)', 'stroke-width': '1' }));
      svg.appendChild(svgEl('line', { x1: px(0), y1: PAD, x2: px(0), y2: H - PAD, stroke: 'var(--rule-soft,#eee)', 'stroke-width': '1' }));
      var d = '', i; for (i = 0; i <= 140; i++) { var x = -XR + 2 * XR * i / 140; d += (i ? 'L' : 'M') + px(x).toFixed(1) + ' ' + py(f(x)).toFixed(1) + ' '; }
      svg.appendChild(svgEl('path', { d: d, fill: 'none', stroke: 'var(--blueprint,#3553ff)', 'stroke-width': '2' }));
      var xL = -XR, xRr = XR;                                    // tangent: y = y0 + slope*(x-x0)
      svg.appendChild(svgEl('line', { x1: px(xL), y1: py(y0 + slope * (xL - x0)), x2: px(xRr), y2: py(y0 + slope * (xRr - x0)), stroke: 'var(--warn,#b8870f)', 'stroke-width': '1.8' }));
      svg.appendChild(svgEl('circle', { cx: px(x0), cy: py(y0), r: '5', fill: 'var(--blueprint,#3553ff)' }));
      num.innerHTML = slope.toFixed(2) + ' <small>斜率（Slope）f′(x₀)</small>';
      meta.textContent = 'x₀ = ' + x0.toFixed(2) + '  ·  f(x₀) = ' + y0.toFixed(2) + '  ·  ' + (Math.abs(slope) < 0.05 ? '水平：临界点（Critical Point）' : slope > 0 ? '上升' : '下降');
      formula.textContent = "f(x) = x³ − 3x   ·   f′(x) = 3x² − 3   ·   切线（Tangent）y = f(x₀) + f′(x₀)(x − x₀)";
    };
    var grid = el('div', {}, [slider(state, 'x0', '取点 x₀', -2.3, 2.3, 0.05)]);
    host.appendChild(el('div', { class: 'lf' }, [
      el('div', { class: 'lf-head' }, [el('span', { class: 'lf-label' }, ['导数与切线（Derivative / Tangent）']), el('span', {}, ['调整 x₀'])]),
      el('div', { class: 'lf-body' }, [grid, el('div', { class: 'lf-out' }, [svg, el('div', { style: 'margin-top:10px' }, [num]), meta, formula])]),
      el('div', { class: 'lf-cap' }, ['导数（Derivative）就是切线（Tangent）的斜率。对于 f(x) = x³ − 3x，导数为 3x² − 3，在 x = ±1 处为零；这两个临界点（Critical Point）处的橙色切线变为水平线。函数在两点之间下降，在两侧上升。梯度下降（Gradient Descent）正是根据这个斜率决定向哪一侧迈步。'])
    ]));
    state._render();
  }

  // chain-rule：y = sin(a x^2) 的 dy/dx 等于局部导数的乘积。
  function chainRule(host) {
    var state = { x: 1.0, a: 1.5 };
    var num = el('span', { class: 'lf-num' });
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    var rows = el('div', {});
    function bar(label, value, ref) {
      var b = el('i'); b.style.width = LF.clamp(Math.abs(value) / ref * 100, 0, 100).toFixed(0) + '%';
      if (value < 0) b.style.background = 'var(--warn,#b8870f)';
      return el('div', { class: 'lf-ctrl' }, [el('label', {}, [label, el('b', {}, [value.toFixed(3)])]), el('div', { class: 'lf-bar' }, [b])]);
    }
    state._render = function () {
      var x = state.x, a = state.a;
      var u = a * x * x;                 // inner: u = a x^2
      var dydu = Math.cos(u);            // outer derivative: d/du sin(u) = cos(u)
      var dudx = 2 * a * x;              // inner derivative: du/dx = 2 a x
      var dydx = dydu * dudx;            // chain rule product
      while (rows.firstChild) rows.removeChild(rows.firstChild);
      rows.appendChild(bar('dy/du = cos(a x²)', dydu, 1));
      rows.appendChild(bar('du/dx = 2 a x', dudx, Math.max(1, 2 * Math.abs(a) * 2)));
      rows.appendChild(bar('dy/dx = 乘积（Product）', dydx, Math.max(1, 2 * Math.abs(a) * 2)));
      num.innerHTML = dydx.toFixed(3) + ' <small>dy/dx</small>';
      meta.textContent = 'y = sin(' + u.toFixed(2) + ') = ' + Math.sin(u).toFixed(3) + '  ·  局部斜率相乘：' + dydu.toFixed(2) + ' × ' + dudx.toFixed(2);
      formula.textContent = 'y = sin(a x²)   ·   dy/dx = cos(a x²) · 2 a x   ·   外层导数 × 内层导数';
    };
    var grid = el('div', { class: 'lf-grid' }, [
      slider(state, 'x', 'x', -2.5, 2.5, 0.05),
      slider(state, 'a', 'a', 0.2, 3, 0.1)
    ]);
    host.appendChild(el('div', { class: 'lf' }, [
      el('div', { class: 'lf-head' }, [el('span', { class: 'lf-label' }, ['链式法则（Chain Rule）']), el('span', {}, ['调整 x 和 a'])]),
      el('div', { class: 'lf-body' }, [grid, el('div', { class: 'lf-out' }, [rows, el('div', { style: 'margin-top:12px' }, [num]), meta, formula])]),
      el('div', { class: 'lf-cap' }, ['复合函数（Composite Function）y = sin(a x²) 的导数由两个局部斜率相乘得到：外层为 cos(a x²)，内层为 2 a x。每条橙色或蓝色条形表示一个因子，下方条形表示它们的乘积。反向传播（Backpropagation）逐环节应用这条法则，让梯度传遍整个网络。'])
    ]));
    state._render();
  }

  // gaussian-pdf：调整均值与标准差，标出一个标准差内的区域。
  function gaussianPdf(host) {
    var state = { mu: 0, sigma: 1 };
    var W = 520, H = 220, PAD = 30, XLO = -6, XHI = 6;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var num = el('span', { class: 'lf-num' });
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    function px(x) { return PAD + (x - XLO) / (XHI - XLO) * (W - 2 * PAD); }
    var YMAX = 1 / (0.4 * Math.sqrt(2 * Math.PI));            // peak at the smallest sigma we allow
    function pdf(x, mu, s) { return Math.exp(-0.5 * Math.pow((x - mu) / s, 2)) / (s * Math.sqrt(2 * Math.PI)); }
    function py(y) { return H - PAD - y / YMAX * (H - 2 * PAD); }
    state._render = function () {
      var mu = state.mu, s = state.sigma, peak = pdf(mu, mu, s);
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      svg.appendChild(svgEl('line', { x1: PAD, y1: H - PAD, x2: W - PAD, y2: H - PAD, stroke: 'var(--rule-soft,#eee)', 'stroke-width': '1' }));
      var shade = 'M ' + px(mu - s).toFixed(1) + ' ' + py(0).toFixed(1) + ' ', i, x;   // +-1 sigma band = ~68%
      for (i = 0; i <= 60; i++) { x = (mu - s) + 2 * s * i / 60; shade += 'L ' + px(x).toFixed(1) + ' ' + py(pdf(x, mu, s)).toFixed(1) + ' '; }
      shade += 'L ' + px(mu + s).toFixed(1) + ' ' + py(0).toFixed(1) + ' Z';
      svg.appendChild(svgEl('path', { d: shade, fill: 'var(--blueprint,#3553ff)', 'fill-opacity': '0.16', stroke: 'none' }));
      var d = '';
      for (i = 0; i <= 160; i++) { x = XLO + (XHI - XLO) * i / 160; d += (i ? 'L' : 'M') + px(x).toFixed(1) + ' ' + py(pdf(x, mu, s)).toFixed(1) + ' '; }
      svg.appendChild(svgEl('path', { d: d, fill: 'none', stroke: 'var(--blueprint,#3553ff)', 'stroke-width': '2' }));
      svg.appendChild(svgEl('line', { x1: px(mu), y1: py(0), x2: px(mu), y2: py(peak), stroke: 'var(--ink-mute,#999)', 'stroke-width': '1', 'stroke-dasharray': '3 3' }));
      num.innerHTML = peak.toFixed(3) + ' <small>峰值密度（Peak Density）</small>';
      meta.textContent = 'μ = ' + mu.toFixed(2) + '  ·  σ = ' + s.toFixed(2) + '  ·  ±1σ 阴影区域包含约 68% 的概率质量（Probability Mass）';
      formula.textContent = 'p(x) = exp(−½((x−μ)/σ)²) / (σ√(2π))   ·   总面积的积分始终为 1';
    };
    var grid = el('div', { class: 'lf-grid' }, [
      slider(state, 'mu', '均值（Mean）μ', -4, 4, 0.1),
      slider(state, 'sigma', '标准差（Std）σ', 0.4, 3, 0.05)
    ]);
    host.appendChild(el('div', { class: 'lf' }, [
      el('div', { class: 'lf-head' }, [el('span', { class: 'lf-label' }, ['高斯概率密度（Gaussian PDF）']), el('span', {}, ['调整 μ 和 σ'])]),
      el('div', { class: 'lf-body' }, [grid, el('div', { class: 'lf-out' }, [svg, el('div', { style: 'margin-top:10px' }, [num]), meta, formula])]),
      el('div', { class: 'lf-cap' }, ['均值（Mean）使钟形曲线左右平移，标准差（Standard Deviation）决定曲线宽度。σ 越小，峰越高、越窄，因为总面积始终保持为 1。阴影带对应 μ ± σ，无论曲线移到哪里，它都包含约 68% 的概率。'])
    ]));
    state._render();
  }

  // bayes-update：根据先验、敏感度与假阳性率（FPR）计算医学检测的后验概率。
  function bayesUpdate(host) {
    var state = { prior: 1, sens: 95, fpr: 5 };
    var num = el('span', { class: 'lf-num' });
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    var rows = el('div', {});
    function bar(label, value) {
      var b = el('i'); b.style.width = (value * 100).toFixed(1) + '%';
      return el('div', { class: 'lf-ctrl' }, [el('label', {}, [label, el('b', {}, [(value * 100).toFixed(1) + '%'])]), el('div', { class: 'lf-bar' }, [b])]);
    }
    state._render = function () {
      var pr = state.prior / 100;            // P(disease)
      var sens = state.sens / 100;           // P(+ | disease)
      var fpr = state.fpr / 100;             // P(+ | healthy)
      var pPos = sens * pr + fpr * (1 - pr); // total probability of a positive test
      var post = pPos > 0 ? sens * pr / pPos : 0;   // Bayes: P(disease | +)
      while (rows.firstChild) rows.removeChild(rows.firstChild);
      rows.appendChild(bar('先验概率（Prior）P(disease)', pr));
      rows.appendChild(bar('后验概率（Posterior）P(disease | +)', post));
      num.innerHTML = (post * 100).toFixed(1) + ' <small>%：检测阳性者中的患病比例</small>';
      meta.textContent = '检测阳性的概率为 ' + (pPos * 100).toFixed(1) + '% · 疾病罕见时，多数阳性是误报';
      formula.textContent = 'P(D|+) = sens·prior / (sens·prior + fpr·(1−prior)) = ' + (sens).toFixed(2) + '·' + pr.toFixed(3) + ' / ' + pPos.toFixed(4);
    };
    var grid = el('div', { class: 'lf-grid' }, [
      slider(state, 'prior', '先验概率（Prior）P(disease) %', 0.1, 50, 0.1),
      slider(state, 'sens', '灵敏度（Sensitivity）P(+|D) %', 50, 100, 0.5),
      slider(state, 'fpr', '假阳性率（False-positive Rate）%', 0.5, 30, 0.5)
    ]);
    host.appendChild(el('div', { class: 'lf' }, [
      el('div', { class: 'lf-head' }, [el('span', { class: 'lf-label' }, ['贝叶斯更新（Bayes Update）']), el('span', {}, ['调整先验概率、灵敏度和假阳性率'])]),
      el('div', { class: 'lf-body' }, [grid, el('div', { class: 'lf-out' }, [rows, el('div', { style: 'margin-top:12px' }, [num]), meta, formula])]),
      el('div', { class: 'lf-cap' }, ['贝叶斯（Bayes）推断的反直觉之处在于：对于患病率为百分之一的疾病，即使检测准确率为 95%，检测阳性的人中仍有多数是健康人，因为庞大的健康人群产生的假阳性（False Positive）会淹没少量真实病例。只有先验概率（Prior）高到真实病例超过误报时，后验概率（Posterior）才会升高。'])
    ]));
    state._render();
  }

  // entropy-kl：两个各含 4 个分箱的分布，计算 H(p) 与 KL(p||q)。
  function entropyKl(host) {
    var state = { p0: 5, p1: 3, p2: 2, p3: 1, q0: 1, q1: 2, q2: 3, q3: 4 };
    var num = el('span', { class: 'lf-num' });
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    var rows = el('div', {});
    function norm(v) { var s = v.reduce(function (a, x) { return a + x; }, 0) || 1; return v.map(function (x) { return x / s; }); }
    state._render = function () {
      var p = norm([state.p0, state.p1, state.p2, state.p3]);
      var q = norm([state.q0, state.q1, state.q2, state.q3]);
      var H = -p.reduce(function (a, pi) { return a + (pi > 0 ? pi * Math.log2(pi) : 0); }, 0);
      var KL = p.reduce(function (a, pi, i) { return a + (pi > 0 && q[i] > 0 ? pi * Math.log2(pi / q[i]) : 0); }, 0);
      while (rows.firstChild) rows.removeChild(rows.firstChild);
      p.forEach(function (pi, i) {
        var bp = el('i'); bp.style.width = (pi * 100).toFixed(0) + '%';
        var bq = el('i'); bq.style.width = (q[i] * 100).toFixed(0) + '%'; bq.style.background = 'var(--ink-mute,#999)';
        rows.appendChild(el('div', { class: 'lf-ctrl' }, [
          el('label', {}, ['分箱（Bin）' + i, el('b', {}, ['p ' + (pi * 100).toFixed(0) + '% · q ' + (q[i] * 100).toFixed(0) + '%'])]),
          el('div', { class: 'lf-bar' }, [bp]), el('div', { class: 'lf-bar' }, [bq])
        ]));
      });
      num.innerHTML = H.toFixed(2) + ' <small>比特（Bits）H(p)</small>';
      meta.textContent = 'KL(p‖q) = ' + KL.toFixed(3) + ' 比特（Bits）· 始终 ≥ 0，仅当 p = q 时为零 · 非对称：KL(p‖q) ≠ KL(q‖p)';
      formula.textContent = 'H(p) = −Σ pᵢ log₂ pᵢ   ·   KL(p‖q) = Σ pᵢ log₂(pᵢ / qᵢ)';
    };
    var grid = el('div', { class: 'lf-grid' }, [
      slider(state, 'p0', 'p 分箱（Bin）0', 0, 10, 1), slider(state, 'q0', 'q 分箱（Bin）0', 0, 10, 1),
      slider(state, 'p1', 'p 分箱（Bin）1', 0, 10, 1), slider(state, 'q1', 'q 分箱（Bin）1', 0, 10, 1),
      slider(state, 'p2', 'p 分箱（Bin）2', 0, 10, 1), slider(state, 'q2', 'q 分箱（Bin）2', 0, 10, 1),
      slider(state, 'p3', 'p 分箱（Bin）3', 0, 10, 1), slider(state, 'q3', 'q 分箱（Bin）3', 0, 10, 1)
    ]);
    host.appendChild(el('div', { class: 'lf' }, [
      el('div', { class: 'lf-head' }, [el('span', { class: 'lf-label' }, ['熵与 KL 散度（Entropy & KL）']), el('span', {}, ['调整 p（蓝色）和 q（灰色）的分布'])]),
      el('div', { class: 'lf-body' }, [grid, el('div', { class: 'lf-out' }, [rows, el('div', { style: 'margin-top:12px' }, [num]), meta, formula])]),
      el('div', { class: 'lf-cap' }, ['熵（Entropy）H(p) 衡量蓝色分布的平均惊讶程度，四个分箱的概率相等时达到最大值。KL 散度（KL Divergence）KL(p‖q) 衡量用针对 q 设计的编码来编码 p 的样本时，需要额外付出的比特数；它不会为负，仅在两分布一致时为零，而且不对称。交叉熵（Cross-entropy）训练最小化的正是这一差距。'])
    ]));
    state._render();
  }

  // pca-axes：从相关点云的协方差矩阵求主轴。
  function pcaAxes(host) {
    var state = { rho: 0.7, scale: 1.4 };
    var W = 520, H = 230, CX = 200, CY = 115, U = 70;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var num = el('span', { class: 'lf-num' });
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    var seeds = []; var s = 12345;
    function rnd() { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; }
    function gz() { return Math.sqrt(-2 * Math.log(rnd() + 1e-9)) * Math.cos(2 * Math.PI * rnd()); }
    var i; for (i = 0; i < 120; i++) seeds.push([gz(), gz()]);
    state._render = function () {
      var rho = state.rho, sc = state.scale;
      var sx = sc, sy = 0.55;
      // 生成点的协方差：x = sx*z1, y = sy*(rho*z1 + sqrt(1-rho^2)*z2)。
      var cxx = sx * sx, cyy = sy * sy, cxy = sx * sy * rho;
      var tr = cxx + cyy, det = cxx * cyy - cxy * cxy;
      var disc = Math.sqrt(Math.max(0, tr * tr / 4 - det));
      var l1 = tr / 2 + disc, l2 = tr / 2 - disc;      // variances along the two principal axes
      function eig(l) { var ex = cxy, ey = l - cxx; if (Math.abs(ex) < 1e-9 && Math.abs(ey) < 1e-9) { ex = 1; ey = 0; } var n = Math.sqrt(ex * ex + ey * ey); return [ex / n, ey / n]; }
      var v1 = eig(l1), v2 = eig(l2);
      var pct = l1 / (l1 + l2) * 100;
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      svg.appendChild(svgEl('line', { x1: 20, y1: CY, x2: 380, y2: CY, stroke: 'var(--rule-soft,#eee)', 'stroke-width': '1' }));
      svg.appendChild(svgEl('line', { x1: CX, y1: 12, x2: CX, y2: H - 12, stroke: 'var(--rule-soft,#eee)', 'stroke-width': '1' }));
      seeds.forEach(function (z) {
        var x = sx * z[0], y = sy * (rho * z[0] + Math.sqrt(1 - rho * rho) * z[1]);
        svg.appendChild(svgEl('circle', { cx: CX + x * U, cy: CY - y * U, r: '2', fill: 'var(--ink-mute,#999)', 'fill-opacity': '0.6' }));
      });
      var a1 = Math.sqrt(l1) * U * 2, a2 = Math.sqrt(l2) * U * 2;   // axis length ~ std dev
      svg.appendChild(svgEl('line', { x1: CX - v1[0] * a1, y1: CY + v1[1] * a1, x2: CX + v1[0] * a1, y2: CY - v1[1] * a1, stroke: 'var(--blueprint,#3553ff)', 'stroke-width': '3' }));
      svg.appendChild(svgEl('line', { x1: CX - v2[0] * a2, y1: CY + v2[1] * a2, x2: CX + v2[0] * a2, y2: CY - v2[1] * a2, stroke: 'var(--warn,#b8870f)', 'stroke-width': '2.5' }));
      num.innerHTML = pct.toFixed(1) + ' <small>%：PC1 的方差解释率</small>';
      meta.textContent = '主轴方差（Principal Variance）λ₁ = ' + l1.toFixed(2) + ', λ₂ = ' + l2.toFixed(2) + '  ·  蓝色 = PC1（离散程度最大），橙色 = PC2';
      formula.textContent = '主成分（PC）是协方差矩阵（Covariance Matrix）Σ 的特征向量 · 特征值 λ = 各轴所解释的方差';
    };
    var grid = el('div', { class: 'lf-grid' }, [
      slider(state, 'rho', '相关系数（Correlation）ρ', -0.95, 0.95, 0.05),
      slider(state, 'scale', 'x 的离散程度（Spread）', 0.6, 2.2, 0.05)
    ]);
    host.appendChild(el('div', { class: 'lf' }, [
      el('div', { class: 'lf-head' }, [el('span', { class: 'lf-label' }, ['主成分轴（PCA Axes）']), el('span', {}, ['调整相关系数'])]),
      el('div', { class: 'lf-body' }, [grid, el('div', { class: 'lf-out' }, [svg, el('div', { style: 'margin-top:10px' }, [num]), meta, formula])]),
      el('div', { class: 'lf-cap' }, ['主成分分析（Principal Component Analysis，PCA）寻找协方差矩阵（Covariance Matrix）的特征向量。蓝色轴（PC1）沿离散程度最大的方向延伸；橙色轴（PC2）与它垂直，捕捉剩余变化。特征值（Eigenvalue）就是各轴上的方差，因此点云越细长、相关性越强，PC1 的方差解释率（Explained Variance Ratio）就越高。'])
    ]));
    state._render();
  }

  // fourier-synthesis：叠加谐波，逼近方波或锯齿波。
  function fourierSynthesis(host) {
    var state = { a1: 100, a2: 0, a3: 33, a4: 0 };
    var W = 520, H = 220, PAD = 24;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    function px(t) { return PAD + t * (W - 2 * PAD); }                 // t in [0,1] over one period
    function py(v) { return H / 2 - v * (H / 2 - PAD) / 1.4; }
    state._render = function () {
      var amp = [state.a1 / 100, state.a2 / 100, state.a3 / 100, state.a4 / 100];
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      svg.appendChild(svgEl('line', { x1: PAD, y1: py(0), x2: W - PAD, y2: py(0), stroke: 'var(--rule-soft,#eee)', 'stroke-width': '1' }));
      var k;
      for (k = 0; k < 4; k++) {                                        // faint individual harmonics
        if (amp[k] === 0) continue;
        var dk = '', i; for (i = 0; i <= 200; i++) { var t = i / 200; dk += (i ? 'L' : 'M') + px(t).toFixed(1) + ' ' + py(amp[k] * Math.sin(2 * Math.PI * (2 * k + 1) * t)).toFixed(1) + ' '; }
        svg.appendChild(svgEl('path', { d: dk, fill: 'none', stroke: 'var(--ink-mute,#999)', 'stroke-width': '1', opacity: '0.4' }));
      }
      var d = '', i2; for (i2 = 0; i2 <= 240; i2++) {                  // the summed waveform
        var tt = i2 / 240, v = 0, kk;
        for (kk = 0; kk < 4; kk++) v += amp[kk] * Math.sin(2 * Math.PI * (2 * kk + 1) * tt);
        d += (i2 ? 'L' : 'M') + px(tt).toFixed(1) + ' ' + py(v).toFixed(1) + ' ';
      }
      svg.appendChild(svgEl('path', { d: d, fill: 'none', stroke: 'var(--blueprint,#3553ff)', 'stroke-width': '2' }));
      var square = Math.abs(state.a1 - 100) < 12 && Math.abs(state.a2) < 12 && state.a3 > 20 && Math.abs(state.a4) < 12;
      meta.textContent = '谐波（Harmonic）频率为 1f、3f、5f、7f · 振幅（Amplitude）：' + amp.map(function (a) { return a.toFixed(2); }).join(', ') + (square ? '  ·  振幅为 1、1/3、1/5 的奇次谐波构成方波（Square Wave）' : '');
      formula.textContent = 'f(t) = Σ aₖ sin(2π(2k+1)t)   ·   任何周期信号（Periodic Signal）都可表示为正弦波之和';
    };
    var grid = el('div', { class: 'lf-grid' }, [
      slider(state, 'a1', '基波振幅（1st Harmonic）', 0, 100, 1),
      slider(state, 'a2', '三次谐波振幅（3rd Harmonic）', 0, 100, 1),
      slider(state, 'a3', '五次谐波振幅（5th Harmonic）', 0, 100, 1),
      slider(state, 'a4', '七次谐波振幅（7th Harmonic）', 0, 100, 1)
    ]);
    host.appendChild(el('div', { class: 'lf' }, [
      el('div', { class: 'lf-head' }, [el('span', { class: 'lf-label' }, ['傅里叶合成（Fourier Synthesis）']), el('span', {}, ['叠加各次谐波'])]),
      el('div', { class: 'lf-body' }, [grid, el('div', { class: 'lf-out' }, [svg, meta, formula])]),
      el('div', { class: 'lf-cap' }, ['每个周期信号（Periodic Signal）都是频率为基频（Fundamental Frequency）整数倍的正弦波之和。浅灰色曲线是各个奇次谐波（Odd Harmonic），蓝色曲线是它们的和。把振幅分别设为满幅的 1、1/3、1/5、1/7，合成曲线就开始接近方波（Square Wave）；这就是用傅里叶级数（Fourier Series）逼近方波的经典方法。'])
    ]));
    state._render();
  }

  // convex-vs-nonconvex：对比碗形曲面与起伏曲面，观察梯度下降陷入局部极小值。
  function convexVsNonconvex(host) {
    var state = { kind: 'convex', x0: -2.6 };
    var W = 520, H = 230, PAD = 30, XR = 3;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var num = el('span', { class: 'lf-num lf-status' });
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    function f(x) { return state.kind === 'convex' ? 0.5 * x * x : 0.18 * x * x + Math.sin(3 * x); }
    function df(x) { return state.kind === 'convex' ? x : 0.36 * x + 3 * Math.cos(3 * x); }
    var YMAX = 4.5;
    function px(x) { return PAD + (x + XR) / (2 * XR) * (W - 2 * PAD); }
    function py(y) { return H - PAD - (y + 1.5) / YMAX * (H - 2 * PAD); }
    state._render = function () {
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      var d = '', i, x; for (i = 0; i <= 180; i++) { x = -XR + 2 * XR * i / 180; d += (i ? 'L' : 'M') + px(x).toFixed(1) + ' ' + py(f(x)).toFixed(1) + ' '; }
      svg.appendChild(svgEl('path', { d: d, fill: 'none', stroke: 'var(--blueprint,#3553ff)', 'stroke-width': '2' }));
      var xc = state.x0, t, pts = [];                          // gradient descent from the chosen start
      for (t = 0; t < 80; t++) { pts.push(xc); xc = xc - 0.08 * df(xc); xc = LF.clamp(xc, -XR, XR); }
      pts.forEach(function (xi, idx) { if (idx % 4 === 0) svg.appendChild(svgEl('circle', { cx: px(xi), cy: py(f(xi)), r: '2.5', fill: 'var(--ink-mute,#999)' })); });
      var end = pts[pts.length - 1];
      svg.appendChild(svgEl('circle', { cx: px(end), cy: py(f(end)), r: '5', fill: 'var(--warn,#b8870f)' }));
      var atGlobal = state.kind === 'convex' || Math.abs(end) < 0.6;
      num.innerHTML = atGlobal ? '全局最小值（Global Minimum）' : '停留在局部最小值（Local Minimum）';
      meta.textContent = '最终到达 x = ' + end.toFixed(2) + '  ·  ' + (state.kind === 'convex' ? '只有一个谷底：从任何起点都能到达' : '存在多个谷底：起点决定落入哪一个');
      formula.textContent = state.kind === 'convex' ? 'f(x) = ½x²   ·   只有一个最小值，所有下降路径都收敛到这里' : 'f(x) = 0.18x² + sin(3x)   ·   多个局部最小值（Local Minimum）可能困住下降过程';
    };
    var grid = el('div', { class: 'lf-grid' }, [
      select(state, 'kind', '损失曲面（Landscape）', [['凸碗形（Convex Bowl）', 'convex'], ['非凸起伏形（Non-convex）', 'nonconvex']]),
      slider(state, 'x0', '起点 x', -2.9, 2.9, 0.1)
    ]);
    host.appendChild(el('div', { class: 'lf' }, [
      el('div', { class: 'lf-head' }, [el('span', { class: 'lf-label' }, ['凸与非凸（Convex vs Non-convex）']), el('span', {}, ['切换曲面'])]),
      el('div', { class: 'lf-body' }, [grid, el('div', { class: 'lf-out' }, [svg, el('div', { style: 'margin-top:10px' }, [num]), meta, formula])]),
      el('div', { class: 'lf-cap' }, ['凸碗形只有一个最小值，因此梯度下降（Gradient Descent）从任何起点都能到达它。非凸曲面（Non-convex Landscape）有多个谷地：灰色轨迹沿坡下降到最近的谷地，橙色点可能停在并非全局最优的局部最小值（Local Minimum）。调整起点，可以看到不同吸引域（Basin）如何捕获下降路径。'])
    ]));
    state._render();
  }

  LF.register({
    'vector-projection': vectorProjection,
    'matrix-transform': matrixTransform,
    'eigen-directions': eigenDirections,
    'derivative-tangent': derivativeTangent,
    'chain-rule': chainRule,
    'gaussian-pdf': gaussianPdf,
    'bayes-update': bayesUpdate,
    'entropy-kl': entropyKl,
    'pca-axes': pcaAxes,
    'fourier-synthesis': fourierSynthesis,
    'convex-vs-nonconvex': convexVsNonconvex
  });
})();
