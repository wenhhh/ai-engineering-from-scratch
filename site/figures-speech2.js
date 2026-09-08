/* figures-speech2.js — 阶段 6（语音与音频（Speech & audio））的动画课程图表。
   在 lesson-figures.js 之后加载，通过 window.LF 注册组件。
   原生 ES5，无依赖，主题由 CSS 变量控制。使用 SMIL SVG 动画，不使用 JS 循环。
   编写时仍在 docs/en.md 中使用相同的围栏块：
       ```figure
       sp-ctc-alignment
       ```  */
(function () {
  'use strict';
  var LF = window.LF;
  if (!LF) { return; }
  var el = LF.el, svgEl = LF.svgEl;

  function shell(label, hint, svg, caption) {
    return el('div', { class: 'lf' }, [
      el('div', { class: 'lf-head' }, [el('span', { class: 'lf-label' }, [label]), el('span', {}, [hint])]),
      el('div', { class: 'lf-body' }, [el('div', { class: 'lf-out' }, [svg])]),
      el('div', { class: 'lf-cap' }, [caption])
    ]);
  }
  function tx(t) { return document.createTextNode(t); }
  function anim(attrs) { return svgEl('animate', attrs); }
  function label(x, y, t, anchor) {
    return svgEl('text', { x: x, y: y, fill: 'var(--ink-mute,#777)', 'font-size': '10', 'font-family': 'monospace', 'text-anchor': anchor || 'start' }, [tx(t)]);
  }

  // ── sp-asr-attention: 解码器（Decoder）对编码器音频帧执行交叉注意力（Cross-attention） ──
  function asrAttention(host) {
    var svg = svgEl('svg', { viewBox: '0 0 520 230' });
    // 编码器音频帧沿顶部排列，解码器词元在下方发出，
    // 每个新词元点亮一条柔和的对角交叉注意力权重带。
    var frames = 12, fw = 38, x0 = 22, ftop = 44, fh = 26;
    svg.appendChild(label(x0, 28, '编码器：30 秒对数梅尔频谱帧'));
    var i;
    for (i = 0; i < frames; i++) {
      var energy = (0.35 + 0.5 * Math.abs(Math.sin(i * 0.7))).toFixed(2);
      svg.appendChild(svgEl('rect', { x: x0 + i * fw, y: ftop, width: fw - 5, height: fh, fill: 'var(--blueprint,#3553ff)', opacity: energy, rx: '2' }));
    }
    // 解码器词元从左向右发出
    var toks = ['<sot>', 'the', 'cat', 'sat'];
    var dy = 168;
    svg.appendChild(label(x0, 150, '解码器：通过交叉注意力逐词元输出'));
    toks.forEach(function (t, k) {
      var tcx = x0 + k * 70;
      var g = svgEl('text', { x: tcx, y: dy, fill: 'var(--blueprint,#3553ff)', 'font-size': '13', 'font-family': 'monospace', opacity: '0' }, [tx(t)]);
      g.appendChild(anim({ attributeName: 'opacity', values: '0;0;1;1', keyTimes: ['0', (0.12 + k * 0.2).toFixed(2), (0.2 + k * 0.2).toFixed(2), '1'].join(';'), dur: '6s', repeatCount: 'indefinite' }));
      svg.appendChild(g);
      // 在所关注的帧上显示柔和注意力带，单调漂移（Monotonic drift）
      var focus = Math.round(k / (toks.length - 1) * (frames - 3)) + 1;
      var band = svgEl('rect', { x: x0 + focus * fw - 3, y: ftop - 4, width: fw * 2.4, height: fh + 8, fill: 'var(--warn,#b8870f)', opacity: '0', rx: '3' });
      var bandVals = ['0', '0', '0.28', '0.28', '0'];
      var bandTimes = ['0', (0.12 + k * 0.2).toFixed(2), (0.22 + k * 0.2).toFixed(2), (0.3 + k * 0.2).toFixed(2), (0.4 + k * 0.2).toFixed(2)];
      if (0.4 + k * 0.2 < 1) { bandVals.push('0'); bandTimes.push('1'); }
      band.appendChild(anim({ attributeName: 'opacity', values: bandVals.join(';'), keyTimes: bandTimes.join(';'), dur: '6s', repeatCount: 'indefinite' }));
      svg.appendChild(band);
    });
    svg.appendChild(label(x0, 208, '注意力从左向右移动：学到的软对齐，无需空白词元'));
    host.appendChild(shell('自动语音识别（ASR）的交叉注意力（Cross-attention）', '解码器关注音频帧',
      svg,
      'Whisper 采用编码器—解码器（Encoder–Decoder）架构。编码器把 30 秒的对数梅尔频谱（Log-mel Spectrogram）窗口变成音频帧序列，解码器逐词元输出，每一步都通过交叉注意力（Cross-attention）读取这些帧。高亮区域表明，随着转写推进，注意力从左向右移动。这是一种学到的软对齐（Soft Alignment），不同于 CTC 模型使用的固定逐帧标签。'));
  }

  // ── sp-eer-crossover: FAR 与 FRR 曲线在等错误率（EER）阈值处相交 ──
  function eerCrossover(host) {
    var W = 520, H = 230, PAD = 34;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    function px(t) { return PAD + t * (W - 2 * PAD); }
    function py(v) { return H - PAD - v * (H - 2 * PAD); }
    // FRR 随阈值上升，FAR 随之下降；两者在 t=0.5 附近相交 -> EER。
    function far(t) { return Math.exp(-3.2 * t); }
    function frr(t) { return Math.exp(-3.2 * (1 - t)); }
    function path(fn) { var d = '', i; for (i = 0; i <= 60; i++) { var t = i / 60; d += (i ? 'L' : 'M') + px(t).toFixed(1) + ' ' + py(fn(t)).toFixed(1) + ' '; } return d; }
    svg.appendChild(svgEl('line', { x1: PAD, y1: H - PAD, x2: W - PAD, y2: H - PAD, stroke: 'var(--rule-soft,#ddd)', 'stroke-width': '1' }));
    svg.appendChild(label(PAD, 22, '错误率随决策阈值（Decision Threshold）的变化'));
    svg.appendChild(svgEl('path', { d: path(far), fill: 'none', stroke: 'var(--ink-mute,#999)', 'stroke-width': '2' }));
    svg.appendChild(svgEl('path', { d: path(frr), fill: 'none', stroke: 'var(--blueprint,#3553ff)', 'stroke-width': '2' }));
    svg.appendChild(label(px(0.06), py(far(0.06)) - 6, 'FAR'));
    svg.appendChild(label(px(0.82), py(frr(0.82)) - 6, 'FRR'));
    // 滑动阈值线（Threshold line）
    var thr = svgEl('line', { x1: px(0.2), y1: PAD, x2: px(0.2), y2: H - PAD, stroke: 'var(--warn,#b8870f)', 'stroke-width': '1.5' });
    thr.appendChild(anim({ attributeName: 'x1', values: [px(0.15), px(0.85), px(0.5), px(0.5)].join(';'), keyTimes: '0;0.45;0.75;1', dur: '6s', repeatCount: 'indefinite' }));
    thr.appendChild(anim({ attributeName: 'x2', values: [px(0.15), px(0.85), px(0.5), px(0.5)].join(';'), keyTimes: '0;0.45;0.75;1', dur: '6s', repeatCount: 'indefinite' }));
    svg.appendChild(thr);
    // EER 交点标记，阈值停在该处时脉动
    var cy = py(far(0.5));
    var dot = svgEl('circle', { cx: px(0.5), cy: cy, r: '5', fill: 'var(--warn,#b8870f)', opacity: '0' });
    dot.appendChild(anim({ attributeName: 'opacity', values: '0;0;1;1', keyTimes: '0;0.7;0.78;1', dur: '6s', repeatCount: 'indefinite' }));
    dot.appendChild(anim({ attributeName: 'r', values: '5;5;7;5', keyTimes: '0;0.78;0.88;1', dur: '6s', repeatCount: 'indefinite' }));
    svg.appendChild(dot);
    svg.appendChild(label(px(0.5) + 10, cy - 8, 'EER: FAR = FRR'));
    host.appendChild(shell('等错误率交点（EER Crossover）', '移动决策阈值',
      svg,
      '提高阈值，会拒绝更多真实说话人，误拒率（False Reject Rate，FRR）上升；降低阈值，会接受更多冒充者，误接受率（False Accept Rate，FAR）上升。橙色线扫描不同阈值，最终停在两条曲线的交点。这个交点对应等错误率（Equal Error Rate，EER），是说话人验证（Speaker Verification）榜单常用的单值指标。'));
  }

  // ── sp-tts-stack: 文本 -> mel 频谱图（Spectrogram）-> 波形（Waveform），共三个阶段 ──
  function ttsStack(host) {
    var svg = svgEl('svg', { viewBox: '0 0 520 240' });
    // 阶段 1：文本词元
    svg.appendChild(label(18, 22, '文本 → 词元（Tokens）'));
    ['hel', 'lo', 'wor', 'ld'].forEach(function (t, i) {
      var bx = 18 + i * 36;
      svg.appendChild(svgEl('rect', { x: bx, y: 32, width: 32, height: 22, fill: 'var(--blueprint,#3553ff)', opacity: '0.25', rx: '2' }));
      svg.appendChild(svgEl('text', { x: bx + 16, y: 47, fill: 'var(--ink,#222)', 'font-size': '10', 'font-family': 'monospace', 'text-anchor': 'middle' }, [tx(t)]));
    });
    // 阶段 2：mel 网格，单元淡入
    svg.appendChild(label(18, 90, '声学模型 → 梅尔频谱图'));
    var cols = 7, rows = 3, cw = 40, ch = 14, gx = 18, gy = 100;
    var r, c;
    for (r = 0; r < rows; r++) for (c = 0; c < cols; c++) {
      var energy = (Math.sin(c * 0.6 + r * 0.9) * 0.4 + 0.5) * (1 - r / rows * 0.5);
      var cell = svgEl('rect', { x: gx + c * cw, y: gy + r * ch, width: cw - 1, height: ch - 1, fill: 'var(--blueprint,#3553ff)', opacity: '0' });
      cell.appendChild(anim({ attributeName: 'opacity', values: ['0', '0', energy.toFixed(2), energy.toFixed(2)].join(';'), keyTimes: ['0', (0.15 + c / cols * 0.35).toFixed(2), (0.25 + c / cols * 0.35).toFixed(2), '1'].join(';'), dur: '5s', repeatCount: 'indefinite' }));
      svg.appendChild(cell);
    }
    // 阶段 3：声码器（Vocoder）-> 波形变换
    svg.appendChild(label(18, 178, '声码器 → 波形'));
    var wy = 205, wx0 = 18, wlen = 484;
    function wavePath(amp, freq) { var d = '', i; for (i = 0; i <= 80; i++) { var x = wx0 + wlen * i / 80; var y = wy + amp * Math.sin(i * freq) * (0.4 + 0.6 * Math.sin(i * 0.15)); d += (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1) + ' '; } return d; }
    var flat = ''; var k; for (k = 0; k <= 80; k++) { flat += (k ? 'L' : 'M') + (wx0 + wlen * k / 80).toFixed(1) + ' ' + wy + ' '; }
    var wave = svgEl('path', { d: flat, fill: 'none', stroke: 'var(--blueprint,#3553ff)', 'stroke-width': '1.6' });
    wave.appendChild(anim({ attributeName: 'd', values: [flat, flat, wavePath(16, 0.9), wavePath(13, 1.3)].join(';'), keyTimes: '0;0.55;0.8;1', dur: '5s', repeatCount: 'indefinite' }));
    svg.appendChild(wave);
    host.appendChild(shell('文本转语音技术栈（TTS Stack）', '文本 → 梅尔频谱 → 波形',
      svg,
      '现代文本转语音（Text-to-speech，TTS）包含三个阶段：前端把字符串转为词元，声学模型（Acoustic Model）逐列生成梅尔频谱图（Mel Spectrogram），声码器（Vocoder）再将其转成可播放的波形（Waveform）。端到端流匹配（Flow Matching）模型弱化了后两个阶段的边界，但理解和调试合成语音时，这个三阶段视角依然有用。'));
  }

  // ── sp-codec-tokens: RVQ 码本堆栈（Codebook stack）输入自回归解码器（Autoregressive decoder） ──
  function codecTokens(host) {
    var svg = svgEl('svg', { viewBox: '0 0 520 240' });
    svg.appendChild(label(18, 22, '残差向量量化（RVQ）：每帧使用 4 个码本'));
    var rows = 4, steps = 5, x0 = 30, y0 = 36, cw = 48, ch = 26, gap = 12;
    // 码本层级标签
    var lv;
    for (lv = 0; lv < rows; lv++) {
      svg.appendChild(label(0, y0 + lv * (ch + gap) + 17, 'q' + lv, 'start'));
    }
    var r, c;
    for (r = 0; r < rows; r++) for (c = 0; c < steps; c++) {
      var bx = x0 + c * (cw + gap), by = y0 + r * (ch + gap);
      var fill = r === 0 ? 'var(--warn,#b8870f)' : 'var(--blueprint,#3553ff)';
      var rect = svgEl('rect', { x: bx, y: by, width: cw, height: ch, fill: fill, opacity: '0', rx: '2' });
      var t = 0.1 + c / steps * 0.6 + r * 0.02;
      rect.appendChild(anim({ attributeName: 'opacity', values: ['0', '0', (r === 0 ? 0.85 : 0.55).toFixed(2), (r === 0 ? 0.85 : 0.55).toFixed(2)].join(';'), keyTimes: ['0', t.toFixed(2), (t + 0.06).toFixed(2), '1'].join(';'), dur: '5s', repeatCount: 'indefinite' }));
      svg.appendChild(rect);
    }
    svg.appendChild(label(x0, y0 + rows * (ch + gap) + 6, 'q0 = 语义（语言内容）   q1..q3 = 声学细节'));
    // 求和 -> 波形输出
    svg.appendChild(label(18, 210, '解码器累加编码 →'));
    var wy = 222, wx0 = 150, wlen = 350;
    function wavePath(amp) { var d = '', i; for (i = 0; i <= 70; i++) { var x = wx0 + wlen * i / 70; var y = wy + amp * Math.sin(i * 1.1) * (0.5 + 0.5 * Math.cos(i * 0.2)); d += (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1) + ' '; } return d; }
    var flat = ''; var k; for (k = 0; k <= 70; k++) { flat += (k ? 'L' : 'M') + (wx0 + wlen * k / 70).toFixed(1) + ' ' + wy + ' '; }
    var wave = svgEl('path', { d: flat, fill: 'none', stroke: 'var(--blueprint,#3553ff)', 'stroke-width': '1.6' });
    wave.appendChild(anim({ attributeName: 'd', values: [flat, flat, wavePath(14), wavePath(11)].join(';'), keyTimes: '0;0.7;0.88;1', dur: '5s', repeatCount: 'indefinite' }));
    svg.appendChild(wave);
    host.appendChild(shell('神经编解码词元（Neural Codec Tokens）', '从 RVQ 码本恢复波形',
      svg,
      '神经音频编解码器（Neural Audio Codec）通过残差向量量化（Residual Vector Quantization，RVQ）将声音离散化：第一个码本（Codebook）表示主要信号，后续码本依次量化剩余残差。将第一个码本分离为语义部分，即金色的语言内容，再与其余声学信息区分开，Transformer 就能像预测文本词元一样预测语音词元。解码器把每帧选中的编码相加，恢复波形。'));
  }

  // ── sp-vad-cascade: 按语音/静音对波形门控，带延迟保持计时器（Hangover timer） ──
  function vadCascade(host) {
    var W = 520, H = 230, PAD = 18;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var wy = 70, wlen = W - 2 * PAD;
    svg.appendChild(label(PAD, 28, '这 20 毫秒是否包含语音？Silero VAD 逐帧判断'));
    // 各段：静音、语音、短暂停顿、语音、长静音（话轮结束（Turn end））
    var segs = [[0, 0.12, 0], [0.12, 0.42, 1], [0.42, 0.5, 0], [0.5, 0.74, 1], [0.74, 1, 0]];
    segs.forEach(function (s) {
      var sx = PAD + s[0] * wlen, ex = PAD + s[1] * wlen;
      var d = '', i, npts = Math.max(2, Math.round((s[1] - s[0]) * 90));
      for (i = 0; i <= npts; i++) { var x = sx + (ex - sx) * i / npts; var amp = s[2] ? 22 * Math.sin(i * 1.4) * (0.6 + 0.4 * Math.sin(i * 0.3)) : 1.5 * Math.sin(i * 2.0); d += (i ? 'L' : 'M') + x.toFixed(1) + ' ' + (wy + amp).toFixed(1) + ' '; }
      svg.appendChild(svgEl('path', { d: d, fill: 'none', stroke: s[2] ? 'var(--blueprint,#3553ff)' : 'var(--rule-soft,#bbb)', 'stroke-width': s[2] ? '1.6' : '1' }));
    });
    // 语音活动检测（VAD）决策泳道
    svg.appendChild(label(PAD, 128, '语音活动检测（VAD）结果'));
    segs.forEach(function (s) {
      var sx = PAD + s[0] * wlen;
      svg.appendChild(svgEl('rect', { x: sx, y: 136, width: (s[1] - s[0]) * wlen - 2, height: 16, fill: s[2] ? 'var(--blueprint,#3553ff)' : 'var(--rule-soft,#eee)', opacity: s[2] ? '0.8' : '0.6' }));
    });
    // 最终静音期间延迟保持计时器填满，随后触发话轮结束
    svg.appendChild(label(PAD, 178, '静音延迟保持 → 触发轮次结束'));
    var hbX = PAD + 0.74 * wlen, hbW = 0.26 * wlen - 4;
    svg.appendChild(svgEl('rect', { x: hbX, y: 186, width: hbW, height: 14, fill: 'none', stroke: 'var(--rule-soft,#ccc)', 'stroke-width': '1' }));
    var fill = svgEl('rect', { x: hbX, y: 186, width: '0', height: 14, fill: 'var(--warn,#b8870f)', opacity: '0.7' });
    fill.appendChild(anim({ attributeName: 'width', values: ['0', '0', hbW.toFixed(0), hbW.toFixed(0)].join(';'), keyTimes: '0;0.74;0.95;1', dur: '5s', repeatCount: 'indefinite' }));
    svg.appendChild(fill);
    var fire = svgEl('circle', { cx: hbX + hbW + 8, cy: 193, r: '5', fill: 'var(--warn,#b8870f)', opacity: '0' });
    fire.appendChild(anim({ attributeName: 'opacity', values: '0;0;1;0', keyTimes: '0;0.94;0.96;1', dur: '5s', repeatCount: 'indefinite' }));
    svg.appendChild(fire);
    host.appendChild(shell('语音活动检测（VAD）+ 轮次交替（Turn-taking）', '语音、停顿、延迟保持、轮次结束',
      svg,
      '检测器将每个 20 毫秒帧标为语音或静音。句中的短暂停顿不应结束轮次，因此要等静音延迟保持（Hangover）计时完成，才触发端点检测（Endpointing）。时间设得太短，会打断用户；设得太长，助手就一直等待。只有持续静音超过计时阈值，才结束这一轮。'));
  }

  // ── sp-fullduplex: 两条并行音频流加上内心独白（Inner-monologue）文本 ──
  function fullDuplex(host) {
    var W = 520, H = 230, PAD = 18;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var wlen = W - 2 * PAD;
    function wavePath(yc, amp, freq, phase) { var d = '', i; for (i = 0; i <= 90; i++) { var x = PAD + wlen * i / 90; var y = yc + amp * Math.sin(i * freq + phase) * (0.55 + 0.45 * Math.sin(i * 0.12 + phase)); d += (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1) + ' '; } return d; }
    // 用户输入流，持续到达
    svg.appendChild(label(PAD, 26, '用户音频输入：Mimi 词元持续到达'));
    var inW = svgEl('path', { d: wavePath(54, 16, 1.0, 0), fill: 'none', stroke: 'var(--ink-mute,#999)', 'stroke-width': '1.6' });
    inW.appendChild(anim({ attributeName: 'd', values: [wavePath(54, 16, 1.0, 0), wavePath(54, 16, 1.0, 1.6), wavePath(54, 16, 1.0, 3.2)].join(';'), keyTimes: '0;0.5;1', dur: '4s', repeatCount: 'indefinite' }));
    svg.appendChild(inW);
    // 内心独白文本泳道，作为中间表示
    svg.appendChild(label(PAD, 110, '内部独白文本：中间表示，并非独立阶段'));
    ['the', 'weather', 'is', 'sunny', 'today'].forEach(function (w, i) {
      var bx = PAD + i * 96;
      var g = svgEl('text', { x: bx, y: 134, fill: 'var(--blueprint,#3553ff)', 'font-size': '13', 'font-family': 'monospace', opacity: '0' }, [tx(w)]);
      g.appendChild(anim({ attributeName: 'opacity', values: '0;0;1;1', keyTimes: ['0', (0.1 + i * 0.13).toFixed(2), (0.2 + i * 0.13).toFixed(2), '1'].join(';'), dur: '4s', repeatCount: 'indefinite' }));
      svg.appendChild(g);
    });
    // 模型自身的输出流，同时生成
    svg.appendChild(label(PAD, 176, '模型音频输出：与输入同时进行，实现全双工'));
    var outW = svgEl('path', { d: wavePath(202, 0, 1.3, 0), fill: 'none', stroke: 'var(--blueprint,#3553ff)', 'stroke-width': '1.6' });
    outW.appendChild(anim({ attributeName: 'd', values: [wavePath(202, 0, 1.3, 0), wavePath(202, 0, 1.3, 0), wavePath(202, 18, 1.3, 1.2), wavePath(202, 14, 1.3, 2.4)].join(';'), keyTimes: '0;0.3;0.65;1', dur: '4s', repeatCount: 'indefinite' }));
    svg.appendChild(outW);
    host.appendChild(shell('全双工语音（Full-duplex Speech）', '同时听与说',
      svg,
      '流水线式语音智能体的每个阶段都要等待前一阶段，因此存在延迟下限。全双工模型（Full-duplex Model）将这条流水线合并：一边接收用户输入流，一边输出自己的音频流；文本形式的内部独白（Inner Monologue）作为中间表示，而非必须等待完成的独立阶段。听与说在时间上重叠，因而有可能实现 200 毫秒响应延迟。'));
  }

  // ── sp-wer-align: 参考文本（Reference）与假设文本（Hypothesis）的编辑距离（Edit-distance）对齐 ──
  function werAlign(host) {
    var svg = svgEl('svg', { viewBox: '0 0 520 220' });
    // ref 与 hyp 对比，包含一次替换、一次删除、一次插入
    var cols = [
      { ref: 'turn', hyp: 'turn', op: 'ok' },
      { ref: 'on', hyp: 'on', op: 'ok' },
      { ref: 'the', hyp: '', op: 'del' },
      { ref: 'kitchen', hyp: 'chicken', op: 'sub' },
      { ref: '', hyp: 'now', op: 'ins' },
      { ref: 'lights', hyp: 'lights', op: 'ok' }
    ];
    var n = cols.length, cw = 80, x0 = 14;
    svg.appendChild(label(x0, 26, '参考文本（Reference）'));
    svg.appendChild(label(x0, 150, '识别假设（Hypothesis）：ASR 输出'));
    var colors = { ok: 'var(--blueprint,#3553ff)', sub: 'var(--warn,#b8870f)', del: 'var(--ink-mute,#999)', ins: 'var(--warn,#b8870f)' };
    cols.forEach(function (c, i) {
      var cx = x0 + i * cw;
      if (c.ref) {
        svg.appendChild(svgEl('rect', { x: cx, y: 36, width: cw - 8, height: 26, fill: 'var(--rule-soft,#eee)', rx: '2' }));
        svg.appendChild(svgEl('text', { x: cx + (cw - 8) / 2, y: 54, fill: 'var(--ink,#222)', 'font-size': '11', 'font-family': 'monospace', 'text-anchor': 'middle' }, [tx(c.ref)]));
      }
      if (c.hyp) {
        svg.appendChild(svgEl('rect', { x: cx, y: 160, width: cw - 8, height: 26, fill: c.op === 'ok' ? 'var(--rule-soft,#eee)' : 'rgba(184,135,15,0.18)', rx: '2' }));
        svg.appendChild(svgEl('text', { x: cx + (cw - 8) / 2, y: 178, fill: 'var(--ink,#222)', 'font-size': '11', 'font-family': 'monospace', 'text-anchor': 'middle' }, [tx(c.hyp)]));
      }
      // 依次绘制对齐连接
      var lk = svgEl('line', { x1: cx + (cw - 8) / 2, y1: 64, x2: cx + (cw - 8) / 2, y2: 158, stroke: colors[c.op], 'stroke-width': c.op === 'ok' ? '1.5' : '2', 'stroke-dasharray': c.op === 'ok' ? '0' : '4 3', opacity: '0' });
      lk.appendChild(anim({ attributeName: 'opacity', values: '0;0;1;1', keyTimes: ['0', (0.1 + i * 0.12).toFixed(2), (0.2 + i * 0.12).toFixed(2), '1'].join(';'), dur: '5s', repeatCount: 'indefinite' }));
      svg.appendChild(lk);
      if (c.op !== 'ok') {
        var tag = svgEl('text', { x: cx + (cw - 8) / 2, y: 116, fill: colors[c.op], 'font-size': '9', 'font-family': 'monospace', 'text-anchor': 'middle', opacity: '0' }, [tx(c.op.toUpperCase())]);
        tag.appendChild(anim({ attributeName: 'opacity', values: '0;0;1;1', keyTimes: ['0', (0.2 + i * 0.12).toFixed(2), (0.3 + i * 0.12).toFixed(2), '1'].join(';'), dur: '5s', repeatCount: 'indefinite' }));
        svg.appendChild(tag);
      }
    });
    svg.appendChild(label(x0, 210, 'WER = (S + D + I) / N = (1 + 1 + 1) / 5 = 60%'));
    host.appendChild(shell('词错误率（Word Error Rate）', '对齐参考文本与识别结果',
      svg,
      '词错误率（Word Error Rate，WER）基于编辑距离（Edit Distance）。将转写结果与参考文本逐词对齐，把每个不匹配项计为替换（Substitution，SUB）、删除（Deletion，DEL）或插入（Insertion，INS）。三者之和除以参考词数，就是 WER。图中参考文本有五个词，发生一次替换（kitchen 变为 chicken）、一次删除（the）和一次插入（now），因此 WER 为 60%。'));
  }

  // ── sp-voice-factorize: 分离内容（Content）与说话人（Speaker），替换说话人后重组 ──
  function voiceFactorize(host) {
    var svg = svgEl('svg', { viewBox: '0 0 520 240' });
    var wlen = 150;
    function wavePath(x0, yc, amp, freq, phase) { var d = '', i; for (i = 0; i <= 50; i++) { var x = x0 + wlen * i / 50; var y = yc + amp * Math.sin(i * freq + phase) * (0.5 + 0.5 * Math.sin(i * 0.18)); d += (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1) + ' '; } return d; }
    // 左侧源片段（Source clip）
    svg.appendChild(label(18, 24, '源音频：A 说 "hello"'));
    svg.appendChild(svgEl('path', { d: wavePath(18, 56, 16, 1.1, 0), fill: 'none', stroke: 'var(--ink-mute,#999)', 'stroke-width': '1.6' }));
    // 分解为内容词元与说话人 A 的嵌入（Embedding）
    svg.appendChild(label(210, 24, '分解'));
    var cTok = svgEl('rect', { x: 210, y: 40, width: 92, height: 22, fill: 'var(--blueprint,#3553ff)', opacity: '0', rx: '2' });
    cTok.appendChild(anim({ attributeName: 'opacity', values: '0;0;0.7;0.7', keyTimes: '0;0.18;0.3;1', dur: '6s', repeatCount: 'indefinite' }));
    svg.appendChild(cTok);
    var cLab = svgEl('text', { x: 256, y: 55, fill: 'var(--bg,#fff)', 'font-size': '10', 'font-family': 'monospace', 'text-anchor': 'middle', opacity: '0' }, [tx('内容（Content）')]);
    cLab.appendChild(anim({ attributeName: 'opacity', values: '0;0;1;1', keyTimes: '0;0.18;0.3;1', dur: '6s', repeatCount: 'indefinite' }));
    svg.appendChild(cLab);
    var spkA = svgEl('circle', { cx: 256, cy: 92, r: '14', fill: 'var(--ink-mute,#999)', opacity: '0' });
    spkA.appendChild(anim({ attributeName: 'opacity', values: '0;0;0.8;0.8;0.25;0.25', keyTimes: '0;0.18;0.3;0.45;0.55;1', dur: '6s', repeatCount: 'indefinite' }));
    svg.appendChild(spkA);
    svg.appendChild(label(238, 120, '说话人 A：移除'));
    // 换入参考说话人 B 的嵌入
    svg.appendChild(label(18, 150, '参考音频：B 的 5 秒语音'));
    var spkB = svgEl('circle', { cx: 256, cy: 92, r: '14', fill: 'var(--warn,#b8870f)', opacity: '0' });
    spkB.appendChild(anim({ attributeName: 'opacity', values: '0;0;0;0.85;0.85', keyTimes: '0;0.45;0.5;0.6;1', dur: '6s', repeatCount: 'indefinite' }));
    svg.appendChild(spkB);
    var swap = svgEl('path', { d: 'M 110 168 Q 200 150 244 100', fill: 'none', stroke: 'var(--warn,#b8870f)', 'stroke-width': '1.5', 'stroke-dasharray': '4 3', opacity: '0' });
    swap.appendChild(anim({ attributeName: 'opacity', values: '0;0;0.9;0.9;0;0', keyTimes: '0;0.45;0.55;0.7;0.8;1', dur: '6s', repeatCount: 'indefinite' }));
    svg.appendChild(swap);
    // 重组 -> 输出 B 声音的波形
    svg.appendChild(label(330, 24, '重组 → B 说 "hello"'));
    var out = svgEl('path', { d: wavePath(338, 92, 0, 1.4, 0), fill: 'none', stroke: 'var(--blueprint,#3553ff)', 'stroke-width': '1.6' });
    out.appendChild(anim({ attributeName: 'd', values: [wavePath(338, 92, 0, 1.4, 0), wavePath(338, 92, 0, 1.4, 0), wavePath(338, 92, 17, 1.4, 0.5)].join(';'), keyTimes: '0;0.65;1', dur: '6s', repeatCount: 'indefinite' }));
    svg.appendChild(out);
    svg.appendChild(label(18, 220, '内容不变，替换说话人身份；必须加入不可听水印'));
    host.appendChild(shell('语音因素分解（Voice Factorization）', '分解、替换说话人、重组',
      svg,
      '语音克隆（Voice Cloning）和语音转换（Voice Conversion）都依赖同一种分解：将“说了什么”与“谁在说”分离。源音频被拆成内容表示（Content Representation）和说话人嵌入（Speaker Embedding），移除源说话人后，换入从 B 的五秒语音中提取的参考嵌入。内容与新说话人重组后，就像 B 说出了同样的话，因此必须设置授权同意检查并加入水印（Watermark）。'));
  }

  LF.register({
    'sp-asr-attention': asrAttention,
    'sp-eer-crossover': eerCrossover,
    'sp-tts-stack': ttsStack,
    'sp-codec-tokens': codecTokens,
    'sp-vad-cascade': vadCascade,
    'sp-fullduplex': fullDuplex,
    'sp-wer-align': werAlign,
    'sp-voice-factorize': voiceFactorize
  });
})();
