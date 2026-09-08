/* figures-nlp2.js — 阶段 5（自然语言处理（NLP），从基础到高级）
   的交互课程图表。在 lesson-figures.js 之后加载，使用共享 LF 工具包，
   通过 LF.register 注册。无依赖，仅使用 ES5，主题由 CSS 变量控制。编写时仍在
   docs/en.md 中使用相同的 ```figure 围栏块。 */
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

  function svgText(x, y, str, anchor, fill, size) {
    return svgEl('text', { x: x, y: y, 'text-anchor': anchor || 'start', 'font-size': size || '10', 'font-family': 'monospace', fill: fill || 'var(--ink-soft,#555)' }, [document.createTextNode(str)]);
  }

  // ── bow-tfidf: 原始词频（Term frequency）与 tf-idf = tf · log(N/df) 对比 ──
  function bowTfidf(host) {
    var state = { term: 0 };
    // 三篇短文档，计数固定。N = 3 篇文档。
    var docs = [
      { name: 'doc1', tf: { the: 4, cat: 2, sat: 1, mat: 1 } },
      { name: 'doc2', tf: { the: 3, dog: 2, ran: 1 } },
      { name: 'doc3', tf: { the: 5, cat: 1, fox: 2 } }
    ];
    var terms = ['the', 'cat', 'sat', 'mat', 'dog', 'ran', 'fox'];
    var N = docs.length;
    function df(t) { var c = 0, i; for (i = 0; i < docs.length; i++) { if (docs[i].tf[t]) { c++; } } return c; }
    var rows = el('div', {});
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    state._render = function () {
      var t = terms[clamp(Math.round(state.term), 0, terms.length - 1)];
      var dft = df(t);
      var idf = Math.log(N / dft);
      while (rows.firstChild) { rows.removeChild(rows.firstChild); }
      var maxW = 0, i;
      for (i = 0; i < docs.length; i++) { var w = (docs[i].tf[t] || 0) * idf; if (w > maxW) { maxW = w; } }
      maxW = Math.max(maxW, 0.001);
      docs.forEach(function (d) {
        var tf = d.tf[t] || 0;
        var w = tf * idf;
        var bar = el('i'); bar.style.width = (w / maxW * 100).toFixed(1) + '%';
        if (w <= 0.0001) { bar.style.background = 'var(--rule-soft,#ccc)'; }
        rows.appendChild(el('div', { class: 'lf-ctrl' }, [
          el('label', {}, [d.name + '  tf=' + tf, el('b', {}, [w.toFixed(3)])]),
          el('div', { class: 'lf-bar' }, [bar])
        ]));
      });
      meta.textContent = '“' + t + '”出现在 ' + N + ' 篇文档中的 ' + dft + ' 篇  ·  ' + (dft === N ? '每篇都有：idf 为 0，权重归零' : dft === 1 ? '出现较少：较高的 idf 提升其权重' : 'idf ' + idf.toFixed(3));
      formula.textContent = 'tf-idf = tf · log(N / df) = tf · log(' + N + ' / ' + dft + ') = tf · ' + idf.toFixed(3);
    };
    var sel = LF.select(state, 'term', '词项（Term）', terms.map(function (t, i) { return [t, i]; }));
    var orig = state._render;
    state._render = function () { state.term = Number(state.term); orig(); };
    var grid = el('div', {}, [sel]);
    shell(host, '词袋模型（Bag of Words）/ TF-IDF', '选择一个词项', grid, [rows, meta, formula],
      '词袋模型（Bag of Words）统计原始词频，因此 "the" 在哪里都显得重要。词频—逆文档频率（Term Frequency–Inverse Document Frequency，TF-IDF）将词频乘以 log(N / 文档频率)：每篇文档都出现的词，其 idf 为零，权重随之归零；只在一篇文档出现的词则获得较高 idf，权重上升。出现较少、区分能力较强的词由此脱颖而出。');
    state._render();
  }

  // ── rnn-unroll: h_t = tanh(W h_{t-1} + U x_t)，呈现为单元链（Chain of cells） ──
  function rnnUnroll(host) {
    var state = { len: 5 };
    var W = 520, H = 200;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    var Wh = 0.6, Ux = 0.5, xs = [1.0, -0.5, 0.8, 0.2, -0.3, 0.6, -0.1, 0.4];
    state._render = function () {
      while (svg.firstChild) { svg.removeChild(svg.firstChild); }
      var n = clamp(Math.round(state.len), 1, 8);
      var step = (W - 60) / n, cy = 96, cw = Math.min(48, step - 16), ch = 40;
      var h = 0, i;
      for (i = 0; i < n; i++) {
        var cx = 30 + i * step + (step - cw) / 2;
        var ccx = cx + cw / 2;
        h = Math.tanh(Wh * h + Ux * xs[i]);
        if (i > 0) {
          var prevCx = 30 + (i - 1) * step + (step - cw) / 2 + cw;
          svg.appendChild(svgEl('line', { x1: prevCx.toFixed(1), y1: (cy + ch / 2).toFixed(1), x2: cx.toFixed(1), y2: (cy + ch / 2).toFixed(1), stroke: 'var(--blueprint,#3553ff)', 'stroke-width': '1.6' }));
        }
        svg.appendChild(svgEl('rect', { x: cx.toFixed(1), y: cy.toFixed(1), width: cw.toFixed(1), height: ch.toFixed(1), rx: '3', fill: 'var(--bg-surface,#eee)', stroke: 'var(--rule-soft,#ddd)', 'stroke-width': '1' }));
        svg.appendChild(svgText(ccx.toFixed(1), (cy + ch / 2 + 4).toFixed(1), 'h' + i, 'middle', 'var(--ink-soft,#555)', '11'));
        svg.appendChild(svgText(ccx.toFixed(1), (cy - 22).toFixed(1), 'x' + i, 'middle', 'var(--ink-mute,#777)', '10'));
        svg.appendChild(svgEl('line', { x1: ccx.toFixed(1), y1: (cy - 16).toFixed(1), x2: ccx.toFixed(1), y2: cy.toFixed(1), stroke: 'var(--ink-mute,#999)', 'stroke-width': '1' }));
        svg.appendChild(svgText(ccx.toFixed(1), (cy + ch + 16).toFixed(1), h.toFixed(2), 'middle', 'var(--blueprint,#3553ff)', '9'));
      }
      meta.textContent = '序列长度 ' + n + '  ·  状态从左向右传递  ·  最终 h' + (n - 1) + ' = ' + h.toFixed(3);
      formula.textContent = 'h_t = tanh(W · h_{t-1} + U · x_t)   ·   W = ' + Wh + ', U = ' + Ux + '  （每一步共享相同权重）';
    };
    var grid = el('div', {}, [slider(state, 'len', '序列长度（Sequence Length）', 1, 8, 1)]);
    shell(host, '循环神经网络展开（RNN Unrolling）', '调整序列长度', grid, [svg, meta, formula],
      '循环神经网络（Recurrent Neural Network，RNN）在每个时间步复用同一个单元，共享相同权重。沿时间展开后，它形成一条链：每个单元用 tanh 将新输入融入先前的隐藏状态（Hidden State），再把结果向后传递。最终状态已经接收过整个序列的信息，这也使长序列中的梯度难以反向传回前面的时间步。');
    state._render();
  }

  // ── lstm-gates: 遗忘门（Forget）擦除，输入门（Input）写入，输出门（Output）暴露单元状态（Cell state） ──
  function lstmGates(host) {
    var state = { f: 0.7, i: 0.5, o: 0.8 };
    var W = 520, H = 180;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    var cPrev = 1.0, cand = 0.8; // 前一单元状态、候选值（Candidate value）
    function bar(x, y, w, val, vmax, color, label) {
      var hh = Math.abs(val) / vmax * 60;
      svg.appendChild(svgEl('rect', { x: x.toFixed(1), y: (y - hh).toFixed(1), width: w.toFixed(1), height: hh.toFixed(1), fill: color, 'fill-opacity': '0.75' }));
      svg.appendChild(svgEl('line', { x1: x.toFixed(1), y1: y.toFixed(1), x2: (x + w).toFixed(1), y2: y.toFixed(1), stroke: 'var(--rule-soft,#ddd)', 'stroke-width': '1' }));
      svg.appendChild(svgText((x + w / 2).toFixed(1), (y + 16).toFixed(1), label, 'middle', 'var(--ink-mute,#777)', '9'));
      svg.appendChild(svgText((x + w / 2).toFixed(1), (y - hh - 4).toFixed(1), val.toFixed(2), 'middle', 'var(--ink-soft,#555)', '9'));
    }
    state._render = function () {
      while (svg.firstChild) { svg.removeChild(svg.firstChild); }
      var kept = state.f * cPrev;
      var written = state.i * cand;
      var cNew = kept + written;
      var hOut = state.o * Math.tanh(cNew);
      var baseY = 120, bw = 70, gap = 24, x0 = 36, vmax = 2.0;
      bar(x0, baseY, bw, cPrev, vmax, 'var(--ink-mute,#999)', 'c_{t-1}');
      bar(x0 + (bw + gap), baseY, bw, kept, vmax, 'var(--warn,#b8870f)', 'f·c（保留）');
      bar(x0 + 2 * (bw + gap), baseY, bw, written, vmax, 'var(--blueprint,#3553ff)', 'i·g（写入）');
      bar(x0 + 3 * (bw + gap), baseY, bw, cNew, vmax, 'var(--blueprint,#3553ff)', 'c_t');
      bar(x0 + 4 * (bw + gap), baseY, bw, hOut, vmax, 'var(--blueprint,#3553ff)', 'h_t = o·tanh');
      meta.textContent = '遗忘门保留旧状态的 ' + (state.f * 100).toFixed(0) + '%  ·  输入门写入候选值的 ' + (state.i * 100).toFixed(0) + '%  ·  输出门放行比例为 ' + (state.o * 100).toFixed(0) + '%';
      formula.textContent = 'c_t = f · c_{t-1} + i · g  =  ' + state.f.toFixed(2) + '·' + cPrev.toFixed(1) + ' + ' + state.i.toFixed(2) + '·' + cand.toFixed(1) + ' = ' + cNew.toFixed(2) + '   ·   h_t = o · tanh(c_t)';
    };
    var grid = el('div', { class: 'lf-grid' }, [
      slider(state, 'f', '遗忘门（Forget Gate）f', 0, 1, 0.02),
      slider(state, 'i', '输入门（Input Gate）i', 0, 1, 0.02),
      slider(state, 'o', '输出门（Output Gate）o', 0, 1, 0.02)
    ]);
    shell(host, '长短期记忆网络（LSTM）的门控', '调整各个门的取值', grid, [svg, meta, formula],
      '长短期记忆网络（Long Short-Term Memory，LSTM）的单元状态（Cell State）是一份由门控编辑的记忆。遗忘门（Forget Gate）擦除部分旧状态，输入门（Input Gate）写入部分新候选值，两者相加形成下一时刻的单元状态。输出门（Output Gate）再控制其中多少信息作为隐藏向量输出。门值接近零或一时，单元可以跨多个时间步保留数值，而不发生梯度消失（Vanishing Gradient）。');
    state._render();
  }

  // ── seq2seq-alignment: 编码器-解码器注意力（Encoder-decoder attention），每行总和为 1 ──
  function seq2seqAlignment(host) {
    var state = { sharp: 1.0 };
    var src = ['the', 'red', 'house', '.'];
    var tgt = ['la', 'maison', 'rouge', '.'];
    // 基础对齐逻辑值（Alignment logits）：目标行 -> 源列。包含重排序关系。
    var base = [
      [2.0, 0.2, 0.4, 0.1],
      [0.3, 0.5, 2.2, 0.1],
      [0.2, 2.1, 0.5, 0.1],
      [0.1, 0.1, 0.2, 2.4]
    ];
    var W = 520, H = 480, PAD = 70;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    var n = src.length;
    var CELL = (W - PAD - 14) / n;
    state._render = function () {
      while (svg.firstChild) { svg.removeChild(svg.firstChild); }
      var s = Math.max(0.1, state.sharp), r, c;
      for (r = 0; r < n; r++) {
        var row = base[r].map(function (z) { return Math.exp(z * s); });
        var sum = row.reduce(function (a, b) { return a + b; }, 0);
        var probs = row.map(function (e) { return e / sum; });
        for (c = 0; c < n; c++) {
          var x = PAD + c * CELL, y = 30 + r * CELL;
          svg.appendChild(svgEl('rect', { x: x.toFixed(1), y: y.toFixed(1), width: (CELL - 2).toFixed(1), height: (CELL - 2).toFixed(1), fill: 'var(--blueprint,#3553ff)', 'fill-opacity': probs[c].toFixed(3), stroke: 'var(--rule-soft,#ddd)', 'stroke-width': '0.5' }));
        }
        svg.appendChild(svgText((PAD - 6).toFixed(1), (30 + r * CELL + CELL / 2).toFixed(1), tgt[r], 'end', 'var(--ink-soft,#555)', '10'));
      }
      for (c = 0; c < n; c++) {
        svg.appendChild(svgText((PAD + c * CELL + CELL / 2).toFixed(1), '24', src[c], 'middle', 'var(--ink-mute,#777)', '10'));
      }
      meta.textContent = '行 = 目标词元，列 = 源词元  ·  每行经 Softmax 后权重之和为 1  ·  非对角线单元体现词序调整';
      formula.textContent = 'context_t = Σ_s align[t][s] · encoder_s   ·   align = 对每个目标词元，在源序列上计算 Softmax';
    };
    var grid = el('div', {}, [slider(state, 'sharp', '对齐集中程度（Alignment Sharpness）', 0.2, 3.0, 0.05)]);
    shell(host, '序列到序列对齐（Seq2seq Alignment）', '调整对齐权重的集中程度', grid, [svg, meta, formula],
      '注意力机制（Attention）为解码器提供源序列上的软对齐（Soft Alignment）。每个目标词元（Token）读取所有编码器状态的加权组合，权重在对应源序列的一行上经过 Softmax 归一化，总和为一。这里法语 "maison" 关注英语 "house"，"rouge" 关注 "red"，非对角线单元因此体现了翻译所需的词序调整。权重越集中，越偏向某一个源词；越平缓，则混合更多源词的信息。');
    state._render();
  }

  // ── edit-distance: Levenshtein 动态规划（DP）矩阵、最小编辑路径（Min-edit path）与距离显示 ──
  function editDistance(host) {
    var pairs = [['kitten', 'sitting'], ['flaw', 'lawn'], ['sunday', 'saturday'], ['book', 'back']];
    var state = { pair: 0 };
    var W = 520, H = 250;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var num = el('span', { class: 'lf-num' });
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    state._render = function () {
      while (svg.firstChild) { svg.removeChild(svg.firstChild); }
      var pr = pairs[clamp(Math.round(state.pair), 0, pairs.length - 1)];
      var a = pr[0], b = pr[1], m = a.length, n = b.length;
      var D = [], i, j;
      for (i = 0; i <= m; i++) { D.push([]); for (j = 0; j <= n; j++) { D[i].push(0); } }
      for (i = 0; i <= m; i++) { D[i][0] = i; }
      for (j = 0; j <= n; j++) { D[0][j] = j; }
      for (i = 1; i <= m; i++) {
        for (j = 1; j <= n; j++) {
          var cost = a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1;
          D[i][j] = Math.min(D[i - 1][j] + 1, D[i][j - 1] + 1, D[i - 1][j - 1] + cost);
        }
      }
      // 回溯（Backtrace）最小编辑路径。
      var path = {}; i = m; j = n;
      while (i > 0 || j > 0) {
        path[i + ',' + j] = 1;
        if (i > 0 && j > 0) {
          var cst = a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1;
          if (D[i][j] === D[i - 1][j - 1] + cst) { i--; j--; continue; }
        }
        if (i > 0 && D[i][j] === D[i - 1][j] + 1) { i--; continue; }
        j--;
      }
      path['0,0'] = 1;
      var ox = 70, oy = 56, cell = Math.min(46, (W - ox - 12) / (n + 1), (H - oy - 12) / (m + 1));
      for (j = 0; j <= n; j++) { if (j > 0) { svg.appendChild(svgText((ox + j * cell + cell / 2).toFixed(1), (oy - cell / 2 + 4).toFixed(1), b.charAt(j - 1), 'middle', 'var(--ink-mute,#777)', '11')); } }
      for (i = 0; i <= m; i++) { if (i > 0) { svg.appendChild(svgText((ox - cell / 2).toFixed(1), (oy + i * cell + cell / 2 + 4).toFixed(1), a.charAt(i - 1), 'middle', 'var(--ink-mute,#777)', '11')); } }
      for (i = 0; i <= m; i++) {
        for (j = 0; j <= n; j++) {
          var on = path[i + ',' + j];
          svg.appendChild(svgEl('rect', { x: (ox + j * cell).toFixed(1), y: (oy + i * cell).toFixed(1), width: (cell - 1.5).toFixed(1), height: (cell - 1.5).toFixed(1), fill: on ? 'var(--blueprint,#3553ff)' : 'var(--bg-surface,#eee)', 'fill-opacity': on ? '0.5' : '0.4', stroke: 'var(--rule-soft,#ddd)', 'stroke-width': '0.5' }));
          svg.appendChild(svgText((ox + j * cell + cell / 2).toFixed(1), (oy + i * cell + cell / 2 + 4).toFixed(1), String(D[i][j]), 'middle', on ? 'var(--blueprint,#3553ff)' : 'var(--ink-soft,#555)', '10'));
        }
      }
      num.innerHTML = D[m][n] + ' <small>次编辑</small>';
      meta.textContent = '"' + a + '" → "' + b + '"  ·  高亮单元为最少编辑路径  ·  右下角为编辑距离';
      formula.textContent = 'D[i][j] = min( D[i-1][j]+1 删除, D[i][j-1]+1 插入, D[i-1][j-1]+[a≠b] 替换 )';
    };
    var sel = LF.select(state, 'pair', '字符串对（String Pair）', pairs.map(function (p, i) { return [p[0] + ' → ' + p[1], i]; }));
    var orig = state._render;
    state._render = function () { state.pair = Number(state.pair); orig(); };
    var grid = el('div', {}, [sel]);
    shell(host, '编辑距离（Edit Distance）', '选择一对字符串', grid, [svg, el('div', { style: 'margin-top:10px' }, [num]), meta, formula],
      '莱文斯坦距离（Levenshtein Distance）通过填表计算，每个单元记录用插入、删除和替换将一个前缀变为另一个前缀的最小代价。每个单元从三个相邻状态中取最小值，因此右下角就是两个完整字符串的距离。沿选择反向回溯，可以还原实际编辑路径；拼写检查器和翻译评价指标正是这样对齐文本的。');
    state._render();
  }

  // ── ngram-backoff: 较大的 n 捕获更多上下文，但计数更稀疏 ──
  function ngramBackoff(host) {
    var state = { n: 2 };
    // 玩具语料（Toy corpus）的词元数与词汇表；观测到的 n-grams 随 n 增大而减少。
    var tokens = 100000, vocab = 5000;
    var num = el('span', { class: 'lf-num' });
    var bar = el('i');
    var barWrap = el('div', { class: 'lf-bar' }, [bar]);
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    function human(x) { var u = ['', 'K', 'M', 'B', 'T'], i = 0; while (x >= 1000 && i < u.length - 1) { x /= 1000; i++; } return x.toFixed(x < 10 ? 1 : 0) + u[i]; }
    state._render = function () {
      var n = clamp(Math.round(state.n), 1, 5);
      var possible = Math.pow(vocab, n);
      // 实际出现的不同 n-grams 数量受语料长度约束，并趋于饱和。
      var observed = Math.min(tokens - n + 1, possible);
      var coverage = observed / possible;
      num.innerHTML = (coverage * 100 < 0.001 ? coverage.toExponential(1) : (coverage * 100).toFixed(coverage * 100 < 1 ? 4 : 1) + '%') + ' <small>已观测 n 元组的占比</small>';
      bar.style.width = Math.max(1, Math.min(100, coverage * 100)).toFixed(2) + '%';
      barWrap.classList.toggle('over', coverage < 0.001);
      meta.textContent = n + ' 元组（' + n + '-gram）：' + human(possible) + ' 种可能中观测到 ' + human(observed) + ' 种  ·  ' + (n >= 4 ? '极度稀疏：大多数上下文从未出现，需回退到较低阶' : n === 1 ? '一元模型：没有上下文，但计数稠密' : '上下文更多，每种组合的计数更少');
      formula.textContent = 'P(w | 长度为 n-1 的历史) 需要长度为 n 的元组计数  ·  V^n = ' + vocab + '^' + n + ' = ' + human(possible) + ' 种可能';
    };
    var grid = el('div', {}, [slider(state, 'n', 'n（模型阶数，Gram Order）', 1, 5, 1)]);
    shell(host, 'n 元语法稀疏性（N-gram Sparsity）', '调整 n', grid, [num, barWrap, meta, formula],
      'n 元语法模型（N-gram Model）根据前 n-1 个词预测下一个词。增大 n 能捕捉更多上下文，但可能的元组数量等于词表大小的 n 次方，语料实际观测到的比例因此趋近于零。大多数长上下文从未出现，所以高阶模型必须对未见元组进行平滑（Smoothing），并回退（Backoff）到更短、计数更稠密的元组。');
    state._render();
  }

  // ── ner-bio-tagging: 为各词元标注 BIO 标签，拖动选择作为实体的文本跨度（Span） ──
  function nerBioTagging(host) {
    var toks = ['Barack', 'Obama', 'visited', 'New', 'York', 'last', 'week'];
    // 候选实体跨度（Entity spans）：[startIndex, length, type]
    var spans = [
      [0, 2, 'PER'],
      [3, 2, 'LOC'],
      [0, 1, 'PER']
    ];
    var state = { span: 0 };
    var W = 520, H = 130;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    state._render = function () {
      while (svg.firstChild) { svg.removeChild(svg.firstChild); }
      var sp = spans[clamp(Math.round(state.span), 0, spans.length - 1)];
      var start = sp[0], len = sp[1], type = sp[2];
      var n = toks.length, bw = (W - 30) / n, x0 = 15, tags = [];
      var i;
      for (i = 0; i < n; i++) {
        var tag = 'O';
        if (i === start) { tag = 'B-' + type; }
        else if (i > start && i < start + len) { tag = 'I-' + type; }
        tags.push(tag);
        var inside = tag !== 'O';
        var x = x0 + i * bw;
        svg.appendChild(svgEl('rect', { x: (x + 3).toFixed(1), y: '34', width: (bw - 6).toFixed(1), height: '34', rx: '3', fill: inside ? 'var(--blueprint,#3553ff)' : 'var(--bg-surface,#eee)', 'fill-opacity': inside ? (tag.charAt(0) === 'B' ? '0.8' : '0.5') : '0.4', stroke: 'var(--rule-soft,#ddd)', 'stroke-width': '1' }));
        svg.appendChild(svgText((x + bw / 2).toFixed(1), '55', toks[i], 'middle', 'var(--ink-soft,#555)', '10'));
        svg.appendChild(svgText((x + bw / 2).toFixed(1), '88', tag, 'middle', inside ? 'var(--blueprint,#3553ff)' : 'var(--ink-mute,#777)', '9'));
      }
      meta.textContent = '实体跨度“' + toks.slice(start, start + len).join(' ') + '”标注为 ' + type + '  ·  B = 起始（Begin），I = 内部（Inside），O = 外部（Outside）';
      formula.textContent = 'BIO：实体的第一个词元标为 B-TYPE，后续词元标为 I-TYPE，其余均为 O';
    };
    var sel = LF.select(state, 'span', '实体跨度（Entity Span）', spans.map(function (s, i) { return [toks.slice(s[0], s[0] + s[1]).join(' ') + ' (' + s[2] + ')', i]; }));
    var orig = state._render;
    state._render = function () { state.span = Number(state.span); orig(); };
    var grid = el('div', {}, [sel]);
    shell(host, '命名实体识别（NER）· BIO 标注', '选择实体', grid, [svg, meta, formula],
      '命名实体识别（Named-entity Recognition，NER）可以表述为逐词元标注任务。BIO 方案将实体的第一个词元标为 B-TYPE，后续词元标为 I-TYPE，其他词元标为 O。序列标注器（Sequence Labeler）因此能表示多词实体及其精确边界："New York" 依次标为 B-LOC、I-LOC，与两个独立的单词地点名区分开。');
    state._render();
  }

  // ── sentiment-logits: 词权重求和 → 逻辑值（Logit）→ sigmoid → 概率（Probability） ──
  function sentimentLogits(host) {
    var words = ['great', 'not', 'terrible', 'okay'];
    var state = { w0: 1.6, w1: -0.4, w2: -1.8, w3: 0.2, bias: 0.0 };
    var keys = ['w0', 'w1', 'w2', 'w3'];
    var W = 520, H = 150;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var num = el('span', { class: 'lf-num' });
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    state._render = function () {
      while (svg.firstChild) { svg.removeChild(svg.firstChild); }
      var logit = state.bias, i;
      for (i = 0; i < keys.length; i++) { logit += state[keys[i]]; }
      var prob = 1 / (1 + Math.exp(-logit));
      var bw = (W - 30) / words.length, x0 = 15, vmax = 2.0, baseY = 70;
      for (i = 0; i < words.length; i++) {
        var v = state[keys[i]];
        var hh = Math.abs(v) / vmax * 40;
        var x = x0 + i * bw;
        var up = v >= 0;
        svg.appendChild(svgEl('rect', { x: (x + bw / 2 - 14).toFixed(1), y: (up ? baseY - hh : baseY).toFixed(1), width: '28', height: hh.toFixed(1), fill: up ? 'var(--blueprint,#3553ff)' : 'var(--warn,#b8870f)', 'fill-opacity': '0.75' }));
        svg.appendChild(svgEl('line', { x1: x.toFixed(1), y1: baseY.toFixed(1), x2: (x + bw).toFixed(1), y2: baseY.toFixed(1), stroke: 'var(--rule-soft,#ddd)', 'stroke-width': '0.5' }));
        svg.appendChild(svgText((x + bw / 2).toFixed(1), (baseY + 18).toFixed(1), words[i], 'middle', 'var(--ink-soft,#555)', '10'));
        svg.appendChild(svgText((x + bw / 2).toFixed(1), (up ? baseY - hh - 4 : baseY + hh + 28).toFixed(1), v.toFixed(2), 'middle', 'var(--ink-mute,#777)', '9'));
      }
      num.innerHTML = (prob * 100).toFixed(1) + '% <small>正面情感概率</small>';
      meta.textContent = '求和后的未归一化分数（Logit）为 ' + logit.toFixed(2) + '  ·  Sigmoid → ' + (prob >= 0.5 ? '正面' : '负面') + '  ·  蓝色提高分数，橙色降低分数';
      formula.textContent = 'logit = bias + Σ wᵢ = ' + logit.toFixed(2) + '   ·   P(positive) = σ(logit) = 1 / (1 + e^−logit)';
    };
    var grid = el('div', { class: 'lf-grid' }, [
      slider(state, 'w0', '"great" 的权重', -2, 2, 0.05),
      slider(state, 'w1', '"not" 的权重', -2, 2, 0.05),
      slider(state, 'w2', '"terrible" 的权重', -2, 2, 0.05),
      slider(state, 'w3', '"okay" 的权重', -2, 2, 0.05),
      slider(state, 'bias', '偏置（Bias）', -2, 2, 0.05)
    ]);
    shell(host, '情感分类的未归一化分数（Sentiment Logits）', '调整词语权重', grid, [svg, el('div', { style: 'margin-top:10px' }, [num]), meta, formula],
      '线性文本分类器用学到的权重为每个词打分，与偏置（Bias）相加得到一个未归一化分数（Logit），再通过 Sigmoid 函数压缩为概率。正权重推向正面情感，负权重推向相反方向。当求和后的 Logit 穿过零时，概率穿过 0.5，分类结果随之翻转。');
    state._render();
  }

  LF.register({
    'bow-tfidf': bowTfidf,
    'rnn-unroll': rnnUnroll,
    'lstm-gates': lstmGates,
    'seq2seq-alignment': seq2seqAlignment,
    'edit-distance': editDistance,
    'ngram-backoff': ngramBackoff,
    'ner-bio-tagging': nerBioTagging,
    'sentiment-logits': sentimentLogits
  });
})();
