/* figures-llms-systems.js：阶段 10（从零构建大语言模型（LLMs from scratch））、
   阶段 12（多模态（Multimodal））与阶段 13（工具与协议（Tools & protocols））的交互课程图表。在
   lesson-figures.js 之后加载，通过 window.LF.register 注册。原生 ES5，
   无依赖，主题由 CSS 变量控制。编写时仍使用相同的围栏块：
       ```figure
       beam-search
       ```  */
(function () {
  'use strict';
  var LF = window.LF;
  if (!LF) { return; }
  var el = LF.el, svgEl = LF.svgEl, slider = LF.slider;

  // ── beam-search: 每一步保留累积对数概率（Cumulative-logprob）最高的 B 条序列 ──
  function beamSearch(host) {
    var state = { B: 3, steps: 4 };
    var W = 520, H = 240, PAD = 26;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    // 任意节点的候选子节点在各步都有确定性的对数概率（Log-probs）
    var STEP_LP = [-0.22, -0.51, -0.92, -1.39, -1.90];
    function px(s) { return PAD + s / state.steps * (W - 2 * PAD); }
    function py(rank, rows) { return PAD + (rank + 0.5) / rows * (H - 2 * PAD); }
    state._render = function () {
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      var B = state.B, rows = B;
      // 每条存活束（Beam）具有累积对数概率；根节点是一条值为 0 的束
      var beams = [{ lp: 0, y: py(0, 1), x: px(0) }];
      var s, kept = 1;
      for (s = 1; s <= state.steps; s++) {
        var cands = [];
        beams.forEach(function (b) {
          for (var c = 0; c < B; c++) { cands.push({ lp: b.lp + STEP_LP[c], from: b }); }
        });
        cands.sort(function (a, z) { return z.lp - a.lp; });
        var survivors = cands.slice(0, B);
        survivors.forEach(function (c, r) {
          c.x = px(s); c.y = py(r, B);
          svg.appendChild(svgEl('line', { x1: c.from.x, y1: c.from.y, x2: c.x, y2: c.y,
            stroke: 'var(--blueprint,#3553ff)', 'stroke-width': '1.4', opacity: '0.55' }));
        });
        // 被丢弃的候选逐渐淡出
        cands.slice(B).forEach(function (c, r) {
          var dy = py(B + r, B + cands.length - B);
          svg.appendChild(svgEl('line', { x1: c.from.x, y1: c.from.y, x2: px(s), y2: dy,
            stroke: 'var(--rule-soft,#ccc)', 'stroke-width': '1', 'stroke-dasharray': '3 3', opacity: '0.5' }));
        });
        beams = survivors; kept = survivors.length;
      }
      // 将保留的节点绘制在上层
      beams.forEach(function (b) {
        svg.appendChild(svgEl('circle', { cx: b.x, cy: b.y, r: '4', fill: 'var(--blueprint,#3553ff)' }));
      });
      svg.appendChild(svgEl('circle', { cx: px(0), cy: py(0, 1), r: '5', fill: 'var(--ink,#1a1a1a)' }));
      var best = beams[0].lp;
      meta.textContent = (B === 1 ? 'B = 1 即贪心解码' : '每步保留 B = ' + B + ' 条候选序列')
        + ' · 最优序列的对数概率 ' + best.toFixed(2);
      formula.textContent = '每条候选扩展出 B 个后继，按 Σ log p 评分，保留前 ' + B + ' 条 · 共 ' + state.steps + ' 步';
    };
    var grid = el('div', { class: 'lf-grid' }, [
      slider(state, 'B', '束宽（Beam Width）B', 1, 5, 1),
      slider(state, 'steps', '解码步数', 1, 5, 1)
    ]);
    host.appendChild(el('div', { class: 'lf' }, [
      el('div', { class: 'lf-head' }, [el('span', { class: 'lf-label' }, ['束搜索（Beam Search）']), el('span', {}, ['拖动束宽'])]),
      el('div', { class: 'lf-body' }, [grid, el('div', { class: 'lf-out' }, [svg, meta, formula])]),
      el('div', { class: 'lf-cap' }, ['每一步都将当前保留的每条候选序列扩展为 B 条续写，按累积对数概率（Cumulative Log-probability）评分，只留下最优的 B 条。贪心解码（Greedy Decoding）是 B 等于 1 的特例：只有一条路径，不回溯。束宽越大，探索越多，计算开销也按比例增长。'])
    ]));
    state._render();
  }

  // ── speculative-decoding: 草稿长度（Draft length）、接受率（Acceptance rate）与产生的加速比（Speedup） ──
  function speculativeDecoding(host) {
    var state = { gamma: 4, accept: 0.7 };
    var rows = el('div', {});
    var num = el('span', { class: 'lf-num' });
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    state._render = function () {
      var g = state.gamma, a = state.accept;
      // 首次拒绝前预期接受的前缀长度，最多为 g（验证器（Verifier）仍
      // 发出一个修正词元）；若全部 g 个通过，再加上额外词元（Bonus token）
      var expAcc = 0, prob = 1, i;
      for (i = 1; i <= g; i++) { expAcc += prob * a; prob *= a; }
      var allPass = Math.pow(a, g);
      // 每次验证生成的词元数：已接受的连续段 + 1（修正或额外词元）
      var tokensPerPass = expAcc + 1;
      // 一次验证替代 tokensPerPass 个顺序执行的目标模型步骤
      var speedup = tokensPerPass;
      while (rows.firstChild) rows.removeChild(rows.firstChild);
      // 可视化的一行 g 个草稿词元：到 floor(expAcc) 为止是已接受词元（蓝色），随后是一个验证词元
      var acceptedShown = Math.min(g, Math.round(expAcc));
      var strip = el('div', { class: 'lf-grid' });
      for (i = 0; i < g; i++) {
        var on = i < acceptedShown;
        var b = el('i'); b.style.width = '100%';
        if (!on) b.style.background = 'var(--rule-soft,#ccc)';
        var lab = el('label', {}, ['草稿 ' + (i + 1), el('b', {}, [on ? '接受' : '拒绝'])]);
        if (!on) lab.style.opacity = '0.45';
        strip.appendChild(el('div', { class: 'lf-ctrl' }, [lab, el('div', { class: 'lf-bar' }, [b])]));
      }
      rows.appendChild(strip);
      num.innerHTML = speedup.toFixed(2) + ' <small>个词元 / 每次验证</small>';
      meta.textContent = g + ' 个草稿词元中，预计接受 ' + expAcc.toFixed(2) + ' 个 · 全部 ' + g
        + ' 个通过的概率为 ' + (allPass * 100).toFixed(0) + '% · 每次目标模型还额外生成 1 个词元';
      formula.textContent = '草稿长度 γ = ' + g + ' 个词元，目标模型一次验证，接受率 α = ' + a.toFixed(2)
        + ' → 每次目标模型调用约生成 ' + speedup.toFixed(2) + ' 个词元';
    };
    var grid = el('div', { class: 'lf-grid' }, [
      slider(state, 'gamma', '草稿长度 γ', 1, 8, 1),
      slider(state, 'accept', '接受率（Acceptance Rate）α', 0.1, 0.99, 0.01)
    ]);
    host.appendChild(el('div', { class: 'lf' }, [
      el('div', { class: 'lf-head' }, [el('span', { class: 'lf-label' }, ['推测解码（Speculative Decoding）']), el('span', {}, ['拖动草稿长度与接受率'])]),
      el('div', { class: 'lf-body' }, [grid, el('div', { class: 'lf-out' }, [rows, num, meta, formula])]),
      el('div', { class: 'lf-cap' }, ['小型草稿模型（Draft Model）以低成本提出 γ 个词元；大型目标模型（Target Model）用一次并行计算验证全部词元，接受最长的正确前缀，再自行生成一个额外词元。两者的一致率越高，被接受的连续词元越多，一次验证替代的目标模型调用也越多。'])
    ]));
    state._render();
  }

  // ── moe-routing: 词元路由到 top-k 专家（Experts），比较活跃与总参数量及负载均衡 ──
  function moeRouting(host) {
    var state = { experts: 8, topk: 2 };
    var W = 520, H = 200, PAD = 24;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var num = el('span', { class: 'lf-num' });
    var bar = el('i');
    var barWrap = el('div', { class: 'lf-bar' }, [bar]);
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    var TOKENS = 6;
    // 确定性路由：词元 t 优先选择从 (t*3) mod E 开始的专家
    function routeOf(t, E, k) {
      var picks = [], j;
      for (j = 0; j < k; j++) { picks.push((t * 3 + j) % E); }
      return picks;
    }
    state._render = function () {
      var E = state.experts, k = Math.min(state.topk, E);
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      var tokX = PAD, expX = W - PAD - 8;
      var load = [], e;
      for (e = 0; e < E; e++) { load.push(0); }
      var t;
      for (t = 0; t < TOKENS; t++) {
        var ty = PAD + (t + 0.5) / TOKENS * (H - 2 * PAD);
        svg.appendChild(svgEl('circle', { cx: tokX, cy: ty, r: '4', fill: 'var(--ink,#1a1a1a)' }));
        var picks = routeOf(t, E, k);
        picks.forEach(function (pe) {
          load[pe]++;
          var ey = PAD + (pe + 0.5) / E * (H - 2 * PAD);
          svg.appendChild(svgEl('line', { x1: tokX + 4, y1: ty, x2: expX, y2: ey,
            stroke: 'var(--blueprint,#3553ff)', 'stroke-width': '1', opacity: '0.5' }));
        });
      }
      for (e = 0; e < E; e++) {
        var ey = PAD + (e + 0.5) / E * (H - 2 * PAD);
        var busy = load[e] > 0;
        svg.appendChild(svgEl('rect', { x: expX, y: ey - 5, width: '8', height: '10',
          fill: busy ? 'var(--blueprint,#3553ff)' : 'var(--rule-soft,#ccc)' }));
      }
      var activeFrac = k / E;
      num.innerHTML = (activeFrac * 100).toFixed(0) + ' <small>% 专家参数被激活</small>';
      bar.style.width = (activeFrac * 100).toFixed(0) + '%';
      // 负载均衡（Load balance）：每个专家的理想值为 TOKENS*k/E；报告 max/avg 不均衡程度
      var avg = TOKENS * k / E;
      var mx = Math.max.apply(null, load);
      var imbal = avg > 0 ? mx / avg : 1;
      barWrap.classList.toggle('over', imbal > 1.6);
      meta.textContent = '每个词元路由到 ' + E + ' 个专家中的前 ' + k + ' 个 · 负载不均衡度（最大值/平均值）' + imbal.toFixed(2)
        + (imbal > 1.6 ? ' · 需要负载均衡损失' : ' · 负载较为均衡');
      formula.textContent = '激活比例 = k / E = ' + k + ' / ' + E + ' = ' + (activeFrac * 100).toFixed(0)
        + '% · 总参数量不变，计算量随 k 增长';
    };
    var grid = el('div', { class: 'lf-grid' }, [
      slider(state, 'experts', '专家数 E', 2, 12, 1),
      slider(state, 'topk', '路由到前 k 个（Top-k）', 1, 4, 1)
    ]);
    host.appendChild(el('div', { class: 'lf' }, [
      el('div', { class: 'lf-head' }, [el('span', { class: 'lf-label' }, ['混合专家（Mixture of Experts，MoE）']), el('span', {}, ['拖动专家数与 k'])]),
      el('div', { class: 'lf-body' }, [grid, el('div', { class: 'lf-out' }, [svg, num, barWrap, meta, formula])]),
      el('div', { class: 'lf-cap' }, ['路由器（Router）将每个词元发送给 E 个专家中得分最高的 k 个。每个词元只运行 k 个专家模块，因此激活计算的比例为 k/E，尽管所有参数仍常驻内存。路由不均会使少数专家过载，所以 MoE 训练需要加入负载均衡损失（Load-balancing Loss）。'])
    ]));
    state._render();
  }

  // ── context-window-slide: 超出固定窗口（Window）的词元被丢弃 ──
  function contextWindowSlide(host) {
    var state = { seq: 14, window: 8 };
    var W = 520, H = 130, PAD = 20;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var num = el('span', { class: 'lf-num' });
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    var MAX = 24;
    state._render = function () {
      var n = state.seq, win = state.window;
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      var firstKept = Math.max(0, n - win);
      var cw = (W - 2 * PAD) / MAX;
      var bw = cw * 0.82, gap = cw * 0.18;
      var y = PAD + 18;
      var i;
      for (i = 0; i < n; i++) {
        var x = PAD + i * cw + gap / 2;
        var inWin = i >= firstKept;
        svg.appendChild(svgEl('rect', { x: x.toFixed(1), y: y, width: bw.toFixed(1), height: '28', rx: '2',
          fill: inWin ? 'var(--blueprint,#3553ff)' : 'var(--rule-soft,#ccc)',
          opacity: inWin ? '1' : '0.6' }));
      }
      // 窗口括号
      var wx0 = PAD + firstKept * cw, wx1 = PAD + n * cw;
      svg.appendChild(svgEl('rect', { x: wx0.toFixed(1), y: (y - 8).toFixed(1),
        width: (wx1 - wx0).toFixed(1), height: '44', fill: 'none',
        stroke: 'var(--warn,#b8870f)', 'stroke-width': '1.5' }));
      var dropped = Math.max(0, n - win);
      num.innerHTML = dropped + ' <small>个词元被丢弃</small>';
      meta.textContent = '序列 ' + n + ' 个词元 · 窗口 ' + win + ' · '
        + (dropped > 0 ? '最早的 ' + dropped + ' 个词元已移出滚动上下文' : '仍能容纳全部词元');
      formula.textContent = '注意力只能看到最后 ' + win + ' 个位置；索引 '
        + firstKept + ' 之前的词元不再参与注意力计算';
    };
    var grid = el('div', { class: 'lf-grid' }, [
      slider(state, 'seq', '序列长度', 1, MAX, 1),
      slider(state, 'window', '上下文窗口', 1, 16, 1)
    ]);
    host.appendChild(el('div', { class: 'lf' }, [
      el('div', { class: 'lf-head' }, [el('span', { class: 'lf-label' }, ['上下文窗口（Context Window）']), el('span', {}, ['拖动长度，观察超出窗口的部分'])]),
      el('div', { class: 'lf-body' }, [grid, el('div', { class: 'lf-out' }, [svg, num, meta, formula])]),
      el('div', { class: 'lf-cap' }, ['模型只能在固定窗口内分配注意力。序列长度超过窗口后，最早的词元会滑出橙色框，不再对注意力可见。这就是滚动上下文（Rolling Context）：保留最近词元，早期词元则被遗忘，除非先做摘要或重新检索进来。'])
    ]));
    state._render();
  }

  // ── perplexity-loss: perplexity = e^loss，在 V 个选项上随机预测时为 V ──
  function perplexityLoss(host) {
    var state = { loss: 2.0, logV: 4.7 };
    var W = 520, H = 200, PAD = 32, LMAX = 7;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var num = el('span', { class: 'lf-num' });
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    function human(x) { var u = ['', 'K', 'M']; var i = 0; while (x >= 1000 && i < u.length - 1) { x /= 1000; i++; } return x.toFixed(x < 10 ? 1 : 0) + u[i]; }
    function px(l) { return PAD + l / LMAX * (W - 2 * PAD); }
    var PPMAX = Math.exp(LMAX);
    function py(pp) { return H - PAD - Math.log(pp) / Math.log(PPMAX) * (H - 2 * PAD); }
    state._render = function () {
      var loss = state.loss, V = Math.pow(10, state.logV);
      var pp = Math.exp(loss);
      var randomLoss = Math.log(V);
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      var d = '', i;
      for (i = 0; i <= 120; i++) { var l = LMAX * i / 120; d += (i ? 'L' : 'M') + px(l).toFixed(1) + ' ' + py(Math.exp(l)).toFixed(1) + ' '; }
      svg.appendChild(svgEl('path', { d: d, fill: 'none', stroke: 'var(--blueprint,#3553ff)', 'stroke-width': '2' }));
      // 随机基线（Random baseline）：loss = ln V 处的竖线
      var rx = px(Math.min(LMAX, randomLoss));
      svg.appendChild(svgEl('line', { x1: rx, y1: PAD, x2: rx, y2: H - PAD,
        stroke: 'var(--warn,#b8870f)', 'stroke-width': '1.5', 'stroke-dasharray': '4 3' }));
      svg.appendChild(svgEl('circle', { cx: px(Math.min(LMAX, loss)), cy: py(pp), r: '5', fill: 'var(--blueprint,#3553ff)' }));
      num.innerHTML = (pp < 1000 ? pp.toFixed(pp < 10 ? 2 : 0) : human(pp)) + ' <small>困惑度</small>';
      meta.textContent = '交叉熵 ' + loss.toFixed(2) + ' 纳特（nat）· 在 V = ' + human(V)
        + ' 个词元上均匀随机猜测，损失 ln V = ' + randomLoss.toFixed(2) + '，困惑度为 ' + human(V);
      formula.textContent = 'perplexity = e^loss · 在 V 个词元上均匀猜测，损失为 ln V，困惑度恰好为 V';
    };
    var grid = el('div', { class: 'lf-grid' }, [
      slider(state, 'loss', '交叉熵损失（nat）', 0.1, 7.0, 0.05),
      slider(state, 'logV', '词表大小 V（10^x）', 2, 5.5, 0.1)
    ]);
    host.appendChild(el('div', { class: 'lf' }, [
      el('div', { class: 'lf-head' }, [el('span', { class: 'lf-label' }, ['困惑度（Perplexity）']), el('span', {}, ['拖动损失'])]),
      el('div', { class: 'lf-body' }, [grid, el('div', { class: 'lf-out' }, [svg, num, meta, formula])]),
      el('div', { class: 'lf-cap' }, ['困惑度是交叉熵损失（Cross-entropy Loss）的指数，可理解为模型预测每个词元时，需要在多少个等概率选项之间作出选择。在大小为 V 的词表上均匀猜测，困惑度恰好为 V（橙线），因此有用的模型应明显低于这条基线。'])
    ]));
    state._render();
  }

  // ── continuous-batching: GPU 槽位（Slots）的静态与连续填充对比 ──
  function continuousBatching(host) {
    var state = { mode: 'continuous', slots: 4 };
    var W = 520, H = 200, PAD = 26;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var num = el('span', { class: 'lf-num' });
    var bar = el('i');
    var barWrap = el('div', { class: 'lf-bar' }, [bar]);
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    // 到达各槽位的请求长度（以步骤计），确定性生成
    var LENS = [3, 7, 2, 9, 4, 6, 5, 8, 3, 7];
    var STEPS = 12;
    state._render = function () {
      var S = state.slots;
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      var rowH = (H - 2 * PAD) / S, cw = (W - 2 * PAD) / STEPS;
      var busy = 0, total = S * STEPS;
      var queue = LENS.slice(S); // 前 S 个之后剩余的请求
      var qi = 0;
      var r;
      for (r = 0; r < S; r++) {
        var y = PAD + r * rowH + 2;
        var t = 0;
        var curLen = LENS[r];
        var start = 0;
        while (t < STEPS) {
          // 从 start 开始运行当前请求，共 curLen 步
          var runEnd = Math.min(STEPS, start + curLen);
          var x = PAD + start * cw;
          svg.appendChild(svgEl('rect', { x: x.toFixed(1), y: y.toFixed(1),
            width: ((runEnd - start) * cw - 2).toFixed(1), height: (rowH - 4).toFixed(1), rx: '2',
            fill: 'var(--blueprint,#3553ff)', opacity: '0.85' }));
          busy += (runEnd - start);
          t = runEnd;
          if (state.mode === 'continuous' && qi < queue.length) {
            // 立即用队列中的下一个请求重新填充空出的槽位
            start = t; curLen = queue[qi++];
          } else {
            // 静态模式（Static）：槽位空闲，直到整个批次在最大长度处结束
            break;
          }
        }
      }
      var util;
      if (state.mode === 'static') {
        // 静态批次运行到首批中最长请求结束为止
        var maxLen = Math.max.apply(null, LENS.slice(0, S));
        var work = 0, k;
        for (k = 0; k < S; k++) { work += Math.min(STEPS, LENS[k]); }
        util = work / (S * Math.min(STEPS, maxLen));
        // 为静态模式绘制灰色的空闲尾段
        for (r = 0; r < S; r++) {
          var ll = Math.min(STEPS, LENS[r]);
          var maxl = Math.min(STEPS, maxLen);
          if (ll < maxl) {
            var yy = PAD + r * rowH + 2;
            svg.appendChild(svgEl('rect', { x: (PAD + ll * cw).toFixed(1), y: yy.toFixed(1),
              width: ((maxl - ll) * cw - 2).toFixed(1), height: (rowH - 4).toFixed(1), rx: '2',
              fill: 'var(--rule-soft,#ccc)', opacity: '0.7' }));
          }
        }
      } else {
        util = busy / total;
      }
      var pct = Math.round(util * 100);
      num.innerHTML = pct + ' <small>% GPU 利用率</small>';
      bar.style.width = pct + '%';
      barWrap.classList.toggle('over', pct < 60);
      meta.textContent = state.mode === 'continuous'
        ? '槽位完成后立即从队列补入新请求，使批次保持满载'
        : '所有槽位都要等批次中最长的请求结束，才能启动新请求';
      formula.textContent = '利用率 = 忙碌槽位步数 / 总槽位步数 · ' + S + ' 个槽位，' + STEPS + ' 个步骤';
    };
    var sel = LF.select(state, 'mode', '批处理方式', [['连续批处理（Continuous）', 'continuous'], ['静态批处理（Static）', 'static']]);
    var grid = el('div', { class: 'lf-grid' }, [
      sel,
      slider(state, 'slots', 'GPU 槽位数', 2, 6, 1)
    ]);
    host.appendChild(el('div', { class: 'lf' }, [
      el('div', { class: 'lf-head' }, [el('span', { class: 'lf-label' }, ['连续批处理（Continuous Batching）']), el('span', {}, ['切换静态与连续模式'])]),
      el('div', { class: 'lf-body' }, [grid, el('div', { class: 'lf-out' }, [svg, num, barWrap, meta, formula])]),
      el('div', { class: 'lf-cap' }, ['批次中的请求生成的词元数不同，因此完成时间也不同。静态批处理（Static Batching）会占住所有槽位，直到最长请求结束，产生图中的灰色空闲时间。连续批处理在每个槽位释放后立即从队列补入新请求，使 GPU 保持满载，提高利用率（Utilization）。'])
    ]));
    state._render();
  }

  // ── image-patch-tokens: 将图像切成 (size/patch)^2 个图块词元（Patch tokens） ──
  function imagePatchTokens(host) {
    var state = { size: 224, patch: 16 };
    var W = 520, H = 240, PAD = 16, BOX = 200;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var num = el('span', { class: 'lf-num' });
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    state._render = function () {
      var size = state.size, patch = state.patch;
      var perSide = Math.max(1, Math.ceil(size / patch));
      var n = perSide * perSide;
      var padded = perSide * patch;
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      var ox = PAD, oy = (H - BOX) / 2, cell = BOX / perSide;
      svg.appendChild(svgEl('rect', { x: ox, y: oy.toFixed(1), width: BOX, height: BOX,
        fill: 'var(--bg-surface,#eee)', stroke: 'var(--ink-soft,#555)', 'stroke-width': '1.5' }));
      var i;
      for (i = 1; i < perSide; i++) {
        var g = ox + i * cell;
        svg.appendChild(svgEl('line', { x1: g.toFixed(1), y1: oy.toFixed(1), x2: g.toFixed(1), y2: (oy + BOX).toFixed(1),
          stroke: 'var(--blueprint,#3553ff)', 'stroke-width': '0.8', opacity: '0.7' }));
        var gy = oy + i * cell;
        svg.appendChild(svgEl('line', { x1: ox, y1: gy.toFixed(1), x2: (ox + BOX), y2: gy.toFixed(1),
          stroke: 'var(--blueprint,#3553ff)', 'stroke-width': '0.8', opacity: '0.7' }));
      }
      // 右侧的一条词元方块，限制数量以保证可读性
      var tx = ox + BOX + 28, ty = oy, ts = 12, cols = 6;
      var shown = Math.min(n, 36);
      for (i = 0; i < shown; i++) {
        var cx = tx + (i % cols) * (ts + 3);
        var cy = ty + Math.floor(i / cols) * (ts + 3);
        svg.appendChild(svgEl('rect', { x: cx.toFixed(1), y: cy.toFixed(1), width: ts, height: ts, rx: '2',
          fill: 'var(--blueprint,#3553ff)', opacity: '0.8' }));
      }
      num.innerHTML = LF.fmtInt(n) + ' <small>个图像块词元</small>';
      meta.textContent = perSide + ' x ' + perSide + ' 网格 · 每个 ' + patch + ' x ' + patch
        + ' 像素图像块转成一个词元' + (padded !== size ? ' · 图像填充到 ' + padded + ' 像素' : '') + '（ViT 另加一个 CLS 词元）';
      formula.textContent = 'tokens = ⌈size / patch⌉² = ⌈' + size + ' / ' + patch + '⌉² = ' + perSide + '² = ' + n;
    };
    var grid = el('div', { class: 'lf-grid' }, [
      LF.select(state, 'size', '图像大小（像素）', [['224', 224], ['256', 256], ['336', 336], ['384', 384], ['448', 448]]),
      LF.select(state, 'patch', '图像块大小（像素）', [['8', 8], ['14', 14], ['16', 16], ['32', 32]])
    ]);
    host.appendChild(el('div', { class: 'lf' }, [
      el('div', { class: 'lf-head' }, [el('span', { class: 'lf-label' }, ['图像块词元（Image Patch Tokens）']), el('span', {}, ['选择图像与图像块大小'])]),
      el('div', { class: 'lf-body' }, [grid, el('div', { class: 'lf-out' }, [svg, num, meta, formula])]),
      el('div', { class: 'lf-cap' }, ['视觉 Transformer（Vision Transformer，ViT）将图像切成固定大小的图像块（Patch）网格，每块都视为一个词元，就像文本中的词。词元数等于图像尺寸与块尺寸之比的平方，因此将图像块边长减半，会使序列长度和注意力开销变为四倍。'])
    ]));
    state._render();
  }

  // ── multimodal-fusion: 两个编码器（Encoders）进入共享空间（Shared space），比较早期与晚期融合 ──
  function multimodalFusion(host) {
    var state = { mode: 'late' };
    var W = 520, H = 230, PAD = 20;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    function box(x, y, w, h, label, fill) {
      var g = svgEl('g', {}, []);
      g.appendChild(svgEl('rect', { x: x, y: y, width: w, height: h, rx: '3',
        fill: fill || 'var(--bg-surface,#eee)', stroke: 'var(--ink-soft,#555)', 'stroke-width': '1.2' }));
      var t = svgEl('text', { x: (x + w / 2).toFixed(1), y: (y + h / 2 + 4).toFixed(1),
        'text-anchor': 'middle', 'font-family': 'monospace', 'font-size': '11', fill: 'var(--ink,#1a1a1a)' });
      t.appendChild(document.createTextNode(label));
      g.appendChild(t);
      return g;
    }
    function arrow(x1, y1, x2, y2) {
      return svgEl('line', { x1: x1, y1: y1, x2: x2, y2: y2,
        stroke: 'var(--blueprint,#3553ff)', 'stroke-width': '1.6' });
    }
    state._render = function () {
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      var imgY = 36, txtY = 150, colW = 92, colH = 36, h2 = 18;
      // 输入（Inputs）
      svg.appendChild(box(PAD, imgY, colW, colH, '图像', 'var(--bg,#fafaf5)'));
      svg.appendChild(box(PAD, txtY, colW, colH, '文本', 'var(--bg,#fafaf5)'));
      // 编码器（Encoders）
      var encX = PAD + colW + 40;
      svg.appendChild(box(encX, imgY, colW, colH, '图像编码器'));
      svg.appendChild(box(encX, txtY, colW, colH, '文本编码器'));
      svg.appendChild(arrow(PAD + colW, imgY + h2, encX, imgY + h2));
      svg.appendChild(arrow(PAD + colW, txtY + h2, encX, txtY + h2));
      // 投影（Projection）到共享空间
      var projX = encX + colW + 40;
      if (state.mode === 'late') {
        // 各自独立投影；融合（Fusion）在最后比较两个向量
        svg.appendChild(box(projX, imgY, colW, colH, '投影'));
        svg.appendChild(box(projX, txtY, colW, colH, '投影'));
        svg.appendChild(arrow(encX + colW, imgY + h2, projX, imgY + h2));
        svg.appendChild(arrow(encX + colW, txtY + h2, projX, txtY + h2));
        var sx = projX + colW + 30, sy = (imgY + txtY) / 2;
        svg.appendChild(box(sx, sy, 70, colH, '共享空间', 'var(--bg-surface,#eee)'));
        svg.appendChild(arrow(projX + colW, imgY + h2, sx, sy + 6));
        svg.appendChild(arrow(projX + colW, txtY + h2, sx, sy + colH - 6));
      } else {
        // 早期融合（Early fusion）：词元拼接为一条流，联合建模
        var fy = (imgY + txtY) / 2;
        svg.appendChild(box(projX, fy, 80, colH, '拼接', 'var(--bg-surface,#eee)'));
        svg.appendChild(arrow(encX + colW, imgY + h2, projX, fy + 8));
        svg.appendChild(arrow(encX + colW, txtY + h2, projX, fy + colH - 8));
        var jx = projX + 80 + 30;
        svg.appendChild(box(jx, fy, 98, colH, '联合 Transformer'));
        svg.appendChild(arrow(projX + 80, fy + h2, jx, fy + h2));
      }
      meta.textContent = state.mode === 'late'
        ? '后期融合：分别编码各模态，投影到同一空间，最后比较（CLIP 风格）'
        : '早期融合：图像与文本词元交错组成同一序列，联合建模';
      formula.textContent = state.mode === 'late'
        ? 'sim = cos( proj(img enc(image)), proj(txt enc(text)) )'
        : 'joint = transformer( [ img tokens ; text tokens ] )';
    };
    var grid = el('div', {}, [LF.select(state, 'mode', '融合时点', [['后期融合（Late Fusion）', 'late'], ['早期融合（Early Fusion）', 'early']])]);
    host.appendChild(el('div', { class: 'lf' }, [
      el('div', { class: 'lf-head' }, [el('span', { class: 'lf-label' }, ['多模态融合（Multimodal Fusion）']), el('span', {}, ['切换早期与后期融合'])]),
      el('div', { class: 'lf-body' }, [grid, el('div', { class: 'lf-out' }, [svg, meta, formula])]),
      el('div', { class: 'lf-cap' }, ['图像编码器与文本编码器分别将输入映射为向量。后期融合（Late Fusion）将两者投影到共享嵌入空间（Shared Embedding Space），仅在最后比较；CLIP 等对比模型就是这样对齐图像与描述的。早期融合（Early Fusion）拼接两路词元流，从一开始就联合建模，让两种模态在整个过程中相互分配注意力。'])
    ]));
    state._render();
  }

  // ── mcp-tool-call: 客户端到服务器的 JSON-RPC 往返，结果进入上下文（Context） ──
  function mcpToolCall(host) {
    var state = { step: 2 };
    var W = 520, H = 250, PAD = 18;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var code = el('div', { class: 'lf-formula' });
    var meta = el('div', { class: 'lf-meta' });
    var STEPS = [
      'tools/list：客户端查询服务端有哪些函数',
      '服务端返回可用函数注册表及其模式',
      'tools/call：客户端带参数调用 get_weather',
      '服务端执行函数并返回结果',
      '结果追加到上下文，模型继续生成'
    ];
    var CODE = [
      '--> { "jsonrpc": "2.0", "id": 1, "method": "tools/list" }',
      '<-- { "result": { "tools": [ { "name": "get_weather", ... } ] } }',
      '--> { "jsonrpc": "2.0", "id": 2, "method": "tools/call",\n      "params": { "name": "get_weather", "arguments": { "city": "Pune" } } }',
      '<-- { "id": 2, "result": { "content": [ { "type": "text", "text": "31 C, clear" } ] } }',
      'context += 工具结果 → 模型生成最终回答'
    ];
    function box(x, y, w, h, label, active) {
      var g = svgEl('g', {});
      g.appendChild(svgEl('rect', { x: x, y: y, width: w, height: h, rx: '4',
        fill: active ? 'var(--blueprint,#3553ff)' : 'var(--bg-surface,#eee)',
        stroke: 'var(--ink-soft,#555)', 'stroke-width': '1.2' }));
      var t = svgEl('text', { x: (x + w / 2).toFixed(1), y: (y + h / 2 + 4).toFixed(1),
        'text-anchor': 'middle', 'font-family': 'monospace', 'font-size': '11',
        fill: active ? 'var(--bg,#fafaf5)' : 'var(--ink,#1a1a1a)' });
      t.appendChild(document.createTextNode(label));
      g.appendChild(t);
      return g;
    }
    state._render = function () {
      var s = state.step;
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      var bw = 120, bh = 38;
      var clientX = PAD, serverX = W - PAD - bw, midY = 30;
      var clientActive = (s === 0 || s === 2 || s === 4);
      var serverActive = (s === 1 || s === 3);
      svg.appendChild(box(clientX, midY, bw, bh, '客户端 / 宿主', clientActive));
      svg.appendChild(box(serverX, midY, bw, bh, 'MCP 服务端', serverActive));
      // 服务器下方的注册表（Registry）
      svg.appendChild(box(serverX, midY + bh + 16, bw, 30, '函数注册表', s === 1));
      // 客户端下方的上下文
      svg.appendChild(box(clientX, midY + bh + 16, bw, 30, '模型上下文', s === 4));
      // 两者之间的消息箭头
      var ay = midY + bh + 92;
      var goingRight = (s === 0 || s === 2);
      var x1 = clientX + bw, x2 = serverX;
      if (goingRight) {
        svg.appendChild(svgEl('line', { x1: x1, y1: ay, x2: x2, y2: ay, stroke: 'var(--blueprint,#3553ff)', 'stroke-width': '2' }));
        svg.appendChild(svgEl('polygon', { points: (x2) + ',' + ay + ' ' + (x2 - 9) + ',' + (ay - 5) + ' ' + (x2 - 9) + ',' + (ay + 5), fill: 'var(--blueprint,#3553ff)' }));
      } else if (s === 1 || s === 3) {
        svg.appendChild(svgEl('line', { x1: x2, y1: ay, x2: x1, y2: ay, stroke: 'var(--blueprint,#3553ff)', 'stroke-width': '2' }));
        svg.appendChild(svgEl('polygon', { points: (x1) + ',' + ay + ' ' + (x1 + 9) + ',' + (ay - 5) + ' ' + (x1 + 9) + ',' + (ay + 5), fill: 'var(--blueprint,#3553ff)' }));
      }
      var dir = svgEl('text', { x: (W / 2).toFixed(1), y: (ay - 10).toFixed(1), 'text-anchor': 'middle',
        'font-family': 'monospace', 'font-size': '10', fill: 'var(--ink-mute,#777)' });
      dir.appendChild(document.createTextNode(goingRight ? '请求 -->' : (s === 4 ? '结果回传' : '<-- 响应')));
      svg.appendChild(dir);
      // 步骤标签
      var lbl = svgEl('text', { x: (W / 2).toFixed(1), y: (H - 14).toFixed(1), 'text-anchor': 'middle',
        'font-family': 'monospace', 'font-size': '10.5', fill: 'var(--ink-soft,#555)' });
      lbl.appendChild(document.createTextNode((s + 1) + ' / ' + STEPS.length + '  ' + STEPS[s]));
      svg.appendChild(lbl);
      code.textContent = CODE[s];
      meta.textContent = '传输层承载 JSON-RPC 2.0 · 结果成为模型下一步读取的上下文消息';
    };
    var grid = el('div', {}, [slider(state, 'step', '往返步骤', 0, 4, 1)]);
    host.appendChild(el('div', { class: 'lf' }, [
      el('div', { class: 'lf-head' }, [el('span', { class: 'lf-label' }, ['MCP 工具调用（Tool Call）']), el('span', {}, ['拖动以查看完整往返过程'])]),
      el('div', { class: 'lf-body' }, [grid, el('div', { class: 'lf-out' }, [svg, code, meta])]),
      el('div', { class: 'lf-cap' }, ['模型上下文协议（Model Context Protocol，MCP）通过 JSON-RPC 在客户端与服务端之间通信。客户端先列出服务端暴露的函数，再按名称和参数调用其中一个。服务端执行后返回结构化结果，客户端将其追加到模型上下文，供下一步生成使用。'])
    ]));
    state._render();
  }

  LF.register({
    'beam-search': beamSearch,
    'speculative-decoding': speculativeDecoding,
    'moe-routing': moeRouting,
    'context-window-slide': contextWindowSlide,
    'perplexity-loss': perplexityLoss,
    'continuous-batching': continuousBatching,
    'image-patch-tokens': imagePatchTokens,
    'multimodal-fusion': multimodalFusion,
    'mcp-tool-call': mcpToolCall
  });
})();
