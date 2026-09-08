/* figures-transformers.js — 阶段 5（自然语言处理（NLP））与
   阶段 7（深入理解 Transformer（Transformers deep dive））的交互课程图表。在 lesson-figures.js 之后加载，使用
   共享 LF 工具包，通过 LF.register 注册。无依赖，仅使用 ES5，主题由
   CSS 变量控制。编写时仍在 docs/en.md 中使用相同的 ```figure 围栏块。 */
(function () {
  'use strict';
  var LF = window.LF;
  if (!LF) { return; }
  var el = LF.el, svgEl = LF.svgEl, slider = LF.slider, clamp = LF.clamp, fmtInt = LF.fmtInt;

  function shell(host, label, hint, grid, outKids, cap) {
    host.appendChild(el('div', { class: 'lf' }, [
      el('div', { class: 'lf-head' }, [el('span', { class: 'lf-label' }, [label]), el('span', {}, [hint])]),
      el('div', { class: 'lf-body' }, [grid, el('div', { class: 'lf-out' }, outKids)]),
      el('div', { class: 'lf-cap' }, [cap])
    ]));
  }

  // ── attention-heatmap: QK^T 评分（Scores），各行执行 softmax，不透明度 = 权重（Weight） ──
  function attentionHeatmap(host) {
    var toks = ['The', 'cat', 'sat', 'on', 'the', 'mat'];
    var n = toks.length;
    // 每个词元使用固定的 Q,K 向量（3 维），确定性生成，无随机性。
    var Q = [[1.0, 0.2, 0.0], [0.3, 1.0, 0.1], [0.1, 0.4, 0.9], [0.6, 0.1, 0.5], [0.9, 0.3, 0.0], [0.2, 0.5, 0.8]];
    var K = [[0.9, 0.1, 0.0], [0.2, 1.0, 0.2], [0.0, 0.3, 1.0], [0.5, 0.2, 0.4], [0.9, 0.2, 0.1], [0.1, 0.4, 0.9]];
    var state = { T: 1.0 };
    var W = 520, H = 500, PAD = 56, CELL = (W - PAD - 12) / n;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
    state._render = function () {
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      var T = Math.max(0.05, state.T);
      var r, c, x, y;
      for (r = 0; r < n; r++) {
        var scores = [];
        for (c = 0; c < n; c++) { scores.push(dot(Q[r], K[c]) / T); }
        var mx = Math.max.apply(null, scores);
        var ex = scores.map(function (s) { return Math.exp(s - mx); });
        var sum = ex.reduce(function (a, b) { return a + b; }, 0);
        var probs = ex.map(function (e) { return e / sum; });
        for (c = 0; c < n; c++) {
          x = PAD + c * CELL; y = 30 + r * CELL;
          svg.appendChild(svgEl('rect', { x: x.toFixed(1), y: y.toFixed(1), width: (CELL - 2).toFixed(1), height: (CELL - 2).toFixed(1), fill: 'var(--blueprint,#3553ff)', 'fill-opacity': probs[c].toFixed(3), stroke: 'var(--rule-soft,#ddd)', 'stroke-width': '0.5' }));
        }
        svg.appendChild(svgEl('text', { x: (PAD - 6).toFixed(1), y: (y + CELL / 2).toFixed(1), 'text-anchor': 'end', 'font-size': '10', 'font-family': 'monospace', fill: 'var(--ink-soft,#555)' }, [document.createTextNode(toks[r])]));
      }
      for (c = 0; c < n; c++) {
        x = PAD + c * CELL;
        svg.appendChild(svgEl('text', { x: (x + CELL / 2 - 1).toFixed(1), y: '24', 'text-anchor': 'middle', 'font-size': '10', 'font-family': 'monospace', fill: 'var(--ink-mute,#777)' }, [document.createTextNode(toks[c])]));
      }
      meta.textContent = '行 = 查询（Queries），列 = 键（Keys）  ·  每行经 Softmax 后权重之和为 1  ·  ' + (T < 0.6 ? '集中、尖锐' : T > 1.6 ? '分散、平缓' : '均衡');
      formula.textContent = 'A = softmax(QKᵀ / T),  T = ' + T.toFixed(2) + '   ·   单元格不透明度 = 注意力权重';
    };
    var grid = el('div', {}, [slider(state, 'T', '温度（Temperature）', 0.2, 3.0, 0.05)]);
    shell(host, '注意力热力图（Attention Heatmap）', '调整 T', grid, [svg, meta, formula],
      '每个查询词元通过点积（Dot Product）为每个键词元打分，除以温度（Temperature），再对整行计算 Softmax，使权重之和为一。颜色越深，获得的注意力越多。温度较低时，注意力集中到单个键；温度较高时，关注范围更分散。');
    state._render();
  }

  // ── multihead-split: 将 d_model 拆成 num_heads 个头，每个大小为 d_model/heads ──
  function multiheadSplit(host) {
    var state = { dModel: 512, heads: 8 };
    var W = 520, H = 200, PAD = 24;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    var divisors = [1, 2, 4, 8, 16, 32, 64];
    state._render = function () {
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      var d = state.dModel, h = state.heads;
      var even = d % h === 0;
      var dh = Math.floor(d / h);
      var rowY = 40, barW = W - 2 * PAD, barH = 36;
      svg.appendChild(svgEl('rect', { x: PAD, y: rowY, width: barW, height: barH, fill: 'var(--bg-surface,#eee)', stroke: 'var(--rule-soft,#ddd)', 'stroke-width': '1' }));
      svg.appendChild(svgEl('text', { x: (PAD + barW / 2).toFixed(1), y: (rowY - 6).toFixed(1), 'text-anchor': 'middle', 'font-size': '11', 'font-family': 'monospace', fill: 'var(--ink-soft,#555)' }, [document.createTextNode('d_model = ' + d)]));
      var splitY = 120;
      if (even) {
        var i;
        for (i = 0; i < h; i++) {
          var x = PAD + i * (barW / h);
          svg.appendChild(svgEl('rect', { x: (x + 1).toFixed(1), y: splitY, width: (barW / h - 2).toFixed(1), height: barH, fill: 'var(--blueprint,#3553ff)', 'fill-opacity': (0.35 + 0.5 * (i % 2)).toFixed(2), stroke: 'var(--rule-soft,#ddd)', 'stroke-width': '0.5' }));
          svg.appendChild(svgEl('line', { x1: (PAD + (i + 0.5) * (barW / h)).toFixed(1), y1: (rowY + barH).toFixed(1), x2: (PAD + (i + 0.5) * (barW / h)).toFixed(1), y2: splitY.toFixed(1), stroke: 'var(--rule-soft,#ddd)', 'stroke-width': '0.5', 'stroke-dasharray': '2 2' }));
        }
        svg.appendChild(svgEl('text', { x: (PAD + barW / 2).toFixed(1), y: (splitY + barH + 18).toFixed(1), 'text-anchor': 'middle', 'font-size': '11', 'font-family': 'monospace', fill: 'var(--ink-soft,#555)' }, [document.createTextNode(h + ' 个头 × d_head ' + dh)]));
        meta.textContent = '每个头读取一个 ' + dh + ' 维切片  ·  参数总量不变：' + h + ' × ' + dh + ' = ' + d;
      } else {
        svg.appendChild(svgEl('text', { x: (PAD + barW / 2).toFixed(1), y: (splitY + barH).toFixed(1), 'text-anchor': 'middle', 'font-size': '13', 'font-family': 'monospace', fill: 'var(--warn,#b8870f)' }, [document.createTextNode(d + ' 不能被 ' + h + ' 整除')]));
        meta.textContent = '选择能整除 d_model 的头数：' + divisors.filter(function (x) { return d % x === 0; }).join(', ');
      }
      formula.textContent = 'd_head = d_model / num_heads = ' + d + ' / ' + h + (even ? ' = ' + dh : '（不是整数）');
    };
    var grid = el('div', { class: 'lf-grid' }, [
      slider(state, 'dModel', '模型维度（d_model）', 64, 1024, 64),
      slider(state, 'heads', '注意力头数（num_heads）', 1, 32, 1)
    ]);
    shell(host, '多头拆分（Multi-head Split）', '调整维度和头数', grid, [svg, meta, formula],
      '多头注意力（Multi-head Attention）将模型维度等分为多个切片，每个头使用一个，因此头数必须能整除 d_model。每个头在自己的子空间（Subspace）中计算注意力；各切片拼接后仍为 d_model，所以增加头数不会增加总宽度。');
    state._render();
  }

  // ── causal-mask: NxN 网格，上三角被掩码（Masked），显示为灰色 ──
  function causalMask(host) {
    var state = { n: 7 };
    var W = 520, H = 240;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    state._render = function () {
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      var n = state.n;
      var PAD = 30, size = Math.min(W - 2 * PAD, H - 40);
      var cell = size / n;
      var ox = (W - size) / 2, oy = 14;
      var r, c, visible = 0;
      for (r = 0; r < n; r++) {
        for (c = 0; c < n; c++) {
          var masked = c > r;
          if (!masked) { visible++; }
          svg.appendChild(svgEl('rect', {
            x: (ox + c * cell).toFixed(1), y: (oy + r * cell).toFixed(1),
            width: (cell - 1.5).toFixed(1), height: (cell - 1.5).toFixed(1),
            fill: masked ? 'var(--bg-surface,#eee)' : 'var(--blueprint,#3553ff)',
            'fill-opacity': masked ? '0.5' : (c === r ? '0.95' : '0.55'),
            stroke: 'var(--rule-soft,#ddd)', 'stroke-width': '0.5'
          }));
        }
      }
      var total = n * n;
      meta.textContent = total + ' 个位置中有 ' + visible + ' 个可参与注意力  ·  ' + (total - visible) + ' 个被屏蔽  ·  词元 i 只能看到词元 0..i';
      formula.textContent = 'j > i 时 mask[i][j] = −∞  →  Softmax 将未来位置的权重置零（下三角体现因果约束）';
    };
    var grid = el('div', {}, [slider(state, 'n', '序列长度（Sequence Length）N', 2, 14, 1)]);
    shell(host, '因果掩码（Causal Mask）', '调整 N', grid, [svg, meta, formula],
      '因果掩码（Causal Mask）在 Softmax 之前将所有未来位置的分数设为负无穷，使每个词元只关注自身及之前的词元。灰色上三角代表禁止访问的未来。正是这条约束，让 Transformer 能从左向右生成，而不偷看后续内容。');
    state._render();
  }

  // ── softmax-attention-scaling: 为什么要除以 sqrt(d_k) ──
  function softmaxAttentionScaling(host) {
    var state = { dk: 64, scaled: 1 };
    var W = 520, H = 210, PAD = 30;
    var n = 8;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var status = el('span', { class: 'lf-num' });
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    // 固定的单位尺度基础逻辑值（Logits）；原始点积（Dot-product）的标准差按 sqrt(d_k) 增长。
    var base = [1.4, 0.9, 0.5, 0.1, -0.2, -0.5, -0.9, -1.3];
    state._render = function () {
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      var dk = state.dk;
      // 未缩放点积的幅值按 ~ sqrt(dk) 缩放；缩放操作再将其除回。
      var spread = Math.sqrt(dk);
      var logits = base.map(function (b) { return state.scaled ? b * spread / Math.sqrt(dk) : b * spread; });
      var mx = Math.max.apply(null, logits);
      var ex = logits.map(function (z) { return Math.exp(z - mx); });
      var sum = ex.reduce(function (a, b) { return a + b; }, 0);
      var probs = ex.map(function (e) { return e / sum; });
      var pmax = Math.max.apply(null, probs);
      var ent = -probs.reduce(function (a, p) { return a + (p > 0 ? p * Math.log2(p) : 0); }, 0);
      var barW = (W - 2 * PAD) / n;
      probs.forEach(function (p, i) {
        var hh = p * (H - 2 * PAD);
        svg.appendChild(svgEl('rect', { x: (PAD + i * barW + 2).toFixed(1), y: (H - PAD - hh).toFixed(1), width: (barW - 4).toFixed(1), height: hh.toFixed(1), fill: 'var(--blueprint,#3553ff)', 'fill-opacity': '0.75' }));
      });
      svg.appendChild(svgEl('line', { x1: PAD, y1: H - PAD, x2: W - PAD, y2: H - PAD, stroke: 'var(--rule-soft,#ddd)', 'stroke-width': '1' }));
      status.innerHTML = (pmax * 100).toFixed(0) + '% <small>集中于最高分词元</small>';
      meta.textContent = (state.scaled ? '按 1/√d_k 缩放：' : '未缩放：') + (pmax > 0.85 ? 'Softmax 饱和，梯度消失' : '分布保持适当尺度') + '  ·  熵（Entropy）' + ent.toFixed(2) + ' 比特';
      formula.textContent = state.scaled ? 'softmax(QKᵀ / √d_k),  d_k = ' + dk + ',  √d_k = ' + spread.toFixed(1) : 'softmax(QKᵀ)，方差随 d_k 增长，d_k = ' + dk;
    };
    var sel = LF.select(state, 'scaled', '缩放（Scaling）', [['缩放（÷ √d_k）', 1], ['不缩放', 0]]);
    // select 存储字符串；渲染时进行类型转换（Coerce）
    var origRender = state._render;
    state._render = function () { state.scaled = Number(state.scaled); origRender(); };
    var grid = el('div', { class: 'lf-grid' }, [
      slider(state, 'dk', '每个头的维度（Head Dimension）d_k', 8, 256, 8),
      sel
    ]);
    shell(host, 'Softmax 缩放（Scaling）', '切换是否除以 √d_k', grid, [svg, el('div', { style: 'margin-top:10px' }, [status]), meta, formula],
      '点积随注意力头维度增大而增大；若不缩放，分数会变得很大，Softmax 饱和并集中于一个词元，导致梯度消失。除以 d_k 的平方根，可以抵消这种增长，使注意力分布在不同维度下都保持适当尺度。');
    state._render();
  }

  // ── word-vector-arithmetic: king - man + woman ≈ queen ─────────────────────
  function wordVectorArithmetic(host) {
    var state = { t: 1.0 };
    var W = 520, H = 260, PAD = 36;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    // 固定的二维嵌入空间（2D embedding space）。性别轴水平，王室属性轴竖直。
    var pts = { man: [1.0, 1.0], woman: [3.0, 1.0], king: [1.0, 4.0], queen: [3.0, 4.0] };
    function px(x) { return PAD + (x + 0.5) / 4.5 * (W - 2 * PAD); }
    function py(y) { return H - PAD - (y) / 5 * (H - 2 * PAD); }
    function dot(label, x, y, color) {
      svg.appendChild(svgEl('circle', { cx: px(x).toFixed(1), cy: py(y).toFixed(1), r: '5', fill: color }));
      svg.appendChild(svgEl('text', { x: (px(x) + 8).toFixed(1), y: (py(y) + 4).toFixed(1), 'font-size': '11', 'font-family': 'monospace', fill: 'var(--ink-soft,#555)' }, [document.createTextNode(label)]));
    }
    function arrow(x1, y1, x2, y2, color, dash) {
      svg.appendChild(svgEl('line', { x1: px(x1).toFixed(1), y1: py(y1).toFixed(1), x2: px(x2).toFixed(1), y2: py(y2).toFixed(1), stroke: color, 'stroke-width': '1.6', 'stroke-dasharray': dash || '' }));
    }
    state._render = function () {
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      // result = king - man + woman，沿 t 以动画从 king 向 result 移动。
      var resX = pts.king[0] - pts.man[0] + pts.woman[0];
      var resY = pts.king[1] - pts.man[1] + pts.woman[1];
      var t = clamp(state.t, 0, 1);
      var curX = pts.king[0] + t * (resX - pts.king[0]);
      var curY = pts.king[1] + t * (resY - pts.king[1]);
      arrow(pts.man[0], pts.man[1], pts.king[0], pts.king[1], 'var(--rule-soft,#ccc)', '3 3');
      arrow(pts.woman[0], pts.woman[1], pts.queen[0], pts.queen[1], 'var(--rule-soft,#ccc)', '3 3');
      arrow(pts.king[0], pts.king[1], curX, curY, 'var(--blueprint,#3553ff)');
      dot('man', pts.man[0], pts.man[1], 'var(--ink-mute,#999)');
      dot('woman', pts.woman[0], pts.woman[1], 'var(--ink-mute,#999)');
      dot('king', pts.king[0], pts.king[1], 'var(--blueprint,#3553ff)');
      dot('queen', pts.queen[0], pts.queen[1], 'var(--warn,#b8870f)');
      svg.appendChild(svgEl('circle', { cx: px(curX).toFixed(1), cy: py(curY).toFixed(1), r: '4', fill: 'none', stroke: 'var(--blueprint,#3553ff)', 'stroke-width': '1.5' }));
      var dist = Math.sqrt(Math.pow(curX - pts.queen[0], 2) + Math.pow(curY - pts.queen[1], 2));
      meta.textContent = '结果落在（' + curX.toFixed(1) + ', ' + curY.toFixed(1) + '）  ·  与 "queen" 的距离 ' + dist.toFixed(2) + (dist < 0.05 ? '  ·  匹配' : '');
      formula.textContent = 'king − man + woman ≈ queen   ·   同一个偏移（man→king）也对应 woman→queen';
    };
    var grid = el('div', {}, [slider(state, 't', '向量运算进度', 0, 1, 0.02)]);
    shell(host, '词向量运算（Word Vector Arithmetic）', '拖动以执行向量相加', grid, [svg, meta, formula],
      'Word2Vec 将词语排列在向量空间中，使语义关系表现为方向。从 man（男人）到 king（国王）的向量，与 woman（女人）到 queen（女王）的向量相同，因此从 king 减去 man、再加上 woman，几乎恰好落在 queen 上。语义变成几何关系，类比变成向量加法。');
    state._render();
  }

  // ── bpe-merge: 逐步执行字节对编码（Byte-pair-encoding）合并 ──
  function bpeMerge(host) {
    var state = { step: 0 };
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    var rows = el('div', {});
    // 玩具词频语料（Toy corpus），拆分成字符，词尾使用停止标记 _。
    var corpus = [['l o w _', 5], ['l o w e r _', 2], ['n e w e s t _', 6], ['w i d e s t _', 3]];
    // 预计算确定性的合并序列（Merge sequence）。
    function tokenizeAll(words) { return words.map(function (w) { return [w[0].split(' '), w[1]]; }); }
    function pairCounts(toks) {
      var counts = {}, order = [];
      toks.forEach(function (t) {
        var arr = t[0], cnt = t[1], i;
        for (i = 0; i < arr.length - 1; i++) {
          var key = arr[i] + ' ' + arr[i + 1];
          if (counts[key] === undefined) { counts[key] = 0; order.push(key); }
          counts[key] += cnt;
        }
      });
      return { counts: counts, order: order };
    }
    function bestPair(toks) {
      var pc = pairCounts(toks), best = null, bestN = -1;
      pc.order.forEach(function (k) { if (pc.counts[k] > bestN) { bestN = pc.counts[k]; best = k; } });
      return best === null ? null : { pair: best, count: bestN };
    }
    function applyMerge(toks, pair) {
      var parts = pair.split(' '), a = parts[0], b = parts[1], merged = a + b;
      return toks.map(function (t) {
        var arr = t[0], out = [], i = 0;
        while (i < arr.length) {
          if (i < arr.length - 1 && arr[i] === a && arr[i + 1] === b) { out.push(merged); i += 2; }
          else { out.push(arr[i]); i += 1; }
        }
        return [out, t[1]];
      });
    }
    var merges = [];
    (function () {
      var toks = tokenizeAll(corpus), step;
      for (step = 0; step < 10; step++) {
        var bp = bestPair(toks);
        if (!bp || bp.count < 2) { break; }
        merges.push(bp);
        toks = applyMerge(toks, bp.pair);
      }
    })();
    var MAXSTEP = merges.length;
    function countTokens(toks) { return toks.reduce(function (a, t) { return a + t[0].length; }, 0); }
    function vocabAt(s) {
      var v = {};
      'l o w e r n s t i d _'.split(' ').forEach(function (c) { v[c] = 1; });
      var i; for (i = 0; i < s; i++) { var p = merges[i].pair.split(' '); v[p[0] + p[1]] = 1; }
      return Object.keys(v).length;
    }
    state._render = function () {
      var s = clamp(Math.round(state.step), 0, MAXSTEP);
      var toks = tokenizeAll(corpus), i;
      for (i = 0; i < s; i++) { toks = applyMerge(toks, merges[i].pair); }
      while (rows.firstChild) rows.removeChild(rows.firstChild);
      toks.forEach(function (t) {
        var line = el('div', { class: 'lf-formula', style: 'margin-top:2px' }, [
          t[0].join(' · ') + '   (×' + t[1] + ')'
        ]);
        rows.appendChild(line);
      });
      var tc = countTokens(toks), vc = vocabAt(s);
      var nextStr = s < MAXSTEP ? '下一次合并："' + merges[s].pair.replace(' ', '" + "') + '"（频次 ' + merges[s].count + '）' : '没有出现两次的相邻对，停止合并';
      meta.textContent = '第 ' + s + ' / ' + MAXSTEP + ' 步  ·  词表包含 ' + vc + ' 个符号  ·  语料共 ' + tc + ' 个词元';
      formula.textContent = nextStr;
    };
    var grid = el('div', {}, [slider(state, 'step', '合并步骤（Merge Step）', 0, MAXSTEP, 1)]);
    shell(host, '字节对编码合并（BPE Merge）', '逐步查看合并过程', grid, [rows, meta, formula],
      '字节对编码（Byte-pair Encoding，BPE）从字符开始，反复将频率最高的相邻对合并为新符号。每次合并向词表新增一项，并缩短语料序列。"es"、"est" 等常见序列变成单个词元，使高频文本用更少的词元表示，而少见词仍可拆成片段。');
    state._render();
  }

  // ── gqa-kv-sharing: 查询头（Query heads）共享 kv 头（MHA / GQA / MQA） ──
  function gqaKvSharing(host) {
    var state = { qHeads: 8, kvHeads: 2 };
    var W = 520, H = 220;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var status = el('span', { class: 'lf-num' });
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    state._render = function () {
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      var q = state.qHeads;
      var kv = clamp(state.kvHeads, 1, q);
      if (state.kvHeads > q) { state.kvHeads = q; kv = q; }
      // 将 kv 吸附到 q 的一个约数，确保分组整齐。
      var divs = [], d; for (d = 1; d <= q; d++) { if (q % d === 0) { divs.push(d); } }
      var nearest = divs[0];
      divs.forEach(function (x) { if (Math.abs(x - kv) <= Math.abs(nearest - kv)) { nearest = x; } });
      kv = nearest;
      var perGroup = q / kv;
      var qY = 36, kvY = 168, r = 9;
      var qStep = (W - 60) / q, kvStep = (W - 60) / kv;
      var i;
      for (i = 0; i < kv; i++) {
        var kx = 30 + (i + 0.5) * kvStep;
        svg.appendChild(svgEl('rect', { x: (kx - 14).toFixed(1), y: kvY.toFixed(1), width: '28', height: '20', fill: 'var(--warn,#b8870f)', 'fill-opacity': '0.7' }));
      }
      svg.appendChild(svgEl('text', { x: '30', y: (kvY + 38).toFixed(1), 'font-size': '10', 'font-family': 'monospace', fill: 'var(--ink-mute,#777)' }, [document.createTextNode(kv + ' 个键值头（KV Heads）')]));
      for (i = 0; i < q; i++) {
        var qx = 30 + (i + 0.5) * qStep;
        var grp = Math.floor(i / perGroup);
        var kx2 = 30 + (grp + 0.5) * kvStep;
        svg.appendChild(svgEl('line', { x1: qx.toFixed(1), y1: (qY + r).toFixed(1), x2: kx2.toFixed(1), y2: kvY.toFixed(1), stroke: 'var(--rule-soft,#ccc)', 'stroke-width': '1' }));
        svg.appendChild(svgEl('circle', { cx: qx.toFixed(1), cy: qY.toFixed(1), r: String(r), fill: 'var(--blueprint,#3553ff)', 'fill-opacity': '0.8' }));
      }
      svg.appendChild(svgEl('text', { x: '30', y: '20', 'font-size': '10', 'font-family': 'monospace', fill: 'var(--ink-mute,#777)' }, [document.createTextNode(q + ' 个查询头（Query Heads）')]));
      var mode = kv === q ? 'MHA：每个查询头独占一个键值头' : kv === 1 ? 'MQA：全部查询头共享一个键值头' : 'GQA：每 ' + perGroup + ' 个查询头共享一个键值头';
      var factor = q / kv;
      status.innerHTML = factor.toFixed(factor < 10 ? 1 : 0) + ' <small>倍键值缓存缩减因子</small>';
      meta.textContent = mode + '  ·  ' + q + ' 个查询头 → ' + kv + ' 个键值头';
      formula.textContent = '键值缓存缩减因子 = query_heads / kv_heads = ' + q + ' / ' + kv + ' = ' + factor.toFixed(2) + ' 倍';
    };
    var grid = el('div', { class: 'lf-grid' }, [
      slider(state, 'qHeads', '查询头数（Query Heads）', 1, 16, 1),
      slider(state, 'kvHeads', '键值头数（KV Heads），即分组数', 1, 16, 1)
    ]);
    shell(host, '分组查询注意力（GQA）的键值共享', '调整注意力头数', grid, [svg, el('div', { style: 'margin-top:10px' }, [status]), meta, formula],
      '每个查询头保留自己的投影，但多个查询头可以共享一个键值头（Key-value Head）。每个查询头独占键值头时，是多头注意力（Multi-head Attention，MHA）；所有查询头共享一个键值头时，是多查询注意力（Multi-query Attention，MQA）；介于两者之间、分成若干组时，是分组查询注意力（Grouped-query Attention，GQA）。减少键值头，可以按查询头数与键值头数之比缩小缓存，同时保留大部分效果。');
    state._render();
  }

  // ── transformer-residual: 带残差跳跃连接（Residual skip connections）的单个块 ──
  function transformerResidual(host) {
    var state = { skip: 1 };
    var W = 520, H = 240;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    function box(x, y, w, h, label, fill) {
      svg.appendChild(svgEl('rect', { x: x, y: y, width: w, height: h, rx: '3', fill: fill || 'var(--bg-surface,#eee)', stroke: 'var(--rule-soft,#ddd)', 'stroke-width': '1' }));
      svg.appendChild(svgEl('text', { x: (x + w / 2).toFixed(1), y: (y + h / 2 + 4).toFixed(1), 'text-anchor': 'middle', 'font-size': '11', 'font-family': 'monospace', fill: 'var(--ink-soft,#555)' }, [document.createTextNode(label)]));
    }
    function flow(x1, y1, x2, y2, color) {
      svg.appendChild(svgEl('line', { x1: x1, y1: y1, x2: x2, y2: y2, stroke: color || 'var(--ink-mute,#999)', 'stroke-width': '1.6' }));
    }
    state._render = function () {
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      var cx = W / 2, bw = 150, bh = 30, lx = cx - bw / 2;
      var skip = state.skip ? 'var(--blueprint,#3553ff)' : 'var(--rule-soft,#eee)';
      // 主干
      flow(cx, 16, cx, 36);
      box(lx, 36, bw, bh, '自注意力', 'var(--blueprint,#3553ff)');
      var attnAdd = 86;
      flow(cx, 66, cx, attnAdd);
      box(cx - 36, attnAdd, 72, 24, '相加并归一化');
      flow(cx, attnAdd + 24, cx, attnAdd + 44);
      box(lx, attnAdd + 44, bw, bh, '前馈网络（FFN）', 'var(--blueprint,#3553ff)');
      var ffnAdd = attnAdd + 78;
      flow(cx, attnAdd + 44 + bh, cx, ffnAdd);
      box(cx - 36, ffnAdd, 72, 24, '相加并归一化');
      flow(cx, ffnAdd + 24, cx, ffnAdd + 40);
      // 输入/输出标签
      svg.appendChild(svgEl('text', { x: cx.toFixed(1), y: '12', 'text-anchor': 'middle', 'font-size': '10', 'font-family': 'monospace', fill: 'var(--ink-mute,#777)' }, [document.createTextNode('输入 x')]));
      svg.appendChild(svgEl('text', { x: cx.toFixed(1), y: (ffnAdd + 52).toFixed(1), 'text-anchor': 'middle', 'font-size': '10', 'font-family': 'monospace', fill: 'var(--ink-mute,#777)' }, [document.createTextNode('输出 x')]));
      // 残差跳跃连接，绕过各块的曲线
      var rx = cx + bw / 2 + 24;
      svg.appendChild(svgEl('path', { d: 'M ' + cx + ' 30 C ' + rx + ' 30, ' + rx + ' ' + attnAdd + ', ' + (cx + 36) + ' ' + (attnAdd + 12), fill: 'none', stroke: skip, 'stroke-width': '2', 'stroke-dasharray': '5 3' }));
      svg.appendChild(svgEl('path', { d: 'M ' + cx + ' ' + (attnAdd + 30) + ' C ' + rx + ' ' + (attnAdd + 30) + ', ' + rx + ' ' + ffnAdd + ', ' + (cx + 36) + ' ' + (ffnAdd + 12), fill: 'none', stroke: skip, 'stroke-width': '2', 'stroke-dasharray': '5 3' }));
      meta.textContent = state.skip ? '残差已启用：每个子层之后加回输入，让梯度直接通过' : '残差已关闭：深层堆叠会因梯度消失而无法继续训练';
      formula.textContent = 'x → x + Attention(Norm(x)) → x + FFN(Norm(x))   ·   加号表示跳跃连接';
    };
    var grid = el('div', {}, [LF.select(state, 'skip', '残差连接（Residual Connection）', [['开启', 1], ['关闭', 0]])]);
    var orig = state._render;
    state._render = function () { state.skip = Number(state.skip); orig(); };
    shell(host, 'Transformer 模块（Transformer Block）', '切换残差连接', grid, [svg, meta, formula],
      '一个 Transformer 模块包含两个子层：先是自注意力（Self-attention），然后是前馈网络（Feed-forward Network，FFN），每层都配有相加与归一化（Add & Norm）。虚线是残差跳跃连接（Residual Skip Connection），把输入 x 向前传递，并在每个子层之后加回。有了这些连接，才能堆叠数百个模块，而不让梯度在反向传播途中消失。');
    state._render();
  }

  // ── flash-attention-memory: 标准实现（Standard）O(N^2) 与分块实现（Tiled）O(N) 对比 ──
  function flashAttentionMemory(host) {
    var state = { logN: 12 };
    var W = 520, H = 220, PAD = 36;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var num = el('span', { class: 'lf-num' });
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    var bytesPerEl = 2; // bf16 评分（Score）
    function human(x) { var u = ['B', 'KB', 'MB', 'GB', 'TB']; var i = 0; while (x >= 1024 && i < u.length - 1) { x /= 1024; i++; } return x.toFixed(x < 10 ? 1 : 0) + ' ' + u[i]; }
    var NMIN = 9, NMAX = 18; // 2^9 .. 2^18 词元（Tokens）
    function stdBytes(N) { return N * N * bytesPerEl; }
    function flashBytes(N) { var blk = 128; return N * blk * bytesPerEl; }
    function px(ln) { return PAD + (ln - NMIN) / (NMAX - NMIN) * (W - 2 * PAD); }
    state._render = function () {
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      var ymax = Math.log2(stdBytes(Math.pow(2, NMAX)));
      var ymin = Math.log2(flashBytes(Math.pow(2, NMIN)));
      function py(bytes) { return H - PAD - (Math.log2(bytes) - ymin) / (ymax - ymin) * (H - 2 * PAD); }
      function curve(fn, color) {
        var d = '', i; for (i = 0; i <= 80; i++) { var ln = NMIN + (NMAX - NMIN) * i / 80; var N = Math.pow(2, ln); d += (i ? 'L' : 'M') + px(ln).toFixed(1) + ' ' + py(fn(N)).toFixed(1) + ' '; }
        svg.appendChild(svgEl('path', { d: d, fill: 'none', stroke: color, 'stroke-width': '2' }));
      }
      curve(stdBytes, 'var(--warn,#b8870f)');
      curve(flashBytes, 'var(--blueprint,#3553ff)');
      var ln = state.logN, N = Math.pow(2, ln);
      var sx = px(ln);
      svg.appendChild(svgEl('line', { x1: sx, y1: PAD, x2: sx, y2: H - PAD, stroke: 'var(--rule-soft,#ddd)', 'stroke-width': '1', 'stroke-dasharray': '3 3' }));
      svg.appendChild(svgEl('circle', { cx: sx.toFixed(1), cy: py(stdBytes(N)).toFixed(1), r: '4', fill: 'var(--warn,#b8870f)' }));
      svg.appendChild(svgEl('circle', { cx: sx.toFixed(1), cy: py(flashBytes(N)).toFixed(1), r: '4', fill: 'var(--blueprint,#3553ff)' }));
      var sb = stdBytes(N), fb = flashBytes(N), saved = sb / fb;
      num.innerHTML = saved.toFixed(saved < 10 ? 1 : 0) + ' <small>倍显存缩减因子</small>';
      meta.textContent = 'N = ' + fmtInt(N) + '  ·  标准注意力（橙色）' + human(sb) + '  ·  FlashAttention（蓝色）' + human(fb);
      formula.textContent = '标准注意力显式存储完整 N×N 分数：O(N²)  ·  FlashAttention 分块计算，不存储完整矩阵：O(N)';
    };
    var grid = el('div', {}, [slider(state, 'logN', '序列长度（Sequence Length，2^x）', NMIN, NMAX, 1, function (v) { return fmtInt(Math.pow(2, v)); })]);
    shell(host, 'FlashAttention 显存占用（Memory）', '调整序列长度', grid, [svg, el('div', { style: 'margin-top:10px' }, [num]), meta, formula],
      '标准注意力将完整的 N×N 分数矩阵写入显存，占用随序列长度的平方增长，很快成为主要开销。FlashAttention 采用分块（Tiling）计算，不显式存储完整矩阵，因此显存占用线性增长。两条曲线迅速分离：上下文较长时，显存节省可达数个数量级。');
    state._render();
  }

  LF.register({
    'attention-heatmap': attentionHeatmap,
    'multihead-split': multiheadSplit,
    'causal-mask': causalMask,
    'softmax-attention-scaling': softmaxAttentionScaling,
    'word-vector-arithmetic': wordVectorArithmetic,
    'bpe-merge': bpeMerge,
    'gqa-kv-sharing': gqaKvSharing,
    'transformer-residual': transformerResidual,
    'flash-attention-memory': flashAttentionMemory
  });
})();
