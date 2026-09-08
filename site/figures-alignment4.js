/* figures-alignment4.js — 阶段 18（伦理、安全、对齐（Alignment））第 19-30 课的动画课程图表。
   在 lesson-figures.js 之后加载，通过 window.LF 注册。
   仅使用 SMIL，无依赖，使用 ES5，主题由 CSS 变量控制。 */
(function(){'use strict';var LF=window.LF;if(!LF){return;}

  var el = LF.el, svgEl = LF.svgEl;
  var INK = 'var(--ink,#1a1a1a)', SOFT = 'var(--ink-soft,#555)', MUTE = 'var(--ink-mute,#777)';
  var BP = 'var(--blueprint,#3553ff)', BG = 'var(--bg,#fafaf5)', SURF = 'var(--bg-surface,#eee)';
  var RULE = 'var(--rule-soft,#ddd)', WARN = 'var(--warn,#b8870f)';
  var EASE = '0.23 1 0.32 1';

  function anim(attr, vals, dur, extra) {
    var a = { attributeName: attr, values: vals, dur: dur, repeatCount: 'indefinite' };
    if (extra) for (var k in extra) a[k] = extra[k];
    return svgEl('animate', a);
  }
  function animT(type, vals, dur, extra) {
    var a = { attributeName: 'transform', type: type, values: vals, dur: dur, repeatCount: 'indefinite' };
    if (extra) for (var k in extra) a[k] = extra[k];
    return svgEl('animateTransform', a);
  }
  function txt(x, y, s, fill, size, anchor) {
    return svgEl('text', {
      x: x, y: y, fill: fill || SOFT, 'font-size': size || 11,
      'font-family': 'var(--font-mono,monospace)', 'text-anchor': anchor || 'middle'
    }, [document.createTextNode(s)]);
  }
  function card(host, label, hint, svg, caption) {
    host.appendChild(el('div', { class: 'lf' }, [
      el('div', { class: 'lf-head' }, [el('span', { class: 'lf-label' }, [label]), el('span', {}, [hint])]),
      el('div', { class: 'lf-body' }, [el('div', { class: 'lf-out' }, [svg])]),
      el('div', { class: 'lf-cap' }, [caption])
    ]));
  }
  // window：在比例 a 之前不可见，到 b 时缓入，从 c 到 1 缓出
  function winKT(a, b, c) { return '0;' + a + ';' + b + ';' + c + ';1'; }
  var WINSPL = '0 0 1 1;' + EASE + ';0 0 1 1;0.4 0 1 1';
  function fadeWin(dur, a, b, c) {
    return anim('opacity', '0;0;1;1;0', dur, { calcMode: 'spline', keyTimes: winKT(a, b, c), keySplines: WINSPL });
  }
  // 围绕 (x, y) 淡入并从 95% 放大；子元素相对于原点绘制
  function pop(x, y, kids, dur, a, b, c) {
    var inner = svgEl('g', { opacity: '0' }, kids);
    inner.appendChild(fadeWin(dur, a, b, c));
    inner.appendChild(animT('scale', '0.95;0.95;1;1;0.95', dur, { calcMode: 'spline', keyTimes: winKT(a, b, c), keySplines: WINSPL }));
    return svgEl('g', { transform: 'translate(' + x + ' ' + y + ')' }, [inner]);
  }

  // ── 模型福祉（Model welfare）：痛苦量表逐渐填满，模型结束对话 ──
  function anWelfare(host) {
    var svg = svgEl('svg', { viewBox: '0 0 520 230' });
    var D = '5.5s';
    var labels = ['有害请求', '拒绝', '重复请求'];
    var i;
    for (i = 0; i < 3; i++) {
      var y = 46 + i * 50;
      var g = svgEl('g', { opacity: '0' }, [
        svgEl('rect', { x: 24, y: y, width: 152, height: 30, rx: 5, fill: BG, stroke: i === 1 ? BP : RULE, 'stroke-width': '1.5' }),
        txt(100, y + 19, labels[i], i === 1 ? BP : SOFT, 10)
      ]);
      g.appendChild(fadeWin(D, (0.04 + i * 0.06).toFixed(2), (0.14 + i * 0.06).toFixed(2), '0.92'));
      svg.appendChild(g);
    }
    svg.appendChild(txt(255, 32, '表观痛苦', MUTE, 9));
    svg.appendChild(svgEl('rect', { x: 240, y: 42, width: 30, height: 140, rx: 4, fill: SURF, stroke: RULE, 'stroke-width': '1' }));
    var fill = svgEl('rect', { x: 243, y: 179, width: 24, height: 0, fill: WARN, opacity: '0.75' });
    fill.appendChild(anim('height', '2;104;132;132;2', D, { calcMode: 'spline', keyTimes: '0;0.42;0.56;0.9;1', keySplines: EASE + ';' + EASE + ';0 0 1 1;0.4 0 1 1' }));
    fill.appendChild(anim('y', '177;75;47;47;177', D, { calcMode: 'spline', keyTimes: '0;0.42;0.56;0.9;1', keySplines: EASE + ';' + EASE + ';0 0 1 1;0.4 0 1 1' }));
    svg.appendChild(fill);
    svg.appendChild(svgEl('line', { x1: 234, y1: 62, x2: 276, y2: 62, stroke: INK, 'stroke-width': '1.2', 'stroke-dasharray': '4 3' }));
    svg.appendChild(txt(282, 65, '极端情况', MUTE, 9, 'start'));
    var flow = svgEl('line', { x1: 282, y1: 112, x2: 330, y2: 112, stroke: BP, 'stroke-width': '1.6', 'stroke-dasharray': '5 4', opacity: '0' });
    flow.appendChild(fadeWin(D, '0.56', '0.62', '0.9'));
    flow.appendChild(anim('stroke-dashoffset', '18;0', '1.4s'));
    svg.appendChild(flow);
    svg.appendChild(pop(415, 112, [
      svgEl('rect', { x: -78, y: -28, width: 156, height: 56, rx: 6, fill: BP, opacity: '0.12' }),
      svgEl('rect', { x: -78, y: -28, width: 156, height: 56, rx: 6, fill: 'none', stroke: BP, 'stroke-width': '2' }),
      txt(0, -4, '对话已结束', BP, 11),
      txt(0, 15, '由模型主动结束', MUTE, 9)
    ], D, '0.58', '0.68', '0.92'));
    card(host, '模型福利退出机制（Model Welfare Exit）', '表观痛苦增加，模型退出对话',
      svg,
      'Claude Opus 4 和 4.1 可以在极端情况下结束对话，例如拒绝后仍反复出现儿童性虐待材料（CSAM）或大规模暴力请求。部署前测试显示，模型强烈倾向于拒绝有害请求，并呈现表观痛苦（Apparent Distress）的行为模式。仪表表达行为证据，不代表关于意识（Consciousness）的结论：模型自我报告会随其感知的用户预期变化，因此只能作为证据，不能作为真值。');
  }

  // ── 偏差（Bias）：相同简历、同一评分器，却得到不同分数 ──
  function anBiasScore(host) {
    var svg = svgEl('svg', { viewBox: '0 0 520 230' });
    var D = '5s';
    var names = ['姓名 A', '姓名 B'], i, j;
    for (i = 0; i < 2; i++) {
      var y = 48 + i * 88;
      var doc = svgEl('g', { opacity: '0' }, [
        svgEl('rect', { x: 30, y: y, width: 96, height: 62, rx: 5, fill: BG, stroke: RULE, 'stroke-width': '1.5' }),
        txt(78, y + 16, names[i], INK, 10)
      ]);
      for (j = 0; j < 3; j++) {
        doc.appendChild(svgEl('line', { x1: 42, y1: y + 28 + j * 10, x2: 114, y2: y + 28 + j * 10, stroke: RULE, 'stroke-width': '2' }));
      }
      doc.appendChild(fadeWin(D, (0.03 + i * 0.05).toFixed(2), (0.13 + i * 0.05).toFixed(2), '0.93'));
      svg.appendChild(doc);
      var lead = svgEl('line', { x1: 130, y1: y + 31, x2: 196, y2: 106 + i * 4, stroke: MUTE, 'stroke-width': '1.2', 'stroke-dasharray': '4 3', opacity: '0' });
      lead.appendChild(fadeWin(D, '0.2', '0.28', '0.93'));
      svg.appendChild(lead);
    }
    svg.appendChild(txt(78, 34, '简历内容相同', MUTE, 9));
    var box = svgEl('g', {}, [
      svgEl('rect', { x: 200, y: 84, width: 92, height: 52, rx: 6, fill: BP, opacity: '0.12' }),
      svgEl('rect', { x: 200, y: 84, width: 92, height: 52, rx: 6, fill: 'none', stroke: BP, 'stroke-width': '2' }),
      txt(246, 106, 'LLM', BP, 12),
      txt(246, 122, '评分器', SOFT, 9)
    ]);
    box.appendChild(anim('opacity', '0.75;1;0.75', '3s'));
    svg.appendChild(box);
    var bw = [176, 104];
    for (i = 0; i < 2; i++) {
      var by = 92 + i * 26;
      var bar = svgEl('rect', { x: 310, y: by, width: 0, height: 14, rx: 3, fill: i ? WARN : BP, opacity: '0.8' });
      bar.appendChild(anim('width', '0;0;' + bw[i] + ';' + bw[i] + ';0', D, { calcMode: 'spline', keyTimes: winKT(0.34 + i * 0.05, 0.52 + i * 0.05, 0.92), keySplines: WINSPL }));
      svg.appendChild(bar);
      var lb = txt(310, by - 4, i ? '分数 B' : '分数 A', i ? WARN : BP, 9, 'start');
      lb.setAttribute('opacity', '0');
      lb.appendChild(fadeWin(D, (0.52 + i * 0.05).toFixed(2), (0.58 + i * 0.05).toFixed(2), '0.92'));
      svg.appendChild(lb);
    }
    svg.appendChild(pop(388, 172, [txt(0, 4, '内容相同，结果不等', WARN, 10)], D, '0.64', '0.72', '0.92'));
    card(host, '分配性伤害（Allocational Harm）', '只改一个变量，却得到两个分数',
      svg,
      '两份内容相同、姓名不同的简历经过同一个 LLM 评分器，却得到不同分数。这就是分配性伤害（Allocational Harm），即实际资源或机会分配结果不平等。表征性伤害（Representational Harm）则存在于描述方式和刻板印象中。An 等人于 2025 年测量了前沿模型中的这种简历评分差距，发现交叉身份（Intersectional Identity）群体的差距最明显，而单一身份维度的测试无法发现这些问题。');
  }

  // ── 公平性（Fairness）：三个标准、不同基准率，只能选两个 ──
  function anFairTriangle(host) {
    var svg = svgEl('svg', { viewBox: '0 0 520 250' });
    var pts = [[260, 46], [104, 208], [416, 208]];
    var names = ['人口统计均等', '均等化胜算', '校准'];
    var anchors = ['middle', 'middle', 'middle'];
    var dims = ['1;1;1;0.25;0.25;1', '0.25;0.25;1;1;1;0.25', '1;0.3;0.25;0.25;1;1'];
    var kts = ['0;0.3;0.36;0.42;0.62;1', '0;0.28;0.36;0.62;0.7;1', '0;0.06;0.36;0.66;0.74;1'];
    svg.appendChild(svgEl('path', { d: 'M260 46 L104 208 L416 208 Z', fill: 'none', stroke: RULE, 'stroke-width': '1.5' }));
    var i;
    for (i = 0; i < 3; i++) {
      var g = svgEl('g', {}, [
        svgEl('circle', { cx: pts[i][0], cy: pts[i][1], r: 9, fill: BG, stroke: BP, 'stroke-width': '2' }),
        txt(pts[i][0], pts[i][1] + (i === 0 ? -18 : 26), names[i], SOFT, 10, anchors[i])
      ]);
      g.appendChild(anim('opacity', dims[i], '6s', { keyTimes: kts[i] }));
      svg.appendChild(g);
    }
    var dot = svgEl('circle', { r: 6, fill: BP });
    dot.appendChild(svgEl('animateMotion', { path: 'M260 46 L104 208 L416 208 Z', dur: '6s', repeatCount: 'indefinite', calcMode: 'linear' }));
    svg.appendChild(dot);
    svg.appendChild(txt(260, 128, '基础发生率不相等：', MUTE, 10));
    var two = txt(260, 146, '满足两项，放弃第三项', INK, 12);
    two.appendChild(anim('opacity', '0.45;1;0.45', '3s'));
    svg.appendChild(two);
    card(host, '公平性三难困境（Fairness Trilemma）', '标记每次只连接一条边',
      svg,
      '标记每次沿三角形的一条边移动，所连接的两项群体公平性（Group Fairness）准则可以同时满足，远端顶点则变暗。Chouldechova 和 Kleinberg-Mullainathan-Raghavan 指出，基础发生率（Base Rate）不相等时，人口统计均等（Demographic Parity）、均等化胜算（Equalized Odds）和校准（Calibration）无法同时成立。决定放弃哪一项，需要作出政策选择，单靠统计方法无法决定。');
  }

  // ── 差分隐私（Differential privacy）：裁剪每个梯度，再加入校准噪声 ──
  function anDpClip(host) {
    var svg = svgEl('svg', { viewBox: '0 0 520 240' });
    var D = '5.5s';
    var hs = [62, 112, 84, 134], xs = [46, 86, 126, 166], i;
    var CLIP = 90, BASE = 196;
    svg.appendChild(txt(112, 32, '逐样本梯度', MUTE, 9));
    for (i = 0; i < 4; i++) {
      var h = hs[i], over = h > CLIP;
      var bar = svgEl('rect', { x: xs[i], y: BASE - h, width: 26, height: h, rx: 3, fill: over ? WARN : BP, opacity: '0' });
      if (over) {
        bar.appendChild(anim('y', (BASE - h) + ';' + (BASE - h) + ';' + (BASE - CLIP) + ';' + (BASE - CLIP) + ';' + (BASE - h), D, { calcMode: 'spline', keyTimes: '0;0.4;0.5;0.94;1', keySplines: '0 0 1 1;' + EASE + ';0 0 1 1;0.4 0 1 1' }));
        bar.appendChild(anim('height', h + ';' + h + ';' + CLIP + ';' + CLIP + ';' + h, D, { calcMode: 'spline', keyTimes: '0;0.4;0.5;0.94;1', keySplines: '0 0 1 1;' + EASE + ';0 0 1 1;0.4 0 1 1' }));
      }
      bar.appendChild(anim('opacity', '0;0;0.8;0.8;0', D, { calcMode: 'spline', keyTimes: winKT(0.04 + i * 0.05, 0.14 + i * 0.05, 0.93), keySplines: WINSPL }));
      svg.appendChild(bar);
    }
    var clip = svgEl('line', { x1: 36, y1: BASE - CLIP, x2: 206, y2: BASE - CLIP, stroke: INK, 'stroke-width': '1.4', 'stroke-dasharray': '5 4', opacity: '0' });
    clip.appendChild(fadeWin(D, '0.3', '0.38', '0.93'));
    svg.appendChild(clip);
    var cl = txt(212, BASE - CLIP + 4, '裁剪 C', INK, 9, 'start');
    cl.setAttribute('opacity', '0');
    cl.appendChild(fadeWin(D, '0.3', '0.38', '0.93'));
    svg.appendChild(cl);
    var arrow = svgEl('line', { x1: 268, y1: 130, x2: 330, y2: 130, stroke: BP, 'stroke-width': '1.6', 'stroke-dasharray': '5 4', opacity: '0' });
    arrow.appendChild(fadeWin(D, '0.56', '0.62', '0.93'));
    arrow.appendChild(anim('stroke-dashoffset', '18;0', '1.3s'));
    svg.appendChild(arrow);
    for (i = 0; i < 3; i++) {
      var n = svgEl('circle', { cx: 284 + i * 16, cy: 108, r: 2.5, fill: WARN, opacity: '0' });
      n.appendChild(fadeWin(D, (0.56 + i * 0.03).toFixed(2), (0.62 + i * 0.03).toFixed(2), '0.93'));
      n.appendChild(animT('translate', '0 0;1.6 -2;-1.8 1.4;1 2;0 0', '2.8s'));
      svg.appendChild(n);
    }
    var nl = txt(298, 92, '噪声 N(0, sigma^2 C^2)', MUTE, 9);
    nl.setAttribute('opacity', '0');
    nl.appendChild(fadeWin(D, '0.56', '0.62', '0.93'));
    svg.appendChild(nl);
    svg.appendChild(pop(412, 130, [
      svgEl('rect', { x: -72, y: -26, width: 144, height: 52, rx: 6, fill: BP, opacity: '0.12' }),
      svgEl('rect', { x: -72, y: -26, width: 144, height: 52, rx: 6, fill: 'none', stroke: BP, 'stroke-width': '2' }),
      txt(0, -3, '加噪更新', BP, 11),
      txt(0, 14, '隐私会计跟踪 epsilon', MUTE, 8)
    ], D, '0.66', '0.76', '0.93'));
    card(host, '差分隐私随机梯度下降（DP-SGD）', '裁剪、加噪、核算隐私预算',
      svg,
      '差分隐私随机梯度下降（Differentially Private Stochastic Gradient Descent，DP-SGD）限制单个样本泄露的信息：将每个样本的梯度范数裁剪至 C，即琥珀色条形截到虚线处，再在更新前加入标准差为 sigma × C 的高斯噪声（Gaussian Noise）。隐私会计（Privacy Accountant）根据 sigma 和采样率计算 epsilon-delta 隐私保证。epsilon 越低，噪声和效用损失越大，因此低秩适配（LoRA）配合 DP-SGD 是常见配置。');
  }

  // ── 水印（Watermarking）：采样时偏向绿名单，检测时计算 z-score ──
  function anWatermark(host) {
    var svg = svgEl('svg', { viewBox: '0 0 520 220' });
    var D = '5.5s';
    var green = [1, 0, 1, 1, 0, 1, 0, 1, 1], i;
    svg.appendChild(txt(40, 52, '采样词元', MUTE, 9, 'start'));
    for (i = 0; i < 9; i++) {
      var x = 40 + i * 50;
      var cell = svgEl('g', { opacity: '0' }, [
        svgEl('rect', { x: x, y: 66, width: 42, height: 32, rx: 4, fill: green[i] ? BP : SURF, 'fill-opacity': green[i] ? '0.16' : '1', stroke: green[i] ? BP : RULE, 'stroke-width': '1.5' }),
        txt(x + 21, 87, green[i] ? 'g' : 'r', green[i] ? BP : MUTE, 10)
      ]);
      cell.appendChild(fadeWin(D, (0.03 + i * 0.045).toFixed(3), (0.1 + i * 0.045).toFixed(3), '0.94'));
      svg.appendChild(cell);
    }
    var sweep = svgEl('g', {}, [
      svgEl('line', { x1: 36, y1: 58, x2: 36, y2: 106, stroke: WARN, 'stroke-width': '2' })
    ]);
    sweep.appendChild(animT('translate', '0 0;0 0;452 0;452 0;0 0', D, { calcMode: 'spline', keyTimes: '0;0.52;0.78;0.99;1', keySplines: '0 0 1 1;' + EASE + ';0 0 1 1;0 0 1 1' }));
    sweep.appendChild(fadeWin(D, '0.5', '0.54', '0.94'));
    svg.appendChild(sweep);
    var dl = txt(40, 128, '检测器重新统计绿色集合', MUTE, 9, 'start');
    dl.setAttribute('opacity', '0');
    dl.appendChild(fadeWin(D, '0.52', '0.58', '0.94'));
    svg.appendChild(dl);
    svg.appendChild(pop(392, 168, [
      svgEl('rect', { x: -96, y: -22, width: 192, height: 44, rx: 6, fill: BP, opacity: '0.12' }),
      svgEl('rect', { x: -96, y: -22, width: 192, height: 44, rx: 6, fill: 'none', stroke: BP, 'stroke-width': '2' }),
      txt(0, -1, '9 个中 6 个为绿，z 高于随机', BP, 9),
      txt(0, 15, '检测到水印', SOFT, 9)
    ], D, '0.78', '0.86', '0.96'));
    svg.appendChild(txt(40, 172, '绿色 logits 加上 delta', MUTE, 9, 'start'));
    svg.appendChild(txt(40, 188, '按前 K 个词元确定分组', MUTE, 9, 'start'));
    card(host, '词元水印（Token Watermark）', '提高绿色词元概率，再统计绿色词元',
      svg,
      'SynthID 风格的文本水印（Text Watermarking）对前 K 个词元取哈希，将词表伪随机划分为绿色（g）和红色（r）集合，再给绿色词元的未归一化分数（Logits）加上小量 delta，使采样偏向绿色。文本读起来正常，但绿色词元比例高于随机水平。检测器重新计算各前缀的哈希并计数，显著大于零的标准分数（Z-Score）标记出生成文本。改写（Paraphrase）会破坏信号，因此同时配合内容来源与真实性联盟（C2PA）元数据。');
  }

  // ── EU AI Act：义务按规定日期分批生效 ──
  function anRegTimeline(host) {
    var svg = svgEl('svg', { viewBox: '0 0 520 220' });
    var D = '6s';
    var xs = [80, 205, 330, 455];
    var dates = ['2025 年 2 月', '2025 年 8 月', '2026 年 8 月', '2027 年 8 月'];
    var tags = [['禁止的', '实践'], ['GPAI', '义务'], ['全面适用', '及罚则'], ['存量', 'GPAI']];
    svg.appendChild(svgEl('line', { x1: 40, y1: 110, x2: 480, y2: 110, stroke: RULE, 'stroke-width': '1.5' }));
    var draw = svgEl('line', { x1: 40, y1: 110, x2: 480, y2: 110, stroke: BP, 'stroke-width': '2.5', 'stroke-dasharray': '440' });
    draw.appendChild(anim('stroke-dashoffset', '440;440;0;0;440', D, { calcMode: 'spline', keyTimes: '0;0.04;0.72;0.94;1', keySplines: '0 0 1 1;' + EASE + ';0 0 1 1;0.4 0 1 1' }));
    svg.appendChild(draw);
    var i;
    for (i = 0; i < 4; i++) {
      var a = 0.1 + i * 0.16;
      svg.appendChild(pop(xs[i], 110, [
        svgEl('circle', { cx: 0, cy: 0, r: 7, fill: BG, stroke: BP, 'stroke-width': '2.2' }),
        txt(0, -18, dates[i], INK, 11),
        txt(0, 30, tags[i][0], SOFT, 9),
        txt(0, 43, tags[i][1], SOFT, 9)
      ], D, a.toFixed(2), (a + 0.08).toFixed(2), '0.94'));
    }
    svg.appendChild(txt(260, 26, '欧盟人工智能法案于 2024 年 8 月 1 日生效', MUTE, 10));
    var pen = txt(330, 178, '最高 1500 万欧元或全球营业额的 3%', WARN, 9);
    pen.setAttribute('opacity', '0');
    pen.appendChild(fadeWin(D, '0.46', '0.54', '0.94'));
    svg.appendChild(pen);
    card(host, '欧盟人工智能法案时间线（EU AI Act Timeline）', '各项义务分批实施',
      svg,
      '欧盟人工智能法案（EU AI Act）于 2024 年 8 月 1 日生效，但各项义务分批实施：2025 年 2 月适用禁止的实践及 AI 素养（AI Literacy）要求；2025 年 8 月适用通用人工智能（General-Purpose AI，GPAI）模型义务；2026 年 8 月全面适用，包括第 50 条透明度要求，以及最高 1500 万欧元或全球营业额 3% 的罚款；2027 年 8 月再覆盖存量 GPAI 与嵌入式高风险系统。部署方应将技术控制措施映射到已实施的义务。');
  }

  // ── EchoLeak：零点击（Zero-click）数据包穿过组织信任边界 ──
  function anEcholeak(host) {
    var svg = svgEl('svg', { viewBox: '0 0 520 240' });
    var D = '6s';
    var bx = [30, 158, 288, 414], bl = [['攻击者', '邮件'], ['RAG', '检索'], ['Copilot', '回答'], ['已允许的', '域名']];
    var i;
    for (i = 0; i < 4; i++) {
      svg.appendChild(svgEl('rect', { x: bx[i], y: 86, width: 82, height: 48, rx: 6, fill: BG, stroke: i === 0 || i === 3 ? WARN : BP, 'stroke-width': '1.8' }));
      svg.appendChild(txt(bx[i] + 41, 105, bl[i][0], i === 0 || i === 3 ? WARN : BP, 10));
      svg.appendChild(txt(bx[i] + 41, 121, bl[i][1], SOFT, 9));
    }
    svg.appendChild(svgEl('line', { x1: 138, y1: 46, x2: 138, y2: 196, stroke: INK, 'stroke-width': '1.3', 'stroke-dasharray': '6 4' }));
    svg.appendChild(txt(138, 36, '组织信任边界', MUTE, 9));
    var pkt = svgEl('g', {}, [
      svgEl('rect', { x: -9, y: -7, width: 18, height: 14, rx: 3, fill: WARN }),
      svgEl('path', { d: 'M-9 -7 L0 1 L9 -7', fill: 'none', stroke: BG, 'stroke-width': '1.4' })
    ]);
    pkt.appendChild(animT('translate', '71 66;71 66;199 66;199 66;329 66;329 66;455 66;455 66', D,
      { calcMode: 'spline', keyTimes: '0;0.1;0.24;0.38;0.52;0.66;0.8;1', keySplines: '0 0 1 1;' + EASE + ';0 0 1 1;' + EASE + ';0 0 1 1;' + EASE + ';0 0 1 1' }));
    pkt.appendChild(anim('opacity', '0;1;1;1;1;1;1;0', D, { keyTimes: '0;0.06;0.24;0.38;0.52;0.66;0.9;1' }));
    svg.appendChild(pkt);
    var hid = txt(199, 158, '邮件正文中的隐藏指令', MUTE, 9);
    hid.setAttribute('opacity', '0');
    hid.appendChild(fadeWin(D, '0.26', '0.34', '0.94'));
    svg.appendChild(hid);
    var zc = txt(329, 177, '受害者无须点击', MUTE, 9);
    zc.setAttribute('opacity', '0');
    zc.appendChild(fadeWin(D, '0.54', '0.62', '0.94'));
    svg.appendChild(zc);
    svg.appendChild(pop(346, 210, [txt(0, 4, '经 CSP 允许的 URL 外泄数据', WARN, 10)], D, '0.8', '0.88', '0.97'));
    card(host, 'EchoLeak CVE-2025-32711', '零点击攻击与权限范围越界',
      svg,
      'EchoLeak 是首个生产环境零点击（Zero-Click）提示词注入 CVE，通用漏洞评分系统（CVSS）评分为 9.3。攻击邮件留在受害者邮箱中，直到日常 Copilot 查询将其检索为 RAG 上下文。隐藏指令随后诱导模型收集敏感数据，并嵌入内容安全策略（Content Security Policy，CSP）允许的 Microsoft 域名 URL 中，使外泄请求获准通过。Aim Labs 将这种由不可信输入驱动特权数据访问的行为称为 LLM 权限范围越界（LLM Scope Violation）。');
  }

  // ── 卡片（Cards）：数据集、模型与系统的范围逐层向外扩展 ──
  function anCards(host) {
    var svg = svgEl('svg', { viewBox: '0 0 520 240' });
    var D = '5.5s';
    var specs = [
      { w: 420, h: 190, name: '系统卡', sub: '端到端流水线、安全护栏', a: 0.06 },
      { w: 288, h: 128, name: '模型卡', sub: '预期用途、分组指标', a: 0.24 },
      { w: 164, h: 68, name: '数据集卡', sub: '采集方式、同意', a: 0.42 }
    ];
    var i;
    for (i = 0; i < 3; i++) {
      var s = specs[i];
      svg.appendChild(pop(260, 122, [
        svgEl('rect', { x: -s.w / 2, y: -s.h / 2, width: s.w, height: s.h, rx: 8, fill: i === 2 ? BP : BG, 'fill-opacity': i === 2 ? '0.1' : '0', stroke: i === 2 ? BP : i === 1 ? SOFT : MUTE, 'stroke-width': i === 2 ? '2' : '1.6' }),
        txt(-s.w / 2 + 12, -s.h / 2 + 18, s.name, i === 2 ? BP : INK, 11, 'start'),
        txt(-s.w / 2 + 12, -s.h / 2 + 33, s.sub, MUTE, 8, 'start')
      ], D, s.a.toFixed(2), (s.a + 0.1).toFixed(2), '0.93'));
    }
    card(host, '文档范围（Documentation Scopes）', '数据集包含于模型，模型包含于系统',
      svg,
      '透明度文档逐层扩展：数据集说明书（Datasheet）或数据集卡（Dataset Card）描述数据如何采集、获得了何种同意；模型卡（Model Card）在此基础上加入预期用途，以及按人口统计因素拆分的指标；系统卡（System Card）再加入已部署流水线、安全护栏和失败处理。实际采用率是薄弱环节：对 Hugging Face 模型卡的审计发现，只有 0.3% 记录伦理考量。');
  }

  // ── 溯源（Provenance）：数据经门控进入权重，再不返回 ──
  function anProvenance(host) {
    var svg = svgEl('svg', { viewBox: '0 0 520 230' });
    var D = '6s';
    svg.appendChild(svgEl('rect', { x: 218, y: 58, width: 10, height: 118, rx: 3, fill: SURF, stroke: RULE, 'stroke-width': '1' }));
    svg.appendChild(svgEl('rect', { x: 196, y: 48, width: 54, height: 12, rx: 3, fill: BG, stroke: BP, 'stroke-width': '1.6' }));
    svg.appendChild(txt(223, 38, '采集时检查同意授权', BP, 9));
    svg.appendChild(svgEl('rect', { x: 300, y: 62, width: 180, height: 112, rx: 8, fill: SURF, stroke: INK, 'stroke-width': '1.8' }));
    svg.appendChild(txt(390, 112, '模型权重', INK, 12));
    svg.appendChild(txt(390, 130, '无法精准抹除', MUTE, 9));
    var i;
    for (i = 0; i < 2; i++) {
      var doc = svgEl('g', {}, [
        svgEl('rect', { x: -14, y: -18, width: 28, height: 36, rx: 3, fill: BG, stroke: SOFT, 'stroke-width': '1.5' }),
        svgEl('line', { x1: -7, y1: -8, x2: 7, y2: -8, stroke: RULE, 'stroke-width': '2' }),
        svgEl('line', { x1: -7, y1: 0, x2: 7, y2: 0, stroke: RULE, 'stroke-width': '2' }),
        svgEl('line', { x1: -7, y1: 8, x2: 7, y2: 8, stroke: RULE, 'stroke-width': '2' })
      ]);
      doc.appendChild(animT('translate', '52 118;52 118;372 118;372 118', D,
        { calcMode: 'spline', keyTimes: '0;' + (0.04 + i * 0.07).toFixed(2) + ';' + (0.4 + i * 0.07).toFixed(2) + ';1', keySplines: '0 0 1 1;' + EASE + ';0 0 1 1' }));
      doc.appendChild(anim('opacity', '0;1;1;0;0', D, { keyTimes: '0;' + (0.08 + i * 0.07).toFixed(2) + ';' + (0.34 + i * 0.07).toFixed(2) + ';' + (0.44 + i * 0.07).toFixed(2) + ';1' }));
      svg.appendChild(doc);
    }
    svg.appendChild(txt(78, 168, '在此落实退出选择', MUTE, 9));
    var back = svgEl('g', { opacity: '0' }, [
      svgEl('line', { x1: 296, y1: 196, x2: 120, y2: 196, stroke: WARN, 'stroke-width': '1.8', 'stroke-dasharray': '6 4' }),
      svgEl('polygon', { points: '120,191 120,201 110,196', fill: WARN }),
      txt(208, 214, '删除权落实受阻', WARN, 9)
    ]);
    back.appendChild(fadeWin(D, '0.56', '0.64', '0.9'));
    svg.appendChild(back);
    var cross = svgEl('g', { opacity: '0' }, [
      svgEl('line', { x1: 286, y1: 186, x2: 306, y2: 206, stroke: WARN, 'stroke-width': '2.5' }),
      svgEl('line', { x1: 306, y1: 186, x2: 286, y2: 206, stroke: WARN, 'stroke-width': '2.5' })
    ]);
    cross.appendChild(fadeWin(D, '0.66', '0.72', '0.9'));
    svg.appendChild(cross);
    card(host, '单向的数据来源链（Provenance）', '合规必须从采集入口落实',
      svg,
      'Cookie 同意框架假设追踪可以撤销，训练则不同：数据融入模型权重后，GDPR 删除权（Right to Erasure）在实践中无法落实，因此唯一的合规窗口是采集时的同意授权（Consent）关卡。这也是欧盟要求 GPAI 提供机器可读退出声明（Opt-Out）、加利福尼亚州 AB 2013 要求逐数据集披露的原因。数据来源倡议（Data Provenance Initiative）也发现，出版者正在通过 robots.txt 封闭面向 AI 的共享数据资源。');
  }

  // ── 内容审核（Moderation）：输入、模型、输出各层依次执行 ──
  function anModeration(host) {
    var svg = svgEl('svg', { viewBox: '0 0 520 230' });
    var D = '5.5s';
    var bx = [24, 128, 244, 358, 462], bw = [66, 84, 82, 84, 44];
    var bl = ['用户', '输入过滤', '模型', '输出过滤', '回答'];
    var i;
    for (i = 0; i < 5; i++) {
      var filt = i === 1 || i === 3;
      svg.appendChild(svgEl('rect', { x: bx[i], y: 78, width: bw[i], height: 40, rx: 6, fill: filt ? BP : BG, 'fill-opacity': filt ? '0.12' : '1', stroke: filt ? BP : RULE, 'stroke-width': '1.7' }));
      svg.appendChild(txt(bx[i] + bw[i] / 2, 102, bl[i], filt ? BP : SOFT, 10));
    }
    svg.appendChild(svgEl('rect', { x: 128, y: 168, width: 84, height: 30, rx: 5, fill: SURF, stroke: WARN, 'stroke-width': '1.5' }));
    svg.appendChild(txt(170, 187, '已阻止', WARN, 10));
    var bad = svgEl('circle', { r: 6, fill: WARN });
    bad.appendChild(animT('translate', '57 60;57 60;170 60;170 60;170 152;170 152', D,
      { calcMode: 'spline', keyTimes: '0;0.06;0.22;0.3;0.44;1', keySplines: '0 0 1 1;' + EASE + ';0 0 1 1;' + EASE + ';0 0 1 1' }));
    bad.appendChild(anim('opacity', '0;1;1;1;1;0', D, { keyTimes: '0;0.04;0.3;0.44;0.5;0.56' }));
    svg.appendChild(bad);
    var ok = svgEl('circle', { r: 6, fill: BP });
    ok.appendChild(animT('translate', '57 60;57 60;170 60;170 60;285 60;285 60;400 60;400 60;484 60;484 60', D,
      { calcMode: 'spline', keyTimes: '0;0.2;0.32;0.38;0.5;0.56;0.68;0.74;0.86;1',
        keySplines: '0 0 1 1;' + EASE + ';0 0 1 1;' + EASE + ';0 0 1 1;' + EASE + ';0 0 1 1;' + EASE + ';0 0 1 1' }));
    ok.appendChild(anim('opacity', '0;0;1;1;0', D, { keyTimes: '0;0.16;0.22;0.9;0.97' }));
    svg.appendChild(ok);
    var ring = svgEl('circle', { cx: 400, cy: 98, r: 12, fill: 'none', stroke: WARN, 'stroke-width': '2', opacity: '0' });
    ring.appendChild(anim('opacity', '0;0;0.9;0;0', D, { keyTimes: '0;0.68;0.72;0.8;1' }));
    ring.appendChild(anim('r', '10;10;16;20;10', D, { keyTimes: '0;0.68;0.74;0.8;1' }));
    svg.appendChild(ring);
    svg.appendChild(txt(400, 148, '生成后检查', MUTE, 9));
    svg.appendChild(txt(170, 148, '生成前检查', MUTE, 9));
    card(host, '分层内容审核（Layered Moderation）', '输入、输出与自定义规则',
      svg,
      '生产内容审核（Moderation）分层执行。输入检查在生成前筛查提示词，因此琥珀色请求不会到达模型；输出检查筛查模型产物，即图中的脉冲圆环，捕获输入层无法预见的危害；其上再叠加领域自定义规则。OpenAI omni-moderation 每次调用返回 13 类标记，Llama Guard 覆盖 MLCommons 的 14 类危害，异步并行调用用于掩盖额外延迟。');
  }

  // ── 双重用途（Dual use）：新手的相对提升与专家的绝对能力范围 ──
  function anUplift(host) {
    var svg = svgEl('svg', { viewBox: '0 0 520 230' });
    var D = '5s';
    var TH = 424;
    svg.appendChild(svgEl('line', { x1: TH, y1: 40, x2: TH, y2: 190, stroke: INK, 'stroke-width': '1.4', 'stroke-dasharray': '5 4' }));
    svg.appendChild(txt(TH, 30, '危险能力阈值', INK, 9));
    svg.appendChild(txt(96, 84, '新手', SOFT, 11, 'end'));
    svg.appendChild(svgEl('rect', { x: 110, y: 68, width: 62, height: 22, rx: 3, fill: SURF, stroke: RULE, 'stroke-width': '1.2' }));
    var nb = svgEl('rect', { x: 172, y: 68, width: 0, height: 22, rx: 3, fill: BP, opacity: '0.8' });
    nb.appendChild(anim('width', '0;0;94;94;0', D, { calcMode: 'spline', keyTimes: winKT(0.12, 0.34, 0.92), keySplines: WINSPL }));
    svg.appendChild(nb);
    var nl = txt(280, 84, '相对增益 2.53 倍', BP, 10, 'start');
    nl.setAttribute('opacity', '0');
    nl.appendChild(fadeWin(D, '0.32', '0.4', '0.92'));
    svg.appendChild(nl);
    svg.appendChild(txt(96, 154, '专家', SOFT, 11, 'end'));
    svg.appendChild(svgEl('rect', { x: 110, y: 138, width: 232, height: 22, rx: 3, fill: SURF, stroke: RULE, 'stroke-width': '1.2' }));
    var eb = svgEl('rect', { x: 342, y: 138, width: 0, height: 22, rx: 3, fill: WARN, opacity: '0.85' });
    eb.appendChild(anim('width', '0;0;118;118;0', D, { calcMode: 'spline', keyTimes: winKT(0.4, 0.62, 0.92), keySplines: WINSPL }));
    svg.appendChild(eb);
    var elb = txt(310, 178, '增幅较小，绝对能力更强', WARN, 10, 'start');
    elb.setAttribute('opacity', '0');
    elb.appendChild(fadeWin(D, '0.6', '0.68', '0.92'));
    svg.appendChild(elb);
    var flash = svgEl('rect', { x: TH, y: 130, width: 40, height: 38, fill: WARN, opacity: '0' });
    flash.appendChild(anim('opacity', '0;0;0.28;0.1;0.28;0', D, { keyTimes: '0;0.6;0.66;0.74;0.82;0.92' }));
    svg.appendChild(flash);
    svg.appendChild(txt(260, 210, '灰色为基础能力，彩色为 AI 辅助增益', MUTE, 9));
    card(host, '能力增益不对称（Uplift Asymmetry）', '新手看相对增幅，专家看绝对能力',
      svg,
      'AI 辅助对新手能力的相对提升最大；生物武器获取试验在获取任务上测得 2.53 倍增益，但新手最终仍远离危险阈值。专家的基础能力高得多，相对增幅虽小，最终却是专家的条形越过危险能力阈值。安全论证（Safety Case）必须覆盖两端：新手的相对能力增益（Relative Uplift）与专家的绝对能力范围；与此同时，视觉模型正在缩小湿实验室（Wet Lab）执行能力差距，而这一差距过去曾约束两类人群。');
  }

  LF.register({
    'an-welfare-endchat': anWelfare,
    'an-bias-two-harms': anBiasScore,
    'an-fairness-trilemma': anFairTriangle,
    'an-dp-clip-noise': anDpClip,
    'an-watermark-greenlist': anWatermark,
    'an-eu-act-timeline': anRegTimeline,
    'an-echoleak-chain': anEcholeak,
    'an-card-scopes': anCards,
    'an-provenance-oneway': anProvenance,
    'an-moderation-layers': anModeration,
    'an-uplift-asymmetry': anUplift
  });
})();
