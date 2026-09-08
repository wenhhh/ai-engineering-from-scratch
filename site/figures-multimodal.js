/* figures-multimodal.js — 阶段 12（多模态 AI（Multimodal AI））
   的交互课程图表。在 lesson-figures.js 之后加载，使用共享 LF 工具包，通过
   LF.register 注册。无依赖，仅使用 ES5，主题由 CSS 变量控制。编写时仍在
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

  function txt(x, y, s, anchor, color, size) {
    return svgEl('text', { x: String(x), y: String(y), 'text-anchor': anchor || 'middle', 'font-size': String(size || 10), 'font-family': 'monospace', fill: color || 'var(--ink-soft,#555)' }, [document.createTextNode(s)]);
  }

  // ── contrastive-matrix: CLIP InfoNCE 相似度矩阵（Similarity matrix），拖动温度（Temperature） ──
  function contrastiveMatrix(host) {
    var n = 5;
    var labels = ['dog', 'car', 'tree', 'boat', 'bird'];
    // 固定的余弦相似度（Cosine similarities）位于 [-1,1]；对角线较高，非对角线较低。
    var sim = [
      [0.92, 0.18, 0.24, 0.10, 0.30],
      [0.15, 0.90, 0.12, 0.40, 0.08],
      [0.27, 0.10, 0.88, 0.14, 0.35],
      [0.12, 0.42, 0.16, 0.91, 0.06],
      [0.33, 0.09, 0.38, 0.07, 0.89]
    ];
    var state = { tau: 0.10 };
    var W = 520, H = 280, PAD = 70, CELL = Math.min((W - PAD - 20) / n, (H - 34 - 20) / n);
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    state._render = function () {
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      var tau = Math.max(0.01, state.tau);
      var r, c, x, y, diag = 0;
      for (r = 0; r < n; r++) {
        // 对图像 r 与所有文本对应的这一行执行 Softmax（InfoNCE 分子（Numerator））。
        var sc = [];
        for (c = 0; c < n; c++) { sc.push(sim[r][c] / tau); }
        var mx = Math.max.apply(null, sc);
        var ex = sc.map(function (s) { return Math.exp(s - mx); });
        var sum = ex.reduce(function (a, b) { return a + b; }, 0);
        var probs = ex.map(function (e) { return e / sum; });
        diag += probs[r];
        for (c = 0; c < n; c++) {
          x = PAD + c * CELL; y = 34 + r * CELL;
          svg.appendChild(svgEl('rect', { x: x.toFixed(1), y: y.toFixed(1), width: (CELL - 2).toFixed(1), height: (CELL - 2).toFixed(1), fill: 'var(--blueprint,#3553ff)', 'fill-opacity': probs[c].toFixed(3), stroke: c === r ? 'var(--warn,#b8870f)' : 'var(--rule-soft,#ddd)', 'stroke-width': c === r ? '1.5' : '0.5' }));
        }
        svg.appendChild(txt((PAD - 8).toFixed(1), (y + CELL / 2 + 3).toFixed(1), '图:' + labels[r], 'end', 'var(--ink-soft,#555)'));
      }
      for (c = 0; c < n; c++) {
        x = PAD + c * CELL;
        svg.appendChild(txt((x + CELL / 2).toFixed(1), '26', '文:' + labels[c], 'middle', 'var(--ink-mute,#777)', 9));
      }
      var acc = diag / n;
      meta.textContent = '匹配对的概率质量 ' + (acc * 100).toFixed(0) + '% · 对角线已描边 · ' + (state.tau < 0.06 ? 'τ 低：矩阵集中到清晰的对角线' : state.tau > 0.25 ? 'τ 高：各行变平，配对难以区分' : '较为均衡');
      formula.textContent = 'L = −log softmax(sim / τ)[matched],  τ = ' + tau.toFixed(2) + '   ·   对各图像行和文本列做 softmax，使概率集中到匹配对';
    };
    var grid = el('div', {}, [slider(state, 'tau', '温度（Temperature）τ', 0.02, 0.5, 0.01)]);
    shell(host, '对比矩阵（Contrastive Matrix）', '拖动 τ', grid, [svg, meta, formula],
      'CLIP 为批次中的每张图像与每条图像描述配对评分，形成相似度矩阵（Similarity Matrix）。对比损失（Contrastive Loss）拉近对角线上的匹配对，推远非对角线上的不匹配对。除以较低温度会让 softmax 更集中，对角线随之亮起；较高温度让分布变平，模型不再区分配对。本图保留 dog、car、tree、boat、bird 作为犬、汽车、树、船、鸟的示例标签。');
    state._render();
  }

  // ── cross-attention-fusion: 文本查询（Queries）关注图像图块键（Patch keys） ──
  function crossAttentionFusion(host) {
    var texts = ['a', 'red', 'bird', 'on', 'branch'];
    var patches = 8;
    var nt = texts.length;
    var state = { focus: 2, sharp: 1.4 };
    // 每个文本词元与各图像图块的亲和度（Affinity）固定，鸟位于图块 4-5。
    var aff = [
      [0.3, 0.3, 0.3, 0.3, 0.3, 0.3, 0.3, 0.3],
      [0.2, 0.3, 0.5, 0.7, 0.8, 0.6, 0.3, 0.2],
      [0.1, 0.2, 0.4, 0.8, 1.0, 0.9, 0.4, 0.2],
      [0.4, 0.4, 0.3, 0.3, 0.3, 0.4, 0.5, 0.5],
      [0.3, 0.2, 0.2, 0.3, 0.4, 0.6, 0.9, 1.0]
    ];
    var W = 520, H = 250, PAD = 64, CELL = (W - PAD - 20) / patches;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    state._render = function () {
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      var s = Math.max(0.1, state.sharp), r, c, x, y, peak = 0, peakCol = 0;
      var rowH = (H - 50) / nt;
      for (r = 0; r < nt; r++) {
        var logits = [];
        for (c = 0; c < patches; c++) { logits.push(aff[r][c] * s); }
        var mx = Math.max.apply(null, logits);
        var ex = logits.map(function (z) { return Math.exp(z - mx); });
        var sum = ex.reduce(function (a, b) { return a + b; }, 0);
        var probs = ex.map(function (e) { return e / sum; });
        for (c = 0; c < patches; c++) {
          x = PAD + c * CELL; y = 30 + r * rowH;
          svg.appendChild(svgEl('rect', { x: x.toFixed(1), y: y.toFixed(1), width: (CELL - 2).toFixed(1), height: (rowH - 3).toFixed(1), fill: 'var(--blueprint,#3553ff)', 'fill-opacity': probs[c].toFixed(3), stroke: r === state.focus && c === probs.indexOf(Math.max.apply(null, probs)) ? 'var(--warn,#b8870f)' : 'var(--rule-soft,#ddd)', 'stroke-width': '0.5' }));
        }
        if (r === state.focus) { peak = Math.max.apply(null, probs); peakCol = probs.indexOf(peak); }
        svg.appendChild(txt((PAD - 8).toFixed(1), (y + rowH / 2 + 3).toFixed(1), texts[r], 'end', r === state.focus ? 'var(--blueprint,#3553ff)' : 'var(--ink-soft,#555)'));
      }
      for (c = 0; c < patches; c++) {
        x = PAD + c * CELL;
        svg.appendChild(txt((x + CELL / 2).toFixed(1), '24', 'p' + c, 'middle', 'var(--ink-mute,#777)', 9));
      }
      meta.textContent = '“' + texts[state.focus] + '”将 ' + (peak * 100).toFixed(0) + '% 的注意力放在图像块 ' + peakCol + ' 上 · 行为文本查询，列为图像块';
      formula.textContent = 'A = softmax(Q_text · Kᵀ_image)，每行之和为 1 · 集中程度越高，每个查询越聚焦于对应图像块';
    };
    var grid = el('div', { class: 'lf-grid' }, [
      slider(state, 'focus', '高亮文本词元', 0, nt - 1, 1),
      slider(state, 'sharp', '注意力集中程度', 0.3, 4.0, 0.1)
    ]);
    shell(host, '交叉注意力融合（Cross-attention Fusion）', '拖动查询词元与集中程度', grid, [svg, meta, formula],
      '在视觉语言模型（Vision-Language Model）中，每个文本词元都是一个查询（Query），对所有图像块的键（Key）分配注意力。网格展示一张注意力图（Attention Map）：行是文本词元，列是图像块，每行经过 softmax 后总和为 1。“bird”（鸟）这样的实词会集中关注包含相应物体的图像块，语言由此与像素建立对应。示例“a red bird on branch”表示枝上的一只红鸟。');
    state._render();
  }

  // ── modality-projection: 在共享空间（Shared space）中对齐图像与文本向量 ──
  function modalityProjection(host) {
    var state = { align: 0 };
    var W = 360, H = 260, CX = 70, CY = 150, R = 120;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var num = el('span', { class: 'lf-num' });
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    var imgDeg0 = 78, txtDeg0 = 14; // 初始时未对齐
    function vec(deg, color, label) {
      var rad = deg * Math.PI / 180;
      var x2 = CX + R * Math.cos(rad), y2 = CY - R * Math.sin(rad);
      svg.appendChild(svgEl('line', { x1: CX, y1: CY, x2: x2.toFixed(1), y2: y2.toFixed(1), stroke: color, 'stroke-width': '2.5' }));
      svg.appendChild(txt((x2 + 6).toFixed(1), (y2 + (label === '图像' ? -12 : 12)).toFixed(1), label, 'start', color, 11));
    }
    state._render = function () {
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      var t = clamp(state.align, 0, 1);
      // 当 t -> 1 时，两个向量向共同的 45 度方向收敛。
      var target = 46;
      var imgDeg = imgDeg0 + t * (target - imgDeg0);
      var txtDeg = txtDeg0 + t * (target - txtDeg0);
      svg.appendChild(svgEl('path', { d: 'M ' + CX + ' ' + CY + ' L ' + (CX + R) + ' ' + CY, stroke: 'var(--rule-soft,#eee)', 'stroke-width': '1' }));
      vec(imgDeg, 'var(--blueprint,#3553ff)', '图像');
      vec(txtDeg, 'var(--warn,#b8870f)', '文本');
      var cos = Math.cos((imgDeg - txtDeg) * Math.PI / 180);
      num.innerHTML = cos.toFixed(3) + ' <small>余弦值</small>';
      meta.textContent = '投影向量夹角 ' + Math.abs(imgDeg - txtDeg).toFixed(0) + '° · ' + (cos > 0.97 ? '已对齐：匹配对指向相同方向' : cos > 0.6 ? '部分对齐' : '未对齐：位于不同子空间');
      formula.textContent = 'enc_img(x) → ℝ^d ← enc_txt(y)，训练使匹配对的 cos(z_img, z_txt) 最大化';
    };
    var grid = el('div', {}, [slider(state, 'align', '投影训练进度', 0, 1, 0.02)]);
    shell(host, '模态投影（Modality Projection）', '拖动以对齐匹配对', grid, [svg, el('div', { style: 'margin-top:10px' }, [num]), meta, formula],
      '独立的图像编码器（Image Encoder）与文本编码器（Text Encoder）将数据映射到各自空间，因此匹配对最初指向不同方向。可学习投影（Learned Projection）将两者映射到共享的 d 维空间，训练逐渐旋转匹配向量，使其余弦相似度（Cosine Similarity）接近 1。对齐后，就可以用同一种距离跨模态比较。');
    state._render();
  }

  // ── cfg-guidance-scale: guided = uncond + w (cond - uncond) ─────────────────
  function cfgGuidanceScale(host) {
    var state = { w: 3.0 };
    var W = 520, H = 240, PAD = 40;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var num = el('span', { class: 'lf-num' });
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    // 一维示意（1D illustration）：预测是数轴上的一个点；向量相加。
    var uncond = 1.4, cond = 3.6; // 基础预测（Base predictions），例如去噪估计
    var XMIN = 0, XMAX = 9;
    function px(v) { return PAD + (v - XMIN) / (XMAX - XMIN) * (W - 2 * PAD); }
    var axisY = 120;
    state._render = function () {
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      var w = state.w;
      var guided = uncond + w * (cond - uncond);
      var gClamp = clamp(guided, XMIN, XMAX);
      svg.appendChild(svgEl('line', { x1: PAD, y1: axisY, x2: W - PAD, y2: axisY, stroke: 'var(--rule-soft,#ddd)', 'stroke-width': '1' }));
      function tick(v, color, label, dy) {
        svg.appendChild(svgEl('circle', { cx: px(v).toFixed(1), cy: String(axisY), r: '5', fill: color }));
        svg.appendChild(txt(px(v).toFixed(1), String(axisY + dy), label, 'middle', color, 10));
      }
      // 从 uncond 朝 cond 方向的箭头，按 w 缩放
      svg.appendChild(svgEl('line', { x1: px(uncond).toFixed(1), y1: String(axisY - 26), x2: px(gClamp).toFixed(1), y2: String(axisY - 26), stroke: 'var(--blueprint,#3553ff)', 'stroke-width': '2' }));
      svg.appendChild(txt(px((uncond + gClamp) / 2).toFixed(1), String(axisY - 34), 'w · (cond − uncond)', 'middle', 'var(--blueprint,#3553ff)', 10));
      tick(uncond, 'var(--ink-mute,#999)', '无条件', 22);
      tick(cond, 'var(--warn,#b8870f)', '有条件', 38);
      tick(gClamp, 'var(--blueprint,#3553ff)', '引导后', 54);
      // 多样性（Diversity）/清晰度（Sharpness）条
      var diversity = clamp(1 / (1 + 0.5 * w), 0, 1);
      var sharp = clamp(w / 12, 0, 1);
      svg.appendChild(txt(PAD.toFixed(1), '200', '多样性', 'start', 'var(--ink-soft,#555)', 10));
      svg.appendChild(svgEl('rect', { x: String(PAD), y: '204', width: (diversity * 180).toFixed(1), height: '8', fill: 'var(--ink-mute,#999)' }));
      svg.appendChild(txt((W / 2 + 20).toFixed(1), '200', '提示词遵循程度', 'start', 'var(--ink-soft,#555)', 10));
      svg.appendChild(svgEl('rect', { x: String(W / 2 + 20), y: '204', width: (sharp * 180).toFixed(1), height: '8', fill: 'var(--blueprint,#3553ff)' }));
      num.innerHTML = 'w = ' + w.toFixed(1);
      meta.textContent = w <= 1.05 ? 'w ≈ 1：预测接近无条件结果，多样性高，但对提示词遵循较松'
        : w >= 9 ? 'w 很高：结果饱和、锐利，但多样性更低，容易出现伪影'
          : '引导估计从无条件预测沿提示词方向推进 ' + ((guided - uncond)).toFixed(1);
      formula.textContent = 'ε_guided = ε_uncond + w · (ε_cond − ε_uncond),  w = ' + w.toFixed(1) + '   ·   w=1 是普通条件预测，更大的 w 会继续向外外推';
    };
    var grid = el('div', {}, [slider(state, 'w', '引导强度（Guidance Scale）w', 1.0, 12.0, 0.1)]);
    shell(host, '无分类器引导（Classifier-free Guidance，CFG）', '拖动 w', grid, [svg, el('div', { style: 'margin-top:10px' }, [num]), meta, formula],
      '无分类器引导运行扩散模型（Diffusion Model）两次，一次带提示词，一次不带，然后沿两者差值方向外推（Extrapolation）。强度为 1 时得到普通条件预测；强度越高，越偏向提示词，以多样性换取遵循程度。推进过头会使样本饱和并失真，因此实际使用的强度通常位于中间区间。');
    state._render();
  }

  // ── vq-codebook: 连续编码器输出（Continuous encoder outputs）吸附到最近码（Code） ──
  function vqCodebook(host) {
    var state = { logK: 4 };
    var W = 520, H = 240, PAD = 34;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var num = el('span', { class: 'lf-num' });
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    // 固定的一组二维连续编码器输出，确定性生成。
    var enc = [
      [0.12, 0.18], [0.22, 0.74], [0.55, 0.30], [0.78, 0.62],
      [0.40, 0.88], [0.66, 0.12], [0.88, 0.40], [0.32, 0.46],
      [0.50, 0.66], [0.14, 0.92], [0.92, 0.84], [0.70, 0.92]
    ];
    function px(x) { return PAD + x * (W - 2 * PAD); }
    function py(y) { return H - PAD - y * (H - 2 * PAD); }
    function codebook(K) {
      // 覆盖单位正方形（Unit square）的确定性码网格。
      var side = Math.max(1, Math.round(Math.sqrt(K)));
      var pts = [], i, j;
      for (i = 0; i < side; i++) {
        for (j = 0; j < side; j++) {
          if (pts.length >= K) { break; }
          pts.push([(i + 0.5) / side, (j + 0.5) / side]);
        }
      }
      return pts;
    }
    state._render = function () {
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      var K = Math.round(Math.pow(2, state.logK));
      var codes = codebook(K);
      var used = {}, totErr = 0;
      // 绘制码本向量（Codebook vectors）
      codes.forEach(function (c) {
        svg.appendChild(svgEl('rect', { x: (px(c[0]) - 4).toFixed(1), y: (py(c[1]) - 4).toFixed(1), width: '8', height: '8', fill: 'none', stroke: 'var(--ink-mute,#999)', 'stroke-width': '1' }));
      });
      enc.forEach(function (e) {
        // 最近码，即量化（Quantization）
        var best = 0, bd = 1e9, k;
        for (k = 0; k < codes.length; k++) {
          var dx = e[0] - codes[k][0], dy = e[1] - codes[k][1];
          var d = dx * dx + dy * dy;
          if (d < bd) { bd = d; best = k; }
        }
        used[best] = 1; totErr += Math.sqrt(bd);
        svg.appendChild(svgEl('line', { x1: px(e[0]).toFixed(1), y1: py(e[1]).toFixed(1), x2: px(codes[best][0]).toFixed(1), y2: py(codes[best][1]).toFixed(1), stroke: 'var(--rule-soft,#ccc)', 'stroke-width': '1' }));
        svg.appendChild(svgEl('circle', { cx: px(e[0]).toFixed(1), cy: py(e[1]).toFixed(1), r: '3.5', fill: 'var(--blueprint,#3553ff)' }));
        svg.appendChild(svgEl('rect', { x: (px(codes[best][0]) - 3).toFixed(1), y: (py(codes[best][1]) - 3).toFixed(1), width: '6', height: '6', fill: 'var(--warn,#b8870f)' }));
      });
      var usage = Object.keys(used).length;
      var avgErr = totErr / enc.length;
      num.innerHTML = K + ' <small>个码字</small>';
      meta.textContent = enc.length + ' 个向量使用了 ' + K + ' 个码字中的 ' + usage + ' 个 · 平均量化误差 ' + avgErr.toFixed(3) + ' · 每个词元 ' + state.logK + ' 比特';
      formula.textContent = 'z_q = argmin_k ‖z_e − e_k‖，码本大小 K = ' + K + '   ·   K 越大，误差越低，但需要学习更多码字';
    };
    var grid = el('div', { class: 'lf-grid' }, [
      slider(state, 'logK', '码本大小（2^x）', 2, 8, 1, function (v) { return String(Math.round(Math.pow(2, v))); })
    ]);
    shell(host, '向量量化（VQ）码本（Codebook）', '拖动码本大小', grid, [svg, el('div', { style: 'margin-top:10px' }, [num]), meta, formula],
      '向量量化变分自编码器（VQ-VAE）的编码器生成连续向量（蓝点），但模型需要离散词元。每个向量映射到最近的码本条目（橙色方块），将图像变成整数码序列。更大的码本提供更细的量化（Quantization），降低重建误差（Reconstruction Error），但每个词元需要更多比特，也可能出现从未被使用的码字。');
    state._render();
  }

  // ── video-temporal-patches: tokens = frames × (H/p)(W/p) ────────────────────
  function videoTemporalPatches(host) {
    var state = { frames: 8, patch: 16, tubelet: 2 };
    var GRID = 224; // 假定帧大小为 224x224
    var W = 520, H = 230, PAD = 30;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var num = el('span', { class: 'lf-num' });
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    state._render = function () {
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      var p = state.patch, F = state.frames, tub = state.tubelet;
      var perSide = Math.floor(GRID / p);
      var spatial = perSide * perSide;
      var temporal = Math.max(1, Math.floor(F / tub));
      var tokens = spatial * temporal;
      // 绘制单个代表性帧网格与堆叠指示器
      var face = 120, ox = 40, oy = 36, depth = 5;
      var stack = Math.min(temporal, 6);
      var s;
      for (s = stack - 1; s >= 0; s--) {
        var sx = ox + s * depth * 4, sy = oy + s * depth * 2;
        svg.appendChild(svgEl('rect', { x: sx.toFixed(1), y: sy.toFixed(1), width: String(face), height: String(face), fill: s === 0 ? 'var(--bg-surface,#eee)' : 'var(--bg,#fafaf5)', stroke: 'var(--rule-soft,#ddd)', 'stroke-width': '1', 'fill-opacity': (1 - s * 0.12).toFixed(2) }));
      }
      // 最前方帧上的图块网格（Patch grid）
      var i, j;
      for (i = 0; i <= perSide; i++) {
        svg.appendChild(svgEl('line', { x1: (ox + i * face / perSide).toFixed(1), y1: String(oy), x2: (ox + i * face / perSide).toFixed(1), y2: String(oy + face), stroke: 'var(--blueprint,#3553ff)', 'stroke-width': '0.6', 'stroke-opacity': '0.55' }));
        svg.appendChild(svgEl('line', { x1: String(ox), y1: (oy + i * face / perSide).toFixed(1), x2: String(ox + face), y2: (oy + i * face / perSide).toFixed(1), stroke: 'var(--blueprint,#3553ff)', 'stroke-width': '0.6', 'stroke-opacity': '0.55' }));
      }
      svg.appendChild(txt((ox + face / 2).toFixed(1), String(oy + face + 18), '每帧 ' + perSide + ' × ' + perSide + ' 个图像块', 'middle', 'var(--ink-soft,#555)', 10));
      // 右侧数值显示
      svg.appendChild(txt('300', '60', F + ' 帧', 'start', 'var(--ink-soft,#555)', 11));
      svg.appendChild(txt('300', '82', '÷ ' + tub + '（时空管）= ' + temporal + ' 个时间块', 'start', 'var(--ink-mute,#777)', 10));
      svg.appendChild(txt('300', '108', spatial + ' 个空间图像块', 'start', 'var(--ink-soft,#555)', 11));
      svg.appendChild(txt('300', '134', temporal + ' × ' + spatial + ' =', 'start', 'var(--ink-mute,#777)', 11));
      svg.appendChild(txt('300', '160', fmtInt(tokens) + ' 个词元', 'start', 'var(--blueprint,#3553ff)', 15));
      num.innerHTML = fmtInt(tokens) + ' <small>个词元</small>';
      meta.textContent = F + ' 帧 · ' + GRID + '² 像素 · 图像块大小 ' + p + ' · 时空管长度 ' + tub + ' · ' + spatial + ' 个空间块 × ' + temporal + ' 个时间块';
      formula.textContent = 'tokens = ⌊frames / tubelet⌋ · (H/p)·(W/p) = ' + temporal + ' · ' + spatial + ' = ' + fmtInt(tokens) + '   ·   词元数决定注意力开销';
    };
    var grid = el('div', { class: 'lf-grid' }, [
      slider(state, 'frames', '帧数', 1, 64, 1),
      slider(state, 'patch', '图像块大小（像素）', 8, 56, 4),
      slider(state, 'tubelet', '时空管（Tubelet，每词元帧数）', 1, 8, 1)
    ]);
    shell(host, '视频时空分块（Video Temporal Patches）', '拖动帧数和图像块大小', grid, [svg, el('div', { style: 'margin-top:10px' }, [num]), meta, formula],
      '视频同时在空间和时间上进行词元化（Tokenization）。每帧 224 像素的图像划分为空间图像块网格，多帧再沿时间组成时空管（Tubelet）。总词元数等于时间块数乘以空间块数；注意力开销随词元数平方增长，因此细粒度分块的长视频会迅速耗尽预算。增大图像块和时空管，是控制开销的主要手段。');
    state._render();
  }

  // ── audio-text-ctc: 单调对齐（Monotonic alignment），折叠空白后得到更短文本 ──
  function audioTextCtc(host) {
    var state = { frames: 12, dup: 1 };
    var target = ['C', 'A', 'T'];
    var W = 520, H = 240, PAD = 30;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var num = el('span', { class: 'lf-num' });
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    state._render = function () {
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      var T = state.frames, dup = state.dup;
      // 构造确定性的单调发射序列（Monotonic emission）：将目标字母
      // 分布在各帧中，包含重复（dup），其余位置以空白填充。
      var emit = [];
      var spoken = target.length * dup;
      // 字母置于中央区域，两端与字母之间放置空白。
      var lead = Math.max(0, Math.floor((T - spoken) / 2));
      var f, idx = 0;
      for (f = 0; f < T; f++) {
        if (f >= lead && idx < spoken) {
          emit.push(target[Math.floor(idx / dup)]);
          idx++;
        } else {
          emit.push('_'); // 空白（Blank）
        }
      }
      // CTC 折叠（Collapse）：先删除重复，再删除空白。
      var collapsed = [], prev = null, k;
      for (k = 0; k < emit.length; k++) {
        if (emit[k] !== prev) { if (emit[k] !== '_') { collapsed.push(emit[k]); } }
        prev = emit[k];
      }
      var cellW = (W - 2 * PAD) / T;
      // 上方行：带发射符号（Emitted symbol）的音频帧
      for (f = 0; f < T; f++) {
        var x = PAD + f * cellW;
        var isBlank = emit[f] === '_';
        svg.appendChild(svgEl('rect', { x: (x + 1).toFixed(1), y: '40', width: (cellW - 2).toFixed(1), height: '34', fill: isBlank ? 'var(--bg-surface,#eee)' : 'var(--blueprint,#3553ff)', 'fill-opacity': isBlank ? '0.5' : '0.8', stroke: 'var(--rule-soft,#ddd)', 'stroke-width': '0.5' }));
        svg.appendChild(txt((x + cellW / 2).toFixed(1), '62', emit[f] === '_' ? '∅' : emit[f], 'middle', isBlank ? 'var(--ink-mute,#999)' : 'var(--bg,#fafaf5)', 12));
      }
      svg.appendChild(txt(PAD.toFixed(1), '32', T + ' 个音频帧（∅ 表示空白）', 'start', 'var(--ink-mute,#777)', 10));
      // 对齐路径（Alignment path）箭头向下指向折叠后的文本
      var ty = 150, tStep = (W - 2 * PAD) / Math.max(1, target.length);
      for (k = 0; k < target.length; k++) {
        var tx = PAD + (k + 0.5) * tStep;
        svg.appendChild(svgEl('rect', { x: (tx - 16).toFixed(1), y: ty.toFixed(1), width: '32', height: '30', fill: 'var(--warn,#b8870f)', 'fill-opacity': '0.75', stroke: 'var(--rule-soft,#ddd)', 'stroke-width': '0.5' }));
        svg.appendChild(txt(tx.toFixed(1), (ty + 20).toFixed(1), target[k], 'middle', 'var(--bg,#fafaf5)', 13));
      }
      svg.appendChild(txt(PAD.toFixed(1), (ty - 8).toFixed(1), '合并重复，去掉空白 →', 'start', 'var(--ink-mute,#777)', 10));
      var ok = collapsed.join('') === target.join('');
      num.innerHTML = T + ' → ' + collapsed.length + ' <small>帧 → 字符</small>';
      meta.textContent = '输出“' + emit.join('') + '”折叠为“' + collapsed.join('') + '” · ' + (ok ? '与目标 CAT 一致' : '尚未拼出 CAT');
      formula.textContent = 'CTC：多种对齐映射到同一标签 · collapse(a a _ b) = a b · 空白分隔重复字符，使“AA”得以保留';
    };
    var grid = el('div', { class: 'lf-grid' }, [
      slider(state, 'frames', '音频帧数', 4, 24, 1),
      slider(state, 'dup', '每个字母的帧数', 1, 4, 1)
    ]);
    shell(host, '音频—文本连接时序分类（CTC）', '拖动帧数和持续时间', grid, [svg, el('div', { style: 'margin-top:10px' }, [num]), meta, formula],
      '音频是较长的帧序列，转录文本则很短。连接时序分类（Connectionist Temporal Classification，CTC）让模型在每帧输出标签或空白（Blank），再通过合并重复、去掉空白来折叠输出。对齐始终保持单调（Monotonic Alignment），时间只向前推进；空白词元使真正重复出现的两个字母不会合并为一个。多种帧级对齐可以映射到相同的最终文本。');
    state._render();
  }

  LF.register({
    'contrastive-matrix': contrastiveMatrix,
    'cross-attention-fusion': crossAttentionFusion,
    'modality-projection': modalityProjection,
    'cfg-guidance-scale': cfgGuidanceScale,
    'vq-codebook': vqCodebook,
    'video-temporal-patches': videoTemporalPatches,
    'audio-text-ctc': audioTextCtc
  });
})();
