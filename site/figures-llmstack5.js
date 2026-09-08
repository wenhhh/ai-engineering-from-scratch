/* figures-llmstack5.js：阶段 10（从零构建大语言模型（LLMs from scratch））、
   阶段 11（大语言模型工程（LLM engineering））与阶段 12（多模态 AI（Multimodal AI））的 SMIL 动画课程图表。
   在 lesson-figures.js 之后加载，通过 window.LF.register 注册。
   原生 ES5，无依赖，主题由 CSS 变量控制。每张图都是自动播放的
   SVG 动画，仅使用 SMIL，不使用 JS 循环驱动帧。编写方式：
       ```figure
       l5-data-pipeline
       ```  */
(function () {
  'use strict';
  var LF = window.LF;
  if (!LF) { return; }
  var el = LF.el, svgEl = LF.svgEl;

  var BP = 'var(--blueprint,#3553ff)';
  var INK = 'var(--ink,#1a1a1a)';
  var SOFT = 'var(--ink-soft,#555)';
  var MUTE = 'var(--ink-mute,#777)';
  var RULE = 'var(--rule-soft,#ddd)';
  var SURF = 'var(--bg-surface,#eee)';
  var WARN = 'var(--warn,#b8870f)';
  var MONO = 'var(--font-mono,monospace)';
  var EASE = '0.23 1 0.32 1';

  function anim(attr, vals, dur, extra) {
    var a = { attributeName: attr, values: vals, dur: dur, repeatCount: 'indefinite' };
    if (extra) { for (var k in extra) { a[k] = extra[k]; } }
    return svgEl('animate', a);
  }
  function txt(x, y, s, size, fill, anchor) {
    var a = { x: x, y: y, 'font-family': MONO, 'font-size': size, fill: fill };
    if (anchor) { a['text-anchor'] = anchor; }
    var t = svgEl('text', a);
    t.appendChild(document.createTextNode(s));
    return t;
  }
  function box(x, y, w, h, stroke, fill, sw) {
    return svgEl('rect', { x: x, y: y, width: w, height: h, rx: 4, fill: fill || 'none', stroke: stroke, 'stroke-width': sw || 1.3 });
  }
  // 一次性挂载入场（Mount entry）：从不透明度 0 淡入，同时尺寸从 95% -> 100%
  // 围绕图表中心 (cx, cy) 放大。运行一次，随后由循环动画接管。
  function entry(g, cx, cy) {
    var common = { dur: '0.7s', begin: '0s', fill: 'freeze', repeatCount: '1', calcMode: 'spline', keyTimes: '0;1', keySplines: EASE };
    g.setAttribute('opacity', '0');
    var o = { attributeName: 'opacity', values: '0;1' }, k;
    for (k in common) { o[k] = common[k]; }
    g.appendChild(svgEl('animate', o));
    var t = { attributeName: 'transform', type: 'translate', values: (cx * 0.05).toFixed(1) + ' ' + (cy * 0.05).toFixed(1) + ';0 0' };
    for (k in common) { t[k] = common[k]; }
    g.appendChild(svgEl('animateTransform', t));
    var s = { attributeName: 'transform', type: 'scale', values: '0.95;1', additive: 'sum' };
    for (k in common) { s[k] = common[k]; }
    g.appendChild(svgEl('animateTransform', s));
    return g;
  }
  function card(host, label, sub, svg, cap) {
    host.appendChild(el('div', { class: 'lf' }, [
      el('div', { class: 'lf-head' }, [el('span', { class: 'lf-label' }, [label]), el('span', {}, [sub])]),
      el('div', { class: 'lf-body' }, [el('div', { class: 'lf-out' }, [svg])]),
      el('div', { class: 'lf-cap' }, [cap])
    ]));
  }

  // ── l5-data-pipeline: 文档流经过过滤器（Filters），只有保留项进入批次 ──
  function dataPipeline(host) {
    var svg = svgEl('svg', { viewBox: '0 0 520 230' });
    var g = svgEl('g');
    g.appendChild(svgEl('line', { x1: 24, y1: 77, x2: 470, y2: 77, stroke: RULE, 'stroke-width': 1 }));
    var i;
    for (i = 0; i < 3; i++) {
      g.appendChild(svgEl('rect', { x: 22, y: 56 + i * 9, width: 44, height: 7, fill: SURF, stroke: MUTE, 'stroke-width': 0.8 }));
    }
    g.appendChild(txt(44, 104, '原始文本', 9, MUTE, 'middle'));
    var names = ['去重', '质量过滤', '打包'];
    for (i = 0; i < 3; i++) {
      var sx = 110 + i * 100;
      g.appendChild(box(sx, 61, 72, 32, BP));
      g.appendChild(txt(sx + 36, 81, names[i], 10, BP, 'middle'));
    }
    g.appendChild(txt(146, 150, '重复内容', 8.5, WARN, 'middle'));
    g.appendChild(txt(246, 150, '低质量内容', 8.5, WARN, 'middle'));
    for (i = 0; i < 6; i++) {
      var bx = 420 + (i % 2) * 30, by = 52 + Math.floor(i / 2) * 17;
      var cell = svgEl('rect', { x: bx, y: by, width: 26, height: 13, fill: BP, opacity: 0 });
      var at = 0.56 + i * 0.055;
      cell.appendChild(anim('opacity', '0;0;0.85;0.85;0', '5s', { keyTimes: '0;' + at.toFixed(3) + ';' + (at + 0.04).toFixed(3) + ';0.94;1' }));
      g.appendChild(cell);
    }
    g.appendChild(txt(448, 118, '训练批次', 8.5, SOFT, 'middle'));
    function doc(path, begin, fill, opVals, opTimes, kp, kt) {
      var c = svgEl('circle', { r: 4.5, fill: fill, opacity: 0 });
      var m = { dur: '5s', repeatCount: 'indefinite', path: path, begin: begin, calcMode: 'linear', keyPoints: kp, keyTimes: kt };
      c.appendChild(svgEl('animateMotion', m));
      c.appendChild(anim('opacity', opVals, '5s', { begin: begin, keyTimes: opTimes }));
      g.appendChild(c);
    }
    doc('M 44 77 L 432 77', '0s', BP, '0;1;1;0;0', '0;0.05;0.5;0.58;1', '0;1;1', '0;0.52;1');
    doc('M 44 77 L 146 77 L 146 132', '0.35s', MUTE, '0;1;1;0;0', '0;0.05;0.32;0.44;1', '0;0.65;1;1', '0;0.3;0.42;1');
    doc('M 44 77 L 246 77 L 246 132', '0.7s', MUTE, '0;1;1;0;0', '0;0.05;0.4;0.52;1', '0;0.786;1;1', '0;0.38;0.5;1');
    entry(g, 260, 115);
    svg.appendChild(g);
    card(host, '预训练数据流水线（Pretraining Data Pipeline）', '过滤、打包、持续供给 GPU', svg,
      '数 TB 的原始文本以流式方式经过去重（Deduplication）和质量过滤（Quality Filtering），再打包成固定长度的序列。只有一部分内容会被保留，而且流水线生成批次（Batch）的速度必须超过 GPU 消耗批次的速度，否则整个集群都会等待数据加载器（Data Loader）。');
  }

  // ── l5-spec-decode-eagle: 草稿提出候选，验证器（Verifier）一次通过并盖章 ──
  function specDecode(host) {
    var svg = svgEl('svg', { viewBox: '0 0 520 220' });
    var g = svgEl('g');
    g.appendChild(box(8, 88, 50, 26, MUTE));
    g.appendChild(txt(33, 105, '起草', 9, MUTE, 'middle'));
    g.appendChild(box(160, 16, 220, 26, INK, 'none', 1.4));
    g.appendChild(txt(270, 33, '验证器：一次前向传播', 9.5, INK, 'middle'));
    var sweep = svgEl('rect', { x: 66, y: 80, width: 78, height: 42, fill: BP, opacity: 0 });
    sweep.appendChild(anim('x', '66;66;320;320', '5.5s', { calcMode: 'linear', keyTimes: '0;0.28;0.52;1' }));
    sweep.appendChild(anim('opacity', '0;0;0.16;0.16;0;0', '5.5s', { keyTimes: '0;0.26;0.3;0.52;0.58;1' }));
    g.appendChild(sweep);
    var slotX = [70, 154, 238, 322];
    var appear = ['0;0.05;0.09;0.93;1', '0;0.095;0.135;0.93;1', null, null];
    var i;
    for (i = 0; i < 4; i++) {
      var gs = svgEl('g', { opacity: 0 });
      gs.appendChild(svgEl('rect', { x: slotX[i], y: 84, width: 70, height: 34, rx: 4, fill: 'none', stroke: MUTE, 'stroke-width': 1.2, 'stroke-dasharray': '4 3' }));
      gs.appendChild(txt(slotX[i] + 35, 106, 'd' + (i + 1), 10, SOFT, 'middle'));
      if (i < 2) {
        gs.appendChild(anim('opacity', '0;0;0.9;0.9;0', '5.5s', { keyTimes: appear[i] }));
      } else {
        var s0 = i === 2 ? '0.14' : '0.185', s1 = i === 2 ? '0.18' : '0.225';
        var e0 = i === 2 ? '0.56' : '0.5', e1 = i === 2 ? '0.62' : '0.56';
        gs.appendChild(anim('opacity', '0;0;0.9;0.9;0;0', '5.5s', { keyTimes: '0;' + s0 + ';' + s1 + ';' + e0 + ';' + e1 + ';1' }));
      }
      g.appendChild(gs);
    }
    var accTimes = ['0;0.34;0.38;0.93;1', '0;0.42;0.46;0.93;1'];
    for (i = 0; i < 2; i++) {
      var acc = svgEl('rect', { x: slotX[i], y: 84, width: 70, height: 34, rx: 4, fill: BP, opacity: 0 });
      acc.appendChild(anim('opacity', '0;0;0.5;0.5;0', '5.5s', { keyTimes: accTimes[i] }));
      g.appendChild(acc);
    }
    var xm = svgEl('path', { d: 'M 263 91 L 283 111 M 283 91 L 263 111', stroke: WARN, 'stroke-width': 2, fill: 'none', opacity: 0 });
    xm.appendChild(anim('opacity', '0;0;1;1;0;0', '5.5s', { keyTimes: '0;0.5;0.53;0.58;0.63;1' }));
    g.appendChild(xm);
    var fix = svgEl('g', { opacity: 0 });
    fix.appendChild(svgEl('rect', { x: 238, y: 84, width: 70, height: 34, rx: 4, fill: BP }));
    fix.appendChild(txt(273, 106, '重新采样', 8.5, 'var(--bg,#fafaf5)', 'middle'));
    fix.appendChild(anim('opacity', '0;0;1;1;0', '5.5s', { keyTimes: '0;0.6;0.66;0.93;1', calcMode: 'spline', keySplines: EASE + ';' + EASE + ';' + EASE + ';' + EASE }));
    g.appendChild(fix);
    g.appendChild(txt(260, 190, '验证器一次前向传播：接受两个词元，再纠正一个', 9, MUTE, 'middle'));
    entry(g, 260, 110);
    svg.appendChild(g);
    card(host, '推测解码（Speculative Decoding）', '低成本起草，一次验证', svg,
      '草稿头（Draft Head）以较低成本提出四个词元。验证器（Verifier）用一次前向传播为所有词元评分：接受一致的前缀，拒绝第一个不一致的词元，并用从残差分布（Residual Distribution）中采样的词元替换它，之后的词元全部丢弃。全部接受时，验证器还会额外输出一个词元，因此一次大模型计算可以得到 N+1 个词元，同时精确保留验证器的分布。');
  }

  // ── l5-prod-app-paths: 缓存未命中（Cache miss）承担完整路径开销，命中（Cache hit）无开销 ──
  function prodApp(host) {
    var svg = svgEl('svg', { viewBox: '0 0 520 250' });
    var g = svgEl('g');
    var stages = [[12, 62, '请求', SOFT], [100, 60, '防护', BP], [186, 60, '缓存', BP], [272, 54, 'RAG', BP], [352, 50, 'LLM', BP], [428, 78, '响应', INK]];
    g.appendChild(svgEl('line', { x1: 74, y1: 73, x2: 428, y2: 73, stroke: RULE, 'stroke-width': 1 }));
    var i;
    for (i = 0; i < 6; i++) {
      g.appendChild(box(stages[i][0], 58, stages[i][1], 30, stages[i][3]));
      g.appendChild(txt(stages[i][0] + stages[i][1] / 2, 77, stages[i][2], 9.5, stages[i][3], 'middle'));
    }
    g.appendChild(svgEl('path', { d: 'M 216 88 C 216 150 300 150 340 150 L 400 150 C 452 150 460 120 462 92', fill: 'none', stroke: RULE, 'stroke-width': 1.2, 'stroke-dasharray': '5 4' }));
    g.appendChild(txt(310, 164, '缓存命中快捷路径', 8.5, MUTE, 'middle'));
    var missTag = txt(216, 50, '未命中', 8.5, WARN, 'middle');
    missTag.setAttribute('opacity', 0);
    missTag.appendChild(anim('opacity', '0;0;1;1;0;0', '6s', { keyTimes: '0;0.12;0.16;0.3;0.36;1' }));
    g.appendChild(missTag);
    var flash = svgEl('rect', { x: 186, y: 58, width: 60, height: 30, rx: 4, fill: BP, opacity: 0 });
    flash.appendChild(anim('opacity', '0;0;0.4;0;0', '6s', { keyTimes: '0;0.58;0.62;0.68;1' }));
    g.appendChild(flash);
    var miss = svgEl('circle', { r: 4.5, fill: BP, opacity: 0 });
    miss.appendChild(svgEl('animateMotion', { dur: '6s', repeatCount: 'indefinite', path: 'M 20 73 L 460 73', calcMode: 'linear', keyPoints: '0;1;1', keyTimes: '0;0.4;1' }));
    miss.appendChild(anim('opacity', '0;1;1;0;0', '6s', { keyTimes: '0;0.04;0.4;0.47;1' }));
    g.appendChild(miss);
    var hit = svgEl('circle', { r: 4.5, fill: BP, opacity: 0 });
    hit.appendChild(svgEl('animateMotion', { dur: '6s', repeatCount: 'indefinite', path: 'M 20 73 L 216 73 L 216 88 C 216 150 320 150 400 150 C 452 150 460 120 462 95', calcMode: 'linear', keyPoints: '0;0;1;1', keyTimes: '0;0.55;0.78;1' }));
    hit.appendChild(anim('opacity', '0;0;1;1;0;0', '6s', { keyTimes: '0;0.55;0.58;0.78;0.84;1' }));
    g.appendChild(hit);
    g.appendChild(txt(60, 208, '未命中', 9, SOFT, 'end'));
    g.appendChild(txt(60, 228, '命中', 9, SOFT, 'end'));
    g.appendChild(svgEl('rect', { x: 72, y: 198, width: 240, height: 12, fill: 'none', stroke: RULE, 'stroke-width': 1 }));
    g.appendChild(svgEl('rect', { x: 72, y: 218, width: 240, height: 12, fill: 'none', stroke: RULE, 'stroke-width': 1 }));
    var mb = svgEl('rect', { x: 72, y: 198, width: 0, height: 12, fill: WARN });
    mb.appendChild(anim('width', '0;0;220;220;0', '6s', { calcMode: 'linear', keyTimes: '0;0.08;0.4;0.94;1' }));
    g.appendChild(mb);
    var hb = svgEl('rect', { x: 72, y: 218, width: 0, height: 12, fill: BP });
    hb.appendChild(anim('width', '0;0;14;14;0', '6s', { calcMode: 'linear', keyTimes: '0;0.55;0.78;0.94;1' }));
    g.appendChild(hb);
    g.appendChild(txt(320, 208, '约 2 s，完整词元费用', 8.5, MUTE));
    g.appendChild(txt(320, 228, '约 50 ms，免费', 8.5, MUTE));
    entry(g, 260, 125);
    svg.appendChild(g);
    card(host, '生产级 LLM 服务（Production LLM Service）', '两个请求，两条截然不同的路径', svg,
      '一个请求未命中任何缓存（Cache），必须走完防护机制（Guardrails）、检索（Retrieval）和模型推理的完整路径，承受秒级延迟和完整的词元费用。稍后到达的相同请求在缓存处直接返回，只需毫秒级延迟，成本几乎为零。生产级 LLM 工程很大一部分工作，就是让第二条路径成为常见路径。');
  }

  // ── l5-state-graph-ledger: 显式图（Explicit graph），每条边写入一个检查点（Checkpoint） ──
  function stateGraph(host) {
    var svg = svgEl('svg', { viewBox: '0 0 520 250' });
    var g = svgEl('g');
    var nodes = [[50, 70, 80, '模型', BP], [210, 26, 80, '工具', BP], [210, 114, 80, '人工', WARN], [390, 114, 70, 'END', MUTE]];
    var i;
    for (i = 0; i < 4; i++) {
      g.appendChild(box(nodes[i][0], nodes[i][1], nodes[i][2], 32, nodes[i][4]));
      g.appendChild(txt(nodes[i][0] + nodes[i][2] / 2, nodes[i][1] + 20, nodes[i][3], 10, nodes[i][4], 'middle'));
    }
    g.appendChild(svgEl('line', { x1: 130, y1: 78, x2: 210, y2: 48, stroke: RULE, 'stroke-width': 1.2 }));
    g.appendChild(svgEl('line', { x1: 210, y1: 56, x2: 130, y2: 90, stroke: RULE, 'stroke-width': 1.2 }));
    g.appendChild(svgEl('line', { x1: 130, y1: 98, x2: 210, y2: 126, stroke: RULE, 'stroke-width': 1.2 }));
    g.appendChild(svgEl('line', { x1: 290, y1: 130, x2: 390, y2: 130, stroke: RULE, 'stroke-width': 1.2 }));
    var walker = svgEl('circle', { r: 5, fill: BP, opacity: 0 });
    walker.appendChild(svgEl('animateMotion', { dur: '6s', repeatCount: 'indefinite', path: 'M 90 86 L 250 42 L 90 86 L 250 130 L 425 130', calcMode: 'linear', keyPoints: '0;0.25;0.5;0.75;0.75;1;1', keyTimes: '0;0.15;0.3;0.45;0.72;0.88;1' }));
    walker.appendChild(anim('opacity', '0;1;1;0;0', '6s', { keyTimes: '0;0.04;0.88;0.94;1' }));
    g.appendChild(walker);
    var ring = svgEl('circle', { cx: 250, cy: 130, r: 24, fill: 'none', stroke: WARN, 'stroke-width': 1.5, opacity: 0 });
    ring.appendChild(anim('opacity', '0;0;0.9;0.9;0;0', '6s', { keyTimes: '0;0.48;0.52;0.68;0.74;1' }));
    g.appendChild(ring);
    var itx = txt(250, 172, '中断：等待审批', 8.5, WARN, 'middle');
    itx.setAttribute('opacity', 0);
    itx.appendChild(anim('opacity', '0;0;1;1;0;0', '6s', { keyTimes: '0;0.48;0.52;0.68;0.74;1' }));
    g.appendChild(itx);
    g.appendChild(txt(60, 206, '检查点存储器', 9, MUTE));
    var cpAt = [0.15, 0.3, 0.45, 0.88];
    for (i = 0; i < 4; i++) {
      var cp = svgEl('rect', { x: 170 + i * 36, y: 194, width: 30, height: 16, rx: 2, fill: BP, opacity: 0 });
      cp.appendChild(anim('opacity', '0;0;0.8;0.8;0', '6s', { keyTimes: '0;' + cpAt[i] + ';' + (cpAt[i] + 0.04).toFixed(2) + ';0.94;1' }));
      g.appendChild(cp);
    }
    entry(g, 260, 125);
    svg.appendChild(g);
    card(host, '智能体状态机（Agent State Machine）', '把循环表示为可暂停的图', svg,
      '将同一个 ReAct 循环绘制为显式图（Explicit Graph）。执行流程依次经过模型、工具和人工审批节点，每次状态转移（Transition）都向下方记录写入一个检查点（Checkpoint）。到达人工节点时，执行直接暂停：状态已经持久化（Persisted），因此图可以稍后恢复，也可以回退到之前的任意检查点，沿另一条分支继续执行。');
  }

  // ── l5-framework-fit: 四块白板，每块对应一种核心抽象（Core abstraction） ──
  function frameworkFit(host) {
    var svg = svgEl('svg', { viewBox: '0 0 520 260' });
    var g = svgEl('g');
    g.appendChild(txt(260, 20, '白板测试：你的问题适合画成哪种结构？', 9.5, MUTE, 'middle'));
    function panel(x, y, name, tag, sketch, vals, times) {
      var p = svgEl('g', { opacity: 0.35 });
      p.appendChild(svgEl('rect', { x: x, y: y, width: 240, height: 102, fill: 'none', stroke: RULE, 'stroke-width': 1 }));
      p.appendChild(txt(x + 10, y + 20, name, 10.5, INK));
      p.appendChild(txt(x + 10, y + 92, tag, 8.5, MUTE));
      var i;
      for (i = 0; i < sketch.length; i++) { p.appendChild(sketch[i]); }
      p.appendChild(anim('opacity', vals, '6s', { keyTimes: times }));
      g.appendChild(p);
    }
    panel(10, 32, 'LangGraph', '画一张图：带类型的状态与边', [
      svgEl('circle', { cx: 158, cy: 62, r: 7, fill: 'none', stroke: BP, 'stroke-width': 1.4 }),
      svgEl('circle', { cx: 204, cy: 84, r: 7, fill: 'none', stroke: BP, 'stroke-width': 1.4 }),
      svgEl('circle', { cx: 158, cy: 106, r: 7, fill: 'none', stroke: BP, 'stroke-width': 1.4 }),
      svgEl('line', { x1: 164, y1: 66, x2: 198, y2: 81, stroke: BP, 'stroke-width': 1.1 }),
      svgEl('line', { x1: 198, y1: 88, x2: 164, y2: 103, stroke: BP, 'stroke-width': 1.1 })
    ], '0.35;1;1;0.35;0.35', '0;0.03;0.21;0.26;1');
    panel(270, 32, 'CrewAI', '画组织结构图：角色 + 任务', [
      svgEl('rect', { x: 420, y: 52, width: 36, height: 14, rx: 2, fill: 'none', stroke: BP, 'stroke-width': 1.4 }),
      svgEl('rect', { x: 396, y: 90, width: 32, height: 14, rx: 2, fill: SURF, stroke: MUTE, 'stroke-width': 1 }),
      svgEl('rect', { x: 448, y: 90, width: 32, height: 14, rx: 2, fill: SURF, stroke: MUTE, 'stroke-width': 1 }),
      svgEl('line', { x1: 432, y1: 66, x2: 412, y2: 90, stroke: MUTE, 'stroke-width': 1.1 }),
      svgEl('line', { x1: 444, y1: 66, x2: 464, y2: 90, stroke: MUTE, 'stroke-width': 1.1 })
    ], '0.35;0.35;1;1;0.35;0.35', '0;0.25;0.28;0.46;0.51;1');
    panel(10, 148, 'AutoGen', '画对话：智能体轮流发言', [
      svgEl('rect', { x: 146, y: 174, width: 62, height: 18, rx: 9, fill: 'none', stroke: BP, 'stroke-width': 1.4 }),
      svgEl('rect', { x: 168, y: 202, width: 62, height: 18, rx: 9, fill: SURF, stroke: MUTE, 'stroke-width': 1 })
    ], '0.35;0.35;1;1;0.35;0.35', '0;0.5;0.53;0.71;0.76;1');
    panel(270, 148, 'Agno', '画一个框：智能体 + 配套能力', [
      svgEl('rect', { x: 418, y: 168, width: 50, height: 30, rx: 4, fill: 'none', stroke: BP, 'stroke-width': 1.4 }),
      svgEl('rect', { x: 414, y: 212, width: 12, height: 12, fill: SURF, stroke: MUTE, 'stroke-width': 1 }),
      svgEl('rect', { x: 436, y: 212, width: 12, height: 12, fill: SURF, stroke: MUTE, 'stroke-width': 1 }),
      svgEl('rect', { x: 458, y: 212, width: 12, height: 12, fill: SURF, stroke: MUTE, 'stroke-width': 1 })
    ], '0.35;0.35;1;1;0.35', '0;0.75;0.78;0.97;1');
    entry(g, 260, 130);
    svg.appendChild(g);
    card(host, '框架取舍（Framework Tradeoffs）', '让抽象匹配问题结构', svg,
      '每个框架都有一种核心抽象（Abstraction），正是你会画在白板上的结构。LangGraph 画状态图，CrewAI 画组织结构图，AutoGen 画对话，Agno 画一个附带工具的智能体。选择结构与你的问题匹配的框架；强行套用不匹配的结构，意味着你要亲手补出缺失的抽象，还可能做两遍。');
  }

  // ── l5-vlm-recipe-knobs: 五个推子，数据混合（Data mix）升得最高 ──
  function vlmRecipe(host) {
    var svg = svgEl('svg', { viewBox: '0 0 520 240' });
    var g = svgEl('g');
    g.appendChild(txt(40, 26, '对最终基准测试结果的影响', 9, MUTE));
    g.appendChild(svgEl('line', { x1: 40, y1: 192, x2: 480, y2: 192, stroke: MUTE, 'stroke-width': 1 }));
    var bars = [['编码器', 88, false], ['连接器', 34, false], ['LLM 规模', 60, false], ['数据配比', 126, true], ['分辨率', 72, false]];
    var i;
    for (i = 0; i < 5; i++) {
      var bx = 60 + i * 86, h = bars[i][1], s = 0.05 + i * 0.06;
      var attrs = bars[i][2] ? { fill: BP } : { fill: SURF, stroke: MUTE, 'stroke-width': 1 };
      attrs.x = bx; attrs.y = 182; attrs.width = 48; attrs.height = 10;
      var bar = svgEl('rect', attrs);
      var kt = '0;' + s.toFixed(2) + ';' + (s + 0.14).toFixed(2) + ';0.9;1';
      var ks = '0 0 1 1;' + EASE + ';0 0 1 1;0.42 0 1 1';
      bar.appendChild(anim('height', '10;10;' + h + ';' + h + ';10', '5s', { keyTimes: kt, calcMode: 'spline', keySplines: ks }));
      bar.appendChild(anim('y', '182;182;' + (192 - h) + ';' + (192 - h) + ';182', '5s', { keyTimes: kt, calcMode: 'spline', keySplines: ks }));
      g.appendChild(bar);
      g.appendChild(txt(bx + 24, 208, bars[i][0], 9, SOFT, 'middle'));
    }
    var mark = svgEl('g', { opacity: 0 });
    mark.appendChild(txt(60 + 3 * 86 + 24, 44, '优先调整这一项', 9, BP, 'middle'));
    mark.appendChild(svgEl('line', { x1: 60 + 3 * 86 + 24, y1: 50, x2: 60 + 3 * 86 + 24, y2: 60, stroke: BP, 'stroke-width': 1.2 }));
    mark.appendChild(anim('opacity', '0;0;1;1;0', '5s', { keyTimes: '0;0.42;0.48;0.9;1' }));
    g.appendChild(mark);
    entry(g, 260, 120);
    svg.appendChild(g);
    card(host, 'VLM 训练配方（Recipe）的可调项', '在多组消融实验中稳定的排序', svg,
      '这一排序在 MM1、Idefics2、Cambrian-1 和 Prismatic 的消融实验（Ablation Study）表格中均成立。数据配比（Data Mixture）对基准测试（Benchmark）的影响最大，图像编码器其次；多数论文最关注的连接器（Connector）反而影响最小。视觉语言模型（VLM）表现不佳时，优先调整图中最高的那一项。');
  }

  // ── l5-onevision-budget: 一个固定预算（Budget），三种打包（Packings）方式 ──
  function onevisionBudget(host) {
    var svg = svgEl('svg', { viewBox: '0 0 520 230' });
    var g = svgEl('g');
    g.appendChild(txt(60, 66, '0', 8.5, MUTE, 'middle'));
    g.appendChild(txt(460, 66, '约 3–4K 个视觉词元', 8.5, MUTE, 'end'));
    g.appendChild(svgEl('rect', { x: 60, y: 78, width: 400, height: 58, fill: 'none', stroke: INK, 'stroke-width': 1.4 }));
    function pack(rects, label, vals, times) {
      var p = svgEl('g', { opacity: 0 });
      var i;
      for (i = 0; i < rects.length; i++) { p.appendChild(rects[i]); }
      p.appendChild(txt(260, 166, label, 9.5, SOFT, 'middle'));
      p.appendChild(anim('opacity', vals, '6s', { keyTimes: times }));
      g.appendChild(p);
    }
    pack([svgEl('rect', { x: 66, y: 84, width: 310, height: 46, fill: BP, opacity: 0.75 })],
      '单图：AnyRes 图块，约 2900 个词元', '0;1;1;0;0', '0;0.05;0.3;0.34;1');
    var multi = [], i;
    for (i = 0; i < 6; i++) { multi.push(svgEl('rect', { x: 66 + i * 64, y: 84, width: 56, height: 46, fill: BP, opacity: 0.55 })); }
    pack(multi, '多图：6 张图，每张 729 个词元', '0;0;1;1;0;0', '0;0.333;0.373;0.63;0.67;1');
    var vid = [];
    for (i = 0; i < 12; i++) { vid.push(svgEl('rect', { x: 66 + i * 32, y: 84, width: 26, height: 46, fill: BP, opacity: 0.4 })); }
    pack(vid, '视频：32 帧，池化后每帧 81 个词元', '0;0;1;1;0', '0;0.667;0.707;0.96;1');
    entry(g, 260, 115);
    svg.appendChild(g);
    card(host, 'OneVision 词元预算（Token Budget）', '相同容量，三种装填方式', svg,
      'LLaVA-OneVision 将每个样本的视觉词元（Visual Token）预算大致固定在数千个，只调整装填方式：一张 AnyRes 高分辨率图像、多张中等分辨率图像，或 32 个视频帧，每帧池化（Pooling）到 81 个词元。每种场景的成本相近，因此一个模型可以同时在三类数据上训练，不会被其中某一类主导。');
  }

  // ── l5-native-pretrain: 外接式墙面（Bolted-on wall）与交错式墙面（Interleaved wall）对比 ──
  function nativePretrain(host) {
    var svg = svgEl('svg', { viewBox: '0 0 520 250' });
    var g = svgEl('g');
    function brick(x, y, vision, s) {
      var r = svgEl('rect', { x: x, y: y, width: 44, height: 18, fill: vision ? BP : SURF, stroke: vision ? BP : MUTE, 'stroke-width': 1, opacity: 0 });
      r.appendChild(anim('opacity', '0;0;1;1;0', '6s', { keyTimes: '0;' + s.toFixed(3) + ';' + (s + 0.05).toFixed(3) + ';0.93;1' }));
      return r;
    }
    g.appendChild(txt(70, 48, '后置接入：先训练文本，再外挂视觉', 9.5, SOFT));
    var i;
    for (i = 0; i < 6; i++) { g.appendChild(brick(70 + i * 50, 64, false, 0.03 + i * 0.045)); }
    g.appendChild(brick(70 + 6 * 50, 64, true, 0.38));
    g.appendChild(brick(70 + 7 * 50, 64, true, 0.44));
    var crack = svgEl('path', { d: 'M 367 58 L 362 68 L 371 76 L 364 88', stroke: WARN, 'stroke-width': 2, fill: 'none', opacity: 0 });
    crack.appendChild(anim('opacity', '0;0;1;1;0', '6s', { keyTimes: '0;0.5;0.54;0.93;1' }));
    g.appendChild(crack);
    var clab = txt(367, 108, '对齐债务', 8.5, WARN, 'middle');
    clab.setAttribute('opacity', 0);
    clab.appendChild(anim('opacity', '0;0;1;1;0', '6s', { keyTimes: '0;0.5;0.54;0.93;1' }));
    g.appendChild(clab);
    g.appendChild(txt(70, 148, '原生训练：从第一步起就交错混合', 9.5, SOFT));
    var mix = [false, true, false, false, true, false, true, false];
    for (i = 0; i < 8; i++) { g.appendChild(brick(70 + i * 50, 164, mix[i], 0.03 + i * 0.045)); }
    var seam = txt(270, 210, '无需后期拼接', 8.5, BP, 'middle');
    seam.setAttribute('opacity', 0);
    seam.appendChild(anim('opacity', '0;0;1;1;0', '6s', { keyTimes: '0;0.42;0.48;0.93;1' }));
    g.appendChild(seam);
    entry(g, 260, 125);
    svg.appendChild(g);
    card(host, '原生多模态预训练（Native Multimodal Pretraining）', '同一目标，两种构建方式', svg,
      '后置训练（Post-hoc Training）先用数万亿文本词元打底，最后再接上视觉能力；拼接处形成对齐债务（Alignment Debt），表现为灾难性遗忘（Catastrophic Forgetting）、回答漂移（Answer Drift）和图文不一致。InternVL3 从第一步就混合文本、交错图文和图像描述数据，让视觉词元成为模型原生组成部分，而非后期外挂的扩展。');
  }

  // ── l5-emu3-next-token: 一个光标写入文本、图像与视频词元（Tokens） ──
  function emuNextToken(host) {
    var svg = svgEl('svg', { viewBox: '0 0 520 220' });
    var g = svgEl('g');
    g.appendChild(txt(260, 26, '一个解码器、一个词表、一个损失：预测下一词元', 9.5, MUTE, 'middle'));
    var i;
    for (i = 0; i < 12; i++) {
      var attrs = { x: 40 + i * 37, y: 104, width: 34, height: 28, rx: 3, opacity: 0 };
      if (i < 3) { attrs.fill = SURF; attrs.stroke = MUTE; attrs['stroke-width'] = 1; }
      else if (i < 8) { attrs.fill = BP; }
      else { attrs.fill = WARN; }
      var cell = svgEl('rect', attrs);
      var f = i * 0.0733 + 0.02;
      cell.appendChild(anim('opacity', '0;0;1;1;0', '5s', { keyTimes: '0;' + f.toFixed(3) + ';' + (f + 0.03).toFixed(3) + ';0.94;1' }));
      g.appendChild(cell);
    }
    var xs = [], ts = [];
    for (i = 0; i < 13; i++) { xs.push(34 + i * 37); ts.push((i * 0.0733).toFixed(3)); }
    ts[12] = '1';
    var cursor = svgEl('rect', { x: 34, y: 96, width: 3, height: 44, fill: INK });
    cursor.appendChild(anim('x', xs.join(';'), '5s', { calcMode: 'discrete', keyTimes: ts.join(';') }));
    g.appendChild(cursor);
    g.appendChild(txt(94, 160, '文本', 9, SOFT, 'middle'));
    g.appendChild(txt(242, 160, '图像词元', 9, BP, 'middle'));
    g.appendChild(txt(408, 160, '视频词元', 9, WARN, 'middle'));
    entry(g, 260, 110);
    svg.appendChild(g);
    card(host, 'Emu3 下一词元生成（Next-token Generation）', '一个预测头，三种模态', svg,
      'Emu3 在一个共享词表上通过下一词元预测（Next-token Prediction）训练单个 Llama 风格解码器；文本、向量量化（Vector Quantization，VQ）图像词元和三维视频词元都只是词表条目。无需扩散调度（Diffusion Schedule）、CLIP 损失或第二个训练目标。同一个预测头沿序列生成，就能写出句子、图像或视频片段，因此一个模型可以同时承担 Emu3-Chat 和 Emu3-Gen 的角色。');
  }

  // ── l5-janus-decouple: 两个入口，一个共享大厅 ──
  function janusDecouple(host) {
    var svg = svgEl('svg', { viewBox: '0 0 520 250' });
    var g = svgEl('g');
    g.appendChild(box(215, 95, 100, 60, INK, 'none', 1.4));
    g.appendChild(txt(265, 120, '共享', 9.5, INK, 'middle'));
    g.appendChild(txt(265, 134, 'Transformer', 9.5, INK, 'middle'));
    var top = svgEl('g');
    top.appendChild(txt(28, 32, '理解', 9, BP));
    top.appendChild(svgEl('rect', { x: 28, y: 48, width: 30, height: 24, fill: SURF, stroke: SOFT, 'stroke-width': 1 }));
    top.appendChild(txt(43, 86, '图像', 8.5, MUTE, 'middle'));
    top.appendChild(box(96, 48, 86, 24, BP));
    top.appendChild(txt(139, 64, 'SigLIP', 9.5, BP, 'middle'));
    top.appendChild(svgEl('line', { x1: 58, y1: 60, x2: 96, y2: 60, stroke: RULE, 'stroke-width': 1.2 }));
    top.appendChild(svgEl('line', { x1: 182, y1: 60, x2: 218, y2: 96, stroke: RULE, 'stroke-width': 1.2 }));
    top.appendChild(svgEl('line', { x1: 312, y1: 96, x2: 352, y2: 62, stroke: RULE, 'stroke-width': 1.2 }));
    top.appendChild(txt(358, 64, '文本回答', 9.5, SOFT));
    var ud = svgEl('circle', { r: 4, fill: BP, opacity: 0 });
    ud.appendChild(svgEl('animateMotion', { dur: '6s', repeatCount: 'indefinite', path: 'M 34 60 L 139 60 L 250 108 L 356 62', calcMode: 'linear', keyPoints: '0;1;1', keyTimes: '0;0.4;1' }));
    ud.appendChild(anim('opacity', '0;1;1;0;0', '6s', { keyTimes: '0;0.04;0.4;0.46;1' }));
    top.appendChild(ud);
    top.appendChild(anim('opacity', '1;1;0.3;0.3;1', '6s', { keyTimes: '0;0.46;0.5;0.95;1' }));
    g.appendChild(top);
    var bot = svgEl('g');
    bot.appendChild(txt(28, 226, '生成', 9, WARN));
    bot.appendChild(txt(28, 196, '提示词', 9, SOFT));
    bot.appendChild(svgEl('line', { x1: 70, y1: 192, x2: 218, y2: 152, stroke: RULE, 'stroke-width': 1.2 }));
    bot.appendChild(svgEl('line', { x1: 312, y1: 152, x2: 346, y2: 188, stroke: RULE, 'stroke-width': 1.2 }));
    bot.appendChild(box(346, 178, 84, 24, WARN));
    bot.appendChild(txt(388, 194, 'VQ 解码器', 8.5, WARN, 'middle'));
    bot.appendChild(svgEl('rect', { x: 446, y: 180, width: 10, height: 10, fill: BP, opacity: 0.9 }));
    bot.appendChild(svgEl('rect', { x: 458, y: 180, width: 10, height: 10, fill: BP, opacity: 0.45 }));
    bot.appendChild(svgEl('rect', { x: 446, y: 192, width: 10, height: 10, fill: BP, opacity: 0.3 }));
    bot.appendChild(svgEl('rect', { x: 458, y: 192, width: 10, height: 10, fill: BP, opacity: 0.7 }));
    var gd = svgEl('circle', { r: 4, fill: WARN, opacity: 0 });
    gd.appendChild(svgEl('animateMotion', { dur: '6s', repeatCount: 'indefinite', path: 'M 34 192 L 250 145 L 388 188 L 452 190', calcMode: 'linear', keyPoints: '0;0;1;1', keyTimes: '0;0.5;0.9;1' }));
    gd.appendChild(anim('opacity', '0;0;1;1;0;0', '6s', { keyTimes: '0;0.5;0.54;0.88;0.94;1' }));
    bot.appendChild(gd);
    bot.appendChild(anim('opacity', '0.3;0.3;1;1;0.3', '6s', { keyTimes: '0;0.46;0.5;0.95;1' }));
    g.appendChild(bot);
    entry(g, 260, 125);
    svg.appendChild(g);
    card(host, 'Janus-Pro 解耦编码器（Decoupled Encoders）', '两个入口，共享主干', svg,
      '理解需要语义特征（Semantic Feature），生成需要便于重建的编码，一个编码器无法兼顾两者。Janus-Pro 让理解任务走 SigLIP，生成任务走 VQ 分词器（Tokenizer），两者共享同一个 Transformer 主干。两个入口通向同一个主体，各项任务都不必为兼顾另一项而牺牲质量。');
  }

  // ── l5-thinker-talker: 文本仍在生成时，语音已开始流式输出 ──
  function thinkerTalker(host) {
    var svg = svgEl('svg', { viewBox: '0 0 520 240' });
    var g = svgEl('g');
    g.appendChild(txt(20, 79, '思考器（Thinker）', 9, BP));
    g.appendChild(txt(20, 91, '文本词元', 7.5, MUTE));
    g.appendChild(txt(20, 139, '语音生成器（Talker）', 9, WARN));
    g.appendChild(txt(20, 151, '语音词元', 7.5, MUTE));
    function row(y, attrs, off) {
      var i;
      for (i = 0; i < 7; i++) {
        var a = { x: 140 + i * 48, y: y, width: 40, height: 26, rx: 3, opacity: 0 }, k;
        for (k in attrs) { a[k] = attrs[k]; }
        var c = svgEl('rect', a);
        var f = off + i * 0.07;
        c.appendChild(anim('opacity', '0;0;1;1;0', '6s', { keyTimes: '0;' + f.toFixed(3) + ';' + (f + 0.04).toFixed(3) + ';0.94;1' }));
        g.appendChild(c);
      }
    }
    row(62, { fill: 'none', stroke: BP, 'stroke-width': 1.3 }, 0.05);
    row(122, { fill: WARN, 'fill-opacity': 0.8 }, 0.19);
    var mark = svgEl('line', { x1: 160, y1: 44, x2: 160, y2: 168, stroke: WARN, 'stroke-width': 1.2, 'stroke-dasharray': '4 4', opacity: 0 });
    mark.appendChild(anim('opacity', '0;0;1;1;0', '6s', { keyTimes: '0;0.19;0.24;0.94;1' }));
    g.appendChild(mark);
    var mlab = txt(168, 40, '首段音频约 350 ms', 8.5, WARN);
    mlab.setAttribute('opacity', 0);
    mlab.appendChild(anim('opacity', '0;0;1;1;0', '6s', { keyTimes: '0;0.19;0.24;0.94;1' }));
    g.appendChild(mlab);
    var wave = svgEl('path', { d: 'M 478 135 q 4 -12 8 0 q 4 12 8 0 q 4 -12 8 0', stroke: WARN, 'stroke-width': 1.4, fill: 'none', opacity: 0 });
    wave.appendChild(anim('opacity', '0;0;1;1;0', '6s', { keyTimes: '0;0.24;0.3;0.94;1' }));
    g.appendChild(wave);
    g.appendChild(svgEl('line', { x1: 140, y1: 190, x2: 468, y2: 190, stroke: MUTE, 'stroke-width': 1 }));
    g.appendChild(svgEl('path', { d: 'M 462 186 L 470 190 L 462 194', fill: 'none', stroke: MUTE, 'stroke-width': 1 }));
    g.appendChild(txt(468, 205, '时间', 8.5, MUTE, 'end'));
    g.appendChild(txt(304, 226, 'Thinker 仍在生成文本，Talker 已流式输出语音', 8.5, MUTE, 'middle'));
    entry(g, 260, 120);
    svg.appendChild(g);
    card(host, '思考器（Thinker）与语音生成器（Talker）分离', '并行流式处理满足延迟预算', svg,
      'Qwen2.5-Omni 将语音流水线拆开：较大的思考器（Thinker）以文本词元生成回答，较小的语音生成器（Talker）并行将其转换为语音词元，只落后几个词元。句子大部分尚未生成时，首段音频就已到达扬声器，因此往返延迟（Round-trip Latency）能保持在 500 ms 的对话阈值以内。');
  }

  LF.register({
    'l5-data-pipeline': dataPipeline,
    'l5-spec-decode-eagle': specDecode,
    'l5-prod-app-paths': prodApp,
    'l5-state-graph-ledger': stateGraph,
    'l5-framework-fit': frameworkFit,
    'l5-vlm-recipe-knobs': vlmRecipe,
    'l5-onevision-budget': onevisionBudget,
    'l5-native-pretrain': nativePretrain,
    'l5-emu3-next-token': emuNextToken,
    'l5-janus-decouple': janusDecouple,
    'l5-thinker-talker': thinkerTalker
  });
})();
