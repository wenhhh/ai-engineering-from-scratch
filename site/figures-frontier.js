/* figures-frontier.js - 自主系统（Autonomous systems，阶段 15）与综合实践项目（Capstone projects，阶段 19）
   的交互课程图表。在
   lesson-figures.js 之后加载，通过 window.LF 注册。无依赖，使用 ES5，主题由
   CSS 变量控制。编写方式：使用一个以以下某个组件名称为内容的 ```figure 块。 */
(function () {
  'use strict';
  var LF = window.LF;
  if (!LF) { return; }
  var el = LF.el, svgEl = LF.svgEl;

  function arrowDefs() {
    var marker = svgEl('marker', { id: 'lf-fr-arrow', viewBox: '0 0 8 8', refX: '7', refY: '4', markerWidth: '7', markerHeight: '7', orient: 'auto-start-reverse' }, [
      svgEl('path', { d: 'M0 0 L8 4 L0 8 z', fill: 'var(--ink-soft,#555)' })
    ]);
    return svgEl('defs', {}, [marker]);
  }
  function box(x, y, w, h, label, on) {
    var r = svgEl('rect', { x: x, y: y, width: w, height: h, rx: '4', fill: on ? 'var(--blueprint,#3553ff)' : 'var(--bg-surface,#eee)', stroke: on ? 'var(--blueprint,#3553ff)' : 'var(--rule-soft,#ddd)', 'stroke-width': '1.5' });
    var t = svgEl('text', { x: x + w / 2, y: y + h / 2 + 4, 'text-anchor': 'middle', 'font-family': 'var(--font-mono,monospace)', 'font-size': '11', fill: on ? 'var(--bg,#fafaf5)' : 'var(--ink,#1a1a1a)' });
    t.appendChild(document.createTextNode(label));
    return svgEl('g', {}, [r, t]);
  }
  function arrow(x1, y1, x2, y2, dash) {
    return svgEl('line', { x1: x1, y1: y1, x2: x2, y2: y2, stroke: 'var(--ink-soft,#555)', 'stroke-width': '1.4', 'marker-end': 'url(#lf-fr-arrow)', 'stroke-dasharray': dash || '' });
  }
  function label(x, y, txt, fill) {
    var t = svgEl('text', { x: x, y: y, 'text-anchor': 'middle', 'font-family': 'var(--font-mono,monospace)', 'font-size': '10', fill: fill || 'var(--ink-mute,#777)' });
    t.appendChild(document.createTextNode(txt));
    return t;
  }

  // ── task-decomposition: 一个目标扇出为子任务（Sub-tasks），形成规划树（Planning tree） ──
  function taskDecomposition(host) {
    var state = { branch: 3, depth: 2 };
    var W = 520, H = 250;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    state._render = function () {
      var b = state.branch, depth = state.depth;
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      var top = 30, rowH = (H - 70) / Math.max(1, depth);
      var prev = [{ x: W / 2 }];
      svg.appendChild(box(W / 2 - 32, top - 14, 64, 28, '目标', true));
      var lv;
      for (lv = 1; lv <= depth; lv++) {
        var count = Math.pow(b, lv);
        if (count > 27) { count = 27; }
        var y = top + rowH * lv;
        var cur = [], k;
        for (k = 0; k < count; k++) {
          var x = W * (k + 1) / (count + 1);
          cur.push({ x: x });
          var parent = prev[Math.floor(k / b) % prev.length] || prev[0];
          svg.appendChild(svgEl('line', { x1: parent.x, y1: top + rowH * (lv - 1) + 14, x2: x, y2: y - 7, stroke: 'var(--rule-soft,#ddd)', 'stroke-width': '1' }));
          var leaf = lv === depth;
          svg.appendChild(svgEl('circle', { cx: x, cy: y, r: leaf ? '6' : '8', fill: leaf ? 'var(--bg-surface,#eee)' : 'var(--blueprint,#3553ff)', stroke: 'var(--ink-soft,#555)', 'stroke-width': '1' }));
        }
        prev = cur;
      }
      var total = 0;
      for (lv = 0; lv <= depth; lv++) { total += Math.pow(b, lv); }
      var leaves = Math.pow(b, depth);
      meta.textContent = '分支数 ' + b + '，深度 ' + depth + '  →  ' + leaves + ' 个叶子子任务，共 ' + total + ' 个节点（叶子是可执行步骤）';
      formula.textContent = '叶子数 = b^depth；总节点数 = (b^(depth+1) - 1) / (b - 1)';
    };
    var grid = el('div', { class: 'lf-grid' }, [
      LF.slider(state, 'branch', '分支数（每节点的子任务数）', 1, 4, 1),
      LF.slider(state, 'depth', '规划深度（Planning Depth）', 1, 3, 1)
    ]);
    host.appendChild(el('div', { class: 'lf' }, [
      el('div', { class: 'lf-head' }, [el('span', { class: 'lf-label' }, ['任务分解（Task Decomposition）']), el('span', {}, ['调整分支数与深度'])]),
      el('div', { class: 'lf-body' }, [grid, el('div', { class: 'lf-out' }, [svg, meta, formula])]),
      el('div', { class: 'lf-cap' }, ['长程智能体（Long-Horizon Agent）不会直接处理整个复杂目标，而是将其拆为子任务，再继续分解，直到叶子节点成为可直接执行的步骤。更多分支和更深的树使规划更细，但也成倍增加需要追踪的工作，因此实用计划通常保持较浅的层级。'])
    ]));
    state._render();
  }

  // ── reflection-loop: 行动 -> 评估 -> 批评 -> 修订，质量上升 ──
  function reflectionLoop(host) {
    var state = { iter: 3 };
    var stages = ['行动', '评估', '评议', '修订'];
    var W = 520, H = 170;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var bar = el('i');
    var barWrap = el('div', { class: 'lf-bar' }, [bar]);
    var status = el('span', { class: 'lf-num' });
    var meta = el('div', { class: 'lf-meta' });
    function quality(n) { return 100 * (1 - 0.7 * Math.pow(0.6, n)); }
    state._render = function () {
      var n = state.iter;
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      svg.appendChild(arrowDefs());
      var bw = 104, gap = 14, x0 = 18, y = 60, h = 44, active = (n - 1) % 4;
      var x = x0, i;
      for (i = 0; i < 4; i++) {
        svg.appendChild(box(x, y, bw, h, stages[i], i === active));
        if (i < 3) { svg.appendChild(arrow(x + bw, y + h / 2, x + bw + gap, y + h / 2)); }
        x += bw + gap;
      }
      svg.appendChild(arrow(x0 + bw / 2, y + h, x0 + bw / 2, y + h + 18, '4 4'));
      svg.appendChild(svgEl('path', { d: 'M ' + (x0 + bw / 2) + ' ' + (y + h + 18) + ' L ' + (x - gap - bw / 2) + ' ' + (y + h + 18) + ' L ' + (x - gap - bw / 2) + ' ' + (y + h + 6), fill: 'none', stroke: 'var(--ink-soft,#555)', 'stroke-width': '1.4', 'stroke-dasharray': '4 4', 'marker-end': 'url(#lf-fr-arrow)' }));
      svg.appendChild(label(W / 2, y + h + 34, '修订结果用于下一次尝试'));
      var q = quality(n);
      status.innerHTML = q.toFixed(1) + ' <small>质量分数</small>';
      bar.style.width = q.toFixed(1) + '%';
      var gain = quality(n) - quality(n - 1);
      meta.textContent = '第 ' + n + ' 次迭代  ·  本轮提升 +' + gain.toFixed(1) + '  ·  ' + (gain < 2 ? '收益趋于平缓，应停止反思' : '仍在改进');
    };
    var grid = el('div', {}, [LF.slider(state, 'iter', '反思迭代次数（Reflection Iterations）', 1, 8, 1)]);
    host.appendChild(el('div', { class: 'lf' }, [
      el('div', { class: 'lf-head' }, [el('span', { class: 'lf-label' }, ['反思循环（Reflection Loop）']), el('span', {}, ['调整迭代次数'])]),
      el('div', { class: 'lf-body' }, [grid, el('div', { class: 'lf-out' }, [svg, el('div', { style: 'margin-top:12px' }, [status]), barWrap, meta])]),
      el('div', { class: 'lf-cap' }, ['自我改进循环（Self-Improvement Loop）先行动，再评估结果、评议问题，并在下次尝试前修订。每轮都提高质量，但增益按几何级数缩小，很快趋于平缓。关键是识别何时反思的收益已不足以抵消成本。'])
    ]));
    state._render();
  }

  // ── memory-consolidation: 将情景事件（Episodic events）压缩成语义摘要（Semantic summary） ──
  function memoryConsolidation(host) {
    var state = { events: 24, threshold: 8 };
    var W = 520, H = 150;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    state._render = function () {
      var n = state.events, thr = state.threshold;
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      svg.appendChild(arrowDefs());
      var consolidated = n > thr ? n - thr : 0;
      var recent = n - consolidated;
      var dotW = Math.min(11, (W - 200) / Math.max(1, n));
      var x = 14, i;
      for (i = 0; i < n; i++) {
        var old = i < consolidated;
        svg.appendChild(svgEl('rect', { x: x, y: 26, width: Math.max(2, dotW - 2), height: 22, rx: '2', fill: old ? 'var(--rule-soft,#ddd)' : 'var(--blueprint,#3553ff)', opacity: old ? '0.5' : '1' }));
        x += dotW;
      }
      svg.appendChild(label(170, 18, '情节事件（蓝色表示近期事件）'));
      var summaryX = W - 150, summaryY = 80;
      svg.appendChild(box(summaryX, summaryY, 132, 40, '语义记忆', consolidated > 0));
      svg.appendChild(arrow(consolidated > 0 ? (14 + consolidated * dotW / 2) : 14, 50, summaryX + 4, summaryY + 6, '4 4'));
      svg.appendChild(label(summaryX + 66, summaryY - 8, consolidated + ' 个事件 → 1 份摘要'));
      meta.textContent = recent + ' 个近期事件保留原始记录  ·  ' + consolidated + ' 个较早事件压缩为长期记忆';
      formula.textContent = '保留最新 ' + thr + ' 个情节事件；缓冲区超限后，其余整合为语义摘要';
    };
    var grid = el('div', { class: 'lf-grid' }, [
      LF.slider(state, 'events', '情节事件数（Episodic Events）', 4, 40, 1),
      LF.slider(state, 'threshold', '记忆整合阈值（Consolidation Threshold）', 2, 20, 1)
    ]);
    host.appendChild(el('div', { class: 'lf' }, [
      el('div', { class: 'lf-head' }, [el('span', { class: 'lf-label' }, ['记忆整合（Memory Consolidation）']), el('span', {}, ['调整阈值'])]),
      el('div', { class: 'lf-body' }, [grid, el('div', { class: 'lf-out' }, [svg, meta, formula])]),
      el('div', { class: 'lf-cap' }, ['近期步骤保存为详细的情节记录（Episodic Record）。缓冲区超过阈值后，最早的情节被压缩为简洁的语义摘要（Semantic Summary），保留要点并释放上下文窗口。长期运行的智能体通过整合记忆持续工作，无须永久记住每一个词元。'])
    ]));
    state._render();
  }

  // ── world-model-rollout: 使用学得的模型想象未来状态 ──
  function worldModelRollout(host) {
    var state = { rollout: 2, branch: 2 };
    var W = 520, H = 240;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    state._render = function () {
      var depth = state.rollout, b = state.branch;
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      var top = 28, rowH = (H - 66) / Math.max(1, depth);
      var prev = [{ x: W / 2 }];
      svg.appendChild(svgEl('circle', { cx: W / 2, cy: top, r: '9', fill: 'var(--blueprint,#3553ff)' }));
      svg.appendChild(label(W / 2, top - 14, '当前'));
      var lv;
      for (lv = 1; lv <= depth; lv++) {
        var count = Math.pow(b, lv);
        if (count > 32) { count = 32; }
        var y = top + rowH * lv;
        var cur = [], k;
        for (k = 0; k < count; k++) {
          var x = W * (k + 1) / (count + 1);
          cur.push({ x: x });
          var parent = prev[Math.floor(k / b) % prev.length] || prev[0];
          svg.appendChild(svgEl('line', { x1: parent.x, y1: top + rowH * (lv - 1) + 9, x2: x, y2: y - 6, stroke: 'var(--rule-soft,#ddd)', 'stroke-width': '1', 'stroke-dasharray': '3 3' }));
          svg.appendChild(svgEl('circle', { cx: x, cy: y, r: '6', fill: 'var(--bg-surface,#eee)', stroke: 'var(--ink-soft,#555)', 'stroke-width': '1' }));
        }
        prev = cur;
      }
      var imagined = 0;
      for (lv = 1; lv <= depth; lv++) { imagined += Math.pow(b, lv); }
      meta.textContent = '向前推演 ' + depth + ' 步，每状态 ' + b + ' 个动作  →  执行一次真实动作前，先模拟 ' + imagined + ' 个想象状态';
      formula.textContent = '想象状态数 = sum b^k，k=1..depth  ·  成本随推演深度指数增长';
    };
    var grid = el('div', { class: 'lf-grid' }, [
      LF.slider(state, 'rollout', '推演深度（Rollout Depth，向前步数）', 1, 3, 1),
      LF.slider(state, 'branch', '每状态的动作数', 1, 4, 1)
    ]);
    host.appendChild(el('div', { class: 'lf' }, [
      el('div', { class: 'lf-head' }, [el('span', { class: 'lf-label' }, ['世界模型推演（World-Model Rollout）']), el('span', {}, ['调整深度与分支数'])]),
      el('div', { class: 'lf-body' }, [grid, el('div', { class: 'lf-out' }, [svg, meta, formula])]),
      el('div', { class: 'lf-cap' }, ['基于模型的规划（Model-Based Planning）在影响真实世界之前先模拟未来。智能体从当前状态出发，想象各候选动作导致的状态，再用学得的模型继续向前推演，最后才执行最优的第一步。更深的推演能改善规划，但想象状态树会指数增长。'])
    ]));
    state._render();
  }

  // ── autonomy-oversight: 风险旋钮将行动路由到自动执行或人工门控（Human gate） ──
  function autonomyOversight(host) {
    var state = { autonomy: 50 };
    var actions = [
      { name: '读取文件', risk: 10 },
      { name: '执行查询', risk: 30 },
      { name: '写入文件', risk: 55 },
      { name: '执行 Shell 命令', risk: 75 },
      { name: '部署到生产环境', risk: 92 }
    ];
    var rows = el('div', {});
    var status = el('span', { class: 'lf-num' });
    var meta = el('div', { class: 'lf-meta' });
    state._render = function () {
      var allow = state.autonomy;
      while (rows.firstChild) rows.removeChild(rows.firstChild);
      var auto = 0;
      actions.forEach(function (a) {
        var ok = a.risk <= allow;
        if (ok) { auto++; }
        var bar = el('i'); bar.style.width = a.risk + '%';
        if (!ok) { bar.style.background = 'var(--warn,#b8870f)'; }
        var lab = el('label', {}, [a.name + '（风险 ' + a.risk + '）', el('b', {}, [ok ? '自动批准' : '转交人工 →'])]);
        if (!ok) { lab.style.color = 'var(--warn,#b8870f)'; }
        rows.appendChild(el('div', { class: 'lf-ctrl' }, [lab, el('div', { class: 'lf-bar' + (ok ? '' : ' over') }, [bar])]));
      });
      status.innerHTML = auto + ' / ' + actions.length + ' <small>项自动批准</small>';
      meta.textContent = '自主阈值 ' + allow + '：风险不高于阈值的动作自动执行，更高风险的动作交由人工审批';
    };
    var grid = el('div', {}, [LF.slider(state, 'autonomy', '自主执行的风险阈值（Autonomy Threshold）', 0, 100, 1)]);
    host.appendChild(el('div', { class: 'lf' }, [
      el('div', { class: 'lf-head' }, [el('span', { class: 'lf-label' }, ['自主执行监督（Autonomy Oversight）']), el('span', {}, ['调整阈值'])]),
      el('div', { class: 'lf-body' }, [grid, el('div', { class: 'lf-out' }, [rows, el('div', { style: 'margin-top:12px' }, [status]), meta])]),
      el('div', { class: 'lf-cap' }, ['人类在环（Human-in-the-Loop）可以按程度调节。一个自主执行阈值允许低风险动作无人值守运行，超过阈值的动作则暂停等待人工批准。提高阈值换取速度，降低阈值加强控制。无论阈值如何设置，生产部署的风险评分都应处于高位。'])
    ]));
    state._render();
  }

  // ── pass-at-k: pass@k = 1 - (1-p)^k 随 k 增大而趋近 1 ──
  function passAtK(host) {
    var state = { p: 0.3, k: 5 };
    var W = 520, H = 210, PAD = 34, KMAX = 20;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var num = el('span', { class: 'lf-num' });
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    function passK(p, k) { return 1 - Math.pow(1 - p, k); }
    function px(k) { return PAD + (k - 1) / (KMAX - 1) * (W - 2 * PAD); }
    function py(v) { return H - PAD - v * (H - 2 * PAD); }
    state._render = function () {
      var p = state.p, k = state.k;
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      svg.appendChild(svgEl('line', { x1: PAD, y1: py(1), x2: W - PAD, y2: py(1), stroke: 'var(--rule-soft,#ddd)', 'stroke-width': '1', 'stroke-dasharray': '3 3' }));
      var d = '', kk;
      for (kk = 1; kk <= KMAX; kk++) { d += (kk === 1 ? 'M' : 'L') + px(kk).toFixed(1) + ' ' + py(passK(p, kk)).toFixed(1) + ' '; }
      svg.appendChild(svgEl('path', { d: d, fill: 'none', stroke: 'var(--blueprint,#3553ff)', 'stroke-width': '2' }));
      svg.appendChild(svgEl('circle', { cx: px(k), cy: py(passK(p, k)), r: '5', fill: 'var(--blueprint,#3553ff)' }));
      var v = passK(p, k);
      num.innerHTML = (v * 100).toFixed(1) + ' <small>% pass@' + k + '</small>';
      meta.textContent = '单次采样成功率 ' + (p * 100).toFixed(0) + '%  ·  ' + k + ' 次尝试使至少一次成功的概率升至 ' + (v * 100).toFixed(1) + '%';
      formula.textContent = 'pass@k = 1 - (1 - p)^k,  p = ' + p.toFixed(2) + ', k = ' + k + '   ·   k → 无穷时，概率趋近于 1';
    };
    var grid = el('div', { class: 'lf-grid' }, [
      LF.slider(state, 'p', '单次采样成功率 p', 0.02, 0.95, 0.01),
      LF.slider(state, 'k', '采样次数 k', 1, KMAX, 1)
    ]);
    host.appendChild(el('div', { class: 'lf' }, [
      el('div', { class: 'lf-head' }, [el('span', { class: 'lf-label' }, ['k 次采样通过率（Pass@k）']), el('span', {}, ['调整 p 和 k'])]),
      el('div', { class: 'lf-body' }, [grid, el('div', { class: 'lf-out' }, [svg, el('div', { style: 'margin-top:10px' }, [num]), meta, formula])]),
      el('div', { class: 'lf-cap' }, ['Pass@k 衡量 k 次独立采样中是否至少有一次解决任务。每次尝试成功概率为 p，则 k 次全部失败的概率为 (1-p)^k，Pass@k 就是 1 减去该概率。即使较弱的模型，增加采样次数也能显著提高通过率，因此 k 选优（Best-of-k）是一种成本较低的改进方式，Pass@1 与 Pass@k 也反映不同能力。'])
    ]));
    state._render();
  }

  // ── eval-harness-matrix: 任务 x 变体（Variants）网格，按变体汇总 ──
  function evalHarnessMatrix(host) {
    var state = { variant: '0' };
    var tasks = ['解析 JSON', '列表排序', 'SQL 连接', '正则提取', '递归', '边界情况'];
    // 每个 [variant][task] 对应确定性的通过(1)/失败(0)
    var grids = [
      [1, 1, 0, 1, 1, 0],
      [1, 1, 1, 1, 1, 1],
      [1, 0, 0, 1, 0, 0]
    ];
    var names = ['基线', '调优', '消融'];
    var W = 520, H = 200;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var status = el('span', { class: 'lf-num' });
    var meta = el('div', { class: 'lf-meta' });
    state._render = function () {
      var sel = Number(state.variant);
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      var x0 = 110, y0 = 34, cw = (W - x0 - 20) / tasks.length, ch = 30;
      var v, t;
      tasks.forEach(function (tn, ti) {
        var lx = x0 + cw * ti + cw / 2;
        var t1 = svgEl('text', { x: lx, y: y0 - 6, 'text-anchor': 'middle', 'font-family': 'var(--font-mono,monospace)', 'font-size': '8.5', fill: 'var(--ink-mute,#777)', transform: 'rotate(-18 ' + lx + ' ' + (y0 - 6) + ')' });
        t1.appendChild(document.createTextNode(tn)); svg.appendChild(t1);
      });
      for (v = 0; v < grids.length; v++) {
        var ry = y0 + 8 + v * (ch + 8);
        var on = v === sel;
        var nt = svgEl('text', { x: x0 - 10, y: ry + ch / 2 + 4, 'text-anchor': 'end', 'font-family': 'var(--font-mono,monospace)', 'font-size': '11', fill: on ? 'var(--blueprint,#3553ff)' : 'var(--ink-soft,#555)' });
        nt.appendChild(document.createTextNode(names[v])); svg.appendChild(nt);
        for (t = 0; t < tasks.length; t++) {
          var pass = grids[v][t] === 1;
          var cx = x0 + cw * t + 2;
          svg.appendChild(svgEl('rect', { x: cx, y: ry, width: cw - 4, height: ch, rx: '3', fill: pass ? 'var(--blueprint,#3553ff)' : 'var(--bg-surface,#eee)', stroke: pass ? 'var(--blueprint,#3553ff)' : 'var(--warn,#b8870f)', 'stroke-width': pass ? '0' : '1.4', opacity: on ? '1' : '0.4' }));
          var mark = svgEl('text', { x: cx + (cw - 4) / 2, y: ry + ch / 2 + 4, 'text-anchor': 'middle', 'font-family': 'var(--font-mono,monospace)', 'font-size': '11', fill: pass ? 'var(--bg,#fafaf5)' : 'var(--warn,#b8870f)', opacity: on ? '1' : '0.4' });
          mark.appendChild(document.createTextNode(pass ? 'P' : 'F')); svg.appendChild(mark);
        }
      }
      var passed = 0; for (t = 0; t < tasks.length; t++) { if (grids[sel][t] === 1) { passed++; } }
      status.innerHTML = passed + ' / ' + tasks.length + ' <small>' + names[sel] + '</small>';
      meta.textContent = names[sel] + '汇总分数 = ' + (passed / tasks.length * 100).toFixed(0) + '%  ·  每个固定测试任务中，P 表示通过（Pass），F 表示失败（Fail）';
    };
    var grid = el('div', {}, [LF.select(state, 'variant', '模型变体（Model Variant）', [
      ['基线（Baseline）', '0'], ['调优（Tuned）', '1'], ['消融（Ablation）', '2']
    ])]);
    host.appendChild(el('div', { class: 'lf' }, [
      el('div', { class: 'lf-head' }, [el('span', { class: 'lf-label' }, ['评估框架矩阵（Eval Harness Matrix）']), el('span', {}, ['选择模型变体'])]),
      el('div', { class: 'lf-body' }, [grid, el('div', { class: 'lf-out' }, [svg, el('div', { style: 'margin-top:10px' }, [status]), meta])]),
      el('div', { class: 'lf-cap' }, ['评估框架（Evaluation Harness）用每种模型变体运行所有任务，将通过或失败记录到网格中。沿列查看可识别困难任务，沿行汇总可得到某一变体的总分。这个矩阵把模糊判断转成可用于回归测试（Regression Test）的数字。'])
    ]));
    state._render();
  }

  // ── canary-rollout: 流量分配、错误率与回滚触发条件（Rollback trigger） ──
  function canaryRollout(host) {
    var state = { canary: 10 };
    var stableErr = 0.4, canaryErr = 2.6, sla = 1.5;
    var W = 520, H = 120;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var status = el('span', { class: 'lf-num' });
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    state._render = function () {
      var c = state.canary, s = 100 - c;
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      var x0 = 14, y = 30, h = 44, fullW = W - 28;
      var sw = fullW * s / 100;
      svg.appendChild(svgEl('rect', { x: x0, y: y, width: Math.max(0, sw), height: h, fill: 'var(--blueprint,#3553ff)' }));
      svg.appendChild(svgEl('rect', { x: x0 + sw, y: y, width: Math.max(0, fullW - sw), height: h, fill: 'var(--warn,#b8870f)' }));
      svg.appendChild(label(84, y - 10, '稳定版 ' + s + '%', 'var(--blueprint,#3553ff)'));
      svg.appendChild(label(W - 84, y - 10, '灰度版 ' + c + '%', 'var(--warn,#b8870f)'));
      var blended = (s * stableErr + c * canaryErr) / 100;
      var rollback = canaryErr > sla;
      svg.appendChild(label(W / 2, y + h + 22, '灰度版错误率 ' + canaryErr.toFixed(1) + '%，SLA ' + sla.toFixed(1) + '%' + (rollback ? '  已触发回滚' : ''), rollback ? 'var(--warn,#b8870f)' : 'var(--ink-mute,#777)'));
      status.innerHTML = blended.toFixed(2) + ' <small>% 混合错误率</small>';
      meta.textContent = rollback ? '灰度版违反 SLA：将其流量转回稳定版' : '灰度版满足 SLA：可以继续放量';
      formula.textContent = '混合错误率 = (稳定版占比% · ' + stableErr + ' + 灰度版占比% · ' + canaryErr + ') / 100  ·  灰度版错误率 > SLA 时触发回滚';
    };
    var grid = el('div', {}, [LF.slider(state, 'canary', '灰度流量占比 %', 0, 100, 1)]);
    host.appendChild(el('div', { class: 'lf' }, [
      el('div', { class: 'lf-head' }, [el('span', { class: 'lf-label' }, ['灰度发布（Canary Rollout）']), el('span', {}, ['调整灰度流量占比'])]),
      el('div', { class: 'lf-body' }, [grid, el('div', { class: 'lf-out' }, [svg, el('div', { style: 'margin-top:10px' }, [status]), meta, formula])]),
      el('div', { class: 'lf-cap' }, ['灰度发布（Canary Release）将少量流量路由到新版本，其余继续使用已验证的稳定版本。根据服务等级协议（Service-Level Agreement，SLA）监测灰度版错误率，一旦超标就将流量转回稳定版。这里灰度版的错误率偏高，因此扩大占比会提高混合错误率，并持续满足回滚触发条件。'])
    ]));
    state._render();
  }

  // ── trace-spans: 时间线上的嵌套跨度（Spans），展开一个查看子跨度 ──
  function traceSpans(host) {
    // 每个跨度：name、start、dur (ms)、depth
    var spans = [
      { name: 'handle_request', start: 0, dur: 1200, depth: 0 },
      { name: 'llm_call (plan)', start: 40, dur: 420, depth: 1 },
      { name: 'retrieval', start: 480, dur: 260, depth: 1 },
      { name: 'vector_search', start: 510, dur: 150, depth: 2 },
      { name: 'rerank', start: 670, dur: 60, depth: 2 },
      { name: 'tool_call (db)', start: 760, dur: 180, depth: 1 },
      { name: 'llm_call (answer)', start: 960, dur: 230, depth: 1 }
    ];
    var state = { expand: 1 };
    var W = 520, total = 1200;
    var status = el('span', { class: 'lf-num' });
    var meta = el('div', { class: 'lf-meta' });
    state._render = function () {
      var pad = 14, x0 = 150, rowH = 24, axW = W - x0 - 18;
      var H = pad * 2 + spans.length * rowH + 10;
      var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
      function px(ms) { return x0 + ms / total * axW; }
      var sel = LF.clamp(state.expand, 0, spans.length - 1);
      var i;
      for (i = 0; i <= 4; i++) {
        var gx = px(total * i / 4);
        svg.appendChild(svgEl('line', { x1: gx, y1: pad, x2: gx, y2: H - pad, stroke: 'var(--rule-soft,#ddd)', 'stroke-width': '1', 'stroke-dasharray': '2 4' }));
        svg.appendChild(label(Math.min(W - 26, gx), H - 5, (total * i / 4) + 'ms'));
      }
      spans.forEach(function (sp, idx) {
        var y = pad + idx * rowH;
        var on = idx === sel;
        var nt = svgEl('text', { x: 8 + sp.depth * 12, y: y + rowH / 2 + 4, 'font-family': 'var(--font-mono,monospace)', 'font-size': '9.5', fill: on ? 'var(--blueprint,#3553ff)' : 'var(--ink-soft,#555)' });
        nt.appendChild(document.createTextNode(sp.name)); svg.appendChild(nt);
        svg.appendChild(svgEl('rect', { x: px(sp.start), y: y + 4, width: Math.max(2, axW * sp.dur / total), height: rowH - 10, rx: '2', fill: on ? 'var(--blueprint,#3553ff)' : 'var(--bg-surface,#eee)', stroke: on ? 'var(--blueprint,#3553ff)' : 'var(--rule-soft,#ddd)', 'stroke-width': '1' }));
        if (on) {
          var endX = px(sp.start) + Math.max(2, axW * sp.dur / total);
          svg.appendChild(label(endX + 46 > W ? endX - 26 : endX + 22, endX + 46 > W ? y + 2 : y + rowH / 2 + 4, sp.dur + 'ms', 'var(--blueprint,#3553ff)'));
        }
      });
      while (out.firstChild) { out.removeChild(out.firstChild); }
      out.appendChild(svg);
      out.appendChild(el('div', { style: 'margin-top:10px' }, [status]));
      out.appendChild(meta);
      var s = spans[sel];
      status.innerHTML = s.dur + ' <small>ms · ' + s.name + '</small>';
      meta.textContent = '跨度起点 ' + s.start + 'ms，持续 ' + s.dur + 'ms，深度 ' + s.depth + '  ·  整条追踪 ' + total + 'ms（根跨度下的子跨度按缩进嵌套）';
    };
    var out = el('div', { class: 'lf-out' });
    var grid = el('div', {}, [LF.slider(state, 'expand', '查看追踪跨度（Span）', 0, spans.length - 1, 1)]);
    host.appendChild(el('div', { class: 'lf' }, [
      el('div', { class: 'lf-head' }, [el('span', { class: 'lf-label' }, ['追踪跨度（Trace Spans）']), el('span', {}, ['选择查看的跨度'])]),
      el('div', { class: 'lf-body' }, [grid, out]),
      el('div', { class: 'lf-cap' }, ['分布式追踪（Distributed Trace）是沿时间轴展开的跨度树。根跨度 handle_request 覆盖整个请求；LLM 规划调用 llm_call (plan)、检索 retrieval、向量搜索 vector_search、重排序 rerank、数据库工具调用 tool_call (db) 及回答调用 llm_call (answer) 按开始时间和持续时长嵌套其中。甘特图（Gantt Chart）显示延迟实际花在哪里，这是生产故障排查首先要回答的问题。'])
    ]));
    state._render();
  }

  LF.register({
    'task-decomposition': taskDecomposition,
    'reflection-loop': reflectionLoop,
    'memory-consolidation': memoryConsolidation,
    'world-model-rollout': worldModelRollout,
    'autonomy-oversight': autonomyOversight,
    'pass-at-k': passAtK,
    'eval-harness-matrix': evalHarnessMatrix,
    'canary-rollout': canaryRollout,
    'trace-spans': traceSpans
  });
})();
