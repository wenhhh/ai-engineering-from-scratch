/* figures-genai-rl.js — 阶段 8（生成式 AI（Generative AI））
   与阶段 9（强化学习（Reinforcement learning））的交互课程图表。在 lesson-figures.js 之后加载，
   通过 window.LF 注册。无依赖，仅使用 ES5，主题由 CSS 变量控制。 */
(function () {
  'use strict';
  var LF = window.LF;
  if (!LF) { return; }
  var el = LF.el, svgEl = LF.svgEl, slider = LF.slider, select = LF.select;
  var clamp = LF.clamp;

  function frame(host, label, hint, grid, outKids, caption) {
    host.appendChild(el('div', { class: 'lf' }, [
      el('div', { class: 'lf-head' }, [el('span', { class: 'lf-label' }, [label]), el('span', {}, [hint])]),
      el('div', { class: 'lf-body' }, [grid, el('div', { class: 'lf-out' }, outKids)]),
      el('div', { class: 'lf-cap' }, [caption])
    ]));
  }

  // ── diffusion-denoise: 随噪声去除，一维信号（1D signal）显现 ──
  function diffusionDenoise(host) {
    var W = 520, H = 240, PAD = 30, N = 96, T = 50;
    var state = { t: 35 };
    // 固定干净信号 x0 和噪声样本，使渲染具有确定性
    var x0 = [], noise = [], i, seed = 12345;
    function rnd() { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff * 2 - 1; }
    for (i = 0; i < N; i++) {
      var u = i / (N - 1);
      x0.push(0.6 * Math.sin(u * Math.PI * 2) + 0.25 * Math.sin(u * Math.PI * 6));
      noise.push(rnd());
    }
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    function px(j) { return PAD + j / (N - 1) * (W - 2 * PAD); }
    function py(v) { return H / 2 - v / 1.6 * (H / 2 - PAD); }
    state._render = function () {
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      svg.appendChild(svgEl('line', { x1: PAD, y1: H / 2, x2: W - PAD, y2: H / 2, stroke: 'var(--rule-soft,#eee)', 'stroke-width': '1' }));
      // alpha_bar 从 1（干净，t=0）下降至 ~0（纯噪声，t=T）
      var ab = Math.pow(Math.cos((state.t / T) * Math.PI / 2), 2);
      var sA = Math.sqrt(ab), sN = Math.sqrt(1 - ab), d = '', j;
      for (j = 0; j < N; j++) {
        var xt = sA * x0[j] + sN * noise[j];
        d += (j ? 'L' : 'M') + px(j).toFixed(1) + ' ' + py(xt).toFixed(1) + ' ';
      }
      // 淡色显示的干净目标参考轮廓
      var dc = '';
      for (j = 0; j < N; j++) { dc += (j ? 'L' : 'M') + px(j).toFixed(1) + ' ' + py(x0[j]).toFixed(1) + ' '; }
      svg.appendChild(svgEl('path', { d: dc, fill: 'none', stroke: 'var(--ink-mute,#999)', 'stroke-width': '1.5', 'stroke-dasharray': '4 3', opacity: '0.5' }));
      svg.appendChild(svgEl('path', { d: d, fill: 'none', stroke: 'var(--blueprint,#3553ff)', 'stroke-width': '1.8' }));
      meta.textContent = 't = ' + state.t + ' / ' + T + '  ·  信号 ' + Math.round(sA * 100) + '%  ·  噪声 ' + Math.round(sN * 100) + '%  ·  ' + (state.t < 8 ? '接近无噪声' : state.t > 42 ? '接近纯噪声' : '去噪中');
      formula.textContent = 'x_t = sqrt(alpha_bar_t) x_0 + sqrt(1 - alpha_bar_t) noise   ·   alpha_bar_t = cos^2((t/T)·pi/2)';
    };
    var grid = el('div', {}, [slider(state, 't', '时间步（Timestep）t：0 为干净信号，T 为噪声', 0, T, 1)]);
    frame(host, '扩散去噪（Diffusion Denoising）', '调整时间步',
      grid, [svg, meta, formula],
      '扩散模型（Diffusion Model）学习逆转加噪过程。在 t = T 时，信号为纯噪声；随着 t 降到 0，模型逐步去除噪声，原始信号逐渐显现，图中以灰色虚线表示。每个 x_t 都由干净信号与同一份噪声按调度权重混合得到。');
    state._render();
  }

  // ── noise-schedule: 比较扩散步骤（Diffusion steps）中线性与余弦 alpha_bar ──
  function noiseSchedule(host) {
    var W = 520, H = 220, PAD = 32, T = 1000;
    var state = { sched: 'cosine', t: 500 };
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    function ab(t) { return state.sched === 'cosine' ? Math.pow(Math.cos((t / T) * Math.PI / 2), 2) : Math.pow(1 - t / T, 2.2); }
    function px(t) { return PAD + t / T * (W - 2 * PAD); }
    function py(v) { return H - PAD - v * (H - 2 * PAD); }
    state._render = function () {
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      svg.appendChild(svgEl('line', { x1: PAD, y1: H - PAD, x2: W - PAD, y2: H - PAD, stroke: 'var(--rule-soft,#eee)', 'stroke-width': '1' }));
      var d = '', i, t;
      for (i = 0; i <= 160; i++) { t = T * i / 160; d += (i ? 'L' : 'M') + px(t).toFixed(1) + ' ' + py(ab(t)).toFixed(1) + ' '; }
      svg.appendChild(svgEl('path', { d: d, fill: 'none', stroke: 'var(--blueprint,#3553ff)', 'stroke-width': '2' }));
      var mx = px(state.t), v = ab(state.t);
      svg.appendChild(svgEl('line', { x1: mx, y1: PAD, x2: mx, y2: H - PAD, stroke: 'var(--ink-mute,#999)', 'stroke-width': '1', 'stroke-dasharray': '3 3' }));
      svg.appendChild(svgEl('circle', { cx: mx, cy: py(v), r: '5', fill: 'var(--blueprint,#3553ff)' }));
      var snr = v / Math.max(1e-6, 1 - v);
      meta.textContent = 'alpha_bar = ' + v.toFixed(3) + '  ·  信噪比（SNR）= ' + snr.toFixed(2) + '  ·  ' + (state.sched === 'cosine' ? '余弦调度在中间阶段保留信号更久' : '线性调度在早期更快破坏信号');
      formula.textContent = state.sched === 'cosine'
        ? 'alpha_bar_t = cos^2((t/T)·pi/2)   ·   SNR(t) = alpha_bar_t / (1 - alpha_bar_t)'
        : 'alpha_bar_t = (1 - t/T)^2.2   ·   SNR(t) = alpha_bar_t / (1 - alpha_bar_t)';
    };
    var grid = el('div', { class: 'lf-grid' }, [
      select(state, 'sched', '调度（Schedule）', [['余弦（Cosine）', 'cosine'], ['线性（Linear）', 'linear']]),
      slider(state, 't', '扩散步（Diffusion Step）t', 0, T, 10)
    ]);
    frame(host, '噪声调度（Noise Schedule）', '选择调度方式',
      grid, [svg, meta, formula],
      'alpha_bar 表示第 t 步保留的信号比例，它与剩余噪声比例之比就是信噪比（Signal-to-noise Ratio，SNR）。线性调度（Linear Schedule）在前几步快速消除信号；余弦调度（Cosine Schedule）在中间阶段衰减更缓，保留有用信号的时间更长，为模型提供信息更丰富的中间目标。');
    state._render();
  }

  // ── vae-latent-grid: 遍历二维潜空间（2D latent space），观察解码形状的变化 ──
  function vaeLatentGrid(host) {
    var W = 520, H = 240, CX = 380, CY = 120, R = 78;
    var state = { z1: 0, z2: 0 };
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    // 左侧：带移动点的潜在平面（Latent plane）；右侧：从 (z1,z2) 解码的参数化形状
    state._render = function () {
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      var planeX = 40, planeY = 40, planeW = 160, planeH = 160;
      svg.appendChild(svgEl('rect', { x: planeX, y: planeY, width: planeW, height: planeH, fill: 'none', stroke: 'var(--rule-soft,#ddd)', 'stroke-width': '1' }));
      svg.appendChild(svgEl('line', { x1: planeX, y1: planeY + planeH / 2, x2: planeX + planeW, y2: planeY + planeH / 2, stroke: 'var(--rule-soft,#eee)', 'stroke-width': '1' }));
      svg.appendChild(svgEl('line', { x1: planeX + planeW / 2, y1: planeY, x2: planeX + planeW / 2, y2: planeY + planeH, stroke: 'var(--rule-soft,#eee)', 'stroke-width': '1' }));
      var dx = planeX + planeW / 2 + state.z1 / 3 * (planeW / 2);
      var dy = planeY + planeH / 2 - state.z2 / 3 * (planeH / 2);
      svg.appendChild(svgEl('circle', { cx: dx, cy: dy, r: '5', fill: 'var(--blueprint,#3553ff)' }));
      // 解码（Decode）：z1 控制瓣数/尖锐程度，z2 控制圆形与星形之间的形态
      var pts = 80, k, dpath = '';
      var lobes = 3 + Math.round((state.z1 + 3) / 6 * 5); // 3..8
      var spike = (state.z2 + 3) / 6; // 0..1
      for (k = 0; k <= pts; k++) {
        var ang = k / pts * Math.PI * 2;
        var rad = R * (1 - spike * 0.55 * Math.abs(Math.cos(lobes * ang / 2)));
        var x = CX + rad * Math.cos(ang), y = CY + rad * Math.sin(ang);
        dpath += (k ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1) + ' ';
      }
      dpath += 'Z';
      svg.appendChild(svgEl('path', { d: dpath, fill: 'none', stroke: 'var(--blueprint,#3553ff)', 'stroke-width': '2' }));
      meta.textContent = '潜变量（z1, z2）= (' + state.z1.toFixed(1) + ', ' + state.z2.toFixed(1) + ')  ·  解码形状有 ' + lobes + ' 个瓣  ·  ' + (spike < 0.25 ? '圆润' : spike > 0.7 ? '尖锐' : '两者混合');
      formula.textContent = 'x = decoder(z),  z ~ N(0, I)   ·   相近的 z 解码为相似形状，体现潜空间的平滑性';
    };
    var grid = el('div', { class: 'lf-grid' }, [
      slider(state, 'z1', '潜变量（Latent）z1', -3, 3, 0.1),
      slider(state, 'z2', '潜变量（Latent）z2', -3, 3, 0.1)
    ]);
    frame(host, '变分自编码器（VAE）的潜空间网格', '调整 z1 和 z2',
      grid, [svg, meta, formula],
      '变分自编码器（Variational Autoencoder，VAE）将输入映射到平滑的潜空间（Latent Space），再把其中的点解码为输出。左侧方框是这个空间的一个切片，圆点是当前潜编码（Latent Code）。移动圆点时，右侧解码形状连续变化，因为解码器经过训练，会让相近的编码产生相近的输出。');
    state._render();
  }

  // ── gan-minimax: 生成器（Generator）与判别器（Discriminator）的平衡及失效模式 ──
  function ganMinimax(host) {
    var W = 520, H = 220, PAD = 34;
    // bal：-1 = 生成器远远领先，0 = 均衡（Equilibrium），+1 = 判别器远远领先
    var state = { bal: 0 };
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var status = el('span', { class: 'lf-num lf-status' });
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    function px(b) { return PAD + (b + 1) / 2 * (W - 2 * PAD); }
    function py(v) { return H - PAD - clamp(v, 0, 3) / 3 * (H - 2 * PAD); }
    // D 对伪造样本的准确率随 bal 上升；当 D 确信时，传给 G 的梯度消失
    function dLoss(b) { return 0.4 + 0.9 * (1 - Math.abs(b)); } // 胜方在极端位置的损失最低
    function gLoss(b) { return 0.5 + 1.4 * (b + 1) / 2; } // D 越强，生成器越吃亏
    state._render = function () {
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      svg.appendChild(svgEl('line', { x1: PAD, y1: H - PAD, x2: W - PAD, y2: H - PAD, stroke: 'var(--rule-soft,#eee)', 'stroke-width': '1' }));
      // bal = 0 处的均衡标记
      var ex = px(0);
      svg.appendChild(svgEl('line', { x1: ex, y1: PAD, x2: ex, y2: H - PAD, stroke: 'var(--rule-soft,#ddd)', 'stroke-width': '1', 'stroke-dasharray': '3 3' }));
      function curve(fn, st) { var d = '', i, b; for (i = 0; i <= 100; i++) { b = -1 + 2 * i / 100; d += (i ? 'L' : 'M') + px(b).toFixed(1) + ' ' + py(fn(b)).toFixed(1) + ' '; } svg.appendChild(svgEl('path', { d: d, fill: 'none', stroke: st, 'stroke-width': '2' })); }
      curve(dLoss, 'var(--ink-mute,#999)');
      curve(gLoss, 'var(--blueprint,#3553ff)');
      var b = state.bal;
      svg.appendChild(svgEl('circle', { cx: px(b), cy: py(gLoss(b)), r: '5', fill: 'var(--blueprint,#3553ff)' }));
      svg.appendChild(svgEl('circle', { cx: px(b), cy: py(dLoss(b)), r: '4', fill: 'var(--ink-mute,#999)' }));
      var mode;
      if (b > 0.55) mode = '判别器过强：梯度消失';
      else if (b < -0.55) mode = '生成器占优：存在模式崩塌风险';
      else mode = '接近均衡：有效梯度能够传递';
      status.innerHTML = mode;
      meta.textContent = '生成器损失 ' + gLoss(b).toFixed(2) + '  ·  判别器损失 ' + dLoss(b).toFixed(2) + '  ·  传给 G 的梯度 ' + ((1 - Math.abs(b)) * 100).toFixed(0) + '%';
      formula.textContent = 'min_G max_D  E[log D(x)] + E[log(1 - D(G(z)))]   ·   保持平衡，博弈才能持续提供有效信息';
    };
    var grid = el('div', {}, [slider(state, 'bal', '力量平衡：-1 为 G 领先，+1 为 D 领先', -1, 1, 0.05)]);
    frame(host, '生成对抗网络（GAN）的极小极大博弈（Minimax）', '调整双方力量平衡',
      grid, [svg, el('div', { style: 'margin-top:12px' }, [status]), meta, formula],
      '生成对抗网络（Generative Adversarial Network，GAN）是一场双人博弈：蓝色的生成器（Generator）试图欺骗灰色的判别器（Discriminator），后者则努力辨别真假。两者必须共同进步。判别器遥遥领先时，传给生成器的梯度会消失；生成器领先过多时，可能只产生少数几种输出，发生模式崩塌（Mode Collapse）。健康的训练保持在虚线标出的均衡附近。');
    state._render();
  }

  // ── qlearning-gridworld: 4x4 网格，展示各训练回合（Episodes）的价值快照 ──
  function qlearningGridworld(host) {
    var W = 520, H = 240, GRID = 4, CELL = 52, OX = 40, OY = 18;
    var GOAL = 3, PIT = 9; // index = row*4 + col；目标位于 (0,3)，陷阱位于 (2,1)
    var state = { ep: 200 };
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    // 在确定性的 4x4 网格上通过价值迭代（Value iteration）得到收敛值（gamma 0.9，步进代价 -0.04）
    var GAMMA = 0.9, STEP = -0.04, Rgoal = 1, Rpit = -1;
    function neighbors(s) {
      var r = Math.floor(s / GRID), c = s % GRID, out = [];
      if (r > 0) out.push(s - GRID); if (r < GRID - 1) out.push(s + GRID);
      if (c > 0) out.push(s - 1); if (c < GRID - 1) out.push(s + 1);
      return out;
    }
    var Vstar = []; var i;
    for (i = 0; i < GRID * GRID; i++) Vstar.push(0);
    Vstar[GOAL] = Rgoal; Vstar[PIT] = Rpit;
    (function () { var it, s, nb, best, k; for (it = 0; it < 200; it++) { for (s = 0; s < GRID * GRID; s++) { if (s === GOAL || s === PIT) continue; nb = neighbors(s); best = -1e9; for (k = 0; k < nb.length; k++) best = Math.max(best, Vstar[nb[k]]); Vstar[s] = STEP + GAMMA * best; } } })();
    function valueAt(s, ep) { if (s === GOAL) return Rgoal; if (s === PIT) return Rpit; return Vstar[s] * clamp(ep / 300, 0, 1); }
    function shade(v) {
      // 将 [-1,1] 中的 v 映射为 blueprint（正值）或 warn（负值）的不透明度
      if (v >= 0) return { fill: 'var(--blueprint,#3553ff)', op: (0.08 + 0.6 * Math.min(1, v)).toFixed(2) };
      return { fill: 'var(--warn,#b8870f)', op: (0.08 + 0.6 * Math.min(1, -v)).toFixed(2) };
    }
    function bestDir(s, ep) {
      var nb = neighbors(s), best = -1e9, dir = null, k;
      for (k = 0; k < nb.length; k++) { var vv = valueAt(nb[k], ep); if (vv > best) { best = vv; dir = nb[k]; } }
      return dir;
    }
    state._render = function () {
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      var s, r, c;
      for (s = 0; s < GRID * GRID; s++) {
        r = Math.floor(s / GRID); c = s % GRID;
        var x = OX + c * CELL, y = OY + r * CELL;
        var v = valueAt(s, state.ep), sh = shade(v);
        svg.appendChild(svgEl('rect', { x: x, y: y, width: CELL, height: CELL, fill: sh.fill, opacity: sh.op, stroke: 'var(--rule-soft,#ddd)', 'stroke-width': '1' }));
        var cx = x + CELL / 2, cy = y + CELL / 2;
        if (s === GOAL) { svg.appendChild(svgEl('text', { x: cx, y: cy + 4, 'text-anchor': 'middle', 'font-size': '12', fill: 'var(--ink,#1a1a1a)', 'font-family': 'monospace' }, [document.createTextNode('目标')])); }
        else if (s === PIT) { svg.appendChild(svgEl('text', { x: cx, y: cy + 4, 'text-anchor': 'middle', 'font-size': '13', fill: 'var(--ink,#1a1a1a)', 'font-family': 'monospace' }, [document.createTextNode('陷阱')])); }
        else {
          svg.appendChild(svgEl('text', { x: cx, y: y + CELL - 6, 'text-anchor': 'middle', 'font-size': '9', fill: 'var(--ink-mute,#777)', 'font-family': 'monospace' }, [document.createTextNode(v.toFixed(2))]));
          if (state.ep > 20) {
            var dir = bestDir(s, state.ep);
            if (dir != null) {
              var dr = Math.floor(dir / GRID) - r, dc = (dir % GRID) - c;
              var ax = cx + dc * 14, ay = (cy - 4) + dr * 14;
              svg.appendChild(svgEl('line', { x1: cx, y1: cy - 4, x2: ax, y2: ay, stroke: 'var(--ink,#1a1a1a)', 'stroke-width': '1.6' }));
              svg.appendChild(svgEl('circle', { cx: ax, cy: ay, r: '2.4', fill: 'var(--ink,#1a1a1a)' }));
            }
          }
        }
      }
      meta.textContent = '第 ' + state.ep + ' / 300 个回合  ·  ' + (state.ep < 30 ? '价值仍接近零' : state.ep < 200 ? '价值从目标向外传播' : '策略已收敛');
      formula.textContent = 'Q(s,a) <- Q(s,a) + alpha [ r + gamma max_a\' Q(s\',a\') - Q(s,a) ]   ·   gamma = 0.9';
    };
    var grid = el('div', {}, [slider(state, 'ep', '训练回合数（Training Episodes）', 0, 300, 10)]);
    frame(host, 'Q 学习网格世界（Q-learning Gridworld）', '调整训练回合数',
      grid, [svg, meta, formula],
      '智能体学习到达目标并避开陷阱。单元格颜色表示学到的状态价值（State Value），蓝色为好、琥珀色为差；箭头表示贪心策略（Greedy Policy）。训练初期，价值接近零；随着训练推进，价值从目标向外传播，箭头逐渐连成一条绕过陷阱的路径。');
    state._render();
  }

  // ── value-iteration-gamma: 价值沿一维链（1D chain）向目标传播 ──
  function valueIterationGamma(host) {
    var W = 520, H = 200, N = 10, CELL = 44, OX = 36, OY = 70;
    var state = { gamma: 0.9 };
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    // 目标在最右单元，奖励为 1；每步无代价；V(s) = gamma^(dist)
    state._render = function () {
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      var g = state.gamma, i, vals = [];
      for (i = 0; i < N; i++) vals.push(Math.pow(g, (N - 1 - i)));
      for (i = 0; i < N; i++) {
        var x = OX + i * CELL, y = OY, v = vals[i];
        var op = (0.08 + 0.7 * v).toFixed(2);
        svg.appendChild(svgEl('rect', { x: x, y: y, width: CELL - 4, height: CELL - 4, fill: 'var(--blueprint,#3553ff)', opacity: op, stroke: 'var(--rule-soft,#ddd)', 'stroke-width': '1' }));
        var cx = x + (CELL - 4) / 2;
        svg.appendChild(svgEl('text', { x: cx, y: y + (CELL - 4) / 2 + 4, 'text-anchor': 'middle', 'font-size': '9', fill: 'var(--ink,#1a1a1a)', 'font-family': 'monospace' }, [document.createTextNode(v.toFixed(2))]));
        if (i === N - 1) svg.appendChild(svgEl('text', { x: cx, y: y - 8, 'text-anchor': 'middle', 'font-size': '10', fill: 'var(--ink-mute,#777)', 'font-family': 'monospace' }, [document.createTextNode('目标')]));
        if (i < N - 1) { svg.appendChild(svgEl('line', { x1: x + CELL - 6, y1: y + (CELL - 4) / 2, x2: x + CELL + 2, y2: y + (CELL - 4) / 2, stroke: 'var(--ink-mute,#999)', 'stroke-width': '1.2' })); }
      }
      var reach = vals[0];
      meta.textContent = 'gamma = ' + g.toFixed(2) + '  ·  距目标 9 步处的价值 = ' + reach.toFixed(3) + '  ·  ' + (g < 0.6 ? '目光较短：远期奖励迅速衰减' : g > 0.95 ? '目光较远：价值传遍整条链' : '考虑范围适中');
      formula.textContent = 'V(s) = gamma^(到目标的距离)   ·   gamma 越大，价值从目标传播得越远';
    };
    var grid = el('div', {}, [slider(state, 'gamma', '折扣因子（Discount Factor）gamma', 0.1, 0.99, 0.01)]);
    frame(host, '价值迭代（Value Iteration）', '调整 gamma',
      grid, [svg, meta, formula],
      '价值迭代（Value Iteration）将奖励从目标逐步向前回传。这条链上只有最右端的单元格提供奖励，因此每个状态的价值等于 gamma 的“到目标距离”次方。gamma 较小时，远期奖励几乎没有价值，策略偏向眼前；gamma 接近 1 时，较高的价值会沿整条链回传。');
    state._render();
  }

  // ── epsilon-greedy: 探索/利用（Explore/exploit）分配与累积遗憾（Cumulative regret） ──
  function epsilonGreedy(host) {
    var W = 520, H = 210, PAD = 32, N = 500;
    var state = { eps: 0.1, decay: 1 }; // decay 1 = 固定调度，0 = 衰减调度（Decaying schedule）
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var bar = el('i');
    var barWrap = el('div', { class: 'lf-bar' }, [bar]);
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    function epsAt(t) { return state.decay > 0.5 ? state.eps : state.eps / (1 + t / 60); }
    function px(t) { return PAD + t / N * (W - 2 * PAD); }
    function py(v, vmax) { return H - PAD - clamp(v / Math.max(vmax, 1e-6), 0, 1) * (H - 2 * PAD); }
    var GAP = 0.4; // 每次探索性拉动的遗憾代价（选择次优臂（Suboptimal arm））
    state._render = function () {
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      svg.appendChild(svgEl('line', { x1: PAD, y1: H - PAD, x2: W - PAD, y2: H - PAD, stroke: 'var(--rule-soft,#eee)', 'stroke-width': '1' }));
      var t, regret = 0, pts = [], vmax = 1e-6;
      for (t = 0; t <= N; t++) { regret += epsAt(t) * GAP; pts.push(regret); }
      vmax = pts[N];
      var d = '';
      for (t = 0; t <= N; t += 5) { d += (t ? 'L' : 'M') + px(t).toFixed(1) + ' ' + py(pts[t], vmax).toFixed(1) + ' '; }
      svg.appendChild(svgEl('path', { d: d, fill: 'none', stroke: 'var(--blueprint,#3553ff)', 'stroke-width': '2' }));
      var e0 = epsAt(0), eEnd = epsAt(N);
      bar.style.width = (e0 * 100).toFixed(0) + '%';
      meta.textContent = '初始探索 ' + Math.round(e0 * 100) + '% / 利用 ' + Math.round((1 - e0) * 100) + '%  ·  最终探索 ' + Math.round(eEnd * 100) + '%  ·  累计遗憾 ' + vmax.toFixed(1);
      formula.textContent = state.decay > 0.5
        ? '固定 epsilon：遗憾持续线性增长  ·  P(explore) = ' + state.eps.toFixed(2)
        : '衰减 epsilon_t = epsilon_0 / (1 + t/60)  ·  探索减少时，遗憾增长趋缓';
    };
    var grid = el('div', { class: 'lf-grid' }, [
      slider(state, 'eps', 'epsilon（探索率，Exploration Rate）', 0, 0.5, 0.01),
      select(state, 'decay', '调度（Schedule）', [['固定（Fixed）', '1'], ['衰减（Decaying）', '0']])
    ]);
    frame(host, 'ε-贪心策略（Epsilon-greedy）', '调整 epsilon',
      grid, [el('div', { class: 'lf-meta' }, ['探索动作占比']), barWrap, svg, meta, formula],
      '智能体以 epsilon 的概率随机选择动作进行探索（Exploration），其余时候利用（Exploitation）当前估计最优的动作。条形表示探索与利用的比例，曲线表示累计遗憾（Cumulative Regret），即没有始终选择最优臂而损失的奖励。固定 epsilon 会持续累积遗憾；衰减调度先探索、后利用，使遗憾曲线趋缓。');
    state._render();
  }

  // ── discount-horizon: 有效时域（Effective horizon）与权重的几何衰减 ──
  function discountHorizon(host) {
    var W = 520, H = 210, PAD = 32, TMAX = 40;
    var state = { gamma: 0.9 };
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var num = el('span', { class: 'lf-num' });
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    function px(t) { return PAD + t / TMAX * (W - 2 * PAD); }
    function py(w) { return H - PAD - w * (H - 2 * PAD); }
    state._render = function () {
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      svg.appendChild(svgEl('line', { x1: PAD, y1: H - PAD, x2: W - PAD, y2: H - PAD, stroke: 'var(--rule-soft,#eee)', 'stroke-width': '1' }));
      var g = state.gamma, t;
      for (t = 0; t <= TMAX; t++) {
        var w = Math.pow(g, t);
        svg.appendChild(svgEl('rect', { x: px(t) - 3, y: py(w), width: 6, height: (H - PAD) - py(w), fill: 'var(--blueprint,#3553ff)', opacity: '0.85' }));
      }
      var hor = 1 / (1 - g);
      // 标出有效时域
      var hx = px(Math.min(TMAX, hor));
      svg.appendChild(svgEl('line', { x1: hx, y1: PAD, x2: hx, y2: H - PAD, stroke: 'var(--warn,#b8870f)', 'stroke-width': '1.5', 'stroke-dasharray': '4 3' }));
      num.innerHTML = hor.toFixed(1) + ' <small>步有效视野</small>';
      meta.textContent = 'gamma = ' + g.toFixed(2) + '  ·  视野边界处的权重 = ' + Math.pow(g, hor).toFixed(2) + '（约 1/e）  ·  20 步后的奖励权重为 ' + Math.pow(g, 20).toFixed(3);
      formula.textContent = 'return = sum_t gamma^t r_t   ·   有效视野 = 1/(1 - gamma)   ·   权重按几何级数衰减';
    };
    var grid = el('div', {}, [slider(state, 'gamma', '折扣因子（Discount Factor）gamma', 0.5, 0.99, 0.01)]);
    frame(host, '折扣视野（Discount Horizon）', '调整 gamma',
      grid, [svg, el('div', { style: 'margin-top:10px' }, [num]), meta, formula],
      't 步之后的未来奖励乘以权重 gamma^t，因此权重按几何级数衰减，图中用柱形表示。虚线标出有效视野（Effective Horizon）1/(1 - gamma)，此处权重已降至约 1/e。提高 gamma 会延伸这一范围，使智能体重视更遥远的未来奖励。');
    state._render();
  }

  // ── policy-gradient-landscape: 梯度上升（Gradient ascent）攀登奖励峰 ──
  function policyGradientLandscape(host) {
    var W = 520, H = 230, PAD = 30;
    var state = { lr: 0.15, steps: 14, theta0: -2.4 };
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var status = el('span', { class: 'lf-num lf-status' });
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    // 奖励 J(theta)：平滑的峰状曲面，最大值位于 theta = 1.2 附近
    function J(t) { return 3 * Math.exp(-0.35 * (t - 1.2) * (t - 1.2)) + 0.4 * Math.exp(-0.8 * (t + 2) * (t + 2)); }
    function grad(t) { var h = 1e-3; return (J(t + h) - J(t - h)) / (2 * h); }
    function px(t) { return PAD + (t + 3.5) / 7 * (W - 2 * PAD); }
    function py(v) { return H - PAD - v / 3.4 * (H - 2 * PAD); }
    state._render = function () {
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      var d = '', i, x;
      for (i = 0; i <= 140; i++) { x = -3.5 + 7 * i / 140; d += (i ? 'L' : 'M') + px(x).toFixed(1) + ' ' + py(J(x)).toFixed(1) + ' '; }
      svg.appendChild(svgEl('path', { d: d, fill: 'none', stroke: 'var(--rule-soft,#ccc)', 'stroke-width': '2' }));
      var th = state.theta0, pts = [], t;
      for (t = 0; t <= state.steps; t++) { pts.push(th); th = th + state.lr * grad(th); th = clamp(th, -3.4, 3.4); }
      var pd = '';
      pts.forEach(function (p, idx) { pd += (idx ? 'L' : 'M') + px(p).toFixed(1) + ' ' + py(J(p)).toFixed(1) + ' '; });
      svg.appendChild(svgEl('path', { d: pd, fill: 'none', stroke: 'var(--blueprint,#3553ff)', 'stroke-width': '1.5', 'stroke-dasharray': '4 3' }));
      pts.forEach(function (p, idx) { svg.appendChild(svgEl('circle', { cx: px(p), cy: py(J(p)), r: idx === pts.length - 1 ? '5' : '3', fill: 'var(--blueprint,#3553ff)' })); });
      var last = pts[pts.length - 1];
      var atPeak = Math.abs(last - 1.2) < 0.2;
      status.innerHTML = atPeak ? '已到达峰值附近' : 'J(theta) = ' + J(last).toFixed(2);
      meta.textContent = 'theta = ' + last.toFixed(2) + '  ·  奖励 ' + J(last).toFixed(3) + ' / 最大值 ' + J(1.2).toFixed(2) + '  ·  ' + (state.lr > 0.6 ? '学习率较大：可能越过峰值' : '向上攀升中');
      formula.textContent = 'theta <- theta + lr · grad_theta J(theta)   ·   梯度上升朝期望奖励更高的方向移动';
    };
    var grid = el('div', { class: 'lf-grid' }, [
      slider(state, 'lr', '学习率（Learning Rate）', 0.02, 1.0, 0.02),
      slider(state, 'steps', '步数（Steps）', 1, 40, 1),
      slider(state, 'theta0', '初始 theta', -3.2, 3.2, 0.1)
    ]);
    frame(host, '策略梯度（Policy Gradient）', '调整学习率',
      grid, [svg, el('div', { style: 'margin-top:12px' }, [status]), meta, formula],
      '策略梯度（Policy Gradient）方法沿提高期望奖励的方向调整策略参数 theta。灰色曲线表示奖励曲面（Reward Landscape）的截面，圆点表示向峰值攀升的各个更新步骤。学习率小时上升缓慢，过大时会越过峰值；如果从左侧局部凸起附近出发，也可能被困在那里。');
    state._render();
  }

  LF.register({
    'diffusion-denoise': diffusionDenoise,
    'noise-schedule': noiseSchedule,
    'vae-latent-grid': vaeLatentGrid,
    'gan-minimax': ganMinimax,
    'qlearning-gridworld': qlearningGridworld,
    'value-iteration-gamma': valueIterationGamma,
    'epsilon-greedy': epsilonGreedy,
    'discount-horizon': discountHorizon,
    'policy-gradient-landscape': policyGradientLandscape
  });
})();
