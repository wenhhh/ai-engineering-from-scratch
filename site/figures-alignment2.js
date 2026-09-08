/* figures-alignment2.js — 阶段 18（伦理、安全、对齐（Alignment））和阶段 9（强化学习（Reinforcement learning））的交互课程图表。
   在 lesson-figures.js 之后加载，通过 window.LF 注册。无依赖，仅使用 ES5，
   主题由 CSS 变量控制。 */
(function () {
  'use strict';
  var LF = window.LF;
  if (!LF) { return; }
  var el = LF.el, svgEl = LF.svgEl, slider = LF.slider, select = LF.select;
  var clamp = LF.clamp, fmtInt = LF.fmtInt;

  function frame(host, label, hint, grid, outKids, caption) {
    host.appendChild(el('div', { class: 'lf' }, [
      el('div', { class: 'lf-head' }, [el('span', { class: 'lf-label' }, [label]), el('span', {}, [hint])]),
      el('div', { class: 'lf-body' }, [grid, el('div', { class: 'lf-out' }, outKids)]),
      el('div', { class: 'lf-cap' }, [caption])
    ]));
  }

  // ── ppo-clip: 裁剪代理目标（Clipped surrogate）使 [1-eps, 1+eps] 之外的更新变平 ──
  function ppoClip(host) {
    var W = 520, H = 230, PAD = 34;
    var state = { adv: 1, eps: 0.2 };
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var status = el('span', { class: 'lf-num' });
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    var RMIN = 0, RMAX = 2;
    function clipped(r, A, eps) {
      var lo = 1 - eps, hi = 1 + eps;
      var rc = r < lo ? lo : r > hi ? hi : r;
      return A >= 0 ? Math.min(r * A, rc * A) : Math.max(r * A, rc * A);
    }
    function px(r) { return PAD + (r - RMIN) / (RMAX - RMIN) * (W - 2 * PAD); }
    function py(v, span) { return H / 2 - v / span * (H / 2 - PAD); }
    state._render = function () {
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      var A = state.adv, eps = state.eps, span = Math.max(0.6, Math.abs(A) * (1 + eps));
      svg.appendChild(svgEl('line', { x1: PAD, y1: H / 2, x2: W - PAD, y2: H / 2, stroke: 'var(--rule-soft,#eee)', 'stroke-width': '1' }));
      var rx = px(1);
      svg.appendChild(svgEl('line', { x1: rx, y1: PAD, x2: rx, y2: H - PAD, stroke: 'var(--rule-soft,#eee)', 'stroke-width': '1', 'stroke-dasharray': '3 3' }));
      var lx = px(1 - eps), hx = px(1 + eps);
      svg.appendChild(svgEl('line', { x1: lx, y1: PAD, x2: lx, y2: H - PAD, stroke: 'var(--rule-soft,#ddd)', 'stroke-width': '1', 'stroke-dasharray': '4 3' }));
      svg.appendChild(svgEl('line', { x1: hx, y1: PAD, x2: hx, y2: H - PAD, stroke: 'var(--rule-soft,#ddd)', 'stroke-width': '1', 'stroke-dasharray': '4 3' }));
      var i, r, du = '', dc = '';
      for (i = 0; i <= 120; i++) { r = RMIN + (RMAX - RMIN) * i / 120; du += (i ? 'L' : 'M') + px(r).toFixed(1) + ' ' + py(r * A, span).toFixed(1) + ' '; }
      for (i = 0; i <= 120; i++) { r = RMIN + (RMAX - RMIN) * i / 120; dc += (i ? 'L' : 'M') + px(r).toFixed(1) + ' ' + py(clipped(r, A, eps), span).toFixed(1) + ' '; }
      svg.appendChild(svgEl('path', { d: du, fill: 'none', stroke: 'var(--ink-mute,#999)', 'stroke-width': '1.5', 'stroke-dasharray': '4 3' }));
      svg.appendChild(svgEl('path', { d: dc, fill: 'none', stroke: 'var(--blueprint,#3553ff)', 'stroke-width': '2.2' }));
      var rNow = 1 + eps + (A >= 0 ? 0.35 : -0.35);
      rNow = rNow < RMIN ? RMIN : rNow > RMAX ? RMAX : rNow;
      svg.appendChild(svgEl('circle', { cx: px(rNow), cy: py(clipped(rNow, A, eps), span), r: '5', fill: 'var(--blueprint,#3553ff)' }));
      var sign = A >= 0 ? '非负' : '负';
      status.innerHTML = '优势为' + sign;
      meta.textContent = '裁剪区间 [' + (1 - eps).toFixed(2) + ', ' + (1 + eps).toFixed(2) + ']  ·  ' + (A >= 0 ? '奖励好动作，但 r > 1+eps 后停止增加奖励' : '惩罚差动作，但 r < 1-eps 后停止加大惩罚');
      formula.textContent = 'L = min( r·A,  clip(r, 1-eps, 1+eps)·A )   ·   eps = ' + eps.toFixed(2) + ', A = ' + A.toFixed(1);
    };
    var grid = el('div', { class: 'lf-grid' }, [
      slider(state, 'adv', '优势（Advantage）A', -2, 2, 0.1),
      slider(state, 'eps', '裁剪阈值（Clip Epsilon）', 0.05, 0.4, 0.01)
    ]);
    frame(host, 'PPO 裁剪（PPO Clip）', '调整优势与裁剪阈值',
      grid, [svg, el('div', { style: 'margin-top:12px' }, [status]), meta, formula],
      '近端策略优化（Proximal Policy Optimization，PPO）将优势乘以新旧策略的概率比 r。灰线表示原始乘积 r·A，蓝线表示裁剪后的替代目标（Clipped Surrogate Objective）。当概率比沿有利方向越过 1-eps 到 1+eps 的区间时，裁剪使目标变平、梯度消失，避免一次更新让策略偏离采样数据时的策略太远。');
    state._render();
  }

  // ── reward-model: Bradley-Terry 偏好（Preference），被选回答的评分高于被拒回答 ──
  function rewardModel(host) {
    var state = { gap: 1.2 };
    var W = 520, H = 150, PAD = 30;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var num = el('span', { class: 'lf-num' });
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    function px(s) { return PAD + (s + 4) / 8 * (W - 2 * PAD); }
    state._render = function () {
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      var sChosen = state.gap / 2, sRejected = -state.gap / 2;
      var pPrefer = 1 / (1 + Math.exp(-(sChosen - sRejected)));
      var loss = -Math.log(Math.max(1e-6, pPrefer));
      svg.appendChild(svgEl('line', { x1: PAD, y1: H - PAD, x2: W - PAD, y2: H - PAD, stroke: 'var(--rule-soft,#eee)', 'stroke-width': '1' }));
      var rx = px(sRejected), cx = px(sChosen), y = H - PAD;
      svg.appendChild(svgEl('line', { x1: rx, y1: y, x2: rx, y2: PAD, stroke: 'var(--ink-mute,#999)', 'stroke-width': '8' }));
      svg.appendChild(svgEl('text', { x: rx, y: PAD - 6, 'text-anchor': 'middle', 'font-size': '10', fill: 'var(--ink-mute,#777)', 'font-family': 'monospace' }, [document.createTextNode('未选中 ' + sRejected.toFixed(2))]));
      svg.appendChild(svgEl('line', { x1: cx, y1: y, x2: cx, y2: PAD, stroke: 'var(--blueprint,#3553ff)', 'stroke-width': '8' }));
      svg.appendChild(svgEl('text', { x: cx, y: H - 10, 'text-anchor': 'middle', 'font-size': '10', fill: 'var(--blueprint,#3553ff)', 'font-family': 'monospace' }, [document.createTextNode('选中 ' + sChosen.toFixed(2))]));
      num.innerHTML = (pPrefer * 100).toFixed(1) + ' <small>% P(chosen ≻ rejected)</small>';
      meta.textContent = '分数差 ' + state.gap.toFixed(2) + '  ·  偏好损失 ' + loss.toFixed(3) + '  ·  ' + (state.gap < 0.4 ? '不确定：分数几乎持平' : state.gap > 2.5 ? '置信度高：选中回答的分数明显更高' : '正在学习偏好排序');
      formula.textContent = 'P(chosen ≻ rejected) = sigmoid( r(chosen) − r(rejected) )   ·   loss = −log P';
    };
    var grid = el('div', {}, [slider(state, 'gap', '分数差 r(chosen) − r(rejected)', 0, 4, 0.05)]);
    frame(host, '奖励模型（Reward Model）', '调整分数差',
      grid, [svg, el('div', { style: 'margin-top:10px' }, [num]), meta, formula],
      '奖励模型（Reward Model）把人类偏好转为标量分数（Scalar Score）。对于人工标注的一对回答，Bradley-Terry 目标训练模型，使被选中（chosen）的回答分数高于未选中（rejected）的回答。分数差越大，模型估计人类偏好选中回答的概率越高，偏好损失（Preference Loss）越小。');
    state._render();
  }

  // ── constitutional-ai: 依据原则标记并修订有害回答 ──
  function constitutionalAI(host) {
    var principles = [
      { name: '无害性（Harmlessness）', flags: '有害请求', sev: 0.9 },
      { name: '诚实（Honesty）', flags: '捏造的论断', sev: 0.5 },
      { name: '隐私（Privacy）', flags: '个人数据泄露', sev: 0.7 },
      { name: '不欺骗（Non-Deception）', flags: '操纵性表述', sev: 0.4 }
    ];
    var state = { which: 0 };
    var rows = el('div', {});
    var status = el('span', { class: 'lf-num' });
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    state._render = function () {
      var which = Number(state.which);
      while (rows.firstChild) rows.removeChild(rows.firstChild);
      var p = principles[which];
      principles.forEach(function (pr, i) {
        var on = i === which;
        var bar = el('i'); bar.style.width = (pr.sev * 100).toFixed(0) + '%';
        if (!on) bar.style.background = 'var(--rule-soft,#ccc)';
        var lab = el('label', {}, [pr.name, el('b', {}, [on ? '已触发' : '通过'])]);
        if (!on) lab.style.opacity = '0.5';
        rows.appendChild(el('div', { class: 'lf-ctrl' }, [lab, el('div', { class: 'lf-bar' }, [bar])]));
      });
      status.innerHTML = '修订：' + p.flags;
      meta.textContent = '原则“' + p.name + '”指出草稿违规，严重度 ' + p.sev.toFixed(2) + '  ·  模型先评议，再重写以符合原则';
      formula.textContent = '回答 → 对照原则评议 → 修订回答  ·  不使用人工标签，以原则集为训练信号';
    };
    var grid = el('div', {}, [select(state, 'which', '触发的原则',
      principles.map(function (pr, i) { return [pr.name, String(i)]; }))]);
    frame(host, '宪法式 AI（Constitutional AI）', '选择原则',
      grid, [rows, el('div', { style: 'margin-top:12px' }, [status]), meta, formula],
      '宪法式 AI（Constitutional AI）以书面原则集替代人工标注者。逐条原则检查回答草稿；所选原则指出违规后，模型对照该原则评议自己的回答，再进行修订。修订后的回答成为训练信号，从而依据规则学习无害性，无须为每个样本提供人工反馈。');
    state._render();
  }

  // ── actor-critic: 由时序差分误差（TD error）得到的优势（Advantage）A = Q - V 驱动更新 ──
  function actorCritic(host) {
    var W = 520, H = 200, PAD = 32;
    var state = { td: 0.6, value: 1.0 };
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var status = el('span', { class: 'lf-num' });
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    var SPAN = 4.5;
    function py(v) { return H / 2 - v / SPAN * (H / 2 - PAD); }
    state._render = function () {
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      var V = state.value, Q = V + state.td, A = Q - V;
      var baseX = PAD + 40, qX = W - PAD - 40;
      svg.appendChild(svgEl('line', { x1: PAD, y1: py(0), x2: W - PAD, y2: py(0), stroke: 'var(--rule-soft,#eee)', 'stroke-width': '1' }));
      // 评论家（Critic）的基线 V
      svg.appendChild(svgEl('line', { x1: PAD, y1: py(V), x2: W - PAD, y2: py(V), stroke: 'var(--ink-mute,#999)', 'stroke-width': '1.5', 'stroke-dasharray': '4 3' }));
      svg.appendChild(svgEl('text', { x: PAD + 4, y: py(V) - 6, 'font-size': '10', fill: 'var(--ink-mute,#777)', 'font-family': 'monospace' }, [document.createTextNode('V（评论家）= ' + V.toFixed(2))]));
      // 实际回报（Realized return）Q
      svg.appendChild(svgEl('circle', { cx: qX, cy: py(Q), r: '5', fill: 'var(--blueprint,#3553ff)' }));
      svg.appendChild(svgEl('text', { x: qX, y: py(Q) - 10, 'text-anchor': 'end', 'font-size': '10', fill: 'var(--blueprint,#3553ff)', 'font-family': 'monospace' }, [document.createTextNode('Q = V + delta = ' + Q.toFixed(2))]));
      // 从 V 到 Q 的优势条
      var col = A >= 0 ? 'var(--blueprint,#3553ff)' : 'var(--warn,#b8870f)';
      svg.appendChild(svgEl('line', { x1: qX, y1: py(V), x2: qX, y2: py(Q), stroke: col, 'stroke-width': '6' }));
      status.innerHTML = '优势 A = ' + A.toFixed(2);
      meta.textContent = '时序差分误差 delta = ' + state.td.toFixed(2) + '  ·  ' + (A > 0.05 ? '好于预期：提高演员选择该动作的倾向' : A < -0.05 ? '差于预期：降低演员选择该动作的倾向' : '符合预期：仅做小幅更新');
      formula.textContent = 'delta = r + gamma·V(s\') − V(s)   ·   A = Q − V = delta   ·   演员更新 ∝ A · grad log pi';
    };
    var grid = el('div', { class: 'lf-grid' }, [
      slider(state, 'td', '时序差分误差（TD Error）delta', -2, 2, 0.05),
      slider(state, 'value', '评论家基线（Critic Baseline）V', -1.5, 1.5, 0.05)
    ]);
    frame(host, '演员与评论家（Actor-Critic）', '调整时序差分误差',
      grid, [svg, el('div', { style: 'margin-top:10px' }, [status]), meta, formula],
      '评论家（Critic）估计状态价值 V，即灰色基线；演员（Actor）给出动作，该动作产生回报 Q，即蓝点。优势 A = Q - V 等于单步时序差分（Temporal Difference，TD）误差，用来衡量动作表现好于还是差于评论家的预期。正优势使演员更倾向于该动作，负优势降低这种倾向；评论家则使自己的基线向观测回报靠近。');
    state._render();
  }

  // ── interpretability-probe: 探针（Probe）准确率随层级上升 ──
  function interpretabilityProbe(host) {
    var W = 520, H = 210, PAD = 36, NL = 24;
    var state = { layer: 12, depth: 0.5 };
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var num = el('span', { class: 'lf-num' });
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    // 探针准确率：随层索引按逻辑斯蒂（Logistic）曲线上升，中点由深度决定
    function acc(layer) {
      var mid = NL * (0.2 + 0.6 * state.depth);
      var a = 0.5 + 0.48 / (1 + Math.exp(-(layer - mid) / 2.2));
      return a;
    }
    function px(l) { return PAD + l / (NL - 1) * (W - 2 * PAD); }
    function py(a) { return H - PAD - (a - 0.5) / 0.5 * (H - 2 * PAD); }
    state._render = function () {
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      svg.appendChild(svgEl('line', { x1: PAD, y1: py(0.5), x2: W - PAD, y2: py(0.5), stroke: 'var(--rule-soft,#eee)', 'stroke-width': '1' }));
      svg.appendChild(svgEl('text', { x: PAD - 4, y: py(0.5) + 3, 'text-anchor': 'end', 'font-size': '8', fill: 'var(--ink-mute,#777)', 'font-family': 'monospace' }, [document.createTextNode('随机')]));
      var d = '', l;
      for (l = 0; l < NL; l++) { d += (l ? 'L' : 'M') + px(l).toFixed(1) + ' ' + py(acc(l)).toFixed(1) + ' '; }
      svg.appendChild(svgEl('path', { d: d, fill: 'none', stroke: 'var(--blueprint,#3553ff)', 'stroke-width': '2' }));
      var L = state.layer, a = acc(L);
      svg.appendChild(svgEl('line', { x1: px(L), y1: PAD, x2: px(L), y2: H - PAD, stroke: 'var(--ink-mute,#999)', 'stroke-width': '1', 'stroke-dasharray': '3 3' }));
      svg.appendChild(svgEl('circle', { cx: px(L), cy: py(a), r: '5', fill: 'var(--blueprint,#3553ff)' }));
      num.innerHTML = (a * 100).toFixed(1) + ' <small>% 探针准确率</small>';
      meta.textContent = '当前层 ' + L + '，最深层索引 ' + (NL - 1) + '  ·  ' + (a < 0.62 ? '尚不能线性解码该概念' : a > 0.9 ? '该层清晰包含此概念' : '概念逐渐显现');
      formula.textContent = '在层激活值上训练线性分类器  ·  高准确率 ⇒ 能从该深度线性读出此概念';
    };
    var grid = el('div', { class: 'lf-grid' }, [
      slider(state, 'layer', '层索引（Layer Index）', 0, NL - 1, 1),
      slider(state, 'depth', '概念形成位置（浅层 ↔ 深层）', 0, 1, 0.05)
    ]);
    frame(host, '可解释性探针（Interpretability Probe）', '调整层索引',
      grid, [svg, el('div', { style: 'margin-top:10px' }, [num]), meta, formula],
      '线性探针（Linear Probe）是一个简单分类器，通过训练从某层激活值中读出概念。探针准确率接近随机水平，意味着无法在该层线性解码此概念；准确率高则意味着可以。将探针逐层深入网络，可以观察概念何时变得可线性读出；可解释性（Interpretability）研究者据此定位欺骗意图等特征最早出现的位置。');
    state._render();
  }

  // ── sae-features: 将稠密激活（Dense activation）分解为稀疏特征（Sparse features） ──
  function saeFeatures(host) {
    var state = { l1: 1.0 };
    var feats = [0.95, 0.82, 0.74, 0.61, 0.52, 0.44, 0.36, 0.29, 0.21, 0.14, 0.09, 0.05];
    var rows = el('div', {});
    var num = el('span', { class: 'lf-num' });
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    state._render = function () {
      while (rows.firstChild) rows.removeChild(rows.firstChild);
      var thr = state.l1 * 0.18; // 更高 L1 -> 更高激活阈值（Activation threshold）-> 保留下来的特征更少
      var active = 0, recon = 0, total = 0;
      feats.forEach(function (f) { total += f; });
      feats.forEach(function (f, i) {
        var on = f >= thr;
        var val = on ? f : 0;
        if (on) { active++; recon += f; }
        var bar = el('i'); bar.style.width = (val / 0.95 * 100).toFixed(0) + '%';
        if (!on) bar.style.background = 'var(--rule-soft,#ccc)';
        var lab = el('label', {}, ['f' + (i + 1) + (on ? '' : ' ·'), el('b', {}, [on ? val.toFixed(2) : '未激活'])]);
        if (!on) lab.style.opacity = '0.4';
        rows.appendChild(el('div', { class: 'lf-ctrl' }, [lab, el('div', { class: 'lf-bar' }, [bar])]));
      });
      var reconPct = recon / total * 100;
      num.innerHTML = active + ' <small>/ ' + feats.length + ' 个特征已激活</small>';
      meta.textContent = '重建稠密向量的 ' + reconPct.toFixed(0) + '%  ·  ' + (state.l1 < 0.5 ? 'L1 较低：特征稠密且具有多义性' : state.l1 > 1.8 ? 'L1 较高：极度稀疏，可能丢失信号' : '稀疏且具有单义性');
      formula.textContent = '最小化 ‖x − decode(f)‖² + lambda·‖f‖₁   ·   lambda = ' + state.l1.toFixed(2) + '   ·   lambda 越大，激活特征越少';
    };
    var grid = el('div', {}, [slider(state, 'l1', '稀疏系数（Sparsity Coefficient）lambda（L1）', 0.1, 2.5, 0.05)]);
    frame(host, '稀疏自编码器（Sparse Autoencoder）', '调整 L1 系数',
      grid, [rows, el('div', { style: 'margin-top:12px' }, [num]), meta, formula],
      '稀疏自编码器（Sparse Autoencoder，SAE）将稠密激活分解为数量更多的特征，其中大多数保持未激活。特征激活值上的 L1 惩罚项（L1 Penalty）决定编码的稀疏程度。惩罚太弱，特征仍稠密且具有多义性（Polysemanticity）；太强则只剩少数特征承载信息，重建质量下降。适中的系数得到少量激活、具有单义性（Monosemanticity）的特征，每个对应一个人类可理解的概念。');
    state._render();
  }

  // ── jailbreak-defense: 攻击成功率下降，但过度拒绝（Over-refusal）增加 ──
  function jailbreakDefense(host) {
    var W = 520, H = 210, PAD = 36;
    var state = { strength: 0.5 };
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var status = el('span', { class: 'lf-num' });
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    // 防御增强使攻击成功率下降；对无害提示词（Prompts）的过度拒绝率上升
    function asr(s) { return 0.85 * Math.exp(-2.6 * s); }
    function refuse(s) { return 0.02 + 0.6 * Math.pow(s, 2.2); }
    function px(s) { return PAD + s * (W - 2 * PAD); }
    function py(v) { return H - PAD - clamp(v, 0, 1) * (H - 2 * PAD); }
    state._render = function () {
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      svg.appendChild(svgEl('line', { x1: PAD, y1: H - PAD, x2: W - PAD, y2: H - PAD, stroke: 'var(--rule-soft,#eee)', 'stroke-width': '1' }));
      function curve(fn, st) { var d = '', i, s; for (i = 0; i <= 100; i++) { s = i / 100; d += (i ? 'L' : 'M') + px(s).toFixed(1) + ' ' + py(fn(s)).toFixed(1) + ' '; } svg.appendChild(svgEl('path', { d: d, fill: 'none', stroke: st, 'stroke-width': '2' })); }
      curve(asr, 'var(--warn,#b8870f)');
      curve(refuse, 'var(--blueprint,#3553ff)');
      var s = state.strength, a = asr(s), r = refuse(s);
      var mx = px(s);
      svg.appendChild(svgEl('line', { x1: mx, y1: PAD, x2: mx, y2: H - PAD, stroke: 'var(--ink-mute,#999)', 'stroke-width': '1', 'stroke-dasharray': '3 3' }));
      svg.appendChild(svgEl('circle', { cx: mx, cy: py(a), r: '4.5', fill: 'var(--warn,#b8870f)' }));
      svg.appendChild(svgEl('circle', { cx: mx, cy: py(r), r: '4.5', fill: 'var(--blueprint,#3553ff)' }));
      status.innerHTML = '攻击成功率 ' + (a * 100).toFixed(0) + '%';
      meta.textContent = '琥珀色：越狱成功率 ' + (a * 100).toFixed(0) + '%  ·  蓝色：无害提示词误拒率 ' + (r * 100).toFixed(0) + '%  ·  ' + (s < 0.3 ? '过于宽松' : s > 0.8 ? '过于严格' : '较为平衡');
      formula.textContent = '过滤越强 ⇒ 攻击成功率越低，误拒率越高  ·  在两条曲线的拐点附近调节';
    };
    var grid = el('div', {}, [slider(state, 'strength', '防御强度（Defense Strength）', 0, 1, 0.02)]);
    frame(host, '越狱防御（Jailbreak Defense）', '调整防御强度',
      grid, [svg, el('div', { style: 'margin-top:10px' }, [status]), meta, formula],
      '拦截对抗性提示词（Adversarial Prompt）的安全过滤器，也可能拒绝无害请求。提高防御强度时，琥珀色的攻击成功率曲线下降，但无害请求也被拦截，使蓝色的过度拒绝（Over-Refusal）曲线上升。这需要权衡：通常在拐点附近选择工作点，以阻止多数越狱（Jailbreak），又不误拒过多合法用户。');
    state._render();
  }

  // ── scalable-oversight: 较弱评判者（Judge）通过辩论监督较强智能体 ──
  function scalableOversight(host) {
    var W = 520, H = 210, PAD = 36;
    var state = { difficulty: 0.5, mode: 'debate' };
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var status = el('span', { class: 'lf-num' });
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    // 无辅助的弱评判者准确率随难度快速下降；监督协议（Oversight protocols）下的下降更慢
    function direct(x) { return 0.5 + 0.45 * Math.exp(-3.2 * x); }
    function debate(x) { return 0.5 + 0.45 * Math.exp(-1.3 * x); }
    function recurse(x) { return 0.5 + 0.45 * Math.exp(-1.0 * x); }
    function aided(x) { return state.mode === 'recursion' ? recurse(x) : debate(x); }
    function px(x) { return PAD + x * (W - 2 * PAD); }
    function py(v) { return H - PAD - (v - 0.5) / 0.5 * (H - 2 * PAD); }
    state._render = function () {
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      svg.appendChild(svgEl('line', { x1: PAD, y1: py(0.5), x2: W - PAD, y2: py(0.5), stroke: 'var(--rule-soft,#eee)', 'stroke-width': '1' }));
      svg.appendChild(svgEl('text', { x: PAD - 4, y: py(0.5) + 3, 'text-anchor': 'end', 'font-size': '8', fill: 'var(--ink-mute,#777)', 'font-family': 'monospace' }, [document.createTextNode('随机')]));
      function curve(fn, st, dash) { var d = '', i, x; for (i = 0; i <= 100; i++) { x = i / 100; d += (i ? 'L' : 'M') + px(x).toFixed(1) + ' ' + py(fn(x)).toFixed(1) + ' '; } var a = { d: d, fill: 'none', stroke: st, 'stroke-width': '2' }; if (dash) a['stroke-dasharray'] = '4 3'; svg.appendChild(svgEl('path', a)); }
      curve(direct, 'var(--ink-mute,#999)', true);
      curve(aided, 'var(--blueprint,#3553ff)', false);
      var x = state.difficulty, vu = direct(x), va = aided(x), mx = px(x);
      svg.appendChild(svgEl('line', { x1: mx, y1: PAD, x2: mx, y2: H - PAD, stroke: 'var(--ink-mute,#999)', 'stroke-width': '1', 'stroke-dasharray': '3 3' }));
      svg.appendChild(svgEl('circle', { cx: mx, cy: py(vu), r: '4', fill: 'var(--ink-mute,#999)' }));
      svg.appendChild(svgEl('circle', { cx: mx, cy: py(va), r: '5', fill: 'var(--blueprint,#3553ff)' }));
      status.innerHTML = '监督准确率 ' + (va * 100).toFixed(0) + '%';
      meta.textContent = '灰色：评判者独立判断 ' + (vu * 100).toFixed(0) + '%  ·  蓝色：评判者配合' + (state.mode === 'debate' ? '辩论' : '递归分解') + ' ' + (va * 100).toFixed(0) + '%  ·  提升 ' + ((va - vu) * 100).toFixed(0) + ' 个百分点';
      formula.textContent = state.mode === 'debate'
        ? '两个强智能体辩论，弱评判者选择论据更充分的回答'
        : '任务拆为可检查的子任务，弱评判者逐项核验';
    };
    var grid = el('div', { class: 'lf-grid' }, [
      slider(state, 'difficulty', '任务难度（Task Difficulty）', 0, 1, 0.02),
      select(state, 'mode', '监督协议（Oversight Protocol）', [['辩论（Debate）', 'debate'], ['递归分解（Recursion）', 'recursion']])
    ]);
    frame(host, '可扩展监督（Scalable Oversight）', '调整任务难度',
      grid, [svg, el('div', { style: 'margin-top:10px' }, [status]), meta, formula],
      '弱评判者（Weak Judge）无法直接检查强智能体在困难任务上的表现：难度上升时，灰色曲线降向随机水平。监督协议帮助评判者跟上能力差距。辩论（Debate）让两个强智能体交锋，由评判者选择论据更充分的一方；递归分解（Recursion）将任务拆成评判者可核验的部分。两种方式的蓝色曲线都下降得更慢，因此即使任务超出评判者独立解决的能力，其判断准确率仍高于随机水平。');
    state._render();
  }

  LF.register({
    'ppo-clip': ppoClip,
    'reward-model': rewardModel,
    'constitutional-ai': constitutionalAI,
    'actor-critic': actorCritic,
    'interpretability-probe': interpretabilityProbe,
    'sae-features': saeFeatures,
    'jailbreak-defense': jailbreakDefense,
    'scalable-oversight': scalableOversight
  });
})();
