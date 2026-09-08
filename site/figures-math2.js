/* figures-math2.js：阶段 01 数学基础（Math Foundations）交互组件。
   在 lesson-figures.js 之后加载，通过 window.LF 注册。原生 ES5，无依赖，
   使用 CSS 变量适配主题，各组件确定性渲染。 */
(function () {
  'use strict';
  var LF = window.LF;
  if (!LF) { return; }
  var el = LF.el, svgEl = LF.svgEl, slider = LF.slider, select = LF.select;
  var fmtInt = LF.fmtInt, clamp = LF.clamp;

  // svd-rank-reconstruction：保留 k 个奇异值，观察保留能量。
  function svdRank(host) {
    // 固定的 8x8 图案，预置按降序排列的奇异值。
    // 保留能量 = sum(top-k sigma^2) / sum(all sigma^2)，该比值可精确计算。
    var sigma = [9.0, 5.4, 3.1, 1.8, 1.0, 0.55, 0.28, 0.12];
    var n = sigma.length;
    var total = 0, i;
    for (i = 0; i < n; i++) { total += sigma[i] * sigma[i]; }
    var state = { k: 2 };
    var W = 520, H = 230, PAD = 30, CELL = 18, GX = 360;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var num = el('span', { class: 'lf-num' });
    var bar = el('i');
    var barWrap = el('div', { class: 'lf-bar' }, [bar]);
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    function cell(r, c) {
      // [0,1] 范围内的平滑目标强度，适合低秩近似。
      return 0.5 + 0.5 * Math.cos((r + c) * Math.PI / (n - 1));
    }
    state._render = function () {
      while (svg.firstChild) { svg.removeChild(svg.firstChild); }
      var keep = state.k, energy = 0, j;
      for (j = 0; j < keep; j++) { energy += sigma[j] * sigma[j]; }
      var frac = energy / total;
      // 用保留能量表示重建质量：能量越低，单元格越趋于灰色。
      var r, c;
      for (r = 0; r < n; r++) {
        for (c = 0; c < n; c++) {
          var v = cell(r, c);
          var approx = 0.5 + (v - 0.5) * frac;
          var g = Math.round(clamp(approx, 0, 1) * 255);
          svg.appendChild(svgEl('rect', {
            x: PAD + c * CELL, y: PAD + r * CELL, width: CELL - 1, height: CELL - 1,
            fill: 'rgb(' + g + ',' + g + ',' + g + ')'
          }));
        }
      }
      // 右侧的奇异值谱条形图。
      var maxS = sigma[0], bw = 14, sx = GX;
      for (j = 0; j < n; j++) {
        var bh = sigma[j] / maxS * 120;
        var on = j < keep;
        svg.appendChild(svgEl('rect', {
          x: sx + j * (bw + 4), y: PAD + 120 - bh, width: bw, height: bh,
          fill: on ? 'var(--blueprint,#3553ff)' : 'var(--rule-soft,#ddd)'
        }));
      }
      num.innerHTML = (frac * 100).toFixed(1) + ' <small>%：保留的能量（Energy）</small>';
      bar.style.width = (frac * 100).toFixed(1) + '%';
      meta.textContent = '秩（Rank）' + keep + ' / ' + n + '  ·  存储 ' + (keep * (2 * n + 1)) +
        ' 个数，完整矩阵为 ' + (n * n) + ' 个 · 蓝色条形表示保留的奇异值（Singular Value）';
      formula.textContent = 'A_k = sum_{i<k} sigma_i u_i v_iT   ·   能量（Energy）= 前 k 个 sigma^2 之和 / 全部 sigma^2 之和';
    };
    var grid = el('div', {}, [slider(state, 'k', '保留的奇异值（Singular Value）数量 k', 1, n, 1)]);
    host.appendChild(el('div', { class: 'lf' }, [
      el('div', { class: 'lf-head' }, [el('span', { class: 'lf-label' }, ['SVD 低秩近似（Low-rank）']), el('span', {}, ['调整秩 k'])]),
      el('div', { class: 'lf-body' }, [grid, el('div', { class: 'lf-out' }, [svg, el('div', { style: 'margin-top:10px' }, [num]), barWrap, meta, formula])]),
      el('div', { class: 'lf-cap' }, ['保留最大的 k 个奇异值（Singular Value），就能得到矩阵的最优秩 k 近似。前几个奇异值包含大部分能量，因此低秩（Low-rank）表示只需存储少得多的数，就能近乎完整地重建图案。这正是压缩（Compression）与低秩适配器（Low-rank Adapter）背后的思路。'])
    ]));
    state._render();
  }

  // tensor-broadcast：检查两个形状能否从尾部维度对齐并广播。
  function tensorBroadcast(host) {
    var state = { a0: 8, a1: 1, a2: 3, b0: 1, b1: 4, b2: 3 };
    var rows = el('div', {});
    var status = el('span', { class: 'lf-num lf-status' });
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    state._render = function () {
      var a = [state.a0, state.a1, state.a2];
      var b = [state.b0, state.b1, state.b2];
      var out = [], ok = true, i, why = '';
      for (i = 0; i < 3; i++) {
        var x = a[i], y = b[i];
        if (x === y) { out.push(x); }
        else if (x === 1) { out.push(y); }
        else if (y === 1) { out.push(x); }
        else { ok = false; out.push('x'); if (!why) { why = '维度（Dim）' + i + ': ' + x + ' 与 ' + y + '（两者都不是 1）'; } }
      }
      while (rows.firstChild) { rows.removeChild(rows.firstChild); }
      function shapeRow(label, vals, hi) {
        var cells = [];
        vals.forEach(function (v, idx) {
          var stretched = hi && (a[idx] === 1 || b[idx] === 1) && a[idx] !== b[idx] && (label !== '结果');
          cells.push(el('span', {
            class: 'lf-formula',
            style: 'display:inline-block;min-width:34px;text-align:center;padding:4px 6px;margin:2px;border:1px solid var(--rule-soft,#ddd);color:' +
              (v === 'x' ? 'var(--warn,#b8870f)' : 'var(--ink,#1a1a1a)')
          }, [String(v)]));
        });
        return el('div', { style: 'display:flex;align-items:center;gap:8px;margin:4px 0' },
          [el('span', { class: 'lf-meta', style: 'width:100px;flex-shrink:0' }, [label])].concat(cells));
      }
      rows.appendChild(shapeRow('形状（Shape）A', a, true));
      rows.appendChild(shapeRow('形状（Shape）B', b, true));
      rows.appendChild(shapeRow('结果', out, false));
      status.innerHTML = ok ? '可广播（Broadcast）' : '不匹配（Mismatch）';
      meta.textContent = ok ? '结果形状（Shape）(' + out.join(', ') + ')  ·  大小为 1 的维度扩展到另一维度的大小'
        : '无法广播（Broadcast）· ' + why;
      formula.textContent = '从尾部对齐维度；每对维度必须相等，或其中一个为 1';
    };
    var grid = el('div', { class: 'lf-grid' }, [
      slider(state, 'a0', 'A 维度（Dim）0', 1, 8, 1), slider(state, 'b0', 'B 维度（Dim）0', 1, 8, 1),
      slider(state, 'a1', 'A 维度（Dim）1', 1, 8, 1), slider(state, 'b1', 'B 维度（Dim）1', 1, 8, 1),
      slider(state, 'a2', 'A 维度（Dim）2', 1, 8, 1), slider(state, 'b2', 'B 维度（Dim）2', 1, 8, 1)
    ]);
    host.appendChild(el('div', { class: 'lf' }, [
      el('div', { class: 'lf-head' }, [el('span', { class: 'lf-label' }, ['广播（Broadcasting）']), el('span', {}, ['调整两个形状'])]),
      el('div', { class: 'lf-body' }, [grid, el('div', { class: 'lf-out' }, [rows, el('div', { style: 'margin-top:10px' }, [status]), meta, formula])]),
      el('div', { class: 'lf-cap' }, ['广播（Broadcasting）让形状不同的数组可以在不复制数据的情况下参与同一运算。从右向左对齐形状后，每对维度必须相等，或其中一个为 1 并被扩展；其他冲突都会报错。因此，偏置向量（Bias Vector）可以直接与整个批次（Batch）相加。'])
    ]));
    state._render();
  }

  // logsumexp-stability：直接求 exp 会溢出；先减最大值可保持有限结果。
  function logsumexpStability(host) {
    var base = [1.0, 0.5, -0.3];
    var state = { big: 700 };
    var rows = el('div', {});
    var status = el('span', { class: 'lf-num lf-status' });
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    state._render = function () {
      var x = [state.big].concat(base);
      // 直接计算 log(sum(exp(x)))：float64 中 exp(710+) 会溢出为 Infinity。
      var naiveSum = 0, i;
      for (i = 0; i < x.length; i++) { naiveSum += Math.exp(x[i]); }
      var naive = Math.log(naiveSum);
      // 稳定形式：m + log(sum(exp(x - m)))。
      var m = x[0];
      for (i = 1; i < x.length; i++) { if (x[i] > m) { m = x[i]; } }
      var s = 0;
      for (i = 0; i < x.length; i++) { s += Math.exp(x[i] - m); }
      var stable = m + Math.log(s);
      var overflow = !isFinite(naive);
      while (rows.firstChild) { rows.removeChild(rows.firstChild); }
      function line(label, val, warn) {
        return el('div', { style: 'display:flex;justify-content:space-between;margin:4px 0' }, [
          el('span', { class: 'lf-meta' }, [label]),
          el('span', { class: 'lf-formula', style: 'color:' + (warn ? 'var(--warn,#b8870f)' : 'var(--blueprint,#3553ff)') },
            [isFinite(val) ? val.toFixed(4) : 'Infinity（溢出，Overflow）'])
        ]);
      }
      rows.appendChild(line('直接计算 log(sum exp x)', naive, overflow));
      rows.appendChild(line('稳定形式（Stable）m + log(sum exp(x-m))', stable, false));
      status.innerHTML = overflow ? '直接计算发生溢出（Overflow）' : '两种结果一致';
      meta.textContent = overflow
        ? 'exp(' + state.big + ') 超过 float64 范围（约 exp 709），因此直接求和得到 Infinity；稳定形式返回 ' + stable.toFixed(4)
        : '两种形式在代数上等价，此处结果都有限（max = ' + m + ')';
      formula.textContent = 'logsumexp(x) = m + log( sum exp(x - m) ),  m = max(x)';
    };
    var grid = el('div', {}, [slider(state, 'big', '最大未归一化分数（Logit）', 1, 1500, 1)]);
    host.appendChild(el('div', { class: 'lf' }, [
      el('div', { class: 'lf-head' }, [el('span', { class: 'lf-label' }, ['对数指数和（Log-sum-exp）']), el('span', {}, ['调整未归一化分数（Logit）'])]),
      el('div', { class: 'lf-body' }, [grid, el('div', { class: 'lf-out' }, [rows, el('div', { style: 'margin-top:10px' }, [status]), meta, formula])]),
      el('div', { class: 'lf-cap' }, ['直接计算 log(sum(exp(x))) 时，只要任一未归一化分数（Logit）超过约 709，exp 就超出 float64 范围并发生溢出（Overflow）。先减去最大值，会把最大项移到 exp(0) = 1，从而让总和保持有限。由于减去的最大值在 log 外加了回来，结果不变。'])
    ]));
    state._render();
  }

  // norm-unit-balls：L1 菱形、L2 圆、Linf 正方形，并显示当前点的范数。
  function normUnitBalls(host) {
    var state = { which: 'l2', px: 0.6, py: 0.5 };
    var W = 260, H = 230, CX = 130, CY = 115, R = 90;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var num = el('span', { class: 'lf-num' });
    var meta = el('div', { class: 'lf-meta' });
    function toX(u) { return CX + u * R; }
    function toY(v) { return CY - v * R; }
    state._render = function () {
      while (svg.firstChild) { svg.removeChild(svg.firstChild); }
      // 坐标轴。
      svg.appendChild(svgEl('line', { x1: toX(-1.3), y1: CY, x2: toX(1.3), y2: CY, stroke: 'var(--rule-soft,#eee)', 'stroke-width': '1' }));
      svg.appendChild(svgEl('line', { x1: CX, y1: toY(-1.3), x2: CX, y2: toY(1.3), stroke: 'var(--rule-soft,#eee)', 'stroke-width': '1' }));
      // 单位球（Unit Ball）。
      var shape;
      if (state.which === 'l1') {
        shape = svgEl('polygon', { points: [toX(1) + ',' + toY(0), toX(0) + ',' + toY(1), toX(-1) + ',' + toY(0), toX(0) + ',' + toY(-1)].join(' '), fill: 'none', stroke: 'var(--blueprint,#3553ff)', 'stroke-width': '2' });
      } else if (state.which === 'linf') {
        shape = svgEl('rect', { x: toX(-1), y: toY(1), width: 2 * R, height: 2 * R, fill: 'none', stroke: 'var(--blueprint,#3553ff)', 'stroke-width': '2' });
      } else {
        shape = svgEl('circle', { cx: CX, cy: CY, r: R, fill: 'none', stroke: 'var(--blueprint,#3553ff)', 'stroke-width': '2' });
      }
      svg.appendChild(shape);
      // 当前点及其向量。
      svg.appendChild(svgEl('line', { x1: CX, y1: CY, x2: toX(state.px), y2: toY(state.py), stroke: 'var(--ink-mute,#999)', 'stroke-width': '1.5' }));
      svg.appendChild(svgEl('circle', { cx: toX(state.px), cy: toY(state.py), r: '5', fill: 'var(--warn,#b8870f)' }));
      var ax = Math.abs(state.px), ay = Math.abs(state.py);
      var norm = state.which === 'l1' ? ax + ay : state.which === 'linf' ? Math.max(ax, ay) : Math.sqrt(ax * ax + ay * ay);
      var nm = state.which === 'l1' ? 'L1' : state.which === 'linf' ? 'Linf' : 'L2';
      num.innerHTML = norm.toFixed(3) + ' <small>' + nm + ' 范数（Norm）</small>';
      var formula = state.which === 'l1' ? '|x| + |y|' : state.which === 'linf' ? 'max(|x|, |y|)' : 'sqrt(x^2 + y^2)';
      meta.textContent = nm + ' 范数，向量为 (' + state.px.toFixed(2) + ', ' + state.py.toFixed(2) + ') = ' + formula + '  ·  轮廓包含所有范数为 1 的点';
    };
    var grid = el('div', { class: 'lf-grid' }, [
      select(state, 'which', '范数（Norm）', [['L2（欧几里得，Euclidean）', 'l2'], ['L1（曼哈顿，Manhattan）', 'l1'], ['Linf（最大值，Max）', 'linf']]),
      slider(state, 'px', '点的 x 坐标', -1.2, 1.2, 0.05),
      slider(state, 'py', '点的 y 坐标', -1.2, 1.2, 0.05)
    ]);
    host.appendChild(el('div', { class: 'lf' }, [
      el('div', { class: 'lf-head' }, [el('span', { class: 'lf-label' }, ['范数单位球（Norm Unit Balls）']), el('span', {}, ['选择范数（Norm）'])]),
      el('div', { class: 'lf-body' }, [grid, el('div', { class: 'lf-out' }, [svg, el('div', { style: 'margin-top:10px' }, [num]), meta])]),
      el('div', { class: 'lf-cap' }, ['范数（Norm）衡量长度，这里用所有长度为 1 的向量展示单位球（Unit Ball）的边界。L2 对平方求和，形成圆形；L1 对绝对值求和，形成菱形；Linf 取最大的坐标值，形成正方形。选择不同范数，就会改变“接近”的含义，因此范数决定了正则化（Regularization）和距离度量的形式。'])
    ]));
    state._render();
  }

  // monte-carlo-pi：用落在四分之一圆内的点所占比例估计 pi。
  function monteCarloPi(host) {
    var state = { n: 200 };
    var W = 230, H = 230, PAD = 14, S = 200;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var num = el('span', { class: 'lf-num' });
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    // 使用确定性的低差异点（Low-discrepancy Points），按黄金比例共轭值做加法递推，
    // 使每次渲染得到相同图形。
    var g1 = 0.7548776662466927, g2 = 0.5698402909980532;
    state._render = function () {
      while (svg.firstChild) { svg.removeChild(svg.firstChild); }
      svg.appendChild(svgEl('rect', { x: PAD, y: PAD, width: S, height: S, fill: 'none', stroke: 'var(--rule-soft,#ddd)', 'stroke-width': '1' }));
      svg.appendChild(svgEl('path', { d: 'M ' + PAD + ' ' + PAD + ' A ' + S + ' ' + S + ' 0 0 1 ' + (PAD + S) + ' ' + (PAD + S), fill: 'none', stroke: 'var(--ink-soft,#555)', 'stroke-width': '1.5' }));
      var inside = 0, i;
      var px = 0.123, py = 0.456;
      for (i = 0; i < state.n; i++) {
        px = (px + g1) % 1; py = (py + g2) % 1;
        var hit = (px * px + py * py) <= 1;
        if (hit) { inside++; }
        if (state.n <= 1200) {
          svg.appendChild(svgEl('circle', {
            cx: PAD + px * S, cy: PAD + (1 - py) * S, r: '1.6',
            fill: hit ? 'var(--blueprint,#3553ff)' : 'var(--ink-mute,#bbb)'
          }));
        }
      }
      var est = 4 * inside / state.n;
      num.innerHTML = est.toFixed(4) + ' <small>~ pi</small>';
      meta.textContent = inside + ' / ' + fmtInt(state.n) + ' 个点位于圆内 · 误差（Error）' + Math.abs(est - Math.PI).toFixed(4) + '  ·  按 1/sqrt(N) 缩小';
      formula.textContent = 'pi ~ 4 * 四分之一圆内的点数 / N   ·   真实 pi = 3.14159';
    };
    var grid = el('div', {}, [slider(state, 'n', '样本数（Samples）N', 20, 5000, 20)]);
    host.appendChild(el('div', { class: 'lf' }, [
      el('div', { class: 'lf-head' }, [el('span', { class: 'lf-label' }, ['蒙特卡洛估计 π（Monte Carlo Pi）']), el('span', {}, ['调整样本数'])]),
      el('div', { class: 'lf-body' }, [grid, el('div', { class: 'lf-out' }, [svg, el('div', { style: 'margin-top:10px' }, [num]), meta, formula])]),
      el('div', { class: 'lf-cap' }, ['在单位正方形内撒点，统计落入四分之一圆内的点数。该比例对应面积比 pi/4，因此乘以四就得到 pi 的估计值。样本越多，估计越精确，但误差只按 N 的平方根的倒数下降；这正是蒙特卡洛方法（Monte Carlo）的典型代价。'])
    ]));
    state._render();
  }

  // linear-system-conditioning：两条直线趋近平行时，条件数急剧增大。
  function linearConditioning(host) {
    // 方程组：直线 1 固定为 x + y = 2，调整直线 2 的斜率使其趋近直线 1。
    var state = { tilt: 60 };
    var W = 260, H = 230, CX = 130, CY = 115, SC = 28;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var num = el('span', { class: 'lf-num' });
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    function toX(x) { return CX + x * SC; }
    function toY(y) { return CY - y * SC; }
    state._render = function () {
      while (svg.firstChild) { svg.removeChild(svg.firstChild); }
      // 直线 1：a1 x + b1 y = c1  ->  x + y = 2。
      var a1 = 1, b1 = 1, c1 = 2;
      // tilt -> 100 时，直线 2 的角度趋近直线 1；直线 1 的方向角为 135 度。
      var t = state.tilt / 100;
      var ang = (135 - 55 * t) * Math.PI / 180; // 80deg .. 135deg
      var a2 = Math.cos(ang), b2 = Math.sin(ang);
      var c2 = a2 * 1 + b2 * 1; // force both lines through the solution (1,1)
      var det = a1 * b2 - a2 * b1;
      // 通过奇异值计算 2x2 矩阵的条件数（Condition Number）。
      var M = [[a1, b1], [a2, b2]];
      var ata00 = M[0][0] * M[0][0] + M[1][0] * M[1][0];
      var ata01 = M[0][0] * M[0][1] + M[1][0] * M[1][1];
      var ata11 = M[0][1] * M[0][1] + M[1][1] * M[1][1];
      var tr = ata00 + ata11, dt = ata00 * ata11 - ata01 * ata01;
      var disc = Math.sqrt(Math.max(0, tr * tr / 4 - dt));
      var l1 = tr / 2 + disc, l2 = tr / 2 - disc;
      var cond = Math.sqrt(l1 / Math.max(l2, 1e-12));
      function drawLine(a, b, c, st) {
        // 在 x 范围内采样，绘制 a x + b y = c。
        var pts = [], xx;
        for (xx = -4; xx <= 4.01; xx += 8) {
          if (Math.abs(b) > 1e-6) { pts.push([xx, (c - a * xx) / b]); }
        }
        if (pts.length === 2) {
          svg.appendChild(svgEl('line', { x1: toX(pts[0][0]), y1: toY(pts[0][1]), x2: toX(pts[1][0]), y2: toY(pts[1][1]), stroke: st, 'stroke-width': '2' }));
        }
      }
      svg.appendChild(svgEl('line', { x1: toX(-4), y1: CY, x2: toX(4), y2: CY, stroke: 'var(--rule-soft,#eee)', 'stroke-width': '1' }));
      svg.appendChild(svgEl('line', { x1: CX, y1: toY(-4), x2: CX, y2: toY(4), stroke: 'var(--rule-soft,#eee)', 'stroke-width': '1' }));
      drawLine(a1, b1, c1, 'var(--ink-mute,#999)');
      drawLine(a2, b2, c2, 'var(--blueprint,#3553ff)');
      svg.appendChild(svgEl('circle', { cx: toX(1), cy: toY(1), r: '5', fill: 'var(--warn,#b8870f)' }));
      num.innerHTML = (cond < 1000 ? cond.toFixed(1) : cond.toExponential(1)) + ' <small>条件数（Condition Number）</small>';
      meta.textContent = (cond > 50 ? '病态（Ill-conditioned）：' : '良态（Well-conditioned）：') +
        'det = ' + det.toFixed(3) + '  ·  直线近乎平行时，交点对噪声极其敏感';
      formula.textContent = 'kappa = sigma_max / sigma_min   ·   b 中的微小噪声会使解的偏移最多放大 kappa 倍';
    };
    var grid = el('div', {}, [slider(state, 'tilt', '使直线 2 向直线 1 倾斜', 0, 98, 1)]);
    host.appendChild(el('div', { class: 'lf' }, [
      el('div', { class: 'lf-head' }, [el('span', { class: 'lf-label' }, ['条件性（Conditioning）']), el('span', {}, ['调整到接近平行'])]),
      el('div', { class: 'lf-body' }, [grid, el('div', { class: 'lf-out' }, [svg, el('div', { style: 'margin-top:10px' }, [num]), meta, formula])]),
      el('div', { class: 'lf-cap' }, ['二元线性方程组的解对应两条直线的交点。两线以较大夹角相交时，解明确而稳定。随着两线趋近平行，行列式（Determinant）缩小，条件数（Condition Number）剧增，输入的微小变化也会使交点移到很远的位置。病态方程组（Ill-conditioned System）会放大噪声。'])
    ]));
    state._render();
  }

  // random-walk-diffusion：一维随机游走的扩散范围按 sqrt(t) 增长。
  function randomWalkDiffusion(host) {
    var state = { t: 50 };
    var W = 520, H = 220, PAD = 30;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var num = el('span', { class: 'lf-num' });
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    var TMAX = 200;
    // 每个游走者使用固定符号序列，生成几条确定性的采样路径。
    var walkers = 7;
    function step(seed, k) {
      // {-1,+1} 中的确定性伪随机符号。
      var v = Math.sin(seed * 12.9898 + k * 78.233) * 43758.5453;
      v = v - Math.floor(v);
      return v < 0.5 ? -1 : 1;
    }
    function px(s) { return PAD + s / TMAX * (W - 2 * PAD); }
    function py(v) { return H / 2 - v / Math.sqrt(TMAX) * (H / 2 - PAD) * 0.9; }
    state._render = function () {
      while (svg.firstChild) { svg.removeChild(svg.firstChild); }
      svg.appendChild(svgEl('line', { x1: PAD, y1: H / 2, x2: W - PAD, y2: H / 2, stroke: 'var(--rule-soft,#eee)', 'stroke-width': '1' }));
      // 理论上的正负一个标准差包络：std = sqrt(t)。
      var dUp = '', dDn = '', i;
      for (i = 0; i <= 120; i++) {
        var s = TMAX * i / 120;
        var sd = Math.sqrt(s);
        dUp += (i ? 'L' : 'M') + px(s).toFixed(1) + ' ' + py(sd).toFixed(1) + ' ';
        dDn += (i ? 'L' : 'M') + px(s).toFixed(1) + ' ' + py(-sd).toFixed(1) + ' ';
      }
      svg.appendChild(svgEl('path', { d: dUp, fill: 'none', stroke: 'var(--warn,#b8870f)', 'stroke-width': '1.5', 'stroke-dasharray': '4 3' }));
      svg.appendChild(svgEl('path', { d: dDn, fill: 'none', stroke: 'var(--warn,#b8870f)', 'stroke-width': '1.5', 'stroke-dasharray': '4 3' }));
      var w, ends = [];
      for (w = 0; w < walkers; w++) {
        var pos = 0, d = '';
        d += 'M' + px(0).toFixed(1) + ' ' + py(0).toFixed(1) + ' ';
        var k;
        for (k = 1; k <= state.t; k++) {
          pos += step(w + 1, k);
          d += 'L' + px(k).toFixed(1) + ' ' + py(pos).toFixed(1) + ' ';
        }
        ends.push(pos);
        svg.appendChild(svgEl('path', { d: d, fill: 'none', stroke: 'var(--blueprint,#3553ff)', 'stroke-width': '1.2', opacity: '0.7' }));
        svg.appendChild(svgEl('circle', { cx: px(state.t), cy: py(pos), r: '3', fill: 'var(--blueprint,#3553ff)' }));
      }
      var sdTheory = Math.sqrt(state.t);
      num.innerHTML = sdTheory.toFixed(2) + ' <small>标准差（Std）= sqrt(t)</small>';
      meta.textContent = 't = ' + state.t + ' 步 · 终点按 sqrt(t) 而非 t 的尺度扩散 · 橙色虚线是正负一个标准差的包络线（Envelope）';
      formula.textContent = '每步以相同概率取 +/-1   ·   Var(position) = t，标准差（Std）= sqrt(t)';
    };
    var grid = el('div', {}, [slider(state, 't', '步数（Steps）t', 1, TMAX, 1)]);
    host.appendChild(el('div', { class: 'lf' }, [
      el('div', { class: 'lf-head' }, [el('span', { class: 'lf-label' }, ['随机游走（Random Walk）']), el('span', {}, ['调整步数'])]),
      el('div', { class: 'lf-body' }, [grid, el('div', { class: 'lf-out' }, [svg, el('div', { style: 'margin-top:10px' }, [num]), meta, formula])]),
      el('div', { class: 'lf-cap' }, ['一维随机游走（Random Walk）每个时刻前进或后退一步。各步独立，因此方差（Variance）可相加：t 步后的方差为 t，与起点的典型距离为 t 的平方根。扩散（Diffusion）较慢，所以轨迹不断徘徊，却很少径直远离起点。'])
    ]));
    state._render();
  }

  // roots-of-unity：n 个复数 n 次单位根均匀分布在单位圆上。
  function rootsOfUnity(host) {
    var state = { n: 5 };
    var W = 260, H = 240, CX = 130, CY = 120, R = 95;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var num = el('span', { class: 'lf-num' });
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    state._render = function () {
      while (svg.firstChild) { svg.removeChild(svg.firstChild); }
      svg.appendChild(svgEl('line', { x1: CX - R - 14, y1: CY, x2: CX + R + 14, y2: CY, stroke: 'var(--rule-soft,#eee)', 'stroke-width': '1' }));
      svg.appendChild(svgEl('line', { x1: CX, y1: CY - R - 14, x2: CX, y2: CY + R + 14, stroke: 'var(--rule-soft,#eee)', 'stroke-width': '1' }));
      svg.appendChild(svgEl('circle', { cx: CX, cy: CY, r: R, fill: 'none', stroke: 'var(--rule-soft,#ddd)', 'stroke-width': '1.5' }));
      var pts = '', k;
      var coords = [];
      for (k = 0; k < state.n; k++) {
        var ang = 2 * Math.PI * k / state.n;
        var x = CX + R * Math.cos(ang), y = CY - R * Math.sin(ang);
        coords.push([x, y]);
        pts += (k ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1) + ' ';
      }
      pts += 'Z';
      svg.appendChild(svgEl('path', { d: pts, fill: 'none', stroke: 'var(--blueprint,#3553ff)', 'stroke-width': '1', opacity: '0.45' }));
      coords.forEach(function (c, k2) {
        svg.appendChild(svgEl('line', { x1: CX, y1: CY, x2: c[0], y2: c[1], stroke: 'var(--rule-soft,#ddd)', 'stroke-width': '0.8' }));
        svg.appendChild(svgEl('circle', { cx: c[0], cy: c[1], r: k2 === 0 ? '5' : '4', fill: k2 === 0 ? 'var(--warn,#b8870f)' : 'var(--blueprint,#3553ff)' }));
      });
      num.innerHTML = state.n + ' <small>个根（Roots）</small>';
      meta.textContent = '角度间隔 ' + (360 / state.n).toFixed(1) + ' 度 · k = 0（橙色）始终对应 1 · n > 1 时所有根之和为 0';
      formula.textContent = 'z_k = exp(2*pi*i*k/n) = cos(2*pi*k/n) + i*sin(2*pi*k/n),  k = 0..n-1';
    };
    var grid = el('div', {}, [slider(state, 'n', 'n（根的数量，Number of Roots）', 1, 16, 1)]);
    host.appendChild(el('div', { class: 'lf' }, [
      el('div', { class: 'lf-head' }, [el('span', { class: 'lf-label' }, ['单位根（Roots of Unity）']), el('span', {}, ['调整 n'])]),
      el('div', { class: 'lf-body' }, [grid, el('div', { class: 'lf-out' }, [svg, el('div', { style: 'margin-top:10px' }, [num]), meta, formula])]),
      el('div', { class: 'lf-cap' }, ['n 个复数 n 次单位根（Roots of Unity）是方程 z 的 n 次方等于 1 的解。它们以 2πk/n 的角度均匀分布在单位圆（Unit Circle）上，其中一个始终位于 1。这些等间距的点对应离散傅里叶变换（Discrete Fourier Transform，DFT）背后的采样频率。'])
    ]));
    state._render();
  }

  // graph-degree-distribution：所有节点的度数之和等于边数的两倍。
  function graphDegrees(host) {
    var state = { nodes: 6, edges: 7 };
    var W = 260, H = 240, CX = 130, CY = 110, R = 80;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var num = el('span', { class: 'lf-num' });
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    state._render = function () {
      while (svg.firstChild) { svg.removeChild(svg.firstChild); }
      var n = state.nodes;
      var maxEdges = n * (n - 1) / 2;
      var e = Math.min(state.edges, maxEdges);
      // 确定性的边列表：按固定顺序枚举节点对，取前 e 对。
      var pairs = [], i, j;
      for (i = 0; i < n; i++) { for (j = i + 1; j < n; j++) { pairs.push([i, j]); } }
      // 交错排列，让先出现的边分散在环上，避免集中在局部。
      pairs.sort(function (a, b) { return ((a[1] - a[0]) - (b[1] - b[0])) || (a[0] - b[0]); });
      var deg = [];
      for (i = 0; i < n; i++) { deg.push(0); }
      var used = pairs.slice(0, e);
      var coords = [];
      for (i = 0; i < n; i++) {
        var ang = 2 * Math.PI * i / n - Math.PI / 2;
        coords.push([CX + R * Math.cos(ang), CY + R * Math.sin(ang)]);
      }
      used.forEach(function (p) {
        deg[p[0]]++; deg[p[1]]++;
        svg.appendChild(svgEl('line', { x1: coords[p[0]][0], y1: coords[p[0]][1], x2: coords[p[1]][0], y2: coords[p[1]][1], stroke: 'var(--rule-soft,#ccc)', 'stroke-width': '1.4' }));
      });
      coords.forEach(function (c, idx) {
        svg.appendChild(svgEl('circle', { cx: c[0], cy: c[1], r: '11', fill: 'var(--blueprint,#3553ff)' }));
        svg.appendChild(svgEl('text', { x: c[0], y: c[1] + 4, 'text-anchor': 'middle', 'font-size': '11', 'font-family': 'monospace', fill: 'var(--bg,#fafaf5)' }, []));
        svg.lastChild.appendChild(document.createTextNode(String(deg[idx])));
      });
      var sumDeg = 0;
      for (i = 0; i < n; i++) { sumDeg += deg[i]; }
      num.innerHTML = sumDeg + ' <small>= 2 * ' + used.length + ' 条边（Edges）</small>';
      meta.textContent = '每个节点标注其度（Degree）· 平均度 ' + (sumDeg / n).toFixed(2) +
        (e < state.edges ? '  ·  上限为 ' + maxEdges + '（完全图，Complete Graph）' : '');
      formula.textContent = '握手定理（Handshake Lemma）：度数总和 = 2 * 边数';
    };
    var grid = el('div', { class: 'lf-grid' }, [
      slider(state, 'nodes', '节点数（Nodes）', 3, 10, 1),
      slider(state, 'edges', '边数（Edges）', 0, 20, 1)
    ]);
    host.appendChild(el('div', { class: 'lf' }, [
      el('div', { class: 'lf-head' }, [el('span', { class: 'lf-label' }, ['图的度数（Graph Degrees）']), el('span', {}, ['调整节点数与边数'])]),
      el('div', { class: 'lf-body' }, [grid, el('div', { class: 'lf-out' }, [svg, el('div', { style: 'margin-top:10px' }, [num]), meta, formula])]),
      el('div', { class: 'lf-cap' }, ['每条边连接两个节点，使两端节点的度（Degree）各增加一。把所有节点的度相加，每条边恰好被计数两次。握手定理（Handshake Lemma）对任意图都成立，并由此要求奇数度节点的数量必须为偶数。'])
    ]));
    state._render();
  }

  LF.register({
    'svd-rank-reconstruction': svdRank,
    'tensor-broadcast': tensorBroadcast,
    'logsumexp-stability': logsumexpStability,
    'norm-unit-balls': normUnitBalls,
    'monte-carlo-pi': monteCarloPi,
    'linear-system-conditioning': linearConditioning,
    'random-walk-diffusion': randomWalkDiffusion,
    'roots-of-unity': rootsOfUnity,
    'graph-degree-distribution': graphDegrees
  });
})();
