/* figures-agents2.js - 高级智能体工程（Agent engineering）与多智能体协调（Multi-agent coordination）的交互课程图表。
   在 lesson-figures.js 之后加载，通过 window.LF 注册。无依赖，使用 ES5，主题由 CSS 变量控制。
   编写方式：使用一个以以下某个组件名称为内容的 ```figure 块。 */
(function () {
  'use strict';
  var LF = window.LF;
  if (!LF) { return; }
  var el = LF.el, svgEl = LF.svgEl;

  function arrowDefs() {
    var marker = svgEl('marker', { id: 'lf-a2-arrow', viewBox: '0 0 8 8', refX: '7', refY: '4', markerWidth: '7', markerHeight: '7', orient: 'auto-start-reverse' }, [
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
    return svgEl('line', { x1: x1, y1: y1, x2: x2, y2: y2, stroke: 'var(--ink-soft,#555)', 'stroke-width': '1.4', 'marker-end': 'url(#lf-a2-arrow)', 'stroke-dasharray': dash || '' });
  }
  function label(x, y, txt, fill, size) {
    var t = svgEl('text', { x: x, y: y, 'text-anchor': 'middle', 'font-family': 'var(--font-mono,monospace)', 'font-size': size || '10', fill: fill || 'var(--ink-mute,#777)' });
    t.appendChild(document.createTextNode(txt));
    return t;
  }

  // -- rewoo-plan: 预先规划所有工具调用（Tool calls），再执行，与 ReAct 对比 --
  function rewooPlan(host) {
    var state = { steps: 4 };
    var W = 520, H = 230;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    state._render = function () {
      var n = state.steps;
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      svg.appendChild(arrowDefs());
      var i;
      // ReWOO 行：一个规划器（Planner），随后由工作器（Worker）执行完整计划
      svg.appendChild(label(W / 2, 16, 'ReWOO：一次规划，再执行', 'var(--blueprint,#3553ff)', '11'));
      svg.appendChild(box(18, 30, 90, 34, '规划器', true));
      var plX = 130;
      for (i = 0; i < n; i++) {
        var bx = plX + i * ((W - plX - 18) / n);
        svg.appendChild(box(bx, 30, (W - plX - 18) / n - 8, 34, '调用 ' + (i + 1), false));
        if (i === 0) { svg.appendChild(arrow(108, 47, bx, 47)); }
        else { svg.appendChild(arrow(bx - 8, 47, bx, 47)); }
      }
      // ReAct 行：交替思考/行动/观察，每次行动调用一次大语言模型（LLM）
      svg.appendChild(label(W / 2, 120, 'ReAct：每一步都穿插模型调用', 'var(--warn,#b8870f)', '11'));
      var rx = 18, ry = 134;
      for (i = 0; i < n; i++) {
        svg.appendChild(box(rx, ry, 58, 30, 'LLM', false));
        svg.appendChild(arrow(rx + 58, ry + 15, rx + 78, ry + 15));
        svg.appendChild(box(rx + 78, ry, 42, 30, '行动', false));
        if (i < n - 1) { svg.appendChild(arrow(rx + 120, ry + 15, rx + 138, ry + 15)); }
        rx += 138;
        if (rx > W - 120) { rx = 18; ry += 40; }
      }
      var rewooCalls = 1;
      var reactCalls = n;
      meta.textContent = 'ReWOO 用 ' + rewooCalls + ' 次规划调用安排 ' + n + ' 个工具；ReAct 调用模型 ' + reactCalls + ' 次，每个工具执行前一次';
      formula.textContent = 'ReWOO 模型调用数 = 1（规划）+ 1（求解）= 2；ReAct 模型调用数 = ' + n + '。总计 2 次与 ' + n + ' 次，ReWOO 在开始时一次性加载上下文';
    };
    var grid = el('div', {}, [LF.slider(state, 'steps', '计划中的工具调用数', 2, 6, 1)]);
    host.appendChild(el('div', { class: 'lf' }, [
      el('div', { class: 'lf-head' }, [el('span', { class: 'lf-label' }, ['ReWOO 规划与执行（Plan-Execute）']), el('span', {}, ['调整计划规模'])]),
      el('div', { class: 'lf-body' }, [grid, el('div', { class: 'lf-out' }, [svg, meta, formula])]),
      el('div', { class: 'lf-cap' }, ['ReWOO 将推理（Reasoning）与观察（Observation）分离。规划器（Planner）一次写出完整工具调用链，再由执行器（Worker）执行，步骤间无需再次调用模型。ReAct 则在每次行动前调用模型，每次都重新读取不断增长的完整轨迹（Trajectory）；运行越长，消耗的词元（Token）就越多。'])
    ]));
    state._render();
  }

  // -- tree-of-thoughts: 分支推理树（Reasoning tree），束搜索（Beam search）保留最佳路径 --
  function treeOfThoughts(host) {
    var state = { breadth: 3, depth: 3, beam: 2 };
    var W = 520, H = 250, PAD = 22;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    // 根据层级与索引生成确定性伪评分（Pseudo-score）
    function score(level, idx) {
      var v = Math.sin((level + 1) * 12.9898 + (idx + 1) * 78.233) * 43758.5453;
      return v - Math.floor(v);
    }
    state._render = function () {
      var b = state.breadth, depth = state.depth, beam = Math.min(state.beam, b);
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      var rowH = (H - 2 * PAD) / depth;
      var level, kept = [{ x: W / 2, idx: 0 }];
      svg.appendChild(svgEl('circle', { cx: W / 2, cy: PAD, r: '6', fill: 'var(--blueprint,#3553ff)' }));
      var lastBest = null, totalNodes = 1;
      for (level = 1; level <= depth; level++) {
        var children = [], parentRow = kept, y = PAD + rowH * level;
        var slot = 0, totalSlots = parentRow.length * b;
        parentRow.forEach(function (p, pi) {
          var k;
          for (k = 0; k < b; k++) {
            var x = (W) * (slot + 1) / (totalSlots + 1);
            var s = score(level, slot);
            children.push({ x: x, y: y, idx: slot, s: s, px: p.x });
            slot++;
            totalNodes++;
          }
        });
        // 按评分挑选束中最佳子节点
        var ranked = children.slice().sort(function (a, c) { return c.s - a.s; });
        var keepSet = {};
        var m; for (m = 0; m < beam && m < ranked.length; m++) { keepSet[ranked[m].idx] = true; }
        children.forEach(function (c) {
          var on = !!keepSet[c.idx];
          svg.appendChild(svgEl('line', { x1: c.px, y1: PAD + rowH * (level - 1) + 6, x2: c.x, y2: c.y - 6, stroke: on ? 'var(--blueprint,#3553ff)' : 'var(--rule-soft,#ddd)', 'stroke-width': on ? '1.4' : '0.8', opacity: on ? '0.9' : '0.5' }));
          svg.appendChild(svgEl('circle', { cx: c.x, cy: c.y, r: on ? '6' : '4', fill: on ? 'var(--blueprint,#3553ff)' : 'var(--bg-surface,#eee)', stroke: 'var(--ink-soft,#555)', 'stroke-width': '1' }));
        });
        kept = children.filter(function (c) { return keepSet[c.idx]; }).map(function (c) { return { x: c.x, idx: c.idx }; });
        lastBest = ranked[0];
      }
      var explored = totalNodes - 1;
      meta.textContent = '在 ' + depth + ' 层中探索了 ' + explored + ' 个思路；每层保留最优的 ' + Math.min(state.beam, b) + ' 个（蓝色），其余剪枝';
      formula.textContent = '宽度 ' + b + '、深度 ' + depth + '，最多产生 ' + Math.pow(b, depth) + ' 个叶节点；束搜索将待扩展节点限制为 ' + Math.min(state.beam, b) + ' 个，使计算可控';
    };
    var grid = el('div', { class: 'lf-grid' }, [
      LF.slider(state, 'breadth', '宽度（每节点的思路数）', 2, 4, 1),
      LF.slider(state, 'depth', '深度（推理步数）', 1, 4, 1),
      LF.slider(state, 'beam', '保留的束宽（Beam Width）', 1, 4, 1)
    ]);
    host.appendChild(el('div', { class: 'lf' }, [
      el('div', { class: 'lf-head' }, [el('span', { class: 'lf-label' }, ['思维树（Tree of Thoughts）']), el('span', {}, ['调整宽度与深度'])]),
      el('div', { class: 'lf-body' }, [grid, el('div', { class: 'lf-out' }, [svg, meta, formula])]),
      el('div', { class: 'lf-cap' }, ['思维树（Tree of Thoughts）将单条推理链转化为搜索过程。模型在每一步提出多个候选思路，由评分器排序，束搜索（Beam Search）只保留最优的几个继续展开。剪除较弱分支，使指数增长的树仍可在可承受的成本内探索，同时允许智能体从错误推理路径回溯（Backtrack）。'])
    ]));
    state._render();
  }

  // -- self-refine: 批评与修订（Critique-and-revise）循环，质量先上升后趋于平台 --
  function selfRefine(host) {
    var state = { iters: 3 };
    var W = 520, H = 210, PAD = 34, IMAX = 8;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var num = el('span', { class: 'lf-num' });
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    // quality(0)=52，增益按几何级数递减，逼近上限 94
    function quality(k) { return 94 - 42 * Math.pow(0.62, k); }
    function px(k) { return PAD + k / IMAX * (W - 2 * PAD); }
    function py(q) { return H - PAD - (q - 40) / 60 * (H - 2 * PAD); }
    state._render = function () {
      var n = state.iters;
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      svg.appendChild(svgEl('line', { x1: PAD, y1: py(94), x2: W - PAD, y2: py(94), stroke: 'var(--rule-soft,#ddd)', 'stroke-width': '1', 'stroke-dasharray': '3 3' }));
      svg.appendChild(label(W - PAD - 30, py(94) - 6, '上限', 'var(--ink-mute,#777)', '9'));
      var d = '', k;
      for (k = 0; k <= IMAX; k++) { d += (k ? 'L' : 'M') + px(k).toFixed(1) + ' ' + py(quality(k)).toFixed(1) + ' '; }
      svg.appendChild(svgEl('path', { d: d, fill: 'none', stroke: 'var(--rule-soft,#ccc)', 'stroke-width': '1.5', 'stroke-dasharray': '4 3' }));
      for (k = 0; k <= n; k++) {
        svg.appendChild(svgEl('circle', { cx: px(k), cy: py(quality(k)), r: k === n ? '5' : '3.5', fill: 'var(--blueprint,#3553ff)' }));
      }
      var q = quality(n), gain = quality(n) - quality(n - 1 < 0 ? 0 : n - 1);
      num.innerHTML = q.toFixed(1) + ' <small>/ 100 质量分</small>';
      meta.textContent = n === 0 ? '初稿，尚未进行自我评议'
        : '第 ' + n + ' 次迭代提升 +' + (n >= 1 ? (quality(n) - quality(n - 1)).toFixed(1) : '0') + ' 分；' + (n >= 4 ? '收益已趋平，可以停止改进' : '仍在改善');
      formula.textContent = '每轮：评议自己的输出 → 修订。gain_k = ceiling - draft 按几何级数缩小，因此质量逐渐进入平台期';
    };
    var grid = el('div', {}, [LF.slider(state, 'iters', '改进迭代次数', 0, IMAX, 1)]);
    host.appendChild(el('div', { class: 'lf' }, [
      el('div', { class: 'lf-head' }, [el('span', { class: 'lf-label' }, ['自我改进（Self-Refine）']), el('span', {}, ['调整迭代次数'])]),
      el('div', { class: 'lf-body' }, [grid, el('div', { class: 'lf-out' }, [svg, el('div', { style: 'margin-top:10px' }, [num]), meta, formula])]),
      el('div', { class: 'lf-cap' }, ['自我改进（Self-Refine）让同一个模型撰写答案、评议自己的工作并修订，将输出循环用作输入。前几轮发现明显缺陷，收益最大；后续可修正的问题越来越少，质量逐步接近上限并趋于平稳。关键是判断何时新增迭代已不值得继续消耗词元。'])
    ]));
    state._render();
  }

  // -- memory-blocks: 固定核心记忆（Core memory）与无界归档（Archival），分页调入/调出 --
  function memoryBlocks(host) {
    var state = { paged: 3 };
    var W = 520, H = 230;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    var CORE = 4; // 固定核心槽位（Core slots）
    var archival = ['项目 规格', 'API 密钥笔记', '用户 偏好', '历史 缺陷', '设计 文档', '会议 记录', '模式 v2', '待办 列表'];
    state._render = function () {
      var paged = state.paged;
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      svg.appendChild(arrowDefs());
      // 上下文窗口（Context window）列：固定核心记忆
      svg.appendChild(label(110, 18, '上下文窗口', 'var(--blueprint,#3553ff)', '11'));
      var cy = 30, slot;
      for (slot = 0; slot < CORE; slot++) {
        var filled = slot < paged;
        svg.appendChild(box(40, cy, 140, 38, filled ? archival[slot] : '空闲槽位', filled));
        cy += 46;
      }
      // 归档存储（Archival store），无界
      svg.appendChild(label(400, 18, '归档存储（无界）', 'var(--ink-mute,#777)', '11'));
      var ax = 320, ay = 30, j;
      for (j = 0; j < archival.length; j++) {
        var inCtx = j < paged;
        var col = j % 2, row = Math.floor(j / 2);
        svg.appendChild(box(ax + col * 100, ay + row * 46, 92, 38, archival[j].split(' ')[0], false));
        if (inCtx) {
          svg.appendChild(svgEl('rect', { x: ax + col * 100, y: ay + row * 46, width: 92, height: 38, rx: '4', fill: 'none', stroke: 'var(--blueprint,#3553ff)', 'stroke-width': '1.5', 'stroke-dasharray': '3 2' }));
        }
      }
      svg.appendChild(arrow(186, 120, 314, 120, '5 4'));
      svg.appendChild(label(250, 112, '换入 / 换出', 'var(--ink-soft,#555)', '9'));
      meta.textContent = CORE + ' 个核心槽位已占用 ' + paged + ' 个；' + (archival.length - paged) + ' 条留在归档中等待检索（描边表示当前已换入）';
      formula.textContent = '核心记忆容量固定，始终位于上下文内；磁盘归档存储无界。智能体换入相关条目、换出过时条目，使内容不超过窗口容量';
    };
    var grid = el('div', {}, [LF.slider(state, 'paged', '换入核心记忆的条目数', 0, 4, 1)]);
    host.appendChild(el('div', { class: 'lf' }, [
      el('div', { class: 'lf-head' }, [el('span', { class: 'lf-label' }, ['记忆块（Memory Blocks）']), el('span', {}, ['调整换入条目数'])]),
      el('div', { class: 'lf-body' }, [grid, el('div', { class: 'lf-out' }, [svg, meta, formula])]),
      el('div', { class: 'lf-cap' }, ['结构化智能体记忆将始终驻留上下文窗口的固定核心记忆（Core Memory），与磁盘上的无界归档存储（Archival Store）分开。智能体自行读写记忆：核心记忆满时，将相关性最低的条目摘要化或换出到归档，再按需换入其他条目。这样，有限窗口也能支撑近乎无限的历史记录。'])
    ]));
    state._render();
  }

  // -- voyager-skills: 技能库（Skill library）增长，后续任务组合旧技能 --
  function voyagerSkills(host) {
    var state = { episodes: 4 };
    var W = 520, H = 230, PAD = 22;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    // 每个回合（Episode）新增技能；后续回合复用部分已有技能
    var newPerEp = [2, 2, 1, 2, 1, 1, 1, 1];
    var reusePerEp = [0, 1, 2, 2, 3, 3, 4, 4];
    state._render = function () {
      var ep = state.episodes;
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      var libSize = 0, reusedTotal = 0, i;
      for (i = 0; i < ep; i++) { libSize += newPerEp[i]; reusedTotal += reusePerEp[i]; }
      // 增长条：每个回合结束后的技能库大小
      var maxLib = 0, cum = 0, sizes = [];
      for (i = 0; i < 8; i++) { cum += newPerEp[i]; sizes.push(cum); if (cum > maxLib) maxLib = cum; }
      var bw = (W - 2 * PAD) / 8;
      for (i = 0; i < 8; i++) {
        var active = i < ep;
        var h = sizes[i] / maxLib * (H - 2 * PAD - 30);
        svg.appendChild(svgEl('rect', { x: PAD + i * bw + 4, y: H - PAD - h, width: bw - 8, height: h, fill: active ? 'var(--blueprint,#3553ff)' : 'var(--bg-surface,#eee)', stroke: 'var(--rule-soft,#ddd)', 'stroke-width': '1' }));
        if (active) { svg.appendChild(label(PAD + i * bw + bw / 2, H - PAD - h - 5, String(sizes[i]), 'var(--blueprint,#3553ff)', '10')); }
        svg.appendChild(label(PAD + i * bw + bw / 2, H - PAD + 14, '回合' + (i + 1), 'var(--ink-mute,#777)', '9'));
      }
      svg.appendChild(label(W / 2, 16, '每个回合结束后的技能库规模', 'var(--ink-soft,#555)', '11'));
      meta.textContent = '第 ' + ep + ' 回合：技能库已有 ' + libSize + ' 项可复用技能；本轮在编写新技能前复用了 ' + reusePerEp[ep - 1] + ' 项已有技能';
      formula.textContent = '每个已解决任务都被提炼为有名称、可复用的技能。后续任务通过组合库中已有技能解决，因此能力持续累积';
    };
    var grid = el('div', {}, [LF.slider(state, 'episodes', '已完成回合数（Episodes）', 1, 8, 1)]);
    host.appendChild(el('div', { class: 'lf' }, [
      el('div', { class: 'lf-head' }, [el('span', { class: 'lf-label' }, ['Voyager 技能库（Skill Library）']), el('span', {}, ['调整回合数'])]),
      el('div', { class: 'lf-body' }, [grid, el('div', { class: 'lf-out' }, [svg, meta, formula])]),
      el('div', { class: 'lf-cap' }, ['终身学习智能体（Lifelong Agent）将每个已解决任务转化为有名称、可复用的技能并保存。随着回合（Episode）累积，技能库不断扩大；后续任务通过组合已有技能更快完成，无需从头开始。能力不断累积，每次成功都会降低解决下一个问题的成本。'])
    ]));
    state._render();
  }

  // -- langgraph-state: 节点状态机（State machine），使用条件边，逐步执行 --
  function langgraphState(host) {
    var state = { step: 0 };
    var W = 520, H = 240;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var meta = el('div', { class: 'lf-meta' });
    var stateOut = el('div', { class: 'lf-formula' });
    // 排列节点；确定性遍历依次访问节点并更新状态对象（State object）
    var nodes = [
      { x: 210, y: 24, w: 100, label: 'START' },
      { x: 70, y: 96, w: 110, label: 'retrieve' },
      { x: 340, y: 96, w: 110, label: 'generate' },
      { x: 210, y: 168, w: 120, label: 'grade' },
      { x: 40, y: 168, w: 90, label: 'rewrite' }
    ];
    // 遍历（Walk）：START -> retrieve -> generate -> grade -> (rewrite) -> generate -> grade -> END
    var walk = [0, 1, 2, 3, 4, 2, 3];
    var updates = [
      { key: 'query', val: '"how to deploy"' },
      { key: 'docs', val: '[d1, d2, d3]' },
      { key: 'draft', val: '"run iii ..."' },
      { key: 'grade', val: 'fail (off-topic)' },
      { key: 'query', val: '"deploy iii engine"' },
      { key: 'draft', val: '"iii cloud deploy"' },
      { key: 'grade', val: 'pass' }
    ];
    state._render = function () {
      var s = Math.min(state.step, walk.length - 1);
      var cur = walk[s];
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      svg.appendChild(arrowDefs());
      // 静态边（Static edges）
      function center(i) { return { x: nodes[i].x + nodes[i].w / 2, y: nodes[i].y + 22 }; }
      var edges = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 2]];
      edges.forEach(function (e) {
        var a = center(e[0]), b = center(e[1]);
        svg.appendChild(arrow(a.x, a.y + 18, b.x, b.y - 18, e[0] === 3 ? '4 3' : ''));
      });
      var i;
      for (i = 0; i < nodes.length; i++) {
        svg.appendChild(box(nodes[i].x, nodes[i].y, nodes[i].w, 44, nodes[i].label, i === cur));
      }
      svg.appendChild(label(120, 168 - 8, 'grade=fail', 'var(--warn,#b8870f)', '9'));
      // 渲染截至当前累积的状态对象
      var st = {}, j;
      for (j = 0; j <= s; j++) { st[updates[j].key] = updates[j].val; }
      while (stateOut.firstChild) stateOut.removeChild(stateOut.firstChild);
      var keys = ['query', 'docs', 'draft', 'grade'], lines = [];
      keys.forEach(function (k) { if (st[k] !== undefined) lines.push(k + ': ' + st[k]); });
      stateOut.appendChild(document.createTextNode('state = { ' + lines.join(',  ') + ' }'));
      meta.textContent = '第 ' + (s + 1) + ' / ' + walk.length + ' 步：节点“' + nodes[cur].label + '”已执行；' + (walk[s] === 4 ? '评分未通过，条件边返回 rewrite 节点' : nodes[cur].label === 'grade' ? '条件边根据评分选择分支' : '状态对象已更新并传递给下一节点');
    };
    var grid = el('div', {}, [LF.slider(state, 'step', '逐步执行图', 0, 6, 1)]);
    host.appendChild(el('div', { class: 'lf' }, [
      el('div', { class: 'lf-head' }, [el('span', { class: 'lf-label' }, ['有状态图（Stateful Graph）']), el('span', {}, ['调整执行步骤'])]),
      el('div', { class: 'lf-body' }, [grid, el('div', { class: 'lf-out' }, [svg, el('div', { style: 'margin-top:10px' }, [stateOut]), meta])]),
      el('div', { class: 'lf-cap' }, ['有状态图（Stateful Graph）用边连接的节点来建模智能体，让同一个共享状态对象贯穿所有节点。各节点读取状态、执行工作并写回；条件边（Conditional Edge）根据状态分支，因此评分失败时可以返回改写，而非直接结束。图让控制流（Control Flow）显式化，并允许逐步检查状态。图中保留可执行节点名和原始状态样例：START 为起点，retrieve 为检索，generate 为生成，grade 为评分，rewrite 为改写；查询示例从“如何部署”改写为“部署 iii 引擎”。'])
    ]));
    state._render();
  }

  // -- multi-agent-debate: 两个智能体随轮次收敛，展示准确率与轮次的关系 --
  function multiAgentDebate(host) {
    var state = { rounds: 3 };
    var W = 520, H = 240, PAD = 30;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var num = el('span', { class: 'lf-num' });
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    var RMAX = 6;
    // 两个答案估计初始相距较远，随后向共同答案 (0.5) 靠拢
    var TRUTH = 0.5;
    function posA(r) { return TRUTH + (0.28) * Math.pow(0.55, r); }
    function posB(r) { return TRUTH - (0.34) * Math.pow(0.55, r); }
    // 差距缩小带来准确率上升，但边际收益（Diminishing returns）递减
    function acc(r) { return 62 + 32 * (1 - Math.pow(0.55, r)); }
    function px(r) { return PAD + r / RMAX * (W - 2 * PAD - 40); }
    function py(p) { return PAD + (1 - p) * (H - 2 * PAD); }
    state._render = function () {
      var n = state.rounds;
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      // 共同答案参考线
      svg.appendChild(svgEl('line', { x1: PAD, y1: py(TRUTH), x2: W - PAD - 40, y2: py(TRUTH), stroke: 'var(--rule-soft,#ddd)', 'stroke-width': '1', 'stroke-dasharray': '3 3' }));
      svg.appendChild(label(W - PAD - 18, py(TRUTH) + 3, '答案', 'var(--ink-mute,#777)', '9'));
      function track(fn, st) {
        var d = '', r; for (r = 0; r <= RMAX; r++) { d += (r ? 'L' : 'M') + px(r).toFixed(1) + ' ' + py(fn(r)).toFixed(1) + ' '; }
        svg.appendChild(svgEl('path', { d: d, fill: 'none', stroke: st, 'stroke-width': '1.4', 'stroke-dasharray': '4 3', opacity: '0.5' }));
      }
      track(posA, 'var(--blueprint,#3553ff)');
      track(posB, 'var(--warn,#b8870f)');
      var r;
      for (r = 0; r <= n; r++) {
        svg.appendChild(svgEl('circle', { cx: px(r), cy: py(posA(r)), r: r === n ? '5' : '3', fill: 'var(--blueprint,#3553ff)' }));
        svg.appendChild(svgEl('circle', { cx: px(r), cy: py(posB(r)), r: r === n ? '5' : '3', fill: 'var(--warn,#b8870f)' }));
      }
      svg.appendChild(label(PAD + 20, py(posA(0)) - 8, '智能体 A', 'var(--blueprint,#3553ff)', '9'));
      svg.appendChild(label(PAD + 20, py(posB(0)) + 14, '智能体 B', 'var(--warn,#b8870f)', '9'));
      var gap = Math.abs(posA(n) - posB(n));
      num.innerHTML = acc(n).toFixed(0) + ' <small>% 准确率</small>';
      meta.textContent = '第 ' + n + ' 轮：观点相差 ' + (gap * 100).toFixed(0) + ' 点；' + (gap < 0.06 ? '智能体已收敛' : n >= 4 ? '收益已趋平，增加轮次通常帮助不大' : '仍在收敛');
      formula.textContent = '每轮中，智能体读取对方的对话记录并更新观点。收敛按几何规律发生，因此准确率提升的边际收益递减';
    };
    var grid = el('div', {}, [LF.slider(state, 'rounds', '辩论轮次', 0, RMAX, 1)]);
    host.appendChild(el('div', { class: 'lf' }, [
      el('div', { class: 'lf-head' }, [el('span', { class: 'lf-label' }, ['多智能体辩论（Multi-Agent Debate）']), el('span', {}, ['调整轮次'])]),
      el('div', { class: 'lf-body' }, [grid, el('div', { class: 'lf-out' }, [svg, el('div', { style: 'margin-top:10px' }, [num]), meta, formula])]),
      el('div', { class: 'lf-cap' }, ['辩论中，多个智能体先独立作答，再跨轮次阅读彼此的对话记录并修订答案。分歧迫使各方论证或纠正自身推理，观点通常逐渐收敛为更好的共同答案。前一两轮贡献了大部分准确率提升；之后智能体趋于一致，额外轮次主要是在消耗词元。'])
    ]));
    state._render();
  }

  // -- orchestration-pattern: 监督者（Supervisor）| 群体（Swarm）| 层级（Hierarchical）拓扑 --
  function orchestrationPattern(host) {
    var state = { pat: 'supervisor' };
    var W = 520, H = 230;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H });
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });
    var N = 5;
    function dot(x, y, on) { return svgEl('circle', { cx: x, cy: y, r: on ? '10' : '8', fill: on ? 'var(--blueprint,#3553ff)' : 'var(--bg-surface,#eee)', stroke: 'var(--ink-soft,#555)', 'stroke-width': '1.2' }); }
    state._render = function () {
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      var edges = 0, i, j;
      if (state.pat === 'supervisor') {
        var sx = W / 2, sy = 40;
        var workers = [], k;
        for (k = 0; k < N; k++) { workers.push({ x: (W) * (k + 1) / (N + 1), y: 170 }); }
        for (k = 0; k < N; k++) {
          svg.appendChild(svgEl('line', { x1: sx, y1: sy + 10, x2: workers[k].x, y2: workers[k].y - 10, stroke: 'var(--blueprint,#3553ff)', 'stroke-width': '1.2' }));
          edges++;
        }
        svg.appendChild(dot(sx, sy, true));
        for (k = 0; k < N; k++) { svg.appendChild(dot(workers[k].x, workers[k].y, false)); }
        svg.appendChild(label(sx, sy - 16, '监督者（Supervisor）', 'var(--blueprint,#3553ff)', '10'));
        formula.textContent = '一个监督者向 N 个执行者路由：' + N + ' 条边，O(N)。集中规划，同时形成控制单点和故障单点';
      } else if (state.pat === 'swarm') {
        var pts = [], a;
        for (i = 0; i < N; i++) { a = -Math.PI / 2 + 2 * Math.PI * i / N; pts.push({ x: W / 2 + 80 * Math.cos(a), y: 110 + 70 * Math.sin(a) }); }
        for (i = 0; i < N; i++) { for (j = i + 1; j < N; j++) {
          svg.appendChild(svgEl('line', { x1: pts[i].x, y1: pts[i].y, x2: pts[j].x, y2: pts[j].y, stroke: 'var(--warn,#b8870f)', 'stroke-width': '0.8', opacity: '0.55' }));
          edges++;
        } }
        for (i = 0; i < N; i++) { svg.appendChild(dot(pts[i].x, pts[i].y, false)); }
        formula.textContent = '对等节点直接交接：' + edges + ' 条边，O(N^2)。没有中心瓶颈，但协调成本增长很快';
      } else {
        // 层级结构：根节点 -> 2 个中间节点 -> 叶节点
        var rootX = W / 2, rootY = 30;
        var mids = [{ x: W / 3, y: 110 }, { x: 2 * W / 3, y: 110 }];
        svg.appendChild(dot(rootX, rootY, true));
        mids.forEach(function (m, mi) {
          svg.appendChild(svgEl('line', { x1: rootX, y1: rootY + 10, x2: m.x, y2: m.y - 10, stroke: 'var(--blueprint,#3553ff)', 'stroke-width': '1.2' }));
          edges++;
          var li;
          for (li = 0; li < 2; li++) {
            var lx = m.x - 40 + li * 80, ly = 190;
            svg.appendChild(svgEl('line', { x1: m.x, y1: m.y + 10, x2: lx, y2: ly - 10, stroke: 'var(--ink-soft,#555)', 'stroke-width': '1' }));
            edges++;
            svg.appendChild(dot(lx, ly, false));
          }
          svg.appendChild(dot(m.x, m.y, false));
        });
        svg.appendChild(label(rootX, rootY - 14, '根节点', 'var(--blueprint,#3553ff)', '10'));
        formula.textContent = '监督者组成树：' + edges + ' 条边，扇出受深度限制。分层委派可以扩展规模，但每一层都会增加延迟';
      }
      meta.textContent = '模式“' + ({supervisor: '监督者（Supervisor）', swarm: '群体（Swarm）', hierarchical: '分层（Hierarchical）'})[state.pat] + '”：' + (state.pat === 'hierarchical' ? '7' : N) + ' 个智能体之间有 ' + edges + ' 条协调边';
    };
    var grid = el('div', {}, [LF.select(state, 'pat', '编排模式（Orchestration Pattern）', [
      ['监督者（Supervisor）', 'supervisor'], ['群体（Swarm，对等）', 'swarm'], ['分层（Hierarchical）', 'hierarchical']
    ])]);
    host.appendChild(el('div', { class: 'lf' }, [
      el('div', { class: 'lf-head' }, [el('span', { class: 'lf-label' }, ['编排模式（Orchestration Pattern）']), el('span', {}, ['选择拓扑结构'])]),
      el('div', { class: 'lf-body' }, [grid, el('div', { class: 'lf-out' }, [svg, meta, formula])]),
      el('div', { class: 'lf-cap' }, ['三种常见多智能体拓扑（Multi-Agent Topology）在控制能力与韧性（Resilience）之间取舍。监督者通过 O(N) 条边集中路由，但会成为故障单点。对等群体（Peer-to-Peer Swarm）没有中心瓶颈，却要承担 O(N²) 的协调成本。分层结构通过多层监督者委派，扩大扇出规模，代价是每层增加延迟。选择取决于智能体之间需要多少通信。'])
    ]));
    state._render();
  }

  LF.register({
    'rewoo-plan': rewooPlan,
    'tree-of-thoughts': treeOfThoughts,
    'self-refine': selfRefine,
    'memory-blocks': memoryBlocks,
    'voyager-skills': voyagerSkills,
    'langgraph-state': langgraphState,
    'multi-agent-debate': multiAgentDebate,
    'orchestration-pattern': orchestrationPattern
  });
})();
