/* figures-ml.js：阶段 2 经典机器学习（Classical ML）的主题自适应交互图表。
   在 lesson-figures.js 之后加载，通过 LF.register({...}) 注册组件。
   原生 ES5，无依赖，使用 CSS 变量适配主题。沿用围栏语法：
       ```figure
       linear-regression-fit
       ```  */
(function () {
  'use strict';
  var LF = window.LF;
  if (!LF) { return; }
  var el = LF.el, svgEl = LF.svgEl, slider = LF.slider, select = LF.select;

  // linear-regression-fit：调整斜率与截距，观察均方误差（MSE）。
  function linearRegressionFit(host) {
    // 固定的 12 个散点沿 y ≈ 0.7x + 1.4 分布，加入确定性扰动。
    var X = [0.4, 1.1, 1.8, 2.3, 3.0, 3.6, 4.2, 5.0, 5.7, 6.4, 7.1, 7.8];
    var Y = [2.0, 1.9, 2.9, 2.7, 3.8, 3.5, 4.6, 4.4, 5.7, 5.3, 6.5, 6.2];
    var state = { m: 0.7, b: 1.4 };
    var W = 520, H = 230, PAD = 32, XMAX = 8.4, YMAX = 7.5;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var status = el('span', { class: 'lf-num' });
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    function px(x) { return PAD + x / XMAX * (W - 2 * PAD); }
    function py(y) { return H - PAD - y / YMAX * (H - 2 * PAD); }
    state._render = function () {
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      svg.appendChild(svgEl('line', { x1: PAD, y1: H - PAD, x2: W - PAD, y2: H - PAD, stroke: 'var(--rule-soft,#eee)', 'stroke-width': '1' }));
      var se = 0, i;
      for (i = 0; i < X.length; i++) {
        var pred = state.m * X[i] + state.b;
        se += (Y[i] - pred) * (Y[i] - pred);
        svg.appendChild(svgEl('line', { x1: px(X[i]), y1: py(Y[i]), x2: px(X[i]), y2: py(pred), stroke: 'var(--warn,#b8870f)', 'stroke-width': '1', opacity: '0.7' }));
      }
      var x1 = 0, x2 = XMAX;
      svg.appendChild(svgEl('line', { x1: px(x1), y1: py(state.m * x1 + state.b), x2: px(x2), y2: py(state.m * x2 + state.b), stroke: 'var(--blueprint,#3553ff)', 'stroke-width': '2' }));
      for (i = 0; i < X.length; i++) { svg.appendChild(svgEl('circle', { cx: px(X[i]), cy: py(Y[i]), r: '4', fill: 'var(--ink,#1a1a1a)' })); }
      var mse = se / X.length;
      status.innerHTML = 'MSE = ' + mse.toFixed(3);
      meta.textContent = '直线 y = ' + state.m.toFixed(2) + 'x + ' + state.b.toFixed(2) + '  ·  ' + X.length + ' 个点 · 橙色线段表示残差（Residual）';
      formula.textContent = 'MSE = (1/n) Σ (yᵢ − (m·xᵢ + b))²   ·   最小二乘法（Least Squares）寻找使其最小的 m、b';
    };
    var grid = el('div', { class: 'lf-grid' }, [
      slider(state, 'm', '斜率（Slope）m', -0.5, 2.0, 0.01),
      slider(state, 'b', '截距（Intercept）b', -2.0, 5.0, 0.05)
    ]);
    host.appendChild(el('div', { class: 'lf' }, [
      el('div', { class: 'lf-head' }, [el('span', { class: 'lf-label' }, ['线性回归拟合（Linear Regression Fit）']), el('span', {}, ['调整斜率和截距'])]),
      el('div', { class: 'lf-body' }, [grid, el('div', { class: 'lf-out' }, [svg, el('div', { style: 'margin-top:10px' }, [status]), meta, formula])]),
      el('div', { class: 'lf-cap' }, ['每条橙色线段都是一个残差（Residual），即数据点与直线之间的差距。将残差平方后取平均，得到均方误差（Mean Squared Error，MSE）。最小二乘法（Least Squares）就是选择让这个平均值尽可能小的斜率和截距。'])
    ]));
    state._render();
  }

  // logistic-sigmoid：调整 w 和 b，观察决策边界（Decision Boundary）。
  function logisticSigmoid(host) {
    var state = { w: 1.5, b: 0.0 };
    var W = 520, H = 220, PAD = 32, XR = 6;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var status = el('span', { class: 'lf-num' });
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    function sig(x) { return 1 / (1 + Math.exp(-(state.w * x + state.b))); }
    function px(x) { return PAD + (x + XR) / (2 * XR) * (W - 2 * PAD); }
    function py(p) { return H - PAD - p * (H - 2 * PAD); }
    state._render = function () {
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      svg.appendChild(svgEl('line', { x1: PAD, y1: py(0.5), x2: W - PAD, y2: py(0.5), stroke: 'var(--rule-soft,#eee)', 'stroke-width': '1', 'stroke-dasharray': '3 3' }));
      var d = '', i; for (i = 0; i <= 160; i++) { var x = -XR + 2 * XR * i / 160; d += (i ? 'L' : 'M') + px(x).toFixed(1) + ' ' + py(sig(x)).toFixed(1) + ' '; }
      svg.appendChild(svgEl('path', { d: d, fill: 'none', stroke: 'var(--blueprint,#3553ff)', 'stroke-width': '2' }));
      var xb = state.w === 0 ? null : -state.b / state.w;
      if (xb !== null && xb > -XR && xb < XR) {
        svg.appendChild(svgEl('line', { x1: px(xb), y1: PAD, x2: px(xb), y2: H - PAD, stroke: 'var(--warn,#b8870f)', 'stroke-width': '1.5' }));
        svg.appendChild(svgEl('circle', { cx: px(xb), cy: py(0.5), r: '4', fill: 'var(--warn,#b8870f)' }));
      }
      status.innerHTML = xb === null ? '无决策边界' : 'x* = ' + xb.toFixed(2) + ' <small>对应 p = 0.5</small>';
      meta.textContent = '|w| 越大，曲线越陡 · b 改变边界位置 · 输出是 (0, 1) 内的概率';
      formula.textContent = 's(x) = 1 / (1 + e^−(w·x + b))   ·   决策边界（Decision Boundary）满足 w·x + b = 0 → x* = −b/w';
    };
    var grid = el('div', { class: 'lf-grid' }, [
      slider(state, 'w', '权重（Weight）w', -4, 4, 0.05),
      slider(state, 'b', '偏置（Bias）b', -5, 5, 0.05)
    ]);
    host.appendChild(el('div', { class: 'lf' }, [
      el('div', { class: 'lf-head' }, [el('span', { class: 'lf-label' }, ['逻辑回归的 Sigmoid 函数（Logistic Sigmoid）']), el('span', {}, ['调整 w 和 b'])]),
      el('div', { class: 'lf-body' }, [grid, el('div', { class: 'lf-out' }, [svg, el('div', { style: 'margin-top:10px' }, [status]), meta, formula])]),
      el('div', { class: 'lf-cap' }, ['逻辑回归（Logistic Regression）通过 Sigmoid 函数将线性分数压缩为概率。权重（Weight）控制曲线转折的陡峭程度，偏置（Bias）使曲线左右平移。橙色线是概率越过二分之一处的决策边界（Decision Boundary）。'])
    ]));
    state._render();
  }

  // svm-margin：旋转边界、扩大间隔，并标出支持向量（Support Vector）。
  function svmMargin(host) {
    // 两个固定的线性可分簇：+1 类在右上，-1 类在左下。
    var POS = [[6.0, 5.4], [6.8, 4.6], [5.4, 6.2], [7.2, 5.8], [6.4, 6.8], [7.8, 6.0]];
    var NEG = [[2.2, 3.0], [3.0, 2.2], [1.6, 2.4], [3.4, 3.2], [2.6, 1.6], [1.8, 3.6]];
    var state = { ang: 45, margin: 1.0 };
    var W = 520, H = 240, PAD = 30, AX = 9;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var status = el('span', { class: 'lf-num' });
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    var CX = 4.6, CY = 4.0; // line passes through this midpoint
    function px(x) { return PAD + x / AX * (W - 2 * PAD); }
    function py(y) { return H - PAD - y / AX * (H - 2 * PAD); }
    state._render = function () {
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      var rad = state.ang * Math.PI / 180;
      // 边界的单位法向量。
      var nx = Math.cos(rad), ny = Math.sin(rad);
      // 边界方向，与法向量垂直。
      var dx = -ny, dy = nx;
      function lineAt(off, stroke, dash) {
        var ox = CX + nx * off, oy = CY + ny * off;
        var L = 12;
        svg.appendChild(svgEl('line', {
          x1: px(ox - dx * L), y1: py(oy - dy * L), x2: px(ox + dx * L), y2: py(oy + dy * L),
          stroke: stroke, 'stroke-width': dash ? '1' : '2', 'stroke-dasharray': dash ? '4 3' : 'none'
        }));
      }
      lineAt(state.margin, 'var(--rule-soft,#bbb)', true);
      lineAt(-state.margin, 'var(--rule-soft,#bbb)', true);
      lineAt(0, 'var(--blueprint,#3553ff)', false);
      function dist(p) { return (p[0] - CX) * nx + (p[1] - CY) * ny; }
      var sv = 0, i, p, d;
      for (i = 0; i < POS.length; i++) {
        p = POS[i]; d = dist(p);
        var onP = Math.abs(d - state.margin) < 0.35;
        if (onP) sv++;
        svg.appendChild(svgEl('circle', { cx: px(p[0]), cy: py(p[1]), r: onP ? '6' : '4', fill: 'var(--blueprint,#3553ff)', stroke: onP ? 'var(--warn,#b8870f)' : 'none', 'stroke-width': '2' }));
      }
      for (i = 0; i < NEG.length; i++) {
        p = NEG[i]; d = dist(p);
        var onN = Math.abs(d + state.margin) < 0.35;
        if (onN) sv++;
        svg.appendChild(svgEl('circle', { cx: px(p[0]), cy: py(p[1]), r: onN ? '6' : '4', fill: 'var(--ink-mute,#999)', stroke: onN ? 'var(--warn,#b8870f)' : 'none', 'stroke-width': '2' }));
      }
      status.innerHTML = sv + ' <small>个支持向量（Support Vector）</small>';
      meta.textContent = '间隔宽度（Margin Width）' + (2 * state.margin).toFixed(2) + '  ·  金色圆环标记位于间隔边缘的点 · 间隔越宽，泛化（Generalization）越好';
      formula.textContent = '在 yᵢ(w·xᵢ + b) ≥ 1 的约束下最大化间隔 2/‖w‖   ·   只有支持向量（Support Vector）决定边界';
    };
    var grid = el('div', { class: 'lf-grid' }, [
      slider(state, 'ang', '边界角度（Boundary Angle）', 0, 180, 1),
      slider(state, 'margin', '间隔宽度（Margin Width）', 0.3, 2.5, 0.05)
    ]);
    host.appendChild(el('div', { class: 'lf' }, [
      el('div', { class: 'lf-head' }, [el('span', { class: 'lf-label' }, ['支持向量机间隔（SVM Margin）']), el('span', {}, ['旋转边界，拓宽间隔'])]),
      el('div', { class: 'lf-body' }, [grid, el('div', { class: 'lf-out' }, [svg, el('div', { style: 'margin-top:10px' }, [status]), meta, formula])]),
      el('div', { class: 'lf-cap' }, ['支持向量机（Support Vector Machine，SVM）不只分开类别，还要让边界尽可能远离两类。虚线标记间隔（Margin），与虚线接触并带金色圆环的点就是支持向量（Support Vector）。移动其余点，边界也不会改变。'])
    ]));
    state._render();
  }

  // knn-smoothness：增大 k，使概率曲线更平滑。
  function knnSmoothness(host) {
    // 一维二分类数据点：x 坐标与类别（1 或 0），布局固定。
    var PTS = [
      [0.6, 1], [1.0, 1], [1.4, 0], [1.8, 1], [2.3, 1], [2.7, 0], [3.1, 1],
      [3.6, 0], [4.0, 0], [4.5, 1], [4.9, 0], [5.3, 0], [5.8, 0], [6.2, 1],
      [6.7, 0], [7.1, 0], [7.6, 0], [8.0, 1]
    ];
    var state = { k: 3 };
    var W = 520, H = 220, PAD = 30, XMAX = 8.6;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var status = el('span', { class: 'lf-num' });
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    function px(x) { return PAD + x / XMAX * (W - 2 * PAD); }
    function py(p) { return H - PAD - p * (H - 2 * PAD); }
    function probAt(x, k) {
      var sorted = PTS.slice().sort(function (a, b) { return Math.abs(a[0] - x) - Math.abs(b[0] - x); });
      var s = 0, i; for (i = 0; i < k && i < sorted.length; i++) s += sorted[i][1];
      return s / Math.min(k, sorted.length);
    }
    state._render = function () {
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      svg.appendChild(svgEl('line', { x1: PAD, y1: py(0.5), x2: W - PAD, y2: py(0.5), stroke: 'var(--rule-soft,#eee)', 'stroke-width': '1', 'stroke-dasharray': '3 3' }));
      var d = '', i; for (i = 0; i <= 200; i++) { var x = XMAX * i / 200; d += (i ? 'L' : 'M') + px(x).toFixed(1) + ' ' + py(probAt(x, state.k)).toFixed(1) + ' '; }
      svg.appendChild(svgEl('path', { d: d, fill: 'none', stroke: 'var(--blueprint,#3553ff)', 'stroke-width': '2' }));
      for (i = 0; i < PTS.length; i++) {
        svg.appendChild(svgEl('circle', { cx: px(PTS[i][0]), cy: py(PTS[i][1] ? 0.96 : 0.04), r: '4', fill: PTS[i][1] ? 'var(--blueprint,#3553ff)' : 'var(--ink-mute,#999)' }));
      }
      var regime = state.k <= 2 ? '锯齿状 · 过拟合（Overfit）' : state.k >= 11 ? '平坦 · 欠拟合（Underfit）' : '平衡';
      status.innerHTML = 'k = ' + state.k + ' <small>· ' + regime + '</small>';
      meta.textContent = '上方点属于类别 1，下方点属于类别 0 · 曲线是由最近 k 个点估计的 P(class 1)';
      formula.textContent = 'P(y = 1 | x) = 最近 k 个点中类别 1 的占比   ·   k 小时追随噪声，k 大时平滑噪声';
    };
    var grid = el('div', {}, [slider(state, 'k', 'k（近邻数，Number of Neighbors）', 1, 17, 1)]);
    host.appendChild(el('div', { class: 'lf' }, [
      el('div', { class: 'lf-head' }, [el('span', { class: 'lf-label' }, ['K 近邻平滑性（K-NN Smoothness）']), el('span', {}, ['调整 k'])]),
      el('div', { class: 'lf-body' }, [grid, el('div', { class: 'lf-out' }, [svg, el('div', { style: 'margin-top:10px' }, [status]), meta, formula])]),
      el('div', { class: 'lf-cap' }, ['k = 1 时，预测完全复制最近的点，因此曲线呈锯齿状，会拟合每个细小波动。增大 k 会对更多近邻（Neighbor）取平均，使边界平滑；当 k 很大时，曲线趋近整体类别比例，变得平坦并忽略局部结构。'])
    ]));
    state._render();
  }

  // kmeans-step：逐步执行 Lloyd 迭代，观察簇内平方和（WCSS）下降。
  function kmeansStep(host) {
    // 固定的二维点，分成三个较松散的点簇。
    var PTS = [
      [1.8, 7.4], [2.4, 8.0], [1.4, 6.8], [2.8, 7.0], [2.0, 8.4], [1.2, 7.8],
      [7.6, 7.2], [8.2, 7.8], [7.0, 6.8], [8.6, 7.0], [7.8, 8.2], [8.0, 6.4],
      [4.4, 1.8], [5.0, 2.4], [3.8, 1.4], [5.4, 1.8], [4.0, 2.6], [4.8, 1.2]
    ];
    // 初始质心故意偏离中心，以显示后续移动。
    var INIT = [[3.5, 5.5], [6.0, 5.0], [5.0, 3.5]];
    var state = { iter: 0 };
    var W = 520, H = 240, PAD = 28, AX = 10;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var status = el('span', { class: 'lf-num' });
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    var COLORS = ['var(--blueprint,#3553ff)', 'var(--warn,#b8870f)', 'var(--ink,#1a1a1a)'];
    function px(x) { return PAD + x / AX * (W - 2 * PAD); }
    function py(y) { return H - PAD - y / AX * (H - 2 * PAD); }
    // 确定性预计算 Lloyd 迭代，最多 6 步。
    function assign(cs) {
      var a = [], i, j;
      for (i = 0; i < PTS.length; i++) {
        var best = 0, bd = 1e9;
        for (j = 0; j < cs.length; j++) {
          var dx = PTS[i][0] - cs[j][0], dy = PTS[i][1] - cs[j][1], dd = dx * dx + dy * dy;
          if (dd < bd) { bd = dd; best = j; }
        }
        a.push(best);
      }
      return a;
    }
    function update(a) {
      var cs = [], j; for (j = 0; j < 3; j++) { var sx = 0, sy = 0, n = 0, i;
        for (i = 0; i < PTS.length; i++) if (a[i] === j) { sx += PTS[i][0]; sy += PTS[i][1]; n++; }
        cs.push(n ? [sx / n, sy / n] : INIT[j]);
      }
      return cs;
    }
    function wcss(cs, a) { var s = 0, i; for (i = 0; i < PTS.length; i++) { var c = cs[a[i]]; var dx = PTS[i][0] - c[0], dy = PTS[i][1] - c[1]; s += dx * dx + dy * dy; } return s; }
    var FRAMES = [], cur = INIT.map(function (c) { return c.slice(); }), t;
    for (t = 0; t <= 6; t++) {
      var a = assign(cur);
      FRAMES.push({ cs: cur.map(function (c) { return c.slice(); }), a: a, wcss: wcss(cur, a) });
      cur = update(a);
    }
    state._render = function () {
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      var f = FRAMES[Math.min(state.iter, FRAMES.length - 1)];
      var i;
      for (i = 0; i < PTS.length; i++) {
        svg.appendChild(svgEl('circle', { cx: px(PTS[i][0]), cy: py(PTS[i][1]), r: '4', fill: COLORS[f.a[i]], opacity: '0.85' }));
      }
      for (i = 0; i < f.cs.length; i++) {
        var cx = px(f.cs[i][0]), cy = py(f.cs[i][1]);
        svg.appendChild(svgEl('path', { d: 'M ' + (cx - 7) + ' ' + cy + ' L ' + (cx + 7) + ' ' + cy + ' M ' + cx + ' ' + (cy - 7) + ' L ' + cx + ' ' + (cy + 7), stroke: COLORS[i], 'stroke-width': '2.5' }));
        svg.appendChild(svgEl('circle', { cx: cx, cy: cy, r: '8', fill: 'none', stroke: COLORS[i], 'stroke-width': '2' }));
      }
      status.innerHTML = 'WCSS = ' + f.wcss.toFixed(2);
      meta.textContent = '迭代（Iteration）' + state.iter + ' / 6 · 十字表示质心（Centroid）· WCSS 每步下降，直到分配结果不再变化';
      formula.textContent = '反复执行：把每个点分配给最近的质心 → 将各质心移到所属簇的均值   ·   WCSS = Σ ‖x − μ‖²';
    };
    var grid = el('div', {}, [slider(state, 'iter', '迭代次数（Iteration）', 0, 6, 1)]);
    host.appendChild(el('div', { class: 'lf' }, [
      el('div', { class: 'lf-head' }, [el('span', { class: 'lf-label' }, ['K 均值迭代（K-means Step）']), el('span', {}, ['逐步查看迭代'])]),
      el('div', { class: 'lf-body' }, [grid, el('div', { class: 'lf-out' }, [svg, el('div', { style: 'margin-top:10px' }, [status]), meta, formula])]),
      el('div', { class: 'lf-cap' }, ['K 均值（K-means）交替执行两步：先把每个点分配给最近的质心（Centroid），再将质心移到所属点的均值。簇内平方和（Within-cluster Sum of Squares，WCSS）只会下降，因此当没有点再切换所属簇时，算法便收敛（Converge）。'])
    ]));
    state._render();
  }

  // decision-tree-depth：树越深，划分越多，并给出过拟合（Overfitting）提示。
  function decisionTreeDepth(host) {
    var state = { depth: 3 };
    var W = 520, H = 220, PAD = 24;
    // 数据约有 4 个真实区域；深度超过约 2（3 个叶节点）时出现过拟合。
    var REAL_LEAVES = 4;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var status = el('span', { class: 'lf-num' });
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    state._render = function () {
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      var depth = state.depth;
      var levels = depth + 1;
      var topY = PAD, botY = H - PAD;
      var dy = (botY - topY) / Math.max(1, depth);
      var L;
      // 逐层绘制二叉树。
      for (L = 0; L <= depth; L++) {
        var nodes = Math.pow(2, L);
        var y = depth === 0 ? (topY + botY) / 2 : topY + L * dy;
        var i;
        for (i = 0; i < nodes; i++) {
          var x = PAD + (i + 0.5) / nodes * (W - 2 * PAD);
          var leaf = (L === depth);
          if (L > 0) {
            var pnodes = Math.pow(2, L - 1);
            var pi = Math.floor(i / 2);
            var pxv = PAD + (pi + 0.5) / pnodes * (W - 2 * PAD);
            var pyv = topY + (L - 1) * dy;
            svg.appendChild(svgEl('line', { x1: pxv, y1: pyv, x2: x, y2: y, stroke: 'var(--rule-soft,#ccc)', 'stroke-width': '1' }));
          }
          var over = leaf && nodes > REAL_LEAVES;
          svg.appendChild(svgEl('circle', { cx: x, cy: y, r: leaf ? '6' : '5', fill: leaf ? (over ? 'var(--warn,#b8870f)' : 'var(--blueprint,#3553ff)') : 'var(--bg,#fafaf5)', stroke: leaf ? 'none' : 'var(--blueprint,#3553ff)', 'stroke-width': '2' }));
        }
      }
      var splits = Math.pow(2, depth) - 1;
      var leaves = Math.pow(2, depth);
      var over = leaves > REAL_LEAVES;
      status.innerHTML = splits + ' <small>个内部划分（Split）· ' + leaves + ' 个叶节点（Leaf）</small>';
      meta.textContent = (over ? '超出数据结构：用 ' + leaves + ' 个叶节点拟合约 ' + REAL_LEAVES + ' 个真实区域，树开始记忆噪声' : '深度（Depth）' + depth + '：仍在捕捉真实结构');
      formula.textContent = '深度为 d 的二叉树（Binary Tree）最多有 2^d − 1 个划分、2^d 个叶节点   ·   d = ' + depth + '  →  ' + splits + ' 个划分，' + leaves + ' 个叶节点';
    };
    var grid = el('div', {}, [slider(state, 'depth', '最大深度（Max Depth）', 0, 6, 1)]);
    host.appendChild(el('div', { class: 'lf' }, [
      el('div', { class: 'lf-head' }, [el('span', { class: 'lf-label' }, ['决策树深度（Decision Tree Depth）']), el('span', {}, ['调整最大深度'])]),
      el('div', { class: 'lf-body' }, [grid, el('div', { class: 'lf-out' }, [svg, el('div', { style: 'margin-top:10px' }, [status]), meta, formula])]),
      el('div', { class: 'lf-cap' }, ['深度每增加一层，叶节点（Leaf）数翻倍，树可划分的区域数按平方增长。少量划分即可捕捉真实结构；超过这个范围后，叶节点变为金色，表示树开始逐点拟合，而非学习模式。'])
    ]));
    state._render();
  }

  // feature-scaling：对比缩放前狭长的等高线与缩放后接近圆形的等高线。
  function featureScaling(host) {
    var state = { mode: 'raw' };
    var W = 520, H = 240, PAD = 30, CX = 260, CY = 120;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    state._render = function () {
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      var raw = state.mode === 'raw';
      var ax = raw ? 210 : 90, ay = 70; // x-radius wide when raw, near-circular when scaled
      var k;
      for (k = 1; k <= 4; k++) {
        svg.appendChild(svgEl('ellipse', { cx: CX, cy: CY, rx: ax * k / 4, ry: ay * k / 4, fill: 'none', stroke: 'var(--rule-soft,#ccc)', 'stroke-width': '1.2' }));
      }
      svg.appendChild(svgEl('circle', { cx: CX, cy: CY, r: '4', fill: 'var(--ink,#1a1a1a)' }));
      // 从固定起点向中心推进的梯度下降路径。
      var sx = CX - (raw ? 200 : 80), sy = CY - 62;
      var path = 'M ' + sx + ' ' + sy + ' ', x = sx, y = sy, i;
      for (i = 0; i < 9; i++) {
        // 步长与局部梯度成正比，在较陡的短轴方向上更大。
        var gx = (x - CX) / (ax * ax), gy = (y - CY) / (ay * ay);
        var scale = raw ? 7200 : 2600;
        x -= gx * scale; y -= gy * scale;
        path += 'L ' + x.toFixed(1) + ' ' + y.toFixed(1) + ' ';
        svg.appendChild(svgEl('circle', { cx: x, cy: y, r: '3', fill: 'var(--blueprint,#3553ff)' }));
      }
      svg.appendChild(svgEl('path', { d: path, fill: 'none', stroke: 'var(--blueprint,#3553ff)', 'stroke-width': '1.5', 'stroke-dasharray': '4 3' }));
      svg.appendChild(svgEl('circle', { cx: sx, cy: sy, r: '4', fill: 'var(--warn,#b8870f)' }));
      meta.textContent = raw ? '原始特征（Raw Features）：等高线被拉长，下降路径在狭窄谷地内来回振荡' : '标准化（Standardized）：等高线近似圆形，下降路径几乎直达最小值';
      formula.textContent = raw ? '特征尺度不同 → 损失曲面（Loss Surface）狭长 → 缓慢且振荡的收敛' : 'x′ = (x − μ) / σ → 各特征方差为 1 → 圆形碗状曲面 → 快速下降';
    };
    var grid = el('div', {}, [select(state, 'mode', '特征（Features）', [['原始值（Raw，未缩放）', 'raw'], ['标准化（Standardized）', 'scaled']])]);
    host.appendChild(el('div', { class: 'lf' }, [
      el('div', { class: 'lf-head' }, [el('span', { class: 'lf-label' }, ['特征缩放（Feature Scaling）']), el('span', {}, ['切换原始值与标准化结果'])]),
      el('div', { class: 'lf-body' }, [grid, el('div', { class: 'lf-out' }, [svg, meta, formula])]),
      el('div', { class: 'lf-cap' }, ['特征尺度不同时，损失曲面（Loss Surface）形成狭长谷地，梯度下降（Gradient Descent）会在谷壁之间反弹。把每个特征标准化（Standardize）为零均值、单位方差后，碗状曲面变圆，同一算法便能几乎沿直线到达最小值。'])
    ]));
    state._render();
  }

  // naive-bayes：观测一个值，比较似然（Likelihood），读取后验概率。
  function naiveBayes(host) {
    // 单个特征上的两个类条件高斯分布，先验概率相同。
    var muA = 0.38, muB = 0.66, sd = 0.12;
    var state = { x: 0.5 };
    var W = 520, H = 220, PAD = 30;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var status = el('span', { class: 'lf-num' });
    var bar = el('i');
    var barWrap = el('div', { class: 'lf-bar' }, [bar]);
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    function gauss(x, mu) { return Math.exp(-0.5 * Math.pow((x - mu) / sd, 2)); }
    function px(x) { return PAD + x * (W - 2 * PAD); }
    function py(v) { return H - PAD - v * (H - 2 * PAD); }
    state._render = function () {
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      [{ mu: muA, st: 'var(--ink-mute,#999)' }, { mu: muB, st: 'var(--blueprint,#3553ff)' }].forEach(function (g) {
        var d = '', i; for (i = 0; i <= 120; i++) { var x = i / 120; d += (i ? 'L' : 'M') + px(x).toFixed(1) + ' ' + py(gauss(x, g.mu)).toFixed(1) + ' '; }
        svg.appendChild(svgEl('path', { d: d, fill: 'none', stroke: g.st, 'stroke-width': '2' }));
      });
      var tx = px(state.x);
      svg.appendChild(svgEl('line', { x1: tx, y1: PAD, x2: tx, y2: H - PAD, stroke: 'var(--warn,#b8870f)', 'stroke-width': '1.5' }));
      var la = gauss(state.x, muA), lb = gauss(state.x, muB);
      // 先验相等时，后验概率就是归一化的似然。
      var postB = lb / (la + lb || 1);
      svg.appendChild(svgEl('circle', { cx: tx, cy: py(la), r: '4', fill: 'var(--ink-mute,#999)' }));
      svg.appendChild(svgEl('circle', { cx: tx, cy: py(lb), r: '4', fill: 'var(--blueprint,#3553ff)' }));
      bar.style.width = (postB * 100).toFixed(1) + '%';
      status.innerHTML = 'P(B | x) = ' + postB.toFixed(3);
      meta.textContent = '观测值 x = ' + state.x.toFixed(2) + '  ·  似然（Likelihood）A ' + la.toFixed(3) + '  ·  似然（Likelihood）B ' + lb.toFixed(3) + '  ·  先验概率（Prior）相等';
      formula.textContent = 'P(B | x) = P(x | B)·P(B) / Σ_c P(x | c)·P(c)   ·   先验相等时，似然（Likelihood）较大的类别胜出';
    };
    var grid = el('div', {}, [slider(state, 'x', '观测特征值（Observed Feature）', 0.02, 0.98, 0.01)]);
    host.appendChild(el('div', { class: 'lf' }, [
      el('div', { class: 'lf-head' }, [el('span', { class: 'lf-label' }, ['朴素贝叶斯（Naive Bayes）']), el('span', {}, ['调整观测值'])]),
      el('div', { class: 'lf-body' }, [grid, el('div', { class: 'lf-out' }, [svg, el('div', { style: 'margin-top:10px' }, [status]), barWrap, meta, formula])]),
      el('div', { class: 'lf-cap' }, ['每个类别在该特征上都有自己的钟形曲线。橙色线表示观测值，交点表示各类别产生该值的似然（Likelihood）。贝叶斯（Bayes）公式将这些似然按先验概率（Prior）加权，转为后验概率（Posterior）条形，即该点属于类别 B 的概率。'])
    ]));
    state._render();
  }

  // class-imbalance：始终预测多数类时的准确率悖论（Accuracy Paradox）。
  function classImbalance(host) {
    var state = { ratio: 5 }; // positive-class percent
    var N = 1000;
    var W = 520, H = 120, PAD = 24;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var status = el('span', { class: 'lf-num' });
    var bar = el('i');
    var barWrap = el('div', { class: 'lf-bar' }, [bar]);
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    state._render = function () {
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      var pos = state.ratio / 100, neg = 1 - pos;
      var inner = W - 2 * PAD;
      var split = PAD + neg * inner;
      svg.appendChild(svgEl('rect', { x: PAD, y: 40, width: (neg * inner).toFixed(1), height: '40', fill: 'var(--ink-mute,#999)' }));
      svg.appendChild(svgEl('rect', { x: split.toFixed(1), y: 40, width: (pos * inner).toFixed(1), height: '40', fill: 'var(--warn,#b8870f)' }));
      // 始终预测多数类（负类）的分类器。
      var acc = neg; // accuracy = fraction it gets right = negatives
      var recall = 0; // it never predicts positive → zero true positives
      bar.style.width = (acc * 100).toFixed(1) + '%';
      barWrap.classList.toggle('over', pos < 0.2);
      status.innerHTML = (acc * 100).toFixed(1) + '% <small>准确率（Accuracy）· 0% 召回率（Recall）</small>';
      meta.textContent = '全部预测为负类：正确识别所有 ' + Math.round(neg * N) + ' 个负例，漏掉所有 ' + Math.round(pos * N) + ' 个正例 · 金色表示从未识别出的正例';
      formula.textContent = '准确率（Accuracy）= (1 − 正例比例)   ·   召回率（Recall）= 0   ·   此处的高准确率没有意义';
    };
    var grid = el('div', {}, [slider(state, 'ratio', '正类比例（Positive-class Ratio，%）', 1, 50, 1)]);
    host.appendChild(el('div', { class: 'lf' }, [
      el('div', { class: 'lf-head' }, [el('span', { class: 'lf-label' }, ['类别不平衡（Class Imbalance）']), el('span', {}, ['调整正类比例'])]),
      el('div', { class: 'lf-body' }, [grid, el('div', { class: 'lf-out' }, [svg, el('div', { style: 'margin-top:10px' }, [status]), barWrap, meta, formula])]),
      el('div', { class: 'lf-cap' }, ['当某一类别罕见时，始终预测多数类（Majority Class）的分类器可以获得很高的准确率（Accuracy），却识别不出任何你关心的案例。金色部分是它永远找不到的正例，而准确率无法体现这种遗漏。因此，处理不平衡数据时，召回率（Recall）和 F1 很重要。'])
    ]));
    state._render();
  }

  // k-fold-cv：划分为 k 折，每轮留出其中一折。
  function kFoldCv(host) {
    var state = { k: 5 };
    var W = 520, ROWH = 26, PAD = 24;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' 220' });
    var status = el('span', { class: 'lf-num' });
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    state._render = function () {
      var k = state.k;
      var H = PAD * 2 + k * ROWH;
      svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      var cellW = (W - 2 * PAD) / k;
      var round, fold;
      for (round = 0; round < k; round++) {
        var y = PAD + round * ROWH;
        for (fold = 0; fold < k; fold++) {
          var x = PAD + fold * cellW;
          var held = (fold === round);
          svg.appendChild(svgEl('rect', { x: x.toFixed(1), y: y.toFixed(1), width: (cellW - 3).toFixed(1), height: (ROWH - 6).toFixed(1), fill: held ? 'var(--warn,#b8870f)' : 'var(--blueprint,#3553ff)', opacity: held ? '1' : '0.32' }));
        }
      }
      var trainFrac = (k - 1) / k;
      status.innerHTML = k + ' 折（Fold）<small>· ' + k + ' 轮（Rounds）</small>';
      meta.textContent = '每轮使用 ' + (k - 1) + ' 折训练（' + Math.round(trainFrac * 100) + '%），用金色一折验证 · 每个样本恰好被留出一次';
      formula.textContent = '将数据均分为 k 折 → 依次留出一折，用其余 k−1 折训练并在该折评分 → 对 k 个分数取平均';
    };
    var grid = el('div', {}, [slider(state, 'k', '折数（Folds）k', 2, 10, 1)]);
    host.appendChild(el('div', { class: 'lf' }, [
      el('div', { class: 'lf-head' }, [el('span', { class: 'lf-label' }, ['K 折交叉验证（K-fold Cross-validation）']), el('span', {}, ['调整 k'])]),
      el('div', { class: 'lf-body' }, [grid, el('div', { class: 'lf-out' }, [svg, el('div', { style: 'margin-top:10px' }, [status]), meta, formula])]),
      el('div', { class: 'lf-cap' }, ['每行表示一轮：金色的一折留作验证，蓝色各折用于训练。轮换留出折（Held-out Fold），使每个样本恰好被评分一次；对 k 个分数取平均，可获得比单次划分更稳定的估计。'])
    ]));
    state._render();
  }

  LF.register({
    'linear-regression-fit': linearRegressionFit,
    'logistic-sigmoid': logisticSigmoid,
    'svm-margin': svmMargin,
    'knn-smoothness': knnSmoothness,
    'kmeans-step': kmeansStep,
    'decision-tree-depth': decisionTreeDepth,
    'feature-scaling': featureScaling,
    'naive-bayes': naiveBayes,
    'class-imbalance': classImbalance,
    'k-fold-cv': kFoldCv
  });
})();
