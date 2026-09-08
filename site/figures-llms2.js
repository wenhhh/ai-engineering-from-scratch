/* figures-llms2.js：阶段 10（从零构建大语言模型（LLMs from scratch））
   的第二批交互课程图表。在 lesson-figures.js 之后加载，通过
   window.LF.register 注册。原生 ES5，无依赖，主题由 CSS 变量控制。编写时
   仍使用相同的围栏块：
       ```figure
       rmsnorm-vs-layernorm
       ```  */
(function () {
  'use strict';
  var LF = window.LF;
  if (!LF) { return; }
  var el = LF.el, svgEl = LF.svgEl, slider = LF.slider, select = LF.select, fmtInt = LF.fmtInt;

  // ── rmsnorm-vs-layernorm: 对特征向量（Feature vector）执行中心化并缩放，与仅缩放对比 ──
  function rmsnormVsLayernorm(host) {
    var feats = [2.4, -1.2, 0.8, 3.1, -0.6, 1.7];
    var state = { mode: 'rmsnorm', shift: 0 };
    var W = 520, H = 200, PAD = 28, N = feats.length;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var num = el('span', { class: 'lf-num' });
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    function px(i) { return PAD + (i + 0.5) / N * (W - 2 * PAD); }
    function py(v) { return H / 2 - v * 14; }
    state._render = function () {
      var x = feats.map(function (f) { return f + state.shift; });
      var mean = x.reduce(function (a, b) { return a + b; }, 0) / N;
      var ss = x.reduce(function (a, b) { return a + b * b; }, 0) / N;
      var meanSq = x.reduce(function (a, b) { return a + (b - mean) * (b - mean); }, 0) / N;
      var rms = Math.sqrt(ss + 1e-5);
      var std = Math.sqrt(meanSq + 1e-5);
      var out;
      if (state.mode === 'rmsnorm') { out = x.map(function (v) { return v / rms; }); }
      else { out = x.map(function (v) { return (v - mean) / std; }); }
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      svg.appendChild(svgEl('line', { x1: PAD, y1: py(0), x2: W - PAD, y2: py(0), stroke: 'var(--rule-soft,#eee)', 'stroke-width': '1' }));
      var i;
      for (i = 0; i < N; i++) {
        svg.appendChild(svgEl('rect', { x: (px(i) - 9).toFixed(1), y: Math.min(py(0), py(x[i])).toFixed(1), width: '6', height: Math.abs(py(x[i]) - py(0)).toFixed(1), fill: 'var(--ink-mute,#999)', opacity: '0.6' }));
        svg.appendChild(svgEl('rect', { x: (px(i) + 3).toFixed(1), y: Math.min(py(0), py(out[i])).toFixed(1), width: '6', height: Math.abs(py(out[i]) - py(0)).toFixed(1), fill: 'var(--blueprint,#3553ff)' }));
      }
      var outMean = out.reduce(function (a, b) { return a + b; }, 0) / N;
      num.innerHTML = (state.mode === 'rmsnorm' ? 'RMS ' + rms.toFixed(2) : 'std ' + std.toFixed(2)) + ' <small>除数</small>';
      meta.textContent = state.mode === 'rmsnorm'
        ? '不减均值：输出均值 ' + outMean.toFixed(2) + '（偏移保留）· 开销更低，不做中心化'
        : '先减去均值 ' + mean.toFixed(2) + '：输出均值 ' + outMean.toFixed(2) + '（重新以 0 为中心）';
      formula.textContent = state.mode === 'rmsnorm'
        ? 'RMSNorm: xᵢ / sqrt(mean(x²) + ε)   ·   跳过均值处理，保留缩放步骤'
        : 'LayerNorm: (xᵢ − mean) / sqrt(var + ε)   ·   先中心化，再缩放';
    };
    var grid = el('div', { class: 'lf-grid' }, [
      select(state, 'mode', '归一化（Normalization）', [['均方根归一化（RMSNorm）', 'rmsnorm'], ['层归一化（LayerNorm）', 'layernorm']]),
      slider(state, 'shift', '添加常数偏移', -2, 2, 0.1)
    ]);
    host.appendChild(el('div', { class: 'lf' }, [
      el('div', { class: 'lf-head' }, [el('span', { class: 'lf-label' }, ['RMSNorm 与 LayerNorm 对比']), el('span', {}, ['切换方法并调整偏移'])]),
      el('div', { class: 'lf-body' }, [grid, el('div', { class: 'lf-out' }, [svg, num, meta, formula])]),
      el('div', { class: 'lf-cap' }, ['灰色表示原始特征向量，蓝色表示归一化输出。层归一化（Layer Normalization，LayerNorm）先减均值，再除以标准差（Standard Deviation），将每个向量重新中心化到零。均方根归一化（Root Mean Square Normalization，RMSNorm）完全跳过均值处理，直接除以均方根（RMS），因此开销更低，并保留常数偏移。添加偏移后，可以看到 LayerNorm 消除了它，而 RMSNorm 让它继续影响输出。'])
    ]));
    state._render();
  }

  // ── swiglu-ffn: 门控路径（Gate path）调制值路径（Value path），与普通 ReLU 对比 ──
  function swigluFfn(host) {
    var state = { x: 1.2, mode: 'swiglu' };
    var W = 520, H = 200, PAD = 30;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var num = el('span', { class: 'lf-num' });
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    var wV = 1.0, wG = 0.8;
    function swish(z) { return z / (1 + Math.exp(-z)); }
    function relu(z) { return z > 0 ? z : 0; }
    function out(x) {
      var v = x * wV;
      if (state.mode === 'swiglu') { return v * swish(x * wG); }
      return relu(v);
    }
    function px(x) { return PAD + (x + 4) / 8 * (W - 2 * PAD); }
    function py(y) { return H - PAD - (y + 4) / (Math.max(4, out(4)) + 4) * (H - 2 * PAD); }
    state._render = function () {
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      svg.appendChild(svgEl('line', { x1: px(-4), y1: py(0), x2: px(4), y2: py(0), stroke: 'var(--rule-soft,#eee)', 'stroke-width': '1' }));
      svg.appendChild(svgEl('line', { x1: px(0), y1: py(-4), x2: px(0), y2: py(4), stroke: 'var(--rule-soft,#eee)', 'stroke-width': '1' }));
      var d = '', i;
      for (i = 0; i <= 160; i++) { var x = -4 + 8 * i / 160; d += (i ? 'L' : 'M') + px(x).toFixed(1) + ' ' + py(out(x)).toFixed(1) + ' '; }
      svg.appendChild(svgEl('path', { d: d, fill: 'none', stroke: 'var(--blueprint,#3553ff)', 'stroke-width': '2' }));
      var y = out(state.x);
      svg.appendChild(svgEl('circle', { cx: px(state.x), cy: py(y), r: '5', fill: 'var(--blueprint,#3553ff)' }));
      var v = state.x * wV, g = swish(state.x * wG);
      num.innerHTML = y.toFixed(3) + ' <small>输出</small>';
      meta.textContent = state.mode === 'swiglu'
        ? '值分支 ' + v.toFixed(2) + ' × 门控 swish(' + (state.x * wG).toFixed(2) + ') = ' + g.toFixed(2) + '  →  ' + y.toFixed(2)
        : '普通 FFN：ReLU(' + v.toFixed(2) + ') = ' + y.toFixed(2) + '（无门控）';
      formula.textContent = state.mode === 'swiglu'
        ? 'SwiGLU: (x·W) ⊙ swish(x·V)   ·   门控平滑地调节数值'
        : 'ReLU FFN: max(0, x·W)   ·   硬截断，无第二条分支';
    };
    var grid = el('div', { class: 'lf-grid' }, [
      select(state, 'mode', '前馈网络（FFN）', [['SwiGLU（带门控）', 'swiglu'], ['ReLU（普通）', 'relu']]),
      slider(state, 'x', '输入 x', -4, 4, 0.1)
    ]);
    host.appendChild(el('div', { class: 'lf' }, [
      el('div', { class: 'lf-head' }, [el('span', { class: 'lf-label' }, ['SwiGLU 前馈网络（Feed-forward Network）']), el('span', {}, ['切换方法并拖动 x'])]),
      el('div', { class: 'lf-body' }, [grid, el('div', { class: 'lf-out' }, [svg, num, meta, formula])]),
      el('div', { class: 'lf-cap' }, ['普通前馈网络（FFN）让输入经过一个矩阵和 ReLU，在零点形成突变的折角。SwiGLU 将同一输入分成值分支 x·W 和门控分支 swish(x·V)，再将两者相乘。门控（Gate）逐坐标平滑地放大或缩小数值，为网络提供可学习的软开关；现代开放模型更倾向于用它替代单纯的 ReLU。'])
    ]));
    state._render();
  }

  // ── rlhf-pipeline: SFT → 奖励模型（Reward model）→ PPO，三个阶段间传递数据 ──
  function rlhfPipeline(host) {
    var state = { stage: 0 };
    var W = 520, H = 210, PAD = 18;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    var STAGES = [
      { name: 'SFT', sub: '监督微调', data: '人工示范', out: '策略 π₀' },
      { name: '奖励', sub: '训练奖励模型', data: '偏好样本对', out: '奖励 r(x,y)' },
      { name: 'PPO', sub: '强化学习优化', data: '提示词 + 奖励', out: '对齐后的策略 π' }
    ];
    var DESC = [
      '阶段 1：监督微调（Supervised Fine-tuning，SFT）。用人工编写的示范微调基础模型，得到初始策略（Policy）。',
      '阶段 2：奖励模型（Reward Model，RM）。用优选与弃选回答组成的样本对训练模型，为回答质量评分。',
      '阶段 3：近端策略优化（Proximal Policy Optimization，PPO）。根据奖励模型优化策略，并用 KL 散度惩罚约束其偏离 SFT 策略的程度。'
    ];
    function box(x, y, w, h, label, sub, active) {
      var g = svgEl('g', {});
      g.appendChild(svgEl('rect', { x: x, y: y, width: w, height: h, rx: '4',
        fill: active ? 'var(--blueprint,#3553ff)' : 'var(--bg-surface,#eee)',
        stroke: 'var(--ink-soft,#555)', 'stroke-width': '1.2' }));
      var t = svgEl('text', { x: (x + w / 2).toFixed(1), y: (y + 20).toFixed(1), 'text-anchor': 'middle',
        'font-family': 'monospace', 'font-size': '12', fill: active ? 'var(--bg,#fafaf5)' : 'var(--ink,#1a1a1a)' });
      t.appendChild(document.createTextNode(label));
      g.appendChild(t);
      var s = svgEl('text', { x: (x + w / 2).toFixed(1), y: (y + 36).toFixed(1), 'text-anchor': 'middle',
        'font-family': 'monospace', 'font-size': '9', fill: active ? 'var(--bg,#fafaf5)' : 'var(--ink-mute,#777)' });
      s.appendChild(document.createTextNode(sub));
      g.appendChild(s);
      return g;
    }
    function caption(x, y, txt, st) {
      var t = svgEl('text', { x: x.toFixed(1), y: y.toFixed(1), 'text-anchor': 'middle',
        'font-family': 'monospace', 'font-size': '9.5', fill: st });
      t.appendChild(document.createTextNode(txt));
      return t;
    }
    state._render = function () {
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      var bw = 134, bh = 48, gap = (W - 2 * PAD - 3 * bw) / 2, midY = 80;
      var i, xs = [];
      for (i = 0; i < 3; i++) { xs.push(PAD + i * (bw + gap)); }
      for (i = 0; i < 3; i++) {
        svg.appendChild(box(xs[i], midY, bw, bh, STAGES[i].name, STAGES[i].sub, i === state.stage));
        svg.appendChild(caption(xs[i] + bw / 2, midY - 14, STAGES[i].data + ' →', 'var(--ink-mute,#777)'));
        svg.appendChild(caption(xs[i] + bw / 2, midY + bh + 18, '→ ' + STAGES[i].out, 'var(--ink-soft,#555)'));
        if (i < 2) {
          var ax = xs[i] + bw, bx = xs[i + 1];
          svg.appendChild(svgEl('line', { x1: ax, y1: midY + bh / 2, x2: bx, y2: midY + bh / 2, stroke: 'var(--blueprint,#3553ff)', 'stroke-width': '2' }));
          svg.appendChild(svgEl('polygon', { points: bx + ',' + (midY + bh / 2) + ' ' + (bx - 8) + ',' + (midY + bh / 2 - 4) + ' ' + (bx - 8) + ',' + (midY + bh / 2 + 4), fill: 'var(--blueprint,#3553ff)' }));
        }
      }
      meta.textContent = DESC[state.stage];
      formula.textContent = 'SFT(示范) → RM(偏好) → PPO(最大化奖励 − β·KL[π ‖ π₀])';
    };
    var grid = el('div', {}, [slider(state, 'stage', '流水线阶段', 0, 2, 1)]);
    host.appendChild(el('div', { class: 'lf' }, [
      el('div', { class: 'lf-head' }, [el('span', { class: 'lf-label' }, ['RLHF 流水线（Pipeline）']), el('span', {}, ['逐阶段查看'])]),
      el('div', { class: 'lf-body' }, [grid, el('div', { class: 'lf-out' }, [svg, meta, formula])]),
      el('div', { class: 'lf-cap' }, ['基于人类反馈的强化学习（Reinforcement Learning from Human Feedback，RLHF）分为三个阶段。首先通过监督微调，让基础模型从人工示范中学会遵循指令。随后，奖励模型从偏好样本对中学习如何为回答评分。最后，PPO 优化策略以最大化奖励，同时用 KL 散度惩罚使它保持接近 SFT 模型，避免逐渐走向奖励投机（Reward Hacking）。'])
    ]));
    state._render();
  }

  // ── dpo-loss: 被选与被拒回答之间的间隔（Margin），由 beta 缩放 ──
  function dpoLoss(host) {
    var state = { beta: 0.3, gap: 0.0 };
    var W = 520, H = 200, PAD = 32, GMAX = 6;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var num = el('span', { class: 'lf-num' });
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    function sigmoid(z) { return 1 / (1 + Math.exp(-z)); }
    function loss(gap, beta) { return -Math.log(sigmoid(beta * gap)); }
    function px(g) { return PAD + (g + GMAX) / (2 * GMAX) * (W - 2 * PAD); }
    var LMAX = loss(-GMAX, state.beta);
    function py(l, lmax) { return H - PAD - Math.min(l, lmax) / lmax * (H - 2 * PAD); }
    state._render = function () {
      var beta = state.beta;
      var lmax = Math.max(0.5, loss(-GMAX, beta));
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      svg.appendChild(svgEl('line', { x1: px(0), y1: PAD, x2: px(0), y2: H - PAD, stroke: 'var(--rule-soft,#eee)', 'stroke-width': '1', 'stroke-dasharray': '3 3' }));
      var d = '', i;
      for (i = 0; i <= 160; i++) { var g = -GMAX + 2 * GMAX * i / 160; d += (i ? 'L' : 'M') + px(g).toFixed(1) + ' ' + py(loss(g, beta), lmax).toFixed(1) + ' '; }
      svg.appendChild(svgEl('path', { d: d, fill: 'none', stroke: 'var(--blueprint,#3553ff)', 'stroke-width': '2' }));
      var l = loss(state.gap, beta);
      svg.appendChild(svgEl('circle', { cx: px(state.gap), cy: py(l, lmax), r: '5', fill: 'var(--blueprint,#3553ff)' }));
      num.innerHTML = l.toFixed(3) + ' <small>DPO 损失</small>';
      meta.textContent = state.gap > 0.5 ? '优选回答领先弃选回答：损失小，模型已经偏好正确回答'
        : state.gap < -0.5 ? '弃选回答领先优选回答：损失大，产生较强梯度来纠正'
          : '持平：损失 ≈ ' + loss(0, beta).toFixed(2) + '（−log ½，按 β 缩放）';
      formula.textContent = 'L = −log σ( β · ( (logπ(yc) − logπref(yc)) − (logπ(yr) − logπref(yr)) ) )   ·   β = ' + beta.toFixed(2);
    };
    var grid = el('div', { class: 'lf-grid' }, [
      slider(state, 'beta', 'β（KL 约束强度）', 0.05, 1.0, 0.05),
      slider(state, 'gap', '优选 − 弃选的差值', -GMAX, GMAX, 0.1)
    ]);
    host.appendChild(el('div', { class: 'lf' }, [
      el('div', { class: 'lf-head' }, [el('span', { class: 'lf-label' }, ['直接偏好优化（DPO）损失']), el('span', {}, ['拖动 β 和差值'])]),
      el('div', { class: 'lf-body' }, [grid, el('div', { class: 'lf-out' }, [svg, num, meta, formula])]),
      el('div', { class: 'lf-cap' }, ['直接偏好优化（Direct Preference Optimization，DPO）省去了独立的奖励模型：它直接训练策略，使优选回答（Chosen）的得分超过弃选回答（Rejected），两者都相对于冻结的参考模型衡量。损失是对 β 乘以该差值的结果求 −log σ。正差值（优选领先）使损失趋向零，负差值则产生较大梯度。β 控制隐式 KL 约束将策略拉回参考模型的强度。'])
    ]));
    state._render();
  }

  // ── paged-kv-cache: 固定页（Pages）与连续分配（Contiguous）的对比，展示碎片与浪费 ──
  function pagedKvCache(host) {
    var state = { seq: 70, page: 16 };
    var W = 520, H = 210, PAD = 18;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var num = el('span', { class: 'lf-num' });
    var bar = el('i');
    var barWrap = el('div', { class: 'lf-bar' }, [bar]);
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    var SLOTS = 128; // 连续预留必须按最大长度超额分配
    var MAXLEN = 128;
    state._render = function () {
      var seq = state.seq, page = state.page;
      var pages = Math.ceil(seq / page);
      var paged = pages * page;
      var pagedWaste = paged - seq;
      var contigWaste = MAXLEN - seq; // 连续分配预先保留完整的最大容量
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      var cols = 32, cw = (W - 2 * PAD) / cols, ch = 12;
      // 连续分配行：一次预留 MAXLEN，已用部分为蓝色，已预留但空置部分为灰色
      var rowY = 40, i;
      var ttop = svgEl('text', { x: PAD, y: (rowY - 8).toFixed(1), 'font-family': 'monospace', 'font-size': '10', fill: 'var(--ink-mute,#777)' });
      ttop.appendChild(document.createTextNode('连续分配：预先按最大长度预留空间'));
      svg.appendChild(ttop);
      for (i = 0; i < MAXLEN; i++) {
        var cx = PAD + (i % cols) * cw, cy = rowY + Math.floor(i / cols) * (ch + 2);
        svg.appendChild(svgEl('rect', { x: cx.toFixed(1), y: cy.toFixed(1), width: (cw - 2).toFixed(1), height: ch, rx: '1',
          fill: i < seq ? 'var(--blueprint,#3553ff)' : 'var(--rule-soft,#ccc)', opacity: i < seq ? '0.9' : '0.5' }));
      }
      // 分页行（Paged row）：按需分配页，只有最后一页存在部分浪费
      var rowY2 = rowY + 4 * (ch + 2) + 30;
      var tbot = svgEl('text', { x: PAD, y: (rowY2 - 8).toFixed(1), 'font-family': 'monospace', 'font-size': '10', fill: 'var(--ink-mute,#777)' });
      tbot.appendChild(document.createTextNode('分页：' + pages + ' 页，每页 ' + page + ' 格，仅末页有空余'));
      svg.appendChild(tbot);
      for (i = 0; i < paged; i++) {
        var px2 = PAD + (i % cols) * cw, py2 = rowY2 + Math.floor(i / cols) * (ch + 2);
        var usedCell = i < seq;
        svg.appendChild(svgEl('rect', { x: px2.toFixed(1), y: py2.toFixed(1), width: (cw - 2).toFixed(1), height: ch, rx: '1',
          fill: usedCell ? 'var(--blueprint,#3553ff)' : 'var(--warn,#b8870f)', opacity: usedCell ? '0.9' : '0.55' }));
        if (i % page === 0) {
          svg.appendChild(svgEl('line', { x1: px2.toFixed(1), y1: py2.toFixed(1), x2: px2.toFixed(1), y2: (py2 + ch).toFixed(1), stroke: 'var(--ink,#1a1a1a)', 'stroke-width': '1' }));
        }
      }
      var savedPct = Math.round((1 - paged / MAXLEN) * 100);
      num.innerHTML = pagedWaste + ' <small>格浪费（分页）</small>';
      bar.style.width = Math.max(2, Math.min(100, savedPct)) + '%';
      meta.textContent = '连续分配浪费 ' + contigWaste + ' 格预留空间 · 分页仅浪费 ' + pagedWaste
        + ' 格（末页）· 预留内存减少 ' + savedPct + '%';
      formula.textContent = 'pages = ⌈seq / page⌉ = ⌈' + seq + ' / ' + page + '⌉ = ' + pages
        + '  ·  每个序列的内部浪费 ≤ page − 1，而非 max − seq';
    };
    var grid = el('div', { class: 'lf-grid' }, [
      slider(state, 'seq', '序列长度', 1, MAXLEN, 1),
      slider(state, 'page', '页（块）大小', 4, 32, 4)
    ]);
    host.appendChild(el('div', { class: 'lf' }, [
      el('div', { class: 'lf-head' }, [el('span', { class: 'lf-label' }, ['分页键值缓存（Paged KV Cache）']), el('span', {}, ['拖动长度和页大小'])]),
      el('div', { class: 'lf-body' }, [grid, el('div', { class: 'lf-out' }, [svg, num, barWrap, meta, formula])]),
      el('div', { class: 'lf-cap' }, ['连续键值缓存（Contiguous KV Cache）预先为每个请求按最大序列长度预留空间，因此大部分空间处于空闲状态（灰色）。分页注意力（PagedAttention）用按需分配的固定大小页面存储缓存，只有最后一页可能有空余（橙色）。内部浪费从“最大长度减当前长度”降到最多一页，所以同一张 GPU 上的分页缓存可以容纳更多并发序列。'])
    ]));
    state._render();
  }

  // ── expert-capacity: 容量因子（Capacity factor）与词元的关系，比较丢弃与浪费的槽位 ──
  function expertCapacity(host) {
    var state = { cap: 1.25, tokens: 64 };
    var W = 520, H = 200, PAD = 24, E = 8;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var num = el('span', { class: 'lf-num' });
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    // 确定性偏斜路由（Skewed routing）：专家 e 获得固定比例的词元
    var SHARE = [0.22, 0.18, 0.15, 0.13, 0.11, 0.09, 0.07, 0.05];
    state._render = function () {
      var T = state.tokens, cap = state.cap;
      var perExpert = Math.floor(cap * T / E); // 每个专家的容量槽位
      var loads = SHARE.map(function (s) { return Math.round(s * T); });
      var sum = loads.reduce(function (a, b) { return a + b; }, 0);
      loads[0] += (T - sum); // 保持总数恰好为 T
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      var bw = (W - 2 * PAD) / E - 8, dropped = 0, wasted = 0, e;
      var maxBar = H - 2 * PAD;
      var capRef = Math.max(1, Math.max.apply(null, loads), perExpert);
      var capY = H - PAD - perExpert / capRef * maxBar;
      for (e = 0; e < E; e++) {
        var x = PAD + e * ((W - 2 * PAD) / E) + 4;
        var load = loads[e];
        var routed = Math.min(load, perExpert);
        var over = Math.max(0, load - perExpert);
        dropped += over; wasted += Math.max(0, perExpert - load);
        var hUsed = routed / capRef * maxBar;
        svg.appendChild(svgEl('rect', { x: x.toFixed(1), y: (H - PAD - hUsed).toFixed(1), width: bw.toFixed(1), height: hUsed.toFixed(1), fill: 'var(--blueprint,#3553ff)', opacity: '0.9' }));
        if (over > 0) {
          var hOver = over / capRef * maxBar;
          svg.appendChild(svgEl('rect', { x: x.toFixed(1), y: (H - PAD - hUsed - hOver).toFixed(1), width: bw.toFixed(1), height: hOver.toFixed(1), fill: 'var(--warn,#b8870f)', opacity: '0.7' }));
        }
      }
      svg.appendChild(svgEl('line', { x1: PAD, y1: capY.toFixed(1), x2: W - PAD, y2: capY.toFixed(1), stroke: 'var(--ink,#1a1a1a)', 'stroke-width': '1', 'stroke-dasharray': '4 3' }));
      num.innerHTML = dropped + ' <small>个词元被丢弃</small>';
      meta.textContent = '每个专家容量 ' + perExpert + ' · 丢弃 ' + dropped + ' 个词元（溢出，橙色）· 空闲 ' + wasted
        + ' 个槽位（浪费算力）· ' + (cap < 1 ? '容量过紧' : cap > 1.5 ? '容量过松' : '较为均衡');
      formula.textContent = 'capacity = ⌊capacity_factor · tokens / experts⌋ = ⌊' + cap.toFixed(2) + ' · ' + T + ' / ' + E + '⌋ = ' + perExpert;
    };
    var grid = el('div', { class: 'lf-grid' }, [
      slider(state, 'cap', '容量因子（Capacity Factor）', 0.5, 2.0, 0.05),
      slider(state, 'tokens', '批次词元数', 16, 128, 8)
    ]);
    host.appendChild(el('div', { class: 'lf' }, [
      el('div', { class: 'lf-head' }, [el('span', { class: 'lf-label' }, ['专家容量（Expert Capacity）']), el('span', {}, ['拖动容量和词元数'])]),
      el('div', { class: 'lf-body' }, [grid, el('div', { class: 'lf-out' }, [svg, num, meta, formula])]),
      el('div', { class: 'lf-cap' }, ['混合专家（Mixture of Experts，MoE）层中的每个专家都有固定数量的词元槽位，由容量因子（Capacity Factor）决定。路由分布不均，热门专家会溢出，多余词元被丢弃（虚线以上的橙色部分）。因子过低会丢弃大量词元，过高则让负载较轻的专家闲置，浪费填充计算。调整这一因子，就是要同时降低这两类开销。'])
    ]));
    state._render();
  }

  // ── sliding-window-attention: 宽度 w 的带状掩码（Banded mask）与完整 O(N^2) 对比 ──
  function slidingWindowAttention(host) {
    var state = { window: 4 };
    var W = 520, H = 240, PAD = 24, N = 16;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var num = el('span', { class: 'lf-num' });
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    var GRID = 200;
    state._render = function () {
      var w = state.window;
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      var ox = PAD, oy = (H - GRID) / 2, cell = GRID / N;
      var active = 0, full = 0, i, j;
      for (i = 0; i < N; i++) {
        for (j = 0; j < N; j++) {
          var causal = j <= i;
          if (causal) full++;
          var inWindow = causal && (i - j) < w;
          if (inWindow) active++;
          var fill;
          if (inWindow) fill = 'var(--blueprint,#3553ff)';
          else if (causal) fill = 'var(--rule-soft,#ccc)';
          else fill = 'var(--bg,#fafaf5)';
          svg.appendChild(svgEl('rect', { x: (ox + j * cell).toFixed(1), y: (oy + i * cell).toFixed(1),
            width: (cell - 1).toFixed(1), height: (cell - 1).toFixed(1),
            fill: fill, opacity: inWindow ? '0.9' : '0.5' }));
        }
      }
      svg.appendChild(svgEl('rect', { x: ox, y: oy.toFixed(1), width: GRID, height: GRID, fill: 'none', stroke: 'var(--ink-soft,#555)', 'stroke-width': '1' }));
      var saved = Math.round((1 - active / full) * 100);
      num.innerHTML = active + ' <small>/ ' + full + ' 个注意力配对</small>';
      meta.textContent = '窗口 w = ' + w + ' · 每个词元能看到前 ' + (w - 1) + ' 个词元及自身 · 配对数比完整因果注意力减少 '
        + saved + '%';
      formula.textContent = 'attend(i, j) 当且仅当 0 ≤ i − j < w   ·   w ≪ N 时，开销为 O(N·w)，完整注意力为 O(N²)';
    };
    var grid = el('div', {}, [slider(state, 'window', '窗口大小 w', 1, N, 1)]);
    host.appendChild(el('div', { class: 'lf' }, [
      el('div', { class: 'lf-head' }, [el('span', { class: 'lf-label' }, ['滑动窗口注意力（Sliding Window Attention）']), el('span', {}, ['拖动窗口宽度'])]),
      el('div', { class: 'lf-body' }, [grid, el('div', { class: 'lf-out' }, [svg, num, meta, formula])]),
      el('div', { class: 'lf-cap' }, ['行表示查询（Query），列表示键（Key）。蓝色格子是词元实际关注的配对；灰色格子位于因果三角区内，但被窗口排除；白色表示未来，始终被掩码（Mask）屏蔽。完整因果注意力（Causal Attention）填满整个下三角区域，开销为 O(N²)。宽度为 w 的滑动窗口只保留对角线附近的带状区域，将开销降为 O(N·w)，让长上下文保持可承受的成本。'])
    ]));
    state._render();
  }

  // ── differential-attention: 两个 softmax 图相减，λ 消除噪声 ──
  function differentialAttention(host) {
    var state = { lambda: 0.6 };
    var W = 520, H = 200, PAD = 30, N = 8;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var num = el('span', { class: 'lf-num' });
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    // map1：词元 2 处的真实信号峰加上宽广噪声；map2：相同的宽广噪声
    var sig = [0.04, 0.06, 0.55, 0.07, 0.05, 0.07, 0.06, 0.10];
    var noise = [0.10, 0.13, 0.11, 0.14, 0.12, 0.15, 0.13, 0.12];
    function norm(a) { var s = a.reduce(function (x, y) { return x + y; }, 0); return a.map(function (v) { return v / s; }); }
    state._render = function () {
      var lam = state.lambda;
      var m1 = norm(sig.map(function (v, i) { return v + noise[i]; }));
      var m2 = norm(noise.slice());
      var diff = m1.map(function (v, i) { return Math.max(0, v - lam * m2[i]); });
      var ds = diff.reduce(function (a, b) { return a + b; }, 0) || 1;
      var out = diff.map(function (v) { return v / ds; });
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      var cw = (W - 2 * PAD) / N;
      var i, peak = out[2];
      var maxV = Math.max.apply(null, out.concat(m1));
      for (i = 0; i < N; i++) {
        var x = PAD + i * cw;
        var h1 = m1[i] / maxV * 60;
        svg.appendChild(svgEl('rect', { x: (x + 2).toFixed(1), y: (90 - h1).toFixed(1), width: (cw / 2 - 3).toFixed(1), height: h1.toFixed(1), fill: 'var(--ink-mute,#999)', opacity: '0.6' }));
        var ho = out[i] / maxV * 60;
        svg.appendChild(svgEl('rect', { x: (x + cw / 2).toFixed(1), y: (170 - ho).toFixed(1), width: (cw / 2 - 3).toFixed(1), height: ho.toFixed(1), fill: 'var(--blueprint,#3553ff)' }));
      }
      var t1 = svgEl('text', { x: PAD, y: '24', 'font-family': 'monospace', 'font-size': '9.5', fill: 'var(--ink-mute,#777)' });
      t1.appendChild(document.createTextNode('注意力图 1（信号 + 噪声）'));
      svg.appendChild(t1);
      var t2 = svgEl('text', { x: PAD, y: '104', 'font-family': 'monospace', 'font-size': '9.5', fill: 'var(--blueprint,#3553ff)' });
      t2.appendChild(document.createTextNode('map1 − λ·map2（去噪后）'));
      svg.appendChild(t2);
      num.innerHTML = (peak * 100).toFixed(0) + ' <small>% 权重落在真实目标词元上</small>';
      meta.textContent = lam < 0.3 ? 'λ 较小：减去的量少，分散的噪声仍然保留'
        : lam > 0.9 ? 'λ 较大：抵消更强，信号更集中'
          : 'λ = ' + lam.toFixed(2) + '：共模噪声被抵消，真实峰值凸显';
      formula.textContent = 'Attn = softmax(Q₁K₁) − λ · softmax(Q₂K₂)   ·   共同噪声相减抵消，信号保留';
    };
    var grid = el('div', {}, [slider(state, 'lambda', 'λ（相减权重）', 0, 1.0, 0.05)]);
    host.appendChild(el('div', { class: 'lf' }, [
      el('div', { class: 'lf-head' }, [el('span', { class: 'lf-label' }, ['差分注意力（Differential Attention）']), el('span', {}, ['拖动 λ'])]),
      el('div', { class: 'lf-body' }, [grid, el('div', { class: 'lf-out' }, [svg, num, meta, formula])]),
      el('div', { class: 'lf-cap' }, ['差分注意力（Differential Attention）计算两张独立的 softmax 注意力图，再从第一张中减去乘以可学习系数 λ 的第二张。两张图携带相同的分散注意力噪声，相减会将其作为共模噪声（Common-mode Noise）抵消，而真实信号峰值（此处为词元 2）得以保留。增大 λ 会加强相减效果，使权重集中到相关词元，而非分散到无关上下文。'])
    ]));
    state._render();
  }

  // ── weight-tying: 复用嵌入矩阵（Embedding matrix）作为输出投影（Output projection） ──
  function weightTying(host) {
    var state = { logV: 15, dim: 768 };
    var W = 520, H = 190, PAD = 22;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var num = el('span', { class: 'lf-num' });
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    function human(x) { var u = ['', 'K', 'M', 'B']; var i = 0; while (x >= 1000 && i < u.length - 1) { x /= 1000; i++; } return x.toFixed(x < 10 ? 1 : 0) + u[i]; }
    function box(x, y, w, h, label, fill) {
      var g = svgEl('g', {});
      g.appendChild(svgEl('rect', { x: x, y: y, width: w, height: h, rx: '3', fill: fill, stroke: 'var(--ink-soft,#555)', 'stroke-width': '1.2' }));
      var t = svgEl('text', { x: (x + w / 2).toFixed(1), y: (y + h / 2 + 4).toFixed(1), 'text-anchor': 'middle', 'font-family': 'monospace', 'font-size': '10.5', fill: 'var(--ink,#1a1a1a)' });
      t.appendChild(document.createTextNode(label));
      g.appendChild(t);
      return g;
    }
    state._render = function () {
      var vocab = Math.pow(2, state.logV), d = state.dim;
      var saved = vocab * d;
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      svg.appendChild(box(PAD, 30, 150, 44, '输入嵌入', 'var(--blueprint,#3553ff)'));
      svg.appendChild(box(W - PAD - 150, 116, 150, 44, '输出投影', 'var(--blueprint,#3553ff)'));
      // 共享箭头：同一矩阵转置后复用
      svg.appendChild(svgEl('line', { x1: PAD + 75, y1: 74, x2: W - PAD - 75, y2: 116, stroke: 'var(--warn,#b8870f)', 'stroke-width': '2', 'stroke-dasharray': '5 3' }));
      var tt = svgEl('text', { x: (W / 2).toFixed(1), y: '100', 'text-anchor': 'middle', 'font-family': 'monospace', 'font-size': '10', fill: 'var(--warn,#b8870f)' });
      tt.appendChild(document.createTextNode('权重绑定：复用同一个 V×d 矩阵的转置'));
      svg.appendChild(tt);
      num.innerHTML = human(saved) + ' <small>个参数被节省</small>';
      meta.textContent = '词表 ' + human(vocab) + ' × 维度 ' + d + '：两个矩阵合为一个 · 输出读取复用嵌入矩阵';
      formula.textContent = 'logits = h · Eᵀ   ·   saved = vocab × d_model = ' + human(vocab) + ' × ' + d + ' = ' + human(saved);
    };
    var grid = el('div', { class: 'lf-grid' }, [
      slider(state, 'logV', '词表大小（2^x）', 10, 18, 1),
      slider(state, 'dim', '模型维度 d', 128, 4096, 128)
    ]);
    host.appendChild(el('div', { class: 'lf' }, [
      el('div', { class: 'lf-head' }, [el('span', { class: 'lf-label' }, ['权重绑定（Weight Tying）']), el('span', {}, ['拖动词表大小和维度'])]),
      el('div', { class: 'lf-body' }, [grid, el('div', { class: 'lf-out' }, [svg, num, meta, formula])]),
      el('div', { class: 'lf-cap' }, ['输入嵌入（Input Embedding）将每个词元 ID 映射到 d 维向量；输出投影（Output Projection）将隐藏向量映射回词表中每个条目的未归一化得分（Logit）。两者都是 vocab×d 矩阵，作用方向相反，因此很多模型会绑定这两组权重：输出层复用嵌入矩阵的转置。这省去了一整块 vocab×d_model 参数；词表包含数万个词元时，节省相当可观。'])
    ]));
    state._render();
  }

  LF.register({
    'rmsnorm-vs-layernorm': rmsnormVsLayernorm,
    'swiglu-ffn': swigluFfn,
    'rlhf-pipeline': rlhfPipeline,
    'dpo-loss': dpoLoss,
    'paged-kv-cache': pagedKvCache,
    'expert-capacity': expertCapacity,
    'sliding-window-attention': slidingWindowAttention,
    'differential-attention': differentialAttention,
    'weight-tying': weightTying
  });
})();
